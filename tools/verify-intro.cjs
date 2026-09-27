const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.argv[2] || 'http://127.0.0.1:5180';
const out = path.join(__dirname, '_shots', 'intro');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const width of [1440, 390, 375]) {
      const page = await browser.newPage({ viewport: { width, height: width === 375 ? 667 : 844 }, hasTouch: width < 1000 });
      const errors = [], frames = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if (r.url().includes('/frames/')) frames.push(r.url()); });
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.locator('.hero__beat, [data-intro-bar], [data-intro-skip]').count(), 0);
      await page.waitForFunction(() => document.querySelector('[data-intro-frames]').classList.contains('is-ready'));
      const start = await page.locator('[data-intro-frames]').evaluate(el => ({ image: el.toDataURL(), opacity: getComputedStyle(el).opacity, display: getComputedStyle(el).display, width: el.width, height: el.height }));
      assert.notEqual(start.display, 'none');
      assert.ok(start.width && start.height);
      await page.screenshot({ path: path.join(out, `${width}-playing.png`) });
      await page.waitForTimeout(600);
      const later = await page.locator('[data-intro-frames]').evaluate(el => el.toDataURL());
      assert.notEqual(start.image, later, `Intro frames must move at ${width}px`);
      await page.waitForFunction(() => !document.documentElement.classList.contains('is-intro'));
      await page.waitForTimeout(950);
      const state = await page.evaluate(() => ({ locked: document.documentElement.classList.contains('is-locked'), titleOpacity: getComputedStyle(document.querySelector('.hero__title-block')).opacity, canvasDisplay: getComputedStyle(document.querySelector('[data-intro-frames]')).display, text: document.body.innerText, lenisStopped: window.__noctisLenis?.isStopped, overflow: document.documentElement.scrollWidth - innerWidth }));
      assert.equal(state.locked, false);
      assert.equal(state.titleOpacity, '1');
      assert.equal(state.canvasDisplay, 'none');
      assert.ok(!state.lenisStopped);
      assert.ok(!/nous ne modifions/i.test(state.text));
      assert.ok(state.overflow <= 1);
      await page.screenshot({ path: path.join(out, `${width}-finished.png`) });
      await page.mouse.wheel(0, 450);
      await page.waitForTimeout(650);
      assert.ok(await page.evaluate(() => scrollY > 0), 'Scroll must unlock after intro');
      if (width < 1000) {
        assert.equal(await page.locator('html').evaluate(el => el.classList.contains('has-mobile-film')), true);
        assert.equal(await page.locator('[data-atelier-video]').isVisible(), false);
        assert.ok(frames.some(url => url.includes('/hero-mobile-')), 'Mobile loads its scrub sequence after the opening');
        assert.ok(frames.every(url => /\/(?:intro-mobile-|hero-mobile-|atelier)[^/]*\//.test(url)), 'Phone film uses portrait opening/hero frames and the atelier sequence');
        assert.ok(await page.evaluate(() => window.__noctisFrames.heroIndex > 38), 'Mobile hero advances with the wheel');
      }
      assert.deepEqual(errors, []);
      console.log(`${width}px: video 0 moves, opening text absent, title returns, scrolling unlocked; ${frames.length} frame requests`);
      await page.close();
    }
    for (const options of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, ...options });
      await page.goto(base);
      await page.waitForTimeout(300);
      assert.equal(await page.locator('.hero__title-block').evaluate(el => getComputedStyle(el).opacity), '1');
      await page.mouse.wheel(0, 450);
      await page.waitForTimeout(350);
      assert.ok(await page.evaluate(() => scrollY > 0));
      console.log(`${JSON.stringify(options)}: visible title and scrolling`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
