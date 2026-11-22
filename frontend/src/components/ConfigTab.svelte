<div id="tab-config" class="tab-pane hidden">
  <div class="card" style="margin-bottom:20px;">
    <div class="section-header" style="margin-bottom:10px;">
      <div>
        <h3 class="section-title" data-i18n="app_settings_title">Application Settings (config/config.yaml)</h3>
        <div class="text-muted" style="font-size:12.5px;" data-i18n="app_settings_sub">Configure language, automatic price lookup interval, and theme mode</div>
      </div>
    </div>
    <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end;">
      <div>
        <div class="kpi-label" style="margin-bottom:4px;" data-i18n="lbl_language">Language / Langue</div>
        <select id="cfgLanguage" class="select-clean" onchange={() => window.saveAppConfigFromTab()}>
          <option value="en-CA">🇨🇦 English (Canada)</option>
          <option value="fr-CA">⚜️ Français (Québec)</option>
        </select>
      </div>
      <div>
        <div class="kpi-label" style="margin-bottom:4px;" data-i18n="lbl_lookup_interval">Price Lookup Interval</div>
        <input type="text" id="cfgLookupInterval" class="input-clean" style="width:120px;" placeholder="e.g. 1h, 30m, 0s" onchange={() => window.saveAppConfigFromTab()} />
      </div>
      <div>
        <div class="kpi-label" style="margin-bottom:4px;" data-i18n="lbl_theme_mode">Theme Mode</div>
        <select id="cfgThemeMode" class="select-clean" onchange={() => window.saveAppConfigFromTab()}>
          <option value="system" data-i18n="opt_theme_system">🖥 Follow System Default</option>
          <option value="dark" data-i18n="opt_theme_dark">🌙 Dark</option>
          <option value="light" data-i18n="opt_theme_light">☀️ Light</option>
        </select>
      </div>
      <div>
        <div class="kpi-label" style="margin-bottom:4px;" data-i18n="lbl_drift_threshold">Drift Warning Rule (%)</div>
        <input type="text" inputmode="decimal" id="cfgDriftThreshold" class="input-clean" style="width:105px;text-align:right;" placeholder="1.0" onchange={() => window.saveAppConfigFromTab()} />
      </div>
      <div>
        <div class="kpi-label" style="margin-bottom:4px;" data-i18n="lbl_idle_timeout">Idle Auto-Close (Hours)</div>
        <input type="text" inputmode="decimal" id="cfgIdleTimeout" class="input-clean" style="width:105px;text-align:right;" placeholder="1.0" onchange={() => window.saveAppConfigFromTab()} />
      </div>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;padding-bottom:6px;">
        <input type="checkbox" id="cfgLookupOnLoad" onchange={() => window.saveAppConfigFromTab()} />
        <span data-i18n="lbl_lookup_on_load">Lookup prices on every load</span>
      </label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;padding-bottom:6px;">
        <input type="checkbox" id="cfgShowAccountDivMapping" onchange={() => window.saveAppConfigFromTab()} />
        <span>Show Division Mapping in By Account</span>
      </label>
    </div>
  </div>
</div>
