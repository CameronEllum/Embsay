package engine

import (
	"fmt"
	"log"
	"math"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"embsay/internal/datasource"
	"embsay/internal/model"
	"embsay/internal/store"
)

const DefaultUSDCAD = 1.395255

// Service encapsulates all portfolio evaluation, rebalancing, and data refresh business logic.
// It has zero HTTP dependencies so it can be bound directly to a Wails desktop app, CLI, or web server.
type Service struct {
	store        *store.Store
	fetcher      *datasource.Fetcher
	refreshMu    sync.Mutex
	refreshCfgCh chan model.AppConfig
}

func NewService(s *store.Store, f *datasource.Fetcher) *Service {
	return &Service{
		store:        s,
		fetcher:      f,
		refreshCfgCh: make(chan model.AppConfig, 4),
	}
}

func ParseLookupInterval(raw string) time.Duration {
	s := strings.TrimSpace(raw)
	if s == "" || s == "0" || s == "0s" || strings.EqualFold(s, "off") || strings.EqualFold(s, "none") {
		return 0
	}
	if d, err := time.ParseDuration(s); err == nil && d >= 0 {
		return d
	}
	return 1 * time.Hour
}

// StartPriceAutoRefresh runs background price & FX lookups based on config/config.yaml
// (lookup_on_load and lookup_interval), dynamically adjusting when UpdateAppConfig is called.
func (s *Service) StartPriceAutoRefresh() {
	go func() {
		cfg := s.store.AppConfig()
		if cfg.LookupOnLoad {
			if report, err := s.RefreshPricesAndFX(); err != nil {
				log.Printf("[auto-refresh] price cache write error: %v", err)
			} else {
				log.Printf("[auto-refresh] refreshed %d security prices (FX: %v)", len(report.UpdatedPrices), report.UpdatedFX)
			}
		}

		var ticker *time.Ticker
		var tickCh <-chan time.Time
		applyInterval := func(raw string) {
			if ticker != nil {
				ticker.Stop()
				ticker = nil
				tickCh = nil
			}
			d := ParseLookupInterval(raw)
			if d > 0 {
				ticker = time.NewTicker(d)
				tickCh = ticker.C
			}
		}
		applyInterval(cfg.LookupInterval)

		for {
			select {
			case newCfg := <-s.refreshCfgCh:
				applyInterval(newCfg.LookupInterval)
			case <-tickCh:
				if report, err := s.RefreshPricesAndFX(); err != nil {
					log.Printf("[auto-refresh] periodic price refresh error: %v", err)
				} else {
					log.Printf("[auto-refresh] periodic refreshed %d security prices", len(report.UpdatedPrices))
				}
			}
		}
	}()
}

// StartWeeklyBackupScheduler starts a background ticker that checks and runs weekly backups.
func (s *Service) StartWeeklyBackupScheduler() {
	go func() {
		// Run initial check shortly after startup
		time.Sleep(5 * time.Second)
		s.store.CheckAndRunWeeklyBackups()

		// Periodic check every 6 hours
		ticker := time.NewTicker(6 * time.Hour)
		for range ticker.C {
			s.store.CheckAndRunWeeklyBackups()
		}
	}()
}

type AppState struct {
	Config      model.AppConfig         `json:"config"`
	Portfolios  []PortfolioMeta         `json:"portfolios"`
	Divisions   model.DivisionsConfig   `json:"divisions"`
	Symbols     model.SymbolsConfig     `json:"symbols"`
	DataSources model.DataSourcesConfig `json:"data_sources"`
	Cache       model.CacheConfig       `json:"cache"`
}

type PortfolioMeta struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	FilePath      string   `json:"file_path,omitempty"`
	SourceDir     string   `json:"source_dir,omitempty"`
	HoldingsCount int      `json:"holdings_count,omitempty"`
	AccountsCount int      `json:"accounts_count,omitempty"`
	IsGroup       bool     `json:"is_group,omitempty"`
	IsExample     bool     `json:"is_example,omitempty"`
	Members       []string `json:"members,omitempty"`
}

func (s *Service) AppConfig() model.AppConfig {
	return s.store.AppConfig()
}

func (s *Service) GetAppState() AppState {
	ids := s.store.PortfolioIDs()
	allP := s.store.AllPortfolios()
	divCfg := s.store.Divisions()
	var metas []PortfolioMeta
	for _, id := range ids {
		p := allP[id]
		accMap := make(map[string]bool)
		for _, h := range p.Holdings {
			if h.Account != "" {
				accMap[h.Account] = true
			}
		}
		metas = append(metas, PortfolioMeta{
			ID:            p.ID,
			Name:          p.Name,
			FilePath:      p.FilePath,
			SourceDir:     p.SourceDir,
			HoldingsCount: len(p.Holdings),
			AccountsCount: len(accMap),
			IsExample:     p.IsExample,
		})
	}
	for _, grp := range divCfg.PortfolioGroups {
		if len(grp.Members) > 0 {
			metas = append(metas, PortfolioMeta{
				ID:      grp.ID,
				Name:    grp.Name,
				IsGroup: true,
				Members: grp.Members,
			})
		}
	}
	return AppState{
		Config:      s.store.AppConfig(),
		Portfolios:  metas,
		Divisions:   divCfg,
		Symbols:     s.store.Symbols(),
		DataSources: s.store.DataSources(),
		Cache:       s.store.Cache(),
	}
}

// UpdateAppConfig saves user edits to config/config.yaml and updates the background lookup interval.
func (s *Service) UpdateAppConfig(cfg model.AppConfig) error {
	lang := strings.TrimSpace(cfg.Language)
	if strings.EqualFold(lang, "fr-CA") || strings.EqualFold(lang, "fr") {
		cfg.Language = "fr-CA"
	} else {
		cfg.Language = "en-CA"
	}
	mode := strings.ToLower(strings.TrimSpace(cfg.ThemeMode))
	if mode != "light" && mode != "dark" && mode != "system" {
		mode = "system"
	}
	cfg.ThemeMode = mode
	if strings.TrimSpace(cfg.LookupInterval) == "" {
		cfg.LookupInterval = "1h"
	}
	if err := s.store.SaveAppConfig(cfg); err != nil {
		return err
	}
	select {
	case s.refreshCfgCh <- cfg:
	default:
	}
	return nil
}

// resolveGroupMembers checks if portfolioID is a saved group or comma-separated list of portfolios.
func (s *Service) resolveGroupMembers(portfolioID string) ([]string, string, string, bool) {
	divCfg := s.store.Divisions()
	for _, grp := range divCfg.PortfolioGroups {
		if grp.ID == portfolioID {
			return grp.Members, grp.Name, grp.StrategyFromID, true
		}
	}
	if strings.Contains(portfolioID, ",") {
		parts := strings.Split(portfolioID, ",")
		var members []string
		var names []string
		for _, part := range parts {
			id := strings.TrimSpace(part)
			if p, ok := s.store.GetPortfolio(id); ok {
				members = append(members, id)
				names = append(names, p.Name)
			}
		}
		if len(members) > 0 {
			return members, strings.Join(names, " + "), members[0], true
		}
	}
	return nil, "", "", false
}

