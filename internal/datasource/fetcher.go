package datasource

import (
	"bufio"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"embsay/internal/model"
)

type Fetcher struct {
	client *http.Client
}

func NewFetcher() *Fetcher {
	return &Fetcher{
		client: &http.Client{
			Timeout: 12 * time.Second,
		},
	}
}

// FetchFX fetches the latest FX rate for a currency pair (e.g. "USD_CAD") using enabled recipes in order.
func (f *Fetcher) FetchFX(pair string, sources []model.FXSourceRecipe) (model.CachedFX, error) {
	var lastErr error
	for _, src := range sources {
		if !src.Enabled || src.Pair != pair {
			continue
		}
		url := expandEnvVars(src.URLTemplate)
		body, err := f.httpGet(url, src.Headers)
		if err != nil {
			lastErr = fmt.Errorf("%s: %w", src.ID, err)
			continue
		}
		var raw interface{}
		if err := json.Unmarshal(body, &raw); err != nil {
			lastErr = fmt.Errorf("%s json: %w", src.ID, err)
			continue
		}
		ratePath := src.JSONMapping["rate"]
		rateVal, err := extractFloatByPath(raw, ratePath)
		if err != nil || rateVal <= 0 {
			lastErr = fmt.Errorf("%s path %q: %w", src.ID, ratePath, err)
			continue
		}
		return model.CachedFX{
			Rate:      rateVal,
			Source:    src.ID,
			UpdatedAt: time.Now().Format("2006-01-02 15:04"),
		}, nil
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("no enabled FX source found for pair %s", pair)
	}
	return model.CachedFX{}, lastErr
}

// FetchPrice fetches the latest market price for a symbol using enabled price source recipes in order.
func (f *Fetcher) FetchPrice(symbolID string, sym model.SymbolDef, sources []model.PriceSourceRecipe) (model.CachedPrice, error) {
	if sym.FixedPrice > 0 {
		return model.CachedPrice{
			Price:     sym.FixedPrice,
			Currency:  sym.Currency,
			UpdatedAt: time.Now().Format("2006-01-02"),
		}, nil
	}
	ticker := sym.YahooTicker
	if ticker == "" {
		ticker = symbolID
	}

	var lastErr error
	for _, src := range sources {
		if !src.Enabled {
			continue
		}
		url := strings.ReplaceAll(src.URLTemplate, "{ticker}", ticker)
		url = expandEnvVars(url)
		body, err := f.httpGet(url, src.Headers)
		if err != nil {
			lastErr = fmt.Errorf("%s (%s): %w", src.ID, ticker, err)
			continue
		}
		var raw interface{}
		if err := json.Unmarshal(body, &raw); err != nil {
			lastErr = fmt.Errorf("%s (%s) json: %w", src.ID, ticker, err)
			continue
		}
		pricePath := src.JSONMapping["price"]
		priceVal, err := extractFloatByPath(raw, pricePath)
		if err != nil || priceVal <= 0 {
			lastErr = fmt.Errorf("%s (%s) path %q: %w", src.ID, ticker, pricePath, err)
			continue
		}
		curr := sym.Currency
		if currPath, ok := src.JSONMapping["currency"]; ok && currPath != "" {
			if cStr, err := extractStringByPath(raw, currPath); err == nil && cStr != "" {
				curr = cStr
			}
		}
		return model.CachedPrice{
			Price:     priceVal,
			Currency:  curr,
			UpdatedAt: time.Now().Format("2006-01-02 15:04"),
		}, nil
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("no enabled price source for %s", symbolID)
	}
	return model.CachedPrice{}, lastErr
}

