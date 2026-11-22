package engine

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"embsay/internal/model"
	"embsay/internal/store"
)

// GetTransactions returns all transactions for a portfolio or combined group.
func (s *Service) GetTransactions(portfolioID string) ([]model.Transaction, string, error) {
	if members, _, _, isGroup := s.resolveGroupMembers(portfolioID); isGroup && len(members) > 0 {
		var merged []model.Transaction
		for _, mID := range members {
			mp, ok := s.store.GetPortfolio(mID)
			if !ok {
				continue
			}
			txs, _, err := s.store.LoadTransactions(mID)
			if err != nil {
				continue
			}
			for _, tx := range txs {
				tx.ID = mID + ":" + tx.ID
				tx.Account = mp.Name + " · " + tx.Account
				merged = append(merged, tx)
			}
		}
		sort.SliceStable(merged, func(i, j int) bool {
			if merged[i].Date != merged[j].Date {
				return merged[i].Date < merged[j].Date
			}
			return merged[i].ID < merged[j].ID
		})
		return merged, "(Combined Group)", nil
	}
	return s.store.LoadTransactions(portfolioID)
}

func (s *Service) normalizeTransaction(tx model.Transaction) (model.Transaction, error) {
	tx.Date = strings.TrimSpace(tx.Date)
	tx.Account = strings.TrimSpace(tx.Account)
	tx.Type = strings.ToLower(strings.TrimSpace(tx.Type))
	tx.Symbol = strings.TrimSpace(tx.Symbol)
	tx.Note = strings.TrimSpace(tx.Note)
	if tx.Date == "" {
		tx.Date = time.Now().Format("2006-01-02")
	}
	if tx.Account == "" {
		return tx, fmt.Errorf("account is required")
	}
	if tx.Type == "" {
		return tx, fmt.Errorf("transaction type is required")
	}
	if tx.ID == "" {
		tx.ID = fmt.Sprintf("tx_%d", time.Now().UnixNano())
	}

	if tx.Amount > 0 && tx.Shares > 0 && tx.Price <= 0 {
		tx.Price = tx.Amount / tx.Shares
	} else if tx.Price > 0 && tx.Shares > 0 && tx.Amount <= 0 {
		tx.Amount = tx.Price * tx.Shares
	}

	symCfg := s.store.Symbols()
	cacheCfg := s.store.Cache()

	tx.Currency = strings.ToUpper(strings.TrimSpace(tx.Currency))
	if tx.Currency == "" {
		if def, ok := symCfg.Symbols[tx.Symbol]; ok && def.Currency != "" {
			tx.Currency = strings.ToUpper(def.Currency)
		} else {
			tx.Currency = "CAD"
		}
	}
	if tx.FXRate <= 0 {
		if tx.Currency == "USD" {
			usdCad := DefaultUSDCAD
			if fx, ok := cacheCfg.FXRates["USD_CAD"]; ok && fx.Rate > 0 {
				usdCad = fx.Rate
			}
			tx.FXRate = usdCad
		} else {
			tx.FXRate = 1.0
		}
	}
	return tx, nil
}

// AddTransaction appends a transaction to the portfolio's CSV ledger and optionally
// updates the matching holding's share quantity in the portfolio YAML.
func (s *Service) AddTransaction(portfolioID string, tx model.Transaction, updateHolding bool) (model.Transaction, model.PortfolioEvaluation, string, error) {
	if _, _, _, isGroup := s.resolveGroupMembers(portfolioID); isGroup {
		return model.Transaction{}, model.PortfolioEvaluation{}, "", fmt.Errorf("cannot add transactions to a combined group; select an individual portfolio")
	}
	p, ok := s.store.GetPortfolio(portfolioID)
	if !ok {
		return model.Transaction{}, model.PortfolioEvaluation{}, "", fmt.Errorf("portfolio %q not found", portfolioID)
	}

	var err error
	tx, err = s.normalizeTransaction(tx)
	if err != nil {
		return model.Transaction{}, model.PortfolioEvaluation{}, "", err
	}

	existing, _, err := s.store.LoadTransactions(portfolioID)
	if err != nil {
		return model.Transaction{}, model.PortfolioEvaluation{}, "", err
	}
	existing = append(existing, tx)
	fileRel, err := s.store.SaveTransactions(portfolioID, existing)
	if err != nil {
		return model.Transaction{}, model.PortfolioEvaluation{}, "", err
	}

	// Reload portfolio config in case SaveTransactions initialized transactions_file
	p, ok = s.store.GetPortfolio(portfolioID)
	if ok && updateHolding && tx.Symbol != "" {
		changed := applyTransactionToPortfolio(&p, tx, s.store.Divisions().AccountTypes)
		if changed {
			if err := s.store.SavePortfolio(p); err != nil {
				return tx, model.PortfolioEvaluation{}, fileRel, err
			}
		}
	}

	eval, err := s.Evaluate(portfolioID, "all")
	return tx, eval, fileRel, err
}

