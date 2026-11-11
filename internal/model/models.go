package model

// --- 0. config.yaml (Application Settings) ---

type AppConfig struct {
	Language       string   `yaml:"language" json:"language"`               // "en-CA" or "fr-CA"
	ThemeMode      string   `yaml:"theme_mode" json:"theme_mode"`           // "system", "dark", or "light"
	LookupInterval string   `yaml:"lookup_interval" json:"lookup_interval"` // e.g. "1h", "30m", "15m", "0s"
	LookupOnLoad   bool     `yaml:"lookup_on_load" json:"lookup_on_load"`
	PortfolioPaths []string `yaml:"portfolio_paths,omitempty" json:"portfolio_paths"`
	DriftThreshold   float64  `yaml:"drift_threshold,omitempty" json:"drift_threshold"`     // e.g. 0.01 for 1%
	IdleTimeoutHours float64  `yaml:"idle_timeout_hours,omitempty" json:"idle_timeout_hours"` // e.g. 1.0 for 1 hour idle auto-shutdown
}

// --- 1. divisions.yaml ---

type DivisionsConfig struct {
	Categories      []CategoryDef             `yaml:"categories" json:"categories"`
	Divisions       []DivisionDef             `yaml:"divisions" json:"divisions"`
	AccountTypes    map[string]AccountTypeDef `yaml:"account_types" json:"account_types"`
	PortfolioGroups []PortfolioGroupDef       `yaml:"portfolio_groups,omitempty" json:"portfolio_groups,omitempty"`
}

type PortfolioGroupDef struct {
	ID             string   `yaml:"id" json:"id"`
	Name           string   `yaml:"name" json:"name"`
	Members        []string `yaml:"members" json:"members"`
	StrategyFromID string   `yaml:"strategy_from_id,omitempty" json:"strategy_from_id,omitempty"`
}

type CategoryDef struct {
	Name  string `yaml:"name" json:"name"`
	Order int    `yaml:"order" json:"order"`
}

type DivisionDef struct {
	Name     string `yaml:"name" json:"name"`
	Category string `yaml:"category" json:"category"`
	Order    int    `yaml:"order" json:"order"`
}

type AccountTypeDef struct {
	Name       string   `yaml:"name" json:"name"`
	Registered bool     `yaml:"registered" json:"registered"`
	Aliases    []string `yaml:"aliases" json:"aliases"`
}

// --- 2. symbols.yaml ---

type SymbolsConfig struct {
	Symbols map[string]SymbolDef `yaml:"symbols" json:"symbols"`
}

type SymbolDef struct {
	AssetType        string             `yaml:"asset_type,omitempty" json:"asset_type,omitempty"` // "etf", "stock", "cash"
	Name             string             `yaml:"name" json:"name"`
	Exchange         string             `yaml:"exchange" json:"exchange"`
	YahooTicker      string             `yaml:"yahoo_ticker,omitempty" json:"yahoo_ticker,omitempty"`
	Currency         string             `yaml:"currency" json:"currency"`
	TaxStructure     string             `yaml:"tax_structure" json:"tax_structure"`
	MetadataRecipe   string             `yaml:"metadata_recipe,omitempty" json:"metadata_recipe,omitempty"`
	DefaultMER       float64            `yaml:"default_mer" json:"default_mer"`
	FixedPrice       float64            `yaml:"fixed_price,omitempty" json:"fixed_price,omitempty"`
	DefaultDivisions map[string]float64 `yaml:"default_divisions" json:"default_divisions"`
}

// --- 3. data_sources.yaml (Data Sources + Recipes/Mappings) ---

type DataSourcesConfig struct {
	PriceSources      []PriceSourceRecipe          `yaml:"price_sources" json:"price_sources"`
	FXSources         []FXSourceRecipe             `yaml:"fx_sources" json:"fx_sources"`
	MetadataRecipes   map[string]MetadataRecipe    `yaml:"metadata_recipes" json:"metadata_recipes"`
	TaxStructureRules map[string]TaxStructureRule  `yaml:"tax_structure_rules" json:"tax_structure_rules"`
	CSVImporters      map[string]CSVImporterRecipe `yaml:"csv_importers" json:"csv_importers"`
}

type PriceSourceRecipe struct {
	ID          string            `yaml:"id" json:"id"`
	Name        string            `yaml:"name" json:"name"`
	Enabled     bool              `yaml:"enabled" json:"enabled"`
	URLTemplate string            `yaml:"url_template" json:"url_template"`
	Headers     map[string]string `yaml:"headers,omitempty" json:"headers,omitempty"`
	JSONMapping map[string]string `yaml:"json_mapping" json:"json_mapping"`
}