// FetchDivisionRatios executes a metadata recipe (csv_holdings for BlackRock iShares CSV,
// html_table for provider product pages like Vanguard Canada) and computes normalized
// division weights for a composite ETF (like XAW, XEQT, or VEQT).
func (f *Fetcher) FetchDivisionRatios(symbolID string, recipe model.MetadataRecipe) (map[string]float64, error) {
	url := recipe.URL
	if recipe.URLTemplate != "" {
		url = strings.ReplaceAll(recipe.URLTemplate, "{symbol}", symbolID)
	}
	if url == "" {
		return nil, fmt.Errorf("recipe %q has no url or url_template", recipe.Name)
	}

	body, err := f.httpGet(expandEnvVars(url), map[string]string{
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
	})
	if err != nil {
		return nil, err
	}

	switch recipe.Type {
	case "csv_holdings":
		return ParseHoldingsCSVForDivisions(string(body), recipe)
	case "html_table":
		return ParseHoldingsHTMLTableForDivisions(string(body), recipe)
	default:
		return nil, fmt.Errorf("unsupported metadata recipe type: %s", recipe.Type)
	}
}

// ParseHoldingsCSVForDivisions parses a fund provider CSV (skipping preamble lines before HeaderMatch)
// and maps underlying tickers to divisions, normalizing weights to sum to 1.0.
func ParseHoldingsCSVForDivisions(csvContent string, recipe model.MetadataRecipe) (map[string]float64, error) {
	scanner := bufio.NewScanner(strings.NewReader(csvContent))
	var csvLines []string
	foundHeader := false
	headerMatch := strings.TrimSpace(recipe.HeaderMatch)

	for scanner.Scan() {
		line := strings.TrimPrefix(scanner.Text(), "\ufeff")
		if !foundHeader {
			if headerMatch == "" || strings.Contains(line, headerMatch) {
				foundHeader = true
				csvLines = append(csvLines, line)
			}
			continue
		}
		if strings.TrimSpace(line) == "" {
			continue
		}
		csvLines = append(csvLines, line)
	}

	if !foundHeader || len(csvLines) < 2 {
		return nil, fmt.Errorf("header matching %q not found in CSV", recipe.HeaderMatch)
	}

	r := csv.NewReader(strings.NewReader(strings.Join(csvLines, "\n")))
	r.FieldsPerRecord = -1
	r.LazyQuotes = true

	records, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("reading CSV records: %w", err)
	}
	if len(records) < 2 {
		return nil, fmt.Errorf("no data rows found in CSV")
	}

	headers := records[0]
	tickerIdx := -1
	weightIdx := -1
	for i, h := range headers {
		cleanH := strings.TrimSpace(strings.Trim(h, `"`))
		if strings.EqualFold(cleanH, recipe.TickerColumn) {
			tickerIdx = i
		}
		if strings.EqualFold(cleanH, recipe.WeightColumn) {
			weightIdx = i
		}
	}
	if tickerIdx == -1 || weightIdx == -1 {
		return nil, fmt.Errorf("columns %q or %q not found in header %v", recipe.TickerColumn, recipe.WeightColumn, headers)
	}

	rawWeights := make(map[string]float64)
	totalWeight := 0.0

	for _, row := range records[1:] {
		if len(row) <= tickerIdx || len(row) <= weightIdx {
			continue
		}
		uTicker := strings.TrimSpace(strings.Trim(row[tickerIdx], `"`))
		divID, ok := recipe.UnderlyingToDivision[uTicker]
		if !ok {
			continue
		}
		wStr := strings.TrimSpace(strings.ReplaceAll(strings.Trim(row[weightIdx], `"`), "%", ""))
		wVal, err := strconv.ParseFloat(wStr, 64)
		if err != nil || wVal <= 0 {
			continue
		}
		rawWeights[divID] += wVal
		totalWeight += wVal
	}

	if totalWeight <= 0 {
		return nil, fmt.Errorf("no matching underlying tickers found in CSV")
	}

	normalized := make(map[string]float64, len(rawWeights))
	for divID, w := range rawWeights {
		normalized[divID] = w / totalWeight
	}
	return normalized, nil
}

var (
	htmlTableTagRe = regexp.MustCompile(`(?is)<table\b[^>]*>.*?</table>`)
	htmlRowRe      = regexp.MustCompile(`(?is)<tr\b[^>]*>.*?</tr>`)
	htmlCellRe     = regexp.MustCompile(`(?is)<t[dh]\b[^>]*>.*?</t[dh]>`)
	htmlTagRe      = regexp.MustCompile(`(?s)<[^>]*>`)
	htmlSpaceRe    = regexp.MustCompile(`[\s\p{Zs}]+`)
)

