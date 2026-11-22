<div id="tab-classification" class="tab-pane hidden">
  <div class="section-header">
    <div>
      <h2 class="section-title" data-i18n="holdings_by_classification">Holdings by Classification</h2>
      <div class="text-muted" style="font-size:12.5px;" data-i18n="holdings_by_classification_sub">Positions grouped by account classification (RRSP, TFSA, Non-Registered, RESP).</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <button class="btn btn-sm" id="btnCollapseClassification" data-collapse-target="classificationCardsContainer" onclick={() => window.toggleAllCardsIn('classificationCardsContainer')}>Collapse All</button>
      <div id="classificationStrategyToggle" class="rebalance-switch" role="button" tabindex="0" onclick={() => window.toggleClassificationStrategyMode()} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') window.toggleClassificationStrategyMode(); }} title="Divide classification tables by strategy division targets">
        <span class="switch-dot"></span>
        <span data-i18n="toggle_divide_by_strategy">Divide by Strategy Target</span>
      </div>
    </div>
  </div>

  <div id="classificationCardsContainer" style="margin-top:20px;"></div>

  <div class="grid-2" style="margin-top:28px;">
    <div class="card">
      <div class="section-header">
        <h3 class="section-title" data-i18n="tax_location_title">Tax Location (Registered vs. Taxable Category Split)</h3>
      </div>
      <div style="overflow-x:auto;">
        <table class="table-clean" id="regVsUnregTable"></table>
      </div>
    </div>
    <div class="card">
      <div class="section-header">
        <h3 class="section-title" data-i18n="holdings_by_classification">Holdings by Classification</h3>
      </div>
      <div style="overflow-x:auto;">
        <table class="table-clean" id="classificationSummaryTable" data-sort-table="classificationSummary"></table>
      </div>
    </div>
  </div>

  <div class="kpi-grid" id="kpiGridClassification" style="margin-top:24px;"></div>
</div>
