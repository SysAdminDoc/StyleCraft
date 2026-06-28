/* StyleCraft v1.18.0 - Background Service Worker */
importScripts('style-match.js', 'style-data.js', 'usw-adapter.js');

const SC_MATCH = globalThis.StyleCraftMatcher;
const SC_DATA = globalThis.StyleCraftData;
const SC_USW = globalThis.StyleCraftUSw;

async function injectAndSend(tabId, message) {
  try { await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); } catch {}
  setTimeout(() => { chrome.tabs.sendMessage(tabId, message).catch(() => {}); }, 100);
}

const getStorage = (k) => new Promise(r => chrome.storage.local.get(k, r));
const setStorage = (d) => new Promise(r => chrome.storage.local.set(d, r));
function extractDomain(url) { return SC_MATCH.extractDomain(url); }

/* ═══════════════════════════════════════════════════════════
   Storage Model
   stylecraft_data[domain] = {
     themes: { [uswId]: { css, rawCSS, name, enabled } },
     customCSS: '',
     customEnabled: true
   }
   ═══════════════════════════════════════════════════════════ */

async function getDomainData(domain) {
  const d = await getStorage('stylecraft_data');
  const all = d.stylecraft_data || {};
  return all[domain] || { themes: {}, customCSS: '', customEnabled: true };
}

async function setDomainData(domain, data) {
  const d = await getStorage('stylecraft_data');
  const all = d.stylecraft_data || {};
  all[domain] = data;
  await setStorage({ stylecraft_data: all });
}

async function getAllData() {
  const d = await getStorage('stylecraft_data');
  return d.stylecraft_data || {};
}

