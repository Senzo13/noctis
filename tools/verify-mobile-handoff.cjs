/* Regression: keep the painted opening frame while the next sequence is slow or unavailable. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.argv[2] || 'http://127.0.0.1:5180';
const out = path.join(__dirname, '_shots', 'mobile-film');
async function introState(page) {
  return page.locator('[data-intro-frames]').evaluate(el => {
    const small = document.createElement('canvas'); small.width = 24; small.height = 24;
    const ctx = small.getContext('2d'); ctx.drawImage(el, 0, 0, 24, 24);
    const pixels = ctx.getImageData(0, 0, 24, 24).data;
    let illuminated = 0;
    for (let i = 0; i < pixels.length; i += 4) if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 28) illuminated++;
    return { display: getComputedStyle(el).display, opacity: Number(getComputedStyle(el).opacity), illuminated, ready: el.classList.contains('is-ready'), heroIndex: window.__noctisFrames?.heroIndex, locked: document.documentElement.classList.contains('is-locked') };
  });
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const mode of ['slow', 'failed']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await page.route('**/frames/hero-mobile-*/**', async route => {
        if (mode === 'failed') await route.abort('failed');
        else { await gate; await route.continue(); }
      });
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !document.documentElement.classList.contains('is-intro'), null, { timeout: 10000 });
      await page.waitForTimeout(1500);
      const waiting = await introState(page);
      assert.ok(waiting.ready && waiting.display !== 'none' && waiting.opacity > .95, `${mode}: opening remains visible after intro completion`);
      assert.ok(waiting.illuminated > 25, `${mode}: retained canvas contains a real image, not an empty black frame`);
      assert.equal(waiting.locked, false, `${mode}: page remains unlocked`);
      assert.ok(waiting.heroIndex === undefined || waiting.heroIndex < 0, 'Delayed hero has not painted yet');
      await page.screenshot({ path: path.join(out, `handoff-${mode}-retained.png`) });
      if (mode === 'slow') {
        release();
        await page.waitForFunction(() => window.__noctisFrames?.heroIndex === 38, null, { timeout: 10000 });
        await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-intro-frames]')).display === 'none');
        assert.ok(await page.locator('[data-hero-frames]').evaluate(el => el.classList.contains('is-ready') && getComputedStyle(el).display !== 'none'));
        await page.screenshot({ path: path.join(out, 'handoff-slow-recovered.png') });
      } else {
        await page.mouse.wheel(0, 180);
        await page.waitForTimeout(500);
        assert.ok(await page.evaluate(() => scrollY > 20), 'Failed hero does not block scrolling');
        assert.ok((await introState(page)).illuminated > 25, 'Failed hero keeps the last opening image');
      }
      assert.deepEqual(errors, []);
      release();
      await page.close();
      console.log(`${mode}: no black handoff, retained opening image and unlocked page PASS`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
