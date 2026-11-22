<script>
  // Header component — global navigation, language, theme, report issue, quit
</script>

<header class="topbar">
  <div class="topbar-inner">
    <div class="brand-area">
      <div class="app-logo">
        <span class="logo-mark" title="Embsay — Canadian Portfolio Rebalancer">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="url(#embsayLogoGrad)" />
            <defs>
              <linearGradient id="embsayLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#dc2626" />
                <stop offset="100%" stop-color="#991b1b" />
              </linearGradient>
            </defs>
            <path d="M 19.11 4.41 A 12 12 0 0 1 24.49 24.49" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" fill="none" />
            <path d="M 22 26.39 A 12 12 0 0 1 4.41 19.11" stroke="#fca5a5" stroke-width="2.2" stroke-linecap="round" fill="none" />
            <path d="M 4 16 A 12 12 0 0 1 16 4" stroke="rgba(255,255,255,0.45)" stroke-width="2.2" stroke-linecap="round" fill="none" />
            <path d="M 16.44 26.25 L 16.22 22.07 A 0.46 0.46 0 0 1 16.75 21.6 L 20.91 22.33 L 20.35 20.78 A 0.31 0.31 0 0 1 20.45 20.43 L 25.0 16.74 L 23.97 16.26 A 0.31 0.31 0 0 1 23.81 15.88 L 24.71 13.11 L 22.09 13.67 A 0.31 0.31 0 0 1 21.73 13.49 L 21.23 12.29 L 19.18 14.49 A 0.31 0.31 0 0 1 18.64 14.21 L 19.63 9.12 L 18.05 10.04 A 0.31 0.31 0 0 1 17.61 9.9 L 16.0 6.75 L 14.39 9.9 A 0.31 0.31 0 0 1 13.95 10.04 L 12.37 9.12 L 13.36 14.21 A 0.31 0.31 0 0 1 12.82 14.49 L 10.77 12.29 L 10.27 13.49 A 0.31 0.31 0 0 1 9.91 13.67 L 7.29 13.11 L 8.19 15.88 A 0.31 0.31 0 0 1 8.03 16.26 L 7.0 16.74 L 11.55 20.43 A 0.31 0.31 0 0 1 11.65 20.78 L 11.09 22.33 L 15.25 21.6 A 0.46 0.46 0 0 1 15.78 22.07 L 15.56 26.25 Z" fill="#ffffff" />
          </svg>
        </span>
        <span>Embsay</span>
      </div>

      <nav class="nav-links main-views">
        <button class="main-view-btn" data-view="port-mgmt" onclick={() => window.openPortfolioSelection(true)}>
          <span class="nav-icon">📁</span>
          <span data-i18n="nav_portfolios">Portfolios</span>
        </button>
        <button class="main-view-btn" data-view="securities" onclick={() => window.switchMainView('securities', true)}>
          <span class="nav-icon">📊</span>
          <span data-i18n="nav_securities_tax">ETFs &amp; Tax</span>
        </button>
        <button class="main-view-btn" data-view="config" onclick={() => window.switchMainView('config', true)}>
          <span class="nav-icon">⚙️</span>
          <span data-i18n="nav_config">Config</span>
        </button>
      </nav>
    </div>

    <div class="controls-area">
      <select id="langSelect" class="select-clean" onchange={(e) => window.changeLanguage(e.currentTarget.value)} title="Language / Langue">
        <option value="en-CA">🇨🇦 English (CA)</option>
        <option value="fr-CA">⚜️ Français (QC)</option>
      </select>

      <button class="btn" onclick={() => window.toggleTheme()} id="themeBtn" data-i18n-title="btn_theme_title" title="Theme mode (click to cycle System / Dark / Light)">
        🖥 System
      </button>

      <button class="btn" onclick={() => window.openReportIssue()} id="reportIssueBtn" data-i18n-title="btn_report_issue_title" title="File a bug report or feature request on GitHub">
        🐛 <span data-i18n="btn_report_issue">Report Issue</span>
      </button>

      <button class="btn btn-ghost" onclick={() => window.quitApplication()} id="quitBtn" style="color:var(--red);" data-i18n-title="btn_quit_title" title="Quit and close the Embsay application">
        ⏻ <span data-i18n="btn_quit">Quit</span>
      </button>
    </div>
  </div>
</header>
