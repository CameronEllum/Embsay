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
    ['kpiGridSummary', 'kpiGridClassification', 'kpiGridAccount', 'kpiGridBucket', 'kpiGrid'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = netWorthHtml;
    });
  }

  function renderOverviewTab() {
    renderSummaryView();
    renderDivisionView();
    renderClassificationView();
    renderAccountView();
    renderBucketView();
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
        onclick="switchPortfolioSubTab('division'); setTimeout(() => scrollToDivisionCard('${esc(d.division_name)}'), 50)">
        <title>${esc(tTerm(d.division_name))}: ${fmtMoney(d.current_value_cad)} (${fmtPct(d.current_ratio, 1)})</title>
      </circle>`;
      offset += len;
      return seg;
    }).join('');

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0;">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="var(--bg-subtle)" stroke-width="${strokeW}" />
        ${segments}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="var(--text-muted)" font-size="11" font-weight="600">DIVISIONS</text>
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
        pieContainer.innerHTML = `<div class="text-muted center" style="padding:20px;">No rebalanceable divisions configured.</div>`;
      } else {
        const legendRows = targetDivs.map((d, i) => {
          const color = DIVISION_COLORS[i % DIVISION_COLORS.length];
          return `
            <div onclick="switchPortfolioSubTab('division'); setTimeout(() => scrollToDivisionCard('${esc(d.division_name)}'), 50)"
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
      const nonRebalVal = Math.max(0, netWorth - e.current_total_cad);
      const buckets = e.bucket_summaries || [];
      const accounts = e.account_summaries || [];

      let bucketHtml = '';
      if (buckets.length > 0) {
        bucketHtml = `
          <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">
            <div class="kpi-label" style="margin-bottom:8px;">Buckets</div>
            ${buckets.map((b, idx) => {
              const color = DIVISION_COLORS[idx % DIVISION_COLORS.length];
              const hasGoal = b.target_amount > 0;
              const fundedPct = hasGoal ? Math.min(100, (b.market_value_cad / b.target_amount) * 100) : 0;
              return `
                <div onclick="switchPortfolioSubTab('bucket')" style="padding:5px 6px;border-radius:6px;cursor:pointer;"
                     onmouseover="this.style.background='var(--bg-subtle)'" onmouseout="this.style.background='transparent'">
                  <div style="display:flex;justify-content:space-between;font-size:13px;">
                    <span><span class="legend-dot" style="background:${color};display:inline-block;margin-right:6px;"></span><b>${esc(b.bucket)}</b></span>
                    <span><b>${fmtMoney(b.market_value_cad)}</b>${hasGoal ? ` <span class="text-muted">/ ${fmtMoney(b.target_amount)} (${fundedPct.toFixed(0)}%)</span>` : ` <span class="text-muted">(${fmtPct(b.net_worth_ratio, 1)})</span>`}</span>
                  </div>
                  ${hasGoal ? `<div class="mini-bar-track" style="margin-top:4px;margin-bottom:2px;height:5px;"><div class="mini-bar-fill" style="width:${fundedPct}%;background:${color};"></div></div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      nwPanel.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13.5px;">
          <div style="display:flex;justify-content:space-between;padding:8px 10px;background:var(--bg-subtle);border-radius:8px;">
            <span class="text-muted">Total Net Worth</span>
            <b style="font-size:15px;">${fmtMoney(netWorth)}</b>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 10px;">
            <span class="text-muted">Rebalanceable Investments (${accounts.filter(a => !a.excluded_from_rebalancing).length} accounts)</span>
            <b>${fmtMoney(e.current_total_cad)}</b>
          </div>
          ${nonRebalVal > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:4px 10px;">
              <span class="text-muted">Net-Worth-Only / Buckets</span>
              <b>${fmtMoney(nonRebalVal)}</b>
            </div>
          ` : ''}
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

  function buildDivBucketOptionsHtml() {
    const divNames = new Set();
    ((currentEval && currentEval.divisions) || []).forEach(d => divNames.add(d.division_name));
    ((appState && appState.divisions && appState.divisions.divisions) || []).forEach(d => divNames.add(d.name));
    const strat = (currentPortfolioConfig && currentPortfolioConfig.strategy) || {};
    Object.keys(strat.divisions || {}).forEach(dn => divNames.add(dn));
    Object.values(strat.category_splits || {}).forEach(m => Object.keys(m || {}).forEach(dn => divNames.add(dn)));

    const bucketNames = new Set();
    ((currentPortfolioConfig && currentPortfolioConfig.buckets) || []).forEach(b => { if (b.name) bucketNames.add(b.name); });
    ((currentEval && currentEval.bucket_summaries) || []).forEach(b => { if (b.bucket) bucketNames.add(b.bucket); });
    ((currentPortfolioConfig && currentPortfolioConfig.holdings) || []).forEach(x => { if (x.bucket) bucketNames.add(x.bucket); });

    let opts = `<option value="">Use Symbol Default</option>`;
    opts += `<option value="__none__">None (No Division / Bucket)</option>`;
    Array.from(divNames).forEach(dn => {
      opts += `<option value="${esc(dn)}">${esc(tTerm(dn))}</option>`;
    });
    if (bucketNames.size > 0) {
      opts += `<option disabled>──────────</option>`;
      Array.from(bucketNames).forEach(bn => {
        opts += `<option value="bucket:${esc(bn)}">${esc(bn)}</option>`;
      });
    }
    return opts;
  }

  function applyDivBucketToHolding(h, val) {
    if (!h) return;
    if (val && val.startsWith('bucket:')) {
      h.bucket = val.slice(7);
      h.no_division = true;
      delete h.division;
      delete h.divisions;
    } else if (val === '__none__') {
      h.no_division = true;
      delete h.division;
      delete h.divisions;
      delete h.bucket;
    } else if (val) {
      delete h.no_division;
      h.division = val;
      delete h.divisions;
      delete h.bucket;
    } else {
      delete h.no_division;
      delete h.division;
      delete h.divisions;
      delete h.bucket;
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
          <tr data-holding-id="${esc(r.holding_id)}">
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
                    onclick="closeAllAccountMenus(); toggleAccountExcludeFromRebalance(this.closest('.div-card').dataset.account)">
              ${acc.excluded_from_rebalancing ? '✓ Include in Rebalancing' : '⊘ Exclude from Rebalancing'}
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
        const portDenom = (e.has_excluded_accounts && e.net_worth_cad > 0) ? e.net_worth_cad : e.current_total_cad;
        const portPct = portDenom > 0 ? (h.market_value_cad / portDenom) : 0;
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

        const bucketPillHtml = h.bucket
          ? `<span class="pill pill-primary" style="margin-right:4px;" title="Bucket: ${esc(h.bucket)}">${esc(h.bucket)}</span>`
          : '';
        const divBucketCellHtml = [breakdownPills, bucketPillHtml].filter(Boolean).join('');
        const secLabelHtml = !isGrp
          ? `<span class="sec-edit-link" onclick="openEditPositionModal(this.closest('tr').dataset.holdingId)" title="Edit or delete ${esc(h.symbol)}">
               ${formatSecurityNameHtml(h.symbol, h.symbol_name)}
             </span>`
          : formatSecurityNameHtml(h.symbol, h.symbol_name);

        return `
          <tr data-holding-id="${esc(h.holding_id)}">
            <td class="left wrap-text">
              ${dragHandleHtml(isGrp)}${secLabelHtml}
            </td>
            ${showDivMapping ? `<td class="left wrap-text" style="line-height:1.7;">${divBucketCellHtml || '<span class="text-muted" style="font-size:12px;">—</span>'}</td>` : ''}
            <td class="text-muted">${isManualSymbol(h.symbol) ? '—' : `${fmtPrice(h.share_price)} <span style="font-size:11px;">${esc(h.currency)}</span>`}</td>
            <td>${renderEditableSharesCell(h.holding_id, h.shares, h.symbol, acc.account, isGrp)}</td>
            <td>${renderManualOrValueCell(h.holding_id, h.symbol, h.shares, h.share_price, h.market_value_cad, h.currency, isGrp)}</td>
            <td>${fmtPct(portPct, 1)}</td>
          </tr>
        `;
      }).join('');

      const colSpan = showDivMapping ? 6 : 5;

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
              ${acc.excluded_from_rebalancing ? `<span class="pill pill-neutral" style="font-size:11px;" title="Included in Net Worth, excluded from rebalancing">Net Worth Only</span>` : ''}
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
                <col style="width:110px;">
              </colgroup>
              <thead>
                <tr>
                  <th class="left" title="Ticker symbol and asset description">${esc(t('th_security'))}</th>
                  ${showDivMapping ? `<th class="left" title="Asset allocation breakdown across portfolio divisions">${esc(t('th_div_mapping'))}</th>` : ''}
                  <th title="Latest market quote and trading currency">${esc(t('th_price'))}</th>
                  <th title="Share quantity held in this account (editable)">${esc(t('th_shares'))}</th>
                  <th title="Total market value converted to Canadian Dollars">${esc(t('th_value_cad'))}</th>
                  <th title="Weight of this position as a percentage of total portfolio">${esc(t('th_portfolio_pct'))}</th>
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
          <th>${esc(afterTaxMode() ? t('th_allocation_value') : t('th_value_cad'))}</th>
        </tr>
      </thead>
      <tbody>
        ${(e.account_summaries || []).map(a => {
          const accTypeKey = (a.account_type || 'non_registered').toLowerCase();
          const clsLabel = (accTypes[accTypeKey] && accTypes[accTypeKey].name) || a.account_type || 'Non-Registered / Unregistered';
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
            <td class="left"><span class="pill pill-neutral">${esc(tTerm(clsLabel))}</span>${a.excluded_from_rebalancing ? ` <span class="pill pill-neutral" style="font-size:11px;">Net Worth Only</span>` : ''}</td>
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
    const modal = document.getElementById('newAccountModal');
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => { if (nameInp) nameInp.focus(); }, 50);
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

    if (!Array.isArray(currentPortfolioConfig.accounts)) {
      currentPortfolioConfig.accounts = [];
    }
    const alreadyExists = currentPortfolioConfig.accounts.some(a => a.name === accName) ||
      (currentPortfolioConfig.holdings || []).some(h => h.account === accName);

    if (!alreadyExists) {
      currentPortfolioConfig.accounts.push({ name: accName, account_type: accType });
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
      ? `"${accName}" excluded from rebalancing (Net Worth only)`
      : `"${accName}" included in rebalancing`);
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

    // Populate Division/Bucket dropdown
    const divSel = document.getElementById('modalEditPosDivision');
    if (divSel) {
      divSel.innerHTML = buildDivBucketOptionsHtml();
      if (h.bucket) {
        divSel.value = `bucket:${h.bucket}`;
      } else if (h.no_division) {
        divSel.value = '__none__';
      } else if (h.division) {
        divSel.value = h.division;
      } else {
        divSel.value = '';
      }
    }

    const noteInp = document.getElementById('modalEditPosNote');
    if (noteInp) noteInp.value = h.note || '';

    const modal = document.getElementById('editPositionModal');
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => { if (sharesInp) { sharesInp.focus(); sharesInp.select(); } }, 40);
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

    applyDivBucketToHolding(h, divVal);

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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const editModal = document.getElementById('editPositionModal');
      if (editModal && !editModal.classList.contains('hidden')) {
        closeEditPositionModal();
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
    const addDivBucket = document.getElementById('modalAddPosDivBucket');
    if (addDivBucket) {
      addDivBucket.innerHTML = buildDivBucketOptionsHtml();
      addDivBucket.value = '';
    }
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
      const addDivBucket = document.getElementById('modalAddPosDivBucket');
      if (addDivBucket && addDivBucket.value === '') addDivBucket.value = '__none__';
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
    const divBucketVal = document.getElementById('modalAddPosDivBucket')?.value || '';

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
      if (divBucketVal) applyDivBucketToHolding(existing, divBucketVal);
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
      if (divBucketVal) applyDivBucketToHolding(newHold, divBucketVal);
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
          <th>Goal ($)</th>
          <th>Funded %</th>
          <th>Net Worth %</th>
        </tr>
      </thead>
      <tbody>
        ${buckets.map(b => {
          const hasGoal = b.target_amount > 0;
          const fundedPct = hasGoal ? (b.market_value_cad / b.target_amount) : 0;
          const pillCls = hasGoal ? (fundedPct >= 1 ? 'pill-green' : 'pill-neutral') : '';
          return `
            <tr data-row-key="${esc(b.bucket)}">
              <td class="left">${dragHandleHtml(isGrp)}<b>${esc(b.bucket)}</b></td>
              <td>${b.position_count}</td>
              <td><b>${fmtMoney(b.market_value_cad)}</b></td>
              <td class="text-muted">${hasGoal ? fmtMoney(b.target_amount) : '—'}</td>
              <td>${hasGoal ? `<span class="pill ${pillCls}">${fmtPct(fundedPct, 0)}</span>` : '<span class="text-muted">—</span>'}</td>
              <td>${fmtPct(b.net_worth_ratio, 1)}</td>
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
    const portDenom = (e.has_excluded_accounts && e.net_worth_cad > 0) ? e.net_worth_cad : e.current_total_cad;

    container.innerHTML = buckets.map((b, idx) => {
      const color = DIVISION_COLORS[idx % DIVISION_COLORS.length];
      const cardKey = `bucket:${b.bucket}`;
      const isCollapsed = collapsedCards.has(cardKey);
      const hasGoal = b.target_amount > 0;
      const fundedPct = hasGoal ? (b.market_value_cad / b.target_amount) : 0;

      const rowsHtml = (b.holdings || []).map(h => {
        const portPct = portDenom > 0 ? (h.market_value_cad / portDenom) : 0;
        const secLabelHtml = !isGrp
          ? `<span class="sec-edit-link" onclick="openEditPositionModal(this.closest('tr').dataset.holdingId)" title="Edit ${esc(h.symbol)}">
               ${formatSecurityNameHtml(h.symbol, h.symbol_name)}
             </span>`
          : formatSecurityNameHtml(h.symbol, h.symbol_name);

        return `
          <tr data-holding-id="${esc(h.holding_id)}">
            <td class="left wrap-text"><b>${esc(h.account)}</b></td>
            <td class="left wrap-text">${secLabelHtml}</td>
            <td class="text-muted">${isManualSymbol(h.symbol) ? '—' : `${fmtPrice(h.share_price)} <span style="font-size:11px;">${esc(h.currency)}</span>`}</td>
            <td>${renderEditableSharesCell(h.holding_id, h.shares, h.symbol, h.account, isGrp)}</td>
            <td>${renderManualOrValueCell(h.holding_id, h.symbol, h.shares, h.share_price, h.market_value_cad, h.currency, isGrp)}</td>
            <td>${fmtPct(portPct, 1)}</td>
          </tr>
        `;
      }).join('');

      const menuHtml = !isGrp ? `
        <div class="card-menu-wrap">
          <button type="button" class="btn btn-sm btn-ghost card-menu-btn"
                  onclick="toggleAccountCardMenu(event, this)"
                  title="Bucket actions" aria-haspopup="true" aria-expanded="false">⋯</button>
          <div class="card-menu hidden" role="menu">
            <button type="button" class="card-menu-item" role="menuitem"
                    onclick="closeAllAccountMenus(); editBucketGoal(this.closest('.div-card').dataset.bucket)">
              🎯 Set Goal Target ($)
            </button>
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

      return `
        <div class="div-card${isCollapsed ? ' collapsed' : ''}" data-card-key="${esc(cardKey)}" data-bucket="${esc(b.bucket)}">
          <div class="div-card-header" onclick="onDivCardHeaderClick(event)">
            <div class="div-title-group" style="display:flex;align-items:center;gap:6px;">
              ${dragHandleHtml(isGrp)}
              <span class="card-chevron">▾</span>
              <span class="legend-dot" style="background:${color};width:12px;height:12px;"></span>
              <span style="font-size:15px;font-weight:700;">${esc(b.bucket)}</span>
              ${hasGoal ? `<span class="pill ${fundedPct >= 1 ? 'pill-green' : 'pill-neutral'}" style="font-size:11px;">Goal: ${fmtMoney(b.target_amount)} (${fmtPct(fundedPct, 0)})</span>` : ''}
            </div>
            <div class="div-metrics-group" style="display:flex;align-items:center;gap:12px;">
              <div><span class="text-muted">Value:</span> <b>${fmtMoney(b.market_value_cad)}</b></div>
              <div><span class="text-muted">Net Worth:</span> <b>${fmtPct(b.net_worth_ratio, 1)}</b></div>
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
                <col style="width:110px;">
              </colgroup>
              <thead>
                <tr>
                  <th class="left wrap-text" style="width:185px;">${esc(t('th_account'))}</th>
                  <th class="left">${esc(t('th_security'))}</th>
                  <th>${esc(t('th_price'))}</th>
                  <th>${esc(t('th_shares'))}</th>
                  <th>${esc(t('th_value_cad'))}</th>
                  <th>${esc(t('th_portfolio_pct'))}</th>
                </tr>
              </thead>
              <tbody>${rowsHtml || `<tr><td colspan="6" class="center text-muted" style="padding:20px;">No holdings assigned to ${esc(b.bucket)} yet. Assign holdings from Edit Position.</td></tr>`}</tbody>
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

  async function editBucketGoal(bucketName) {
    if (isGroupSelection(selectedPortfolio) || !currentPortfolioConfig || !bucketName) return;
    if (!Array.isArray(currentPortfolioConfig.buckets)) currentPortfolioConfig.buckets = [];
    let bObj = currentPortfolioConfig.buckets.find(b => b.name === bucketName);
    const currentGoal = bObj && bObj.target_amount > 0 ? String(Math.round(bObj.target_amount)) : '';
    const next = await openPromptModal({
      title: `Goal Target — ${bucketName}`,
      label: 'Dollar Goal Target (CAD, leave blank or 0 to clear)',
      initialValue: currentGoal,
      confirmLabel: 'Save Goal'
    });
    if (next === null) return;
    const val = parseFloat(String(next).replace(/[^0-9.]/g, '')) || 0;
    if (!bObj) {
      bObj = { name: bucketName };
      currentPortfolioConfig.buckets.push(bObj);
    }
    if (val > 0) {
      bObj.target_amount = val;
    } else {
      delete bObj.target_amount;
    }
    await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPortfolioConfig)
    });
    await loadStateAndEvaluate();
    showToast(val > 0 ? `Set ${bucketName} goal to ${fmtMoney(val)}` : `Cleared goal for ${bucketName}`);
  }

  async function renameBucket(oldName) {
    if (isGroupSelection(selectedPortfolio) || !currentPortfolioConfig || !oldName) return;
    const next = await openPromptModal({
      title: 'Rename Bucket',
      label: 'Bucket Name',
      initialValue: oldName,
      confirmLabel: 'Rename'
    });
    if (!next || !next.trim() || next.trim() === oldName) return;
    const newName = next.trim();
    (currentPortfolioConfig.buckets || []).forEach(b => {
      if (b.name === oldName) b.name = newName;
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
    const ok = await openConfirmModal({
      title: 'Delete Bucket',
      message: `Remove bucket "${bucketName}"? (Holdings remain in their accounts with no bucket.)`,
      confirmLabel: 'Delete',
      danger: true
    });
    if (!ok) return;
    if (Array.isArray(currentPortfolioConfig.buckets)) {
      currentPortfolioConfig.buckets = currentPortfolioConfig.buckets.filter(b => b.name !== bucketName);
    }
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

  
