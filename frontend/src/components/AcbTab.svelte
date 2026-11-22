<script>
  import { onMount } from 'svelte';
  import { fmtMoney, fmtSignedMoney, fmtPrice, fmtPct, fmtSignedPct, fmtNum } from '../lib/format.js';

  let report = $state(null);
  let loading = $state(false);
  let selectedYear = $state('all');
  let expandedSymbols = $state(new Set());

  const taxYears = $derived((report && report.tax_years) || []);
  const symbols = $derived((report && report.symbols) || []);

  const displayedRealized = $derived.by(() => {
    if (!report) return 0;
    if (selectedYear === 'all') {
      return Object.values(report.realized_gain_by_year || {}).reduce((acc, v) => acc + v, 0);
    }
    return (report.realized_gain_by_year || {})[selectedYear] || 0;
  });

  function symbolRealizedForYear(s) {
    if (selectedYear === 'all') return s.realized_gain_total_cad || 0;
    return (s.realized_gain_by_year || {})[selectedYear] || 0;
  }

  function toggleExpand(sym) {
    const next = new Set(expandedSymbols);
    if (next.has(sym)) next.delete(sym);
    else next.add(sym);
    expandedSymbols = next;
  }

  export async function loadACB(id) {
    const targetId = id || window.getSelectedPortfolioId?.() || '';
    if (!targetId) return;
    loading = true;
    try {
      const res = await fetch(`/api/acb?portfolio=${encodeURIComponent(targetId)}`);
      if (res.ok) {
        report = await res.json();
      }
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    window.refreshAcbTab = loadACB;
  });
</script>

