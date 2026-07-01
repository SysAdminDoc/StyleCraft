/* StyleCraft v1.24.0 - Content Script / Editor */
(function () {
  if (window.__stylecraft_editor_loaded) return;
  window.__stylecraft_editor_loaded = true;

  const PANEL_WIDTH = 520;
  const THEME_ID = 'stylecraft-theme-styles';
  const CUSTOM_ID = 'stylecraft-custom-styles';
  const PREVIEW_ID = 'stylecraft-preview-styles';

  const SC_EDITOR_THEMES = {
    catppuccin: {bg:'#11111b',surface:'#1e1e2e',text:'#cdd6f4',subtext:'#bac2de',muted:'#585b70',faint:'#45475a',accent:'#cba6f7',blue:'#89b4fa',green:'#a6e3a1',red:'#f38ba8',pink:'#f5c2e7',yellow:'#f9e2af',aD:'rgba(203,166,247,0.08)',aM:'rgba(203,166,247,0.15)',border:'rgba(203,166,247,0.08)',inputBg:'rgba(17,17,27,0.7)',toggleBg:'rgba(69,71,90,0.6)',toggleOn:'rgba(203,166,247,0.5)',codeFg:'#f5c2e7',ddBg:'#1e1e2e',tagM:'rgba(243,180,107,0.12)',tagB:'rgba(249,226,175,0.1)',tagP:'rgba(166,227,161,0.1)',tagC:'rgba(137,180,250,0.12)'},
    dark: {bg:'#0d1117',surface:'#161b22',text:'#e6edf3',subtext:'#b1bac4',muted:'#7d8590',faint:'#484f58',accent:'#58a6ff',blue:'#58a6ff',green:'#3fb950',red:'#f85149',pink:'#db61a2',yellow:'#d29922',aD:'rgba(88,166,255,0.08)',aM:'rgba(88,166,255,0.15)',border:'rgba(88,166,255,0.08)',inputBg:'rgba(13,17,23,0.7)',toggleBg:'rgba(110,118,129,0.4)',toggleOn:'rgba(88,166,255,0.5)',codeFg:'#79c0ff',ddBg:'#161b22',tagM:'rgba(227,179,65,0.12)',tagB:'rgba(210,153,34,0.1)',tagP:'rgba(63,185,80,0.1)',tagC:'rgba(88,166,255,0.12)'},
    light: {bg:'#ffffff',surface:'#f6f8fa',text:'#1f2328',subtext:'#424a53',muted:'#656d76',faint:'#afb8c1',accent:'#8250df',blue:'#0969da',green:'#1a7f37',red:'#cf222e',pink:'#bf3989',yellow:'#9a6700',aD:'rgba(130,80,223,0.06)',aM:'rgba(130,80,223,0.12)',border:'rgba(130,80,223,0.12)',inputBg:'#ffffff',toggleBg:'rgba(175,184,193,0.5)',toggleOn:'rgba(130,80,223,0.5)',codeFg:'#953800',ddBg:'#f6f8fa',tagM:'rgba(188,76,0,0.08)',tagB:'rgba(154,103,0,0.08)',tagP:'rgba(26,127,55,0.08)',tagC:'rgba(9,105,218,0.08)'}
  };

  let currentEditorTheme = 'catppuccin';

  function applyEditorTheme(name) {
    const t = SC_EDITOR_THEMES[name] || SC_EDITOR_THEMES.catppuccin;
    currentEditorTheme = name;
    const el = shadow.querySelector('#sc-theme-vars');
    if (!el) return;
    el.textContent = `:host{--sc-bg:${t.bg};--sc-surface:${t.surface};--sc-text:${t.text};--sc-subtext:${t.subtext};--sc-muted:${t.muted};--sc-faint:${t.faint};--sc-accent:${t.accent};--sc-blue:${t.blue};--sc-green:${t.green};--sc-red:${t.red};--sc-pink:${t.pink};--sc-yellow:${t.yellow};--sc-accent-dim:${t.aD};--sc-accent-med:${t.aM};--sc-border:${t.border};--sc-input-bg:${t.inputBg};--sc-toggle-bg:${t.toggleBg};--sc-toggle-on:${t.toggleOn};--sc-code-fg:${t.codeFg};--sc-tag-margin:${t.tagM};--sc-tag-border:${t.tagB};--sc-tag-padding:${t.tagP};--sc-tag-content:${t.tagC};}` +
    `#sc-panel{background:${t.bg};color:${t.text};border-color:${t.border};}` +
    `.sc-header-row{border-bottom:1px solid ${t.border};}` +
    `.sc-logo{background:linear-gradient(135deg,${t.accent},${t.blue});-webkit-background-clip:text;-webkit-text-fill-color:transparent;}` +
    `.sc-ibtn{background:${t.aD};border-color:${t.border};color:${t.muted};}` +
    `.sc-ibtn:hover,.sc-ibtn.active{background:${t.aM};color:${t.accent};}` +
    `.sc-theme-dd{background:${t.inputBg};border-color:${t.border};color:${t.muted};}` +
    `.sc-theme-dd option{background:${t.ddBg};color:${t.text};}` +
    `.sc-tab{color:${t.muted};}.sc-tab.active,.sc-tab:hover{color:${t.accent};}` +
    `.sc-tab.active::after{background:${t.accent};}` +
    `.sc-group-header{color:${t.muted};}.sc-group-header:hover{color:${t.subtext};background:${t.aD};}` +
    `.sc-prop-label{color:${t.muted};}` +
    `.sc-prop-input,.sc-select-input{background:${t.inputBg};border-color:${t.border};color:${t.text};}` +
    `.sc-prop-input:focus,.sc-select-input:focus{border-color:${t.accent};}` +
    `#sc-code-editor{color:${t.codeFg};}` +
    `#sc-code-editor::placeholder{color:${t.faint};}` +
    `.sc-code-wrap{background:${t.inputBg};border-color:${t.border};}` +
    `#sc-domain,.sc-selector-bar input{background:${t.inputBg};border-color:${t.border};color:${t.blue};}` +
    `.sc-toggle-sl{background:${t.toggleBg};}.sc-toggle input:checked+.sc-toggle-sl{background:${t.toggleOn};}` +
    `.sc-toggle input:checked+.sc-toggle-sl::before{background:${t.accent};}` +
    `.sc-theme-item{border-color:${t.border};}.sc-theme-item:hover{background:${t.aD};}` +
    `.sc-theme-btn{border-color:${t.border};color:${t.muted};background:${t.aD};}` +
    `.sc-theme-textarea{background:${t.inputBg};border-color:${t.border};color:${t.codeFg};}` +
    `.sc-bm-margin{background:${t.tagM};}.sc-bm-border{background:${t.tagB};}.sc-bm-padding{background:${t.tagP};}.sc-bm-content{background:${t.tagC};color:${t.blue};}` +
    `.sc-bm-cell,.sc-bm-vcell{color:${t.subtext};}.sc-bm-cell:hover,.sc-bm-vcell:hover{background:${t.aM};}` +
    `.sc-bm-edit{background:${t.inputBg};border-color:${t.accent};color:${t.codeFg};}` +
    `#sc-toast{background:${t.surface};border-color:${t.border};color:${t.accent};}` +
    `.sc-prop-group{border-color:${t.border};}` +
    `.sc-quick-pick{background:${t.inputBg};border-color:${t.border};}.sc-quick-pick-label{color:${t.muted};}.sc-quick-pick-label.has-sel{color:${t.green};}`;
  }

  let state = {
    open: false, picking: false, previewing: false,
    activeTab: 'selector',
    domain: '', customCSS: '', customEnabled: true,
    themes: {}, // { id: { name, rawCSS, enabled } }
    selector: '',
    readability: false, grayscale: false, autoDark: false,
    undoStack: [], redoStack: [], basicProps: {},
    pickedElement: null, pickerAncestors: [], pickerDepth: 0, pickerMultiElements: [],
    pickerReturnFocus: null,
    pickerSpecificity: 0, pickerCandidates: [],
    hiddenElements: []
  };

  /* ─── Overlays ─── */
  const highlightOverlay = document.createElement('div');
  Object.assign(highlightOverlay.style, {position:'fixed',pointerEvents:'none',zIndex:'2147483644',background:'rgba(137,180,250,0.18)',border:'2px solid rgba(137,180,250,0.6)',borderRadius:'2px',display:'none',transition:'all 0.08s ease'});
  document.documentElement.appendChild(highlightOverlay);

  const selectorLabel = document.createElement('div');
  Object.assign(selectorLabel.style, {position:'fixed',pointerEvents:'none',zIndex:'2147483645',background:'rgba(30,30,46,0.95)',color:'#a6e3a1',padding:'2px 8px',borderRadius:'4px',fontSize:'11px',fontFamily:"'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace",maxWidth:'400px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'none',backdropFilter:'blur(8px)',border:'1px solid rgba(166,227,161,0.2)'});
  document.documentElement.appendChild(selectorLabel);

  const persistentHighlight = document.createElement('div');
  persistentHighlight.id = 'sc-persistent-highlight';
  Object.assign(persistentHighlight.style, {position:'absolute',pointerEvents:'none',zIndex:'2147483643',border:'2px dashed rgba(137,180,250,0.5)',borderRadius:'2px',display:'none',background:'rgba(137,180,250,0.04)'});
  document.documentElement.appendChild(persistentHighlight);

  const multiHighlightLayer = document.createElement('div');
  multiHighlightLayer.id = 'sc-multi-highlight-layer';
  Object.assign(multiHighlightLayer.style, {position:'absolute',left:'0',top:'0',pointerEvents:'none',zIndex:'2147483642',display:'none'});
  document.documentElement.appendChild(multiHighlightLayer);

  function showPersistentHighlight() {
    if (state.pickerMultiElements.length > 1) {
      persistentHighlight.style.display='none';
      showMultiPersistentHighlights();
      return;
    }
    hideMultiPersistentHighlights();
    const el = getCurrentDepthElement();
    if (!el) { persistentHighlight.style.display='none'; return; }
    const r = el.getBoundingClientRect();
    Object.assign(persistentHighlight.style, {display:'block',left:(r.left+window.scrollX)+'px',top:(r.top+window.scrollY)+'px',width:r.width+'px',height:r.height+'px'});
  }
  function showMultiPersistentHighlights() {
    state.pickerMultiElements = state.pickerMultiElements.filter(el => el && document.documentElement.contains(el));
    if (state.pickerMultiElements.length < 2) { hideMultiPersistentHighlights(); return; }
    multiHighlightLayer.innerHTML = '';
    for (const el of state.pickerMultiElements) {
      const r = el.getBoundingClientRect();
      const box = document.createElement('div');
      Object.assign(box.style, {
        position:'absolute',
        left:(r.left+window.scrollX)+'px',
        top:(r.top+window.scrollY)+'px',
        width:r.width+'px',
        height:r.height+'px',
        border:'2px dashed rgba(166,227,161,0.68)',
        borderRadius:'2px',
        background:'rgba(166,227,161,0.05)'
      });
      multiHighlightLayer.appendChild(box);
    }
    multiHighlightLayer.style.display = 'block';
  }
  function hideMultiPersistentHighlights() { multiHighlightLayer.style.display='none'; multiHighlightLayer.innerHTML=''; }
  function hidePersistentHighlight() { persistentHighlight.style.display='none'; hideMultiPersistentHighlights(); }
  function updatePersistentHighlight() { if(state.pickedElement || state.pickerMultiElements.length) showPersistentHighlight(); }
  window.addEventListener('scroll', updatePersistentHighlight);
  window.addEventListener('resize', updatePersistentHighlight);

  /* ─── Panel Host ─── */
  const panelHost = document.createElement('div');
  Object.assign(panelHost.style, {position:'fixed',top:'0',right:'-540px',width:PANEL_WIDTH+'px',height:'100vh',zIndex:'2147483646',transition:'right 0.3s cubic-bezier(0.4,0,0.2,1)'});
  document.documentElement.appendChild(panelHost);
  const shadow = panelHost.attachShadow({mode:'open'});

  let refs = {};

  function init() {
    shadow.innerHTML = buildPanelHTML();
    const $ = s => shadow.querySelector(s);
    const $$ = s => shadow.querySelectorAll(s);
    refs = {
      closeBtn: $('#sc-close-btn'), pickBtn: $('#sc-pick-btn'), previewBtn: $('#sc-preview-btn'),
      createBtn: $('#sc-create-btn'), undoBtn: $('#sc-undo-btn'), redoBtn: $('#sc-redo-btn'),
      resetBtn: $('#sc-reset-btn'), hideBtn: $('#sc-hide-btn'), readBtn: $('#sc-readability-btn'), grayBtn: $('#sc-grayscale-btn'), autoDarkBtn: $('#sc-autodark-btn'), ttsBtn: $('#sc-tts-btn'),
      searchBtn: $('#sc-search-btn'), settingsBtn: $('#sc-settings-btn'),
      editorTheme: $('#sc-editor-theme'),
      domainInput: $('#sc-domain'), selectorInput: $('#sc-selector-input'),
      depthSlider: $('#sc-depth-slider'), depthVal: $('#sc-depth-val'),
      specSlider: $('#sc-spec-slider'), specVal: $('#sc-spec-val'),
      matchCount: $('#sc-match-count'), filterList: $('#sc-filter-list'),
      codeEditor: $('#sc-code-editor'), customToggle: $('#sc-custom-toggle'),
      tokenList: $('#sc-token-list'), tokenContrast: $('#sc-token-contrast'),
      themeList: $('#sc-theme-list'),
      quickPickBtn: $('#sc-quick-pick-btn'), quickPickLabel: $('#sc-quick-pick-label'),
      toastEl: $('#sc-toast'), $$, $
    };
    installGeneratedAccessibilityLabels();
    wireEvents();
    wireBoxModelEditing();
    loadStyles();
  }

  async function loadStyles() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({action:'sc-get-domain-data',domain:state.domain||extractPageDomain()}, res=>{
        if(chrome.runtime.lastError||!res){resolve();return;}
        state.customCSS=res.customCSS||'';
        state.customEnabled=res.customEnabled!==false;
        state.themes=res.themes||{};
        if(!state.domain) state.domain=extractPageDomain();
        refs.domainInput.value=state.domain;
        if(refs.codeEditor) refs.codeEditor.value=state.customCSS;
        refs.customToggle.checked=state.customEnabled;
        parseCSStoBasic(state.customCSS); updateLineNumbers(); renderThemeList();
        resolve();
      });
    });
  }

  function extractPageDomain() {
    try { return new URL(location.href).hostname; } catch { return location.hostname; }
  }

  /* ═══════ EVENTS ═══════ */
  function wireEvents() {
    refs.closeBtn.addEventListener('click', closeEditor);
    refs.searchBtn.addEventListener('click', () => { chrome.runtime.sendMessage({action:'sc-open-options', tab:'browse'}); });
    refs.settingsBtn.addEventListener('click', () => { chrome.runtime.sendMessage({action:'sc-open-options', tab:'settings'}); });

    // Theme dropdown
    if (refs.editorTheme) {
      refs.editorTheme.addEventListener('change', () => {
        applyEditorTheme(refs.editorTheme.value);
        chrome.runtime.sendMessage({action:'sc-get-settings'}, s => {
          const settings = s || {};
          settings.theme = refs.editorTheme.value;
          chrome.runtime.sendMessage({action:'sc-save-settings', settings});
          chrome.runtime.sendMessage({action:'sc-theme-changed', theme: refs.editorTheme.value});
        });
      });
    }

    // Load theme from settings
    chrome.runtime.sendMessage({action:'sc-get-settings'}, s => {
      if (chrome.runtime.lastError || !s) return;
      const theme = s.theme || 'catppuccin';
      applyEditorTheme(theme);
      if (refs.editorTheme) refs.editorTheme.value = theme;
    });

    // Listen for theme changes from other UIs
    chrome.runtime.onMessage.addListener(msg => {
      if (msg.action === 'sc-theme-changed' && msg.theme) {
        applyEditorTheme(msg.theme);
        if (refs.editorTheme) refs.editorTheme.value = msg.theme;
      }
    });
    let suppressPickerTriggerClick = false;
    function onPickerTriggerClick(btn) {
      if (suppressPickerTriggerClick) {
        suppressPickerTriggerClick = false;
        return;
      }
      togglePicker(btn);
    }
    function onPickerTriggerKey(btn, e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        suppressPickerTriggerClick = true;
        togglePicker(btn);
        setTimeout(() => { suppressPickerTriggerClick = false; }, 0);
      }
    }
    refs.pickBtn.addEventListener('click', () => onPickerTriggerClick(refs.pickBtn));
    refs.quickPickBtn.addEventListener('click', () => onPickerTriggerClick(refs.quickPickBtn));
    refs.pickBtn.addEventListener('keydown', (e) => onPickerTriggerKey(refs.pickBtn, e));
    refs.quickPickBtn.addEventListener('keydown', (e) => onPickerTriggerKey(refs.quickPickBtn, e));
    refs.previewBtn.addEventListener('click', togglePreview);
    refs.createBtn.addEventListener('click', createFromSelector);
    refs.undoBtn.addEventListener('click', undo);
    refs.redoBtn.addEventListener('click', redo);
    refs.resetBtn.addEventListener('click', resetStyles);
    refs.customToggle.addEventListener('change', () => {
      state.customEnabled=refs.customToggle.checked; applyLiveCSS(); saveCustomCSS();
    });
    refs.domainInput.addEventListener('change', () => { state.domain=refs.domainInput.value.trim(); loadStyles(); });

    refs.$$('.sc-main-tab').forEach((t, index) => {
      t.addEventListener('click', () => switchTab(t.dataset.tab));
      t.addEventListener('keydown', (e) => {
        const tabs = Array.from(refs.$$('.sc-main-tab'));
        let nextIndex = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') nextIndex = 0;
        else if (e.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex !== null) {
          e.preventDefault();
          switchTab(tabs[nextIndex].dataset.tab, true);
        }
      });
    });

    refs.selectorInput.addEventListener('input', onSelectorChange);
    refs.depthSlider.addEventListener('input', () => {
      state.pickerDepth=parseInt(refs.depthSlider.value); refs.depthVal.textContent=state.pickerDepth; rebuildFromSliders();
    });
    refs.specSlider.addEventListener('input', () => {
      state.pickerSpecificity=parseInt(refs.specSlider.value); refs.specVal.textContent=state.pickerSpecificity; rebuildFromSliders();
    });

    if (refs.codeEditor) {
      refs.codeEditor.addEventListener('input', onCodeChange);
      refs.codeEditor.addEventListener('keydown', onCodeKeydown);
      refs.codeEditor.addEventListener('scroll', syncScroll);
    }

    refs.hideBtn.addEventListener('click', () => {
      if (!state.selector) { toast('Pick an element first'); return; }
      const el = getCurrentDepthElement();
      if (!el) return;
      const orig = el.style.display;
      const alreadyHidden = state.hiddenElements.find(h => h.selector === state.selector);
      if (alreadyHidden) { el.style.display = alreadyHidden.originalDisplay||''; state.hiddenElements = state.hiddenElements.filter(h=>h.selector!==state.selector); }
      else { state.hiddenElements.push({selector:state.selector, originalDisplay:orig}); el.style.display='none'; }
      updateHideBtn();
    });
    refs.readBtn.addEventListener('click', toggleReadability);
    refs.grayBtn.addEventListener('click', toggleGrayscale);
    refs.autoDarkBtn.addEventListener('click', toggleAutoDark);
    refs.ttsBtn.addEventListener('click', toggleTTS);

    // Box model visibility button
    const bmVisBtn = shadow.querySelector('#sc-bm-vis-btn');
    if (bmVisBtn) {
      bmVisBtn.addEventListener('click', () => {
        if (!state.selector) { toast('Pick an element first'); return; }
        const el = getCurrentDepthElement(); if (!el) return;
        const hidden = state.hiddenElements.find(h => h.selector === state.selector);
        if (hidden) { el.style.display = hidden.originalDisplay||''; state.hiddenElements = state.hiddenElements.filter(h=>h.selector!==state.selector); }
        else { state.hiddenElements.push({selector:state.selector, originalDisplay:el.style.display}); el.style.display='none'; }
        updateHideBtn(); updateBoxModel(el);
      });
    }

    // Visual tab
    refs.$$('.sc-prop-input').forEach(input => {
      input.addEventListener('change', () => { if(!state.selector) return; pushUndo(); state.basicProps[input.dataset.prop]=input.value; state.customCSS=basicToCSS(); refs.codeEditor.value=state.customCSS; applyLiveCSS(); saveCustomCSS(); });
    });
    refs.$$('.sc-select-input').forEach(sel => {
      sel.addEventListener('change', () => { if(!state.selector) return; pushUndo(); state.basicProps[sel.dataset.prop]=sel.value; state.customCSS=basicToCSS(); refs.codeEditor.value=state.customCSS; applyLiveCSS(); saveCustomCSS(); });
    });
    refs.$$('.sc-color-input').forEach(ci => {
      ci.addEventListener('input', () => { if(!state.selector) return; pushUndo(); state.basicProps[ci.dataset.prop]=ci.value; const ti=ci.parentElement.querySelector('.sc-prop-input[data-prop="'+ci.dataset.prop+'"]'); if(ti)ti.value=ci.value; state.customCSS=basicToCSS(); refs.codeEditor.value=state.customCSS; applyLiveCSS(); saveCustomCSS(); });
    });
    refs.$$('.sc-range-input').forEach(ri => {
      ri.addEventListener('input', () => {
        if(!state.selector) return;
        pushUndo(); const val=parseFloat(ri.value); const unit=ri.dataset.unit||''; const display=unit?val+unit:val;
        ri.nextElementSibling.textContent=display; state.basicProps[ri.dataset.prop]=String(display);
        const ti=ri.closest('.sc-group-body')?.querySelector('.sc-prop-input[data-prop="'+ri.dataset.prop+'"]'); if(ti)ti.value=display;
        state.customCSS=basicToCSS(); refs.codeEditor.value=state.customCSS; applyLiveCSS(); saveCustomCSS();
      });
    });
    if (refs.tokenList) refs.tokenList.addEventListener('click', onTokenAction);
    refs.$$('.sc-group-header').forEach(gh => {
      gh.addEventListener('click', () => gh.parentElement.classList.toggle('collapsed'));
    });
  }

  function switchTab(tab, moveFocus = false) {
    state.activeTab = tab;
    refs.$$('.sc-main-tab').forEach(t => {
      const active = t.dataset.tab === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
      t.tabIndex = active ? 0 : -1;
      if (moveFocus && active) t.focus();
    });
    refs.$$('.sc-tab-panel').forEach(p => {
      const active = p.dataset.panel === tab;
      p.style.display = active ? 'flex' : 'none';
      p.hidden = !active;
    });
    if (tab === 'code') { refs.codeEditor.value = state.customCSS; updateLineNumbers(); }
    if (tab === 'themes') renderThemeList();
    if (tab === 'presets') renderPresets();
  }

  function labelFromPropControl(control) {
    const row = control.closest('.sc-prop-row,.sc-range-row');
    const label = row ? row.querySelector('.sc-prop-label')?.textContent?.trim() : '';
    const prop = control.dataset.prop || control.id || 'control';
    return (label || prop).replace(/\s+/g, ' ') + ' ' + prop;
  }

  function installGeneratedAccessibilityLabels() {
    const labelledControls = [
      [refs.codeEditor, 'Custom CSS editor'],
      [refs.resetBtn, 'Reset custom CSS'],
      [refs.previewBtn, 'Preview custom CSS'],
      [refs.hideBtn, 'Hide selected element'],
      [refs.readBtn, 'Toggle readability mode'],
      [refs.grayBtn, 'Toggle grayscale mode'],
      [refs.autoDarkBtn, 'Toggle auto dark mode'],
      [refs.ttsBtn, 'Read page aloud'],
      [refs.createBtn, 'Create CSS rule']
    ];
    labelledControls.forEach(([el, label]) => { if (el && !el.getAttribute('aria-label')) el.setAttribute('aria-label', label); });
    [refs.previewBtn, refs.hideBtn, refs.readBtn, refs.grayBtn, refs.autoDarkBtn, refs.ttsBtn].forEach(el => { if (el && !el.hasAttribute('aria-pressed')) el.setAttribute('aria-pressed', 'false'); });
    refs.$$('.sc-prop-input,.sc-color-input,.sc-select-input,.sc-range-input,.sc-theme-textarea').forEach(control => {
      if (!control.getAttribute('aria-label')) control.setAttribute('aria-label', labelFromPropControl(control));
    });
    refs.$$('.sc-bm-cell,.sc-bm-vcell,.sc-bm-content').forEach(cell => {
      if (!cell.getAttribute('aria-label')) cell.setAttribute('aria-label', 'Box model ' + (cell.dataset.bm || 'value'));
      cell.setAttribute('tabindex', '0');
    });
    refs.$$('.sc-token-btn').forEach(btn => {
      const label = btn.dataset.action === 'copy' ? 'Copy computed token' : 'Insert computed token';
      if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', label);
    });
  }

  /* ═══════ PRESETS ENGINE ═══════ */
  function applyPresetCSS(css) {
    pushUndo();
    const sel = state.selector || 'body';
    const full = sel + ' {\n' + css + '\n}';
    state.customCSS = (state.customCSS ? state.customCSS + '\n\n' : '') + full;
    refs.codeEditor.value = state.customCSS;
    applyLiveCSS(); saveCustomCSS();
    toast('Preset applied');
  }
  function applyGlobalCSS(css) {
    pushUndo();
    state.customCSS = (state.customCSS ? state.customCSS + '\n\n' : '') + css;
    refs.codeEditor.value = state.customCSS;
    applyLiveCSS(); saveCustomCSS();
    toast('Preset applied');
  }

  function renderPresets() {
    const el = shadow.getElementById('sc-presets-content');
    if (!el) return;
    const sel = state.selector;
    const selLabel = sel ? '<code style="color:#a6e3a1;font-size:9px;background:rgba(166,227,161,0.1);padding:1px 5px;border-radius:3px;">' + escHTML(sel.length > 40 ? sel.slice(0,37)+'...' : sel) + '</code>' : '<span style="color:#f38ba8;font-size:9px;">No element selected</span>';

    el.innerHTML = '<div class="sc-preset-note">Pick an element first (Selector tab), then click a preset to apply. Global presets apply to the whole page.</div>' +
    '<div style="padding:4px 14px 2px;font-size:9px;color:#585b70;">Target: ' + selLabel + '</div>' +

    /* ── QUICK ACTIONS ── */
    '<div class="sc-preset-section"><div class="sc-preset-title"><svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>Quick Actions</div>' +
    '<div class="sc-preset-grid">' +
    pb('Hide Element','display: none !important;') +
    pb('Make Invisible','visibility: hidden;') +
    pb('Full Width','width: 100% !important; max-width: 100% !important;') +
    pb('Center Block','margin-left: auto !important; margin-right: auto !important;') +
    pb('Center Text','text-align: center !important;') +
    pb('Remove Border','border: none !important;') +
    pb('Remove Shadow','box-shadow: none !important;') +
    pb('Remove Background','background: transparent !important;') +
    pb('Remove Padding','padding: 0 !important;') +
    pb('Remove Margin','margin: 0 !important;') +
    pb('Make Rounded','border-radius: 12px !important;') +
    pb('Make Pill','border-radius: 9999px !important;') +
    pb('Make Circle','border-radius: 50% !important;') +
    pb('Force Wrap','word-wrap: break-word !important; overflow-wrap: break-word !important;') +
    '</div></div>' +

    /* ── TYPOGRAPHY ── */
    '<div class="sc-preset-section"><div class="sc-preset-title"><svg viewBox="0 0 24 24"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>Typography</div>' +
    '<div class="sc-preset-grid">' +
    pb('Bigger Text','font-size: 18px !important;') +
    pb('Smaller Text','font-size: 13px !important;') +
    pb('Bold','font-weight: 700 !important;') +
    pb('Light Weight','font-weight: 300 !important;') +
    pb('Italic','font-style: italic !important;') +
    pb('Uppercase','text-transform: uppercase !important; letter-spacing: 1px !important;') +
    pb('Lowercase','text-transform: lowercase !important;') +
    pb('Small Caps','font-variant: small-caps !important;') +
    pb('Wide Spacing','letter-spacing: 2px !important;') +
    pb('Tight Spacing','letter-spacing: -0.5px !important;') +
    pb('Relaxed Lines','line-height: 1.8 !important;') +
    pb('Tight Lines','line-height: 1.2 !important;') +
    pb('No Underline','text-decoration: none !important;') +
    pb('Underline','text-decoration: underline !important;') +
    pb('Strikethrough','text-decoration: line-through !important;') +
    pb('Text Shadow','text-shadow: 1px 1px 2px rgba(0,0,0,0.3) !important;') +
    pb('Glow Text','text-shadow: 0 0 8px currentColor !important;','pink') +
    pb('Neon Text','text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px #0ff, 0 0 40px #0ff !important;','pink') +
    pb('Gradient Text','background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; -webkit-background-clip: text !important; -webkit-text-fill-color: transparent !important;','pink') +
    pb('Monospace','font-family: Consolas, Monaco, monospace !important;') +
    pb('Serif','font-family: Georgia, "Times New Roman", serif !important;') +
    pb('System Sans','font-family: system-ui, -apple-system, sans-serif !important;') +
    '</div></div>' +

    /* ── COLORS ── */
    '<div class="sc-preset-section"><div class="sc-preset-title"><svg viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.24-.3-.39-.65-.39-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.5-9-10-9z"/></svg>Color & Background</div>' +
    '<div class="sc-preset-grid">' +
    pb('White Text','color: #ffffff !important;') +
    pb('Black Text','color: #000000 !important;') +
    pb('Red Text','color: #ef4444 !important;','red') +
    pb('Blue Text','color: #3b82f6 !important;','blue') +
    pb('Green Text','color: #22c55e !important;','green') +
    pb('Purple Text','color: #a855f7 !important;') +
    pb('Gold Text','color: #f59e0b !important;','yellow') +
    pb('Dark BG','background-color: #1a1a2e !important; color: #e0e0e0 !important;') +
    pb('Light BG','background-color: #fafafa !important; color: #1a1a1a !important;') +
    pb('Frosted Glass','background: rgba(255,255,255,0.08) !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important;','blue') +
    pb('Dark Glass','background: rgba(0,0,0,0.5) !important; backdrop-filter: blur(16px) !important; -webkit-backdrop-filter: blur(16px) !important;','blue') +
    pb('Gradient Sunset','background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;','pink') +
    pb('Gradient Ocean','background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;','blue') +
    pb('Gradient Forest','background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important;','green') +
    pb('Gradient Fire','background: linear-gradient(135deg, #f12711 0%, #f5af19 100%) !important;','red') +
    pb('Gradient Northern Lights','background: linear-gradient(135deg, #43e97b 0%, #38f9d7 30%, #fa8bff 100%) !important;','pink') +
    pb('Gradient Cyber','background: linear-gradient(135deg, #0f0c29, #302b63, #24243e) !important;') +
    pb('Mesh Gradient','background: radial-gradient(at 40% 20%, #1a1a2e 0, transparent 50%), radial-gradient(at 80% 0%, #3b0764 0, transparent 50%), radial-gradient(at 0% 50%, #172554 0, transparent 50%) !important; background-color: #0a0a1a !important;','pink') +
    '</div></div>' +

    /* ── SHADOWS & EFFECTS ── */
    '<div class="sc-preset-section"><div class="sc-preset-title"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36-5.36l-.7.7M6.34 17.66l-.7.7m12.02.7l-.7-.7M6.34 6.34l-.7-.7"/></svg>Shadows & Effects</div>' +
    '<div class="sc-preset-grid">' +
    pb('Subtle Shadow','box-shadow: 0 1px 3px rgba(0,0,0,0.12) !important;') +
    pb('Medium Shadow','box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;') +
    pb('Heavy Shadow','box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;') +
    pb('Inner Shadow','box-shadow: inset 0 2px 6px rgba(0,0,0,0.2) !important;') +
    pb('Glow Purple','box-shadow: 0 0 15px rgba(168,85,247,0.5), 0 0 30px rgba(168,85,247,0.2) !important;','pink') +
    pb('Glow Blue','box-shadow: 0 0 15px rgba(59,130,246,0.5), 0 0 30px rgba(59,130,246,0.2) !important;','blue') +
    pb('Glow Green','box-shadow: 0 0 15px rgba(34,197,94,0.5), 0 0 30px rgba(34,197,94,0.2) !important;','green') +
    pb('Glow Red','box-shadow: 0 0 15px rgba(239,68,68,0.5), 0 0 30px rgba(239,68,68,0.2) !important;','red') +
    pb('Neon Border','box-shadow: 0 0 5px #0ff, 0 0 10px #0ff, inset 0 0 5px #0ff !important; border: 1px solid #0ff !important;','pink') +
    pb('Ring Accent','box-shadow: 0 0 0 3px rgba(168,85,247,0.5) !important;') +
    pb('Blur 4px','filter: blur(4px) !important;') +
    pb('Blur 10px','filter: blur(10px) !important;') +
    pb('Grayscale','filter: grayscale(100%) !important;') +
    pb('Sepia','filter: sepia(100%) !important;','yellow') +
    pb('Invert','filter: invert(100%) !important;') +
    pb('Saturate','filter: saturate(200%) !important;') +
    pb('Desaturate','filter: saturate(50%) !important;') +
    pb('Brightness Up','filter: brightness(1.3) !important;') +
    pb('Brightness Down','filter: brightness(0.7) !important;') +
    pb('Contrast Up','filter: contrast(1.4) !important;') +
    pb('Hue Rotate 90','filter: hue-rotate(90deg) !important;') +
    pb('Hue Rotate 180','filter: hue-rotate(180deg) !important;') +
    pb('Drop Shadow','filter: drop-shadow(4px 4px 8px rgba(0,0,0,0.4)) !important;') +
    '</div></div>' +

    /* ── BORDERS ── */
    '<div class="sc-preset-section"><div class="sc-preset-title"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>Borders</div>' +
    '<div class="sc-preset-grid">' +
    pb('Thin Border','border: 1px solid rgba(128,128,128,0.3) !important;') +
    pb('Medium Border','border: 2px solid rgba(128,128,128,0.4) !important;') +
    pb('Accent Border','border: 2px solid #a855f7 !important;') +
    pb('Dashed','border: 2px dashed rgba(128,128,128,0.4) !important;') +
    pb('Dotted','border: 2px dotted rgba(128,128,128,0.4) !important;') +
    pb('Double','border: 4px double rgba(128,128,128,0.4) !important;') +
    pb('Left Accent','border-left: 3px solid #a855f7 !important;') +
    pb('Bottom Accent','border-bottom: 2px solid #a855f7 !important;') +
    pb('Gradient Border','border: 2px solid transparent !important; background-clip: padding-box !important; outline: 2px solid #a855f7 !important;','pink') +
    pb('Round 4px','border-radius: 4px !important;') +
    pb('Round 8px','border-radius: 8px !important;') +
    pb('Round 16px','border-radius: 16px !important;') +
    pb('Round 24px','border-radius: 24px !important;') +
    '</div></div>' +

    /* ── LAYOUT ── */
    '<div class="sc-preset-section"><div class="sc-preset-title"><svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>Layout & Spacing</div>' +
    '<div class="sc-preset-grid">' +
    pb('Padding SM','padding: 8px !important;') +
    pb('Padding MD','padding: 16px !important;') +
    pb('Padding LG','padding: 24px !important;') +
    pb('Padding XL','padding: 40px !important;') +
    pb('Margin SM','margin: 8px !important;') +
    pb('Margin MD','margin: 16px !important;') +
    pb('Gap 8px','gap: 8px !important;') +
    pb('Gap 16px','gap: 16px !important;') +
    pb('Flex Row','display: flex !important; flex-direction: row !important; gap: 8px !important;') +
    pb('Flex Column','display: flex !important; flex-direction: column !important; gap: 8px !important;') +
    pb('Flex Center','display: flex !important; align-items: center !important; justify-content: center !important;') +
    pb('Grid 2-Col','display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 12px !important;') +
    pb('Grid 3-Col','display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 12px !important;') +
    pb('Max Width 800','max-width: 800px !important; margin-left: auto !important; margin-right: auto !important;') +
    pb('Sticky Top','position: sticky !important; top: 0 !important; z-index: 100 !important;') +
    pb('Fixed Bottom','position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; z-index: 100 !important;') +
    '</div></div>' +

    /* ── ANIMATIONS ── */
    '<div class="sc-preset-section"><div class="sc-preset-title"><svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>Animations & Transitions</div>' +
    '<div class="sc-preset-grid">' +
    pb('Smooth Hover','transition: all 0.3s ease !important;') +
    pb('Fast Hover','transition: all 0.15s ease !important;') +
    pb('Spring','transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;','pink') +
    pb('Hover Lift','transition: all 0.2s ease !important;','blue') +
    pb('Hover Scale','transition: transform 0.2s ease !important;','blue') +
    pb('Hover Glow','transition: box-shadow 0.3s ease !important;','blue') +
    apb('Pulse','sc-pulse','2s ease-in-out infinite','0%,100%{opacity:1}50%{opacity:0.5}','pink') +
    apb('Float','sc-float','3s ease-in-out infinite','0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}','pink') +
    apb('Shake','sc-shake','0.5s ease-in-out','0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}','red') +
    apb('Spin','sc-spin','2s linear infinite','to{transform:rotate(360deg)}','pink') +
    apb('Bounce','sc-bounce','1s ease infinite','0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}','green') +
    apb('Fade In','sc-fadeIn','0.5s ease-out','from{opacity:0}to{opacity:1}','') +
    apb('Slide In Left','sc-slideInLeft','0.4s ease-out','from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}','') +
    apb('Slide In Up','sc-slideInUp','0.4s ease-out','from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}','') +
    '</div></div>' +

    /* ── CSS TRICKS ── */
    '<div class="sc-preset-section"><div class="sc-preset-title"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>CSS Tricks & Fun</div>' +
    '<div class="sc-preset-grid">' +
    pb('Glassmorphism','background: rgba(255,255,255,0.1) !important; backdrop-filter: blur(16px) saturate(180%) !important; -webkit-backdrop-filter: blur(16px) saturate(180%) !important; border: 1px solid rgba(255,255,255,0.18) !important; border-radius: 12px !important;','pink') +
    pb('Neumorphism Light','background: #e0e5ec !important; box-shadow: 8px 8px 16px #b8bec7, -8px -8px 16px #ffffff !important; border-radius: 12px !important; border: none !important;','blue') +
    pb('Neumorphism Dark','background: #2d2d3f !important; box-shadow: 8px 8px 16px #1a1a28, -8px -8px 16px #404056 !important; border-radius: 12px !important; border: none !important;') +
    pb('Claymorphism','background: rgba(168,85,247,0.25) !important; border-radius: 24px !important; box-shadow: inset 0 -4px 6px rgba(0,0,0,0.2), 0 8px 20px rgba(168,85,247,0.2) !important; border: 2px solid rgba(255,255,255,0.2) !important;','pink') +
    pb('Retro Pixel','image-rendering: pixelated !important; font-family: "Courier New", monospace !important; border: 3px solid #333 !important;','yellow') +
    pb('Outline Mode','background: transparent !important; border: 1px solid red !important; box-shadow: none !important;','red') +
    pb('Clip Circle','clip-path: circle(50%) !important;','pink') +
    pb('Clip Diamond','clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%) !important;','pink') +
    pb('Clip Hexagon','clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%) !important;','pink') +
    pb('Rainbow Border','border-image: linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00) 1 !important; border-width: 3px !important; border-style: solid !important;','pink') +
    pb('Mirror Flip','transform: scaleX(-1) !important;') +
    pb('Upside Down','transform: rotate(180deg) !important;') +
    pb('Tilt 3D','transform: perspective(800px) rotateY(-8deg) !important;','blue') +
    pb('Skew','transform: skewX(-5deg) !important;') +
    pb('Hover Tilt 3D','transform: perspective(600px) rotateX(2deg) rotateY(-2deg) !important; transition: transform 0.3s ease !important;','blue') +
    pb('Vintage','filter: sepia(60%) contrast(90%) brightness(90%) !important;','yellow') +
    pb('Film Noir','filter: grayscale(100%) contrast(130%) brightness(80%) !important;') +
    pb('Cyberpunk','filter: hue-rotate(300deg) saturate(150%) contrast(120%) !important;','pink') +
    pb('Vaporwave','filter: hue-rotate(180deg) saturate(200%) brightness(110%) !important;','pink') +
    pb('Frosted Noise','background: rgba(0,0,0,0.4) !important; backdrop-filter: blur(20px) saturate(160%) contrast(110%) !important;','blue') +
    pb('Text Stroke','color: transparent !important; -webkit-text-stroke: 1px currentColor !important;','pink') +
    gpb('Selection Color','::selection{background:#a855f7!important;color:#fff!important}::-moz-selection{background:#a855f7!important;color:#fff!important}','blue') +
    pb('Smooth Scroll','scroll-behavior: smooth !important;') +
    pb('Hide Scrollbar','scrollbar-width: none !important; -ms-overflow-style: none !important;') +
    pb('Snap Scroll','scroll-snap-type: y mandatory !important;') +
    '</div></div>' +

    /* ── GLOBAL: DARK THEMES ── */
    '<div class="sc-preset-section"><div class="sc-preset-title"><svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>Global Dark Themes (Full Page)</div>' +
    '<div class="sc-preset-grid">' +
    gpb('Midnight','html,body{background:#0d1117!important;color:#c9d1d9!important}a{color:#58a6ff!important}img{opacity:0.9!important}*{border-color:#30363d!important;scrollbar-color:#30363d #0d1117}input,textarea,select,button{background:#161b22!important;color:#c9d1d9!important;border-color:#30363d!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}table,th,td{border-color:#30363d!important;background:transparent!important;color:#c9d1d9!important}') +
    gpb('Catppuccin Mocha','html,body{background:#1e1e2e!important;color:#cdd6f4!important}a{color:#89b4fa!important}img{opacity:0.92!important}*{border-color:#313244!important;scrollbar-color:#45475a #1e1e2e}input,textarea,select,button{background:#313244!important;color:#cdd6f4!important;border-color:#45475a!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}table,th,td{border-color:#45475a!important;background:transparent!important;color:#cdd6f4!important}') +
    gpb('Dracula','html,body{background:#282a36!important;color:#f8f8f2!important}a{color:#bd93f9!important}img{opacity:0.92!important}*{border-color:#44475a!important;scrollbar-color:#44475a #282a36}input,textarea,select,button{background:#44475a!important;color:#f8f8f2!important;border-color:#6272a4!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}table,th,td{border-color:#44475a!important;background:transparent!important;color:#f8f8f2!important}') +
    gpb('Nord','html,body{background:#2e3440!important;color:#d8dee9!important}a{color:#88c0d0!important}img{opacity:0.92!important}*{border-color:#3b4252!important;scrollbar-color:#4c566a #2e3440}input,textarea,select,button{background:#3b4252!important;color:#d8dee9!important;border-color:#4c566a!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}table,th,td{border-color:#4c566a!important;background:transparent!important;color:#d8dee9!important}') +
    gpb('Gruvbox Dark','html,body{background:#282828!important;color:#ebdbb2!important}a{color:#83a598!important}img{opacity:0.92!important}*{border-color:#3c3836!important;scrollbar-color:#504945 #282828}input,textarea,select,button{background:#3c3836!important;color:#ebdbb2!important;border-color:#504945!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}table,th,td{border-color:#504945!important;background:transparent!important;color:#ebdbb2!important}') +
    gpb('Solarized Dark','html,body{background:#002b36!important;color:#839496!important}a{color:#268bd2!important}img{opacity:0.92!important}*{border-color:#073642!important;scrollbar-color:#073642 #002b36}input,textarea,select,button{background:#073642!important;color:#839496!important;border-color:#586e75!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}table,th,td{border-color:#073642!important;background:transparent!important;color:#839496!important}') +
    gpb('Tokyo Night','html,body{background:#1a1b26!important;color:#a9b1d6!important}a{color:#7aa2f7!important}img{opacity:0.92!important}*{border-color:#24283b!important;scrollbar-color:#414868 #1a1b26}input,textarea,select,button{background:#24283b!important;color:#a9b1d6!important;border-color:#414868!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}table,th,td{border-color:#414868!important;background:transparent!important;color:#a9b1d6!important}') +
    gpb('One Dark','html,body{background:#282c34!important;color:#abb2bf!important}a{color:#61afef!important}img{opacity:0.92!important}*{border-color:#3e4451!important;scrollbar-color:#4b5263 #282c34}input,textarea,select,button{background:#3e4451!important;color:#abb2bf!important;border-color:#4b5263!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}table,th,td{border-color:#3e4451!important;background:transparent!important;color:#abb2bf!important}') +
    gpb('OLED Black','html,body{background:#000000!important;color:#e0e0e0!important}a{color:#bb86fc!important}img{opacity:0.88!important}*{border-color:#1a1a1a!important;scrollbar-color:#333 #000}input,textarea,select,button{background:#121212!important;color:#e0e0e0!important;border-color:#333!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}table,th,td{border-color:#1a1a1a!important;background:transparent!important;color:#e0e0e0!important}') +
    gpb('Material Dark','html,body{background:#121212!important;color:#e0e0e0!important}a{color:#bb86fc!important}img{opacity:0.9!important}*{border-color:#2c2c2c!important;scrollbar-color:#424242 #121212}input,textarea,select,button{background:#1e1e1e!important;color:#e0e0e0!important;border-color:#424242!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}table,th,td{border-color:#2c2c2c!important;background:transparent!important;color:#e0e0e0!important}') +
    '</div></div>' +

    /* ── GLOBAL: LIGHT THEMES ── */
    '<div class="sc-preset-section"><div class="sc-preset-title"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>Global Light Themes (Full Page)</div>' +
    '<div class="sc-preset-grid">' +
    gpb('Clean White','html,body{background:#ffffff!important;color:#1f2937!important}a{color:#2563eb!important}*{border-color:#e5e7eb!important;scrollbar-color:#d1d5db #f9fafb}input,textarea,select,button{background:#f9fafb!important;color:#1f2937!important;border-color:#d1d5db!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}','green') +
    gpb('Warm Paper','html,body{background:#fdf6e3!important;color:#657b83!important}a{color:#268bd2!important}*{border-color:#eee8d5!important;scrollbar-color:#93a1a1 #fdf6e3}input,textarea,select,button{background:#eee8d5!important;color:#657b83!important;border-color:#93a1a1!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}','yellow') +
    gpb('Latte','html,body{background:#eff1f5!important;color:#4c4f69!important}a{color:#1e66f5!important}*{border-color:#dce0e8!important;scrollbar-color:#bcc0cc #eff1f5}input,textarea,select,button{background:#e6e9ef!important;color:#4c4f69!important;border-color:#bcc0cc!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}','blue') +
    gpb('Rose Pine Dawn','html,body{background:#faf4ed!important;color:#575279!important}a{color:#907aa9!important}*{border-color:#dfdad9!important;scrollbar-color:#9893a5 #faf4ed}input,textarea,select,button{background:#fffaf3!important;color:#575279!important;border-color:#dfdad9!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}','pink') +
    gpb('Gruvbox Light','html,body{background:#fbf1c7!important;color:#3c3836!important}a{color:#458588!important}*{border-color:#d5c4a1!important;scrollbar-color:#bdae93 #fbf1c7}input,textarea,select,button{background:#ebdbb2!important;color:#3c3836!important;border-color:#bdae93!important}div,section,article,main,aside,header,footer,nav{background-color:transparent!important}','yellow') +
    '</div></div>' +

    /* ── GLOBAL: UTILITY ── */
    '<div class="sc-preset-section"><div class="sc-preset-title"><svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>Global Utilities (Full Page)</div>' +
    '<div class="sc-preset-grid">' +
    gpb('Remove All Ads','[class*="ad-"],[class*="Ad"],[class*="advert"],[id*="ad-"],[id*="Ad"],ins.adsbygoogle,[data-ad],iframe[src*="doubleclick"],iframe[src*="googlesyndication"]{display:none!important}','red') +
    gpb('Remove Popups','[class*="popup"],[class*="modal"],[class*="overlay"],[class*="cookie"],[class*="consent"],[id*="popup"],[id*="modal"]{display:none!important}body{overflow:auto!important}','red') +
    gpb('Remove Sticky Headers','header,[class*="header"],[class*="navbar"],[class*="nav-bar"],[class*="topbar"],[role="banner"]{position:relative!important;top:auto!important}','red') +
    gpb('Remove Sidebars','aside,[class*="sidebar"],[role="complementary"],[class*="side-bar"]{display:none!important}main,[role="main"],[class*="content"],[class*="main"]{max-width:100%!important;width:100%!important}') +
    gpb('Remove Footers','footer,[class*="footer"],[role="contentinfo"]{display:none!important}','red') +
    gpb('Wider Content','main,[role="main"],article,.content,.post,.entry-content,.article-content{max-width:95vw!important;width:95vw!important;margin:0 auto!important}') +
    gpb('Focus Mode','header,footer,aside,nav,[class*="sidebar"],[class*="header"],[class*="footer"],[class*="nav"],[role="banner"],[role="navigation"],[role="complementary"],[role="contentinfo"],.comments,.social{display:none!important}main,[role="main"],article{max-width:750px!important;margin:0 auto!important;padding:20px!important}','blue') +
    gpb('Readable Text','*{font-size:clamp(16px,1.1em,22px)!important;line-height:1.7!important}p,li,td,span,div{max-width:75ch!important}','green') +
    gpb('Page Grayscale','html{filter:grayscale(100%)!important}') +
    gpb('Page Sepia','html{filter:sepia(40%)!important}','yellow') +
    gpb('Page Invert','html{filter:invert(1) hue-rotate(180deg)!important}img,video,picture,svg,.emoji{filter:invert(1) hue-rotate(180deg)!important}') +
    gpb('Force Dark (Invert)','html{filter:invert(0.9) hue-rotate(180deg)!important;background:#111!important}img,video,picture,canvas,svg,iframe,[style*="background-image"]{filter:invert(1) hue-rotate(180deg)!important}') +
    gpb('Force Fonts: Sans','*{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif!important}') +
    gpb('Force Fonts: Serif','*{font-family:Georgia,"Times New Roman",serif!important}') +
    gpb('Force Fonts: Mono','*{font-family:Consolas,Monaco,"Courier New",monospace!important}') +
    gpb('Disable Animations','*,*::before,*::after{animation:none!important;transition:none!important}') +
    gpb('Custom Scrollbar','*{scrollbar-width:thin!important;scrollbar-color:rgba(168,85,247,0.4) transparent!important}::-webkit-scrollbar{width:8px!important}::-webkit-scrollbar-track{background:transparent!important}::-webkit-scrollbar-thumb{background:rgba(168,85,247,0.4)!important;border-radius:4px!important}::-webkit-scrollbar-thumb:hover{background:rgba(168,85,247,0.6)!important}') +
    gpb('Night Shift','html{filter:brightness(0.85) sepia(20%)!important}','yellow') +
    gpb('High Contrast','html{filter:contrast(140%)!important}') +
    '</div></div>';

    // Wire up preset buttons
    el.querySelectorAll('.sc-preset-btn[data-css]').forEach(btn => {
      btn.addEventListener('click', () => {
        const css = btn.dataset.css;
        if (btn.dataset.global === '1') { applyGlobalCSS(css); }
        else if (state.selector) { applyPresetCSS(css); }
        else { toast('Select an element first'); }
      });
    });
    // Wire up animation preset buttons
    el.querySelectorAll('.sc-preset-btn[data-anim]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!state.selector) { toast('Select an element first'); return; }
        const name = btn.dataset.anim;
        const timing = btn.dataset.timing;
        const frames = btn.dataset.frames;
        const css = '@keyframes ' + name + '{' + frames + '}\n' + state.selector + '{animation:' + name + ' ' + timing + ' !important;}';
        applyGlobalCSS(css);
      });
    });
  }

  function pb(label, css, color) {
    const c = color ? ' ' + color : '';
    return '<button class="sc-preset-btn' + c + '" data-css="' + escHTML(css) + '">' + escHTML(label) + '</button>';
  }
  function gpb(label, css, color) {
    const c = color ? ' ' + color : '';
    return '<button class="sc-preset-btn' + c + '" data-css="' + escHTML(css) + '" data-global="1">' + escHTML(label) + '</button>';
  }
  function apb(label, name, timing, frames, color) {
    const c = color ? ' ' + color : '';
    return '<button class="sc-preset-btn' + c + '" data-anim="' + escHTML(name) + '" data-timing="' + escHTML(timing) + '" data-frames="' + escHTML(frames) + '">' + escHTML(label) + '</button>';
  }

  /* ═══════ EDITOR OPEN/CLOSE ═══════ */
  function openEditor() { state.open=true; panelHost.style.right='0'; document.documentElement.style.transition='margin-right 0.3s cubic-bezier(0.4,0,0.2,1)'; document.documentElement.style.marginRight=PANEL_WIDTH+'px'; loadStyles(); }
  function closeEditor() { state.open=false; stopPicker(); stopPreview(); hidePersistentHighlight(); panelHost.style.right='-540px'; document.documentElement.style.marginRight='0'; setTimeout(()=>{document.documentElement.style.transition='';},300); }
  function toggleEditor() { state.open ? closeEditor() : openEditor(); }

  /* ═══════ PICKER ═══════ */
  function togglePicker(trigger) { state.picking ? stopPicker() : startPicker(trigger); }
  function startPicker(trigger) {
    state.picking=true;
    state.pickerReturnFocus = trigger || shadow.activeElement || refs.pickBtn;
    refs.pickBtn.classList.add('active'); refs.quickPickBtn.classList.add('active');
    refs.pickBtn.setAttribute('aria-pressed', 'true');
    refs.quickPickBtn.setAttribute('aria-pressed', 'true');
    document.addEventListener('mousemove',onPickerMove,true); document.addEventListener('click',onPickerClick,true); document.addEventListener('keydown',onPickerKey,true); document.body.style.cursor='crosshair';
  }
  function stopPicker(restoreFocus = true) {
    state.picking=false; refs.pickBtn.classList.remove('active'); refs.quickPickBtn.classList.remove('active');
    refs.pickBtn.setAttribute('aria-pressed', 'false');
    refs.quickPickBtn.setAttribute('aria-pressed', 'false');
    document.removeEventListener('mousemove',onPickerMove,true); document.removeEventListener('click',onPickerClick,true); document.removeEventListener('keydown',onPickerKey,true); document.body.style.cursor=''; highlightOverlay.style.display='none'; selectorLabel.style.display='none';
    const focusTarget = state.pickerReturnFocus;
    state.pickerReturnFocus = null;
    if (restoreFocus && focusTarget && typeof focusTarget.focus === 'function' && focusTarget.isConnected) focusTarget.focus();
  }

  function onPickerMove(e) {
    const el=document.elementFromPoint(e.clientX,e.clientY);
    if(!el||el===panelHost||panelHost.contains(el)||el===highlightOverlay||el===selectorLabel||el===persistentHighlight) return;
    const r=el.getBoundingClientRect();
    Object.assign(highlightOverlay.style,{display:'block',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
    const sel=generateBestSelector(el); selectorLabel.textContent=(e.shiftKey||state.pickerMultiElements.length?'+ ':'')+sel;
    Object.assign(selectorLabel.style,{display:'block',left:Math.min(r.left,window.innerWidth-420)+'px',top:Math.max(0,r.top-26)+'px'});
  }
  function onPickerClick(e) {
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const el=document.elementFromPoint(e.clientX,e.clientY);
    selectPickedElement(el, e);
  }
  function selectPickedElement(el, eventLike = {}) {
    if(!el||el===panelHost||panelHost.contains(el)||el===persistentHighlight||el===highlightOverlay||el===selectorLabel||el===document.body||el===document.documentElement) return;
    if(eventLike.shiftKey||state.pickerMultiElements.length){
      const added=addMultiPickerElement(el);
      rebuildMultiSelection();
      showPersistentHighlight();
      updateHideBtn();
      populateVisualFromElement(getCurrentDepthElement());
      if (state.activeTab !== 'selector') switchTab('selector');
      if(eventLike.shiftKey){toast(added?'Added '+state.pickerMultiElements.length+' elements':'Already selected');}
      else{toast('Selected '+state.pickerMultiElements.length+' elements');stopPicker();}
      return;
    }
    selectSinglePickedElement(el);
  }
  function selectSinglePickedElement(el) {
    state.pickerMultiElements=[];
    hideMultiPersistentHighlights();
    state.pickedElement=el; state.pickerAncestors=buildAncestorChain(el);
    state.pickerDepth=0; state.pickerSpecificity=0;
    refs.depthSlider.max=Math.max(0,state.pickerAncestors.length-1); refs.depthSlider.value=0; refs.depthVal.textContent='0';
    rebuildFromSliders(); stopPicker();
    showPersistentHighlight();
    updateHideBtn();
    populateVisualFromElement(getCurrentDepthElement());
    if (state.activeTab !== 'selector') switchTab('selector');
  }
  function onPickerKey(e) {
    if(e.key==='Escape'){e.preventDefault();stopPicker();return;}
    if(e.key==='Enter'||e.key===' '){
      const el=document.activeElement;
      if(!el||el===document.body||el===document.documentElement||el===panelHost||panelHost.contains(el)) return;
      e.preventDefault();
      selectPickedElement(el,{shiftKey:e.shiftKey});
    }
  }

  function buildAncestorChain(el) { const c=[]; let cur=el; while(cur&&cur!==document.documentElement&&cur!==document){c.push(cur);cur=cur.parentElement;} return c; }

  function addMultiPickerElement(el) {
    if(!el||el===panelHost||panelHost.contains(el)) return false;
    state.pickedElement=el;
    state.pickerAncestors=buildAncestorChain(el);
    state.pickerDepth=0;
    if(state.pickerMultiElements.includes(el)) return false;
    state.pickerMultiElements.push(el);
    return true;
  }

  function rebuildMultiSelection() {
    state.pickerMultiElements = state.pickerMultiElements.filter(el => el && document.documentElement.contains(el));
    if(!state.pickerMultiElements.length) return;
    const selectors=[...new Set(state.pickerMultiElements.map(generateBestSelector).filter(Boolean))];
    const combined=selectors.join(', ');
    state.pickerCandidates=selectors.length>1?[combined,...selectors]:selectors;
    refs.depthSlider.max=0;refs.depthSlider.value=0;refs.depthVal.textContent='0';
    refs.specSlider.max=Math.max(0,state.pickerCandidates.length-1);
    if(state.pickerSpecificity>=state.pickerCandidates.length) state.pickerSpecificity=0;
    refs.specSlider.value=state.pickerSpecificity;refs.specVal.textContent=state.pickerSpecificity;
    state.selector=state.pickerCandidates[state.pickerSpecificity]||combined;
    refs.selectorInput.value=state.selector;
    showPersistentHighlight();
    updateMatchCount(); renderFilterList(); updateHideBtn();
  }

  function rebuildFromSliders() {
    if(state.pickerMultiElements.length){rebuildMultiSelection();return;}
    const el = getCurrentDepthElement();
    if(!el) return;
    state.pickerCandidates=generateAllCandidates(el);
    refs.specSlider.max=Math.max(0,state.pickerCandidates.length-1);
    if(state.pickerSpecificity>=state.pickerCandidates.length){state.pickerSpecificity=0;refs.specSlider.value=0;refs.specVal.textContent='0';}
    state.selector=state.pickerCandidates[state.pickerSpecificity]||'';
    refs.selectorInput.value=state.selector;
    showPersistentHighlight();
    updateMatchCount(); renderFilterList(); updateHideBtn();
    populateVisualFromElement(el);
  }

  function getCurrentDepthElement() { return state.pickerAncestors[state.pickerDepth]||state.pickedElement; }

  function generateBestSelector(el) {
    if(el.id) return '#'+CSS.escape(el.id);
    const attrSelector=stableAttributeSelectors(el)[0];
    if(attrSelector) return attrSelector;
    const classes=stableClassList(el);
    if(classes.length) return el.tagName.toLowerCase()+'.'+classes.map(CSS.escape).join('.');
    return generateNthChildPath(el);
  }

  function generateNthChildPath(el) {
    const parts = [];
    let node = el;
    while (node && node !== document.documentElement && node !== document.body) {
      const tag = node.tagName.toLowerCase();
      const parent = node.parentElement;
      if (!parent) break;
      const siblings = [...parent.children];
      const idx = siblings.indexOf(node) + 1;
      parts.unshift(tag + ':nth-child(' + idx + ')');
      if (parent.id) { parts.unshift('#' + CSS.escape(parent.id)); break; }
      const parentAttr = stableAttributeSelectors(parent)[0];
      if (parentAttr) { parts.unshift(parentAttr); break; }
      const parentClasses = stableClassList(parent);
      if (parentClasses.length) { parts.unshift(parent.tagName.toLowerCase() + '.' + parentClasses.map(CSS.escape).join('.')); break; }
      node = parent;
    }
    if (!parts.length) return el.tagName.toLowerCase();
    return parts.join(' > ');
  }

  const STABLE_SELECTOR_ATTRS = ['data-testid','data-test','data-qa','data-cy','data-id','data-role','aria-label','role','name','type'];

  function cssAttrValue(value) {
    return String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\a ');
  }

  function stableAttributeSelectors(el) {
    const tag=el.tagName.toLowerCase();
    const selectors=[];
    for(const attr of STABLE_SELECTOR_ATTRS){
      const value=el.getAttribute(attr);
      if(value&&value.trim()&&value.length<80) selectors.push(tag+'['+attr+'="'+cssAttrValue(value.trim())+'"]');
    }
    return selectors;
  }

  function isGeneratedClassName(cls) {
    if(!cls||cls.startsWith('sc-')||cls.length>48) return true;
    if(/^jss\d+$/i.test(cls)) return true;
    if(/^css-[a-z0-9_-]*\d[a-z0-9_-]*$/i.test(cls)) return true;
    if(/__[a-z0-9_-]*[a-f0-9]{5,}$/i.test(cls)) return true;
    if(/^[a-f0-9]{8,}$/i.test(cls)) return true;
    const digitCount=(cls.match(/\d/g)||[]).length;
    return cls.length>=10&&digitCount>=4;
  }

  function stableClassList(el) {
    return [...el.classList].filter(cl=>!isGeneratedClassName(cl));
  }

  function generateAllCandidates(el) {
    const c = new Set();
    if(el.id) c.add('#'+CSS.escape(el.id));
    const tag=el.tagName.toLowerCase();
    stableAttributeSelectors(el).forEach(sel=>c.add(sel));
    const classes=stableClassList(el);
    c.add(tag);
    classes.forEach(cl=>c.add('.'+CSS.escape(cl)));
    classes.forEach(cl=>c.add(tag+'.'+CSS.escape(cl)));
    if(classes.length>1) c.add(tag+'.'+classes.map(CSS.escape).join('.'));
    const parent=el.parentElement;
    if(parent){
      const psel=generateBestSelector(parent);
      c.add(psel+' > '+tag);
      if(classes.length) c.add(psel+' > '+tag+'.'+CSS.escape(classes[0]));
      const idx=[...parent.children].filter(ch=>ch.tagName===el.tagName).indexOf(el);
      if(idx>=0) c.add(psel+' > '+tag+':nth-of-type('+(idx+1)+')');
    }
    const nthPath = generateNthChildPath(el);
    if (nthPath && nthPath !== tag) c.add(nthPath);
    return [...c];
  }

  function onSelectorChange() { state.pickerMultiElements=[]; hideMultiPersistentHighlights(); state.selector=refs.selectorInput.value; updateMatchCount(); }
  function updateMatchCount() { try{const n=document.querySelectorAll(state.selector).length;refs.matchCount.textContent=n+' match'+(n!==1?'es':'');}catch{refs.matchCount.textContent='Invalid selector';} updateQuickPickLabel(); }
  function updateQuickPickLabel() { if(!refs.quickPickLabel) return; if(state.selector){refs.quickPickLabel.textContent=state.selector;refs.quickPickLabel.classList.add('has-sel');}else{refs.quickPickLabel.textContent='No element selected';refs.quickPickLabel.classList.remove('has-sel');} }
  function updateHideBtn() {
    const isHidden = state.hiddenElements.some(h=>h.selector===state.selector);
    refs.hideBtn.textContent = isHidden ? 'Unhide' : 'Hide';
    refs.hideBtn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
  }
  function renderFilterList() {
    refs.filterList.innerHTML='';
    state.pickerCandidates.forEach((sel,i)=>{
      const item=document.createElement('div');
      item.className='sc-filter-item'+(i===state.pickerSpecificity?' active':'');
      item.innerHTML=`<span class="sc-filter-sel">${escHTML(sel)}</span><span class="sc-filter-badge">${countMatches(sel)}</span>`;
      item.addEventListener('click',()=>{
        state.pickerSpecificity=i;refs.specSlider.value=i;refs.specVal.textContent=i;
        state.selector=sel;refs.selectorInput.value=sel;
        updateMatchCount();renderFilterList();
      });
      refs.filterList.appendChild(item);
    });
  }
  function countMatches(sel){try{return document.querySelectorAll(sel).length;}catch{return 0;}}

  /* ═══════ PREVIEW ═══════ */
  function togglePreview(){state.previewing=!state.previewing;refs.previewBtn.classList.toggle('active',state.previewing);refs.previewBtn.setAttribute('aria-pressed',state.previewing?'true':'false');if(state.previewing){applyLiveCSS();}else{removeLiveCSS();}}
  function stopPreview(){if(state.previewing){state.previewing=false;refs.previewBtn.classList.remove('active');refs.previewBtn.setAttribute('aria-pressed','false');removeLiveCSS();}}

  /* ═══════ CREATE RULE ═══════ */
  function createFromSelector(){
    if(!state.selector){toast('Pick an element first');return;}
    pushUndo();
    const rule = state.selector + ' {\n  \n}';
    state.customCSS = state.customCSS ? state.customCSS + '\n\n' + rule : rule;
    refs.codeEditor.value=state.customCSS;
    applyLiveCSS(); parseCSStoBasic(state.customCSS); saveCustomCSS(); updateLineNumbers();
    switchTab('code');
    setTimeout(()=>{
      const pos=state.customCSS.lastIndexOf(state.selector+' {\n  ');
      if(pos>=0){refs.codeEditor.selectionStart=refs.codeEditor.selectionEnd=pos+state.selector.length+5;refs.codeEditor.focus();}
    },50);
  }

  /* ═══════ VISUAL <-> CSS ═══════ */
  function populateVisualFromElement(el) {
    if(!el) { clearBoxModel(); clearDesignTokens(); return; }
    const cs = getComputedStyle(el);
    refs.$$('.sc-prop-input').forEach(input => { input.value=''; });
    refs.$$('.sc-select-input').forEach(sel => { sel.value=''; });
    refs.$$('.sc-color-input').forEach(ci => {
      const val=cs.getPropertyValue(ci.dataset.prop);
      if(val){const hex=rgbToHex(val);if(hex)ci.value=hex;}
    });
    refs.$$('.sc-range-input').forEach(ri => {
      const val=cs.getPropertyValue(ri.dataset.prop);
      if(val){const num=parseFloat(val);if(!isNaN(num)){ri.value=num;ri.nextElementSibling.textContent=ri.dataset.unit?num+ri.dataset.unit:num;}}
    });
    state.basicProps={};
    updateBoxModel(el);
    updateDesignTokens(el, cs);
  }

  function updateDesignTokens(el, cs) {
    if (!refs.tokenList) return;
    const tokens = collectDesignTokens(el, cs);
    renderDesignTokens(tokens, getContrastStatus(el, cs));
  }

  function clearDesignTokens() {
    if (refs.tokenContrast) {
      refs.tokenContrast.textContent = 'Pick an element';
      refs.tokenContrast.className = 'sc-token-contrast warn';
    }
    if (refs.tokenList) refs.tokenList.innerHTML = '<div class="sc-token-empty">Pick an element to inspect computed colors, type, and spacing.</div>';
  }

  function collectDesignTokens(el, cs) {
    const tokens = [];
    const add = (label, prop, value, opts = {}) => addDesignToken(tokens, label, prop, value, opts);
    add('Text color', 'color', cs.getPropertyValue('color'), { kind: 'color' });
    add('Background', 'background-color', effectiveBackgroundColor(el, cs), { kind: 'color' });
    add('Border color', 'border-color', dominantBorderColor(cs), { kind: 'color', skipTransparent: true });
    add('Font family', 'font-family', cs.getPropertyValue('font-family'), { kind: 'text' });
    add('Font size', 'font-size', cs.getPropertyValue('font-size'), { kind: 'length' });
    add('Font weight', 'font-weight', cs.getPropertyValue('font-weight'), { kind: 'text' });
    add('Line height', 'line-height', cs.getPropertyValue('line-height'), { kind: 'length' });
    add('Letter spacing', 'letter-spacing', cs.getPropertyValue('letter-spacing'), { kind: 'length', skip: ['normal'] });
    add('Margin', 'margin', sideShorthand(cs, 'margin'), { kind: 'length' });
    add('Padding', 'padding', sideShorthand(cs, 'padding'), { kind: 'length' });
    add('Radius', 'border-radius', radiusShorthand(cs), { kind: 'length', skipZero: true });
    add('Gap', 'gap', gapShorthand(cs), { kind: 'length', skip: ['normal'] });
    add('Display', 'display', cs.getPropertyValue('display'), { kind: 'text' });
    add('Box shadow', 'box-shadow', cs.getPropertyValue('box-shadow'), { kind: 'text', skip: ['none'] });
    return tokens.slice(0, 16);
  }

  function addDesignToken(tokens, label, prop, value, opts) {
    const normalized = normalizeTokenValue(value, opts);
    if (!normalized) return;
    tokens.push({ label, prop, value: normalized.value, swatch: normalized.swatch || '', warning: normalized.warning || '' });
  }

  function normalizeTokenValue(value, opts = {}) {
    let raw = String(value || '').trim();
    if (!raw) return null;
    if (opts.skip && opts.skip.includes(raw.toLowerCase())) return null;
    if (opts.kind === 'color') {
      const parsed = parseCssColor(raw);
      if (!parsed || (opts.skipTransparent && parsed.a === 0)) return null;
      if (parsed.a === 0) return { value: 'transparent', warning: 'No solid fill' };
      const hex = colorToHex(parsed);
      return { value: parsed.a < 1 ? formatRgba(parsed) : hex, swatch: parsed.a < 1 ? formatRgba(parsed) : hex };
    }
    raw = raw.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ');
    if (opts.skipZero && /^0(?:px|em|rem|%)?(?:\s+0(?:px|em|rem|%)?)*$/i.test(raw)) return null;
    return { value: raw };
  }

  function renderDesignTokens(tokens, contrast) {
    refs.tokenContrast.textContent = contrast.label;
    refs.tokenContrast.className = 'sc-token-contrast ' + (contrast.ok ? 'ok' : 'warn');
    if (!tokens.length) {
      refs.tokenList.innerHTML = '<div class="sc-token-empty">Pick an element to inspect computed colors, type, and spacing.</div>';
      return;
    }
    refs.tokenList.innerHTML = tokens.map(token => {
      const swatch = token.swatch ? '<span class="sc-token-swatch" style="background:' + escHTML(token.swatch) + '"></span>' : '<span class="sc-token-swatch empty"></span>';
      const warn = token.warning ? '<span class="sc-token-note">' + escHTML(token.warning) + '</span>' : '';
      return '<div class="sc-token-row" data-prop="' + escHTML(token.prop) + '">' +
        swatch +
        '<div class="sc-token-main"><span class="sc-token-name">' + escHTML(token.label) + '</span><span class="sc-token-value">' + escHTML(token.value) + '</span>' + warn + '</div>' +
        '<button type="button" class="sc-token-btn" data-action="copy" data-value="' + escHTML(token.value) + '" data-prop="' + escHTML(token.prop) + '" aria-label="Copy ' + escHTML(token.label) + '">Copy</button>' +
        '<button type="button" class="sc-token-btn primary" data-action="insert" data-value="' + escHTML(token.value) + '" data-prop="' + escHTML(token.prop) + '" aria-label="Insert ' + escHTML(token.label) + '">Insert</button>' +
      '</div>';
    }).join('');
  }

  function onTokenAction(e) {
    const btn = e.target.closest('.sc-token-btn');
    if (!btn) return;
    const value = btn.dataset.value || '';
    const prop = btn.dataset.prop || '';
    if (!value || !prop) return;
    if (btn.dataset.action === 'copy') {
      copyTokenValue(value);
      return;
    }
    insertComputedToken(prop, value);
  }

  function insertComputedToken(prop, value) {
    if (!state.selector) { toast('Pick an element first'); return; }
    pushUndo();
    state.basicProps[prop] = value;
    state.customCSS = basicToCSS();
    refs.codeEditor.value = state.customCSS;
    syncVisualControlValue(prop, value);
    applyLiveCSS();
    saveCustomCSS();
    updateLineNumbers();
    toast('Inserted ' + prop);
  }

  function syncVisualControlValue(prop, value) {
    refs.$$('.sc-prop-input,.sc-select-input').forEach(control => {
      if (control.dataset.prop === prop) control.value = value;
    });
    refs.$$('.sc-color-input').forEach(control => {
      if (control.dataset.prop === prop) {
        const hex = rgbToHex(value) || (/^#[0-9a-f]{6}$/i.test(value) ? value : null);
        if (hex) control.value = hex;
      }
    });
    refs.$$('.sc-range-input').forEach(control => {
      if (control.dataset.prop !== prop) return;
      const num = parseFloat(value);
      if (isNaN(num)) return;
      control.value = String(num);
      if (control.nextElementSibling) control.nextElementSibling.textContent = control.dataset.unit ? num + control.dataset.unit : num;
    });
  }

  function copyTokenValue(value) {
    const fallbackCopy = () => {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.documentElement.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); } catch {}
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(() => toast('Token copied'), () => { fallbackCopy(); toast('Token copied'); });
    } else {
      fallbackCopy();
      toast('Token copied');
    }
  }

  function sideShorthand(cs, base) {
    const vals = ['top','right','bottom','left'].map(side => normalizeLength(cs.getPropertyValue(base + '-' + side)));
    if (vals.every(v => v === '0px')) return '';
    if (vals[0] === vals[2] && vals[1] === vals[3]) return vals[0] === vals[1] ? vals[0] : vals[0] + ' ' + vals[1];
    return vals.join(' ');
  }

  function radiusShorthand(cs) {
    const props = ['border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius'];
    const vals = props.map(prop => normalizeLength(cs.getPropertyValue(prop)));
    if (vals.every(v => v === '0px')) return '';
    if (vals[0] === vals[2] && vals[1] === vals[3]) return vals[0] === vals[1] ? vals[0] : vals[0] + ' ' + vals[1];
    return vals.join(' ');
  }

  function gapShorthand(cs) {
    const row = normalizeLength(cs.getPropertyValue('row-gap'));
    const col = normalizeLength(cs.getPropertyValue('column-gap'));
    if (!row || row === 'normal') return '';
    return row === col ? row : row + ' ' + col;
  }

  function dominantBorderColor(cs) {
    const width = ['top','right','bottom','left'].some(side => parseFloat(cs.getPropertyValue('border-' + side + '-width')) > 0);
    return width ? cs.getPropertyValue('border-top-color') : '';
  }

  function normalizeLength(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const n = parseFloat(raw);
    if (!isNaN(n) && /px$/i.test(raw)) return Math.round(n * 100) / 100 + 'px';
    return raw.replace(/\s+/g, ' ');
  }

  function getContrastStatus(el, cs) {
    const fg = parseCssColor(cs.getPropertyValue('color'));
    const bg = parseCssColor(effectiveBackgroundColor(el, cs));
    if (!fg || !bg || fg.a === 0 || bg.a === 0) return { label: 'Contrast unavailable', ok: false };
    const ratio = contrastRatio(fg, bg);
    const label = 'Contrast ' + ratio.toFixed(1) + ':1 ' + (ratio >= 4.5 ? 'AA' : 'below AA');
    return { label, ok: ratio >= 4.5 };
  }

  function effectiveBackgroundColor(el, cs) {
    let cur = el;
    let curStyle = cs;
    while (cur && cur !== document) {
      const color = curStyle && curStyle.getPropertyValue('background-color');
      const parsed = parseCssColor(color);
      if (parsed && parsed.a > 0) return color;
      cur = cur.parentElement;
      curStyle = cur ? getComputedStyle(cur) : null;
    }
    return '#ffffff';
  }

  function parseCssColor(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw || raw === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    if (/^#[0-9a-f]{3}$/i.test(raw)) {
      const h = expandHex(raw);
      return { r: parseInt(h.slice(1,3),16), g: parseInt(h.slice(3,5),16), b: parseInt(h.slice(5,7),16), a: 1 };
    }
    if (/^#[0-9a-f]{6}$/i.test(raw)) return { r: parseInt(raw.slice(1,3),16), g: parseInt(raw.slice(3,5),16), b: parseInt(raw.slice(5,7),16), a: 1 };
    const m = raw.match(/^rgba?\((.*)\)$/);
    if (!m) return null;
    const body = m[1].replace(/\//g, ' ');
    const parts = body.includes(',') ? body.split(',').map(p => p.trim()) : body.split(/\s+/).filter(Boolean);
    if (parts.length < 3) return null;
    const toByte = p => p.endsWith('%') ? Math.round(parseFloat(p) * 2.55) : parseFloat(p);
    const alpha = parts[3] == null ? 1 : parseFloat(parts[3]);
    return {
      r: clampColor(toByte(parts[0])),
      g: clampColor(toByte(parts[1])),
      b: clampColor(toByte(parts[2])),
      a: isNaN(alpha) ? 1 : Math.max(0, Math.min(1, alpha))
    };
  }

  function clampColor(n) { return Math.max(0, Math.min(255, Math.round(isNaN(n) ? 0 : n))); }
  function colorToHex(c) { return '#' + [c.r,c.g,c.b].map(n => n.toString(16).padStart(2,'0')).join(''); }
  function formatRgba(c) { return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + Math.round(c.a * 100) / 100 + ')'; }
  function relativeLuminance(c) {
    const convert = v => {
      const n = v / 255;
      return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * convert(c.r) + 0.7152 * convert(c.g) + 0.0722 * convert(c.b);
  }
  function contrastRatio(a, b) {
    const l1 = relativeLuminance(a);
    const l2 = relativeLuminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function updateBoxModel(el, skipCell) {
    if (!el) { clearBoxModel(); return; }
    const cs = getComputedStyle(el);
    const p = v => { const n = parseFloat(cs.getPropertyValue(v)); return isNaN(n) ? '-' : Math.round(n); };
    const vals = {
      mt: p('margin-top'), mr: p('margin-right'), mb: p('margin-bottom'), ml: p('margin-left'),
      bt: p('border-top-width'), br: p('border-right-width'), bb: p('border-bottom-width'), bl: p('border-left-width'),
      pt: p('padding-top'), pr: p('padding-right'), pb: p('padding-bottom'), pl: p('padding-left'),
      w: Math.round(el.offsetWidth || parseFloat(cs.width) || 0),
      h: Math.round(el.offsetHeight || parseFloat(cs.height) || 0)
    };
    for (const [k, v] of Object.entries(vals)) {
      const cell = shadow.querySelector(`[data-bm="${k}"]`);
      if (!cell || cell === skipCell || cell.querySelector('input')) continue;
      cell.textContent = (v === 0 || v === '-') ? '-' : v;
    }
    const contentEl = shadow.querySelector('[data-bm="content"]');
    if (contentEl && !contentEl.querySelector('input')) contentEl.textContent = vals.w + ' x ' + vals.h;
    const dispEl = shadow.querySelector('[data-bm="display"]');
    if (dispEl) dispEl.textContent = cs.display || '-';
    const visEl = shadow.querySelector('[data-bm="visibility"]');
    if (visEl) visEl.textContent = cs.display === 'none' ? 'Show' : 'Hide';
  }

  function clearBoxModel() {
    shadow.querySelectorAll('[data-bm]').forEach(el => {
      if (el.dataset.bm === 'content') el.textContent = '- x -';
      else if (el.dataset.bm === 'display') el.textContent = '-';
      else if (el.dataset.bm === 'visibility') el.textContent = 'Hide';
      else el.textContent = '-';
    });
  }

  const bmPropMap = {
    mt:'margin-top',mr:'margin-right',mb:'margin-bottom',ml:'margin-left',
    bt:'border-top-width',br:'border-right-width',bb:'border-bottom-width',bl:'border-left-width',
    pt:'padding-top',pr:'padding-right',pb:'padding-bottom',pl:'padding-left'
  };

  function wireBoxModelEditing() {
    const bmWrap = shadow.querySelector('.sc-bm-wrap');
    if (!bmWrap) return;
    bmWrap.addEventListener('click', (e) => {
      const cell = e.target.closest('[data-bm]');
      if (!cell || cell.querySelector('input')) return;
      e.stopPropagation();
      const key = cell.dataset.bm;
      if (key === 'content') { editContentSize(cell); return; }
      if (!bmPropMap[key]) return;
      if (!state.selector) { toast('Pick an element first'); return; }
      openBMEdit(cell, key);
    });
  }

  function openBMEdit(cell, key) {
    const current = cell.textContent.trim();
    const num = (current === '-' || current === '') ? 0 : (parseInt(current) || 0);
    cell.textContent = '';
    const input = document.createElement('input');
    input.className = 'sc-bm-edit';
    input.type = 'number';
    input.value = num;
    input.setAttribute('step', '1');
    cell.appendChild(input);
    requestAnimationFrame(() => { input.focus(); input.select(); });
    let lastApplied = num;
    const liveApply = () => {
      const v = parseInt(input.value);
      if (isNaN(v) || v === lastApplied) return;
      lastApplied = v;
      state.basicProps[bmPropMap[key]] = v + 'px';
      state.customCSS = basicToCSS();
      refs.codeEditor.value = state.customCSS;
      applyLiveCSS();
      const el = getCurrentDepthElement();
      if (el) updateBoxModel(el, cell);
    };
    input.addEventListener('input', liveApply);
    let done = false;
    const commit = () => {
      if (done) return; done = true;
      const v = parseInt(input.value);
      if (isNaN(v) || v === 0) {
        delete state.basicProps[bmPropMap[key]];
      } else {
        state.basicProps[bmPropMap[key]] = v + 'px';
      }
      pushUndo();
      state.customCSS = basicToCSS();
      refs.codeEditor.value = state.customCSS;
      applyLiveCSS(); saveCustomCSS();
      const el = getCurrentDepthElement();
      if (el) updateBoxModel(el);
      else cell.textContent = (v || 0) === 0 ? '-' : v;
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', ev => {
      ev.stopPropagation();
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
      if (ev.key === 'Escape') { ev.preventDefault(); done = true; cell.textContent = current === '' ? '-' : current; delete state.basicProps[bmPropMap[key]]; state.customCSS = basicToCSS(); refs.codeEditor.value = state.customCSS; applyLiveCSS(); }
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        const step = ev.shiftKey ? 10 : 1;
        const cur = parseInt(input.value) || 0;
        input.value = ev.key === 'ArrowUp' ? cur + step : cur - step;
        liveApply();
      }
    });
  }

  function editContentSize(cell) {
    if (!state.selector) { toast('Pick an element first'); return; }
    const el = getCurrentDepthElement();
    const cs = el ? getComputedStyle(el) : null;
    const curW = cs ? Math.round(parseFloat(cs.width) || 0) : 0;
    const curH = cs ? Math.round(parseFloat(cs.height) || 0) : 0;
    cell.textContent = '';
    cell.style.cssText += 'display:flex;gap:2px;align-items:center;justify-content:center;';
    const wIn = document.createElement('input');
    wIn.className = 'sc-bm-edit'; wIn.style.width = '36px'; wIn.type = 'number'; wIn.value = curW; wIn.placeholder = 'W';
    const sep = document.createElement('span');
    sep.textContent = 'x'; sep.style.cssText = 'font-size:9px;color:var(--sc-muted,#585b70);';
    const hIn = document.createElement('input');
    hIn.className = 'sc-bm-edit'; hIn.style.width = '36px'; hIn.type = 'number'; hIn.value = curH; hIn.placeholder = 'H';
    cell.append(wIn, sep, hIn);
    requestAnimationFrame(() => { wIn.focus(); wIn.select(); });
    const liveApply = () => {
      const w = parseInt(wIn.value), h = parseInt(hIn.value);
      if (!isNaN(w)) state.basicProps['width'] = w + 'px';
      if (!isNaN(h)) state.basicProps['height'] = h + 'px';
      state.customCSS = basicToCSS();
      refs.codeEditor.value = state.customCSS;
      applyLiveCSS();
    };
    [wIn, hIn].forEach(inp => inp.addEventListener('input', liveApply));
    let done = false;
    const commit = () => {
      if (done) return;
      requestAnimationFrame(() => {
        if (shadow.activeElement === wIn || shadow.activeElement === hIn) return;
        done = true;
        cell.style.display = ''; cell.style.gap = ''; cell.style.alignItems = ''; cell.style.justifyContent = '';
        pushUndo(); saveCustomCSS();
        if (el) updateBoxModel(el);
        else cell.textContent = (wIn.value || curW) + ' x ' + (hIn.value || curH);
      });
    };
    wIn.addEventListener('blur', commit);
    hIn.addEventListener('blur', commit);
    [wIn, hIn].forEach(inp => inp.addEventListener('keydown', ev => {
      ev.stopPropagation();
      if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
      if (ev.key === 'Escape') { done = true; cell.style.display = ''; cell.textContent = curW + ' x ' + curH; }
      if (ev.key === 'Tab') { ev.preventDefault(); (inp === wIn ? hIn : wIn).focus(); }
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        const step = ev.shiftKey ? 10 : 1;
        const cur = parseInt(inp.value) || 0;
        inp.value = ev.key === 'ArrowUp' ? cur + step : cur - step;
        liveApply();
      }
    }));
  }

  function basicToCSS() {
    const lines = [];
    const props = Object.entries(state.basicProps).filter(([,v])=>v);
    if (props.length > 0 && state.selector) {
      lines.push(state.selector + ' {');
      props.forEach(([k,v]) => lines.push('  ' + k + ': ' + v + ';'));
      lines.push('}');
    }
    // Preserve other rules not from the visual editor
    const existing = state.customCSS;
    if (existing) {
      const stripped = existing.replace(new RegExp(escRegex(state.selector)+'\\s*\\{[^}]*\\}','g'),'').trim();
      if (stripped) lines.unshift(stripped);
    }
    return lines.join('\n');
  }

  function parseCSStoBasic(css) {
    state.basicProps={};
    if(!state.selector||!css) return;
    const re = new RegExp(escRegex(state.selector)+'\\s*\\{([^}]*)\\}');
    const m = css.match(re);
    if(!m) return;
    m[1].split(';').forEach(decl => {
      const [k,...vArr] = decl.split(':');
      if(k&&vArr.length) state.basicProps[k.trim()] = vArr.join(':').trim();
    });
  }
  function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* ═══════ UNDO/REDO ═══════ */
  function pushUndo() { state.undoStack.push(state.customCSS); if(state.undoStack.length>50)state.undoStack.shift(); state.redoStack=[]; }
  function undo() { if(!state.undoStack.length)return; state.redoStack.push(state.customCSS); state.customCSS=state.undoStack.pop(); refs.codeEditor.value=state.customCSS; applyLiveCSS(); saveCustomCSS(); parseCSStoBasic(state.customCSS); updateLineNumbers(); }
  function redo() { if(!state.redoStack.length)return; state.undoStack.push(state.customCSS); state.customCSS=state.redoStack.pop(); refs.codeEditor.value=state.customCSS; applyLiveCSS(); saveCustomCSS(); parseCSStoBasic(state.customCSS); updateLineNumbers(); }

  /* ═══════ RESET ═══════ */
  function resetStyles() { pushUndo(); state.customCSS=''; refs.codeEditor.value=''; applyLiveCSS(); saveCustomCSS(); parseCSStoBasic(''); updateLineNumbers(); toast('Custom CSS reset'); }

  /* ═══════ READABILITY / GRAYSCALE ═══════ */
  /* Enhanced Readability Mode */
  const readThemes = {
    dark: { bg: '#1a1a2e', text: '#e0e0e0', link: '#89b4fa' },
    sepia: { bg: '#f4ecd8', text: '#5b4636', link: '#8b4513' },
    light: { bg: '#ffffff', text: '#333333', link: '#1a73e8' },
    oled: { bg: '#000000', text: '#cccccc', link: '#7aa2f7' }
  };
  let readSettings = { theme: 'dark', fontSize: 18, lineHeight: 1.7, fontFamily: 'Georgia, serif', maxWidth: 720 };
  const readDomain = location.hostname;

  function loadPerSiteReadSettings() {
    if (!chrome.storage || !chrome.storage.local) return;
    try {
      chrome.storage.local.get('stylecraft_read_prefs', (result) => {
        if (chrome.runtime.lastError) return;
        const prefs = (result && result.stylecraft_read_prefs) || {};
        const sitePrefs = prefs[readDomain];
        if (sitePrefs) Object.assign(readSettings, sitePrefs);
      });
    } catch {}
  }
  loadPerSiteReadSettings();

  function savePerSiteReadSettings() {
    if (!chrome.storage || !chrome.storage.local) return;
    try {
      chrome.storage.local.get('stylecraft_read_prefs', (result) => {
        if (chrome.runtime.lastError) return;
        const prefs = (result && result.stylecraft_read_prefs) || {};
        prefs[readDomain] = Object.assign({}, readSettings);
        chrome.storage.local.set({ stylecraft_read_prefs: prefs });
      });
    } catch {}
  }

  function buildReadabilityCSS() {
    const t = readThemes[readSettings.theme] || readThemes.dark;
    const s = readSettings;
    return 'aside,nav,footer,.sidebar,.ad,.ads,.advertisement,[role="complementary"],[role="banner"],[role="navigation"],.social-share,.comments,.related-posts,iframe:not([src*="youtube"]):not([src*="vimeo"]){display:none!important}' +
      'article,main,[role="main"],.post-content,.article-content,.entry-content,body>div>div{max-width:' + s.maxWidth + 'px!important;margin:0 auto!important;font-size:' + s.fontSize + 'px!important;line-height:' + s.lineHeight + '!important;color:' + t.text + '!important;font-family:' + s.fontFamily + '!important}' +
      'a{color:' + t.link + '!important}' +
      'body{background:' + t.bg + '!important}' +
      'img,video,figure{max-width:100%!important;height:auto!important}' +
      'h1,h2,h3,h4,h5,h6{color:' + t.text + '!important;font-family:' + s.fontFamily + '!important}';
  }

  function applyReadability() {
    let el = document.getElementById('sc-readability-style');
    if (state.readability) {
      if (!el) { el = document.createElement('style'); el.id = 'sc-readability-style'; document.head.appendChild(el); }
      el.textContent = buildReadabilityCSS();
    } else if (el) el.remove();
  }

  function toggleReadability(newSettings) {
    if (newSettings) Object.assign(readSettings, newSettings);
    state.readability = !state.readability;
    refs.readBtn.classList.toggle('active', state.readability);
    refs.readBtn.setAttribute('aria-pressed', state.readability ? 'true' : 'false');
    applyReadability();
    if (state.readability) savePerSiteReadSettings();
    toast(state.readability ? 'Readability ON' : 'Readability OFF');
  }

  function updateReadSettings(newSettings) {
    Object.assign(readSettings, newSettings);
    if (state.readability) {
      applyReadability();
      savePerSiteReadSettings();
    }
  }

  function toggleGrayscale(){state.grayscale=!state.grayscale;refs.grayBtn.classList.toggle('active',state.grayscale);refs.grayBtn.setAttribute('aria-pressed',state.grayscale?'true':'false');let el=document.getElementById('sc-grayscale-style');if(state.grayscale){if(!el){el=document.createElement('style');el.id='sc-grayscale-style';document.head.appendChild(el);}el.textContent='html{filter:grayscale(100%)!important}';}else if(el)el.remove();toast(state.grayscale?'Grayscale ON':'Grayscale OFF');}

  function toggleAutoDark() {
    state.autoDark = !state.autoDark;
    refs.autoDarkBtn.classList.toggle('active', state.autoDark);
    refs.autoDarkBtn.setAttribute('aria-pressed', state.autoDark ? 'true' : 'false');
    let el = document.getElementById('sc-autodark-style');
    if (state.autoDark) {
      if (!el) { el = document.createElement('style'); el.id = 'sc-autodark-style'; document.head.appendChild(el); }
      el.textContent = 'html{filter:invert(0.9) hue-rotate(180deg)!important;background:#111!important}' +
        'img,video,canvas,svg,[style*="background-image"],picture{filter:invert(1) hue-rotate(180deg)!important}' +
        '[data-theme="dark"],[class*="dark"],[class*="Dark"]{filter:none!important}';
    } else if (el) el.remove();
    toast(state.autoDark ? 'Auto dark ON' : 'Auto dark OFF');
  }

  let ttsSpeaking = false;
  function toggleTTS() {
    if (ttsSpeaking) {
      speechSynthesis.cancel();
      ttsSpeaking = false;
      refs.ttsBtn.classList.remove('active');
      refs.ttsBtn.setAttribute('aria-pressed', 'false');
      toast('Speech stopped');
      return;
    }
    const mainContent = document.querySelector('main, article, [role="main"], .content, .post, .entry-content, .article-body');
    const source = mainContent || document.body;
    const text = source.innerText.trim().slice(0, 10000);
    if (!text) { toast('No text to read'); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => {
      ttsSpeaking = false;
      refs.ttsBtn.classList.remove('active');
      refs.ttsBtn.setAttribute('aria-pressed', 'false');
    };
    utterance.onerror = () => {
      ttsSpeaking = false;
      refs.ttsBtn.classList.remove('active');
      refs.ttsBtn.setAttribute('aria-pressed', 'false');
    };
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    ttsSpeaking = true;
    refs.ttsBtn.classList.add('active');
    refs.ttsBtn.setAttribute('aria-pressed', 'true');
    toast('Speaking...');
  }

  /* ═══════ CODE EDITOR ═══════ */
  function onCodeChange(){pushUndo();state.customCSS=refs.codeEditor.value;applyLiveCSS();parseCSStoBasic(state.customCSS);saveCustomCSS();updateLineNumbers();}
  const pairs={'(':')','[':']','{':'}','"':'"',"'":"'"};
  function onCodeKeydown(e){
    if(e.key==='Tab'){e.preventDefault();const s=refs.codeEditor.selectionStart,end=refs.codeEditor.selectionEnd;refs.codeEditor.value=refs.codeEditor.value.substring(0,s)+'  '+refs.codeEditor.value.substring(end);refs.codeEditor.selectionStart=refs.codeEditor.selectionEnd=s+2;onCodeChange();}
    if(pairs[e.key]){const s=refs.codeEditor.selectionStart,end=refs.codeEditor.selectionEnd;if(s!==end){e.preventDefault();const sel=refs.codeEditor.value.substring(s,end);refs.codeEditor.value=refs.codeEditor.value.substring(0,s)+e.key+sel+pairs[e.key]+refs.codeEditor.value.substring(end);refs.codeEditor.selectionStart=s+1;refs.codeEditor.selectionEnd=end+1;onCodeChange();}}
    if(e.key==='Enter'){const pos=refs.codeEditor.selectionStart;if(refs.codeEditor.value[pos-1]==='{'&&refs.codeEditor.value[pos]==='}'){e.preventDefault();const indent=getLineIndent(refs.codeEditor.value,pos),ins='\n'+indent+'  \n'+indent;refs.codeEditor.value=refs.codeEditor.value.substring(0,pos)+ins+refs.codeEditor.value.substring(pos);refs.codeEditor.selectionStart=refs.codeEditor.selectionEnd=pos+indent.length+3;onCodeChange();}}
  }
  function getLineIndent(text,pos){const lineStart=text.lastIndexOf('\n',pos-1)+1;const line=text.substring(lineStart,pos);const m=line.match(/^(\s*)/);return m?m[1]:'';}
  function syncScroll(){const ln=shadow.querySelector('#sc-line-numbers');if(ln&&refs.codeEditor)ln.scrollTop=refs.codeEditor.scrollTop;}
  function updateLineNumbers(){const ln=shadow.querySelector('#sc-line-numbers');if(!ln)return;const lines=(refs.codeEditor?.value||'').split('\n').length;ln.innerHTML=Array.from({length:Math.max(lines,20)},(_,i)=>'<div class="sc-ln">'+(i+1)+'</div>').join('');}

  /* ═══════ THEMES TAB ═══════ */
  function renderThemeList() {
    const list = refs.themeList;
    if (!list) return;
    const ids = Object.keys(state.themes);
    if (ids.length === 0) {
      list.innerHTML = '<div class="sc-themes-empty">No themes installed. Use the popup to browse and install themes from UserStyles.world.</div>';
      return;
    }
    list.innerHTML = '';
    ids.forEach(id => {
      const t = state.themes[id];
      const item = document.createElement('div');
      item.className = 'sc-theme-item' + (t.enabled !== false ? ' enabled' : '');
      item.innerHTML = `
        <div class="sc-theme-row">
          <span class="sc-theme-name">${escHTML(t.name||'Theme #'+id)}</span>
          <label class="sc-toggle sc-theme-toggle"><input type="checkbox" aria-label="Enable theme ${escHTML(t.name||id)}" ${t.enabled!==false?'checked':''}/><span class="sc-toggle-sl"></span></label>
        </div>
        <div class="sc-theme-actions">
          <button class="sc-theme-btn edit" aria-label="Edit theme CSS for ${escHTML(t.name||id)}">Edit CSS</button>
          <button class="sc-theme-btn uninstall" aria-label="Uninstall theme ${escHTML(t.name||id)}">Uninstall</button>
        </div>
        <div class="sc-theme-editor" style="display:none">
          <textarea class="sc-theme-textarea" spellcheck="false" aria-label="Theme CSS for ${escHTML(t.name||id)}"></textarea>
          <div class="sc-theme-editor-actions">
            <button class="sc-theme-btn save" aria-label="Save theme CSS for ${escHTML(t.name||id)}">Save</button>
            <button class="sc-theme-btn cancel" aria-label="Cancel theme CSS edit for ${escHTML(t.name||id)}">Cancel</button>
          </div>
        </div>`;
      item.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
        state.themes[id].enabled = e.target.checked;
        item.classList.toggle('enabled', e.target.checked);
        saveThemeToggle(id, e.target.checked);
        applyLiveCSS();
      });
      const editBtn = item.querySelector('.edit');
      const editorDiv = item.querySelector('.sc-theme-editor');
      const textarea = item.querySelector('.sc-theme-textarea');
      editBtn.addEventListener('click', () => {
        const showing = editorDiv.style.display !== 'none';
        editorDiv.style.display = showing ? 'none' : 'block';
        editBtn.textContent = showing ? 'Edit CSS' : 'Close';
        if (!showing) textarea.value = t.rawCSS || t.css || '';
      });
      item.querySelector('.save').addEventListener('click', () => {
        state.themes[id].rawCSS = textarea.value;
        chrome.runtime.sendMessage({action:'sc-get-domain-data', domain:state.domain}, dd => {
          if (!dd) return;
          if (dd.themes && dd.themes[id]) {
            dd.themes[id].rawCSS = textarea.value;
            chrome.runtime.sendMessage({action:'sc-save-domain-data', domain:state.domain, data:dd}, () => {
              applyLiveCSS(); toast('Theme CSS saved');
            });
          }
        });
      });
      item.querySelector('.cancel').addEventListener('click', () => {
        editorDiv.style.display = 'none';
        editBtn.textContent = 'Edit CSS';
      });
      item.querySelector('.uninstall').addEventListener('click', () => {
        chrome.runtime.sendMessage({action:'sc-uninstall-style', id, domain:state.domain}, res => {
          if (res && res.ok) {
            delete state.themes[id];
            renderThemeList(); applyLiveCSS();
            toast('Uninstalled: ' + (t.name || id));
          }
        });
      });
      list.appendChild(item);
    });
  }

  function saveThemeToggle(id, enabled) {
    chrome.runtime.sendMessage({action:'sc-get-domain-data', domain:state.domain}, dd => {
      if (chrome.runtime.lastError || !dd) return;
      if (dd.themes && dd.themes[id]) {
        dd.themes[id].enabled = enabled;
        // Save back entire domain data via custom message
        chrome.runtime.sendMessage({action:'sc-save-domain-data', domain:state.domain, data:dd});
      }
    });
  }

  /* ═══════ APPLY/SAVE ═══════ */
  function applyLiveCSS() {
    // Theme layer
    let themeEl = document.getElementById(THEME_ID);
    if (!themeEl) { themeEl = document.createElement('style'); themeEl.id = THEME_ID; document.head.appendChild(themeEl); }
    let themeCSS = '';
    for (const [id, t] of Object.entries(state.themes)) {
      if (t.enabled !== false) {
        const resolved = resolveUserCSS(t.rawCSS || t.css || '', location.href);
        if (resolved.trim()) themeCSS += (themeCSS ? '\n\n' : '') + resolved;
      }
    }
    themeEl.textContent = themeCSS;

    // Custom layer (always on top of themes)
    let customEl = document.getElementById(CUSTOM_ID);
    if (!customEl) { customEl = document.createElement('style'); customEl.id = CUSTOM_ID; document.head.appendChild(customEl); }
    customEl.textContent = state.customEnabled ? state.customCSS : '';

    // Ensure order: theme then custom
    if (themeEl.nextSibling !== customEl) {
      document.head.appendChild(themeEl);
      document.head.appendChild(customEl);
    }
  }

  function removeLiveCSS() {
    [THEME_ID, CUSTOM_ID].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
  }

  function saveCustomCSS(attempt) {
    attempt = attempt || 1;
    const domain = state.domain || extractPageDomain();
    if (!domain) return;
    chrome.runtime.sendMessage(
      {action:'sc-save-custom', domain, css:state.customCSS, enabled:state.customEnabled},
      (res) => {
        if (chrome.runtime.lastError || !res || !res.ok) {
          if (attempt < 3) setTimeout(() => saveCustomCSS(attempt + 1), 300);
        }
      }
    );
  }

  /* ─── Local @-moz-document resolver (mirrors background.js) ─── */
  function resolveUserCSS(rawCSS, pageUrl) {
    if (!rawCSS || !rawCSS.trim()) return '';
    let css = rawCSS.replace(/\/\*\s*==UserStyle==[\s\S]*?==\/UserStyle==\s*\*\//, '').trim();
    if (!/@-?moz-?document|@document/i.test(css)) return css;
    const blocks = [];
    const re = /@(?:-moz-)?document\s+((?:[^{]|\n)*?)\s*\{/gi;
    let m;
    const firstMatch = re.exec(css);
    if (firstMatch && firstMatch.index > 0) { const b = css.substring(0, firstMatch.index).trim(); if (b) blocks.push(b); }
    if (firstMatch) re.lastIndex = 0;
    while ((m = re.exec(css)) !== null) {
      const conditions = m[1], bodyStart = m.index + m[0].length;
      let depth = 1, pos = bodyStart;
      while (pos < css.length && depth > 0) { if (css[pos]==='{') depth++; else if (css[pos]==='}') depth--; pos++; }
      const body = css.substring(bodyStart, pos - 1).trim();
      if (matchDocConditions(conditions, pageUrl)) blocks.push(body);
    }
    return blocks.join('\n\n');
  }
  function matchDocConditions(conds, url) {
    const parts = conds.match(/(?:domain|url-prefix|url|regexp)\s*\(\s*(['"]?)([^)'"]*)\1\s*\)/gi);
    if (!parts || !parts.length) return true;
    let hn; try { hn = new URL(url).hostname; } catch { hn = ''; }
    for (const p of parts) {
      const cm = p.match(/(domain|url-prefix|url|regexp)\s*\(\s*['"]?([^)'"]*)/i);
      if (!cm) continue;
      const [,t,v] = cm;
      switch(t.toLowerCase()) {
        case 'domain': if (hn===v||hn.endsWith('.'+v)) return true; break;
        case 'url': if (url===v) return true; break;
        case 'url-prefix': if (url.startsWith(v)) return true; break;
        case 'regexp': try { if (new RegExp(v).test(url)) return true; } catch {} break;
      }
    }
    return false;
  }

  /* ═══════ UTIL ═══════ */
  function toast(msg){refs.toastEl.textContent=msg;refs.toastEl.classList.add('show');clearTimeout(refs.toastEl._t);refs.toastEl._t=setTimeout(()=>refs.toastEl.classList.remove('show'),1800);}
  function rgbToHex(rgb){if(!rgb||rgb==='transparent')return null;const m=rgb.match(/(\d+)/g);if(!m||m.length<3)return null;return '#'+m.slice(0,3).map(n=>parseInt(n).toString(16).padStart(2,'0')).join('');}
  function expandHex(h){return '#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];}
  function escHTML(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}

  /* ═══════ MESSAGES ═══════ */
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch(msg.action){
      case 'sc-open-editor':openEditor();break;
      case 'sc-open-editor-pick':openEditor();setTimeout(()=>startPicker(),350);break;
      case 'sc-toggle-editor':toggleEditor();break;
      case 'sc-hide-element':openEditor();startPicker();break;
      case 'sc-toggle-readability':toggleReadability(msg.readSettings);break;
      case 'sc-toggle-grayscale':toggleGrayscale();break;
      case 'sc-toggle-readability-get':toggleReadability(msg.readSettings);sendResponse({readability:state.readability,readSettings});return true;
      case 'sc-toggle-grayscale-get':toggleGrayscale();sendResponse({grayscale:state.grayscale});return true;
      case 'sc-get-toggle-state':sendResponse({readability:state.readability,grayscale:state.grayscale,readSettings});return true;
      case 'sc-update-read-settings':updateReadSettings(msg.readSettings);sendResponse({ok:true});return true;
      case 'sc-styles-updated':loadStyles().then(()=>applyLiveCSS());break;
      case 'sc-apply-preview': {
        let el = document.getElementById(PREVIEW_ID);
        if (!el) { el = document.createElement('style'); el.id = PREVIEW_ID; document.head.appendChild(el); }
        el.textContent = msg.css || '';
        break;
      }
      case 'sc-end-preview': {
        const el = document.getElementById(PREVIEW_ID);
        if (el) el.remove();
        break;
      }
    }
  });

  /* ═══════ PANEL HTML ═══════ */
  function buildPanelHTML(){return `
<style>
:host{all:initial;font-family:system-ui,-apple-system,sans-serif;}
*{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(203,166,247,0.2);border-radius:3px;}::-webkit-scrollbar-thumb:hover{background:rgba(203,166,247,0.35);}
#sc-panel{width:100%;height:100vh;overflow:hidden;background:linear-gradient(180deg,#1e1e2e 0%,#181825 100%);border-left:1px solid rgba(203,166,247,0.12);color:#cdd6f4;font-size:13px;display:flex;flex-direction:column;}

.sc-header{padding:10px 14px 8px;background:rgba(30,30,46,0.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(203,166,247,0.08);flex-shrink:0;}
.sc-header-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
.sc-logo{font-size:14px;font-weight:700;background:linear-gradient(135deg,#cba6f7,#89b4fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.sc-header-actions{display:flex;gap:5px;align-items:center;}
.sc-ibtn{width:26px;height:26px;border-radius:6px;background:rgba(203,166,247,0.06);border:1px solid rgba(203,166,247,0.08);color:#7f849c;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.sc-ibtn:hover{background:rgba(203,166,247,0.15);color:#cba6f7;}
.sc-theme-dd{height:22px;padding:0 4px;background:rgba(17,17,27,0.6);border:1px solid rgba(203,166,247,0.08);border-radius:4px;color:#585b70;font-size:9px;font-weight:600;outline:none;cursor:pointer;appearance:auto;}
.sc-theme-dd option{background:#1e1e2e;color:#cdd6f4;}
.sc-domain-row{display:flex;gap:6px;align-items:center;}
.sc-domain-input{flex:1;height:28px;padding:0 10px;background:rgba(17,17,27,0.6);border:1px solid rgba(203,166,247,0.1);border-radius:6px;color:#cdd6f4;font-size:11px;font-family:'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace;outline:none;transition:border-color 0.15s;}
.sc-domain-input:focus{border-color:rgba(203,166,247,0.35);}
.sc-toggle{position:relative;width:36px;height:18px;flex-shrink:0;}.sc-toggle input{opacity:0;width:0;height:0;}
.sc-toggle-sl{position:absolute;inset:0;cursor:pointer;background:rgba(69,71,90,0.6);border-radius:9px;transition:all 0.2s;}
.sc-toggle-sl::before{content:'';position:absolute;left:2px;top:2px;width:14px;height:14px;background:#cdd6f4;border-radius:50%;transition:transform 0.2s;}
.sc-toggle input:checked+.sc-toggle-sl{background:rgba(203,166,247,0.5);}
.sc-toggle input:checked+.sc-toggle-sl::before{transform:translateX(18px);background:#cba6f7;}

.sc-utils-row{display:flex;gap:4px;padding:6px 14px;border-bottom:1px solid rgba(203,166,247,0.06);flex-shrink:0;}
.sc-util-btn{flex:1;height:26px;border-radius:5px;background:rgba(203,166,247,0.04);border:1px solid rgba(203,166,247,0.08);color:#7f849c;cursor:pointer;font-size:9px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:3px;transition:all 0.15s;}
.sc-util-btn:hover{background:rgba(203,166,247,0.12);color:#cba6f7;}
.sc-util-btn.active{background:rgba(203,166,247,0.18);color:#cba6f7;border-color:#cba6f7;}
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,[role="tab"]:focus-visible{outline:2px solid #cba6f7;outline-offset:2px;box-shadow:0 0 0 4px rgba(203,166,247,0.18);}

.sc-main-tabs{display:flex;border-bottom:1px solid rgba(203,166,247,0.06);flex-shrink:0;}
.sc-main-tab{flex:1;padding:8px 0;text-align:center;font-size:10px;font-weight:700;cursor:pointer;color:#585b70;border:0;border-bottom:2px solid transparent;background:transparent;transition:all 0.15s;letter-spacing:0.5px;text-transform:uppercase;font-family:inherit;}
.sc-main-tab:hover{color:#bac2de;}
.sc-main-tab.active{color:#cba6f7;border-bottom-color:#cba6f7;}
.sc-quick-pick{display:flex;align-items:center;gap:8px;padding:5px 14px;background:rgba(17,17,27,0.5);border-bottom:1px solid rgba(203,166,247,0.06);flex-shrink:0;}
.sc-quick-pick-btn{width:28px;height:24px;border-radius:5px;background:rgba(166,227,161,0.08);border:1px solid rgba(166,227,161,0.15);color:#a6e3a1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;}
.sc-quick-pick-btn:hover{background:rgba(166,227,161,0.18);border-color:rgba(166,227,161,0.3);transform:translateY(-1px);box-shadow:0 2px 8px rgba(166,227,161,0.15);}
.sc-quick-pick-btn.active{background:rgba(166,227,161,0.2);border-color:#a6e3a1;color:#a6e3a1;box-shadow:0 0 10px rgba(166,227,161,0.25);animation:sc-qp-pulse 1.5s ease-in-out infinite;}
@keyframes sc-qp-pulse{0%,100%{box-shadow:0 0 10px rgba(166,227,161,0.25)}50%{box-shadow:0 0 16px rgba(166,227,161,0.4)}}
.sc-quick-pick-label{flex:1;font-size:10px;color:#585b70;font-family:'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.sc-quick-pick-label.has-sel{color:#a6e3a1;}
.sc-tab-content{flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0;}
.sc-tab-panel{flex:1;overflow-y:auto;flex-direction:column;min-height:0;}

.sc-selector-section{padding:10px 14px 8px;}
.sc-section-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#585b70;margin-bottom:6px;}
.sc-selector-input{width:100%;height:32px;padding:0 10px;background:rgba(17,17,27,0.8);border:1px solid rgba(203,166,247,0.1);border-radius:6px;color:#a6e3a1;font-size:12px;font-family:'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace;outline:none;transition:all 0.15s;margin-bottom:8px;}
.sc-selector-input:focus{border-color:rgba(166,227,161,0.4);box-shadow:0 0 0 2px rgba(166,227,161,0.06);}
.sc-selector-input::placeholder{color:rgba(127,132,156,0.4);}
.sc-slider-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.sc-slider-label{font-size:10px;color:#7f849c;width:58px;flex-shrink:0;font-weight:600;}
.sc-slider{flex:1;height:6px;-webkit-appearance:none;background:rgba(69,71,90,0.5);border-radius:3px;outline:none;cursor:pointer;}
.sc-slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#cba6f7,#89b4fa);box-shadow:0 2px 6px rgba(203,166,247,0.4);cursor:grab;border:2px solid #1e1e2e;}
.sc-slider-val{width:20px;text-align:center;font-size:11px;color:#cba6f7;font-weight:700;font-family:'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace;}
.sc-picker-actions{display:flex;gap:6px;margin:8px 0 6px;}
.sc-action-btn{height:28px;padding:0 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid rgba(203,166,247,0.12);background:rgba(203,166,247,0.06);color:#bac2de;transition:all 0.15s;display:flex;align-items:center;gap:4px;}
.sc-action-btn:hover{background:rgba(203,166,247,0.14);color:#cba6f7;}
.sc-action-btn.active{background:rgba(203,166,247,0.2);color:#cba6f7;border-color:#cba6f7;}
.sc-action-btn.primary{background:rgba(166,227,161,0.1);border-color:rgba(166,227,161,0.2);color:#a6e3a1;margin-left:auto;}
.sc-action-btn.primary:hover{background:rgba(166,227,161,0.2);}
.sc-match-count{font-size:10px;color:#585b70;font-weight:600;margin-bottom:4px;}
.sc-filter-section{padding:0 14px 8px;}
.sc-filter-list{max-height:999px;overflow-y:auto;border:1px solid rgba(203,166,247,0.06);border-radius:6px;background:rgba(17,17,27,0.5);}
.sc-filter-item{padding:5px 10px;font-size:11px;cursor:pointer;font-family:'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace;display:flex;justify-content:space-between;align-items:center;transition:background 0.1s;color:#89b4fa;border-bottom:1px solid rgba(203,166,247,0.03);}
.sc-filter-item:last-child{border-bottom:none;}
.sc-filter-item:hover{background:rgba(203,166,247,0.08);}
.sc-filter-item.active{background:rgba(203,166,247,0.12);color:#cba6f7;}
.sc-filter-sel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;margin-right:8px;}
.sc-filter-badge{font-size:9px;padding:1px 6px;background:rgba(203,166,247,0.1);border-radius:4px;color:#7f849c;font-weight:700;flex-shrink:0;}

.sc-prop-group{border-bottom:1px solid rgba(203,166,247,0.04);}
.sc-prop-group.collapsed .sc-group-body{display:none;}
.sc-prop-group.collapsed .sc-group-chevron{transform:rotate(-90deg);}
.sc-group-header{padding:9px 14px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background 0.1s;}
.sc-group-header:hover{background:rgba(203,166,247,0.04);}
.sc-group-icon{color:#cba6f7;flex-shrink:0;}
.sc-group-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#cba6f7;flex:1;}
.sc-group-chevron{color:#585b70;transition:transform 0.2s;flex-shrink:0;}
.sc-group-body{padding:0 14px 8px;}
.sc-prop-row{display:flex;align-items:center;gap:6px;margin-bottom:5px;}
.sc-prop-label{width:75px;font-size:10px;color:#7f849c;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;}
.sc-prop-input,.sc-select-input{flex:1;height:26px;padding:0 8px;background:rgba(17,17,27,0.5);border:1px solid rgba(203,166,247,0.08);border-radius:5px;color:#cdd6f4;font-size:11px;outline:none;transition:border-color 0.15s;}
.sc-prop-input:focus,.sc-select-input:focus{border-color:rgba(203,166,247,0.3);}
.sc-select-input{appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%237f849c' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center;padding-right:20px;}
.sc-select-input option{background:#1e1e2e;color:#cdd6f4;}
.sc-color-input{width:26px;height:26px;padding:2px;background:rgba(17,17,27,0.5);border:1px solid rgba(203,166,247,0.1);border-radius:5px;cursor:pointer;flex-shrink:0;-webkit-appearance:none;}
.sc-color-input::-webkit-color-swatch-wrapper{padding:2px;}.sc-color-input::-webkit-color-swatch{border-radius:3px;border:none;}
.sc-range-row{display:flex;align-items:center;gap:6px;margin-bottom:5px;}
.sc-range-input{flex:1;height:4px;-webkit-appearance:none;background:rgba(69,71,90,0.4);border-radius:2px;outline:none;cursor:pointer;}
.sc-range-input::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:#cba6f7;border:2px solid #1e1e2e;cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,0.3);}
.sc-range-val{width:38px;font-size:10px;color:#a6adc8;text-align:right;font-family:'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace;flex-shrink:0;}
.sc-sub-label{font-size:9px;font-weight:600;color:#585b70;text-transform:uppercase;letter-spacing:0.8px;margin:6px 0 5px;padding-top:5px;border-top:1px solid rgba(203,166,247,0.03);}

.sc-code-header{display:flex;align-items:center;justify-content:space-between;padding:8px 14px 4px;flex-shrink:0;}
.sc-code-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#585b70;}
.sc-custom-row{display:flex;align-items:center;gap:6px;}
.sc-custom-label{font-size:9px;color:#7f849c;font-weight:600;}
.sc-code-wrap{flex:1;display:flex;position:relative;background:rgba(17,17,27,0.7);min-height:0;}
#sc-line-numbers{width:36px;padding:10px 4px;text-align:right;font-family:'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace;font-size:11px;color:rgba(127,132,156,0.3);overflow:hidden;user-select:none;flex-shrink:0;line-height:1.5;}
.sc-ln{height:16.5px;}
#sc-code-editor{flex:1;padding:10px 12px;background:transparent;border:none;color:#f5c2e7;font-family:'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace;font-size:12px;line-height:1.5;resize:none;outline:none;tab-size:2;white-space:pre;overflow:auto;}
#sc-code-editor::placeholder{color:rgba(127,132,156,0.3);}

/* Themes tab */
.sc-themes-empty{text-align:center;padding:30px 14px;color:#585b70;font-size:12px;line-height:1.5;}
.sc-theme-item{padding:10px 14px;border-bottom:1px solid rgba(203,166,247,0.04);}
.sc-theme-item:hover{background:rgba(203,166,247,0.02);}
.sc-theme-item:not(.enabled){opacity:0.5;}
.sc-theme-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
.sc-theme-name{font-size:12px;font-weight:600;color:#cdd6f4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;margin-right:8px;}
.sc-theme-toggle{transform:scale(0.85);}
.sc-theme-actions{display:flex;gap:6px;}
.sc-theme-btn{height:24px;padding:0 10px;border-radius:5px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid;transition:all 0.15s;}
.sc-theme-btn.uninstall{background:rgba(243,139,168,0.06);border-color:rgba(243,139,168,0.15);color:#f38ba8;}
.sc-theme-btn.uninstall:hover{background:rgba(243,139,168,0.15);}
.sc-theme-btn.edit{background:rgba(137,180,250,0.06);border-color:rgba(137,180,250,0.15);color:#89b4fa;}
.sc-theme-btn.edit:hover{background:rgba(137,180,250,0.15);}
.sc-theme-btn.save{background:rgba(166,227,161,0.06);border-color:rgba(166,227,161,0.15);color:#a6e3a1;}
.sc-theme-btn.save:hover{background:rgba(166,227,161,0.15);}
.sc-theme-btn.cancel{background:rgba(127,132,156,0.06);border-color:rgba(127,132,156,0.15);color:#7f849c;}
.sc-theme-editor{margin-top:8px;}
.sc-theme-textarea{width:100%;height:200px;padding:8px 10px;background:rgba(17,17,27,0.7);border:1px solid rgba(203,166,247,0.1);border-radius:6px;color:#f5c2e7;font-family:'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace;font-size:11px;line-height:1.5;resize:vertical;outline:none;tab-size:2;white-space:pre;}
.sc-theme-textarea:focus{border-color:rgba(203,166,247,0.3);}
.sc-theme-editor-actions{display:flex;gap:6px;margin-top:6px;justify-content:flex-end;}

/* Box Model Visualizer */
.sc-boxmodel{padding:12px 14px;border-bottom:1px solid rgba(203,166,247,0.06);flex-shrink:0;}
.sc-boxmodel-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#585b70;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;}
.sc-bm-display{font-size:9px;color:#89b4fa;font-family:'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace;font-weight:600;}
.sc-bm-wrap{position:relative;width:100%;font-size:10px;font-family:'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace;text-align:center;}
.sc-bm-margin{background:rgba(243,180,107,0.12);border:1px dashed rgba(243,180,107,0.3);border-radius:6px;padding:4px;position:relative;}
.sc-bm-border{background:rgba(249,226,175,0.1);border:1px solid rgba(249,226,175,0.25);border-radius:4px;padding:4px;}
.sc-bm-padding{background:rgba(166,227,161,0.1);border:1px solid rgba(166,227,161,0.2);border-radius:3px;padding:4px;}
.sc-bm-content{background:rgba(137,180,250,0.12);border:1px solid rgba(137,180,250,0.25);border-radius:2px;padding:6px 4px;color:#89b4fa;font-weight:600;}
.sc-bm-tag{position:absolute;top:2px;left:6px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;opacity:0.5;}
.sc-bm-margin .sc-bm-tag{color:#f9b46b;}
.sc-bm-border .sc-bm-tag{color:#f9e2af;}
.sc-bm-padding .sc-bm-tag{color:#a6e3a1;}
.sc-bm-row{display:flex;align-items:center;justify-content:space-between;}
.sc-bm-cell{min-width:28px;padding:3px 4px;color:#bac2de;cursor:text;text-align:center;border-radius:3px;transition:all 0.12s;border:1px solid transparent;font-size:10px;line-height:1;}
.sc-bm-cell:hover{background:rgba(203,166,247,0.15);border-color:rgba(203,166,247,0.25);color:#f5c2e7;}
.sc-bm-center{flex:1;}
.sc-bm-vcell{text-align:center;padding:3px 4px;color:#bac2de;cursor:text;border-radius:3px;transition:all 0.12s;border:1px solid transparent;font-size:10px;line-height:1;}
.sc-bm-vcell:hover{background:rgba(203,166,247,0.15);border-color:rgba(203,166,247,0.25);color:#f5c2e7;}
.sc-bm-edit{width:40px;height:20px;padding:0 3px;background:rgba(17,17,27,0.9);border:1px solid rgba(203,166,247,0.4);border-radius:3px;color:#f5c2e7;font-family:'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace;font-size:10px;text-align:center;outline:none;-moz-appearance:textfield;}
.sc-bm-edit::-webkit-inner-spin-button,.sc-bm-edit::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
.sc-bm-edit:focus{border-color:#cba6f7;box-shadow:0 0 0 2px rgba(203,166,247,0.15);}
.sc-bm-vis-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
.sc-bm-vis-btn{height:22px;padding:0 10px;border-radius:4px;background:rgba(203,166,247,0.06);border:1px solid rgba(203,166,247,0.1);color:#7f849c;font-size:9px;font-weight:600;cursor:pointer;transition:all 0.15s;}
.sc-bm-vis-btn:hover{background:rgba(203,166,247,0.14);color:#cba6f7;}
.sc-token-panel{padding:10px 14px;border-bottom:1px solid rgba(203,166,247,0.06);flex-shrink:0;}
.sc-token-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}
.sc-token-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#585b70;}
.sc-token-contrast{font-size:9px;font-weight:700;border-radius:999px;padding:3px 7px;white-space:nowrap;background:rgba(249,226,175,0.08);border:1px solid rgba(249,226,175,0.14);color:#f9e2af;}
.sc-token-contrast.ok{background:rgba(166,227,161,0.08);border-color:rgba(166,227,161,0.16);color:#a6e3a1;}
.sc-token-contrast.warn{background:rgba(249,226,175,0.08);border-color:rgba(249,226,175,0.16);color:#f9e2af;}
.sc-token-list{display:flex;flex-direction:column;gap:5px;}
.sc-token-row{display:grid;grid-template-columns:18px minmax(0,1fr) 48px 52px;align-items:center;gap:6px;padding:6px;border:1px solid rgba(203,166,247,0.07);border-radius:6px;background:rgba(17,17,27,0.36);}
.sc-token-swatch{width:18px;height:18px;border-radius:4px;border:1px solid rgba(203,166,247,0.16);box-shadow:inset 0 0 0 1px rgba(17,17,27,0.35);}
.sc-token-swatch.empty{background:linear-gradient(135deg,rgba(69,71,90,0.35),rgba(17,17,27,0.18));}
.sc-token-main{min-width:0;display:flex;flex-direction:column;gap:2px;}
.sc-token-name{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#7f849c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sc-token-value{font-family:'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace;font-size:10px;line-height:1.25;color:#cdd6f4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sc-token-note{font-size:9px;color:#f9e2af;}
.sc-token-btn{height:24px;border-radius:5px;border:1px solid rgba(203,166,247,0.1);background:rgba(203,166,247,0.05);color:#bac2de;font-size:9px;font-weight:700;cursor:pointer;transition:all 0.15s;}
.sc-token-btn:hover{background:rgba(203,166,247,0.14);color:#cba6f7;}
.sc-token-btn.primary{border-color:rgba(166,227,161,0.13);background:rgba(166,227,161,0.06);color:#a6e3a1;}
.sc-token-btn.primary:hover{background:rgba(166,227,161,0.14);}
.sc-token-empty{padding:8px;border:1px dashed rgba(203,166,247,0.12);border-radius:6px;color:#7f849c;font-size:11px;line-height:1.35;}

/* Presets tab */
.sc-preset-section{padding:0 14px 8px;}
.sc-preset-title{font-size:10px;font-weight:700;color:#cba6f7;padding:10px 0 6px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid rgba(203,166,247,0.06);margin-bottom:6px;display:flex;align-items:center;gap:6px;}
.sc-preset-title svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;}
.sc-preset-grid{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;}
.sc-preset-btn{padding:5px 9px;border-radius:5px;background:rgba(203,166,247,0.06);border:1px solid rgba(203,166,247,0.08);color:#bac2de;font-size:10px;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap;line-height:1.2;}
.sc-preset-btn:hover{background:rgba(203,166,247,0.16);color:#cba6f7;border-color:rgba(203,166,247,0.2);transform:translateY(-1px);box-shadow:0 2px 6px rgba(0,0,0,0.2);}
.sc-preset-btn.green{background:rgba(166,227,161,0.06);border-color:rgba(166,227,161,0.1);color:#a6e3a1;}
.sc-preset-btn.green:hover{background:rgba(166,227,161,0.16);border-color:rgba(166,227,161,0.25);}
.sc-preset-btn.blue{background:rgba(137,180,250,0.06);border-color:rgba(137,180,250,0.1);color:#89b4fa;}
.sc-preset-btn.blue:hover{background:rgba(137,180,250,0.16);border-color:rgba(137,180,250,0.25);}
.sc-preset-btn.pink{background:rgba(245,194,231,0.06);border-color:rgba(245,194,231,0.1);color:#f5c2e7;}
.sc-preset-btn.pink:hover{background:rgba(245,194,231,0.16);border-color:rgba(245,194,231,0.25);}
.sc-preset-btn.yellow{background:rgba(249,226,175,0.06);border-color:rgba(249,226,175,0.1);color:#f9e2af;}
.sc-preset-btn.yellow:hover{background:rgba(249,226,175,0.16);border-color:rgba(249,226,175,0.25);}
.sc-preset-btn.red{background:rgba(243,139,168,0.06);border-color:rgba(243,139,168,0.1);color:#f38ba8;}
.sc-preset-btn.red:hover{background:rgba(243,139,168,0.16);border-color:rgba(243,139,168,0.25);}
.sc-preset-note{font-size:9px;color:#585b70;padding:8px 14px 4px;font-style:italic;}
.sc-font-select{max-width:200px;}
.sc-font-select optgroup{font-weight:700;color:#cba6f7;background:#1e1e2e;}
.sc-font-select option{font-weight:400;color:#cdd6f4;padding:2px 4px;}

.sc-footer{padding:6px 14px;border-top:1px solid rgba(203,166,247,0.06);display:flex;gap:6px;background:rgba(30,30,46,0.5);flex-shrink:0;}
.sc-footer-btn{flex:1;height:28px;border-radius:6px;background:rgba(243,139,168,0.06);border:1px solid rgba(243,139,168,0.12);color:#f38ba8;cursor:pointer;font-size:11px;font-weight:600;transition:all 0.15s;}
.sc-footer-btn:hover{background:rgba(243,139,168,0.14);}

#sc-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(60px);background:rgba(30,30,46,0.95);backdrop-filter:blur(12px);border:1px solid rgba(203,166,247,0.2);color:#cba6f7;padding:7px 16px;border-radius:8px;font-size:11px;font-weight:600;pointer-events:none;opacity:0;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);box-shadow:0 8px 24px rgba(0,0,0,0.3);z-index:100;}
#sc-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
</style>
<style id="sc-theme-vars"></style>

<div id="sc-panel">
<div class="sc-header">
<div class="sc-header-row"><div class="sc-logo">StyleCraft</div><div class="sc-header-actions">
<button id="sc-undo-btn" class="sc-ibtn" title="Undo"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg></button>
<button id="sc-redo-btn" class="sc-ibtn" title="Redo"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"/></svg></button>
<button id="sc-search-btn" class="sc-ibtn" title="Browse Themes" aria-label="Browse themes"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
<select id="sc-editor-theme" class="sc-theme-dd" title="Theme" aria-label="Editor theme"><option value="catppuccin">Catppuccin</option><option value="dark">Dark</option><option value="light">Light</option></select>
<button id="sc-settings-btn" class="sc-ibtn" title="Settings" aria-label="Open settings"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button>
<button id="sc-close-btn" class="sc-ibtn" title="Close" aria-label="Close visual editor"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
</div></div>
<div class="sc-domain-row"><input id="sc-domain" class="sc-domain-input" type="text" spellcheck="false" aria-label="Style domain"/></div>
</div>

<div class="sc-utils-row">
<button id="sc-hide-btn" class="sc-util-btn"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>Hide</button>
<button id="sc-readability-btn" class="sc-util-btn"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>Read</button>
<button id="sc-grayscale-btn" class="sc-util-btn"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10"/></svg>Gray</button>
<button id="sc-autodark-btn" class="sc-util-btn"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>Dark</button>
<button id="sc-tts-btn" class="sc-util-btn"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>Speak</button>
</div>

<div class="sc-main-tabs" role="tablist" aria-label="Editor sections">
<button type="button" class="sc-main-tab active" id="sc-tab-selector" data-tab="selector" role="tab" aria-selected="true" aria-controls="sc-panel-selector" tabindex="0">Selector</button>
<button type="button" class="sc-main-tab" id="sc-tab-visual" data-tab="visual" role="tab" aria-selected="false" aria-controls="sc-panel-visual" tabindex="-1">Visual</button>
<button type="button" class="sc-main-tab" id="sc-tab-presets" data-tab="presets" role="tab" aria-selected="false" aria-controls="sc-panel-presets" tabindex="-1">Presets</button>
<button type="button" class="sc-main-tab" id="sc-tab-code" data-tab="code" role="tab" aria-selected="false" aria-controls="sc-panel-code" tabindex="-1">Code</button>
<button type="button" class="sc-main-tab" id="sc-tab-themes" data-tab="themes" role="tab" aria-selected="false" aria-controls="sc-panel-themes" tabindex="-1">Themes</button>
</div>

<div id="sc-quick-pick" class="sc-quick-pick">
<button id="sc-quick-pick-btn" class="sc-quick-pick-btn" title="Pick an element" aria-label="Pick an element" aria-pressed="false"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg></button>
<span id="sc-quick-pick-label" class="sc-quick-pick-label">No element selected</span>
</div>

<div class="sc-tab-content">

<!-- SELECTOR TAB -->
<div class="sc-tab-panel" id="sc-panel-selector" data-panel="selector" role="tabpanel" aria-labelledby="sc-tab-selector" style="display:flex">
<div class="sc-selector-section">
<div class="sc-section-label">Element Selector</div>
<input id="sc-selector-input" class="sc-selector-input" type="text" placeholder="Pick an element or type a selector..." spellcheck="false" aria-label="CSS selector"/>
<div class="sc-slider-row"><span class="sc-slider-label">Depth</span><input id="sc-depth-slider" class="sc-slider" type="range" min="0" max="0" value="0" aria-label="Selector depth"/><span id="sc-depth-val" class="sc-slider-val">0</span></div>
<div class="sc-slider-row"><span class="sc-slider-label">Specificity</span><input id="sc-spec-slider" class="sc-slider" type="range" min="0" max="0" value="0" aria-label="Selector specificity"/><span id="sc-spec-val" class="sc-slider-val">0</span></div>
<div class="sc-picker-actions">
<button id="sc-pick-btn" class="sc-action-btn" aria-pressed="false"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>Pick</button>
<button id="sc-preview-btn" class="sc-action-btn" aria-pressed="false"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Preview</button>
<button id="sc-create-btn" class="sc-action-btn primary">Create</button>
</div>
<div id="sc-match-count" class="sc-match-count">0 matches</div>
</div>
<div class="sc-filter-section"><div class="sc-section-label">Cosmetic Filters</div><div id="sc-filter-list" class="sc-filter-list"></div></div>
</div>

<!-- VISUAL TAB -->
<div class="sc-tab-panel" id="sc-panel-visual" data-panel="visual" role="tabpanel" aria-labelledby="sc-tab-visual" style="display:none" hidden>

<!-- Box Model Visualizer -->
<div class="sc-boxmodel">
<div class="sc-boxmodel-label"><span>Layout</span><span class="sc-bm-display" data-bm="display">-</span></div>
<div class="sc-bm-vis-row">
  <span style="font-size:10px;color:#7f849c;font-weight:600">Visibility</span>
  <button class="sc-bm-vis-btn" data-bm="visibility" id="sc-bm-vis-btn">Hide</button>
</div>
<div class="sc-bm-wrap">
  <div class="sc-bm-margin">
    <span class="sc-bm-tag">margin</span>
    <div class="sc-bm-vcell" data-bm="mt">-</div>
    <div class="sc-bm-row">
      <div class="sc-bm-cell" data-bm="ml">-</div>
      <div class="sc-bm-center">
        <div class="sc-bm-border">
          <span class="sc-bm-tag">border</span>
          <div class="sc-bm-vcell" data-bm="bt">-</div>
          <div class="sc-bm-row">
            <div class="sc-bm-cell" data-bm="bl">-</div>
            <div class="sc-bm-center">
              <div class="sc-bm-padding">
                <span class="sc-bm-tag">padding</span>
                <div class="sc-bm-vcell" data-bm="pt">-</div>
                <div class="sc-bm-row">
                  <div class="sc-bm-cell" data-bm="pl">-</div>
                  <div class="sc-bm-center">
                    <div class="sc-bm-content" data-bm="content">- x -</div>
                  </div>
                  <div class="sc-bm-cell" data-bm="pr">-</div>
                </div>
                <div class="sc-bm-vcell" data-bm="pb">-</div>
              </div>
            </div>
            <div class="sc-bm-cell" data-bm="br">-</div>
          </div>
          <div class="sc-bm-vcell" data-bm="bb">-</div>
        </div>
      </div>
      <div class="sc-bm-cell" data-bm="mr">-</div>
    </div>
    <div class="sc-bm-vcell" data-bm="mb">-</div>
  </div>
</div>
</div>

<div class="sc-token-panel" aria-label="Computed design tokens">
<div class="sc-token-header"><span class="sc-token-title">Computed Tokens</span><span id="sc-token-contrast" class="sc-token-contrast warn">Pick an element</span></div>
<div id="sc-token-list" class="sc-token-list">
  <div class="sc-token-empty">Pick an element to inspect computed colors, type, and spacing.</div>
</div>
</div>

<div class="sc-prop-group collapsed"><div class="sc-group-header"><svg class="sc-group-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg><span class="sc-group-title">Typography</span><svg class="sc-group-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="sc-group-body">
<div class="sc-prop-row"><span class="sc-prop-label">Family</span><select class="sc-select-input sc-font-select" data-prop="font-family"><option value="">Default</option><optgroup label="Sans-Serif"><option value="Arial, sans-serif">Arial</option><option value="Helvetica, Arial, sans-serif">Helvetica</option><option value="Verdana, sans-serif">Verdana</option><option value="Tahoma, sans-serif">Tahoma</option><option value="'Trebuchet MS', sans-serif">Trebuchet MS</option><option value="'Gill Sans', sans-serif">Gill Sans</option><option value="'Segoe UI', sans-serif">Segoe UI</option><option value="Optima, sans-serif">Optima</option><option value="'Lucida Sans', sans-serif">Lucida Sans</option><option value="'Franklin Gothic Medium', sans-serif">Franklin Gothic</option><option value="Futura, sans-serif">Futura</option><option value="'Century Gothic', sans-serif">Century Gothic</option><option value="Candara, sans-serif">Candara</option><option value="Calibri, sans-serif">Calibri</option><option value="'Open Sans', sans-serif">Open Sans</option><option value="Roboto, sans-serif">Roboto</option><option value="Inter, sans-serif">Inter</option><option value="system-ui, sans-serif">System UI</option></optgroup><optgroup label="Serif"><option value="'Times New Roman', serif">Times New Roman</option><option value="Georgia, serif">Georgia</option><option value="Palatino, serif">Palatino</option><option value="'Book Antiqua', serif">Book Antiqua</option><option value="Garamond, serif">Garamond</option><option value="Baskerville, serif">Baskerville</option><option value="Cambria, serif">Cambria</option><option value="'Didot', serif">Didot</option><option value="'Hoefler Text', serif">Hoefler Text</option><option value="'Bodoni MT', serif">Bodoni MT</option><option value="Constantia, serif">Constantia</option></optgroup><optgroup label="Monospace"><option value="'Courier New', monospace">Courier New</option><option value="Consolas, monospace">Consolas</option><option value="Monaco, monospace">Monaco</option><option value="Menlo, monospace">Menlo</option><option value="'Cascadia Code', monospace">Cascadia Code</option><option value="'Fira Code', monospace">Fira Code</option><option value="'Source Code Pro', monospace">Source Code Pro</option><option value="'Lucida Console', monospace">Lucida Console</option><option value="'Andale Mono', monospace">Andale Mono</option></optgroup><optgroup label="Display & Fun"><option value="Impact, sans-serif">Impact</option><option value="'Comic Sans MS', cursive">Comic Sans MS</option><option value="Copperplate, serif">Copperplate</option><option value="Papyrus, fantasy">Papyrus</option><option value="'Brush Script MT', cursive">Brush Script</option><option value="cursive">Cursive</option><option value="fantasy">Fantasy</option></optgroup></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Size</span><input class="sc-prop-input" data-prop="font-size" type="text" placeholder="16px, 1.2rem"/></div>
<div class="sc-range-row"><span class="sc-prop-label">Size</span><input class="sc-range-input" data-prop="font-size" data-unit="px" data-default="16" type="range" min="6" max="72" value="16"/><span class="sc-range-val"></span></div>
<div class="sc-prop-row"><span class="sc-prop-label">Weight</span><select class="sc-select-input" data-prop="font-weight"><option value="">Default</option><option value="100">100 Thin</option><option value="300">300 Light</option><option value="400">400 Normal</option><option value="500">500 Medium</option><option value="600">600 Semi Bold</option><option value="700">700 Bold</option><option value="900">900 Black</option></select></div>
<div class="sc-range-row"><span class="sc-prop-label">Weight</span><input class="sc-range-input" data-prop="font-weight" data-unit="" data-default="400" type="range" min="100" max="900" step="100" value="400"/><span class="sc-range-val"></span></div>
<div class="sc-prop-row"><span class="sc-prop-label">Style</span><select class="sc-select-input" data-prop="font-style"><option value="">Default</option><option value="normal">Normal</option><option value="italic">Italic</option><option value="oblique">Oblique</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Line Height</span><input class="sc-prop-input" data-prop="line-height" type="text" placeholder="1.5, 24px"/></div>
<div class="sc-range-row"><span class="sc-prop-label">Line H.</span><input class="sc-range-input" data-prop="line-height" data-unit="" data-default="1.5" type="range" min="0.5" max="4" step="0.1" value="1.5"/><span class="sc-range-val"></span></div>
<div class="sc-prop-row"><span class="sc-prop-label">Letter Sp.</span><input class="sc-prop-input" data-prop="letter-spacing" type="text" placeholder="0.5px"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Align</span><select class="sc-select-input" data-prop="text-align"><option value="">Default</option><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Decoration</span><select class="sc-select-input" data-prop="text-decoration"><option value="">Default</option><option value="none">None</option><option value="underline">Underline</option><option value="line-through">Strikethrough</option><option value="overline">Overline</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Transform</span><select class="sc-select-input" data-prop="text-transform"><option value="">Default</option><option value="none">None</option><option value="uppercase">UPPERCASE</option><option value="lowercase">lowercase</option><option value="capitalize">Capitalize</option></select></div>
</div></div>

<div class="sc-prop-group collapsed"><div class="sc-group-header"><svg class="sc-group-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.24-.3-.39-.65-.39-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.5-9-10-9z"/></svg><span class="sc-group-title">Colors & Background</span><svg class="sc-group-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="sc-group-body">
<div class="sc-prop-row"><span class="sc-prop-label">Color</span><input class="sc-color-input" data-prop="color" type="color" value="#cdd6f4"/><input class="sc-prop-input" data-prop="color" type="text" placeholder="#hex, rgb()"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Background</span><input class="sc-color-input" data-prop="background-color" type="color" value="#1e1e2e"/><input class="sc-prop-input" data-prop="background-color" type="text" placeholder="#hex, rgb()"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">BG Image</span><input class="sc-prop-input" data-prop="background-image" type="text" placeholder="url(), gradient()"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">BG Size</span><select class="sc-select-input" data-prop="background-size"><option value="">Default</option><option value="cover">Cover</option><option value="contain">Contain</option><option value="auto">Auto</option></select></div>
<div class="sc-range-row"><span class="sc-prop-label">Opacity</span><input class="sc-range-input" data-prop="opacity" data-unit="" data-default="1" type="range" min="0" max="1" step="0.05" value="1"/><span class="sc-range-val"></span></div>
</div></div>

<div class="sc-prop-group collapsed"><div class="sc-group-header"><svg class="sc-group-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg><span class="sc-group-title">Spacing</span><svg class="sc-group-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="sc-group-body">
<div class="sc-sub-label">Margin</div>
<div class="sc-prop-row"><span class="sc-prop-label">All</span><input class="sc-prop-input" data-prop="margin" type="text" placeholder="10px"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Top</span><input class="sc-prop-input" data-prop="margin-top" type="text"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Right</span><input class="sc-prop-input" data-prop="margin-right" type="text"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Bottom</span><input class="sc-prop-input" data-prop="margin-bottom" type="text"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Left</span><input class="sc-prop-input" data-prop="margin-left" type="text"/></div>
<div class="sc-sub-label">Padding</div>
<div class="sc-prop-row"><span class="sc-prop-label">All</span><input class="sc-prop-input" data-prop="padding" type="text" placeholder="10px"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Top</span><input class="sc-prop-input" data-prop="padding-top" type="text"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Right</span><input class="sc-prop-input" data-prop="padding-right" type="text"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Bottom</span><input class="sc-prop-input" data-prop="padding-bottom" type="text"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Left</span><input class="sc-prop-input" data-prop="padding-left" type="text"/></div>
</div></div>

<div class="sc-prop-group collapsed"><div class="sc-group-header"><svg class="sc-group-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg><span class="sc-group-title">Size & Layout</span><svg class="sc-group-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="sc-group-body">
<div class="sc-prop-row"><span class="sc-prop-label">Width</span><input class="sc-prop-input" data-prop="width" type="text" placeholder="100%, 300px"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Max Width</span><input class="sc-prop-input" data-prop="max-width" type="text" placeholder="1200px"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Height</span><input class="sc-prop-input" data-prop="height" type="text" placeholder="auto, 200px"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Max Height</span><input class="sc-prop-input" data-prop="max-height" type="text" placeholder="500px"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Display</span><select class="sc-select-input" data-prop="display"><option value="">Default</option><option value="block">Block</option><option value="inline">Inline</option><option value="inline-block">Inline Block</option><option value="flex">Flex</option><option value="grid">Grid</option><option value="none">None</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Overflow</span><select class="sc-select-input" data-prop="overflow"><option value="">Default</option><option value="visible">Visible</option><option value="hidden">Hidden</option><option value="scroll">Scroll</option><option value="auto">Auto</option></select></div>
</div></div>

<div class="sc-prop-group collapsed"><div class="sc-group-header"><svg class="sc-group-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="6" height="14" rx="1"/><rect x="10" y="2" width="4" height="20" rx="1"/><rect x="16" y="8" width="6" height="8" rx="1"/></svg><span class="sc-group-title">Flexbox</span><svg class="sc-group-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="sc-group-body">
<div class="sc-prop-row"><span class="sc-prop-label">Direction</span><select class="sc-select-input" data-prop="flex-direction"><option value="">Default</option><option value="row">Row</option><option value="column">Column</option><option value="row-reverse">Row Rev</option><option value="column-reverse">Col Rev</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Wrap</span><select class="sc-select-input" data-prop="flex-wrap"><option value="">Default</option><option value="nowrap">No Wrap</option><option value="wrap">Wrap</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Justify</span><select class="sc-select-input" data-prop="justify-content"><option value="">Default</option><option value="flex-start">Start</option><option value="center">Center</option><option value="flex-end">End</option><option value="space-between">Between</option><option value="space-around">Around</option><option value="space-evenly">Evenly</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Align Items</span><select class="sc-select-input" data-prop="align-items"><option value="">Default</option><option value="flex-start">Start</option><option value="center">Center</option><option value="flex-end">End</option><option value="stretch">Stretch</option><option value="baseline">Baseline</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Gap</span><input class="sc-prop-input" data-prop="gap" type="text" placeholder="10px"/></div>
</div></div>

<div class="sc-prop-group collapsed"><div class="sc-group-header"><svg class="sc-group-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 3H3v7h18V3z"/><path d="M21 14H3v7h18v-7z"/></svg><span class="sc-group-title">Position</span><svg class="sc-group-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="sc-group-body">
<div class="sc-prop-row"><span class="sc-prop-label">Position</span><select class="sc-select-input" data-prop="position"><option value="">Default</option><option value="static">Static</option><option value="relative">Relative</option><option value="absolute">Absolute</option><option value="fixed">Fixed</option><option value="sticky">Sticky</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Top</span><input class="sc-prop-input" data-prop="top" type="text" placeholder="0, 10px"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Right</span><input class="sc-prop-input" data-prop="right" type="text"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Bottom</span><input class="sc-prop-input" data-prop="bottom" type="text"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Left</span><input class="sc-prop-input" data-prop="left" type="text"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Z-Index</span><input class="sc-prop-input" data-prop="z-index" type="text" placeholder="auto, 100"/></div>
</div></div>

<div class="sc-prop-group collapsed"><div class="sc-group-header"><svg class="sc-group-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg><span class="sc-group-title">Border & Outline</span><svg class="sc-group-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="sc-group-body">
<div class="sc-prop-row"><span class="sc-prop-label">Border</span><input class="sc-prop-input" data-prop="border" type="text" placeholder="1px solid #cba6f7"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">B. Color</span><input class="sc-color-input" data-prop="border-color" type="color" value="#585b70"/><input class="sc-prop-input" data-prop="border-color" type="text" placeholder="#hex"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">B. Style</span><select class="sc-select-input" data-prop="border-style"><option value="">Default</option><option value="none">None</option><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option><option value="double">Double</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Radius</span><input class="sc-prop-input" data-prop="border-radius" type="text" placeholder="8px, 50%"/></div>
<div class="sc-range-row"><span class="sc-prop-label">Radius</span><input class="sc-range-input" data-prop="border-radius" data-unit="px" data-default="0" type="range" min="0" max="50" value="0"/><span class="sc-range-val"></span></div>
<div class="sc-prop-row"><span class="sc-prop-label">Outline</span><input class="sc-prop-input" data-prop="outline" type="text" placeholder="2px solid red"/></div>
</div></div>

<div class="sc-prop-group collapsed"><div class="sc-group-header"><svg class="sc-group-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 3v1m0 16v1m9-9h-1M4 12H3"/></svg><span class="sc-group-title">Shadows & Effects</span><svg class="sc-group-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="sc-group-body">
<div class="sc-prop-row"><span class="sc-prop-label">Box Shadow</span><input class="sc-prop-input" data-prop="box-shadow" type="text" placeholder="0 4px 12px rgba(0,0,0,.3)"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Text Shadow</span><input class="sc-prop-input" data-prop="text-shadow" type="text" placeholder="1px 1px 2px #000"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Filter</span><input class="sc-prop-input" data-prop="filter" type="text" placeholder="blur(4px)"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Backdrop</span><input class="sc-prop-input" data-prop="backdrop-filter" type="text" placeholder="blur(10px)"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Mix Blend</span><select class="sc-select-input" data-prop="mix-blend-mode"><option value="">Default</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="darken">Darken</option><option value="lighten">Lighten</option><option value="difference">Difference</option></select></div>
</div></div>

<div class="sc-prop-group collapsed"><div class="sc-group-header"><svg class="sc-group-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg><span class="sc-group-title">Transform & Animation</span><svg class="sc-group-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="sc-group-body">
<div class="sc-prop-row"><span class="sc-prop-label">Transform</span><input class="sc-prop-input" data-prop="transform" type="text" placeholder="rotate(5deg)"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Transition</span><input class="sc-prop-input" data-prop="transition" type="text" placeholder="all 0.3s ease"/></div>
<div class="sc-prop-row"><span class="sc-prop-label">Animation</span><input class="sc-prop-input" data-prop="animation" type="text" placeholder="fade 1s ease"/></div>
</div></div>

<div class="sc-prop-group collapsed"><div class="sc-group-header"><svg class="sc-group-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/></svg><span class="sc-group-title">Cursor & Misc</span><svg class="sc-group-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="sc-group-body">
<div class="sc-prop-row"><span class="sc-prop-label">Cursor</span><select class="sc-select-input" data-prop="cursor"><option value="">Default</option><option value="pointer">Pointer</option><option value="default">Arrow</option><option value="move">Move</option><option value="text">Text</option><option value="not-allowed">Not Allowed</option><option value="grab">Grab</option><option value="none">None</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Pointer Ev.</span><select class="sc-select-input" data-prop="pointer-events"><option value="">Default</option><option value="auto">Auto</option><option value="none">None</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">User Select</span><select class="sc-select-input" data-prop="user-select"><option value="">Default</option><option value="auto">Auto</option><option value="none">None</option><option value="text">Text</option><option value="all">All</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Object Fit</span><select class="sc-select-input" data-prop="object-fit"><option value="">Default</option><option value="fill">Fill</option><option value="contain">Contain</option><option value="cover">Cover</option><option value="none">None</option></select></div>
<div class="sc-prop-row"><span class="sc-prop-label">Visibility</span><select class="sc-select-input" data-prop="visibility"><option value="">Default</option><option value="visible">Visible</option><option value="hidden">Hidden</option></select></div>
</div></div>
</div>

<!-- PRESETS TAB -->
<div class="sc-tab-panel" id="sc-panel-presets" data-panel="presets" role="tabpanel" aria-labelledby="sc-tab-presets" style="display:none" hidden>
<div id="sc-presets-content"></div>
</div>

<!-- CODE TAB -->
<div class="sc-tab-panel" id="sc-panel-code" data-panel="code" role="tabpanel" aria-labelledby="sc-tab-code" style="display:none" hidden>
<div class="sc-code-header">
  <span class="sc-code-label">Custom CSS</span>
  <div class="sc-custom-row">
    <span class="sc-custom-label">Enable</span>
    <label class="sc-toggle"><input id="sc-custom-toggle" type="checkbox" checked aria-label="Enable custom CSS"/><span class="sc-toggle-sl"></span></label>
  </div>
</div>
<div class="sc-code-wrap"><div id="sc-line-numbers"></div><textarea id="sc-code-editor" placeholder="/* Custom CSS — always applied on top of themes */" spellcheck="false"></textarea></div>
</div>

<!-- THEMES TAB -->
<div class="sc-tab-panel" id="sc-panel-themes" data-panel="themes" role="tabpanel" aria-labelledby="sc-tab-themes" style="display:none" hidden>
<div id="sc-theme-list"></div>
</div>

</div><!-- tab-content -->

<div class="sc-footer"><button id="sc-reset-btn" class="sc-footer-btn">Reset Custom CSS</button></div>
<div id="sc-toast"></div>
</div>
`;}

  init();
})();