// GetPortfolioConfig returns a portfolio config (or builds a combined virtual portfolio for any group).
func (s *Service) GetPortfolioConfig(portfolioID string) (model.PortfolioConfig, error) {
	if p, ok := s.store.GetPortfolio(portfolioID); ok {
		return p, nil
	}
	members, groupName, stratFromID, isGroup := s.resolveGroupMembers(portfolioID)
	if isGroup && len(members) > 0 {
		combined := model.PortfolioConfig{
			ID:   portfolioID,
			Name: groupName,
		}
		if stratFromID != "" {
			if sp, ok := s.store.GetPortfolio(stratFromID); ok {
				combined.Strategy = sp.Strategy
			}
		}
		anyAfterTax := false
		for idx, mID := range members {
			mp, ok := s.store.GetPortfolio(mID)
			if !ok {
				continue
			}
			if _, err := resolveAfterTaxAssumption(mp); err != nil {
				return model.PortfolioConfig{}, fmt.Errorf("member portfolio %q: %w", mID, err)
			}
			if mp.AfterTaxAllocation {
				anyAfterTax = true
			}
			if idx == 0 && combined.Strategy.Mode == "" {
				combined.Strategy = mp.Strategy
			}
			combined.AmountToBuy += mp.AmountToBuy
			for _, h := range mp.Holdings {
				hc := h
				hc.ID = mID + ":" + h.ID
				hc.Account = mp.Name + " · " + h.Account
				// Each member keeps its own RRSP rate during group evaluation; the
				// holding-level factor is evaluation-only and is never persisted.
				factor := 1.0
				if mp.AfterTaxAllocation && mp.RRSPWithdrawalTaxRate != nil && strings.EqualFold(hc.AccountType, "rrsp") {
					factor = 1 - *mp.RRSPWithdrawalTaxRate
				}
				hc.AfterTaxFactor = &factor
				combined.Holdings = append(combined.Holdings, hc)
			}
		}
		combined.AfterTaxAllocation = anyAfterTax
		return combined, nil
	}
	return model.PortfolioConfig{}, fmt.Errorf("portfolio or group %q not found", portfolioID)
}

