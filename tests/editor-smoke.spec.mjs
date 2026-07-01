import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();

function extensionApiMock(initialStore) {
  const store = structuredClone(initialStore);
  const messageListeners = [];
  window.__stylecraftStore = store;

  function select(keys) {
    if (!keys) return { ...store };
    if (typeof keys === 'string') return { [keys]: store[keys] };
    if (Array.isArray(keys)) {
      return Object.fromEntries(keys.map((key) => [key, store[key]]));
    }
    if (typeof keys === 'object') {
      return Object.fromEntries(
        Object.entries(keys).map(([key, fallback]) => [key, store[key] ?? fallback])
      );
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
        }
      }
    },
    runtime: {
      getURL(resourcePath) {
        return new URL(resourcePath, window.location.href).href;
      },
      getManifest() { return { version: '1.25.0' }; },
      sendMessage() {
        return Promise.resolve();
      },
      onMessage: {
        addListener(listener) {
          messageListeners.push(listener);
        }
      }
    },
    tabs: {
      query(_queryInfo, callback) {
        const tabs = [];
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

test('full editor uses CodeMirror with legacy data APIs intact', async ({ page }) => {
  const consoleProblems = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    consoleProblems.push(`pageerror: ${error.message}`);
  });

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
  const aiRequests = [];
  await page.route('http://localhost:11434/v1/chat/completions', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type, authorization'
        }
      });
      return;
    }
    aiRequests.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        choices: [
          {
            message: {
              content: '```css\n.ai-card {\n  border-color: #3b82f6;\n}\n```'
            }
          }
        ]
      })
    });
  });

  const editorUrl = pathToFileURL(path.join(repoRoot, 'editor.html')).href + '#example.com';
  await page.goto(editorUrl);

  await expect(page).toHaveTitle('StyleCraft Editor');
  await expect(page.locator('.cm-editor')).toBeVisible();
  await expect(page.locator('#code')).toHaveAttribute('data-editor-engine', 'codemirror');
  await expect(page.locator('#tb-domain')).toContainText('example.com / Custom CSS');

  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText('body {\n  color: #00ff88;\n}\n');

  await expect(page.locator('.cm-content')).toContainText('#00ff88');
  await expect(page.locator('#sb-lines')).toContainText('4 lines');
  await expect(page.locator('#lint-summary')).toContainText('Lint: no issues');

  await page.keyboard.press('Control+F');
  await page.locator('#find-input').fill('color');
  await expect(page.locator('#find-count')).toContainText('1 of 1');
  await expect(page.locator('.cm-sc-find-current')).toHaveCount(1);

  await page.locator('.cm-sc-color-swatch').first().click();
  await expect(page.locator('#color-picker')).toBeVisible();
  await page.locator('#color-picker-text').fill('#112233');
  await page.locator('#color-picker-ok').click();
  await expect(page.locator('.cm-content')).toContainText('#112233');

  await page.locator('#source-mode').selectOption('scss');
  await expect(page.locator('#tb-domain')).toContainText('(SCSS)');
  await expect(page.locator('#lint-summary')).toContainText('SCSS: compile on save/live preview');

  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText('$accent: #336699;\nbody {\n  color: $accent;\n  .child {\n    margin: 0;\n  }\n}\n');
  await page.locator('#btn-save').click();

  await expect.poll(async () => page.evaluate(() => window.__stylecraftStore.stylecraft_data['example.com']?.preprocessor)).toEqual({
    syntax: 'scss',
    source: '$accent: #336699;\nbody {\n  color: $accent;\n  .child {\n    margin: 0;\n  }\n}\n'
  });
  const saved = await page.evaluate(() => window.__stylecraftStore.stylecraft_data['example.com']);
  expect(saved.customCSS).toContain('color: #336699');
  expect(saved.customCSS).toContain('body .child');

  await page.locator('#source-mode').selectOption('css');
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText('.card {\n  & .title {\n    user-select: none;\n  }\n}\n');
  await page.locator('#btn-save').click();

  await expect.poll(async () => page.evaluate(() => window.__stylecraftStore.stylecraft_data['example.com']?.customCSS || '')).toContain('.card .title');
  const postCssSaved = await page.evaluate(() => window.__stylecraftStore.stylecraft_data['example.com']);
  expect(postCssSaved.preprocessor).toBeUndefined();
  expect(postCssSaved.customCSS).toContain('.card .title');
  expect(postCssSaved.customCSS).toContain('-webkit-user-select: none');
  expect(postCssSaved.customCSS).toContain('user-select: none');

  await page.locator('#template-select').selectOption('button:primary');
  await page.locator('#btn-insert-template').click();
  await expect(page.locator('.cm-content')).toContainText('--sc-button-bg');
  await expect(page.locator('.cm-content')).toContainText('[data-variant="danger"]');

  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.insertText('\n;dark');
  await expect(page.locator('.cm-content')).toContainText('@media (prefers-color-scheme: dark)');
  await expect(page.locator('.cm-content')).toContainText('--page-bg');

  await page.locator('#btn-ai-assist').click();
  await expect(page.locator('#ai-panel')).toBeVisible();
  await page.locator('#ai-model').fill('stylecraft-test-model');
  await page.locator('#ai-key').fill('secret-test-key');
  await page.locator('#btn-ai-save').click();
  await expect(page.locator('#ai-status')).toContainText('Settings saved');
  await expect.poll(async () => page.evaluate(() => window.__stylecraftStore.stylecraft_settings?.aiAssist?.apiKey)).toBeUndefined();
  await expect.poll(async () => page.evaluate(() => window.__stylecraftStore.stylecraft_ai_key)).toBe('secret-test-key');
  await page.locator('#ai-key').fill('');
  await page.locator('#ai-prompt').fill('Add a muted blue card outline.');
  await page.locator('#btn-ai-draft').click();
  await expect(page.locator('.cm-content')).toContainText('.ai-card');
  await expect(page.locator('#ai-status')).toContainText('Draft inserted');
  expect(aiRequests).toHaveLength(1);
  expect(aiRequests[0].model).toBe('stylecraft-test-model');
  expect(aiRequests[0].messages.at(-1).content).toContain('Add a muted blue card outline.');

  const beforeBlockedSave = await page.evaluate(() => window.__stylecraftStore.stylecraft_data['example.com'].customCSS);
  await page.locator('#source-mode').selectOption('css');
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText('body {\n  background-image: url(javascript:alert(1));\n}\n');
  await page.locator('#btn-save').click();
  await expect(page.locator('#toast')).toContainText('Blocked CSS');
  await expect.poll(async () => page.evaluate(() => window.__stylecraftStore.stylecraft_data['example.com'].customCSS)).toBe(beforeBlockedSave);

  if (process.env.STYLECRAFT_SCREENSHOT_PATH) {
    await page.screenshot({ path: process.env.STYLECRAFT_SCREENSHOT_PATH, fullPage: false });
  }

  expect(consoleProblems).toEqual([]);
});
