/* StyleCraft v1.24.0 - Background Service Worker */
importScripts('style-match.js', 'usercss.js', 'style-data.js', 'usw-adapter.js');

const SC_MATCH = globalThis.StyleCraftMatcher;
const SC_USERCSS = globalThis.StyleCraftUserCSS;
const SC_DATA = globalThis.StyleCraftData;
const SC_USW = globalThis.StyleCraftUSw;
const STYLE_INJECTOR_FILES = ['style-match.js', 'usercss.js', 'inject-styles.js'];
const EDITOR_INJECTOR_FILES = ['content.js'];

async function injectAndSend(tabId, message) {
  const access = await injectFiles(tabId, EDITOR_INJECTOR_FILES);
  setTimeout(() => { chrome.tabs.sendMessage(tabId, message).catch(() => {}); }, 100);
  return { ok: true, siteAccess: access };
}

const getStorage = (k) => new Promise(r => chrome.storage.local.get(k, r));
const setStorage = (d) => new Promise(r => chrome.storage.local.set(d, r));
function extractDomain(url) { return SC_MATCH.extractDomain(url); }

function sitePatternFromUrl(url) {
  try {
    const parsed = new URL(url || '');
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.protocol + '//' + parsed.hostname + '/*';
  } catch {
    return '';
  }
}

function siteOriginFromUrl(url) {
  try {
    const parsed = new URL(url || '');
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.protocol + '//' + parsed.hostname;
  } catch {
    return '';
  }
}

function permissionsContains(request) {
  if (!chrome.permissions || typeof chrome.permissions.contains !== 'function') return Promise.resolve(true);
  return new Promise(resolve => {
    try {
      chrome.permissions.contains(request, granted => {
        void chrome.runtime.lastError;
        resolve(!!granted);
      });
    } catch {
      resolve(false);
    }
  });
}

async function getSiteAccessForUrl(url) {
  const pattern = sitePatternFromUrl(url);
  const origin = siteOriginFromUrl(url);
  if (!pattern) {
    return {
      supported: false,
      granted: false,
      needsPermission: false,
      origin: '',
      pattern: '',
      reason: 'unsupported-url',
      message: 'StyleCraft can only inject into http and https pages.'
    };
  }
  const granted = await permissionsContains({ origins: [pattern] });
  return {
    supported: true,
    granted,
    needsPermission: !granted,
    origin,
    pattern,
    reason: granted ? '' : 'permission-required',
    message: granted ? 'Site access granted.' : 'Site access is required before StyleCraft can inject styles on this site.'
  };
}

async function getSiteAccessForTab(tab) {
  return getSiteAccessForUrl(tab?.url || '');
}

async function getActiveTabAccess() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return { supported: false, granted: false, needsPermission: false, reason: 'no-active-tab', message: 'No active tab.' };
  const siteAccess = await getSiteAccessForTab(tab);
  return { tabId: tab.id, url: tab.url || '', domain: extractDomain(tab.url || ''), ...siteAccess };
}

function siteAccessError(siteAccess) {
  const error = new Error(siteAccess.message || 'Site access is required.');
  error.siteAccess = siteAccess;
  return error;
}

async function ensureTabAccess(tabId) {
  const tab = await chrome.tabs.get(tabId);
  const siteAccess = await getSiteAccessForTab(tab);
  if (!siteAccess.granted) throw siteAccessError(siteAccess);
  return siteAccess;
}