// Evaluate computes the complete Current, Target, and After rebalancing breakdown for a portfolio.
func (s *Service) Evaluate(portfolioID string, filterAccount string) (model.PortfolioEvaluation, error) {
	p, err := s.GetPortfolioConfig(portfolioID)
	if err != nil {
		return model.PortfolioEvaluation{}, err
	}

	divCfg := s.store.Divisions()
	symCfg := s.store.Symbols()
	dsCfg := s.store.DataSources()
	cacheCfg := s.store.Cache()

	usdCad := DefaultUSDCAD
	fxUpdated := "default"
	if fx, ok := cacheCfg.FXRates["USD_CAD"]; ok && fx.Rate > 0 {
		usdCad = fx.Rate
		fxUpdated = fx.UpdatedAt
	}

	// Sort categories & divisions by Order (or resolve flat strategy direct divisions)
	var cats []model.CategoryDef
	var divs []model.DivisionDef

	if strings.EqualFold(p.Strategy.Mode, "flat") && len(p.Strategy.Divisions) > 0 {
		globalDivByName := make(map[string]model.DivisionDef, len(divCfg.Divisions))
		for _, d := range divCfg.Divisions {
			globalDivByName[d.Name] = d
		}
		globalCatByName := make(map[string]model.CategoryDef, len(divCfg.Categories))
		for _, c := range divCfg.Categories {
			globalCatByName[c.Name] = c
		}

		// Determine division ordering:
		// 1. Order of appearance in holdings (h.Division, h.Divisions, h.RebalanceDivisions)
		// 2. Any remaining strategy divisions (sorted alphabetically)
		var orderedDivNames []string
		seenDivs := make(map[string]bool)

		addDivName := func(name string) {
			name = strings.TrimSpace(name)
			if name == "" || seenDivs[name] {
				return
			}
			if _, inStrat := p.Strategy.Divisions[name]; inStrat {
				seenDivs[name] = true
				orderedDivNames = append(orderedDivNames, name)
			}
		}

		for _, h := range p.Holdings {
			if h.Division != "" {
				addDivName(h.Division)
			}
			for dName := range h.Divisions {
				addDivName(dName)
			}
			for _, rd := range h.RebalanceDivisions {
				addDivName(rd)
			}
		}

		var remaining []string
		for name := range p.Strategy.Divisions {
			if !seenDivs[name] {
				remaining = append(remaining, name)
			}
		}
		sort.Strings(remaining)
		for _, name := range remaining {
			seenDivs[name] = true
			orderedDivNames = append(orderedDivNames, name)
		}

		seenCats := make(map[string]bool)
		var orderedCatNames []string

		for i, name := range orderedDivNames {
			catName := name
			if gDef, ok := globalDivByName[name]; ok && gDef.Category != "" {
				catName = gDef.Category
			}
			divs = append(divs, model.DivisionDef{
				Name:     name,
				Category: catName,
				Order:    i + 1,
			})
			if !seenCats[catName] {
				seenCats[catName] = true
				orderedCatNames = append(orderedCatNames, catName)
			}
		}

		for i, cName := range orderedCatNames {
			cats = append(cats, model.CategoryDef{
				Name:  cName,
				Order: i + 1,
			})
		}
	} else if len(p.Strategy.Categories) > 0 && len(p.Strategy.CategorySplits) > 0 {
		var orderedCatNames []string
		for cName := range p.Strategy.Categories {
			orderedCatNames = append(orderedCatNames, cName)
		}
		sort.Strings(orderedCatNames)
		for i, cName := range orderedCatNames {
			cats = append(cats, model.CategoryDef{
				Name:  cName,
				Order: i + 1,
			})
			if splits, ok := p.Strategy.CategorySplits[cName]; ok {
				var divNames []string
				for dName := range splits {
					divNames = append(divNames, dName)
				}
				sort.Strings(divNames)
				for _, dName := range divNames {
					divs = append(divs, model.DivisionDef{
						Name:     dName,
						Category: cName,
						Order:    len(divs) + 1,
					})
				}
			}
		}
	} else {
		cats = make([]model.CategoryDef, len(divCfg.Categories))
		copy(cats, divCfg.Categories)
		sort.Slice(cats, func(i, j int) bool { return cats[i].Order < cats[j].Order })

		divs = make([]model.DivisionDef, len(divCfg.Divisions))
		copy(divs, divCfg.Divisions)
		sort.Slice(divs, func(i, j int) bool { return divs[i].Order < divs[j].Order })
	}

	divByName := make(map[string]model.DivisionDef, len(divs))
	for _, d := range divs {
		divByName[d.Name] = d
	}

	// Resolve target ratios per category and division
	catTargetRatios, divTargetRatios, divRelCatWeights := resolveStrategyTargets(p.Strategy, cats, divs)

	// After-tax allocation is portfolio-owned. Gross trades and shares remain gross CAD.
	afterTax, err := resolveAfterTaxAssumption(p)
	if err != nil {
		return model.PortfolioEvaluation{}, err
	}

	// Filter holdings if filterAccount is set
	if filterAccount == "" {
		filterAccount = "all"
	}
	filteredHoldings := filterHoldings(p.Holdings, filterAccount, divCfg.AccountTypes)

	// Build raw holdings summary and slice each holding across its divisions
	slicesByDiv := make(map[string][]model.EvaluatedSlice, len(divs))
	var rawHoldings []model.HoldingSummary

	defaultDivName := "GICs/Bonds"
	if len(divs) > 0 {
		defaultDivName = divs[0].Name
	}

	for _, h := range filteredHoldings {
		symDef, hasSym := symCfg.Symbols[h.Symbol]
		if !hasSym {
			symDef = model.SymbolDef{
				Name:             h.Symbol,
				Exchange:         "TSX",
				Currency:         "CAD",
				DefaultDivisions: map[string]float64{defaultDivName: 1.0},
			}
		}

		price, currency := resolvePriceAndCurrency(h.Symbol, symDef, cacheCfg)
		fxRate := 1.0
		if strings.EqualFold(currency, "USD") {
			fxRate = usdCad
		}

		mer := resolveMER(h.Symbol, symDef, cacheCfg)
		tax := resolveTax(h.Symbol, h.AccountType, symDef, cacheCfg, dsCfg)
		divWeights := resolveDivisionWeights(h.Symbol, symDef, cacheCfg)

		// Check if holding defines an explicit division or divisions map matching active divisions
		if h.Division != "" {
			if _, ok := divByName[h.Division]; ok {
				divWeights = map[string]float64{h.Division: 1.0}
			}
		} else if len(h.Divisions) > 0 {
			validDivs := make(map[string]float64)
			for dName, w := range h.Divisions {
				if _, ok := divByName[dName]; ok {
					validDivs[dName] = w
				}
			}
			if len(validDivs) > 0 {
				divWeights = validDivs
			}
		} else if strings.EqualFold(p.Strategy.Mode, "flat") && len(p.Strategy.Divisions) > 0 {
			hasAll := true
			for dName := range divWeights {
				if _, ok := divByName[dName]; !ok {
					hasAll = false
					break
				}
			}
			if !hasAll {
				if _, hasEq := divByName["Equities"]; hasEq {
					if _, hasFI := divByName["Fixed Income"]; hasFI {
						isBond := false
						for dName := range divWeights {
							dl := strings.ToLower(dName)
							if dl == "gic/bonds" || dl == "gics/bonds" || strings.Contains(dl, "bond") || strings.Contains(dl, "fixed") || strings.Contains(dl, "gic") || strings.Contains(dl, "cash") {
								isBond = true
								break
							}
						}
						if isBond {
							divWeights = map[string]float64{"Fixed Income": 1.0}
						} else {
							divWeights = map[string]float64{"Equities": 1.0}
						}
					} else if len(divByName) == 1 {
						divWeights = map[string]float64{"Equities": 1.0}
					}
				}
			}
		}

		isComposite := len(divWeights) > 1
		rebalSet := make(map[string]bool, len(h.RebalanceDivisions))
		for _, rd := range h.RebalanceDivisions {
			rebalSet[rd] = true
		}
		holdingFactor := afterTax.factorFor(h)
		grossHoldingValue := h.Shares * price * fxRate

		rawHoldings = append(rawHoldings, model.HoldingSummary{
			HoldingID:               h.ID,
			Account:                 h.Account,
			AccountType:             h.AccountType,
			Symbol:                  h.Symbol,
			SymbolName:              symDef.Name,
			Note:                    h.Note,
			Currency:                currency,
			SharePrice:              price,
			ExchangeRate:            fxRate,
			Shares:                  h.Shares,
			MarketValueCAD:          grossHoldingValue,
			ProposedShares:          h.ProposedShares,
			RebalanceDivisions:      h.RebalanceDivisions,
			DivisionBreakdown:       divWeights,
			AfterTaxFactor:          holdingFactor,
			AllocationValueCAD:      grossHoldingValue * holdingFactor,
			AfterTaxValueCAD:        grossHoldingValue * holdingFactor,
			EstimatedDeferredTaxCAD: grossHoldingValue * (1 - holdingFactor),
		})

		for _, d := range divs {
			w, ok := divWeights[d.Name]
			if !ok || w <= 0 {
				continue
			}
			effShares := h.Shares * w
			mvNative := effShares * price
			grossMV := mvNative * fxRate
			activeMV := grossMV * holdingFactor

			propSliceShares := h.ProposedShares * w
			grossPropVal := propSliceShares * price * fxRate
			activePropVal := grossPropVal * holdingFactor
			afterValCAD := activeMV + activePropVal

			slice := model.EvaluatedSlice{
				HoldingID:               h.ID,
				Account:                 h.Account,
				AccountType:             h.AccountType,
				Exchange:                symDef.Exchange,
				Symbol:                  h.Symbol,
				SymbolName:              symDef.Name,
				Note:                    h.Note,
				IsCompositeSlice:        isComposite,
				DivisionWeight:          w,
				MER:                     mer,
				Tax:                     tax,
				MERPlusTax:              mer + tax,
				Currency:                currency,
				ExchangeRate:            fxRate,
				SharePrice:              price,
				TotalHoldingShares:      h.Shares,
				EffectiveShares:         effShares,
				MarketValueNative:       mvNative,
				MarketValueCAD:          activeMV,
				IsRebalanceTarget:       rebalSet[d.Name],
				ProposedSharesBuy:       propSliceShares,
				ProposedValueCAD:        activePropVal,
				AfterValueCAD:           afterValCAD,
				AfterTaxFactor:          holdingFactor,
				GrossMarketValueCAD:     grossMV,
				GrossProposedValueCAD:   grossPropVal,
				GrossAfterValueCAD:      grossMV + grossPropVal,
				EstimatedDeferredTaxCAD: grossMV * (1 - holdingFactor),
			}
			slicesByDiv[d.Name] = append(slicesByDiv[d.Name], slice)
		}
	}

	// Compute portfolio totals
	currentTotalCAD := 0.0
	grossCurrentTotalCAD := 0.0
	afterTotalCAD := 0.0
	grossAfterTotalCAD := 0.0
	proposedBuyTotalCAD := 0.0
	grossProposedBuyTotalCAD := 0.0

	divCurrentCAD := make(map[string]float64, len(divs))
	divGrossCurrentCAD := make(map[string]float64, len(divs))
	divCurrentNative := make(map[string]float64, len(divs))
	divAfterCAD := make(map[string]float64, len(divs))
	divGrossAfterCAD := make(map[string]float64, len(divs))
	divProposedCAD := make(map[string]float64, len(divs))
	divGrossProposedCAD := make(map[string]float64, len(divs))
	divDeferredTaxCAD := make(map[string]float64, len(divs))

	for _, d := range divs {
		for _, sl := range slicesByDiv[d.Name] {
			currentTotalCAD += sl.MarketValueCAD
			grossCurrentTotalCAD += sl.GrossMarketValueCAD
			afterTotalCAD += sl.AfterValueCAD
			grossAfterTotalCAD += sl.GrossAfterValueCAD
			proposedBuyTotalCAD += sl.ProposedValueCAD
			grossProposedBuyTotalCAD += sl.GrossProposedValueCAD

			divCurrentCAD[d.Name] += sl.MarketValueCAD
			divGrossCurrentCAD[d.Name] += sl.GrossMarketValueCAD
			divCurrentNative[d.Name] += sl.MarketValueNative
			divAfterCAD[d.Name] += sl.AfterValueCAD
			divGrossAfterCAD[d.Name] += sl.GrossAfterValueCAD
			divProposedCAD[d.Name] += sl.ProposedValueCAD
			divGrossProposedCAD[d.Name] += sl.GrossProposedValueCAD
			divDeferredTaxCAD[d.Name] += sl.EstimatedDeferredTaxCAD
		}
	}

	amountToBuyCAD := p.AmountToBuy
	targetTotalCAD := currentTotalCAD + amountToBuyCAD

	// Solve after-tax targets so gross trades still consume the gross cash budget.
	rebalanceWarnings := []string(nil)
	strategyTargetSum := 0.0
	for _, d := range divs {
		strategyTargetSum += divTargetRatios[d.Name]
	}
	var afterTaxPlan afterTaxTargetPlan
	afterTaxPlan.Valid = true
	if afterTax.Enabled {
		states := make([]afterTaxDivisionState, 0, len(divs))
		for _, d := range divs {
			rowFactors := make([]float64, 0, len(slicesByDiv[d.Name]))
			for _, sl := range slicesByDiv[d.Name] {
				if sl.IsRebalanceTarget {
					rowFactors = append(rowFactors, sl.AfterTaxFactor)
				}
			}
			states = append(states, afterTaxDivisionState{
				Name:         d.Name,
				TargetRatio:  divTargetRatios[d.Name],
				CurrentValue: divCurrentCAD[d.Name],
				RowFactors:   rowFactors,
			})
		}
		afterTaxPlan = solveAfterTaxTargetTotal(amountToBuyCAD, states)
		targetTotalCAD = afterTaxPlan.TargetTotal
		rebalanceWarnings = afterTaxPlan.Warnings
	}
	if math.Abs(strategyTargetSum-1) > 0.001 && !afterTax.Enabled {
		rebalanceWarnings = append(rebalanceWarnings, fmt.Sprintf(
			"Strategy targets should sum to 100%% (currently %.2f%%)", strategyTargetSum*100))
	}

	// Evaluate each division and its slices
	var evaluatedDivisions []model.DivisionEvaluation
	totalWeightedMER := 0.0
	totalWeightedMERTax := 0.0
	totalCalculatedBuyDiffCAD := 0.0

	for _, d := range divs {
		tRatio := divTargetRatios[d.Name]
		relWeight := divRelCatWeights[d.Name]
		curValCAD := divCurrentCAD[d.Name]
		curRatio := safeDiv(curValCAD, currentTotalCAD)
		ratioMiss := curRatio - tRatio
		tValCAD := tRatio * targetTotalCAD
		divAllocationBuyCAD := tValCAD - curValCAD

		rows := slicesByDiv[d.Name]
		rebalCount := 0
		for _, r := range rows {
			if r.IsRebalanceTarget {
				rebalCount++
			}
		}

		// Gross mode keeps its legacy calculation. After-tax mode converts each row's
		// after-tax allocation share back to a gross CAD trade.
		rowGrossTradeCAD := func(rowAlloc float64, factor float64) float64 {
			if !afterTax.Enabled {
				return rowAlloc
			}
			if !afterTaxPlan.Valid {
				return 0
			}
			if factor <= 0 {
				return 0
			}
			return rowAlloc / factor
		}

		divGrossTradeCAD := 0.0
		if !afterTax.Enabled {
			divGrossTradeCAD = divAllocationBuyCAD
		} else if afterTaxPlan.Valid {
			if w, ok := afterTaxPlan.DivisionWeights[d.Name]; ok {
				divGrossTradeCAD = divAllocationBuyCAD * w
			}
		}

		divMERSum := 0.0
		divMERTaxSum := 0.0

		for i := range rows {
			rows[i].CurrentRatio = safeDiv(rows[i].MarketValueCAD, currentTotalCAD)
			rows[i].AfterRatio = safeDiv(rows[i].AfterValueCAD, afterTotalCAD)
			// MER and annual tax drag are costs on gross assets, not after-tax targets.
			rows[i].MERContribution = safeDiv(rows[i].GrossMarketValueCAD, grossCurrentTotalCAD) * rows[i].MER
			rows[i].MERTaxContribution = safeDiv(rows[i].GrossMarketValueCAD, grossCurrentTotalCAD) * rows[i].MERPlusTax

			divMERSum += rows[i].MERContribution
			divMERTaxSum += rows[i].MERTaxContribution
			totalWeightedMER += rows[i].MERContribution
			totalWeightedMERTax += rows[i].MERTaxContribution

			if rows[i].IsRebalanceTarget && rebalCount > 0 {
				rowAlloc := divAllocationBuyCAD / float64(rebalCount)
				buyCAD := rowGrossTradeCAD(rowAlloc, rows[i].AfterTaxFactor)
				rows[i].AllocationAmountToBuyCAD = rowAlloc
				rows[i].TargetValueCAD = rows[i].MarketValueCAD + rowAlloc
				rows[i].AmountToBuyCAD = buyCAD
				rows[i].AmountToBuyNative = safeDiv(buyCAD, rows[i].ExchangeRate)
				if rows[i].SharePrice > 0 && rows[i].DivisionWeight > 0 {
					rows[i].CalculatedSharesBuy = (rows[i].AmountToBuyNative / rows[i].SharePrice) / rows[i].DivisionWeight
				}
				totalCalculatedBuyDiffCAD += buyCAD
			} else {
				rows[i].TargetValueCAD = rows[i].MarketValueCAD
				rows[i].AllocationAmountToBuyCAD = 0
				rows[i].AmountToBuyCAD = 0
				rows[i].AmountToBuyNative = 0
				rows[i].CalculatedSharesBuy = 0
			}
		}

		aftValCAD := divAfterCAD[d.Name]
		aftRatio := safeDiv(aftValCAD, afterTotalCAD)
		aftRatioMiss := aftRatio - tRatio

		evaluatedDivisions = append(evaluatedDivisions, model.DivisionEvaluation{
			DivisionName:             d.Name,
			CategoryName:             d.Category,
			RelativeCategoryWeight:   relWeight,
			TargetRatio:              tRatio,
			CurrentValueNativeSum:    divCurrentNative[d.Name],
			CurrentValueCAD:          curValCAD,
			CurrentRatio:             curRatio,
			RatioMiss:                ratioMiss,
			TargetValueCAD:           tValCAD,
			AmountToBuyCAD:           divGrossTradeCAD,
			ProposedValueCAD:         divProposedCAD[d.Name],
			AfterValueCAD:            aftValCAD,
			AfterRatio:               aftRatio,
			AfterRatioMiss:           aftRatioMiss,
			WeightedMER:              divMERSum,
			WeightedMERPlusTax:       divMERTaxSum,
			GrossCurrentValueCAD:     divGrossCurrentCAD[d.Name],
			GrossProposedValueCAD:    divGrossProposedCAD[d.Name],
			GrossAfterValueCAD:       divGrossAfterCAD[d.Name],
			AllocationAmountToBuyCAD: divAllocationBuyCAD,
			EstimatedDeferredTaxCAD:  divDeferredTaxCAD[d.Name],
			Rows:                     rows,
		})
	}

	// Evaluate Categories
	var evaluatedCategories []model.CategoryEvaluation
	for _, c := range cats {
		cCur := 0.0
		cAft := 0.0
		cGrossCur := 0.0
		cGrossAft := 0.0
		cDeferredTax := 0.0
		for _, d := range evaluatedDivisions {
			if d.CategoryName == c.Name {
				cCur += d.CurrentValueCAD
				cAft += d.AfterValueCAD
				cGrossCur += d.GrossCurrentValueCAD
				cGrossAft += d.GrossAfterValueCAD
				cDeferredTax += d.EstimatedDeferredTaxCAD
			}
		}
		tRatio := catTargetRatios[c.Name]
		curRatio := safeDiv(cCur, currentTotalCAD)
		tValCAD := tRatio * targetTotalCAD
		aftRatio := safeDiv(cAft, afterTotalCAD)

		evaluatedCategories = append(evaluatedCategories, model.CategoryEvaluation{
			CategoryName:            c.Name,
			TargetRatio:             tRatio,
			CurrentValueCAD:         cCur,
			CurrentRatio:            curRatio,
			RatioMiss:               curRatio - tRatio,
			TargetValueCAD:          tValCAD,
			AmountToBuyCAD:          tValCAD - cCur,
			AfterValueCAD:           cAft,
			AfterRatio:              aftRatio,
			AfterRatioMiss:          aftRatio - tRatio,
			GrossCurrentValueCAD:    cGrossCur,
			GrossAfterValueCAD:      cGrossAft,
			EstimatedDeferredTaxCAD: cDeferredTax,
		})
	}

	// Account Summaries, Classification Summaries & Registered vs Unregistered Summaries
	accountSummaries := computeAccountSummaries(rawHoldings, divCfg.AccountTypes, currentTotalCAD)
	classificationSummaries := computeClassificationSummaries(rawHoldings, divCfg.AccountTypes, currentTotalCAD)
	regVsUnreg := computeRegVsUnregSummaries(evaluatedDivisions, cats, catTargetRatios, divCfg.AccountTypes)

	checksPassed := math.Abs(totalCalculatedBuyDiffCAD-amountToBuyCAD) < 1.0
	if afterTax.Enabled && !afterTaxPlan.Valid {
		checksPassed = false
	}

	basis := "gross"
	if afterTax.Enabled {
		basis = "after_tax"
	}

	return model.PortfolioEvaluation{
		PortfolioID:                 p.ID,
		PortfolioName:               p.Name,
		FilterAccount:               filterAccount,
		StrategyMode:                p.Strategy.Mode,
		StrategyNotes:               p.Strategy.Notes,
		USDCADRate:                  usdCad,
		FXUpdatedAt:                 fxUpdated,
		CurrentTotalCAD:             currentTotalCAD,
		AmountToBuyCAD:              amountToBuyCAD,
		TargetTotalCAD:              targetTotalCAD,
		AfterTotalCAD:               afterTotalCAD,
		ProposedBuyTotalCAD:         proposedBuyTotalCAD,
		CalculatedBuyDiffCAD:        totalCalculatedBuyDiffCAD,
		WeightedMER:                 totalWeightedMER,
		WeightedMERPlusTax:          totalWeightedMERTax,
		AllocationBasis:             basis,
		RRSPWithdrawalTaxRate:       afterTax.Rate,
		GrossCurrentTotalCAD:        grossCurrentTotalCAD,
		GrossAfterTotalCAD:          grossAfterTotalCAD,
		GrossProposedBuyTotalCAD:    grossProposedBuyTotalCAD,
		EstimatedRRSPDeferredTaxCAD: grossCurrentTotalCAD - currentTotalCAD,
		RebalanceWarnings:           rebalanceWarnings,
		Categories:                  evaluatedCategories,
		Divisions:                   evaluatedDivisions,
		AccountSummaries:            accountSummaries,
		ClassificationSummaries:     classificationSummaries,
		RegVsUnregSummaries:         regVsUnreg,
		RawHoldings:                 rawHoldings,
		ChecksPassed:                checksPassed,
	}, nil
}