type FXSourceRecipe struct {
	ID          string            `yaml:"id" json:"id"`
	Name        string            `yaml:"name" json:"name"`
	Enabled     bool              `yaml:"enabled" json:"enabled"`
	Pair        string            `yaml:"pair" json:"pair"`
	URLTemplate string            `yaml:"url_template" json:"url_template"`
	Headers     map[string]string `yaml:"headers,omitempty" json:"headers,omitempty"`
	JSONMapping map[string]string `yaml:"json_mapping" json:"json_mapping"`
}

type MetadataRecipe struct {
	Name                 string            `yaml:"name" json:"name"`
	Type                 string            `yaml:"type" json:"type"` // "csv_holdings" or "html_table"
	URL                  string            `yaml:"url" json:"url"`
	URLTemplate          string            `yaml:"url_template,omitempty" json:"url_template,omitempty"` // {symbol} expanded per symbol (html_table)
	HeaderMatch          string            `yaml:"header_match" json:"header_match"`
	TickerColumn         string            `yaml:"ticker_column" json:"ticker_column"`
	WeightColumn         string            `yaml:"weight_column" json:"weight_column"`
	TableMatch           string            `yaml:"table_match,omitempty" json:"table_match,omitempty"`                 // html_table: section caption text locating the table
	KeyColumnIndex       int               `yaml:"key_column_index,omitempty" json:"key_column_index,omitempty"`       // html_table: 0-based (default 0)
	WeightColumnIndex    int               `yaml:"weight_column_index,omitempty" json:"weight_column_index,omitempty"` // html_table: 0-based (default 1)
	UnderlyingToDivision map[string]string `yaml:"underlying_to_division" json:"underlying_to_division"`
}

type TaxStructureRule struct {
	Description        string             `yaml:"description" json:"description"`
	USTier1Rate        float64            `yaml:"us_tier1_rate" json:"us_tier1_rate"`
	IntlTier1Rate      float64            `yaml:"intl_tier1_rate" json:"intl_tier1_rate"`
	USTier2Rate        float64            `yaml:"us_tier2_rate,omitempty" json:"us_tier2_rate,omitempty"`
	AccountMultipliers map[string]float64 `yaml:"account_multipliers" json:"account_multipliers"`
}

type CSVImporterRecipe struct {
	Name    string            `yaml:"name" json:"name"`
	Columns map[string]string `yaml:"columns" json:"columns"`
}

// --- 4. cache.yaml (MERs, Withholding Info, Division Ratios) & price_cache.yaml (Live Prices & FX Rates) ---

type CacheConfig struct {
	FXRates        map[string]CachedFX       `yaml:"fx_rates,omitempty" json:"fx_rates"`
	Prices         map[string]CachedPrice    `yaml:"prices,omitempty" json:"prices"`
	SymbolMetadata map[string]CachedMetadata `yaml:"symbol_metadata" json:"symbol_metadata"`
}

type PriceCacheConfig struct {
	FXRates map[string]CachedFX    `yaml:"fx_rates" json:"fx_rates"`
	Prices  map[string]CachedPrice `yaml:"prices" json:"prices"`
}

type MetadataCacheConfig struct {
	SymbolMetadata map[string]CachedMetadata `yaml:"symbol_metadata" json:"symbol_metadata"`
}

type CachedFX struct {
	Rate      float64 `yaml:"rate" json:"rate"`
	Source    string  `yaml:"source,omitempty" json:"source,omitempty"`
	UpdatedAt string  `yaml:"updated_at" json:"updated_at"`
}

type CachedPrice struct {
	Price     float64 `yaml:"price" json:"price"`
	Currency  string  `yaml:"currency" json:"currency"`
	UpdatedAt string  `yaml:"updated_at" json:"updated_at"`
}

type CachedMetadata struct {
	MER           float64            `yaml:"mer" json:"mer"`
	DividendYield float64            `yaml:"dividend_yield,omitempty" json:"dividend_yield,omitempty"`
	TaxByAccount  map[string]float64 `yaml:"tax_by_account" json:"tax_by_account"`
	Divisions     map[string]float64 `yaml:"divisions" json:"divisions"`
	UpdatedAt     string             `yaml:"updated_at" json:"updated_at"`
}

// --- 5. portfolios/*.yaml ---

