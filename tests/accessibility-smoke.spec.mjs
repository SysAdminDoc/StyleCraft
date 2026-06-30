import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();

function extensionApiMock(initialStore, activeUrl = 'https://example.com/article') {
  const store = structuredClone(initialStore);
  const messageListeners = [];
  window.__stylecraftStore = store;

  function select(keys) {
    if (!keys) return { ...store };
    if (typeof keys === 'string') return { [keys]: store[keys] };
    if (Array.isArray(keys)) return Object.fromEntries(keys.map(key => [key, store[key]]));
    if (typeof keys === 'object') {
      return Object.fromEntries(Object.entries(keys).map(([key, fallback]) => [key, store[key] ?? fallback]));
    }
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
      sendMessage(message, callback) {
        let response = { ok: true };
        if (message?.action === 'sc-get-toggle-state') {
          response = { readability: false, grayscale: false, readSettings: null };
        } else if (message?.action === 'sc-search-styles') {
          response = { styles: [], installed: [], hasMore: false };
        } else if (message?.action === 'sc-toggle-readability') {
          response = { readability: true };
        } else if (message?.action === 'sc-toggle-grayscale') {
          response = { grayscale: true };
        }
        if (callback) queueMicrotask(() => callback(response));
        return Promise.resolve(response);
      },
      onMessage: {
        addListener(listener) {
          messageListeners.push(listener);
        }
      }
    },
    tabs: {
      query(queryInfo, callback) {
        const tabs = queryInfo?.active ? [{ id: 1, url: activeUrl }] : [{ id: 1, url: activeUrl }];
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

function contentScriptChromeMock() {
  const messageListeners = [];
  const domainData = {
    'example.com': { customCSS: '', customEnabled: true, themes: {} }
  };
  const settings = { theme: 'catppuccin' };

  window.chrome = {
    runtime: {
      lastError: null,
      getURL(resourcePath) {
        return new URL(resourcePath, window.location.href).href;
      },
      onMessage: {
        addListener(listener) {
          messageListeners.push(listener);
        }
      },
      sendMessage(message, callback) {
        let response = { ok: true };
        if (message.action === 'sc-get-domain-data') response = domainData[message.domain] || { customCSS: '', customEnabled: true, themes: {} };
        else if (message.action === 'sc-save-domain-data') domainData[message.domain] = message.data;
        else if (message.action === 'sc-get-settings') response = settings;
        else if (message.action === 'sc-save-settings') Object.assign(settings, message.settings || {});
        if (callback) queueMicrotask(() => callback(response));
        return Promise.resolve(response);
      }
    }
  };

  window.__stylecraftSendMessage = (message) => new Promise((resolve) => {
    let settled = false;
    for (const listener of messageListeners) {
      listener(message, {}, (response) => {
        settled = true;
        resolve(response);
      });
    }
    setTimeout(() => {
      if (!settled) resolve(undefined);
    }, 0);
  });
}

function shadowSnapshot(page) {
  return page.evaluate(() => {
    const host = Array.from(document.querySelectorAll('div')).find((el) => el.shadowRoot?.getElementById('sc-pick-btn'));
    const root = host?.shadowRoot;
    return {
      selector: root?.getElementById('sc-selector-input')?.value || '',
      matchCount: root?.getElementById('sc-match-count')?.textContent || '',
      selectedTab: root?.querySelector('[role="tab"][aria-selected="true"]')?.id || '',
      activeId: root?.activeElement?.id || ''
    };
  });
}

test('options tabs and backup restore panel preserve keyboard focus', async ({ page }) => {
  await page.addInitScript(extensionApiMock, {
    stylecraft_settings: { theme: 'catppuccin', panelWidth: 420 },
    stylecraft_data: {},
    sc_backup_status: { ok: true, timestamp: '2026-06-28T10:00:00.000Z' },
    sc_backups: [
      {
        timestamp: '2026-06-28T09:00:00.000Z',
        reason: 'scheduled',
        data: { 'restored.test': { customCSS: 'body { color: green; }', customEnabled: true, themes: {} } },
        settings: {}
      }
    ]
  });

  await page.goto(pathToFileURL(path.join(repoRoot, 'options.html')).href);

  const stylesTab = page.getByRole('tab', { name: 'Custom CSS' });
  await expect(stylesTab).toHaveAttribute('aria-selected', 'true');
  await stylesTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Installed Themes' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tab-styles')).toBeHidden();
  await expect(page.locator('#tab-themes')).toBeVisible();
  await expect.poll(() => page.locator('#tab-btn-themes').evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');

  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.locator('#btn-restore-backup').click();
  await expect(page.locator('#backup-restore-panel')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.activeElement.id)).toBe('backup-select');
  await page.locator('#backup-restore-cancel').click();
  await expect(page.locator('#backup-restore-panel')).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.activeElement.id)).toBe('btn-restore-backup');
});