// ParseHoldingsHTMLTableForDivisions parses an HTML page (e.g. a Vanguard Canada
// product page, which is server-side rendered with no JavaScript required) and
// maps key-column values (e.g. underlying fund names) to divisions, normalizing
// weights to sum to 1.0.
//
// The target table is located via TableMatch: the text between the previous
// table and each candidate table (i.e. the section caption area) must contain
// it. Candidate tables that match positionally but yield no mapped rows are
// skipped, so navigation menus or duplicate captions do not cause failures.
func ParseHoldingsHTMLTableForDivisions(htmlContent string, recipe model.MetadataRecipe) (map[string]float64, error) {
	tableMatch := strings.TrimSpace(recipe.TableMatch)
	if tableMatch == "" {
		return nil, fmt.Errorf("html_table recipe %q requires table_match", recipe.Name)
	}
	keyIdx := recipe.KeyColumnIndex
	if keyIdx < 0 {
		keyIdx = 0
	}
	weightIdx := recipe.WeightColumnIndex
	if weightIdx <= 0 {
		weightIdx = 1
	}

	tables := htmlTableTagRe.FindAllStringIndex(htmlContent, -1)
	if len(tables) == 0 {
		return nil, fmt.Errorf("no HTML tables found on page")
	}

	for i, tbl := range tables {
		zoneStart := 0
		if i > 0 {
			zoneStart = tables[i-1][1]
		}
		zone := cleanHTMLText(htmlContent[zoneStart:tbl[0]])
		if !strings.Contains(strings.ToLower(zone), strings.ToLower(tableMatch)) {
			continue
		}
		if ratios, ok := parseHTMLTableRowsForDivisions(htmlContent[tbl[0]:tbl[1]], recipe, keyIdx, weightIdx); ok {
			return ratios, nil
		}
	}
	return nil, fmt.Errorf("no table matching %q with mapped rows found on page", recipe.TableMatch)
}

func parseHTMLTableRowsForDivisions(tableHTML string, recipe model.MetadataRecipe, keyIdx, weightIdx int) (map[string]float64, bool) {
	rawWeights := make(map[string]float64)
	totalWeight := 0.0

	for _, row := range htmlRowRe.FindAllString(tableHTML, -1) {
		cells := htmlCellRe.FindAllString(row, -1)
		if len(cells) <= keyIdx || len(cells) <= weightIdx {
			continue
		}
		key := cleanHTMLText(cells[keyIdx])
		divID, ok := recipe.UnderlyingToDivision[key]
		if !ok {
			continue
		}
		wStr := strings.ReplaceAll(cleanHTMLText(cells[weightIdx]), "%", "")
		wVal, err := strconv.ParseFloat(wStr, 64)
		if err != nil || wVal <= 0 {
			continue
		}
		rawWeights[divID] += wVal
		totalWeight += wVal
	}

	if totalWeight <= 0 {
		return nil, false
	}
	normalized := make(map[string]float64, len(rawWeights))
	for divID, w := range rawWeights {
		normalized[divID] = w / totalWeight
	}
	return normalized, true
}

// cleanHTMLText strips tags, unescapes HTML entities (incl. &nbsp;), and collapses
// all whitespace (incl. non-breaking spaces) into single trimmed spaces.
func cleanHTMLText(s string) string {
	s = html.UnescapeString(htmlTagRe.ReplaceAllString(s, " "))
	return strings.TrimSpace(htmlSpaceRe.ReplaceAllString(s, " "))
}

type ImportedRow struct {
	Account string  `json:"account"`
	Symbol  string  `json:"symbol"`
	Shares  float64 `json:"shares"`
}

type SymbolLookupResult struct {
	Symbol         string  `json:"symbol"`
	YahooTicker    string  `json:"yahoo_ticker"`
	Name           string  `json:"name"`
	Exchange       string  `json:"exchange"`
	Currency       string  `json:"currency"`
	Price          float64 `json:"price"`
	InstrumentType string  `json:"instrument_type"`
}

