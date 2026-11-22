<div id="tab-bucket" class="tab-pane hidden">
  <div class="section-header">
    <div>
      <h2 class="section-title">Holdings by Bucket</h2>
      <div class="text-muted" style="font-size:12.5px;">Earmark holdings toward savings or financial buckets with optional dollar targets, independent of rebalancing.</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button class="btn btn-sm" id="btnCollapseBucket" data-collapse-target="bucketCardsContainer" onclick={() => window.toggleAllCardsIn('bucketCardsContainer')}>Collapse All</button>
      <button class="btn btn-sm btn-primary" onclick={() => window.openNewBucketModal()} title="Create a new bucket">+ New Bucket</button>
    </div>
  </div>

  <div id="bucketCardsContainer" style="margin-top:20px;"></div>

  <div class="card" style="margin-top:28px;">
    <div class="section-header">
      <h3 class="section-title">Buckets Summary</h3>
    </div>
    <div style="overflow-x:auto;">
      <table class="table-clean" id="bucketSummaryTable" data-sort-table="bucketSummary"></table>
    </div>
  </div>

  <div class="kpi-grid" id="kpiGridBucket" style="margin-top:24px;"></div>
</div>