/* ─── Build CSS for a URL ─── */
async function buildCSSForUrl(url) {
  const domain = extractDomain(url);
  const all = await getAllData();
  let themeCSS = '', customCSS = '', customEnabled = true;
  let foundCustom = false;

  for (const [pattern, data] of Object.entries(all)) {
    if (entryMatchesPage(pattern, data, url, domain)) {
      // Themes layer — aggregate from all matching patterns
      for (const [id, theme] of Object.entries(data.themes || {})) {
        if (theme.enabled !== false) {
          const resolved = resolveUserCSS(theme.rawCSS || theme.css || '', url);
          if (resolved.trim()) themeCSS += (themeCSS ? '\n\n' : '') + '/* USw:' + id + ' ' + (theme.name||'').replace(/\*\//g,'') + ' */\n' + resolved;
        }
      }
      // Custom layer — use the most specific (non-wildcard) match
      if (!foundCustom && data.customCSS) {
        customCSS = data.customCSS;
        customEnabled = data.customEnabled !== false;
        foundCustom = true;
      }
    }
  }
  return { themeCSS, customCSS, customEnabled, domain };
}

function matchDomain(url, domain, pattern) {
  return SC_MATCH.storedKeyMatchesPage(pattern, url, domain);
}

function entryMatchesPage(pattern, data, url, domain) {
  return SC_MATCH.entryMatchesPage(pattern, data, url, domain);
}

/* ═══════════════════════════════════════════════════════════
   @-moz-document / @document Processing (Stylus core logic)
   Evaluates URL-matching directives and extracts applicable CSS
   ═══════════════════════════════════════════════════════════ */

function resolveUserCSS(rawCSS, pageUrl) {
  if (!rawCSS || !rawCSS.trim()) return '';
  // Strip metadata block
  let css = rawCSS.replace(/\/\*\s*==UserStyle==[\s\S]*?==\/UserStyle==\s*\*\//, '').trim();

  // If no @-moz-document or @document rules, return as-is
  if (!/@-?moz-?document|@document/i.test(css)) return css;

  const blocks = [];
  // Match @-moz-document (and @document) blocks
  const re = /@(?:-moz-)?document\s+((?:[^{]|\n)*?)\s*\{/gi;
  let m, lastEnd = 0;

  // Collect top-level CSS before any @-moz-document
  const firstMatch = re.exec(css);
  if (firstMatch && firstMatch.index > 0) {
    const before = css.substring(0, firstMatch.index).trim();
    if (before) blocks.push(before);
  }
  if (firstMatch) re.lastIndex = 0; // reset

  while ((m = re.exec(css)) !== null) {
    const conditions = m[1];
    const bodyStart = m.index + m[0].length;
    // Find matching closing brace (handle nesting)
    let depth = 1, pos = bodyStart;
    while (pos < css.length && depth > 0) {
      if (css[pos] === '{') depth++;
      else if (css[pos] === '}') depth--;
      pos++;
    }
    const body = css.substring(bodyStart, pos - 1).trim();

    if (matchesDocumentConditions(conditions, pageUrl)) {
      blocks.push(body);
    }
  }

  return blocks.join('\n\n');
}

function matchesDocumentConditions(conditions, pageUrl) {
  return SC_MATCH.documentConditionsMatch(conditions, pageUrl);
}

/* ═══════════════════════════════════════════════════════════
   USw Search & Install
   ═══════════════════════════════════════════════════════════ */

async function readUSwSearchCache() {
  const stored = await getStorage('sc_usw_search_cache');
  return stored.sc_usw_search_cache || {};
}

async function writeUSwSearchCache(cache) {
  await setStorage({ sc_usw_search_cache: cache });
}

async function setUSwCatalogStatus(status) {
  try {
    await setStorage({ sc_usw_catalog_status: Object.assign({ timestamp: new Date().toISOString() }, status) });
  } catch {}
}

async function searchUSw(query, page = 1) {
  try {
    const result = await SC_USW.searchStylesWithCache({
      query,
      page,
      fetchImpl: fetch,
      readCache: readUSwSearchCache,
      writeCache: writeUSwSearchCache
    });
    await setUSwCatalogStatus({
      ok: !result.stale,
      stale: !!result.stale,
      message: result.stale ? ('Showing cached results: ' + (result.warning || 'live search failed')) : 'Search completed',
      query: String(query || '').trim(),
      page: result.page,
      styles: (result.styles || []).length,
      source: result.source
    });
    return result;
  } catch (error) {
    await setUSwCatalogStatus({
      ok: false,
      message: error.message || String(error),
      query: String(query || '').trim(),
      page
    });
    throw error;
  }
}

async function fetchUSwCSS(id) {
  const style = await SC_USW.fetchStyle(id, fetch);
  return { rawCSS: style.rawCSS || '', name: style.name || ('Style #' + id), sourceUrl: style.sourceUrl, updatedAt: style.updatedAt };
}

async function installTheme(id, name, domain) {
  const fetched = await fetchUSwCSS(id);
  if (!fetched.rawCSS.trim()) throw new Error('Empty CSS');
  const trust = SC_DATA.assertCssAllowed(fetched.rawCSS);
  const dd = await getDomainData(domain);
  dd.themes[id] = { rawCSS: fetched.rawCSS, name: fetched.name, enabled: true, installedAt: new Date().toISOString(), trust };
  await setDomainData(domain, dd);
  broadcastUpdate(domain);
  return { ok: true, name: fetched.name };
}

async function uninstallTheme(id, domain) {
  const dd = await getDomainData(domain);
  delete dd.themes[id];
  await setDomainData(domain, dd);
  broadcastUpdate(domain);
  return { ok: true };
}

async function getInstalledIds(domain) {
  const dd = await getDomainData(domain);
  return Object.keys(dd.themes || {});
}

async function broadcastUpdate(domain) {
  const all = await getAllData();
  const data = all[domain];
  chrome.tabs.query({}, tabs => {
    for (const tab of tabs) {
      if (!tab.url || tab.url.startsWith('chrome') || tab.url.startsWith('about:') || tab.url.startsWith('edge:')) continue;
      try {
        const d = new URL(tab.url).hostname;
        if (domain === '*' || entryMatchesPage(domain, data, tab.url, d))
          chrome.tabs.sendMessage(tab.id, { action: 'sc-styles-updated' }).catch(() => {});
      } catch {}
    }
  });
  refreshActiveBadge();
}

/* ─── Preview: fetch CSS and send to active tab ─── */
async function previewTheme(id, tabId) {
  const fetched = await fetchUSwCSS(id);
  const tab = await chrome.tabs.get(tabId);
  SC_DATA.assertCssAllowed(fetched.rawCSS);
  const css = resolveUserCSS(fetched.rawCSS, tab.url);
  try { await chrome.scripting.executeScript({ target: { tabId }, files: ['style-match.js', 'inject-styles.js'] }); } catch {}
  setTimeout(() => {
    chrome.tabs.sendMessage(tabId, { action: 'sc-apply-preview', css }).catch(() => {});
  }, 50);
  return { ok: true, name: fetched.name };
}

async function endPreview(tabId) {
  chrome.tabs.sendMessage(tabId, { action: 'sc-end-preview' }).catch(() => {});
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════
   Migration: old format → new
   ═══════════════════════════════════════════════════════════ */
async function migrateIfNeeded() {
  const oldD = await getStorage('stylecraft_styles');
  const old = oldD.stylecraft_styles;
  if (!old || Object.keys(old).length === 0) return;
  const newD = await getStorage('stylecraft_data');
  if (newD.stylecraft_data && Object.keys(newD.stylecraft_data).length > 0) return;
  const migrated = {};
  for (const [domain, entry] of Object.entries(old)) {
    migrated[domain] = { themes: {}, customCSS: entry.css || '', customEnabled: entry.enabled !== false };
  }
  await setStorage({ stylecraft_data: migrated });
  console.log('[SC] migrated', Object.keys(migrated).length, 'domains');
}

/* ═══════════════════════════════════════════════════════════
   Message Handler
   ═══════════════════════════════════════════════════════════ */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.action) {
      case 'sc-get-styles': return await buildCSSForUrl(msg.url || sender.tab?.url || '');

      case 'sc-save-custom': {
        const trust = SC_DATA.assertCssAllowed(msg.css || '');
        const dd = await getDomainData(msg.domain);
        dd.customCSS = msg.css;
        dd.trust = trust;
        if (msg.enabled !== undefined) dd.customEnabled = msg.enabled;
        await setDomainData(msg.domain, dd);
        broadcastUpdate(msg.domain);
        return { ok: true };
      }
      case 'sc-toggle-custom': {
        const dd = await getDomainData(msg.domain);
        dd.customEnabled = msg.enabled;
        await setDomainData(msg.domain, dd);
        broadcastUpdate(msg.domain);
        return { ok: true };
      }
      case 'sc-get-domain-data': return await getDomainData(msg.domain);
      case 'sc-save-domain-data': {
        const checked = guardDomainData(msg.domain, msg.data);
        await setDomainData(msg.domain, checked);
        broadcastUpdate(msg.domain);
        return { ok: true };
      }
      case 'sc-get-all-data': return await getAllData();
      case 'sc-export-all': return await getAllData();
      case 'sc-import-all': {
        const existing = await getAllData();
        const stored = await getStorage(['stylecraft_settings', 'sc_backups']);
        const raw = msg.data || msg.styles || {};
        const plan = SC_DATA.planNativeImport(raw, existing, { mode: msg.mode || 'replace', source: 'runtime import' });
        const backup = SC_DATA.createPreImportBackup(existing, stored.stylecraft_settings || {}, 'runtime import');
        await setStorage({
          stylecraft_data: plan.data,
          stylecraft_import_quarantine: plan.quarantine,
          sc_backups: SC_DATA.addBackup(stored.sc_backups, backup)
        });
        refreshActiveBadge();
        return { ok: true, summary: plan.summary, quarantine: plan.quarantine };
      }
      case 'sc-get-settings': { const d = await getStorage('stylecraft_settings'); return d.stylecraft_settings || {}; }
      case 'sc-save-settings': { await setStorage({ stylecraft_settings: msg.settings }); return { ok: true }; }

      case 'sc-open-editor-from-popup': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) injectAndSend(tab.id, { action: 'sc-open-editor-pick' });
        return { ok: true };
      }
      case 'sc-toggle-readability': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }); } catch {}
          return new Promise(r => setTimeout(() => chrome.tabs.sendMessage(tab.id, { action: 'sc-toggle-readability-get', readSettings: msg.readSettings }, res => { void chrome.runtime.lastError; r(res || {}); }), 100));
        }
        return {};
      }
      case 'sc-toggle-grayscale': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }); } catch {}
          return new Promise(r => setTimeout(() => chrome.tabs.sendMessage(tab.id, { action: 'sc-toggle-grayscale-get' }, res => { void chrome.runtime.lastError; r(res || {}); }), 100));
        }
        return {};
      }
      case 'sc-get-toggle-state': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }); } catch {}
          return new Promise(r => setTimeout(() => chrome.tabs.sendMessage(tab.id, { action: 'sc-get-toggle-state' }, res => { void chrome.runtime.lastError; r(res || {}); }), 100));
        }
        return {};
      }

      case 'sc-search-styles': {
        const result = await searchUSw(msg.query, msg.page || 1);
        const installed = await getInstalledIds(msg.domain || '');
        return {
          styles: result.styles,
          installed,
          hasMore: result.hasMore,
          page: result.page,
          stale: !!result.stale,
          warning: result.warning || '',
          source: result.source || ''
        };
      }
      case 'sc-install-style': return await installTheme(msg.id, msg.name, msg.domain);
      case 'sc-uninstall-style': return await uninstallTheme(msg.id, msg.domain);
      case 'sc-get-installed': return { installed: await getInstalledIds(msg.domain) };
      case 'sc-check-theme-update': {
        const fetched = await fetchUSwCSS(msg.id);
        const trust = SC_DATA.analyzeCssTrust(fetched.rawCSS || '');
        return { css: fetched.rawCSS || '', trust };
      }

      case 'sc-preview-style': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) return await previewTheme(msg.id, tab.id);
        throw new Error('No active tab');
      }
      case 'sc-end-preview': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) return await endPreview(tab.id);
        return { ok: true };
      }
      case 'sc-theme-changed': {
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(t => {
            if (!t.url || t.url.startsWith('chrome') || t.url.startsWith('about:')) return;
            chrome.tabs.sendMessage(t.id, msg).catch(() => {});
          });
        });
        return { ok: true };
      }
      case 'sc-open-options': {
        const tab = msg.tab || '';
        chrome.runtime.openOptionsPage(() => {
          // Send tab selection after a short delay to let page load
          if (tab) setTimeout(() => {
            chrome.runtime.sendMessage({action:'sc-select-options-tab', tab});
          }, 300);
        });
        return { ok: true };
      }
      default: return null;
    }
  })().then(r => sendResponse(r)).catch(e => {
    console.error('[SC]', msg.action, e);
    sendResponse({ error: e.message || String(e) });
  });
  return true;
});

