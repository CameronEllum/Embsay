<div id="tab-account" class="tab-pane hidden">
  <div class="section-header">
    <div>
      <h2 class="section-title" data-i18n="holdings_by_account">Holdings by Account</h2>
      <div class="text-muted" style="font-size:12.5px;" data-i18n="holdings_by_account_sub">Positions grouped by individual brokerage account.</div>
    </div>
    <div id="accountHeaderActions" style="display:flex;gap:8px;align-items:center;">
      <button class="btn btn-sm" id="btnCollapseAccount" data-collapse-target="accountCardsContainer" onclick={() => window.toggleAllCardsIn('accountCardsContainer')}>Collapse All</button>
      <button class="btn btn-sm" onclick={() => window.openNewAccountModal()} data-i18n="btn_new_account" title="Create a new brokerage or registered account in this portfolio">+ New Account</button>
      <button class="btn btn-sm btn-primary" onclick={() => window.openAddPositionModal()} data-i18n="btn_add_position" title="Add a new holding position to an account in this portfolio">+ Add Position</button>
    </div>
  </div>

  <div id="accountCardsContainer" style="margin-top:20px;"></div>

  <div class="card" style="margin-top:28px;">
    <div class="section-header">
      <h3 class="section-title" data-i18n="holdings_by_account">Holdings by Account</h3>
    </div>
    <div style="overflow-x:auto;">
      <table class="table-clean" id="accountSummaryTable" data-sort-table="accountSummary"></table>
    </div>
  </div>

  <div class="kpi-grid" id="kpiGridAccount" style="margin-top:24px;"></div>
</div>
