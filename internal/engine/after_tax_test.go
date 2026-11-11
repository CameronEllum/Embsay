package engine

import (
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"embsay/internal/datasource"
	"embsay/internal/model"
	"embsay/internal/store"
)

func ptrAfterTaxFactor(f float64) *float64 {
	value := f
	return &value
}

func TestResolveAfterTaxAssumption(t *testing.T) {
	rate := 0.30
	badRate := 1.0
	negativeRate := -0.01
	if _, err := resolveAfterTaxAssumption(model.PortfolioConfig{}); err != nil {
		t.Errorf("disabled portfolio should not require a rate: %v", err)
	}
	if _, err := resolveAfterTaxAssumption(model.PortfolioConfig{AfterTaxAllocation: true}); err == nil {
		t.Errorf("enabled portfolio without rate should fail")
	}
	if _, err := resolveAfterTaxAssumption(model.PortfolioConfig{AfterTaxAllocation: true, RRSPWithdrawalTaxRate: &rate}); err != nil {
		t.Errorf("valid 30%% rate should resolve: %v", err)
	}
	if _, err := resolveAfterTaxAssumption(model.PortfolioConfig{AfterTaxAllocation: true, RRSPWithdrawalTaxRate: &badRate}); err == nil {
		t.Errorf("100%% rate should be rejected")
	}
	if _, err := resolveAfterTaxAssumption(model.PortfolioConfig{AfterTaxAllocation: true, RRSPWithdrawalTaxRate: &negativeRate}); err == nil {
		t.Errorf("negative rate should be rejected")
	}
	if _, err := resolveAfterTaxAssumption(model.PortfolioConfig{
		AfterTaxAllocation:    true,
		RRSPWithdrawalTaxRate: nil,
		Holdings:              []model.HoldingConfig{{AfterTaxFactor: ptrAfterTaxFactor(1 - rate)}},
	}); err != nil {
		t.Errorf("group holding factor should satisfy enabled portfolio: %v", err)
	}
}

func TestAfterTaxFactorForHolding(t *testing.T) {
	rate := 0.30
	assumption := afterTaxAssumption{Enabled: true, Rate: &rate}
	cases := []struct {
		accountType string
		factor      float64
		override    *float64
	}{
		{"rrsp", 0.70, nil},
		{"tfsa", 1.00, nil},
		{"resp", 1.00, nil},
		{"non_registered", 1.00, nil},
		{"rrsp", 0.80, ptrAfterTaxFactor(0.80)},
	}
	for _, c := range cases {
		got := assumption.factorFor(model.HoldingConfig{AccountType: c.accountType, AfterTaxFactor: c.override})
		if math.Abs(got-c.factor) > 1e-12 {
			t.Errorf("factor(%s) = %.4f, want %.4f", c.accountType, got, c.factor)
		}
	}
}

func TestSolveAfterTaxTargetTotalMixedAccounts(t *testing.T) {
	states := []afterTaxDivisionState{
		{Name: "Fixed Income", TargetRatio: 0.5, CurrentValue: 70, RowFactors: []float64{0.7}},
		{Name: "Equities", TargetRatio: 0.5, CurrentValue: 30, RowFactors: []float64{1.0}},
	}
	plan := solveAfterTaxTargetTotal(20, states)
	if !plan.Valid {
		t.Fatalf("solver marked valid fixture invalid: %v", plan.Warnings)
	}
	wantTarget := 150 / (0.5/0.7 + 0.5)
	if math.Abs(plan.TargetTotal-wantTarget) > 1e-9 {
		t.Errorf("TargetTotal = %.9f, want %.9f", plan.TargetTotal, wantTarget)
	}
	if math.Abs(plan.DivisionWeights["Fixed Income"]-1/0.7) > 1e-12 ||
		math.Abs(plan.DivisionWeights["Equities"]-1) > 1e-12 {
		t.Errorf("division weights = %v", plan.DivisionWeights)
	}
	fixedIncomeAlloc := 0.5*plan.TargetTotal - 70
	fixedIncomeGross := fixedIncomeAlloc / 0.7
	equityAlloc := 0.5*plan.TargetTotal - 30
	if math.Abs(fixedIncomeGross+equityAlloc-20) > 1e-9 {
		t.Errorf("gross trades sum = %.9f, want 20", fixedIncomeGross+equityAlloc)
	}
	if math.Abs(fixedIncomeAlloc-(0.5*wantTarget-70)) > 1e-9 {
		t.Errorf("unexpected fixed-income allocation %.9f, want %.9f", fixedIncomeAlloc, 0.5*wantTarget-70)
	}
}

