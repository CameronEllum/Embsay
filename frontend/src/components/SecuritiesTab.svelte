<div id="tab-securities" class="tab-pane hidden">
  <div class="card" style="margin-bottom:20px;">
    <div class="section-header">
      <div>
        <h3 class="section-title" data-i18n="add_security_title">Add New ETF</h3>
        <div class="text-muted" style="font-size:12.5px;" data-i18n="add_security_sub">Enter an ETF ticker symbol and click Lookup (or press Enter) to auto-fill details, then add to symbols.yaml</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
      <div>
        <div class="kpi-label" style="margin-bottom:4px;" data-i18n="lbl_symbol">Symbol</div>
        <div style="display:flex;gap:6px;">
          <input type="text" id="newSymID" class="input-clean" style="width:90px;text-transform:uppercase;" placeholder="e.g. VFV"
                 onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); window.lookupSymbolDetails(); } }}
                 onblur={(e) => { if (e.currentTarget.value && !document.getElementById('newSymName')?.value) window.lookupSymbolDetails(); }} />
          <button class="btn" id="btnLookupSym" onclick={() => window.lookupSymbolDetails()} data-i18n-title="btn_lookup_title" data-i18n="btn_lookup" title="Look up name, exchange, currency, and division from symbol">
            🔍 Lookup
          </button>
        </div>
      </div>
      <div>
        <div class="kpi-label" style="margin-bottom:4px;" data-i18n="lbl_fund_name">Fund Name</div>
        <input type="text" id="newSymName" class="input-clean" style="width:230px;" data-i18n-placeholder="ph_fund_name" placeholder="Auto-filled or custom fund name" />
      </div>
      <div>
        <div class="kpi-label" style="margin-bottom:4px;" data-i18n="lbl_exchange">Exchange</div>
        <input type="text" id="newSymExch" class="input-clean" style="width:75px;" value="TSX" />
      </div>
      <div>
        <div class="kpi-label" style="margin-bottom:4px;" data-i18n="lbl_yahoo_ticker">Yahoo Ticker</div>
        <input type="text" id="newSymYahoo" class="input-clean" style="width:95px;" placeholder="VFV.TO" />
      </div>
      <div>
        <div class="kpi-label" style="margin-bottom:4px;" data-i18n="lbl_currency">Currency</div>
        <select id="newSymCurr" class="select-clean">
          <option value="CAD">CAD</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div>
        <div class="kpi-label" style="margin-bottom:4px;" data-i18n="lbl_mer_pct">MER (%)</div>
        <input type="text" inputmode="decimal" id="newSymMER" class="input-clean" style="width:68px;text-align:right;" value="0.00" />
      </div>
      <div>
        <div class="kpi-label" style="margin-bottom:4px;" data-i18n="lbl_default_div">Default Division</div>
        <select id="newSymDiv" class="select-clean"></select>
      </div>
      <button class="btn btn-primary" onclick={() => window.addSymbol()} data-i18n="btn_add_security">+ Add ETF</button>
    </div>
  </div>

  <div class="card" style="margin-bottom:20px;">
    <div class="section-header">
      <div>
        <h3 class="section-title" data-i18n="sec_catalog_title">Master ETF &amp; Metadata Catalog</h3>
        <div class="text-muted" style="font-size:12.5px;" data-i18n-html="sec_catalog_sub">Shared ETF definitions, MERs, tax structures, and division breakdowns (config/symbols.yaml &amp; config/cache.yaml)</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn" style="color:var(--red);border-color:var(--red);" onclick={() => window.resetAllSymbols()} id="btnResetSymbols" data-i18n="btn_reset_symbols" title="Delete all symbol definitions, cached prices, and ETF metadata (backups saved first)">🗑️ Reset All Symbols</button>
        <button class="btn" onclick={() => window.refreshMetadata()} id="btnRefreshMeta" data-i18n="btn_refresh_meta">↻ Refresh Composite ETF Ratios</button>
        <button class="btn btn-primary" onclick={() => window.saveCacheEdits()} data-i18n="btn_save_cache">Save Changes to Cache</button>
      </div>
    </div>
    <div style="overflow-x:auto;">
      <table class="table-clean" id="symbolsCacheTable" data-sort-table="symbolsCache"></table>
    </div>
  </div>

  <div class="card" style="margin-bottom:20px;" id="fwtIntelligenceCard">
    <div class="section-header">
      <div>
        <h3 class="section-title" data-i18n="fwt_title">Foreign Withholding Tax (FWT) Intelligence Engine</h3>
        <div class="text-muted" style="font-size:12.5px;" data-i18n="fwt_sub">Cross-border tax rules, Level 1 &amp; Level 2 mechanics, Canada–US treaty exemptions, and account drag calculations</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:20px;gap:14px;">
      <div style="background:var(--bg-subtle);padding:14px;border-radius:8px;border-left:3px solid var(--primary);">
        <div style="font-weight:700;font-size:13.5px;margin-bottom:4px;" data-i18n="fwt_rule1_title">1. Level 1: Direct Foreign Tax</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.45;" data-i18n="fwt_rule1_desc">Withholding applied directly by the foreign source country (e.g. US IRS withholds 15% on US dividends; European and Asian nations withhold ~8–12%).</div>
      </div>
      <div style="background:var(--bg-subtle);padding:14px;border-radius:8px;border-left:3px solid var(--primary);">
        <div style="font-weight:700;font-size:13.5px;margin-bottom:4px;" data-i18n="fwt_rule2_title">2. Level 2: Fund Wrapper Tax</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.45;" data-i18n="fwt_rule2_desc">A second 15% US withholding tax triggered when a Canadian ETF holds a US-listed ETF wrapper (e.g. XAW holding ITOT/IEFA) before distributing to Canadians.</div>
      </div>
      <div style="background:var(--bg-subtle);padding:14px;border-radius:8px;border-left:3px solid var(--green);">
        <div style="font-weight:700;font-size:13.5px;margin-bottom:4px;" data-i18n="fwt_rule3_title">3. Canada–US Tax Treaty Exemption (RRSP Only)</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.45;" data-i18n="fwt_rule3_desc">US-listed ETFs holding US stocks directly (e.g. VTI) held in an RRSP/RRIF are 100% exempt from US withholding. Canadian-listed ETFs (XUU, XEQT, VEQT) cannot pass this through to RRSPs.</div>
      </div>
      <div style="background:var(--bg-subtle);padding:14px;border-radius:8px;border-left:3px solid var(--amber);">
        <div style="font-weight:700;font-size:13.5px;margin-bottom:4px;" data-i18n="fwt_rule4_title">4. Foreign Tax Credit (FTC) in Taxable Accounts</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.45;" data-i18n="fwt_rule4_desc">In non-registered accounts, foreign tax reported on T3/T5 slips is recoverable as a tax credit on line 40500 of your T1. In TFSA and RESP accounts, foreign withholding is permanently unrecoverable.</div>
      </div>
    </div>

    <div class="kpi-label" style="margin-bottom:8px;" data-i18n="fwt_rules_matrix_title">Tax Structure Matrix (config/data_sources.yaml)</div>
    <div style="overflow-x:auto;margin-bottom:20px;">
      <table class="table-clean" id="taxStructureRulesTable"></table>
    </div>

    <div class="card" style="background:var(--bg-subtle);border:1px solid var(--border);padding:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-weight:700;font-size:13.5px;" data-i18n="fwt_inspector_title">🔍 ETF Tax Drag Inspector</div>
          <div class="text-muted" style="font-size:12px;" data-i18n="fwt_inspector_sub">Select any ETF to view its exact Level 1/2 withholding calculation and account drag breakdown</div>
        </div>
        <select id="fwtInspectorSelect" class="select-clean" onchange={(e) => window.renderFWTInspector(e.currentTarget.value)}></select>
      </div>
      <div id="fwtInspectorContent"></div>
    </div>
  </div>

  <div id="recipesContainer"></div>
</div>
