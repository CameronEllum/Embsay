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

async function deletePortfolioFromMgmt(id, name) {
  if (!confirm(`Delete portfolio "${name}"?`)) return;
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
  if (!confirm(`Delete saved portfolio group "${id}"?`)) return;
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
