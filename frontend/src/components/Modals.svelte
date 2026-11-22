<!-- NEW ACCOUNT MODAL -->
<div id="newAccountModal" class="modal-backdrop hidden">
  <div class="modal-card" style="max-width:440px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <h3 class="section-title" style="margin:0;">Add New Account</h3>
      <button class="btn btn-ghost" onclick={() => window.closeNewAccountModal()} style="font-size:16px;padding:2px 8px;" title="Close dialog (Esc)">✕</button>
    </div>
    <p class="text-muted" style="margin-top:0;font-size:13px;">
      Create a new brokerage or registered account within this portfolio.
    </p>
    <div style="margin-bottom:14px;">
      <label for="modalNewAccountName" class="kpi-label" style="display:block;margin-bottom:4px;">Account Name</label>
      <input type="text" id="modalNewAccountName" class="input-clean" style="width:100%;" placeholder="e.g. TFSA, RRSP, Margin" onkeydown={(e) => { if (e.key === 'Enter') window.submitNewAccountModal(); }} />
    </div>
    <div style="margin-bottom:18px;">
      <label for="modalNewAccountType" class="kpi-label" style="display:block;margin-bottom:4px;">Classification / Account Type</label>
      <select id="modalNewAccountType" class="select-clean" style="width:100%;">
        <option value="rrsp">RRSP (Registered Retirement)</option>
        <option value="tfsa">TFSA (Tax-Free Savings)</option>
        <option value="non_registered">Non-Registered / Margin</option>
        <option value="resp">RESP (Education Savings)</option>
      </select>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn" onclick={() => window.closeNewAccountModal()} title="Cancel and close dialog">Cancel</button>
      <button class="btn btn-primary" onclick={() => window.submitNewAccountModal()} title="Create this account in the portfolio">Create Account</button>
    </div>
  </div>
</div>

