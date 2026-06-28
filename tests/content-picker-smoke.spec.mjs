import { expect, test } from '@playwright/test';
import path from 'node:path';

const repoRoot = process.cwd();

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
        if (message.action === 'sc-get-domain-data') {
          response = domainData[message.domain] || { customCSS: '', customEnabled: true, themes: {} };
        } else if (message.action === 'sc-save-domain-data') {
          domainData[message.domain] = message.data;
        } else if (message.action === 'sc-get-settings') {
          response = settings;
        } else if (message.action === 'sc-save-settings') {
          Object.assign(settings, message.settings || {});
        }
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

async function shadowValue(page, id) {
  return page.evaluate((targetId) => {
    const host = Array.from(document.querySelectorAll('div')).find((el) => el.shadowRoot?.getElementById(targetId));
    const el = host?.shadowRoot?.getElementById(targetId);
    return el?.value ?? el?.textContent ?? '';
  }, id);
}

test('element picker shift-click builds combined selectors', async ({ page }) => {
  await page.setContent(`
    <main style="padding: 32px; max-width: 360px">
      <h1>Alpha</h1>
      <h2>Beta</h2>
      <h3>Gamma</h3>
      <p>Body copy</p>
    </main>
  `);
  await page.evaluate(contentScriptChromeMock);
  await page.addScriptTag({ path: path.join(repoRoot, 'content.js') });

  await page.evaluate(() => window.__stylecraftSendMessage({ action: 'sc-open-editor-pick' }));
  await page.waitForTimeout(450);

  await page.locator('h1').click({ modifiers: ['Shift'] });
  await page.locator('h2').click({ modifiers: ['Shift'] });
  await page.locator('h3').click();

  await expect.poll(() => shadowValue(page, 'sc-selector-input')).toBe('h1, h2, h3');
  await expect.poll(() => shadowValue(page, 'sc-match-count')).toBe('3 matches');
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('#sc-multi-highlight-layer > div').length)).toBe(3);

  if (process.env.STYLECRAFT_PICKER_SCREENSHOT_PATH) {
    await page.screenshot({ path: process.env.STYLECRAFT_PICKER_SCREENSHOT_PATH, fullPage: false });
  }
});

test('element picker prefers stable data attributes over generated classes', async ({ page }) => {
  await page.setContent(`
    <main style="padding: 32px; max-width: 360px">
      <button class="css-a1b2c3 jss42 save-action" data-testid="save-button">Save</button>
    </main>
  `);
  await page.evaluate(contentScriptChromeMock);
  await page.addScriptTag({ path: path.join(repoRoot, 'content.js') });

  await page.evaluate(() => window.__stylecraftSendMessage({ action: 'sc-open-editor-pick' }));
  await page.waitForTimeout(450);
  await page.locator('[data-testid="save-button"]').click();

  await expect.poll(() => shadowValue(page, 'sc-selector-input')).toBe('button[data-testid="save-button"]');
  await expect.poll(() => shadowValue(page, 'sc-match-count')).toBe('1 match');
});
