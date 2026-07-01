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
      getManifest() { return { version: '1.24.0' }; },
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
        const tabs = [{ id: 1, url: 'https://new.test/page' }];
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

test('options import validates, quarantines, and backs up before replacing data', async ({ page }) => {
  await page.addInitScript(extensionApiMock, {
    stylecraft_settings: { theme: 'catppuccin', panelWidth: 420 },
    stylecraft_data: {
      'existing.test': {
        customCSS: 'body { color: red; }',
        customEnabled: true,
        themes: {}
      }
    },
    sc_backups: []
  });

  await page.goto(pathToFileURL(path.join(repoRoot, 'options.html')).href);

  const goodImport = {
    data: {
      'new.test': {
        customCSS: '.ok { color: green; }',
        customEnabled: true,
        themes: {
          theme1: { css: '.theme { color: blue; }', name: 'Valid Theme' },
          broken: { name: 'Missing CSS' }
        },
        appliesTo: [
          { type: 'regexp', value: '[' },
          { type: 'domain', value: 'new.test' }
        ]
      },
      'bad.test': {
        customCSS: 42,
        themes: {}
      },
      ['__proto__']: {
        customCSS: '.polluted { color: red; }',
        themes: {}
      }
    },
    settings: { panelWidth: 500 }
  };

  await page.locator('#import-file').setInputFiles({
    name: 'stylecraft-import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(goodImport))
  });

  await expect(page.locator('#toast')).toContainText('Replaced with 1 domain');
  await expect(page.locator('#toast')).toContainText('quarantined');
  await expect(page.locator('#toast')).toContainText('pre-import backup created');

  const stateAfterGood = await page.evaluate(() => window.__stylecraftStore);
  expect(Object.keys(stateAfterGood.stylecraft_data)).toEqual(['new.test']);
  expect(stateAfterGood.stylecraft_data['new.test'].themes.theme1.rawCSS).toContain('.theme');
  expect(stateAfterGood.stylecraft_data['new.test'].themes.broken).toBeUndefined();
  expect(stateAfterGood.stylecraft_data['new.test'].appliesTo).toEqual([{ type: 'domain', value: 'new.test' }]);
  expect(stateAfterGood.stylecraft_settings.panelWidth).toBe(500);
  expect(stateAfterGood.sc_backups[0].reason).toBe('pre-import');
  expect(stateAfterGood.sc_backups[0].data['existing.test'].customCSS).toContain('red');
  expect(stateAfterGood.stylecraft_import_quarantine.rejected.map(item => item.path)).toEqual(
    expect.arrayContaining(['new.test.themes.broken', 'new.test.appliesTo[0]', 'bad.test', '__proto__'])
  );

  const corruptImport = {
    data: {
      'corrupt.test': {
        customCSS: 99,
        themes: {}
      }
    }
  };

  await page.locator('#import-file').setInputFiles({
    name: 'corrupt-stylecraft-import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(corruptImport))
  });

  await expect(page.locator('#toast')).toContainText('Import failed');
  const stateAfterCorrupt = await page.evaluate(() => window.__stylecraftStore);
  expect(Object.keys(stateAfterCorrupt.stylecraft_data)).toEqual(['new.test']);
  expect(stateAfterCorrupt.sc_backups).toHaveLength(1);
});
