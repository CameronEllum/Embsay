// === web/js/app.js ===
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
  let activeTab = 'summary';
  let currentMainView = 'portfolio';
  let currentPortfolioSubTab = 'summary';
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
      nav_by_division: 'Allocations',
      nav_by_classification: 'Classifications',
      toggle_divide_by_strategy: 'Divide by Strategy Target',
      lbl_target: 'Target',
      lbl_drift: 'Drift',
      nav_by_account: 'Accounts',
      nav_positions: 'Positions',
      nav_strategy: 'Strategy, Divisions & Groups',
      nav_strategy_targets: 'Settings',
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
      alloc_vs_target_title: 'Retirement Allocation vs. Strategy Target',
      alloc_vs_target_sub: 'Retirement bucket division weights against your target strategy',
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
      holdings_by_division: 'Holdings by Division (Retirement Bucket)',
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
      th_div_mapping: 'Division/Bucket',
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
      portfolio_positions_title: 'Portfolio Positions (Single Entry per Holding)',
      portfolio_positions_sub: 'Click any share count to edit directly. Multi-division ETFs are entered once here.',
      btn_delete_portfolio: 'Delete Portfolio "{name}"',
      opt_none: '— None —',
      opt_all_mapped: 'All Mapped ({count})',
      strat_editor_title: 'Target Allocation Strategy ({name})',
      strat_editor_sub: 'Configure how categories and regional divisions are weighted for the Retirement bucket',
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
      btn_report_issue: 'Report Issue',
      btn_report_issue_title: 'File a bug report or feature request on GitHub',
      btn_quit: 'Quit',
      btn_restart: 'Restart',
      btn_quit_title: 'Quit and close the Embsay application',
      confirm_quit_title: 'Quit Embsay?',
      confirm_quit: 'This stops the local server and closes this tab\'s connection. Any pending edits are saved first.',
      app_stopped_title: 'Embsay has stopped',
      app_stopped_desc: 'The local server shut down. You can close this tab.',
      app_restarting_title: 'Restarting Embsay…',
      app_restarting_desc: 'The local server is restarting. This page will reload automatically.',
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
      nav_by_division: 'Répartition',
      nav_by_classification: 'Classifications',
      toggle_divide_by_strategy: 'Diviser selon la stratégie cible',
      lbl_target: 'Cible',
      lbl_drift: 'Écart',
      nav_by_account: 'Comptes',
      nav_positions: 'Positions',
      nav_strategy: 'Stratégie, divisions et groupes',
      nav_strategy_targets: 'Paramètres',
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
      alloc_vs_target_title: 'Répartition Retraite c. cible stratégique',
      alloc_vs_target_sub: 'Pondérations par division du compartiment Retraite comparées à votre stratégie cible',
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
      holdings_by_division: 'Positions par division (compartiment Retraite)',
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
      th_div_mapping: 'Division / Compartiment',
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
      portfolio_positions_title: 'Positions du portefeuille (une entrée par détention)',
      portfolio_positions_sub: 'Cliquez sur un nombre de parts pour le modifier directement. Les FNB multidivisions sont saisis une seule fois ici.',
      btn_delete_portfolio: 'Supprimer le portefeuille « {name} »',
      opt_none: '— Aucune —',
      opt_all_mapped: 'Toutes associées ({count})',
      strat_editor_title: 'Stratégie de répartition cible ({name})',
      strat_editor_sub: 'Configurez la pondération des catégories et divisions régionales du compartiment Retraite',
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
      btn_report_issue: 'Signaler un bogue',
      btn_report_issue_title: 'Créer un ticket ou signaler un problème sur GitHub',
      btn_quit: 'Quitter',
      btn_restart: 'Redémarrer',
      btn_quit_title: 'Quitter et fermer l’application Embsay',
      confirm_quit_title: 'Quitter Embsay ?',
      confirm_quit: 'Ceci arrête le serveur local et ferme la connexion de cet onglet. Les modifications en attente sont d’abord enregistrées.',
      app_stopped_title: 'Embsay s’est arrêté',
      app_stopped_desc: 'Le serveur local s’est arrêté. Vous pouvez fermer cet onglet.',
      app_restarting_title: 'Redémarrage d’Embsay…',
      app_restarting_desc: 'Le serveur local redémarre. Cette page se rechargera automatiquement.',
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
    if (initialSubtab) {
      currentPortfolioSubTab = normalizePortfolioSubtab(initialSubtab);
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
      if (!['summary', 'account', 'allocations', 'bucket', 'transactions', 'acb', 'strategy'].includes(currentPortfolioSubTab)) {
        currentPortfolioSubTab = 'summary';
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
      const searchParams = new URLSearchParams(window.location.search);
      const urlSubtab = searchParams.get('tab') || (window.location.hash ? window.location.hash.replace('#', '') : '');
      if (urlSubtab) {
        currentPortfolioSubTab = normalizePortfolioSubtab(urlSubtab);
      }
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

  function getUrlForRoute(view, portId, subtab) {
    if (view === 'portfolio') {
      const base = portId ? `/p/${encodeURIComponent(portId)}` : '/p';
      const st = subtab || currentPortfolioSubTab || 'summary';
      return `${base}?tab=${encodeURIComponent(st)}`;
    }
    if (view === 'port-mgmt') return '/portfolios';
    if (view === 'securities') return '/securities';
    if (view === 'config') return '/config';
    return '/';
  }

  function normalizePortfolioSubtab(tab) {
    if (!tab || tab === 'overview' || tab === 'division') return 'allocations';
    if (tab === 'classification') return 'summary';
    if (['summary', 'account', 'allocations', 'bucket', 'transactions', 'acb', 'strategy'].includes(tab)) return tab;
    return 'summary';
  }

  function applyRouteFromLocation(pushHistory = false) {
    const route = routeFromLocation();
    if (route.view && route.view !== 'root') currentMainView = route.view;
    if (route.portfolioId) selectedPortfolio = route.portfolioId;
    const searchParams = new URLSearchParams(window.location.search);
    const initialSubtab = searchParams.get('tab') || (window.location.hash ? window.location.hash.replace('#', '') : '');
    if (initialSubtab) {
      currentPortfolioSubTab = normalizePortfolioSubtab(initialSubtab);
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

  function closePortfolioSwitcher() {
    const menu = document.getElementById('portfolioSwitcherMenu');
    const btn = document.getElementById('activePortfolioSwitcherBtn');
    if (menu) menu.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function togglePortfolioSwitcher(event) {
    event.stopPropagation();
    const menu = document.getElementById('portfolioSwitcherMenu');
    const btn = document.getElementById('activePortfolioSwitcherBtn');
    if (!menu || !btn) return;
    const willOpen = menu.classList.contains('hidden');
    if (!willOpen) {
      closePortfolioSwitcher();
      return;
    }

    const allPorts = (appState && appState.portfolios) ? appState.portfolios : [];
    const singles = allPorts.filter(p => !p.is_group);
    const groups = allPorts.filter(p => p.is_group);

    let html = '';
    if (singles.length > 0) {
      html += `<div class="port-switcher-section">Portfolios</div>`;
      html += singles.map(p => {
        const isActive = p.id === selectedPortfolio;
        return `<button type="button" class="card-menu-item${isActive ? ' active' : ''}" role="menuitem"
          data-port-id="${esc(p.id)}"
          onclick="closePortfolioSwitcher(); goPortfolioView(this.dataset.portId)">
          ${isActive ? '✓ ' : ''}💼 ${esc(p.name)}
        </button>`;
      }).join('');
    }
    if (groups.length > 0) {
      if (singles.length > 0) html += `<div class="card-menu-sep"></div>`;
      html += `<div class="port-switcher-section">Groups</div>`;
      html += groups.map(g => {
        const isActive = g.id === selectedPortfolio;
        return `<button type="button" class="card-menu-item${isActive ? ' active' : ''}" role="menuitem"
          data-port-id="${esc(g.id)}"
          onclick="closePortfolioSwitcher(); goPortfolioView(this.dataset.portId)">
          ${isActive ? '✓ ' : ''}⊞ ${esc(tTerm(g.name))}
        </button>`;
      }).join('');
    }
    if (!html) {
      html = `<div class="text-muted" style="padding:8px 10px;font-size:12px;">No portfolios found</div>`;
    }

    menu.innerHTML = html;
    menu.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.port-switcher-wrap')) {
      closePortfolioSwitcher();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePortfolioSwitcher();
  });

  window.togglePortfolioSwitcher = togglePortfolioSwitcher;
  window.closePortfolioSwitcher = closePortfolioSwitcher;

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
    switchPortfolioSubTab(currentPortfolioSubTab || 'summary', false);
    await loadStateAndEvaluate();
  }

  async function selectPortfolio(id, pushHistory = true) {
    selectedPortfolio = id;
    setLastPortfolio(id);
    selectedFilter = 'all';
    Object.keys(tableSortState).forEach(k => delete tableSortState[k]);
    if (currentMainView !== 'portfolio') {
      switchMainView('portfolio', pushHistory);
    } else if (pushHistory) {
      history.pushState(null, '', getUrlForRoute('portfolio', id, currentPortfolioSubTab));
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

    // Rebalance switch state (ONLY shown and works on Allocations page)
    const isDivisionTab = (currentMainView === 'portfolio' || !currentMainView) && currentPortfolioSubTab === 'allocations';
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
      switchPortfolioSubTab(currentPortfolioSubTab || 'summary', false);
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

  function applySubtabOrder(order) {
    const group = document.getElementById('subnavHoldingsGroup');
    if (!group) return;
    const buttons = Array.from(group.querySelectorAll('.port-subtab'));
    if (!Array.isArray(order) || order.length === 0) return;

    const byKey = {};
    buttons.forEach(btn => {
      if (btn.dataset.subtab) byKey[btn.dataset.subtab] = btn;
    });
    const used = new Set();
    order.forEach(key => {
      const btn = byKey[key];
      if (btn && !used.has(key)) {
        group.appendChild(btn);
        used.add(key);
      }
    });
    buttons.forEach(btn => {
      const key = btn.dataset.subtab;
      if (key && !used.has(key)) {
        group.appendChild(btn);
        used.add(key);
      }
    });
  }

  function initDraggableSubtabs() {
    const group = document.getElementById('subnavHoldingsGroup');
    if (!group || group.dataset.dragBound === 'true') return;
    group.dataset.dragBound = 'true';

    let draggedBtn = null;
    group.querySelectorAll('.port-subtab').forEach(btn => {
      btn.draggable = true;
      if (!btn.title) {
        btn.title = 'Drag to reorder Holdings tabs';
      }

      btn.addEventListener('dragstart', (e) => {
        draggedBtn = btn;
        btn.classList.add('dragging-subtab');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', btn.dataset.subtab || '');
        }
      });

      btn.addEventListener('dragend', () => {
        btn.classList.remove('dragging-subtab');
        group.querySelectorAll('.port-subtab').forEach(b => b.classList.remove('drag-over-left', 'drag-over-right'));
        draggedBtn = null;
      });

      btn.addEventListener('dragover', (e) => {
        if (!draggedBtn || draggedBtn === btn) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        const rect = btn.getBoundingClientRect();
        const left = e.clientX < rect.left + rect.width / 2;
        group.querySelectorAll('.port-subtab').forEach(b => b.classList.remove('drag-over-left', 'drag-over-right'));
        btn.classList.add(left ? 'drag-over-left' : 'drag-over-right');
      });

      btn.addEventListener('dragleave', () => {
        btn.classList.remove('drag-over-left', 'drag-over-right');
      });

      btn.addEventListener('drop', async (e) => {
        if (!draggedBtn || draggedBtn === btn) return;
        e.preventDefault();
        const rect = btn.getBoundingClientRect();
        const left = e.clientX < rect.left + rect.width / 2;
        group.querySelectorAll('.port-subtab').forEach(b => b.classList.remove('drag-over-left', 'drag-over-right'));
        group.insertBefore(draggedBtn, left ? btn : btn.nextSibling);

        const newOrder = Array.from(group.querySelectorAll('.port-subtab'))
          .map(b => b.dataset.subtab)
          .filter(Boolean);

        if (appState && appState.config) {
          appState.config.subtab_order = newOrder;
          const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appState.config)
          });
          if (res.ok) {
            appState = await res.json();
            showToast('Saved tab order to config/config.yaml');
          } else {
            showToast('Failed to save tab order');
          }
        }
      });
    });
  }

  function switchPortfolioSubTab(subtab, pushHistory = true) {
    subtab = normalizePortfolioSubtab(subtab || currentPortfolioSubTab || 'summary');
    const changed = subtab !== currentPortfolioSubTab;
    currentPortfolioSubTab = subtab;
    activeTab = subtab;
    if (pushHistory && currentMainView === 'portfolio') {
      const targetUrl = getUrlForRoute('portfolio', selectedPortfolio, subtab);
      const currentFull = window.location.pathname + window.location.search;
      if (targetUrl !== currentFull) {
        history.pushState(null, '', targetUrl);
      }
    }
    document.querySelectorAll('.port-subtab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subtab === subtab);
    });
    document.querySelectorAll('.portfolio-switcher button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subtab === subtab);
    });
    showOnlyTabPane(`tab-${subtab}`);
    renderTopBar();
    if (subtab === 'summary') {
      if (typeof renderSummaryView === 'function') renderSummaryView();
    } else if (subtab === 'strategy') {
      renderStrategyTab();
    } else if (subtab === 'bucket') {
      if (typeof renderBucketView === 'function') renderBucketView();
    } else if (subtab === 'transactions') {
      if (typeof window.refreshTransactionsTab === 'function') window.refreshTransactionsTab(selectedPortfolio);
    } else if (subtab === 'acb') {
      if (typeof window.refreshAcbTab === 'function') window.refreshAcbTab(selectedPortfolio);
    } else if (subtab === 'allocations') {
      if (typeof renderDivisionView === 'function') renderDivisionView();
    } else {
      if (typeof renderAccountView === 'function') renderAccountView();
    }
  }

  function showOnlyTabPane(id) {
    if (id === 'tab-overview' || id === 'tab-division') id = 'tab-allocations';
    document.querySelectorAll('.tab-pane').forEach(el => {
      el.classList.toggle('hidden', el.id !== id);
    });
  }

  function switchTab(tab) {
    if (tab === 'overview' || tab === 'division' || tab === 'allocations' || tab === 'classification' || tab === 'account' || tab === 'bucket' || tab === 'transactions' || tab === 'acb' || tab === 'strategy') {
      switchMainView('portfolio');
      switchPortfolioSubTab(normalizePortfolioSubtab(tab));
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

  // Reusable styled prompt/confirm modal
  let _appDialogResolve = null;
  let _appDialogMode = 'confirm';

  function _openAppDialog(opts) {
    const modal = document.getElementById('appDialogModal');
    const titleEl = document.getElementById('appDialogTitle');
    const msgEl = document.getElementById('appDialogMessage');
    const inputWrap = document.getElementById('appDialogInputWrap');
    const labelEl = document.getElementById('appDialogInputLabel');
    const inputEl = document.getElementById('appDialogInput');
    const confirmBtn = document.getElementById('appDialogConfirmBtn');
    const altBtn = document.getElementById('appDialogAltBtn');
    const cancelBtn = document.getElementById('appDialogCancelBtn');
    if (!modal) {
      if (opts.mode === 'prompt') return Promise.resolve(window.prompt(opts.label || opts.title || '', opts.initialValue || ''));
      return Promise.resolve(window.confirm(opts.message || opts.title || ''));
    }

    if (_appDialogResolve) {
      const prev = _appDialogResolve;
      _appDialogResolve = null;
      prev(_appDialogMode === 'prompt' ? null : false);
    }

    _appDialogMode = opts.mode || 'confirm';
    titleEl.textContent = opts.title || '';
    if (opts.message) {
      msgEl.textContent = opts.message;
      msgEl.classList.remove('hidden');
    } else {
      msgEl.textContent = '';
      msgEl.classList.add('hidden');
    }

    if (_appDialogMode === 'prompt') {
      inputWrap.classList.remove('hidden');
      labelEl.textContent = opts.label || '';
      inputEl.value = opts.initialValue || '';
      inputEl.placeholder = opts.placeholder || '';
    } else {
      inputWrap.classList.add('hidden');
      inputEl.value = '';
    }

    cancelBtn.textContent = opts.cancelLabel || (typeof t === 'function' ? t('btn_cancel') : 'Cancel');
    cancelBtn.classList.toggle('hidden', _appDialogMode === 'info');
    if (altBtn) {
      if (opts.altLabel) {
        altBtn.textContent = opts.altLabel;
        altBtn.classList.remove('hidden');
      } else {
        altBtn.classList.add('hidden');
      }
    }
    confirmBtn.textContent = opts.confirmLabel || 'OK';
    confirmBtn.className = opts.danger ? 'btn btn-danger' : 'btn btn-primary';

    modal.classList.remove('hidden');
    setTimeout(() => {
      if (_appDialogMode === 'prompt') {
        inputEl.focus();
        inputEl.select();
      } else {
        confirmBtn.focus();
      }
    }, 10);

    return new Promise(resolve => {
      _appDialogResolve = resolve;
    });
  }

  function closeAppDialog(result) {
    const modal = document.getElementById('appDialogModal');
    if (modal) modal.classList.add('hidden');
    if (_appDialogResolve) {
      const resolve = _appDialogResolve;
      _appDialogResolve = null;
      resolve(result);
    }
  }

  function confirmAppDialog() {
    if (_appDialogMode === 'prompt') {
      const inputEl = document.getElementById('appDialogInput');
      closeAppDialog(inputEl ? inputEl.value : '');
    } else {
      closeAppDialog(true);
    }
  }

  function openPromptModal(opts = {}) {
    return _openAppDialog({ ...opts, mode: 'prompt' });
  }

  function openConfirmModal(opts = {}) {
    return _openAppDialog({ ...opts, mode: 'confirm' });
  }

  function openInfoModal(opts = {}) {
    return _openAppDialog({ ...opts, mode: 'info' });
  }

  function openDisclaimerModal() {
    openInfoModal({
      title: 'Disclaimer',
      message: 'Embsay is a portfolio visualization and simulation tool intended for informational and educational purposes only. It does not provide financial, investment, legal, or tax advice. Calculations such as after-tax discounting and foreign withholding tax drag are estimates based on user-provided inputs and simplified models. Consult a qualified professional accountant or fee-only financial planner for your specific tax and investment situation.',
      confirmLabel: 'Close'
    });
  }

  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('appDialogModal');
    if (!modal || modal.classList.contains('hidden')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAppDialog(_appDialogMode === 'prompt' ? null : false);
    } else if (e.key === 'Enter' && _appDialogMode === 'prompt') {
      e.preventDefault();
      confirmAppDialog();
    }
  });

  window.openPromptModal = openPromptModal;
  window.openConfirmModal = openConfirmModal;
  window.openInfoModal = openInfoModal;
  window.openDisclaimerModal = openDisclaimerModal;
  window.closeAppDialog = closeAppDialog;
  window.confirmAppDialog = confirmAppDialog;

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

  // --- Table Sorting & Helpers ---

  let _justResizedCol = false;
  let savedColumnWidths = {};
  try {
    savedColumnWidths = JSON.parse(localStorage.getItem('embsay_col_widths') || '{}') || {};
  } catch (e) {
    savedColumnWidths = {};
  }

  function getNormalizedColKey(th) {
    if (th.dataset && th.dataset.colKey) return th.dataset.colKey;
    const clone = th.cloneNode(true);
    clone.querySelectorAll('.sort-icon, .col-resizer').forEach(el => el.remove());
    return clone.textContent.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function applyColWidthAcrossTables(colKey, widthPx) {
    if (!colKey || !widthPx) return;
    document.querySelectorAll('table.table-clean').forEach(table => {
      const ths = Array.from(table.querySelectorAll('thead tr th'));
      const cols = Array.from(table.querySelectorAll('colgroup col'));
      ths.forEach((th, idx) => {
        if (getNormalizedColKey(th) === colKey) {
          if (table.style.tableLayout !== 'fixed') {
            // Freeze sibling widths before switching to fixed layout
            if (cols.length === ths.length) {
              ths.forEach((otherTh, oIdx) => {
                if (!cols[oIdx].style.width) {
                  cols[oIdx].style.width = Math.max(60, Math.round(otherTh.getBoundingClientRect().width)) + 'px';
                }
              });
            }
            table.style.tableLayout = 'fixed';
          }
          if (cols[idx]) cols[idx].style.width = widthPx + 'px';
          th.style.width = widthPx + 'px';
        }
      });
    });
  }

  function initResizableTables() {
    document.querySelectorAll('table.table-clean').forEach(table => {
      const ths = Array.from(table.querySelectorAll('thead tr th'));
      if (ths.length === 0) return;

      let colgroup = table.querySelector('colgroup');
      if (!colgroup) {
        colgroup = document.createElement('colgroup');
        ths.forEach(() => colgroup.appendChild(document.createElement('col')));
        table.insertBefore(colgroup, table.firstChild);
      }
      const cols = Array.from(colgroup.querySelectorAll('col'));

      ths.forEach((th, idx) => {
        const colKey = getNormalizedColKey(th);
        th.dataset.colKey = colKey;

        if (colKey && savedColumnWidths[colKey]) {
          const w = savedColumnWidths[colKey];
          if (table.style.tableLayout !== 'fixed') {
            table.style.tableLayout = 'fixed';
          }
          if (cols[idx]) cols[idx].style.width = w + 'px';
          th.style.width = w + 'px';
        }

        if (!th.querySelector('.col-resizer')) {
          const resizer = document.createElement('span');
          resizer.className = 'col-resizer';
          resizer.title = 'Drag to resize column across all tables';
          resizer.addEventListener('click', (e) => e.stopPropagation());
          resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            _justResizedCol = true;
            resizer.classList.add('resizing');
            const startX = e.clientX;
            const startWidth = th.getBoundingClientRect().width;
            let latestWidth = Math.max(60, Math.round(startWidth));

            const onMove = (ev) => {
              latestWidth = Math.max(60, Math.round(startWidth + (ev.clientX - startX)));
              if (colKey) {
                savedColumnWidths[colKey] = latestWidth;
                applyColWidthAcrossTables(colKey, latestWidth);
              }
            };

            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
              resizer.classList.remove('resizing');
              try {
                localStorage.setItem('embsay_col_widths', JSON.stringify(savedColumnWidths));
              } catch (err) {}
              setTimeout(() => { _justResizedCol = false; }, 60);
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          });
          th.appendChild(resizer);
        }
      });
    });
  }

  function initSortableTables() {
    document.querySelectorAll('table[data-sort-table]').forEach(table => {
      const tableKey = table.dataset.sortTable;
      const tbody = table.querySelector('tbody');
      if (tbody) {
        Array.from(tbody.querySelectorAll('tr')).forEach((tr, idx) => {
          if (tr.dataset.origIdx === undefined) tr.dataset.origIdx = String(idx);
        });
      }
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
          if (_justResizedCol) return;
          const prev = tableSortState[tableKey];
          const firstDir = th.classList.contains('left') ? 'asc' : 'desc';
          const secondDir = firstDir === 'asc' ? 'desc' : 'asc';
          if (prev && prev.colIdx === colIdx && prev.dir === secondDir) {
            delete tableSortState[tableKey];
            restoreTableOriginalOrder(table);
            return;
          }
          const dir = (prev && prev.colIdx === colIdx) ? secondDir : firstDir;
          tableSortState[tableKey] = { colIdx, dir };
          applyTableSort(table, colIdx, dir);
        };
      });

      const saved = tableSortState[tableKey];
      if (saved && saved.colIdx < headers.length) {
        applyTableSort(table, saved.colIdx, saved.dir);
      }
    });
    if (typeof initDraggableTables === 'function') {
      initDraggableTables();
    }
    initResizableTables();
  }

  function restoreTableOriginalOrder(table) {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    table.querySelectorAll('thead tr th').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = '↕';
    });
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => Number(a.dataset.origIdx || 0) - Number(b.dataset.origIdx || 0));
    rows.forEach(r => tbody.appendChild(r));
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

  // --- Report GitHub Issue ---
  function openReportIssue() {
    const os = (appState && appState.runtime_os) ? `${appState.runtime_os}/${appState.runtime_arch || ''}` : (navigator.platform || 'unknown');
    const goVer = (appState && appState.go_version) ? appState.go_version : 'unknown';
    const lang = currentLang || 'en-CA';
    const theme = (appState && appState.config && appState.config.theme_mode) || 'system';
    const viewInfo = currentMainView === 'portfolio'
      ? `portfolio (${currentPortfolioSubTab || 'account'})`
      : currentMainView;

    const body = [
      '### Describe the Issue / Feature Request',
      '<!-- Clear description of what happened or what you would like to see -->',
      '',
      '',
      '### Steps to Reproduce (if applicable)',
      '1. ',
      '2. ',
      '',
      '### Environment',
      `- OS: ${os}`,
      `- Runtime: ${goVer}`,
      `- Active View: ${viewInfo}`,
      `- Language: ${lang}`,
      `- Theme: ${theme}`,
      '',
      '> **Privacy Note:** Please avoid pasting personal portfolio YAML files, account names, or balances.'
    ].join('\n');

    const url = `https://github.com/CameronEllum/Embsay/issues/new?body=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  window.openReportIssue = openReportIssue;

  // --- Quit / Restart Application ---
  async function quitApplication() {
    const choice = await openConfirmModal({
      title: t('confirm_quit_title') || 'Quit Embsay?',
      message: t('confirm_quit') || 'This stops the local server and closes this tab\'s connection. Any pending edits are saved first.',
      confirmLabel: t('btn_quit') || 'Quit',
      altLabel: t('btn_restart') || 'Restart',
      danger: true
    });
    if (!choice) return;

    // Flush any focused inline edit before stopping/restarting the server
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    if (choice === 'alt') {
      showShutdownOverlay(true);
      try {
        await fetch('/api/restart', { method: 'POST' });
      } catch (e) {
        // Server closes connection as it restarts
      }
      await waitForRestartAndReload();
      return;
    }

    try {
      await fetch('/api/quit', { method: 'POST' });
    } catch (e) {
      // Server will shut down quickly
    }
    showShutdownOverlay(false);
  }

  async function waitForRestartAndReload() {
    const deadline = Date.now() + 20000;
    await new Promise(resolve => setTimeout(resolve, 500));
    while (Date.now() < deadline) {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          window.location.reload();
          return;
        }
      } catch (e) {
        // Still restarting
      }
      await new Promise(resolve => setTimeout(resolve, 350));
    }
    const descEl = document.getElementById('shutdownDesc');
    if (descEl) {
      descEl.textContent = 'Server did not respond in time. Please refresh or relaunch Embsay.';
    }
  }

  function showShutdownOverlay(isRestart = false) {
    const titleEl = document.getElementById('shutdownTitle');
    const descEl = document.getElementById('shutdownDesc');
    const titleText = isRestart
      ? (t('app_restarting_title') || 'Restarting Embsay…')
      : (t('app_stopped_title') || 'Embsay has stopped');
    const descText = isRestart
      ? (t('app_restarting_desc') || 'The local server is restarting. This page will reload automatically.')
      : (t('app_stopped_desc') || 'The local server shut down. You can close this tab.');
    document.title = titleText;
    if (titleEl) titleEl.textContent = titleText;
    if (descEl) descEl.textContent = descText;
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


// === web/js/portfolio.js ===
/**
 * Embsay — Portfolio View (Overview, Holdings, Strategy & Rebalancing)
 */

  function afterTaxMode() {
    return !!currentEval && currentEval.allocation_basis === 'after_tax';
  }

  function grossCurrentTotal() {
    const e = currentEval;
    return e && typeof e.gross_current_total_cad === 'number' && e.gross_current_total_cad > 0
      ? e.gross_current_total_cad
      : (e ? e.current_total_cad : 0);
  }

  function tradeNeededLabelKey() {
    return afterTaxMode() ? 'th_gross_trade_needed' : 'th_net_trade_needed';
  }

  function buildKpiGridHtml(showNetWorth = true) {
    const e = currentEval;
    if (!e) return '';

    // Category summary string (only target categories > 0%)
    const targetCats = (e.categories || []).filter(c => (c.target_ratio || 0) > 0);
    const catSummary = targetCats.map(c => `${fmtPct(c.current_ratio, 1)} ${tTerm(c.category_name)}`).join(' · ');
    const catTargetSummary = targetCats.map(c => `${fmtPct(c.target_ratio, 0)} ${tTerm(c.category_name)}`).join(' / ');

    const hasExcluded = showNetWorth && !!e.has_excluded_accounts;
    const netWorthVal = hasExcluded ? (typeof e.net_worth_cad === 'number' ? e.net_worth_cad : e.current_total_cad) : e.current_total_cad;
    const heroLabel = hasExcluded
      ? (afterTaxMode() ? 'Total Net Worth (After-Tax)' : 'Total Net Worth')
      : (afterTaxMode() ? t('kpi_after_tax_allocation') : t('kpi_total_value'));
    const heroSub = hasExcluded
      ? `<span class="text-muted">Rebalanced: <b>${fmtMoney(e.current_total_cad)}</b>${afterTaxMode() ? ` · Gross NW: ${fmtMoney(e.gross_net_worth_cad || netWorthVal)}` : ''}</span>`
      : (afterTaxMode()
          ? `<span class="text-muted">${esc(t('kpi_rrsp_tax_sub', { tax: fmtMoney(e.estimated_rrsp_deferred_tax_cad || 0), gross: fmtMoney(grossCurrentTotal()) }))}</span>`
          : `<span>${esc(t('kpi_positions_across', { pos: (e.raw_holdings || []).length, acc: (e.account_summaries || []).length }))}</span>`);

    return `
      <div class="card">
        <div class="kpi-label">${esc(heroLabel)}</div>
        <div class="kpi-value">${fmtMoney(netWorthVal)}</div>
        <div class="kpi-sub">
          ${heroSub}
        </div>
      </div>

      <div class="card">
        <div class="kpi-label">${esc(t('kpi_category_split'))}</div>
        <div class="kpi-value" style="font-size:20px;margin-top:8px;">${esc(catSummary)}</div>
        <div class="kpi-sub">${esc(t('kpi_strategy_target', { target: catTargetSummary }))}</div>
      </div>

      <div class="card">
        <div class="kpi-label">${esc(t('kpi_fee_tax_drag'))}</div>
        <div class="kpi-value">${fmtPct(e.weighted_mer_plus_tax, 2)} <span class="text-muted" style="font-size:15px;font-weight:500;">(${fmtMoney(grossCurrentTotal() * e.weighted_mer_plus_tax)}${esc(t('kpi_per_yr'))})</span></div>
        <div class="kpi-sub">${esc(t('kpi_mer_tax_sub', { mer: fmtPct(e.weighted_mer, 2), tax: fmtPct(e.weighted_mer_plus_tax - e.weighted_mer, 2) }))}</div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="kpi-label">${esc(t('kpi_usd_cad'))}</div>
          <button class="btn btn-ghost" style="padding:2px 6px;font-size:11px;" onclick="refreshPrices()" title="${esc(t('btn_refresh_prices_title'))}">
            ↻ ${esc(t('btn_refresh_prices_short'))}
          </button>
        </div>
        <div class="kpi-value" style="display:flex;align-items:center;gap:8px;">
          <input type="text" inputmode="decimal" class="inline-num" style="font-size:22px;width:105px;text-align:left;padding:2px 4px;"
                 value="${e.usd_cad_rate.toFixed(4)}" onchange="updateUSDCADRate(this.value)" title="${esc(t('kpi_usd_cad_title'))}" />
        </div>
        <div class="kpi-sub">${esc(t('kpi_as_of', { date: e.fx_updated_at }))}</div>
      </div>
    `;
  }

  function renderKpiGrids() {
    const netWorthHtml = buildKpiGridHtml(true);
    const divisionHtml = buildKpiGridHtml(false);
    const divEl = document.getElementById('kpiGridDivision');
    if (divEl) divEl.innerHTML = divisionHtml;
    ['kpiGridSummary', 'kpiGridAccount', 'kpiGridBucket', 'kpiGrid'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = netWorthHtml;
    });
  }

  function renderOverviewTab() {
    renderSummaryView();
    renderDivisionView();
    renderAccountView();
    renderBucketView();
    if (currentPortfolioSubTab === 'transactions' && typeof window.refreshTransactionsTab === 'function') {
      window.refreshTransactionsTab(selectedPortfolio);
    }
    if (currentPortfolioSubTab === 'acb' && typeof window.refreshAcbTab === 'function') {
      window.refreshAcbTab(selectedPortfolio);
    }
    initSortableTables();
  }

  function buildDivisionPieSvg(divs, totalVal) {
    const size = 180;
    const cx = size / 2;
    const cy = size / 2;
    const r = 68;
    const strokeW = 28;
    const circ = 2 * Math.PI * r;
    let offset = 0;

    const segments = divs.map((d, i) => {
      const color = DIVISION_COLORS[i % DIVISION_COLORS.length];
      const frac = totalVal > 0 ? Math.max(0, d.current_value_cad / totalVal) : 0;
      const len = frac * circ;
      const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent"
        stroke="${color}" stroke-width="${strokeW}"
        stroke-dasharray="${len.toFixed(2)} ${circ.toFixed(2)}"
        stroke-dashoffset="${(-offset).toFixed(2)}"
        transform="rotate(-90 ${cx} ${cy})"
        style="cursor:pointer;"
        onclick="switchPortfolioSubTab('allocations'); setTimeout(() => scrollToDivisionCard('${esc(d.division_name)}'), 50)">
        <title>${esc(tTerm(d.division_name))}: ${fmtMoney(d.current_value_cad)} (${fmtPct(d.current_ratio, 1)})</title>
      </circle>`;
      offset += len;
      return seg;
    }).join('');

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0;">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="var(--bg-subtle)" stroke-width="${strokeW}" />
        ${segments}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="var(--text-muted)" font-size="11" font-weight="600">RETIREMENT</text>
        <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="var(--text)" font-size="14" font-weight="700">${esc(fmtMoney(totalVal))}</text>
      </svg>
    `;
  }

  function renderSummaryView() {
    const e = currentEval;
    if (!e) return;
    renderKpiGrids();

    const pieContainer = document.getElementById('summaryDivisionPieContainer');
    if (pieContainer) {
      const targetDivs = (e.divisions || []).filter(d => (d.target_ratio || 0) > 0);
      if (targetDivs.length === 0) {
        pieContainer.innerHTML = `<div class="text-muted center" style="padding:20px;">No Retirement divisions configured.</div>`;
      } else {
        const legendRows = targetDivs.map((d, i) => {
          const color = DIVISION_COLORS[i % DIVISION_COLORS.length];
          return `
            <div onclick="switchPortfolioSubTab('allocations'); setTimeout(() => scrollToDivisionCard('${esc(d.division_name)}'), 50)"
                 style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 8px;border-radius:6px;cursor:pointer;"
                 onmouseover="this.style.background='var(--bg-subtle)'" onmouseout="this.style.background='transparent'">
              <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                <span class="legend-dot" style="background:${color};flex-shrink:0;"></span>
                <span style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(tTerm(d.division_name))}</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;white-space:nowrap;font-size:13px;">
                <b>${fmtMoney(d.current_value_cad)}</b>
                <span class="text-muted" style="width:46px;text-align:right;">${fmtPct(d.current_ratio, 1)}</span>
              </div>
            </div>
          `;
        }).join('');
        pieContainer.innerHTML = `
          <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
            ${buildDivisionPieSvg(targetDivs, e.current_total_cad)}
            <div style="flex:1;min-width:210px;">${legendRows}</div>
          </div>
        `;
      }
    }

    const nwPanel = document.getElementById('summaryNetWorthPanel');
    if (nwPanel) {
      const netWorth = e.has_excluded_accounts ? (e.net_worth_cad || e.current_total_cad) : e.current_total_cad;
      const buckets = e.bucket_summaries || [];

      let bucketHtml = '';
      if (buckets.length > 0) {
        bucketHtml = `
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:4px;">
            ${buckets.map((b, idx) => {
              const color = DIVISION_COLORS[idx % DIVISION_COLORS.length];
              const badge = b.is_allocation_bucket
                ? ` <span class="pill pill-primary" style="font-size:10px;padding:1px 6px;">Allocated</span>`
                : (b.is_default ? ` <span class="pill pill-neutral" style="font-size:10px;padding:1px 6px;">Default</span>` : '');
              return `
                <div onclick="switchPortfolioSubTab('${b.is_allocation_bucket ? 'allocations' : 'bucket'}')" style="padding:5px 8px;border-radius:6px;cursor:pointer;"
                     onmouseover="this.style.background='var(--bg-subtle)'" onmouseout="this.style.background='transparent'">
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;">
                    <span><span class="legend-dot" style="background:${color};display:inline-block;margin-right:6px;"></span><b>${esc(b.bucket)}</b>${badge}</span>
                    <span><b>${fmtMoney(b.market_value_cad)}</b> <span class="text-muted">(${fmtPct(b.net_worth_ratio, 1)})</span></span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      nwPanel.innerHTML = `
        <div style="display:flex;justify-content:space-between;padding:8px 10px;background:var(--bg-subtle);border-radius:8px;font-size:13.5px;">
          <span class="text-muted">Total Net Worth</span>
          <b style="font-size:15px;">${fmtMoney(netWorth)}</b>
        </div>
        ${bucketHtml}
      `;
    }

    const notesEl = document.getElementById('summaryStrategyNotes');
    if (notesEl) {
      const notes = e.strategy_notes || [];
      if (notes.length > 0) {
        notesEl.innerHTML = `
          <div class="card" style="padding:14px 18px;border-left:4px solid var(--primary);">
            <div class="kpi-label" style="margin-bottom:6px;">Strategy Notes</div>
            <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:var(--text-secondary);">
              ${notes.map(n => `<li>${esc(n)}</li>`).join('')}
            </ul>
          </div>
        `;
      } else {
        notesEl.innerHTML = '';
      }
    }
  }

  function renderDivisionTab() {
    renderDivisionView();
  }

  function renderClassificationTab() {
    renderClassificationView();
  }

  function renderAccountTab() {
    renderAccountView();
  }

  function setHoldingsGrouping(mode) {
    if (typeof switchPortfolioSubTab === 'function') {
      switchPortfolioSubTab(mode);
    }
  }

  function renderDivisionView() {
    const e = currentEval;
    if (!e) return;
    renderKpiGrids();

    const existingBanner = document.getElementById('overviewStrategyNotesBanner');
    if (existingBanner) existingBanner.remove();

    // Category Pills
    const driftThreshold = (appState.config && appState.config.drift_threshold > 0) ? appState.config.drift_threshold : 0.01;
    const catPills = document.getElementById('categoryPillsSummary');
    if (catPills) {
      catPills.innerHTML = (e.categories || []).filter(c => (c.target_ratio || 0) > 0).map(c => {
        const drift = c.ratio_miss;
        const isRed = Math.abs(drift) >= driftThreshold;
        const cls = isRed ? 'pill-red' : 'pill-green';
        return `<span class="pill ${cls}">${esc(tTerm(c.category_name))}: ${fmtPct(c.current_ratio, 1)} (${esc(t('pill_target_short', { pct: fmtPct(c.target_ratio, 0) }))})</span>`;
      }).join('');
    }

    // Stacked Bars (Actual vs Target) — omit 0% tracking-only divisions
    const divs = (e.divisions || []).filter(d => (d.target_ratio || 0) > 0);
    const actualSegs = divs.map((d, i) => {
      const color = DIVISION_COLORS[i % DIVISION_COLORS.length];
      const w = Math.max(0, d.current_ratio * 100);
      return `<div class="stacked-seg" data-division="${esc(d.division_name)}" style="width:${w}%;background:${color};cursor:pointer;" title="${esc(tTerm(d.division_name))}: ${fmtPct(d.current_ratio, 1)} (${fmtMoney(d.current_value_cad)})" onmouseenter="highlightDivision('${esc(d.division_name)}', true)" onmouseleave="highlightDivision('${esc(d.division_name)}', false)" onclick="scrollToDivisionCard('${esc(d.division_name)}')"></div>`;
    }).join('');

    const targetSegs = divs.map((d, i) => {
      const color = DIVISION_COLORS[i % DIVISION_COLORS.length];
      const w = Math.max(0, d.target_ratio * 100);
      return `<div class="stacked-seg" data-division="${esc(d.division_name)}" style="width:${w}%;background:${color};opacity:0.75;cursor:pointer;" title="${esc(tTerm(d.division_name))}: ${fmtPct(d.target_ratio, 1)}" onmouseenter="highlightDivision('${esc(d.division_name)}', true)" onmouseleave="highlightDivision('${esc(d.division_name)}', false)" onclick="scrollToDivisionCard('${esc(d.division_name)}')"></div>`;
    }).join('');

    const barsContainer = document.getElementById('stackedBarsContainer');
    if (barsContainer) {
      barsContainer.innerHTML = `
        <div class="stacked-bar-row">
          <div class="stacked-bar-label"><span>${esc(t('bar_actual_alloc'))}</span><span>100% (${fmtMoney(e.current_total_cad)})</span></div>
          <div class="stacked-bar">${actualSegs}</div>
        </div>
        <div class="stacked-bar-row" style="margin-bottom:0;">
          <div class="stacked-bar-label"><span>${esc(t('bar_target_strat'))}</span><span>100% (${fmtMoney(e.target_total_cad)})</span></div>
          <div class="stacked-bar" style="height:10px;">${targetSegs}</div>
        </div>
      `;
    }

    // Division Summary Table
    const divSummaryTable = document.getElementById('divisionSummaryTable');
    if (divSummaryTable) {
      const isGrp = isGroupSelection(selectedPortfolio);
      divSummaryTable.dataset.dragScope = 'divisionOrder';
      const maxRatio = Math.max(0.4, ...divs.map(d => Math.max(d.current_ratio, d.target_ratio)));
      const divSummaryRows = divs.map((d, i) => {
        const color = DIVISION_COLORS[i % DIVISION_COLORS.length];
        const actW = Math.min(100, (d.current_ratio / maxRatio) * 100);
        const tgtW = Math.min(100, (d.target_ratio / maxRatio) * 100);
        const isOverDrift = Math.abs(d.ratio_miss) >= driftThreshold;
        const driftPill = isOverDrift
          ? `<span class="pill pill-red">${fmtSignedPct(d.ratio_miss, 1)}</span>`
          : `<span class="pill pill-green">${fmtSignedPct(d.ratio_miss, 1)}</span>`;

        const rebalCols = rebalanceMode ? `
          <td>${fmtMoney(d.target_value_cad)}</td>
          <td class="${d.amount_to_buy_cad >= 0 ? 'text-green' : 'text-red'}">${fmtSignedMoney(d.amount_to_buy_cad)}</td>
          <td>${fmtMoney(d.after_value_cad)} (${fmtPct(d.after_ratio, 1)})</td>
        ` : '';

        return `
          <tr data-row-key="${esc(d.division_name)}" data-division="${esc(d.division_name)}" onmouseenter="highlightDivision('${esc(d.division_name)}', true)" onmouseleave="highlightDivision('${esc(d.division_name)}', false)">
            <td class="left" style="cursor:pointer;" onclick="if(!event.target.closest('.drag-handle')) scrollToDivisionCard('${esc(d.division_name)}')">
              ${dragHandleHtml(isGrp)}<span class="legend-dot" style="background:${color};display:inline-block;margin-right:8px;"></span>
              <b>${esc(tTerm(d.division_name))}</b>
            </td>
            <td class="left"><span class="pill pill-neutral">${esc(tTerm(d.category_name))}</span></td>
            <td class="left" data-sort="${d.current_ratio}">
              <div class="mini-bar-wrap">
                <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${actW}%;background:${color};"></div></div>
                <div class="mini-bar-track" style="margin-bottom:0;height:4px;"><div class="mini-bar-fill" style="width:${tgtW}%;background:${color};opacity:0.45;"></div></div>
              </div>
            </td>
            <td><b>${fmtMoney(d.current_value_cad)}</b></td>
            <td><b>${fmtPct(d.current_ratio, 1)}</b></td>
            <td class="text-muted">${fmtPct(d.target_ratio, 2)}</td>
            <td>${driftPill}</td>
            ${rebalCols}
          </tr>
        `;
      }).join('');

      const totalRebalCols = rebalanceMode ? `
        <td><b>${fmtMoney(e.target_total_cad)}</b></td>
        <td class="${e.amount_to_buy_cad >= 0 ? 'text-green' : 'text-red'}"><b>${fmtSignedMoney(e.amount_to_buy_cad)}</b></td>
        <td><b>${fmtMoney(e.after_total_cad)} (100.0%)</b></td>
      ` : '';

      const totalRowHtml = `
        <tfoot>
          <tr>
            <td class="left"><b>${esc(t('lbl_total'))}</b></td>
            <td class="left"><span class="text-muted">—</span></td>
            <td class="left"><span class="text-muted">—</span></td>
            <td><b>${fmtMoney(e.current_total_cad)}</b></td>
            <td><b>100.0%</b></td>
            <td class="text-muted">100.0%</td>
            <td><span class="pill pill-green">0.0%</span></td>
            ${totalRebalCols}
          </tr>
        </tfoot>
      `;

      divSummaryTable.innerHTML = `
        <thead>
          <tr>
            <th class="left">${esc(t('th_division'))}</th>
            <th class="left">${esc(t('th_category'))}</th>
            <th class="left">${esc(t('th_actual_vs_target'))}</th>
            <th>${esc(afterTaxMode() ? t('th_after_tax_current_value') : t('th_current_value'))}</th>
            <th>${esc(t('th_actual_pct'))}</th>
            <th>${esc(t('th_target_pct'))}</th>
            <th>${esc(t('th_drift'))}</th>
            ${rebalanceMode ? `<th>${esc(t('th_target_value'))}</th><th>${esc(t(tradeNeededLabelKey()))}</th><th>${esc(t('th_simulated_after'))}</th>` : ''}
          </tr>
        </thead>
        <tbody>${divSummaryRows}</tbody>
        ${totalRowHtml}
      `;
    }

    renderDivisionCards();
    initSortableTables();
  }

  function dragHandleHtml(isGrp) {
    if (isGrp) return '';
    return `<span class="drag-handle" title="Drag row to reorder">⋮⋮</span>`;
  }

  function orderedKeys(obj, preferred) {
    const keys = Object.keys(obj || {});
    if (!Array.isArray(preferred) || preferred.length === 0) return keys;
    const keySet = new Set(keys);
    const out = [];
    const seen = new Set();
    for (const k of preferred) {
      if (keySet.has(k) && !seen.has(k)) {
        out.push(k);
        seen.add(k);
      }
    }
    for (const k of keys) {
      if (!seen.has(k)) {
        out.push(k);
        seen.add(k);
      }
    }
    return out;
  }

  function isManualSymbol(sym) {
    const def = appState && appState.symbols && appState.symbols.symbols && appState.symbols.symbols[sym];
    return !!(def && def.exchange === 'MANUAL');
  }

  function formatSecurityNameHtml(symbol, symbolName) {
    const sym = String(symbol || '');
    const desc = String(symbolName || '').trim();
    const showDesc = !rebalanceMode && desc && desc.toLowerCase() !== sym.trim().toLowerCase();
    return `<b title="${esc(desc || sym)}">${esc(sym)}</b>${showDesc ? `<span class="text-muted" style="font-size:12.5px;margin-left:4px;">${esc(desc)}</span>` : ''}`;
  }

  function getAccountBucketName(accName) {
    if (!accName) return '';
    const cfgAcc = ((currentPortfolioConfig && currentPortfolioConfig.accounts) || []).find(a => a.name === accName);
    if (cfgAcc && cfgAcc.bucket) return cfgAcc.bucket;
    const evalAcc = ((currentEval && currentEval.account_summaries) || []).find(a => a.account === accName);
    return (evalAcc && evalAcc.bucket) || '';
  }

  function getPortfolioBucketNames(includeOther = false) {
    const seen = new Set(['retirement']);
    const list = ['Retirement'];
    const addName = (name) => {
      const clean = String(name || '').trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      if (lower === 'other' && !includeOther) return;
      if (seen.has(lower)) return;
      seen.add(lower);
      list.push(clean);
    };
    ((currentPortfolioConfig && currentPortfolioConfig.buckets) || []).forEach(b => addName(b.name));
    ((currentEval && currentEval.bucket_summaries) || []).forEach(b => addName(b.bucket));
    ((currentPortfolioConfig && currentPortfolioConfig.accounts) || []).forEach(a => addName(a.bucket));
    ((currentPortfolioConfig && currentPortfolioConfig.holdings) || []).forEach(x => addName(x.bucket));
    if (includeOther && !seen.has('other')) {
      list.push('Other');
    }
    return list;
  }

  function buildAccountBucketOptionsHtml() {
    let opts = `<option value="">— None (fall back to Other) —</option>`;
    getPortfolioBucketNames(false).forEach(bn => {
      opts += `<option value="${esc(bn)}">${esc(bn)}</option>`;
    });
    return opts;
  }

  function buildPositionBucketOptionsHtml(accName) {
    const accB = getAccountBucketName(accName);
    const inheritTarget = accB || 'Other';
    let opts = `<option value="">Inherit from Account (${esc(inheritTarget)})</option>`;
    getPortfolioBucketNames(true).forEach(bn => {
      opts += `<option value="${esc(bn)}">${esc(bn)}</option>`;
    });
    return opts;
  }

  function buildDivisionOnlyOptionsHtml() {
    const divNames = new Set();
    ((currentEval && currentEval.divisions) || []).forEach(d => divNames.add(d.division_name));
    ((appState && appState.divisions && appState.divisions.divisions) || []).forEach(d => divNames.add(d.name));
    const strat = (currentPortfolioConfig && currentPortfolioConfig.strategy) || {};
    Object.keys(strat.divisions || {}).forEach(dn => divNames.add(dn));
    Object.values(strat.category_splits || {}).forEach(m => Object.keys(m || {}).forEach(dn => divNames.add(dn)));

    let opts = `<option value="">Use Symbol Default</option>`;
    opts += `<option value="__none__">None (Exclude from Allocation)</option>`;
    Array.from(divNames).forEach(dn => {
      opts += `<option value="${esc(dn)}">${esc(tTerm(dn))}</option>`;
    });
    return opts;
  }

  function updateModalDivisionVisibility(accName, explicitBucket, wrapId, noteId) {
    const effBucket = (explicitBucket || getAccountBucketName(accName) || 'Other').trim().toLowerCase();
    const isRet = effBucket === 'retirement';
    const wrapEl = document.getElementById(wrapId);
    const noteEl = document.getElementById(noteId);
    if (wrapEl) wrapEl.classList.toggle('hidden', !isRet);
    if (noteEl) noteEl.classList.toggle('hidden', isRet);
    return isRet;
  }

  function applyPositionBucketAndDivision(h, accName, bucketVal, divVal) {
    if (!h) return;
    const cleanBucket = String(bucketVal || '').trim();
    if (cleanBucket) {
      h.bucket = cleanBucket;
    } else {
      delete h.bucket;
    }
    const effBucket = (cleanBucket || getAccountBucketName(accName) || 'Other').trim().toLowerCase();
    if (effBucket === 'retirement') {
      if (divVal === '__none__') {
        h.no_division = true;
        delete h.division;
        delete h.divisions;
      } else if (divVal) {
        delete h.no_division;
        h.division = divVal;
        delete h.divisions;
      } else {
        delete h.no_division;
        delete h.division;
        delete h.divisions;
      }
    } else {
      delete h.no_division;
      delete h.division;
      delete h.divisions;
    }
  }

  function renderEditableSharesCell(holdingID, shares, symbol, account, isGrp) {
    if (isManualSymbol(symbol)) return `<span class="text-muted">—</span>`;
    if (isGrp) return `<span>${fmtNum(shares)}</span>`;
    return `
      <input type="text" inputmode="decimal" class="inline-num"
             value="${round4(shares)}"
             onchange="onQuickChangeShares('${holdingID}', this.value)"
             title="${esc(t('title_edit_shares', { sym: symbol }))} (${esc(account)})" />
    `;
  }

  function renderManualOrValueCell(holdingID, symbol, shares, sharePrice, marketValueCAD, currency, isGrp) {
    if (!isManualSymbol(symbol) || isGrp) {
      return `<b>${fmtMoney(marketValueCAD)}</b>`;
    }
    const nativeAmount = round4(shares * sharePrice);
    const formatted = fmtMoney(nativeAmount);
    const cadHint = currency === 'USD' ? `<div class="text-muted" style="font-size:11px;">${fmtMoney(marketValueCAD)}</div>` : '';
    return `<input type="text" inputmode="decimal" class="inline-num" style="font-weight:700;"
      value="${esc(formatted)}" data-raw="${Math.round(nativeAmount)}" data-formatted="${esc(formatted)}"
      onfocus="this.value=this.dataset.raw;this.select();"
      onblur="if(this.value===this.dataset.raw){this.value=this.dataset.formatted;}"
      onchange="onQuickChangeManualAmount('${holdingID}', this.dataset.sym, this.value)"
      data-sym="${esc(symbol)}"
      title="Edit amount (${esc(currency)})" />${cadHint}`;
  }

  function renderDivisionCards() {
    const e = currentEval;
    const container = document.getElementById('divisionCardsContainer');
    if (!container || !e) return;
    const isGrp = isGroupSelection(selectedPortfolio);

    container.innerHTML = (e.divisions || []).map((div, idx) => {
      const color = DIVISION_COLORS[idx % DIVISION_COLORS.length];
      const rowsHtml = (div.rows || []).map(r => {
        const compBadge = r.is_composite_slice
          ? `<span class="pill pill-primary" style="margin-left:6px;" title="${esc(t('comp_slice_title', { pct: fmtPct(r.division_weight, 1), shares: round4(r.total_holding_shares), sym: r.symbol }))}">${esc(t('comp_slice_badge', { pct: fmtPct(r.division_weight, 1), sym: r.symbol }))}</span>`
          : '';

        const rebalCells = rebalanceMode ? `
          <td class="center">
            <input type="checkbox" ${r.is_rebalance_target ? 'checked' : ''}
                   onchange="onToggleRebalanceTarget('${r.holding_id}', '${esc(div.division_name)}', this.checked)"
                   title="${esc(t('title_route_rebal', { div: tTerm(div.division_name) }))}" />
          </td>
          <td class="${r.amount_to_buy_cad > 0.5 ? 'text-green' : (r.amount_to_buy_cad < -0.5 ? 'text-red' : 'text-muted')}">
            ${r.is_rebalance_target ? fmtSignedMoney(r.amount_to_buy_cad) : '—'}
          </td>
          <td class="${r.calculated_shares_buy > 0.05 ? 'text-green' : (r.calculated_shares_buy < -0.05 ? 'text-red' : 'text-muted')}">
            ${r.is_rebalance_target ? fmtSignedNum(r.calculated_shares_buy, 1) : '—'}
          </td>
          <td>
            <input type="text" inputmode="decimal" class="inline-num" style="color:var(--primary);"
                   value="${round4(r.proposed_shares_buy / (r.division_weight || 1))}"
                   onchange="onQuickChangeProposed('${r.holding_id}', this.value)"
                   title="${esc(t('title_sim_shares', { sym: r.symbol }))}" />
          </td>
          <td><b>${fmtMoney(r.after_value_cad)}</b></td>
        ` : '';

        const accCellHtml = `<b>${esc(r.account)}</b>`;

        return `
          <tr data-holding-id="${esc(r.holding_id)}" oncontextmenu="openPositionContextMenu(event, this.dataset.holdingId)">
            <td class="left">${dragHandleHtml(isGrp)}${accCellHtml}</td>
            <td class="left">
              ${formatSecurityNameHtml(r.symbol, r.symbol_name)}
              ${compBadge}
            </td>
            <td class="text-muted">${fmtPrice(r.share_price)} <span style="font-size:11px;">${esc(r.currency)}</span></td>
            <td>${renderEditableSharesCell(r.holding_id, r.total_holding_shares, r.symbol, r.account, isGrp)}</td>
            <td><b>${fmtMoney(r.market_value_cad)}</b></td>
            <td>${fmtPct(r.current_ratio, 1)}</td>
            ${!rebalanceMode ? `
              <td class="text-muted" title="${esc(t('mer_tax_tooltip', { mer: fmtPct(r.mer, 2), tax: fmtPct(r.tax, 2) }))}" style="cursor:help;">${fmtPct(r.mer_plus_tax, 2)}</td>
            ` : ''}
            ${rebalCells}
          </tr>
        `;
      }).join('');

      const rebalHeaderInfo = rebalanceMode ? `
        <div><span class="text-muted">${esc(t('lbl_target_colon'))}</span> <b>${fmtMoney(div.target_value_cad)}</b></div>
        <div><span class="text-muted">${esc(t('lbl_trade_needed_colon'))}</span> <span class="text-muted" style="font-size:10px;margin-left:2px;">${esc(t(afterTaxMode() ? 'lbl_gross_trade_needed_colon' : 'lbl_trade_needed_colon'))}</span> <span class="${div.amount_to_buy_cad >= 0 ? 'text-green' : 'text-red'}">${fmtSignedMoney(div.amount_to_buy_cad)}</span></div>
      ` : '';

      const cardKey = `div:${div.division_name}`;
      const isCollapsed = collapsedCards.has(cardKey);
      return `
        <div class="div-card${isCollapsed ? ' collapsed' : ''}" data-division="${esc(div.division_name)}" data-card-key="${esc(cardKey)}">
          <div class="div-card-header" onclick="onDivCardHeaderClick(event)">
            <div class="div-title-group">
              ${dragHandleHtml(isGrp)}
              <span class="card-chevron">▾</span>
              <span class="legend-dot" style="background:${color};width:12px;height:12px;"></span>
              <span style="font-size:15px;font-weight:700;">${esc(tTerm(div.division_name))}</span>
              <span class="pill pill-neutral">${esc(tTerm(div.category_name))}</span>
            </div>
            <div class="div-metrics-group">
              <div><span class="text-muted">${esc(t('lbl_value_colon'))}</span> <b>${fmtMoney(div.current_value_cad)}</b></div>
              <div><span class="text-muted">${esc(t('lbl_weight_colon'))}</span> <b>${fmtPct(div.current_ratio, 1)}</b> <span class="text-muted">/ ${fmtPct(div.target_ratio, 1)} ${esc(t('lbl_target_suffix'))}</span></div>
              ${rebalHeaderInfo}
            </div>
          </div>
          <div class="div-card-body" style="overflow-x:auto;">
            <table class="table-clean" data-sort-table="div_${esc(div.division_name)}" data-drag-scope="holdings">
              <thead>
                <tr>
                  <th class="left" title="Brokerage or registered account holding this position">${esc(t('th_account'))}</th>
                  <th class="left" title="Security ticker and description">${esc(t('th_security'))}</th>
                  <th title="Latest market quote and trading currency">${esc(t('th_price'))}</th>
                  <th title="Number of shares allocated to this division">${esc(t('th_shares'))}</th>
                  <th title="Market value in Canadian Dollars">${esc(t('th_value_cad'))}</th>
                  <th title="Percentage of total portfolio market value">${esc(t('th_portfolio_pct'))}</th>
                  ${!rebalanceMode ? `<th title="Management Expense Ratio plus estimated foreign withholding tax drag per year">${esc(t('th_mer_plus_tax'))}</th>` : ''}
                  ${rebalanceMode ? `
                    <th class="center" title="Target rebalancing status for this position">${esc(t('th_rebal_target') || 'Target')}</th>
                    <th title="Recommended transaction dollar amount needed to reach target allocation">${esc(t(afterTaxMode() ? 'th_gross_trade_needed' : 'th_target_trade_dollar'))}</th>
                    <th title="Recommended integer share trade generated by the rebalancing solver">${esc(t('th_rec_shares'))}</th>
                    <th title="Simulated trade in shares (editable during simulation)">${esc(t('th_sim_trade_sh'))}</th>
                    <th title="Projected market value after simulated trades are applied">${esc(t('th_after_value'))}</th>
                  ` : ''}
                </tr>
              </thead>
              <tbody>${rowsHtml || `<tr><td colspan="${!rebalanceMode ? 7 : 11}" class="center text-muted">${esc(t('empty_division'))}</td></tr>`}</tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');
    updateCollapseAllButton('divisionCardsContainer');
  }

  let classificationStrategyMode = false;
  try {
    classificationStrategyMode = localStorage.getItem('embsay_cls_strat_mode') === 'true';
  } catch (e) {}

  function toggleClassificationStrategyMode() {
    classificationStrategyMode = !classificationStrategyMode;
    try {
      localStorage.setItem('embsay_cls_strat_mode', classificationStrategyMode ? 'true' : 'false');
    } catch (e) {}
    const toggleEl = document.getElementById('classificationStrategyToggle');
    if (toggleEl) {
      toggleEl.classList.toggle('active', classificationStrategyMode);
    }
    renderClassificationCards();
    initSortableTables();
  }

  function renderClassificationView() {
    renderKpiGrids();
    renderClassificationSummaryTable();
    renderTaxLocationTable();
    const toggleEl = document.getElementById('classificationStrategyToggle');
    if (toggleEl) {
      toggleEl.classList.toggle('active', classificationStrategyMode);
    }
    renderClassificationCards();
    initSortableTables();
  }

  function renderClassificationCards() {
    const e = currentEval;
    const container = document.getElementById('classificationCardsContainer');
    if (!container || !e) return;
    const isGrp = isGroupSelection(selectedPortfolio);

    container.innerHTML = (e.classification_summaries || []).map((cls, idx) => {
      const color = DIVISION_COLORS[idx % DIVISION_COLORS.length];

      if (classificationStrategyMode) {
        // Divided by Strategy Target (Option 3)
        const normClsType = (cls.account_type || 'non_registered').toLowerCase();
        const clsTotalVal = afterTaxMode() ? (cls.allocation_value_cad ?? cls.market_value_cad) : cls.market_value_cad;

        const divSections = [];
        const seenHoldingIds = new Set();

        (e.divisions || []).forEach((div, divIdx) => {
          const divColor = DIVISION_COLORS[divIdx % DIVISION_COLORS.length];
          const divSlices = (div.rows || []).filter(r => (r.account_type || 'non_registered').toLowerCase() === normClsType);
          if (divSlices.length === 0) return;

          divSlices.forEach(s => seenHoldingIds.add(s.holding_id));
          const divValInCls = divSlices.reduce((sum, s) => sum + (afterTaxMode() ? (s.allocation_value_cad ?? s.market_value_cad) : s.market_value_cad), 0);
          const pctOfCls = clsTotalVal > 0 ? (divValInCls / clsTotalVal) : 0;
          const pctOfPort = e.current_total_cad > 0 ? (divValInCls / e.current_total_cad) : 0;
          const targetPct = div.target_ratio || 0;

          const subRowsHtml = divSlices.map(s => {
            const accCellHtml = `<b>${esc(s.account)}</b>`;
            const slicePortPct = e.current_total_cad > 0 ? (s.market_value_cad / e.current_total_cad) : 0;
            const compPill = s.is_composite_slice ? `<span class="pill pill-neutral" style="margin-left:6px;font-size:11px;">${fmtPct(s.division_weight, 0)} ${esc(s.symbol)}</span>` : '';

            return `
              <tr data-holding-id="${esc(s.holding_id)}">
                <td class="left wrap-text">${dragHandleHtml(isGrp)}${accCellHtml}</td>
                <td class="left wrap-text">
                  ${formatSecurityNameHtml(s.symbol, s.symbol_name)}
                  ${compPill}
                </td>
                <td class="text-muted">${fmtPrice(s.share_price)} <span style="font-size:11px;">${esc(s.currency)}</span></td>
                <td>${renderEditableSharesCell(s.holding_id, s.total_holding_shares, s.symbol, s.account, isGrp)}</td>
                <td><b>${fmtMoney(s.market_value_cad)}</b></td>
                <td>${fmtPct(slicePortPct, 1)}</td>
              </tr>
            `;
          }).join('');

          const drift = pctOfCls - targetPct;
          const driftThreshold = (appState.config && appState.config.drift_threshold > 0) ? appState.config.drift_threshold : 0.01;
          const isOverDrift = Math.abs(drift) >= driftThreshold;
          const driftPill = `<span class="pill ${isOverDrift ? 'pill-red' : 'pill-green'}" style="font-weight:600;">${esc(t('lbl_drift') || 'Drift')}: ${fmtSignedPct(drift, 1)}</span>`;

          divSections.push(`
            <div class="cls-div-header" style="border-left-color:${divColor};">
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="legend-dot" style="background:${divColor};width:10px;height:10px;"></span>
                <span style="font-weight:700;font-size:13.5px;">${esc(tTerm(div.division_name))}</span>
                <span class="pill pill-neutral" style="font-size:11px;">${esc(tTerm(div.category_name))}</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;font-size:12.5px;flex-wrap:wrap;">
                <span><b>${fmtMoney(divValInCls)}</b> <span class="text-muted">(${fmtPct(pctOfCls, 1)})</span></span>
                <span class="pill pill-neutral" style="font-weight:600;">${esc(t('lbl_target'))}: ${fmtPct(targetPct, 1)}</span>
                ${driftPill}
              </div>
            </div>
            <div style="overflow-x:auto;margin-bottom:12px;">
              <table class="table-clean" style="table-layout:fixed;width:100%;" data-sort-table="cls_${esc(cls.account_type)}_${esc(div.division_name)}" data-drag-scope="holdings">
                <colgroup>
                  <col style="width:185px;">
                  <col>
                  <col style="width:110px;">
                  <col style="width:105px;">
                  <col style="width:125px;">
                  <col style="width:115px;">
                </colgroup>
                <thead>
                  <tr>
                    <th class="left wrap-text" style="width:185px;">${esc(t('th_account'))}</th>
                    <th class="left wrap-text">${esc(t('th_security'))}</th>
                    <th style="width:110px;">${esc(t('th_price'))}</th>
                    <th style="width:105px;">${esc(t('th_shares'))}</th>
                    <th style="width:125px;">${esc(t('th_value_cad'))}</th>
                    <th style="width:115px;">${esc(t('th_portfolio_pct'))}</th>
                  </tr>
                </thead>
                <tbody>${subRowsHtml}</tbody>
              </table>
            </div>
          `);
        });

        // Unassigned holdings if any
        const unassigned = (cls.holdings || []).filter(h => !seenHoldingIds.has(h.holding_id));
        if (unassigned.length > 0) {
          const unassignedVal = unassigned.reduce((sum, h) => sum + (afterTaxMode() ? (h.allocation_value_cad ?? h.market_value_cad) : h.market_value_cad), 0);
          const unassignedRows = unassigned.map(h => {
            const accCellHtml = `<b>${esc(h.account)}</b>`;
            const portDenom = (e.has_excluded_accounts && e.net_worth_cad > 0) ? e.net_worth_cad : e.current_total_cad;
        const portPct = portDenom > 0 ? (h.market_value_cad / portDenom) : 0;
            return `
              <tr data-holding-id="${esc(h.holding_id)}">
                <td class="left wrap-text">${dragHandleHtml(isGrp)}${accCellHtml}</td>
                <td class="left wrap-text">
                  ${formatSecurityNameHtml(h.symbol, h.symbol_name)}
                </td>
                <td class="text-muted">${isManualSymbol(h.symbol) ? '—' : `${fmtPrice(h.share_price)} <span style="font-size:11px;">${esc(h.currency)}</span>`}</td>
                <td>${renderEditableSharesCell(h.holding_id, h.shares, h.symbol, h.account, isGrp)}</td>
                <td>${renderManualOrValueCell(h.holding_id, h.symbol, h.shares, h.share_price, h.market_value_cad, h.currency, isGrp)}</td>
                <td>${fmtPct(portPct, 1)}</td>
              </tr>
            `;
          }).join('');

          divSections.push(`
            <div class="cls-div-header" style="border-left-color:var(--text-muted);">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-weight:700;font-size:13.5px;">Unassigned</span>
              </div>
              <div style="font-size:12.5px;">
                <span><b>${fmtMoney(unassignedVal)}</b></span>
              </div>
            </div>
            <div style="overflow-x:auto;margin-bottom:12px;">
              <table class="table-clean" style="table-layout:fixed;width:100%;" data-drag-scope="holdings">
                <colgroup>
                  <col style="width:185px;">
                  <col>
                  <col style="width:110px;">
                  <col style="width:105px;">
                  <col style="width:125px;">
                  <col style="width:115px;">
                </colgroup>
                <thead>
                  <tr>
                    <th class="left wrap-text" style="width:185px;">${esc(t('th_account'))}</th>
                    <th class="left wrap-text">${esc(t('th_security'))}</th>
                    <th style="width:110px;">${esc(t('th_price'))}</th>
                    <th style="width:105px;">${esc(t('th_shares'))}</th>
                    <th style="width:125px;">${esc(t('th_value_cad'))}</th>
                    <th style="width:115px;">${esc(t('th_portfolio_pct'))}</th>
                  </tr>
                </thead>
                <tbody>${unassignedRows}</tbody>
              </table>
            </div>
          `);
        }

        const bodyContent = divSections.length > 0
          ? divSections.join('')
          : `<div class="center text-muted" style="padding:16px;">${esc(t('empty_classification'))}</div>`;

        const clsCardKey = `cls:${cls.account_type || cls.name}`;
        const clsCollapsed = collapsedCards.has(clsCardKey);
        return `
          <div class="div-card${clsCollapsed ? ' collapsed' : ''}" data-card-key="${esc(clsCardKey)}">
            <div class="div-card-header" onclick="onDivCardHeaderClick(event)">
              <div class="div-title-group">
                <span class="card-chevron">▾</span>
                <span class="legend-dot" style="background:${color};width:12px;height:12px;"></span>
                <span style="font-size:15px;font-weight:700;">${esc(tTerm(cls.name))}</span>
              </div>
              <div class="div-metrics-group">
                <div><span class="text-muted">${esc(t('lbl_positions_colon'))}</span> <b>${cls.position_count}</b></div>
                <div><span class="text-muted">${esc(t('lbl_value_colon'))}</span> <b>${fmtMoney(cls.market_value_cad)}</b></div>
                <div><span class="text-muted">${esc(t('lbl_portfolio_weight_colon'))}</span> <b>${fmtPct(cls.portfolio_ratio, 1)}</b></div>
              </div>
            </div>
            <div class="div-card-body">${bodyContent}</div>
          </div>
        `;
      }

      // Standard Flat Table Mode
      const rowsHtml = (cls.holdings || []).map(h => {
        const breakdownPills = Object.entries(h.division_breakdown || {})
          .map(([d, w]) => `<span class="pill pill-neutral" style="margin-right:4px;">${esc(tTerm(d))}: ${fmtPct(w, 1)}</span>`)
          .join('');
        const accCellHtml = `<b>${esc(h.account)}</b>`;
        const portDenom = (e.has_excluded_accounts && e.net_worth_cad > 0) ? e.net_worth_cad : e.current_total_cad;
        const portPct = portDenom > 0 ? (h.market_value_cad / portDenom) : 0;

        return `
          <tr data-holding-id="${esc(h.holding_id)}">
            <td class="left">${dragHandleHtml(isGrp)}${accCellHtml}</td>
            <td class="left wrap-text" style="max-width:260px;">
              ${formatSecurityNameHtml(h.symbol, h.symbol_name)}
            </td>
            <td class="left wrap-text" style="line-height:1.7;">${breakdownPills || '<span class="text-muted" style="font-size:12px;">—</span>'}</td>
            <td class="text-muted">${isManualSymbol(h.symbol) ? '—' : `${fmtPrice(h.share_price)} <span style="font-size:11px;">${esc(h.currency)}</span>`}</td>
            <td>${renderEditableSharesCell(h.holding_id, h.shares, h.symbol, h.account, isGrp)}</td>
            <td>${renderManualOrValueCell(h.holding_id, h.symbol, h.shares, h.share_price, h.market_value_cad, h.currency, isGrp)}</td>
            <td>${fmtPct(portPct, 1)}</td>
          </tr>
        `;
      }).join('');

      const clsCardKey = `cls:${cls.account_type || cls.name}`;
      const clsCollapsed = collapsedCards.has(clsCardKey);
      return `
        <div class="div-card${clsCollapsed ? ' collapsed' : ''}" data-card-key="${esc(clsCardKey)}">
          <div class="div-card-header" onclick="onDivCardHeaderClick(event)">
            <div class="div-title-group">
              ${dragHandleHtml(isGrp)}
              <span class="card-chevron">▾</span>
              <span class="legend-dot" style="background:${color};width:12px;height:12px;"></span>
              <span style="font-size:15px;font-weight:700;">${esc(tTerm(cls.name))}</span>
            </div>
            <div class="div-metrics-group">
              <div><span class="text-muted">${esc(t('lbl_positions_colon'))}</span> <b>${cls.position_count}</b></div>
              <div><span class="text-muted">${esc(t('lbl_value_colon'))}</span> <b>${fmtMoney(cls.market_value_cad)}</b></div>
              <div><span class="text-muted">${esc(t('lbl_portfolio_weight_colon'))}</span> <b>${fmtPct(cls.portfolio_ratio, 1)}</b></div>
            </div>
          </div>
          <div class="div-card-body" style="overflow-x:auto;">
            <table class="table-clean" data-sort-table="cls_${esc(cls.account_type)}" data-drag-scope="holdings">
              <thead>
                <tr>
                  <th class="left">${esc(t('th_account'))}</th>
                  <th class="left wrap-text" style="max-width:260px;">${esc(t('th_security'))}</th>
                  <th class="left wrap-text">${esc(t('th_div_mapping'))}</th>
                  <th>${esc(t('th_price'))}</th>
                  <th>${esc(t('th_shares'))}</th>
                  <th>${esc(t('th_value_cad'))}</th>
                  <th>${esc(t('th_portfolio_pct'))}</th>
                </tr>
              </thead>
              <tbody>${rowsHtml || `<tr><td colspan="7" class="center text-muted">${esc(t('empty_classification'))}</td></tr>`}</tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');
    updateCollapseAllButton('classificationCardsContainer');
  }

  function renderAccountView() {
    renderKpiGrids();
    renderAccountSummaryTable();
    renderAccountCards();
    initSortableTables();
  }

  function renderAccountCards() {
    const e = currentEval;
    const container = document.getElementById('accountCardsContainer');
    if (!container || !e) return;
    if (!e.account_summaries || e.account_summaries.length === 0) {
      container.innerHTML = `<div class="card text-muted center" style="padding:24px;">${esc(t('empty_account'))}</div>`;
      return;
    }

    const isGrp = isGroupSelection(selectedPortfolio);
    const showDivMapping = !(appState && appState.config && appState.config.show_account_division_mapping === false);
    const divs = (currentEval && currentEval.divisions && currentEval.divisions.length > 0)
      ? currentEval.divisions.map(d => ({ name: d.division_name, category: d.category_name }))
      : (appState.divisions.divisions || []);

    container.innerHTML = (e.account_summaries || []).map((acc, idx) => {
      const color = DIVISION_COLORS[idx % DIVISION_COLORS.length];
      const posCount = (acc.holdings && acc.holdings.length) || 0;
      const delAccTitle = posCount > 0
        ? `Delete account '${esc(acc.account)}' and its ${posCount} position(s)`
        : `Delete empty account '${esc(acc.account)}'`;

      const cardActionsHtml = !isGrp ? `
        <div class="card-menu-wrap">
          <button type="button" class="btn btn-sm btn-ghost card-menu-btn"
                  onclick="toggleAccountCardMenu(event, this)"
                  title="Account actions" aria-haspopup="true" aria-expanded="false">⋯</button>
          <div class="card-menu hidden" role="menu">
            <button type="button" class="card-menu-item" role="menuitem"
                    onclick="closeAllAccountMenus(); openAddPositionModal(this.closest('.div-card').dataset.account)">
              + Add Position
            </button>
            <button type="button" class="card-menu-item" role="menuitem"
                    onclick="closeAllAccountMenus(); promptRenameAccount(this.closest('.div-card').dataset.account)">
              ✎ Rename Account
            </button>
            <button type="button" class="card-menu-item" role="menuitem"
                    onclick="closeAllAccountMenus(); openChangeAccountBucketModal(this.closest('.div-card').dataset.account)">
              🏷 Change Bucket…
            </button>
            <button type="button" class="card-menu-item" role="menuitem"
                    onclick="closeAllAccountMenus(); toggleAccountExcludeFromRebalance(this.closest('.div-card').dataset.account)">
              ${acc.excluded_from_rebalancing ? '✓ Include in Allocation' : '⊘ Exclude from Allocation'}
            </button>
            <div class="card-menu-sep"></div>
            <button type="button" class="card-menu-item danger" role="menuitem"
                    onclick="closeAllAccountMenus(); deleteAccount(this.closest('.div-card').dataset.account)"
                    title="${delAccTitle}">
              ✕ Delete Account
            </button>
          </div>
        </div>
      ` : '';

      const rowsHtml = (acc.holdings || []).map(h => {
        const breakdownPills = Object.entries(h.division_breakdown || {})
          .map(([d, w]) => `<span class="pill pill-neutral" style="margin-right:4px;" title="${esc(tTerm(d))}: ${fmtPct(w, 1)} target division allocation">${esc(tTerm(d))}: ${fmtPct(w, 1)}</span>`)
          .join('');
        const delHoldingTitle = esc(t('title_delete_position', { sym: h.symbol }) || `Delete position ${h.symbol}`);

        const rebalArr = h.rebalance_divisions || [];
        const mappedDivIDs = Object.keys(h.division_breakdown || {}).filter(k => (h.division_breakdown[k] || 0) > 0);
        const currentRebalVal = rebalArr.length === 0
          ? ''
          : (rebalArr.length === 1 ? rebalArr[0] : rebalArr.join(','));

        let rebalOpts = `<option value="" ${currentRebalVal === '' ? 'selected' : ''}>${esc(t('opt_none'))}</option>`;
        divs.forEach(d => {
          rebalOpts += `<option value="${esc(d.name)}" ${currentRebalVal === d.name ? 'selected' : ''}>${esc(tTerm(d.name))}</option>`;
        });
        if (mappedDivIDs.length > 1) {
          const allMappedVal = mappedDivIDs.join(',');
          rebalOpts += `<option value="${esc(allMappedVal)}" ${currentRebalVal === allMappedVal ? 'selected' : ''}>${esc(t('opt_all_mapped', { count: mappedDivIDs.length }))}</option>`;
        } else if (rebalArr.length > 1) {
          rebalOpts += `<option value="${esc(currentRebalVal)}" selected>${esc(rebalArr.map(tTerm).join(' + '))}</option>`;
        }

        const rebalSelectHtml = !isGrp ? `
          <select class="select-clean" style="padding:2px 4px;font-size:12px;max-width:140px;"
                  onchange="onSelectRebalanceTarget('${h.holding_id}', this.value)">
            ${rebalOpts}
          </select>
        ` : `<span>${esc(currentRebalVal || '—')}</span>`;

        const effBucket = h.bucket || 'Other';
        const isRetBucket = effBucket.toLowerCase() === 'retirement' && !acc.excluded_from_rebalancing;
        const bucketBadgeHtml = h.bucket_inherited
          ? `<span class="text-muted" style="font-size:11.5px;margin-right:4px;" title="Inherited bucket from account">↳ ${esc(effBucket)}</span>`
          : `<span class="pill pill-primary" style="margin-right:4px;" title="Position bucket override: ${esc(effBucket)}">${esc(effBucket)}</span>`;
        const divBucketCellHtml = [bucketBadgeHtml, isRetBucket ? breakdownPills : ''].filter(Boolean).join('');
        const secLabelHtml = !isGrp
          ? `<span class="sec-edit-link" onclick="openEditPositionModal(this.closest('tr').dataset.holdingId)" title="Edit or delete ${esc(h.symbol)}">
               ${formatSecurityNameHtml(h.symbol, h.symbol_name)}
             </span>`
          : formatSecurityNameHtml(h.symbol, h.symbol_name);

        return `
          <tr data-holding-id="${esc(h.holding_id)}" oncontextmenu="openPositionContextMenu(event, this.dataset.holdingId)">
            <td class="left wrap-text">
              ${dragHandleHtml(isGrp)}${secLabelHtml}
            </td>
            ${showDivMapping ? `<td class="left wrap-text" style="line-height:1.7;">${divBucketCellHtml || '<span class="text-muted" style="font-size:12px;">—</span>'}</td>` : ''}
            <td class="text-muted">${isManualSymbol(h.symbol) ? '—' : `${fmtPrice(h.share_price)} <span style="font-size:11px;">${esc(h.currency)}</span>`}</td>
            <td>${renderEditableSharesCell(h.holding_id, h.shares, h.symbol, acc.account, isGrp)}</td>
            <td>${renderManualOrValueCell(h.holding_id, h.symbol, h.shares, h.share_price, h.market_value_cad, h.currency, isGrp)}</td>
          </tr>
        `;
      }).join('');

      const colSpan = showDivMapping ? 5 : 4;

      const accCardKey = `acc:${acc.account}`;
      const accCollapsed = collapsedCards.has(accCardKey);
      return `
        <div class="div-card${accCollapsed ? ' collapsed' : ''}" data-card-key="${esc(accCardKey)}" data-account="${esc(acc.account)}" data-account-type="${esc(acc.account_type || '')}">
          <div class="div-card-header" onclick="onDivCardHeaderClick(event)">
            <div class="div-title-group" style="display:flex;align-items:center;gap:6px;">
              ${dragHandleHtml(isGrp)}
              <span class="card-chevron">▾</span>
              <span class="legend-dot" style="background:${color};width:12px;height:12px;"></span>
              <span style="font-size:15px;font-weight:700;">${esc(acc.account)}</span>
              ${acc.bucket
                ? `<span class="pill ${acc.bucket.toLowerCase() === 'retirement' ? 'pill-primary' : 'pill-neutral'}" style="font-size:11px;" title="Account bucket">${esc(acc.bucket)}</span>`
                : ''}
              ${acc.excluded_from_rebalancing ? `<span class="pill pill-neutral" style="font-size:11px;" title="Included in Net Worth & Retirement total, excluded from allocation targets">Excluded from Allocation</span>` : ''}
            </div>
            <div class="div-metrics-group" style="display:flex;align-items:center;gap:12px;">
              <div><span class="text-muted">${esc(t('lbl_value_colon'))}</span> <b>${fmtMoney(acc.market_value_cad)}</b></div>
              <div><span class="text-muted">${esc(t('lbl_portfolio_weight_colon'))}</span> <b>${fmtPct(acc.portfolio_ratio, 1)}</b></div>
              ${cardActionsHtml}
            </div>
          </div>
          <div class="div-card-body" style="overflow-x:auto;">
            <table class="table-clean" style="table-layout:fixed;width:100%;" data-sort-table="acc_${esc(acc.account)}" data-drag-scope="holdings" data-account="${esc(acc.account)}">
              <colgroup>
                <col>
                ${showDivMapping ? '<col style="width:260px;">' : ''}
                <col style="width:110px;">
                <col style="width:105px;">
                <col style="width:125px;">
              </colgroup>
              <thead>
                <tr>
                  <th class="left" title="Ticker symbol and asset description">${esc(t('th_security'))}</th>
                  ${showDivMapping ? `<th class="left" title="Asset allocation breakdown across portfolio divisions">${esc(t('th_div_mapping'))}</th>` : ''}
                  <th title="Latest market quote and trading currency">${esc(t('th_price'))}</th>
                  <th title="Share quantity held in this account (editable)">${esc(t('th_shares'))}</th>
                  <th title="Total market value converted to Canadian Dollars">${esc(t('th_value_cad'))}</th>
                </tr>
              </thead>
              <tbody>${rowsHtml || `<tr><td colspan="${colSpan}" class="center text-muted" style="padding:20px;">No positions in ${esc(acc.account)}. <button class="btn btn-sm btn-primary" style="margin-left:8px;" onclick="openAddPositionModal(this.closest('.div-card').dataset.account)">+ Add Position</button></td></tr>`}</tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');
    updateCollapseAllButton('accountCardsContainer');
  }

  function renderClassificationSummaryTable() {
    const e = currentEval;
    const clsEl = document.getElementById('classificationSummaryTable');
    if (!clsEl || !e) return;
    const isGrp = isGroupSelection(selectedPortfolio);
    clsEl.dataset.dragScope = 'classificationOrder';
    clsEl.innerHTML = `
      <thead>
        <tr>
          <th class="left">${esc(t('th_classification'))}</th>
          <th>${esc(t('th_positions'))}</th>
          <th>${esc(afterTaxMode() ? t('th_allocation_value') : t('th_value_cad'))}</th>
          <th>${esc(t('th_weight'))}</th>
        </tr>
      </thead>
      <tbody>
        ${(e.classification_summaries || []).map(c => `
          <tr data-row-key="${esc(c.account_type)}">
            <td class="left">${dragHandleHtml(isGrp)}<b>${esc(tTerm(c.name))}</b></td>
            <td>${c.position_count}</td>
            <td>
              <b>${fmtMoney(afterTaxMode() ? (c.allocation_value_cad ?? c.market_value_cad) : c.market_value_cad)}</b>
              ${afterTaxMode() ? `<div class="text-muted" title="${esc(t('title_gross_value', { gross: fmtMoney(c.market_value_cad) }))}" style="font-size:11px;font-weight:500;">${esc(t('lbl_value_colon'))} ${fmtMoney(c.market_value_cad)}</div>` : ''}
            </td>
            <td>${fmtPct(c.portfolio_ratio, 1)}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
  }

  function renderAccountSummaryTable() {
    const e = currentEval;
    const accEl = document.getElementById('accountSummaryTable');
    if (!accEl || !e) return;
    const isGrp = isGroupSelection(selectedPortfolio);
    accEl.dataset.dragScope = 'accountOrder';

    const accTypes = (appState && appState.divisions && appState.divisions.account_types) || {};

    accEl.innerHTML = `
      <thead>
        <tr>
          <th class="left">${esc(t('th_account'))}</th>
          <th class="left">${esc(t('th_classification'))}</th>
          <th class="left">Bucket</th>
          <th>${esc(afterTaxMode() ? t('th_allocation_value') : t('th_value_cad'))}</th>
        </tr>
      </thead>
      <tbody>
        ${(e.account_summaries || []).map(a => {
          const accTypeKey = (a.account_type || 'non_registered').toLowerCase();
          const clsLabel = (accTypes[accTypeKey] && accTypes[accTypeKey].name) || a.account_type || 'Non-Registered / Unregistered';
          const bHtml = a.bucket
            ? `<span class="pill ${a.bucket.toLowerCase() === 'retirement' ? 'pill-primary' : 'pill-neutral'}" style="font-size:11px;">${esc(a.bucket)}</span>`
            : `<span class="text-muted">—</span>`;
          return `
          <tr data-row-key="${esc(a.account)}">
            <td class="left">
              ${dragHandleHtml(isGrp)}<b>${esc(a.account)}</b>
              ${!isGrp ? `
                <button class="btn btn-ghost btn-sm" onclick="promptRenameAccount(this.closest('tr').dataset.rowKey)"
                        title="${esc(t('title_rename_account', { acc: a.account }))}"
                        style="padding:0 5px;font-size:11px;margin-left:6px;cursor:pointer;">
                  ✎
                </button>
              ` : ''}
            </td>
            <td class="left"><span class="pill pill-neutral">${esc(tTerm(clsLabel))}</span>${a.excluded_from_rebalancing ? ` <span class="pill pill-neutral" style="font-size:11px;">Excluded from Allocation</span>` : ''}</td>
            <td class="left">${bHtml}</td>
            <td>
              <b>${fmtMoney(afterTaxMode() ? (a.allocation_value_cad ?? a.market_value_cad) : a.market_value_cad)}</b>
              ${afterTaxMode() ? `<div class="text-muted" title="${esc(t('title_gross_value', { gross: fmtMoney(a.market_value_cad) }))}" style="font-size:11px;font-weight:500;">${esc(t('lbl_value_colon'))} ${fmtMoney(a.market_value_cad)}</div>` : ''}
            </td>
          </tr>
        `;
        }).join('')}
      </tbody>
    `;
  }

  function renderTaxLocationTable() {
    const e = currentEval;
    const regEl = document.getElementById('regVsUnregTable');
    if (!regEl || !e) return;
    const driftThreshold = (appState.config && appState.config.drift_threshold > 0) ? appState.config.drift_threshold : 0.01;

    let regHtml = '';
    (e.reg_vs_unreg_summaries || []).forEach(g => {
      regHtml += `
        <tr style="background:var(--bg-subtle);font-weight:700;">
          <td class="left" colspan="2">${esc(tTerm(g.group_name))}</td>
          <td>${fmtMoney(g.total_value_cad)}</td>
          <td colspan="2"></td>
        </tr>
      `;
      (g.category_rows || []).forEach(cr => {
        const isOverDrift = Math.abs(cr.ratio_miss) >= driftThreshold;
        const driftCls = isOverDrift ? 'pill-red' : 'pill-green';
        regHtml += `
          <tr>
            <td class="left" style="padding-left:22px;">${esc(tTerm(cr.category_name))}</td>
            <td class="text-muted">${fmtPct(cr.target_ratio, 0)}</td>
            <td>${fmtMoney(cr.current_value_cad)}</td>
            <td>${fmtPct(cr.current_ratio, 1)}</td>
            <td><span class="pill ${driftCls}">${fmtSignedPct(cr.ratio_miss, 1)}</span></td>
          </tr>
        `;
      });
    });

    regEl.innerHTML = `
      <thead>
        <tr>
          <th class="left">${esc(t('th_bucket_category'))}</th>
          <th>${esc(t('th_target_pct'))}</th>
          <th>${esc(t('th_current_cad'))}</th>
          <th>${esc(t('th_actual_pct'))}</th>
          <th>${esc(t('th_drift'))}</th>
        </tr>
      </thead>
      <tbody>${regHtml}</tbody>
    `;
  }

  function renderAccountAndTaxTables() {
    renderClassificationSummaryTable();
    renderAccountSummaryTable();
    renderTaxLocationTable();
  }



  // --- TAB 3: STRATEGY, DIVISIONS & GROUPS ---

  function renderStrategyAndDivisionsTab() {
    if (!appState || !appState.divisions) return;
    const p = currentPortfolioConfig;
    const strat = (p && p.strategy) ? p.strategy : { mode: 'hierarchical', categories: {}, category_splits: {}, divisions: {} };
    const mode = strat.mode || 'hierarchical';
    const cats = appState.divisions.categories || [];
    const hierDivs = appState.divisions.divisions || [];
    const flatDivs = (currentEval && currentEval.divisions && currentEval.divisions.length > 0)
      ? currentEval.divisions.map(d => ({ name: d.division_name, category: d.category_name }))
      : (strat.divisions && Object.keys(strat.divisions).length > 0
          ? Object.keys(strat.divisions).map(n => ({ name: n, category: n }))
          : hierDivs);

    renderStrategyTab();
    renderConfigTab();
  }

    // --- TAB 3: STRATEGY & DIVISIONS (Per-Portfolio Management) ---

  function initStratDraftIfNeeded() {
    const p = currentPortfolioConfig;
    if (!p) return null;
    if (!window._stratDraft || window._stratDraft._portId !== p.id) {
      window._isEditingStratNotes = false;
      const s = p.strategy || {};
      window._stratDraft = {
        _portId: p.id,
        mode: s.mode || 'flat',
        divisions: { ...(s.divisions || {}) },
        categories: { ...(s.categories || {}) },
        category_splits: JSON.parse(JSON.stringify(s.category_splits || {})),
        notes: [...(s.notes || [])],
        after_tax_allocation: p.after_tax_allocation === true,
        rrsp_withdrawal_tax_rate: (typeof p.rrsp_withdrawal_tax_rate === 'number'
          ? p.rrsp_withdrawal_tax_rate
          : (p.rrsp_withdrawal_tax_rate === 0 ? 0 : null))
      };
      if (window._stratDraft.mode === 'flat' && Object.keys(window._stratDraft.divisions).length === 0) {
        if (currentEval && currentEval.divisions && currentEval.divisions.length > 0) {
          currentEval.divisions.forEach(d => {
            window._stratDraft.divisions[d.division_name] = d.target_ratio || 0;
          });
        }
      }
    }
    return window._stratDraft;
  }

  function syncStratInputsToDraft() {
    const draft = window._stratDraft;
    if (!draft) return;
    const notesEl = document.getElementById('stratNotesInput');
    if (notesEl) {
      draft.notes = notesEl.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    }
    if (draft.mode === 'flat') {
      const nextDivs = {};
      document.querySelectorAll('.strat-div-row').forEach(row => {
        const nameInp = row.querySelector('.strat-div-name-input');
        const pctInp = row.querySelector('.strat-flat-pct-input');
        const name = nameInp ? nameInp.value.trim() : '';
        const pct = pctInp ? (parseFloat(pctInp.value) || 0) / 100.0 : 0;
        if (name) nextDivs[name] = pct;
      });
      draft.divisions = nextDivs;
    } else {
      const nextCats = {};
      const catRenames = {};
      document.querySelectorAll('.strat-cat-row').forEach(row => {
        const oldCat = row.dataset.cat;
        const nameInp = row.querySelector('.strat-cat-name-input');
        const newCat = nameInp ? nameInp.value.trim() : oldCat;
        const pctInp = row.querySelector('.strat-cat-pct-input');
        const pct = pctInp ? (parseFloat(pctInp.value) || 0) / 100.0 : 0;
        if (newCat) {
          nextCats[newCat] = pct;
          if (oldCat && newCat !== oldCat) catRenames[oldCat] = newCat;
        }
      });
      draft.categories = nextCats;
      for (const [oldCat, newCat] of Object.entries(catRenames)) {
        if (draft.category_splits && draft.category_splits[oldCat]) {
          draft.category_splits[newCat] = draft.category_splits[oldCat];
          delete draft.category_splits[oldCat];
        }
      }
      document.querySelectorAll('.strat-split-row').forEach(row => {
        const rawCat = row.dataset.cat;
        const c = catRenames[rawCat] || rawCat;
        const d = row.dataset.div;
        const pctInp = row.querySelector('.strat-split-pct-input');
        const pct = pctInp ? (parseFloat(pctInp.value) || 0) / 100.0 : 0;
        if (c && d) {
          if (!draft.category_splits[c]) draft.category_splits[c] = {};
          draft.category_splits[c][d] = pct;
        }
      });
    }
  }

  function renderStrategyTab() {
    const card = document.getElementById('strategyEditorCard');
    if (!card) return;
    const p = currentPortfolioConfig;
    if (!p) {
      card.innerHTML = `<div class="text-muted" style="padding:16px;">${esc(t('strat_select_portfolio_msg'))}</div>`;
      return;
    }
    if (isGroupSelection(selectedPortfolio)) {
      card.innerHTML = `
        <div class="section-header">
          <div>
            <h3 class="section-title">${esc(t('strat_editor_title', { name: tTerm(p.name) }))}</h3>
            <div class="text-muted" style="font-size:12.5px;">${esc(t('strat_select_indiv_msg'))}</div>
          </div>
        </div>
      `;
      return;
    }

    const draft = initStratDraftIfNeeded();
    if (!draft) return;

    // 1. Strategy Notes / Rationale Banner (First Element on Strategy Targets)
    const isEditingNotes = !!window._isEditingStratNotes;
    const notes = draft.notes || [];

    const notesBannerHtml = isEditingNotes ? `
      <div class="card" style="margin-bottom:18px;background:var(--bg-subtle);border-left:4px solid var(--primary);padding:12px 16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:12.5px;color:var(--text);">
            <span>ℹ️ ${esc(t('lbl_strat_notes'))}:</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-sm btn-ghost" onclick="toggleEditStratNotes(false)">${esc(t('btn_cancel'))}</button>
            <button class="btn btn-sm btn-primary" onclick="applyStratNotesEdit()">${esc(t('btn_done'))}</button>
          </div>
        </div>
        <textarea id="stratNotesInput" class="input-clean" rows="3"
                  style="width:100%;font-size:13px;line-height:1.5;box-sizing:border-box;resize:vertical;"
                  placeholder="${esc(t('ph_strat_notes'))}">${esc(notes.join('\n'))}</textarea>
        <div class="text-muted" style="font-size:11.5px;margin-top:4px;">
          ${esc(t('help_strat_notes'))}
        </div>
      </div>
    ` : `
      <div class="card" style="margin-bottom:18px;background:var(--bg-subtle);border-left:4px solid var(--primary);padding:10px 16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <div style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:12.5px;color:var(--text);">
            <span>ℹ️ ${esc(t('lbl_strat_notes'))}:</span>
          </div>
          <button class="btn btn-sm btn-ghost" onclick="toggleEditStratNotes(true)" style="padding:2px 8px;font-size:12px;color:var(--text-secondary);cursor:pointer;" title="Edit strategy rationale">
            ✎ ${esc(t('btn_edit'))}
          </button>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.5;">
          ${notes.length > 0
            ? notes.map(n => `<div>• ${esc(n)}</div>`).join('')
            : `<span class="text-muted" style="font-style:italic;">${esc(t('strat_no_notes_placeholder'))}</span>`
          }
        </div>
      </div>
    `;

    let sHtml = notesBannerHtml + `
      <div class="section-header" style="margin-bottom:12px;">
        <div>
          <h3 class="section-title">${esc(t('strat_editor_title', { name: tTerm(p.name) }))}</h3>
          <div class="text-muted" style="font-size:12.5px;">${esc(t('strat_editor_sub'))}</div>
        </div>
        <button class="btn btn-primary" onclick="saveStrategy()">${esc(t('btn_save_strategy'))}</button>
      </div>

      <!-- Strategy Mode Switcher -->
      <div style="display:flex;gap:16px;margin-bottom:18px;padding:8px 12px;background:var(--bg-subtle);border-radius:8px;align-items:center;">
        <span class="kpi-label">${esc(t('lbl_mode'))}</span>
        <label style="cursor:pointer;font-weight:600;display:flex;align-items:center;gap:6px;">
          <input type="radio" name="stratMode" value="flat" ${draft.mode === 'flat' ? 'checked' : ''} onchange="switchStrategyMode('flat')" />
          ${esc(t('strat_mode_flat'))}
        </label>
        <label style="cursor:pointer;font-weight:600;display:flex;align-items:center;gap:6px;">
          <input type="radio" name="stratMode" value="hierarchical" ${draft.mode === 'hierarchical' ? 'checked' : ''} onchange="switchStrategyMode('hierarchical')" />
          ${esc(t('strat_mode_hier'))}
        </label>
      </div>
    `;

    // Tax-rate entry lives on Strategy Targets; the on/off switch itself is in the
    // portfolio context bar beside the rebalance simulator.
    const afterTaxRatePct = (draft.rrsp_withdrawal_tax_rate != null && Number.isFinite(draft.rrsp_withdrawal_tax_rate))
      ? draft.rrsp_withdrawal_tax_rate * 100
      : 30.0;
    sHtml += `
      <div style="padding:10px 14px;background:var(--bg-subtle);border-radius:8px;margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <label style="font-weight:700;font-size:12.5px;display:flex;align-items:center;gap:6px;">
            ${esc(t('strat_after_tax_rate_lbl'))}
          </label>
          <input type="text" inputmode="decimal" id="stratAfterTaxRateInput" class="inline-num" style="width:80px;"
                 value="${round4(afterTaxRatePct)}" onchange="onAfterTaxRateChange(this.value)" />%
        </div>
        <div class="text-muted" style="font-size:11.5px;line-height:1.5;margin-top:6px;">
          ${esc(t('strat_after_tax_help'))}
        </div>
      </div>
    `;

    if (draft.mode === 'flat') {
      sHtml += `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div class="kpi-label">${esc(t('strat_direct_divs'))}</div>
          <div id="stratTotalTargetIndicator"></div>
        </div>
        <table class="table-clean" data-drag-scope="divisionOrder" style="margin-bottom:14px;">
          <thead>
            <tr>
              <th class="left">${esc(t('th_division'))}</th>
              <th style="width:140px;">${esc(t('th_target_pct'))}</th>
              <th class="center" style="width:80px;">${esc(t('th_remove'))}</th>
            </tr>
          </thead>
          <tbody id="stratDivisionsTbody">
            ${orderedKeys(draft.divisions, p.division_order).map(name => {
              const ratio = draft.divisions[name];
              return `
              <tr class="strat-div-row" data-name="${esc(name)}" data-row-key="${esc(name)}">
                <td class="left">
                  ${dragHandleHtml(false)}<input type="text" class="input-clean strat-div-name-input" value="${esc(name)}" onchange="onStratFieldAutoSave()" style="width:260px;font-weight:600;" />
                </td>
                <td>
                  <input type="text" inputmode="decimal" class="inline-num strat-flat-pct-input" data-div="${esc(name)}" value="${round4(ratio * 100)}" oninput="updateStratTargetSum()" onchange="onStratFieldAutoSave()" style="width:90px;" />%
                </td>
                <td class="center">
                  <button class="btn btn-ghost" style="color:var(--red);padding:2px 8px;" onclick="removeStratDivision('${esc(name)}')" title="Delete target division '${esc(name)}'">✕</button>
                </td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:20px;flex-wrap:wrap;padding:10px;background:var(--bg-subtle);border-radius:8px;">
          <input type="text" id="newStratDivInput" class="input-clean" placeholder="${esc(t('strat_ph_new_div'))}" style="width:300px;" onkeydown="if(event.key==='Enter') addStratDivision()" />
          <input type="text" inputmode="decimal" id="newStratDivPct" class="inline-num" placeholder="${esc(t('th_target_pct'))}" style="width:80px;" onkeydown="if(event.key==='Enter') addStratDivision()" />%
          <button class="btn" onclick="addStratDivision()">${esc(t('strat_add_division_btn'))}</button>
        </div>
      `;
    } else {
      sHtml += `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div class="kpi-label">${esc(t('strat_step1_cats'))}</div>
          <div id="stratTotalTargetIndicator"></div>
        </div>
        <table class="table-clean" data-drag-scope="categoryOrder" style="margin-bottom:14px;">
          <thead><tr><th class="left">${esc(t('th_category'))}</th><th style="width:140px;">${esc(t('th_target_pct'))}</th><th class="center" style="width:80px;">${esc(t('th_remove'))}</th></tr></thead>
          <tbody>
            ${orderedKeys(draft.categories, p.category_order).map(cat => {
              const ratio = draft.categories[cat];
              return `
              <tr class="strat-cat-row" data-cat="${esc(cat)}" data-row-key="${esc(cat)}">
                <td class="left">${dragHandleHtml(false)}<input type="text" class="input-clean strat-cat-name-input" value="${esc(cat)}" onchange="onStratFieldAutoSave()" style="width:240px;font-weight:600;" /></td>
                <td><input type="text" inputmode="decimal" class="inline-num strat-cat-pct-input" data-cat="${esc(cat)}" value="${round4(ratio * 100)}" oninput="updateStratTargetSum()" onchange="onStratFieldAutoSave()" style="width:90px;" />%</td>
                <td class="center"><button class="btn btn-ghost" style="color:var(--red);padding:2px 8px;" onclick="removeStratCategory('${esc(cat)}')" title="Delete target category '${esc(cat)}' and all child divisions">✕</button></td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
        <div style="display:flex;gap:8px;margin-bottom:20px;">
          <input type="text" id="newStratCatInput" class="input-clean" placeholder="${esc(t('strat_ph_new_cat'))}" style="width:280px;" onkeydown="if(event.key==='Enter') addStratCategory()" />
          <button class="btn" onclick="addStratCategory()">${esc(t('strat_add_category_btn'))}</button>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px;flex-wrap:wrap;">
          <div class="kpi-label">${esc(t('strat_step2_divs'))}</div>
          <div id="stratSplitTargetIndicators" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
        </div>
        <table class="table-clean" data-drag-scope="divisionOrder" style="margin-bottom:14px;">
          <thead><tr><th class="left">${esc(t('th_division'))}</th><th class="left">${esc(t('th_category'))}</th><th>${esc(t('th_split_within_cat'))}</th><th>${esc(t('th_eff_portfolio_pct'))}</th><th class="center">${esc(t('th_remove'))}</th></tr></thead>
          <tbody>
            ${orderedKeys(draft.category_splits, p.category_order).flatMap(cat => {
              const splits = draft.category_splits[cat] || {};
              return orderedKeys(splits, p.division_order).map(div => {
                const splitRatio = splits[div];
                const catW = draft.categories[cat] || 0;
                const eff = catW * splitRatio * 100;
                return `
                  <tr class="strat-split-row" data-cat="${esc(cat)}" data-div="${esc(div)}" data-row-key="${esc(div)}">
                    <td class="left">${dragHandleHtml(false)}<b>${esc(div)}</b></td>
                    <td class="left"><span class="pill pill-neutral">${esc(cat)}</span></td>
                    <td><input type="text" inputmode="decimal" class="inline-num strat-split-pct-input" data-cat="${esc(cat)}" data-div="${esc(div)}" value="${round4(splitRatio * 100)}" oninput="updateStratTargetSum()" onchange="onStratFieldAutoSave()" style="width:80px;" />%</td>
                    <td class="text-muted strat-eff-pct-cell"><b>${eff.toFixed(1)}%</b></td>
                    <td class="center"><button class="btn btn-ghost" style="color:var(--red);padding:2px 8px;" onclick="removeHierDivision('${esc(cat)}', '${esc(div)}')" title="Delete division '${esc(div)}' from category '${esc(cat)}'">✕</button></td>
                  </tr>
                `;
              });
            }).join('')}
          </tbody>
        </table>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:20px;flex-wrap:wrap;">
          <input type="text" id="newHierDivInput" class="input-clean" placeholder="${esc(t('strat_ph_new_div'))}" style="width:200px;" />
          <select id="newHierDivCatSelect" class="select-clean">
            ${Object.keys(draft.categories).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
          <button class="btn" onclick="addHierDivision()">${esc(t('strat_add_hier_div_btn'))}</button>
        </div>
      `;
    }

    card.innerHTML = sHtml;
    updateStratTargetSum();
    initDraggableTables();
  }

  async function onStratFieldAutoSave() {
    syncStratInputsToDraft();
    await persistStrategyDraft('Saved strategy');
  }

  function toggleEditStratNotes(editing) {
    window._isEditingStratNotes = editing;
    renderStrategyTab();
    if (editing) {
      const el = document.getElementById('stratNotesInput');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
  }

  async function applyStratNotesEdit() {
    const draft = window._stratDraft;
    const inp = document.getElementById('stratNotesInput');
    if (draft && inp) {
      draft.notes = inp.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    }
    window._isEditingStratNotes = false;
    await saveStrategy();
  }

  async function saveStrategy() {
    syncStratInputsToDraft();
    const draft = window._stratDraft;
    const p = currentPortfolioConfig;
    if (!draft || !p) return;

    const issues = [];
    if (draft.mode === 'flat') {
      const flatSum = Object.values(draft.divisions || {}).reduce((a, b) => a + (Number(b) || 0), 0) * 100;
      if (Math.abs(flatSum - 100) >= 0.05) {
        issues.push(`Division targets sum to ${flatSum.toFixed(1)}% (should be 100%)`);
      }
    } else {
      const catSum = Object.values(draft.categories || {}).reduce((a, b) => a + (Number(b) || 0), 0) * 100;
      if (Math.abs(catSum - 100) >= 0.05) {
        issues.push(`Category targets sum to ${catSum.toFixed(1)}% (should be 100%)`);
      }
      for (const [cat, splits] of Object.entries(draft.category_splits || {})) {
        const entries = Object.values(splits || {});
        if (entries.length === 0) continue;
        const sSum = entries.reduce((a, b) => a + (Number(b) || 0), 0) * 100;
        if (Math.abs(sSum - 100) >= 0.05) {
          issues.push(`${cat} splits sum to ${sSum.toFixed(1)}% (should be 100%)`);
        }
      }
    }
    if (issues.length > 0) {
      const ok = await openConfirmModal({
        title: 'Strategy Targets Do Not Sum to 100%',
        message: `${issues.join(' • ')}. Save anyway?`,
        confirmLabel: 'Save Anyway'
      });
      if (!ok) return;
    }

    await persistStrategyDraft('Saved portfolio strategy & notes');
  }

  async function persistStrategyDraft(toastMsg) {
    const draft = window._stratDraft;
    const p = currentPortfolioConfig;
    if (!draft || !p) return false;
    if (!p.strategy) p.strategy = {};
    syncAfterTaxFieldsIntoDraft();
    p.strategy.mode = draft.mode;
    p.strategy.divisions = draft.divisions;
    p.strategy.categories = draft.categories;
    p.strategy.category_splits = draft.category_splits;
    p.strategy.notes = draft.notes || [];
    p.after_tax_allocation = draft.after_tax_allocation === true;
    if (draft.rrsp_withdrawal_tax_rate != null && Number.isFinite(draft.rrsp_withdrawal_tax_rate)) {
      p.rrsp_withdrawal_tax_rate = draft.rrsp_withdrawal_tax_rate;
    }

    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      showToast(err && err.error ? err.error : 'Error saving strategy');
      return false;
    }
    await loadStateAndEvaluate();
    renderStrategyTab();
    if (toastMsg) showToast(toastMsg);
    return true;
  }

  function syncAfterTaxFieldsIntoDraft() {
    const draft = window._stratDraft;
    if (!draft) return;
    // The after-tax on/off switch lives in the portfolio context bar; Strategy Targets
    // owns the tax-rate input but must not overwrite the toggle state.
    draft.after_tax_allocation = currentPortfolioConfig.after_tax_allocation === true;
    const afterTaxRate = document.getElementById('stratAfterTaxRateInput');
    if (afterTaxRate) {
      const pct = parseFloat(String(afterTaxRate.value).replace(/,/g, ''));
      if (Number.isFinite(pct) && pct >= 0 && pct < 100) {
        draft.rrsp_withdrawal_tax_rate = pct / 100.0;
        if (!Number.isFinite(currentPortfolioConfig.rrsp_withdrawal_tax_rate)) {
          currentPortfolioConfig.rrsp_withdrawal_tax_rate = pct / 100.0;
        }
      }
    }
  }

  function onToggleAfterTaxAllocation(enabled) {
    const draft = window._stratDraft;
    if (!draft) return;
    draft.after_tax_allocation = enabled;
    const rateInput = document.getElementById('stratAfterTaxRateInput');
    const hasRate = !(draft.rrsp_withdrawal_tax_rate == null || !Number.isFinite(draft.rrsp_withdrawal_tax_rate));
    if (rateInput) {
      rateInput.style.display = enabled ? 'inline-block' : 'none';
      if (enabled && !hasRate && (!rateInput.value || isNaN(parseFloat(rateInput.value)))) {
        rateInput.value = String(30.0);
      }
    }
  }

  function onAfterTaxRateChange(value) {
    const draft = window._stratDraft;
    const pct = parseFloat(String(value).replace(/,/g, ''));
    if (draft && Number.isFinite(pct)) {
      draft.rrsp_withdrawal_tax_rate = pct / 100.0;
    }
    saveAfterTaxRate(value);
  }
  async function addStratCategory() {
    syncStratInputsToDraft();
    const draft = window._stratDraft;
    const inp = document.getElementById('newStratCatInput');
    const name = inp ? inp.value.trim() : '';
    if (!draft || !name) return;
    if (!draft.categories) draft.categories = {};
    if (!draft.category_splits) draft.category_splits = {};
    if (draft.categories[name] !== undefined) {
      showToast(`Category "${name}" already exists`);
      return;
    }
    draft.categories[name] = 0;
    if (!draft.category_splits[name] || Object.keys(draft.category_splits[name]).length === 0) {
      draft.category_splits[name] = { [name]: 1.0 };
    }
    await persistStrategyDraft(`Added category "${name}"`);
  }

  async function removeStratCategory(cat) {
    syncStratInputsToDraft();
    const draft = window._stratDraft;
    if (!draft || !cat) return;
    if (draft.categories) delete draft.categories[cat];
    if (draft.category_splits) delete draft.category_splits[cat];
    await persistStrategyDraft(`Removed category "${cat}"`);
  }

  async function addHierDivision() {
    syncStratInputsToDraft();
    const draft = window._stratDraft;
    const inp = document.getElementById('newHierDivInput');
    const catSel = document.getElementById('newHierDivCatSelect');
    const divName = inp ? inp.value.trim() : '';
    const catName = catSel ? catSel.value : '';
    if (!draft || !divName || !catName) return;
    if (!draft.category_splits) draft.category_splits = {};
    if (!draft.category_splits[catName]) draft.category_splits[catName] = {};
    if (draft.category_splits[catName][divName] !== undefined) {
      showToast(`Division "${divName}" already exists in "${catName}"`);
      return;
    }
    draft.category_splits[catName][divName] = 0;
    await persistStrategyDraft(`Added division "${divName}"`);
  }

  async function removeHierDivision(cat, div) {
    syncStratInputsToDraft();
    const draft = window._stratDraft;
    if (!draft || !cat || !div) return;
    if (draft.category_splits && draft.category_splits[cat]) {
      delete draft.category_splits[cat][div];
    }
    await persistStrategyDraft(`Removed division "${div}"`);
  }

  async function addStratDivision() {
    syncStratInputsToDraft();
    const draft = window._stratDraft;
    const inp = document.getElementById('newStratDivInput');
    const pctInp = document.getElementById('newStratDivPct');
    const name = inp ? inp.value.trim() : '';
    const pct = pctInp ? (parseFloat(pctInp.value) || 0) : 0;
    if (!draft || !name) return;
    if (!draft.divisions) draft.divisions = {};
    if (draft.divisions[name] !== undefined) {
      showToast(`Division "${name}" already exists`);
      return;
    }
    draft.divisions[name] = pct / 100.0;
    await persistStrategyDraft(`Added division "${name}"`);
  }

  async function removeStratDivision(name) {
    syncStratInputsToDraft();
    const draft = window._stratDraft;
    if (!draft || !name) return;
    if (draft.divisions) delete draft.divisions[name];
    await persistStrategyDraft(`Removed division "${name}"`);
  }

  function updateStratTargetSum() {
    const draft = window._stratDraft;
    const el = document.getElementById('stratTotalTargetIndicator');
    if (!draft || !el) return;
    let sum = 0;
    const catPcts = {};
    if (draft.mode === 'flat') {
      document.querySelectorAll('.strat-flat-pct-input').forEach(inp => {
        sum += parseFloat(inp.value) || 0;
      });
    } else {
      document.querySelectorAll('.strat-cat-pct-input').forEach(inp => {
        const val = parseFloat(inp.value) || 0;
        sum += val;
        if (inp.dataset.cat) catPcts[inp.dataset.cat] = val / 100.0;
      });

      // Compute per-category split sums and update effective % cells live
      const splitSums = {};
      document.querySelectorAll('.strat-split-pct-input').forEach(inp => {
        const cat = inp.dataset.cat || '';
        const val = parseFloat(inp.value) || 0;
        splitSums[cat] = (splitSums[cat] || 0) + val;
        const row = inp.closest('tr');
        const effCell = row ? row.querySelector('.strat-eff-pct-cell') : null;
        if (effCell) {
          const catRatio = catPcts[cat] !== undefined ? catPcts[cat] : ((draft.categories && draft.categories[cat]) || 0);
          effCell.innerHTML = `<b>${(catRatio * val).toFixed(1)}%</b>`;
        }
      });

      const splitEl = document.getElementById('stratSplitTargetIndicators');
      if (splitEl) {
        const cats = Object.keys(draft.category_splits || {});
        splitEl.innerHTML = cats.map(cat => {
          const s = splitSums[cat] || 0;
          const ok = Math.abs(s - 100.0) < 0.05;
          return `<span class="pill ${ok ? 'pill-green' : 'pill-amber'}">${esc(cat)}: ${s.toFixed(1)}%</span>`;
        }).join('');
      }
    }
    const isBalanced = Math.abs(sum - 100.0) < 0.05;
    el.innerHTML = isBalanced
      ? `<span class="pill pill-green">${esc(t('strat_target_balanced'))} (${sum.toFixed(1)}%)</span>`
      : `<span class="pill pill-amber">${esc(t('strat_target_mismatch', { sum: sum.toFixed(1) }))}</span>`;
  }

  
  // --- VIEW 2 / TAB 5: CONFIG ---

  function toggleRebalanceMode() {
    if (currentPortfolioSubTab !== 'allocations') return;
    rebalanceMode = !rebalanceMode;
    renderTopBar();
    renderDivisionView();
  }
  window.toggleRebalanceMode = toggleRebalanceMode;

  async function updateAmountToBuy(val) {
    const num = parseFloat(String(val).replace(/,/g, '')) || 0;
    const res = await fetch('/api/portfolio/amount-to-buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio_id: selectedPortfolio,
        filter_account: selectedFilter,
        amount_to_buy: num
      })
    });
    currentEval = await res.json();
    renderAll();
    showToast(`Updated cash to invest: ${fmtMoney(num)}`);
  }

  async function onQuickChangeAccount(holdingID, val) {
    const acc = String(val).trim();
    if (!acc) return;
    const res = await fetch('/api/holding/quick-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio_id: selectedPortfolio,
        filter_account: selectedFilter,
        holding_id: holdingID,
        account: acc
      })
    });
    currentEval = await res.json();
    const pRes = await fetch(`/api/portfolio?id=${encodeURIComponent(selectedPortfolio)}`);
    currentPortfolioConfig = await pRes.json();
    renderAll();
    showToast(`Updated account to "${acc}"`);
  }

  async function promptRenameAccount(oldAccName) {
    if (isGroupSelection(selectedPortfolio)) {
      alert(t('alert_rename_group_disabled'));
      return;
    }
    const promptText = t('prompt_rename_account', { old: oldAccName });
    const newName = await openPromptModal({
      title: 'Rename Account',
      label: promptText,
      initialValue: oldAccName,
      confirmLabel: 'Rename'
    });
    if (!newName || newName.trim() === '' || newName.trim() === oldAccName) {
      return;
    }
    await renameAccountBatch(oldAccName, newName.trim());
  }

  async function renameAccountBatch(oldName, newName) {
    try {
      const res = await fetch('/api/account/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio_id: selectedPortfolio,
          filter_account: selectedFilter,
          old_name: oldName,
          new_name: newName
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      currentEval = data.evaluation;
      if (selectedFilter === oldName) {
        selectedFilter = newName;
      }
      const pRes = await fetch(`/api/portfolio?id=${encodeURIComponent(selectedPortfolio)}`);
      currentPortfolioConfig = await pRes.json();
      renderAll();
      showToast(t('toast_account_renamed', { old: oldName, name: newName, count: data.updated_count }));
    } catch (err) {
      console.error(err);
      alert('Failed to rename account: ' + err.message);
    }
  }

  async function onQuickChangeAccountType(holdingID, accType) {
    const res = await fetch('/api/holding/quick-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio_id: selectedPortfolio,
        filter_account: selectedFilter,
        holding_id: holdingID,
        account_type: accType
      })
    });
    currentEval = await res.json();
    const pRes = await fetch(`/api/portfolio?id=${encodeURIComponent(selectedPortfolio)}`);
    currentPortfolioConfig = await pRes.json();
    renderAll();
    showToast(`Updated account classification to ${accType.toUpperCase()}`);
  }

  async function onQuickChangeManualAmount(holdingID, sym, val) {
    const amount = parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
    const symbolsCfg = (appState && appState.symbols) ? appState.symbols : { symbols: {} };
    if (symbolsCfg.symbols && symbolsCfg.symbols[sym]) {
      symbolsCfg.symbols[sym].fixed_price = Math.abs(amount);
      const symRes = await fetch('/api/symbols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(symbolsCfg)
      });
      if (symRes.ok) {
        appState = await symRes.json();
      }
    }
    const targetShares = amount < 0 ? -1 : 1;
    await onQuickChangeShares(holdingID, targetShares);
  }

  async function onQuickChangeShares(holdingID, val) {
    const num = parseFloat(String(val).replace(/,/g, '')) || 0;
    const res = await fetch('/api/holding/quick-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio_id: selectedPortfolio,
        filter_account: selectedFilter,
        holding_id: holdingID,
        shares: num
      })
    });
    currentEval = await res.json();
    const pRes = await fetch(`/api/portfolio?id=${encodeURIComponent(selectedPortfolio)}`);
    currentPortfolioConfig = await pRes.json();
    renderAll();
    showToast('Updated position shares');
  }

  async function onQuickChangeProposed(holdingID, val) {
    const num = parseFloat(String(val).replace(/,/g, '')) || 0;
    const res = await fetch('/api/holding/quick-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio_id: selectedPortfolio,
        filter_account: selectedFilter,
        holding_id: holdingID,
        proposed_shares: num
      })
    });
    currentEval = await res.json();
    const pRes = await fetch(`/api/portfolio?id=${encodeURIComponent(selectedPortfolio)}`);
    currentPortfolioConfig = await pRes.json();
    renderAll();
  }

  async function onSelectRebalanceTarget(holdingID, val) {
    const list = val ? String(val).split(',').map(s => s.trim()).filter(Boolean) : [];
    const res = await fetch('/api/holding/quick-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio_id: selectedPortfolio,
        filter_account: selectedFilter,
        holding_id: holdingID,
        rebalance_divisions: list
      })
    });
    currentEval = await res.json();
    renderAll();
    showToast(list.length ? `Set rebalance target: ${list.join(', ')}` : 'Cleared rebalance target');
  }

  async function onToggleRebalanceTarget(holdingID, divID, checked) {
    const raw = (currentEval.raw_holdings || []).find(h => h.holding_id === holdingID);
    if (!raw) return;
    const set = new Set(raw.rebalance_divisions || []);
    if (checked) set.add(divID);
    else set.delete(divID);

    const res = await fetch('/api/holding/quick-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio_id: selectedPortfolio,
        filter_account: selectedFilter,
        holding_id: holdingID,
        rebalance_divisions: Array.from(set)
      })
    });
    currentEval = await res.json();
    renderAll();
  }

  async function applyCalculatedTrades(roundShares) {
    const res = await fetch('/api/portfolio/apply-trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio_id: selectedPortfolio,
        filter_account: selectedFilter,
        round_shares: roundShares
      })
    });
    const data = await res.json();
    currentEval = data;
    renderAll();
    if (!res.ok) {
      const error = data && (data.error || (data.rebalance_warnings || []).join('; '));
      showToast(error ? `Could not apply trades: ${error}` : 'Could not calculate trades');
      return;
    }
    showToast('Populated simulated trades from target recommendations');
  }

  async function commitProposedTrades() {
    const ok = await openConfirmModal({
      title: 'Commit Executed Trades',
      message: 'Commit simulated trades to your holdings and reset simulated trades to 0?',
      confirmLabel: 'Commit Trades'
    });
    if (!ok) return;
    const res = await fetch('/api/portfolio/commit-trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio_id: selectedPortfolio,
        filter_account: selectedFilter
      })
    });
    currentEval = await res.json();
    await loadStateAndEvaluate();
    showToast('Committed trades to holdings');
  }

  // --- Account & Position Management (By Account Modal & Fuzzy Auto-Lookup) ---

  let modalSelectedSymbolData = null;
  let modalSymbolDebounceTimer = null;

  function openNewAccountModal(returnToAddPosition) {
    if (isGroupSelection(selectedPortfolio)) return;
    window._newAccountReturnToAdd = !!returnToAddPosition;
    const nameInp = document.getElementById('modalNewAccountName');
    if (nameInp) nameInp.value = '';
    const typeSel = document.getElementById('modalNewAccountType');
    const bucketSel = document.getElementById('modalNewAccountBucket');
    if (bucketSel) {
      bucketSel.innerHTML = buildAccountBucketOptionsHtml();
      bucketSel.dataset.userEdited = '';
      bucketSel.value = (typeSel && typeSel.value === 'rrsp') ? 'Retirement' : '';
    }
    const modal = document.getElementById('newAccountModal');
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => { if (nameInp) nameInp.focus(); }, 50);
  }

  function onNewAccountTypeChange() {
    const typeSel = document.getElementById('modalNewAccountType');
    const bucketSel = document.getElementById('modalNewAccountBucket');
    if (typeSel && bucketSel && !bucketSel.dataset.userEdited) {
      bucketSel.value = typeSel.value === 'rrsp' ? 'Retirement' : '';
    }
  }

  function closeNewAccountModal() {
    const modal = document.getElementById('newAccountModal');
    if (modal) modal.classList.add('hidden');
  }

  async function submitNewAccountModal() {
    if (isGroupSelection(selectedPortfolio) || !currentPortfolioConfig) return;
    const nameInp = document.getElementById('modalNewAccountName');
    const accName = nameInp ? nameInp.value.trim() : '';
    if (!accName) {
      alert('Please enter an account name.');
      return;
    }
    const typeSel = document.getElementById('modalNewAccountType');
    const accType = typeSel ? typeSel.value : 'non_registered';
    const bucketVal = (document.getElementById('modalNewAccountBucket')?.value || '').trim();

    if (!Array.isArray(currentPortfolioConfig.accounts)) {
      currentPortfolioConfig.accounts = [];
    }
    const alreadyExists = currentPortfolioConfig.accounts.some(a => a.name === accName) ||
      (currentPortfolioConfig.holdings || []).some(h => h.account === accName);

    if (!alreadyExists) {
      const accEntry = { name: accName, account_type: accType };
      if (bucketVal) accEntry.bucket = bucketVal;
      currentPortfolioConfig.accounts.push(accEntry);
      if (Array.isArray(currentPortfolioConfig.account_order) && currentPortfolioConfig.account_order.length > 0 && !currentPortfolioConfig.account_order.includes(accName)) {
        currentPortfolioConfig.account_order.push(accName);
      }
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentPortfolioConfig)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to create account.');
        return;
      }
      await loadStateAndEvaluate();
      showToast(`Created account "${accName}"`);
    }

    closeNewAccountModal();
    if (window._newAccountReturnToAdd) {
      window._newAccountReturnToAdd = false;
      openAddPositionModal(accName, accType);
    }
  }

  let _editingAccountBucketName = null;

  function openChangeAccountBucketModal(accName) {
    if (isGroupSelection(selectedPortfolio) || !currentPortfolioConfig || !accName) return;
    _editingAccountBucketName = accName;
    const titleEl = document.getElementById('modalAccBucketTitle');
    if (titleEl) titleEl.textContent = `Bucket — ${accName}`;
    const sel = document.getElementById('modalAccBucketSelect');
    if (sel) {
      sel.innerHTML = buildAccountBucketOptionsHtml();
      sel.value = getAccountBucketName(accName) || '';
    }
    const modal = document.getElementById('accountBucketModal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeChangeAccountBucketModal() {
    _editingAccountBucketName = null;
    const modal = document.getElementById('accountBucketModal');
    if (modal) modal.classList.add('hidden');
  }

  async function submitChangeAccountBucketModal() {
    if (isGroupSelection(selectedPortfolio) || !currentPortfolioConfig || !_editingAccountBucketName) return;
    const accName = _editingAccountBucketName;
    const bucketVal = (document.getElementById('modalAccBucketSelect')?.value || '').trim();
    if (!Array.isArray(currentPortfolioConfig.accounts)) {
      currentPortfolioConfig.accounts = [];
    }
    let accObj = currentPortfolioConfig.accounts.find(a => a.name === accName);
    if (!accObj) {
      const evalAcc = ((currentEval && currentEval.account_summaries) || []).find(a => a.account === accName);
      accObj = {
        name: accName,
        account_type: evalAcc ? evalAcc.account_type : ''
      };
      currentPortfolioConfig.accounts.push(accObj);
    }
    if (bucketVal) {
      accObj.bucket = bucketVal;
    } else {
      delete accObj.bucket;
    }
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPortfolioConfig)
    });
    if (!res.ok) {
      showToast('Failed to update account bucket');
      return;
    }
    closeChangeAccountBucketModal();
    await loadStateAndEvaluate();
    showToast(bucketVal ? `Set "${accName}" bucket to ${bucketVal}` : `Cleared bucket on "${accName}" (defaults to Other)`);
  }

  async function toggleAccountExcludeFromRebalance(accName) {
    if (isGroupSelection(selectedPortfolio) || !currentPortfolioConfig) return;
    if (!Array.isArray(currentPortfolioConfig.accounts)) {
      currentPortfolioConfig.accounts = [];
    }
    let accObj = currentPortfolioConfig.accounts.find(a => a.name === accName);
    if (!accObj) {
      const evalAcc = ((currentEval && currentEval.account_summaries) || []).find(a => a.account === accName);
      accObj = {
        name: accName,
        account_type: evalAcc ? evalAcc.account_type : ''
      };
      currentPortfolioConfig.accounts.push(accObj);
    }
    accObj.exclude_from_rebalancing = !accObj.exclude_from_rebalancing;
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPortfolioConfig)
    });
    if (!res.ok) {
      showToast('Failed to update account setting');
      return;
    }
    await loadStateAndEvaluate();
    showToast(accObj.exclude_from_rebalancing
      ? `"${accName}" excluded from allocation targets`
      : `"${accName}" included in allocation targets`);
  }

  async function deleteAccount(accName) {
    if (isGroupSelection(selectedPortfolio)) return;
    const holds = currentPortfolioConfig.holdings || [];
    const count = holds.filter(h => h.account === accName).length;
    const msg = count > 0
      ? `Delete account "${accName}" and all ${count} position(s)?`
      : `Delete account "${accName}"?`;
    const ok = await openConfirmModal({
      title: 'Delete Account',
      message: msg,
      confirmLabel: 'Delete',
      danger: true
    });
    if (!ok) return;

    currentPortfolioConfig.holdings = holds.filter(h => h.account !== accName);
    if (Array.isArray(currentPortfolioConfig.accounts)) {
      currentPortfolioConfig.accounts = currentPortfolioConfig.accounts.filter(a => a.name !== accName);
    }
    if (Array.isArray(currentPortfolioConfig.account_order)) {
      currentPortfolioConfig.account_order = currentPortfolioConfig.account_order.filter(a => a !== accName);
    }
    await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPortfolioConfig)
    });
    await loadStateAndEvaluate();
    showToast(`Deleted account "${accName}"`);
  }

  let _editingHoldingID = null;

  function openEditPositionModal(holdingID) {
    if (isGroupSelection(selectedPortfolio) || !currentPortfolioConfig || !holdingID) return;
    const holds = currentPortfolioConfig.holdings || [];
    const h = holds.find(x => x.id === holdingID);
    if (!h) return;

    _editingHoldingID = holdingID;
    const isMan = isManualSymbol(h.symbol);
    const symDef = (appState && appState.symbols && appState.symbols.symbols && appState.symbols.symbols[h.symbol]) || {};

    const titleEl = document.getElementById('modalEditPosTitle');
    if (titleEl) titleEl.textContent = `Edit Position — ${h.symbol}`;

    // Populate accounts dropdown
    const accSel = document.getElementById('modalEditPosAccount');
    if (accSel) {
      const accSet = new Set();
      (currentPortfolioConfig.accounts || []).forEach(a => { if (a.name) accSet.add(a.name); });
      holds.forEach(x => { if (x.account) accSet.add(x.account); });
      ((currentEval && currentEval.account_summaries) || []).forEach(a => { if (a.account) accSet.add(a.account); });
      if (h.account) accSet.add(h.account);
      accSel.innerHTML = Array.from(accSet).map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
      accSel.value = h.account;
    }

    const symInp = document.getElementById('modalEditPosSymbol');
    if (symInp) symInp.value = h.symbol || '';

    const manToggle = document.getElementById('modalEditPosManualToggle');
    if (manToggle) manToggle.checked = isMan;

    // Manual fields vs Shares
    const manWrap = document.getElementById('modalEditPosManualFields');
    if (manWrap) manWrap.classList.toggle('hidden', !isMan);
    const sharesLbl = document.getElementById('modalEditPosSharesLabel');
    if (sharesLbl) sharesLbl.textContent = isMan ? 'Amount' : 'Shares';
    const sharesInp = document.getElementById('modalEditPosShares');
    if (sharesInp) {
      if (isMan) {
        const unitPrice = symDef.fixed_price > 0 ? symDef.fixed_price : 1;
        sharesInp.value = round4(h.shares * unitPrice);
      } else {
        sharesInp.value = round4(h.shares);
      }
    }
    const manName = document.getElementById('modalEditPosManualName');
    if (manName) manName.value = symDef.name || h.symbol;
    const manCurr = document.getElementById('modalEditPosManualCurrency');
    if (manCurr) manCurr.value = symDef.currency || 'CAD';

    // Populate Bucket & Division dropdowns independently
    const bucketSel = document.getElementById('modalEditPosBucket');
    if (bucketSel) {
      bucketSel.innerHTML = buildPositionBucketOptionsHtml(h.account);
      bucketSel.value = h.bucket || '';
    }
    const divSel = document.getElementById('modalEditPosDivision');
    if (divSel) {
      divSel.innerHTML = buildDivisionOnlyOptionsHtml();
      if (h.no_division) {
        divSel.value = '__none__';
      } else if (h.division) {
        divSel.value = h.division;
      } else {
        divSel.value = '';
      }
    }
    updateModalDivisionVisibility(h.account, h.bucket || '', 'modalEditPosDivisionWrap', 'modalEditPosDivisionNote');

    const noteInp = document.getElementById('modalEditPosNote');
    if (noteInp) noteInp.value = h.note || '';

    const modal = document.getElementById('editPositionModal');
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => { if (sharesInp) { sharesInp.focus(); sharesInp.select(); } }, 40);
  }

  function onModalEditPosAccountChange() {
    const accName = (document.getElementById('modalEditPosAccount')?.value || '').trim();
    const bucketSel = document.getElementById('modalEditPosBucket');
    const prevBucket = bucketSel ? bucketSel.value : '';
    if (bucketSel) {
      bucketSel.innerHTML = buildPositionBucketOptionsHtml(accName);
      bucketSel.value = prevBucket;
    }
    updateModalDivisionVisibility(accName, bucketSel ? bucketSel.value : '', 'modalEditPosDivisionWrap', 'modalEditPosDivisionNote');
  }

  function onModalEditPosBucketChange() {
    const accName = (document.getElementById('modalEditPosAccount')?.value || '').trim();
    const bucketVal = (document.getElementById('modalEditPosBucket')?.value || '').trim();
    updateModalDivisionVisibility(accName, bucketVal, 'modalEditPosDivisionWrap', 'modalEditPosDivisionNote');
  }

  function closeEditPositionModal() {
    _editingHoldingID = null;
    const modal = document.getElementById('editPositionModal');
    if (modal) modal.classList.add('hidden');
  }

  function onToggleEditManualMode() {
    const isMan = !!document.getElementById('modalEditPosManualToggle')?.checked;
    const manWrap = document.getElementById('modalEditPosManualFields');
    if (manWrap) manWrap.classList.toggle('hidden', !isMan);
    const sharesLbl = document.getElementById('modalEditPosSharesLabel');
    if (sharesLbl) sharesLbl.textContent = isMan ? 'Amount' : 'Shares';
    const manName = document.getElementById('modalEditPosManualName');
    const symVal = (document.getElementById('modalEditPosSymbol')?.value || '').trim();
    if (isMan && manName && !manName.value.trim() && symVal) {
      manName.value = symVal;
    }
  }

  async function submitEditPositionModal() {
    if (isGroupSelection(selectedPortfolio) || !currentPortfolioConfig || !_editingHoldingID) return;
    const holds = currentPortfolioConfig.holdings || [];
    const h = holds.find(x => x.id === _editingHoldingID);
    if (!h) return;

    const oldSym = h.symbol;
    const newAcc = (document.getElementById('modalEditPosAccount')?.value || '').trim();
    const newSym = (document.getElementById('modalEditPosSymbol')?.value || '').trim();
    const rawVal = parseFloat(String(document.getElementById('modalEditPosShares')?.value || '').replace(/,/g, ''));
    const bucketVal = document.getElementById('modalEditPosBucket')?.value || '';
    const divVal = document.getElementById('modalEditPosDivision')?.value || '';
    const noteVal = (document.getElementById('modalEditPosNote')?.value || '').trim();
    const isMan = !!document.getElementById('modalEditPosManualToggle')?.checked;

    if (!newAcc) {
      alert('Please select an account.');
      return;
    }
    if (!newSym) {
      alert('Please enter a position name or symbol.');
      return;
    }
    if (isNaN(rawVal) || (isMan && rawVal === 0) || (!isMan && rawVal < 0)) {
      alert(isMan ? 'Please enter a non-zero amount.' : 'Please enter a valid share quantity.');
      return;
    }

    if (isMan) {
      const manName = (document.getElementById('modalEditPosManualName')?.value || '').trim() || newSym;
      const manCurr = document.getElementById('modalEditPosManualCurrency')?.value || 'CAD';
      const symbolsCfg = (appState && appState.symbols) ? appState.symbols : { symbols: {} };
      if (!symbolsCfg.symbols) symbolsCfg.symbols = {};
      const existingSym = symbolsCfg.symbols[newSym] || symbolsCfg.symbols[oldSym] || {};
      symbolsCfg.symbols[newSym] = {
        asset_type: existingSym.asset_type || 'cash',
        name: manName,
        exchange: 'MANUAL',
        currency: manCurr,
        tax_structure: existingSym.tax_structure || 'domestic_canadian',
        default_mer: existingSym.default_mer || 0,
        fixed_price: Math.abs(rawVal),
        default_divisions: existingSym.default_divisions || {}
      };
      const symRes = await fetch('/api/symbols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(symbolsCfg)
      });
      if (symRes.ok) appState = await symRes.json();
      h.shares = rawVal < 0 ? -1 : 1;
    } else {
      h.shares = rawVal;
    }

    h.symbol = newSym;
    if (h.account !== newAcc) {
      h.account = newAcc;
      const defAcc = (currentPortfolioConfig.accounts || []).find(a => a.name === newAcc);
      const sibling = holds.find(x => x.id !== h.id && x.account === newAcc && x.account_type);
      if (defAcc && defAcc.account_type) {
        h.account_type = defAcc.account_type;
      } else if (sibling) {
        h.account_type = sibling.account_type;
      } else {
        delete h.account_type;
      }
    }

    applyPositionBucketAndDivision(h, newAcc, bucketVal, divVal);

    if (noteVal) {
      h.note = noteVal;
    } else {
      delete h.note;
    }

    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPortfolioConfig)
    });
    if (!res.ok) {
      alert('Failed to save position changes.');
      return;
    }
    closeEditPositionModal();
    await loadStateAndEvaluate();
    showToast(`Updated ${h.symbol}`);
  }

  async function deleteFromEditPositionModal() {
    if (!_editingHoldingID) return;
    const targetID = _editingHoldingID;
    const h = (currentPortfolioConfig && currentPortfolioConfig.holdings || []).find(x => x.id === targetID);
    const label = h ? `${h.symbol} in ${h.account}` : 'this position';
    const ok = await openConfirmModal({
      title: 'Delete Position',
      message: `Remove ${label}?`,
      confirmLabel: 'Delete',
      danger: true
    });
    if (!ok) return;
    closeEditPositionModal();
    await deleteHolding(targetID);
  }

  function getSelectedPortfolioId() {
    return selectedPortfolio || '';
  }

  let _contextHoldingID = null;

  function openPositionContextMenu(event, holdingID) {
    if (!holdingID || isGroupSelection(selectedPortfolio)) return;
    event.preventDefault();
    event.stopPropagation();
    closeAllAccountMenus();
    _contextHoldingID = holdingID;
    const menu = document.getElementById('positionContextMenu');
    if (!menu) return;
    menu.classList.remove('hidden');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = 185;
    const h = 84;
    const left = Math.min(event.clientX, vw - w - 8);
    const top = Math.min(event.clientY, vh - h - 8);
    menu.style.left = `${Math.max(8, left)}px`;
    menu.style.top = `${Math.max(8, top)}px`;
  }

  function closePositionContextMenu() {
    const menu = document.getElementById('positionContextMenu');
    if (menu) menu.classList.add('hidden');
  }

  function openAddTransactionModalFromContext() {
    const id = _contextHoldingID;
    closePositionContextMenu();
    if (id) openAddTransactionModal(id);
  }

  function openEditPositionModalFromContext() {
    const id = _contextHoldingID;
    closePositionContextMenu();
    if (id) openEditPositionModal(id);
  }

  let _editingTxID = null;

  function openAddTransactionModal(holdingID, prefillTx) {
    if (isGroupSelection(selectedPortfolio) || !currentPortfolioConfig) return;
    const isEdit = !!(prefillTx && prefillTx.id);
    _editingTxID = isEdit ? prefillTx.id : null;

    const titleEl = document.getElementById('modalTxTitle');
    if (titleEl) titleEl.textContent = isEdit ? 'Edit Transaction' : 'Add Transaction';
    const submitBtn = document.getElementById('modalTxSubmitBtn');
    if (submitBtn) submitBtn.textContent = isEdit ? 'Save Changes' : 'Save Transaction';

    const accSel = document.getElementById('modalTxAccount');
    const holds = currentPortfolioConfig.holdings || [];
    const holding = holdingID ? holds.find(x => x.id === holdingID) : null;
    const targetAccount = (prefillTx && prefillTx.account) || (holding && holding.account) || '';
    const targetSymbol = (prefillTx && prefillTx.symbol) || (holding && holding.symbol) || '';

    if (accSel) {
      const accSet = new Set();
      (currentPortfolioConfig.accounts || []).forEach(a => { if (a.name) accSet.add(a.name); });
      holds.forEach(x => { if (x.account) accSet.add(x.account); });
      ((currentEval && currentEval.account_summaries) || []).forEach(a => { if (a.account) accSet.add(a.account); });
      if (targetAccount) accSet.add(targetAccount);
      accSel.innerHTML = Array.from(accSet).map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
      if (targetAccount) accSel.value = targetAccount;
    }

    const symInp = document.getElementById('modalTxSymbol');
    if (symInp) symInp.value = targetSymbol;

    const typeSel = document.getElementById('modalTxType');
    if (typeSel) typeSel.value = (prefillTx && prefillTx.type) || 'buy';

    const dateInp = document.getElementById('modalTxDate');
    if (dateInp) {
      const today = new Date().toISOString().slice(0, 10);
      dateInp.value = (prefillTx && prefillTx.date) || today;
    }

    const sharesInp = document.getElementById('modalTxShares');
    if (sharesInp) sharesInp.value = (prefillTx && prefillTx.shares) ? String(prefillTx.shares) : '';
    const amtInp = document.getElementById('modalTxAmount');
    if (amtInp) amtInp.value = (prefillTx && prefillTx.amount) ? String(prefillTx.amount) : '';

    const feeInp = document.getElementById('modalTxFee');
    if (feeInp) feeInp.value = (prefillTx && prefillTx.fee) ? String(prefillTx.fee) : '0';

    const noteInp = document.getElementById('modalTxNote');
    if (noteInp) noteInp.value = (prefillTx && prefillTx.note) || '';

    const currSel = document.getElementById('modalTxCurrency');
    const symMap = (appState && appState.symbols && appState.symbols.symbols) || {};
    const symDef = symMap[targetSymbol] || symMap[targetSymbol.toUpperCase()] || {};
    const defCurr = (prefillTx && prefillTx.currency) || symDef.currency || 'CAD';
    if (currSel) currSel.value = defCurr;

    const fxInp = document.getElementById('modalTxFX');
    if (fxInp) {
      if (prefillTx && prefillTx.fx_rate > 0) {
        fxInp.value = String(prefillTx.fx_rate);
      } else {
        onTxSymbolOrCurrChange(true);
      }
    }

    const updateWrap = document.getElementById('modalTxUpdateHoldingWrap');
    const updateChk = document.getElementById('modalTxUpdateHolding');
    if (updateWrap) updateWrap.classList.toggle('hidden', isEdit);
    if (updateChk) updateChk.checked = !isEdit;

    updateTxModalCalc();
    const modal = document.getElementById('transactionModal');
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => { if (sharesInp) { sharesInp.focus(); sharesInp.select(); } }, 50);
  }

  function closeTransactionModal() {
    _editingTxID = null;
    const modal = document.getElementById('transactionModal');
    if (modal) modal.classList.add('hidden');
  }

  function onTxSymbolOrCurrChange(currManuallyChanged = false) {
    const sym = (document.getElementById('modalTxSymbol')?.value || '').trim();
    const currSel = document.getElementById('modalTxCurrency');
    const fxInp = document.getElementById('modalTxFX');
    if (!currManuallyChanged && currSel && sym) {
      const symMap = (appState && appState.symbols && appState.symbols.symbols) || {};
      const symDef = symMap[sym] || symMap[sym.toUpperCase()];
      if (symDef && symDef.currency) {
        currSel.value = symDef.currency;
      }
    }
    const curr = currSel ? currSel.value : 'CAD';
    if (fxInp) {
      fxInp.value = curr === 'USD' ? String(((currentEval && currentEval.usd_cad_rate) || 1.4).toFixed(4)) : '1.0';
    }
  }

  function updateTxModalCalc() {
    const txType = document.getElementById('modalTxType')?.value || 'buy';
    const shares = parseFloat(String(document.getElementById('modalTxShares')?.value || '').replace(/,/g, '')) || 0;
    const amount = parseFloat(String(document.getElementById('modalTxAmount')?.value || '').replace(/,/g, '')) || 0;
    const hintEl = document.getElementById('modalTxUnitPriceHint');
    if (hintEl) {
      if (shares > 0 && amount > 0) {
        hintEl.textContent = `Price / Share: ${fmtPrice(amount / shares)}`;
      } else {
        hintEl.textContent = 'Price / Share: —';
      }
    }
    if (!_editingTxID) {
      const updateChk = document.getElementById('modalTxUpdateHolding');
      if (updateChk) {
        updateChk.checked = (txType === 'buy' || txType === 'sell' || txType === 'split');
      }
    }
  }

  async function submitTransactionModal() {
    if (isGroupSelection(selectedPortfolio)) return;
    const acc = (document.getElementById('modalTxAccount')?.value || '').trim();
    const sym = (document.getElementById('modalTxSymbol')?.value || '').trim();
    const txType = (document.getElementById('modalTxType')?.value || 'buy').trim();
    const dateVal = (document.getElementById('modalTxDate')?.value || '').trim();
    const shares = parseFloat(String(document.getElementById('modalTxShares')?.value || '').replace(/,/g, '')) || 0;
    const amount = parseFloat(String(document.getElementById('modalTxAmount')?.value || '').replace(/,/g, '')) || 0;
    const curr = document.getElementById('modalTxCurrency')?.value || 'CAD';
    const fxRate = parseFloat(document.getElementById('modalTxFX')?.value || '1') || 1.0;
    const fee = parseFloat(document.getElementById('modalTxFee')?.value || '0') || 0;
    const note = (document.getElementById('modalTxNote')?.value || '').trim();
    const updateHolding = !!document.getElementById('modalTxUpdateHolding')?.checked;

    if (!acc) {
      alert('Please select an account.');
      return;
    }
    if (!dateVal) {
      alert('Please enter a date.');
      return;
    }
    if ((txType === 'buy' || txType === 'sell') && shares <= 0) {
      alert('Please enter shares greater than 0.');
      return;
    }
    if ((txType === 'buy' || txType === 'sell' || txType === 'roc' || txType === 'reinvested_cap_gain') && amount <= 0) {
      alert('Please enter total amount greater than 0.');
      return;
    }

    const tx = {
      id: _editingTxID || '',
      date: dateVal,
      account: acc,
      type: txType,
      symbol: sym,
      shares: shares,
      price: (shares > 0 && amount > 0) ? (amount / shares) : 0,
      amount: amount,
      currency: curr,
      fx_rate: fxRate,
      fee: fee,
      note: note
    };

    const isEdit = !!_editingTxID;
    const res = await fetch('/api/transactions', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit
        ? { portfolio_id: selectedPortfolio, transaction: tx }
        : { portfolio_id: selectedPortfolio, transaction: tx, update_holding: updateHolding })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      alert(errData.error || 'Failed to save transaction.');
      return;
    }
    closeTransactionModal();
    await loadStateAndEvaluate();
    if (typeof window.refreshTransactionsTab === 'function') window.refreshTransactionsTab(selectedPortfolio);
    if (typeof window.refreshAcbTab === 'function') window.refreshAcbTab(selectedPortfolio);
    showToast(isEdit ? 'Updated transaction' : `Recorded ${txType.toUpperCase()} ${sym}`);
  }

  document.addEventListener('click', (e) => {
    const ctx = document.getElementById('positionContextMenu');
    if (ctx && !ctx.classList.contains('hidden') && !e.target.closest('#positionContextMenu')) {
      closePositionContextMenu();
    }
  });
  window.addEventListener('scroll', () => closePositionContextMenu(), { passive: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePositionContextMenu();
      const txModal = document.getElementById('transactionModal');
      if (txModal && !txModal.classList.contains('hidden')) {
        closeTransactionModal();
      }
      const editModal = document.getElementById('editPositionModal');
      if (editModal && !editModal.classList.contains('hidden')) {
        closeEditPositionModal();
      }
      const accBucketModal = document.getElementById('accountBucketModal');
      if (accBucketModal && !accBucketModal.classList.contains('hidden')) {
        closeChangeAccountBucketModal();
      }
    }
  });

  function openAddPositionModal(targetAccount, targetAccType) {
    if (isGroupSelection(selectedPortfolio)) {
      alert('Select an individual portfolio to add positions.');
      return;
    }
    modalSelectedSymbolData = null;
    clearTimeout(modalSymbolDebounceTimer);

    // Populate Accounts dropdown
    const accSel = document.getElementById('modalAddPosAccountSelect');
    if (accSel) {
      const existingAccounts = new Set();
      (currentPortfolioConfig.accounts || []).forEach(a => {
        if (a.name && !a.name.includes(' · ')) existingAccounts.add(a.name);
      });
      (currentPortfolioConfig.holdings || []).forEach(h => {
        if (h.account && !h.account.includes(' · ')) existingAccounts.add(h.account);
      });
      ((currentEval && currentEval.account_summaries) || []).forEach(a => {
        if (a.account && !a.account.includes(' · ')) existingAccounts.add(a.account);
      });
      if (targetAccount) existingAccounts.add(targetAccount);
      if (existingAccounts.size === 0) {
        existingAccounts.add('RRSP');
        existingAccounts.add('TFSA');
      }

      accSel.innerHTML = Array.from(existingAccounts).map(a => `<option value="${esc(a)}" ${a === targetAccount ? 'selected' : ''}>${esc(a)}</option>`).join('');
      if (targetAccount) accSel.value = targetAccount;
    }

    // Reset inputs
    const symInp = document.getElementById('modalAddPosSymbolInput');
    if (symInp) symInp.value = '';
    const sharesInp = document.getElementById('modalAddPosSharesInput');
    if (sharesInp) sharesInp.value = '';
    const noteInp = document.getElementById('modalAddPosNoteInput');
    if (noteInp) noteInp.value = '';
    const estVal = document.getElementById('modalAddPosEstValue');
    if (estVal) estVal.textContent = '$0.00';

    // Reset details preview
    resetModalPreviewCard();

    // Reset manual asset toggle & fields
    const manToggle = document.getElementById('modalAddPosManualToggle');
    if (manToggle) manToggle.checked = false;
    const manFields = document.getElementById('modalAddPosManualFields');
    if (manFields) manFields.classList.add('hidden');
    const manName = document.getElementById('modalAddPosManualName');
    if (manName) manName.value = '';
    const manCurr = document.getElementById('modalAddPosManualCurrency');
    if (manCurr) manCurr.value = 'CAD';
    const selectedAcc = accSel ? accSel.value : '';
    const addBucketSel = document.getElementById('modalAddPosBucket');
    if (addBucketSel) {
      addBucketSel.innerHTML = buildPositionBucketOptionsHtml(selectedAcc);
      addBucketSel.value = '';
    }
    const addDivSel = document.getElementById('modalAddPosDivision');
    if (addDivSel) {
      addDivSel.innerHTML = buildDivisionOnlyOptionsHtml();
      addDivSel.value = '';
    }
    updateModalDivisionVisibility(selectedAcc, '', 'modalAddPosDivisionWrap', 'modalAddPosDivisionNote');
    const sharesLbl = document.getElementById('modalAddPosSharesLabel');
    if (sharesLbl) sharesLbl.textContent = 'Shares / Principal';

    // Hide suggestions dropdown
    const sug = document.getElementById('modalAddPosSuggestions');
    if (sug) {
      sug.innerHTML = '';
      sug.classList.add('hidden');
    }

    const modal = document.getElementById('addPositionModal');
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => { if (symInp) symInp.focus(); }, 60);
  }

  function onModalAddPosAccountChange() {
    const accName = (document.getElementById('modalAddPosAccountSelect')?.value || '').trim();
    const bucketSel = document.getElementById('modalAddPosBucket');
    const prevBucket = bucketSel ? bucketSel.value : '';
    if (bucketSel) {
      bucketSel.innerHTML = buildPositionBucketOptionsHtml(accName);
      bucketSel.value = prevBucket;
    }
    updateModalDivisionVisibility(accName, bucketSel ? bucketSel.value : '', 'modalAddPosDivisionWrap', 'modalAddPosDivisionNote');
  }

  function onModalAddPosBucketChange() {
    const accName = (document.getElementById('modalAddPosAccountSelect')?.value || '').trim();
    const bucketVal = (document.getElementById('modalAddPosBucket')?.value || '').trim();
    updateModalDivisionVisibility(accName, bucketVal, 'modalAddPosDivisionWrap', 'modalAddPosDivisionNote');
  }

  function closeAddPositionModal() {
    const modal = document.getElementById('addPositionModal');
    if (modal) modal.classList.add('hidden');
    const sug = document.getElementById('modalAddPosSuggestions');
    if (sug) sug.classList.add('hidden');
  }

  function resetModalPreviewCard() {
    const titleEl = document.getElementById('modalPreviewSymTitle');
    if (titleEl) titleEl.textContent = '—';
    const nameEl = document.getElementById('modalPreviewSymName');
    if (nameEl) nameEl.textContent = 'Type a symbol above to search or look up details';
    const priceEl = document.getElementById('modalPreviewPrice');
    if (priceEl) priceEl.textContent = '—';
    const currEl = document.getElementById('modalPreviewCurrency');
    if (currEl) currEl.textContent = '';
    const divsEl = document.getElementById('modalPreviewDivisions');
    if (divsEl) divsEl.innerHTML = '';
  }

  function onModalSymbolInput(rawVal) {
    const val = (rawVal || '').trim();
    const sug = document.getElementById('modalAddPosSuggestions');
    if (!sug) return;
    clearTimeout(modalSymbolDebounceTimer);

    if (!val) {
      sug.innerHTML = '';
      sug.classList.add('hidden');
      resetModalPreviewCard();
      modalSelectedSymbolData = null;
      updateModalEstimatedValue();
      return;
    }

    const q = val.toLowerCase();
    const symbolsMap = (appState.symbols && appState.symbols.symbols) ? appState.symbols.symbols : {};
    const matches = [];

    for (const [symKey, def] of Object.entries(symbolsMap)) {
      const symLow = symKey.toLowerCase();
      const nameLow = (def.name || '').toLowerCase();
      let score = 0;
      if (symLow === q) score = 100;
      else if (symLow.startsWith(q)) score = 80;
      else if (symLow.includes(q)) score = 60;
      else if (nameLow.includes(q)) score = 40;

      if (score > 0) {
        const cachedPriceObj = (appState.cache && appState.cache.prices) ? appState.cache.prices[symKey] : null;
        matches.push({
          symbol: symKey,
          name: def.name || symKey,
          exchange: def.exchange || 'TSE',
          currency: def.currency || 'CAD',
          price: cachedPriceObj ? cachedPriceObj.price : (def.fixed_price || 0),
          divisions: def.default_divisions || {},
          score: score
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, 7);

    let html = '';
    if (topMatches.length > 0) {
      html += topMatches.map(m => `
        <div class="symbol-suggestion-row" onclick="selectModalSymbol('${esc(m.symbol)}')"
             style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;transition:background 0.12s;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="pill pill-primary" style="font-weight:700;">${esc(m.symbol)}</span>
            <span style="font-size:12.5px;font-weight:600;color:var(--text);">${esc(m.name)}</span>
          </div>
          <div style="font-size:11.5px;color:var(--text-secondary);text-align:right;white-space:nowrap;margin-left:12px;">
            <span>${esc(m.exchange)} · ${esc(m.currency)}</span>
            ${m.price > 0 ? ` · <b>$${Number(m.price).toFixed(2)}</b>` : ''}
          </div>
        </div>
      `).join('');
    }

    const cleanTicker = val.toUpperCase().replace(/[^A-Z0-9.]/g, '');
    html += `
      <div class="symbol-suggestion-row" onclick="triggerOnlineSymbolLookup('${esc(cleanTicker)}')"
           style="padding:8px 12px;cursor:pointer;font-size:12px;color:var(--primary);background:var(--bg-subtle);display:flex;align-items:center;gap:6px;">
        <span>🔍 Search online quote for <b>"${esc(cleanTicker)}"</b>...</span>
      </div>
    `;

    sug.innerHTML = html;
    sug.classList.remove('hidden');

    if (cleanTicker.length >= 2 && !symbolsMap[cleanTicker]) {
      modalSymbolDebounceTimer = setTimeout(() => {
        triggerOnlineSymbolLookup(cleanTicker, true);
      }, 500);
    } else if (symbolsMap[cleanTicker]) {
      selectModalSymbol(cleanTicker, true);
    }
  }

  function onModalSymbolKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = (document.getElementById('modalAddPosSymbolInput').value || '').trim();
      if (val) {
        triggerOnlineSymbolLookup(val.toUpperCase(), false);
      }
    } else if (e.key === 'Escape') {
      const sug = document.getElementById('modalAddPosSuggestions');
      if (sug) sug.classList.add('hidden');
    }
  }

  async function triggerOnlineSymbolLookup(ticker, isDebounceAuto) {
    if (!ticker) return;
    const spinner = document.getElementById('modalAddPosSpinner');
    if (spinner) spinner.classList.remove('hidden');
    try {
      const res = await fetch(`/api/symbols/lookup?symbol=${encodeURIComponent(ticker)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.symbol) {
          selectModalSymbol(data.symbol, false, data);
          return;
        }
      }
    } catch (err) {
      console.warn('Online symbol lookup failed:', err);
    } finally {
      if (spinner) spinner.classList.add('hidden');
    }

    if (!isDebounceAuto) {
      selectModalSymbol(ticker, false, {
        symbol: ticker,
        name: ticker,
        exchange: 'TSE',
        currency: 'CAD',
        price: 0
      });
    }
  }

  function selectModalSymbol(symKey, keepSuggestionsOpen, onlineData) {
    clearTimeout(modalSymbolDebounceTimer);
    const symInp = document.getElementById('modalAddPosSymbolInput');
    if (symInp) symInp.value = symKey;

    if (!keepSuggestionsOpen) {
      const sug = document.getElementById('modalAddPosSuggestions');
      if (sug) sug.classList.add('hidden');
    }

    const symbolsMap = (appState.symbols && appState.symbols.symbols) ? appState.symbols.symbols : {};
    const localDef = symbolsMap[symKey] || {};
    const cachedPriceObj = (appState.cache && appState.cache.prices) ? appState.cache.prices[symKey] : null;

    const name = (onlineData && onlineData.name) || localDef.name || symKey;
    const exchange = (onlineData && onlineData.exchange) || localDef.exchange || 'TSE';
    const currency = (onlineData && onlineData.currency) || localDef.currency || 'CAD';
    const price = (onlineData && onlineData.price > 0)
      ? onlineData.price
      : (cachedPriceObj ? cachedPriceObj.price : (localDef.fixed_price || 0));
    const divisions = localDef.default_divisions || { "Canada": 1.0 };

    modalSelectedSymbolData = {
      symbol: symKey,
      name: name,
      exchange: exchange,
      currency: currency,
      price: price,
      divisions: divisions
    };

    // Render Preview Card
    const titleEl = document.getElementById('modalPreviewSymTitle');
    if (titleEl) titleEl.textContent = `${symKey} (${exchange})`;
    const nameEl = document.getElementById('modalPreviewSymName');
    if (nameEl) nameEl.textContent = name;
    const priceEl = document.getElementById('modalPreviewPrice');
    if (priceEl) priceEl.textContent = price > 0 ? fmtPrice(price) : 'No price quote';
    const currEl = document.getElementById('modalPreviewCurrency');
    if (currEl) currEl.textContent = currency;

    const divsEl = document.getElementById('modalPreviewDivisions');
    if (divsEl) {
      divsEl.innerHTML = Object.entries(divisions).map(([d, w]) => `
        <span class="pill pill-neutral" style="font-size:11px;">${esc(tTerm(d))}: ${fmtPct(w, 0)}</span>
      `).join('');
    }

    updateModalEstimatedValue();

    if (!keepSuggestionsOpen) {
      const sharesInp = document.getElementById('modalAddPosSharesInput');
      if (sharesInp) setTimeout(() => sharesInp.focus(), 50);
    }
  }

  function updateModalEstimatedValue() {
    const sharesInp = document.getElementById('modalAddPosSharesInput');
    const estEl = document.getElementById('modalAddPosEstValue');
    if (!sharesInp || !estEl) return;

    const shares = parseFloat(String(sharesInp.value).replace(/,/g, '')) || 0;
    const isManual = document.getElementById('modalAddPosManualToggle')?.checked;
    if (isManual) {
      const curr = document.getElementById('modalAddPosManualCurrency')?.value || 'CAD';
      const fx = curr === 'USD' ? ((currentEval && currentEval.usd_cad_rate) || 1.41) : 1.0;
      estEl.textContent = fmtMoney(shares * fx);
      return;
    }
    if (!modalSelectedSymbolData || !modalSelectedSymbolData.price || shares <= 0) {
      estEl.textContent = '$0.00';
      return;
    }

    const price = modalSelectedSymbolData.price;
    const curr = modalSelectedSymbolData.currency || 'CAD';
    const fx = curr === 'USD' ? ((currentEval && currentEval.usd_cad_rate) || 1.41) : 1.0;
    const cadVal = shares * price * fx;
    estEl.textContent = fmtMoney(cadVal);
  }

  function onToggleManualAssetMode() {
    const isManual = !!document.getElementById('modalAddPosManualToggle')?.checked;
    const fields = document.getElementById('modalAddPosManualFields');
    if (fields) fields.classList.toggle('hidden', !isManual);
    const sug = document.getElementById('modalAddPosSuggestions');
    if (sug && isManual) sug.classList.add('hidden');
    const sharesLbl = document.getElementById('modalAddPosSharesLabel');
    if (sharesLbl) sharesLbl.textContent = isManual ? 'Amount' : 'Shares / Principal';
    if (isManual) {
      onManualAssetInput();
      const addDivSel = document.getElementById('modalAddPosDivision');
      if (addDivSel && addDivSel.value === '') addDivSel.value = '__none__';
    } else {
      resetModalPreviewCard();
      updateModalEstimatedValue();
    }
  }

  function onManualAssetInput() {
    const isManual = !!document.getElementById('modalAddPosManualToggle')?.checked;
    if (!isManual) return;
    const sym = (document.getElementById('modalAddPosSymbolInput')?.value || '').trim() || 'Manual';
    const name = (document.getElementById('modalAddPosManualName')?.value || '').trim() || sym;
    const curr = document.getElementById('modalAddPosManualCurrency')?.value || 'CAD';
    modalSelectedSymbolData = {
      symbol: sym,
      name: name,
      price: 1,
      currency: curr,
      is_manual: true
    };
    const titleEl = document.getElementById('modalPreviewSymTitle');
    if (titleEl) titleEl.textContent = `${sym} · Manual Asset`;
    const nameEl = document.getElementById('modalPreviewSymName');
    if (nameEl) nameEl.textContent = name;
    const priceEl = document.getElementById('modalPreviewPrice');
    if (priceEl) priceEl.textContent = 'Manual';
    const currEl = document.getElementById('modalPreviewCurrency');
    if (currEl) currEl.textContent = curr;
    updateModalEstimatedValue();
  }

  async function submitAddPositionModal() {
    if (isGroupSelection(selectedPortfolio)) return;
    const accSel = document.getElementById('modalAddPosAccountSelect');
    const acc = accSel ? accSel.value.trim() : '';
    const symInp = document.getElementById('modalAddPosSymbolInput');
    const rawSym = symInp ? symInp.value.trim() : '';
    const isManual = !!document.getElementById('modalAddPosManualToggle')?.checked;
    const sym = isManual ? rawSym : rawSym.toUpperCase();
    const sharesInp = document.getElementById('modalAddPosSharesInput');
    const rawAmountOrShares = sharesInp ? parseFloat(String(sharesInp.value).replace(/,/g, '')) : 0;
    const noteInp = document.getElementById('modalAddPosNoteInput');
    const note = noteInp ? noteInp.value.trim() : '';
    const bucketVal = document.getElementById('modalAddPosBucket')?.value || '';
    const divVal = document.getElementById('modalAddPosDivision')?.value || '';

    if (!acc) {
      alert('Please select or specify an account.');
      return;
    }
    if (!sym) {
      alert('Please enter a symbol or ETF ticker.');
      return;
    }
    if (isNaN(rawAmountOrShares) || rawAmountOrShares === 0 || (!isManual && rawAmountOrShares < 0)) {
      alert(isManual ? 'Please enter a non-zero amount.' : 'Please enter a valid share quantity greater than zero.');
      return;
    }

    let shares = rawAmountOrShares;
    if (isManual) {
      const manName = (document.getElementById('modalAddPosManualName')?.value || '').trim() || sym;
      const manCurr = document.getElementById('modalAddPosManualCurrency')?.value || 'CAD';
      const symbolsCfg = (appState && appState.symbols) ? appState.symbols : { symbols: {} };
      if (!symbolsCfg.symbols) symbolsCfg.symbols = {};
      const existingSym = symbolsCfg.symbols[sym] || {};
      symbolsCfg.symbols[sym] = {
        asset_type: existingSym.asset_type || 'cash',
        name: manName,
        exchange: 'MANUAL',
        currency: manCurr,
        tax_structure: existingSym.tax_structure || 'domestic_canadian',
        default_mer: existingSym.default_mer || 0,
        fixed_price: Math.abs(rawAmountOrShares),
        default_divisions: existingSym.default_divisions || {}
      };
      const symRes = await fetch('/api/symbols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(symbolsCfg)
      });
      if (!symRes.ok) {
        alert('Failed to register manual asset.');
        return;
      }
      appState = await symRes.json();
      shares = rawAmountOrShares < 0 ? -1 : 1;
    }

    if (!currentPortfolioConfig.holdings) currentPortfolioConfig.holdings = [];

    const existing = currentPortfolioConfig.holdings.find(h => h.account === acc && h.symbol.toLowerCase() === sym.toLowerCase());
    if (existing) {
      existing.shares += shares;
      if (bucketVal || divVal) applyPositionBucketAndDivision(existing, acc, bucketVal, divVal);
      if (note) existing.note = (existing.note ? existing.note + '; ' : '') + note;
    } else {
      const defAcc = (currentPortfolioConfig.accounts || []).find(a => a.name === acc);
      const newHold = {
        account: acc,
        symbol: sym,
        shares: shares
      };
      if (defAcc && defAcc.account_type) {
        newHold.account_type = defAcc.account_type;
      }
      if (bucketVal || divVal) applyPositionBucketAndDivision(newHold, acc, bucketVal, divVal);
      if (note) newHold.note = note;
      currentPortfolioConfig.holdings.push(newHold);
    }

    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPortfolioConfig)
    });

    if (!res.ok) {
      alert('Failed to save portfolio position.');
      return;
    }

    closeAddPositionModal();
    await loadStateAndEvaluate();
    showToast(`Added ${round4(shares)} shares of ${sym} to ${acc}`);
  }

  async function deleteHolding(holdingID) {
    currentPortfolioConfig.holdings = (currentPortfolioConfig.holdings || []).filter(h => h.id !== holdingID);
    await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPortfolioConfig)
    });
    await loadStateAndEvaluate();
    showToast('Removed position');
  }

  // --- Strategy, Categories, Divisions & Groups ---

  let activeDraggedHolding = null;
  let activeDraggedAccountCard = null;

  function initDraggableTables() {
    if (isGroupSelection(selectedPortfolio)) return;
    document.querySelectorAll('table[data-drag-scope]').forEach(table => {
      const tbody = table.querySelector('tbody');
      if (!tbody) return;
      const scope = table.dataset.dragScope;
      const inAccountCards = !!table.closest('#accountCardsContainer') && scope === 'holdings';
      const rows = Array.from(tbody.querySelectorAll('tr[data-holding-id], tr[data-row-key]'));
      if (rows.length === 0) return;
      if (rows.length === 1 && !inAccountCards) return;

      let draggedRow = null;

      rows.forEach(tr => {
        tr.draggable = true;

        tr.addEventListener('mousedown', (e) => {
          if (e.target.closest('input, select, textarea, button, a')) {
            tr.draggable = false;
          } else {
            tr.draggable = true;
          }
        });

        tr.addEventListener('mouseup', () => {
          tr.draggable = true;
        });

        tr.addEventListener('dragstart', (e) => {
          e.stopPropagation();
          draggedRow = tr;
          if (inAccountCards) {
            activeDraggedHolding = {
              tr,
              holdingId: tr.dataset.holdingId || '',
              sourceAccount: table.dataset.account || '',
              sourceTbody: tbody
            };
          }
          tr.classList.add('dragging-row');
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', tr.dataset.holdingId || tr.dataset.rowKey || '');
          }
        });

        tr.addEventListener('dragend', () => {
          tr.classList.remove('dragging-row');
          document.querySelectorAll('tr.drag-over-above, tr.drag-over-below').forEach(r => r.classList.remove('drag-over-above', 'drag-over-below'));
          document.querySelectorAll('.div-card.drag-target-card').forEach(c => c.classList.remove('drag-target-card'));
          draggedRow = null;
          activeDraggedHolding = null;
        });

        tr.addEventListener('dragover', (e) => {
          if (activeDraggedAccountCard) return;
          const sameTable = draggedRow && draggedRow !== tr && draggedRow.parentElement === tbody;
          const crossAccount = inAccountCards && activeDraggedHolding && activeDraggedHolding.tr !== tr && activeDraggedHolding.sourceTbody !== tbody;
          if (!sameTable && !crossAccount) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          const rect = tr.getBoundingClientRect();
          const above = e.clientY < rect.top + rect.height / 2;
          document.querySelectorAll('tr.drag-over-above, tr.drag-over-below').forEach(r => r.classList.remove('drag-over-above', 'drag-over-below'));
          tr.classList.add(above ? 'drag-over-above' : 'drag-over-below');
          if (crossAccount) {
            const card = table.closest('.div-card[data-account]');
            if (card) card.classList.add('drag-target-card');
          }
        });

        tr.addEventListener('dragleave', () => {
          tr.classList.remove('drag-over-above', 'drag-over-below');
        });

        tr.addEventListener('drop', async (e) => {
          if (activeDraggedAccountCard) return;
          const sameTable = draggedRow && draggedRow !== tr && draggedRow.parentElement === tbody;
          const crossAccount = inAccountCards && activeDraggedHolding && activeDraggedHolding.tr !== tr && activeDraggedHolding.sourceTbody !== tbody;
          if (!sameTable && !crossAccount) return;
          e.preventDefault();
          e.stopPropagation();
          const rect = tr.getBoundingClientRect();
          const above = e.clientY < rect.top + rect.height / 2;
          tr.classList.remove('drag-over-above', 'drag-over-below');

          if (crossAccount) {
            const targetCard = table.closest('.div-card[data-account]');
            if (targetCard) targetCard.classList.remove('drag-target-card');
            const targetAccount = table.dataset.account || (targetCard ? targetCard.dataset.account : '');
            const targetAccountType = targetCard ? (targetCard.dataset.accountType || '') : '';
            const holdingId = activeDraggedHolding.holdingId;
            activeDraggedHolding = null;
            await moveHoldingToAccount(holdingId, targetAccount, targetAccountType, tr.dataset.holdingId || null, above);
            return;
          }

          tbody.insertBefore(draggedRow, above ? tr : tr.nextSibling);

          // Clear temporary column sort so persisted YAML order takes precedence
          const tableKey = table.dataset.sortTable;
          if (tableKey && typeof tableSortState === 'object') {
            delete tableSortState[tableKey];
            table.querySelectorAll('thead tr th').forEach(th => {
              th.classList.remove('sort-asc', 'sort-desc');
              const icon = th.querySelector('.sort-icon');
              if (icon) icon.textContent = '↕';
            });
          }

          const newKeys = Array.from(tbody.querySelectorAll('tr[data-holding-id], tr[data-row-key]'))
            .map(r => scope === 'holdings' ? r.dataset.holdingId : r.dataset.rowKey)
            .filter(Boolean);

          await persistPortfolioOrder(scope, newKeys);
        });
      });
    });

    initDraggableAccountCards();
    initDraggableDivisionCards();
    initDraggableBucketCards();
  }

  function initDraggableBucketCards() {
    initDraggableCardList({
      containerId: 'bucketCardsContainer',
      dataAttr: 'bucket',
      orderScope: 'bucketOrder',
      allowHoldingDrop: false
    });
  }

  function initDraggableDivisionCards() {
    initDraggableCardList({
      containerId: 'divisionCardsContainer',
      dataAttr: 'division',
      orderScope: 'divisionOrder',
      allowHoldingDrop: false
    });
  }

  function initDraggableAccountCards() {
    initDraggableCardList({
      containerId: 'accountCardsContainer',
      dataAttr: 'account',
      orderScope: 'accountOrder',
      allowHoldingDrop: true
    });
  }

  function initDraggableCardList({ containerId, dataAttr, orderScope, allowHoldingDrop }) {
    if (isGroupSelection(selectedPortfolio)) return;
    const container = document.getElementById(containerId);
    if (!container) return;
    const cards = Array.from(container.querySelectorAll(`.div-card[data-${dataAttr}]`));
    if (cards.length === 0) return;

    cards.forEach(card => {
      const header = card.querySelector('.div-card-header');
      if (!header) return;

      if (cards.length > 1) {
        card.draggable = true;

        card.addEventListener('mousedown', (e) => {
          // Only allow dragging card from its header (not inner tables/inputs/buttons)
          if (!e.target.closest('.div-card-header') || e.target.closest('button, a, input, select')) {
            card.draggable = false;
          } else {
            card.draggable = true;
          }
        });

        card.addEventListener('mouseup', () => {
          card.draggable = true;
        });

        card.addEventListener('dragstart', (e) => {
          if (activeDraggedHolding) {
            e.preventDefault();
            return;
          }
          activeDraggedAccountCard = {
            card,
            containerId,
            key: card.dataset[dataAttr] || ''
          };
          card.classList.add('dragging-card');
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', card.dataset[dataAttr] || '');
          }
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('dragging-card');
          container.querySelectorAll('.div-card').forEach(c => c.classList.remove('drag-over-above', 'drag-over-below', 'drag-target-card'));
          activeDraggedAccountCard = null;
        });
      }

      card.addEventListener('dragover', (e) => {
        if (allowHoldingDrop && activeDraggedHolding && activeDraggedHolding.sourceAccount !== (card.dataset.account || '')) {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          container.querySelectorAll('.div-card').forEach(c => {
            if (c !== card) c.classList.remove('drag-target-card');
          });
          card.classList.add('drag-target-card');
          return;
        }
        if (activeDraggedAccountCard && activeDraggedAccountCard.containerId === containerId && activeDraggedAccountCard.card !== card) {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          const rect = card.getBoundingClientRect();
          const above = e.clientY < rect.top + rect.height / 2;
          container.querySelectorAll('.div-card').forEach(c => c.classList.remove('drag-over-above', 'drag-over-below'));
          card.classList.add(above ? 'drag-over-above' : 'drag-over-below');
        }
      });

      card.addEventListener('dragleave', (e) => {
        if (!card.contains(e.relatedTarget)) {
          card.classList.remove('drag-over-above', 'drag-over-below', 'drag-target-card');
        }
      });

      card.addEventListener('drop', async (e) => {
        // Drop holding onto an account card (e.g. empty account card or header)
        if (allowHoldingDrop && activeDraggedHolding && activeDraggedHolding.sourceAccount !== (card.dataset.account || '')) {
          e.preventDefault();
          card.classList.remove('drag-target-card');
          const holdingId = activeDraggedHolding.holdingId;
          const targetAccount = card.dataset.account || '';
          const targetAccountType = card.dataset.accountType || '';
          activeDraggedHolding = null;
          await moveHoldingToAccount(holdingId, targetAccount, targetAccountType, null, false);
          return;
        }
        // Drop card to reorder
        if (activeDraggedAccountCard && activeDraggedAccountCard.containerId === containerId && activeDraggedAccountCard.card !== card) {
          e.preventDefault();
          const rect = card.getBoundingClientRect();
          const above = e.clientY < rect.top + rect.height / 2;
          card.classList.remove('drag-over-above', 'drag-over-below');
          container.insertBefore(activeDraggedAccountCard.card, above ? card : card.nextSibling);
          activeDraggedAccountCard = null;
          const newOrder = Array.from(container.querySelectorAll(`.div-card[data-${dataAttr}]`))
            .map(c => c.dataset[dataAttr])
            .filter(Boolean);
          await persistPortfolioOrder(orderScope, newOrder);
        }
      });
    });
  }

  async function moveHoldingToAccount(holdingId, targetAccount, targetAccountType, targetHoldingId, insertAbove) {
    if (!currentPortfolioConfig || isGroupSelection(selectedPortfolio) || !holdingId || !targetAccount) return;
    const holds = currentPortfolioConfig.holdings || [];
    const srcIdx = holds.findIndex(h => h.id === holdingId);
    if (srcIdx < 0) return;

    const item = holds[srcIdx];
    const oldAcc = item.account;
    if (oldAcc === targetAccount) return;

    item.account = targetAccount;
    if (targetAccountType) {
      item.account_type = targetAccountType;
    } else {
      const defAcc = (currentPortfolioConfig.accounts || []).find(a => a.name === targetAccount);
      const sibling = holds.find(h => h.id !== holdingId && h.account === targetAccount && h.account_type);
      if (defAcc && defAcc.account_type) {
        item.account_type = defAcc.account_type;
      } else if (sibling) {
        item.account_type = sibling.account_type;
      } else {
        delete item.account_type;
      }
    }

    if (targetHoldingId) {
      const without = holds.filter((_, i) => i !== srcIdx);
      const tgtIdx = without.findIndex(h => h.id === targetHoldingId);
      if (tgtIdx >= 0) {
        without.splice(insertAbove ? tgtIdx : tgtIdx + 1, 0, item);
        currentPortfolioConfig.holdings = without;
      }
    }

    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPortfolioConfig)
    });
    if (!res.ok) {
      showToast('Failed to move position');
      return;
    }
    currentEval = await res.json();
    const pRes = await fetch(`/api/portfolio?id=${encodeURIComponent(selectedPortfolio)}`);
    if (pRes.ok) {
      currentPortfolioConfig = await pRes.json();
    }
    renderAll();
    showToast(`Moved ${item.symbol} to ${targetAccount}`);
  }

  function reorderHoldingsSubset(holdings, orderedIDs) {
    const uniqueOrder = [];
    const seen = new Set();
    for (const id of orderedIDs) {
      if (!seen.has(id)) {
        seen.add(id);
        uniqueOrder.push(id);
      }
    }
    const byID = {};
    const targetIndices = [];
    holdings.forEach((h, idx) => {
      if (seen.has(h.id)) {
        byID[h.id] = h;
        targetIndices.push(idx);
      }
    });
    if (targetIndices.length !== uniqueOrder.length) return holdings;
    const next = holdings.slice();
    targetIndices.forEach((slotIdx, i) => {
      next[slotIdx] = byID[uniqueOrder[i]];
    });
    return next;
  }

  async function persistPortfolioOrder(scope, orderedList) {
    if (!currentPortfolioConfig || isGroupSelection(selectedPortfolio)) return;
    if (scope === 'holdings') {
      currentPortfolioConfig.holdings = reorderHoldingsSubset(currentPortfolioConfig.holdings || [], orderedList);
    } else if (scope === 'divisionOrder') {
      currentPortfolioConfig.division_order = orderedList;
    } else if (scope === 'accountOrder') {
      currentPortfolioConfig.account_order = orderedList;
    } else if (scope === 'classificationOrder') {
      currentPortfolioConfig.classification_order = orderedList;
    } else if (scope === 'categoryOrder') {
      currentPortfolioConfig.category_order = orderedList;
    } else if (scope === 'bucketOrder') {
      currentPortfolioConfig.bucket_order = orderedList;
    } else {
      return;
    }

    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPortfolioConfig)
    });
    if (!res.ok) {
      showToast('Failed to save row order');
      return;
    }
    currentEval = await res.json();
    const pRes = await fetch(`/api/portfolio?id=${encodeURIComponent(selectedPortfolio)}`);
    if (pRes.ok) {
      currentPortfolioConfig = await pRes.json();
    }
    renderAll();
    showToast('Saved row order to portfolio YAML');
  }

  function renderBucketView() {
    renderKpiGrids();
    renderBucketSummaryTable();
    renderBucketCards();
    initSortableTables();
  }

  function renderBucketSummaryTable() {
    const e = currentEval;
    const el = document.getElementById('bucketSummaryTable');
    if (!el || !e) return;
    const buckets = e.bucket_summaries || [];
    const isGrp = isGroupSelection(selectedPortfolio);
    el.dataset.dragScope = 'bucketOrder';

    if (buckets.length === 0) {
      el.innerHTML = `<tbody><tr><td class="center text-muted" style="padding:18px;">No buckets defined yet.</td></tr></tbody>`;
      return;
    }

    el.innerHTML = `
      <thead>
        <tr>
          <th class="left">Bucket</th>
          <th>Positions</th>
          <th>Value (CAD)</th>
          <th>% of Net Worth</th>
        </tr>
      </thead>
      <tbody>
        ${buckets.map(b => {
          const badge = b.is_allocation_bucket
            ? ` <span class="pill pill-primary" style="font-size:10.5px;">Allocated</span>`
            : (b.is_default ? ` <span class="pill pill-neutral" style="font-size:10.5px;">Default</span>` : '');
          return `
            <tr data-row-key="${esc(b.bucket)}">
              <td class="left">${dragHandleHtml(isGrp)}<b>${esc(b.bucket)}</b>${badge}</td>
              <td data-sort="${b.position_count}">${b.position_count}</td>
              <td data-sort="${b.market_value_cad}"><b>${fmtMoney(b.market_value_cad)}</b></td>
              <td class="text-muted" data-sort="${b.net_worth_ratio}">${fmtPct(b.net_worth_ratio, 1)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    `;
  }

  function renderBucketCards() {
    const e = currentEval;
    const container = document.getElementById('bucketCardsContainer');
    if (!container || !e) return;
    const buckets = e.bucket_summaries || [];
    if (buckets.length === 0) {
      container.innerHTML = `<div class="card text-muted center" style="padding:24px;">No buckets defined yet. Click <b>+ New Bucket</b> to create one, or assign a bucket from Edit Position.</div>`;
      updateCollapseAllButton('bucketCardsContainer');
      return;
    }

    const isGrp = isGroupSelection(selectedPortfolio);

    container.innerHTML = buckets.map((b, idx) => {
      const color = DIVISION_COLORS[idx % DIVISION_COLORS.length];
      const cardKey = `bucket:${b.bucket}`;
      const isCollapsed = collapsedCards.has(cardKey);

      const rowsHtml = (b.holdings || []).map(h => {
        const secLabelHtml = !isGrp
          ? `<span class="sec-edit-link" onclick="openEditPositionModal(this.closest('tr').dataset.holdingId)" title="Edit ${esc(h.symbol)}">
               ${formatSecurityNameHtml(h.symbol, h.symbol_name)}
             </span>`
          : formatSecurityNameHtml(h.symbol, h.symbol_name);

        return `
          <tr data-holding-id="${esc(h.holding_id)}" oncontextmenu="openPositionContextMenu(event, this.dataset.holdingId)">
            <td class="left wrap-text"><b>${esc(h.account)}</b></td>
            <td class="left wrap-text">${secLabelHtml}</td>
            <td class="text-muted" data-sort="${isManualSymbol(h.symbol) ? 0 : h.share_price}">${isManualSymbol(h.symbol) ? '—' : `${fmtPrice(h.share_price)} <span style="font-size:11px;">${esc(h.currency)}</span>`}</td>
            <td data-sort="${h.shares}">${renderEditableSharesCell(h.holding_id, h.shares, h.symbol, h.account, isGrp)}</td>
            <td data-sort="${h.market_value_cad}">${renderManualOrValueCell(h.holding_id, h.symbol, h.shares, h.share_price, h.market_value_cad, h.currency, isGrp)}</td>
          </tr>
        `;
      }).join('');

      const canRenameOrDelete = !b.is_default;
      const menuHtml = (!isGrp && canRenameOrDelete) ? `
        <div class="card-menu-wrap">
          <button type="button" class="btn btn-sm btn-ghost card-menu-btn"
                  onclick="toggleAccountCardMenu(event, this)"
                  title="Bucket actions" aria-haspopup="true" aria-expanded="false">⋯</button>
          <div class="card-menu hidden" role="menu">
            <button type="button" class="card-menu-item" role="menuitem"
                    onclick="closeAllAccountMenus(); renameBucket(this.closest('.div-card').dataset.bucket)">
              ✎ Rename Bucket
            </button>
            <div class="card-menu-sep"></div>
            <button type="button" class="card-menu-item danger" role="menuitem"
                    onclick="closeAllAccountMenus(); deleteBucket(this.closest('.div-card').dataset.bucket)">
              ✕ Delete Bucket
            </button>
          </div>
        </div>
      ` : '';
      const roleBadgeHtml = b.is_allocation_bucket
        ? `<span class="pill pill-primary" style="font-size:11px;" title="Participates in Strategy Targets & Allocations">Allocated</span>`
        : (b.is_default ? `<span class="pill pill-neutral" style="font-size:11px;" title="Fallback bucket for unassigned accounts and positions">Default</span>` : '');
      const viewAllocBtnHtml = b.is_allocation_bucket
        ? `<button type="button" class="btn btn-sm" onclick="event.stopPropagation(); switchPortfolioSubTab('allocations')" title="Open Retirement Allocations">View Allocations →</button>`
        : '';

      return `
        <div class="div-card${isCollapsed ? ' collapsed' : ''}" data-card-key="${esc(cardKey)}" data-bucket="${esc(b.bucket)}">
          <div class="div-card-header" onclick="onDivCardHeaderClick(event)">
            <div class="div-title-group" style="display:flex;align-items:center;gap:6px;">
              ${dragHandleHtml(isGrp)}
              <span class="card-chevron">▾</span>
              <span class="legend-dot" style="background:${color};width:12px;height:12px;"></span>
              <span style="font-size:15px;font-weight:700;">${esc(b.bucket)}</span>
              ${roleBadgeHtml}
            </div>
            <div class="div-metrics-group" style="display:flex;align-items:center;gap:12px;">
              ${viewAllocBtnHtml}
              <div><span class="text-muted">Value:</span> <b>${fmtMoney(b.market_value_cad)}</b></div>
              ${menuHtml}
            </div>
          </div>
          <div class="div-card-body" style="overflow-x:auto;">
            <table class="table-clean" style="table-layout:fixed;width:100%;" data-sort-table="bucket_${esc(b.bucket)}">
              <colgroup>
                <col style="width:185px;">
                <col>
                <col style="width:110px;">
                <col style="width:105px;">
                <col style="width:125px;">
              </colgroup>
              <thead>
                <tr>
                  <th class="left wrap-text" style="width:185px;">${esc(t('th_account'))}</th>
                  <th class="left">${esc(t('th_security'))}</th>
                  <th>${esc(t('th_price'))}</th>
                  <th>${esc(t('th_shares'))}</th>
                  <th>${esc(t('th_value_cad'))}</th>
                </tr>
              </thead>
              <tbody>${rowsHtml || `<tr><td colspan="5" class="center text-muted" style="padding:20px;">No holdings assigned to ${esc(b.bucket)} yet. Assign holdings from Edit Position.</td></tr>`}</tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');
    updateCollapseAllButton('bucketCardsContainer');
  }

  async function openNewBucketModal() {
    if (isGroupSelection(selectedPortfolio) || !currentPortfolioConfig) return;
    const name = await openPromptModal({
      title: 'New Bucket',
      label: 'Bucket Name (e.g. House, Travel, Auto, Emergency)',
      placeholder: 'e.g. House',
      confirmLabel: 'Create Bucket'
    });
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (trimmed.toLowerCase() === 'retirement' || trimmed.toLowerCase() === 'other') {
      showToast(`"${trimmed}" is a built-in bucket`);
      return;
    }
    if (!Array.isArray(currentPortfolioConfig.buckets)) currentPortfolioConfig.buckets = [];
    if (currentPortfolioConfig.buckets.some(b => b.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Bucket "${trimmed}" already exists`);
      return;
    }
    currentPortfolioConfig.buckets.push({ name: trimmed });
    if (Array.isArray(currentPortfolioConfig.bucket_order) && currentPortfolioConfig.bucket_order.length > 0) {
      currentPortfolioConfig.bucket_order.push(trimmed);
    }
    await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPortfolioConfig)
    });
    await loadStateAndEvaluate();
    showToast(`Created bucket "${trimmed}"`);
  }

  async function renameBucket(oldName) {
    if (isGroupSelection(selectedPortfolio) || !currentPortfolioConfig || !oldName) return;
    if (oldName.toLowerCase() === 'retirement' || oldName.toLowerCase() === 'other') {
      showToast(`Cannot rename built-in bucket "${oldName}"`);
      return;
    }
    const next = await openPromptModal({
      title: 'Rename Bucket',
      label: 'Bucket Name',
      initialValue: oldName,
      confirmLabel: 'Rename'
    });
    if (!next || !next.trim() || next.trim() === oldName) return;
    const newName = next.trim();
    if (newName.toLowerCase() === 'retirement' || newName.toLowerCase() === 'other') {
      showToast(`"${newName}" is a reserved built-in bucket`);
      return;
    }
    (currentPortfolioConfig.buckets || []).forEach(b => {
      if (b.name === oldName) b.name = newName;
    });
    (currentPortfolioConfig.accounts || []).forEach(a => {
      if (a.bucket === oldName) a.bucket = newName;
    });
    (currentPortfolioConfig.holdings || []).forEach(h => {
      if (h.bucket === oldName) h.bucket = newName;
    });
    if (Array.isArray(currentPortfolioConfig.bucket_order)) {
      currentPortfolioConfig.bucket_order = currentPortfolioConfig.bucket_order.map(x => x === oldName ? newName : x);
    }
    await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPortfolioConfig)
    });
    await loadStateAndEvaluate();
    showToast(`Renamed bucket to "${newName}"`);
  }

  async function deleteBucket(bucketName) {
    if (isGroupSelection(selectedPortfolio) || !currentPortfolioConfig || !bucketName) return;
    if (bucketName.toLowerCase() === 'retirement' || bucketName.toLowerCase() === 'other') {
      showToast(`Cannot delete built-in bucket "${bucketName}"`);
      return;
    }
    const ok = await openConfirmModal({
      title: 'Delete Bucket',
      message: `Remove bucket "${bucketName}"? (Accounts and positions using it will fall back cleanly.)`,
      confirmLabel: 'Delete',
      danger: true
    });
    if (!ok) return;
    if (Array.isArray(currentPortfolioConfig.buckets)) {
      currentPortfolioConfig.buckets = currentPortfolioConfig.buckets.filter(b => b.name !== bucketName);
    }
    (currentPortfolioConfig.accounts || []).forEach(a => {
      if (a.bucket === bucketName) delete a.bucket;
    });
    (currentPortfolioConfig.holdings || []).forEach(h => {
      if (h.bucket === bucketName) delete h.bucket;
    });
    if (Array.isArray(currentPortfolioConfig.bucket_order)) {
      currentPortfolioConfig.bucket_order = currentPortfolioConfig.bucket_order.filter(x => x !== bucketName);
    }
    await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPortfolioConfig)
    });
    await loadStateAndEvaluate();
    showToast(`Deleted bucket "${bucketName}"`);
  }

  const collapsedCards = new Set();

  function closeAllAccountMenus() {
    document.querySelectorAll('.card-menu').forEach(m => m.classList.add('hidden'));
    document.querySelectorAll('.card-menu-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }

  function toggleAccountCardMenu(event, btn) {
    event.stopPropagation();
    const wrap = btn.closest('.card-menu-wrap');
    const menu = wrap ? wrap.querySelector('.card-menu') : null;
    if (!menu) return;
    const willOpen = menu.classList.contains('hidden');
    closeAllAccountMenus();
    if (willOpen) {
      menu.classList.remove('hidden');
      btn.setAttribute('aria-expanded', 'true');
    }
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.card-menu-wrap')) {
      closeAllAccountMenus();
    }
  });

  function onDivCardHeaderClick(event, cardKeyArg) {
    if (event.target.closest('button, a, input, select')) return;
    const card = event.currentTarget.closest('.div-card');
    if (!card) return;
    const cardKey = cardKeyArg || card.dataset.cardKey || '';
    const nextCollapsed = !card.classList.contains('collapsed');
    card.classList.toggle('collapsed', nextCollapsed);
    if (cardKey) {
      if (nextCollapsed) {
        collapsedCards.add(cardKey);
      } else {
        collapsedCards.delete(cardKey);
      }
    }
    const container = card.parentElement;
    if (container && container.id) updateCollapseAllButton(container.id);
  }

  function toggleAllCardsIn(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const cards = Array.from(container.querySelectorAll('.div-card[data-card-key]'));
    if (cards.length === 0) return;
    const anyExpanded = cards.some(c => !c.classList.contains('collapsed'));
    cards.forEach(c => {
      const key = c.dataset.cardKey;
      c.classList.toggle('collapsed', anyExpanded);
      if (anyExpanded) {
        collapsedCards.add(key);
      } else {
        collapsedCards.delete(key);
      }
    });
    updateCollapseAllButton(containerId);
  }

  function updateCollapseAllButton(containerId) {
    const btn = document.querySelector(`button[data-collapse-target="${containerId}"]`);
    const container = document.getElementById(containerId);
    if (!btn || !container) return;
    const cards = Array.from(container.querySelectorAll('.div-card[data-card-key]'));
    const allCollapsed = cards.length > 0 && cards.every(c => c.classList.contains('collapsed'));
    btn.textContent = allCollapsed ? 'Expand All' : 'Collapse All';
  }

  function highlightDivision(divName, active) {
    const segs = document.querySelectorAll('#stackedBarsContainer .stacked-seg');
    segs.forEach(seg => {
      const match = seg.dataset.division === divName;
      seg.classList.toggle('div-highlight', active && match);
      seg.classList.toggle('div-dim', active && !match);
    });
    const rows = document.querySelectorAll('#divisionSummaryTable tbody tr[data-division]');
    rows.forEach(row => {
      row.classList.toggle('div-highlight', active && row.dataset.division === divName);
    });
  }

  function scrollToDivisionCard(divName) {
    const cards = document.querySelectorAll('#divisionCardsContainer .div-card[data-division]');
    for (const card of cards) {
      if (card.dataset.division === divName) {
        if (card.classList.contains('collapsed')) {
          card.classList.remove('collapsed');
          if (card.dataset.cardKey) collapsedCards.delete(card.dataset.cardKey);
          updateCollapseAllButton('divisionCardsContainer');
        }
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.remove('div-card-flash');
        void card.offsetWidth;
        card.classList.add('div-card-flash');
        setTimeout(() => card.classList.remove('div-card-flash'), 1600);
        break;
      }
    }
  }

  


