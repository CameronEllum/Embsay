package engine

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"embsay/internal/datasource"
	"embsay/internal/model"
	"embsay/internal/store"
)

func setupBucketTestEnv(t *testing.T, portfolioYAML string) (*store.Store, *Service) {
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
account_types:
  rrsp:
    name: RRSP
    registered: true
    aliases: ["RRSP"]
  non_registered:
    name: Non-Registered
    registered: false
    aliases: ["Savings", "Broker"]
`,
		"config/symbols.yaml": `symbols:
  VAB:
    name: Bond ETF
    exchange: TSE
    currency: CAD
    fixed_price: 25.0
    default_mer: 0.0009
    default_divisions: { "GICs/Bonds": 1.0 }
  ZCN:
    name: Canada ETF
    exchange: TSE
    currency: CAD
    fixed_price: 50.0
    default_mer: 0.0006
    default_divisions: { "Canada": 1.0 }
`,
		"config/data_sources.yaml":   "price_sources: []\nfx_sources: []\nmetadata_recipes: {}\ntax_structure_rules: {}\n",
		"config/cache.yaml":          "symbol_metadata: {}\n",
		"config/price_cache.yaml":    "fx_rates:\n  USD_CAD:\n    rate: 1.40\nprices: {}\n",
		"portfolios/test_port.yaml":  portfolioYAML,
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
	return st, NewService(st, datasource.NewFetcher())
}

func TestBucketInheritanceFallbackAndAllocationScope(t *testing.T) {
	yaml := `name: Bucket Inheritance Test
amount_to_buy: 0
accounts:
  - name: QT RRSP
    account_type: rrsp
    bucket: Retirement
  - name: Work RRSP
    account_type: rrsp
    bucket: Retirement
    exclude_from_rebalancing: true
  - name: Savings
    account_type: non_registered
  - name: Travel Fund
    account_type: non_registered
    bucket: Travel
buckets:
  - name: Emergency
    target_amount: 10000
holdings:
  # 1. Inherits Retirement from QT RRSP ($5000) -> allocated
  - account: QT RRSP
    account_type: rrsp
    symbol: ZCN
    shares: 100
  # 2. Override inside Retirement account into Emergency ($1000) -> NOT allocated
  - account: QT RRSP
    account_type: rrsp
    symbol: VAB
    shares: 40
    bucket: Emergency
  # 3. Option B: Retirement account with exclude_from_rebalancing ($2000) -> counted in Retirement bucket & NetWorth, NOT allocated
  - account: Work RRSP
    account_type: rrsp
    symbol: UNKNOWN_WORK_FUND
    shares: 1
  # 4. Neither account nor position has bucket -> falls back to Other ($500) -> NOT allocated
  - account: Savings
    account_type: non_registered
    symbol: UNTRACKED_CASH
    shares: 1
  # 5. Position inside unassigned Savings account overrides into Retirement ($2500) -> allocated
  - account: Savings
    account_type: non_registered
    symbol: VAB
    shares: 100
    bucket: Retirement
  # 6. Inherits Travel from Travel Fund ($1000) -> NOT allocated
  - account: Travel Fund
    account_type: non_registered
    symbol: ZCN
    shares: 20
strategy:
  mode: hierarchical
  categories:
    Cash and Bonds: 0.4
    Stocks: 0.6
  category_splits:
    Cash and Bonds:
      GICs/Bonds: 1.0
    Stocks:
      Canada: 1.0
`
	st, svc := setupBucketTestEnv(t, yaml)
	// Give UNKNOWN_WORK_FUND fixed price 2000 in symbols.yaml so Work RRSP evaluates to $2000
	symCfg := st.Symbols()
	symCfg.Symbols["UNKNOWN_WORK_FUND"] = model.SymbolDef{
		Name:       "Work Target Date",
		Exchange:   "MANUAL",
		Currency:   "CAD",
		FixedPrice: 2000,
	}
	if err := st.SaveSymbols(symCfg); err != nil {
		t.Fatalf("SaveSymbols: %v", err)
	}

	eval, err := svc.Evaluate("test_port", "all")
	if err != nil {
		t.Fatalf("Evaluate: %v", err)
	}

	// Allocated holdings: QT RRSP ZCN ($5000) + Savings VAB ($2500) = $7500
	if eval.CurrentTotalCAD != 7500 {
		t.Fatalf("CurrentTotalCAD = %.2f, want 7500.00", eval.CurrentTotalCAD)
	}

	// Net worth: 5000 (ZCN) + 1000 (VAB Emergency) + 2000 (Work RRSP) + 1 (UNTRACKED_CASH fallback price=$1) + 2500 (VAB Ret) + 1000 (Travel) = 11501
	if eval.NetWorthCAD != 11501 {
		t.Fatalf("NetWorthCAD = %.2f, want 11501.00", eval.NetWorthCAD)
	}

	// Divisions must only include Retirement bucket holdings (ZCN=5000, GICs/Bonds=2500)
	divVals := map[string]float64{}
	for _, d := range eval.Divisions {
		divVals[d.DivisionName] = d.CurrentValueCAD
		for _, r := range d.Rows {
			if r.Bucket != model.DefaultBucketRetirement {
				t.Errorf("non-Retirement holding %s appeared in division %s", r.Symbol, d.DivisionName)
			}
		}
	}
	if divVals["Canada"] != 5000 || divVals["GICs/Bonds"] != 2500 {
		t.Fatalf("unexpected division values: %+v", divVals)
	}

	// DataWarnings must ignore UNTRACKED_CASH (Other bucket) and Work RRSP (excluded), so no warnings!
	for _, w := range eval.DataWarnings {
		if strings.Contains(w, "UNTRACKED_CASH") || strings.Contains(w, "UNKNOWN_WORK_FUND") {
			t.Errorf("unexpected data warning for non-allocated holding: %s", w)
		}
	}

	// Bucket summaries: Retirement ($5000 + $2000 + $2500 = $9500), Emergency ($1000), Travel ($1000), Other ($0 from UNTRACKED_CASH, 1 pos)
	byBucket := map[string]model.BucketSummary{}
	for _, b := range eval.BucketSummaries {
		byBucket[b.Bucket] = b
	}
	ret, ok := byBucket[model.DefaultBucketRetirement]
	if !ok {
		t.Fatalf("missing default Retirement bucket in %+v", eval.BucketSummaries)
	}
	if !ret.IsAllocationBucket || !ret.IsDefault {
		t.Errorf("Retirement flags = (alloc=%v, def=%v), want (true, true)", ret.IsAllocationBucket, ret.IsDefault)
	}
	if ret.MarketValueCAD != 9500 || ret.PositionCount != 3 {
		t.Errorf("Retirement bucket = (%.2f, %d pos), want (9500, 3)", ret.MarketValueCAD, ret.PositionCount)
	}
	if byBucket["Emergency"].MarketValueCAD != 1000 {
		t.Errorf("Emergency bucket = %.2f, want 1000", byBucket["Emergency"].MarketValueCAD)
	}
	if byBucket["Travel"].MarketValueCAD != 1000 {
		t.Errorf("Travel bucket = %.2f, want 1000", byBucket["Travel"].MarketValueCAD)
	}
	other, hasOther := byBucket[model.DefaultBucketOther]
	if !hasOther || !other.IsDefault || other.PositionCount != 1 {
		t.Errorf("Other fallback bucket = %+v (exists=%v), want default with 1 position", other, hasOther)
	}

	// Verify RawHoldings inheritance flags
	for _, rh := range eval.RawHoldings {
		switch {
		case rh.Account == "QT RRSP" && rh.Symbol == "ZCN":
			if rh.Bucket != "Retirement" || !rh.BucketInherited || rh.OwnBucket != "" {
				t.Errorf("QT RRSP ZCN = %+v", rh)
			}
		case rh.Account == "QT RRSP" && rh.Symbol == "VAB":
			if rh.Bucket != "Emergency" || rh.BucketInherited || rh.OwnBucket != "Emergency" {
				t.Errorf("QT RRSP VAB = %+v", rh)
			}
		case rh.Account == "Savings" && rh.Symbol == "UNTRACKED_CASH":
			if rh.Bucket != "Other" || !rh.BucketInherited || rh.OwnBucket != "" {
				t.Errorf("Savings UNTRACKED_CASH = %+v", rh)
			}
		case rh.Account == "Savings" && rh.Symbol == "VAB":
			if rh.Bucket != "Retirement" || rh.BucketInherited || rh.OwnBucket != "Retirement" {
				t.Errorf("Savings VAB = %+v", rh)
			}
		}
	}

	// CreatePortfolio must seed Retirement bucket by default
	created, err := svc.CreatePortfolio("Brand New", "", "")
	if err != nil {
		t.Fatalf("CreatePortfolio: %v", err)
	}
	if len(created.Buckets) == 0 || created.Buckets[0].Name != model.DefaultBucketRetirement {
		t.Errorf("CreatePortfolio buckets = %+v, want default Retirement", created.Buckets)
	}
}
