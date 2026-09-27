/* Reading order, opacity and layout checks for the three editorial panels. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const base = process.argv[2] || 'http://127.0.0.1:5180';
const out = path.join(__dirname, '_shots', 'panels');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const width of [320, 390, 768, 1440, 1920]) {
      const page = await browser.newPage({ viewport: { width, height: width < 1000 ? 844 : 900 }, hasTouch: width < 1000 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/?intro=0');
      await page.evaluate(() => document.fonts.ready);
      const panels = page.locator('.panels .panel');
      assert.equal(await panels.count(), 3);
      for (let index = 0; index < 3; index++) {
        const panel = panels.nth(index);
        for (const progress of [0, .45, .85]) {
          await panel.evaluate((el, progress) => {
            const y = el.getBoundingClientRect().top + scrollY + progress * el.offsetHeight - 75;
            if (window.__noctisLenis) window.__noctisLenis.scrollTo(y, { immediate: true });
            else scrollTo({ top: y, behavior: 'instant' });
            window.ScrollTrigger?.update();
          }, progress);
          await page.waitForTimeout(550);
          const state = await panel.evaluate(el => {
            const box = node => { const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width }; };
            return {
              opacity: getComputedStyle(el).opacity,
              background: getComputedStyle(el).backgroundColor,
              imageOpacity: getComputedStyle(el.querySelector('img')).opacity,
              copyOpacity: getComputedStyle(el.querySelector('.panel__copy')).opacity,
              panel: box(el), title: box(el.querySelector('.panel__title')),
              image: box(el.querySelector('.panel__media')), copy: box(el.querySelector('.panel__copy')),
              next: el.nextElementSibling ? box(el.nextElementSibling) : null
            };
          });
          assert.equal(state.opacity, '1', `${width}, panel ${index}, scroll ${progress}: panel opacity`);
          assert.equal(state.imageOpacity, '1', 'Photograph remains opaque');
          assert.equal(state.copyOpacity, '1', 'Copy remains opaque');
          assert.match(state.background, /^rgb\(/, 'Panel has an opaque background');
          const overlapX = Math.min(state.image.right, state.copy.right) - Math.max(state.image.left, state.copy.left);
          const overlapY = Math.min(state.image.bottom, state.copy.bottom) - Math.max(state.image.top, state.copy.top);
          assert.ok(overlapX < 1 || overlapY < 1, 'Image and copy do not overlap');
          assert.ok(state.title.bottom <= state.image.top + 1, 'Title has its own space above the image');
          assert.ok(state.title.left >= -1 && state.title.right <= width + 1, 'Title fits the viewport');
          assert.ok(state.copy.left >= -1 && state.copy.right <= width + 1, 'Copy fits the viewport');
          if (state.next) assert.ok(state.next.top >= state.panel.bottom - 1, 'Panels do not overlap each other');
          if (progress === 0) {
            await panel.locator('img').evaluate(async img => { img.loading = 'eager'; await img.decode(); });
            await panel.screenshot({ path: path.join(out, `${width}-panel-${index + 1}.png`) });
          }
        }
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal page overflow');
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${width}px: all 3 panels remain opaque at 3 scroll positions; titles, copy and photos do not overlap PASS`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