func TestSolveAfterTaxTargetTotalInvalidCoverage(t *testing.T) {
	states := []afterTaxDivisionState{
		{Name: "Fixed Income", TargetRatio: 0.5, CurrentValue: 70, RowFactors: []float64{0.7}},
		{Name: "Equities", TargetRatio: 0.5, CurrentValue: 0},
	}
	plan := solveAfterTaxTargetTotal(0, states)
	if plan.Valid {
		t.Fatalf("missing rebalance target should invalidate plan")
	}
	if len(plan.Warnings) == 0 {
		t.Errorf("expected coverage warning")
	}
}

func writeAfterTaxFixture(t *testing.T) (string, string) {
	t.Helper()
	base := t.TempDir()
	configDir := filepath.Join(base, "config")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		t.Fatalf("mkdir config: %v", err)
	}
	files := map[string]string{
		"config/divisions.yaml": `# after-tax test divisions
categories:
  - name: "Blended"
    order: 1
divisions:
  - name: "Fixed Income"
    category: "Blended"
    order: 1
  - name: "Equities"
    category: "Blended"
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
portfolio_groups: []
`,
		"config/symbols.yaml": `# after-tax test symbols
symbols:
  RRSP_A:
    name: RRSP Fund
    exchange: TSE
    currency: CAD
    default_mer: 0.001
    fixed_price: 100.00
    default_divisions: { "Fixed Income": 1.0 }
  TFSA_A:
    name: TFSA Fund
    exchange: TSE
    currency: CAD
    default_mer: 0.001
    fixed_price: 100.00
    default_divisions: { "Equities": 1.0 }
`,
		"config/data_sources.yaml": `# empty data sources
price_sources: []
fx_sources: []
metadata_recipes: {}
tax_structure_rules: {}
`,
		"config/cache.yaml": `# empty metadata cache
symbol_metadata: {}
`,
		"config/price_cache.yaml": `# no prices needed; test symbols have fixed prices
fx_rates: {}
prices: {}
`,
	}
	for rel, body := range files {
		path := filepath.Join(base, rel)
		if err := os.WriteFile(path, []byte(body), 0644); err != nil {
			t.Fatalf("write %s: %v", rel, err)
		}
	}
	if err := os.MkdirAll(filepath.Join(base, "portfolios"), 0755); err != nil {
		t.Fatalf("mkdir portfolios: %v", err)
	}
	portfolio := `name: "After Tax Mixed"
amount_to_buy: 20
after_tax_allocation: true
rrsp_withdrawal_tax_rate: 0.30
strategy:
  mode: flat
  divisions:
    "Fixed Income": 0.50
    "Equities": 0.50
holdings:
  - account: RRSP
    account_type: rrsp
    symbol: RRSP_A
    shares: 1
    division: "Fixed Income"
    rebalance_divisions:
      - "Fixed Income"
  - account: TFSA
    account_type: tfsa
    symbol: TFSA_A
    shares: 0.30
    division: "Equities"
    rebalance_divisions:
      - "Equities"
`
	if err := os.WriteFile(filepath.Join(base, "portfolios", "after_tax_mixed.yaml"), []byte(portfolio), 0644); err != nil {
		t.Fatalf("write portfolio: %v", err)
	}
	return base, filepath.Join(base, "portfolios", "after_tax_mixed.yaml")
}

