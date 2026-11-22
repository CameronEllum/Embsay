<script>
  import { onMount } from 'svelte';
  import { fmtMoney, fmtPrice, fmtNum } from '../lib/format.js';

  let transactions = $state([]);
  let txFile = $state('');
  let loading = $state(false);
  let portfolioId = $state('');
  let isGroup = $state(false);

  let searchQuery = $state('');
  let filterAccount = $state('all');
  let filterType = $state('all');
  let filterYear = $state('all');

  const accounts = $derived(
    Array.from(new Set(transactions.map(t => t.account).filter(Boolean))).sort()
  );
  const years = $derived(
    Array.from(new Set(transactions.map(t => (t.date || '').slice(0, 4)).filter(Boolean))).sort().reverse()
  );

  const filtered = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...transactions]
      .filter(tx => {
        if (filterAccount !== 'all' && tx.account !== filterAccount) return false;
        if (filterType !== 'all' && tx.type !== filterType) return false;
        if (filterYear !== 'all' && !(tx.date || '').startsWith(filterYear)) return false;
        if (q) {
          const hay = `${tx.symbol} ${tx.account} ${tx.type} ${tx.note || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .reverse(); // API returns ascending chronological order; show newest first in ledger
  });

  export async function loadTransactions(id) {
    const targetId = id || window.getSelectedPortfolioId?.() || '';
    if (!targetId) return;
    portfolioId = targetId;
    isGroup = typeof window.isGroupSelection === 'function' ? window.isGroupSelection(targetId) : targetId.includes(',');
    loading = true;
    try {
      const res = await fetch(`/api/transactions?portfolio=${encodeURIComponent(targetId)}`);
      if (res.ok) {
        const data = await res.json();
        transactions = data.transactions || [];
        txFile = data.transactions_file || '';
      }
    } finally {
      loading = false;
    }
  }

  async function handleDelete(tx) {
    if (isGroup || !tx?.id) return;
    const ok = await window.openConfirmModal?.({
      title: 'Delete Transaction',
      message: `Delete ${tx.type.toUpperCase()} ${tx.symbol || ''} (${tx.date}) from CSV ledger?\n\nNote: existing holding share count in the portfolio YAML will not be altered automatically.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/transactions?portfolio=${encodeURIComponent(portfolioId)}&id=${encodeURIComponent(tx.id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      window.showToast?.('Failed to delete transaction');
      return;
    }
    window.showToast?.('Deleted transaction');
    await loadTransactions(portfolioId);
    window.refreshAcbTab?.();
  }

  function typeBadgeClass(txType) {
    switch (txType) {
      case 'buy':
      case 'reinvested_cap_gain':
      case 'deposit':
        return 'pill-green';
      case 'sell':
      case 'withdrawal':
      case 'fee':
        return 'pill-red';
      case 'roc':
      case 'dividend':
      case 'interest':
        return 'pill-primary';
      default:
        return 'pill-neutral';
    }
  }

  onMount(() => {
    window.refreshTransactionsTab = loadTransactions;
  });
</script>

<div id="tab-transactions" class="tab-pane hidden">
  <div class="section-header">
    <div>
      <h2 class="section-title">Transactions Ledger</h2>
      <div class="text-muted" style="font-size:12.5px;">
        {#if txFile}
          CSV file: <code style="font-size:12px;">{txFile}</code>
        {:else}
          No CSV ledger configured yet — adding your first transaction will create <code>&lt;portfolio&gt;_transactions.csv</code>.
        {/if}
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      {#if !isGroup}
        <button class="btn btn-sm btn-primary" onclick={() => window.openAddTransactionModal?.('')}>+ Add Transaction</button>
      {/if}
    </div>
  </div>

  <div class="card" style="margin-top:16px;">
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px;">
      <input
        type="text"
        class="input-clean"
        style="width:220px;"
        placeholder="Search ticker, account, note..."
        bind:value={searchQuery}
      />
      <select class="select-clean" bind:value={filterAccount}>
        <option value="all">All Accounts</option>
        {#each accounts as acc}
          <option value={acc}>{acc}</option>
        {/each}
      </select>
      <select class="select-clean" bind:value={filterType}>
        <option value="all">All Types</option>
        <option value="buy">Buy</option>
        <option value="sell">Sell</option>
        <option value="dividend">Dividend</option>
        <option value="roc">ROC (Return of Capital)</option>
        <option value="reinvested_cap_gain">Reinvested Cap Gain</option>
        <option value="split">Split</option>
        <option value="deposit">Deposit</option>
        <option value="withdrawal">Withdrawal</option>
        <option value="interest">Interest</option>
        <option value="fee">Fee</option>
      </select>
      <select class="select-clean" bind:value={filterYear}>
        <option value="all">All Years</option>
        {#each years as y}
          <option value={y}>{y}</option>
        {/each}
      </select>
      <span class="text-muted" style="font-size:12px;margin-left:auto;">
        {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'}
      </span>
    </div>

    {#if loading && transactions.length === 0}
      <div class="center text-muted" style="padding:24px;">Loading transactions...</div>
    {:else if filtered.length === 0}
      <div class="center text-muted" style="padding:28px;">
        No transactions recorded yet. Right-click any position in <b>Accounts</b> or <b>Allocations</b> → <b>+ Add Transaction</b>, or click <b>+ Add Transaction</b> above.
      </div>
    {:else}
      <div style="overflow-x:auto;">
        <table class="table-clean" style="width:100%;">
          <thead>
            <tr>
              <th class="left">Date</th>
              <th class="left">Account</th>
              <th class="left">Type</th>
              <th class="left">Symbol</th>
              <th>Shares</th>
              <th>Price</th>
              <th>Total Amount</th>
              <th>Fee</th>
              <th>FX</th>
              <th class="left">Note</th>
              {#if !isGroup}
                <th>Actions</th>
              {/if}
            </tr>
          </thead>
          <tbody>
            {#each filtered as tx (tx.id)}
              <tr>
                <td class="left" style="white-space:nowrap;">{tx.date}</td>
                <td class="left wrap-text"><b>{tx.account}</b></td>
                <td class="left"><span class="pill {typeBadgeClass(tx.type)}">{tx.type.toUpperCase()}</span></td>
                <td class="left"><b>{tx.symbol || '—'}</b></td>
                <td>{tx.shares ? fmtNum(tx.shares) : '—'}</td>
                <td class="text-muted">{tx.price > 0 ? fmtPrice(tx.price) : '—'}</td>
                <td>
                  <b>{fmtMoney(tx.amount)}</b>
                  {#if tx.currency === 'USD'}
                    <div class="text-muted" style="font-size:11px;">USD ({fmtMoney(tx.amount * (tx.fx_rate || 1))} CAD)</div>
                  {/if}
                </td>
                <td class="text-muted">{tx.fee > 0 ? fmtPrice(tx.fee) : '—'}</td>
                <td class="text-muted">{tx.currency === 'USD' ? (tx.fx_rate || 1).toFixed(4) : '—'}</td>
                <td class="left wrap-text text-muted" style="max-width:220px;">{tx.note || ''}</td>
                {#if !isGroup}
                  <td style="white-space:nowrap;">
                    <button type="button" class="btn btn-sm btn-ghost" onclick={() => window.openAddTransactionModal?.('', tx)} title="Edit transaction">✎</button>
                    <button type="button" class="btn btn-sm btn-ghost" style="color:var(--red);" onclick={() => handleDelete(tx)} title="Delete transaction">✕</button>
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
