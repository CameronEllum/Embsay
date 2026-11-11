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

  function buildKpiGridHtml() {
    const e = currentEval;
    if (!e) return '';

    // Category summary string
    const catSummary = (e.categories || []).map(c => `${fmtPct(c.current_ratio, 1)} ${tTerm(c.category_name)}`).join(' · ');
    const catTargetSummary = (e.categories || []).map(c => `${fmtPct(c.target_ratio, 0)} ${tTerm(c.category_name)}`).join(' / ');

    return `
      <div class="card">
        <div class="kpi-label">${esc(afterTaxMode() ? t('kpi_after_tax_allocation') : t('kpi_total_value'))}</div>
        <div class="kpi-value">${fmtMoney(e.current_total_cad)}</div>
        <div class="kpi-sub">
          ${afterTaxMode()
            ? `<span class="text-muted">${esc(t('kpi_rrsp_tax_sub', { tax: fmtMoney(e.estimated_rrsp_deferred_tax_cad || 0), gross: fmtMoney(grossCurrentTotal()) }))}</span>`
            : `<span>${esc(t('kpi_positions_across', { pos: (e.raw_holdings || []).length, acc: (e.account_summaries || []).length }))}</span>`
          }
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
    const html = buildKpiGridHtml();
    ['kpiGridDivision', 'kpiGridClassification', 'kpiGridAccount', 'kpiGrid'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    });
  }

  function renderOverviewTab() {
    renderDivisionView();
    renderClassificationView();
    renderAccountView();
    initSortableTables();
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
      catPills.innerHTML = (e.categories || []).map(c => {
        const drift = c.ratio_miss;
        const isRed = Math.abs(drift) >= driftThreshold;
        const cls = isRed ? 'pill-red' : 'pill-green';
        return `<span class="pill ${cls}">${esc(tTerm(c.category_name))}: ${fmtPct(c.current_ratio, 1)} (${esc(t('pill_target_short', { pct: fmtPct(c.target_ratio, 0) }))})</span>`;
      }).join('');
    }

    // Stacked Bars (Actual vs Target)
    const divs = e.divisions || [];
    const actualSegs = divs.map((d, i) => {
      const color = DIVISION_COLORS[i % DIVISION_COLORS.length];
      const w = Math.max(0, d.current_ratio * 100);
      return `<div class="stacked-seg" style="width:${w}%;background:${color};" title="${esc(tTerm(d.division_name))}: ${fmtPct(d.current_ratio, 1)} (${fmtMoney(d.current_value_cad)})"></div>`;
    }).join('');

    const targetSegs = divs.map((d, i) => {
      const color = DIVISION_COLORS[i % DIVISION_COLORS.length];
      const w = Math.max(0, d.target_ratio * 100);
      return `<div class="stacked-seg" style="width:${w}%;background:${color};opacity:0.75;" title="${esc(tTerm(d.division_name))}: ${fmtPct(d.target_ratio, 1)}"></div>`;
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

    const legendEl = document.getElementById('allocLegend');
    if (legendEl) {
      legendEl.innerHTML = divs.map((d, i) => {
        const color = DIVISION_COLORS[i % DIVISION_COLORS.length];
        return `
          <div class="legend-item">
            <span class="legend-dot" style="background:${color};"></span>
            <span style="font-weight:600;">${esc(tTerm(d.division_name))}</span>
            <span class="text-muted">${fmtPct(d.current_ratio, 1)} / ${fmtPct(d.target_ratio, 1)}</span>
          </div>
        `;
      }).join('');
    }

    // Division Summary Table
    const divSummaryTable = document.getElementById('divisionSummaryTable');
    if (divSummaryTable) {
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
          <tr>
            <td class="left">
              <span class="legend-dot" style="background:${color};display:inline-block;margin-right:8px;"></span>
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

  function renderDivisionCards() {
    const e = currentEval;
    const container = document.getElementById('divisionCardsContainer');
    if (!container || !e) return;

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
          <tr>
            <td class="left">${accCellHtml}</td>
            <td class="left">
              <b title="${esc(r.symbol_name)}">${esc(r.symbol)}</b>
              ${!rebalanceMode && r.symbol_name ? `<span class="text-muted" style="font-size:12.5px;margin-left:4px;">${esc(r.symbol_name)}</span>` : ''}
              ${compBadge}
            </td>
            <td class="text-muted">${fmtPrice(r.share_price)} <span style="font-size:11px;">${esc(r.currency)}</span></td>
            <td>${fmtNum(r.total_holding_shares)}</td>
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

      return `
        <div class="div-card">
          <div class="div-card-header">
            <div class="div-title-group">
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
          <div style="overflow-x:auto;">
            <table class="table-clean" data-sort-table="div_${esc(div.division_name)}">
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
              <tr>
                <td class="left">${accCellHtml}</td>
                <td class="left wrap-text">
                  <b title="${esc(s.symbol_name)}">${esc(s.symbol)}</b>
                  ${!rebalanceMode && s.symbol_name ? `<span class="text-muted" style="font-size:12.5px;margin-left:4px;">${esc(s.symbol_name)}</span>` : ''}
                  ${compPill}
                </td>
                <td class="text-muted">${fmtPrice(s.share_price)} <span style="font-size:11px;">${esc(s.currency)}</span></td>
                <td>${fmtNum(s.is_composite_slice ? s.effective_shares : s.total_holding_shares)}</td>
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
              <table class="table-clean" style="table-layout:fixed;width:100%;" data-sort-table="cls_${esc(cls.account_type)}_${esc(div.division_name)}">
                <colgroup>
                  <col style="width:130px;">
                  <col>
                  <col style="width:110px;">
                  <col style="width:105px;">
                  <col style="width:125px;">
                  <col style="width:90px;">
                </colgroup>
                <thead>
                  <tr>
                    <th class="left" style="width:130px;">${esc(t('th_account'))}</th>
                    <th class="left wrap-text">${esc(t('th_security'))}</th>
                    <th style="width:110px;">${esc(t('th_price'))}</th>
                    <th style="width:105px;">${esc(t('th_shares'))}</th>
                    <th style="width:125px;">${esc(t('th_value_cad'))}</th>
                    <th style="width:90px;">${esc(t('th_portfolio_pct'))}</th>
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
            const portPct = e.current_total_cad > 0 ? (h.market_value_cad / e.current_total_cad) : 0;
            return `
              <tr>
                <td class="left">${accCellHtml}</td>
                <td class="left wrap-text">
                  <b title="${esc(h.symbol_name)}">${esc(h.symbol)}</b>
                  ${!rebalanceMode && h.symbol_name ? `<span class="text-muted" style="font-size:12.5px;margin-left:4px;">${esc(h.symbol_name)}</span>` : ''}
                </td>
                <td class="text-muted">${fmtPrice(h.share_price)} <span style="font-size:11px;">${esc(h.currency)}</span></td>
                <td>${fmtNum(h.shares)}</td>
                <td><b>${fmtMoney(h.market_value_cad)}</b></td>
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
              <table class="table-clean" style="table-layout:fixed;width:100%;">
                <colgroup>
                  <col style="width:130px;">
                  <col>
                  <col style="width:110px;">
                  <col style="width:105px;">
                  <col style="width:125px;">
                  <col style="width:90px;">
                </colgroup>
                <thead>
                  <tr>
                    <th class="left" style="width:130px;">${esc(t('th_account'))}</th>
                    <th class="left wrap-text">${esc(t('th_security'))}</th>
                    <th style="width:110px;">${esc(t('th_price'))}</th>
                    <th style="width:105px;">${esc(t('th_shares'))}</th>
                    <th style="width:125px;">${esc(t('th_value_cad'))}</th>
                    <th style="width:90px;">${esc(t('th_portfolio_pct'))}</th>
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

        return `
          <div class="div-card">
            <div class="div-card-header">
              <div class="div-title-group">
                <span class="legend-dot" style="background:${color};width:12px;height:12px;"></span>
                <span style="font-size:15px;font-weight:700;">${esc(tTerm(cls.name))}</span>
              </div>
              <div class="div-metrics-group">
                <div><span class="text-muted">${esc(t('lbl_positions_colon'))}</span> <b>${cls.position_count}</b></div>
                <div><span class="text-muted">${esc(t('lbl_value_colon'))}</span> <b>${fmtMoney(cls.market_value_cad)}</b></div>
                <div><span class="text-muted">${esc(t('lbl_portfolio_weight_colon'))}</span> <b>${fmtPct(cls.portfolio_ratio, 1)}</b></div>
              </div>
            </div>
            ${bodyContent}
          </div>
        `;
      }

      // Standard Flat Table Mode
      const rowsHtml = (cls.holdings || []).map(h => {
        const breakdownPills = Object.entries(h.division_breakdown || {})
          .map(([d, w]) => `<span class="pill pill-neutral" style="margin-right:4px;">${esc(tTerm(d))}: ${fmtPct(w, 1)}</span>`)
          .join('');
        const accCellHtml = `<b>${esc(h.account)}</b>`;
        const portPct = e.current_total_cad > 0 ? (h.market_value_cad / e.current_total_cad) : 0;

        return `
          <tr>
            <td class="left">${accCellHtml}</td>
            <td class="left">
              <b title="${esc(h.symbol_name)}">${esc(h.symbol)}</b>
              ${!rebalanceMode && h.symbol_name ? `<span class="text-muted" style="font-size:12.5px;margin-left:4px;">${esc(h.symbol_name)}</span>` : ''}
            </td>
            <td class="left">${breakdownPills}</td>
            <td class="text-muted">${fmtPrice(h.share_price)} <span style="font-size:11px;">${esc(h.currency)}</span></td>
            <td>${fmtNum(h.shares)}</td>
            <td><b>${fmtMoney(h.market_value_cad)}</b></td>
            <td>${fmtPct(portPct, 1)}</td>
          </tr>
        `;
      }).join('');

      return `
        <div class="div-card">
          <div class="div-card-header">
            <div class="div-title-group">
              <span class="legend-dot" style="background:${color};width:12px;height:12px;"></span>
              <span style="font-size:15px;font-weight:700;">${esc(tTerm(cls.name))}</span>
            </div>
            <div class="div-metrics-group">
              <div><span class="text-muted">${esc(t('lbl_positions_colon'))}</span> <b>${cls.position_count}</b></div>
              <div><span class="text-muted">${esc(t('lbl_value_colon'))}</span> <b>${fmtMoney(cls.market_value_cad)}</b></div>
              <div><span class="text-muted">${esc(t('lbl_portfolio_weight_colon'))}</span> <b>${fmtPct(cls.portfolio_ratio, 1)}</b></div>
            </div>
          </div>
          <div style="overflow-x:auto;">
            <table class="table-clean" data-sort-table="cls_${esc(cls.account_type)}">
              <thead>
                <tr>
                  <th class="left">${esc(t('th_account'))}</th>
                  <th class="left">${esc(t('th_security'))}</th>
                  <th class="left">${esc(t('th_div_mapping'))}</th>
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
    const divs = (currentEval && currentEval.divisions && currentEval.divisions.length > 0)
      ? currentEval.divisions.map(d => ({ name: d.division_name, category: d.category_name }))
      : (appState.divisions.divisions || []);

    container.innerHTML = (e.account_summaries || []).map((acc, idx) => {
      const color = DIVISION_COLORS[idx % DIVISION_COLORS.length];
      const renameBtnHtml = !isGrp ? `
        <button class="btn btn-ghost btn-sm" onclick="promptRenameAccount('${esc(acc.account)}')"
                title="${esc(t('title_rename_account', { acc: acc.account }))}"
                style="padding:1px 5px;font-size:12px;cursor:pointer;margin-left:4px;">
          ✎
        </button>
      ` : '';

      const posCount = (acc.holdings && acc.holdings.length) || 0;
      const delAccTitle = posCount > 0
        ? `Delete account '${esc(acc.account)}' and its ${posCount} position(s)`
        : `Delete empty account '${esc(acc.account)}'`;

      const cardActionsHtml = !isGrp ? `
        <div style="display:flex;gap:6px;align-items:center;margin-left:auto;">
          <button class="btn btn-sm btn-primary" onclick="openAddPositionModal('${esc(acc.account)}')"
                  title="Add a new holding directly to ${esc(acc.account)}">
            + Add Position
          </button>
          <button class="btn btn-sm btn-ghost" style="color:var(--red);" onclick="deleteAccount('${esc(acc.account)}')"
                  title="${delAccTitle}">
            ✕ Delete
          </button>
        </div>
      ` : '';

      const rowsHtml = (acc.holdings || []).map(h => {
        const breakdownPills = Object.entries(h.division_breakdown || {})
          .map(([d, w]) => `<span class="pill pill-neutral" style="margin-right:4px;" title="${esc(tTerm(d))}: ${fmtPct(w, 1)} target division allocation">${esc(tTerm(d))}: ${fmtPct(w, 1)}</span>`)
          .join('');
        const portPct = e.current_total_cad > 0 ? (h.market_value_cad / e.current_total_cad) : 0;
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

        return `
          <tr>
            <td class="left">
              <b title="${esc(h.symbol_name)}">${esc(h.symbol)}</b>
              ${!rebalanceMode && h.symbol_name ? `<span class="text-muted" style="font-size:12.5px;margin-left:4px;">${esc(h.symbol_name)}</span>` : ''}
            </td>
            <td class="left">${breakdownPills}</td>
            <td class="text-muted">${fmtPrice(h.share_price)} <span style="font-size:11px;">${esc(h.currency)}</span></td>
            <td>
              ${!isGrp ? `
                <input type="text" inputmode="decimal" class="inline-num"
                       value="${round4(h.shares)}"
                       onchange="onQuickChangeShares('${h.holding_id}', this.value)"
                       title="${esc(t('title_edit_shares', { sym: h.symbol }))} in ${esc(acc.account)}" />
              ` : `<span>${fmtNum(h.shares)}</span>`}
            </td>
            <td><b>${fmtMoney(h.market_value_cad)}</b></td>
            <td>${fmtPct(portPct, 1)}</td>
            ${!isGrp ? `
              <td class="center">
                <button class="btn btn-ghost" style="color:var(--red);padding:2px 8px;font-size:13px;"
                        onclick="deleteHolding('${h.holding_id}')" title="${delHoldingTitle}">✕</button>
              </td>
            ` : ''}
          </tr>
        `;
      }).join('');

      const colSpan = !isGrp ? 7 : 6;

      return `
        <div class="div-card">
          <div class="div-card-header">
            <div class="div-title-group" style="display:flex;align-items:center;gap:6px;">
              <span class="legend-dot" style="background:${color};width:12px;height:12px;"></span>
              <span style="font-size:15px;font-weight:700;">${esc(acc.account)}</span>
              ${renameBtnHtml}
            </div>
            <div class="div-metrics-group" style="display:flex;align-items:center;gap:12px;">
              <div><span class="text-muted">${esc(t('lbl_positions_colon'))}</span> <b>${acc.position_count || (acc.holdings || []).length}</b></div>
              <div><span class="text-muted">${esc(t('lbl_value_colon'))}</span> <b>${fmtMoney(acc.market_value_cad)}</b></div>
              <div><span class="text-muted">${esc(t('lbl_portfolio_weight_colon'))}</span> <b>${fmtPct(acc.portfolio_ratio, 1)}</b></div>
              ${cardActionsHtml}
            </div>
          </div>
          <div style="overflow-x:auto;">
            <table class="table-clean" data-sort-table="acc_${esc(acc.account)}">
              <thead>
                <tr>
                  <th class="left" title="Ticker symbol and asset description">${esc(t('th_security'))}</th>
                  <th class="left" title="Asset allocation breakdown across portfolio divisions">${esc(t('th_div_mapping'))}</th>
                  <th title="Latest market quote and trading currency">${esc(t('th_price'))}</th>
                  <th title="Share quantity held in this account (editable)">${esc(t('th_shares'))}</th>
                  <th title="Total market value converted to Canadian Dollars">${esc(t('th_value_cad'))}</th>
                  <th title="Weight of this position as a percentage of total portfolio">${esc(t('th_portfolio_pct'))}</th>
                  ${!isGrp ? `<th class="center" style="width:60px;" data-nosort title="Position actions">${esc(t('th_actions'))}</th>` : ''}
                </tr>
              </thead>
              <tbody>${rowsHtml || `<tr><td colspan="${colSpan}" class="center text-muted" style="padding:20px;">No positions in ${esc(acc.account)}. <button class="btn btn-sm btn-primary" style="margin-left:8px;" onclick="openAddPositionModal('${esc(acc.account)}')">+ Add Position</button></td></tr>`}</tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderClassificationSummaryTable() {
    const e = currentEval;
    const clsEl = document.getElementById('classificationSummaryTable');
    if (!clsEl || !e) return;
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
          <tr>
            <td class="left"><b>${esc(tTerm(c.name))}</b></td>
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

    accEl.innerHTML = `
      <thead>
        <tr>
          <th class="left">${esc(t('th_account'))}</th>
          <th class="left">${esc(t('th_classification'))}</th>
          <th>${esc(afterTaxMode() ? t('th_allocation_value') : t('th_value_cad'))}</th>
          <th>${esc(t('th_weight'))}</th>
        </tr>
      </thead>
      <tbody>
        ${(e.account_summaries || []).map(a => `
          <tr>
            <td class="left">
              <b>${esc(a.account)}</b>
              ${!isGrp ? `
                <button class="btn btn-ghost btn-sm" onclick="promptRenameAccount('${esc(a.account)}')"
                        title="${esc(t('title_rename_account', { acc: a.account }))}"
                        style="padding:0 5px;font-size:11px;margin-left:6px;cursor:pointer;">
                  ✎
                </button>
              ` : ''}
            </td>
            <td>
              <b>${fmtMoney(afterTaxMode() ? (a.allocation_value_cad ?? a.market_value_cad) : a.market_value_cad)}</b>
              ${afterTaxMode() ? `<div class="text-muted" title="${esc(t('title_gross_value', { gross: fmtMoney(a.market_value_cad) }))}" style="font-size:11px;font-weight:500;">${esc(t('lbl_value_colon'))} ${fmtMoney(a.market_value_cad)}</div>` : ''}
            </td>
            <td>${fmtPct(a.portfolio_ratio, 1)}</td>
          </tr>
        `).join('')}
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
      document.querySelectorAll('.strat-cat-row').forEach(row => {
        const cat = row.dataset.cat;
        const pctInp = row.querySelector('.strat-cat-pct-input');
        const pct = pctInp ? (parseFloat(pctInp.value) || 0) / 100.0 : 0;
        if (cat) nextCats[cat] = pct;
      });
      draft.categories = nextCats;
      document.querySelectorAll('.strat-split-row').forEach(row => {
        const c = row.dataset.cat;
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
        <table class="table-clean" style="margin-bottom:14px;">
          <thead>
            <tr>
              <th class="left">${esc(t('th_division'))}</th>
              <th style="width:140px;">${esc(t('th_target_pct'))}</th>
              <th class="center" style="width:80px;">${esc(t('th_remove'))}</th>
            </tr>
          </thead>
          <tbody id="stratDivisionsTbody">
            ${Object.entries(draft.divisions).map(([name, ratio]) => `
              <tr class="strat-div-row" data-name="${esc(name)}">
                <td class="left">
                  <input type="text" class="input-clean strat-div-name-input" value="${esc(name)}" style="width:260px;font-weight:600;" />
                </td>
                <td>
                  <input type="text" inputmode="decimal" class="inline-num strat-flat-pct-input" data-div="${esc(name)}" value="${round4(ratio * 100)}" oninput="updateStratTargetSum()" style="width:90px;" />%
                </td>
                <td class="center">
                  <button class="btn btn-ghost" style="color:var(--red);padding:2px 8px;" onclick="removeStratDivision('${esc(name)}')" title="Delete target division '${esc(name)}'">✕</button>
                </td>
              </tr>
            `).join('')}
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
        <table class="table-clean" style="margin-bottom:14px;">
          <thead><tr><th class="left">${esc(t('th_category'))}</th><th style="width:140px;">${esc(t('th_target_pct'))}</th><th class="center" style="width:80px;">${esc(t('th_remove'))}</th></tr></thead>
          <tbody>
            ${Object.entries(draft.categories).map(([cat, ratio]) => `
              <tr class="strat-cat-row" data-cat="${esc(cat)}">
                <td class="left"><input type="text" class="input-clean strat-cat-name-input" value="${esc(cat)}" style="width:240px;font-weight:600;" /></td>
                <td><input type="text" inputmode="decimal" class="inline-num strat-cat-pct-input" data-cat="${esc(cat)}" value="${round4(ratio * 100)}" oninput="updateStratTargetSum()" style="width:90px;" />%</td>
                <td class="center"><button class="btn btn-ghost" style="color:var(--red);padding:2px 8px;" onclick="removeStratCategory('${esc(cat)}')" title="Delete target category '${esc(cat)}' and all child divisions">✕</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="display:flex;gap:8px;margin-bottom:20px;">
          <input type="text" id="newStratCatInput" class="input-clean" placeholder="${esc(t('strat_ph_new_cat'))}" style="width:280px;" onkeydown="if(event.key==='Enter') addStratCategory()" />
          <button class="btn" onclick="addStratCategory()">${esc(t('strat_add_category_btn'))}</button>
        </div>

        <div class="kpi-label" style="margin-bottom:6px;">${esc(t('strat_step2_divs'))}</div>
        <table class="table-clean" style="margin-bottom:14px;">
          <thead><tr><th class="left">${esc(t('th_division'))}</th><th class="left">${esc(t('th_category'))}</th><th>${esc(t('th_split_within_cat'))}</th><th>${esc(t('th_eff_portfolio_pct'))}</th><th class="center">${esc(t('th_remove'))}</th></tr></thead>
          <tbody>
            ${Object.entries(draft.category_splits).flatMap(([cat, splits]) =>
              Object.entries(splits).map(([div, splitRatio]) => {
                const catW = draft.categories[cat] || 0;
                const eff = catW * splitRatio * 100;
                return `
                  <tr class="strat-split-row" data-cat="${esc(cat)}" data-div="${esc(div)}">
                    <td class="left"><b>${esc(div)}</b></td>
                    <td class="left"><span class="pill pill-neutral">${esc(cat)}</span></td>
                    <td><input type="text" inputmode="decimal" class="inline-num strat-split-pct-input" data-cat="${esc(cat)}" data-div="${esc(div)}" value="${round4(splitRatio * 100)}" oninput="updateStratTargetSum()" style="width:80px;" />%</td>
                    <td class="text-muted"><b>${eff.toFixed(1)}%</b></td>
                    <td class="center"><button class="btn btn-ghost" style="color:var(--red);padding:2px 8px;" onclick="removeHierDivision('${esc(cat)}', '${esc(div)}')" title="Delete division '${esc(div)}' from category '${esc(cat)}'">✕</button></td>
                  </tr>
                `;
              })
            ).join('')}
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

    sHtml += `
      <div style="margin-top:20px;display:flex;gap:12px;align-items:center;">
        <button class="btn btn-primary" onclick="saveStrategy()">${esc(t('btn_save_strategy'))}</button>
      </div>
    `;

    card.innerHTML = sHtml;
    updateStratTargetSum();
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
      return;
    }
    await loadStateAndEvaluate();
    renderStrategyTab();
    showToast('Saved portfolio strategy & notes');
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
  function updateStratTargetSum() {
    const draft = window._stratDraft;
    const el = document.getElementById('stratTotalTargetIndicator');
    if (!draft || !el) return;
    let sum = 0;
    if (draft.mode === 'flat') {
      document.querySelectorAll('.strat-flat-pct-input').forEach(inp => {
        sum += parseFloat(inp.value) || 0;
      });
    } else {
      document.querySelectorAll('.strat-cat-pct-input').forEach(inp => {
        sum += parseFloat(inp.value) || 0;
      });
    }
    const isBalanced = Math.abs(sum - 100.0) < 0.05;
    el.innerHTML = isBalanced
      ? `<span class="pill pill-green">${esc(t('strat_target_balanced'))} (${sum.toFixed(1)}%)</span>`
      : `<span class="pill pill-amber">${esc(t('strat_target_mismatch', { sum: sum.toFixed(1) }))}</span>`;
  }

  
  // --- VIEW 2 / TAB 5: CONFIG ---

  function toggleRebalanceMode() {
    if (currentPortfolioSubTab !== 'division') return;
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
    const newName = prompt(promptText, oldAccName);
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
    if (!confirm('Commit simulated trades to your holdings and reset simulated trades to 0?')) return;
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
    const modal = document.getElementById('newAccountModal');
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => { if (nameInp) nameInp.focus(); }, 50);
  }

  function closeNewAccountModal() {
    const modal = document.getElementById('newAccountModal');
    if (modal) modal.classList.add('hidden');
  }

  async function submitNewAccountModal() {
    const nameInp = document.getElementById('modalNewAccountName');
    const accName = nameInp ? nameInp.value.trim() : '';
    if (!accName) {
      alert('Please enter an account name.');
      return;
    }
    const typeSel = document.getElementById('modalNewAccountType');
    const accType = typeSel ? typeSel.value : 'rrsp';

    closeNewAccountModal();
    // Open Add Position Modal for this new account
    openAddPositionModal(accName, accType);
  }

  async function deleteAccount(accName) {
    if (isGroupSelection(selectedPortfolio)) return;
    const holds = currentPortfolioConfig.holdings || [];
    const count = holds.filter(h => h.account === accName).length;
    const msg = count > 0
      ? `Delete account "${accName}" and all ${count} position(s)?`
      : `Delete account "${accName}"?`;
    if (!confirm(msg)) return;

    currentPortfolioConfig.holdings = holds.filter(h => h.account !== accName);
    await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPortfolioConfig)
    });
    await loadStateAndEvaluate();
    showToast(`Deleted account "${accName}"`);
  }

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

  async function submitAddPositionModal() {
    if (isGroupSelection(selectedPortfolio)) return;
    const accSel = document.getElementById('modalAddPosAccountSelect');
    const acc = accSel ? accSel.value.trim() : '';
    const symInp = document.getElementById('modalAddPosSymbolInput');
    const sym = symInp ? symInp.value.trim().toUpperCase() : '';
    const sharesInp = document.getElementById('modalAddPosSharesInput');
    const shares = sharesInp ? parseFloat(String(sharesInp.value).replace(/,/g, '')) : 0;
    const noteInp = document.getElementById('modalAddPosNoteInput');
    const note = noteInp ? noteInp.value.trim() : '';

    if (!acc) {
      alert('Please select or specify an account.');
      return;
    }
    if (!sym) {
      alert('Please enter a symbol or ETF ticker.');
      return;
    }
    if (!shares || isNaN(shares) || shares <= 0) {
      alert('Please enter a valid share quantity greater than zero.');
      return;
    }

    if (!currentPortfolioConfig.holdings) currentPortfolioConfig.holdings = [];

    const existing = currentPortfolioConfig.holdings.find(h => h.account === acc && h.symbol.toUpperCase() === sym);
    if (existing) {
      existing.shares += shares;
      if (note) existing.note = (existing.note ? existing.note + '; ' : '') + note;
    } else {
      const newHold = {
        account: acc,
        symbol: sym,
        shares: shares
      };
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

  
