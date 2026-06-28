/* StyleCraft v1.6.0 — Options Page */
(async function(){
  const $=id=>document.getElementById(id);
  const send=msg=>new Promise(r=>chrome.runtime.sendMessage(msg,r));

  /* ─── Direct storage helpers (bypass background worker entirely) ─── */
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
  async function loadSettings() {
    const d = await chrome.storage.local.get('stylecraft_settings');
    return d.stylecraft_settings || {};
  }
  async function saveSettings(s) {
    await chrome.storage.local.set({ stylecraft_settings: s });
  }
  async function saveDomainData(domain, data) {
    const all = await loadAllData();
    all[domain] = data;
    await saveAllData(all);
  }

  /* ─── Undo system ─── */
  let undoSnapshot = null;
  let undoTimer = null;
  function snapshotForUndo(label) {
    undoSnapshot = { data: JSON.parse(JSON.stringify(allData)), label };
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { undoSnapshot = null; }, 8000);
  }
  function showUndoToast(msg) {
    const el = $('toast');
    el.innerHTML = esc(msg) + ' <button id="undo-toast-btn" style="margin-left:10px;padding:2px 10px;border-radius:4px;background:rgba(203,166,247,0.2);border:1px solid rgba(203,166,247,0.3);color:#cba6f7;cursor:pointer;font-weight:700;font-size:11px">Undo</button>';
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 6000);
    const btn = $('undo-toast-btn');
    if (btn) btn.addEventListener('click', async () => {
      if (!undoSnapshot) { toast('Undo expired'); return; }
      allData = undoSnapshot.data;
      await saveAllData(allData);
      notifyTabs('*');
      renderStyles(); renderThemes(); updateStats();
      undoSnapshot = null;
      el.classList.remove('show');
      toast('Undone: ' + undoSnapshot?.label || 'action');
    });
  }

  /* ─── Single domain export ─── */
  function exportSingleDomain(domain) {
    const data = allData[domain];
    if (!data) { toast('No data for ' + domain); return; }
    const exp = { domain, data, version: '1.6.0', exported: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exp, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'stylecraft-' + domain.replace(/[^a-zA-Z0-9.-]/g, '_') + '.json';
    a.click(); URL.revokeObjectURL(url);
    toast('Exported styles for ' + domain);
  }

  function notifyTabs(domain) {
    chrome.tabs.query({}, tabs => tabs.forEach(t => {
      if (!t.url || t.url.startsWith('chrome') || t.url.startsWith('about:') || t.url.startsWith('edge:')) return;
      chrome.tabs.sendMessage(t.id, { action: 'sc-styles-updated', domain }).catch(() => {});
    }));
  }

  /* Tabs */
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
      $('tab-'+btn.dataset.tab).classList.add('active');
    });
  });

  /* Load */
  let allData = await loadAllData();
  let settings = await loadSettings();

  // Apply theme
  SC_APPLY_THEME(settings.theme || 'catppuccin');

  // Theme dropdown in settings
  const themeSelect=$('set-theme');
  if(themeSelect){
    themeSelect.value=settings.theme||'catppuccin';
    themeSelect.addEventListener('change',()=>{
      settings.theme=themeSelect.value;
      SC_APPLY_THEME(themeSelect.value);
      saveSettings(settings);
      chrome.runtime.sendMessage({action:'sc-theme-changed',theme:themeSelect.value}).catch(()=>{});
    });
  }

  // Listen for theme changes from other UIs
  chrome.runtime.onMessage.addListener((msg)=>{
    if(msg.action==='sc-theme-changed'&&msg.theme){
      SC_APPLY_THEME(msg.theme);
      if(themeSelect)themeSelect.value=msg.theme;
      settings.theme=msg.theme;
    }
  });

  /* Stats */
  function updateStats(){
    const domains=Object.keys(allData);
    let tc=0,cl=0;
    for(const d of domains){
      tc+=Object.keys(allData[d].themes||{}).length;
      cl+=(allData[d].customCSS||'').split('\n').filter(l=>l.trim()).length;
    }
    $('stat-sites').textContent=domains.length;
    $('stat-themes').textContent=tc;
    $('stat-css').textContent=cl;
  }
  updateStats();

  chrome.storage.local.getBytesInUse(null,bytes=>{
    const kb=(bytes/1024).toFixed(1);
    $('storage-size').textContent=kb+' KB';
    $('storage-desc').textContent=bytes>100000?'Consider exporting and cleaning old styles':'Healthy';
  });

  /* ─── CUSTOM CSS TAB ─── */
  let stylesSelected = new Set();

  function getStylesSort() { return ($('styles-sort') || {}).value || 'domain-asc'; }
  function getStylesFilter() { return ($('styles-filter') || {}).value || 'all'; }

  function renderStyles(search) {
    if (search === undefined) search = $('search-styles').value;
    const list = $('styles-list');
    let entries = Object.entries(allData).filter(([d, data]) => {
      if (!(data.customCSS || '').trim()) return false;
      if (search && !d.toLowerCase().includes(search.toLowerCase())) return false;
      const f = getStylesFilter();
      if (f === 'enabled' && data.customEnabled === false) return false;
      if (f === 'disabled' && data.customEnabled !== false) return false;
      return true;
    });

    // Sort
    const sort = getStylesSort();
    entries.sort((a, b) => {
      switch (sort) {
        case 'domain-desc': return b[0].localeCompare(a[0]);
        case 'lines-desc': return (b[1].customCSS || '').split('\n').length - (a[1].customCSS || '').split('\n').length;
        case 'lines-asc': return (a[1].customCSS || '').split('\n').length - (b[1].customCSS || '').split('\n').length;
        case 'modified-desc': return ((b[1].meta || {}).modified || '').localeCompare((a[1].meta || {}).modified || '');
        default: return a[0].localeCompare(b[0]);
      }
    });

    if (!entries.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#x1F3A8;</div><div class="empty-text">' + (search ? 'No matching styles' : 'No custom CSS saved yet.') + '</div></div>';
      updateStylesBulkCount();
      return;
    }

    list.innerHTML = entries.map(([domain, data]) => {
      const lines = (data.customCSS || '').split('\n').length;
      const checked = stylesSelected.has(domain) ? ' checked' : '';
      const metaName = (data.meta && data.meta.name) ? ' (' + esc(data.meta.name) + ')' : '';
      return '<div class="card" data-domain="' + esc(domain) + '"><div class="card-header"><div class="card-header-left"><input type="checkbox" class="card-check style-check"' + checked + '/><div><div class="card-domain">' + esc(domain) + metaName + '</div><div class="card-meta">' + lines + ' lines &middot; Custom CSS ' + (data.customEnabled !== false ? 'enabled' : 'disabled') + '</div></div></div><div class="card-actions"><label class="toggle"><input type="checkbox" class="toggle-custom" ' + (data.customEnabled !== false ? 'checked' : '') + '/><span class="toggle-sl"></span></label><button class="card-btn export-single-btn" title="Export this style"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button><button class="card-btn clone-btn" title="Clone to another domain"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button><button class="card-btn edit-btn" title="Edit"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button><button class="card-btn danger delete-btn" title="Delete"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></div></div><div class="card-body"><textarea class="editor-area css-ed" spellcheck="false">' + esc(data.customCSS || '') + '</textarea><div class="editor-row"><button class="save-btn save-css">Save</button></div></div></div>';
    }).join('');
    wireStyleCards();
    updateStylesBulkCount();
  }

  function wireStyleCards() {
    $('styles-list').querySelectorAll('.card').forEach(card => {
      const domain = card.dataset.domain;
      card.querySelector('.style-check').addEventListener('change', e => {
        if (e.target.checked) stylesSelected.add(domain); else stylesSelected.delete(domain);
        updateStylesBulkCount();
      });
      card.querySelector('.edit-btn').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('editor.html#' + encodeURIComponent(domain)) }));
      card.querySelector('.export-single-btn').addEventListener('click', () => exportSingleDomain(domain));
      card.querySelector('.toggle-custom').addEventListener('change', async e => {
        allData[domain].customEnabled = e.target.checked;
        await saveDomainData(domain, allData[domain]);
        notifyTabs(domain);
      });
      card.querySelector('.delete-btn').addEventListener('click', async () => {
        snapshotForUndo('Delete CSS for ' + domain);
        allData[domain].customCSS = '';
        await saveDomainData(domain, allData[domain]);
        notifyTabs(domain);
        stylesSelected.delete(domain);
        renderStyles(); updateStats(); showUndoToast('Deleted CSS for ' + domain);
      });
      card.querySelector('.clone-btn').addEventListener('click', () => {
        const target = prompt('Clone CSS to domain:');
        if (!target || !target.trim()) return;
        const t = target.trim();
        if (!allData[t]) allData[t] = { themes: {}, customCSS: '', customEnabled: true };
        allData[t].customCSS = allData[domain].customCSS;
        allData[t].customEnabled = true;
        saveAllData(allData).then(() => { notifyTabs(t); renderStyles(); updateStats(); toast('Cloned to ' + t); });
      });
      const sb = card.querySelector('.save-css');
      if (sb) sb.addEventListener('click', async () => {
        const css = card.querySelector('.css-ed').value;
        allData[domain].customCSS = css;
        await saveDomainData(domain, allData[domain]);
        notifyTabs(domain);
        toast('Saved CSS for ' + domain); updateStats();
      });
    });
  }

  function updateStylesBulkCount() {
    const el = $('styles-sel-count');
    if (el) el.textContent = stylesSelected.size;
  }

  renderStyles();
  $('search-styles').addEventListener('input', () => renderStyles());
  $('styles-sort').addEventListener('change', () => renderStyles());
  $('styles-filter').addEventListener('change', () => renderStyles());

  $('styles-select-all').addEventListener('change', e => {
    stylesSelected.clear();
    if (e.target.checked) {
      $('styles-list').querySelectorAll('.card').forEach(c => stylesSelected.add(c.dataset.domain));
    }
    $('styles-list').querySelectorAll('.style-check').forEach(cb => cb.checked = e.target.checked);
    updateStylesBulkCount();
  });

  $('styles-bulk-enable').addEventListener('click', async () => {
    if (!stylesSelected.size) return;
    for (const d of stylesSelected) { if (allData[d]) allData[d].customEnabled = true; }
    await saveAllData(allData); notifyTabs('*');
    toast('Enabled ' + stylesSelected.size + ' styles'); renderStyles();
  });
  $('styles-bulk-disable').addEventListener('click', async () => {
    if (!stylesSelected.size) return;
    for (const d of stylesSelected) { if (allData[d]) allData[d].customEnabled = false; }
    await saveAllData(allData); notifyTabs('*');
    toast('Disabled ' + stylesSelected.size + ' styles'); renderStyles();
  });
  $('styles-bulk-delete').addEventListener('click', async () => {
    if (!stylesSelected.size) return;
    snapshotForUndo('Delete ' + stylesSelected.size + ' styles');
    for (const d of stylesSelected) { if (allData[d]) allData[d].customCSS = ''; }
    await saveAllData(allData); notifyTabs('*');
    showUndoToast('Deleted ' + stylesSelected.size + ' styles');
    stylesSelected.clear(); renderStyles(); updateStats();
  });

  /* ─── THEMES TAB ─── */
  let themesSelected = new Set(); // stores "domain|id" keys
  let themeUpdates = {}; // { "domain|id": { hasUpdate: bool, newCSS: '' } }

  function getThemesSort() { return ($('themes-sort') || {}).value || 'name-asc'; }
  function getThemesFilter() { return ($('themes-filter') || {}).value || 'all'; }

  function renderThemes(search) {
    if (search === undefined) search = $('search-themes').value;
    const list = $('themes-list');
    let entries = [];
    for (const [domain, data] of Object.entries(allData)) {
      for (const [id, theme] of Object.entries(data.themes || {})) {
        if (search && !(theme.name || '').toLowerCase().includes(search.toLowerCase()) && !domain.toLowerCase().includes(search.toLowerCase())) continue;
        const f = getThemesFilter();
        if (f === 'enabled' && theme.enabled === false) continue;
        if (f === 'disabled' && theme.enabled !== false) continue;
        const key = domain + '|' + id;
        if (f === 'has-update' && !(themeUpdates[key] && themeUpdates[key].hasUpdate)) continue;
        entries.push({ domain, id, theme, key });
      }
    }

    // Sort
    const sort = getThemesSort();
    entries.sort((a, b) => {
      switch (sort) {
        case 'name-desc': return (b.theme.name || '').localeCompare(a.theme.name || '');
        case 'domain-asc': return a.domain.localeCompare(b.domain);
        case 'lines-desc': return ((b.theme.rawCSS || b.theme.css || '').match(/\n/g) || []).length - ((a.theme.rawCSS || a.theme.css || '').match(/\n/g) || []).length;
        case 'installed-desc': return ((b.theme.installedAt || '').localeCompare(a.theme.installedAt || ''));
        default: return (a.theme.name || '').localeCompare(b.theme.name || '');
      }
    });

    if (!entries.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#x1F3A8;</div><div class="empty-text">' + (search ? 'No matching themes' : 'No themes installed.') + '</div></div>';
      updateThemesBulkCount();
      return;
    }

    list.innerHTML = entries.map(({ domain, id, theme, key }) => {
      const lines = ((theme.rawCSS || theme.css || '').match(/\n/g) || []).length + 1;
      const src = theme.source === 'stylus-import' ? 'Stylus' : 'USw #' + esc(id);
      const checked = themesSelected.has(key) ? ' checked' : '';
      const upd = themeUpdates[key];
      let updateBadge = '';
      if (upd && upd.hasUpdate) updateBadge = '<span class="update-badge">Update available</span>';
      else if (upd && !upd.hasUpdate) updateBadge = '<span class="update-badge uptodate">Up to date</span>';
      const updateBtn = (upd && upd.hasUpdate) ? '<button class="card-btn update-btn" title="Apply update" style="color:var(--sc-yellow)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>' : '';

      return '<div class="card" data-domain="' + esc(domain) + '" data-id="' + esc(id) + '" data-key="' + esc(key) + '"><div class="card-header"><div class="card-header-left"><input type="checkbox" class="card-check theme-check"' + checked + '/><div><div class="theme-domain">' + esc(domain) + '</div><div class="theme-name">' + esc(theme.name || 'Theme #' + id) + ' ' + updateBadge + '</div><div class="card-meta">' + lines + ' lines &middot; ' + src + ' &middot; ' + (theme.enabled !== false ? 'Enabled' : 'Disabled') + (theme.installedAt ? ' &middot; Installed ' + new Date(theme.installedAt).toLocaleDateString() : '') + '</div></div></div><div class="card-actions">' + updateBtn + '<label class="toggle"><input type="checkbox" class="toggle-theme" ' + (theme.enabled !== false ? 'checked' : '') + '/><span class="toggle-sl"></span></label><button class="card-btn clone-btn" title="Clone to another domain"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button><button class="card-btn edit-btn" title="Edit CSS"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button><button class="card-btn danger delete-btn" title="Uninstall"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></div></div><div class="card-body"><textarea class="editor-area theme-ed" spellcheck="false">' + esc(theme.rawCSS || theme.css || '') + '</textarea><div class="editor-row"><button class="save-btn save-theme">Save Theme CSS</button></div></div></div>';
    }).join('');
    wireThemeCards();
    updateThemesBulkCount();
  }

  function wireThemeCards() {
    $('themes-list').querySelectorAll('.card').forEach(card => {
      const domain = card.dataset.domain, id = card.dataset.id, key = card.dataset.key;
      card.querySelector('.theme-check').addEventListener('change', e => {
        if (e.target.checked) themesSelected.add(key); else themesSelected.delete(key);
        updateThemesBulkCount();
      });
      card.querySelector('.edit-btn').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('editor.html#' + encodeURIComponent(domain) + '/theme/' + encodeURIComponent(id)) }));
      card.querySelector('.toggle-theme').addEventListener('change', async e => {
        allData[domain].themes[id].enabled = e.target.checked;
        await saveDomainData(domain, allData[domain]);
        notifyTabs(domain);
      });
      card.querySelector('.delete-btn').addEventListener('click', async () => {
        snapshotForUndo('Uninstall theme');
        delete allData[domain].themes[id];
        if (!Object.keys(allData[domain].themes).length && !(allData[domain].customCSS || '').trim()) delete allData[domain];
        await saveAllData(allData);
        notifyTabs(domain);
        themesSelected.delete(key);
        renderThemes(); updateStats(); showUndoToast('Uninstalled theme');
      });
      card.querySelector('.clone-btn').addEventListener('click', () => {
        const target = prompt('Clone theme to domain:');
        if (!target || !target.trim()) return;
        const t = target.trim();
        const theme = allData[domain].themes[id];
        if (!allData[t]) allData[t] = { themes: {}, customCSS: '', customEnabled: true };
        if (!allData[t].themes) allData[t].themes = {};
        const newId = id + '-clone-' + Date.now().toString(36);
        allData[t].themes[newId] = JSON.parse(JSON.stringify(theme));
        allData[t].themes[newId].name = (theme.name || 'Theme') + ' (clone)';
        saveAllData(allData).then(() => { notifyTabs(t); renderThemes(); updateStats(); toast('Cloned to ' + t); });
      });
      const updBtn = card.querySelector('.update-btn');
      if (updBtn) {
        updBtn.addEventListener('click', async () => {
          const upd = themeUpdates[key];
          if (!upd || !upd.newCSS) return;
          allData[domain].themes[id].rawCSS = upd.newCSS;
          allData[domain].themes[id].css = upd.newCSS;
          allData[domain].themes[id].updatedAt = new Date().toISOString();
          await saveAllData(allData); notifyTabs(domain);
          delete themeUpdates[key];
          renderThemes(); toast('Updated: ' + (allData[domain].themes[id].name || id));
        });
      }
      const sb = card.querySelector('.save-theme');
      if (sb) sb.addEventListener('click', async () => {
        const css = card.querySelector('.theme-ed').value;
        allData[domain].themes[id].rawCSS = css;
        allData[domain].themes[id].css = css;
        await saveDomainData(domain, allData[domain]);
        notifyTabs(domain);
        toast('Theme CSS saved');
      });
    });
  }

  function updateThemesBulkCount() {
    const el = $('themes-sel-count');
    if (el) el.textContent = themesSelected.size;
  }

  renderThemes();
  $('search-themes').addEventListener('input', () => renderThemes());
  $('themes-sort').addEventListener('change', () => renderThemes());
  $('themes-filter').addEventListener('change', () => renderThemes());

  $('themes-select-all').addEventListener('change', e => {
    themesSelected.clear();
    if (e.target.checked) {
      $('themes-list').querySelectorAll('.card').forEach(c => themesSelected.add(c.dataset.key));
    }
    $('themes-list').querySelectorAll('.theme-check').forEach(cb => cb.checked = e.target.checked);
    updateThemesBulkCount();
  });

  $('themes-bulk-enable').addEventListener('click', async () => {
    if (!themesSelected.size) return;
    for (const k of themesSelected) {
      const [d, i] = k.split('|');
      if (allData[d] && allData[d].themes && allData[d].themes[i]) allData[d].themes[i].enabled = true;
    }
    await saveAllData(allData); notifyTabs('*');
    toast('Enabled ' + themesSelected.size + ' themes'); renderThemes();
  });
  $('themes-bulk-disable').addEventListener('click', async () => {
    if (!themesSelected.size) return;
    for (const k of themesSelected) {
      const [d, i] = k.split('|');
      if (allData[d] && allData[d].themes && allData[d].themes[i]) allData[d].themes[i].enabled = false;
    }
    await saveAllData(allData); notifyTabs('*');
    toast('Disabled ' + themesSelected.size + ' themes'); renderThemes();
  });
  $('themes-bulk-delete').addEventListener('click', async () => {
    if (!themesSelected.size) return;
    snapshotForUndo('Delete themes');
    let count = 0;
    for (const k of themesSelected) {
      const [d, i] = k.split('|');
      if (allData[d] && allData[d].themes && allData[d].themes[i]) { delete allData[d].themes[i]; count++; }
      if (allData[d] && !Object.keys(allData[d].themes || {}).length && !(allData[d].customCSS || '').trim()) delete allData[d];
    }
    await saveAllData(allData); notifyTabs('*');
    showUndoToast('Deleted ' + count + ' themes');
    themesSelected.clear(); renderThemes(); updateStats();
  });

  /* Auto-update check for USw themes */
  $('themes-check-updates').addEventListener('click', async () => {
    const btn = $('themes-check-updates');
    btn.disabled = true; btn.textContent = 'Checking...';
    themeUpdates = {};
    let checked = 0, updates = 0;
    for (const [domain, data] of Object.entries(allData)) {
      for (const [id, theme] of Object.entries(data.themes || {})) {
        if (theme.source === 'stylus-import') continue; // skip Stylus imports
        if (!/^\d+$/.test(id)) continue; // only numeric USw IDs
        checked++;
        try {
          const res = await send({ action: 'sc-check-theme-update', id });
          const key = domain + '|' + id;
          if (res && res.css) {
            const current = (theme.rawCSS || theme.css || '').trim();
            const remote = res.css.trim();
            themeUpdates[key] = { hasUpdate: current !== remote, newCSS: remote };
            if (current !== remote) updates++;
          }
        } catch {}
        // Rate limit: small delay between checks
        await new Promise(r => setTimeout(r, 300));
      }
    }
    btn.disabled = false;
    btn.textContent = 'Check Updates';
    renderThemes();
    toast('Checked ' + checked + ' themes: ' + updates + ' update' + (updates !== 1 ? 's' : '') + ' available');
  });

  /* ─── GLOBAL CSS ─── */
  $('global-css').value=settings.globalCSS||'';
  $('save-global').addEventListener('click',async()=>{
    settings.globalCSS=$('global-css').value;
    await saveSettings(settings);
    notifyTabs('*');
    toast('Global CSS saved');
  });

  /* ─── SETTINGS ─── */
  $('set-panel-width').value=settings.panelWidth||420;
  $('set-font-size').value=settings.fontSize||12;
  $('set-auto-picker').checked=settings.autoPicker!==false;
  $('set-default-tab').value=settings.defaultTab||'selector';
  $('set-custom-on-top').checked=settings.customOnTop!==false;
  $('set-important').checked=settings.useImportant===true;
  $('set-live-preview').checked=settings.livePreview!==false;
  $('set-accent').value=settings.accentColor||'#cba6f7';
  $('set-highlight').value=settings.highlightColor||'#89b4fa';

  $('save-settings').addEventListener('click',async()=>{
    settings.panelWidth=parseInt($('set-panel-width').value)||420;
    settings.fontSize=parseInt($('set-font-size').value)||12;
    settings.autoPicker=$('set-auto-picker').checked;
    settings.defaultTab=$('set-default-tab').value;
    settings.customOnTop=$('set-custom-on-top').checked;
    settings.useImportant=$('set-important').checked;
    settings.livePreview=$('set-live-preview').checked;
    settings.accentColor=$('set-accent').value;
    settings.highlightColor=$('set-highlight').value;
    await saveSettings(settings);
    toast('Settings saved');
  });

  $('shortcuts-link').addEventListener('click',e=>{e.preventDefault();navigator.clipboard.writeText('chrome://extensions/shortcuts').then(()=>toast('URL copied! Paste it in your address bar'));});

  /* ─── BROWSE THEMES ─── */
  let browseInstalled=new Set();
  function updateBrowseInstalled(){
    browseInstalled.clear();
    for(const data of Object.values(allData)){
      for(const id of Object.keys(data.themes||{})) browseInstalled.add(id);
    }
  }
  updateBrowseInstalled();

  $('browse-go').addEventListener('click',doBrowseSearch);
  $('browse-query').addEventListener('keydown',e=>{if(e.key==='Enter')doBrowseSearch();});

  async function doBrowseSearch(){
    const q=$('browse-query').value.trim();
    if(!q){toast('Enter a search term');return;}
    const status=$('browse-status');
    const results=$('browse-results');
    status.style.display='block';status.textContent='Searching...';
    results.innerHTML='';
    const res=await send({action:'sc-search-styles',query:q,domain:''});
    status.style.display='none';
    if(!res||res.error){results.innerHTML='<div class="empty-state"><div class="empty-text">Search failed: '+(res?.error||'Unknown error')+'</div></div>';return;}
    if(!res.styles||!res.styles.length){results.innerHTML='<div class="empty-state"><div class="empty-text">No styles found for "'+esc(q)+'"</div></div>';return;}
    if(res.installed)res.installed.forEach(id=>browseInstalled.add(id));
    results.innerHTML=res.styles.map(s=>{
      const inst=browseInstalled.has(s.id);
      const thumbHtml=s.thumb?'<img class="browse-thumb" src="'+esc(s.thumb)+'" loading="lazy"/>':'';
      return '<div class="browse-card'+(inst?' installed':'')+'" data-id="'+esc(s.id)+'" data-name="'+esc(s.name)+'">'+
        thumbHtml+
        '<div class="browse-info"><div class="browse-name">'+esc(s.name)+'</div>'+
        '<div class="browse-author">'+(s.author?'by '+esc(s.author):'')+'</div>'+
        '<div class="browse-actions">'+
        '<button class="browse-btn install'+(inst?' done':'')+'\">'+(inst?'Installed':'Install')+'</button>'+
        (inst?'<button class="browse-btn uninstall">Uninstall</button>':'')+
        '<a href="'+esc(s.url)+'" target="_blank" style="font-size:10px;color:#89b4fa;text-decoration:none;margin-left:4px">View</a>'+
        '<span class="browse-installs">'+esc(s.installs)+' installs</span>'+
        '</div></div></div>';
    }).join('');
    wireBrowseCards();
  }

  function wireBrowseCards(){
    $('browse-results').querySelectorAll('.browse-card').forEach(card=>{
      const id=card.dataset.id,name=card.dataset.name;
      const instBtn=card.querySelector('.install');
      instBtn.addEventListener('click',async()=>{
        if(instBtn.classList.contains('done'))return;
        instBtn.disabled=true;instBtn.textContent='...';
        const domain=$('browse-query').value.trim().replace(/\s+/g,'').toLowerCase();
        const res=await send({action:'sc-install-style',id,name,domain});
        instBtn.disabled=false;
        if(res&&res.ok){
          instBtn.classList.add('done');instBtn.textContent='Installed';
          browseInstalled.add(id);card.classList.add('installed');
          if(!card.querySelector('.uninstall')){
            const ubtn=document.createElement('button');
            ubtn.className='browse-btn uninstall';ubtn.textContent='Uninstall';
            ubtn.addEventListener('click',()=>doUninstallBrowse(card,id,domain));
            instBtn.after(ubtn);
          }
          allData=await loadAllData();
          renderThemes();updateStats();
          toast('Installed: '+(res.name||name));
        }else{instBtn.textContent=res?.error||'Failed';setTimeout(()=>{instBtn.textContent='Install';},2000);}
      });
      const unBtn=card.querySelector('.uninstall');
      if(unBtn){
        const domain=$('browse-query').value.trim().replace(/\s+/g,'').toLowerCase();
        unBtn.addEventListener('click',()=>doUninstallBrowse(card,id,domain));
      }
    });
  }

  async function doUninstallBrowse(card,id,domain){
    let actualDomain=domain;
    for(const[d,data]of Object.entries(allData)){
      if(data.themes&&data.themes[id]){actualDomain=d;break;}
    }
    if(allData[actualDomain]&&allData[actualDomain].themes){
      delete allData[actualDomain].themes[id];
      await saveAllData(allData);
      notifyTabs(actualDomain);
    }
    browseInstalled.delete(id);card.classList.remove('installed');
    const instBtn=card.querySelector('.install');
    if(instBtn){instBtn.classList.remove('done');instBtn.textContent='Install';}
    const unBtn=card.querySelector('.uninstall');if(unBtn)unBtn.remove();
    renderThemes();updateStats();
    toast('Uninstalled');
  }

  /* ─── TAB SELECTION VIA MESSAGE (from editor nav buttons) ─── */
  chrome.runtime.onMessage.addListener((msg)=>{
    if(msg.action==='sc-select-options-tab'&&msg.tab){
      const tabName=msg.tab;
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      const btn=document.querySelector('.tab-btn[data-tab="'+tabName+'"]');
      if(btn)btn.classList.add('active');
      const content=$('tab-'+tabName);
      if(content)content.classList.add('active');
    }
  });
  const hashTab=location.hash.replace('#','');
  if(hashTab){
    const btn=document.querySelector('.tab-btn[data-tab="'+hashTab+'"]');
    if(btn)btn.click();
  }

  /* ─── IMPORT/EXPORT ─── */
  $('btn-export').addEventListener('click',()=>{
  const exp={data:allData,settings,version:'1.6.0',exported:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(exp,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download='stylecraft-export-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);
    toast('Exported '+Object.keys(allData).length+' domains');
  });
  const importFile=$('import-file');
  $('btn-import').addEventListener('click',()=>importFile.click());
  importFile.addEventListener('change',e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=async()=>{
      try{
        const raw=JSON.parse(reader.result);

        if (isStylusExport(raw)) {
          const result = convertStylusImport(raw, allData);
          await saveAllData(result.data);
          allData = result.data;
          renderStyles(); renderThemes(); updateStats(); updateBrowseInstalled();
          notifyTabs('*');
          toast('Imported ' + result.count + ' Stylus style' + (result.count!==1?'s':'') + ' across ' + result.domains + ' domain' + (result.domains!==1?'s':''));
        } else if (isStylebotExport(raw)) {
          const result = convertStylebotImport(raw, allData);
          await saveAllData(result.data);
          allData = result.data;
          renderStyles(); renderThemes(); updateStats(); updateBrowseInstalled();
          notifyTabs('*');
          toast('Imported ' + result.count + ' Stylebot style' + (result.count!==1?'s':''));
        } else {
          const imported = raw.data || raw;
          await saveAllData(imported);
          allData = imported;
          if(raw.settings){settings=Object.assign(settings,raw.settings);await saveSettings(settings);}
          renderStyles(); renderThemes(); updateStats(); updateBrowseInstalled();
          notifyTabs('*');
          toast('Imported ' + Object.keys(imported).length + ' domains');
        }
      }catch(err){toast('Import failed: ' + (err.message||'Invalid file'));}
    };
    reader.readAsText(file);importFile.value='';
  });

  /* ─── Stylus Import Detection & Conversion ─── */
  function isStylusExport(raw) {
    if (!Array.isArray(raw) || raw.length === 0) return false;
    return raw.some(item => item && (item.sections || item.code || item.sourceCode));
  }

  function isStylebotExport(raw) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return false;
    if (raw.data || raw.version || raw.stylecraft_data) return false; // StyleCraft native
    const keys = Object.keys(raw);
    if (keys.length === 0) return false;
    // Check if values look like Stylebot entries (have css key, and keys look like domains)
    const sample = raw[keys[0]];
    return sample && typeof sample === 'object' && typeof sample.css === 'string';
  }

  function convertStylebotImport(raw, existingData) {
    const merged = JSON.parse(JSON.stringify(existingData || {}));
    let count = 0;
    for (const [domain, entry] of Object.entries(raw)) {
      if (!entry || !entry.css || !entry.css.trim()) continue;
      const key = domain.trim();
      if (!key) continue;
      if (!merged[key]) merged[key] = { themes: {}, customCSS: '', customEnabled: true };
      // Append to existing custom CSS if present
      if (merged[key].customCSS && merged[key].customCSS.trim()) {
        merged[key].customCSS += '\n\n/* Imported from Stylebot */\n' + entry.css;
      } else {
        merged[key].customCSS = entry.css;
      }
      merged[key].customEnabled = entry.enabled !== false;
      if (!merged[key].themes) merged[key].themes = {};
      count++;
    }
    return { data: merged, count };
  }

  function convertStylusImport(styles, existingData) {
    const merged = JSON.parse(JSON.stringify(existingData || {}));
    let count = 0;
    const touchedDomains = new Set();

    for (const style of styles) {
      if (style.settings || style.order) continue; // Skip Stylus settings entry
      if (!style.name && !style.sections && !style.code && !style.sourceCode) continue;
      const name = style.name || 'Imported Style';
      const enabled = style.enabled !== false;
      const id = 'stylus-' + (style.id || Date.now() + '-' + Math.random().toString(36).slice(2,8));

      let rawCSS = '';
      let flatCSS = '';
      const domains = new Set();

      if (style.sourceCode) {
        rawCSS = style.sourceCode;
        const domainRe = /@-?moz-?document[^{]*domain\s*\(\s*["']?([^"')]+)["']?\s*\)/g;
        let dm;
        while ((dm = domainRe.exec(rawCSS)) !== null) domains.add(dm[1]);
        const urlRe = /@-?moz-?document[^{]*(?:url|url-prefix)\s*\(\s*["']?(https?:\/\/[^/"')]+)/g;
        while ((dm = urlRe.exec(rawCSS)) !== null) {
          try { domains.add(new URL(dm[1]).hostname); } catch {}
        }
      }

      if (style.sections && style.sections.length > 0) {
        const parts = [];
        for (const sec of style.sections) {
          const code = (sec.code || '').trim();
          if (!code) continue;
          if (!flatCSS) flatCSS = code;
          else flatCSS += '\n\n' + code;
          (sec.domains || []).forEach(d => domains.add(d));
          (sec.urls || []).forEach(u => { try { domains.add(new URL(u).hostname); } catch {} });
          (sec.urlPrefixes || []).forEach(u => { try { domains.add(new URL(u).hostname); } catch {} });
          if (!rawCSS) {
            const conds = [];
            (sec.domains || []).forEach(d => conds.push('domain("' + d + '")'));
            (sec.urls || []).forEach(u => conds.push('url("' + u + '")'));
            (sec.urlPrefixes || []).forEach(u => conds.push('url-prefix("' + u + '")'));
            (sec.regexps || []).forEach(r => { conds.push('regexp("' + r + '")'); domains.add('*'); });
            if (conds.length > 0) {
              parts.push('@-moz-document ' + conds.join(', ') + ' {\n' + code + '\n}');
            } else {
              parts.push(code);
              domains.add('*');
            }
          }
        }
        if (!rawCSS && parts.length > 0) rawCSS = parts.join('\n\n');
      }

      if (!rawCSS && style.code) {
        rawCSS = style.code;
        flatCSS = style.code;
        const domainRe = /domain\s*\(\s*["']?([^"')]+)["']?\s*\)/g;
        let dm;
        while ((dm = domainRe.exec(rawCSS)) !== null) domains.add(dm[1]);
        if (domains.size === 0) domains.add('*');
      }

      if (!rawCSS) continue;
      count++;
      if (domains.size === 0) domains.add('*');

      for (const domain of domains) {
        const key = domain === '*' ? '*' : domain;
        if (!merged[key]) merged[key] = { themes: {}, customCSS: '', customEnabled: true };
        if (!merged[key].themes) merged[key].themes = {};
        merged[key].themes[id] = { name, css: flatCSS || rawCSS, rawCSS, enabled, source: 'stylus-import' };
        touchedDomains.add(key);
      }
    }

    return { data: merged, count, domains: touchedDomains.size };
  }

  /* ─── Auto-backup status & restore ─── */
  chrome.storage.local.get('sc_backups', (result) => {
    const backups = result.sc_backups || [];
    const statusEl = $('backup-status');
    if (backups.length === 0) {
      statusEl.textContent = 'No backups yet';
    } else {
      statusEl.textContent = backups.length + ' backup' + (backups.length > 1 ? 's' : '') + ' (latest: ' + new Date(backups[0].timestamp).toLocaleString() + ')';
    }
  });

  $('btn-restore-backup').addEventListener('click', async () => {
    const result = await chrome.storage.local.get('sc_backups');
    const backups = result.sc_backups || [];
    if (!backups.length) { toast('No backups available'); return; }
    const choices = backups.map((b, i) => {
      const domains = Object.keys(b.data || {}).length;
      return (i + 1) + '. ' + new Date(b.timestamp).toLocaleString() + ' (' + domains + ' domains)';
    }).join('\n');
    const pick = prompt('Choose backup to restore:\n' + choices + '\n\nEnter number (1-' + backups.length + '):');
    const idx = parseInt(pick) - 1;
    if (isNaN(idx) || idx < 0 || idx >= backups.length) return;
    snapshotForUndo('Restore backup');
    allData = backups[idx].data || {};
    await saveAllData(allData);
    if (backups[idx].settings) { settings = Object.assign(settings, backups[idx].settings); await saveSettings(settings); }
    notifyTabs('*');
    renderStyles(); renderThemes(); updateStats();
    showUndoToast('Restored backup from ' + new Date(backups[idx].timestamp).toLocaleString());
  });

  $('btn-reset').addEventListener('click',async()=>{
    if(!confirm('Delete ALL styles, themes, and settings? This cannot be undone.'))return;
    await chrome.storage.local.clear();
    allData={};renderStyles();renderThemes();updateStats();$('global-css').value='';toast('All data cleared');
  });

  function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
  function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),3000);}
})();
