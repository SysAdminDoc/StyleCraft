/* StyleCraft v1.25.0 - UserStyles.world catalog adapter */
(function(global) {
  if (global.StyleCraftUSw) return;

  const BASE_URL = 'https://userstyles.world';
  const SEARCH_SORT = 'mostinstalls';
  const CACHE_VERSION = 1;
  const MAX_CACHE_ENTRIES = 12;

  function cleanText(value) {
    return decodeEntities(stripTags(value)).replace(/\s+/g, ' ').trim();
  }

  function stripTags(value) {
    return String(value || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '');
  }

  function decodeEntities(value) {
    return String(value || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity) => {
      const key = entity.toLowerCase();
      if (key === 'amp') return '&';
      if (key === 'lt') return '<';
      if (key === 'gt') return '>';
      if (key === 'quot') return '"';
      if (key === 'apos' || key === '#39') return "'";
      if (key.startsWith('#x')) {
        const code = parseInt(key.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      if (key.startsWith('#')) {
        const code = parseInt(key.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return match;
    });
  }

  function normalizeUrl(value) {
    const url = decodeEntities(String(value || '').trim());
    if (!url) return '';
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return BASE_URL + url;
    return url;
  }

  function previewFromThumbnail(url) {
    return normalizeUrl(url).replace(/(\d+)t\.(webp|jpe?g|png)$/i, '$1.$2');
  }

  function parseCount(value) {
    const text = String(value || '').replace(/,/g, '').trim();
    const match = text.match(/(\d+(?:\.\d+)?)\s*([km])?/i);
    if (!match) return '';
    const raw = parseFloat(match[1]);
    const multiplier = match[2] && match[2].toLowerCase() === 'm' ? 1000000 : (match[2] ? 1000 : 1);
    return String(Math.round(raw * multiplier));
  }

  function attrMatch(block, attr) {
    const re = new RegExp(attr + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", 'i');
    const match = String(block || '').match(re);
    return match ? decodeEntities(match[2]) : '';
  }

  function parseResultCount(html) {
    const match = String(html || '').match(/Found\s+([\d,]+)\s+results/i);
    return match ? parseInt(match[1].replace(/,/g, ''), 10) : null;
  }

  function parseStyleCard(block) {
    const idMatch = String(block || '').match(/href=["']\/style\/(\d+)\/?["']/i);
    if (!idMatch) return null;
    const id = idMatch[1];
    const nameRe = new RegExp('<a\\b[^>]*class=["\'][^"\']*\\bname\\b[^"\']*["\'][^>]*href=["\']/style/' + id + '/?["\'][^>]*>([\\s\\S]*?)<\\/a>', 'i');
    const nameMatch = block.match(nameRe);
    const headerMatch = block.match(/<a\b[^>]*class=["'][^"']*\bcard-header\b[^"']*["'][^>]*>/i);
    const ariaLabel = headerMatch ? attrMatch(headerMatch[0], 'aria-label').replace(/\s+screenshot$/i, '') : '';
    const name = cleanText(nameMatch ? nameMatch[1] : ariaLabel);
    if (!name) return null;

    const authorMatch = block.match(/by\s*<a\b[^>]*href=["']\/user\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i);
    const sourceMatch = block.match(/<source\b[^>]*srcset=["']([^"']+)["']/i);
    const imageMatch = block.match(/<img\b[^>]*src=["']([^"']+)["']/i);
    const installTip = block.match(/data-tooltip=["']([\d,]+)\s+total installs["']/i);
    const installText = block.match(/>\s*([\d,.]+[km]?)\s+installs?\s*</i);
    const thumb = normalizeUrl(sourceMatch ? sourceMatch[1] : (imageMatch ? imageMatch[1] : ''));
    const updatedMatch = block.match(/<time\b[^>]*datetime=["']([^"']+)["']/i);

    return {
      id,
      name,
      url: BASE_URL + '/style/' + id + '/',
      thumb,
      preview: previewFromThumbnail(thumb),
      author: authorMatch ? cleanText(authorMatch[1]) : '',
      installs: parseCount(installTip ? installTip[1] : (installText ? installText[1] : '0')),
      updatedAt: updatedMatch ? decodeEntities(updatedMatch[1]) : ''
    };
  }

  function splitStyleCards(html) {
    return String(html || '').split(/<div\s+class=["']card col gap["']\s*>/i).slice(1);
  }

  function hasNextPage(html, page) {
    const nextPage = Number(page || 1) + 1;
    const nextLink = new RegExp('href=["\'][^"\']*[?&]page=' + nextPage + '(?:&|["\'])', 'i');
    return nextLink.test(html) || /class=["'][^"']*\bnext\b[^"']*["']/i.test(html);
  }

  function parseSearchHtml(html, context) {
    const opts = Object.assign({ page: 1, query: '' }, context || {});
    const text = String(html || '');
    const cards = splitStyleCards(text);
    const styles = [];
    for (const card of cards) {
      const parsed = parseStyleCard(card);
      if (parsed) styles.push(parsed);
    }

    const total = parseResultCount(text);
    if (!styles.length && (cards.length > 0 || (total && total > 0))) {
      throw new Error('UserStyles.world search markup changed; no style cards could be parsed.');
    }

    return {
      styles,
      hasMore: hasNextPage(text, opts.page),
      page: Number(opts.page || 1),
      query: String(opts.query || ''),
      total,
      source: 'usw-html-search',
      parsedCards: cards.length
    };
  }

  function buildSearchUrl(query, page) {
    const url = new URL('/search', BASE_URL);
    url.searchParams.set('q', String(query || '').trim());
    url.searchParams.set('sort', SEARCH_SORT);
    url.searchParams.set('page', String(Math.max(1, Number(page || 1))));
    return url.href;
  }

  async function searchStyles(options) {
    const opts = Object.assign({ page: 1, fetchImpl: global.fetch && global.fetch.bind(global) }, options || {});
    const query = String(opts.query || '').trim();
    if (!query) throw new Error('Search query is required.');
    if (!opts.fetchImpl) throw new Error('No fetch implementation available.');
    const page = Math.max(1, Number(opts.page || 1));
    const url = buildSearchUrl(query, page);
    const response = await opts.fetchImpl(url, { headers: { Accept: 'text/html' } });
    if (!response || !response.ok) throw new Error('UserStyles.world search HTTP ' + (response ? response.status : 'failed'));
    const html = await response.text();
    return parseSearchHtml(html, { query, page, url });
  }

  function cacheKey(query, page) {
    return String(query || '').trim().toLowerCase() + '::' + Math.max(1, Number(page || 1));
  }

  function normalizeCache(cache) {
    const input = cache && typeof cache === 'object' ? cache : {};
    return {
      version: CACHE_VERSION,
      entries: input.entries && typeof input.entries === 'object' ? Object.assign({}, input.entries) : {},
      order: Array.isArray(input.order) ? input.order.slice() : []
    };
  }

  function cleanSearchResult(result) {
    const copy = Object.assign({}, result || {});
    delete copy.error;
    delete copy.warning;
    delete copy.stale;
    return copy;
  }

  function putSearchCacheEntry(cache, query, page, result, nowMs) {
    const next = normalizeCache(cache);
    const key = cacheKey(query, page);
    next.entries[key] = {
      query: String(query || '').trim(),
      page: Math.max(1, Number(page || 1)),
      cachedAt: Number(nowMs || Date.now()),
      result: cleanSearchResult(result)
    };
    next.order = [key].concat(next.order.filter(item => item !== key));
    while (next.order.length > MAX_CACHE_ENTRIES) {
      const drop = next.order.pop();
      delete next.entries[drop];
    }
    return next;
  }

  function getSearchCacheEntry(cache, query, page) {
    const normalized = normalizeCache(cache);
    return normalized.entries[cacheKey(query, page)] || null;
  }

  async function readCache(readCacheFn) {
    try {
      return typeof readCacheFn === 'function' ? await readCacheFn() : null;
    } catch {
      return null;
    }
  }

  async function writeCache(writeCacheFn, cache) {
    try {
      if (typeof writeCacheFn === 'function') await writeCacheFn(cache);
    } catch {}
  }

  async function searchStylesWithCache(options) {
    const opts = Object.assign({ page: 1 }, options || {});
    try {
      const result = await searchStyles(opts);
      const existing = await readCache(opts.readCache);
      await writeCache(opts.writeCache, putSearchCacheEntry(existing, opts.query, opts.page, result, opts.nowMs || Date.now()));
      return result;
    } catch (error) {
      const existing = await readCache(opts.readCache);
      const cached = getSearchCacheEntry(existing, opts.query, opts.page);
      if (cached && cached.result && Array.isArray(cached.result.styles)) {
        return Object.assign({}, cached.result, {
          stale: true,
          warning: error.message || String(error),
          source: cached.result.source || 'usw-cache'
        });
      }
      throw error;
    }
  }

  function assertStyleId(id) {
    const clean = String(id || '').trim();
    if (!/^\d+$/.test(clean)) throw new Error('Invalid UserStyles.world style id.');
    return clean;
  }

  function normalizeStyleDetail(json, id) {
    const data = json && json.data && typeof json.data === 'object' ? json.data : (json || {});
    return {
      id: String(data.id || id),
      name: data.name || ('Style #' + id),
      rawCSS: data.code || data.css || '',
      previewUrl: normalizeUrl(data.preview_url || data.preview || ''),
      updatedAt: data.updated_at || data.updatedAt || '',
      description: data.description || '',
      license: data.license || '',
      homepage: data.homepage || data.homepageURL || '',
      sourceUrl: BASE_URL + '/api/style/' + id + '.user.css'
    };
  }

  async function fetchStyleDetails(id, fetchImpl) {
    const styleId = assertStyleId(id);
    const request = fetchImpl || (global.fetch && global.fetch.bind(global));
    if (!request) throw new Error('No fetch implementation available.');
    const response = await request(BASE_URL + '/api/style/' + styleId, { headers: { Accept: 'application/json' } });
    if (!response || !response.ok) throw new Error('UserStyles.world detail HTTP ' + (response ? response.status : 'failed'));
    return normalizeStyleDetail(await response.json(), styleId);
  }

  async function fetchStyleSource(id, fetchImpl) {
    const styleId = assertStyleId(id);
    const request = fetchImpl || (global.fetch && global.fetch.bind(global));
    if (!request) throw new Error('No fetch implementation available.');
    const response = await request(BASE_URL + '/api/style/' + styleId + '.user.css', { headers: { Accept: 'text/css,*/*' } });
    if (!response || !response.ok) throw new Error('UserStyles.world source HTTP ' + (response ? response.status : 'failed'));
    return await response.text();
  }

  async function fetchStyle(id, fetchImpl) {
    let details = null;
    try {
      details = await fetchStyleDetails(id, fetchImpl);
    } catch {}
    if (details && details.rawCSS && details.rawCSS.trim()) return details;
    const source = await fetchStyleSource(id, fetchImpl);
    return Object.assign({ id: String(id), name: 'Style #' + id, sourceUrl: BASE_URL + '/api/style/' + id + '.user.css' }, details || {}, { rawCSS: source });
  }

  global.StyleCraftUSw = {
    BASE_URL,
    SEARCH_SORT,
    buildSearchUrl,
    parseSearchHtml,
    parseStyleCard,
    searchStyles,
    searchStylesWithCache,
    cacheKey,
    normalizeCache,
    putSearchCacheEntry,
    getSearchCacheEntry,
    fetchStyle,
    fetchStyleDetails,
    fetchStyleSource
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
