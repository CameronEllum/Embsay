/**
 * Embsay — Core Application, Router, State & Formatting
 */

  const DIVISION_COLORS = ['#4f46e5', '#0284c7', '#059669', '#7c3aed', '#d97706', '#db2777', '#0d9488'];

  let appState = null;
  let currentEval = null;
  let currentPortfolioConfig = null;
  let selectedPortfolio = '';
  let selectedFilter = 'all';
  let rebalanceMode = false;
  let holdingsGrouping = 'division'; // 'division' or 'classification'
  let activeTab = 'account';
  let currentMainView = 'portfolio';
  let currentPortfolioSubTab = 'account';
  let currentThemeMode = 'system';
  let currentLang = 'en-CA';
  let priceRefreshTimer = null;
  const tableSortState = {};

  const I18N = {
    'en-CA': {
      btn_combine: '⊕ Combine / Group',
      btn_combine_title: 'Combine any portfolios on the fly or create a saved group',
      btn_new_portfolio: '+ New Portfolio',
      btn_new_portfolio_title: 'Create a new portfolio',
      rebalance_simulator: 'Rebalance Simulator',
      btn_refresh_prices: '↻ Prices & FX',
      btn_refresh_prices_title: 'Fetch latest market prices and Bank of Canada USD/CAD rate',
      btn_updating_prices: '↻ Updating...',
      btn_theme_title: 'Theme mode (click to cycle System / Dark / Light)',
      theme_system: '🖥 System ({mode})',
      theme_dark: '🌙 Dark',
      theme_light: '☀️ Light',
      mode_dark_short: 'Dark',
      mode_light_short: 'Light',
      nav_portfolio: 'Portfolio',
      btn_portfolio_selection: 'Portfolio Selection',
      nav_portfolios: 'Portfolios',
      nav_port_mgmt: 'Manage Portfolios',
      nav_securities_tax: 'ETFs & Tax',
      nav_config: 'Config',
      nav_overview: 'Allocation Overview',
      nav_by_division: 'By Division',
      nav_by_classification: 'By Classification',
      toggle_divide_by_strategy: 'Divide by Strategy Target',
      lbl_target: 'Target',
      lbl_drift: 'Drift',
      nav_by_account: 'By Account',
      nav_positions: 'Positions & Import',
      nav_strategy: 'Strategy, Divisions & Groups',
      nav_strategy_targets: 'Strategy Targets',
      btn_refresh_prices_short: 'Refresh Prices',
      mer_tax_tooltip: 'MER: {mer} · Foreign Withholding Tax Drag: {tax}',
      sub_combined_group: 'Viewing Combined Group: {name}',
      sub_portfolio: 'Portfolio: {name} (portfolios/{id}.yaml)',
      examples_dropdown: 'Examples ▾',
      combine_title: 'Combine Portfolios',
      combine_desc: 'Select any portfolios to view together:',
      btn_view_combined: 'View Combined',
      btn_save_as_group: 'Save as Group...',
      filter_all: 'All Accounts',
      filter_registered: 'Registered Only (RRSP + TFSA)',
      filter_unregistered: 'Unregistered (Taxable)',
      filter_rrsp: 'RRSPs Only',
      filter_tfsa: 'TFSAs Only',
      filter_specific_group: 'Specific Account',
      rebal_banner_title: '⚖️ Rebalance Simulator Active',
      rebal_banner_desc: 'Simulate deposits, withdrawals, and target share trades without cluttering your daily view.',
      rebal_cash_label: 'Cash to Invest / Withdraw ($ CAD):',
      rebal_btn_whole: 'Populate Recommended Shares (Whole)',
      rebal_btn_exact: 'Exact Shares',
      rebal_btn_commit: '✓ Commit Executed Trades to Holdings',
      after_tax_badge: 'After-tax allocation · RRSP/RRIF {rate}%',
      after_tax_toggle: 'After-Tax RRSP',
      after_tax_toggle_on_help: 'On: RRSP values are after-tax for allocation and targets. Click to turn off.',
      after_tax_toggle_off_help: 'Off: allocation uses gross market values. Click to turn on.',
      after_tax_toggle_group_help: 'Combined groups follow each member portfolio\'s setting; edit in the individual portfolio.',
      after_tax_save_required_rate: 'Enter an RRSP/RRIF withdrawal tax rate on Strategy Targets before turning this on.',
      after_tax_save_success_on: 'After-tax RRSP allocation enabled',
      after_tax_save_success_off: 'After-tax RRSP allocation disabled',
      after_tax_rate_saved: 'RRSP/RRIF withdrawal tax rate saved',
      after_tax_disclaimer: 'RRSP allocation uses an estimated future withdrawal tax rate; TFSA, RESP, and taxable values are unchanged.',
      rebal_warning_title: 'Rebalancing warning',
      rebal_cash_gross_label: 'Gross cash to invest / withdraw ($ CAD):',
      th_gross_trade_needed: 'Gross Trade Needed',
      lbl_gross_trade_needed_colon: 'Gross Trade Needed:',
      kpi_after_tax_allocation: 'After-Tax Allocation Total (CAD)',
      kpi_rrsp_tax_sub: 'Estimated RRSP deferred tax: {tax} · Gross market value: {gross}',
      th_after_tax_current_value: 'After-Tax Value',
      th_allocation_value: 'Allocation Value',
      title_gross_value: 'Gross brokerage value: {gross}',
      strat_after_tax_title_lbl: 'After-Tax RRSP Allocation',
      strat_after_tax_help: 'Used for allocation and rebalancing targets. RRSP holdings count as market value × (1 − rate). This is an estimate, not a tax-bracket calculation.',
      strat_after_tax_rate_lbl: 'Expected effective RRSP/RRIF withdrawal tax rate (%)',
      kpi_total_value: 'Total Market Value (CAD)',
      lbl_total: 'Total',
      kpi_positions_across: '{pos} positions across {acc} accounts',
      kpi_category_split: 'Category Split',
      kpi_strategy_target: 'Strategy Target: {target}',
      kpi_fee_tax_drag: 'Fee & Withholding Tax Drag',
      kpi_per_yr: '/yr',
      kpi_mer_tax_sub: 'MER: {mer} · Withholding Tax: {tax}',
      kpi_usd_cad: 'USD / CAD Exchange Rate',
      kpi_usd_cad_title: 'Click to edit USD/CAD rate',
      kpi_as_of: 'As of {date}',
      alloc_vs_target_title: 'Portfolio Allocation vs. Strategy Target',
      alloc_vs_target_sub: 'Visualizing actual division weights against your target strategy',
      pill_target_short: 'Target {pct}',
      bar_actual_alloc: 'Actual Allocation',
      bar_target_strat: 'Target Strategy',
      th_division: 'Division',
      th_category: 'Category',
      th_actual_vs_target: 'Actual vs Target',
      th_current_value: 'Current Value',
      th_actual_pct: 'Actual %',
      th_target_pct: 'Target %',
      th_drift: 'Drift',
      th_target_value: 'Target Value',
      th_net_trade_needed: 'Net Trade Needed',
      th_simulated_after: 'Simulated After',
      holdings_by_division: 'Holdings by Division',
      holdings_by_division_sub: '',
      holdings_by_classification: 'Holdings by Classification',
      holdings_by_classification_sub: 'Positions grouped by account classification (RRSP, TFSA, Non-Registered, RESP).',
      btn_by_division: 'By Division',
      btn_by_classification: 'By Classification',
      btn_by_account: 'By Account',
      holdings_by_account: 'Holdings by Account',
      holdings_by_account_sub: 'Positions grouped by individual brokerage account.',
      empty_account: 'No holdings in this account',
      btn_rename_short: 'Rename',
      title_rename_account: 'Rename account "{acc}" across all holdings in this portfolio',
      prompt_rename_account: 'Rename account "{old}" to:',
      toast_account_renamed: 'Renamed "{old}" to "{name}" ({count} positions updated)',
      alert_rename_group_disabled: 'To rename accounts, select an individual portfolio tab.',
      tax_location_title: 'Tax Location (Registered vs. Taxable Category Split)',
      lbl_positions_colon: 'Positions:',
      lbl_value_colon: 'Value:',
      lbl_weight_colon: 'Weight:',
      lbl_portfolio_weight_colon: 'Portfolio Weight:',
      lbl_target_colon: 'Target:',
      lbl_trade_needed_colon: 'Trade Needed:',
      lbl_target_suffix: 'target',
      th_account: 'Account',
      th_account_type: 'Account Type',
      th_security: 'Security',
      th_div_mapping: 'Division Mapping',
      th_price: 'Price',
      th_shares: 'Shares',
      th_shares_principal: 'Shares / Principal',
      th_value_cad: 'Value (CAD)',
      th_market_value_cad: 'Market Value (CAD)',
      th_portfolio_pct: 'Portfolio %',
      th_mer_plus_tax: 'MER + Tax',
      th_rebal_target: 'Target',
      th_rebal_target_full: 'Target',
      th_target_trade_dollar: 'Target Trade ($)',
      th_rec_shares: 'Rec. Shares',
      th_sim_trade_sh: 'Simulated Trade (sh)',
      th_after_value: 'After Value',
      th_remove: 'Remove',
      th_classification: 'Classification',
      th_positions: 'Positions',
      th_weight: 'Weight',
      th_bucket_category: 'Bucket / Category',
      th_current_cad: 'Current (CAD)',
      empty_classification: 'No holdings in this classification',
      empty_division: 'No holdings in this division',
      comp_slice_badge: '{pct} of {sym}',
      comp_slice_title: 'Decomposed slice: {pct} of {shares} total {sym} shares',
      title_edit_account: 'Click to edit Account name (e.g. RRSP, TFSA, Non-Registered)',
      title_edit_shares: 'Click to edit total {sym} shares',
      title_route_rebal: 'Route {div} rebalancing trades to this holding',
      title_sim_shares: 'Simulated shares of {sym} to buy (+) or sell (-)',
      sh_unit: 'sh',
      add_position_title: 'Add Position',
      lbl_account_name: 'Account Name',
      ph_account_name: 'e.g. RRSP, TFSA',
      lbl_account_type: 'Account Type',
      opt_auto_detect: 'Auto-detect',
      opt_rrsp_reg: 'RRSP (Registered)',
      opt_tfsa_reg: 'TFSA (Registered)',
      opt_nonreg_margin: 'Non-Registered / Margin',
      opt_resp: 'RESP',
      lbl_symbol: 'Symbol',
      lbl_shares_principal: 'Shares / Principal',
      lbl_note_opt: 'Note (Optional)',
      ph_note: 'e.g. GIC maturity',
      btn_add_position: '+ Add Position',
      import_csv_title: 'Import Brokerage CSV',
      btn_import_csv: 'Import CSV',
      ph_csv_paste: 'Paste brokerage positions CSV here (Account,Symbol,Quantity)...',
      portfolio_positions_title: 'Portfolio Positions (Single Entry per Holding)',
      portfolio_positions_sub: 'Click any share count to edit directly. Multi-division ETFs are entered once here.',
      btn_delete_portfolio: 'Delete Portfolio "{name}"',
      opt_none: '— None —',
      opt_all_mapped: 'All Mapped ({count})',
      strat_editor_title: 'Target Allocation Strategy ({name})',
      strat_editor_sub: 'Configure how categories and regional divisions are weighted',
      lbl_mode: 'Mode:',
      strat_select_portfolio_msg: 'Select a portfolio to view strategy targets.',
      strat_ph_new_div: 'New division name (e.g. Canada, US, Europe)...',
      strat_ph_new_cat: 'New category name (e.g. Stocks, Fixed Income)...',
      strat_add_division_btn: '+ Add Division',
      strat_add_category_btn: '+ Add Category',
      strat_add_hier_div_btn: '+ Add Division to Category',
      strat_target_balanced: 'Target Balanced',
      strat_target_mismatch: 'Targets sum to {sum}% (must equal 100%)',
      opt_default_strategy: 'Default Strategy',
      opt_existing_ports_group: 'Copy From Existing Portfolio',
      cfg_at_least_one_dir: 'At least one directory is required',
      strat_mode_hier: 'Hierarchical (Category % → Division Split %)',
      strat_mode_flat: 'Flat (Direct Division %)',
      strat_step1_cats: '1. Category Weights (Total = 100%)',
      strat_step2_divs: '2. Relative Division Weights Within Each Category',
      strat_direct_divs: 'Direct Portfolio Division Weights (Total = 100%)',
      th_split_within_cat: 'Split Within Category (%)',
      th_eff_portfolio_pct: 'Effective Portfolio %',
      th_portfolio_target_pct: 'Portfolio Target (%)',
      lbl_strat_notes: 'Strategy Notes & Investment Rationale',
      strat_no_notes_placeholder: 'No strategy notes or rationale added yet. Click Edit to add investment guidelines or rules of thumb.',
      btn_edit: 'Edit',
      btn_done: 'Done',
      ph_strat_notes: 'Add investment thesis, rebalancing rationale, or rules of thumb (one note per line)...',
      help_strat_notes: 'Saved directly to the portfolio YAML file (one note per line).',
      btn_save_strategy: 'Save Strategy & Divisions',
      strat_select_indiv_msg: 'Select an individual portfolio tab to edit and save its strategy.',
      groups_title: 'Portfolio Groups',
      groups_sub: 'Combine any portfolios (e.g. Retirement + Taxable, or All Accounts) into a unified view',
      th_group_name: 'Group Name',
      th_included_portfolios: 'Included Portfolios',
      ph_new_group: 'New group name...',
      btn_add_group: '+ Add Group',
      cats_divs_title: 'Categories & Divisions (config/divisions.yaml)',
      cats_divs_sub: 'Add new asset categories (e.g. Real Estate, Alternatives) or regional divisions',
      btn_save_cats_divs: 'Save Categories & Divisions',
      lbl_categories: 'Categories',
      th_category_name: 'Category Name',
      ph_new_category: 'New Category (e.g. Real Estate)',
      btn_add_category: '+ Add Category',
      lbl_divisions: 'Divisions',
      th_division_name: 'Division Name',
      th_linked_category: 'Linked Category',
      ph_new_division: 'New Division (e.g. Gold / REITs)',
      btn_add_division: '+ Add Division',
      app_settings_title: 'Application Settings (config/config.yaml)',
      app_settings_sub: 'Configure language, automatic price lookup interval, and theme mode',
      cfg_paths_title: '📁 Portfolio Directories & Search Paths',
      cfg_paths_sub: 'Configure local filesystem directories where Embsay discovers and saves your portfolio YAML files',
      cfg_ph_new_path: 'Enter folder path (e.g. portfolios, or C:/Users/Documents/Portfolios)...',
      btn_add_path: '+ Add Directory',
      th_directory_path: 'Directory / Folder Path',
      cfg_paths_hint: 'Configure local filesystem directories where Embsay discovers and saves your portfolio YAML files.',
      cfg_paths_hint_clean: 'Embsay scans these directories for portfolio YAML files. You can configure multiple folders across your computer.',
      port_mgmt_title: 'Portfolio Management',
      port_mgmt_sub: 'Manage directories, create and organize individual portfolios, and configure unified portfolio groups',
      btn_create_new_port: '+ Create New Portfolio',
      discovered_ports_title: 'Discovered Portfolios',
      discovered_ports_sub: 'Individual portfolio files discovered across your configured search directories',
      th_port_name: 'Portfolio Name',
      th_port_id: 'ID',
      th_file_location: 'Path',
      th_accounts_count: 'Accounts',
      th_holdings_count: 'Holdings',
      th_actions: 'Actions',
      btn_open_portfolio: 'View ↗',
      grp_editor_title: 'Saved Portfolio Groups (Unified Views)',
      grp_editor_sub: 'Combine any portfolios into a consolidated multi-account view',
      lbl_group_name: 'Group Name',
      btn_create_new_group: '+ Create New Portfolio Group',
      opt_use_first_member: '(Use First Selected Member)',
      msg_no_discovered_ports: 'No individual portfolios discovered.',
      msg_no_groups: 'No saved portfolio groups yet. Create one below.',
      lbl_selected_count: '{count} of {total} selected',
      lbl_portfolios_count: '{count} portfolios',
      btn_new_account: '+ New Account',
      btn_delete: 'Delete',
      title_delete_position: 'Delete position {sym}',
      grp_search_placeholder: 'Filter portfolios (e.g. RRSP, TFSA, Margin)...',
      grp_select_none: 'Deselect All',
      grp_select_filtered: 'Select Filtered',
      grp_strategy_from: 'Strategy Target Template:',
      btn_browse_folder: '📁 Browse...',
      lbl_save_directory: 'Save Directory / Folder',
      opt_custom_dir: '📁 Other directory (specify / browse)...',
      modal_new_port_sub_clean: 'Configure your portfolio name, storage directory, and starting strategy.',
      btn_save_app_settings: 'Save Settings & Paths',
      lbl_language: 'Language / Langue',
      lbl_lookup_interval: 'Price Lookup Interval',
      lbl_theme_mode: 'Theme Mode',
      opt_theme_system: '🖥 Follow System Default',
      opt_theme_dark: '🌙 Dark',
      opt_theme_light: '☀️ Light',
      lbl_lookup_on_load: 'Lookup prices on every load',
      lbl_drift_threshold: 'Drift Warning Rule (%)',
      add_security_title: 'Add New ETF',
      add_security_sub: 'Enter an ETF ticker symbol and click Lookup (or press Enter) to auto-fill details, then add to symbols.yaml',
      btn_lookup: '🔍 Lookup',
      btn_lookup_title: 'Look up name, exchange, currency, and price from symbol',
      lbl_fund_name: 'Fund Name',
      ph_fund_name: 'Auto-filled or custom fund name',
      lbl_exchange: 'Exchange',
      lbl_yahoo_ticker: 'Yahoo Ticker',
      lbl_currency: 'Currency',
      lbl_price_dollar: 'Price ($)',
      lbl_mer_pct: 'MER (%)',
      lbl_default_div: 'Default Division',
      btn_add_security: '+ Add ETF',
      sec_catalog_title: 'Master ETF & Metadata Catalog',
      sec_catalog_sub: 'Shared ETF definitions, MERs, tax structures, and division breakdowns (config/symbols.yaml & config/cache.yaml)',
      fwt_title: 'Foreign Withholding Tax (FWT) Intelligence Engine',
      fwt_sub: 'Cross-border tax rules, Level 1 & Level 2 mechanics, Canada–US treaty exemptions, and account drag calculations',
      fwt_rule1_title: '1. Level 1: Direct Foreign Tax',
      fwt_rule1_desc: 'Withholding applied directly by the foreign source country (e.g. US IRS withholds 15% on US dividends; European and Asian nations withhold ~8–12%).',
      fwt_rule2_title: '2. Level 2: Fund Wrapper Tax',
      fwt_rule2_desc: 'A second 15% US withholding tax triggered when a Canadian ETF holds a US-listed ETF wrapper (e.g. XAW holding ITOT/IEFA) before distributing to Canadians.',
      fwt_rule3_title: '3. Canada–US Tax Treaty Exemption (RRSP Only)',
      fwt_rule3_desc: 'US-listed ETFs holding US stocks directly (e.g. VTI) held in an RRSP/RRIF are 100% exempt from US withholding. Canadian-listed ETFs (XUU, XEQT, VEQT) cannot pass this through to RRSPs.',
      fwt_rule4_title: '4. Foreign Tax Credit (FTC) in Taxable Accounts',
      fwt_rule4_desc: 'In non-registered accounts, foreign tax reported on T3/T5 slips is recoverable as a tax credit on line 40500 of your T1. In TFSA and RESP accounts, foreign withholding is permanently unrecoverable.',
      fwt_rules_matrix_title: 'Tax Structure Matrix (config/data_sources.yaml)',
      fwt_inspector_title: '🔍 ETF Tax Drag Inspector',
      fwt_inspector_sub: 'Select any ETF to view its exact Level 1/2 withholding calculation and account drag breakdown',
      th_tax_structure: 'Tax Structure',
      th_description: 'Description',
      th_level1_fwt: 'Level 1 FWT',
      th_level2_fwt: 'Level 2 FWT',
      th_rrsp_treaty: 'RRSP Treaty Status',
      th_tfsa_drag: 'TFSA / RESP Drag',
      th_taxable_drag: 'Taxable (Net of FTC)',
      th_mapped_securities: 'Mapped Securities',
      btn_refresh_meta: '↻ Refresh Composite ETF Ratios',
      btn_fetching_meta: '↻ Refreshing Composite Ratios...',
      btn_refresh_etf_data: '↻ Refresh ETF Data',
      btn_refreshing_etf_data: '↻ Downloading ETF Data...',
      btn_reset_symbols: '🗑️ Reset All Symbols',
      confirm_reset_symbols: 'Are you sure you want to delete ALL saved symbols, cached prices, and ETF metadata?\n\nTimestamped backups of symbols.yaml and cache.yaml will be saved automatically.',
      toast_symbols_reset: 'All symbols and cached ETF metadata deleted (backups saved)',
      btn_save_cache: 'Save Changes to Cache',
      th_symbol: 'Symbol',
      th_name: 'Name',
      th_curr: 'Curr',
      th_rrsp_tax: 'RRSP Tax (%)',
      th_tfsa_tax: 'TFSA Tax (%)',
      th_taxable_tax: 'Taxable Tax (%)',
      recipes_title: 'Configured Data Source Recipes (config/data_sources.yaml)',
      recipes_price_fx: 'Price & FX Sources',
      recipes_composite: 'Composite ETF Holdings CSV Parsers',
      th_recipe: 'Recipe',
      th_status: 'Status',
      th_json_path: 'JSON Path',
      th_underlying_map: 'Underlying Mapping',
      pill_active: 'Active',
      pill_standby: 'Standby',
      modal_new_port_title: 'Create New Portfolio',
      modal_new_port_sub: 'Creates a new <code>portfolios/&lt;name&gt;.yaml</code> file automatically.',
      lbl_portfolio_name: 'Portfolio Name',
      ph_portfolio_name: 'e.g. Kid 2 RESP, Corporate, TFSA',
      lbl_copy_strat: 'Copy Initial Strategy From',
      opt_copy_strat_from: 'Copy strategy from {name}',
      btn_cancel: 'Cancel',
      btn_create_portfolio: 'Create Portfolio',
      toast_lang_saved: 'Language set to English (Canada)',
      toast_theme_saved: 'Theme mode saved to config.yaml: {mode}',
      toast_settings_saved: 'Saved settings to config/config.yaml',
      btn_backup: 'Backup',
      btn_backup_portfolio_title: 'Save a date-and-time postfixed YAML backup of this portfolio',
      toast_backup_created: 'Backup saved: {file}',
      btn_quit: 'Quit',
      btn_quit_title: 'Quit and close the Embsay application',
      confirm_quit: 'Are you sure you want to quit Embsay?',
      app_stopped_title: 'Embsay has shut down',
      app_stopped_desc: 'The local server is no longer running. You may safely close this browser tab.',
      lbl_idle_timeout: 'Idle Auto-Close (Hours)'
    },
    'fr-CA': {
      btn_combine: '⊕ Combiner / Groupe',
      btn_combine_title: 'Combiner des portefeuilles à la volée ou créer un groupe enregistré',
      btn_new_portfolio: '+ Nouveau portefeuille',
      btn_new_portfolio_title: 'Créer un nouveau portefeuille',
      rebalance_simulator: 'Simulateur de rééquilibrage',
      btn_refresh_prices: '↻ Cours et change',
      btn_refresh_prices_title: 'Actualiser les cours boursiers et le taux USD/CAD de la Banque du Canada',
      btn_updating_prices: '↻ Actualisation...',
      btn_theme_title: 'Thème d’affichage (cliquer pour alterner Système / Sombre / Clair)',
      theme_system: '🖥 Système ({mode})',
      theme_dark: '🌙 Sombre',
      theme_light: '☀️ Clair',
      mode_dark_short: 'Sombre',
      mode_light_short: 'Clair',
      nav_portfolio: 'Portefeuille',
      btn_portfolio_selection: 'Sélection de portefeuille',
      nav_portfolios: 'Portefeuilles',
      nav_port_mgmt: 'Gérer les portefeuilles',
      nav_securities_tax: 'FNB et fiscalité',
      nav_config: 'Configuration',
      nav_overview: 'Aperçu de la répartition',
      nav_by_division: 'Par division',
      nav_by_classification: 'Par catégorie',
      toggle_divide_by_strategy: 'Diviser selon la stratégie cible',
      lbl_target: 'Cible',
      lbl_drift: 'Écart',
      nav_by_account: 'Par compte',
      nav_positions: 'Positions et importation',
      nav_strategy: 'Stratégie, divisions et groupes',
      nav_strategy_targets: 'Cibles de stratégie',
      btn_refresh_prices_short: 'Actualiser les cours',
      mer_tax_tooltip: 'RFG : {mer} · Retenue d’impôt étrangère : {tax}',
      sub_combined_group: 'Groupe combiné affiché : {name}',
      sub_portfolio: 'Portefeuille : {name} (portfolios/{id}.yaml)',
      examples_dropdown: 'Exemples ▾',
      combine_title: 'Combiner des portefeuilles',
      combine_desc: 'Sélectionnez les portefeuilles à regrouper :',
      btn_view_combined: 'Afficher le combiné',
      btn_save_as_group: 'Enregistrer le groupe...',
      filter_all: 'Tous les comptes',
      filter_registered: 'Enregistrés seulement (REER + CELI)',
      filter_unregistered: 'Non enregistrés (imposables)',
      filter_rrsp: 'REER seulement',
      filter_tfsa: 'CELI seulement',
      filter_specific_group: 'Compte spécifique',
      rebal_banner_title: '⚖️ Simulateur de rééquilibrage actif',
      rebal_banner_desc: 'Simulez vos cotisations, retraits et achats/ventes de parts cibles sans alourdir la vue quotidienne.',
      rebal_cash_label: 'Liquidités à investir / retirer ($ CAD) :',
      rebal_btn_whole: 'Remplir les parts recommandées (entières)',
      rebal_btn_exact: 'Parts exactes',
      rebal_btn_commit: '✓ Appliquer les transactions simulées aux positions',
      after_tax_badge: 'Répartition après impôt · REER/RRIF {rate}%',
      after_tax_toggle: 'REER après impôt',
      after_tax_toggle_on_help: 'Actif : les valeurs REER sont après impôt pour la répartition et les cibles. Cliquez pour désactiver.',
      after_tax_toggle_off_help: 'Inactif : la répartition utilise les valeurs marchandes brutes. Cliquez pour activer.',
      after_tax_toggle_group_help: 'Les groupes combinés suivent le réglage de chaque portefeuille membre; modifiez-le dans le portefeuille individuel.',
      after_tax_save_required_rate: 'Entrez un taux d’imposition des retraits REER/RRIF dans l’onglet Cibles de stratégie avant d’activer.',
      after_tax_save_success_on: 'Répartition REER après impôt activée',
      after_tax_save_success_off: 'Répartition REER après impôt désactivée',
      after_tax_rate_saved: 'Taux d’imposition des retraits REER/RRIF enregistré',
      after_tax_disclaimer: 'La répartition REER utilise un taux d’imposition futur estimé; CELI, REEE et valeurs imposables sont inchangés.',
      rebal_warning_title: 'Avertissement de rééquilibrage',
      rebal_cash_gross_label: 'Liquidités brutes à investir / retirer ($ CAD) :',
      th_gross_trade_needed: 'Transaction brute requise',
      lbl_gross_trade_needed_colon: 'Transaction brute requise :',
      kpi_after_tax_allocation: 'Total de répartition après impôt (CAD)',
      kpi_rrsp_tax_sub: 'Impôt reporté REER estimé : {tax} · Valeur marchande brute : {gross}',
      th_after_tax_current_value: 'Valeur après impôt',
      th_allocation_value: 'Valeur de répartition',
      title_gross_value: 'Valeur de compte brute : {gross}',
      strat_after_tax_title_lbl: 'Répartition REER après impôt',
      strat_after_tax_help: 'Utilisée pour les cibles de répartition et de rééquilibrage. Les positions REER comptent pour valeur marchande × (1 − taux). Il s’agit d’une estimation, non d’un calcul d’impôt par palier.',
      strat_after_tax_rate_lbl: 'Taux d’imposition futur effectif prévu des retraits REER/RRIF (%)',
      kpi_total_value: 'Valeur marchande totale (CAD)',
      lbl_total: 'Total',
      kpi_positions_across: '{pos} positions réparties dans {acc} comptes',
      kpi_category_split: 'Répartition par catégorie',
      kpi_strategy_target: 'Cible stratégique : {target}',
      kpi_fee_tax_drag: 'Frais (RFG) et retenue d’impôt',
      kpi_per_yr: '/an',
      kpi_mer_tax_sub: 'RFG : {mer} · Retenue d’impôt : {tax}',
      kpi_usd_cad: 'Taux de change USD / CAD',
      kpi_usd_cad_title: 'Cliquer pour modifier le taux USD/CAD',
      kpi_as_of: 'En date du {date}',
      alloc_vs_target_title: 'Répartition du portefeuille c. cible stratégique',
      alloc_vs_target_sub: 'Pondérations réelles par division comparées à votre stratégie cible',
      pill_target_short: 'Cible {pct}',
      bar_actual_alloc: 'Répartition actuelle',
      bar_target_strat: 'Stratégie cible',
      th_division: 'Division',
      th_category: 'Catégorie',
      th_actual_vs_target: 'Réel c. cible',
      th_current_value: 'Valeur actuelle',
      th_actual_pct: 'Réel (%)',
      th_target_pct: 'Cible (%)',
      th_drift: 'Écart',
      th_target_value: 'Valeur cible',
      th_net_trade_needed: 'Transaction nette requise',
      th_simulated_after: 'Après simulation',
      holdings_by_division: 'Positions par division',
      holdings_by_division_sub: '',
      holdings_by_classification: 'Positions par classification',
      holdings_by_classification_sub: 'Positions regroupées selon la classification fiscale du compte (REER, CELI, Non enregistré, REEE).',
      btn_by_division: 'Par division',
      btn_by_classification: 'Par catégorie',
      btn_by_account: 'Par compte',
      holdings_by_account: 'Positions par compte',
      holdings_by_account_sub: 'Positions regroupées par compte de courtage individuel.',
      empty_account: 'Aucune position dans ce compte',
      btn_rename_short: 'Renommer',
      title_rename_account: 'Renommer le compte « {acc} » pour toutes les positions de ce portefeuille',
      prompt_rename_account: 'Renommer le compte « {old} » en :',
      toast_account_renamed: 'Compte « {old} » renommé en « {name} » ({count} positions mises à jour)',
      alert_rename_group_disabled: 'Pour renommer des comptes, sélectionnez un portefeuille individuel.',
      tax_location_title: 'Localisation fiscale (répartition Enregistré c. Imposable)',
      lbl_positions_colon: 'Positions :',
      lbl_value_colon: 'Valeur :',
      lbl_weight_colon: 'Pondération :',
      lbl_portfolio_weight_colon: 'Poids du portefeuille :',
      lbl_target_colon: 'Cible :',
      lbl_trade_needed_colon: 'Transaction requise :',
      lbl_target_suffix: 'cible',
      th_account: 'Compte',
      th_account_type: 'Type de compte',
      th_security: 'Titre / FNB',
      th_div_mapping: 'Répartition par division',
      th_price: 'Cours',
      th_shares: 'Parts',
      th_shares_principal: 'Parts / Capital',
      th_value_cad: 'Valeur (CAD)',
      th_market_value_cad: 'Valeur marchande (CAD)',
      th_portfolio_pct: '% portef.',
      th_mer_plus_tax: 'RFG + Impôt',
      th_rebal_target: 'Cible',
      th_rebal_target_full: 'Cible',
      th_target_trade_dollar: 'Transaction cible ($)',
      th_rec_shares: 'Parts rec.',
      th_sim_trade_sh: 'Transaction simulée (parts)',
      th_after_value: 'Valeur après',
      th_remove: 'Retirer',
      th_classification: 'Classification',
      th_positions: 'Positions',
      th_weight: 'Pondération',
      th_bucket_category: 'Volet fiscal / Catégorie',
      th_current_cad: 'Actuel (CAD)',
      empty_classification: 'Aucune position dans cette classification',
      empty_division: 'Aucune position dans cette division',
      comp_slice_badge: '{pct} de {sym}',
      comp_slice_title: 'Tranche décomposée : {pct} sur {shares} parts totales de {sym}',
      title_edit_account: 'Cliquer pour modifier le nom du compte (p. ex. REER, CELI, Non enregistré)',
      title_edit_shares: 'Cliquer pour modifier le nombre total de parts de {sym}',
      title_route_rebal: 'Acheminer les transactions de rééquilibrage de {div} vers cette position',
      title_sim_shares: 'Parts simulées de {sym} à acheter (+) ou vendre (-)',
      sh_unit: 'parts',
      add_position_title: 'Ajouter une position',
      lbl_account_name: 'Nom du compte',
      ph_account_name: 'p. ex. REER, CELI',
      lbl_account_type: 'Type de compte',
      opt_auto_detect: 'Détection auto',
      opt_rrsp_reg: 'REER (enregistré)',
      opt_tfsa_reg: 'CELI (enregistré)',
      opt_nonreg_margin: 'Non enregistré / Marge',
      opt_resp: 'REEE (études)',
      lbl_symbol: 'Symbole',
      lbl_shares_principal: 'Parts / Capital',
      lbl_note_opt: 'Note (facultatif)',
      ph_note: 'p. ex. Échéance CPG',
      btn_add_position: '+ Ajouter la position',
      import_csv_title: 'Importer un fichier CSV de courtage',
      btn_import_csv: 'Importer CSV',
      ph_csv_paste: 'Collez ici le CSV de positions (Compte,Symbole,Quantité)...',
      portfolio_positions_title: 'Positions du portefeuille (une entrée par détention)',
      portfolio_positions_sub: 'Cliquez sur un nombre de parts pour le modifier directement. Les FNB multidivisions sont saisis une seule fois ici.',
      btn_delete_portfolio: 'Supprimer le portefeuille « {name} »',
      opt_none: '— Aucune —',
      opt_all_mapped: 'Toutes associées ({count})',
      strat_editor_title: 'Stratégie de répartition cible ({name})',
      strat_editor_sub: 'Configurez la pondération des catégories d’actifs et des divisions régionales',
      lbl_mode: 'Mode :',
      strat_select_portfolio_msg: 'Sélectionnez un portefeuille pour afficher les cibles de stratégie.',
      strat_ph_new_div: 'Nom de la nouvelle division (ex. Canada, É.-U., Europe)...',
      strat_ph_new_cat: 'Nom de la nouvelle catégorie (ex. Actions, Revenu fixe)...',
      strat_add_division_btn: '+ Ajouter une division',
      strat_add_category_btn: '+ Ajouter une catégorie',
      strat_add_hier_div_btn: '+ Ajouter la division à la catégorie',
      strat_target_balanced: 'Cible équilibrée',
      strat_target_mismatch: 'Le total des cibles est de {sum} % (doit être 100 %)',
      opt_default_strategy: 'Stratégie par défaut',
      opt_existing_ports_group: 'Copier depuis un portefeuille existant',
      cfg_at_least_one_dir: 'Au moins un répertoire est requis',
      strat_mode_hier: 'Hiérarchique (% catégorie → % répartition par division)',
      strat_mode_flat: 'Directe (% direct par division)',
      strat_step1_cats: '1. Pondération des catégories (Total = 100 %)',
      strat_step2_divs: '2. Poids relatif des divisions au sein de chaque catégorie',
      strat_direct_divs: 'Pondération directe des divisions du portefeuille (Total = 100 %)',
      th_split_within_cat: 'Part dans la catégorie (%)',
      th_eff_portfolio_pct: '% effectif du portefeuille',
      th_portfolio_target_pct: 'Cible du portefeuille (%)',
      lbl_strat_notes: 'Notes et justification de la stratégie',
      strat_no_notes_placeholder: 'Aucune note ou justification de stratégie pour le moment. Cliquez sur Modifier pour ajouter des règles.',
      btn_edit: 'Modifier',
      btn_done: 'Terminé',
      ph_strat_notes: 'Ajoutez une thèse d’investissement, des règles de rééquilibrage ou des notes (une note par ligne)...',
      help_strat_notes: 'Enregistré directement dans le fichier YAML du portefeuille (une note par ligne).',
      btn_save_strategy: 'Enregistrer la stratégie et les divisions',
      strat_select_indiv_msg: 'Sélectionnez l’onglet d’un portefeuille individuel pour modifier et enregistrer sa stratégie.',
      groups_title: 'Groupes de portefeuilles',
      groups_sub: 'Regroupez plusieurs portefeuilles (p. ex. Retraite + Imposable, ou Tous les comptes) dans une vue unifiée',
      th_group_name: 'Nom du groupe',
      th_included_portfolios: 'Portefeuilles inclus',
      ph_new_group: 'Nom du nouveau groupe...',
      btn_add_group: '+ Ajouter le groupe',
      cats_divs_title: 'Catégories et divisions (config/divisions.yaml)',
      cats_divs_sub: 'Ajoutez de nouvelles catégories d’actifs (p. ex. Immobilier, Alternatifs) ou divisions régionales',
      btn_save_cats_divs: 'Enregistrer catégories et divisions',
      lbl_categories: 'Catégories',
      th_category_name: 'Nom de la catégorie',
      ph_new_category: 'Nouvelle catégorie (p. ex. Immobilier)',
      btn_add_category: '+ Ajouter une catégorie',
      lbl_divisions: 'Divisions',
      th_division_name: 'Nom de la division',
      th_linked_category: 'Catégorie associée',
      ph_new_division: 'Nouvelle division (p. ex. Or / FPI)',
      btn_add_division: '+ Ajouter une division',
      app_settings_title: 'Paramètres de l’application (config/config.yaml)',
      app_settings_sub: 'Configurez la langue, l’intervalle d’actualisation des cours et le thème d’affichage',
      cfg_paths_title: '📁 Répertoires et chemins des portefeuilles',
      cfg_paths_sub: 'Configurez les répertoires locaux où Embsay découvre et enregistre vos fichiers de portefeuille YAML',
      cfg_ph_new_path: 'Entrez un chemin de dossier (ex. portfolios, ou C:/Users/Documents/Portefeuilles)...',
      btn_add_path: '+ Ajouter un répertoire',
      th_directory_path: 'Chemin du répertoire / dossier',
      cfg_paths_hint: 'Configurez les répertoires locaux où Embsay découvre et enregistre vos fichiers de portefeuille YAML.',
      cfg_paths_hint_clean: 'Embsay recherche les fichiers de portefeuille dans ces répertoires. Vous pouvez configurer plusieurs dossiers sur votre ordinateur.',
      port_mgmt_title: 'Gestion des portefeuilles',
      port_mgmt_sub: 'Gérez les répertoires, créez et organisez vos portefeuilles et configurez des groupes unifiés',
      btn_create_new_port: '+ Créer un portefeuille',
      discovered_ports_title: 'Portefeuilles découverts',
      discovered_ports_sub: 'Fichiers de portefeuilles découverts dans vos répertoires de recherche configurés',
      th_port_name: 'Nom du portefeuille',
      th_port_id: 'Identifiant',
      th_file_location: 'Chemin',
      th_accounts_count: 'Comptes',
      th_holdings_count: 'Positions',
      th_actions: 'Actions',
      btn_open_portfolio: 'Afficher ↗',
      grp_editor_title: 'Groupes de portefeuilles enregistrés (vues unifiées)',
      grp_editor_sub: 'Combinez plusieurs portefeuilles dans une vue consolidée multi-comptes',
      lbl_group_name: 'Nom du groupe',
      btn_create_new_group: '+ Créer un nouveau groupe',
      opt_use_first_member: '(Utiliser le premier membre sélectionné)',
      msg_no_discovered_ports: 'Aucun portefeuille individuel découvert.',
      msg_no_groups: 'Aucun groupe de portefeuilles enregistré pour le moment. Créez-en un ci-dessous.',
      lbl_selected_count: '{count} sur {total} sélectionnés',
      lbl_portfolios_count: '{count} portefeuilles',
      btn_new_account: '+ Nouveau compte',
      btn_delete: 'Supprimer',
      title_delete_position: 'Supprimer la position {sym}',
      grp_search_placeholder: 'Filtrer les portefeuilles (ex. REER, CELI, Marge)...',
      grp_select_none: 'Tout désélectionner',
      grp_select_filtered: 'Sélectionner le résultat',
      grp_strategy_from: 'Modèle de stratégie cible :',
      btn_browse_folder: '📁 Parcourir...',
      lbl_save_directory: 'Répertoire d’enregistrement',
      opt_custom_dir: '📁 Autre répertoire (spécifier / parcourir)...',
      modal_new_port_sub_clean: 'Configurez le nom de votre portefeuille, le répertoire d’enregistrement et la stratégie initiale.',
      btn_save_app_settings: 'Enregistrer les paramètres et les chemins',
      lbl_language: 'Langue / Language',
      lbl_lookup_interval: 'Intervalle d’actualisation des cours',
      lbl_theme_mode: 'Mode d’affichage',
      opt_theme_system: '🖥 Suivre le système par défaut',
      opt_theme_dark: '🌙 Sombre',
      opt_theme_light: '☀️ Clair',
      lbl_lookup_on_load: 'Actualiser les cours à chaque chargement',
      lbl_drift_threshold: 'Seuil d’alerte d’écart (%)',
      add_security_title: 'Ajouter un nouveau FNB',
      add_security_sub: 'Entrez un symbole boursier de FNB et cliquez sur Rechercher (ou Entrée) pour remplir automatiquement les détails, puis ajoutez-le à symbols.yaml',
      btn_lookup: '🔍 Rechercher',
      btn_lookup_title: 'Rechercher le nom, la bourse, la devise et le cours à partir du symbole',
      lbl_fund_name: 'Nom du fonds FNB',
      ph_fund_name: 'Rempli automatiquement ou personnalisé',
      lbl_exchange: 'Bourse',
      lbl_yahoo_ticker: 'Symbole Yahoo',
      lbl_currency: 'Devise',
      lbl_price_dollar: 'Cours ($)',
      lbl_mer_pct: 'RFG (%)',
      lbl_default_div: 'Division par défaut',
      btn_add_security: '+ Ajouter le FNB',
      sec_catalog_title: 'Catalogue des FNB et métadonnées partagées',
      sec_catalog_sub: 'Définitions des FNB, RFG, structures fiscales et décompositions de divisions (config/symbols.yaml et config/cache.yaml)',
      fwt_title: 'Moteur fiscal : Retenues d’impôt étrangères (RIE)',
      fwt_sub: 'Règles fiscales transfrontalières, mécanique Niveau 1 et Niveau 2, exemptions du traité Canada-É.-U. et calculs par compte',
      fwt_rule1_title: '1. Niveau 1 : Impôt direct à la source',
      fwt_rule1_desc: 'Retenue prélevée directement par le pays d’origine (p. ex. l’IRS américain retient 15 % sur les dividendes américains; les pays européens et asiatiques retiennent ~8 à 12 %).',
      fwt_rule2_title: '2. Niveau 2 : Impôt sur fonds intermédiaire (Wrapper)',
      fwt_rule2_desc: 'Une seconde retenue américaine de 15 % s’applique lorsqu’un FNB canadien détient un FNB coté aux É.-U. (p. ex. XAW détenant ITOT/IEFA) avant de distribuer aux Canadiens.',
      fwt_rule3_title: '3. Traité fiscal Canada-É.-U. (REER seulement)',
      fwt_rule3_desc: 'Les FNB cotés aux É.-U. détenant directement des actions américaines (p. ex. VTI) détenus dans un REER/FERR sont exonérés à 100 % de la retenue américaine. Les FNB cotés au Canada (XUU, XEQT, VEQT) ne peuvent pas transférer cette exonération au REER.',
      fwt_rule4_title: '4. Crédit pour impôt étranger (CIE) en compte imposable',
      fwt_rule4_desc: 'Dans les comptes non enregistrés, l’impôt étranger déclaré sur les feuillets T3/T5 est généralement récupérable sous forme de crédit d’impôt à la ligne 40500 de la déclaration T1. Dans les CELI et REEE, la retenue est définitivement perdue.',
      fwt_rules_matrix_title: 'Matrice des structures fiscales (config/data_sources.yaml)',
      fwt_inspector_title: '🔍 Inspecteur fiscal par FNB',
      fwt_inspector_sub: 'Sélectionnez un FNB pour visualiser le détail du calcul de retenue fiscale et la traînée par type de compte',
      th_tax_structure: 'Structure fiscale',
      th_description: 'Description',
      th_level1_fwt: 'RIE Niveau 1',
      th_level2_fwt: 'RIE Niveau 2',
      th_rrsp_treaty: 'Statut Traité REER',
      th_tfsa_drag: 'Traînée CELI / REEE',
      th_taxable_drag: 'Imposable (net du CIE)',
      th_mapped_securities: 'Titres associés',
      btn_refresh_meta: '↻ Actualiser les ratios des FNB composés',
      btn_fetching_meta: '↻ Actualisation des ratios...',
      btn_refresh_etf_data: '↻ Actualiser les données FNB',
      btn_refreshing_etf_data: '↻ Téléchargement...',
      btn_reset_symbols: '🗑️ Réinitialiser tous les symboles',
      confirm_reset_symbols: 'Voulez-vous vraiment supprimer TOUS les symboles enregistrés, les prix en cache et les métadonnées FNB ?\n\nDes sauvegardes horodatées seront enregistrées automatiquement.',
      toast_symbols_reset: 'Tous les symboles et métadonnées FNB ont été supprimés',
      btn_save_cache: 'Enregistrer les modifications au cache',
      th_symbol: 'Symbole',
      th_name: 'Nom',
      th_curr: 'Dev.',
      th_rrsp_tax: 'Impôt REER (%)',
      th_tfsa_tax: 'Impôt CELI (%)',
      th_taxable_tax: 'Impôt imposable (%)',
      recipes_title: 'Recettes de sources de données configurées (config/data_sources.yaml)',
      recipes_price_fx: 'Sources de cours et de taux de change',
      recipes_composite: 'Analyseurs CSV des positions de FNB composés',
      th_recipe: 'Recette',
      th_status: 'Statut',
      th_json_path: 'Chemin JSON',
      th_underlying_map: 'Correspondance sous-jacente',
      pill_active: 'Actif',
      pill_standby: 'En attente',
      modal_new_port_title: 'Créer un nouveau portefeuille',
      modal_new_port_sub: 'Crée automatiquement un nouveau fichier <code>portfolios/&lt;nom&gt;.yaml</code>.',
      lbl_portfolio_name: 'Nom du portefeuille',
      ph_portfolio_name: 'p. ex. REEE Enfant 2, Société, CELI',
      lbl_copy_strat: 'Copier la stratégie initiale de',
      opt_copy_strat_from: 'Copier la stratégie de {name}',
      btn_cancel: 'Annuler',
      btn_create_portfolio: 'Créer le portefeuille',
      toast_lang_saved: 'Langue définie sur Français (Québec)',
      toast_theme_saved: 'Mode d’affichage enregistré dans config.yaml : {mode}',
      toast_settings_saved: 'Paramètres enregistrés dans config/config.yaml',
      btn_backup: 'Sauvegarder',
      btn_backup_portfolio_title: 'Enregistrer une copie de sauvegarde YAML horodatée de ce portefeuille',
      toast_backup_created: 'Sauvegarde enregistrée : {file}',
      btn_quit: 'Quitter',
      btn_quit_title: 'Quitter et fermer l’application Embsay',
      confirm_quit: 'Êtes-vous certain de vouloir quitter Embsay ?',
      app_stopped_title: 'Embsay s’est arrêté',
      app_stopped_desc: 'Le serveur local ne fonctionne plus. Vous pouvez fermer cet onglet en toute sécurité.',
      lbl_idle_timeout: 'Fermeture automatique si inactif (heures)'
    }
  };

  const TERM_TRANSLATIONS_FR_CA = {
    'Cash and Bonds': 'Encaisse et obligations',
    'Stocks': 'Actions',
    'Fixed Income': 'Revenu fixe',
    'Equities': 'Actions',
    'GICs/Bonds': 'CPG / Obligations',
    'America (US)': 'Amérique (É.-U.)',
    'Europe/Asia (EAFE)': 'Europe / Asie (EAEO)',
    'Emerging Markets': 'Marchés émergents',
    'Canada': 'Canada',
    'RRSP': 'REER',
    'TFSA': 'CELI',
    'RESP': 'REEE',
    'Non-Registered': 'Non enregistré',
    'Non-Registered / Margin': 'Non enregistré / Marge',
    'Margin': 'Marge',
    'RRSP + TFSA (Registered)': 'REER + CELI (enregistré)',
    'Unregistered (Taxable)': 'Non enregistré (imposable)',
    'All Family': 'Toute la famille',
    'Bonds': 'Obligations',
    'Canadian Equity': 'Actions canadiennes',
    'Global Equity (ex-Canada)': 'Actions mondiales (hors Canada)',
    'Active': 'Actif',
    'Family': 'Famille'
  };

  function t(key, vars = {}) {
    const dict = I18N[currentLang] || I18N['en-CA'];
    let str = dict[key] !== undefined ? dict[key] : (I18N['en-CA'][key] || key);
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    });
    return str;
  }

  function tTerm(raw) {
    if (!raw) return '';
    if (currentLang === 'fr-CA' && TERM_TRANSLATIONS_FR_CA[raw]) {
      return TERM_TRANSLATIONS_FR_CA[raw];
    }
    return raw;
  }

  function applyStaticI18n() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    const langSel = document.getElementById('langSelect');
    if (langSel) langSel.value = currentLang;
    const cfgLangEl = document.getElementById('cfgLanguage');
    if (cfgLangEl) cfgLangEl.value = currentLang;
    const cfgThemeEl = document.getElementById('cfgThemeMode');
    if (cfgThemeEl) cfgThemeEl.value = currentThemeMode;
  }

  async function changeLanguage(lang) {
    currentLang = (lang === 'fr-CA' || lang === 'fr') ? 'fr-CA' : 'en-CA';
    applyStaticI18n();
    applyThemeMode(currentThemeMode);
    renderAll();
    if (appState && appState.config) {
      appState.config.language = currentLang;
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState.config)
      });
      showToast(t('toast_lang_saved'));
    }
  }

  function parseDurationMs(str) {
    const s = String(str || '').trim().toLowerCase();
    if (!s || s === '0' || s === '0s' || s === 'off' || s === 'none') return 0;
    let totalMs = 0;
    const re = /([0-9.]+)\s*(h|m|s)/g;
    let match;
    while ((match = re.exec(s)) !== null) {
      const val = parseFloat(match[1]) || 0;
      if (match[2] === 'h') totalMs += val * 3600 * 1000;
      else if (match[2] === 'm') totalMs += val * 60 * 1000;
      else if (match[2] === 's') totalMs += val * 1000;
    }
    if (totalMs <= 0) {
      const mins = parseFloat(s);
      if (!isNaN(mins) && mins > 0) totalMs = mins * 60 * 1000;
    }
    return totalMs;
  }

  function schedulePriceRefreshTimer(intervalStr) {
    if (priceRefreshTimer) {
      clearInterval(priceRefreshTimer);
      priceRefreshTimer = null;
    }
    const ms = parseDurationMs(intervalStr);
    if (ms >= 5000) {
      priceRefreshTimer = setInterval(() => refreshPrices(true), ms);
    }
  }

  function getLastPortfolio() {
    try {
      return localStorage.getItem('embsay_last_portfolio') || '';
    } catch (e) {
      return '';
    }
  }

  function setLastPortfolio(id) {
    if (!id) return;
    try {
      localStorage.setItem('embsay_last_portfolio', id);
    } catch (e) {}
  }

  async function init() {
    notifyUserActivity();
    let initialTheme = 'system';
    try {
      initialTheme = localStorage.getItem('embsay_theme') || 'system';
    } catch (e) {}
    applyThemeMode(initialTheme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentThemeMode === 'system') applyThemeMode('system');
    });

    const route = routeFromLocation();
    if (route.view && route.view !== 'root') currentMainView = route.view;
    if (route.portfolioId) selectedPortfolio = route.portfolioId;
    const searchParams = new URLSearchParams(window.location.search);
    const initialSubtab = searchParams.get('tab') || (window.location.hash ? window.location.hash.replace('#', '') : '');
    if (['account', 'division', 'classification', 'strategy'].includes(initialSubtab)) {
      currentPortfolioSubTab = initialSubtab;
    }
    if (searchParams.get('rebalance') === '1' || searchParams.get('rebalance') === 'true') {
      rebalanceMode = true;
    }

    try {
      const stRes = await fetch('/api/state');
      appState = await stRes.json();
      const cfg = (appState && appState.config) ? appState.config : { language: 'en-CA', theme_mode: initialTheme, lookup_interval: '1h', lookup_on_load: true };
      currentLang = (cfg.language === 'fr-CA' || cfg.language === 'fr') ? 'fr-CA' : 'en-CA';
      applyStaticI18n();
      if (cfg.theme_mode) {
        applyThemeMode(cfg.theme_mode);
      }
    } catch (e) {
      console.warn('Unable to pre-load app state config:', e);
    }

    if (route.view === 'root') {
      const last = getLastPortfolio();
      const valid = last && (appState.portfolios || []).some(p => p.id === last || last.includes(','));
      if (valid) {
        currentMainView = 'portfolio';
        selectedPortfolio = last;
      } else {
        currentMainView = 'port-mgmt';
        selectedPortfolio = '';
      }
    }

    if (currentMainView === 'portfolio') {
      await loadStateAndEvaluate();
    } else {
      if (!selectedPortfolio && appState && appState.portfolios && appState.portfolios.length > 0) {
        const last = getLastPortfolio();
        const valid = last && (appState.portfolios || []).some(p => p.id === last || last.includes(','));
        selectedPortfolio = valid ? last : '';
      }
    }

    applyRouteFromLocation(false);

    const cfg = (appState && appState.config) ? appState.config : {};
    if (cfg.lookup_on_load !== false) {
      refreshPrices(true);
    }
    schedulePriceRefreshTimer(cfg.lookup_interval || '1h');
    document.addEventListener('click', (e) => {
      const pop = document.getElementById('combinePopover');
      if (pop && !pop.classList.contains('hidden') && !e.target.closest('.popover-wrap')) {
        pop.classList.add('hidden');
      }
    });

    window.addEventListener('popstate', async () => {
      const r = routeFromLocation();
      const prevPortfolio = selectedPortfolio;
      if (r.view && r.view !== 'root') currentMainView = r.view;
      if (r.portfolioId) selectedPortfolio = r.portfolioId;
      if (r.view === 'root') {
        const last = getLastPortfolio();
        const valid = last && appState && (appState.portfolios || []).some(p => p.id === last || last.includes(','));
        if (valid) {
          currentMainView = 'portfolio';
          selectedPortfolio = last;
        } else {
          currentMainView = 'port-mgmt';
          selectedPortfolio = '';
        }
      }
      switchMainView(currentMainView, false);
      if (currentMainView === 'portfolio' && (!currentEval || selectedPortfolio !== prevPortfolio)) {
        await loadStateAndEvaluate();
      }
    });
  }

  async function loadStateAndEvaluate(isBackground = false) {
    const headers = isBackground ? { 'X-Background': 'true' } : {};
    const stRes = await fetch('/api/state', { headers });
    appState = await stRes.json();
    if (!selectedPortfolio || !(appState.portfolios || []).some(p => p.id === selectedPortfolio || selectedPortfolio.includes(','))) {
      const last = getLastPortfolio();
      if (last && (appState.portfolios || []).some(p => p.id === last || last.includes(','))) {
        selectedPortfolio = last;
      } else {
        openPortfolioSelection(false);
        return;
      }
    }
    setLastPortfolio(selectedPortfolio);
    const [evRes, pRes] = await Promise.all([
      fetch(`/api/evaluate?portfolio=${encodeURIComponent(selectedPortfolio)}&filter=${encodeURIComponent(selectedFilter)}`, { headers }),
      fetch(`/api/portfolio?id=${encodeURIComponent(selectedPortfolio)}`, { headers })
    ]);
    currentEval = await evRes.json();
    currentPortfolioConfig = await pRes.json();
    const syms = (appState && appState.symbols && appState.symbols.symbols) || {};
    const prices = (appState && appState.cache && appState.cache.prices) || {};
    const missingInUI = (currentPortfolioConfig.holdings || []).some(h => {
      return h.symbol && (!syms[h.symbol] || (!syms[h.symbol].fixed_price && (!prices[h.symbol] || !prices[h.symbol].price)));
    });
    if (missingInUI) {
      const stRes = await fetch('/api/state', { headers });
      if (stRes.ok) {
        appState = await stRes.json();
      }
    }
    renderAll();
  }

  function renderAll() {
    renderTopBar();
    renderAccountFilter();
    renderOverviewTab();
    renderStrategyAndDivisionsTab();
    renderSecuritiesTab();
    if (typeof renderPortMgmtTab === 'function') {
      renderPortMgmtTab();
    }
    if (typeof renderConfigTab === 'function') {
      renderConfigTab();
    }
  }

  function isGroupSelection(id) {
    if (id.includes(',')) return true;
    const meta = (appState.portfolios || []).find(p => p.id === id);
    return !!(meta && meta.is_group);
  }

  function routeFromLocation() {
    let path = decodeURIComponent(window.location.pathname || '/');
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    if (path === '' || path === '/') {
      return { view: 'root', portfolioId: '' };
    }
    if (path === '/portfolios') {
      return { view: 'port-mgmt', portfolioId: '' };
    }
    if (path === '/securities') {
      return { view: 'securities', portfolioId: '' };
    }
    if (path === '/config' || path === '/settings') {
      return { view: 'config', portfolioId: '' };
    }
    if (path === '/p') {
      return { view: 'root', portfolioId: '' };
    }
    if (path.startsWith('/p/')) {
      const id = path.slice(3).trim();
      return { view: 'portfolio', portfolioId: id };
    }
    return { view: null, portfolioId: null };
  }

  function getUrlForRoute(view, portId) {
    if (view === 'portfolio') {
      return portId ? `/p/${encodeURIComponent(portId)}` : '/p';
    }
    if (view === 'port-mgmt') return '/portfolios';
    if (view === 'securities') return '/securities';
    if (view === 'config') return '/config';
    return '/';
  }

  function applyRouteFromLocation(pushHistory = false) {
    const route = routeFromLocation();
    if (route.view && route.view !== 'root') currentMainView = route.view;
    if (route.portfolioId) selectedPortfolio = route.portfolioId;
    const searchParams = new URLSearchParams(window.location.search);
    const initialSubtab = searchParams.get('tab') || (window.location.hash ? window.location.hash.replace('#', '') : '');
    if (['account', 'division', 'classification', 'strategy'].includes(initialSubtab)) {
      currentPortfolioSubTab = initialSubtab;
    }
    if (searchParams.get('rebalance') === '1' || searchParams.get('rebalance') === 'true') {
      rebalanceMode = true;
    }
    if (route.view === 'root') {
      const last = getLastPortfolio();
      const valid = last && appState && (appState.portfolios || []).some(p => p.id === last || last.includes(','));
      if (valid) {
        currentMainView = 'portfolio';
        selectedPortfolio = last;
      } else {
        currentMainView = 'port-mgmt';
        selectedPortfolio = '';
      }
    }
    const targetUrl = getUrlForRoute(currentMainView, selectedPortfolio);
    if (pushHistory) {
      history.pushState(null, '', targetUrl);
    } else {
      history.replaceState(null, '', targetUrl);
    }
    switchMainView(currentMainView, false);
  }

  function openPortfolioSelection(pushHistory = true) {
    switchMainView('port-mgmt', pushHistory);
  }

  async function goPortfolioView(id, pushHistory = true) {
    let targetID = (id || selectedPortfolio || getLastPortfolio() || '').trim();
    if (targetID && appState && appState.portfolios && !(appState.portfolios || []).some(p => p.id === targetID || targetID.includes(','))) {
      targetID = '';
    }
    if (!targetID) {
      openPortfolioSelection(pushHistory);
      return;
    }
    selectedPortfolio = targetID;
    setLastPortfolio(targetID);
    selectedFilter = 'all';
    switchMainView('portfolio', pushHistory);
    switchPortfolioSubTab(currentPortfolioSubTab || 'account');
    await loadStateAndEvaluate();
  }

  async function selectPortfolio(id, pushHistory = true) {
    selectedPortfolio = id;
    setLastPortfolio(id);
    selectedFilter = 'all';
    if (currentMainView !== 'portfolio') {
      switchMainView('portfolio', pushHistory);
    } else if (pushHistory) {
      history.pushState(null, '', `/p/${encodeURIComponent(id)}`);
    }
    await loadStateAndEvaluate();
  }

  function renderTopBar() {
    // Active portfolio title in top context bar
    const titleEl = document.getElementById('activePortfolioName');
    if (titleEl && currentEval) {
      const isGrp = isGroupSelection(selectedPortfolio);
      titleEl.innerHTML = isGrp
        ? `<span style="color:var(--primary);margin-right:2px;">⊞</span> ${esc(tTerm(currentEval.portfolio_name))}`
        : esc(currentEval.portfolio_name);
    }

    // Rebalance switch state (ONLY shown and works on By Division page)
    const isDivisionTab = (currentMainView === 'portfolio' || !currentMainView) && currentPortfolioSubTab === 'division';
    const rebalToggle = document.getElementById('rebalanceToggle');
    if (rebalToggle) {
      rebalToggle.style.display = isDivisionTab ? 'inline-flex' : 'none';
      rebalToggle.classList.toggle('active', !!rebalanceMode);
    }
    const afterTaxToggle = document.getElementById('afterTaxToggle');
    const afterTaxActive = !!(currentEval && currentEval.allocation_basis === 'after_tax');
    if (afterTaxToggle) {
      afterTaxToggle.classList.toggle('active', afterTaxActive);
      const isGroup = isGroupSelection(selectedPortfolio);
      afterTaxToggle.classList.toggle('after-tax-toggle-disabled', isGroup);
      afterTaxToggle.title = isGroup
        ? t('after_tax_toggle_group_help')
        : (afterTaxActive ? t('after_tax_toggle_on_help') : t('after_tax_toggle_off_help'));
    }
    const rebalBanner = document.getElementById('rebalanceBanner');
    if (rebalBanner) {
      rebalBanner.classList.toggle('hidden', !(isDivisionTab && rebalanceMode));
    }
    const cashInput = document.getElementById('rebalCashInput');
    if (cashInput && currentEval) cashInput.value = currentEval.amount_to_buy_cad;

    const warnWrap = document.getElementById('rebalanceWarnings');
    if (warnWrap) {
      const warnings = (currentEval && currentEval.rebalance_warnings) || [];
      warnWrap.innerHTML = warnings.map(w =>
        `<div style="width:100%;font-size:12px;line-height:1.5;color:var(--amber);">⚠️ ${esc(t('rebal_warning_title'))}: ${esc(w)}</div>`
      ).join('');
    }
    const dataBanner = document.getElementById('dataWarningsBanner');
    const dataText = document.getElementById('dataWarningsText');
    if (dataBanner && dataText) {
      const dWarnings = (currentEval && currentEval.data_warnings) || [];
      const showBanner = currentMainView === 'portfolio' && dWarnings.length > 0;
      dataBanner.classList.toggle('hidden', !showBanner);
      if (showBanner) {
        dataText.innerHTML = dWarnings.map(w => `<div>⚠️ ${esc(w)}</div>`).join('');
      } else {
        dataText.innerHTML = '';
      }
    }
    const cashLabel = document.getElementById('rebalCashLabel');
    if (cashLabel) {
      cashLabel.textContent = afterTaxActive ? t('rebal_cash_gross_label') : t('rebal_cash_label');
    }

    // Combine popover contents (if present)
    if (document.getElementById('combinePopover')) {
      renderCombinePopover();
    }
  }

  async function persistAfterTaxPortfolio(updates) {
    const p = currentPortfolioConfig;
    if (!p) return false;
    const isGrp = isGroupSelection(selectedPortfolio);
    if (isGrp) {
      showToast(t('after_tax_toggle_group_help'));
      return false;
    }
    const payload = {
      ...p,
      after_tax_allocation: updates.afterTax,
      rrsp_withdrawal_tax_rate: updates.rate != null ? updates.rate : p.rrsp_withdrawal_tax_rate
    };
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      showToast(err && err.error ? err.error : 'Could not save after-tax setting');
      return false;
    }
    const pRes = await fetch(`/api/portfolio?id=${encodeURIComponent(selectedPortfolio)}`);
    if (pRes.ok) currentPortfolioConfig = await pRes.json();
    return true;
  }

  async function toggleAfterTaxMode() {
    const enable = !(currentEval && currentEval.allocation_basis === 'after_tax');
    const p = currentPortfolioConfig;
    if (!p) return;
    if (isGroupSelection(selectedPortfolio)) {
      showToast(t('after_tax_toggle_group_help'));
      return;
    }
    let rate = p.rrsp_withdrawal_tax_rate;
    if (enable && !(typeof rate === 'number' && Number.isFinite(rate))) {
      // Default to 30% if rate is not yet specified
      rate = 0.30;
      p.rrsp_withdrawal_tax_rate = rate;
    }
    const ok = await persistAfterTaxPortfolio({ afterTax: enable, rate });
    if (!ok) return;
    await loadStateAndEvaluate();
    showToast(t(enable ? 'after_tax_save_success_on' : 'after_tax_save_success_off'));
  }
  window.toggleAfterTaxMode = toggleAfterTaxMode;

  async function saveAfterTaxRate(rawPct) {
    const p = currentPortfolioConfig;
    if (!p || isGroupSelection(selectedPortfolio)) return false;
    const pct = parseFloat(String(rawPct).replace(/,/g, ''));
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100) {
      showToast('Enter an RRSP/RRIF withdrawal tax rate between 0% and 99.9%.');
      return false;
    }
    const rate = pct / 100.0;
    const ok = await persistAfterTaxPortfolio({ afterTax: !!p.after_tax_allocation, rate });
    if (!ok) return false;
    if (p.rrsp_withdrawal_tax_rate !== rate) p.rrsp_withdrawal_tax_rate = rate;
    await loadStateAndEvaluate();
    showToast(t('after_tax_rate_saved'));
    return true;
  }

  function renderCombinePopover() {
    const pop = document.getElementById('combinePopover');
    if (!pop) return;
    const singlePorts = (appState.portfolios || []).filter(p => !p.is_group);
    const activeMembers = new Set(
      selectedPortfolio.includes(',')
        ? selectedPortfolio.split(',')
        : ((appState.portfolios.find(p => p.id === selectedPortfolio)?.members) || [selectedPortfolio])
    );

    pop.innerHTML = `
      <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${esc(t('combine_title'))}</div>
      <div class="text-muted" style="font-size:12px;margin-bottom:10px;">${esc(t('combine_desc'))}</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">
        ${singlePorts.map(p => `
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:500;">
            <input type="checkbox" class="combine-chk" value="${esc(p.id)}" ${activeMembers.has(p.id) ? 'checked' : ''} />
            <span>${esc(p.name)}</span>
          </label>
        `).join('')}
      </div>
      <div style="display:flex;gap:6px;justify-content:space-between;border-top:1px solid var(--border);padding-top:10px;">
        <button class="btn btn-primary" style="flex:1;" onclick="applyAdHocCombine()">${esc(t('btn_view_combined'))}</button>
        <button class="btn" onclick="saveCurrentCombineAsGroup()">${esc(t('btn_save_as_group'))}</button>
      </div>
    `;
  }

  function toggleCombinePopover() {
    const pop = document.getElementById('combinePopover');
    if (pop) pop.classList.toggle('hidden');
  }

  async function applyAdHocCombine() {
    const checked = Array.from(document.querySelectorAll('.combine-chk:checked')).map(el => el.value);
    if (checked.length === 0) return;
    const pop = document.getElementById('combinePopover');
    if (pop) pop.classList.add('hidden');
    if (checked.length === 1) {
      await selectPortfolio(checked[0]);
    } else {
      await selectPortfolio(checked.join(','));
    }
  }

  async function saveCurrentCombineAsGroup() {
    const checked = Array.from(document.querySelectorAll('.combine-chk:checked')).map(el => el.value);
    if (checked.length < 2) {
      alert('Select at least 2 portfolios to save as a group.');
      return;
    }
    const name = prompt('Enter a display name for this group (e.g. "Retirement Household"):', 'Custom Group');
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!appState.divisions.portfolio_groups) appState.divisions.portfolio_groups = [];
    appState.divisions.portfolio_groups = appState.divisions.portfolio_groups.filter(g => g.id !== id);
    appState.divisions.portfolio_groups.push({
      id: id,
      name: name.trim(),
      members: checked,
      strategy_from_id: checked[0]
    });
    await fetch('/api/divisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appState.divisions)
    });
    const pop = document.getElementById('combinePopover');
    if (pop) pop.classList.add('hidden');
    selectedPortfolio = id;
    await loadStateAndEvaluate();
    showToast(`Saved group "${name}"`);
  }

  function renderAccountFilter() {
    const sel = document.getElementById('accountFilter');
    if (!sel) return;
    const baseOpts = [
      { value: 'all', label: t('filter_all') },
      { value: 'registered', label: t('filter_registered') },
      { value: 'unregistered', label: t('filter_unregistered') },
      { value: 'type:rrsp', label: t('filter_rrsp') },
      { value: 'type:tfsa', label: t('filter_tfsa') }
    ];
    const accNames = new Set();
    if (currentPortfolioConfig && currentPortfolioConfig.holdings) {
      currentPortfolioConfig.holdings.forEach(h => accNames.add(h.account));
    }
    let html = baseOpts.map(o => `<option value="${o.value}" ${o.value === selectedFilter ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
    if (accNames.size > 0) {
      html += `<optgroup label="${esc(t('filter_specific_group'))}">`;
      accNames.forEach(acc => {
        const val = `account:${acc}`;
        html += `<option value="${esc(val)}" ${val === selectedFilter ? 'selected' : ''}>${esc(acc)}</option>`;
      });
      html += `</optgroup>`;
    }
    sel.innerHTML = html;
  }

  // --- TAB 1: ALLOCATION OVERVIEW ---

  function applyThemeMode(mode) {
    const m = (mode || 'system').toLowerCase();
    currentThemeMode = (m === 'dark' || m === 'light' || m === 'system') ? m : 'system';
    try {
      localStorage.setItem('embsay_theme', currentThemeMode);
    } catch (e) {}
    let effective = currentThemeMode;
    if (currentThemeMode === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', effective);
    const btn = document.getElementById('themeBtn');
    if (btn) {
      if (currentThemeMode === 'system') {
        btn.textContent = t('theme_system', { mode: effective === 'dark' ? t('mode_dark_short') : t('mode_light_short') });
      } else if (currentThemeMode === 'dark') {
        btn.textContent = t('theme_dark');
      } else {
        btn.textContent = t('theme_light');
      }
    }
    const cfgThemeEl = document.getElementById('cfgThemeMode');
    if (cfgThemeEl) cfgThemeEl.value = currentThemeMode;
  }

  async function toggleTheme() {
    const order = ['system', 'dark', 'light'];
    const idx = order.indexOf(currentThemeMode);
    const next = order[(idx + 1) % order.length];
    applyThemeMode(next);
    if (appState && appState.config) {
      appState.config.theme_mode = next;
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState.config)
      });
      showToast(t('toast_theme_saved', { mode: next }));
    }
  }

  function switchMainView(view, pushHistory = false) {
    currentMainView = view;
    if (pushHistory) {
      const targetUrl = getUrlForRoute(view, selectedPortfolio);
      history.pushState(null, '', targetUrl);
    }
    document.querySelectorAll('.main-view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    const contextBar = document.getElementById('portfolioContextBar');
    if (contextBar) {
      contextBar.style.display = view === 'portfolio' ? 'block' : 'none';
    }

    const rebalBanner = document.getElementById('rebalanceBanner');
    if (rebalBanner) {
      if (view !== 'portfolio') {
        rebalBanner.classList.add('hidden');
      } else if (rebalanceMode) {
        rebalBanner.classList.remove('hidden');
      }
    }

    const dataBanner = document.getElementById('dataWarningsBanner');
    if (dataBanner) {
      const hasDataWarnings = currentEval && currentEval.data_warnings && currentEval.data_warnings.length > 0;
      dataBanner.classList.toggle('hidden', !(view === 'portfolio' && hasDataWarnings));
    }

    if (view === 'portfolio') {
      switchPortfolioSubTab(currentPortfolioSubTab || 'account');
    } else if (view === 'port-mgmt') {
      showOnlyTabPane('tab-port-mgmt');
      renderTopBar();
      if (typeof renderPortMgmtTab === 'function') renderPortMgmtTab();
    } else if (view === 'securities') {
      showOnlyTabPane('tab-securities');
      renderTopBar();
      renderSecuritiesTab();
    } else if (view === 'config') {
      showOnlyTabPane('tab-config');
      renderTopBar();
      renderConfigTab();
    }
  }

  function switchPortfolioSubTab(subtab) {
    if (subtab === 'overview') subtab = 'account';
    subtab = subtab || currentPortfolioSubTab || 'account';
    currentPortfolioSubTab = subtab;
    activeTab = subtab;
    document.querySelectorAll('.port-subtab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subtab === subtab);
    });
    document.querySelectorAll('.portfolio-switcher button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subtab === subtab);
    });
    showOnlyTabPane(`tab-${subtab}`);
    renderTopBar();
    if (subtab === 'strategy') {
      renderStrategyTab();
    } else if (subtab === 'classification') {
      if (typeof renderClassificationView === 'function') renderClassificationView();
    } else if (subtab === 'division') {
      if (typeof renderDivisionView === 'function') renderDivisionView();
    } else {
      if (typeof renderAccountView === 'function') renderAccountView();
    }
  }

  function showOnlyTabPane(id) {
    if (id === 'tab-overview') id = 'tab-division';
    document.querySelectorAll('.tab-pane').forEach(el => {
      el.classList.toggle('hidden', el.id !== id);
    });
  }

  function switchTab(tab) {
    if (tab === 'overview' || tab === 'division' || tab === 'classification' || tab === 'account' || tab === 'strategy') {
      switchMainView('portfolio');
      switchPortfolioSubTab(tab);
    } else if (tab === 'port-mgmt' || tab === 'portfolios') {
      switchMainView('port-mgmt');
    } else if (tab === 'securities') {
      switchMainView('securities');
    } else if (tab === 'config' || tab === 'settings') {
      switchMainView('config');
    }
  }

  async function onFilterChange() {
    const sel = document.getElementById('accountFilter');
    selectedFilter = sel ? sel.value : 'all';
    const res = await fetch(`/api/evaluate?portfolio=${encodeURIComponent(selectedPortfolio)}&filter=${encodeURIComponent(selectedFilter)}`);
    currentEval = await res.json();
    renderTopBar();
    renderOverviewTab();
  }

  async function updateUSDCADRate(val) {
    const rate = parseFloat(String(val).replace(/,/g, ''));
    if (!rate || rate <= 0) return;
    appState.cache.fx_rates['USD_CAD'] = {
      rate: rate,
      source: 'manual',
      updated_at: new Date().toISOString().slice(0, 10)
    };
    await fetch('/api/cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appState.cache)
    });
    await loadStateAndEvaluate();
    showToast(`USD/CAD set to ${rate.toFixed(4)}`);
  }

  async function backupPortfolio(id) {
    const targetID = id || selectedPortfolio;
    if (!targetID) {
      showToast('No portfolio selected for backup');
      return;
    }
    const btn = document.getElementById('btnBackupPortfolio');
    if (btn) btn.disabled = true;
    try {
      const res = await fetch(`/api/portfolio/backup?id=${encodeURIComponent(targetID)}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create backup');
        return;
      }
      showToast(data.message || t('toast_backup_created', { file: (data.filenames || []).join(', ') }));
    } catch (e) {
      console.error('Backup error:', e);
      showToast('Error saving backup file');
    } finally {
      if (btn) btn.disabled = false;
    }
  }
  window.backupPortfolio = backupPortfolio;

  function backupCurrentPortfolio() {
    backupPortfolio(selectedPortfolio);
  }
  window.backupCurrentPortfolio = backupCurrentPortfolio;

  async function refreshPrices(silent = false) {
    const btn = document.getElementById('btnRefreshPrices');
    if (btn && !silent) {
      btn.textContent = t('btn_updating_prices');
      btn.disabled = true;
    }
    try {
      const url = silent ? '/api/refresh/prices?silent=true' : '/api/refresh/prices';
      const headers = silent ? { 'X-Background': 'true' } : {};
      const res = await fetch(url, { method: 'POST', headers });
      const report = await res.json();
      await loadStateAndEvaluate(silent);
      const count = Object.keys(report.updated_prices || {}).length;
      if (!silent || count > 0) {
        showToast(`Refreshed ${count} security prices & FX`);
      }
    } catch (e) {
      if (!silent) showToast('Failed to refresh prices');
    } finally {
      if (btn && !silent) {
        btn.textContent = t('btn_refresh_prices');
        btn.disabled = false;
      }
    }
  }

  async function refreshMetadata() {
    const btn = document.getElementById('btnRefreshMeta');
    btn.textContent = t('btn_fetching_meta');
    btn.disabled = true;
    try {
      const res = await fetch('/api/refresh/metadata', { method: 'POST' });
      const report = await res.json();
      await loadStateAndEvaluate();
      if (typeof renderSecuritiesTab === 'function') {
        renderSecuritiesTab();
      }
      const count = Object.keys(report.updated_metadata || {}).length;
      showToast(`Updated division ratios for ${count} composite ETF(s)`);
    } finally {
      btn.textContent = t('btn_refresh_meta');
      btn.disabled = false;
    }
  }

  async function refreshCurrentPortfolioData() {
    const btn = document.getElementById('btnRefreshPortData');
    if (btn) {
      btn.textContent = t('btn_refreshing_etf_data');
      btn.disabled = true;
    }
    try {
      const url = selectedPortfolio
        ? `/api/refresh/portfolio?id=${encodeURIComponent(selectedPortfolio)}`
        : '/api/refresh/portfolio';
      const res = await fetch(url, { method: 'POST' });
      const report = await res.json();
      await loadStateAndEvaluate();
      const priceCount = Object.keys(report.updated_prices || {}).length;
      const metaCount = Object.keys(report.updated_metadata || {}).length;
      if (priceCount > 0 || metaCount > 0) {
        showToast(`Downloaded data for ${priceCount} ticker(s) and ${metaCount} composite ETF ratio(s)`);
      } else if (report.warnings && report.warnings.length > 0) {
        showToast(report.warnings[0]);
      }
    } catch (e) {
      showToast('Failed to download missing ETF data');
    } finally {
      if (btn) {
        btn.textContent = t('btn_refresh_etf_data');
        btn.disabled = false;
      }
    }
  }
  window.refreshCurrentPortfolioData = refreshCurrentPortfolioData;

  async function resetAllSymbols() {
    if (!confirm(t('confirm_reset_symbols'))) {
      return;
    }
    const btn = document.getElementById('btnResetSymbols');
    if (btn) btn.disabled = true;
    try {
      const res = await fetch('/api/symbols/reset', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to reset symbols');
        return;
      }
      appState = await res.json();
      await loadStateAndEvaluate();
      if (typeof renderSecuritiesTab === 'function') {
        renderSecuritiesTab();
      }
      showToast(t('toast_symbols_reset'));
    } catch (e) {
      showToast('Failed to reset symbols');
    } finally {
      if (btn) btn.disabled = false;
    }
  }
  window.resetAllSymbols = resetAllSymbols;

  // --- Portfolio Creation & Deletion ---

  function openNewPortfolioModal() {
    const singlePorts = (appState.portfolios || []).filter(p => !p.is_group);
    const defaultOpt = `<option value="" selected>${esc(t('opt_default_strategy'))}</option>`;
    const portsHtml = singlePorts.length > 0 ? `
      <optgroup label="${esc(t('opt_existing_ports_group'))}">
        ${singlePorts.map(p => `<option value="${esc(p.id)}">${esc(t('opt_copy_strat_from', { name: p.name }))}</option>`).join('')}
      </optgroup>
    ` : '';
    document.getElementById('modalCopyStratFrom').innerHTML = defaultOpt + portsHtml;
    document.getElementById('modalNewPortName').value = '';

    // Populate directory select with search paths
    const paths = (appState && appState.config && appState.config.portfolio_paths && appState.config.portfolio_paths.length > 0)
      ? appState.config.portfolio_paths
      : ['portfolios', 'examples'];
    const dirSelect = document.getElementById('modalSaveDirSelect');
    if (dirSelect) {
      dirSelect.innerHTML = `
        ${paths.map(p => `<option value="${esc(p)}">📁 ${esc(p)}</option>`).join('')}
        <option value="__custom__">${esc(t('opt_custom_dir'))}</option>
      `;
      dirSelect.value = paths[0] || 'portfolios';
    }
    const customInp = document.getElementById('modalCustomDirInput');
    if (customInp) {
      customInp.value = '';
      customInp.classList.add('hidden');
    }
    const browseBtn = document.getElementById('modalBrowseBtn');
    if (browseBtn) browseBtn.classList.add('hidden');

    document.getElementById('newPortfolioModal').classList.remove('hidden');
  }

  function handleModalDirChange() {
    const dirSelect = document.getElementById('modalSaveDirSelect');
    const isCustom = dirSelect && dirSelect.value === '__custom__';
    const customInp = document.getElementById('modalCustomDirInput');
    const browseBtn = document.getElementById('modalBrowseBtn');
    if (customInp) customInp.classList.toggle('hidden', !isCustom);
    if (browseBtn) browseBtn.classList.toggle('hidden', !isCustom);
    if (isCustom && customInp) customInp.focus();
  }

  async function browseFolderForModal() {
    try {
      const res = await fetch('/api/browse-directory', { method: 'POST' });
      const data = await res.json();
      if (data.path) {
        const customInp = document.getElementById('modalCustomDirInput');
        if (customInp) customInp.value = data.path;
      }
    } catch (e) {
      console.warn('Folder browsing unavailable:', e);
    }
  }

  function closeNewPortfolioModal() {
    document.getElementById('newPortfolioModal').classList.add('hidden');
  }

  async function createNewPortfolio() {
    const name = document.getElementById('modalNewPortName').value.trim();
    const copyFrom = document.getElementById('modalCopyStratFrom').value;
    const dirSelect = document.getElementById('modalSaveDirSelect');
    let targetDir = dirSelect ? dirSelect.value : '';
    if (targetDir === '__custom__') {
      targetDir = (document.getElementById('modalCustomDirInput')?.value || '').trim();
    }
    if (!name) {
      alert('Please enter a portfolio name.');
      return;
    }
    const res = await fetch('/api/portfolio/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, copy_from_id: copyFrom, target_dir: targetDir })
    });
    const created = await res.json();
    if (created.error) {
      alert(created.error);
      return;
    }
    closeNewPortfolioModal();
    selectedPortfolio = created.id;
    await loadStateAndEvaluate();
    if (currentMainView === 'port-mgmt' && typeof renderPortMgmtTab === 'function') {
      renderPortMgmtTab();
    }
    showToast(`Created portfolio "${created.name}"`);
  }

  async function deleteCurrentPortfolio() {
    if (!confirm(`Delete portfolio "${currentEval.portfolio_name}" (portfolios/${selectedPortfolio}.yaml)?`)) return;
    await fetch(`/api/portfolio?id=${encodeURIComponent(selectedPortfolio)}`, { method: 'DELETE' });
    const stRes = await fetch('/api/state');
    appState = await stRes.json();
    const first = (appState.portfolios || []).find(p => !p.is_group);
    selectedPortfolio = first ? first.id : '';
    await loadStateAndEvaluate();
    showToast('Deleted portfolio');
  }

  // --- Positions & CSV ---

  function initSortableTables() {
    document.querySelectorAll('table[data-sort-table]').forEach(table => {
      const tableKey = table.dataset.sortTable;
      const headers = table.querySelectorAll('thead tr th');
      headers.forEach((th, colIdx) => {
        if (th.hasAttribute('data-nosort')) return;
        th.classList.add('sortable');
        if (!th.querySelector('.sort-icon')) {
          const icon = document.createElement('span');
          icon.className = 'sort-icon';
          icon.textContent = '↕';
          th.appendChild(icon);
        }
        th.onclick = () => {
          const prev = tableSortState[tableKey];
          let dir = 'desc';
          if (prev && prev.colIdx === colIdx) {
            dir = prev.dir === 'desc' ? 'asc' : 'desc';
          } else {
            dir = th.classList.contains('left') ? 'asc' : 'desc';
          }
          tableSortState[tableKey] = { colIdx, dir };
          applyTableSort(table, colIdx, dir);
        };
      });

      const saved = tableSortState[tableKey];
      if (saved && saved.colIdx < headers.length) {
        applyTableSort(table, saved.colIdx, saved.dir);
      }
    });
  }

  function applyTableSort(table, colIdx, dir) {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (rows.length <= 1) return;

    const headers = table.querySelectorAll('thead tr th');
    headers.forEach((th, idx) => {
      th.classList.remove('sort-asc', 'sort-desc');
      const icon = th.querySelector('.sort-icon');
      if (icon) {
        if (idx === colIdx) {
          th.classList.add(dir === 'asc' ? 'sort-asc' : 'sort-desc');
          icon.textContent = dir === 'asc' ? '↑' : '↓';
        } else {
          icon.textContent = '↕';
        }
      }
    });

    const mult = dir === 'asc' ? 1 : -1;
    rows.sort((rA, rB) => {
      const cellA = rA.children[colIdx];
      const cellB = rB.children[colIdx];
      const valA = extractCellSortValue(cellA);
      const valB = extractCellSortValue(cellB);
      if (valA.isNum && valB.isNum) {
        return (valA.num - valB.num) * mult;
      }
      return valA.str.localeCompare(valB.str, undefined, { numeric: true, sensitivity: 'base' }) * mult;
    });

    rows.forEach(r => tbody.appendChild(r));
  }

  function extractCellSortValue(td) {
    if (!td) return { isNum: false, num: 0, str: '' };
    if (td.dataset && td.dataset.sort !== undefined) {
      const n = parseFloat(td.dataset.sort);
      if (!isNaN(n)) return { isNum: true, num: n, str: td.dataset.sort };
    }
    const sel = td.querySelector('select');
    if (sel) {
      const opt = sel.options[sel.selectedIndex];
      const lbl = opt ? opt.textContent.trim() : sel.value;
      return { isNum: false, num: 0, str: lbl };
    }
    const inp = td.querySelector('input');
    if (inp) {
      if (inp.type === 'checkbox') {
        const b = inp.checked ? 1 : 0;
        return { isNum: true, num: b, str: String(b) };
      }
      const rawVal = String(inp.value).trim();
      const v = Number(rawVal.replace(/,/g, ''));
      if (rawVal !== '' && !isNaN(v)) return { isNum: true, num: v, str: rawVal };
      return { isNum: false, num: 0, str: rawVal };
    }
    const raw = td.textContent.trim();
    if (raw === '—' || raw === '') return { isNum: true, num: 0, str: '' };
    const cleaned = raw.replace(/\s*\([^)]*\)/g, '').replace(/[$,%+]|sh\b|CAD\b|USD\b/gi, '').trim();
    const num = Number(cleaned);
    if (cleaned !== '' && !isNaN(num)) {
      return { isNum: true, num: num, str: raw };
    }
    return { isNum: false, num: 0, str: raw };
  }

  // --- Formatting Helpers ---

  function fmtMoney(v) {
    if (v === undefined || v === null || isNaN(v)) return '$0';
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(v);
  }
  function fmtSignedMoney(v) {
    if (!v || Math.abs(v) < 0.5) return '$0';
    const sign = v > 0 ? '+' : '';
    return sign + fmtMoney(v);
  }
  function fmtPrice(v) {
    if (v === undefined || v === null || isNaN(v)) return '$0.00';
    return '$' + Number(v).toFixed(2);
  }
  function fmtPct(v, decimals = 1) {
    if (v === undefined || v === null || isNaN(v)) return '0.0%';
    return (v * 100).toFixed(decimals) + '%';
  }
  function fmtSignedPct(v, decimals = 1) {
    if (!v || Math.abs(v * 100) < 0.04) return '0.0%';
    const sign = v > 0 ? '+' : '';
    return sign + (v * 100).toFixed(decimals) + '%';
  }
  function fmtSignedNum(v, decimals = 1) {
    if (!v || Math.abs(v) < 0.01) return '0';
    const sign = v > 0 ? '+' : '';
    return sign + Number(v).toFixed(decimals);
  }
  function round4(v) {
    return Math.round((Number(v) || 0) * 10000) / 10000;
  }
  function fmtNum(v) {
    if (v === undefined || v === null || isNaN(v)) return '0';
    return Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
  }
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3000);
  }

  // --- User Activity & Idle Auto-Shutdown Tracker ---
  let lastActivityPing = 0;
  function notifyUserActivity() {
    const now = Date.now();
    if (now - lastActivityPing > 60000) {
      lastActivityPing = now;
      fetch('/api/activity', { method: 'POST' }).catch(() => {});
    }
  }

  ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, notifyUserActivity, { passive: true });
  });

  // --- Quit Application ---
  async function quitApplication() {
    const msg = t('confirm_quit') || 'Are you sure you want to quit Embsay?';
    if (!confirm(msg)) {
      return;
    }
    try {
      await fetch('/api/quit', { method: 'POST' });
    } catch (e) {
      // Server will shut down quickly
    }
    showShutdownOverlay();
    attemptCloseTab();
  }

  function showShutdownOverlay() {
    document.title = t('app_stopped_title');
    const overlay = document.getElementById('shutdownOverlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.style.display = 'flex';
    }
  }

  function attemptCloseTab() {
    try { window.open('', '_self'); } catch (e) {}
    try { window.close(); } catch (e) {}
  }

  window.quitApplication = quitApplication;
  window.showShutdownOverlay = showShutdownOverlay;
  window.attemptCloseTab = attemptCloseTab;

  init();
