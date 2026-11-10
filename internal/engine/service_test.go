package engine_test

import (
	"math"
	"path/filepath"
	"testing"

	"embsay/internal/datasource"
	"embsay/internal/engine"
	"embsay/internal/model"
	"embsay/internal/store"
)

func TestEvaluateExamplePortfolios(t *testing.T) {
	baseDir := filepath.Join("..", "..")
	st, err := store.NewStore(baseDir)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}

	// Ensure baseline reference prices exist in cache for evaluation
	cache := st.Cache()
	if cache.Prices == nil {
		cache.Prices = make(map[string]model.CachedPrice)
	}
	if cache.Prices["XEQT"].Price <= 0 {
		cache.Prices["XEQT"] = model.CachedPrice{Price: 45.36, Currency: "CAD"}
	}
	if cache.Prices["VAB"].Price <= 0 {
		cache.Prices["VAB"] = model.CachedPrice{Price: 22.665, Currency: "CAD"}
	}
	if cache.Prices["VEQT"].Price <= 0 {
		cache.Prices["VEQT"] = model.CachedPrice{Price: 61.73, Currency: "CAD"}
	}

	svc := engine.NewService(st, datasource.NewFetcher())

	// Expected totals are computed from the cached prices the engine itself uses,
	// so the assertions hold regardless of when price_cache.yaml was last refreshed.
	prices := st.Cache().Prices
	xeqtPrice := prices["XEQT"].Price
	vabPrice := prices["VAB"].Price

	// 1. Test Pure XEQT portfolio (from examples directory)
	xeqtEval, err := svc.Evaluate("pure_xeqt", "all")
	if err != nil {
		t.Fatalf("Evaluate(pure_xeqt) failed: %v", err)
	}
	// Compute expected total from the actual pure_xeqt holdings, not a hardcoded share count.
	pureL, ok := st.GetPortfolio("pure_xeqt")
	if !ok {
		t.Fatalf("pure_xeqt holdings not found")
	}
	var pureXeqtShares float64
	for _, h := range pureL.Holdings {
		if h.Symbol == "XEQT" {
			pureXeqtShares += h.Shares
		}
	}
	if pureXeqtShares <= 0 {
		t.Fatalf("pure_xeqt has no XEQT holdings")
	}
	// Shares are CAD-listed, no FX conversion.
	wantXeqtTotal := pureXeqtShares * xeqtPrice
	if math.Abs(xeqtEval.CurrentTotalCAD-wantXeqtTotal) > 1.0 {
		t.Errorf("Pure XEQT CurrentTotalCAD = %.2f, want ~%.2f (10450 x $%.2f)",
			xeqtEval.CurrentTotalCAD, wantXeqtTotal, xeqtPrice)
	}
	if !xeqtEval.ChecksPassed {
		t.Errorf("Pure XEQT ChecksPassed = false")
	}

	// 2. Test 30% VAB / 70% XEQT portfolio (from examples directory)
	balEval, err := svc.Evaluate("vab_30_xeqt_70", "all")
	if err != nil {
		t.Fatalf("Evaluate(vab_30_xeqt_70) failed: %v", err)
	}
	// 4800 VAB + (4200 + 3100) XEQT, both CAD-listed
	wantBalTotal := 4800*vabPrice + 7300*xeqtPrice
	if math.Abs(balEval.CurrentTotalCAD-wantBalTotal) > 1.0 {
		t.Errorf("30/70 VAB/XEQT CurrentTotalCAD = %.2f, want ~%.2f (4800 x $%.2f + 7300 x $%.2f)",
			balEval.CurrentTotalCAD, wantBalTotal, vabPrice, xeqtPrice)
	}
	if !balEval.ChecksPassed {
		t.Errorf("30/70 VAB/XEQT ChecksPassed = false")
	}
	if len(balEval.Divisions) != 5 {
		t.Fatalf("30/70 VAB/XEQT Divisions count = %d, want 5 (hierarchical with GICs/Bonds and regions)", len(balEval.Divisions))
	}
	if balEval.Divisions[0].DivisionName != "GICs/Bonds" || math.Abs(balEval.Divisions[0].TargetRatio-0.30) > 0.001 {
		t.Errorf("Division 0 = %s (target %.2f), want GICs/Bonds (0.30)", balEval.Divisions[0].DivisionName, balEval.Divisions[0].TargetRatio)
	}

	// 3. Test 30% VAB / 70% VEQT portfolio (from examples directory)
	veqtEval, err := svc.Evaluate("vab_30_veqt_70", "all")
	if err != nil {
		t.Fatalf("Evaluate(vab_30_veqt_70) failed: %v", err)
	}
	veqtPrice := 59.80
	if p, ok := prices["VEQT"]; ok && p.Price > 0 {
		veqtPrice = p.Price
	}
	wantVeqtTotal := 4800*vabPrice + 5400*veqtPrice
	if math.Abs(veqtEval.CurrentTotalCAD-wantVeqtTotal) > 1.0 {
		t.Errorf("30/70 VAB/VEQT CurrentTotalCAD = %.2f, want ~%.2f", veqtEval.CurrentTotalCAD, wantVeqtTotal)
	}
	if !veqtEval.ChecksPassed {
		t.Errorf("30/70 VAB/VEQT ChecksPassed = false")
	}
	if len(veqtEval.Divisions) != 2 {
		t.Fatalf("30/70 VAB/VEQT Divisions count = %d, want 2 (Fixed Income and Equities)", len(veqtEval.Divisions))
	}
	if veqtEval.Divisions[0].DivisionName != "Fixed Income" || veqtEval.Divisions[1].DivisionName != "Equities" {
		t.Errorf("Divisions mismatch for VEQT demo: %v", veqtEval.Divisions)
	}

	// 4. Test ad-hoc combined group evaluation
	combEval, err := svc.Evaluate("pure_xeqt,vab_30_xeqt_70", "all")
	if err != nil {
		t.Fatalf("Evaluate(combined) failed: %v", err)
	}
	wantComb := xeqtEval.CurrentTotalCAD + balEval.CurrentTotalCAD
	if math.Abs(combEval.CurrentTotalCAD-wantComb) > 1.0 {
		t.Errorf("Combined CurrentTotalCAD = %.2f, want %.2f", combEval.CurrentTotalCAD, wantComb)
	}
}
