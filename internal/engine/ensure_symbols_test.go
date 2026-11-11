package engine

import (
	"bytes"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"embsay/internal/datasource"
	"embsay/internal/store"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

func TestEnsureSymbolsKnownAutoRegistersMissingSymbol(t *testing.T) {
	base := t.TempDir()
	configDir := filepath.Join(base, "config")
	portsDir := filepath.Join(base, "portfolios")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(portsDir, 0755); err != nil {
		t.Fatal(err)
	}

	_ = os.WriteFile(filepath.Join(configDir, "divisions.yaml"), []byte(`categories:
  - name: Equities
    order: 1
divisions:
  - name: Equities
    category: Equities
    order: 1
account_types:
  tfsa:
    name: TFSA
    registered: true
    aliases: ["TFSA"]
`), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "symbols.yaml"), []byte("symbols: {}\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "data_sources.yaml"), []byte("price_sources: []\nfx_sources: []\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "cache.yaml"), []byte("symbol_metadata: {}\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "price_cache.yaml"), []byte("fx_rates: {}\nprices: {}\n"), 0644)

	_ = os.WriteFile(filepath.Join(portsDir, "demo.yaml"), []byte(`name: "Auto Lookup Demo"
strategy:
  mode: flat
  divisions:
    "Equities": 1.0
holdings:
  - account: TFSA
    account_type: tfsa
    symbol: ZEQT
    shares: 100
    division: "Equities"
    rebalance_divisions: ["Equities"]
`), 0644)

	var callCount atomic.Int32
	mockClient := &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			callCount.Add(1)
			url := req.URL.String()
			if strings.Contains(url, "/chart/ZEQT.TO") {
				body := `{"chart":{"result":[{"meta":{"currency":"CAD","symbol":"ZEQT.TO","exchangeName":"TOR","fullExchangeName":"Toronto","instrumentType":"ETF","longName":"BMO All-Equity ETF Portfolio","regularMarketPrice":23.25}}]}}`
				return &http.Response{
					StatusCode: 200,
					Body:       io.NopCloser(bytes.NewBufferString(body)),
					Header:     make(http.Header),
				}, nil
			}
			if strings.HasSuffix(url, "/quote/tsx/zeqt/") {
				html := `<table><tr><td>Expense Ratio</td><td>0.18%</td></tr><tr><td>Dividend Yield</td><td>1.27%</td></tr></table>`
				return &http.Response{
					StatusCode: 200,
					Body:       io.NopCloser(bytes.NewBufferString(html)),
					Header:     make(http.Header),
				}, nil
			}
			return &http.Response{
				StatusCode: 404,
				Body:       io.NopCloser(bytes.NewBufferString(`{"chart":{"error":{"description":"Not Found"}}}`)),
				Header:     make(http.Header),
			}, nil
		}),
	}

	st, err := store.NewStore(base)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}
	svc := NewService(st, datasource.NewFetcherWithClient(mockClient))

	evalBefore, err := svc.Evaluate("demo", "all")
	if err != nil {
		t.Fatalf("Initial Evaluate failed: %v", err)
	}
	if callCount.Load() != 0 {
		t.Errorf("Expected Evaluate to make 0 HTTP calls when ETF data is missing, got %d", callCount.Load())
	}
	if len(evalBefore.DataWarnings) == 0 || !strings.Contains(evalBefore.DataWarnings[0], "ZEQT") {
		t.Fatalf("Expected DataWarnings mentioning ZEQT before manual refresh, got %v", evalBefore.DataWarnings)
	}
	if evalBefore.CurrentTotalCAD != 100.0 {
		t.Errorf("Expected fallback CurrentTotalCAD = 100.00 before price download, got %.2f", evalBefore.CurrentTotalCAD)
	}

	// User manually triggers refresh for the portfolio
	report, err := svc.SyncPortfolioSymbols("demo")
	if err != nil {
		t.Fatalf("SyncPortfolioSymbols failed: %v", err)
	}
	if report.UpdatedPrices["ZEQT"] != 23.25 {
		t.Errorf("Expected SyncPortfolioSymbols updated price 23.25 for ZEQT, got %v", report.UpdatedPrices)
	}

	symDef, ok := st.Symbols().Symbols["ZEQT"]
	if !ok {
		t.Fatalf("Expected ZEQT to be registered in symbols.yaml after manual refresh")
	}
	if symDef.YahooTicker != "ZEQT.TO" || symDef.Exchange != "TSX" || symDef.Currency != "CAD" {
		t.Errorf("Unexpected registered symbol: %+v", symDef)
	}
	if symDef.TaxStructure != "CA_ALL_EQUITY" {
		t.Errorf("Expected inferred tax_structure CA_ALL_EQUITY, got %q", symDef.TaxStructure)
	}
	if symDef.DefaultMER != 0.0018 {
		t.Errorf("Expected DefaultMER 0.0018, got %v", symDef.DefaultMER)
	}
	if meta, ok := st.Cache().SymbolMetadata["ZEQT"]; !ok || meta.MER != 0.0018 || meta.DividendYield != 0.0127 {
		t.Errorf("Expected cached MER 0.0018 and DividendYield 0.0127, got %+v (ok=%v)", meta, ok)
	}
	if cp, ok := st.Cache().Prices["ZEQT"]; !ok || cp.Price != 23.25 {
		t.Errorf("Expected ZEQT price 23.25 in cache, got %+v (ok=%v)", cp, ok)
	}

	// Evaluation after manual refresh should have zero warnings and full value
	beforeAfter := callCount.Load()
	evalAfter, err := svc.Evaluate("demo", "all")
	if err != nil {
		t.Fatalf("Evaluate after refresh failed: %v", err)
	}
	if callCount.Load() != beforeAfter {
		t.Errorf("Expected Evaluate after refresh to make 0 HTTP calls")
	}
	if len(evalAfter.DataWarnings) != 0 {
		t.Errorf("Expected 0 DataWarnings after refresh, got %v", evalAfter.DataWarnings)
	}
	if evalAfter.CurrentTotalCAD != 2325.0 {
		t.Errorf("CurrentTotalCAD = %.2f, want 2325.00", evalAfter.CurrentTotalCAD)
	}
}

