/* StyleCraft v1.20.0 - Popup */
(async function() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  let domain = '';
  try { domain = new URL(url).hostname; } catch {}

  const $ = id => document.getElementById(id);
  const targetTabId = tab?.id || null;
  const domainToggle = $('domain-toggle');
  const readBtn = $('btn-readability');
  const grayBtn = $('btn-grayscale');
  const searchInput = $('search-input');
  const searchLoading = $('search-loading');
  const searchResults = $('search-results');
  const resultCount = $('result-count');
  let installedSet = new Set();

  $('domain-text').textContent = domain || 'N/A';

  /* ─── Direct storage read (bypass background worker) ─── */
  async function loadAllData() {
    const d = await chrome.storage.local.get('stylecraft_data');
    return d.stylecraft_data || {};
  }

  // Theme handling — SC_APPLY_THEME provided by theme.js
  const themeSelect = $('popup-theme');
  themeSelect.addEventListener('change', async () => {
    SC_APPLY_THEME(themeSelect.value);
    const s = await chrome.storage.local.get('stylecraft_settings');
    const settings = s.stylecraft_settings || {};
    settings.theme = themeSelect.value;
    await chrome.storage.local.set({ stylecraft_settings: settings });
    chrome.runtime.sendMessage({ action: 'sc-theme-changed', theme: themeSelect.value }).catch(() => {});
  });

  /* ─── Load & render installed styles for current site ─── */
  const allData = await loadAllData();
  const siteCount = Object.keys(allData).length;
  $('style-count').textContent = siteCount + ' site' + (siteCount !== 1 ? 's' : '') + ' styled';

  function matchDomain(pattern, data) {
    return StyleCraftMatcher.entryMatchesPage(pattern, data, url, domain);
  }

  function renderInstalled() {
    const section = $('installed-section');
    const list = $('installed-list');
    const entries = [];

    for (const [pat, data] of Object.entries(allData)) {
      if (!matchDomain(pat, data)) continue;
      // Custom CSS
      if ((data.customCSS || '').trim()) {
        entries.push({ type: 'custom', domain: pat, enabled: data.customEnabled !== false });
      }
      // Themes
      for (const [id, theme] of Object.entries(data.themes || {})) {
        entries.push({ type: 'theme', domain: pat, id, name: theme.name || id, enabled: theme.enabled !== false, source: theme.source });
      }
    }

    if (!entries.length) {
      section.style.display = 'none';
      $('no-styles').style.display = 'block';
      domainToggle.checked = false;
      return;
    }

    section.style.display = '';
    $('no-styles').style.display = 'none';
    domainToggle.checked = entries.some(e => e.enabled);

    list.innerHTML = entries.map(e => {
      const editSvg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
      if (e.type === 'custom') {
        return '<div class="i-row" data-type="custom" data-domain="' + esc(e.domain) + '">' +
          '<label class="toggle"><input type="checkbox" class="i-toggle"' + (e.enabled ? ' checked' : '') + '/><span class="toggle-sl"></span></label>' +
          '<div class="i-icon">{}</div>' +
          '<div class="i-name' + (e.enabled ? '' : ' disabled') + '">Custom CSS</div>' +
          '<div class="i-source">' + esc(e.domain) + '</div>' +
          '<button class="i-edit" data-edit-domain="' + esc(e.domain) + '" data-edit-type="custom" title="Edit in CSS Editor">' + editSvg + '</button></div>';
      }
      const src = e.source === 'stylus-import' ? 'Stylus' : 'USw';
      return '<div class="i-row" data-type="theme" data-domain="' + esc(e.domain) + '" data-id="' + esc(e.id) + '">' +
        '<label class="toggle"><input type="checkbox" class="i-toggle"' + (e.enabled ? ' checked' : '') + '/><span class="toggle-sl"></span></label>' +
        '<div class="i-icon">&#x1F3A8;</div>' +
        '<div class="i-name' + (e.enabled ? '' : ' disabled') + '">' + esc(e.name) + '</div>' +
        '<div class="i-source">' + src + '</div>' +
        '<button class="i-edit" data-edit-domain="' + esc(e.domain) + '" data-edit-type="theme" data-edit-id="' + esc(e.id) + '" title="Edit in CSS Editor">' + editSvg + '</button></div>';
    }).join('');

    // Wire edit buttons
    list.querySelectorAll('.i-edit').forEach(btn => {
      const label = btn.dataset.editType === 'theme' ? 'Edit installed theme in CSS Editor' : 'Edit custom CSS in CSS Editor';
      btn.setAttribute('aria-label', label);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = btn.dataset.editDomain;
        let hash = d;
        if (btn.dataset.editType === 'theme') hash = d + '/theme/' + btn.dataset.editId;
        chrome.tabs.create({ url: chrome.runtime.getURL('editor.html#' + hash) }); window.close();
      });
    });

    // Wire toggles
    list.querySelectorAll('.i-row').forEach(row => {
      const tog = row.querySelector('.i-toggle');
      const name = row.querySelector('.i-name')?.textContent || 'style';
      tog.setAttribute('aria-label', 'Enable ' + name + ' for this site');
      tog.addEventListener('change', async () => {
        const d = row.dataset.domain;
        const nameEl = row.querySelector('.i-name');
        nameEl.classList.toggle('disabled', !tog.checked);
        const fresh = await loadAllData();
        if (row.dataset.type === 'custom') {
          if (fresh[d]) fresh[d].customEnabled = tog.checked;
        } else {
          const id = row.dataset.id;
          if (fresh[d] && fresh[d].themes && fresh[d].themes[id]) fresh[d].themes[id].enabled = tog.checked;
        }
        await chrome.storage.local.set({ stylecraft_data: fresh });
        if (targetTabId) chrome.tabs.sendMessage(targetTabId, { action: 'sc-styles-updated' }).catch(() => {});
      });
    });
  }

  renderInstalled();

  // Read/Gray state
  const readPanel = $('read-panel');
  let readSettings = { theme: 'dark', fontSize: 18, lineHeight: 1.7, fontFamily: 'Georgia, serif', maxWidth: 720 };
  let readActive = false;

  chrome.runtime.sendMessage({ action: 'sc-get-toggle-state' }, (res) => {
    if (chrome.runtime.lastError || !res) return;
    if (res.readability) { readBtn.classList.add('active'); readActive = true; }
    if (res.grayscale) grayBtn.classList.add('active');
    if (res.readSettings) {
      readSettings = Object.assign(readSettings, res.readSettings);
      syncReadUI();
    }
    updateReadAria();
  });

  function syncReadUI() {
    // Sync UI elements to readSettings
    document.querySelectorAll('.read-theme-btn').forEach(b => {
      const active = b.dataset.rtheme === readSettings.theme;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const fontSel = $('read-font');
    if (fontSel) fontSel.value = readSettings.fontFamily;
    const sizeSlider = $('read-size');
    if (sizeSlider) { sizeSlider.value = readSettings.fontSize; $('read-size-val').textContent = readSettings.fontSize; }
    const lhSlider = $('read-lh');
    if (lhSlider) { lhSlider.value = Math.round(readSettings.lineHeight * 10); $('read-lh-val').textContent = readSettings.lineHeight; }
    const wSlider = $('read-w');
    if (wSlider) { wSlider.value = readSettings.maxWidth; $('read-w-val').textContent = readSettings.maxWidth; }
  }

  function updateReadAria() {
    const panelOpen = readPanel.style.display !== 'none';
    readBtn.setAttribute('aria-expanded', panelOpen ? 'true' : 'false');
    readBtn.setAttribute('aria-pressed', readActive ? 'true' : 'false');
    grayBtn.setAttribute('aria-pressed', grayBtn.classList.contains('active') ? 'true' : 'false');
  }

  function sendReadUpdate() {
    if (targetTabId) chrome.tabs.sendMessage(targetTabId, { action: 'sc-update-read-settings', readSettings }).catch(() => {});
  }

  // Theme buttons
  document.querySelectorAll('.read-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      readSettings.theme = btn.dataset.rtheme;
      syncReadUI();
      if (readActive) sendReadUpdate();
    });
  });

  // Font selector
  $('read-font').addEventListener('change', (e) => {
    readSettings.fontFamily = e.target.value;
    if (readActive) sendReadUpdate();
  });

  // Size slider
  $('read-size').addEventListener('input', (e) => {
    readSettings.fontSize = parseInt(e.target.value);
    $('read-size-val').textContent = readSettings.fontSize;
    if (readActive) sendReadUpdate();
  });

  // Line height slider (stored as 12-24 mapped to 1.2-2.4)
  $('read-lh').addEventListener('input', (e) => {
    readSettings.lineHeight = parseFloat(e.target.value) / 10;
    $('read-lh-val').textContent = readSettings.lineHeight.toFixed(1);
    if (readActive) sendReadUpdate();
  });

  // Width slider
  $('read-w').addEventListener('input', (e) => {
    readSettings.maxWidth = parseInt(e.target.value);
    $('read-w-val').textContent = readSettings.maxWidth;
    if (readActive) sendReadUpdate();
  });

  domainToggle.addEventListener('change', async () => {
    const fresh = await loadAllData();
    // Toggle all styles for this domain
    for (const [pat, data] of Object.entries(fresh)) {
      if (!matchDomain(pat, data)) continue;
      if ((data.customCSS || '').trim()) data.customEnabled = domainToggle.checked;
      for (const theme of Object.values(data.themes || {})) theme.enabled = domainToggle.checked;
    }
    await chrome.storage.local.set({ stylecraft_data: fresh });
    if (targetTabId) chrome.tabs.sendMessage(targetTabId, { action: 'sc-styles-updated' }).catch(() => {});
    // Update installed list visuals
    $('installed-list').querySelectorAll('.i-toggle').forEach(t => { t.checked = domainToggle.checked; });
    $('installed-list').querySelectorAll('.i-name').forEach(n => { n.classList.toggle('disabled', !domainToggle.checked); });
  });

  $('btn-open').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'sc-open-editor-from-popup' }); window.close();
  });
  $('btn-css-editor').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('editor.html#' + domain) }); window.close();
  });
  readBtn.addEventListener('click', () => {
    // If panel is hidden, show it and toggle readability if not active
    if (readPanel.style.display === 'none') {
      readPanel.style.display = '';
      syncReadUI();
      if (!readActive) {
        chrome.runtime.sendMessage({ action: 'sc-toggle-readability', readSettings }, (res) => {
          if (!chrome.runtime.lastError && res) { readActive = !!res.readability; readBtn.classList.toggle('active', readActive); updateReadAria(); }
        });
      }
    } else {
      // Toggle readability off and hide panel
      chrome.runtime.sendMessage({ action: 'sc-toggle-readability', readSettings }, (res) => {
        if (!chrome.runtime.lastError && res) { readActive = !!res.readability; readBtn.classList.toggle('active', readActive); updateReadAria(); }
      });
      readPanel.style.display = 'none';
    }
    updateReadAria();
  });
  grayBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'sc-toggle-grayscale' }, (res) => {
      if (!chrome.runtime.lastError && res) {
        grayBtn.classList.toggle('active', !!res.grayscale);
        updateReadAria();
      }
    });
  });
  $('btn-options').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') }); window.close();
  });
  $('btn-export').addEventListener('click', async () => {
    const data = await loadAllData();
    const s = await chrome.storage.local.get('stylecraft_settings');
    const exp = { data, settings: s.stylecraft_settings || {}, version: '1.20.0', exported: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exp, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = u; a.download = 'stylecraft-export.json'; a.click(); URL.revokeObjectURL(u);
  });

  /* ─── Search ─── */
  let currentSearchQuery = '';
  let currentSearchPage = 1;
  let searchHasMore = false;

  function showSearchNotice(message, append) {
    const notice = document.createElement('div');
    notice.className = 'empty-msg warning';
    notice.textContent = message;
    if (append) searchResults.appendChild(notice);
    else searchResults.prepend(notice);
  }

  function doSearch(query, page = 1, append = false) {
    if (!query) return;
    currentSearchQuery = query;
    currentSearchPage = page;
    if (!append) {
      searchLoading.style.display = 'block';
      searchResults.innerHTML = '';
      resultCount.style.display = 'none';
    }

    // Remove existing Load More button when fetching
    const existingMore = searchResults.querySelector('.load-more-btn');
    if (existingMore) existingMore.remove();

    // Show inline loading when appending
    let inlineLoader = null;
    if (append) {
      inlineLoader = document.createElement('div');
      inlineLoader.className = 'loading';
      inlineLoader.innerHTML = '<span class="spinner"></span>Loading more...';
      inlineLoader.style.display = 'block';
      searchResults.appendChild(inlineLoader);
    }

    chrome.runtime.sendMessage({ action: 'sc-search-styles', query, domain, page }, (res) => {
      if (!append) searchLoading.style.display = 'none';
      if (inlineLoader) inlineLoader.remove();

      if (chrome.runtime.lastError) {
        if (!append) searchResults.innerHTML = '<div class="empty-msg">Search error: ' + esc(chrome.runtime.lastError.message) + '</div>';
        return;
      }
      if (!res) {
        if (!append) searchResults.innerHTML = '<div class="empty-msg">No response from background</div>';
        return;
      }
      if (res.error) {
        if (!append) searchResults.innerHTML = '<div class="empty-msg">' + esc(res.error) + '</div>';
        return;
      }
      if (!res.styles || res.styles.length === 0) {
        if (!append) searchResults.innerHTML = '<div class="empty-msg">No styles found for "' + esc(query) + '"</div>';
        return;
      }
      if (res.installed) installedSet = new Set([...installedSet, ...(res.installed || [])]);
      searchHasMore = !!res.hasMore;

      if (!append) {
        resultCount.textContent = res.styles.length + ' styles found';
        resultCount.style.display = 'block';
      } else {
        const existing = searchResults.querySelectorAll('.s-card').length;
        resultCount.textContent = (existing + res.styles.length) + ' styles found';
      }

      renderResults(res.styles, append);
      if (res.stale) {
        showSearchNotice('Showing cached UserStyles.world results; live search failed: ' + (res.warning || 'unknown error'), append);
      }

      // Add Load More button if there are more pages
      if (searchHasMore) {
        const moreBtn = document.createElement('button');
        moreBtn.className = 'load-more-btn';
        moreBtn.textContent = 'Load More Styles';
        moreBtn.addEventListener('click', () => {
          doSearch(currentSearchQuery, currentSearchPage + 1, true);
        });
        searchResults.appendChild(moreBtn);
      }

      // Auto-fetch page 2 on initial search to fill the popup
      if (page === 1 && res.hasMore) {
        doSearch(query, 2, true);
      }
    });
  }

  function renderResults(styles, append) {
    if (!append) searchResults.innerHTML = '';
    styles.forEach(s => {
      const isInstalled = installedSet.has(s.id);
      const card = document.createElement('div');
      card.className = 's-card' + (isInstalled ? ' installed' : '');

      card.innerHTML =
        '<div class="s-body">' +
          '<div class="s-info">' +
            '<div class="s-name">' + esc(s.name) + '</div>' +
            '<div class="s-meta">' +
              (s.author ? '<span>by ' + esc(s.author) + '</span>' : '') +
              '<span>' + esc(s.installs) + ' installs</span>' +
            '</div>' +
          '</div>' +
          '<div class="s-actions">' +
            '<button class="s-btn preview" data-action="preview">Preview</button>' +
            '<button class="s-btn install' + (isInstalled ? ' done' : '') + '" data-action="install">' +
              (isInstalled ? 'Installed' : 'Install') +
            '</button>' +
            '<button class="s-btn uninstall" data-action="uninstall" style="' + (isInstalled ? '' : 'display:none') + '">Uninstall</button>' +
          '</div>' +
        '</div>';

      // Preview button: toggle live CSS on the page
      const pvBtn = card.querySelector('[data-action="preview"]');
      if (pvBtn) {
        pvBtn.setAttribute('aria-label', 'Preview ' + s.name);
        pvBtn.addEventListener('click', () => {
          if (pvBtn.classList.contains('active')) {
            // End preview
            chrome.runtime.sendMessage({ action: 'sc-end-preview' });
            pvBtn.classList.remove('active');
            pvBtn.textContent = 'Preview';
          } else {
            // End any other active preview first
            document.querySelectorAll('.s-btn.preview.active').forEach(b => {
              b.classList.remove('active'); b.textContent = 'Preview';
            });
            pvBtn.disabled = true; pvBtn.textContent = '...';
            chrome.runtime.sendMessage({ action: 'sc-preview-style', id: s.id }, (res) => {
              pvBtn.disabled = false;
              if (res && res.ok) {
                pvBtn.classList.add('active');
                pvBtn.textContent = 'End Preview';
              } else {
                pvBtn.textContent = res?.error || 'Failed';
                setTimeout(() => { pvBtn.textContent = 'Preview'; }, 2000);
              }
            });
          }
        });
      }

      // Install button
      const installBtn = card.querySelector('[data-action="install"]');
      installBtn.setAttribute('aria-label', (isInstalled ? 'Installed ' : 'Install ') + s.name);
      installBtn.addEventListener('click', () => doInstall(card, s, installBtn));

      // Uninstall button
      const uninstallBtn = card.querySelector('[data-action="uninstall"]');
      uninstallBtn.setAttribute('aria-label', 'Uninstall ' + s.name);
      uninstallBtn.addEventListener('click', () => doUninstall(card, s, installBtn, uninstallBtn));

      searchResults.appendChild(card);
    });
  }

  function doInstall(card, style, btn) {
    if (btn.classList.contains('done')) return;
    // End any active preview first
    chrome.runtime.sendMessage({ action: 'sc-end-preview' });
    document.querySelectorAll('.s-btn.preview.active').forEach(b => { b.classList.remove('active'); b.textContent = 'Preview'; });
    btn.disabled = true; btn.textContent = '...';
    chrome.runtime.sendMessage({ action: 'sc-install-style', id: style.id, name: style.name, domain }, (res) => {
      btn.disabled = false;
      if (res && res.ok) {
        btn.textContent = 'Installed'; btn.classList.add('done');
        card.classList.add('installed');
        card.querySelector('[data-action="uninstall"]').style.display = '';
        installedSet.add(style.id);
      } else {
        btn.textContent = res?.error || 'Failed';
        setTimeout(() => { btn.textContent = 'Install'; }, 2000);
      }
    });
  }

  function doUninstall(card, style, installBtn, uninstallBtn) {
    uninstallBtn.disabled = true; uninstallBtn.textContent = '...';
    chrome.runtime.sendMessage({ action: 'sc-uninstall-style', id: style.id, domain }, (res) => {
      uninstallBtn.disabled = false;
      if (res && res.ok) {
        installBtn.textContent = 'Install'; installBtn.classList.remove('done');
        card.classList.remove('installed');
        uninstallBtn.style.display = 'none';
        installedSet.delete(style.id);
      } else {
        uninstallBtn.textContent = 'Error';
        setTimeout(() => { uninstallBtn.textContent = 'Uninstall'; }, 2000);
      }
    });
  }

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  $('search-btn').addEventListener('click', () => doSearch(searchInput.value.trim()));
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(searchInput.value.trim()); });

  // Auto-search on open
  if (domain) {
    const parts = domain.replace(/^www\./, '').split('.');
    const searchTerm = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    searchInput.value = searchTerm;
    doSearch(searchTerm);
  }

  /* ─── Quick CSS Editor ─── */
  const qToggle = $('quick-edit-toggle');
  const qChevron = $('quick-chevron');
  const qBody = $('quick-edit-body');
  const qCode = $('quick-edit-code');
  const qDomain = $('quick-edit-domain');
  const qSave = $('quick-edit-save');
  const qExpand = $('quick-edit-expand');

  if (domain) {
    qDomain.textContent = domain;
    // Load existing custom CSS
    const siteData = allData[domain];
    if (siteData && siteData.customCSS) qCode.value = siteData.customCSS;
  } else {
    $('quick-edit-section').style.display = 'none';
  }

  qToggle.addEventListener('click', () => {
    const open = qBody.style.display !== 'none';
    qBody.style.display = open ? 'none' : 'block';
    qToggle.classList.toggle('open', !open);
    qToggle.setAttribute('aria-expanded', !open ? 'true' : 'false');
    if (!open) qCode.focus();
  });

  // Tab key indentation
  qCode.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = qCode.selectionStart, en = qCode.selectionEnd;
      qCode.value = qCode.value.substring(0, s) + '  ' + qCode.value.substring(en);
      qCode.selectionStart = qCode.selectionEnd = s + 2;
    }
  });

  qSave.addEventListener('click', async () => {
    if (!domain) return;
    const css = qCode.value;
    let trust;
    try { trust = StyleCraftData.assertCssAllowed(css); }
    catch (error) {
      qSave.textContent = error.message || 'Blocked CSS';
      setTimeout(() => { qSave.innerHTML = 'Save &amp; Apply'; }, 2000);
      return;
    }
    const fresh = await loadAllData();
    if (!fresh[domain]) fresh[domain] = { customCSS: '', customEnabled: true, themes: {} };
    fresh[domain].customCSS = css;
    fresh[domain].trust = trust;
    fresh[domain].customEnabled = true;
    await chrome.storage.local.set({ stylecraft_data: fresh });
    // Notify tabs
    try {
      const tabs = await chrome.tabs.query({});
      for (const t of tabs) {
        try { chrome.tabs.sendMessage(t.id, { action: 'sc-styles-updated' }); } catch {}
      }
    } catch {}
    qSave.textContent = 'Saved!';
    setTimeout(() => { qSave.innerHTML = 'Save &amp; Apply'; }, 1500);
    renderInstalled();
  });

  qExpand.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('editor.html#' + domain) });
    window.close();
  });
})();
