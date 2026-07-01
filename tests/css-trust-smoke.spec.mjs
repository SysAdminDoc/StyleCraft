import { expect, test } from '@playwright/test';
import path from 'node:path';

const repoRoot = process.cwd();

test('CSS trust analyzer flags remote, high-risk, and blocked CSS', async ({ page }) => {
  await page.addScriptTag({ path: path.join(repoRoot, 'style-data.js') });

  const result = await page.evaluate(() => {
    const data = window.StyleCraftData;
    return {
      trusted: data.analyzeCssTrust('body { color: #123456; }'),
      remote: data.analyzeCssTrust('body { background: url("https://cdn.example.test/bg.png"); }'),
      overlay: data.analyzeCssTrust('.mask { position: fixed; inset: 0; z-index: 9999; }'),
      blocked: data.analyzeCssTrust('body { background: url(javascript:alert(1)); }'),
      plan: data.planNativeImport({
        data: {
          'safe.test': { customCSS: 'body { color: green; }', themes: {} },
          'review.test': { customCSS: 'body { background: url(https://cdn.example.test/a.png); }', themes: {} },
          'blocked.test': { customCSS: 'body { background: url(javascript:alert(1)); }', themes: {} }
        }
      }, {}, { source: 'test import' })
    };
  });

  expect(result.trusted.status).toBe('trusted');
  expect(result.remote.status).toBe('review');
  expect(result.remote.warnings.map(item => item.code)).toContain('remote-url');
  expect(result.overlay.status).toBe('review');
  expect(result.overlay.warnings.map(item => item.code)).toContain('overlay-risk');
  expect(result.blocked.status).toBe('blocked');
  expect(result.blocked.warnings.map(item => item.code)).toContain('blocked-scheme');
  expect(result.plan.data['review.test'].trust.status).toBe('review');
  expect(result.plan.data['blocked.test']).toBeUndefined();
  expect(result.plan.quarantine.rejected.map(item => item.path)).toEqual(
    expect.arrayContaining(['blocked.test.customCSS', 'blocked.test'])
  );
});

test('CSS trust analyzer catches obfuscated javascript: via CSS escape sequences', async ({ page }) => {
  await page.addScriptTag({ path: path.join(repoRoot, 'style-data.js') });

  const result = await page.evaluate(() => {
    const data = window.StyleCraftData;
    return {
      hexEscape: data.analyzeCssTrust('body { background: url(java\\73 cript:alert(1)); }'),
      hexEscape2: data.analyzeCssTrust('body { background: url(\\6a avascript:void(0)); }'),
      backslashEscape: data.analyzeCssTrust('body { background: url(java\\script:alert(1)); }'),
      plainBlocked: data.analyzeCssTrust('@import url(javascript:evil)'),
      safeNormal: data.analyzeCssTrust('body { background: url(safe.png); }')
    };
  });

  expect(result.hexEscape.status).toBe('blocked');
  expect(result.hexEscape2.status).toBe('blocked');
  expect(result.backslashEscape.status).toBe('blocked');
  expect(result.plainBlocked.status).toBe('blocked');
  expect(result.safeNormal.status).toBe('trusted');
});
