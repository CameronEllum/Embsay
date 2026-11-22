package engine

import (
	"math"
	"os"
	"path/filepath"
	"testing"

	"embsay/internal/datasource"
	"embsay/internal/model"
	"embsay/internal/store"
)

func setupTxTestEnv(t *testing.T) (*store.Store, *Service, string) {
	t.Helper()
	base := t.TempDir()
	for _, sub := range []string{"config", "portfolios"} {
		if err := os.MkdirAll(filepath.Join(base, sub), 0755); err != nil {
			t.Fatalf("mkdir %s: %v", sub, err)
		}
	}
	files := map[string]string{
		"config/config.yaml": "language: en-CA\nprice_lookup_interval: 24h\nlookup_on_load: false\n",
		"config/divisions.yaml": `categories:
  - name: Stocks
    order: 1
divisions:
  - name: Canada
    category: Stocks
    order: 1
  - name: America (US)
    category: Stocks
    order: 2
account_types:
  rrsp:
    name: RRSP
    registered: true
    aliases: ["RRSP"]
  tfsa:
    name: TFSA
    registered: true
    aliases: ["TFSA"]
  non_registered:
    name: Non-Registered
    registered: false
    aliases: ["Margin", "Disnat"]
`,
		"config/symbols.yaml": `symbols:
  ZCN:
    name: BMO S&P/TSX Capped Composite Index ETF
    exchange: TSE
    currency: CAD
    fixed_price: 50.0
    default_divisions: { "Canada": 1.0 }
  VTI:
    name: Vanguard Total Stock Market ETF
    exchange: NYSE
    currency: USD
    fixed_price: 200.0
    default_divisions: { "America (US)": 1.0 }
`,
		"config/data_sources.yaml": "price_sources: []\nfx_sources: []\nmetadata_recipes: {}\ntax_structure_rules: {}\n",
		"config/cache.yaml":        "symbol_metadata: {}\n",
		"config/price_cache.yaml":  "fx_rates:\n  USD_CAD:\n    rate: 1.40\nprices: {}\n",
		"portfolios/tx_test.yaml": `name: Tx ACB Test
transactions_file: tx_test_transactions.csv
accounts:
  - name: Wealthsimple Margin
    account_type: non_registered
    bucket: Retirement
  - name: Disnat
    account_type: non_registered
  - name: QT RRSP
    account_type: rrsp
    bucket: Retirement
buckets:
  - name: Retirement
  - name: House
strategy:
  mode: hierarchical
  categories:
    Stocks: 1.0
  category_splits:
    Stocks:
      Canada: 0.5
      America (US): 0.5
holdings:
  - account: Wealthsimple Margin
    account_type: non_registered
    symbol: ZCN
    shares: 0
  - account: QT RRSP
    account_type: rrsp
    symbol: ZCN
    shares: 100
`,
	}
	for rel, body := range files {
		if err := os.WriteFile(filepath.Join(base, rel), []byte(body), 0644); err != nil {
			t.Fatalf("write %s: %v", rel, err)
		}
	}
	st, err := store.NewStore(base)
	if err != nil {
		t.Fatalf("NewStore: %v", err)
	}
	return st, NewService(st, datasource.NewFetcher()), base
}

