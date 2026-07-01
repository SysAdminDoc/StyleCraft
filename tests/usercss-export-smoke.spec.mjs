import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();

function extensionApiMock(initialStore) {
  const store = structuredClone(initialStore);
  window.__stylecraftStore = store;

  function select(keys) {
    if (!keys) return { ...store };
    if (typeof keys === 'string') return { [keys]: store[keys] };
    if (Array.isArray(keys)) return Object.fromEntries(keys.map(key => [key, store[key]]));
    return {};
  }

  window.chrome = {
    storage: {
      local: {
        get(keys, callback) {
          const result = select(keys);
          if (callback) queueMicrotask(() => callback(result));
          return Promise.resolve(result);
        },
        set(items, callback) {
          Object.assign(store, items);
          if (callback) queueMicrotask(callback);
          return Promise.resolve();
        },
        clear(callback) {
          for (const key of Object.keys(store)) delete store[key];
          if (callback) queueMicrotask(callback);
          return Promise.resolve();
        },
        getBytesInUse(_keys, callback) {
          queueMicrotask(() => callback(JSON.stringify(store).length));
        }
      }
    },
    runtime: {
      getURL(resourcePath) {
        return new URL(resourcePath, window.location.href).href;
      },
      getManifest() { return { version: '1.25.0' }; },
      sendMessage(_message, callback) {
        if (callback) queueMicrotask(() => callback({ ok: true }));
        return Promise.resolve({ ok: true });
      },
      onMessage: {
        addListener() {}
      }
    },
    tabs: {
      query(_queryInfo, callback) {
        const tabs = [{ id: 1, url: 'https://example.com/page' }];
        if (callback) queueMicrotask(() => callback(tabs));
        return Promise.resolve(tabs);
      },
      sendMessage() { return Promise.resolve(); },
      create() { return Promise.resolve(); }
    }
  };
}

test('options imports a .user.css file and preserves metadata', async ({ page }) => {
  await page.addInitScript(extensionApiMock, {
    stylecraft_settings: { theme: 'catppuccin' },
    stylecraft_data: {},
    sc_backups: []
  });

  await page.goto(pathToFileURL(path.join(repoRoot, 'options.html')).href);

  const userCssContent = `/* ==UserStyle==
@name        GitHub Dark
@namespace   stylecraft/github.com
@version     2.1.0
@author      TestUser
@description Dark theme for GitHub
@updateURL   https://example.com/github-dark.user.css
==/UserStyle== */

@-moz-document domain("github.com") {
  body { background: #0d1117; color: #c9d1d9; }
}
`;

  await page.locator('#import-file').setInputFiles({
    name: 'github-dark.user.css',
    mimeType: 'text/css',
    buffer: Buffer.from(userCssContent)
  });

  await expect(page.locator('#toast')).toContainText('domain');

  const state = await page.evaluate(() => window.__stylecraftStore);
  const data = state.stylecraft_data;
  expect(data['github.com']).toBeTruthy();
  const themes = data['github.com'].themes;
  const themeIds = Object.keys(themes);
  expect(themeIds.length).toBe(1);
  const theme = themes[themeIds[0]];
  expect(theme.name).toBe('GitHub Dark');
  expect(theme.rawCSS).toContain('==UserStyle==');
  expect(theme.rawCSS).toContain('@-moz-document');
  expect(theme.source).toBe('usercss-import');
  expect(theme.usercss).toBeTruthy();
  expect(theme.usercss.meta.name).toBe('GitHub Dark');
  expect(theme.usercss.meta.version).toBe('2.1.0');
  expect(theme.usercss.meta.author).toBe('TestUser');
  expect(theme.sourceUrl).toBe('https://example.com/github-dark.user.css');
});

test('options detects .user.css by ==UserStyle== header even without .css extension', async ({ page }) => {
  await page.addInitScript(extensionApiMock, {
    stylecraft_settings: { theme: 'catppuccin' },
    stylecraft_data: {},
    sc_backups: []
  });

  await page.goto(pathToFileURL(path.join(repoRoot, 'options.html')).href);

  const userCssContent = `/* ==UserStyle==
@name  My Style
@namespace example
@version 1.0.0
==/UserStyle== */

body { color: red; }
`;

  await page.locator('#import-file').setInputFiles({
    name: 'my-style.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(userCssContent)
  });

  await expect(page.locator('#toast')).toContainText('domain');

  const state = await page.evaluate(() => window.__stylecraftStore);
  const data = state.stylecraft_data;
  expect(data['*']).toBeTruthy();
  const themes = data['*'].themes;
  const themeIds = Object.keys(themes);
  expect(themeIds.length).toBe(1);
  expect(themes[themeIds[0]].name).toBe('My Style');
});

test('diagnostics export contains expected fields with redacted data', async ({ page }) => {
  await page.addInitScript(extensionApiMock, {
    stylecraft_settings: { theme: 'dark', panelWidth: 420 },
    stylecraft_data: {
      'secret-site.com': {
        customCSS: 'body { color: red; }',
        customEnabled: true,
        themes: {
          '123': { css: '.t { color: blue; }', rawCSS: '.t { color: blue; }', name: 'Test Theme', enabled: true }
        }
      }
    },
    sc_backups: [{ timestamp: '2026-07-01T00:00:00Z', data: {}, settings: {} }],
    sc_backup_status: { ok: true, message: 'Backup completed', timestamp: '2026-07-01T00:00:00Z' },
    sc_usw_catalog_status: { ok: true, message: 'Search completed', timestamp: '2026-07-01T00:00:00Z' },
    stylecraft_import_quarantine: {
      source: 'test',
      timestamp: '2026-07-01T00:00:00Z',
      rejected: [{ path: 'bad.test', reason: 'Domain has no valid custom CSS or themes.' }]
    }
  });

  await page.goto(pathToFileURL(path.join(repoRoot, 'options.html')).href);

  await page.locator('#tab-btn-settings').click();

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-diagnostics').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^stylecraft-diagnostics-.*\.json$/);

  const preContent = await page.locator('#diagnostics-output').textContent();
  const report = JSON.parse(preContent);

  expect(report.version).toBe('1.25.0');
  expect(report.storage).toBeTruthy();
  expect(report.storage.totalCSSLines).toBeGreaterThan(0);
  expect(report.styles.domainCount).toBe(1);
  expect(report.styles.themeCount).toBe(1);
  expect(report.styles.customCSSCount).toBe(1);
  expect(report.styles.domainsRedacted).toHaveLength(1);
  expect(report.styles.domainsRedacted[0]).not.toContain('secret-site');
  expect(report.backups.count).toBe(1);
  expect(report.backups.lastStatus.ok).toBe(true);
  expect(report.quarantine.rejectedCount).toBe(1);
  expect(report.quarantine.rejectedReasons).toContain('Domain has no valid custom CSS or themes.');
  expect(report.settings.theme).toBe('dark');
});
