<script>
  import { onMount } from 'svelte';
  import Header from './components/Header.svelte';
  import PortfolioContextBar from './components/PortfolioContextBar.svelte';
  import RebalanceBanner from './components/RebalanceBanner.svelte';
  import SummaryTab from './components/SummaryTab.svelte';
  import DivisionTab from './components/DivisionTab.svelte';
  import AccountTab from './components/AccountTab.svelte';
  import ClassificationTab from './components/ClassificationTab.svelte';
  import BucketTab from './components/BucketTab.svelte';
  import StrategyTab from './components/StrategyTab.svelte';
  import SecuritiesTab from './components/SecuritiesTab.svelte';
  import PortMgmtTab from './components/PortMgmtTab.svelte';
  import ConfigTab from './components/ConfigTab.svelte';
  import Modals from './components/Modals.svelte';
  import { init } from './lib/legacyRuntime.js';

  onMount(() => {
    try {
      const t = localStorage.getItem('embsay_theme') || 'system';
      const eff = t === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : t;
      document.documentElement.setAttribute('data-theme', eff);
    } catch (e) {}
    init();
  });
</script>

<Header />
<PortfolioContextBar />
<RebalanceBanner />

<main class="container">
  <div id="dataWarningsBanner" class="card hidden" style="margin-bottom:14px;border-left:4px solid var(--amber);background:var(--amber-soft);padding:12px 16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div id="dataWarningsText" style="font-size:13px;line-height:1.5;color:var(--amber);font-weight:500;"></div>
      <button id="btnRefreshPortData" class="btn btn-primary" onclick={() => window.refreshCurrentPortfolioData()} data-i18n="btn_refresh_etf_data">
        ↻ Refresh ETF Data
      </button>
    </div>
  </div>

  <SummaryTab />
  <DivisionTab />
  <AccountTab />
  <ClassificationTab />
  <BucketTab />
  <StrategyTab />
  <SecuritiesTab />
  <PortMgmtTab />
  <ConfigTab />
</main>

<footer class="app-footer">
  <span>Embsay</span>
  <span class="text-muted">•</span>
  <button type="button" class="btn-link" onclick={() => window.openDisclaimerModal()} style="background:none;border:none;color:inherit;cursor:pointer;padding:0;text-decoration:underline;font:inherit;">Disclaimer</button>
</footer>

<Modals />
