import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();

const userCssSample = `/* ==UserStyle==
@name         Example UserCSS
@namespace    stylecraft.test
@version      1.2.3
@description  Parser smoke fixture
@updateURL    https://example.com/example.user.css
@preprocessor default
@var color accent "Accent color" #cba6f7
@var checkbox compact "Compact mode" 1
@var select density "Density" ["comfortable:Comfortable", "compact:Compact*"]
==/UserStyle== */

@-moz-document domain("example.com") {
  body { color: var(--accent); }
  @media (min-width: 700px) {
    .card { border-color: var(--accent); }
  }
}

@-moz-document domain("other.test") {
  body { color: red; }
}`;

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
      onMessage: { addListener() {} }
    },
    tabs: {
      query(_queryInfo, callback) {
        const tabs = [{ id: 1, url: 'https://example.com/page' }];
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

test('UserCSS parser preserves metadata, variables, update URL, and nested document blocks', async ({ page }) => {
  await page.addScriptTag({ path: path.join(repoRoot, 'style-match.js') });
  await page.addScriptTag({ path: path.join(repoRoot, 'usercss.js') });

  const result = await page.evaluate((source) => {
    const parser = window.StyleCraftUserCSS;
    const parsed = parser.parse(source);
    return {
      parsed,
      resolvedMatch: parser.resolveForUrl(source, 'https://example.com/page', 'example.com', window.StyleCraftMatcher, { accent: '#112233', density: 'comfortable' }),
      resolvedOther: parser.resolveForUrl(source, 'https://nomatch.test/page', 'nomatch.test', window.StyleCraftMatcher, { accent: '#112233' }),
      block: parser.metadataToBlock(parsed.meta, parsed.variables)
    };
  }, userCssSample);

  expect(result.parsed.meta).toMatchObject({
    name: 'Example UserCSS',
    namespace: 'stylecraft.test',
    version: '1.2.3',
    updateURL: 'https://example.com/example.user.css',
    preprocessor: 'default'
  });
  expect(result.parsed.variables.map(item => item.name)).toEqual(['accent', 'compact', 'density']);
  expect(result.parsed.variables[2].options.map(item => item.value)).toEqual(['comfortable', 'compact']);
  expect(result.parsed.values).toMatchObject({ accent: '#cba6f7', compact: true, density: 'compact' });
  expect(result.parsed.appliesTo).toEqual([
    { type: 'domain', value: 'example.com' },
    { type: 'domain', value: 'other.test' }
  ]);
  expect(result.resolvedMatch).toContain('--accent: #112233');
  expect(result.resolvedMatch).toContain('@media (min-width: 700px)');
  expect(result.resolvedMatch).toContain('.card');
  expect(result.resolvedMatch).not.toContain('body { color: red; }');
  expect(result.resolvedOther).toContain(':root');
  expect(result.resolvedOther).not.toContain('.card');
  expect(result.block).toContain('@updateURL');
  expect(result.block).toContain('@var color accent');
});

test('import guard stores parsed UserCSS metadata and values', async ({ page }) => {
  await page.addScriptTag({ path: path.join(repoRoot, 'usercss.js') });
  await page.addScriptTag({ path: path.join(repoRoot, 'style-data.js') });

  const result = await page.evaluate((source) => {
    return window.StyleCraftData.planNativeImport({
      data: {
        'example.com': {
          customCSS: source,
          customEnabled: true,
          themes: {
            imported: { rawCSS: source, enabled: true, name: 'Imported UserCSS' }
          }
        }
      }
    }, {}, { source: 'usercss fixture' });
  }, userCssSample);

  const entry = result.data['example.com'];
  expect(entry.meta.updateURL).toBe('https://example.com/example.user.css');
  expect(entry.sourceUrl).toBe('https://example.com/example.user.css');
  expect(entry.usercss.variables.map(item => item.name)).toEqual(['accent', 'compact', 'density']);
  expect(entry.usercss.values.density).toBe('compact');
  expect(entry.appliesTo).toEqual(expect.arrayContaining([{ type: 'domain', value: 'example.com' }]));
  expect(entry.themes.imported.usercss.variables).toHaveLength(3);
  expect(entry.themes.imported.sourceUrl).toBe('https://example.com/example.user.css');
});

test('editor renders UserCSS variable controls and saves values', async ({ page }) => {
  await page.addInitScript(extensionApiMock, {
    stylecraft_settings: { theme: 'catppuccin', panelWidth: 420 },
    stylecraft_data: {
      'example.com': {
        customCSS: userCssSample,
        customEnabled: true,
        themes: {}
      }
    }
  });

  await page.goto(pathToFileURL(path.join(repoRoot, 'editor.html')).href + '#example.com');
  await page.locator('#ap-toggle-bar').click();
  await expect(page.locator('#usercss-vars-section')).toBeVisible();
  await expect(page.locator('.uc-var')).toHaveCount(3);
  await expect(page.locator('.uc-var[data-name="density"] select')).toHaveValue('compact');

  await page.locator('.uc-var[data-name="density"] select').selectOption('comfortable');
  await page.locator('.uc-var[data-name="accent"] input').evaluate((input) => {
    input.value = '#112233';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await expect.poll(async () => page.evaluate(() => window.__stylecraftStore.stylecraft_data['example.com'].usercss.values)).toMatchObject({
    density: 'comfortable',
    accent: '#112233'
  });
  const resolved = await page.evaluate(() => {
    const entry = window.__stylecraftStore.stylecraft_data['example.com'];
    return window.StyleCraftUserCSS.resolveForUrl(entry.customCSS, 'https://example.com/page', 'example.com', window.StyleCraftMatcher, entry.usercss.values);
  });
  expect(resolved).toContain('--accent: #112233');
});
