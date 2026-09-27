/* Browser checks for the responsive NOCTIS experience.
   Start tools/serve.py, then node tools/verify-experience.cjs [base URL]. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.argv.slice(2).find(arg => /^https?:/.test(arg)) || 'http://127.0.0.1:5180';
const interactionsOnly = process.argv.includes('--interactions');
const out = path.join(__dirname, '_shots', 'experience');
const routes = ['index', 'realisations', 'stock', 'contact', 'conditions', 'confidentialite'];

async function jump(page, selector) {
  await page.evaluate(selector => {
    const y = document.querySelector(selector).getBoundingClientRect().top + scrollY - 85;
    if (window.__noctisLenis) window.__noctisLenis.scrollTo(y, { immediate: true });
    else scrollTo({ top: y, behavior: 'instant' });
    window.ScrollTrigger?.update();
  }, selector);
  await page.waitForTimeout(1300);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const report = [];
  try {
    for (const width of (interactionsOnly ? [] : [320, 390, 768, 1440])) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      for (const route of routes) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
        const response = await page.goto(`${base}/${route}.html`);
        assert.equal(response.status(), 200);
        await page.evaluate(async () => {
          await document.fonts.ready;
          document.querySelectorAll('img').forEach(img => img.loading = 'eager');
          await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
        });
        await page.waitForFunction(() => [...document.images].every(img => img.complete), null, { timeout: 15000 });
        const state = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - innerWidth,
          broken: [...document.images].filter(img => !img.naturalWidth).map(img => img.src),
          duplicateIds: [...document.querySelectorAll('[id]')].map(el => el.id).filter((id, i, all) => all.indexOf(id) !== i),
          height: document.documentElement.scrollHeight,
          heroHeight: document.querySelector('.hero')?.offsetHeight,
          credit: document.querySelector('.footer__credit').href,
          missingAnchors: [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(href => href.length > 1 && !document.getElementById(href.slice(1)))
        }));
        assert.ok(state.overflow <= 1, `${route} ${width}: overflow ${state.overflow}`);
        assert.deepEqual(state.broken, [], `${route} ${width}: broken images`);
        assert.deepEqual(state.duplicateIds, []);
        assert.deepEqual(state.missingAnchors, []);
        assert.deepEqual(errors, [], `${route} ${width}: browser errors`);
        assert.equal(state.credit, 'https://nevolabs.ch/');
        if (width === 390 || (route === 'index' && width === 1440)) {
          await page.screenshot({ path: path.join(out, `${route}-${width}-top.png`) });
          if (route !== 'index') await page.screenshot({ path: path.join(out, `${route}-${width}-full.png`), fullPage: true });
        }
        report.push({ route, width, ...state });
        await page.close();
      }
      await context.close();
      console.log(`Six pages: images, anchors and layout OK at ${width}px`);
    }

    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: width < 1000 });
      const errors = [], media = [];
      page.on('pageerror', e => { errors.push(e.message); console.error(`Browser error ${width}px: ${e.message}`); });
      page.on('requestfailed', r => console.error(`Network ${width}px: ${r.failure()?.errorText} ${r.url()}`));
      page.on('request', r => { if (/\/frames\/|\.mp4/.test(r.url())) media.push(r.url()); });
      await page.goto(base);
      assert.equal(await page.locator('[data-intro-frames]').count(), 1, 'Keep the original opening video');
      assert.equal(await page.locator('[data-intro-skip], [data-intro-bar], [data-scroll-progress], [data-film-open], .hero__actions, .hero__beat').count(), 0, 'No loading line, opening copy or removed hero actions');
      await page.waitForFunction(() => !document.documentElement.classList.contains('is-intro'), null, { timeout: 6000 });
      assert.equal(await page.locator('html').evaluate(el => el.classList.contains('is-locked')), false, 'Opening video must release page scrolling');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(out, `normal-${width}-hero.png`) });
      await page.locator('[data-menu-toggle]').click();
      await page.waitForTimeout(180);
      assert.equal(await page.locator('main').evaluate(el => el.inert), true);
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => !!document.activeElement.closest('.menu, [data-menu-toggle]')), true, 'Menu focus must remain inside navigation');
      }
      await page.waitForTimeout(950);
      await page.screenshot({ path: path.join(out, `menu-${width}.png`) });
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('[data-menu-toggle]').evaluate(el => el === document.activeElement), true);
      assert.equal(await page.locator('main').evaluate(el => el.inert), false);

      for (let i = 0; i < 5; i++) {
        await jump(page, '.materials');
        await page.locator('[role="tab"]').nth(i).click();
        const panel = page.locator('[role="tabpanel"]:visible');
        assert.equal(await panel.count(), 1);
        assert.equal(await panel.getAttribute('id'), `material-${i}`);
        assert.ok(await panel.locator('img').evaluate(async img => { await img.decode(); return img.naturalWidth > 0; }));
        assert.ok(await panel.evaluate(el => el.querySelector('h3').getBoundingClientRect().bottom <= el.querySelector('p').getBoundingClientRect().top), 'Material copy must not overlap');
      }
      await page.keyboard.press('Home');
      assert.equal(await page.locator('[role="tab"][aria-selected="true"]').getAttribute('id'), 'material-tab-0');
      await page.screenshot({ path: path.join(out, `materials-${width}.png`) });

      for (const selector of ['.craft', '.ordinary']) {
        await jump(page, selector);
        const section = page.locator(selector);
        const rail = section.locator('[data-carousel-rail], .rail');
        const cards = section.locator(selector === '.craft' ? '.craft-story' : '.rail__item');
        if (width < 1000 && selector === '.craft') {
          assert.equal(await section.locator('[data-carousel-next]').isVisible(), false, 'Mobile craft uses a readable vertical layout');
          const bounds = await cards.evaluateAll(elements => elements.map(el => {
            const box = el.getBoundingClientRect();
            return { top: box.top, bottom: box.bottom, left: box.left, right: box.right };
          }));
          assert.equal(bounds.length, 3);
          bounds.forEach((box, i) => {
            assert.ok(box.left >= -1 && box.right <= width + 1, 'Each mobile craft card fits the screen');
            if (i) assert.ok(box.top >= bounds[i - 1].bottom - 1, 'Mobile craft cards stack without overlap');
          });
        } else {
          if (width > 1000) {
            assert.equal(await section.evaluate(el => el.classList.contains('is-scroll-pinned')), true, 'Desktop chapter must pin while scrolling');
            await page.evaluate(selector => {
              const section = document.querySelector(selector);
              const trigger = window.ScrollTrigger.getById(`horizontal-${section.id}`);
              window.__noctisLenis.scrollTo(trigger.start + 1, { immediate: true });
              window.ScrollTrigger.update();
            }, selector);
            await page.waitForTimeout(650);
          }
          const card = cards.first();
          const before = await card.evaluate(el => el.getBoundingClientRect().left);
          await section.locator('[data-carousel-next]').click();
          await page.waitForTimeout(1450);
          const moved = await card.evaluate(el => el.getBoundingClientRect().left);
          assert.ok(moved < before - 50, `${selector}: next moves the cards horizontally`);
          await section.locator('[data-carousel-prev]').click();
          await page.waitForTimeout(1450);
          assert.ok(await card.evaluate(el => el.getBoundingClientRect().left) > moved + 40, `${selector}: previous returns the cards`);
        }
        await page.screenshot({ path: path.join(out, `${selector.slice(1)}-${width}.png`) });
      }
      await jump(page, '.service-accordion');
      const detail = page.locator('.service-detail').nth(1);
      await detail.locator('summary').click();
      assert.equal(await detail.evaluate(el => el.open), true);
      await detail.locator('summary').press('Enter');
      assert.equal(await detail.evaluate(el => el.open), false);
      if (width < 1000) {
        assert.ok(media.some(url => /\/intro-mobile-1080p30[^/]*\//.test(url)), 'Mobile loads its opening video');
        assert.equal(await page.locator('html').evaluate(el => el.classList.contains('has-mobile-film')), true, 'Normal mobile keeps the filmed scroll experience');
        assert.equal(await page.locator('[data-atelier-video]').isVisible(), false, 'Native player is only a fallback');
        assert.deepEqual(media.filter(url => /\.mp4(?:\?|$)/.test(url)), [], 'Normal scroll experience does not load an MP4 player');
        assert.ok(media.some(url => /\/hero-mobile-1080p30[^/]*\//.test(url)), 'Mobile loads its portrait hero scrub');
        assert.deepEqual(media.filter(url => !/\/(?:intro-mobile-1080p30|hero-mobile-1080p30|atelier)[^/]*\//.test(url)), [], 'Phone film uses portrait opening/hero frames and the atelier sequence');
        assert.equal(new Set(media.filter(url => /\/intro-mobile-1080p30[^/]*\//.test(url))).size, 65, 'Mobile opening contains 65 native 30 fps frames');
      } else {
        assert.ok(media.some(url => /\/intro-1080p30[^/]*\//.test(url)), 'Desktop loads its opening video');
      }

      await jump(page, '.hero');
      if (width > 1000) {
        for (const [progress, expected] of [[0.375, '01 / L’atelier'], [0.445, '02 / La peinture'], [0.54, '03 / Le carbone'], [0.67, '04 / La mécanique']]) {
          await page.evaluate(progress => {
            const hero = document.querySelector('.hero');
            const height = document.querySelector('.hero__sticky').offsetHeight;
            window.__noctisLenis.scrollTo(height + progress * (hero.offsetHeight - 2 * height), { immediate: true });
          }, progress);
          await page.waitForTimeout(2100);
          assert.equal(await page.locator('.reveal__cue.is-active small').textContent(), expected);
          await page.screenshot({ path: path.join(out, `film-cue-${progress}.png`) });
        }
        await jump(page, '.materials');
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(600);
        assert.equal(await page.locator('html').evaluate(el => el.classList.contains('is-simple')), true);
        await jump(page, '.hero');
        assert.equal(await page.locator('.hero__title').evaluate(el => getComputedStyle(el).opacity), '1');
        await page.screenshot({ path: path.join(out, 'desktop-resized-mobile.png') });
      }
      assert.deepEqual(errors, [], `Interaction errors ${width}`);
      await page.close();
      console.log(`Normal motion ${width}px: opening video, menu, tabs, responsive chapters, services and responsive switch OK`);
    }

    const nojs = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    await nojs.goto(base);
    assert.ok(await nojs.locator('.fallback-nav').isVisible());
    assert.equal(await nojs.locator('.material:visible').count(), 5);
    assert.ok(await nojs.locator('.hero__title').isVisible());
    await nojs.locator('.service-detail').nth(1).locator('summary').click();
    assert.equal(await nojs.locator('.service-detail').nth(1).evaluate(el => el.open), true);
    console.log('Without JavaScript: navigation, five materials and disclosures OK');
    if (!interactionsOnly) fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