func TestRefreshMetadataRecipesInfersMissingBMORecipe(t *testing.T) {
	base := t.TempDir()
	configDir := filepath.Join(base, "config")
	portsDir := filepath.Join(base, "portfolios")
	_ = os.MkdirAll(configDir, 0755)
	_ = os.MkdirAll(portsDir, 0755)

	_ = os.WriteFile(filepath.Join(configDir, "divisions.yaml"), []byte("categories: []\ndivisions: []\naccount_types: {}\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "symbols.yaml"), []byte(`symbols:
  ZEQT:
    asset_type: etf
    name: BMO All-Equity ETF
    exchange: TSX
    yahoo_ticker: ZEQT.TO
    currency: CAD
    tax_structure: CA_ALL_EQUITY
    default_mer: 0
    default_divisions:
      Equities: 1
`), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "data_sources.yaml"), []byte(`price_sources: []
fx_sources: []
metadata_recipes:
  bmo_all_in_one_weights:
    name: BMO All-in-One ETFs (StockAnalysis Holdings Table)
    type: html_table
    url_template: "https://stockanalysis.com/quote/tsx/{symbol}/holdings/"
    table_match: "Holdings"
    key_column_index: 1
    weight_column_index: 3
    underlying_to_division:
      "TSX:ZSP": "America (US)"
      "TSX:ZCN": "Canada"
      "TSX:ZEA": "Europe/Asia (EAFE)"
      "TSX:ZEM": "Emerging Markets"
`), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "cache.yaml"), []byte("symbol_metadata: {}\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "price_cache.yaml"), []byte("fx_rates: {}\nprices: {}\n"), 0644)

	mockClient := &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			if strings.Contains(req.URL.String(), "/quote/tsx/ZEQT/holdings/") {
				html := `<html><head><title>TSX:ZEQT Holdings List</title></head><body><table>
<tr><th>No</th><th>Symbol</th><th>Name</th><th>% Weight</th></tr>
<tr><td>1</td><td>TSX:ZSP</td><td>BMO S&P 500</td><td>50.00%</td></tr>
<tr><td>2</td><td>TSX:ZCN</td><td>BMO TSX</td><td>25.00%</td></tr>
<tr><td>3</td><td>TSX:ZEA</td><td>BMO EAFE</td><td>15.00%</td></tr>
<tr><td>4</td><td>TSX:ZEM</td><td>BMO EM</td><td>10.00%</td></tr>
</table></body></html>`
				return &http.Response{
					StatusCode: 200,
					Body:       io.NopCloser(bytes.NewBufferString(html)),
					Header:     make(http.Header),
				}, nil
			}
			return &http.Response{StatusCode: 404, Body: io.NopCloser(bytes.NewBufferString("")), Header: make(http.Header)}, nil
		}),
	}

	st, err := store.NewStore(base)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}
	svc := NewService(st, datasource.NewFetcherWithClient(mockClient))

	report, err := svc.RefreshMetadataRecipes()
	if err != nil {
		t.Fatalf("RefreshMetadataRecipes failed: %v", err)
	}
	ratios, ok := report.UpdatedMetadata["ZEQT"]
	if !ok {
		t.Fatalf("expected ZEQT in UpdatedMetadata, got %+v (warnings=%v)", report.UpdatedMetadata, report.Warnings)
	}
	if ratios["America (US)"] != 0.50 || ratios["Canada"] != 0.25 {
		t.Errorf("unexpected ratios for ZEQT: %+v", ratios)
	}
	if st.Symbols().Symbols["ZEQT"].MetadataRecipe != "bmo_all_in_one_weights" {
		t.Errorf("expected MetadataRecipe to be persisted on ZEQT")
	}

	if err := svc.ResetAllSymbols(); err != nil {
		t.Fatalf("ResetAllSymbols failed: %v", err)
	}
	if len(st.Symbols().Symbols) != 0 {
		t.Errorf("expected symbols to be empty after ResetAllSymbols, got %d", len(st.Symbols().Symbols))
	}
	if len(st.Cache().SymbolMetadata) != 0 {
		t.Errorf("expected symbol_metadata to be empty after ResetAllSymbols, got %d", len(st.Cache().SymbolMetadata))
	}
	if len(st.Cache().Prices) != 0 {
		t.Errorf("expected prices to be empty after ResetAllSymbols, got %d", len(st.Cache().Prices))
	}
}

func TestSyncInfersRegionalDivisionsTaxAndCash(t *testing.T) {
	base := t.TempDir()
	configDir := filepath.Join(base, "config")
	portsDir := filepath.Join(base, "portfolios")
	_ = os.MkdirAll(configDir, 0755)
	_ = os.MkdirAll(portsDir, 0755)

	_ = os.WriteFile(filepath.Join(configDir, "divisions.yaml"), []byte(`categories:
  - name: Cash and Bonds
    order: 1
  - name: Stocks
    order: 2
divisions:
  - name: GICs/Bonds
    category: Cash and Bonds
    order: 1
  - name: America (US)
    category: Stocks
    order: 2
  - name: Canada
    category: Stocks
    order: 3
  - name: Europe/Asia (EAFE)
    category: Stocks
    order: 4
  - name: Emerging Markets
    category: Stocks
    order: 5
account_types:
  rrsp:
    name: RRSP
    registered: true
    aliases: ["RRSP"]
  tfsa:
    name: TFSA
    registered: true
    aliases: ["TFSA"]
`), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "symbols.yaml"), []byte("symbols: {}\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "data_sources.yaml"), []byte(`price_sources: []
fx_sources: []
tax_structure_rules:
  CA_US:
    us_tier1_rate: 0.15
    account_multipliers: { rrsp: 1.0, tfsa: 1.0, non_registered: 0.0 }
  US_INTL:
    intl_tier1_rate: 0.085
    us_tier2_rate: 0.15
    account_multipliers: { rrsp: 1.0, tfsa: 2.0, non_registered: 1.0 }
`), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "cache.yaml"), []byte("symbol_metadata: {}\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "price_cache.yaml"), []byte("fx_rates:\n  USD_CAD:\n    rate: 1.40\nprices: {}\n"), 0644)

	_ = os.WriteFile(filepath.Join(portsDir, "multi.yaml"), []byte(`name: "Multi"
strategy:
  mode: hierarchical
  categories:
    Cash and Bonds: 0.30
    Stocks: 0.70
  category_splits:
    Cash and Bonds:
      GICs/Bonds: 1.0
    Stocks:
      America (US): 0.40
      Canada: 0.25
      Europe/Asia (EAFE): 0.25
      Emerging Markets: 0.10
holdings:
  - account: RRSP
    account_type: rrsp
    symbol: CASH_CAD
    shares: 1000
  - account: RRSP
    account_type: rrsp
    symbol: ZAG
    shares: 100
  - account: TFSA
    account_type: tfsa
    symbol: ZCN
    shares: 100
  - account: TFSA
    account_type: tfsa
    symbol: XUU
    shares: 100
  - account: RRSP
    account_type: rrsp
    symbol: IEFA
    shares: 100
  - account: RRSP
    account_type: rrsp
    symbol: IEMG
    shares: 100
`), 0644)

	mockClient := &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			u := req.URL.String()
			switch {
			case strings.Contains(u, "/chart/ZAG.TO"):
				return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewBufferString(`{"chart":{"result":[{"meta":{"currency":"CAD","symbol":"ZAG.TO","exchangeName":"TOR","instrumentType":"ETF","longName":"BMO Aggregate Bond Index ETF","regularMarketPrice":13.50}}]}}`)), Header: make(http.Header)}, nil
			case strings.Contains(u, "/chart/ZCN.TO"):
				return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewBufferString(`{"chart":{"result":[{"meta":{"currency":"CAD","symbol":"ZCN.TO","exchangeName":"TOR","instrumentType":"ETF","longName":"BMO S&P/TSX Capped Composite Index ETF","regularMarketPrice":48.00}}]}}`)), Header: make(http.Header)}, nil
			case strings.Contains(u, "/chart/XUU.TO"):
				return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewBufferString(`{"chart":{"result":[{"meta":{"currency":"CAD","symbol":"XUU.TO","exchangeName":"TOR","instrumentType":"ETF","longName":"iShares Core S&P U.S. Total Market Index ETF","regularMarketPrice":78.00}}]}}`)), Header: make(http.Header)}, nil
			case strings.Contains(u, "/chart/IEFA") && !strings.Contains(u, ".TO"):
				return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewBufferString(`{"chart":{"result":[{"meta":{"currency":"USD","symbol":"IEFA","exchangeName":"BTS","instrumentType":"ETF","longName":"iShares Core MSCI EAFE ETF","regularMarketPrice":97.00}}]}}`)), Header: make(http.Header)}, nil
			case strings.Contains(u, "/chart/IEMG") && !strings.Contains(u, ".TO"):
				return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewBufferString(`{"chart":{"result":[{"meta":{"currency":"USD","symbol":"IEMG","exchangeName":"NYQ","instrumentType":"ETF","longName":"iShares Core MSCI Emerging Markets ETF","regularMarketPrice":73.00}}]}}`)), Header: make(http.Header)}, nil
			case strings.HasSuffix(u, "/etf/iefa/"):
				return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewBufferString(`<table><tr><td>Expense Ratio</td><td>0.07%</td></tr><tr><td>Dividend Yield</td><td>3.00%</td></tr></table>`)), Header: make(http.Header)}, nil
			case strings.HasSuffix(u, "/quote/tsx/xuu/"):
				return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewBufferString(`<table><tr><td>Expense Ratio</td><td>0.07%</td></tr><tr><td>Dividend Yield</td><td>1.30%</td></tr></table>`)), Header: make(http.Header)}, nil
			default:
				return &http.Response{StatusCode: 404, Body: io.NopCloser(bytes.NewBufferString("")), Header: make(http.Header)}, nil
			}
		}),
	}

	st, err := store.NewStore(base)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}
	svc := NewService(st, datasource.NewFetcherWithClient(mockClient))

	if _, err := svc.SyncPortfolioSymbols("multi"); err != nil {
		t.Fatalf("SyncPortfolioSymbols failed: %v", err)
	}

	syms := st.Symbols().Symbols
	if syms["CASH_CAD"].FixedPrice != 1.0 || syms["CASH_CAD"].DefaultDivisions["GICs/Bonds"] != 1.0 {
		t.Errorf("unexpected CASH_CAD def: %+v", syms["CASH_CAD"])
	}
	if syms["ZAG"].DefaultDivisions["GICs/Bonds"] != 1.0 {
		t.Errorf("expected ZAG -> GICs/Bonds, got %+v", syms["ZAG"].DefaultDivisions)
	}
	if syms["ZCN"].DefaultDivisions["Canada"] != 1.0 {
		t.Errorf("expected ZCN -> Canada, got %+v", syms["ZCN"].DefaultDivisions)
	}
	if syms["XUU"].DefaultDivisions["America (US)"] != 1.0 || syms["XUU"].TaxStructure != "CA_US" {
		t.Errorf("expected XUU -> America (US) + CA_US, got div=%v tax=%s", syms["XUU"].DefaultDivisions, syms["XUU"].TaxStructure)
	}
	if syms["IEFA"].DefaultDivisions["Europe/Asia (EAFE)"] != 1.0 || syms["IEFA"].TaxStructure != "US_INTL" {
		t.Errorf("expected IEFA -> EAFE + US_INTL, got div=%v tax=%s", syms["IEFA"].DefaultDivisions, syms["IEFA"].TaxStructure)
	}
	if syms["IEMG"].DefaultDivisions["Emerging Markets"] != 1.0 || syms["IEMG"].TaxStructure != "US_INTL" {
		t.Errorf("expected IEMG -> Emerging Markets + US_INTL, got div=%v tax=%s", syms["IEMG"].DefaultDivisions, syms["IEMG"].TaxStructure)
	}

	iefaMeta := st.Cache().SymbolMetadata["IEFA"]
	if iefaMeta.TaxByAccount["rrsp"] <= 0 || iefaMeta.TaxByAccount["tfsa"] <= iefaMeta.TaxByAccount["rrsp"] {
		t.Errorf("expected IEFA tax_by_account TFSA drag > RRSP drag > 0, got %+v", iefaMeta.TaxByAccount)
	}
}