<!-- ADD POSITION MODAL WITH FUZZY AUTO-LOOKUP -->
<div id="addPositionModal" class="modal-backdrop hidden">
  <div class="modal-card" style="max-width:520px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <h3 class="section-title" style="margin:0;">Add Position</h3>
      <button class="btn btn-ghost" onclick={() => window.closeAddPositionModal()} style="font-size:16px;padding:2px 8px;" title="Close dialog (Esc)">✕</button>
    </div>
    <p class="text-muted" style="margin-top:0;margin-bottom:14px;font-size:13px;">
      Search any ticker or ETF name for instant auto-lookup, then enter shares.
    </p>

    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <label for="modalAddPosAccountSelect" class="kpi-label">Account</label>
        <button type="button" class="btn-link" onclick={() => window.openNewAccountModal(true)} style="font-size:11.5px;color:var(--primary);background:none;border:none;cursor:pointer;padding:0;">+ New Account</button>
      </div>
      <select id="modalAddPosAccountSelect" class="select-clean" style="width:100%;"></select>
    </div>

    <div style="margin-bottom:14px;position:relative;">
      <label for="modalAddPosSymbolInput" class="kpi-label" style="display:block;margin-bottom:4px;">Symbol / ETF Ticker</label>
      <div style="position:relative;">
        <input type="text" id="modalAddPosSymbolInput" class="input-clean" style="width:100%;font-weight:700;letter-spacing:0.02em;" placeholder="Type ticker or name (e.g. ZCN, VTI, House)..." autocomplete="off" oninput={(e) => window.onModalSymbolInput(e.currentTarget.value)} onkeydown={(e) => window.onModalSymbolKeyDown(e)} />
        <span id="modalAddPosSpinner" class="hidden" style="position:absolute;right:10px;top:8px;font-size:12px;color:var(--text-muted);">⏳</span>
      </div>
      <div id="modalAddPosSuggestions" class="hidden" style="position:absolute;left:0;right:0;top:100%;z-index:1000;background:var(--bg-surface);border:1px solid var(--border);border-radius:6px;max-height:220px;overflow-y:auto;box-shadow:0 6px 18px rgba(0,0,0,0.18);margin-top:4px;"></div>
      <label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12.5px;color:var(--text-secondary);cursor:pointer;">
        <input type="checkbox" id="modalAddPosManualToggle" onchange={() => window.onToggleManualAssetMode()} />
        <span>Manual / Fixed-Price Asset (cash, property, GIC, or liability)</span>
      </label>
    </div>

    <div id="modalAddPosManualFields" class="hidden" style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
      <div style="flex:2;min-width:180px;">
        <label for="modalAddPosManualName" class="kpi-label" style="display:block;margin-bottom:4px;">Description</label>
        <input type="text" id="modalAddPosManualName" class="input-clean" style="width:100%;" placeholder="e.g. Emergency Savings, Mortgage" oninput={() => window.onManualAssetInput()} />
      </div>
      <div style="width:100px;">
        <label for="modalAddPosManualCurrency" class="kpi-label" style="display:block;margin-bottom:4px;">Currency</label>
        <select id="modalAddPosManualCurrency" class="select-clean" style="width:100%;" onchange={() => window.onManualAssetInput()}>
          <option value="CAD">CAD</option>
          <option value="USD">USD</option>
        </select>
      </div>
    </div>

    <div id="modalAddPosDetailsCard" style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:6px;padding:10px 14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div>
          <div style="font-weight:700;font-size:14px;" id="modalPreviewSymTitle">—</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;" id="modalPreviewSymName">Type a symbol above to search or look up details</div>
        </div>
        <div style="text-align:right;white-space:nowrap;">
          <div style="font-weight:700;font-size:15px;" id="modalPreviewPrice">—</div>
          <div style="font-size:11px;color:var(--text-muted);" id="modalPreviewCurrency"></div>
        </div>
      </div>
      <div id="modalPreviewDivisions" style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap;"></div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:14px;">
      <div style="flex:1;">
        <label id="modalAddPosSharesLabel" for="modalAddPosSharesInput" class="kpi-label" style="display:block;margin-bottom:4px;">Shares / Principal</label>
        <input type="text" inputmode="decimal" id="modalAddPosSharesInput" class="input-clean" style="width:100%;text-align:right;font-size:16px;font-weight:600;" placeholder="0" oninput={() => window.updateModalEstimatedValue()} onkeydown={(e) => { if (e.key === 'Enter') window.submitAddPositionModal(); }} />
      </div>
      <div style="flex:1;">
        <div class="kpi-label" style="display:block;margin-bottom:4px;">Estimated Value (CAD)</div>
        <div id="modalAddPosEstValue" style="padding:8px 12px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:6px;font-size:16px;font-weight:700;text-align:right;color:var(--text);height:38px;box-sizing:border-box;">$0.00</div>
      </div>
    </div>

    <div style="margin-bottom:14px;">
      <label for="modalAddPosDivBucket" class="kpi-label" style="display:block;margin-bottom:4px;">Division/Bucket</label>
      <select id="modalAddPosDivBucket" class="select-clean" style="width:100%;"></select>
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button type="button" class="btn" onclick={() => window.closeAddPositionModal()} title="Cancel and close dialog">Cancel</button>
      <button type="button" class="btn btn-primary" id="modalAddPosSubmitBtn" onclick={() => window.submitAddPositionModal()} title="Add or update this position in the portfolio">+ Add Position</button>
    </div>
  </div>
</div>