async function injectFiles(tabId, files) {
  const siteAccess = await ensureTabAccess(tabId);
  await chrome.scripting.executeScript({ target: { tabId }, files });
  return siteAccess;
}

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
          const resolved = resolveUserCSS(theme.rawCSS || theme.css || '', url, theme.usercss && theme.usercss.values);
          if (resolved.trim()) themeCSS += (themeCSS ? '\n\n' : '') + '/* USw:' + id + ' ' + (theme.name||'').replace(/\*\//g,'') + ' */\n' + resolved;
        }
      }
      // Custom layer — use the most specific (non-wildcard) match
      if (!foundCustom && data.customCSS) {
        customCSS = resolveUserCSS(data.customCSS, url, data.usercss && data.usercss.values);
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

function resolveUserCSS(rawCSS, pageUrl, values) {
  if (!rawCSS || !rawCSS.trim()) return '';
  return SC_USERCSS.resolveForUrl(rawCSS, pageUrl, extractDomain(pageUrl), SC_MATCH, values);
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
  const parsed = SC_USERCSS.parse(fetched.rawCSS);
  const usercss = parsed.hasMeta || parsed.variables.length || parsed.appliesTo.length ? {
    meta: parsed.meta,
    variables: parsed.variables,
    values: SC_USERCSS.mergeValues(parsed.variables),
    appliesTo: parsed.appliesTo
  } : null;
  const dd = await getDomainData(domain);
  dd.themes[id] = {
    rawCSS: fetched.rawCSS,
    name: (parsed.meta && parsed.meta.name) || fetched.name,
    enabled: true,
    installedAt: new Date().toISOString(),
    sourceUrl: (parsed.meta && parsed.meta.updateURL) || fetched.sourceUrl || '',
    updatedAt: fetched.updatedAt || '',
    meta: parsed.meta || {},
    usercss,
    trust
  };
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
  const data = all[domain] || {};
  chrome.tabs.query({}, tabs => {
    for (const tab of tabs) {
      if (!tab.url || tab.url.startsWith('chrome') || tab.url.startsWith('about:') || tab.url.startsWith('edge:')) continue;
      try {
        if (domain === '*') {
          chrome.tabs.sendMessage(tab.id, { action: 'sc-styles-updated' }).catch(() => {});
        } else {
          const d = new URL(tab.url).hostname;
          if (entryMatchesPage(domain, data, tab.url, d))
            chrome.tabs.sendMessage(tab.id, { action: 'sc-styles-updated' }).catch(() => {});
        }
      } catch {}
    }
  });
  refreshActiveBadge();
}

/* ─── Preview: fetch CSS and send to active tab ─── */
async function previewTheme(id, tabId) {
  await injectFiles(tabId, STYLE_INJECTOR_FILES);
  const fetched = await fetchUSwCSS(id);
  const tab = await chrome.tabs.get(tabId);
  SC_DATA.assertCssAllowed(fetched.rawCSS);
  const css = resolveUserCSS(fetched.rawCSS, tab.url);
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
      case 'sc-get-site-access': return await getActiveTabAccess();
      case 'sc-ensure-style-injector': {
        const [tab] = msg.tabId ? [await chrome.tabs.get(msg.tabId)] : await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return { ok: false, error: 'No active tab' };
        const siteAccess = await injectFiles(tab.id, STYLE_INJECTOR_FILES);
        chrome.tabs.sendMessage(tab.id, { action: 'sc-styles-updated' }).catch(() => {});
        return { ok: true, siteAccess };
      }

      case 'sc-open-editor-from-popup': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) return await injectAndSend(tab.id, { action: 'sc-open-editor-pick' });
        return { ok: false, error: 'No active tab' };
      }
      case 'sc-toggle-readability': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          await injectFiles(tab.id, EDITOR_INJECTOR_FILES);
          return new Promise(r => setTimeout(() => chrome.tabs.sendMessage(tab.id, { action: 'sc-toggle-readability-get', readSettings: msg.readSettings }, res => { void chrome.runtime.lastError; r(res || {}); }), 100));
        }
        return {};
      }
      case 'sc-toggle-grayscale': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          await injectFiles(tab.id, EDITOR_INJECTOR_FILES);
          return new Promise(r => setTimeout(() => chrome.tabs.sendMessage(tab.id, { action: 'sc-toggle-grayscale-get' }, res => { void chrome.runtime.lastError; r(res || {}); }), 100));
        }
        return {};
      }
      case 'sc-get-toggle-state': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          const siteAccess = await getSiteAccessForTab(tab);
          if (!siteAccess.granted) return { readability: false, grayscale: false, siteAccess, needsPermission: siteAccess.needsPermission };
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: EDITOR_INJECTOR_FILES });
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
    sendResponse({ error: e.message || String(e), siteAccess: e.siteAccess, needsPermission: !!e.siteAccess?.needsPermission });
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
  if (info.menuItemId === 'stylecraft-open') injectAndSend(tab.id, { action: 'sc-open-editor-pick' }).catch(() => {});
  if (info.menuItemId === 'stylecraft-hide') injectAndSend(tab.id, { action: 'sc-hide-element' }).catch(() => {});
});
chrome.commands.onCommand.addListener(cmd => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.id && cmd === 'toggle_editor') injectAndSend(tab.id, { action: 'sc-toggle-editor' }).catch(() => {});
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
    const matchedPatterns = [];
    // Count custom CSS
    if (result.customCSS && result.customCSS.trim() && result.customEnabled) count++;
    // Count enabled themes
    const domain = extractDomain(url);
    const all = await getAllData();
    for (const [pattern, data] of Object.entries(all)) {
      if (entryMatchesPage(pattern, data, url, domain)) {
        matchedPatterns.push(pattern);
        for (const [, theme] of Object.entries(data.themes || {})) {
          if (theme.enabled !== false) count++;
        }
      }
    }
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#cba6f7', tabId });
    chrome.action.setBadgeTextColor({ color: '#11111b', tabId }).catch(() => {});
    if (count > 0) bumpMatchAnalytics(matchedPatterns, all);
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

let analyticsTimer = null;
let pendingAnalytics = {};

function bumpMatchAnalytics(matchedPatterns, all) {
  for (const pattern of matchedPatterns) {
    pendingAnalytics[pattern] = (pendingAnalytics[pattern] || 0) + 1;
  }
  if (!analyticsTimer) {
    analyticsTimer = setTimeout(flushAnalytics, 10000);
  }
}

async function flushAnalytics() {
  analyticsTimer = null;
  const pending = pendingAnalytics;
  pendingAnalytics = {};
  if (!Object.keys(pending).length) return;
  try {
    const d = await getStorage('stylecraft_data');
    const all = d.stylecraft_data || {};
    for (const [pattern, count] of Object.entries(pending)) {
      if (!all[pattern]) continue;
      if (!all[pattern].analytics) all[pattern].analytics = { matchCount: 0 };
      all[pattern].analytics.matchCount = (all[pattern].analytics.matchCount || 0) + count;
      all[pattern].analytics.lastMatchedAt = new Date().toISOString();
    }
    await setStorage({ stylecraft_data: all });
  } catch {}
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
