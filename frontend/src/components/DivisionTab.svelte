<div id="tab-allocations" class="tab-pane hidden">
  <div class="card alloc-section">
    <div class="section-header">
      <div>
        <h2 class="section-title" data-i18n="alloc_vs_target_title">Retirement Allocation vs. Strategy Target</h2>
        <div class="text-muted" style="font-size:12.5px;" data-i18n="alloc_vs_target_sub">Retirement bucket division weights against your target strategy</div>
      </div>
      <div id="categoryPillsSummary" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
    </div>

    <div id="stackedBarsContainer"></div>

    <div style="margin-top:20px;overflow-x:auto;">
      <table class="table-clean" id="divisionSummaryTable" data-sort-table="divisionSummary"></table>
    </div>
  </div>

  <div class="section-header" style="margin-top:28px;">
    <div>
      <h2 class="section-title" id="holdingsGroupTitle" data-i18n="holdings_by_division">Holdings by Division (Retirement Bucket)</h2>
      <div class="text-muted" style="font-size:12.5px;" id="holdingsGroupSubtitle" data-i18n="holdings_by_division_sub"></div>
    </div>
    <div>
      <button class="btn btn-sm" id="btnCollapseDivision" data-collapse-target="divisionCardsContainer" onclick={() => window.toggleAllCardsIn('divisionCardsContainer')}>Collapse All</button>
    </div>
  </div>
  <div id="divisionCardsContainer"></div>

  <div class="kpi-grid" id="kpiGridDivision" style="margin-top:24px;"></div>
</div>