// === web/js/securities.js ===
/**
 * Embsay — ETFs & Tax View (Catalog, FWT Intelligence & Recipes)
 */

  function isETFSymbol(symID, s) {
    if (!s) return false;
    if (s.asset_type === 'stock' || s.tax_structure === 'US_DOMESTIC') return false;
    if (s.fixed_price && (symID.startsWith('CASH') || symID.startsWith('GIC'))) return false;
    if (s.asset_type === 'etf' || s.metadata_recipe) return true;
    const nameUpper = (s.name || '').toUpperCase();
    if (nameUpper.includes('ETF') || nameUpper.includes('INDEX')) return true;
    if ((s.default_mer || 0) > 0) return true;
    const knownETFs = ['VAB', 'ZAG', 'ZDB', 'VTI', 'XUU', 'IEFA', 'XEF', 'IEMG', 'XEC', 'ZCN', 'XAW', 'XEQT', 'VEQT', 'VBAL', 'VCIP'];
    return knownETFs.includes(symID);
  }

  function renderSecuritiesTab() {
    if (!appState || !appState.divisions || !appState.symbols || !appState.cache) return;
    const divs = appState.divisions.divisions || [];
    const newSymDiv = document.getElementById('newSymDiv');
    if (newSymDiv) {
      newSymDiv.innerHTML = divs.map(d => `<option value="${esc(d.name)}">${esc(tTerm(d.name))}</option>`).join('');
    }

    const symbolsMap = appState.symbols.symbols || {};
    const cacheMeta = appState.cache.symbol_metadata || {};

    const symIDs = Object.keys(symbolsMap).filter(symID => isETFSymbol(symID, symbolsMap[symID])).sort();
    let rowsHtml = '';

    symIDs.forEach(symID => {
      const s = symbolsMap[symID];
      const cm = cacheMeta[symID] || { mer: s.default_mer || 0, tax_by_account: {}, divisions: s.default_divisions || {} };
      const taxMap = cm.tax_by_account || {};
      const divMap = (cm.divisions && Object.keys(cm.divisions).length > 0) ? cm.divisions : (s.default_divisions || {});

      const divInputs = divs.map(d => {
        const w = (divMap[d.name] || 0) * 100;
        return `
          <td>
            <input type="text" inputmode="decimal" class="inline-num cache-div-input"
                   style="width:62px;" data-sym="${esc(symID)}" data-div="${esc(d.name)}"
                   value="${round4(w)}" />
          </td>
        `;
      }).join('');

      rowsHtml += `
        <tr>
          <td class="left"><b>${esc(symID)}</b></td>
          <td class="left">${esc(s.name)}</td>
          <td class="center text-muted">${esc(s.currency)}</td>
          <td>
            <input type="text" inputmode="decimal" class="inline-num cache-mer-input"
                   style="width:62px;" data-sym="${esc(symID)}"
                   value="${round4((cm.mer || s.default_mer || 0) * 100)}" />
          </td>
          <td class="center">
            <span class="pill pill-neutral" style="font-size:11.5px;" title="${esc(s.tax_structure || 'CA_CA')}">
              ${esc(s.tax_structure || 'CA_CA')}
            </span>
          </td>
          <td>
            <input type="text" inputmode="decimal" class="inline-num cache-tax-input"
                   style="width:62px;" data-sym="${esc(symID)}" data-acc="rrsp"
                   value="${round4((taxMap.rrsp || 0) * 100)}" />
          </td>
          <td>
            <input type="text" inputmode="decimal" class="inline-num cache-tax-input"
                   style="width:62px;" data-sym="${esc(symID)}" data-acc="tfsa"
                   value="${round4((taxMap.tfsa || 0) * 100)}" />
          </td>
          <td>
            <input type="text" inputmode="decimal" class="inline-num cache-tax-input"
                   style="width:62px;" data-sym="${esc(symID)}" data-acc="non_registered"
                   value="${round4((taxMap.non_registered || 0) * 100)}" />
          </td>
          ${divInputs}
        </tr>
      `;
    });

    const divHeaders = divs.map(d => `<th>${esc(tTerm(d.name))} (%)</th>`).join('');

    const cacheTable = document.getElementById('symbolsCacheTable');
    if (cacheTable) {
      cacheTable.innerHTML = `
        <thead>
          <tr>
            <th class="left">${esc(t('th_symbol'))}</th>
            <th class="left">${esc(t('th_name'))}</th>
            <th class="center">${esc(t('th_curr'))}</th>
            <th>${esc(t('lbl_mer_pct'))}</th>
            <th class="center">${esc(t('th_tax_structure'))}</th>
            <th>${esc(t('th_rrsp_tax'))}</th>
            <th>${esc(t('th_tfsa_tax'))}</th>
            <th>${esc(t('th_taxable_tax'))}</th>
            ${divHeaders}
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      `;
    }

    // Render FWT Table and Inspector
    renderTaxStructureRulesTable();
    renderFWTInspector();

    // Recipes summary
    const ds = appState.data_sources || {};
    const recipesEl = document.getElementById('recipesContainer');
    if (recipesEl) {
      recipesEl.innerHTML = `
        <div class="card">
          <h3 class="section-title" style="margin-bottom:14px;">${esc(t('recipes_title'))}</h3>
          <div style="margin-bottom:20px;overflow-x:auto;">
            <div class="kpi-label" style="margin-bottom:6px;">${esc(t('recipes_price_fx'))}</div>
            <table class="table-clean">
              <thead><tr><th class="left">${esc(t('th_recipe'))}</th><th class="center">${esc(t('th_status'))}</th><th class="left">${esc(t('th_json_path'))}</th></tr></thead>
              <tbody>
                ${(ds.price_sources || []).map(p => `
                  <tr>
                    <td class="left"><b>${esc(p.name)}</b></td>
                    <td class="center"><span class="pill ${p.enabled ? 'pill-green' : 'pill-neutral'}">${esc(p.enabled ? t('pill_active') : t('pill_standby'))}</span></td>
                    <td class="left"><code>${esc(p.json_mapping?.price || '')}</code></td>
                  </tr>
                `).join('')}
                ${(ds.fx_sources || []).map(f => `
                  <tr>
                    <td class="left"><b>${esc(f.name)}</b></td>
                    <td class="center"><span class="pill ${f.enabled ? 'pill-green' : 'pill-neutral'}">${esc(f.enabled ? t('pill_active') : t('pill_standby'))}</span></td>
                    <td class="left"><code>${esc(f.json_mapping?.rate || '')}</code></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="overflow-x:auto;">
            <div class="kpi-label" style="margin-bottom:6px;">${esc(t('recipes_composite'))}</div>
            <table class="table-clean">
              <thead><tr><th class="left">${esc(t('th_recipe'))}</th><th class="left">${esc(t('th_underlying_map'))}</th></tr></thead>
              <tbody>
                ${Object.entries(ds.metadata_recipes || {}).map(([k, m]) => `
                  <tr>
                    <td class="left"><b>${esc(m.name)}</b></td>
                    <td class="left"><code>${esc(JSON.stringify(m.underlying_to_division))}</code></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
    initSortableTables();
  }

  function renderTaxStructureRulesTable() {
    const table = document.getElementById('taxStructureRulesTable');
    if (!table) return;
    const rules = (appState.data_sources && appState.data_sources.tax_structure_rules) || {};
    const syms = (appState.symbols && appState.symbols.symbols) || {};

    const rows = Object.entries(rules).map(([code, r]) => {
      const mapped = Object.entries(syms)
        .filter(([_, s]) => s.tax_structure === code)
        .map(([sym]) => `<span class="pill pill-primary" style="margin:2px 4px 2px 0;display:inline-block;">${esc(sym)}</span>`)
        .join('') || '<span class="text-muted">—</span>';

      const l1 = r.us_tier1_rate > 0 ? `${(r.us_tier1_rate * 100).toFixed(1)}%` : (r.intl_tier1_rate > 0 ? `${(r.intl_tier1_rate * 100).toFixed(1)}%` : '0.0%');
      const l2 = r.us_tier2_rate > 0 ? `${(r.us_tier2_rate * 100).toFixed(1)}%` : 'None';
      const rrspMult = (r.account_multipliers && r.account_multipliers.rrsp !== undefined) ? r.account_multipliers.rrsp : 1.0;
      const rrspTreaty = rrspMult === 0 ? `<span class="pill pill-green">Exempt (0%)</span>` : `<span class="pill pill-neutral">${rrspMult}x Drag</span>`;
      const tfsaMult = (r.account_multipliers && r.account_multipliers.tfsa !== undefined) ? r.account_multipliers.tfsa : 1.0;
      const taxMult = (r.account_multipliers && r.account_multipliers.non_registered !== undefined) ? r.account_multipliers.non_registered : 0.0;
      const taxStatus = taxMult === 0 ? `<span class="pill pill-green">0% (FTC Recovered)</span>` : `<span class="pill pill-amber">${taxMult}x Drag</span>`;

      return `
        <tr>
          <td class="left" style="vertical-align:top;font-weight:700;"><code>${esc(code)}</code></td>
          <td class="left" style="vertical-align:top;white-space:normal;">
            <div style="min-width:260px;max-width:380px;white-space:normal;line-height:1.45;font-size:12px;color:var(--text);overflow-wrap:break-word;word-break:normal;">
              ${esc(r.description)}
            </div>
          </td>
          <td class="center" style="vertical-align:top;">${l1}</td>
          <td class="center" style="vertical-align:top;">${l2}</td>
          <td class="center" style="vertical-align:top;">${rrspTreaty}</td>
          <td class="center" style="vertical-align:top;"><span class="pill pill-amber">${tfsaMult}x Drag</span></td>
          <td class="center" style="vertical-align:top;">${taxStatus}</td>
          <td class="left" style="vertical-align:top;white-space:normal;">
            <div style="min-width:140px;display:flex;flex-wrap:wrap;gap:4px;">
              ${mapped}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    table.innerHTML = `
      <thead>
        <tr>
          <th class="left" style="width:12%;vertical-align:bottom;">${esc(t('th_tax_structure'))}</th>
          <th class="left" style="width:36%;vertical-align:bottom;white-space:normal;">${esc(t('th_description'))}</th>
          <th class="center" style="width:8%;vertical-align:bottom;">${esc(t('th_level1_fwt'))}</th>
          <th class="center" style="width:8%;vertical-align:bottom;">${esc(t('th_level2_fwt'))}</th>
          <th class="center" style="width:11%;vertical-align:bottom;">${esc(t('th_rrsp_treaty'))}</th>
          <th class="center" style="width:10%;vertical-align:bottom;">${esc(t('th_tfsa_drag'))}</th>
          <th class="center" style="width:11%;vertical-align:bottom;">${esc(t('th_taxable_drag'))}</th>
          <th class="left" style="width:14%;vertical-align:bottom;">${esc(t('th_mapped_securities'))}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    `;
  }

  function renderFWTInspector(symID) {
    const sel = document.getElementById('fwtInspectorSelect');
    const content = document.getElementById('fwtInspectorContent');
    if (!sel || !content) return;

    const syms = (appState.symbols && appState.symbols.symbols) || {};
    const symKeys = Object.keys(syms).filter(k => isETFSymbol(k, syms[k])).sort();
    if (sel.options.length !== symKeys.length) {
      sel.innerHTML = symKeys.map(k => `<option value="${esc(k)}">${esc(k)} - ${esc(syms[k].name)}</option>`).join('');
    }
    if (!symID || !symKeys.includes(symID)) {
      symID = symKeys.includes('XEQT') ? 'XEQT' : (symKeys[0] || '');
    }
    sel.value = symID;

    const s = syms[symID];
    if (!s) {
      content.innerHTML = '';
      return;
    }

    const rules = (appState.data_sources && appState.data_sources.tax_structure_rules) || {};
    const rule = rules[s.tax_structure] || {};
    const meta = (appState.cache && appState.cache.symbol_metadata && appState.cache.symbol_metadata[symID]) || {};
    const taxMap = meta.tax_by_account || {};
    const divs = (meta.divisions && Object.keys(meta.divisions).length > 0) ? meta.divisions : (s.default_divisions || {});

    const divPills = Object.entries(divs).map(([d, w]) => `
      <span class="pill pill-neutral" style="margin-right:6px;font-size:12px;">${esc(tTerm(d))}: ${(w * 100).toFixed(1)}%</span>
    `).join('');

    content.innerHTML = `
      <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start;margin-top:8px;">
        <div style="flex:1;min-width:280px;">
          <div style="font-size:15px;font-weight:700;margin-bottom:6px;">
            ${esc(symID)} <span class="text-muted" style="font-weight:500;">· ${esc(s.name)}</span>
          </div>
          <div style="margin-bottom:10px;">
            <span class="pill pill-primary">Structure: ${esc(s.tax_structure || 'CA_CA')}</span>
            <span class="pill pill-neutral" style="margin-left:6px;">${esc(s.exchange)} · ${esc(s.currency)}</span>
            <span class="pill pill-neutral" style="margin-left:6px;">MER: ${( (meta.mer || s.default_mer || 0) * 100 ).toFixed(2)}%</span>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;line-height:1.45;">
            <b>Tax Mechanics:</b> ${esc(rule.description || 'Standard Canadian domestic security (0% foreign withholding).')}
          </div>
          <div class="kpi-label" style="margin-bottom:4px;">Underlying Division Sleeves</div>
          <div style="margin-bottom:6px;">${divPills}</div>
        </div>
        <div style="background:var(--bg-surface);padding:14px;border-radius:8px;border:1px solid var(--border);min-width:260px;">
          <div class="kpi-label" style="margin-bottom:8px;">Estimated Annual Tax Drag by Account</div>
          <table class="table-clean" style="margin:0;">
            <tbody>
              <tr>
                <td class="left"><b>RRSP:</b></td>
                <td class="right"><span class="pill ${(taxMap.rrsp || 0) === 0 ? 'pill-green' : 'pill-amber'}">${((taxMap.rrsp || 0) * 100).toFixed(2)}% / yr</span></td>
              </tr>
              <tr>
                <td class="left"><b>TFSA / RESP:</b></td>
                <td class="right"><span class="pill ${(taxMap.tfsa || 0) === 0 ? 'pill-green' : 'pill-amber'}">${((taxMap.tfsa || 0) * 100).toFixed(2)}% / yr</span></td>
              </tr>
              <tr>
                <td class="left"><b>Taxable (Non-Reg):</b></td>
                <td class="right"><span class="pill ${(taxMap.non_registered || 0) === 0 ? 'pill-green' : 'pill-amber'}">${((taxMap.non_registered || 0) * 100).toFixed(2)}% / yr</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- Interactive Handlers ---

  async function lookupSymbolDetails() {
    const rawSym = document.getElementById('newSymID').value.trim();
    if (!rawSym) return;
    const prefExch = document.getElementById('newSymExch').value.trim();
    const btn = document.getElementById('btnLookupSym');
    const origText = btn.textContent;
    btn.textContent = '⏳...';
    btn.disabled = true;
    try {
      const res = await fetch(`/api/symbols/lookup?symbol=${encodeURIComponent(rawSym)}&exchange=${encodeURIComponent(prefExch)}`);
      const data = await res.json();
      if (data.error) {
        showToast(`Lookup error: ${data.error}`);
        return;
      }
      document.getElementById('newSymID').value = data.symbol || rawSym.toUpperCase();
      document.getElementById('newSymName').value = data.name || '';
      document.getElementById('newSymExch').value = data.exchange || 'TSX';
      document.getElementById('newSymYahoo').value = data.yahoo_ticker || '';
      if (data.currency) {
        document.getElementById('newSymCurr').value = data.currency;
      }
      if (data.price > 0) {
        document.getElementById('newSymPrice').value = Number(data.price).toFixed(2);
      }
      showToast(`Found ${data.name} (${data.currency} $${Number(data.price).toFixed(2)})`);
    } finally {
      btn.textContent = origText;
      btn.disabled = false;
    }
  }

  async function addSymbol() {
    const id = document.getElementById('newSymID').value.trim().toUpperCase().replace(/\.TO$/i, '');
    const name = document.getElementById('newSymName').value.trim();
    const exch = document.getElementById('newSymExch').value.trim() || 'TSX';
    const yahoo = document.getElementById('newSymYahoo').value.trim() || (exch === 'TSX' || exch === 'TSE' ? `${id}.TO` : id);
    const curr = document.getElementById('newSymCurr').value;
    const price = parseFloat(String(document.getElementById('newSymPrice').value).replace(/,/g, '')) || 0;
    const mer = (parseFloat(document.getElementById('newSymMER').value) || 0) / 100.0;
    const div = document.getElementById('newSymDiv').value;

    if (!id || !name) {
      alert('Symbol and Name are required (click Lookup to auto-fill from ticker).');
      return;
    }
    const taxStruct = curr === 'USD' ? 'US_US' : 'CA_US';
    appState.symbols.symbols[id] = {
      asset_type: 'etf',
      name: name,
      exchange: exch,
      yahoo_ticker: yahoo,
      currency: curr,
      tax_structure: taxStruct,
      default_mer: mer,
      default_divisions: { [div]: 1.0 }
    };
    await fetch('/api/symbols', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appState.symbols)
    });

    if (price > 0) {
      const today = new Date().toISOString().slice(0, 10);
      if (!appState.cache.prices) appState.cache.prices = {};
      appState.cache.prices[id] = {
        price: price,
        currency: curr,
        updated_at: today
      };
      await fetch('/api/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState.cache)
      });
    }

    document.getElementById('newSymID').value = '';
    document.getElementById('newSymName').value = '';
    document.getElementById('newSymYahoo').value = '';
    document.getElementById('newSymPrice').value = '';
    await loadStateAndEvaluate();
    showToast(`Added ETF ${id} (${name}) to catalog (backup saved)`);
  }

  async function saveCacheEdits() {
    const today = new Date().toISOString().slice(0, 10);
    const cache = appState.cache;
    if (!cache.prices) cache.prices = {};
    if (!cache.symbol_metadata) cache.symbol_metadata = {};

    document.querySelectorAll('.cache-price-input').forEach(inp => {
      if (inp.disabled) return;
      const sym = inp.dataset.sym;
      const curr = inp.dataset.curr;
      const val = parseFloat(inp.value) || 0;
      if (val > 0) {
        cache.prices[sym] = { price: val, currency: curr, updated_at: today };
      }
    });

    document.querySelectorAll('.cache-mer-input').forEach(inp => {
      const sym = inp.dataset.sym;
      if (!cache.symbol_metadata[sym]) {
        cache.symbol_metadata[sym] = { tax_by_account: {}, divisions: {}, updated_at: today };
      }
      cache.symbol_metadata[sym].mer = (parseFloat(inp.value) || 0) / 100.0;
      cache.symbol_metadata[sym].updated_at = today;
    });

    document.querySelectorAll('.cache-tax-input').forEach(inp => {
      const sym = inp.dataset.sym;
      const acc = inp.dataset.acc;
      if (!cache.symbol_metadata[sym].tax_by_account) {
        cache.symbol_metadata[sym].tax_by_account = {};
      }
      cache.symbol_metadata[sym].tax_by_account[acc] = (parseFloat(inp.value) || 0) / 100.0;
    });

    const divsBySym = {};
    document.querySelectorAll('.cache-div-input').forEach(inp => {
      const sym = inp.dataset.sym;
      const div = inp.dataset.div;
      const w = (parseFloat(inp.value) || 0) / 100.0;
      if (!divsBySym[sym]) divsBySym[sym] = {};
      if (w > 0) divsBySym[sym][div] = w;
    });
    Object.entries(divsBySym).forEach(([sym, dmap]) => {
      cache.symbol_metadata[sym].divisions = dmap;
    });

    await fetch('/api/cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cache)
    });
    await loadStateAndEvaluate();
    showToast('Saved changes to cache.yaml (backup saved)');
  }

  // --- Universal Table Sorting ---



// === web/js/port_mgmt.js ===
/**
 * Embsay — Portfolio Management View
 * Handles portfolio inventory, scalable multi-portfolio grouping, and directory search paths.
 */

function renderPortMgmtTab() {
  const container = document.getElementById('tab-port-mgmt');
  if (!container) return;

  const cfg = (appState && appState.config) ? appState.config : { portfolio_paths: ['portfolios', 'examples'] };
  const paths = (cfg.portfolio_paths && cfg.portfolio_paths.length > 0) ? cfg.portfolio_paths : ['portfolios', 'examples'];
  const singlePorts = (appState.portfolios || []).filter(pt => !pt.is_group);
  const groups = (appState.divisions && appState.divisions.portfolio_groups) ? appState.divisions.portfolio_groups : [];

  let html = `
    <!-- Top Hero Banner / Actions -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div>
        <h2 style="margin:0 0 4px 0;font-size:20px;font-weight:700;">${esc(t('port_mgmt_title'))}</h2>
        <div class="text-muted" style="font-size:13px;">${esc(t('port_mgmt_sub'))}</div>
      </div>
      <div>
        <button class="btn btn-primary" onclick="openNewPortfolioModal()">
          ${esc(t('btn_create_new_port'))}
        </button>
      </div>
    </div>

    <!-- 1. Discovered Portfolios Inventory -->
    <div class="card" style="margin-bottom:20px;">
      <div class="section-header">
        <div>
          <h3 class="section-title">${esc(t('discovered_ports_title'))}</h3>
          <div class="text-muted" style="font-size:12.5px;">${esc(t('discovered_ports_sub'))}</div>
        </div>
      </div>
      <table class="table-clean" style="margin-top:10px;">
        <thead>
          <tr>
            <th class="left">${esc(t('th_port_name'))}</th>
            <th class="left">${esc(t('th_file_location'))}</th>
            <th class="center" style="width:90px;">${esc(t('th_accounts_count'))}</th>
            <th class="center" style="width:90px;">${esc(t('th_holdings_count'))}</th>
            <th class="right" style="width:140px;">${esc(t('th_actions'))}</th>
          </tr>
        </thead>
        <tbody>
          ${singlePorts.length === 0 ? `
            <tr><td colspan="5" class="center text-muted" style="padding:24px;">${esc(t('msg_no_discovered_ports'))}</td></tr>
          ` : singlePorts.map(p => `
            <tr>
              <td class="left">
                <a href="javascript:void(0)" onclick="selectPortfolioAndSwitch('${esc(p.id)}')" style="font-weight:600;color:var(--text);text-decoration:none;">
                  💼 ${esc(p.name)}
                </a>
                <button class="btn btn-ghost btn-sm" onclick="renamePortfolioFromMgmt('${esc(p.id)}', '${esc(p.name)}')" title="Rename portfolio '${esc(p.name)}'" style="padding:1px 5px;font-size:11px;margin-left:4px;opacity:0.65;">✎</button>
              </td>
              <td class="left">
                <code style="font-size:11.5px;color:var(--text-secondary);">${esc(p.file_path || (p.source_dir ? p.source_dir + '/' + p.id + '.yaml' : 'portfolios/' + p.id + '.yaml'))}</code>
              </td>
              <td class="center">
                <span class="pill pill-muted">${p.accounts_count !== undefined ? p.accounts_count : '-'}</span>
              </td>
              <td class="center">
                <span class="pill pill-muted">${p.holdings_count !== undefined ? p.holdings_count : '-'}</span>
              </td>
              <td class="right" style="white-space:nowrap;">
                <button class="btn btn-sm" onclick="selectPortfolioAndSwitch('${esc(p.id)}')" title="Open and view ${esc(p.name)}">${esc(t('btn_open_portfolio'))}</button>
                <button class="btn btn-sm" onclick="backupPortfolio('${esc(p.id)}')" title="${esc(t('btn_backup_portfolio_title'))} (${esc(p.name)})">💾 ${esc(t('btn_backup'))}</button>
                <button class="btn btn-sm btn-ghost" style="color:var(--red);margin-left:4px;" onclick="deletePortfolioFromMgmt('${esc(p.id)}', '${esc(p.name)}')" title="Delete portfolio '${esc(p.name)}' (${esc(p.id)}.yaml)">✕</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- 2. Scalable Portfolio Groups (Unified Views) -->
    <div class="card" style="margin-bottom:20px;">
      <div class="section-header">
        <div>
          <h3 class="section-title">${esc(t('grp_editor_title'))}</h3>
          <div class="text-muted" style="font-size:12.5px;">${esc(t('grp_editor_sub'))}</div>
        </div>
      </div>

      <!-- Active Groups Table -->
      <table class="table-clean" style="margin-bottom:20px;">
        <thead>
          <tr>
            <th class="left" style="width:180px;">${esc(t('th_group_name'))}</th>
            <th class="left">${esc(t('th_included_portfolios'))}</th>
            <th class="left" style="width:160px;">${esc(t('grp_strategy_from'))}</th>
            <th class="right" style="width:120px;">${esc(t('th_actions'))}</th>
          </tr>
        </thead>
        <tbody>
          ${groups.length === 0 ? `
            <tr><td colspan="4" class="center text-muted" style="padding:16px;">${esc(t('msg_no_groups'))}</td></tr>
          ` : groups.map(g => `
            <tr>
              <td class="left">
                <a href="javascript:void(0)" onclick="selectPortfolioAndSwitch('${esc(g.id)}')" style="font-weight:700;color:var(--primary);text-decoration:none;">
                  ⊞ ${esc(tTerm(g.name))}
                </a>
                <button class="btn btn-ghost btn-sm" onclick="renamePortfolioGroup('${esc(g.id)}', '${esc(g.name || g.id)}')" title="Rename portfolio group '${esc(g.name || g.id)}'" style="padding:1px 5px;font-size:11px;margin-left:4px;opacity:0.65;">✎</button>
              </td>
              <td class="left">
                <span class="pill pill-primary" style="margin-right:6px;">${esc(t('lbl_portfolios_count', { count: (g.members || []).length }))}</span>
                ${(g.members || []).map(m => {
                  const sp = singlePorts.find(p => p.id === m);
                  return `<span class="pill pill-muted" style="margin-right:4px;font-size:11px;">${esc(sp ? sp.name : m)}</span>`;
                }).join('')}
              </td>
              <td class="left">
                <span style="font-size:12px;font-weight:600;">${esc((singlePorts.find(p => p.id === (g.strategy_from_id || (g.members && g.members[0]))) || {}).name || g.strategy_from_id || '-')}</span>
              </td>
              <td class="right" style="white-space:nowrap;">
                <button class="btn btn-sm" onclick="selectPortfolioAndSwitch('${esc(g.id)}')" title="Open and view combined group ${esc(g.name || g.id)}">${esc(t('btn_open_portfolio'))}</button>
                <button class="btn btn-sm" onclick="backupPortfolio('${esc(g.id)}')" title="${esc(t('btn_backup_portfolio_title'))} (${esc(g.name || g.id)})">💾 ${esc(t('btn_backup'))}</button>
                <button class="btn btn-sm btn-ghost" style="color:var(--red);margin-left:4px;" onclick="deletePortfolioGroup('${esc(g.id)}')" title="Delete portfolio group '${esc(g.name || g.id)}'">✕</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Create New Group Form (Scalable to 100+ portfolios) -->
      <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:8px;padding:16px;">
        <div style="font-weight:700;font-size:13.5px;margin-bottom:12px;">${esc(t('btn_create_new_group'))}</div>
        <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;align-items:flex-end;">
          <div style="flex:1;min-width:200px;">
            <label class="kpi-label" style="display:block;margin-bottom:4px;">${esc(t('lbl_group_name'))}</label>
            <input type="text" id="newGroupName" class="input-clean" style="width:100%;" placeholder="${esc(t('ph_new_group'))}" />
          </div>
          <div style="flex:1;min-width:200px;">
            <label class="kpi-label" style="display:block;margin-bottom:4px;">${esc(t('grp_strategy_from'))}</label>
            <select id="newGroupStrategyFrom" class="select-clean" style="width:100%;">
              <option value="">${esc(t('opt_use_first_member'))}</option>
              ${singlePorts.map(sp => `<option value="${esc(sp.id)}">${esc(sp.name)}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Member Selection Header Toolbar -->
        <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="text" id="grpPortFilter" class="input-clean" placeholder="${esc(t('grp_search_placeholder'))}" style="width:240px;font-size:12px;padding:4px 8px;" oninput="filterGroupPortfolios()" />
            <button type="button" class="btn btn-sm" onclick="deselectAllGroupPorts()">${esc(t('grp_select_none'))}</button>
            <button type="button" class="btn btn-sm" onclick="selectFilteredGroupPorts()">${esc(t('grp_select_filtered'))}</button>
          </div>
          <div>
            <span id="grpSelectionBadge" class="pill pill-muted">${esc(t('lbl_selected_count', { count: 0, total: singlePorts.length }))}</span>
          </div>
        </div>

        <!-- Scrollable Checkbox List Box (Default: NONE checked) -->
        <div id="grpPortListContainer" style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;padding:4px;background:var(--bg-surface);margin-bottom:14px;">
          ${singlePorts.map(sp => `
            <label class="grp-port-row" data-search="${esc((sp.name + ' ' + sp.id + ' ' + (sp.source_dir || '')).toLowerCase())}"
                   style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:13px;transition:background 0.15s ease;">
              <input type="checkbox" class="new-grp-member" value="${esc(sp.id)}" onchange="updateGroupSelectionBadge()" style="cursor:pointer;" />
              <b style="color:var(--text);">${esc(sp.name)}</b>
              <code style="font-size:11px;color:var(--text-secondary);margin-left:auto;">${esc(sp.source_dir || 'portfolios')}/${esc(sp.id)}.yaml</code>
            </label>
          `).join('')}
        </div>

        <div>
          <button class="btn btn-primary" onclick="addPortfolioGroupFromMgmt()">${esc(t('btn_add_group'))}</button>
        </div>
      </div>
    </div>

    <!-- 3. Portfolio Search Paths & Directories -->
    <div class="card" id="portfolioPathsCard">
      <div class="section-header">
        <div>
          <h3 class="section-title">${esc(t('cfg_paths_title'))}</h3>
          <div class="text-muted" style="font-size:12.5px;">${esc(t('cfg_paths_sub'))}</div>
        </div>
      </div>
      <p style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:14px;">
        ${esc(t('cfg_paths_hint_clean'))}
      </p>

      <table class="table-clean" style="margin-bottom:14px;">
        <thead>
          <tr>
            <th class="left">${esc(t('th_directory_path'))}</th>
            <th class="center" style="width:110px;">${esc(t('th_status'))}</th>
            <th class="center" style="width:70px;">${esc(t('th_remove'))}</th>
          </tr>
        </thead>
        <tbody id="portfolioPathsTableBody">
          ${paths.map((p, idx) => `
            <tr class="cfg-path-row" data-path="${esc(p)}">
              <td class="left">
                <b><code>${esc(p)}</code></b>
              </td>
              <td class="center">
                <span class="pill pill-green">${esc(t('pill_active'))}</span>
              </td>
              <td class="center">
                ${paths.length > 1 ? `<button class="btn btn-ghost" style="color:var(--red);padding:2px 8px;" onclick="removePortfolioPathFromMgmt(${idx})" title="Remove search path '${esc(p)}'">✕</button>` : `<span class="text-muted" title="${esc(t('cfg_at_least_one_dir'))}">-</span>`}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input type="text" id="newPortfolioPathInput" class="input-clean" placeholder="${esc(t('cfg_ph_new_path'))}" style="flex:1;min-width:240px;" onkeydown="if(event.key==='Enter') addPortfolioPathFromMgmt()" />
        <button class="btn" type="button" onclick="browseFolderForPaths()">${esc(t('btn_browse_folder'))}</button>
        <button class="btn btn-primary" type="button" onclick="addPortfolioPathFromMgmt()">${esc(t('btn_add_path'))}</button>
      </div>
    </div>
  `;

  container.innerHTML = html;
  updateGroupSelectionBadge();
}

async function selectPortfolioAndSwitch(id) {
  selectedFilter = 'all';
  await goPortfolioView(id);
}

async function renamePortfolioFromMgmt(id, currentName) {
  const next = await openPromptModal({
    title: 'Rename Portfolio',
    label: 'Portfolio Name',
    initialValue: currentName || '',
    confirmLabel: 'Rename'
  });
  if (next === null) return;
  const trimmed = next.trim();
  if (!trimmed || trimmed === currentName) return;
  try {
    const getRes = await fetch(`/api/portfolio?id=${encodeURIComponent(id)}`);
    if (!getRes.ok) {
      alert('Failed to load portfolio for renaming.');
      return;
    }
    const p = await getRes.json();
    p.name = trimmed;
    const saveRes = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    if (!saveRes.ok) {
      const errData = await saveRes.json().catch(() => ({}));
      alert(errData.error || 'Failed to rename portfolio.');
      return;
    }
    const stRes = await fetch('/api/state');
    appState = await stRes.json();
    if (selectedPortfolio === id && typeof loadStateAndEvaluate === 'function') {
      await loadStateAndEvaluate();
    } else if (typeof renderTopBar === 'function') {
      renderTopBar();
    }
    renderPortMgmtTab();
    showToast(`Renamed portfolio to "${trimmed}"`);
  } catch (err) {
    alert('Failed to rename portfolio: ' + err.message);
  }
}

async function renamePortfolioGroup(id, currentName) {
  const next = await openPromptModal({
    title: 'Rename Portfolio Group',
    label: 'Group Name',
    initialValue: currentName || '',
    confirmLabel: 'Rename'
  });
  if (next === null) return;
  const trimmed = next.trim();
  if (!trimmed || trimmed === currentName) return;
  const divs = appState.divisions || {};
  const groups = divs.portfolio_groups || [];
  const grp = groups.find(g => g.id === id);
  if (!grp) return;
  grp.name = trimmed;
  try {
    const res = await fetch('/api/divisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(divs)
    });
    if (!res.ok) {
      alert('Failed to rename portfolio group.');
      return;
    }
    appState.divisions = await res.json();
    const stRes = await fetch('/api/state');
    appState = await stRes.json();
    if (typeof renderTopBar === 'function') renderTopBar();
    renderPortMgmtTab();
    showToast(`Renamed portfolio group to "${trimmed}"`);
  } catch (err) {
    alert('Failed to rename portfolio group: ' + err.message);
  }
}

async function deletePortfolioFromMgmt(id, name) {
  const ok = await openConfirmModal({
    title: 'Delete Portfolio',
    message: `Delete portfolio "${name}"?`,
    confirmLabel: 'Delete',
    danger: true
  });
  if (!ok) return;
  await fetch(`/api/portfolio?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  const stRes = await fetch('/api/state');
  appState = await stRes.json();
  const first = (appState.portfolios || []).find(p => !p.is_group);
  if (selectedPortfolio === id) {
    selectedPortfolio = first ? first.id : '';
  }
  if (typeof getLastPortfolio === 'function' && getLastPortfolio() === id) {
    try { localStorage.removeItem('embsay_last_portfolio'); } catch (e) {}
  }
  await loadStateAndEvaluate();
  renderPortMgmtTab();
  showToast('Deleted portfolio');
}

function filterGroupPortfolios() {
  const query = (document.getElementById('grpPortFilter')?.value || '').trim().toLowerCase();
  document.querySelectorAll('.grp-port-row').forEach(row => {
    const searchData = row.dataset.search || '';
    const match = !query || searchData.includes(query);
    row.style.display = match ? 'flex' : 'none';
  });
}

function deselectAllGroupPorts() {
  document.querySelectorAll('.new-grp-member').forEach(cb => { cb.checked = false; });
  updateGroupSelectionBadge();
}

function selectFilteredGroupPorts() {
  document.querySelectorAll('.grp-port-row').forEach(row => {
    if (row.style.display !== 'none') {
      const cb = row.querySelector('.new-grp-member');
      if (cb) cb.checked = true;
    }
  });
  updateGroupSelectionBadge();
}

function updateGroupSelectionBadge() {
  const total = document.querySelectorAll('.new-grp-member').length;
  const count = document.querySelectorAll('.new-grp-member:checked').length;
  const badge = document.getElementById('grpSelectionBadge');
  if (badge) {
    badge.textContent = t('lbl_selected_count', { count, total }) || `${count} of ${total} selected`;
    badge.className = count > 0 ? 'pill pill-primary' : 'pill pill-muted';
  }
}

async function addPortfolioGroupFromMgmt() {
  const inp = document.getElementById('newGroupName');
  const name = inp ? inp.value.trim() : '';
  if (!name) {
    alert('Please enter a group name.');
    return;
  }
  const members = [];
  document.querySelectorAll('.new-grp-member:checked').forEach(cb => {
    members.push(cb.value);
  });
  if (members.length < 2) {
    alert('Please select at least 2 member portfolios to form a group.');
    return;
  }

  const id = storeSlugify(name);
  const divs = appState.divisions || {};
  if (!divs.portfolio_groups) divs.portfolio_groups = [];

  const stratFromEl = document.getElementById('newGroupStrategyFrom');
  const stratFrom = (stratFromEl && stratFromEl.value) ? stratFromEl.value : members[0];

  const existingIdx = divs.portfolio_groups.findIndex(g => g.id === id);
  const grpObj = { id: id, name: name, members: members, strategy_from_id: stratFrom };
  if (existingIdx >= 0) {
    divs.portfolio_groups[existingIdx] = grpObj;
  } else {
    divs.portfolio_groups.push(grpObj);
  }

  const res = await fetch('/api/divisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(divs)
  });
  if (!res.ok) {
    alert('Failed to save portfolio group');
    return;
  }
  const updatedDivs = await res.json();
  appState.divisions = updatedDivs;
  if (inp) inp.value = '';
  deselectAllGroupPorts();
  const stRes = await fetch('/api/state');
  appState = await stRes.json();
  renderTopBar();
  renderPortMgmtTab();
  showToast(`Created portfolio group "${name}"`);
}

async function deletePortfolioGroup(id) {
  const ok = await openConfirmModal({
    title: 'Delete Portfolio Group',
    message: `Delete saved portfolio group "${id}"?`,
    confirmLabel: 'Delete',
    danger: true
  });
  if (!ok) return;
  const divs = appState.divisions || {};
  if (!divs.portfolio_groups) return;
  divs.portfolio_groups = divs.portfolio_groups.filter(g => g.id !== id);
  const res = await fetch('/api/divisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(divs)
  });
  if (!res.ok) {
    alert('Failed to delete group');
    return;
  }
  const updatedDivs = await res.json();
  appState.divisions = updatedDivs;
  if (selectedPortfolio === id) {
    const first = (appState.portfolios || []).find(p => !p.is_group);
    selectedPortfolio = first ? first.id : '';
  }
  if (typeof getLastPortfolio === 'function' && getLastPortfolio() === id) {
    try { localStorage.removeItem('embsay_last_portfolio'); } catch (e) {}
  }
  const stRes = await fetch('/api/state');
  appState = await stRes.json();
  renderTopBar();
  renderPortMgmtTab();
  showToast('Portfolio group deleted');
}

async function browseFolderForPaths() {
  try {
    const res = await fetch('/api/browse-directory', { method: 'POST' });
    const data = await res.json();
    if (data.path) {
      const inp = document.getElementById('newPortfolioPathInput');
      if (inp) inp.value = data.path;
    }
  } catch (e) {
    console.warn('Folder browsing unavailable via backend:', e);
  }
}

async function addPortfolioPathFromMgmt() {
  const inp = document.getElementById('newPortfolioPathInput');
  const p = inp ? inp.value.trim() : '';
  if (!p) return;
  const cfg = appState.config || {};
  if (!cfg.portfolio_paths) cfg.portfolio_paths = ['portfolios', 'examples'];
  if (!cfg.portfolio_paths.includes(p)) {
    cfg.portfolio_paths.push(p);
  }
  await saveAppConfigDirect(cfg);
  if (inp) inp.value = '';
  const stRes = await fetch('/api/state');
  appState = await stRes.json();
  renderTopBar();
  renderPortMgmtTab();
  showToast(`Added search directory: ${p}`);
}

async function removePortfolioPathFromMgmt(idx) {
  const cfg = appState.config || {};
  if (cfg.portfolio_paths && cfg.portfolio_paths.length > 1) {
    const removed = cfg.portfolio_paths[idx];
    cfg.portfolio_paths.splice(idx, 1);
    await saveAppConfigDirect(cfg);
    const stRes = await fetch('/api/state');
    appState = await stRes.json();
    renderTopBar();
    renderPortMgmtTab();
    showToast(`Removed search directory: ${removed}`);
  }
}

async function saveAppConfigDirect(cfg) {
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg)
  });
  if (!res.ok) {
    showToast('Error saving settings');
  }
}

function storeSlugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}


// === web/js/config.js ===
/**
 * Embsay — Program Configuration View (Application Settings)
 */

function renderConfigTab() {
  const cfg = (appState && appState.config) ? appState.config : { language: 'en-CA', theme_mode: 'system', lookup_interval: '1h', lookup_on_load: true };
  const cfgLangEl = document.getElementById('cfgLanguage');
  const cfgIntEl = document.getElementById('cfgLookupInterval');
  const cfgThemeEl = document.getElementById('cfgThemeMode');
  const cfgLoadEl = document.getElementById('cfgLookupOnLoad');
  const cfgDivMapEl = document.getElementById('cfgShowAccountDivMapping');
  const cfgDriftEl = document.getElementById('cfgDriftThreshold');
  const cfgIdleEl = document.getElementById('cfgIdleTimeout');
  if (cfgLangEl && document.activeElement !== cfgLangEl) cfgLangEl.value = cfg.language || currentLang;
  if (cfgIntEl && document.activeElement !== cfgIntEl) cfgIntEl.value = cfg.lookup_interval || '1h';
  if (cfgThemeEl && document.activeElement !== cfgThemeEl) cfgThemeEl.value = cfg.theme_mode || 'system';
  if (cfgLoadEl && document.activeElement !== cfgLoadEl) cfgLoadEl.checked = cfg.lookup_on_load !== false;
  if (cfgDivMapEl && document.activeElement !== cfgDivMapEl) cfgDivMapEl.checked = cfg.show_account_division_mapping !== false;
  const driftPct = ((cfg.drift_threshold !== undefined && cfg.drift_threshold > 0 ? cfg.drift_threshold : 0.01) * 100).toFixed(1);
  if (cfgDriftEl && document.activeElement !== cfgDriftEl) cfgDriftEl.value = driftPct;
  const idleHours = ((cfg.idle_timeout_hours !== undefined && cfg.idle_timeout_hours > 0 ? cfg.idle_timeout_hours : 1.0)).toString();
  if (cfgIdleEl && document.activeElement !== cfgIdleEl) cfgIdleEl.value = idleHours;
}

async function saveAppConfigFromTab() {
  const lang = document.getElementById('cfgLanguage') ? document.getElementById('cfgLanguage').value : currentLang;
  const interval = (document.getElementById('cfgLookupInterval') ? document.getElementById('cfgLookupInterval').value : '1h').trim();
  const modeEl = document.getElementById('cfgThemeMode');
  const mode = (modeEl && modeEl.value) ? modeEl.value : currentThemeMode;
  const onLoad = document.getElementById('cfgLookupOnLoad') ? document.getElementById('cfgLookupOnLoad').checked : true;
  const showDivMapEl = document.getElementById('cfgShowAccountDivMapping');
  const showDivMap = showDivMapEl ? showDivMapEl.checked : (appState?.config?.show_account_division_mapping !== false);
  const driftInput = document.getElementById('cfgDriftThreshold');
  const driftRaw = driftInput ? parseFloat(driftInput.value) : 1.0;
  const driftVal = (isNaN(driftRaw) || driftRaw <= 0) ? 0.01 : (driftRaw / 100.0);

  const idleInput = document.getElementById('cfgIdleTimeout');
  const idleRaw = idleInput ? parseFloat(idleInput.value) : 1.0;
  const idleVal = (isNaN(idleRaw) || idleRaw <= 0) ? 1.0 : idleRaw;

  if (lang !== currentLang) {
    currentLang = lang;
    applyStaticI18n();
  }
  if (mode !== currentThemeMode) {
    applyThemeMode(mode);
  }
  schedulePriceRefreshTimer(interval);

  const existingPaths = (appState && appState.config && appState.config.portfolio_paths) ? appState.config.portfolio_paths : ['portfolios', 'examples'];
  const existingSubtabOrder = (appState && appState.config && Array.isArray(appState.config.subtab_order)) ? appState.config.subtab_order : undefined;

  const cfg = {
    language: lang,
    theme_mode: mode,
    lookup_interval: interval,
    lookup_on_load: onLoad,
    drift_threshold: driftVal,
    idle_timeout_hours: idleVal,
    portfolio_paths: existingPaths,
    subtab_order: existingSubtabOrder,
    show_account_division_mapping: showDivMap
  };

  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg)
  });
  if (!res.ok) {
    showToast('Error saving settings');
    return;
  }
  const updatedState = await res.json();
  appState = updatedState;
  if (typeof renderAccountCards === 'function') renderAccountCards();
  if (typeof initSortableTables === 'function') initSortableTables();
  showToast(t('toast_settings_saved'));
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    _openAppDialog,
    addHierDivision,
    addPortfolioGroupFromMgmt,
    addPortfolioPathFromMgmt,
    addStratCategory,
    addStratDivision,
    addSymbol,
    afterTaxMode,
    applyAdHocCombine,
    applyCalculatedTrades,
    applyColWidthAcrossTables,
    applyPositionBucketAndDivision,
    applyRouteFromLocation,
    applyStaticI18n,
    applyStratNotesEdit,
    applySubtabOrder,
    applyTableSort,
    applyThemeMode,
    attemptCloseTab,
    backupCurrentPortfolio,
    backupPortfolio,
    browseFolderForModal,
    browseFolderForPaths,
    buildAccountBucketOptionsHtml,
    buildDivisionOnlyOptionsHtml,
    buildDivisionPieSvg,
    buildKpiGridHtml,
    buildPositionBucketOptionsHtml,
    changeLanguage,
    closeAddPositionModal,
    closeAllAccountMenus,
    closeAppDialog,
    closeChangeAccountBucketModal,
    closeEditPositionModal,
    closeNewAccountModal,
    closeNewPortfolioModal,
    closePortfolioSwitcher,
    closePositionContextMenu,
    closeTransactionModal,
    commitProposedTrades,
    confirmAppDialog,
    createNewPortfolio,
    deleteAccount,
    deleteBucket,
    deleteCurrentPortfolio,
    deleteFromEditPositionModal,
    deleteHolding,
    deletePortfolioFromMgmt,
    deletePortfolioGroup,
    deselectAllGroupPorts,
    dragHandleHtml,
    esc,
    extractCellSortValue,
    filterGroupPortfolios,
    fmtMoney,
    fmtNum,
    fmtPct,
    fmtPrice,
    fmtSignedMoney,
    fmtSignedNum,
    fmtSignedPct,
    formatSecurityNameHtml,
    getAccountBucketName,
    getLastPortfolio,
    getNormalizedColKey,
    getPortfolioBucketNames,
    getSelectedPortfolioId,
    getUrlForRoute,
    goPortfolioView,
    grossCurrentTotal,
    handleModalDirChange,
    highlightDivision,
    init,
    initDraggableAccountCards,
    initDraggableBucketCards,
    initDraggableCardList,
    initDraggableDivisionCards,
    initDraggableSubtabs,
    initDraggableTables,
    initResizableTables,
    initSortableTables,
    initStratDraftIfNeeded,
    isETFSymbol,
    isGroupSelection,
    isManualSymbol,
    loadStateAndEvaluate,
    lookupSymbolDetails,
    moveHoldingToAccount,
    normalizePortfolioSubtab,
    notifyUserActivity,
    onAfterTaxRateChange,
    onDivCardHeaderClick,
    onFilterChange,
    onManualAssetInput,
    onModalAddPosAccountChange,
    onModalAddPosBucketChange,
    onModalEditPosAccountChange,
    onModalEditPosBucketChange,
    onModalSymbolInput,
    onModalSymbolKeyDown,
    onNewAccountTypeChange,
    onQuickChangeAccount,
    onQuickChangeAccountType,
    onQuickChangeManualAmount,
    onQuickChangeProposed,
    onQuickChangeShares,
    onSelectRebalanceTarget,
    onStratFieldAutoSave,
    onToggleAfterTaxAllocation,
    onToggleEditManualMode,
    onToggleManualAssetMode,
    onToggleRebalanceTarget,
    onTxSymbolOrCurrChange,
    openAddPositionModal,
    openAddTransactionModal,
    openAddTransactionModalFromContext,
    openChangeAccountBucketModal,
    openConfirmModal,
    openDisclaimerModal,
    openEditPositionModal,
    openEditPositionModalFromContext,
    openInfoModal,
    openNewAccountModal,
    openNewBucketModal,
    openNewPortfolioModal,
    openPortfolioSelection,
    openPositionContextMenu,
    openPromptModal,
    openReportIssue,
    orderedKeys,
    parseDurationMs,
    persistAfterTaxPortfolio,
    persistPortfolioOrder,
    persistStrategyDraft,
    promptRenameAccount,
    quitApplication,
    refreshCurrentPortfolioData,
    refreshMetadata,
    refreshPrices,
    removeHierDivision,
    removePortfolioPathFromMgmt,
    removeStratCategory,
    removeStratDivision,
    renameAccountBatch,
    renameBucket,
    renamePortfolioFromMgmt,
    renamePortfolioGroup,
    renderAccountAndTaxTables,
    renderAccountCards,
    renderAccountFilter,
    renderAccountSummaryTable,
    renderAccountTab,
    renderAccountView,
    renderAll,
    renderBucketCards,
    renderBucketSummaryTable,
    renderBucketView,
    renderClassificationCards,
    renderClassificationSummaryTable,
    renderClassificationTab,
    renderClassificationView,
    renderCombinePopover,
    renderConfigTab,
    renderDivisionCards,
    renderDivisionTab,
    renderDivisionView,
    renderEditableSharesCell,
    renderFWTInspector,
    renderKpiGrids,
    renderManualOrValueCell,
    renderOverviewTab,
    renderPortMgmtTab,
    renderSecuritiesTab,
    renderStrategyAndDivisionsTab,
    renderStrategyTab,
    renderSummaryView,
    renderTaxLocationTable,
    renderTaxStructureRulesTable,
    renderTopBar,
    reorderHoldingsSubset,
    resetAllSymbols,
    resetModalPreviewCard,
    restoreTableOriginalOrder,
    round4,
    routeFromLocation,
    saveAfterTaxRate,
    saveAppConfigDirect,
    saveAppConfigFromTab,
    saveCacheEdits,
    saveCurrentCombineAsGroup,
    saveStrategy,
    schedulePriceRefreshTimer,
    scrollToDivisionCard,
    selectFilteredGroupPorts,
    selectModalSymbol,
    selectPortfolio,
    selectPortfolioAndSwitch,
    setHoldingsGrouping,
    setLastPortfolio,
    showOnlyTabPane,
    showShutdownOverlay,
    showToast,
    storeSlugify,
    submitAddPositionModal,
    submitChangeAccountBucketModal,
    submitEditPositionModal,
    submitNewAccountModal,
    submitTransactionModal,
    switchMainView,
    switchPortfolioSubTab,
    switchTab,
    syncAfterTaxFieldsIntoDraft,
    syncStratInputsToDraft,
    t,
    tTerm,
    toggleAccountCardMenu,
    toggleAccountExcludeFromRebalance,
    toggleAfterTaxMode,
    toggleAllCardsIn,
    toggleClassificationStrategyMode,
    toggleCombinePopover,
    toggleEditStratNotes,
    togglePortfolioSwitcher,
    toggleRebalanceMode,
    toggleTheme,
    tradeNeededLabelKey,
    triggerOnlineSymbolLookup,
    updateAmountToBuy,
    updateCollapseAllButton,
    updateGroupSelectionBadge,
    updateModalDivisionVisibility,
    updateModalEstimatedValue,
    updateStratTargetSum,
    updateTxModalCalc,
    updateUSDCADRate,
    waitForRestartAndReload
  });
}
export { init };