<!-- EDIT POSITION MODAL -->
<div id="editPositionModal" class="modal-backdrop hidden" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) window.closeEditPositionModal(); }}>
  <div class="modal-card" style="max-width:460px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 class="section-title" style="margin:0;" id="modalEditPosTitle">Edit Position</h3>
      <button type="button" class="btn btn-ghost" onclick={() => window.closeEditPositionModal()} style="font-size:16px;padding:2px 8px;" title="Close dialog (Esc)">✕</button>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:10px;">
      <div style="flex:1;">
        <label for="modalEditPosAccount" class="kpi-label" style="display:block;margin-bottom:4px;">Account</label>
        <select id="modalEditPosAccount" class="select-clean" style="width:100%;"></select>
      </div>
      <div style="flex:1;">
        <label for="modalEditPosSymbol" class="kpi-label" style="display:block;margin-bottom:4px;">Position Name / Symbol</label>
        <input type="text" id="modalEditPosSymbol" class="input-clean" style="width:100%;font-weight:600;" onkeydown={(e) => { if (e.key === 'Enter') window.submitEditPositionModal(); }} />
      </div>
    </div>

    <label style="display:flex;align-items:center;gap:6px;margin-bottom:12px;font-size:12.5px;color:var(--text-secondary);cursor:pointer;">
      <input type="checkbox" id="modalEditPosManualToggle" onchange={() => window.onToggleEditManualMode()} />
      <span>Manual / Fixed-Price Asset (cash, property, GIC, or liability)</span>
    </label>

    <div id="modalEditPosManualFields" class="hidden" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
      <div style="flex:2;min-width:160px;">
        <label for="modalEditPosManualName" class="kpi-label" style="display:block;margin-bottom:4px;">Description</label>
        <input type="text" id="modalEditPosManualName" class="input-clean" style="width:100%;" />
      </div>
      <div style="width:100px;">
        <label for="modalEditPosManualCurrency" class="kpi-label" style="display:block;margin-bottom:4px;">Currency</label>
        <select id="modalEditPosManualCurrency" class="select-clean" style="width:100%;">
          <option value="CAD">CAD</option>
          <option value="USD">USD</option>
        </select>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:12px;">
      <div style="flex:1;">
        <label id="modalEditPosSharesLabel" for="modalEditPosShares" class="kpi-label" style="display:block;margin-bottom:4px;">Shares</label>
        <input type="text" inputmode="decimal" id="modalEditPosShares" class="input-clean" style="width:100%;text-align:right;font-weight:600;" onkeydown={(e) => { if (e.key === 'Enter') window.submitEditPositionModal(); }} />
      </div>
      <div style="flex:1;">
        <label for="modalEditPosDivision" class="kpi-label" style="display:block;margin-bottom:4px;">Division/Bucket</label>
        <select id="modalEditPosDivision" class="select-clean" style="width:100%;"></select>
      </div>
    </div>

    <div style="margin-bottom:18px;">
      <label for="modalEditPosNote" class="kpi-label" style="display:block;margin-bottom:4px;">Note (optional)</label>
      <input type="text" id="modalEditPosNote" class="input-clean" style="width:100%;" placeholder="Optional note..." onkeydown={(e) => { if (e.key === 'Enter') window.submitEditPositionModal(); }} />
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <button type="button" class="btn btn-danger" onclick={() => window.deleteFromEditPositionModal()}>✕ Delete Position</button>
      <div style="display:flex;gap:8px;">
        <button type="button" class="btn" onclick={() => window.closeEditPositionModal()}>Cancel</button>
        <button type="button" class="btn btn-primary" onclick={() => window.submitEditPositionModal()}>Save Changes</button>
      </div>
    </div>
  </div>
</div>

<!-- CREATE NEW PORTFOLIO MODAL -->
<div id="newPortfolioModal" class="modal-backdrop hidden">
  <div class="modal-card">
    <h3 class="section-title" style="margin-bottom:6px;" data-i18n="modal_new_port_title">Create New Portfolio</h3>
    <p class="text-muted" style="margin-top:0;font-size:13px;" data-i18n="modal_new_port_sub_clean">
      Configure your portfolio name, storage directory, and starting strategy.
    </p>
    <div style="margin-bottom:14px;">
      <label for="modalNewPortName" class="kpi-label" style="display:block;margin-bottom:4px;" data-i18n="lbl_portfolio_name">Portfolio Name</label>
      <input type="text" id="modalNewPortName" class="input-clean" style="width:100%;" data-i18n-placeholder="ph_portfolio_name" placeholder="e.g. Kid 2 RESP, Corporate, TFSA" />
    </div>
    <div style="margin-bottom:14px;">
      <label for="modalSaveDirSelect" class="kpi-label" style="display:block;margin-bottom:4px;" data-i18n="lbl_save_directory">Save Directory / Folder</label>
      <div style="display:flex;gap:6px;">
        <select id="modalSaveDirSelect" class="select-clean" style="flex:1;" onchange={() => window.handleModalDirChange()}></select>
        <button type="button" id="modalBrowseBtn" class="btn hidden" onclick={() => window.browseFolderForModal()} data-i18n="btn_browse_folder">📁 Browse...</button>
      </div>
      <input type="text" id="modalCustomDirInput" class="input-clean hidden" style="width:100%;margin-top:6px;" placeholder="e.g. C:/Users/Documents/Portfolios" />
    </div>
    <div style="margin-bottom:18px;">
      <label for="modalCopyStratFrom" class="kpi-label" style="display:block;margin-bottom:4px;" data-i18n="lbl_copy_strat">Copy Initial Strategy From</label>
      <select id="modalCopyStratFrom" class="select-clean" style="width:100%;"></select>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn" onclick={() => window.closeNewPortfolioModal()} data-i18n="btn_cancel">Cancel</button>
      <button class="btn btn-primary" onclick={() => window.createNewPortfolio()} data-i18n="btn_create_portfolio">Create Portfolio</button>
    </div>
  </div>