func applyTransactionToPortfolio(p *model.PortfolioConfig, tx model.Transaction, accTypes map[string]model.AccountTypeDef) bool {
	if tx.Shares == 0 && tx.Type != "split" {
		return false
	}
	matchIdx := -1
	for i := range p.Holdings {
		if p.Holdings[i].Account == tx.Account && strings.EqualFold(p.Holdings[i].Symbol, tx.Symbol) {
			matchIdx = i
			break
		}
	}

	switch tx.Type {
	case "buy":
		if matchIdx >= 0 {
			p.Holdings[matchIdx].Shares = math.Round((p.Holdings[matchIdx].Shares+tx.Shares)*10000) / 10000
			return true
		}
		accType := ""
		for _, a := range p.Accounts {
			if a.Name == tx.Account && a.AccountType != "" {
				accType = a.AccountType
				break
			}
		}
		if accType == "" {
			for _, h := range p.Holdings {
				if h.Account == tx.Account && h.AccountType != "" {
					accType = h.AccountType
					break
				}
			}
		}
		if accType == "" {
			accType = store.InferAccountType(tx.Account, accTypes)
		}
		p.Holdings = append(p.Holdings, model.HoldingConfig{
			Account:     tx.Account,
			AccountType: accType,
			Symbol:      tx.Symbol,
			Shares:      math.Round(tx.Shares*10000) / 10000,
		})
		return true
	case "sell":
		if matchIdx >= 0 {
			next := p.Holdings[matchIdx].Shares - tx.Shares
			if next < 0 {
				next = 0
			}
			p.Holdings[matchIdx].Shares = math.Round(next*10000) / 10000
			return true
		}
	case "split":
		if matchIdx >= 0 && tx.Shares > 0 {
			p.Holdings[matchIdx].Shares = math.Round((p.Holdings[matchIdx].Shares*tx.Shares)*10000) / 10000
			return true
		}
	}
	return false
}

// UpdateTransaction updates an existing transaction by ID in the portfolio's CSV ledger.
func (s *Service) UpdateTransaction(portfolioID string, tx model.Transaction) (model.Transaction, error) {
	if _, _, _, isGroup := s.resolveGroupMembers(portfolioID); isGroup {
		return model.Transaction{}, fmt.Errorf("cannot edit transactions on a combined group")
	}
	txs, _, err := s.store.LoadTransactions(portfolioID)
	if err != nil {
		return model.Transaction{}, err
	}
	if strings.TrimSpace(tx.ID) == "" {
		return model.Transaction{}, fmt.Errorf("transaction id is required")
	}
	tx, err = s.normalizeTransaction(tx)
	if err != nil {
		return model.Transaction{}, err
	}
	found := false
	for i := range txs {
		if txs[i].ID == tx.ID {
			txs[i] = tx
			found = true
			break
		}
	}
	if !found {
		return model.Transaction{}, fmt.Errorf("transaction %q not found", tx.ID)
	}
	if _, err := s.store.SaveTransactions(portfolioID, txs); err != nil {
		return model.Transaction{}, err
	}
	return tx, nil
}

// DeleteTransaction deletes a transaction by ID from the portfolio's CSV ledger.
func (s *Service) DeleteTransaction(portfolioID string, txID string) error {
	if _, _, _, isGroup := s.resolveGroupMembers(portfolioID); isGroup {
		return fmt.Errorf("cannot delete transactions on a combined group")
	}
	txs, _, err := s.store.LoadTransactions(portfolioID)
	if err != nil {
		return err
	}
	next := make([]model.Transaction, 0, len(txs))
	found := false
	for _, tx := range txs {
		if tx.ID == txID {
			found = true
			continue
		}
		next = append(next, tx)
	}
	if !found {
		return fmt.Errorf("transaction %q not found", txID)
	}
	_, err = s.store.SaveTransactions(portfolioID, next)
	return err
}

