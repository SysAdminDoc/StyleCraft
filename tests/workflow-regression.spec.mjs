import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'));
const version = manifest.version;

function installDownloadCapture() {
  window.__stylecraftBlobs = {};
  window.__stylecraftDownloads = [];
  URL.createObjectURL = (blob) => {
    const url = 'blob:stylecraft-' + Object.keys(window.__stylecraftBlobs).length;
    window.__stylecraftBlobs[url] = blob;
    return url;
  };
  URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = function click() {
    window.__stylecraftDownloads.push({ href: this.href, download: this.download });
  };
}

function optionsApiMock(initialStore) {
  const store = structuredClone(initialStore);
  window.__stylecraftStore = store;

  function select(keys) {
    if (!keys) return { ...store };
    if (typeof keys === 'string') return { [keys]: store[keys] };
    if (Array.isArray(keys)) return Object.fromEntries(keys.map(key => [key, store[key]]));
    if (typeof keys === 'object') return Object.fromEntries(Object.entries(keys).map(([key, fallback]) => [key, store[key] ?? fallback]));
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
      lastError: null,
      getURL(resourcePath) {
        return new URL(resourcePath, window.location.href).href;
      },
      getManifest() { return { version: '1.24.0' }; },
      sendMessage(message, callback) {
        let response = { ok: true };
        if (message?.action === 'sc-check-theme-update') {
          response = { css: 'body { color: green; }', trust: { status: 'trusted', warnings: [] } };
        }
        if (callback) queueMicrotask(() => callback(response));
        return Promise.resolve(response);
      },
      onMessage: {
        addListener() {}
      }
    },
    tabs: {
      query(_queryInfo, callback) {
        const tabs = [{ id: 1, url: 'https://update.test/page' }];
        if (callback) queueMicrotask(() => callback(tabs));
        return Promise.resolve(tabs);
      },
      sendMessage() {
        return Promise.resolve();
      },
      create() {
        return Promise.resolve();
      }
    }
  };
}

function popupInstallMock() {
  const store = {
    stylecraft_settings: { theme: 'catppuccin' },
    stylecraft_data: {}
  };
  const installed = new Set();
  window.__stylecraftPopupMessages = [];

  function select(keys) {
    if (!keys) return { ...store };
    if (typeof keys === 'string') return { [keys]: store[keys] };
    if (Array.isArray(keys)) return Object.fromEntries(keys.map(key => [key, store[key]]));
    return {};
  }

  window.chrome = {
    permissions: {
      contains(_request, callback) {
        if (callback) queueMicrotask(() => callback(true));
        return Promise.resolve(true);
      },
      request(_request, callback) {
        if (callback) queueMicrotask(() => callback(true));
        return Promise.resolve(true);
      }
    },
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
        }
      }
    },
    runtime: {
      lastError: null,
      getURL(resourcePath) {
        return new URL(resourcePath, window.location.href).href;
      },
      getManifest() { return { version: '1.24.0' }; },
      sendMessage(message, callback) {
        window.__stylecraftPopupMessages.push(message?.action || '');
        let response = { ok: true };
        if (message?.action === 'sc-get-toggle-state') {
          response = { readability: false, grayscale: false };
        } else if (message?.action === 'sc-search-styles') {
          response = {
            styles: [{ id: '42', name: 'Install Test Dark', author: 'Tester', installs: '12', thumb: '' }],
            installed: Array.from(installed),
            hasMore: false
          };
        } else if (message?.action === 'sc-install-style') {
          installed.add(message.id);
          response = { ok: true };
        } else if (message?.action === 'sc-uninstall-style') {
          installed.delete(message.id);
          response = { ok: true };
        }
        if (callback) queueMicrotask(() => callback(response));
        return Promise.resolve(response);
      },
      onMessage: {
        addListener() {}
      }
    },
    tabs: {
      query(_queryInfo, callback) {
        const tabs = [{ id: 5, url: 'https://install.test/page' }];
        if (callback) queueMicrotask(() => callback(tabs));
        return Promise.resolve(tabs);
      },
      sendMessage() {
        return Promise.resolve();
      },
      create() {
        return Promise.resolve();
      }
    }
  };
}

async function lastDownload(page) {
  return page.evaluate(async () => {
    const record = window.__stylecraftDownloads.at(-1);
    const blob = window.__stylecraftBlobs[record.href];
    return { download: record.download, payload: JSON.parse(await blob.text()) };
  });
}