// LookupSymbol queries Yahoo Finance chart metadata (and search fallback) to auto-populate security details.
func (f *Fetcher) LookupSymbol(rawSymbol string, preferredExchange string) (SymbolLookupResult, error) {
	clean := strings.ToUpper(strings.TrimSpace(rawSymbol))
	if clean == "" {
		return SymbolLookupResult{}, fmt.Errorf("symbol cannot be empty")
	}

	var candidates []string
	if strings.Contains(clean, ".") {
		candidates = []string{clean, strings.Split(clean, ".")[0]}
	} else if strings.EqualFold(preferredExchange, "TSX") || strings.EqualFold(preferredExchange, "TSE") {
		candidates = []string{clean + ".TO", clean}
	} else {
		candidates = []string{clean, clean + ".TO"}
	}

	headers := map[string]string{
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
	}

	var lastErr error
	for _, ticker := range candidates {
		chartURL := fmt.Sprintf("https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&range=1d", ticker)
		body, err := f.httpGet(chartURL, headers)
		if err != nil {
			lastErr = err
			continue
		}
		var raw interface{}
		if err := json.Unmarshal(body, &raw); err != nil {
			lastErr = err
			continue
		}
		price, err := extractFloatByPath(raw, "chart.result.0.meta.regularMarketPrice")
		if err != nil || price <= 0 {
			lastErr = fmt.Errorf("no market price for %s", ticker)
			continue
		}

		curr, _ := extractStringByPath(raw, "chart.result.0.meta.currency")
		if curr == "" {
			if strings.HasSuffix(ticker, ".TO") {
				curr = "CAD"
			} else {
				curr = "USD"
			}
		}
		exchRaw, _ := extractStringByPath(raw, "chart.result.0.meta.exchangeName")
		fullExch, _ := extractStringByPath(raw, "chart.result.0.meta.fullExchangeName")
		instType, _ := extractStringByPath(raw, "chart.result.0.meta.instrumentType")
		longName, _ := extractStringByPath(raw, "chart.result.0.meta.longName")
		shortName, _ := extractStringByPath(raw, "chart.result.0.meta.shortName")

		name := strings.TrimSpace(longName)
		if name == "" {
			name = strings.TrimSpace(shortName)
		}

		// If chart meta didn't include a descriptive name, try v1/finance/search
		if name == "" || strings.EqualFold(name, ticker) {
			searchURL := fmt.Sprintf("https://query1.finance.yahoo.com/v1/finance/search?q=%s&quotesCount=5&newsCount=0", ticker)
			if sBody, sErr := f.httpGet(searchURL, headers); sErr == nil {
				var sRaw interface{}
				if json.Unmarshal(sBody, &sRaw) == nil {
					if lName, err := extractStringByPath(sRaw, "quotes.0.longname"); err == nil && lName != "" {
						name = lName
					} else if sName, err := extractStringByPath(sRaw, "quotes.0.shortname"); err == nil && sName != "" {
						name = sName
					}
				}
			}
		}
		if name == "" {
			name = ticker
		}

		normExch := normalizeExchangeName(exchRaw, fullExch, ticker)
		baseSym := strings.TrimSuffix(ticker, ".TO")

		return SymbolLookupResult{
			Symbol:         baseSym,
			YahooTicker:    ticker,
			Name:           name,
			Exchange:       normExch,
			Currency:       strings.ToUpper(curr),
			Price:          price,
			InstrumentType: instType,
		}, nil
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("symbol %q not found", rawSymbol)
	}
	return SymbolLookupResult{}, lastErr
}

func normalizeExchangeName(exch, fullExch, ticker string) string {
	u := strings.ToUpper(exch + " " + fullExch)
	switch {
	case strings.HasSuffix(ticker, ".TO") || strings.Contains(u, "TOR") || strings.Contains(u, "TSX"):
		return "TSX"
	case strings.Contains(u, "NMS") || strings.Contains(u, "NGM") || strings.Contains(u, "NAS"):
		return "NASDAQ"
	case strings.Contains(u, "NYQ") || strings.Contains(u, "PCX") || strings.Contains(u, "ASE") || strings.Contains(u, "NYSE") || strings.Contains(u, "ARCA"):
		return "NYSE"
	case exch != "":
		return strings.ToUpper(exch)
	default:
		return "TSX"
	}
}

