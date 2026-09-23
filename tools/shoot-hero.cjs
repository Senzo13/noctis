/* Vérifie la séquence animée du hero (JS + GSAP actifs).
   Usage : node tools/shoot-hero.cjs */

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "_shots");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const STEPS = [0, 400, 800, 1200, 1600, 1800];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: [
      "--allow-file-access-from-files",
      "--enable-unsafe-swiftshader",
      "--autoplay-policy=no-user-gesture-required",
      "--use-gl=angle"
    ]
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !/ERR_FILE_NOT_FOUND|net::/.test(msg.text())) console.log("CONSOLE:", msg.text());
  });

  await page.goto("file:///C:/dev/noctis/index.html", { waitUntil: "load" });
  await page.waitForTimeout(3000);

  const state = await page.evaluate(() => ({
    media: document.querySelector(".hero__media").className,
    webgl: !!document.createElement("canvas").getContext("webgl"),
    frames: (() => {
      const f = window.__noctisFrames || {};
      return {
        chargees: f.hero || 0,
        total: f.total || 120,
        index: f.heroIndex || 0
      };
    })(),
    canvasSize: (() => {
      const c = document.querySelector("[data-hero-canvas]");
      return c ? `${c.width}x${c.height}` : "aucun";
    })()
  }));
  console.log("état hero :", JSON.stringify(state));

  for (const y of STEPS) {
    await page.evaluate((value) => {
      if (window.__noctisLenis) window.__noctisLenis.scrollTo(value, { immediate: true });
      else window.scrollTo(0, value);
    }, y);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, `anim-hero-${String(y).padStart(4, "0")}.png`) });
  }

  console.log("hero animé : ok");

  // vue mobile : doit prendre la variante verticale de la vidéo
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("file:///C:/dev/noctis/index.html", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const mobile = await page.evaluate(() => {
    const f = window.__noctisFrames || {};
    return { variante: "hero-mobile", chargees: f.hero || 0, index: f.heroIndex || 0 };
  });
  console.log("séquence mobile :", JSON.stringify(mobile));
  for (const y of [0, 300, 600]) {
    await page.evaluate((value) => {
      if (window.__noctisLenis) window.__noctisLenis.scrollTo(value, { immediate: true });
      else window.scrollTo(0, value);
    }, y);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT, `anim-mob-${String(y).padStart(4, "0")}.png`) });
  }
  await browser.close();
})();
