import { expect, test } from '@playwright/test';
import path from 'node:path';

const repoRoot = process.cwd();

test('shared matcher covers URL pattern parity', async ({ page }) => {
  await page.addScriptTag({ path: path.join(repoRoot, 'style-match.js') });

  const result = await page.evaluate(() => {
    const m = window.StyleCraftMatcher;
    const url = 'https://docs.example.com/guide/install?theme=dark';
    return {
      domainKey: m.entryMatchesPage('example.com', {}, url),
      wildcardKey: m.entryMatchesPage('*.example.com', {}, url),
      commaKey: m.entryMatchesPage('github.com, example.com', {}, url),
      exactUrl: m.entryMatchesPage('wrong.test', { appliesTo: [{ type: 'url', value: url }] }, url),
      urlPrefix: m.entryMatchesPage('wrong.test', { appliesTo: [{ type: 'url-prefix', value: 'https://docs.example.com/guide/' }] }, url),
      regexp: m.entryMatchesPage('wrong.test', { appliesTo: [{ type: 'regexp', value: '^https://docs\\.example\\.com/.+theme=dark$' }] }, url),
      badRegexp: m.entryMatchesPage('wrong.test', { appliesTo: [{ type: 'regexp', value: '[' }] }, url),
      wildcardUrl: m.entryMatchesPage('wrong.test', { appliesTo: [{ type: 'wildcard', value: 'https://*.example.com/guide/*' }] }, url),
      wildcardDomain: m.entryMatchesPage('wrong.test', { appliesTo: [{ type: 'wildcard', value: '*.example.com' }] }, url),
      excludesFallbackWhenAppliesToExists: m.entryMatchesPage('example.com', { appliesTo: [{ type: 'domain', value: 'other.test' }] }, url),
      documentDomain: m.documentConditionsMatch('domain("example.com")', url),
      documentPrefix: m.documentConditionsMatch('url-prefix("https://docs.example.com/guide/")', url),
      documentRegexp: m.documentConditionsMatch('regexp("docs\\.example\\.com/.+dark")', url)
    };
  });

  expect(result).toEqual({
    domainKey: true,
    wildcardKey: true,
    commaKey: true,
    exactUrl: true,
    urlPrefix: true,
    regexp: true,
    badRegexp: false,
    wildcardUrl: true,
    wildcardDomain: true,
    excludesFallbackWhenAppliesToExists: false,
    documentDomain: true,
    documentPrefix: true,
    documentRegexp: true
  });
});

test('shared matcher returns the same matching entries used by UI and background', async ({ page }) => {
  await page.addScriptTag({ path: path.join(repoRoot, 'style-match.js') });

  const matches = await page.evaluate(() => {
    const data = {
      'example.com': { customCSS: 'body{}', themes: {} },
      'docs-only': {
        appliesTo: [{ type: 'url-prefix', value: 'https://docs.example.com/' }],
        customCSS: '.docs{}',
        themes: {}
      },
      'other.test': { customCSS: '.no{}', themes: {} },
      '^https://docs\\.example\\.com/.+': { customCSS: '.regex{}', themes: {} }
    };
    return window.StyleCraftMatcher
      .matchingEntries(data, 'https://docs.example.com/page')
      .map(([key]) => key);
  });

  expect(matches).toEqual(['example.com', 'docs-only', '^https://docs\\.example\\.com/.+']);
});

test('document-start injector uses shared matcher for applies-to rules', async ({ page }) => {
  await page.route('https://docs.example.com/page', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><head></head><body><div class="box">Docs</div></body></html>'
    });
  });
  await page.goto('https://docs.example.com/page');
  await page.evaluate(() => {
    window.chrome = {
      runtime: {
        lastError: null,
        onMessage: {
          addListener() {}
        }
      },
      storage: {
        local: {
          get(_keys, callback) {
            queueMicrotask(() => callback({
              stylecraft_settings: { globalCSS: ':root { --global-ok: 1; }' },
              stylecraft_data: {
                'example.com': {
                  appliesTo: [{ type: 'domain', value: 'other.test' }],
                  customCSS: '.should-not-apply { color: red; }',
                  customEnabled: true,
                  themes: {}
                },
                'docs-style': {
                  appliesTo: [{ type: 'url-prefix', value: 'https://docs.example.com/' }],
                  customCSS: 'body { color: rgb(20, 30, 40); }',
                  customEnabled: true,
                  themes: {
                    docs: {
                      enabled: true,
                      rawCSS: '@-moz-document domain("docs.example.com") { .box { color: rgb(1, 2, 3); } }'
                    }
                  }
                }
              }
            }));
          }
        }
      }
    };
  });

  await page.addScriptTag({ path: path.join(repoRoot, 'style-match.js') });
  await page.addScriptTag({ path: path.join(repoRoot, 'usercss.js') });
  await page.addScriptTag({ path: path.join(repoRoot, 'inject-styles.js') });

  const injected = await page.evaluate(() => ({
    theme: document.getElementById('stylecraft-theme-styles')?.textContent || '',
    custom: document.getElementById('stylecraft-custom-styles')?.textContent || ''
  }));

  expect(injected.theme).toContain('--global-ok');
  expect(injected.theme).toContain('.box');
  expect(injected.custom).toContain('rgb(20, 30, 40)');
  expect(injected.custom).not.toContain('should-not-apply');
});
