/**
 * Embsay — Program Configuration View (Application Settings)
 */

function renderConfigTab() {
  const cfg = (appState && appState.config) ? appState.config : { language: 'en-CA', theme_mode: 'system', lookup_interval: '1h', lookup_on_load: true };
  const cfgLangEl = document.getElementById('cfgLanguage');
  const cfgIntEl = document.getElementById('cfgLookupInterval');
  const cfgThemeEl = document.getElementById('cfgThemeMode');
  const cfgLoadEl = document.getElementById('cfgLookupOnLoad');
  const cfgDriftEl = document.getElementById('cfgDriftThreshold');
  const cfgIdleEl = document.getElementById('cfgIdleTimeout');
  if (cfgLangEl && document.activeElement !== cfgLangEl) cfgLangEl.value = cfg.language || currentLang;
  if (cfgIntEl && document.activeElement !== cfgIntEl) cfgIntEl.value = cfg.lookup_interval || '1h';
  if (cfgThemeEl && document.activeElement !== cfgThemeEl) cfgThemeEl.value = cfg.theme_mode || 'system';
  if (cfgLoadEl && document.activeElement !== cfgLoadEl) cfgLoadEl.checked = cfg.lookup_on_load !== false;
  const driftPct = ((cfg.drift_threshold !== undefined && cfg.drift_threshold > 0 ? cfg.drift_threshold : 0.01) * 100).toFixed(1);
  if (cfgDriftEl && document.activeElement !== cfgDriftEl) cfgDriftEl.value = driftPct;
  const idleHours = ((cfg.idle_timeout_hours !== undefined && cfg.idle_timeout_hours > 0 ? cfg.idle_timeout_hours : 1.0)).toString();
  if (cfgIdleEl && document.activeElement !== cfgIdleEl) cfgIdleEl.value = idleHours;
}

async function saveAppConfigFromTab() {
  const lang = document.getElementById('cfgLanguage') ? document.getElementById('cfgLanguage').value : currentLang;
  const interval = (document.getElementById('cfgLookupInterval') ? document.getElementById('cfgLookupInterval').value : '1h').trim();
  const modeEl = document.getElementById('cfgThemeMode');
  const mode = (modeEl && modeEl.value) ? modeEl.value : currentThemeMode;
  const onLoad = document.getElementById('cfgLookupOnLoad') ? document.getElementById('cfgLookupOnLoad').checked : true;
  const driftInput = document.getElementById('cfgDriftThreshold');
  const driftRaw = driftInput ? parseFloat(driftInput.value) : 1.0;
  const driftVal = (isNaN(driftRaw) || driftRaw <= 0) ? 0.01 : (driftRaw / 100.0);

  const idleInput = document.getElementById('cfgIdleTimeout');
  const idleRaw = idleInput ? parseFloat(idleInput.value) : 1.0;
  const idleVal = (isNaN(idleRaw) || idleRaw <= 0) ? 1.0 : idleRaw;

  if (lang !== currentLang) {
    currentLang = lang;
    applyStaticI18n();
  }
  if (mode !== currentThemeMode) {
    applyThemeMode(mode);
  }
  schedulePriceRefreshTimer(interval);

  const existingPaths = (appState && appState.config && appState.config.portfolio_paths) ? appState.config.portfolio_paths : ['portfolios', 'examples'];
  const existingSubtabOrder = (appState && appState.config && Array.isArray(appState.config.subtab_order)) ? appState.config.subtab_order : undefined;

  const cfg = {
    language: lang,
    theme_mode: mode,
    lookup_interval: interval,
    lookup_on_load: onLoad,
    drift_threshold: driftVal,
    idle_timeout_hours: idleVal,
    portfolio_paths: existingPaths,
    subtab_order: existingSubtabOrder
  };

  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg)
  });
  if (!res.ok) {
    showToast('Error saving settings');
    return;
  }
  const updatedState = await res.json();
  appState = updatedState;
  showToast(t('toast_settings_saved'));
}
