package engine

import (
	"fmt"
	"math"
	"strings"

	"embsay/internal/model"
)

func cloneAfterTaxRate(rate *float64) *float64 {
	if rate == nil {
		return nil
	}
	value := *rate
	return &value
}

// afterTaxAssumption is the normalized, portfolio-owned RRSP allocation assumption.
// Trade values remain gross CAD even when allocation values are after-tax.
type afterTaxAssumption struct {
	Enabled bool
	Rate    *float64
}

// resolveAfterTaxAssumption validates a portfolio's optional after-tax settings.
// A combined group supplies evaluation-only per-holding factors; it has no single
// rate of its own, so its enabled setting may be backed solely by those factors.
func resolveAfterTaxAssumption(p model.PortfolioConfig) (afterTaxAssumption, error) {
	if !p.AfterTaxAllocation {
		return afterTaxAssumption{Enabled: false}, nil
	}

	if p.RRSPWithdrawalTaxRate == nil {
		for _, h := range p.Holdings {
			if h.AfterTaxFactor != nil {
				// Combined group: every member's rate already lives on its holdings.
				return afterTaxAssumption{Enabled: true}, nil
			}
		}
		return afterTaxAssumption{Enabled: false}, fmt.Errorf(
			"after_tax_allocation is enabled but rrsp_withdrawal_tax_rate is missing")
	}

	rate := *p.RRSPWithdrawalTaxRate
	if err := validateAfterTaxRate(rate); err != nil {
		return afterTaxAssumption{Enabled: false}, err
	}
	return afterTaxAssumption{Enabled: true, Rate: p.RRSPWithdrawalTaxRate}, nil
}

func validateAfterTaxRate(rate float64) error {
	if math.IsNaN(rate) || math.IsInf(rate, 0) {
		return fmt.Errorf("rrsp_withdrawal_tax_rate must be a finite number between 0 and 1")
	}
	if rate < 0 || rate >= 1 {
		return fmt.Errorf("rrsp_withdrawal_tax_rate must be at least 0 and less than 1 (got %.4f)", rate)
	}
	return nil
}

// factorFor returns the allocation factor for one holding. Higher-level callers use
// this after converting the holding to CAD; per-holding factors let a combined group
// carry each member's own RRSP assumption.
func (a afterTaxAssumption) factorFor(h model.HoldingConfig) float64 {
	if h.AfterTaxFactor != nil {
		f := *h.AfterTaxFactor
		if !math.IsNaN(f) && !math.IsInf(f, 0) && f >= 0 && f <= 1 {
			return f
		}
	}
	if a.Enabled && a.Rate != nil && strings.EqualFold(h.AccountType, "rrsp") {
		return 1 - *a.Rate
	}
	return 1
}

type afterTaxDivisionState struct {
	Name         string
	TargetRatio  float64
	CurrentValue float64
	RowFactors   []float64
}

type afterTaxTargetPlan struct {
	TargetTotal     float64
	DivisionWeights map[string]float64
	Warnings        []string
	Valid           bool
}

// solveAfterTaxTargetTotal solves the one-dimensional target above while keeping the
// sum of *gross* calculated trades equal to the gross cash budget.
//
// For division d, with target t_d, current after-tax value C_d, and rebalance rows j:
//
//	W_d = (1/n_d) * sum(1/f_j)
//	B_d = (t_d*T - C_d) * W_d             gross trade for the whole division
//	(t_d*T - C_d) / n_d / f_j             gross trade for row j
//
// Summing B_d over divisions and setting it to the gross cash budget gives:
//
//	T = (cash + sum(C_d * W_d)) / sum(t_d * W_d)
func solveAfterTaxTargetTotal(grossCash float64, states []afterTaxDivisionState) afterTaxTargetPlan {
	plan := afterTaxTargetPlan{
		DivisionWeights: make(map[string]float64, len(states)),
		Valid:           true,
	}

	targetSum := 0.0
	for _, st := range states {
		targetSum += st.TargetRatio
	}
	if math.Abs(targetSum-1) > 0.001 {
		plan.Valid = false
		plan.Warnings = append(plan.Warnings, fmt.Sprintf(
			"After-tax rebalancing requires strategy targets to sum to 100%% (currently %.2f%%)", targetSum*100))
	}

	numerator := grossCash
	denominator := 0.0
	for _, st := range states {
		st := st
		if st.TargetRatio <= epsilonAfterTax && st.CurrentValue <= epsilonAfterTax {
			// Nothing to hold or rebalance in this division.
			continue
		}
		if len(st.RowFactors) == 0 {
			plan.Valid = false
			plan.Warnings = append(plan.Warnings, fmt.Sprintf(
				"Division %q needs at least one rebalance target when after-tax allocation is enabled", st.Name))
			continue
		}
		if st.TargetRatio <= epsilonAfterTax && st.CurrentValue > epsilonAfterTax {
			plan.Valid = false
			plan.Warnings = append(plan.Warnings, fmt.Sprintf(
				"Division %q has a current balance but a 0%% target and no tradeable rebalance target", st.Name))
			continue
		}

		inverseSum := 0.0
		factorOK := true
		for _, f := range st.RowFactors {
			if !isValidAfterTaxFactor(f) {
				factorOK = false
				continue
			}
			if f <= 0 {
				factorOK = false
				continue
			}
			inverseSum += 1 / f
		}
		if !factorOK || inverseSum <= 0 {
			plan.Valid = false
			plan.Warnings = append(plan.Warnings, fmt.Sprintf(
				"Division %q has an invalid RRSP after-tax factor", st.Name))
			continue
		}
		w := inverseSum / float64(len(st.RowFactors))
		plan.DivisionWeights[st.Name] = w
		numerator += st.CurrentValue * w
		denominator += st.TargetRatio * w
	}

	if plan.Valid {
		if denominator <= 0 || math.IsInf(denominator, 0) {
			plan.Valid = false
			plan.Warnings = append(plan.Warnings,
				"After-tax rebalancing needs at least one valid target with usable rebalance rows")
		}
	}

	if !plan.Valid {
		// Keep a display-only fallback; callers must suppress calculated trades when
		// Valid is false.
		plan.TargetTotal = grossCash
		for _, st := range states {
			plan.TargetTotal += st.CurrentValue
		}
		return plan
	}

	plan.TargetTotal = numerator / denominator
	if math.IsNaN(plan.TargetTotal) || math.IsInf(plan.TargetTotal, 0) || plan.TargetTotal < 0 {
		plan.Valid = false
		plan.Warnings = append(plan.Warnings,
			"After-tax rebalancing target total is not feasible from the current cash amount")
	}
	return plan
}

const epsilonAfterTax = 1e-12

func isValidAfterTaxFactor(f float64) bool {
	return !math.IsNaN(f) && !math.IsInf(f, 0) && f >= 0 && f <= 1
}
