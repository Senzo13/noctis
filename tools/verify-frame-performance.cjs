/* Profile frame scheduling with identical assets and page code.
   node tools/verify-frame-performance.cjs [--cpu=4] [--baseline=path/to/engine.js]
   Optional baseline file contains only function initFrameSequence(options).
   Numbers are local measurements, not device-independent performance guarantees. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const option = (key, fallback) => args.find(arg => arg.startsWith(`--${key}=`))?.slice(key.length + 3) || fallback;
const base = option('base', 'http://127.0.0.1:5180');
const cpuRate = Number(option('cpu', '1'));
const baseline = option('baseline', '');
const out = path.join(__dirname, '_shots', 'frame-performance.json');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const source = fs.readFileSync(path.join(__dirname, '../assets/js/main.js'), 'utf8');
  const start = source.indexOf('  function initFrameSequence(options)');
  const end = source.indexOf('\n  /* ------------------------------------------------------------------ */', start);
  const versions = baseline ? {
    before: source.slice(0, start) + fs.readFileSync(baseline, 'utf8') + source.slice(end),
    after: source
  } : { current: source };
  const report = [];
  try {
    for (const width of [390, 1440]) {
      for (const [variant, script] of Object.entries(versions)) {
        const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: width < 1000 });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/assets/js/main.js*', route => route.fulfill({ contentType: 'application/javascript', body: script }));
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
        await page.addInitScript(() => {
          window.__framePerf = { decodes: [], draws: 0, longTasks: [] };
          const bitmap = window.createImageBitmap;
          window.createImageBitmap = function (...args) {
            const started = performance.now();
            return bitmap.apply(this, args).then(image => {
              window.__framePerf.decodes.push(performance.now() - started);
              return image;
            });
          };
          const draw = CanvasRenderingContext2D.prototype.drawImage;
          CanvasRenderingContext2D.prototype.drawImage = function (...args) {
            window.__framePerf.draws++;
            return draw.apply(this, args);
          };
          new PerformanceObserver(list => window.__framePerf.longTasks.push(...list.getEntries().map(entry => entry.duration))).observe({ type: 'longtask', buffered: false });
        });
        await page.goto(`${base}/?intro=0&lenis=0`);
        await page.evaluate(() => scrollTo({ top: innerHeight * .7, behavior: 'instant' }));
        await page.waitForFunction(() => {
          const frame = document.querySelector('[data-reveal-frame]');
          const mobile = document.documentElement.classList.contains('has-mobile-film');
          return window.__noctisFrames?.atelier >= Number(mobile ? frame.dataset.mobileFrameCount : frame.dataset.frameCount);
        });
        await page.waitForTimeout(350);
        const result = await page.evaluate(async () => {
          const hero = document.querySelector('[data-hero]');
          const height = hero.querySelector('.hero__sticky').offsetHeight;
          const travel = hero.offsetHeight - 2 * height;
          const frame = document.querySelector('[data-reveal-frame]');
          const mobile = document.documentElement.classList.contains('has-mobile-film');
          const count = Number(mobile ? frame.dataset.mobileFrameCount : frame.dataset.frameCount);
          const fps = Number(mobile ? frame.dataset.mobileFrameFps : frame.dataset.frameFps);
          const durationMs = (count - 1) / fps * 1000;
          const samples = [];
          const started = performance.now();
          window.__framePerf = { decodes: [], draws: 0, longTasks: [] };
          return new Promise(resolve => {
            function tick(now) {
              const elapsed = now - started;
              const progress = Math.min(1, elapsed / durationMs);
              scrollTo({ top: height + (.35 + .65 * progress) * travel, behavior: 'instant' });
              window.ScrollTrigger.update();
              samples.push({ ms: elapsed, lag: Math.abs(Math.round(progress * (count - 1)) - window.__noctisFrames.atelierIndex), decoded: window.__noctisFrames.atelierDecoded });
              if (progress < 1) requestAnimationFrame(tick);
              else {
                const lag = samples.map(sample => sample.lag).sort((a, b) => a - b);
                resolve({ count, fps, samples, medianFrameLag: lag[Math.floor(lag.length * .5)], p95FrameLag: lag[Math.floor(lag.length * .95)], maximumFrameLag: lag.at(-1), maximumDecoded: Math.max(...samples.map(sample => sample.decoded)), ...window.__framePerf });
              }
            }
            requestAnimationFrame(tick);
          });
        });
        await page.waitForTimeout(1000);
        const idleBefore = await page.evaluate(() => window.__framePerf.decodes.length);
        await page.waitForTimeout(500);
        const idleDecodes = await page.evaluate(previous => window.__framePerf.decodes.length - previous, idleBefore);
        assert.deepEqual(errors, []);
        assert.ok(result.maximumDecoded <= 18, 'Decoded cache must stay bounded');
        assert.equal(idleDecodes, 0, 'A settled scene must not decode continuously');
        report.push({ width, variant, cpuRate, idleDecodes, ...result });
        console.log(`${width}px ${variant}: median=${result.medianFrameLag} frames, p95=${result.p95FrameLag}, max=${result.maximumFrameLag}, cache=${result.maximumDecoded}, idle decodes=${idleDecodes}`);
        await page.close();
      }
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
