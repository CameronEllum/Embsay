package store

import (
	"encoding/csv"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"embsay/internal/model"
)

var txCSVHeaders = []string{
	"id",
	"date",
	"account",
	"type",
	"symbol",
	"shares",
	"price",
	"amount",
	"currency",
	"fx_rate",
	"fee",
	"note",
}

// ResolveTransactionsPath resolves the on-disk CSV path for a portfolio's transactions_file.
// Returns empty string when no transactions_file is configured.
func (s *Store) ResolveTransactionsPath(p model.PortfolioConfig) string {
	tf := strings.TrimSpace(p.TransactionsFile)
	if tf == "" {
		return ""
	}
	if filepath.IsAbs(tf) {
		return filepath.Clean(tf)
	}
	var baseDir string
	if strings.TrimSpace(p.FilePath) != "" {
		baseDir = filepath.Dir(p.FilePath)
	} else if strings.TrimSpace(p.SourceDir) != "" {
		baseDir = p.SourceDir
	} else {
		dirs := s.resolveSearchDirs()
		if len(dirs) > 0 {
			baseDir = dirs[0]
		}
	}
	if baseDir == "" {
		return filepath.Clean(tf)
	}
	return filepath.Clean(filepath.Join(baseDir, tf))
}

// LoadTransactions reads and parses the CSV transaction ledger for a portfolio.
// If no transactions_file is configured or the file does not yet exist, returns an empty slice.
func (s *Store) LoadTransactions(portfolioID string) ([]model.Transaction, string, error) {
	s.mu.RLock()
	p, ok := s.portfolios[portfolioID]
	if !ok {
		s.mu.RUnlock()
		return nil, "", fmt.Errorf("portfolio %q not found", portfolioID)
	}
	csvPath := s.ResolveTransactionsPath(p)
	relName := strings.TrimSpace(p.TransactionsFile)
	s.mu.RUnlock()

	if csvPath == "" {
		return []model.Transaction{}, "", nil
	}

	f, err := os.Open(csvPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []model.Transaction{}, relName, nil
		}
		return nil, relName, err
	}
	defer f.Close()

	r := csv.NewReader(f)
	r.FieldsPerRecord = -1
	rows, err := r.ReadAll()
	if err != nil {
		return nil, relName, fmt.Errorf("read transactions CSV %s: %w", csvPath, err)
	}
	if len(rows) == 0 {
		return []model.Transaction{}, relName, nil
	}

	colIdx := make(map[string]int, len(rows[0]))
	for i, h := range rows[0] {
		cleanH := strings.ToLower(strings.TrimSpace(strings.TrimPrefix(h, "\uFEFF")))
		colIdx[cleanH] = i
	}

	getField := func(row []string, key string) string {
		idx, exists := colIdx[key]
		if !exists || idx < 0 || idx >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[idx])
	}
	parseFloat := func(raw string) float64 {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			return 0
		}
		v, err := strconv.ParseFloat(raw, 64)
		if err != nil {
			return 0
		}
		return v
	}

	out := make([]model.Transaction, 0, len(rows)-1)
	for i := 1; i < len(rows); i++ {
		row := rows[i]
		// Skip completely blank lines
		blank := true
		for _, cell := range row {
			if strings.TrimSpace(cell) != "" {
				blank = false
				break
			}
		}
		if blank {
			continue
		}
		fx := parseFloat(getField(row, "fx_rate"))
		if fx <= 0 {
			fx = 1.0
		}
		curr := strings.ToUpper(getField(row, "currency"))
		if curr == "" {
			curr = "CAD"
		}
		tx := model.Transaction{
			ID:       getField(row, "id"),
			Date:     getField(row, "date"),
			Account:  getField(row, "account"),
			Type:     strings.ToLower(getField(row, "type")),
			Symbol:   getField(row, "symbol"),
			Shares:   parseFloat(getField(row, "shares")),
			Price:    parseFloat(getField(row, "price")),
			Amount:   parseFloat(getField(row, "amount")),
			Currency: curr,
			FXRate:   fx,
			Fee:      parseFloat(getField(row, "fee")),
			Note:     getField(row, "note"),
		}
		if tx.ID == "" {
			tx.ID = fmt.Sprintf("tx_%06d", i)
		}
		out = append(out, tx)
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Date != out[j].Date {
			return out[i].Date < out[j].Date
		}
		return out[i].ID < out[j].ID
	})
	return out, relName, nil
}

// SaveTransactions writes all transactions to the portfolio's configured CSV file.
// If the portfolio does not have transactions_file set yet, defaults it to "<id>_transactions.csv"
// and persists the updated portfolio YAML first.
func (s *Store) SaveTransactions(portfolioID string, txs []model.Transaction) (string, error) {
	s.mu.RLock()
	p, ok := s.portfolios[portfolioID]
	s.mu.RUnlock()
	if !ok {
		return "", fmt.Errorf("portfolio %q not found", portfolioID)
	}

	if strings.TrimSpace(p.TransactionsFile) == "" {
		p.TransactionsFile = p.ID + "_transactions.csv"
		if err := s.SavePortfolio(p); err != nil {
			return "", err
		}
		s.mu.RLock()
		p = s.portfolios[portfolioID]
		s.mu.RUnlock()
	}

	csvPath := s.ResolveTransactionsPath(p)
	relName := strings.TrimSpace(p.TransactionsFile)
	if csvPath == "" {
		return "", fmt.Errorf("unable to resolve transactions path for %q", portfolioID)
	}

	sorted := make([]model.Transaction, len(txs))
	copy(sorted, txs)
	sort.SliceStable(sorted, func(i, j int) bool {
		if sorted[i].Date != sorted[j].Date {
			return sorted[i].Date < sorted[j].Date
		}
		return sorted[i].ID < sorted[j].ID
	})

	dir := filepath.Dir(csvPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}

	tmpFile, err := os.CreateTemp(dir, ".tx-*.csv")
	if err != nil {
		return "", err
	}
	tmpPath := tmpFile.Name()
	cleanupTmp := func() {
		_ = tmpFile.Close()
		_ = os.Remove(tmpPath)
	}

	w := csv.NewWriter(tmpFile)
	if err := w.Write(txCSVHeaders); err != nil {
		cleanupTmp()
		return "", err
	}

	fmtFloat := func(v float64) string {
		if v == 0 {
			return "0"
		}
		return strconv.FormatFloat(v, 'f', -1, 64)
	}
	for _, tx := range sorted {
		curr := strings.ToUpper(strings.TrimSpace(tx.Currency))
		if curr == "" {
			curr = "CAD"
		}
		fx := tx.FXRate
		if fx <= 0 {
			fx = 1.0
		}
		rec := []string{
			strings.TrimSpace(tx.ID),
			strings.TrimSpace(tx.Date),
			strings.TrimSpace(tx.Account),
			strings.ToLower(strings.TrimSpace(tx.Type)),
			strings.TrimSpace(tx.Symbol),
			fmtFloat(tx.Shares),
			fmtFloat(tx.Price),
			fmtFloat(tx.Amount),
			curr,
			fmtFloat(fx),
			fmtFloat(tx.Fee),
			strings.TrimSpace(tx.Note),
		}
		if err := w.Write(rec); err != nil {
			cleanupTmp()
			return "", err
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		cleanupTmp()
		return "", err
	}
	if err := tmpFile.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return "", err
	}
	if err := os.Rename(tmpPath, csvPath); err != nil {
		_ = os.Remove(tmpPath)
		return "", err
	}
	return relName, nil
}