// ApplyCalculatedTrades copies the calculated share adjustments into each rebalance holding's ProposedShares.
func (s *Service) ApplyCalculatedTrades(portfolioID string, roundShares bool) (model.PortfolioEvaluation, error) {
	if members, _, _, isGroup := s.resolveGroupMembers(portfolioID); isGroup {
		for _, mID := range members {
			if _, err := s.ApplyCalculatedTrades(mID, roundShares); err != nil {
				return model.PortfolioEvaluation{}, err
			}
		}
		return s.Evaluate(portfolioID, "all")
	}

	eval, err := s.Evaluate(portfolioID, "all")
	if err != nil {
		return model.PortfolioEvaluation{}, err
	}
	if eval.AllocationBasis == "after_tax" && len(eval.RebalanceWarnings) > 0 {
		return eval, fmt.Errorf("cannot apply after-tax calculated trades: %s", strings.Join(eval.RebalanceWarnings, "; "))
	}

	p, ok := s.store.GetPortfolio(portfolioID)
	if !ok {
		return model.PortfolioEvaluation{}, fmt.Errorf("portfolio %q not found", portfolioID)
	}

	calcByHolding := make(map[string]float64)
	for _, div := range eval.Divisions {
		for _, row := range div.Rows {
			if row.IsRebalanceTarget {
				calcByHolding[row.HoldingID] += row.CalculatedSharesBuy
			}
		}
	}

	for i := range p.Holdings {
		if calc, ok := calcByHolding[p.Holdings[i].ID]; ok {
			if roundShares {
				p.Holdings[i].ProposedShares = math.Round(calc)
			} else {
				p.Holdings[i].ProposedShares = math.Round(calc*10000) / 10000
			}
		} else {
			p.Holdings[i].ProposedShares = 0
		}
	}

	if err := s.store.SavePortfolio(p); err != nil {
		return model.PortfolioEvaluation{}, err
	}
	return s.Evaluate(portfolioID, "all")
}