<div id="tab-acb" class="tab-pane hidden">
  <div class="section-header">
    <div>
      <h2 class="section-title">Adjusted Cost Base (CRA Taxable Pool)</h2>
      <div class="text-muted" style="font-size:12.5px;">
        CRA weighted-average ACB pooled per ticker across all <b>Non-Registered</b> accounts (registered RRSP/TFSA/RESP excluded; ±30-day superficial loss checked across all accounts).
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      {#if taxYears.length > 0}
        <label for="acbTaxYearFilter" class="kpi-label">Tax Year:</label>
        <select id="acbTaxYearFilter" class="select-clean" bind:value={selectedYear}>
          <option value="all">All Years</option>
          {#each taxYears as yr}
            <option value={yr}>{yr}</option>
          {/each}
        </select>
      {/if}
    </div>
  </div>

  {#if loading && !report}
    <div class="card center text-muted" style="padding:28px;margin-top:16px;">Calculating CRA ACB...</div>
  {:else if !report || symbols.length === 0}
    <div class="card center text-muted" style="padding:28px;margin-top:16px;">
      No taxable (non-registered) transactions recorded yet. Log Buys, Sells, ROC, or Reinvested Capital Gains via <b>+ Add Transaction</b> on your Non-Registered positions to track per-ticker ACB.
    </div>
  {:else}
    <div class="kpi-grid" style="margin-top:16px;margin-bottom:20px;">
      <div class="card">
        <div class="kpi-label">Total Taxable ACB (CAD)</div>
        <div class="kpi-value">{fmtMoney(report.total_acb_cad)}</div>
        <div class="kpi-sub text-muted">{symbols.length} tracked {symbols.length === 1 ? 'ticker' : 'tickers'}</div>
      </div>
      <div class="card">
        <div class="kpi-label">Taxable Market Value (CAD)</div>
        <div class="kpi-value">{fmtMoney(report.total_market_value_cad)}</div>
        <div class="kpi-sub text-muted">At current prices &amp; FX</div>
      </div>
      <div class="card">
        <div class="kpi-label">Unrealized Gain / Loss</div>
        <div class="kpi-value {report.total_unrealized_gain_cad >= 0 ? 'text-green' : 'text-red'}">{fmtSignedMoney(report.total_unrealized_gain_cad)}</div>
        <div class="kpi-sub text-muted">
          {report.total_acb_cad > 0 ? fmtSignedPct(report.total_unrealized_gain_cad / report.total_acb_cad, 1) : '—'} vs. ACB
        </div>
      </div>
      <div class="card">
        <div class="kpi-label">Realized Gain / Loss ({selectedYear === 'all' ? 'All Years' : selectedYear})</div>
        <div class="kpi-value {displayedRealized >= 0 ? 'text-green' : 'text-red'}">{fmtSignedMoney(displayedRealized)}</div>
        <div class="kpi-sub text-muted">Schedule 3 taxable dispositions</div>
      </div>
    </div>

    <div class="card">
      <div style="overflow-x:auto;">
        <table class="table-clean" style="width:100%;">
          <thead>
            <tr>
              <th class="left">Ticker</th>
              <th class="left">Taxable Accounts</th>
              <th>Shares</th>
              <th>ACB / Share</th>
              <th>Total ACB (CAD)</th>
              <th>Market Value</th>
              <th>Unrealized Gain/Loss</th>
              <th>Realized ({selectedYear === 'all' ? 'All' : selectedYear})</th>
            </tr>
          </thead>
          <tbody>
            {#each symbols as s (s.symbol)}
              {@const isOpen = expandedSymbols.has(s.symbol)}
              {@const relGain = symbolRealizedForYear(s)}
              <tr style="cursor:pointer;" onclick={() => toggleExpand(s.symbol)} title="Click to view chronological ACB ledger for {s.symbol}">
                <td class="left">
                  <span style="display:inline-block;width:14px;color:var(--text-muted);">{isOpen ? '▾' : '▸'}</span>
                  <b>{s.symbol}</b>
                  {#if s.symbol_name && s.symbol_name !== s.symbol}
                    <span class="text-muted" style="font-size:12px;margin-left:4px;">{s.symbol_name}</span>
                  {/if}
                  {#if s.has_superficial_warning}
                    <span class="pill pill-red" style="font-size:10.5px;margin-left:4px;" title="Possible CRA superficial loss: same ticker bought within 30 days of a loss sale">⚠ Superficial Loss</span>
                  {/if}
                </td>
                <td class="left wrap-text text-muted" style="font-size:12px;">{(s.accounts || []).join(', ')}</td>
                <td>{fmtNum(s.total_shares)}</td>
                <td>{s.total_shares > 0 ? fmtPrice(s.acb_per_share_cad) : '—'}</td>
                <td><b>{fmtMoney(s.total_acb_cad)}</b></td>
                <td>{fmtMoney(s.market_value_cad)}</td>
                <td class="{s.unrealized_gain_cad >= 0 ? 'text-green' : 'text-red'}">
                  <b>{fmtSignedMoney(s.unrealized_gain_cad)}</b>
                  <span style="font-size:11.5px;">({fmtSignedPct(s.unrealized_gain_pct, 1)})</span>
                </td>
                <td class="{relGain > 0.01 ? 'text-green' : (relGain < -0.01 ? 'text-red' : 'text-muted')}">
                  {Math.abs(relGain) > 0.01 ? fmtSignedMoney(relGain) : '—'}
                </td>
              </tr>
              {#if isOpen}
                <tr>
                  <td colspan="8" style="background:var(--bg-subtle);padding:12px 18px;">
                    <div class="kpi-label" style="margin-bottom:8px;">{s.symbol} Chronological CRA ACB Trail</div>
                    <table class="table-clean" style="width:100%;font-size:12.5px;">
                      <thead>
                        <tr>
                          <th class="left">Date</th>
                          <th class="left">Account</th>
                          <th class="left">Type</th>
                          <th>Shares</th>
                          <th>Amount (CAD)</th>
                          <th>Fee (CAD)</th>
                          <th>Running Shares</th>
                          <th>Running ACB (CAD)</th>
                          <th>ACB / Share</th>
                          <th>Realized Gain</th>
                        </tr>
                      </thead>
                      <tbody>
                        {#each s.events || [] as ev (ev.transaction_id)}
                          <tr>
                            <td class="left">{ev.date}</td>
                            <td class="left">{ev.account}</td>
                            <td class="left">{ev.type.toUpperCase()}</td>
                            <td>{ev.shares ? fmtNum(ev.shares) : '—'}</td>
                            <td>{fmtMoney(ev.amount_cad)}</td>
                            <td class="text-muted">{ev.fee_cad > 0 ? fmtPrice(ev.fee_cad) : '—'}</td>
                            <td>{fmtNum(ev.running_shares)}</td>
                            <td><b>{fmtMoney(ev.running_acb_cad)}</b></td>
                            <td>{ev.running_shares > 0 ? fmtPrice(ev.acb_per_share_cad) : '—'}</td>
                            <td class="{ev.realized_gain_cad > 0.01 ? 'text-green' : (ev.realized_gain_cad < -0.01 ? 'text-red' : 'text-muted')}">
                              {Math.abs(ev.realized_gain_cad) > 0.01 ? fmtSignedMoney(ev.realized_gain_cad) : '—'}
                              {#if ev.superficial_loss_warning}
                                <span class="pill pill-red" style="font-size:10px;margin-left:4px;">±30d Buy</span>
                              {/if}
                            </td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