func acbEventOrder(txType string) int {
	switch txType {
	case "split":
		return 1
	case "buy":
		return 2
	case "reinvested_cap_gain":
		return 3
	case "roc":
		return 4
	case "sell":
		return 5
	default:
		return 6
	}
}

// ComputeACB computes CRA pooled Adjusted Cost Base (ACB) per ticker across all
// non-registered accounts for the specified portfolio or group.
func (s *Service) ComputeACB(portfolioID string) (model.ACBReport, error) {
	p, err := s.GetPortfolioConfig(portfolioID)
	if err != nil {
		return model.ACBReport{}, err
	}
	txs, txFile, err := s.GetTransactions(portfolioID)
	if err != nil {
		return model.ACBReport{}, err
	}

	divCfg := s.store.Divisions()
	symCfg := s.store.Symbols()
	cacheCfg := s.store.Cache()

	usdCad := DefaultUSDCAD
	if fx, ok := cacheCfg.FXRates["USD_CAD"]; ok && fx.Rate > 0 {
		usdCad = fx.Rate
	}

	accIsRegistered := make(map[string]bool)
	resolveRegistered := func(accName string) bool {
		if reg, ok := accIsRegistered[accName]; ok {
			return reg
		}
		accType := ""
		for _, a := range p.Accounts {
			if a.Name == accName && a.AccountType != "" {
				accType = a.AccountType
				break
			}
		}
		if accType == "" {
			for _, h := range p.Holdings {
				if h.Account == accName && h.AccountType != "" {
					accType = h.AccountType
					break
				}
			}
		}
		if accType == "" {
			accType = store.InferAccountType(accName, divCfg.AccountTypes)
		}
		reg := false
		if def, ok := divCfg.AccountTypes[accType]; ok {
			reg = def.Registered
		}
		accIsRegistered[accName] = reg
		return reg
	}

	// Track all buy dates per uppercase symbol across ALL accounts (including RRSP/TFSA)
	// for CRA +-30 day superficial loss checks.
	allBuyDatesBySym := make(map[string][]time.Time)
	txsBySym := make(map[string][]model.Transaction)
	var symOrder []string

	for _, tx := range txs {
		symKey := strings.ToUpper(strings.TrimSpace(tx.Symbol))
		if symKey == "" {
			continue
		}
		txType := strings.ToLower(strings.TrimSpace(tx.Type))
		if txType == "buy" {
			if dt, err := time.Parse("2006-01-02", tx.Date); err == nil {
				allBuyDatesBySym[symKey] = append(allBuyDatesBySym[symKey], dt)
			}
		}
		if resolveRegistered(tx.Account) {
			continue
		}
		switch txType {
		case "buy", "sell", "roc", "reinvested_cap_gain", "split":
		default:
			continue
		}
		if _, exists := txsBySym[symKey]; !exists {
			symOrder = append(symOrder, symKey)
		}
		txsBySym[symKey] = append(txsBySym[symKey], tx)
	}
	sort.Strings(symOrder)

	report := model.ACBReport{
		PortfolioID:        portfolioID,
		TransactionsFile:   txFile,
		RealizedGainByYear: make(map[string]float64),
	}
	yearSet := make(map[string]bool)

	for _, symKey := range symOrder {
		list := txsBySym[symKey]
		sort.SliceStable(list, func(i, j int) bool {
			if list[i].Date != list[j].Date {
				return list[i].Date < list[j].Date
			}
			oi := acbEventOrder(list[i].Type)
			oj := acbEventOrder(list[j].Type)
			if oi != oj {
				return oi < oj
			}
			return list[i].ID < list[j].ID
		})

		var runningShares float64
		var runningACB float64
		var realizedTotal float64
		realizedByYear := make(map[string]float64)
		accSet := make(map[string]bool)
		var accounts []string
		var events []model.ACBEvent
		hasSuperficial := false

		for _, tx := range list {
			if !accSet[tx.Account] {
				accSet[tx.Account] = true
				accounts = append(accounts, tx.Account)
			}
			fx := tx.FXRate
			if fx <= 0 {
				fx = 1.0
			}
			amt := tx.Amount
			if amt <= 0 && tx.Price > 0 && tx.Shares > 0 {
				amt = tx.Price * tx.Shares
			}
			amountCAD := amt * fx
			feeCAD := tx.Fee * fx

			var realizedGain float64
			var superficial bool

			switch tx.Type {
			case "buy":
				runningShares += tx.Shares
				runningACB += amountCAD + feeCAD
			case "sell":
				var avg float64
				if runningShares > 0 {
					avg = runningACB / runningShares
				}
				cost := avg * tx.Shares
				proceeds := amountCAD - feeCAD
				realizedGain = proceeds - cost
				runningShares -= tx.Shares
				runningACB -= cost
				if runningShares < 1e-8 {
					runningShares = 0
					runningACB = 0
				} else if runningACB < 0 {
					runningACB = 0
				}
				if len(tx.Date) >= 4 {
					yr := tx.Date[:4]
					realizedByYear[yr] += realizedGain
					report.RealizedGainByYear[yr] += realizedGain
					yearSet[yr] = true
				}
				realizedTotal += realizedGain

				if realizedGain < -0.01 {
					if sellDt, err := time.Parse("2006-01-02", tx.Date); err == nil {
						for _, bDt := range allBuyDatesBySym[symKey] {
							if bDt.Equal(sellDt) {
								continue
							}
							diffDays := math.Abs(bDt.Sub(sellDt).Hours() / 24.0)
							if diffDays <= 30.0 {
								superficial = true
								hasSuperficial = true
								break
							}
						}
					}
				}
			case "roc":
				if amountCAD > runningACB {
					excess := amountCAD - runningACB
					realizedGain = excess
					runningACB = 0
					if len(tx.Date) >= 4 {
						yr := tx.Date[:4]
						realizedByYear[yr] += excess
						report.RealizedGainByYear[yr] += excess
						yearSet[yr] = true
					}
					realizedTotal += excess
				} else {
					runningACB -= amountCAD
				}
			case "reinvested_cap_gain":
				runningACB += amountCAD
			case "split":
				if tx.Shares > 0 {
					runningShares *= tx.Shares
				}
			}

			var acbPerShare float64
			if runningShares > 0 {
				acbPerShare = runningACB / runningShares
			}

			events = append(events, model.ACBEvent{
				TransactionID:          tx.ID,
				Date:                   tx.Date,
				Account:                tx.Account,
				Type:                   tx.Type,
				Shares:                 tx.Shares,
				AmountCAD:              amountCAD,
				FeeCAD:                 feeCAD,
				RunningShares:          runningShares,
				RunningACBCAD:          runningACB,
				ACBPerShareCAD:         acbPerShare,
				RealizedGainCAD:        realizedGain,
				SuperficialLossWarning: superficial,
				Note:                   tx.Note,
			})
		}

		// Lookup current price & name cleanly (preserving exact key case if stored lowercase/mixed)
		symDef, hasDef := symCfg.Symbols[symKey]
		if !hasDef {
			for k, v := range symCfg.Symbols {
				if strings.EqualFold(k, symKey) {
					symDef = v
					hasDef = true
					break
				}
			}
		}
		price, curr := resolvePriceAndCurrency(symKey, symDef, cacheCfg)
		fxRate := 1.0
		if strings.EqualFold(curr, "USD") {
			fxRate = usdCad
		}
		curPriceCAD := price * fxRate
		mktValCAD := runningShares * curPriceCAD
		unrealized := mktValCAD - runningACB
		unrealizedPct := safeDiv(unrealized, runningACB)
		var acbPerShare float64
		if runningShares > 0 {
			acbPerShare = runningACB / runningShares
		}

		report.Symbols = append(report.Symbols, model.ACBSymbolSummary{
			Symbol:                symKey,
			SymbolName:            symDef.Name,
			Accounts:              accounts,
			TotalShares:           runningShares,
			TotalACBCAD:           runningACB,
			ACBPerShareCAD:        acbPerShare,
			CurrentPriceCAD:       curPriceCAD,
			MarketValueCAD:        mktValCAD,
			UnrealizedGainCAD:     unrealized,
			UnrealizedGainPct:     unrealizedPct,
			RealizedGainTotalCAD:  realizedTotal,
			RealizedGainByYear:    realizedByYear,
			HasSuperficialWarning: hasSuperficial,
			Events:                events,
		})

		report.TotalACBCAD += runningACB
		report.TotalMarketValueCAD += mktValCAD
		report.TotalUnrealizedGainCAD += unrealized
	}

	for yr := range yearSet {
		report.TaxYears = append(report.TaxYears, yr)
	}
	sort.Sort(sort.Reverse(sort.StringSlice(report.TaxYears)))

	return report, nil
}