type PortfolioConfig struct {
	ID          string  `yaml:"-" json:"id"`
	IsExample   bool    `yaml:"-" json:"is_example,omitempty"`
	FilePath    string  `yaml:"-" json:"file_path,omitempty"`
	SourceDir   string  `yaml:"-" json:"source_dir,omitempty"`
	Name        string  `yaml:"name" json:"name"`
	AmountToBuy float64 `yaml:"amount_to_buy" json:"amount_to_buy"`
	// After-tax allocation: RRSP holdings are valued as market value x (1 - rate) for
	// allocation/rebalancing targets. Trade amounts and shares remain gross CAD.
	AfterTaxAllocation    bool            `yaml:"after_tax_allocation,omitempty" json:"after_tax_allocation"`
	RRSPWithdrawalTaxRate *float64        `yaml:"rrsp_withdrawal_tax_rate,omitempty" json:"rrsp_withdrawal_tax_rate,omitempty"`
	Strategy              StrategyConfig  `yaml:"strategy" json:"strategy"`
	Holdings              []HoldingConfig `yaml:"holdings" json:"holdings"`
}

type StrategyConfig struct {
	Mode           string                        `yaml:"mode" json:"mode"` // "hierarchical" or "flat"
	Categories     map[string]float64            `yaml:"categories,omitempty" json:"categories,omitempty"`
	CategorySplits map[string]map[string]float64 `yaml:"category_splits,omitempty" json:"category_splits,omitempty"`
	Divisions      map[string]float64            `yaml:"divisions,omitempty" json:"divisions,omitempty"`
	Notes          []string                      `yaml:"notes,omitempty" json:"notes,omitempty"`
}

type HoldingConfig struct {
	ID                 string             `yaml:"-" json:"id"`
	Account            string             `yaml:"account" json:"account"`
	AccountType        string             `yaml:"account_type,omitempty" json:"account_type"`
	Symbol             string             `yaml:"symbol" json:"symbol"`
	Shares             float64            `yaml:"shares" json:"shares"`
	Division           string             `yaml:"division,omitempty" json:"division,omitempty"`
	Divisions          map[string]float64 `yaml:"divisions,omitempty" json:"divisions,omitempty"`
	RebalanceDivisions []string           `yaml:"rebalance_divisions,omitempty" json:"rebalance_divisions,omitempty"`
	ProposedShares     float64            `yaml:"proposed_shares,omitempty" json:"proposed_shares,omitempty"`
	Note               string             `yaml:"note,omitempty" json:"note,omitempty"`
	// AfterTaxFactor is an internal, evaluation-only override (not persisted). A combined
	// group uses it so each member applies its own RRSP rate while evaluating together.
	AfterTaxFactor *float64 `yaml:"-" json:"-"`
}

// --- Evaluated Output Models (Returned by Engine to Web UI / Wails / CLI) ---

type PortfolioEvaluation struct {
	PortfolioID          string   `json:"portfolio_id"`
	PortfolioName        string   `json:"portfolio_name"`
	FilterAccount        string   `json:"filter_account"`
	StrategyMode         string   `json:"strategy_mode"`
	StrategyNotes        []string `json:"strategy_notes"`
	USDCADRate           float64  `json:"usd_cad_rate"`
	FXUpdatedAt          string   `json:"fx_updated_at"`
	CurrentTotalCAD      float64  `json:"current_total_cad"`
	AmountToBuyCAD       float64  `json:"amount_to_buy_cad"`
	TargetTotalCAD       float64  `json:"target_total_cad"`
	AfterTotalCAD        float64  `json:"after_total_cad"`
	ProposedBuyTotalCAD  float64  `json:"proposed_buy_total_cad"`
	CalculatedBuyDiffCAD float64  `json:"calculated_buy_diff_cad"`
	// After-tax introspection. Allocation totals above use the active allocation basis;
	// gross values remain available for account reconciliation and cash/trade display.
	AllocationBasis             string                  `json:"allocation_basis"`
	RRSPWithdrawalTaxRate       *float64                `json:"rrsp_withdrawal_tax_rate"`
	GrossCurrentTotalCAD        float64                 `json:"gross_current_total_cad"`
	GrossAfterTotalCAD          float64                 `json:"gross_after_total_cad"`
	GrossProposedBuyTotalCAD    float64                 `json:"gross_proposed_buy_total_cad"`
	EstimatedRRSPDeferredTaxCAD float64                 `json:"estimated_rrsp_deferred_tax_cad"`
	RebalanceWarnings           []string                `json:"rebalance_warnings,omitempty"`
	DataWarnings                []string                `json:"data_warnings,omitempty"`
	WeightedMER                 float64                 `json:"weighted_mer"`
	WeightedMERPlusTax          float64                 `json:"weighted_mer_plus_tax"`
	Categories                  []CategoryEvaluation    `json:"categories"`
	Divisions                   []DivisionEvaluation    `json:"divisions"`
	AccountSummaries            []AccountSummary        `json:"account_summaries"`
	ClassificationSummaries     []ClassificationSummary `json:"classification_summaries"`
	RegVsUnregSummaries         []RegVsUnregSummary     `json:"reg_vs_unreg_summaries"`
	RawHoldings                 []HoldingSummary        `json:"raw_holdings"`
	ChecksPassed                bool                    `json:"checks_passed"`
}