test('options export emits full and single-domain schemas', async ({ page }) => {
  await page.addInitScript(installDownloadCapture);
  await page.addInitScript(optionsApiMock, {
    stylecraft_settings: { theme: 'catppuccin', panelWidth: 420 },
    stylecraft_data: {
      'alpha.test': { customCSS: 'body { color: red; }', customEnabled: true, themes: {} },
      'beta.test': { customCSS: '', customEnabled: true, themes: { usw1: { rawCSS: '.card { color: blue; }', name: 'Blue Card', enabled: true } } }
    }
  });

  await page.goto(pathToFileURL(path.join(repoRoot, 'options.html')).href);
  await expect(page.locator('#styles-list .card')).toHaveCount(1);

  await page.locator('#btn-export').click();
  const fullExport = await lastDownload(page);
  expect(fullExport.download).toMatch(/^stylecraft-export-\d{4}-\d{2}-\d{2}\.json$/);
  expect(fullExport.payload.version).toBe(version);
  expect(fullExport.payload.settings.panelWidth).toBe(420);
  expect(Object.keys(fullExport.payload.data).sort()).toEqual(['alpha.test', 'beta.test']);

  await page.locator('.export-single-btn').first().click();
  const singleExport = await lastDownload(page);
  expect(singleExport.download).toBe('stylecraft-alpha.test.json');
  expect(singleExport.payload).toMatchObject({
    domain: 'alpha.test',
    version,
    data: { customCSS: 'body { color: red; }', customEnabled: true }
  });
});

test('options update workflow applies checked remote CSS', async ({ page }) => {
  await page.addInitScript(optionsApiMock, {
    stylecraft_settings: { theme: 'catppuccin' },
    stylecraft_data: {
      'update.test': {
        customCSS: '',
        customEnabled: true,
        themes: {
          77: {
            rawCSS: 'body { color: red; }',
            css: 'body { color: red; }',
            name: 'Update Candidate',
            enabled: true,
            sourceUrl: 'https://userstyles.world/api/style/77.user.css'
          }
        }
      }
    }
  });

  await page.goto(pathToFileURL(path.join(repoRoot, 'options.html')).href);
  await page.locator('#tab-btn-themes').click();
  await page.locator('#themes-check-updates').click();

  await expect(page.locator('.update-badge')).toContainText('Update available');
  await page.locator('.update-btn').click();
  await expect(page.locator('#toast')).toContainText('Updated: Update Candidate');

  const theme = await page.evaluate(() => window.__stylecraftStore.stylecraft_data['update.test'].themes['77']);
  expect(theme.rawCSS).toBe('body { color: green; }');
  expect(theme.css).toBe('body { color: green; }');
  expect(theme.updatedAt).toBeTruthy();
});

test('popup search result installs and uninstalls a community style', async ({ page }) => {
  await page.addInitScript(popupInstallMock);
  await page.goto(pathToFileURL(path.join(repoRoot, 'popup.html')).href);

  await expect(page.locator('.s-card')).toHaveCount(1);
  await expect(page.locator('.s-name')).toHaveText('Install Test Dark');

  await page.locator('[data-action="install"]').click();
  await expect(page.locator('[data-action="install"]')).toHaveText('Installed');
  await expect(page.locator('[data-action="uninstall"]')).toBeVisible();

  await page.locator('[data-action="uninstall"]').click();
  await expect(page.locator('[data-action="install"]')).toHaveText('Install');
  await expect(page.locator('[data-action="uninstall"]')).toBeHidden();

  const messages = await page.evaluate(() => window.__stylecraftPopupMessages);
  expect(messages).toEqual(expect.arrayContaining(['sc-search-styles', 'sc-install-style', 'sc-uninstall-style']));
});

test('build artifact zip contains required forward-slash entries', () => {
  execFileSync(process.execPath, ['tools/build-extension.mjs'], { cwd: repoRoot, stdio: 'pipe' });

  const zipPath = path.join(repoRoot, 'dist', `stylecraft-v${version}.zip`);
  expect(fs.existsSync(zipPath)).toBe(true);

  const entries = execFileSync('C:\\Windows\\System32\\tar.exe', ['-tf', zipPath], { encoding: 'utf8' })
    .split(/\r?\n/)
    .map(entry => entry.trim())
    .filter(Boolean);

  expect(entries).toEqual(expect.arrayContaining([
    'manifest.json',
    'background.js',
    'popup.html',
    'popup.js',
    'options.html',
    'options.js',
    'inject-styles.js',
    'vendor/codemirror/stylecraft-codemirror.js',
    'vendor/sass/stylecraft-sass.js',
    'vendor/postcss/stylecraft-postcss.js'
  ]));
  expect(entries.some(entry => entry.includes('\\'))).toBe(false);

  const packagedManifest = JSON.parse(execFileSync('C:\\Windows\\System32\\tar.exe', ['-xOf', zipPath, 'manifest.json'], { encoding: 'utf8' }));
  expect(packagedManifest.version).toBe(version);
  expect(packagedManifest.optional_host_permissions).toEqual(['http://*/*', 'https://*/*']);
});
