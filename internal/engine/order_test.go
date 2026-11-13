package engine

import (
	"os"
	"path/filepath"
	"testing"

	"embsay/internal/datasource"
	"embsay/internal/model"
	"embsay/internal/store"
)

func TestPortfolioOrderPreservedInYAMLAndEvaluation(t *testing.T) {
	base := t.TempDir()
	for _, sub := range []string{"config", "portfolios"} {
		if err := os.MkdirAll(filepath.Join(base, sub), 0755); err != nil {
			t.Fatalf("mkdir %s: %v", sub, err)
		}
	}

	files := map[string]string{
		"config/config.yaml": "language: en-CA\nprice_lookup_interval: 24h\nlookup_on_load: false\n",
		"config/divisions.yaml": `categories:
  - name: Cash and Bonds
    order: 1
  - name: Stocks
    order: 2
divisions:
  - name: GICs/Bonds
    category: Cash and Bonds
    order: 1
  - name: Canada
    category: Stocks
    order: 2
  - name: America (US)
    category: Stocks
    order: 3
account_types:
  tfsa:
    name: TFSA
    registered: true
    aliases: ["TFSA"]
  rrsp:
    name: RRSP
    registered: true
    aliases: ["RRSP"]
  non_registered:
    name: Non-Registered
    registered: false
    aliases: ["Margin"]
`,
		"config/symbols.yaml": `symbols:
  VAB:
    name: Bond ETF
    exchange: TSE
    currency: CAD
    fixed_price: 25.0
    default_divisions: { "GICs/Bonds": 1.0 }
  ZCN:
    name: Canada ETF
    exchange: TSE
    currency: CAD
    fixed_price: 50.0
    default_divisions: { "Canada": 1.0 }
  VTI:
    name: US ETF
    exchange: NYSE
    currency: USD
    fixed_price: 100.0
    default_divisions: { "America (US)": 1.0 }
`,
		"config/data_sources.yaml": "price_sources: []\nfx_sources: []\nmetadata_recipes: {}\ntax_structure_rules: {}\n",
		"config/cache.yaml":        "symbol_metadata: {}\n",
		"config/price_cache.yaml":  "fx_rates:\n  USD_CAD:\n    rate: 1.40\nprices: {}\n",
		"portfolios/ordered.yaml": `name: Ordered Portfolio
amount_to_buy: 0
account_order:
  - Margin
  - TFSA
  - RRSP
classification_order:
  - non_registered
  - tfsa
  - rrsp
category_order:
  - Stocks
  - Cash and Bonds
division_order:
  - America (US)
  - Canada
  - GICs/Bonds
strategy:
  mode: hierarchical
  categories:
    Cash and Bonds: 0.2
    Stocks: 0.8
  category_splits:
    Cash and Bonds:
      GICs/Bonds: 1.0
    Stocks:
      Canada: 0.5
      America (US): 0.5
holdings:
  - account: RRSP
    account_type: rrsp
    symbol: VTI
    shares: 10
  - account: TFSA
    account_type: tfsa
    symbol: ZCN
    shares: 20
  - account: Margin
    account_type: non_registered
    symbol: VAB
    shares: 40
  - account: TFSA
    account_type: tfsa
    symbol: VAB
    shares: 15
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
	svc := NewService(st, datasource.NewFetcher())

	eval, err := svc.Evaluate("ordered", "all")
	if err != nil {
		t.Fatalf("Evaluate: %v", err)
	}

	wantDivs := []string{"America (US)", "Canada", "GICs/Bonds"}
	for i, w := range wantDivs {
		if eval.Divisions[i].DivisionName != w {
			t.Fatalf("division[%d] = %q, want %q", i, eval.Divisions[i].DivisionName, w)
		}
	}
	wantCats := []string{"Stocks", "Cash and Bonds"}
	for i, w := range wantCats {
		if eval.Categories[i].CategoryName != w {
			t.Fatalf("category[%d] = %q, want %q", i, eval.Categories[i].CategoryName, w)
		}
	}
	wantAccs := []string{"Margin", "TFSA", "RRSP"}
	for i, w := range wantAccs {
		if eval.AccountSummaries[i].Account != w {
			t.Fatalf("account[%d] = %q, want %q", i, eval.AccountSummaries[i].Account, w)
		}
	}
	wantCls := []string{"non_registered", "tfsa", "rrsp"}
	for i, w := range wantCls {
		if eval.ClassificationSummaries[i].AccountType != w {
			t.Fatalf("classification[%d] = %q, want %q", i, eval.ClassificationSummaries[i].AccountType, w)
		}
	}

	// Verify holding order within TFSA is preserved as ZCN then VAB
	tfsa := eval.AccountSummaries[1]
	if len(tfsa.Holdings) != 2 || tfsa.Holdings[0].Symbol != "ZCN" || tfsa.Holdings[1].Symbol != "VAB" {
		t.Fatalf("unexpected TFSA holding order: %+v", tfsa.Holdings)
	}

	// Reorder holdings via UpdatePortfolio and rename Margin -> Taxable
	cfg, err := svc.GetPortfolioConfig("ordered")
	if err != nil {
		t.Fatalf("GetPortfolioConfig: %v", err)
	}
	// Swap TFSA holdings (index 1 and 3)
	cfg.Holdings[1], cfg.Holdings[3] = cfg.Holdings[3], cfg.Holdings[1]
	cfg.AccountOrder = []string{"TFSA", "RRSP", "Margin"}
	if err := svc.UpdatePortfolio(model.PortfolioConfig(cfg)); err != nil {
		t.Fatalf("UpdatePortfolio: %v", err)
	}
	if _, err := svc.RenameAccount("ordered", "Margin", "Taxable"); err != nil {
		t.Fatalf("RenameAccount: %v", err)
	}

	// Reload from disk to ensure YAML persisted the orders
	st2, err := store.NewStore(base)
	if err != nil {
		t.Fatalf("reload NewStore: %v", err)
	}
	svc2 := NewService(st2, datasource.NewFetcher())
	eval2, err := svc2.Evaluate("ordered", "all")
	if err != nil {
		t.Fatalf("reload Evaluate: %v", err)
	}
	if eval2.AccountSummaries[0].Account != "TFSA" || eval2.AccountSummaries[2].Account != "Taxable" {
		t.Fatalf("reloaded account order = %+v", eval2.AccountSummaries)
	}
	if eval2.AccountSummaries[0].Holdings[0].Symbol != "VAB" || eval2.AccountSummaries[0].Holdings[1].Symbol != "ZCN" {
		t.Fatalf("reloaded TFSA holding order = %+v", eval2.AccountSummaries[0].Holdings)
	}
}