function guardDomainData(domain, data) {
  const normalized = SC_DATA.normalizeStyleData({ [domain]: data || {} });
  if (!normalized.data[domain]) throw new Error('No valid style data for ' + domain);
  return normalized.data[domain];
}

chrome.runtime.onInstalled.addListener(() => {
  migrateIfNeeded();
  chrome.contextMenus.create({ id: 'stylecraft-open', title: 'Style this element', contexts: ['all'] });
  chrome.contextMenus.create({ id: 'stylecraft-hide', title: 'Hide this element', contexts: ['all'] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === 'stylecraft-open') injectAndSend(tab.id, { action: 'sc-open-editor-pick' });
  if (info.menuItemId === 'stylecraft-hide') injectAndSend(tab.id, { action: 'sc-hide-element' });
});
chrome.commands.onCommand.addListener(cmd => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.id && cmd === 'toggle_editor') injectAndSend(tab.id, { action: 'sc-toggle-editor' });
  });
});

/* ═══════════════════════════════════════════════════════════
   Badge — shows count of active styles for current tab
   ═══════════════════════════════════════════════════════════ */
async function updateBadge(tabId, url) {
  if (!tabId || !url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
    return;
  }
  try {
    const result = await buildCSSForUrl(url);
    let count = 0;
    // Count custom CSS
    if (result.customCSS && result.customCSS.trim() && result.customEnabled) count++;
    // Count enabled themes
    const domain = extractDomain(url);
    const all = await getAllData();
    for (const [pattern, data] of Object.entries(all)) {
      if (entryMatchesPage(pattern, data, url, domain)) {
        for (const [, theme] of Object.entries(data.themes || {})) {
          if (theme.enabled !== false) count++;
        }
      }
    }
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#cba6f7', tabId });
    chrome.action.setBadgeTextColor({ color: '#11111b', tabId }).catch(() => {});
  } catch { chrome.action.setBadgeText({ text: '', tabId }).catch(() => {}); }
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, tab => {
    if (chrome.runtime.lastError || !tab?.url) return;
    updateBadge(tabId, tab.url);
  });
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab?.url) updateBadge(tabId, tab.url);
});

