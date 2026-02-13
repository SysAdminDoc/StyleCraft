/* StyleCraft v1.0.0 — Background Service Worker */

async function injectAndSend(tabId, message) {
  try { await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); } catch {}
  setTimeout(() => { chrome.tabs.sendMessage(tabId, message).catch(() => {}); }, 100);
}

const getStorage = (k) => new Promise(r => chrome.storage.local.get(k, r));
const setStorage = (d) => new Promise(r => chrome.storage.local.set(d, r));
function extractDomain(url) { try { return new URL(url).hostname; } catch { return url; } }

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

  for (const [pattern, data] of Object.entries(all)) {
    if (matchDomain(url, domain, pattern)) {
      // Themes layer
      for (const [id, theme] of Object.entries(data.themes || {})) {
        if (theme.enabled !== false) {
          const resolved = resolveUserCSS(theme.rawCSS || theme.css || '', url);
          if (resolved.trim()) themeCSS += (themeCSS ? '\n\n' : '') + '/* USw:' + id + ' ' + (theme.name||'').replace(/\*\//g,'') + ' */\n' + resolved;
        }
      }
      // Custom layer
      customCSS = data.customCSS || '';
      customEnabled = data.customEnabled !== false;
      break;
    }
  }
  return { themeCSS, customCSS, customEnabled, domain };
}