func TestAfterTaxPersistenceAndValidation(t *testing.T) {
	base, _ := writeAfterTaxFixture(t)
	st, err := store.NewStore(base)
	if err != nil {
		t.Fatalf("NewStore: %v", err)
	}
	svc := NewService(st, datasource.NewFetcher())

	original, ok := st.GetPortfolio("after_tax_mixed")
	if !ok {
		t.Fatalf("fixture portfolio not found")
	}
	if err := svc.UpdatePortfolio(original); err != nil {
		t.Fatalf("valid enabled portfolio should save: %v", err)
	}
	raw, err := os.ReadFile(filepath.Join(base, "portfolios", "after_tax_mixed.yaml"))
	if err != nil {
		t.Fatalf("read saved file: %v", err)
	}
	if !strings.Contains(string(raw), "after_tax_allocation: true") ||
		!strings.Contains(string(raw), "rrsp_withdrawal_tax_rate: 0.3") {
		t.Errorf("saved YAML lost after-tax fields:\n%s", string(raw))
	}

	invalid := original
	invalid.AfterTaxAllocation = true
	invalid.RRSPWithdrawalTaxRate = nil
	if err := svc.UpdatePortfolio(invalid); err == nil {
		t.Fatalf("enabled portfolio without rate should fail validation")
	}

	copied, err := svc.CreatePortfolio("After Tax Copy", "after_tax_mixed", "")
	if err != nil {
		t.Fatalf("copy portfolio: %v", err)
	}
	if !copied.AfterTaxAllocation || copied.RRSPWithdrawalTaxRate == nil || *copied.RRSPWithdrawalTaxRate != 0.30 {
		t.Errorf("copied portfolio lost after-tax settings: %+v", copied)
	}
	blank, err := svc.CreatePortfolio("Default Copy", "", "")
	if err != nil {
		t.Fatalf("default portfolio: %v", err)
	}
	if blank.AfterTaxAllocation {
		t.Errorf("default portfolio should default after-tax allocation to false")
	}
}