// CommitProposedTrades adds ProposedShares into Shares and clears ProposedShares and AmountToBuy.
func (s *Service) CommitProposedTrades(portfolioID string) (model.PortfolioEvaluation, error) {
	if members, _, _, isGroup := s.resolveGroupMembers(portfolioID); isGroup {
		for _, mID := range members {
			if _, err := s.CommitProposedTrades(mID); err != nil {
				return model.PortfolioEvaluation{}, err
			}
		}
		return s.Evaluate(portfolioID, "all")
	}

	p, ok := s.store.GetPortfolio(portfolioID)
	if !ok {
		return model.PortfolioEvaluation{}, fmt.Errorf("portfolio %q not found", portfolioID)
	}
	for i := range p.Holdings {
		if p.Holdings[i].ProposedShares != 0 {
			p.Holdings[i].Shares += p.Holdings[i].ProposedShares
			if p.Holdings[i].Shares < 0 {
				p.Holdings[i].Shares = 0
			}
			p.Holdings[i].ProposedShares = 0
		}
	}
	p.AmountToBuy = 0
	if err := s.store.SavePortfolio(p); err != nil {
		return model.PortfolioEvaluation{}, err
	}
	return s.Evaluate(portfolioID, "all")
}

// CreatePortfolio creates a new portfolio file with strategy copied from copyFromID (or defaults), in targetDir if specified.
func (s *Service) CreatePortfolio(name string, copyFromID string, targetDir string) (model.PortfolioConfig, error) {
	id := store.Slugify(name)
	if id == "" {
		return model.PortfolioConfig{}, fmt.Errorf("invalid portfolio name")
	}
	if _, exists := s.store.GetPortfolio(id); exists {
		return model.PortfolioConfig{}, fmt.Errorf("portfolio %q already exists", id)
	}
	var afterTaxAllocation bool
	var rrspRate *float64
	strat := model.StrategyConfig{
		Mode: "hierarchical",
		Categories: map[string]float64{
			"Cash and Bonds": 0.35,
			"Stocks":         0.65,
		},
		CategorySplits: map[string]map[string]float64{
			"Cash and Bonds": {"GICs/Bonds": 1.0},
			"Stocks": {
				"Canada":             0.30,
				"America (US)":       0.44,
				"Europe/Asia (EAFE)": 0.19,
				"Emerging Markets":   0.07,
			},
		},
	}
	if copyFromID != "" {
		if src, ok := s.store.GetPortfolio(copyFromID); ok {
			strat = src.Strategy
			afterTaxAllocation = src.AfterTaxAllocation
			rrspRate = cloneAfterTaxRate(src.RRSPWithdrawalTaxRate)
		}
	}
	if _, err := resolveAfterTaxAssumption(model.PortfolioConfig{
		AfterTaxAllocation:    afterTaxAllocation,
		RRSPWithdrawalTaxRate: rrspRate,
		Holdings:              []model.HoldingConfig{{AccountType: "rrsp"}},
	}); err != nil {
		return model.PortfolioConfig{}, err
	}
	cleanTarget := strings.TrimSpace(targetDir)
	p := model.PortfolioConfig{
		ID:                    id,
		Name:                  strings.TrimSpace(name),
		AfterTaxAllocation:    afterTaxAllocation,
		RRSPWithdrawalTaxRate: rrspRate,
		Strategy:              strat,
		Holdings:              []model.HoldingConfig{},
		SourceDir:             cleanTarget,
	}
	if cleanTarget != "" {
		p.FilePath = filepath.Join(cleanTarget, id+".yaml")
		appCfg := s.store.AppConfig()
		hasDir := false
		for _, d := range appCfg.PortfolioPaths {
			if filepath.Clean(d) == filepath.Clean(cleanTarget) {
				hasDir = true
				break
			}
		}
		if !hasDir {
			appCfg.PortfolioPaths = append(appCfg.PortfolioPaths, cleanTarget)
			_ = s.store.SaveAppConfig(appCfg)
		}
	}
	if err := s.store.SavePortfolio(p); err != nil {
		return model.PortfolioConfig{}, err
	}
	saved, _ := s.store.GetPortfolio(id)
	return saved, nil
}

// DeletePortfolio removes a portfolio file.
func (s *Service) DeletePortfolio(id string) error {
	return s.store.DeletePortfolio(id)
}

// BackupPortfolio creates a date-and-time postfixed backup for an individual portfolio or all members of a group.
func (s *Service) BackupPortfolio(id string) ([]string, error) {
	if strings.Contains(id, ",") {
		members := strings.Split(id, ",")
		var paths []string
		for _, m := range members {
			m = strings.TrimSpace(m)
			if m == "" {
				continue
			}
			p, err := s.store.BackupPortfolio(m)
			if err != nil {
				return paths, err
			}
			paths = append(paths, p)
		}
		return paths, nil
	}

	meta := s.GetAppState()
	for _, p := range meta.Portfolios {
		if p.ID == id && p.IsGroup {
			var paths []string
			for _, m := range p.Members {
				bp, err := s.store.BackupPortfolio(m)
				if err != nil {
					return paths, err
				}
				paths = append(paths, bp)
			}
			return paths, nil
		}
	}

	p, err := s.store.BackupPortfolio(id)
	if err != nil {
		return nil, err
	}
	return []string{p}, nil
}

// UpdatePortfolio saves changes to a portfolio's AmountToBuy, Strategy, or Holdings.
func (s *Service) UpdatePortfolio(p model.PortfolioConfig) error {
	if _, err := resolveAfterTaxAssumption(p); err != nil {
		return err
	}
	return s.store.SavePortfolio(p)
}