/* Refresh badge when storage changes (covers direct writes from options page) */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.stylecraft_data) refreshActiveBadge();
});

function refreshActiveBadge() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.id && tab.url) updateBadge(tab.id, tab.url);
  });
}

/* ═══════════════════════════════════════════════════════════
   Auto-Backup — daily, keeps last 3 snapshots
   ═══════════════════════════════════════════════════════════ */
chrome.alarms.create('sc-auto-backup', { periodInMinutes: 1440 }); // every 24h

async function setBackupStatus(status) {
  try {
    await chrome.storage.local.set({ sc_backup_status: Object.assign({ timestamp: new Date().toISOString() }, status) });
  } catch {}
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'sc-auto-backup') return;
  try {
    const result = await chrome.storage.local.get(['stylecraft_data', 'stylecraft_settings', 'sc_backups']);
    const data = result.stylecraft_data;
    if (!data || !Object.keys(data).length) {
      await setBackupStatus({ ok: true, skipped: true, message: 'No styles to back up', domains: 0 });
      return;
    }
    const backups = result.sc_backups || [];
    backups.unshift({ data, settings: result.stylecraft_settings || {}, timestamp: new Date().toISOString() });
    // Keep only last 3
    while (backups.length > 3) backups.pop();
    await chrome.storage.local.set({ sc_backups: backups });
    await setBackupStatus({ ok: true, message: 'Backup completed', domains: Object.keys(data).length });
  } catch (error) {
    await setBackupStatus({ ok: false, message: error.message || String(error) });
  }
});