func TestEvaluateAfterTaxMixedPortfolio(t *testing.T) {
	base, _ := writeAfterTaxFixture(t)
	st, err := store.NewStore(base)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}
	svc := NewService(st, datasource.NewFetcher())

	eval, err := svc.Evaluate("after_tax_mixed", "all")
	if err != nil {
		t.Fatalf("Evaluate failed: %v", err)
	}

	if eval.AllocationBasis != "after_tax" {
		t.Errorf("AllocationBasis = %q, want after_tax", eval.AllocationBasis)
	}
	if eval.RRSPWithdrawalTaxRate == nil || *eval.RRSPWithdrawalTaxRate != 0.30 {
		t.Errorf("RRSPWithdrawalTaxRate = %v, want 0.30", eval.RRSPWithdrawalTaxRate)
	}
	if len(eval.RebalanceWarnings) != 0 {
		t.Errorf("unexpected warnings: %v", eval.RebalanceWarnings)
	}
	if math.Abs(eval.GrossCurrentTotalCAD-130) > 1e-9 || math.Abs(eval.CurrentTotalCAD-100) > 1e-9 {
		t.Errorf("gross/current totals = %.6f/%.6f, want 130/100", eval.GrossCurrentTotalCAD, eval.CurrentTotalCAD)
	}
	if math.Abs(eval.EstimatedRRSPDeferredTaxCAD-30) > 1e-9 {
		t.Errorf("estimated deferred tax = %.6f, want 30", eval.EstimatedRRSPDeferredTaxCAD)
	}

	wantTargetTotal := 150 / (0.5/0.7 + 0.5)
	if math.Abs(eval.TargetTotalCAD-wantTargetTotal) > 1e-9 {
		t.Errorf("TargetTotalCAD = %.9f, want %.9f", eval.TargetTotalCAD, wantTargetTotal)
	}
	if math.Abs(eval.CalculatedBuyDiffCAD-20) > 1e-9 || !eval.ChecksPassed {
		t.Errorf("gross calculated trades = %.9f (checks=%v), want 20 and true",
			eval.CalculatedBuyDiffCAD, eval.ChecksPassed)
	}

	if len(eval.Divisions) != 2 {
		t.Fatalf("division count = %d, want 2", len(eval.Divisions))
	}
	var fixedIncome, equities model.DivisionEvaluation
	for _, d := range eval.Divisions {
		switch d.DivisionName {
		case "Fixed Income":
			fixedIncome = d
		case "Equities":
			equities = d
		default:
			t.Errorf("unexpected division %q", d.DivisionName)
		}
	}
	wantAlloc := 0.5*wantTargetTotal - 70
	wantGross := wantAlloc / 0.7
	if math.Abs(fixedIncome.AllocationAmountToBuyCAD-wantAlloc) > 1e-9 ||
		math.Abs(fixedIncome.AmountToBuyCAD-wantGross) > 1e-9 {
		t.Errorf("fixed income allocation/gross = %.9f/%.9f, want %.9f/%.9f",
			fixedIncome.AllocationAmountToBuyCAD, fixedIncome.AmountToBuyCAD, wantAlloc, wantGross)
	}
	wantEquityAlloc := 0.5*wantTargetTotal - 30
	if math.Abs(equities.AmountToBuyCAD-wantEquityAlloc) > 1e-9 {
		t.Errorf("equity gross trade = %.9f, want %.9f", equities.AmountToBuyCAD, wantEquityAlloc)
	}

	if len(fixedIncome.Rows) != 1 || len(equities.Rows) != 1 {
		t.Fatalf("row counts = %d/%d, want 1/1", len(fixedIncome.Rows), len(equities.Rows))
	}
	if math.Abs(fixedIncome.Rows[0].CalculatedSharesBuy-(wantGross/100)) > 1e-9 {
		t.Errorf("RRSP calculated shares = %.9f, want %.9f", fixedIncome.Rows[0].CalculatedSharesBuy, wantGross/100)
	}
	if math.Abs(equities.Rows[0].CalculatedSharesBuy-(wantEquityAlloc/100)) > 1e-9 {
		t.Errorf("TFSA calculated shares = %.9f, want %.9f", equities.Rows[0].CalculatedSharesBuy, wantEquityAlloc/100)
	}

	if len(eval.AccountSummaries) != 2 {
		t.Fatalf("account summaries = %d, want 2", len(eval.AccountSummaries))
	}
	for _, acc := range eval.AccountSummaries {
		switch acc.AccountType {
		case "rrsp":
			if math.Abs(acc.MarketValueCAD-100) > 1e-9 ||
				math.Abs(acc.AfterTaxValueCAD-70) > 1e-9 ||
				math.Abs(acc.EstimatedDeferredTaxCAD-30) > 1e-9 ||
				math.Abs(acc.PortfolioRatio-0.70) > 1e-9 {
				t.Errorf("RRSP account summary = %+v", acc)
			}
		case "tfsa":
			if math.Abs(acc.MarketValueCAD-30) > 1e-9 ||
				math.Abs(acc.AfterTaxValueCAD-30) > 1e-9 ||
				math.Abs(acc.EstimatedDeferredTaxCAD-0) > 1e-9 ||
				math.Abs(acc.PortfolioRatio-0.30) > 1e-9 {
				t.Errorf("TFSA account summary = %+v", acc)
			}
		default:
			t.Errorf("unexpected account type %q", acc.AccountType)
		}
	}

	if len(eval.RawHoldings) != 2 {
		t.Fatalf("raw holdings = %d, want 2", len(eval.RawHoldings))
	}
	for _, h := range eval.RawHoldings {
		expectedGross := h.Shares * 100
		if math.Abs(h.MarketValueCAD-expectedGross) > 1e-9 {
			t.Errorf("%s gross value = %.6f, want %.6f", h.Symbol, h.MarketValueCAD, expectedGross)
		}
		if h.AccountType == "rrsp" {
			if math.Abs(h.AfterTaxValueCAD-70) > 1e-9 {
				t.Errorf("RRSP holding after-tax value = %.6f, want 70", h.AfterTaxValueCAD)
			}
		}
	}
}