// QuickUpdateHolding updates a single holding's account, account_type, shares, proposed_shares, or rebalance_divisions.
func (s *Service) QuickUpdateHolding(portfolioID string, holdingID string, account *string, accountType *string, shares *float64, proposedShares *float64, rebalanceDivs *[]string) error {
	if strings.Contains(holdingID, ":") {
		parts := strings.SplitN(holdingID, ":", 2)
		portfolioID = parts[0]
		holdingID = parts[1]
	}
	p, ok := s.store.GetPortfolio(portfolioID)
	if !ok {
		return fmt.Errorf("portfolio %q not found", portfolioID)
	}
	divCfg := s.store.Divisions()
	found := false
	for i := range p.Holdings {
		if p.Holdings[i].ID == holdingID {
			if account != nil {
				trimmed := strings.TrimSpace(*account)
				if trimmed != "" {
					p.Holdings[i].Account = trimmed
					if accountType == nil {
						p.Holdings[i].AccountType = store.InferAccountType(trimmed, divCfg.AccountTypes)
					}
				}
			}
			if accountType != nil && strings.TrimSpace(*accountType) != "" {
				p.Holdings[i].AccountType = strings.TrimSpace(*accountType)
			}
			if shares != nil {
				p.Holdings[i].Shares = *shares
			}
			if proposedShares != nil {
				p.Holdings[i].ProposedShares = *proposedShares
			}
			if rebalanceDivs != nil {
				p.Holdings[i].RebalanceDivisions = *rebalanceDivs
			}
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("holding %q not found in portfolio %q", holdingID, portfolioID)
	}
	return s.store.SavePortfolio(p)
}

// RenameAccount renames all occurrences of oldName to newName in the specified portfolio.
func (s *Service) RenameAccount(portfolioID string, oldName string, newName string) (int, error) {
	oldName = strings.TrimSpace(oldName)
	newName = strings.TrimSpace(newName)
	if oldName == "" || newName == "" {
		return 0, fmt.Errorf("account name cannot be empty")
	}
	if oldName == newName {
		return 0, nil
	}
	p, ok := s.store.GetPortfolio(portfolioID)
	if !ok {
		return 0, fmt.Errorf("portfolio %q not found", portfolioID)
	}
	divCfg := s.store.Divisions()
	inferred := store.InferAccountType(newName, divCfg.AccountTypes)
	updated := 0
	for i := range p.Holdings {
		if p.Holdings[i].Account == oldName {
			p.Holdings[i].Account = newName
			if inferred != "non_registered" || p.Holdings[i].AccountType == "" {
				p.Holdings[i].AccountType = inferred
			}
			updated++
		}
	}
	if updated > 0 {
		if err := s.store.SavePortfolio(p); err != nil {
			return 0, err
		}
	}
	return updated, nil
}

// SetAmountToBuy updates AmountToBuy on a portfolio.
func (s *Service) SetAmountToBuy(portfolioID string, amount float64) error {
	if members, _, _, isGroup := s.resolveGroupMembers(portfolioID); isGroup && len(members) > 0 {
		first, ok := s.store.GetPortfolio(members[0])
		if !ok {
			return fmt.Errorf("member portfolio %q not found", members[0])
		}
		first.AmountToBuy = amount
		return s.store.SavePortfolio(first)
	}
	p, ok := s.store.GetPortfolio(portfolioID)
	if !ok {
		return fmt.Errorf("portfolio %q not found", portfolioID)
	}
	p.AmountToBuy = amount
	return s.store.SavePortfolio(p)
}

type RefreshReport struct {
	UpdatedFX       map[string]float64            `json:"updated_fx,omitempty"`
	UpdatedPrices   map[string]float64            `json:"updated_prices,omitempty"`
	UpdatedMetadata map[string]map[string]float64 `json:"updated_metadata,omitempty"`
	Warnings        []string                      `json:"warnings,omitempty"`
}

// RefreshPricesAndFX fetches live FX rates and symbol prices concurrently and updates config/price_cache.yaml.
func (s *Service) RefreshPricesAndFX() (RefreshReport, error) {
	s.refreshMu.Lock()
	defer s.refreshMu.Unlock()

	dsCfg := s.store.DataSources()
	symCfg := s.store.Symbols()
	cacheCfg := s.store.Cache()

	fxMap := make(map[string]model.CachedFX, len(cacheCfg.FXRates))
	for k, v := range cacheCfg.FXRates {
		fxMap[k] = v
	}
	priceMap := make(map[string]model.CachedPrice, len(cacheCfg.Prices))
	for k, v := range cacheCfg.Prices {
		priceMap[k] = v
	}

	report := RefreshReport{
		UpdatedFX:     make(map[string]float64),
		UpdatedPrices: make(map[string]float64),
	}

	var mu sync.Mutex
	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		if fx, err := s.fetcher.FetchFX("USD_CAD", dsCfg.FXSources); err == nil {
			mu.Lock()
			fxMap["USD_CAD"] = fx
			report.UpdatedFX["USD_CAD"] = fx.Rate
			mu.Unlock()
		} else {
			mu.Lock()
			report.Warnings = append(report.Warnings, fmt.Sprintf("FX USD_CAD: %v", err))
			mu.Unlock()
		}
	}()

	sem := make(chan struct{}, 6)
	for symID, symDef := range symCfg.Symbols {
		if symDef.FixedPrice > 0 {
			continue
		}
		wg.Add(1)
		go func(id string, def model.SymbolDef) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			cp, err := s.fetcher.FetchPrice(id, def, dsCfg.PriceSources)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				report.Warnings = append(report.Warnings, fmt.Sprintf("Price %s: %v", id, err))
				return
			}
			priceMap[id] = cp
			report.UpdatedPrices[id] = cp.Price
		}(symID, symDef)
	}

	wg.Wait()

	if err := s.store.SavePriceCache(fxMap, priceMap); err != nil {
		return report, err
	}
	return report, nil
}

// RefreshMetadataRecipes runs configured metadata recipes (e.g. BlackRock iShares CSV holdings
// for XAW, XEQT; Vanguard Canada product-page tables for VEQT, VBAL, VCIP) and updates
// division ratios in config/cache.yaml.
func (s *Service) RefreshMetadataRecipes() (RefreshReport, error) {
	dsCfg := s.store.DataSources()
	symCfg := s.store.Symbols()
	cacheCfg := s.store.Cache()

	metaMap := make(map[string]model.CachedMetadata, len(cacheCfg.SymbolMetadata))
	for k, v := range cacheCfg.SymbolMetadata {
		metaMap[k] = v
	}

	report := RefreshReport{
		UpdatedMetadata: make(map[string]map[string]float64),
	}

	for symID, symDef := range symCfg.Symbols {
		if symDef.MetadataRecipe == "" {
			continue
		}
		recipe, ok := dsCfg.MetadataRecipes[symDef.MetadataRecipe]
		if !ok {
			report.Warnings = append(report.Warnings, fmt.Sprintf("%s: recipe %q not found", symID, symDef.MetadataRecipe))
			continue
		}
		ratios, err := s.fetcher.FetchDivisionRatios(symID, recipe)
		if err != nil {
			report.Warnings = append(report.Warnings, fmt.Sprintf("%s (%s): %v", symID, symDef.MetadataRecipe, err))
			continue
		}
		existing := metaMap[symID]
		if existing.MER == 0 {
			existing.MER = symDef.DefaultMER
		}
		existing.Divisions = ratios
		existing.UpdatedAt = time.Now().Format("2006-01-02")
		metaMap[symID] = existing
		report.UpdatedMetadata[symID] = ratios
	}

	if err := s.store.SaveMetadataCache(metaMap); err != nil {
		return report, err
	}
	return report, nil
}

// UpdateCache saves user edits to cache.yaml (prices, FX rate, or symbol metadata/ratios).
func (s *Service) UpdateCache(c model.CacheConfig) error {
	return s.store.SaveCache(c)
}

// UpdateSymbols saves user edits to symbols.yaml.
func (s *Service) UpdateSymbols(sym model.SymbolsConfig) error {
	return s.store.SaveSymbols(sym)
}

