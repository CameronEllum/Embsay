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

