/* Vérifie les pages servies, les images, le crédit et les vues responsive.
   Usage : node tools/verify-images.cjs [http://127.0.0.1:5180] */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://127.0.0.1:5180';
const out = path.join(__dirname, '_shots', 'images');
const pages = ['index', 'realisations', 'stock', 'contact', 'confidentialite', 'conditions'];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const report = [];
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      for (const name of pages) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
        const response = await page.goto(`${base}/${name}.html?intro=0`, { waitUntil: 'load' });
        assert.equal(response.status(), 200);
        assert.equal(await page.locator('[data-cookie-bar], a[href="cookies.html"]').count(), 0);
        await page.evaluate(async () => {
          await document.fonts.ready;
          document.querySelectorAll('img').forEach(img => img.loading = 'eager');
          await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
        });
        await page.locator('.footer__credit').scrollIntoViewIfNeeded();
        const result = await page.evaluate(() => {
          const credit = document.querySelector('.footer__credit');
          const logo = credit.querySelector('img');
          return {
            width: innerWidth,
            overflow: document.documentElement.scrollWidth > innerWidth,
            broken: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src),
            credit: credit.querySelector('span').textContent,
            href: credit.href,
            logoWidth: logo.getBoundingClientRect().width,
            generated: [...document.images].filter(i => i.src.includes('/generated/')).length
          };
        });
        assert.equal(result.credit, 'POWERED BY');
        assert.equal(result.href, 'https://nevolabs.ch/');
        assert.equal(result.overflow, false, `${name}: horizontal overflow at ${width}`);
        assert.deepEqual(result.broken, [], `${name}: broken images`);
        assert.deepEqual(errors, [], `${name}: browser errors`);
        assert.ok(result.logoWidth >= 90);
        if (name === 'index') {
          if (width < 700) {
            const overlaps = await page.locator('.material').evaluateAll(cards => cards.filter(card => {
              return card.querySelector('h3').getBoundingClientRect().bottom > card.querySelector('p').getBoundingClientRect().top;
            }).map(card => card.querySelector('h3').textContent));
            assert.deepEqual(overlaps, [], 'Les titres des finitions ne doivent pas chevaucher les descriptions');
          }
          await page.locator('.footer').screenshot({ path: path.join(out, `${name}-${width}-footer.png`) });
          for (const selector of ['.materials', '.panels', '#stock']) {
            if (await page.locator(selector).count()) await page.locator(selector).screenshot({ path: path.join(out, `${name}-${width}-${selector.replace(/[.#]/g, '')}.png`) });
          }
          for (let i = 0; i < 3; i++) {
            const panel = page.locator('.panel').nth(i);
            await panel.scrollIntoViewIfNeeded();
            assert.ok(await panel.locator('h3').isVisible());
            assert.ok(await panel.locator('img').isVisible());
            await panel.screenshot({ path: path.join(out, `panel-${i}-${width}.png`) });
          }
        }
        if (['realisations', 'stock'].includes(name)) await page.screenshot({ path: path.join(out, `${name}-${width}-full.png`), fullPage: true });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(out, `${name}-${width}-top.png`) });
        report.push({ page: name, ...result, errors });
        await page.close();
        console.log(`${name} ${width}px: OK (${result.generated} images générées)`);
      }
      await context.close();
    }
    // Parcours normal, animations actives, sur ordinateur et mobile.
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/index.html?intro=0`, { waitUntil: 'load' });
      await page.locator('[data-menu-toggle]').click();
      assert.equal(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded'), 'false');
      for (const selector of ['.materials', '.footer']) {
        await page.evaluate(selector => {
          const el = document.querySelector(selector);
          const y = el.getBoundingClientRect().top + scrollY;
          if (window.__noctisLenis) window.__noctisLenis.scrollTo(y, { immediate: true });
          else scrollTo(0, y);
          window.ScrollTrigger?.update();
        }, selector);
        await page.waitForTimeout(1200);
        await page.screenshot({ path: path.join(out, `normal-${width}-${selector.slice(1)}.png`) });
      }
      await page.locator('.footer__credit').focus();
      assert.ok(await page.locator('.footer__credit').evaluate(el => el === document.activeElement));
      assert.deepEqual(errors, []);
      await page.close();
    }
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log('12 vues vérifiées ; aucun bandeau cookies ; menus, focus et défilement normal OK.');
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
