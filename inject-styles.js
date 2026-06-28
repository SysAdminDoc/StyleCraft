/* StyleCraft v1.9.0 — Style Injector (document_start) */
(function() {
  if (window.__stylecraft_injected) return;
  window.__stylecraft_injected = true;

  const THEME_ID = 'stylecraft-theme-styles';
  const CUSTOM_ID = 'stylecraft-custom-styles';
  const PREVIEW_ID = 'stylecraft-preview-styles';

  function ensureEl(id) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      (document.head || document.documentElement).appendChild(el);
    }
    return el;
  }

  function getDomain() {
    try { return new URL(location.href).hostname; } catch { return location.hostname; }
  }

  function domainMatches(pageDomain, storedKey) {
    if (!storedKey) return false;
    if (storedKey.includes(',')) return storedKey.split(',').map(p => p.trim()).some(p => domainMatches(pageDomain, p));
    if (storedKey.includes('*')) {
      const re = new RegExp('^' + storedKey.replace(/[.+?{}|()[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      return re.test(pageDomain);
    }
    return pageDomain === storedKey || pageDomain.endsWith('.' + storedKey);
  }

  /* Advanced URL pattern matching via appliesTo array */
  function entryMatchesPage(storedKey, data, pageDomain, pageUrl) {
    const patterns = data.appliesTo;
    if (!patterns || !patterns.length) return domainMatches(pageDomain, storedKey);
    for (const p of patterns) {
      if (patternMatchesUrl(p, pageDomain, pageUrl)) return true;
    }
    return false;
  }

  function patternMatchesUrl(p, pageDomain, pageUrl) {
    if (!p || !p.value) return false;
    const v = p.value;
    switch (p.type) {
      case 'domain':
        return pageDomain === v || pageDomain.endsWith('.' + v);
      case 'url':
        return pageUrl === v;
      case 'url-prefix':
        return pageUrl.startsWith(v);
      case 'regexp':
        try { return new RegExp(v).test(pageUrl); } catch { return false; }
      case 'wildcard': {
        if (v.includes('://') || v.includes('/')) {
          const re = new RegExp('^' + v.replace(/[.+?{}|()[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
          return re.test(pageUrl);
        }
        return domainMatches(pageDomain, v);
      }
      default:
        return domainMatches(pageDomain, v);
    }
  }

  /* Read directly from storage — no service worker needed */
  function applyFromStorage() {
    chrome.storage.local.get(['stylecraft_data', 'stylecraft_settings'], (result) => {
      if (chrome.runtime.lastError) {
        setTimeout(() => chrome.storage.local.get(['stylecraft_data', 'stylecraft_settings'], applyData), 200);
        return;
      }
      applyData(result);
    });
  }

  function applyData(result) {
    const allData = (result && result.stylecraft_data) || {};
    const settings = (result && result.stylecraft_settings) || {};
    const pageDomain = getDomain();
    const pageUrl = location.href;

    let themeCSS = '', customCSS = '', customEnabled = true;
    let foundCustom = false;

    // Find matching domain entry
    for (const [pattern, data] of Object.entries(allData)) {
      if (entryMatchesPage(pattern, data, pageDomain, pageUrl)) {
        for (const [id, theme] of Object.entries(data.themes || {})) {
          if (theme.enabled !== false) {
            const raw = theme.rawCSS || theme.css || '';
            const resolved = simpleResolve(raw, pageUrl, pageDomain);
            if (resolved.trim()) themeCSS += (themeCSS ? '\n' : '') + resolved;
          }
        }
        if (!foundCustom && data.customCSS) {
          customCSS = data.customCSS;
          customEnabled = data.customEnabled !== false;
          foundCustom = true;
        }
      }
    }

    const globalCSS = settings.globalCSS || '';

    const themeEl = ensureEl(THEME_ID);
    themeEl.textContent = (globalCSS ? globalCSS + '\n' : '') + themeCSS;

    const customEl = ensureEl(CUSTOM_ID);
    customEl.textContent = (customCSS && customEnabled) ? customCSS : '';

    const parent = document.head || document.documentElement;
    if (themeEl.nextSibling !== customEl) {
      parent.appendChild(themeEl);
      parent.appendChild(customEl);
    }
  }

  /* Lightweight @-moz-document resolver */
  function simpleResolve(raw, pageUrl, pageDomain) {
    if (!raw || !raw.trim()) return '';
    if (!/@(-moz-)?document\b/.test(raw)) return raw;

    let out = '';
    const re = /@(?:-moz-)?document\s+([^{]+)\{/g;
    let match, lastEnd = 0;

    while ((match = re.exec(raw)) !== null) {
      // Plain CSS before this block
      const plain = raw.substring(lastEnd, match.index).trim();
      if (plain) out += (out ? '\n' : '') + plain;

      const condStr = match[1].trim();
      const bodyStart = match.index + match[0].length;
      let depth = 1, i = bodyStart;
      while (i < raw.length && depth > 0) {
        if (raw[i] === '{') depth++;
        else if (raw[i] === '}') depth--;
        i++;
      }
      const body = raw.substring(bodyStart, i - 1).trim();
      lastEnd = i;
      re.lastIndex = i;

      if (matchConditions(condStr, pageUrl, pageDomain) && body) {
        out += (out ? '\n' : '') + body;
      }
    }
    // Trailing plain CSS
    const trail = raw.substring(lastEnd).trim();
    if (trail) out += (out ? '\n' : '') + trail;
    return out;
  }

  function matchConditions(condStr, pageUrl, pageDomain) {
    const conds = condStr.match(/(domain|url|url-prefix|regexp)\s*\(["']?([^"')]+)["']?\)/g);
    if (!conds || conds.length === 0) return true;
    for (const c of conds) {
      const m = c.match(/(domain|url|url-prefix|regexp)\s*\(["']?([^"')]+)["']?\)/);
      if (!m) continue;
      const [, fn, val] = m;
      if (fn === 'domain' && (pageDomain === val || pageDomain.endsWith('.' + val))) return true;
      if (fn === 'url' && pageUrl === val) return true;
      if (fn === 'url-prefix' && pageUrl.startsWith(val)) return true;
      if (fn === 'regexp') { try { if (new RegExp(val).test(pageUrl)) return true; } catch {} }
    }
    return false;
  }

  /* Init */
  applyFromStorage();

  /* Re-apply once head is available */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFromStorage, { once: true });
  }

  /* Listen for live updates */
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'sc-styles-updated') applyFromStorage();
    if (msg.action === 'sc-apply-preview') {
      const el = ensureEl(PREVIEW_ID);
      el.textContent = msg.css || '';
      (document.head || document.documentElement).appendChild(el);
    }
    if (msg.action === 'sc-end-preview') {
      const el = document.getElementById(PREVIEW_ID);
      if (el) el.remove();
    }
  });
})();
