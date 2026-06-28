import { expect, test } from '@playwright/test';
import path from 'node:path';

const repoRoot = process.cwd();

const searchHtml = `
  <section>
    <div class="search-perf-metrics"><span>Found 2 results in 10ms.</span></div>
    <div class="grid flex rwrap mx:r mt:m">
      <div class="card col gap">
        <a href="/style/27498/" class="card-header thumbnail" aria-label="GitHub &amp; Dark screenshot">
          <picture>
            <source srcset="https://userstyles.world/preview/27498/0t.webp" type="image/webp">
            <img src="https://userstyles.world/preview/27498/0t.jpeg" alt="Screenshot">
          </picture>
        </a>
        <div class="card-body f:col p:m">
          <small><time datetime="2026-05-01T23:06:31Z">updated</time></small>
          <a class="name fg:1 f:h3 f:b" href="/style/27498/">GitHub &amp; Dark</a>
          <span class="author fg:4">by <a class="fg:2" href="/user/AuthorOne">AuthorOne</a></span>
        </div>
        <div class="card-footer flex jc:b py:m px:m">
          <span class="ml:s" data-tooltip="1,234 total installs">1.2k installs</span>
        </div>
      </div>
      <div class="card col gap">
        <a href="/style/2/" class="card-header thumbnail" aria-label="Dark-GitHub screenshot"></a>
        <div class="card-body f:col p:m">
          <a class="name fg:1 f:h3 f:b" href="/style/2/">Dark-GitHub</a>
          <span class="author fg:4">by <a class="fg:2" href="/user/vednoc">vednoc</a></span>
        </div>
        <div class="card-footer flex jc:b py:m px:m">
          <span class="ml:s" data-tooltip="93,444 total installs">93.4k installs</span>
        </div>
      </div>
    </div>
    <a class="Pagination-button icon next" href="/search?page=2&amp;sort=mostinstalls&amp;q=github">Next</a>
  </section>
`;

test('UserStyles.world adapter parses current search-card shape and detects markup drift', async ({ page }) => {
  await page.addScriptTag({ path: path.join(repoRoot, 'usw-adapter.js') });

  const parsed = await page.evaluate((html) => {
    const adapter = window.StyleCraftUSw;
    return {
      url: adapter.buildSearchUrl('github dark', 2),
      result: adapter.parseSearchHtml(html, { query: 'github', page: 1 }),
      drift: (() => {
        try {
          adapter.parseSearchHtml('<div class="search-perf-metrics">Found 2 results in 1ms.</div>', { query: 'github', page: 1 });
          return '';
        } catch (error) {
          return error.message;
        }
      })()
    };
  }, searchHtml);

  expect(parsed.url).toBe('https://userstyles.world/search?q=github+dark&sort=mostinstalls&page=2');
  expect(parsed.result.styles).toHaveLength(2);
  expect(parsed.result.styles[0]).toMatchObject({
    id: '27498',
    name: 'GitHub & Dark',
    author: 'AuthorOne',
    installs: '1234',
    thumb: 'https://userstyles.world/preview/27498/0t.webp',
    preview: 'https://userstyles.world/preview/27498/0.webp',
    updatedAt: '2026-05-01T23:06:31Z'
  });
  expect(parsed.result.styles[1].installs).toBe('93444');
  expect(parsed.result.hasMore).toBe(true);
  expect(parsed.drift).toContain('markup changed');
});

test('UserStyles.world adapter writes and serves cached search results on live failure', async ({ page }) => {
  await page.addScriptTag({ path: path.join(repoRoot, 'usw-adapter.js') });

  const result = await page.evaluate(async (html) => {
    const adapter = window.StyleCraftUSw;
    let cache = null;
    const okFetch = async () => new Response(html, { status: 200 });
    const failingFetch = async () => new Response('Service unavailable', { status: 503 });

    const fresh = await adapter.searchStylesWithCache({
      query: 'github',
      page: 1,
      fetchImpl: okFetch,
      readCache: async () => cache,
      writeCache: async (nextCache) => { cache = nextCache; },
      nowMs: 100
    });

    const stale = await adapter.searchStylesWithCache({
      query: 'github',
      page: 1,
      fetchImpl: failingFetch,
      readCache: async () => cache,
      writeCache: async (nextCache) => { cache = nextCache; }
    });

    return {
      freshCount: fresh.styles.length,
      cacheKeys: Object.keys(cache.entries),
      staleCount: stale.styles.length,
      stale: stale.stale,
      warning: stale.warning
    };
  }, searchHtml);

  expect(result.freshCount).toBe(2);
  expect(result.cacheKeys).toEqual(['github::1']);
  expect(result.staleCount).toBe(2);
  expect(result.stale).toBe(true);
  expect(result.warning).toContain('HTTP 503');
});

test('UserStyles.world adapter normalizes style details and falls back to raw source', async ({ page }) => {
  await page.addScriptTag({ path: path.join(repoRoot, 'usw-adapter.js') });

  const style = await page.evaluate(async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      if (url.endsWith('/api/style/77')) {
        return new Response(JSON.stringify({ data: { id: 77, name: 'Fallback Style', preview_url: '/preview/77/0t.webp' } }), { status: 200 });
      }
      if (url.endsWith('/api/style/77.user.css')) {
        return new Response('body { color: green; }', { status: 200 });
      }
      return new Response('not found', { status: 404 });
    };
    return { calls, style: await window.StyleCraftUSw.fetchStyle('77', fetchImpl) };
  });

  expect(style.calls).toEqual([
    'https://userstyles.world/api/style/77',
    'https://userstyles.world/api/style/77.user.css'
  ]);
  expect(style.style).toMatchObject({
    id: '77',
    name: 'Fallback Style',
    rawCSS: 'body { color: green; }',
    previewUrl: 'https://userstyles.world/preview/77/0t.webp',
    sourceUrl: 'https://userstyles.world/api/style/77.user.css'
  });
});