test('popup exposes labels and keyboard-operable Quick CSS disclosure', async ({ page }) => {
  await page.addInitScript(extensionApiMock, {
    stylecraft_settings: { theme: 'catppuccin' },
    stylecraft_data: {
      'example.com': { customCSS: 'body { color: red; }', customEnabled: true, themes: {} }
    }
  });

  await page.goto(pathToFileURL(path.join(repoRoot, 'popup.html')).href);

  await expect(page.getByLabel('Popup theme')).toBeVisible();
  await expect(page.locator('#domain-toggle')).toHaveAttribute('aria-label', 'Enable styles for this site');
  await expect(page.getByLabel('Search UserStyles.world')).toBeVisible();

  const quick = page.locator('#quick-edit-toggle');
  await expect(quick).toHaveAttribute('aria-expanded', 'false');
  await quick.focus();
  await page.keyboard.press('Enter');
  await expect(quick).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => page.evaluate(() => document.activeElement.id)).toBe('quick-edit-code');
});

test('editor exposes CodeMirror escape path and dialog focus recovery', async ({ page }) => {
  await page.addInitScript(extensionApiMock, {
    stylecraft_settings: { theme: 'catppuccin' },
    stylecraft_data: {
      'example.com': {
        customCSS: 'body {\n  color: #ff0000;\n}\n',
        customEnabled: true,
        themes: {}
      }
    }
  });

  await page.goto(pathToFileURL(path.join(repoRoot, 'editor.html')).href + '#example.com');

  await expect(page.locator('.cm-editor')).toBeVisible();
  await expect(page.locator('.cm-content')).toHaveAttribute('aria-label', 'CSS source editor');
  await page.locator('.cm-content').click();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.activeElement.id)).toBe('btn-save');

  await page.locator('#btn-help').click();
  await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.activeElement.id)).toBe('shortcuts-close');
  await page.keyboard.press('Escape');
  await expect(page.locator('#shortcuts-overlay')).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.activeElement.id)).toBe('btn-help');
});

test('shadow editor tabs and picker work without pointer input', async ({ page }) => {
  await page.setContent(`
    <main style="padding: 32px">
      <button data-testid="save-button">Save</button>
    </main>
  `);
  await page.evaluate(contentScriptChromeMock);
  await page.addScriptTag({ path: path.join(repoRoot, 'content.js') });

  await page.evaluate(() => window.__stylecraftSendMessage({ action: 'sc-open-editor' }));
  await page.waitForTimeout(350);

  await page.evaluate(() => {
    const host = Array.from(document.querySelectorAll('div')).find((el) => el.shadowRoot?.getElementById('sc-tab-selector'));
    host.shadowRoot.getElementById('sc-tab-selector').focus();
  });
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => shadowSnapshot(page).then(s => s.selectedTab)).toBe('sc-tab-visual');
  await expect.poll(() => shadowSnapshot(page).then(s => s.activeId)).toBe('sc-tab-visual');

  await page.evaluate(() => {
    const host = Array.from(document.querySelectorAll('div')).find((el) => el.shadowRoot?.getElementById('sc-quick-pick-btn'));
    host.shadowRoot.getElementById('sc-quick-pick-btn').focus();
  });
  await page.keyboard.press('Enter');
  await page.locator('[data-testid="save-button"]').focus();
  await page.keyboard.press('Enter');

  await expect.poll(() => shadowSnapshot(page).then(s => s.selector)).toBe('button[data-testid="save-button"]');
  await expect.poll(() => shadowSnapshot(page).then(s => s.matchCount)).toBe('1 match');
  await expect.poll(() => shadowSnapshot(page).then(s => s.activeId)).toBe('sc-quick-pick-btn');
});
