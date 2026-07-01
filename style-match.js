/* StyleCraft v1.26.0 - shared URL and style matcher */
(function(global) {
  if (global.StyleCraftMatcher) return;

  function extractDomain(pageUrl) {
    try { return new URL(pageUrl).hostname; } catch {}
    return String(pageUrl || '').replace(/^https?:\/\//i, '').split('/')[0];
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }

  function safeRegexTest(pattern, input) {
    if (pattern.length > 500) return false;
    try {
      return new RegExp(pattern).test(input);
    } catch { return false; }
  }

  function wildcardRegExp(value) {
    return new RegExp('^' + escapeRegExp(value).replace(/\*/g, '.*') + '$');
  }

  function splitComma(value) {
    return String(value || '').split(',').map(part => part.trim()).filter(Boolean);
  }

  function domainMatches(pageDomain, storedKey) {
    const domain = String(pageDomain || '').toLowerCase();
    const key = String(storedKey || '').trim().toLowerCase();
    if (!key) return false;
    if (key === '*') return true;
    const parts = splitComma(key);
    if (parts.length > 1) return parts.some(part => domainMatches(domain, part));
    if (key.includes('*')) {
      try { return wildcardRegExp(key).test(domain); } catch { return false; }
    }
    return domain === key || domain.endsWith('.' + key);
  }

  function storedKeyMatchesPage(storedKey, pageUrl, pageDomain) {
    const key = String(storedKey || '').trim();
    if (!key) return false;
    if (key === '*') return true;
    const url = String(pageUrl || '');
    const domain = pageDomain || extractDomain(url);
    const parts = splitComma(key);
    if (parts.length > 1) return parts.some(part => storedKeyMatchesPage(part, url, domain));
    if (key.startsWith('^')) {
      return safeRegexTest(key, url);
    }
    if (key.includes('*')) {
      try {
        const re = wildcardRegExp(key);
        return re.test(domain) || re.test(url);
      } catch { return false; }
    }
    return domainMatches(domain, key);
  }

  function patternMatchesUrl(pattern, pageUrl, pageDomain) {
    if (!pattern || !pattern.value) return false;
    const type = String(pattern.type || 'domain').trim().toLowerCase();
    const value = String(pattern.value || '').trim();
    if (!value) return false;
    const url = String(pageUrl || '');
    const domain = pageDomain || extractDomain(url);

    switch (type) {
      case 'domain':
        return domainMatches(domain, value);
      case 'url':
        return url === value;
      case 'url-prefix':
        return url.startsWith(value);
      case 'regexp':
        return safeRegexTest(value, url);
      case 'wildcard':
        if (value.includes('://') || value.includes('/')) {
          try { return wildcardRegExp(value).test(url); } catch { return false; }
        }
        return domainMatches(domain, value);
      default:
        return storedKeyMatchesPage(value, url, domain);
    }
  }

  function entryMatchesPage(storedKey, data, pageUrl, pageDomain) {
    const url = String(pageUrl || '');
    const domain = pageDomain || extractDomain(url);
    const patterns = Array.isArray(data && data.appliesTo) ? data.appliesTo : [];
    const activePatterns = patterns.filter(pattern => pattern && String(pattern.value || '').trim());
    if (!activePatterns.length) return storedKeyMatchesPage(storedKey, url, domain);
    return activePatterns.some(pattern => patternMatchesUrl(pattern, url, domain));
  }

  function matchingEntries(allData, pageUrl) {
    const url = String(pageUrl || '');
    const domain = extractDomain(url);
    return Object.entries(allData || {}).filter(([storedKey, data]) => entryMatchesPage(storedKey, data, url, domain));
  }

  function documentConditionsMatch(conditions, pageUrl, pageDomain) {
    const url = String(pageUrl || '');
    const domain = pageDomain || extractDomain(url);
    const parts = String(conditions || '').match(/(?:domain|url-prefix|url|regexp)\s*\(\s*(['"]?)(.*?)\1\s*\)/gi);
    if (!parts || !parts.length) return true;

    for (const part of parts) {
      const match = part.match(/(domain|url-prefix|url|regexp)\s*\(\s*([\s\S]*?)\s*\)$/i);
      if (!match) continue;
      const type = match[1].toLowerCase();
      let value = match[2].trim();
      const quote = value[0];
      if ((quote === '"' || quote === "'") && value.endsWith(quote)) value = value.slice(1, -1);
      if (type === 'domain' && domainMatches(domain, value)) return true;
      if (type === 'url' && url === value) return true;
      if (type === 'url-prefix' && url.startsWith(value)) return true;
      if (type === 'regexp') {
        if (safeRegexTest(value, url)) return true;
      }
    }
    return false;
  }

  global.StyleCraftMatcher = {
    extractDomain,
    domainMatches,
    storedKeyMatchesPage,
    patternMatchesUrl,
    entryMatchesPage,
    matchingEntries,
    documentConditionsMatch
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