type CategoryEvaluation struct {
	CategoryName    string  `json:"category_name"`
	TargetRatio     float64 `json:"target_ratio"`
	CurrentValueCAD float64 `json:"current_value_cad"`
	CurrentRatio    float64 `json:"current_ratio"`
	RatioMiss       float64 `json:"ratio_miss"`
	TargetValueCAD  float64 `json:"target_value_cad"`
	AmountToBuyCAD  float64 `json:"amount_to_buy_cad"`
	AfterValueCAD   float64 `json:"after_value_cad"`
	AfterRatio      float64 `json:"after_ratio"`
	AfterRatioMiss  float64 `json:"after_ratio_miss"`
	// Active-basis current/after values are above; gross values are for reconciliation.
	GrossCurrentValueCAD    float64 `json:"gross_current_value_cad"`
	GrossAfterValueCAD      float64 `json:"gross_after_value_cad"`
	EstimatedDeferredTaxCAD float64 `json:"estimated_deferred_tax_cad"`
}

type DivisionEvaluation struct {
	DivisionName           string  `json:"division_name"`
	CategoryName           string  `json:"category_name"`
	RelativeCategoryWeight float64 `json:"relative_category_weight"`
	TargetRatio            float64 `json:"target_ratio"`
	CurrentValueNativeSum  float64 `json:"current_value_native_sum"`
	CurrentValueCAD        float64 `json:"current_value_cad"`
	CurrentRatio           float64 `json:"current_ratio"`
	RatioMiss              float64 `json:"ratio_miss"`
	TargetValueCAD         float64 `json:"target_value_cad"`
	AmountToBuyCAD         float64 `json:"amount_to_buy_cad"`
	ProposedValueCAD       float64 `json:"proposed_value_cad"`
	AfterValueCAD          float64 `json:"after_value_cad"`
	AfterRatio             float64 `json:"after_ratio"`
	AfterRatioMiss         float64 `json:"after_ratio_miss"`
	WeightedMER            float64 `json:"weighted_mer"`
	WeightedMERPlusTax     float64 `json:"weighted_mer_plus_tax"`
	// Allocation values above use the active basis; gross companions and tax remain explicit.
	GrossCurrentValueCAD     float64          `json:"gross_current_value_cad"`
	GrossProposedValueCAD    float64          `json:"gross_proposed_value_cad"`
	GrossAfterValueCAD       float64          `json:"gross_after_value_cad"`
	AllocationAmountToBuyCAD float64          `json:"allocation_amount_to_buy_cad"`
	EstimatedDeferredTaxCAD  float64          `json:"estimated_deferred_tax_cad"`
	Rows                     []EvaluatedSlice `json:"rows"`
}