function matchDomain(url, domain, pattern) {
  if (!pattern) return false;
  if (pattern.includes(',')) return pattern.split(',').map(p => p.trim()).some(p => matchDomain(url, domain, p));
  if (pattern.startsWith('^')) { try { return new RegExp(pattern).test(url); } catch { return false; } }
  if (pattern.includes('*')) {
    const re = new RegExp('^' + pattern.replace(/[.+?{}|()[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    return re.test(domain) || re.test(url);
  }
  return domain === pattern || domain.endsWith('.' + pattern);
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
  // Parse conditions: domain("x"), url("x"), url-prefix("x"), regexp("x")
  const parts = conditions.match(/(?:domain|url-prefix|url|regexp)\s*\(\s*(['"]?)([^)'"]*)\1\s*\)/gi);
  if (!parts || parts.length === 0) return true; // no conditions = match all

  let hostname;
  try { hostname = new URL(pageUrl).hostname; } catch { hostname = ''; }

  for (const part of parts) {
    const cm = part.match(/(domain|url-prefix|url|regexp)\s*\(\s*['"]?([^)'"]*)/i);
    if (!cm) continue;
    const [, type, value] = cm;
    switch (type.toLowerCase()) {
      case 'domain':
        if (hostname === value || hostname.endsWith('.' + value)) return true;
        break;
      case 'url':
        if (pageUrl === value) return true;
        break;
      case 'url-prefix':
        if (pageUrl.startsWith(value)) return true;
        break;
      case 'regexp':
        try { if (new RegExp(value).test(pageUrl)) return true; } catch {}
        break;
    }
  }
  return false;
}

/* ═══════════════════════════════════════════════════════════
   USw Search & Install
   ═══════════════════════════════════════════════════════════ */

async function searchUSw(query) {
  const url = `https://userstyles.world/search?q=${encodeURIComponent(query)}&sort=installs_weekly`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('USw HTTP ' + resp.status);
  const html = await resp.text();
  const styles = [];
  const cards = html.split('<div class="card col gap">').slice(1);
  for (const block of cards) {
    const chunk = block.substring(0, 2000);
    const idM = chunk.match(/href="\/style\/(\d+)\//);
    const nameM = chunk.match(/class="name[^"]*"[^>]*>([^<]+)/);
    if (!idM || !nameM) continue;
    const id = idM[1];
    const webpM = chunk.match(/srcset="(https:\/\/userstyles\.world\/preview\/[^"]+\.webp)"/);
    const imgM = chunk.match(/src="(https:\/\/userstyles\.world\/preview\/[^"]+\.(?:jpeg|webp))"/);
    const authorM = chunk.match(/class="fg:2" href="\/user\/[^"]*">([^<]+)/);
    const installsM = chunk.match(/([\d,]+)\s*install/);
    const thumbUrl = webpM ? webpM[1] : (imgM ? imgM[1] : '');
    const fullUrl = thumbUrl ? thumbUrl.replace(/t\.(webp|jpeg)$/, '.webp') : '';
    styles.push({ id, name: nameM[1].trim(), url: 'https://userstyles.world/style/' + id + '/',
      thumb: thumbUrl, preview: fullUrl, author: authorM ? authorM[1].trim() : '', installs: installsM ? installsM[1] : '0' });
  }
  return styles;
}

async function fetchUSwCSS(id) {
  const resp = await fetch('https://userstyles.world/api/style/' + id);
  if (!resp.ok) throw new Error('API HTTP ' + resp.status);
  const json = await resp.json();
  const data = json.data || json;
  return { rawCSS: data.code || '', name: data.name || 'Style #' + id };
}

async function installTheme(id, name, domain) {
  const fetched = await fetchUSwCSS(id);
  if (!fetched.rawCSS.trim()) throw new Error('Empty CSS');
  const dd = await getDomainData(domain);
  dd.themes[id] = { rawCSS: fetched.rawCSS, name: fetched.name, enabled: true };
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

function broadcastUpdate(domain) {
  chrome.tabs.query({}, tabs => {
    for (const tab of tabs) {
      if (tab.url) {
        try {
          const d = new URL(tab.url).hostname;
          if (matchDomain(tab.url, d, domain))
            chrome.tabs.sendMessage(tab.id, { action: 'sc-styles-updated' }).catch(() => {});
        } catch {}
      }
    }
  });
}

/* ─── Preview: fetch CSS and send to active tab ─── */
async function previewTheme(id, tabId) {
  const fetched = await fetchUSwCSS(id);
  const tab = await chrome.tabs.get(tabId);
  const css = resolveUserCSS(fetched.rawCSS, tab.url);
  try { await chrome.scripting.executeScript({ target: { tabId }, files: ['inject-styles.js'] }); } catch {}
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
        const dd = await getDomainData(msg.domain);
        dd.customCSS = msg.css;
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
      case 'sc-save-domain-data': { await setDomainData(msg.domain, msg.data); broadcastUpdate(msg.domain); return { ok: true }; }
      case 'sc-get-all-data': return await getAllData();
      case 'sc-export-all': return await getAllData();
      case 'sc-import-all': { await setStorage({ stylecraft_data: msg.data || msg.styles }); return { ok: true }; }
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
          return new Promise(r => setTimeout(() => chrome.tabs.sendMessage(tab.id, { action: 'sc-toggle-readability-get' }, res => r(res || {})), 100));
        }
        return {};
      }
      case 'sc-toggle-grayscale': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }); } catch {}
          return new Promise(r => setTimeout(() => chrome.tabs.sendMessage(tab.id, { action: 'sc-toggle-grayscale-get' }, res => r(res || {})), 100));
        }
        return {};
      }
      case 'sc-get-toggle-state': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }); } catch {}
          return new Promise(r => setTimeout(() => chrome.tabs.sendMessage(tab.id, { action: 'sc-get-toggle-state' }, res => r(res || {})), 100));
        }
        return {};
      }

      case 'sc-search-styles': {
        const styles = await searchUSw(msg.query);
        const installed = await getInstalledIds(msg.domain || '');
        return { styles, installed };
      }
      case 'sc-install-style': return await installTheme(msg.id, msg.name, msg.domain);
      case 'sc-uninstall-style': return await uninstallTheme(msg.id, msg.domain);
      case 'sc-get-installed': return { installed: await getInstalledIds(msg.domain) };

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
        // Broadcast to all tabs for content script editors
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(t => {
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
