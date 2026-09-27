/* Touch-device continuity: opening film, hero scrub, atelier scrub and fallbacks. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const timing = require('../output/atelier-film-mobile/timeline.json');
const desktopTiming = require('../output/atelier-film/timeline.json');
const base = process.argv[2] || 'http://127.0.0.1:5180';
const out = path.join(__dirname, '_shots', 'mobile-film');

async function swipe(page, distance = 250) {
  const session = await page.context().newCDPSession(page);
  const { width, height } = page.viewportSize();
  const x = width * .65, start = height * .78;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: start }] });
  for (let i = 1; i <= 8; i++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: start - distance * i / 8 }] });
    await page.waitForTimeout(35);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
  await page.waitForTimeout(600);
}

async function jump(page, y) {
  await page.evaluate(y => { scrollTo({ top: y, behavior: 'instant' }); window.ScrollTrigger?.update(); }, y);
  await page.waitForTimeout(450);
}

async function seekFilm(page, seconds) {
  const expected = await page.evaluate(seconds => {
    const section = document.querySelector('.hero');
    const sticky = document.querySelector('.hero__sticky');
    const film = document.querySelector('[data-reveal-frame]');
    const portrait = film.classList.contains('has-portrait-source');
    const count = Number(portrait ? film.dataset.mobileFrameCount : film.dataset.frameCount);
    const fps = Number(portrait ? film.dataset.mobileFrameFps : film.dataset.frameFps);
    const index = Math.min(count - 1, Math.round(seconds * fps));
    const progress = .35 + .65 * index / (count - 1);
    const y = section.getBoundingClientRect().top + scrollY + sticky.offsetHeight + progress * (section.offsetHeight - 2 * sticky.offsetHeight);
    scrollTo({ top: y, behavior: 'instant' }); window.ScrollTrigger?.update();
    return index;
  }, seconds);
  try {
    await page.waitForFunction(index => window.__noctisFrames?.atelierIndex === index, expected, { timeout: 10000 });
  } catch (error) {
    console.error('Film seek diagnostic', expected, await page.evaluate(() => ({ frames: window.__noctisFrames, reveal: window.__noctisReveal?.(), y: scrollY, hero: document.querySelector('.hero').offsetHeight, sticky: document.querySelector('.hero__sticky').offsetHeight, classes: document.documentElement.className })));
    throw error;
  }
  await page.waitForTimeout(350);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const [width, height] of [[390, 844], [375, 667], [320, 700]]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
      const errors = [], media = [], frameRequests = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if (/\.mp4(?:\?|$)/.test(r.url())) media.push(r.url()); });
      page.on('request', r => { if (/\/frames\/atelier[^/]*\//.test(r.url())) frameRequests.push(r.url()); });
      page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      await page.addInitScript(() => {
        window.__handoffAudit = { started: false, gaps: [], samples: 0 };
        const start = performance.now();
        function sample() {
          const intro = document.querySelector('[data-intro-frames]');
          const hero = document.querySelector('[data-hero-frames]');
          const audit = window.__handoffAudit;
          if (intro?.classList.contains('is-ready')) audit.started = true;
          if (audit.started && hero && intro) {
            audit.samples++;
            const introVisible = getComputedStyle(intro).display !== 'none' && Number(getComputedStyle(intro).opacity) > .02;
            const heroReady = hero.classList.contains('is-ready') && window.__noctisFrames?.heroIndex >= 0;
            if (!introVisible && !heroReady) audit.gaps.push({ time: performance.now() - start, heroIndex: window.__noctisFrames?.heroIndex });
          }
          if (performance.now() - start < 6500) requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), true);
      await page.waitForFunction(() => window.__noctisFrames?.introIndex > 0);
      const first = await page.evaluate(() => window.__noctisFrames.introIndex);
      await page.waitForTimeout(400);
      assert.ok(await page.evaluate(() => window.__noctisFrames.introIndex) > first, 'Opening film moves');
      await page.screenshot({ path: path.join(out, `${width}-intro.png`) });
      await page.waitForFunction(() => !document.documentElement.classList.contains('is-intro'), null, { timeout: 10000 });
      await page.waitForFunction(() => window.__noctisFrames?.heroIndex >= 0);
      await page.waitForTimeout(1000);
      const handoff = await page.evaluate(() => window.__handoffAudit);
      assert.ok(handoff.samples > 10);
      assert.deepEqual(handoff.gaps, [], 'Opening remains on screen until the hero has drawn');
      assert.equal(await page.locator('[data-atelier-video]').isVisible(), false, 'Normal mobile experience does not show native player controls');
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains('is-locked')), false);
      await page.screenshot({ path: path.join(out, `${width}-handoff.png`) });
      const heroBefore = await page.evaluate(() => window.__noctisFrames.heroIndex);
      await swipe(page, 220);
      await page.waitForFunction(index => window.__noctisFrames.heroIndex > index + 5, heroBefore);
      assert.ok(await page.evaluate(() => scrollY > 50), 'Touch scroll is unlocked');
      await page.screenshot({ path: path.join(out, `${width}-hero-swipe.png`) });
      const heroAdvanced = await page.evaluate(() => window.__noctisFrames.heroIndex);
      await jump(page, 0);
      await page.waitForFunction(index => window.__noctisFrames.heroIndex < index - 5, heroAdvanced);
      for (const [index, cue] of timing.cues.entries()) {
        await seekFilm(page, (cue.start + cue.end) / 2);
        const active = page.locator('.reveal__cue.is-active');
        assert.equal(await active.locator('small').textContent(), cue.label);
        const box = await active.boundingBox();
        assert.ok(box.x >= -1 && box.x + box.width <= width + 1 && box.y >= 0 && box.y + box.height <= height, 'Film caption fits phone geometry');
        if (index === 2) await page.screenshot({ path: path.join(out, `${width}-atelier-caption.png`) });
      }
      const portraitCoverage = await page.evaluate(async () => {
        const canvas = document.querySelector('[data-reveal-frames]');
        const rect = canvas.getBoundingClientRect();
        const stage = document.querySelector('.hero__sticky').getBoundingClientRect();
        const frame = document.querySelector('[data-reveal-frame]');
        const source = new Image();
        source.src = frame.dataset.mobileFrameBase + '001.webp';
        await source.decode();
        const ctx = canvas.getContext('2d');
        // The old landscape film used contain: its top and bottom quarters
        // were flat #090909 bars. Sample real image variation in both bands.
        const bands = [.2, .8].map(y => {
          const pixels = ctx.getImageData(0, Math.floor(canvas.height*y), canvas.width, 1).data;
          let min = 255, max = 0;
          for(let i=0; i<pixels.length; i+=4) {
            const value = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
            min = Math.min(min,value); max = Math.max(max,value);
          }
          return max-min;
        });
        return {sourceWidth:source.naturalWidth,sourceHeight:source.naturalHeight,
          portrait:frame.classList.contains('has-portrait-source'),
          widthGap:stage.width-rect.width,heightGap:stage.height-rect.height,
          clip: getComputedStyle(frame).clipPath,bands};
      });
      assert.equal(portraitCoverage.portrait,true,'Portrait source is active');
      assert.equal(portraitCoverage.sourceWidth,1080);
      assert.equal(portraitCoverage.sourceHeight,1920);
      assert.ok(portraitCoverage.widthGap<=2 && portraitCoverage.heightGap<=2,'Canvas covers full mobile stage');
      assert.ok(portraitCoverage.bands.every(variation=>variation>10),'Top/bottom bands contain image, not the former letterbox');
      assert.match(portraitCoverage.clip,/^inset\(0px/,'Film window is fully open');
      await seekFilm(page, 6.5);
      const atelierBefore = await page.evaluate(() => window.__noctisFrames.atelierIndex);
      await swipe(page, 100);
      await page.waitForFunction(index => window.__noctisFrames.atelierIndex > index, atelierBefore);
      for (const [index, component] of timing.components.entries()) {
        await seekFilm(page, (component.start + component.end) / 2);
        const label = page.locator('.reveal__mobile-component.is-active');
        assert.equal(await label.getAttribute('data-name'), component.name);
        const box = await label.boundingBox();
        assert.ok(box.x >= -1 && box.x + box.width <= width + 1 && box.y >= 0 && box.y + box.height <= height, `${component.name}: label fits phone geometry`);
        assert.ok(box.height >= 11, `${component.name}: rendered label is readable (${box.height}px)`);
        assert.equal(await page.locator('.reveal__cue.is-active').count(), 0);
        await page.screenshot({ path: path.join(out, `${width}-component-${index + 1}.png`) });
      }
      await seekFilm(page, (timing.cues[1].start + timing.cues[1].end)/2);
      assert.equal(await page.locator('.reveal__cue.is-active small').textContent(), timing.cues[1].label);
      const end = await page.locator('.hero').evaluate(el => el.getBoundingClientRect().bottom + scrollY);
      await jump(page, end + 120);
      assert.ok(await page.locator('.craft').evaluate(el => el.getBoundingClientRect().top < innerHeight), 'Scroll continues into the gestures section');
      await swipe(page, 180);
      assert.ok(await page.evaluate(end => scrollY > end + 180, end), 'Touch scroll continues after the pinned film');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains('is-locked')), false);
      await page.screenshot({ path: path.join(out, `${width}-after-film.png`) });
      assert.ok(frameRequests.some(url=>url.includes('/atelier-mobile-1080p24-20260927/')),'Portrait sequence requested');
      assert.deepEqual(frameRequests.filter(url=>!url.includes('/atelier-mobile-1080p24-20260927/')),[],'No desktop atelier frames downloaded before rotation');
      if (width === 390) {
        await page.setViewportSize({ width: 844, height: 390 });
        await page.waitForFunction(()=>!document.querySelector('[data-reveal-frame]').classList.contains('has-portrait-source'));
        const heads = desktopTiming.components.find(part=>part.name==='CULASSES');
        await seekFilm(page, (heads.start+heads.end)/2);
        assert.equal(await page.locator('.reveal__mobile-component.is-active').getAttribute('data-name'), 'CULASSES');
        const landscapeLabel = await page.locator('.reveal__mobile-component.is-active').boundingBox();
        const landscapeHeader = await page.locator('.header').boundingBox();
        assert.ok(landscapeLabel.y >= Math.max(landscapeHeader.y + landscapeHeader.height, landscapeHeader.height) + 1,'Landscape component caption clears even the expanded header');
        assert.ok(frameRequests.some(url=>url.includes('/atelier-v2-1080p24-20260927/')),'Landscape rotation switches to desktop film');
        await page.screenshot({path:path.join(out,`${width}-rotated-landscape.png`)});
        await page.setViewportSize({ width, height });
        await page.waitForFunction(()=>document.querySelector('[data-reveal-frame]').classList.contains('has-portrait-source'));
        await seekFilm(page, (timing.components[0].start+timing.components[0].end)/2);
        assert.equal(await page.locator('.reveal__mobile-component.is-active').getAttribute('data-name'), 'ADMISSION');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForTimeout(250);
        assert.equal(await page.locator('[data-atelier-video]').isVisible(), true, 'Changing to reduced motion restores the native player');
        assert.equal(await page.locator('html').evaluate(el => el.classList.contains('has-mobile-film')), false, 'Reduced motion removes the filmed mobile pin');
      }
      assert.deepEqual(media, [], 'Normal scroll film loads no native MP4');
      assert.deepEqual(errors, []);
      console.log(`${width}x${height}: opening continuity, actual touch hero/atelier scrub, captions, labels, reverse and exit PASS`);
      await page.close();
    }
    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    await reduced.goto(base);
    assert.equal(await reduced.locator('[data-atelier-video]').isVisible(), true, 'Reduced motion retains the native player fallback');
    assert.equal(await reduced.locator('[data-atelier-video]').evaluate(el => el.controls && el.preload === 'none'), true);
    assert.equal(await reduced.evaluate(() => document.documentElement.classList.contains('is-intro')), false);
    const nativeSource = await reduced.locator('[data-atelier-video]').evaluate(async video => {
      video.load();
      await new Promise((resolve,reject)=>{ video.addEventListener('loadedmetadata',resolve,{once:true});video.addEventListener('error',()=>reject(new Error('Native portrait video failed')),{once:true}); });
      return {src:video.currentSrc,width:video.videoWidth,height:video.videoHeight};
    });
    assert.ok(nativeSource.src.endsWith('/assets/video/atelier-mobile-20260927.mp4'),'Reduced-motion player uses portrait MP4');
    assert.equal(nativeSource.width,1080); assert.equal(nativeSource.height,1920);
    await swipe(reduced, 220);
    assert.ok(await reduced.evaluate(() => scrollY > 50));
    console.log('Reduced motion: native player fallback and unlocked scrolling PASS');
    await reduced.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
