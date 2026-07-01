(async function(){
  /* ─── Refs ─── */
  const code = document.getElementById('code');
  const highlight = document.getElementById('highlight');
  const gutter = document.getElementById('gutter');
  const gutterInner = document.getElementById('gutter-inner');
  const editorContainer = document.getElementById('editor-container');
  const cmHost = document.getElementById('codemirror-host');
  const acPopup = document.getElementById('ac-popup');
  const domainList = document.getElementById('domain-list');
  const tbDomain = document.getElementById('tb-domain');
  const indicator = document.getElementById('tb-indicator');
  const sbPos = document.getElementById('sb-pos');
  const sbLines = document.getElementById('sb-lines');
  const sbSize = document.getElementById('sb-size');
  const sbDomainInfo = document.getElementById('sb-domain-info');
  const newDomainWrap = document.getElementById('new-domain-wrap');
  const newDomainInput = document.getElementById('new-domain-input');
  const liveBtn = document.getElementById('btn-live');
  const sourceModeSelect = document.getElementById('source-mode');
  const templateSelect = document.getElementById('template-select');
  const insertTemplateBtn = document.getElementById('btn-insert-template');
  const aiAssistBtn = document.getElementById('btn-ai-assist');
  const aiPanel = document.getElementById('ai-panel');
  const aiProvider = document.getElementById('ai-provider');
  const aiEndpoint = document.getElementById('ai-endpoint');
  const aiModel = document.getElementById('ai-model');
  const aiKey = document.getElementById('ai-key');
  const aiPrompt = document.getElementById('ai-prompt');
  const aiSaveBtn = document.getElementById('btn-ai-save');
  const aiDraftBtn = document.getElementById('btn-ai-draft');
  const aiStatus = document.getElementById('ai-status');

  /* ─── State ─── */
  let allData = {};
  let activeDomain = null;
  let activeThemeId = null; // null = custom CSS, string = theme id
  let modified = false;
  let livePreview = false;
  let livePreviewSeq = 0;
  let lastPreviewError = '';
  let undoStack = [];
  let redoStack = [];
  let lastSaved = '';
  let sourceMode = 'css';
  let activeLabelBase = '';
  let acIndex = -1;
  let acItems = [];
  let acVisible = false;
  let snippetExpanding = false;
  let aiSettingsLoaded = false;
  let cmEditor = null;
  let usingCodeMirror = false;

  function shouldUseLegacyEditor() {
    const params = new URLSearchParams(location.search);
    if (params.has('legacy') || params.get('editor') === 'legacy') return true;
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) return true;
    return false;
  }

  function installCodeMirrorProxy(editor) {
    try {
      Object.defineProperty(code, 'value', {
        configurable: true,
        get() { return editor.getValue(); },
        set(value) { editor.setValue(value); }
      });
      Object.defineProperty(code, 'selectionStart', {
        configurable: true,
        get() { return editor.selectionStart(); },
        set(value) {
          const start = Math.max(0, Number(value) || 0);
          const end = Math.max(start, editor.selectionEnd());
          editor.setSelectionRange(start, end);
        }
      });
      Object.defineProperty(code, 'selectionEnd', {
        configurable: true,
        get() { return editor.selectionEnd(); },
        set(value) {
          const end = Math.max(0, Number(value) || 0);
          const start = Math.min(editor.selectionStart(), end);
          editor.setSelectionRange(start, end);
        }
      });
      Object.defineProperty(code, 'scrollTop', {
        configurable: true,
        get() { return editor.scrollTop; },
        set(value) { editor.scrollTop = value; }
      });
      Object.defineProperty(code, 'scrollLeft', {
        configurable: true,
        get() { return editor.scrollLeft; },
        set(value) { editor.scrollLeft = value; }
      });
      Object.defineProperty(code, 'clientHeight', {
        configurable: true,
        get() { return editor.clientHeight; }
      });
      code.focus = () => editor.focus();
      code.getBoundingClientRect = () => editor.getBoundingClientRect();
      code.setSelectionRange = (start, end) => editor.setSelectionRange(start, end);
      code.setRangeText = (replacement, start = code.selectionStart, end = code.selectionEnd, selectionMode = 'preserve') => {
        editor.replaceRange(replacement, start, end, selectionMode);
      };
      return true;
    } catch (error) {
      console.warn('StyleCraft CodeMirror proxy unavailable; using legacy editor', error);
      return false;
    }
  }

  function wireCodeMirrorAccessibility() {
    if (!cmHost) return;
    const cmContent = cmHost.querySelector('.cm-content');
    if (!cmContent) return;
    cmContent.setAttribute('aria-label', 'CSS source editor');
    cmContent.setAttribute('role', 'textbox');
    cmContent.setAttribute('aria-multiline', 'true');
    cmContent.addEventListener('keydown', (e) => {
      const isOpen = (id) => {
        const el = document.getElementById(id);
        return !!el && getComputedStyle(el).display !== 'none';
      };
      const findOpen = isOpen('find-bar');
      const colorOpen = isOpen('color-picker');
      const helpOpen = isOpen('shortcuts-overlay');
      if (e.key === 'Escape' && !findOpen && !colorOpen && !helpOpen) {
        e.preventDefault();
        document.getElementById('btn-save').focus();
      }
    }, true);
  }

  if (!shouldUseLegacyEditor() && window.StyleCraftCodeMirror && cmHost) {
    cmEditor = window.StyleCraftCodeMirror.create({ host: cmHost, textarea: code });
    if (cmEditor && installCodeMirrorProxy(cmEditor)) {
      usingCodeMirror = true;
      editorContainer.classList.add('cm-active');
      code.dataset.editorEngine = 'codemirror';
      wireCodeMirrorAccessibility();
    } else if (cmEditor && cmEditor.destroy) {
      cmEditor.destroy();
      cmEditor = null;
    }
  }
  if (!usingCodeMirror) code.dataset.editorEngine = 'legacy';

  /* ─── Storage ─── */
  async function loadAllData() {
    const d = await chrome.storage.local.get('stylecraft_data');
    return d.stylecraft_data || {};
  }
  async function saveAllData(data) {
    try {
      await chrome.storage.local.set({ stylecraft_data: data });
    } catch (e) {
      if (e.message && e.message.includes('QUOTA')) {
        toast('Storage quota exceeded! Export and clean old styles.');
      } else { throw e; }
    }
  }

  /* ─── Hash routing: domain or domain/theme/THEME_ID ─── */
  function parseHash() {
    const h = decodeURIComponent(location.hash.replace('#', ''));
    const themeMatch = h.match(/^(.+?)\/theme\/(.+)$/);
    if (themeMatch) return { domain: themeMatch[1], themeId: themeMatch[2] };
    return { domain: h || null, themeId: null };
  }
  function setHash(domain, themeId) {
    if (themeId) location.hash = encodeURIComponent(domain) + '/theme/' + encodeURIComponent(themeId);
    else location.hash = encodeURIComponent(domain);
  }

  function getActiveRecord(domain = activeDomain, themeId = activeThemeId) {
    if (!domain || !allData[domain]) return null;
    if (themeId) return (allData[domain].themes || {})[themeId] || null;
    return allData[domain];
  }

  function getRecordSourceMode(record) {
    const syntax = record && record.preprocessor && record.preprocessor.syntax;
    return ['scss', 'sass'].includes(syntax) ? syntax : 'css';
  }

  function getRecordSource(record, mode, fallbackCss) {
    if (!record) return '';
    if (mode === 'css') return fallbackCss || '';
    return (record.preprocessor && record.preprocessor.source) || fallbackCss || '';
  }

  function setSourceMode(mode) {
    sourceMode = ['css', 'scss', 'sass'].includes(mode) ? mode : 'css';
    if (sourceModeSelect) sourceModeSelect.value = sourceMode;
  }

  function updateDomainLabels() {
    const suffix = sourceMode !== 'css' ? ' (' + sourceMode.toUpperCase() + ')' : '';
    const label = (activeLabelBase || 'No domain selected') + suffix;
    tbDomain.textContent = label;
    sbDomainInfo.textContent = label;
  }

  async function compileEditorSource(source = code.value) {
    let css = source;
    if (sourceMode !== 'css') {
      if (!window.StyleCraftSass || typeof window.StyleCraftSass.compile !== 'function') {
        throw new Error('Sass compiler bundle is unavailable');
      }
      const result = window.StyleCraftSass.compile(source, { syntax: sourceMode });
      css = result.css;
    }
    if (!window.StyleCraftPostCSS || typeof window.StyleCraftPostCSS.process !== 'function') {
      throw new Error('PostCSS bundle is unavailable');
    }
    const processed = await window.StyleCraftPostCSS.process(css);
    return processed.css;
  }

  /* ─── Init ─── */
  allData = await loadAllData();
  const initHash = parseHash();
  renderSidebar();
  if (initHash.domain && allData[initHash.domain]) {
    selectItem(initHash.domain, initHash.themeId);
  } else if (Object.keys(allData).length) {
    selectItem(Object.keys(allData)[0], null);
  } else {
    setEditorText('/* No domains yet. Add one from the sidebar. */');
  }

  /* ─── Sidebar ─── */
  function renderSidebar() {
    const entries = Object.entries(allData).sort((a,b) => a[0].localeCompare(b[0]));
    if (!entries.length) {
      domainList.innerHTML = '<div class="sb-empty">No domains yet</div>';
      return;
    }
    let html = '';
    for (const [d, data] of entries) {
      const hasCustom = (data.customCSS || '').trim();
      const themes = Object.entries(data.themes || {});
      const isActiveDomain = d === activeDomain;

      // Domain header
      html += '<div class="sb-domain' + (isActiveDomain ? ' open' : '') + '" data-domain="' + esc(d) + '">';
      html += '<div class="sb-domain-header">';
      html += '<svg class="sb-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
      html += '<div class="name">' + esc(d) + '</div>';
      const total = (hasCustom ? 1 : 0) + themes.length;
      html += '<div class="count">' + total + '</div>';
      html += '<button class="sb-del" data-del-domain="' + esc(d) + '" data-del-type="domain" title="Delete domain and all styles" aria-label="Delete domain ' + esc(d) + ' and all styles">&times;</button>';
      html += '</div>';

      // Children (shown when domain is active)
      html += '<div class="sb-children"' + (isActiveDomain ? '' : ' style="display:none"') + '>';
      // Custom CSS entry
      const customActive = isActiveDomain && activeThemeId === null;
      const customEnabled = data.customEnabled !== false;
      html += '<div class="sb-item' + (customActive ? ' active' : '') + '" data-domain="' + esc(d) + '" data-type="custom">';
      html += '<div class="dot ' + (hasCustom && customEnabled ? 'on' : 'off') + '"></div>';
      html += '<div class="name">Custom CSS</div>';
      if (hasCustom) {
        const lines = data.customCSS.split('\n').length;
        html += '<div class="count">' + lines + 'L</div>';
        html += '<button class="sb-del" data-del-domain="' + esc(d) + '" data-del-type="custom" title="Clear custom CSS" aria-label="Clear custom CSS for ' + esc(d) + '">&times;</button>';
      }
      html += '</div>';

      // Theme entries
      for (const [id, theme] of themes) {
        const themeActive = isActiveDomain && activeThemeId === id;
        const src = theme.source === 'stylus-import' ? 'Stylus' : 'USw';
        html += '<div class="sb-item' + (themeActive ? ' active' : '') + '" data-domain="' + esc(d) + '" data-type="theme" data-id="' + esc(id) + '">';
        html += '<div class="dot ' + (theme.enabled !== false ? 'on' : 'off') + '"></div>';
        html += '<div class="name">' + esc(theme.name || id) + '</div>';
        html += '<div class="type">' + src + '</div>';
        html += '<button class="sb-del" data-del-domain="' + esc(d) + '" data-del-type="theme" data-del-id="' + esc(id) + '" title="Delete theme" aria-label="Delete theme ' + esc(theme.name || id) + ' for ' + esc(d) + '">&times;</button>';
        html += '</div>';
      }
      html += '</div></div>';
    }
    domainList.innerHTML = html;

    // Wire domain headers (toggle expand)
    domainList.querySelectorAll('.sb-domain-header').forEach(el => {
      el.addEventListener('click', () => {
        const wrap = el.closest('.sb-domain');
        const children = wrap.querySelector('.sb-children');
        const open = children.style.display !== 'none';
        // Collapse all
        domainList.querySelectorAll('.sb-children').forEach(c => c.style.display = 'none');
        domainList.querySelectorAll('.sb-domain').forEach(d => d.classList.remove('open'));
        if (!open) {
          children.style.display = '';
          wrap.classList.add('open');
        }
      });
    });

    // Wire items
    domainList.querySelectorAll('.sb-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.sb-del')) return;
        e.stopPropagation();
        if (modified && !confirm('Unsaved changes. Switch anyway?')) return;
        const d = el.dataset.domain;
        const tid = el.dataset.type === 'theme' ? el.dataset.id : null;
        selectItem(d, tid);
      });
    });

    // Wire delete buttons
    domainList.querySelectorAll('.sb-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const d = btn.dataset.delDomain;
        const type = btn.dataset.delType;

        if (type === 'domain') {
          delete allData[d];
          await saveAllData(allData);
          notifyTabs();
          toast('Deleted ' + d);
          if (activeDomain === d) {
            activeDomain = null; activeThemeId = null;
            const keys = Object.keys(allData);
            if (keys.length) selectItem(keys[0], null);
            else setEditorText('/* No domains left */');
          }
        } else if (type === 'custom') {
          if (allData[d]) { allData[d].customCSS = ''; allData[d].customEnabled = true; delete allData[d].preprocessor; }
          await saveAllData(allData);
          notifyTabs();
          toast('Cleared custom CSS for ' + d);
          if (activeDomain === d && activeThemeId === null) {
            lastSaved = ''; setEditorText(''); setModified(false);
          }
        } else if (type === 'theme') {
          const tid = btn.dataset.delId;
          const name = (allData[d] && allData[d].themes && allData[d].themes[tid]) ? (allData[d].themes[tid].name || tid) : tid;
          if (allData[d] && allData[d].themes) delete allData[d].themes[tid];
          // Clean up empty domain
          if (allData[d] && !(allData[d].customCSS || '').trim() && !(allData[d].preprocessor && allData[d].preprocessor.source) && !Object.keys(allData[d].themes || {}).length) delete allData[d];
          await saveAllData(allData);
          notifyTabs();
          toast('Deleted ' + name);
          if (activeDomain === d && activeThemeId === tid) {
            activeThemeId = null;
            if (allData[d]) selectItem(d, null);
            else {
              const keys = Object.keys(allData);
              if (keys.length) selectItem(keys[0], null);
              else { activeDomain = null; setEditorText('/* No domains left */'); }
            }
          }
        }
        renderSidebar();
      });
    });
  }

  function selectItem(domain, themeId) {
    activeDomain = domain;
    activeThemeId = themeId;
    const data = allData[domain] || {};
    let source = '';
    let label = '';

    if (themeId) {
      const theme = (data.themes || {})[themeId];
      const mode = getRecordSourceMode(theme);
      setSourceMode(mode);
      source = getRecordSource(theme, mode, theme ? (theme.rawCSS || theme.css || '') : '');
      label = domain + ' / ' + (theme ? (theme.name || themeId) : themeId);
    } else {
      const mode = getRecordSourceMode(data);
      setSourceMode(mode);
      source = getRecordSource(data, mode, data.customCSS || '');
      label = domain + ' / Custom CSS';
    }
    activeLabelBase = label;

    setEditorText(source);
    lastSaved = source;
    modified = false;
    updateIndicator();
    updateDomainLabels();
    setHash(domain, themeId);
    undoStack = [source];
    redoStack = [];
    renderSidebar();
    code.focus();
  }

  function setEditorText(text) {
    code.value = text;
    updateHighlight();
    updateGutter();
    updateStatus();
  }

  /* ─── Add domain ─── */
  document.getElementById('btn-add-domain').addEventListener('click', () => {
    newDomainWrap.style.display = newDomainWrap.style.display === 'block' ? 'none' : 'block';
    if (newDomainWrap.style.display === 'block') { newDomainInput.value = ''; newDomainInput.focus(); }
  });
  newDomainInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const d = newDomainInput.value.trim().toLowerCase();
      if (!d) return;
      if (!allData[d]) {
        allData[d] = { themes: {}, customCSS: '', customEnabled: true };
        await saveAllData(allData);
      }
      newDomainWrap.style.display = 'none';
      selectItem(d, null);
    }
    if (e.key === 'Escape') newDomainWrap.style.display = 'none';
  });

  /* ─── Syntax Highlighting ─── */
  function highlightCSS(src) {
    if (!src) return '\n';
    let out = '';
    let i = 0;
    const len = src.length;
    let state = 0; // 0=selector, 1=property, 2=value

    while (i < len) {
      if (src[i] === '/' && src[i+1] === '*') {
        const end = src.indexOf('*/', i + 2);
        const j = end === -1 ? len : end + 2;
        out += '<span class="hl-comment">' + esc(src.slice(i, j)) + '</span>';
        i = j; continue;
      }
      if (src[i] === '"' || src[i] === "'") {
        const q = src[i];
        let j = i + 1;
        while (j < len && src[j] !== q) { if (src[j] === '\\') j++; j++; }
        j = Math.min(j + 1, len);
        out += '<span class="hl-string">' + esc(src.slice(i, j)) + '</span>';
        i = j; continue;
      }
      if (src[i] === '@' && state === 0) {
        let j = i + 1;
        while (j < len && /[a-zA-Z-]/.test(src[j])) j++;
        out += '<span class="hl-atrule">' + esc(src.slice(i, j)) + '</span>';
        i = j; continue;
      }
      if (src[i] === '{') { out += '<span class="hl-punct">{</span>'; state = 1; i++; continue; }
      if (src[i] === '}') { out += '<span class="hl-punct">}</span>'; state = 0; i++; continue; }
      if (src[i] === ':' && state === 1) { out += '<span class="hl-colon">:</span>'; state = 2; i++; continue; }
      if (src[i] === ';') { out += '<span class="hl-punct">;</span>'; state = 1; i++; continue; }
      if (src[i] === '!' && state === 2 && src.slice(i, i+10) === '!important') {
        out += '<span class="hl-important">!important</span>'; i += 10; continue;
      }
      if (state === 2 && /[0-9.-]/.test(src[i])) {
        let j = i; if (src[j] === '-') j++; if (src[j] === '.') j++;
        while (j < len && /[0-9.]/.test(src[j])) j++;
        if (j > i && (j > i + 1 || src[i] !== '-')) {
          out += '<span class="hl-number">' + esc(src.slice(i, j)) + '</span>';
          let k = j; while (k < len && /[a-zA-Z%]/.test(src[k])) k++;
          if (k > j) { out += '<span class="hl-unit">' + esc(src.slice(j, k)) + '</span>'; j = k; }
          i = j; continue;
        }
      }
      if (src[i] === '#' && state === 2) {
        let j = i + 1; while (j < len && /[0-9a-fA-F]/.test(src[j])) j++;
        if (j - i >= 4) { out += '<span class="hl-number">' + esc(src.slice(i, j)) + '</span>'; i = j; continue; }
      }
      if (state === 2 && /[a-zA-Z]/.test(src[i])) {
        let j = i; while (j < len && /[a-zA-Z0-9_-]/.test(src[j])) j++;
        const word = src.slice(i, j);
        out += (j < len && src[j] === '(' ? '<span class="hl-func">' : '<span class="hl-value">') + esc(word) + '</span>';
        i = j; continue;
      }
      if (state === 1 && /[a-zA-Z-]/.test(src[i])) {
        let j = i; while (j < len && /[a-zA-Z0-9-]/.test(src[j])) j++;
        out += '<span class="hl-property">' + esc(src.slice(i, j)) + '</span>';
        i = j; continue;
      }
      if (state === 0 && /[a-zA-Z.#\[:*>~+]/.test(src[i])) {
        let j = i;
        while (j < len && src[j] !== '{' && src[j] !== '/' && src[j] !== '\n') j++;
        const sel = src.slice(i, j);
        if (sel.trim()) { out += '<span class="hl-selector">' + esc(sel) + '</span>'; i = j; continue; }
      }
      if (src[i] === '\n') { out += '\n'; i++; continue; }
      out += esc(src[i]); i++;
    }
    return out + '\n';
  }

  function updateHighlight() {
    if (usingCodeMirror) {
      cmEditor.setExternalMarks();
      return;
    }
    highlight.innerHTML = highlightCSS(code.value);
  }

  /* ─── Line Numbers ─── */
  function updateGutter() {
    if (usingCodeMirror) {
      gutterInner.innerHTML = '';
      return;
    }
    const lines = code.value.split('\n').length;
    const curLine = code.value.substring(0, code.selectionStart).split('\n').length;
    let html = '';
    for (let i = 1; i <= lines; i++) html += '<span class="ln' + (i === curLine ? ' active' : '') + '">' + i + '</span>';
    gutterInner.innerHTML = html;
  }

  /* ─── Scroll sync ─── */
  code.addEventListener('scroll', () => {
    highlight.scrollTop = code.scrollTop;
    highlight.scrollLeft = code.scrollLeft;
    gutter.scrollTop = code.scrollTop;
  });

  /* ─── Status bar ─── */
  function updateStatus() {
    const pos = code.selectionStart;
    const before = code.value.substring(0, pos);
    const ln = before.split('\n').length;
    const col = pos - before.lastIndexOf('\n');
    sbPos.textContent = 'Ln ' + ln + ', Col ' + col;
    const totalLines = code.value.split('\n').length;
    sbLines.textContent = totalLines + ' line' + (totalLines !== 1 ? 's' : '');
    const bytes = new Blob([code.value]).size;
    sbSize.textContent = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';
  }

  /* ─── Input handler ─── */
  code.addEventListener('input', () => {
    updateHighlight(); updateGutter(); updateStatus();
    setModified(true); pushUndo();
    const expandedSnippet = trySnippetExpansion();
    if (livePreview && activeDomain) doLivePreview();
    if (!expandedSnippet) tryAutocomplete();
  });
  code.addEventListener('click', () => { updateGutter(); updateStatus(); hideAC(); });
  code.addEventListener('keyup', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key)) { updateGutter(); updateStatus(); }
  });

  /* ─── Keyboard shortcuts ─── */
  const pairs = { '{': '}', '(': ')', '[': ']', '"': '"', "'": "'" };
  code.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !acVisible) {
      e.preventDefault();
      const s = code.selectionStart, end = code.selectionEnd;
      if (e.shiftKey) {
        const lineStart = code.value.lastIndexOf('\n', s - 1) + 1;
        if (code.value.substring(lineStart, lineStart + 2) === '  ') {
          code.value = code.value.substring(0, lineStart) + code.value.substring(lineStart + 2);
          code.selectionStart = code.selectionEnd = Math.max(s - 2, lineStart);
        }
      } else {
        code.value = code.value.substring(0, s) + '  ' + code.value.substring(end);
        code.selectionStart = code.selectionEnd = s + 2;
      }
      updateHighlight(); updateGutter(); setModified(true); pushUndo();
    }
    if (pairs[e.key] && !acVisible) {
      const s = code.selectionStart, end = code.selectionEnd;
      if (s !== end) {
        e.preventDefault();
        const sel = code.value.substring(s, end);
        code.value = code.value.substring(0, s) + e.key + sel + pairs[e.key] + code.value.substring(end);
        code.selectionStart = s + 1; code.selectionEnd = end + 1;
        updateHighlight(); setModified(true); pushUndo();
      }
    }
    if (e.key === 'Enter' && !acVisible) {
      const pos = code.selectionStart;
      const before = code.value.substring(0, pos);
      const after = code.value.substring(pos);
      const lineStart = before.lastIndexOf('\n') + 1;
      const indent = before.substring(lineStart).match(/^(\s*)/)[1];
      if (before.trimEnd().endsWith('{') && after.trimStart().startsWith('}')) {
        e.preventDefault();
        const ins = '\n' + indent + '  \n' + indent;
        code.value = before + ins + after;
        code.selectionStart = code.selectionEnd = pos + indent.length + 3;
        updateHighlight(); updateGutter(); updateStatus(); setModified(true); pushUndo();
      } else if (before.trimEnd().endsWith('{')) {
        e.preventDefault();
        const ins = '\n' + indent + '  ';
        code.value = before + ins + after;
        code.selectionStart = code.selectionEnd = pos + ins.length;
        updateHighlight(); updateGutter(); updateStatus(); setModified(true); pushUndo();
      }
    }
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doSave(); }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); doUndo(); }
    if ((e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) || (e.key === 'y' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); doRedo(); }
    if (acVisible) {
      if (e.key === 'ArrowDown') { e.preventDefault(); acNavigate(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); acNavigate(-1); }
      else if (e.key === 'Enter' || e.key === 'Tab') { if (acIndex >= 0 && acIndex < acItems.length) { e.preventDefault(); acAccept(); } }
      else if (e.key === 'Escape') { hideAC(); }
    }
  });

  /* ─── Undo/Redo ─── */
  let undoTimer = null;
  function pushUndo() {
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
      const v = code.value;
      if (undoStack.length === 0 || undoStack[undoStack.length - 1] !== v) {
        undoStack.push(v); redoStack = [];
        if (undoStack.length > 200) undoStack.shift();
      }
    }, 300);
  }
  function doUndo() {
    if (undoStack.length <= 1) return;
    redoStack.push(undoStack.pop());
    const v = undoStack[undoStack.length - 1];
    code.value = v;
    updateHighlight(); updateGutter(); updateStatus();
    setModified(v !== lastSaved);
  }
  function doRedo() {
    if (!redoStack.length) return;
    const v = redoStack.pop(); undoStack.push(v);
    code.value = v;
    updateHighlight(); updateGutter(); updateStatus();
    setModified(v !== lastSaved);
  }
  document.getElementById('btn-undo').addEventListener('click', doUndo);
  document.getElementById('btn-redo').addEventListener('click', doRedo);

  /* ─── Save ─── */
  async function doSave() {
    if (!activeDomain) { toast('No domain selected'); return; }
    const source = code.value;
    let css;
    try {
      css = await compileEditorSource(source);
    } catch (error) {
      const label = sourceMode === 'css' ? 'CSS processing' : (sourceMode === 'sass' ? 'Sass compile' : 'SCSS compile');
      toast(label + ' failed: ' + error.message);
      return;
    }
    let trust;
    try {
      trust = window.StyleCraftData ? window.StyleCraftData.assertCssAllowed(css) : null;
    } catch (error) {
      toast(error.message || 'Blocked CSS trust issue');
      return;
    }
    allData = await loadAllData();
    if (!allData[activeDomain]) allData[activeDomain] = { themes: {}, customCSS: '', customEnabled: true };

    if (activeThemeId) {
      // Save theme CSS
      if (allData[activeDomain].themes && allData[activeDomain].themes[activeThemeId]) {
        const theme = allData[activeDomain].themes[activeThemeId];
        theme.rawCSS = css;
        theme.css = css;
        if (trust) theme.trust = trust;
        if (sourceMode === 'css') delete theme.preprocessor;
        else theme.preprocessor = { syntax: sourceMode, source };
        syncUserCssState(theme, source);
      }
    } else {
      // Save custom CSS
      allData[activeDomain].customCSS = css;
      if (trust) allData[activeDomain].trust = trust;
      if (sourceMode === 'css') delete allData[activeDomain].preprocessor;
      else allData[activeDomain].preprocessor = { syntax: sourceMode, source };
      syncUserCssState(allData[activeDomain], source);
    }

    await saveAllData(allData);
    lastSaved = source;
    setModified(false);
    renderSidebar();
    notifyTabs();
    toast('Saved' + (sourceMode === 'css' ? '' : ' compiled ' + sourceMode.toUpperCase()) + (activeThemeId ? ' theme' : ' CSS') + ' for ' + activeDomain);
  }
  document.getElementById('btn-save').addEventListener('click', doSave);

  function notifyTabs() {
    chrome.tabs.query({}, tabs => tabs.forEach(t => {
      if (t.url && !t.url.startsWith('chrome') && !t.url.startsWith('about:'))
        if (activeDomainMatchesUrl(t.url))
          chrome.tabs.sendMessage(t.id, { action: 'sc-styles-updated', domain: activeDomain }).catch(() => {});
    }));
  }

  function activeDomainMatchesUrl(tabUrl) {
    if (!activeDomain) return false;
    if (!window.StyleCraftMatcher) {
      try {
        const d = new URL(tabUrl).hostname;
        return activeDomain === '*' || d === activeDomain || d.endsWith('.' + activeDomain);
      } catch { return false; }
    }
    return window.StyleCraftMatcher.entryMatchesPage(activeDomain, allData[activeDomain] || {}, tabUrl);
  }

  function setModified(v) { modified = v; updateIndicator(); }
  function updateIndicator() { indicator.className = 'tb-indicator ' + (modified ? 'modified' : 'saved'); }

  /* ─── Live Preview ─── */
  liveBtn.addEventListener('click', () => {
    livePreview = !livePreview;
    liveBtn.classList.toggle('active', livePreview);
    liveBtn.setAttribute('aria-pressed', livePreview ? 'true' : 'false');
    if (!livePreview) {
      chrome.tabs.query({}, tabs => tabs.forEach(t => {
        if (t.url && !t.url.startsWith('chrome'))
          chrome.tabs.sendMessage(t.id, { action: 'sc-end-preview' }).catch(() => {});
      }));
    } else {
      doLivePreview();
    }
  });
  async function doLivePreview() {
    const seq = ++livePreviewSeq;
    let css;
    try {
      css = await compileEditorSource(code.value);
      lastPreviewError = '';
    } catch (error) {
      const msg = error.message || String(error);
      if (msg !== lastPreviewError) {
        const label = sourceMode === 'css' ? 'CSS processing' : (sourceMode === 'sass' ? 'Sass compile' : 'SCSS compile');
        toast(label + ' failed: ' + msg);
        lastPreviewError = msg;
      }
      return;
    }
    if (seq !== livePreviewSeq) return;
    chrome.tabs.query({}, tabs => tabs.forEach(t => {
      if (!t.url || t.url.startsWith('chrome') || t.url.startsWith('about:')) return;
      try {
        if (activeDomainMatchesUrl(t.url))
          chrome.tabs.sendMessage(t.id, { action: 'sc-apply-preview', css }).catch(() => {});
      } catch {}
    }));
  }

  /* ─── Beautify ─── */
  document.getElementById('btn-beautify').addEventListener('click', () => {
    let css = code.value;
    css = css.replace(/\s*{\s*/g, ' {\n  ');
    css = css.replace(/\s*}\s*/g, '\n}\n\n');
    css = css.replace(/;\s*/g, ';\n  ');
    css = css.replace(/\n  \n}/g, '\n}');
    css = css.replace(/\n{3,}/g, '\n\n');
    css = css.trim() + '\n';
    code.value = css;
    updateHighlight(); updateGutter(); updateStatus();
    setModified(css !== lastSaved); pushUndo();
    toast('Formatted');
  });

  const styleTemplates = {
    'tokens:surface': `/* StyleCraft template: surface tokens */
:root {
  --sc-surface-bg: #ffffff;
  --sc-surface-text: #1f2937;
  --sc-surface-muted: #6b7280;
  --sc-surface-border: rgba(31, 41, 55, 0.14);
  --sc-surface-radius: 10px;
  --sc-surface-gap: 16px;
}

[data-theme="dark"],
.theme-dark {
  --sc-surface-bg: #111827;
  --sc-surface-text: #f9fafb;
  --sc-surface-muted: #9ca3af;
  --sc-surface-border: rgba(249, 250, 251, 0.16);
}

.surface,
[data-stylecraft-surface] {
  color: var(--sc-surface-text);
  background: var(--sc-surface-bg);
  border: 1px solid var(--sc-surface-border);
  border-radius: var(--sc-surface-radius);
  padding: var(--sc-surface-gap);
}
`,
    'button:primary': `/* StyleCraft template: button variants */
:root {
  --sc-button-bg: #2563eb;
  --sc-button-fg: #ffffff;
  --sc-button-border: transparent;
  --sc-button-radius: 8px;
  --sc-button-padding-y: 0.55rem;
  --sc-button-padding-x: 0.9rem;
}

:where(button, [role="button"], .button, .btn)[data-variant="primary"],
.button-primary,
.btn-primary {
  color: var(--sc-button-fg);
  background: var(--sc-button-bg);
  border: 1px solid var(--sc-button-border);
  border-radius: var(--sc-button-radius);
  padding: var(--sc-button-padding-y) var(--sc-button-padding-x);
}

:where(button, [role="button"], .button, .btn)[data-variant="danger"] {
  --sc-button-bg: #dc2626;
}

:where(button, [role="button"], .button, .btn)[data-variant="ghost"] {
  --sc-button-bg: transparent;
  --sc-button-fg: currentColor;
  --sc-button-border: currentColor;
}
`,
    'button:compact': `/* StyleCraft template: compact button variants */
:root {
  --sc-button-bg: #334155;
  --sc-button-fg: #ffffff;
  --sc-button-radius: 6px;
  --sc-button-padding-y: 0.35rem;
  --sc-button-padding-x: 0.65rem;
}

:where(button, [role="button"], .button, .btn)[data-size="compact"] {
  color: var(--sc-button-fg);
  background: var(--sc-button-bg);
  border: 0;
  border-radius: var(--sc-button-radius);
  padding: var(--sc-button-padding-y) var(--sc-button-padding-x);
  min-height: 30px;
}

:where(button, [role="button"], .button, .btn)[data-size="compact"][data-variant="quiet"] {
  --sc-button-bg: rgba(148, 163, 184, 0.18);
  --sc-button-fg: currentColor;
}
`,
    'card:elevated': `/* StyleCraft template: elevated card variants */
:root {
  --sc-card-bg: #ffffff;
  --sc-card-fg: #111827;
  --sc-card-border: rgba(15, 23, 42, 0.12);
  --sc-card-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
  --sc-card-radius: 12px;
}

.card,
[data-card] {
  color: var(--sc-card-fg);
  background: var(--sc-card-bg);
  border: 1px solid var(--sc-card-border);
  border-radius: var(--sc-card-radius);
  box-shadow: var(--sc-card-shadow);
  padding: 1rem;
}

.card[data-density="compact"],
[data-card][data-density="compact"] {
  --sc-card-radius: 8px;
  padding: 0.75rem;
}
`,
    'form:focus': `/* StyleCraft template: form focus states */
:root {
  --sc-field-bg: #ffffff;
  --sc-field-fg: #111827;
  --sc-field-border: #94a3b8;
  --sc-field-focus: #2563eb;
  --sc-field-invalid: #dc2626;
}

:where(input, textarea, select) {
  color: var(--sc-field-fg);
  background: var(--sc-field-bg);
  border: 1px solid var(--sc-field-border);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
}

:where(input, textarea, select):focus {
  border-color: var(--sc-field-focus);
  outline: 2px solid color-mix(in srgb, var(--sc-field-focus), transparent 72%);
  outline-offset: 2px;
}

:where(input, textarea, select)[aria-invalid="true"],
:where(input, textarea, select).is-invalid {
  border-color: var(--sc-field-invalid);
}
`
  };

  function insertTemplate() {
    const template = styleTemplates[templateSelect.value];
    if (!template) { toast('Choose a template first'); return; }
    const prefix = code.value && !code.value.endsWith('\n') ? '\n\n' : '';
    const insertion = prefix + template.trim() + '\n';
    code.setRangeText(insertion, code.selectionStart, code.selectionEnd, 'end');
    updateHighlight(); updateGutter(); updateStatus();
    setModified(true); pushUndo();
    if (livePreview && activeDomain) doLivePreview();
    toast('Inserted template');
  }
  insertTemplateBtn.addEventListener('click', insertTemplate);

  const snippetLibrary = {
    ';dark': `@media (prefers-color-scheme: dark) {
  :root {
    --page-bg: #0f172a;
    --page-fg: #f8fafc;
  }

  body {
    background: var(--page-bg);
    color: var(--page-fg);
  }
}
`,
    ';motion': `@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
`,
    ';contrast': `@media (prefers-contrast: more) {
  :root {
    --focus-ring: #facc15;
  }

  a,
  button,
  input,
  select,
  textarea {
    outline-color: var(--focus-ring);
  }
}
`,
    ';vars': `:root {
  --surface-bg: #ffffff;
  --surface-fg: #111827;
  --surface-muted: #6b7280;
  --surface-border: #d1d5db;
  --accent-bg: #2563eb;
  --accent-fg: #ffffff;
}
`,
    ';focus': `:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 3px;
}
`
  };

  function trySnippetExpansion() {
    if (snippetExpanding) return false;
    const pos = code.selectionStart;
    if (pos !== code.selectionEnd) return false;
    const before = code.value.substring(0, pos);
    const match = before.match(/(^|[\s{;])(;[a-z0-9-]+)$/i);
    if (!match) return false;

    const trigger = match[2].toLowerCase();
    const snippet = snippetLibrary[trigger];
    if (!snippet) return false;

    const start = pos - trigger.length;
    snippetExpanding = true;
    try {
      code.setRangeText(snippet.trimEnd() + '\n', start, pos, 'end');
      updateHighlight();
      updateGutter();
      updateStatus();
      setModified(true);
      pushUndo();
      hideAC();
      toast('Expanded ' + trigger);
    } finally {
      snippetExpanding = false;
    }
    return true;
  }

  /* ─── AI Assist ─── */
  const aiDefaults = {
    provider: 'local',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    model: '',
    apiKey: ''
  };

  function defaultAIEndpoint(provider) {
    return provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : aiDefaults.endpoint;
  }

  function setAIStatus(text, isError = false) {
    aiStatus.textContent = text || '';
    aiStatus.style.color = isError ? 'var(--sc-red)' : 'var(--sc-muted)';
  }

  async function loadAIAssistSettings() {
    const s = await chrome.storage.local.get(['stylecraft_settings', 'stylecraft_ai_key']);
    const settings = s.stylecraft_settings || {};
    const stored = settings.aiAssist || {};
    const provider = ['local', 'openai'].includes(stored.provider) ? stored.provider : aiDefaults.provider;
    aiProvider.value = provider;
    aiEndpoint.value = stored.endpoint || defaultAIEndpoint(provider);
    aiModel.value = stored.model || aiDefaults.model;
    aiKey.value = s.stylecraft_ai_key || aiDefaults.apiKey;
    aiSettingsLoaded = true;
  }

  function readAIAssistSettings() {
    const provider = ['local', 'openai'].includes(aiProvider.value) ? aiProvider.value : aiDefaults.provider;
    return {
      provider,
      endpoint: aiEndpoint.value.trim() || defaultAIEndpoint(provider),
      model: aiModel.value.trim(),
      apiKey: aiKey.value.trim()
    };
  }

  async function saveAIAssistSettings(showToast = true) {
    const s = await chrome.storage.local.get('stylecraft_settings');
    const settings = s.stylecraft_settings || {};
    const assist = readAIAssistSettings();
    const { apiKey, ...publicAssist } = assist;
    settings.aiAssist = publicAssist;
    await chrome.storage.local.set({ stylecraft_settings: settings, stylecraft_ai_key: apiKey });
    if (showToast) toast('AI assist settings saved');
  }

  function buildAIAssistPrompt(instruction) {
    const selected = code.selectionStart !== code.selectionEnd
      ? code.value.substring(code.selectionStart, code.selectionEnd)
      : '';
    const currentSource = code.value.length > 12000 ? code.value.slice(-12000) : code.value;
    const syntaxLabel = sourceMode === 'css' ? 'CSS' : sourceMode.toUpperCase();
    return [
      'Domain: ' + (activeDomain || 'not selected'),
      'Source syntax: ' + syntaxLabel,
      'Selected source:',
      selected.trim() || '(none)',
      '',
      'Current source:',
      currentSource.trim() || '(empty)',
      '',
      'Requested change:',
      instruction,
      '',
      'Return only valid ' + syntaxLabel + '. Do not include markdown fences or explanation.'
    ].join('\n');
  }

  function extractAICSSDraft(content) {
    let draft = String(content || '').trim();
    const fenced = draft.match(/```(?:css|scss|sass)?\s*([\s\S]*?)```/i);
    if (fenced) draft = fenced[1].trim();
    return draft;
  }

  async function requestAICSSDraft(settings, instruction) {
    const headers = { 'Content-Type': 'application/json' };
    if (settings.apiKey) headers.Authorization = 'Bearer ' + settings.apiKey;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(settings.endpoint, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: settings.model,
          temperature: 0.2,
          stream: false,
          messages: [
            {
              role: 'system',
              content: 'You draft compact website styling code for a browser CSS editor. Return code only.'
            },
            { role: 'user', content: buildAIAssistPrompt(instruction) }
          ]
        })
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error('Request failed ' + response.status + (detail ? ': ' + detail.slice(0, 160) : ''));
      }
      const json = await response.json();
      const content = json.choices?.[0]?.message?.content
        || json.choices?.[0]?.text
        || json.message?.content
        || json.response
        || '';
      return extractAICSSDraft(content);
    } finally {
      clearTimeout(timer);
    }
  }

  function insertAICSSDraft(draft) {
    const css = draft.trim();
    if (!css) throw new Error('Empty draft');
    const prefix = code.value && !code.value.endsWith('\n') ? '\n\n' : '';
    code.setRangeText(prefix + css + '\n', code.selectionStart, code.selectionEnd, 'end');
    updateHighlight(); updateGutter(); updateStatus();
    setModified(true); pushUndo();
    if (livePreview && activeDomain) doLivePreview();
    hideAC();
  }

  async function draftAICSS() {
    if (!aiSettingsLoaded) await loadAIAssistSettings();
    const settings = readAIAssistSettings();
    const instruction = aiPrompt.value.trim();
    if (!instruction) { toast('Describe the CSS change first'); return; }
    if (!settings.model) { toast('Enter a model name'); return; }
    if (settings.provider === 'openai' && !settings.apiKey) { toast('Enter an API key'); return; }

    aiDraftBtn.disabled = true;
    setAIStatus('Drafting...');
    try {
      await saveAIAssistSettings(false);
      const draft = await requestAICSSDraft(settings, instruction);
      insertAICSSDraft(draft);
      aiPrompt.value = '';
      setAIStatus('Draft inserted');
      toast('AI draft inserted');
    } catch (error) {
      const message = error.name === 'AbortError' ? 'Request timed out' : (error.message || String(error));
      setAIStatus(message, true);
      toast('AI draft failed: ' + message);
    } finally {
      aiDraftBtn.disabled = false;
    }
  }

  aiAssistBtn.addEventListener('click', async () => {
    const open = !aiPanel.classList.contains('active');
    aiPanel.classList.toggle('active', open);
    aiAssistBtn.classList.toggle('active', open);
    aiAssistBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      const activeFindBar = document.getElementById('find-bar');
      if (activeFindBar) activeFindBar.style.display = 'none';
      if (!aiSettingsLoaded) await loadAIAssistSettings();
      setAIStatus('');
      aiPrompt.focus();
    }
  });
  aiProvider.addEventListener('change', () => {
    const nextDefault = defaultAIEndpoint(aiProvider.value);
    if (!aiEndpoint.value.trim() || aiEndpoint.value === defaultAIEndpoint(aiProvider.value === 'openai' ? 'local' : 'openai')) {
      aiEndpoint.value = nextDefault;
    }
  });
  aiSaveBtn.addEventListener('click', async () => {
    await saveAIAssistSettings();
    setAIStatus('Settings saved');
  });
  aiDraftBtn.addEventListener('click', draftAICSS);

  /* ─── Autocomplete ─── */
  const cssProps = [
    'align-content','align-items','align-self','animation','animation-delay','animation-direction',
    'animation-duration','animation-fill-mode','animation-name','animation-timing-function',
    'backdrop-filter','background','background-attachment','background-clip','background-color',
    'background-image','background-position','background-repeat','background-size',
    'border','border-bottom','border-bottom-color','border-bottom-left-radius','border-bottom-right-radius',
    'border-bottom-width','border-collapse','border-color','border-left','border-left-color',
    'border-left-width','border-radius','border-right','border-right-color','border-right-width',
    'border-style','border-top','border-top-color','border-top-left-radius','border-top-right-radius',
    'border-top-width','border-width','bottom','box-shadow','box-sizing',
    'clip-path','color','column-count','column-gap','content','cursor',
    'display','filter','flex','flex-basis','flex-direction','flex-flow',
    'flex-grow','flex-shrink','flex-wrap','float','font','font-family','font-size',
    'font-style','font-variant','font-weight','gap','grid','grid-area',
    'grid-column','grid-gap','grid-row','grid-template-areas','grid-template-columns','grid-template-rows',
    'height','justify-content','justify-items','justify-self','left','letter-spacing',
    'line-height','list-style','list-style-type','margin','margin-bottom','margin-left',
    'margin-right','margin-top','max-height','max-width','min-height','min-width',
    'object-fit','opacity','order','outline','outline-color','outline-offset',
    'outline-style','outline-width','overflow','overflow-x','overflow-y','padding',
    'padding-bottom','padding-left','padding-right','padding-top','perspective',
    'place-content','place-items','place-self','pointer-events','position',
    'resize','right','rotate','row-gap','scale',
    'scroll-behavior','text-align','text-decoration','text-decoration-color',
    'text-decoration-line','text-decoration-style','text-indent','text-overflow',
    'text-shadow','text-transform','top','transform','transform-origin','transition',
    'transition-delay','transition-duration','transition-property','transition-timing-function',
    'translate','user-select','vertical-align','visibility','white-space',
    'width','word-break','word-spacing','word-wrap','writing-mode','z-index'
  ];

  function tryAutocomplete() {
    if (usingCodeMirror) return;
    const pos = code.selectionStart;
    const before = code.value.substring(0, pos);
    const lastOpen = before.lastIndexOf('{');
    const lastClose = before.lastIndexOf('}');
    if (lastOpen <= lastClose) { hideAC(); return; }
    const lineStart = before.lastIndexOf('\n') + 1;
    const line = before.substring(lineStart);
    if (line.includes(':')) { hideAC(); return; }
    const wordMatch = line.match(/([a-zA-Z-]+)$/);
    if (!wordMatch || wordMatch[1].length < 2) { hideAC(); return; }
    const prefix = wordMatch[1].toLowerCase();
    acItems = cssProps.filter(p => p.startsWith(prefix) && p !== prefix).slice(0, 8);
    if (!acItems.length) { hideAC(); return; }
    showAC();
  }

  function showAC() {
    const rect = code.getBoundingClientRect();
    const pos = code.selectionStart;
    const lines = code.value.substring(0, pos).split('\n');
    const ln = lines.length, col = lines[lines.length - 1].length;
    const x = rect.left + 14 + col * 7.8 - code.scrollLeft;
    const y = rect.top + 10 + ln * 20 - code.scrollTop + 4;
    acPopup.style.left = Math.min(x, window.innerWidth - 200) + 'px';
    acPopup.style.top = Math.min(y, window.innerHeight - 220) + 'px';
    acPopup.innerHTML = acItems.map((item, i) =>
      '<div class="ac-item' + (i === 0 ? ' active' : '') + '" data-i="' + i + '">' +
      esc(item) + '<span class="ac-type">property</span></div>'
    ).join('');
    acPopup.style.display = 'block'; acVisible = true; acIndex = 0;
    acPopup.querySelectorAll('.ac-item').forEach(el => {
      el.addEventListener('mousedown', (e) => { e.preventDefault(); acIndex = parseInt(el.dataset.i); acAccept(); });
    });
  }
  function hideAC() { acPopup.style.display = 'none'; acVisible = false; acIndex = -1; }
  function acNavigate(dir) {
    acIndex = (acIndex + dir + acItems.length) % acItems.length;
    acPopup.querySelectorAll('.ac-item').forEach((el, i) => el.classList.toggle('active', i === acIndex));
    const active = acPopup.querySelector('.ac-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }
  function acAccept() {
    const item = acItems[acIndex]; if (!item) return;
    const pos = code.selectionStart;
    const before = code.value.substring(0, pos), after = code.value.substring(pos);
    const wordMatch = before.match(/([a-zA-Z-]+)$/);
    const prefixLen = wordMatch ? wordMatch[1].length : 0;
    const insert = item + ': ';
    code.value = before.substring(0, before.length - prefixLen) + insert + after;
    code.selectionStart = code.selectionEnd = pos - prefixLen + insert.length;
    hideAC(); updateHighlight(); updateGutter(); updateStatus(); setModified(true); pushUndo();
  }

  /* ─── Export .user.css ─── */
  document.getElementById('btn-export-usercss').addEventListener('click', () => {
    if (!activeDomain) { toast('No domain selected'); return; }
    const record = getActiveRecord();
    const css = code.value || (record ? (record.rawCSS || record.customCSS || record.css || '') : '');
    if (!css.trim()) { toast('Nothing to export'); return; }
    const meta = (record && record.meta) || {};
    const name = meta.name || (activeThemeId && record && record.name) || activeDomain;
    const version = meta.version || '1.0.0';
    const namespace = meta.namespace || 'stylecraft/' + activeDomain;
    let header = '/* ==UserStyle==\n';
    header += '@name        ' + name + '\n';
    header += '@namespace   ' + namespace + '\n';
    header += '@version     ' + version + '\n';
    if (meta.author) header += '@author      ' + meta.author + '\n';
    if (meta.description) header += '@description ' + meta.description + '\n';
    if (meta.license) header += '@license     ' + meta.license + '\n';
    const updateUrl = (record && record.sourceUrl) || meta.updateURL;
    if (updateUrl) header += '@updateURL   ' + updateUrl + '\n';
    header += '==/UserStyle== */\n\n';
    let body = css;
    if (activeDomain !== '*' && !/@-?moz-?document/i.test(css)) {
      body = '@-moz-document domain("' + activeDomain + '") {\n' + css + '\n}';
    }
    const output = header + body + '\n';
    const blob = new Blob([output], { type: 'text/css' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = activeDomain.replace(/[^a-zA-Z0-9.-]/g, '_') + '.user.css';
    a.click();
    URL.revokeObjectURL(u);
    toast('Exported .user.css');
  });

  /* ─── Options ─── */
  document.getElementById('btn-options').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  });

  sourceModeSelect.addEventListener('change', () => {
    setSourceMode(sourceModeSelect.value);
    updateDomainLabels();
    setModified(true);
    runLint();
    if (livePreview && activeDomain) doLivePreview();
  });

  /* ─── Theme ─── */
  const themeSelect = document.getElementById('editor-theme');
  themeSelect.addEventListener('change', async () => {
    SC_APPLY_THEME(themeSelect.value);
    const s = await chrome.storage.local.get('stylecraft_settings');
    const settings = s.stylecraft_settings || {};
    settings.theme = themeSelect.value;
    await chrome.storage.local.set({ stylecraft_settings: settings });
    chrome.runtime.sendMessage({ action: 'sc-theme-changed', theme: themeSelect.value }).catch(() => {});
  });

  /* ─── Utils ─── */
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2500);
  }
  window.addEventListener('beforeunload', (e) => { if (modified) { e.preventDefault(); e.returnValue = ''; } });

  /* ═══════════════════════════════════════════════
     PHASE 1: Find & Replace, Color Picker, Bracket Matching
     ═══════════════════════════════════════════════ */

  /* ─── Find & Replace State ─── */
  const findBar = document.getElementById('find-bar');
  const findInput = document.getElementById('find-input');
  const findCount = document.getElementById('find-count');
  const replaceRow = document.getElementById('replace-row');
  const replaceInput = document.getElementById('replace-input');
  const findCaseCheck = document.getElementById('find-case');
  const findRegexCheck = document.getElementById('find-regex');
  let findMatches = []; // [{start, end}]
  let findCurrent = -1;
  let findOpen = false;

  function openFind(withReplace) {
    findBar.style.display = 'block';
    findOpen = true;
    replaceRow.style.display = withReplace ? 'flex' : 'none';
    const sel = code.value.substring(code.selectionStart, code.selectionEnd);
    if (sel && !sel.includes('\n')) findInput.value = sel;
    findInput.focus();
    findInput.select();
    doFind();
  }
  function closeFind() {
    findBar.style.display = 'none';
    findOpen = false;
    findMatches = [];
    findCurrent = -1;
    updateHighlight();
    code.focus();
  }

  function doFind() {
    findMatches = [];
    findCurrent = -1;
    const q = findInput.value;
    if (!q) { findCount.textContent = '0 results'; updateHighlight(); return; }
    const src = code.value;
    const isCase = findCaseCheck.checked;
    const isRegex = findRegexCheck.checked;
    try {
      if (isRegex) {
        const re = new RegExp(q, 'g' + (isCase ? '' : 'i'));
        let m;
        while ((m = re.exec(src)) !== null) {
          if (m[0].length === 0) { re.lastIndex++; continue; }
          findMatches.push({ start: m.index, end: m.index + m[0].length });
        }
      } else {
        const hay = isCase ? src : src.toLowerCase();
        const needle = isCase ? q : q.toLowerCase();
        let idx = 0;
        while ((idx = hay.indexOf(needle, idx)) !== -1) {
          findMatches.push({ start: idx, end: idx + needle.length });
          idx += needle.length;
        }
      }
    } catch (e) { /* bad regex */ }
    if (findMatches.length) {
      // Find nearest match to cursor
      const cPos = code.selectionStart;
      findCurrent = 0;
      for (let i = 0; i < findMatches.length; i++) {
        if (findMatches[i].start >= cPos) { findCurrent = i; break; }
      }
    }
    findCount.textContent = findMatches.length ? (findCurrent + 1) + ' of ' + findMatches.length : 'No results';
    updateHighlight();
    if (findMatches.length) scrollToMatch();
  }

  function findNav(dir) {
    if (!findMatches.length) return;
    findCurrent = (findCurrent + dir + findMatches.length) % findMatches.length;
    findCount.textContent = (findCurrent + 1) + ' of ' + findMatches.length;
    scrollToMatch();
    updateHighlight();
  }

  function scrollToMatch() {
    if (findCurrent < 0 || findCurrent >= findMatches.length) return;
    const m = findMatches[findCurrent];
    code.selectionStart = m.start;
    code.selectionEnd = m.end;
    // Scroll into view
    const before = code.value.substring(0, m.start);
    const line = before.split('\n').length;
    const lineH = 20;
    const targetY = (line - 1) * lineH;
    const viewH = code.clientHeight;
    if (targetY < code.scrollTop || targetY > code.scrollTop + viewH - lineH * 2) {
      code.scrollTop = targetY - viewH / 3;
    }
    updateGutter();
  }

  function doReplaceOne() {
    if (findCurrent < 0 || !findMatches.length) return;
    const m = findMatches[findCurrent];
    const rep = replaceInput.value;
    code.selectionStart = m.start;
    code.selectionEnd = m.end;
    code.setRangeText(rep, m.start, m.end, 'end');
    setModified(true); pushUndo();
    doFind();
  }

  function doReplaceAll() {
    if (!findMatches.length) return;
    const rep = replaceInput.value;
    let offset = 0;
    for (const m of findMatches) {
      const s = m.start + offset;
      const e = m.end + offset;
      code.setRangeText(rep, s, e, 'end');
      offset += rep.length - (m.end - m.start);
    }
    setModified(true); pushUndo();
    toast('Replaced ' + findMatches.length + ' occurrences');
    doFind();
  }

  // Wire find UI
  findInput.addEventListener('input', doFind);
  findCaseCheck.addEventListener('change', doFind);
  findRegexCheck.addEventListener('change', doFind);
  document.getElementById('find-next').addEventListener('click', () => findNav(1));
  document.getElementById('find-prev').addEventListener('click', () => findNav(-1));
  document.getElementById('find-close').addEventListener('click', closeFind);
  document.getElementById('find-replace-toggle').addEventListener('click', () => {
    replaceRow.style.display = replaceRow.style.display === 'none' ? 'flex' : 'none';
  });
  document.getElementById('replace-one').addEventListener('click', doReplaceOne);
  document.getElementById('replace-all').addEventListener('click', doReplaceAll);
  findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); findNav(e.shiftKey ? -1 : 1); }
    if (e.key === 'Escape') closeFind();
  });
  replaceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doReplaceOne(); }
    if (e.key === 'Escape') closeFind();
  });

  // Ctrl+F / Ctrl+H global handler (must add to both code and document)
  function handleFindKeys(e) {
    if (e.key === 'f' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); openFind(false); }
    if (e.key === 'h' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); openFind(true); }
    if (e.key === 'Escape' && findOpen) closeFind();
  }
  document.addEventListener('keydown', handleFindKeys);
  code.addEventListener('sc-editor-shortcut', (e) => {
    const key = (e.detail && e.detail.key) || '';
    if (key === 'f') { e.preventDefault(); openFind(false); }
    if (key === 'h') { e.preventDefault(); openFind(true); }
  });

  /* ─── Find Highlight Post-Processor ─── */
  // Wraps find matches and bracket matches into the highlighted HTML
  function postProcessHighlight(html) {
    if (!findMatches.length && bracketA < 0) return html;
    // Build a map: source char index -> what to inject
    const markers = new Map(); // charIndex -> {open:[], close:[]}
    function addMarker(start, end, cls) {
      if (!markers.has(start)) markers.set(start, { open: [], close: [] });
      markers.get(start).open.push(cls);
      if (!markers.has(end)) markers.set(end, { open: [], close: [] });
      markers.get(end).close.push(cls);
    }
    // Find matches
    for (let i = 0; i < findMatches.length; i++) {
      const cls = i === findCurrent ? 'hl-find-current' : 'hl-find-match';
      addMarker(findMatches[i].start, findMatches[i].end, cls);
    }
    // Bracket matches
    if (bracketA >= 0 && bracketB >= 0) {
      addMarker(bracketA, bracketA + 1, 'hl-bracket-match');
      addMarker(bracketB, bracketB + 1, 'hl-bracket-match');
    }
    // Walk through HTML, tracking source char index
    let out = '';
    let ci = 0; // char index in source
    let i = 0;
    while (i < html.length) {
      // Check for close markers at current char index
      const mk = markers.get(ci);
      if (mk && mk.close.length) {
        for (const cls of mk.close) out += '</span>';
        mk.close = [];
      }
      // Check for open markers
      if (mk && mk.open.length) {
        for (const cls of mk.open) out += '<span class="' + cls + '">';
        mk.open = [];
      }
      if (html[i] === '<') {
        // Skip HTML tag entirely (don't increment ci)
        const tagEnd = html.indexOf('>', i);
        if (tagEnd >= 0) { out += html.substring(i, tagEnd + 1); i = tagEnd + 1; continue; }
      }
      if (html[i] === '&') {
        // HTML entity = 1 source char
        const semi = html.indexOf(';', i);
        if (semi >= 0 && semi - i < 10) { out += html.substring(i, semi + 1); i = semi + 1; ci++; continue; }
      }
      out += html[i]; i++; ci++;
    }
    // Close any remaining
    const mkFinal = markers.get(ci);
    if (mkFinal && mkFinal.close.length) {
      for (const cls of mkFinal.close) out += '</span>';
    }
    return out;
  }

  /* ─── Bracket Matching ─── */
  let bracketA = -1, bracketB = -1;

  function updateBracketMatch() {
    bracketA = -1; bracketB = -1;
    const pos = code.selectionStart;
    const src = code.value;
    const ch = src[pos];
    const chPrev = pos > 0 ? src[pos - 1] : '';
    let target = -1, open;
    if (ch === '{' || ch === '(' || ch === '[') { target = pos; open = true; }
    else if (ch === '}' || ch === ')' || ch === ']') { target = pos; open = false; }
    else if (chPrev === '{' || chPrev === '(' || chPrev === '[') { target = pos - 1; open = true; }
    else if (chPrev === '}' || chPrev === ')' || chPrev === ']') { target = pos - 1; open = false; }
    if (target < 0) return;
    const bChar = src[target];
    const pairs = { '{': '}', '(': ')', '[': ']', '}': '{', ')': '(', ']': '[' };
    const match = pairs[bChar];
    if (!match) return;
    let depth = 0;
    if (open) {
      for (let j = target; j < src.length; j++) {
        if (src[j] === bChar) depth++;
        else if (src[j] === match) { depth--; if (depth === 0) { bracketA = target; bracketB = j; return; } }
      }
    } else {
      for (let j = target; j >= 0; j--) {
        if (src[j] === bChar) depth++;
        else if (src[j] === match) { depth--; if (depth === 0) { bracketA = target; bracketB = j; return; } }
      }
    }
  }

  // Patch updateHighlight to include find + bracket post-processing
  const _origHighlight = updateHighlight;
  updateHighlight = function() {
    updateBracketMatch();
    if (usingCodeMirror) {
      cmEditor.setExternalMarks({ findMatches, findCurrent, bracketA, bracketB });
      return;
    }
    highlight.innerHTML = postProcessHighlight(highlightCSS(code.value));
  };

  /* ─── Color Swatches & Picker ─── */
  const colorPicker = document.getElementById('color-picker');
  const colorPickerInput = document.getElementById('color-picker-input');
  const colorPickerText = document.getElementById('color-picker-text');
  let colorEditInfo = null; // {start, end, value}

  // Swatches get pointer-events individually (highlight layer stays pointer-events:none)
  // Use event delegation on the highlight layer for swatch clicks
  highlight.addEventListener('click', (e) => {
    const swatch = e.target.closest('.hl-color-swatch');
    if (swatch) {
      e.stopPropagation();
      const s = parseInt(swatch.dataset.start);
      const en = parseInt(swatch.dataset.end);
      const val = swatch.dataset.color;
      openColorPicker(swatch, s, en, val);
    }
  });

  code.addEventListener('sc-color-swatch-click', (e) => {
    const detail = e.detail || {};
    if (!detail.rect) return;
    openColorPickerAtRect(detail.rect, detail.start, detail.end, detail.color);
  });

  function openColorPicker(swatch, start, end, val) {
    openColorPickerAtRect(swatch.getBoundingClientRect(), start, end, val);
  }

  function openColorPickerAtRect(rect, start, end, val) {
    colorPicker.style.display = 'flex';
    colorPicker.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
    colorPicker.style.top = (rect.bottom + 4) + 'px';
    colorEditInfo = { start, end };
    // Normalize color for the input
    let hex = val;
    if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    try { colorPickerInput.value = hex; } catch { colorPickerInput.value = '#000000'; }
    colorPickerText.value = val;
  }

  function closeColorPicker() {
    colorPicker.style.display = 'none';
    colorEditInfo = null;
    code.focus();
  }

  colorPickerInput.addEventListener('input', () => {
    colorPickerText.value = colorPickerInput.value;
  });

  document.getElementById('color-picker-ok').addEventListener('click', () => {
    if (!colorEditInfo) { closeColorPicker(); return; }
    const newColor = colorPickerText.value;
    code.setRangeText(newColor, colorEditInfo.start, colorEditInfo.end, 'end');
    setModified(true); pushUndo();
    updateHighlight(); updateGutter(); updateStatus();
    closeColorPicker();
  });

  document.addEventListener('click', (e) => {
    if (colorPicker.style.display !== 'none' && !colorPicker.contains(e.target) && !e.target.closest('.hl-color-swatch') && !e.target.closest('.cm-sc-color-swatch')) {
      closeColorPicker();
    }
  });

  // Patch the highlightCSS to insert color swatches
  const _origHighlightCSS = highlightCSS;
  highlightCSS = function(src) {
    if (!src) return '\n';
    let out = '';
    let i = 0;
    const len = src.length;
    let state = 0;

    while (i < len) {
      if (src[i] === '/' && src[i+1] === '*') {
        const end = src.indexOf('*/', i + 2);
        const j = end === -1 ? len : end + 2;
        out += '<span class="hl-comment">' + esc(src.slice(i, j)) + '</span>';
        i = j; continue;
      }
      if (src[i] === '"' || src[i] === "'") {
        const q = src[i];
        let j = i + 1;
        while (j < len && src[j] !== q) { if (src[j] === '\\') j++; j++; }
        j = Math.min(j + 1, len);
        out += '<span class="hl-string">' + esc(src.slice(i, j)) + '</span>';
        i = j; continue;
      }
      if (src[i] === '@' && state === 0) {
        let j = i + 1;
        while (j < len && /[a-zA-Z-]/.test(src[j])) j++;
        out += '<span class="hl-atrule">' + esc(src.slice(i, j)) + '</span>';
        i = j; continue;
      }
      if (src[i] === '{') { out += '<span class="hl-punct">{</span>'; state = 1; i++; continue; }
      if (src[i] === '}') { out += '<span class="hl-punct">}</span>'; state = 0; i++; continue; }
      if (src[i] === ':' && state === 1) { out += '<span class="hl-colon">:</span>'; state = 2; i++; continue; }
      if (src[i] === ';') { out += '<span class="hl-punct">;</span>'; state = 1; i++; continue; }
      if (src[i] === '!' && state === 2 && src.slice(i, i+10) === '!important') {
        out += '<span class="hl-important">!important</span>'; i += 10; continue;
      }
      // Hex color with swatch
      if (src[i] === '#' && state === 2) {
        let j = i + 1;
        while (j < len && /[0-9a-fA-F]/.test(src[j])) j++;
        if (j - i >= 4) {
          const hex = src.slice(i, j);
          out += '<span class="hl-color-swatch" style="background:' + hex + '" data-start="' + i + '" data-end="' + j + '" data-color="' + esc(hex) + '"></span>';
          out += '<span class="hl-number">' + esc(hex) + '</span>';
          i = j; continue;
        }
      }
      if (state === 2 && /[0-9.-]/.test(src[i])) {
        let j = i; if (src[j] === '-') j++; if (src[j] === '.') j++;
        while (j < len && /[0-9.]/.test(src[j])) j++;
        if (j > i && (j > i + 1 || src[i] !== '-')) {
          out += '<span class="hl-number">' + esc(src.slice(i, j)) + '</span>';
          let k = j; while (k < len && /[a-zA-Z%]/.test(src[k])) k++;
          if (k > j) { out += '<span class="hl-unit">' + esc(src.slice(j, k)) + '</span>'; j = k; }
          i = j; continue;
        }
      }
      if (state === 2 && /[a-zA-Z]/.test(src[i])) {
        let j = i; while (j < len && /[a-zA-Z0-9_-]/.test(src[j])) j++;
        const word = src.slice(i, j);
        // Check for rgb/rgba/hsl/hsla function with color swatch
        if (j < len && src[j] === '(' && /^(rgb|rgba|hsl|hsla)$/.test(word)) {
          // Find closing paren
          let pEnd = j + 1, depth = 1;
          while (pEnd < len && depth > 0) { if (src[pEnd] === '(') depth++; if (src[pEnd] === ')') depth--; pEnd++; }
          const full = src.slice(i, pEnd);
          out += '<span class="hl-color-swatch" style="background:' + esc(full) + '" data-start="' + i + '" data-end="' + pEnd + '" data-color="' + esc(full) + '"></span>';
          out += '<span class="hl-func">' + esc(word) + '</span>';
          i = j; continue;
        }
        out += (j < len && src[j] === '(' ? '<span class="hl-func">' : '<span class="hl-value">') + esc(word) + '</span>';
        i = j; continue;
      }
      if (state === 1 && /[a-zA-Z-]/.test(src[i])) {
        let j = i; while (j < len && /[a-zA-Z0-9-]/.test(src[j])) j++;
        out += '<span class="hl-property">' + esc(src.slice(i, j)) + '</span>';
        i = j; continue;
      }
      if (state === 0 && /[a-zA-Z.#\[:*>~+]/.test(src[i])) {
        let j = i;
        while (j < len && src[j] !== '{' && src[j] !== '/' && src[j] !== '\n') j++;
        const sel = src.slice(i, j);
        if (sel.trim()) { out += '<span class="hl-selector">' + esc(sel) + '</span>'; i = j; continue; }
      }
      if (src[i] === '\n') { out += '\n'; i++; continue; }
      out += esc(src[i]); i++;
    }
    return out + '\n';
  };

  // Trigger bracket matching on cursor move
  const origClick = code.onclick;
  code.addEventListener('click', () => { updateHighlight(); });
  code.addEventListener('keyup', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','{','}','(',')','[',']'].includes(e.key)) {
      updateHighlight();
    }
  });

  /* ═══════════════════════════════════════════════
     PHASE 2: Applies To Patterns + Style Metadata
     ═══════════════════════════════════════════════ */

  const apPanel = document.getElementById('applies-panel');
  const apRules = document.getElementById('ap-rules');
  const apAddBtn = document.getElementById('ap-add-rule');
  const apToggleBar = document.getElementById('ap-toggle-bar');
  const apToggleLabel = document.getElementById('ap-toggle-label');
  const metaName = document.getElementById('meta-name');
  const metaDesc = document.getElementById('meta-desc');
  const metaInfo = document.getElementById('meta-info');
  const usercssVarsSection = document.getElementById('usercss-vars-section');
  const usercssVars = document.getElementById('usercss-vars');
  let apPanelOpen = false;

  // Toggle panel
  function setApPanelOpen(open) {
    apPanelOpen = open;
    apPanel.style.display = apPanelOpen ? '' : 'none';
    apToggleBar.classList.toggle('open', apPanelOpen);
    apToggleBar.setAttribute('aria-expanded', apPanelOpen ? 'true' : 'false');
  }
  function toggleApPanel() {
    setApPanelOpen(!apPanelOpen);
  }
  apToggleBar.addEventListener('click', toggleApPanel);
  apToggleBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleApPanel();
    }
  });

  function getAppliesTo() {
    if (!activeDomain || !allData[activeDomain]) return [];
    return allData[activeDomain].appliesTo || [];
  }

  function getMeta() {
    const record = getActiveRecord();
    return (record && record.meta) || {};
  }

  function syncUserCssState(record, source) {
    if (!record || !window.StyleCraftUserCSS) return;
    const parsed = window.StyleCraftUserCSS.parse(source || '');
    if (!parsed.hasMeta && !parsed.variables.length && !parsed.appliesTo.length) {
      delete record.usercss;
      return;
    }
    record.meta = Object.assign({}, parsed.meta || {}, record.meta || {});
    if (parsed.meta.updateURL && !record.sourceUrl) record.sourceUrl = parsed.meta.updateURL;
    if (parsed.meta.updateURL && !record.meta.sourceUrl) record.meta.sourceUrl = parsed.meta.updateURL;
    record.usercss = {
      meta: parsed.meta,
      variables: parsed.variables,
      values: window.StyleCraftUserCSS.mergeValues(parsed.variables, record.usercss && record.usercss.values),
      appliesTo: parsed.appliesTo
    };
    if (!activeThemeId && parsed.appliesTo.length && !(record.appliesTo && record.appliesTo.length)) {
      record.appliesTo = parsed.appliesTo;
    }
  }

  function activeUserCssState(record) {
    if (!record) return null;
    if (record.usercss && Array.isArray(record.usercss.variables) && record.usercss.variables.length) return record.usercss;
    if (!window.StyleCraftUserCSS) return null;
    const parsed = window.StyleCraftUserCSS.parse(code.value || '');
    if (!parsed.variables.length) return null;
    return {
      meta: parsed.meta,
      variables: parsed.variables,
      values: window.StyleCraftUserCSS.mergeValues(parsed.variables, record.usercss && record.usercss.values),
      appliesTo: parsed.appliesTo
    };
  }

  function renderUserCssVariables(record) {
    const state = activeUserCssState(record);
    if (!state || !state.variables || !state.variables.length) {
      usercssVarsSection.style.display = 'none';
      usercssVars.innerHTML = '';
      return;
    }
    usercssVarsSection.style.display = '';
    const values = Object.assign({}, state.values || {});
    usercssVars.innerHTML = state.variables.map(variable => {
      const value = values[variable.name] !== undefined ? values[variable.name] : variable.default;
      const label = esc(variable.label || variable.name);
      const name = esc(variable.name);
      const type = esc(variable.type || 'text');
      let control = '';
      if (variable.type === 'checkbox') {
        control = '<input class="uc-var-control" type="checkbox" aria-label="' + label + '" ' + (value ? 'checked' : '') + '/>';
      } else if ((variable.type === 'select' || variable.type === 'dropdown') && variable.options && variable.options.length) {
        control = '<select class="uc-var-control" aria-label="' + label + '">' + variable.options.map(option => {
          const selected = String(option.value) === String(value) ? ' selected' : '';
          return '<option value="' + esc(option.value) + '"' + selected + '>' + esc(option.label || option.value) + '</option>';
        }).join('') + '</select>';
      } else if (variable.type === 'color' && /^#[0-9a-f]{3,8}$/i.test(String(value))) {
        control = '<input class="uc-var-control" type="color" aria-label="' + label + '" value="' + esc(value) + '"/>';
      } else if (variable.type === 'number' || variable.type === 'range') {
        const min = variable.min !== undefined ? ' min="' + esc(variable.min) + '"' : '';
        const max = variable.max !== undefined ? ' max="' + esc(variable.max) + '"' : '';
        const step = variable.step !== undefined ? ' step="' + esc(variable.step) + '"' : '';
        control = '<input class="uc-var-control" type="number" aria-label="' + label + '" value="' + esc(value) + '"' + min + max + step + '/>';
      } else {
        control = '<input class="uc-var-control" type="text" aria-label="' + label + '" value="' + esc(value) + '" spellcheck="false"/>';
      }
      return '<div class="uc-var" data-name="' + name + '" data-type="' + type + '"><div class="uc-var-label" title="' + label + '">' + label + '</div>' + control + '</div>';
    }).join('');
    usercssVars.querySelectorAll('.uc-var').forEach(row => {
      const input = row.querySelector('.uc-var-control');
      input.addEventListener('change', () => saveUserCssVariable(row.dataset.name, row.dataset.type, input));
    });
  }

  async function saveUserCssVariable(name, type, input) {
    const record = getActiveRecord();
    if (!record) return;
    if (!record.usercss) {
      const state = activeUserCssState(record);
      record.usercss = state || { meta: {}, variables: [], values: {}, appliesTo: [] };
    }
    if (!record.usercss.values) record.usercss.values = {};
    let value = input.value;
    if (type === 'checkbox') value = input.checked;
    else if (type === 'number' || type === 'range') value = Number(input.value);
    record.usercss.values[name] = value;
    if (!record.meta) record.meta = {};
    record.meta.modified = new Date().toISOString();
    await saveAllData(allData);
    notifyTabs();
  }

  function renderAppliesTo() {
    if (!activeDomain) {
      apToggleLabel.textContent = 'Applies To: none';
      apRules.innerHTML = '';
      metaName.value = '';
      metaDesc.value = '';
      metaInfo.textContent = '';
      renderUserCssVariables(null);
      return;
    }

    const patterns = getAppliesTo();
    const meta = getMeta();
    const record = getActiveRecord();

    // Update toggle bar label
    if (patterns.length) {
      const summary = patterns.map(p => p.type + '(' + (p.value.length > 30 ? p.value.slice(0, 30) + '...' : p.value) + ')').join(', ');
      apToggleLabel.textContent = 'Applies To: ' + summary;
    } else {
      apToggleLabel.textContent = 'Applies To: domain(' + activeDomain + ')';
    }

    // Render rules
    let html = '';
    const types = ['domain', 'url', 'url-prefix', 'regexp', 'wildcard'];
    if (patterns.length) {
      for (let i = 0; i < patterns.length; i++) {
        const p = patterns[i];
        html += '<div class="ap-rule" data-idx="' + i + '">';
        html += '<select class="ap-type" aria-label="Pattern type">';
        for (const t of types) html += '<option value="' + t + '"' + (p.type === t ? ' selected' : '') + '>' + t + '</option>';
        html += '</select>';
        html += '<input class="ap-input ap-value" value="' + esc(p.value) + '" spellcheck="false" placeholder="e.g. github.com" aria-label="Pattern value"/>';
        html += '<button class="ap-del" title="Remove" aria-label="Remove pattern">&times;</button>';
        html += '</div>';
      }
    } else {
      // Show implicit domain match as placeholder
      html += '<div class="ap-rule" data-idx="-1">';
      html += '<select class="ap-type" disabled aria-label="Implicit pattern type"><option>domain</option></select>';
      html += '<input class="ap-input ap-value" value="' + esc(activeDomain) + '" disabled style="opacity:0.5" aria-label="Implicit pattern value"/>';
      html += '<span style="font-size:9px;color:var(--sc-faint);white-space:nowrap">implicit</span>';
      html += '</div>';
    }
    apRules.innerHTML = html;

    // Wire rule events
    apRules.querySelectorAll('.ap-rule[data-idx]').forEach(row => {
      const idx = parseInt(row.dataset.idx);
      if (idx < 0) return; // implicit row, not editable

      row.querySelector('.ap-type').addEventListener('change', (e) => {
        patterns[idx].type = e.target.value;
        saveAppliesTo(patterns);
      });
      row.querySelector('.ap-value').addEventListener('change', (e) => {
        patterns[idx].value = e.target.value.trim();
        saveAppliesTo(patterns);
      });
      row.querySelector('.ap-del').addEventListener('click', () => {
        patterns.splice(idx, 1);
        saveAppliesTo(patterns);
        renderAppliesTo();
      });
    });

    // Metadata
    metaName.value = meta.name || '';
    metaDesc.value = meta.description || '';
    const parts = [];
    if (meta.created) parts.push('Created: ' + new Date(meta.created).toLocaleDateString());
    if (meta.modified) parts.push('Modified: ' + new Date(meta.modified).toLocaleDateString());
    if (meta.sourceUrl) parts.push('Source: ' + meta.sourceUrl);
    metaInfo.textContent = parts.join(' · ');
    renderUserCssVariables(record);
  }

  // Add new rule
  apAddBtn.addEventListener('click', () => {
    if (!activeDomain || !allData[activeDomain]) return;
    const patterns = getAppliesTo();
    // If no patterns yet, seed with current domain as first pattern
    if (!patterns.length) {
      patterns.push({ type: 'domain', value: activeDomain });
    }
    patterns.push({ type: 'domain', value: '' });
    saveAppliesTo(patterns);
    renderAppliesTo();
    // Focus the new input
    const inputs = apRules.querySelectorAll('.ap-value:not([disabled])');
    if (inputs.length) inputs[inputs.length - 1].focus();
  });

  async function saveAppliesTo(patterns) {
    if (!activeDomain || !allData[activeDomain]) return;
    allData[activeDomain].appliesTo = patterns.filter(p => p.value.trim());
    if (!allData[activeDomain].meta) allData[activeDomain].meta = {};
    allData[activeDomain].meta.modified = new Date().toISOString();
    await saveAllData(allData);
    notifyTabs();
    renderAppliesTo();
  }

  // Metadata save on blur
  metaName.addEventListener('change', async () => {
    const record = getActiveRecord();
    if (!record) return;
    if (!record.meta) record.meta = {};
    record.meta.name = metaName.value.trim();
    record.meta.modified = new Date().toISOString();
    await saveAllData(allData);
    renderSidebar();
  });
  metaDesc.addEventListener('change', async () => {
    const record = getActiveRecord();
    if (!record) return;
    if (!record.meta) record.meta = {};
    record.meta.description = metaDesc.value.trim();
    record.meta.modified = new Date().toISOString();
    await saveAllData(allData);
  });

  // Hook into selectItem to update the applies-to panel
  const _origSelectItem = selectItem;
  selectItem = function(domain, themeId) {
    _origSelectItem(domain, themeId);
    renderAppliesTo();
  };

  // Hook into new domain creation to add initial metadata
  const _origAddDomain = document.getElementById('btn-add-domain');
  // Patch: when a new domain is added, set created date
  const _origNewDomainHandler = document.getElementById('new-domain-input');
  const origKeydownHandler = _origNewDomainHandler.onkeydown;
  _origNewDomainHandler.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const d = _origNewDomainHandler.value.trim();
      // After the domain is created, add metadata
      setTimeout(() => {
        if (d && allData[d]) {
          if (!allData[d].meta) allData[d].meta = { created: new Date().toISOString(), modified: new Date().toISOString() };
          saveAllData(allData);
          renderAppliesTo();
        }
      }, 100);
    }
  });

  // Update sidebar to show meta name if available
  const _origRenderSidebar = renderSidebar;
  renderSidebar = function() {
    _origRenderSidebar();
    // After render, patch domain names with meta names
    domainList.querySelectorAll('.sb-domain').forEach(el => {
      const d = el.dataset.domain;
      if (d && allData[d] && allData[d].meta && allData[d].meta.name) {
        const nameEl = el.querySelector('.sb-domain-header .name');
        if (nameEl) nameEl.textContent = allData[d].meta.name;
      }
    });
  };

  // Initial render
  renderAppliesTo();

  /* ═══════════════════════════════════════════════
     PHASE 4: Code Folding + CSS Linting
     ═══════════════════════════════════════════════ */

  /* ─── Code Folding ─── */
  let foldedRanges = []; // [{start: lineNum, end: lineNum}, ...]

  function findFoldRanges(text) {
    const lines = text.split('\n');
    const ranges = [];
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trimEnd();
      if (trimmed.endsWith('{')) {
        let depth = 1, j = i + 1;
        while (j < lines.length && depth > 0) {
          for (const ch of lines[j]) {
            if (ch === '{') depth++;
            else if (ch === '}') { depth--; if (depth === 0) break; }
          }
          if (depth > 0) j++;
          else break;
        }
        if (j > i + 1 && j < lines.length) ranges.push({ start: i + 1, end: j + 1 }); // 1-indexed
      }
    }
    return ranges;
  }

  function isFolded(lineNum) {
    return foldedRanges.some(r => r.start === lineNum);
  }

  function isInsideFold(lineNum) {
    return foldedRanges.some(r => lineNum > r.start && lineNum <= r.end);
  }

  function toggleFold(lineNum) {
    const idx = foldedRanges.findIndex(r => r.start === lineNum);
    if (idx >= 0) {
      foldedRanges.splice(idx, 1);
    } else {
      const ranges = findFoldRanges(code.value);
      const range = ranges.find(r => r.start === lineNum);
      if (range) foldedRanges.push(range);
    }
    updateHighlight();
    updateGutter();
  }

  // Override updateGutter to add fold buttons + lint dots
  const _origUpdateGutter = updateGutter;
  updateGutter = function() {
    if (usingCodeMirror) {
      gutterInner.innerHTML = '';
      return;
    }
    const lines = code.value.split('\n');
    const curLine = code.value.substring(0, code.selectionStart).split('\n').length;
    const foldable = findFoldRanges(code.value);
    const foldableSet = new Set(foldable.map(r => r.start));

    let html = '';
    for (let i = 1; i <= lines.length; i++) {
      if (isInsideFold(i)) continue; // skip lines inside folded regions

      const isActive = i === curLine ? ' active' : '';
      const lint = lintByLine[i];
      let lintDot = '';
      if (lint) {
        const cls = lint.some(l => l.severity === 'error') ? 'lint-error' : 'lint-warning';
        const msg = lint.map(l => l.message).join('; ');
        lintDot = '<span class="lint-dot ' + cls + '" title="' + esc(msg) + '"></span>';
      }

      let foldBtn = '';
      if (foldableSet.has(i)) {
        const folded = isFolded(i);
        foldBtn = '<button class="fold-btn' + (folded ? ' collapsed' : '') + '" data-fold="' + i + '">' + (folded ? '+' : '-') + '</button>';
      }
      html += '<span class="ln' + isActive + '">' + foldBtn + i + lintDot + '</span>';
    }
    gutterInner.innerHTML = html;

    // Wire fold buttons
    gutterInner.querySelectorAll('.fold-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFold(parseInt(btn.dataset.fold));
      });
    });
  };

  // Override updateHighlight to hide folded lines
  const _p4OrigUpdateHighlight = updateHighlight;
  updateHighlight = function() {
    _p4OrigUpdateHighlight();
    if (usingCodeMirror) return;
    if (foldedRanges.length > 0) {
      // Post-process: hide folded lines in highlight
      const lines = highlight.innerHTML.split('\n');
      const srcLines = code.value.split('\n');
      let out = [];
      for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        if (isInsideFold(lineNum)) continue;
        out.push(lines[i]);
        if (isFolded(lineNum)) {
          const range = foldedRanges.find(r => r.start === lineNum);
          if (range) {
            out.push('<span class="fold-placeholder"> ... ' + (range.end - range.start) + ' lines folded ... </span>');
          }
        }
      }
      highlight.innerHTML = out.join('\n');
    }
    updateGutter();
  };

  /* ─── CSS Linting ─── */
  let lintByLine = {}; // { lineNum: [{severity, message}] }
  let lintResults = [];
  const lintToggle = document.getElementById('lint-toggle');
  const lintPanel = document.getElementById('lint-panel');
  const lintSummary = document.getElementById('lint-summary');

  function lintCSS(text) {
    const results = [];
    const lines = text.split('\n');
    let depth = 0;
    let inComment = false;
    let openBraceLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const ln = i + 1;

      // Track comments
      let j = 0;
      let stripped = '';
      while (j < line.length) {
        if (inComment) {
          if (line[j] === '*' && line[j + 1] === '/') { inComment = false; j += 2; continue; }
          j++; continue;
        }
        if (line[j] === '/' && line[j + 1] === '*') { inComment = true; j += 2; continue; }
        stripped += line[j];
        j++;
      }

      const trimmed = stripped.trim();
      if (!trimmed) continue;

      // Track braces
      for (const ch of stripped) {
        if (ch === '{') { depth++; openBraceLines.push(ln); }
        if (ch === '}') { depth--; openBraceLines.pop(); }
      }

      if (depth < 0) {
        results.push({ line: ln, severity: 'error', message: 'Unexpected closing brace' });
        depth = 0;
      }

      // Check for missing semicolons in property lines (inside rules)
      if (depth > 0 && trimmed.includes(':') && !trimmed.endsWith('{') && !trimmed.endsWith('}') && !trimmed.endsWith(';') && !trimmed.endsWith(',') && !trimmed.startsWith('@') && !trimmed.startsWith('//')) {
        results.push({ line: ln, severity: 'warning', message: 'Missing semicolon' });
      }

      // Empty rule: "{}" on same line
      if (trimmed.match(/\{\s*\}/) && !trimmed.startsWith('@')) {
        results.push({ line: ln, severity: 'warning', message: 'Empty rule' });
      }

      // !important usage (info)
      if (trimmed.includes('!important') && depth > 0) {
        // Don't flag -- just track, it's intentional in user styles
      }

      // Duplicate properties within same rule (simple detection)
      // (skip for now -- requires multi-line state tracking)

      // Invalid hex color
      const hexMatch = stripped.match(/#([0-9a-fA-F]+)(?![0-9a-fA-F;,)\s])/g);
      if (hexMatch) {
        for (const h of hexMatch) {
          const hex = h.slice(1);
          if (![3, 4, 6, 8].includes(hex.length)) {
            results.push({ line: ln, severity: 'error', message: 'Invalid hex color: ' + h });
          }
        }
      }

      // Check for common typos in properties
      if (depth > 0 && trimmed.includes(':')) {
        const prop = trimmed.split(':')[0].trim().replace(/^-webkit-|-moz-|-ms-|-o-/, '');
        const typos = { 'colr': 'color', 'backgroud': 'background', 'heigth': 'height', 'widht': 'width', 'marign': 'margin', 'pading': 'padding', 'positon': 'position', 'dispaly': 'display', 'flaot': 'float', 'bordr': 'border', 'fonr': 'font' };
        if (typos[prop]) {
          results.push({ line: ln, severity: 'warning', message: 'Possible typo: "' + prop + '" (did you mean "' + typos[prop] + '"?)' });
        }
      }
    }

    // Unclosed braces
    if (depth > 0 && openBraceLines.length) {
      results.push({ line: openBraceLines[openBraceLines.length - 1], severity: 'error', message: 'Unclosed brace (' + depth + ' unclosed)' });
    }

    return results;
  }

  function runLint() {
    if (sourceMode !== 'css') {
      lintResults = [];
      lintByLine = {};
      lintSummary.textContent = sourceMode.toUpperCase() + ': compile on save/live preview';
      lintPanel.innerHTML = '<div class="lint-row"><span class="lint-msg" style="color:var(--sc-green)">Compiled CSS is validated when saved or previewed</span></div>';
      updateGutter();
      return;
    }
    lintResults = lintCSS(code.value);
    lintByLine = {};
    for (const r of lintResults) {
      if (!lintByLine[r.line]) lintByLine[r.line] = [];
      lintByLine[r.line].push(r);
    }

    const errors = lintResults.filter(r => r.severity === 'error').length;
    const warnings = lintResults.filter(r => r.severity === 'warning').length;
    if (errors + warnings === 0) {
      lintSummary.textContent = 'Lint: no issues';
    } else {
      lintSummary.textContent = 'Lint: ' + (errors ? errors + ' error' + (errors > 1 ? 's' : '') : '') + (errors && warnings ? ', ' : '') + (warnings ? warnings + ' warning' + (warnings > 1 ? 's' : '') : '');
    }

    // Render lint panel
    if (lintResults.length) {
      lintPanel.innerHTML = lintResults.map(r => {
        return '<div class="lint-row" data-line="' + r.line + '"><span class="lint-icon ' + r.severity + '"></span><span class="lint-loc">Ln ' + r.line + '</span><span class="lint-msg">' + esc(r.message) + '</span></div>';
      }).join('');

      lintPanel.querySelectorAll('.lint-row').forEach(row => {
        row.addEventListener('click', () => {
          const ln = parseInt(row.dataset.line);
          const lines = code.value.split('\n');
          let pos = 0;
          for (let i = 0; i < ln - 1 && i < lines.length; i++) pos += lines[i].length + 1;
          code.setSelectionRange(pos, pos + (lines[ln - 1] || '').length);
          code.focus();
          // Scroll to line
          const lineH = 20;
          code.scrollTop = Math.max(0, (ln - 5) * lineH);
        });
      });
    } else {
      lintPanel.innerHTML = '<div class="lint-row"><span class="lint-msg" style="color:var(--sc-green)">No issues found</span></div>';
    }
  }

  // Toggle lint panel
  function toggleLintPanel() {
    const open = !lintPanel.classList.contains('active');
    lintPanel.classList.toggle('active', open);
    lintToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  lintToggle.addEventListener('click', toggleLintPanel);
  lintToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleLintPanel();
    }
  });

  // Run lint on content changes with debounce
  let lintTimer = null;
  const origCodeInput = code.oninput;
  code.addEventListener('input', () => {
    clearTimeout(lintTimer);
    lintTimer = setTimeout(runLint, 500);
  });

  // Initial lint
  runLint();

  /* ─── Help / Shortcuts overlay ─── */
  const helpOverlay = document.getElementById('shortcuts-overlay');
  const helpBtn = document.getElementById('btn-help');
  const helpClose = document.getElementById('shortcuts-close');
  let helpReturnFocus = null;
  function openHelpOverlay() {
    helpReturnFocus = document.activeElement;
    helpOverlay.style.display = '';
    helpBtn.setAttribute('aria-expanded', 'true');
    helpClose.focus();
  }
  function closeHelpOverlay() {
    if (helpOverlay.style.display === 'none') return;
    helpOverlay.style.display = 'none';
    helpBtn.setAttribute('aria-expanded', 'false');
    const target = helpReturnFocus && typeof helpReturnFocus.focus === 'function' ? helpReturnFocus : helpBtn;
    helpReturnFocus = null;
    target.focus();
  }
  helpBtn.addEventListener('click', () => {
    if (helpOverlay.style.display === 'none') openHelpOverlay();
    else closeHelpOverlay();
  });
  helpClose.addEventListener('click', closeHelpOverlay);
  helpOverlay.addEventListener('click', (e) => {
    if (e.target === helpOverlay) closeHelpOverlay();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && helpOverlay.style.display !== 'none') {
      e.preventDefault();
      closeHelpOverlay();
    }
  });
})();