func TestTransactionsCSVAndShareSync(t *testing.T) {
	st, svc, base := setupTxTestEnv(t)

	// 1. Add Buy with updateHolding=true -> shares increase from 0 to 100
	tx1, eval1, txFile, err := svc.AddTransaction("tx_test", model.Transaction{
		Date:    "2026-01-10",
		Account: "Wealthsimple Margin",
		Type:    "buy",
		Symbol:  "ZCN",
		Shares:  100,
		Amount:  4000,
		Fee:     0,
		Note:    "Initial lot",
	}, true)
	if err != nil {
		t.Fatalf("AddTransaction 1: %v", err)
	}
	if txFile != "tx_test_transactions.csv" || math.Abs(tx1.Price-40.0) > 1e-9 {
		t.Fatalf("unexpected tx1 / file: %+v, %q", tx1, txFile)
	}
	csvPath := filepath.Join(base, "portfolios", "tx_test_transactions.csv")
	if _, err := os.Stat(csvPath); err != nil {
		t.Fatalf("expected CSV at %s: %v", csvPath, err)
	}

	var marginShares float64
	for _, rh := range eval1.RawHoldings {
		if rh.Account == "Wealthsimple Margin" && rh.Symbol == "ZCN" {
			marginShares = rh.Shares
		}
	}
	if marginShares != 100 {
		t.Fatalf("Margin ZCN shares after buy = %v, want 100", marginShares)
	}

	// 2. Add historical Buy with updateHolding=false -> shares in YAML unchanged (remains 100)
	_, eval2, _, err := svc.AddTransaction("tx_test", model.Transaction{
		Date:    "2025-05-01",
		Account: "Wealthsimple Margin",
		Type:    "buy",
		Symbol:  "ZCN",
		Shares:  50,
		Amount:  1500,
	}, false)
	if err != nil {
		t.Fatalf("AddTransaction 2: %v", err)
	}
	for _, rh := range eval2.RawHoldings {
		if rh.Account == "Wealthsimple Margin" && rh.Symbol == "ZCN" {
			if rh.Shares != 100 {
				t.Fatalf("expected Margin ZCN shares unchanged (100) when updateHolding=false, got %v", rh.Shares)
			}
		}
	}

	// 3. Sell 25 shares with updateHolding=true -> shares decrease to 75
	_, _, _, err = svc.AddTransaction("tx_test", model.Transaction{
		Date:    "2026-02-01",
		Account: "Wealthsimple Margin",
		Type:    "sell",
		Symbol:  "ZCN",
		Shares:  25,
		Amount:  1250,
	}, true)
	if err != nil {
		t.Fatalf("AddTransaction 3 (sell): %v", err)
	}
	p, _ := st.GetPortfolio("tx_test")
	for _, h := range p.Holdings {
		if h.Account == "Wealthsimple Margin" && h.Symbol == "ZCN" && h.Shares != 75 {
			t.Fatalf("Margin ZCN shares after sell = %v, want 75", h.Shares)
		}
	}

	// 4. Reload from disk via fresh Store and confirm CSV persisted 3 transactions
	st2, err := store.NewStore(base)
	if err != nil {
		t.Fatalf("reload Store: %v", err)
	}
	txs, _, err := st2.LoadTransactions("tx_test")
	if err != nil {
		t.Fatalf("LoadTransactions: %v", err)
	}
	if len(txs) != 3 {
		t.Fatalf("reloaded tx count = %d, want 3", len(txs))
	}
}

