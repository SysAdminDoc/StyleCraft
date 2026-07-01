import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();

function popupPermissionMock() {
  const store = {
    stylecraft_settings: { theme: 'catppuccin' },
    stylecraft_data: {
      'permission.test': {
        customCSS: 'body { color: red; }',
        customEnabled: true,
        themes: {}
      }
    }
  };
  let granted = false;
  window.__stylecraftPermission = { requestedOrigins: [], messages: [] };

  function select(keys) {
    if (!keys) return { ...store };
    if (typeof keys === 'string') return { [keys]: store[keys] };
    if (Array.isArray(keys)) return Object.fromEntries(keys.map(key => [key, store[key]]));
    return {};
  }

  window.chrome = {
    permissions: {
      contains(request, callback) {
        window.__stylecraftPermission.lastContains = request.origins;
        if (callback) queueMicrotask(() => callback(granted));
        return Promise.resolve(granted);
      },
      request(request, callback) {
        window.__stylecraftPermission.requestedOrigins.push(...(request.origins || []));
        granted = true;
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
        window.__stylecraftPermission.messages.push(message?.action || '');
        let response = { ok: true };
        if (message?.action === 'sc-get-toggle-state') {
          response = { readability: false, grayscale: false };
        } else if (message?.action === 'sc-search-styles') {
          response = { styles: [], installed: [], hasMore: false };
        } else if (message?.action === 'sc-ensure-style-injector') {
          response = { ok: true, siteAccess: { granted: true } };
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
        const tabs = [{ id: 7, url: 'https://permission.test/page' }];
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

test('manifest uses optional per-site host access with document-start injection', async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'));
  expect(manifest.host_permissions || []).toEqual([]);
  expect(manifest.optional_host_permissions).toEqual(['http://*/*', 'https://*/*']);
  expect(manifest.content_scripts).toHaveLength(1);
  expect(manifest.content_scripts[0].matches).toEqual(['http://*/*', 'https://*/*']);
  expect(manifest.content_scripts[0].run_at).toBe('document_start');
  expect(manifest.content_scripts[0].all_frames).toBe(true);
});

test('popup grants current-site access before applying styles', async ({ page }) => {
  await page.addInitScript(popupPermissionMock);
  await page.goto(pathToFileURL(path.join(repoRoot, 'popup.html')).href);

  await expect(page.locator('#access-card')).toBeVisible();
  await expect(page.locator('#access-origin')).toHaveText('https://permission.test');

  await page.locator('#access-grant').click();

  await expect(page.locator('#access-card')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__stylecraftPermission.requestedOrigins)).toEqual(['https://permission.test/*']);
  await expect.poll(() => page.evaluate(() => window.__stylecraftPermission.messages)).toContain('sc-ensure-style-injector');
});
