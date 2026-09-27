/* Targeted verification of the installed film and its synchronized annotations. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.argv.slice(2).find(arg => /^https?:/.test(arg)) || 'http://127.0.0.1:5180';
const timing = require('../output/atelier-film/timeline.json');
const out = path.join(__dirname, '_shots', 'atelier-film');
const mobileOnly = process.argv.includes('--mobile');
const filmMetadata = new WeakMap();

async function seekScroll(page, seconds) {
  if (!filmMetadata.has(page)) {
    filmMetadata.set(page, await page.locator('[data-reveal-frame]').evaluate(el => ({ count: Number(el.dataset.frameCount), fps: Number(el.dataset.frameFps) })));
  }
  const metadata = filmMetadata.get(page);
  const index = Math.min(metadata.count - 1, Math.round(seconds * metadata.fps));
  const progress = .35 + .65 * index / (metadata.count - 1);
  await page.evaluate(progress => {
    const hero = document.querySelector('.hero');
    const sticky = document.querySelector('.hero__sticky');
    const y = hero.getBoundingClientRect().top + scrollY + sticky.offsetHeight + progress * (hero.offsetHeight - 2 * sticky.offsetHeight);
    window.__noctisLenis.scrollTo(y, { immediate: true });
    window.ScrollTrigger.update();
  }, progress);
  await page.waitForFunction(progress => Math.abs(window.__noctisReveal() - progress) < .0009, progress);
  await page.waitForTimeout(400);
  return index / metadata.fps;
}

function anchorAt(points, time) {
  for (let i = 1; i < points.length; i++) {
    if (time <= points[i].time) {
      const a = points[i - 1], b = points[i], fraction = (time - a.time) / (b.time - a.time);
      return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
    }
  }
  return points.at(-1);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const width of (mobileOnly ? [] : [1440, 1920])) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      await page.goto(base + '/?intro=0');
      await page.waitForFunction(() => !!window.__noctisReveal);
      const frame = page.locator('[data-reveal-frame]');
      const count = Number(await frame.getAttribute('data-frame-count'));
      const fps = Number(await frame.getAttribute('data-frame-fps'));
      assert.equal(fps, timing.webFps, 'Installed frame rate agrees with reviewed timeline');
      assert.ok(Math.abs(count - timing.duration * fps) <= 1, 'Frame count covers the reviewed duration, allowing its closing frame');
      assert.match(await frame.getAttribute('data-frame-base'), /^assets\/frames\/atelier[^/]+\/$/);
      await seekScroll(page, .35);
      await page.waitForFunction(count => window.__noctisFrames?.atelier === count, count);
      for (const [i, cue] of timing.cues.entries()) {
        await seekScroll(page, (cue.start + cue.end) / 2);
        assert.equal(await page.locator('.reveal__cue.is-active small').textContent(), cue.label);
        assert.equal(await page.locator('[data-component-label].is-active').count(), 0);
        await page.screenshot({ path: path.join(out, `${width}-cue-${i + 1}.png`) });
      }
      for (const [i, component] of timing.components.entries()) {
        const time = await seekScroll(page, (component.start + component.end) / 2);
        const active = page.locator('[data-component-label].is-active');
        assert.equal(await active.count(), 1);
        assert.equal(await active.locator('text').first().textContent(), component.name);
        assert.equal(await page.locator('.reveal__cue.is-active').count(), 0, 'Component labels have no competing title');
        const actual = await active.locator('circle').evaluate(el => ({ x: Number(el.getAttribute('cx')), y: Number(el.getAttribute('cy')) }));
        const expected = anchorAt(component.anchors, time);
        assert.ok(Math.abs(actual.x - expected.x) < .2 && Math.abs(actual.y - expected.y) < .2, `${component.name}: anchor ${JSON.stringify({ actual, expected })}`);
        const bounds = await active.locator('text').first().boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 900, 'Component name remains inside viewport');
        await page.screenshot({ path: path.join(out, `${width}-component-${i + 1}.png`) });
      }
      await seekScroll(page, 9.85);
      assert.equal(await page.locator('[data-reveal-finale].is-active').count(), 1);
      await page.screenshot({ path: path.join(out, `${width}-finale.png`) });
      for (const component of [...timing.components].reverse()) {
        await seekScroll(page, (component.start + component.end) / 2);
        assert.equal(await page.locator('[data-component-label].is-active text').first().textContent(), component.name);
        assert.equal(await page.locator('[data-reveal-finale].is-active').count(), 0);
      }
      await seekScroll(page, .35);
      assert.equal(await page.locator('.reveal__cue.is-active small').textContent(), timing.cues[0].label);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`Desktop ${width}: 4 cues, 3 tracked labels, reverse scrolling and finale PASS`);
    }

    for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion });
      const requests = [], errors = [];
      page.on('request', r => requests.push(r.url()));
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      await page.goto(base + '/?intro=0');
      const video = page.locator('[data-atelier-video]');
      await video.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      assert.equal(await video.isVisible(), true);
      assert.equal(await video.getAttribute('preload'), 'none');
      assert.equal(await video.evaluate(el => el.controls), true);
      assert.equal(await video.evaluate(el => el.readyState), 0, 'Native player has not loaded film metadata');
      assert.deepEqual(requests.filter(url => /\.mp4(?:\?|$)/.test(url)), []);
      assert.deepEqual(requests.filter(url => /\/frames\/atelier/.test(url) && !/\/001\.webp(?:\?|$)/.test(url)), [], 'Only the poster loads before play');
      await video.evaluate(async el => { el.muted = true; await el.play(); });
      await page.waitForFunction(() => document.querySelector('[data-atelier-video]').currentTime > .15);
      await video.evaluate(el => el.pause());
      assert.ok(await video.evaluate(el => Math.abs(el.duration - 10.041667) < .1));
      assert.ok(requests.some(url => /atelier-v2-20260927-063945-2f0e2c\.mp4/.test(url)));
      for (const item of [...timing.cues, ...timing.components]) {
        await video.evaluate((el, time) => new Promise(resolve => {
          el.addEventListener('seeked', resolve, { once: true }); el.currentTime = time;
        }), (item.start + item.end) / 2);
        const caption = await page.locator('[data-atelier-caption]').textContent();
        assert.ok(caption.includes(item.name || item.line1), `Native caption: expected ${item.name || item.line1}, got ${caption}`);
      }
      await page.screenshot({ path: path.join(out, `390-native-${reducedMotion}.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`Mobile ${reducedMotion}: unloaded until play, actual film playback and synchronized captions PASS`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