func TestACBPoolingROCReinvestSplitAndSuperficialLoss(t *testing.T) {
	_, svc, _ := setupTxTestEnv(t)

	// Buy 100 ZCN in Margin for $4000 ($40/sh)
	if _, _, _, err := svc.AddTransaction("tx_test", model.Transaction{
		Date: "2025-01-15", Account: "Wealthsimple Margin", Type: "buy", Symbol: "ZCN", Shares: 100, Amount: 4000,
	}, false); err != nil {
		t.Fatal(err)
	}
	// Buy 100 ZCN in Disnat (different non-reg account/bucket!) for $6000 + $10 fee ($60.10/sh)
	// CRA pooled ACB = $10,010 across 200 shares => $50.05/sh
	if _, _, _, err := svc.AddTransaction("tx_test", model.Transaction{
		Date: "2025-03-01", Account: "Disnat", Type: "buy", Symbol: "ZCN", Shares: 100, Amount: 6000, Fee: 10,
	}, false); err != nil {
		t.Fatal(err)
	}
	// ROC $210 reduces pool ACB to $9,800 ($49.00/sh)
	if _, _, _, err := svc.AddTransaction("tx_test", model.Transaction{
		Date: "2025-06-30", Account: "Disnat", Type: "roc", Symbol: "ZCN", Amount: 210,
	}, false); err != nil {
		t.Fatal(err)
	}
	// Phantom Reinvested Cap Gain $200 raises pool ACB to $10,000 ($50.00/sh)
	if _, _, _, err := svc.AddTransaction("tx_test", model.Transaction{
		Date: "2025-12-31", Account: "Wealthsimple Margin", Type: "reinvested_cap_gain", Symbol: "ZCN", Amount: 200,
	}, false); err != nil {
		t.Fatal(err)
	}
	// Sell 50 ZCN at $40/sh ($2,000 gross - $10 fee = $1,990 proceeds) vs cost $2,500 => realized gain = -$510
	if _, _, _, err := svc.AddTransaction("tx_test", model.Transaction{
		Date: "2026-01-15", Account: "Wealthsimple Margin", Type: "sell", Symbol: "ZCN", Shares: 50, Amount: 2000, Fee: 10,
	}, false); err != nil {
		t.Fatal(err)
	}
	// Buy ZCN in QT RRSP 10 days later! Should NOT change non-registered ACB pool, SHOULD flag superficial loss!
	if _, _, _, err := svc.AddTransaction("tx_test", model.Transaction{
		Date: "2026-01-25", Account: "QT RRSP", Type: "buy", Symbol: "ZCN", Shares: 20, Amount: 900,
	}, false); err != nil {
		t.Fatal(err)
	}

	// Buy 10 USD VTI at $1000 USD with fx_rate=1.40 -> $1,400 CAD; 2-for-1 split -> 20 shares, ACB still $1,400 ($70/sh)
	if _, _, _, err := svc.AddTransaction("tx_test", model.Transaction{
		Date: "2025-02-01", Account: "Wealthsimple Margin", Type: "buy", Symbol: "VTI", Shares: 10, Amount: 1000, Currency: "USD", FXRate: 1.40,
	}, false); err != nil {
		t.Fatal(err)
	}
	if _, _, _, err := svc.AddTransaction("tx_test", model.Transaction{
		Date: "2025-07-01", Account: "Wealthsimple Margin", Type: "split", Symbol: "VTI", Shares: 2,
	}, false); err != nil {
		t.Fatal(err)
	}

	rep, err := svc.ComputeACB("tx_test")
	if err != nil {
		t.Fatalf("ComputeACB: %v", err)
	}
	if len(rep.Symbols) != 2 {
		t.Fatalf("ACB symbol count = %d, want 2 (VTI, ZCN)", len(rep.Symbols))
	}

	bySym := map[string]model.ACBSymbolSummary{}
	for _, s := range rep.Symbols {
		bySym[s.Symbol] = s
	}

	zcn := bySym["ZCN"]
	if math.Abs(zcn.TotalShares-150) > 1e-9 {
		t.Errorf("ZCN shares = %v, want 150", zcn.TotalShares)
	}
	if math.Abs(zcn.TotalACBCAD-7500) > 1e-6 {
		t.Errorf("ZCN total ACB = %.2f, want 7500.00", zcn.TotalACBCAD)
	}
	if math.Abs(zcn.RealizedGainByYear["2026"]-(-510)) > 1e-6 {
		t.Errorf("ZCN 2026 realized gain = %.2f, want -510.00", zcn.RealizedGainByYear["2026"])
	}
	if !zcn.HasSuperficialWarning {
		t.Errorf("expected superficial loss warning on ZCN due to RRSP buy 10 days after loss sale")
	}

	vti := bySym["VTI"]
	if math.Abs(vti.TotalShares-20) > 1e-9 || math.Abs(vti.TotalACBCAD-1400) > 1e-6 {
		t.Errorf("VTI after split = (%v sh, $%.2f ACB), want (20 sh, $1400.00)", vti.TotalShares, vti.TotalACBCAD)
	}
	if math.Abs(vti.ACBPerShareCAD-70) > 1e-6 {
		t.Errorf("VTI ACB/sh = %.2f, want 70.00", vti.ACBPerShareCAD)
	}
}
