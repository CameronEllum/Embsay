<div id="rebalanceBanner" class="rebalance-drawer hidden">
  <div class="rebalance-drawer-inner">
    <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
      <div>
        <span style="font-weight:700;color:var(--primary);" data-i18n="rebal_banner_title">⚖️ Rebalance Simulator Active</span>
        <span class="text-muted" style="margin-left:6px;" data-i18n="rebal_banner_desc">Simulate deposits, withdrawals, and target share trades without cluttering your daily view.</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <label for="rebalCashInput" style="font-weight:600;font-size:12.5px;" id="rebalCashLabel" data-i18n="rebal_cash_label">Cash to Invest / Withdraw ($ CAD):</label>
        <input type="text" inputmode="decimal" id="rebalCashInput" class="input-clean" style="width:110px;font-weight:700;text-align:right;"
               onchange={(e) => window.updateAmountToBuy(e.currentTarget.value)} />
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-primary" onclick={() => window.applyCalculatedTrades(true)} data-i18n="rebal_btn_whole" title="Populate simulated trades with whole integer shares recommended by the rebalancing model">
        Populate Recommended Shares (Whole)
      </button>
      <button class="btn" onclick={() => window.applyCalculatedTrades(false)} data-i18n="rebal_btn_exact" title="Populate simulated trades with exact fractional share amounts">
        Exact Shares
      </button>
      <button class="btn" onclick={() => window.commitProposedTrades()} data-i18n="rebal_btn_commit" title="Permanently write and save these simulated trades into your portfolio holdings">
        ✓ Commit Executed Trades to Holdings
      </button>
    </div>
    <div id="rebalanceWarnings" style="width:100%;padding-left:2px;"></div>
  </div>
</div>