// LookupSymbol queries live metadata (name, exchange, currency, price) for a ticker symbol.
func (s *Service) LookupSymbol(rawSymbol string, preferredExchange string) (datasource.SymbolLookupResult, error) {
	// If already in local symbols.yaml, also check local fallback if offline
	res, err := s.fetcher.LookupSymbol(rawSymbol, preferredExchange)
	if err == nil {
		return res, nil
	}
	clean := strings.ToUpper(strings.TrimSuffix(strings.TrimSpace(rawSymbol), ".TO"))
	symCfg := s.store.Symbols()
	cacheCfg := s.store.Cache()
	if def, ok := symCfg.Symbols[clean]; ok {
		price, curr := resolvePriceAndCurrency(clean, def, cacheCfg)
		return datasource.SymbolLookupResult{
			Symbol:      clean,
			YahooTicker: def.YahooTicker,
			Name:        def.Name,
			Exchange:    def.Exchange,
			Currency:    curr,
			Price:       price,
		}, nil
	}
	return datasource.SymbolLookupResult{}, err
}

// UpdateDivisions saves user edits to divisions.yaml and cascades any Category or Division renames
// across symbols.yaml, cache.yaml, and portfolios/*.yaml.
func (s *Service) UpdateDivisions(div model.DivisionsConfig) error {
	oldDiv := s.store.Divisions()

	catRenames := make(map[string]string)
	if len(oldDiv.Categories) == len(div.Categories) {
		for i := range oldDiv.Categories {
			oldName := oldDiv.Categories[i].Name
			newName := div.Categories[i].Name
			if oldName != "" && newName != "" && oldName != newName {
				catRenames[oldName] = newName
			}
		}
	}

	divRenames := make(map[string]string)
	if len(oldDiv.Divisions) == len(div.Divisions) {
		for i := range oldDiv.Divisions {
			oldName := oldDiv.Divisions[i].Name
			newName := div.Divisions[i].Name
			if oldName != "" && newName != "" && oldName != newName {
				divRenames[oldName] = newName
			}
		}
	}

	if len(catRenames) > 0 {
		for i := range div.Divisions {
			if renamed, ok := catRenames[div.Divisions[i].Category]; ok {
				div.Divisions[i].Category = renamed
			}
		}
	}

	if err := s.store.SaveDivisions(div); err != nil {
		return err
	}

	if len(catRenames) > 0 || len(divRenames) > 0 {
		if len(divRenames) > 0 {
			symCfg := s.store.Symbols()
			symChanged := false
			for symID, symDef := range symCfg.Symbols {
				nextDivs := make(map[string]float64, len(symDef.DefaultDivisions))
				for k, v := range symDef.DefaultDivisions {
					if nk, ok := divRenames[k]; ok {
						nextDivs[nk] = v
						symChanged = true
					} else {
						nextDivs[k] = v
					}
				}
				symDef.DefaultDivisions = nextDivs
				symCfg.Symbols[symID] = symDef
			}
			if symChanged {
				_ = s.store.SaveSymbols(symCfg)
			}

			cacheCfg := s.store.Cache()
			cacheChanged := false
			for symID, meta := range cacheCfg.SymbolMetadata {
				nextDivs := make(map[string]float64, len(meta.Divisions))
				for k, v := range meta.Divisions {
					if nk, ok := divRenames[k]; ok {
						nextDivs[nk] = v
						cacheChanged = true
					} else {
						nextDivs[k] = v
					}
				}
				meta.Divisions = nextDivs
				cacheCfg.SymbolMetadata[symID] = meta
			}
			if cacheChanged {
				_ = s.store.SaveMetadataCache(cacheCfg.SymbolMetadata)
			}
		}

		for _, pid := range s.store.PortfolioIDs() {
			p, ok := s.store.GetPortfolio(pid)
			if !ok {
				continue
			}
			pChanged := false
			if len(catRenames) > 0 && len(p.Strategy.Categories) > 0 {
				nextCats := make(map[string]float64, len(p.Strategy.Categories))
				for k, v := range p.Strategy.Categories {
					if nk, ok := catRenames[k]; ok {
						nextCats[nk] = v
						pChanged = true
					} else {
						nextCats[k] = v
					}
				}
				p.Strategy.Categories = nextCats
			}
			if len(p.Strategy.CategorySplits) > 0 {
				nextSplits := make(map[string]map[string]float64, len(p.Strategy.CategorySplits))
				for ck, dmap := range p.Strategy.CategorySplits {
					nck := ck
					if renamed, ok := catRenames[ck]; ok {
						nck = renamed
						pChanged = true
					}
					nextDMap := make(map[string]float64, len(dmap))
					for dk, w := range dmap {
						if ndk, ok := divRenames[dk]; ok {
							nextDMap[ndk] = w
							pChanged = true
						} else {
							nextDMap[dk] = w
						}
					}
					nextSplits[nck] = nextDMap
				}
				p.Strategy.CategorySplits = nextSplits
			}
			if len(divRenames) > 0 {
				if len(p.Strategy.Divisions) > 0 {
					nextDivs := make(map[string]float64, len(p.Strategy.Divisions))
					for k, v := range p.Strategy.Divisions {
						if nk, ok := divRenames[k]; ok {
							nextDivs[nk] = v
							pChanged = true
						} else {
							nextDivs[k] = v
						}
					}
					p.Strategy.Divisions = nextDivs
				}
				for i := range p.Holdings {
					for j, rd := range p.Holdings[i].RebalanceDivisions {
						if nk, ok := divRenames[rd]; ok {
							p.Holdings[i].RebalanceDivisions[j] = nk
							pChanged = true
						}
					}
				}
			}
			if pChanged {
				_ = s.store.SavePortfolio(p)
			}
		}
	}
	return nil
}

// ImportBrokerageCSV parses a brokerage CSV and updates matching holdings (or appends new ones) in the portfolio.
func (s *Service) ImportBrokerageCSV(portfolioID string, importerID string, csvContent string) (int, error) {
	dsCfg := s.store.DataSources()
	recipe, ok := dsCfg.CSVImporters[importerID]
	if !ok {
		return 0, fmt.Errorf("CSV importer %q not found", importerID)
	}
	rows, err := datasource.ParseBrokerageCSV(recipe, csvContent)
	if err != nil {
		return 0, err
	}
	p, ok := s.store.GetPortfolio(portfolioID)
	if !ok {
		return 0, fmt.Errorf("portfolio %q not found", portfolioID)
	}

	divCfg := s.store.Divisions()
	updatedCount := 0
	for _, r := range rows {
		matched := false
		for i := range p.Holdings {
			if strings.EqualFold(p.Holdings[i].Symbol, r.Symbol) &&
				(strings.EqualFold(p.Holdings[i].Account, r.Account) || r.Account == "Imported") {
				p.Holdings[i].Shares = r.Shares
				matched = true
				updatedCount++
				break
			}
		}
		if !matched {
			accType := inferAccountType(r.Account, divCfg.AccountTypes)
			newID := fmt.Sprintf("imp_%s_%s_%d", strings.ToLower(r.Account), strings.ToLower(r.Symbol), len(p.Holdings)+1)
			newID = strings.ReplaceAll(newID, " ", "_")
			p.Holdings = append(p.Holdings, model.HoldingConfig{
				ID:          newID,
				Account:     r.Account,
				AccountType: accType,
				Symbol:      r.Symbol,
				Shares:      r.Shares,
			})
			updatedCount++
		}
	}
	if err := s.store.SavePortfolio(p); err != nil {
		return 0, err
	}
	return updatedCount, nil
}

// --- Internal Helpers ---

func resolveStrategyTargets(strat model.StrategyConfig, cats []model.CategoryDef, divs []model.DivisionDef) (map[string]float64, map[string]float64, map[string]float64) {
	catTargets := make(map[string]float64, len(cats))
	divTargets := make(map[string]float64, len(divs))
	divRelWeights := make(map[string]float64, len(divs))

	if strings.EqualFold(strat.Mode, "flat") && len(strat.Divisions) > 0 {
		for _, d := range divs {
			w := strat.Divisions[d.Name]
			divTargets[d.Name] = w
			catTargets[d.Category] += w
		}
		for _, d := range divs {
			if catTargets[d.Category] > 0 {
				divRelWeights[d.Name] = divTargets[d.Name] / catTargets[d.Category]
			}
		}
		return catTargets, divTargets, divRelWeights
	}

	// Default: "hierarchical" mode
	for _, c := range cats {
		catTargets[c.Name] = strat.Categories[c.Name]
	}
	for _, d := range divs {
		rel := 0.0
		if splits, ok := strat.CategorySplits[d.Category]; ok {
			rel = splits[d.Name]
		}
		divRelWeights[d.Name] = rel
		divTargets[d.Name] = catTargets[d.Category] * rel
	}
	return catTargets, divTargets, divRelWeights
}