func TestEvaluateAfterTaxDisabledMatchesGross(t *testing.T) {
	base, yamlPath := writeAfterTaxFixture(t)
	body, err := os.ReadFile(yamlPath)
	if err != nil {
		t.Fatalf("read portfolio: %v", err)
	}
	disabled := strings.Replace(string(body), "after_tax_allocation: true", "after_tax_allocation: false", 1)
	if err := os.WriteFile(yamlPath, []byte(disabled), 0644); err != nil {
		t.Fatalf("write disabled portfolio: %v", err)
	}
	st, err := store.NewStore(base)
	if err != nil {
		t.Fatalf("NewStore: %v", err)
	}
	svc := NewService(st, datasource.NewFetcher())
	eval, err := svc.Evaluate("after_tax_mixed", "all")
	if err != nil {
		t.Fatalf("Evaluate: %v", err)
	}
	if eval.AllocationBasis != "gross" {
		t.Errorf("basis = %q, want gross", eval.AllocationBasis)
	}
	if math.Abs(eval.CurrentTotalCAD-130) > 1e-9 || math.Abs(eval.GrossCurrentTotalCAD-130) > 1e-9 {
		t.Errorf("disabled current total = %.6f/%.6f, want 130/130", eval.CurrentTotalCAD, eval.GrossCurrentTotalCAD)
	}
	if math.Abs(eval.TargetTotalCAD-150) > 1e-9 {
		t.Errorf("disabled target total = %.6f, want 150", eval.TargetTotalCAD)
	}
}

func TestGroupHoldingFactorsUseMemberRates(t *testing.T) {
	source := `
name: "Group Fixture Parts"
amount_to_buy: 0
holdings: []
`
	base, portfolioPath := writeAfterTaxFixture(t)
	if err := os.WriteFile(filepath.Join(base, "portfolios", "dummy.yaml"), []byte(source), 0644); err != nil {
		t.Fatalf("write dummy portfolio: %v", err)
	}
	_ = portfolioPath
	st, err := store.NewStore(base)
	if err != nil {
		t.Fatalf("NewStore: %v", err)
	}
	svc := NewService(st, datasource.NewFetcher())
	combined, err := svc.GetPortfolioConfig("after_tax_mixed,dummy")
	if err != nil {
		t.Fatalf("group config: %v", err)
	}
	if !combined.AfterTaxAllocation {
		t.Fatalf("group should be after-tax enabled")
	}
	var sawOverride bool
	for _, h := range combined.Holdings {
		if h.AfterTaxFactor == nil {
			t.Errorf("group holding %s missing factor", h.ID)
			continue
		}
		sawOverride = true
	}
	if !sawOverride {
		t.Fatalf("no override factors seen")
	}
	// Mixed group fixture: both members are the same portfolio, so both RRSP and TFSA
	// rows exist. RRSP factor should reflect the member's rate and TFSA should be gross.
	for _, h := range combined.Holdings {
		switch h.AccountType {
		case "rrsp":
			if h.AfterTaxFactor != nil && math.Abs(*h.AfterTaxFactor-0.70) > 1e-12 {
				t.Errorf("RRSP group factor = %.4f, want 0.70", *h.AfterTaxFactor)
			}
		case "tfsa":
			if h.AfterTaxFactor != nil && math.Abs(*h.AfterTaxFactor-1.0) > 1e-12 {
				t.Errorf("TFSA group factor = %.4f, want 1.00", *h.AfterTaxFactor)
			}
		}
	}
}

func TestRenameAccount(t *testing.T) {
	base, _ := writeAfterTaxFixture(t)
	st, err := store.NewStore(base)
	if err != nil {
		t.Fatalf("NewStore: %v", err)
	}
	svc := NewService(st, datasource.NewFetcher())

	count, err := svc.RenameAccount("after_tax_mixed", "RRSP", "Retirement RRSP")
	if err != nil {
		t.Fatalf("RenameAccount: %v", err)
	}
	if count != 1 {
		t.Errorf("RenameAccount updated count = %d, want 1", count)
	}
	p, ok := st.GetPortfolio("after_tax_mixed")
	if !ok {
		t.Fatalf("portfolio not found")
	}
	foundNew := false
	for _, h := range p.Holdings {
		if h.Account == "RRSP" {
			t.Errorf("found holding still with account RRSP")
		}
		if h.Account == "Retirement RRSP" {
			foundNew = true
		}
	}
	if !foundNew {
		t.Errorf("did not find holding with Retirement RRSP")
	}
}
