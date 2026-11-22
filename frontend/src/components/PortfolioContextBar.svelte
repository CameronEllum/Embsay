<nav id="portfolioContextBar" class="portfolio-context-bar">
  <div class="portfolio-context-inner">
    <div class="portfolio-bar-left">
      <div class="port-switcher-wrap">
        <button type="button" id="activePortfolioSwitcherBtn" class="port-switcher-btn" onclick={(e) => window.togglePortfolioSwitcher(e)} title="Switch portfolio" aria-haspopup="true" aria-expanded="false">
          <span class="active-portfolio-title" id="activePortfolioName"></span>
          <span class="port-switcher-caret" aria-hidden="true">▾</span>
        </button>
        <div id="portfolioSwitcherMenu" class="card-menu port-switcher-menu hidden" role="menu"></div>
      </div>
      <div class="port-subnav-divider"></div>
      <div id="portfolioSubNav" class="portfolio-subnav">
        <button class="port-subtab active" data-subtab="summary" onclick={() => window.switchPortfolioSubTab('summary')}>Summary</button>
        <button class="port-subtab" data-subtab="division" onclick={() => window.switchPortfolioSubTab('division')} data-i18n="nav_by_division">Division</button>
        <button class="port-subtab" data-subtab="account" onclick={() => window.switchPortfolioSubTab('account')} data-i18n="nav_by_account">Account</button>
        <button class="port-subtab" data-subtab="classification" onclick={() => window.switchPortfolioSubTab('classification')} data-i18n="nav_by_classification">Classification</button>
        <button class="port-subtab" data-subtab="bucket" onclick={() => window.switchPortfolioSubTab('bucket')}>Bucket</button>
        <button class="port-subtab" data-subtab="strategy" onclick={() => window.switchPortfolioSubTab('strategy')} data-i18n="nav_strategy_targets">Strategy Targets</button>
      </div>
    </div>

    <div class="portfolio-bar-right">
      <div id="rebalanceToggle" class="rebalance-switch" role="button" tabindex="0" onclick={() => window.toggleRebalanceMode()} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') window.toggleRebalanceMode(); }}>
        <span class="switch-dot"></span>
        <span data-i18n="rebalance_simulator">Rebalance Simulator</span>
      </div>

      <div id="afterTaxToggle" class="rebalance-switch" role="button" tabindex="0" onclick={() => window.toggleAfterTaxMode()} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') window.toggleAfterTaxMode(); }}>
        <span class="switch-dot"></span>
        <span data-i18n="after_tax_toggle">After-Tax RRSP</span>
      </div>

      <button class="btn btn-sm" onclick={() => window.backupCurrentPortfolio()} id="btnBackupPortfolio" data-i18n-title="btn_backup_portfolio_title" title="Save a date-and-time postfixed backup copy of this portfolio">
        💾 <span data-i18n="btn_backup">Backup</span>
      </button>

      <button class="btn btn-sm" onclick={() => window.refreshPrices()} id="btnRefreshPrices" data-i18n-title="btn_refresh_prices_title" data-i18n="btn_refresh_prices" title="Fetch latest market prices and Bank of Canada USD/CAD rate">
        ↻ Prices &amp; FX
      </button>
    </div>
  </div>
</nav>