func resolvePriceAndCurrency(symID string, symDef model.SymbolDef, cache model.CacheConfig) (float64, string) {
	curr := symDef.Currency
	if curr == "" {
		curr = "CAD"
	}
	if symDef.FixedPrice > 0 {
		return symDef.FixedPrice, curr
	}
	if cp, ok := cache.Prices[symID]; ok && cp.Price > 0 {
		if cp.Currency != "" {
			curr = cp.Currency
		}
		return cp.Price, curr
	}
	return 1.0, curr
}

func resolveMER(symID string, symDef model.SymbolDef, cache model.CacheConfig) float64 {
	if meta, ok := cache.SymbolMetadata[symID]; ok && meta.MER > 0 {
		return meta.MER
	}
	return symDef.DefaultMER
}

func resolveTax(symID string, accountType string, symDef model.SymbolDef, cache model.CacheConfig, ds model.DataSourcesConfig) float64 {
	if meta, ok := cache.SymbolMetadata[symID]; ok && meta.TaxByAccount != nil {
		if t, hasAcc := meta.TaxByAccount[accountType]; hasAcc {
			return t
		}
	}
	return 0.0
}

func resolveDivisionWeights(symID string, symDef model.SymbolDef, cache model.CacheConfig) map[string]float64 {
	if meta, ok := cache.SymbolMetadata[symID]; ok && len(meta.Divisions) > 0 {
		return meta.Divisions
	}
	return symDef.DefaultDivisions
}

func filterHoldings(holdings []model.HoldingConfig, filter string, accTypes map[string]model.AccountTypeDef) []model.HoldingConfig {
	if filter == "" || filter == "all" {
		return holdings
	}
	var out []model.HoldingConfig
	for _, h := range holdings {
		switch {
		case filter == "registered":
			if def, ok := accTypes[h.AccountType]; ok && def.Registered {
				out = append(out, h)
			}
		case filter == "unregistered" || filter == "non_registered":
			if def, ok := accTypes[h.AccountType]; ok && !def.Registered {
				out = append(out, h)
			} else if h.AccountType == "non_registered" {
				out = append(out, h)
			}
		case strings.HasPrefix(filter, "type:"):
			wantType := strings.TrimPrefix(filter, "type:")
			if strings.EqualFold(h.AccountType, wantType) {
				out = append(out, h)
			}
		case strings.HasPrefix(filter, "account:"):
			wantAcc := strings.TrimPrefix(filter, "account:")
			if strings.EqualFold(h.Account, wantAcc) {
				out = append(out, h)
			}
		default:
			if strings.EqualFold(h.AccountType, filter) || strings.EqualFold(h.Account, filter) {
				out = append(out, h)
			}
		}
	}
	return out
}

func computeAccountSummaries(rawHoldings []model.HoldingSummary, accTypes map[string]model.AccountTypeDef, totalCAD float64) []model.AccountSummary {
	byAcc := make(map[string]*model.AccountSummary)
	var order []string
	for _, h := range rawHoldings {
		sum, ok := byAcc[h.Account]
		if !ok {
			reg := false
			if def, hasDef := accTypes[h.AccountType]; hasDef {
				reg = def.Registered
			}
			sum = &model.AccountSummary{
				Account:     h.Account,
				AccountType: h.AccountType,
				Registered:  reg,
			}
			byAcc[h.Account] = sum
			order = append(order, h.Account)
		}
		sum.PositionCount++
		sum.Holdings = append(sum.Holdings, h)
		sum.MarketValueCAD += h.MarketValueCAD
		sum.AllocationValueCAD += h.AllocationValueCAD
		sum.AfterTaxValueCAD += h.AfterTaxValueCAD
		sum.EstimatedDeferredTaxCAD += h.EstimatedDeferredTaxCAD
	}
	var out []model.AccountSummary
	for _, acc := range order {
		s := byAcc[acc]
		s.PortfolioRatio = safeDiv(s.AllocationValueCAD, totalCAD)
		out = append(out, *s)
	}
	return out
}

func computeClassificationSummaries(rawHoldings []model.HoldingSummary, accTypes map[string]model.AccountTypeDef, totalCAD float64) []model.ClassificationSummary {
	byType := make(map[string]*model.ClassificationSummary)
	var order []string
	for _, h := range rawHoldings {
		accType := h.AccountType
		if accType == "" {
			accType = "non_registered"
		}
		sum, ok := byType[accType]
		if !ok {
			reg := false
			name := strings.ToUpper(accType)
			if def, hasDef := accTypes[accType]; hasDef {
				reg = def.Registered
				if def.Name != "" {
					name = def.Name
				}
			}
			sum = &model.ClassificationSummary{
				AccountType: accType,
				Name:        name,
				Registered:  reg,
			}
			byType[accType] = sum
			order = append(order, accType)
		}
		sum.PositionCount++
		sum.MarketValueCAD += h.MarketValueCAD
		sum.AllocationValueCAD += h.AllocationValueCAD
		sum.AfterTaxValueCAD += h.AfterTaxValueCAD
		sum.EstimatedDeferredTaxCAD += h.EstimatedDeferredTaxCAD
		sum.Holdings = append(sum.Holdings, h)
	}
	var out []model.ClassificationSummary
	for _, t := range order {
		s := byType[t]
		s.PortfolioRatio = safeDiv(s.AllocationValueCAD, totalCAD)
		out = append(out, *s)
	}
	return out
}

func computeRegVsUnregSummaries(divs []model.DivisionEvaluation, cats []model.CategoryDef, catTargets map[string]float64, accTypes map[string]model.AccountTypeDef) []model.RegVsUnregSummary {
	regCatVal := make(map[string]float64)
	unregCatVal := make(map[string]float64)
	regTotal := 0.0
	unregTotal := 0.0

	for _, d := range divs {
		for _, r := range d.Rows {
			isReg := false
			if def, ok := accTypes[r.AccountType]; ok {
				isReg = def.Registered
			}
			if isReg {
				regCatVal[d.CategoryName] += r.MarketValueCAD
				regTotal += r.MarketValueCAD
			} else {
				unregCatVal[d.CategoryName] += r.MarketValueCAD
				unregTotal += r.MarketValueCAD
			}
		}
	}

	buildGroup := func(name string, total float64, catVals map[string]float64) model.RegVsUnregSummary {
		var rows []model.CategoryEvaluation
		for _, c := range cats {
			val := catVals[c.Name]
			tRatio := catTargets[c.Name]
			curRatio := safeDiv(val, total)
			tVal := tRatio * total
			rows = append(rows, model.CategoryEvaluation{
				CategoryName:    c.Name,
				TargetRatio:     tRatio,
				CurrentValueCAD: val,
				CurrentRatio:    curRatio,
				RatioMiss:       curRatio - tRatio,
				TargetValueCAD:  tVal,
				AmountToBuyCAD:  tVal - val,
			})
		}
		return model.RegVsUnregSummary{
			GroupName:     name,
			TotalValueCAD: total,
			CategoryRows:  rows,
		}
	}

	return []model.RegVsUnregSummary{
		buildGroup("Registered (RRSP + TFSA)", regTotal, regCatVal),
		buildGroup("Unregistered (Taxable)", unregTotal, unregCatVal),
	}
}

func inferAccountType(accName string, accTypes map[string]model.AccountTypeDef) string {
	upper := strings.ToUpper(strings.TrimSpace(accName))
	for id, def := range accTypes {
		for _, alias := range def.Aliases {
			if strings.EqualFold(alias, upper) || strings.Contains(upper, strings.ToUpper(alias)) {
				return id
			}
		}
	}
	if strings.Contains(upper, "TFSA") {
		return "tfsa"
	}
	if strings.Contains(upper, "RRSP") {
		return "rrsp"
	}
	if strings.Contains(upper, "RESP") {
		return "resp"
	}
	return "non_registered"
}

func safeDiv(num, den float64) float64 {
	if den == 0 {
		return 0
	}
	return num / den
}
