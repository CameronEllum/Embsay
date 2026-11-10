package engine

import (
	"math"
	"testing"

	"embsay/internal/datasource"
	"embsay/internal/model"
	"embsay/internal/store"
)

func TestEvaluatePlaidStrategyExample(t *testing.T) {
	st, err := store.NewStore("../..")
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	// Ensure baseline reference prices and FX rate exist in cache for evaluation
	cache := st.Cache()
	if cache.FXRates == nil {
		cache.FXRates = make(map[string]model.CachedFX)
	}
	if cache.FXRates["USD_CAD"].Rate <= 0 {
		cache.FXRates["USD_CAD"] = model.CachedFX{Rate: 1.4123}
	}
	if cache.Prices == nil {
		cache.Prices = make(map[string]model.CachedPrice)
	}
	defaults := map[string]struct {
		p float64
		c string
	}{
		"ZCN":  {48.82, "CAD"},
		"XEF":  {51.91, "CAD"},
		"ITOT": {164.50, "USD"},
		"IEMG": {74.27, "USD"},
		"IEFA": {97.68, "USD"},
		"ZDB":  {15.12, "CAD"},
		"VAB":  {22.665, "CAD"},
		"XIC":  {58.24, "CAD"},
		"VTI":  {370.90, "USD"},
	}
	for sym, def := range defaults {
		if cache.Prices[sym].Price <= 0 {
			cache.Prices[sym] = model.CachedPrice{Price: def.p, Currency: def.c}
		}
	}

	svc := NewService(st, datasource.NewFetcher())

	eval, err := svc.Evaluate("plaid_strategy", "all")
	if err != nil {
		t.Fatalf("Evaluate plaid_strategy error: %v", err)
	}

	if eval.AllocationBasis != "after_tax" {
		t.Errorf("expected AllocationBasis = 'after_tax', got %q", eval.AllocationBasis)
	}

	// Gross pre-tax total should be ~$1,000,000 CAD (within tolerance for live market prices and FX)
	if math.Abs(eval.GrossCurrentTotalCAD-1000000) > 30000.0 {
		t.Errorf("GrossCurrentTotalCAD = %.2f, expected ~1000000", eval.GrossCurrentTotalCAD)
	}

	// After-tax total should be ~$825,000 CAD (within tolerance)
	if math.Abs(eval.CurrentTotalCAD-825000) > 25000.0 {
		t.Errorf("CurrentTotalCAD = %.2f, expected ~825000", eval.CurrentTotalCAD)
	}

	// RRSP deferred tax = ~$175,000 CAD ($500,000 * 0.35)
	if math.Abs(eval.EstimatedRRSPDeferredTaxCAD-175000) > 10000.0 {
		t.Errorf("EstimatedRRSPDeferredTaxCAD = %.2f, expected ~175000", eval.EstimatedRRSPDeferredTaxCAD)
	}

	t.Logf("Portfolio: %s", eval.PortfolioName)
	t.Logf("Gross: $%.2f CAD | After-Tax: $%.2f CAD | RRSP Tax: $%.2f CAD",
		eval.GrossCurrentTotalCAD, eval.CurrentTotalCAD, eval.EstimatedRRSPDeferredTaxCAD)
	for _, a := range eval.AccountSummaries {
		t.Logf("Account %s: Gross=$%.2f CAD, AfterTax=$%.2f CAD", a.Account, a.MarketValueCAD, a.AfterTaxValueCAD)
	}
	for _, d := range eval.Divisions {
		t.Logf("Division %-20s: Current=$%.2f CAD (%.2f%%) | Target=$%.2f CAD (%.2f%%)",
			d.DivisionName, d.CurrentValueCAD, d.CurrentRatio*100, d.TargetValueCAD, d.TargetRatio*100)
	}
	for _, d := range eval.Divisions {
		drift := math.Abs(d.CurrentRatio - d.TargetRatio)
		if drift > 0.005 {
			t.Errorf("Division %s has drift %.4f (current=%.4f, target=%.4f)",
				d.DivisionName, drift, d.CurrentRatio, d.TargetRatio)
		}
	}
}