type EvaluatedSlice struct {
	HoldingID           string  `json:"holding_id"`
	Account             string  `json:"account"`
	AccountType         string  `json:"account_type"`
	Exchange            string  `json:"exchange"`
	Symbol              string  `json:"symbol"`
	SymbolName          string  `json:"symbol_name"`
	Note                string  `json:"note,omitempty"`
	IsCompositeSlice    bool    `json:"is_composite_slice"`
	DivisionWeight      float64 `json:"division_weight"`
	MER                 float64 `json:"mer"`
	Tax                 float64 `json:"tax"`
	MERPlusTax          float64 `json:"mer_plus_tax"`
	Currency            string  `json:"currency"`
	ExchangeRate        float64 `json:"exchange_rate"`
	SharePrice          float64 `json:"share_price"`
	TotalHoldingShares  float64 `json:"total_holding_shares"`
	EffectiveShares     float64 `json:"effective_shares"`
	MarketValueNative   float64 `json:"market_value_native"`
	MarketValueCAD      float64 `json:"market_value_cad"`
	CurrentRatio        float64 `json:"current_ratio"`
	IsRebalanceTarget   bool    `json:"is_rebalance_target"`
	TargetValueCAD      float64 `json:"target_value_cad"`
	AmountToBuyCAD      float64 `json:"amount_to_buy_cad"`
	AmountToBuyNative   float64 `json:"amount_to_buy_native"`
	CalculatedSharesBuy float64 `json:"calculated_shares_buy"`
	ProposedSharesBuy   float64 `json:"proposed_shares_buy"`
	ProposedValueCAD    float64 `json:"proposed_value_cad"`
	AfterValueCAD       float64 `json:"after_value_cad"`
	AfterRatio          float64 `json:"after_ratio"`
	MERContribution     float64 `json:"mer_contribution"`
	MERTaxContribution  float64 `json:"mer_tax_contribution"`
	// MarketValueCAD/ProposedValueCAD/AfterValueCAD use the active allocation basis;
	// gross companions remain for reconciliation. AmountToBuyCAD is gross CAD.
	AfterTaxFactor           float64 `json:"after_tax_factor"`
	GrossMarketValueCAD      float64 `json:"gross_market_value_cad"`
	GrossProposedValueCAD    float64 `json:"gross_proposed_value_cad"`
	GrossAfterValueCAD       float64 `json:"gross_after_value_cad"`
	AllocationAmountToBuyCAD float64 `json:"allocation_amount_to_buy_cad"`
	EstimatedDeferredTaxCAD  float64 `json:"estimated_deferred_tax_cad"`
}

type AccountSummary struct {
	Account        string           `json:"account"`
	AccountType    string           `json:"account_type"`
	Registered     bool             `json:"registered"`
	MarketValueCAD float64          `json:"market_value_cad"`
	PortfolioRatio float64          `json:"portfolio_ratio"`
	PositionCount  int              `json:"position_count"`
	Holdings       []HoldingSummary `json:"holdings"`
	// Gross market value is above for reconciliation; AllocationValueCAD uses the active
	// allocation basis. AfterTaxValueCAD is RRSP-discounted even in gross mode.
	AllocationValueCAD      float64 `json:"allocation_value_cad"`
	AfterTaxValueCAD        float64 `json:"after_tax_value_cad"`
	EstimatedDeferredTaxCAD float64 `json:"estimated_deferred_tax_cad"`
}

type ClassificationSummary struct {
	AccountType             string           `json:"account_type"`
	Name                    string           `json:"name"`
	Registered              bool             `json:"registered"`
	PositionCount           int              `json:"position_count"`
	MarketValueCAD          float64          `json:"market_value_cad"`
	PortfolioRatio          float64          `json:"portfolio_ratio"`
	Holdings                []HoldingSummary `json:"holdings"`
	AllocationValueCAD      float64          `json:"allocation_value_cad"`
	AfterTaxValueCAD        float64          `json:"after_tax_value_cad"`
	EstimatedDeferredTaxCAD float64          `json:"estimated_deferred_tax_cad"`
}

type RegVsUnregSummary struct {
	GroupName     string               `json:"group_name"` // "RRSP + TFSA (Registered)" vs "Unregistered"
	TotalValueCAD float64              `json:"total_value_cad"`
	CategoryRows  []CategoryEvaluation `json:"category_rows"`
}

type HoldingSummary struct {
	HoldingID          string             `json:"holding_id"`
	Account            string             `json:"account"`
	AccountType        string             `json:"account_type"`
	Symbol             string             `json:"symbol"`
	SymbolName         string             `json:"symbol_name"`
	Note               string             `json:"note,omitempty"`
	Currency           string             `json:"currency"`
	SharePrice         float64            `json:"share_price"`
	ExchangeRate       float64            `json:"exchange_rate"`
	Shares             float64            `json:"shares"`
	MarketValueCAD     float64            `json:"market_value_cad"`
	ProposedShares     float64            `json:"proposed_shares"`
	RebalanceDivisions []string           `json:"rebalance_divisions"`
	DivisionBreakdown  map[string]float64 `json:"division_breakdown"`
	// MarketValueCAD is gross brokerage value; AllocationValueCAD follows the active basis.
	AfterTaxFactor          float64 `json:"after_tax_factor"`
	AllocationValueCAD      float64 `json:"allocation_value_cad"`
	AfterTaxValueCAD        float64 `json:"after_tax_value_cad"`
	EstimatedDeferredTaxCAD float64 `json:"estimated_deferred_tax_cad"`
}
