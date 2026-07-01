import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();

function extensionApiMock(initialStore) {
  const store = structuredClone(initialStore);
  window.__stylecraftStore = store;
  const messageListeners = [];

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
      getManifest() { return { version: '1.26.0' }; },
      sendMessage(_message, callback) {
        if (callback) queueMicrotask(() => callback({ ok: true }));
        return Promise.resolve({ ok: true });
      },
      onMessage: {
        addListener(listener) {
          messageListeners.push(listener);
        }
      }
    },
    tabs: {
      query(_queryInfo, callback) {
        const tabs = [{ id: 1, url: 'https://current.test/page' }];
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

test('options restore panel previews, restores, undoes, and rejects corrupt backups', async ({ page }) => {
  await page.addInitScript(extensionApiMock, {
    stylecraft_settings: { theme: 'catppuccin', panelWidth: 420 },
    stylecraft_data: {
      'current.test': {
        customCSS: 'body { color: red; }',
        customEnabled: true,
        themes: {}
      }
    },
    sc_backup_status: { ok: false, message: 'quota unavailable', timestamp: '2026-06-28T10:00:00.000Z' },
    sc_backups: [
      {
        timestamp: '2026-06-28T09:00:00.000Z',
        reason: 'scheduled',
        data: {
          'restored.test': {
            customCSS: 'body { color: green; }',
            customEnabled: true,
            themes: {
              theme1: {
                rawCSS: '.card { color: blue; }',
                enabled: true,
                name: 'Restored Theme'
              }
            }
          }
        },
        settings: { panelWidth: 640 }
      },
      {
        timestamp: '2026-06-28T08:00:00.000Z',
        reason: 'corrupt',
        data: {
          'broken.test': { customCSS: 42, themes: {} }
        },
        settings: {}
      }
    ]
  });

  await page.goto(pathToFileURL(path.join(repoRoot, 'options.html')).href);

  await page.locator('.tab-btn[data-tab="settings"]').click();
  await expect(page.locator('#backup-status')).toContainText('Last backup failed: quota unavailable');
  await page.locator('#btn-restore-backup').click();
  await expect(page.locator('#backup-restore-panel')).toHaveClass(/show/);
  await expect(page.locator('#backup-preview')).toContainText('1 domain');
  await expect(page.locator('#backup-preview')).toContainText('1 theme');
  await expect(page.locator('#backup-preview')).toContainText('restored.test');

  await page.locator('#backup-restore-apply').click();
  await expect(page.locator('#toast')).toContainText('Restored backup');
  await expect.poll(async () => page.evaluate(() => Object.keys(window.__stylecraftStore.stylecraft_data))).toEqual(['restored.test']);
  await expect.poll(async () => page.evaluate(() => window.__stylecraftStore.stylecraft_settings.panelWidth)).toBe(640);
  await expect(page.locator('#set-panel-width')).toHaveValue('640');

  await page.locator('#undo-toast-btn').click();
  await expect(page.locator('#toast')).toContainText('Undone: Restore backup');
  await expect.poll(async () => page.evaluate(() => Object.keys(window.__stylecraftStore.stylecraft_data))).toEqual(['current.test']);
  await expect.poll(async () => page.evaluate(() => window.__stylecraftStore.stylecraft_settings.panelWidth)).toBe(420);
  await expect(page.locator('#set-panel-width')).toHaveValue('420');

  await page.locator('#btn-restore-backup').click();
  await page.locator('#backup-select').selectOption('1');
  await expect(page.locator('#backup-preview')).toContainText('broken.test');
  await expect(page.locator('#backup-preview')).toContainText('restore blocked');
  await page.locator('#backup-restore-apply').click();
  await expect(page.locator('#toast')).toContainText('Restore failed');
  await expect.poll(async () => page.evaluate(() => Object.keys(window.__stylecraftStore.stylecraft_data))).toEqual(['current.test']);
});
