/* StyleCraft v1.0.0 — Popup */
(async function() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  let domain = '';
  try { domain = new URL(url).hostname; } catch {}

  const $ = id => document.getElementById(id);
  const domainToggle = $('domain-toggle');
  const readBtn = $('btn-readability');
  const grayBtn = $('btn-grayscale');
  const searchInput = $('search-input');
  const searchLoading = $('search-loading');
  const searchResults = $('search-results');
  const resultCount = $('result-count');
  let installedSet = new Set();

  $('domain-text').textContent = domain || 'N/A';

  // Theme handling — SC_APPLY_THEME provided by theme.js
  const themeSelect = $('popup-theme');
  themeSelect.addEventListener('change', () => {
    SC_APPLY_THEME(themeSelect.value);
    chrome.runtime.sendMessage({ action: 'sc-get-settings' }, (s) => {
      const settings = s || {};
      settings.theme = themeSelect.value;
      chrome.runtime.sendMessage({ action: 'sc-save-settings', settings });
      chrome.runtime.sendMessage({ action: 'sc-theme-changed', theme: themeSelect.value });
    });
  });

  // Load domain data
  chrome.runtime.sendMessage({ action: 'sc-get-styles', url }, (res) => {
    if (chrome.runtime.lastError || !res) return;
    if (res.themeCSS || res.customCSS) {
      domainToggle.checked = true;
      $('no-styles').style.display = 'none';
    } else {
      $('no-styles').style.display = 'block';
      domainToggle.checked = false;
    }
  });

  // Load stats
  chrome.runtime.sendMessage({ action: 'sc-get-all-data' }, (data) => {
    if (chrome.runtime.lastError || !data) return;
    const c = Object.keys(data).length;
    $('style-count').textContent = c + ' site' + (c !== 1 ? 's' : '') + ' styled';
  });

  // Read/Gray state
  chrome.runtime.sendMessage({ action: 'sc-get-toggle-state' }, (res) => {
    if (chrome.runtime.lastError || !res) return;
    if (res.readability) readBtn.classList.add('active');
    if (res.grayscale) grayBtn.classList.add('active');
  });

  domainToggle.addEventListener('change', () => {
    chrome.runtime.sendMessage({ action: 'sc-toggle-custom', domain, enabled: domainToggle.checked });
  });

  $('btn-open').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'sc-open-editor-from-popup' }); window.close();
  });
  readBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'sc-toggle-readability' }, (res) => {
      if (!chrome.runtime.lastError && res) readBtn.classList.toggle('active', !!res.readability);
    });
  });
  grayBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'sc-toggle-grayscale' }, (res) => {
      if (!chrome.runtime.lastError && res) grayBtn.classList.toggle('active', !!res.grayscale);
    });
  });
  $('btn-options').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') }); window.close();
  });
  $('btn-export').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'sc-export-all' }, (styles) => {
      if (chrome.runtime.lastError || !styles) return;
      const blob = new Blob([JSON.stringify(styles, null, 2)], { type: 'application/json' });
      const u = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = u; a.download = 'stylecraft-export.json'; a.click(); URL.revokeObjectURL(u);
    });
  });

  /* ─── Search ─── */
  function doSearch(query) {
    if (!query) return;
    searchLoading.style.display = 'block';
    searchResults.innerHTML = '';
    resultCount.style.display = 'none';

    chrome.runtime.sendMessage({ action: 'sc-search-styles', query, domain }, (res) => {
      searchLoading.style.display = 'none';
      if (chrome.runtime.lastError) {
        searchResults.innerHTML = '<div class="empty-msg">Search error: ' + esc(chrome.runtime.lastError.message) + '</div>';
        return;
      }
      if (!res) {
        searchResults.innerHTML = '<div class="empty-msg">No response from background</div>';
        return;
      }
      if (res.error) {
        searchResults.innerHTML = '<div class="empty-msg">' + esc(res.error) + '</div>';
        return;
      }
      if (!res.styles || res.styles.length === 0) {
        searchResults.innerHTML = '<div class="empty-msg">No styles found for "' + esc(query) + '"</div>';
        return;
      }

      installedSet = new Set(res.installed || []);
      resultCount.textContent = res.styles.length + ' styles found';
      resultCount.style.display = 'block';
      renderResults(res.styles);
    });
  }

  function renderResults(styles) {
    searchResults.innerHTML = '';
    styles.forEach(s => {
      const isInstalled = installedSet.has(s.id);
      const card = document.createElement('div');
      card.className = 's-card' + (isInstalled ? ' installed' : '');

      // Thumbnail — only render if exists
      let thumbHTML = '';
      if (s.thumb) {
        thumbHTML = '<img class="s-thumb" src="' + esc(s.thumb) + '" alt="' + esc(s.name) + '" loading="lazy"/>';
      }

      card.innerHTML = thumbHTML +
        '<div class="s-body">' +
          '<div class="s-name">' + esc(s.name) + '</div>' +
          '<div class="s-meta">' +
            (s.author ? '<span>by ' + esc(s.author) + '</span>' : '') +
            '<span>' + esc(s.installs) + ' installs</span>' +
          '</div>' +
          '<div class="s-actions">' +
            '<button class="s-btn preview" data-action="preview">Preview</button>' +
            '<button class="s-btn install' + (isInstalled ? ' done' : '') + '" data-action="install">' +
              (isInstalled ? 'Installed' : 'Install') +
            '</button>' +
            '<button class="s-btn uninstall" data-action="uninstall" style="' + (isInstalled ? '' : 'display:none') + '">Uninstall</button>' +
          '</div>' +
        '</div>';

      // Click on thumb = open USw page
      const thumbEl = card.querySelector('.s-thumb');
      if (thumbEl) {
        thumbEl.style.cursor = 'pointer';
        thumbEl.addEventListener('click', () => window.open(s.url, '_blank'));
      }

      // Preview button: toggle live CSS on the page
      const pvBtn = card.querySelector('[data-action="preview"]');
      if (pvBtn) {
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
      installBtn.addEventListener('click', () => doInstall(card, s, installBtn));

      // Uninstall button
      const uninstallBtn = card.querySelector('[data-action="uninstall"]');
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
})();