</div>

<!-- REUSABLE STYLED PROMPT / CONFIRM MODAL -->
<div id="appDialogModal" class="modal-backdrop hidden" style="z-index:1100;" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) window.closeAppDialog(null); }}>
  <div class="modal-card" style="max-width:420px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h3 id="appDialogTitle" class="section-title" style="margin:0;">Dialog</h3>
      <button type="button" class="btn btn-ghost" onclick={() => window.closeAppDialog(null)} style="font-size:16px;padding:2px 8px;" title="Close dialog (Esc)">✕</button>
    </div>
    <p id="appDialogMessage" class="text-muted hidden" style="margin:0 0 14px 0;font-size:13px;line-height:1.5;"></p>
    <div id="appDialogInputWrap" class="hidden" style="margin-bottom:16px;">
      <label id="appDialogInputLabel" for="appDialogInput" class="kpi-label" style="display:block;margin-bottom:4px;"></label>
      <input type="text" id="appDialogInput" class="input-clean" style="width:100%;" />
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button type="button" id="appDialogCancelBtn" class="btn" onclick={() => window.closeAppDialog(null)}>Cancel</button>
      <button type="button" id="appDialogAltBtn" class="btn hidden" onclick={() => window.closeAppDialog('alt')}>Restart</button>
      <button type="button" id="appDialogConfirmBtn" class="btn btn-primary" onclick={() => window.confirmAppDialog()}>OK</button>
    </div>
  </div>
</div>

<div id="toast"></div>

<!-- CLEAN SHUTDOWN SCREEN -->
<div id="shutdownOverlay" class="shutdown-screen hidden" role="status">
  <div class="shutdown-mark" aria-hidden="true">
    <svg width="64" height="64" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="url(#embsayShutdownGrad)" />
      <defs>
        <linearGradient id="embsayShutdownGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#dc2626" />
          <stop offset="100%" stop-color="#991b1b" />
        </linearGradient>
      </defs>
      <path d="M 19.11 4.41 A 12 12 0 0 1 24.49 24.49" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" fill="none" />
      <path d="M 22 26.39 A 12 12 0 0 1 4.41 19.11" stroke="#fca5a5" stroke-width="2.2" stroke-linecap="round" fill="none" />
      <path d="M 4 16 A 12 12 0 0 1 16 4" stroke="rgba(255,255,255,0.45)" stroke-width="2.2" stroke-linecap="round" fill="none" />
      <path d="M 16.44 26.25 L 16.22 22.07 A 0.46 0.46 0 0 1 16.75 21.6 L 20.91 22.33 L 20.35 20.78 A 0.31 0.31 0 0 1 20.45 20.43 L 25.0 16.74 L 23.97 16.26 A 0.31 0.31 0 0 1 23.81 15.88 L 24.71 13.11 L 22.09 13.67 A 0.31 0.31 0 0 1 21.73 13.49 L 21.23 12.29 L 19.18 14.49 A 0.31 0.31 0 0 1 18.64 14.21 L 19.63 9.12 L 18.05 10.04 A 0.31 0.31 0 0 1 17.61 9.9 L 16.0 6.75 L 14.39 9.9 A 0.31 0.31 0 0 1 13.95 10.04 L 12.37 9.12 L 13.36 14.21 A 0.31 0.31 0 0 1 12.82 14.49 L 10.77 12.29 L 10.27 13.49 A 0.31 0.31 0 0 1 9.91 13.67 L 7.29 13.11 L 8.19 15.88 A 0.31 0.31 0 0 1 8.03 16.26 L 7.0 16.74 L 11.55 20.43 A 0.31 0.31 0 0 1 11.65 20.78 L 11.09 22.33 L 15.25 21.6 A 0.46 0.46 0 0 1 15.78 22.07 L 15.56 26.25 Z" fill="#ffffff" />
    </svg>
  </div>
  <h1 id="shutdownTitle" data-i18n="app_stopped_title">Embsay has stopped</h1>
  <p id="shutdownDesc" data-i18n="app_stopped_desc">The local server shut down. You can close this tab.</p>
</div>