// ParseBrokerageCSV parses exported brokerage positions CSV using a declarative column mapping.
func ParseBrokerageCSV(recipe model.CSVImporterRecipe, csvContent string) ([]ImportedRow, error) {
	r := csv.NewReader(strings.NewReader(strings.TrimPrefix(csvContent, "\ufeff")))
	r.FieldsPerRecord = -1
	r.LazyQuotes = true

	records, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("invalid CSV: %w", err)
	}
	if len(records) < 2 {
		return nil, fmt.Errorf("CSV contains no data rows")
	}

	headers := records[0]
	colIdx := func(colName string) int {
		for i, h := range headers {
			if strings.EqualFold(strings.TrimSpace(h), strings.TrimSpace(colName)) {
				return i
			}
		}
		return -1
	}

	accIdx := colIdx(recipe.Columns["account"])
	symIdx := colIdx(recipe.Columns["symbol"])
	shrIdx := colIdx(recipe.Columns["shares"])
	if symIdx == -1 || shrIdx == -1 {
		return nil, fmt.Errorf("required columns symbol (%q) or shares (%q) not found in CSV headers %v",
			recipe.Columns["symbol"], recipe.Columns["shares"], headers)
	}

	var out []ImportedRow
	for _, row := range records[1:] {
		if len(row) <= symIdx || len(row) <= shrIdx {
			continue
		}
		sym := strings.ToUpper(strings.TrimSpace(row[symIdx]))
		sym = strings.TrimSuffix(sym, ".TO")
		if sym == "" {
			continue
		}
		shrStr := strings.ReplaceAll(strings.TrimSpace(row[shrIdx]), ",", "")
		shares, err := strconv.ParseFloat(shrStr, 64)
		if err != nil || shares == 0 {
			continue
		}
		acc := "Imported"
		if accIdx >= 0 && len(row) > accIdx && strings.TrimSpace(row[accIdx]) != "" {
			acc = strings.TrimSpace(row[accIdx])
		}
		out = append(out, ImportedRow{
			Account: acc,
			Symbol:  sym,
			Shares:  shares,
		})
	}
	return out, nil
}

func (f *Fetcher) httpGet(url string, headers map[string]string) ([]byte, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, expandEnvVars(v))
	}
	resp, err := f.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d from %s", resp.StatusCode, url)
	}
	return io.ReadAll(resp.Body)
}

func expandEnvVars(s string) string {
	return os.Expand(s, func(k string) string {
		return os.Getenv(k)
	})
}

func extractByPath(root interface{}, path string) (interface{}, error) {
	parts := strings.Split(path, ".")
	curr := root
	for _, p := range parts {
		if p == "" {
			continue
		}
		switch node := curr.(type) {
		case map[string]interface{}:
			val, ok := node[p]
			if !ok {
				return nil, fmt.Errorf("key %q not found", p)
			}
			curr = val
		case []interface{}:
			idx, err := strconv.Atoi(p)
			if err != nil || idx < 0 || idx >= len(node) {
				return nil, fmt.Errorf("index %q out of bounds", p)
			}
			curr = node[idx]
		default:
			return nil, fmt.Errorf("cannot traverse %T at %q", curr, p)
		}
	}
	return curr, nil
}

func extractFloatByPath(root interface{}, path string) (float64, error) {
	val, err := extractByPath(root, path)
	if err != nil {
		return 0, err
	}
	switch v := val.(type) {
	case float64:
		return v, nil
	case int:
		return float64(v), nil
	case string:
		return strconv.ParseFloat(strings.TrimSpace(v), 64)
	default:
		return 0, fmt.Errorf("unexpected value type %T for float at %q", val, path)
	}
}

func extractStringByPath(root interface{}, path string) (string, error) {
	val, err := extractByPath(root, path)
	if err != nil {
		return "", err
	}
	if s, ok := val.(string); ok {
		return s, nil
	}
	return fmt.Sprintf("%v", val), nil
}
