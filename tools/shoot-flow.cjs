/* Parcours complet : hero (scrub) puis section atelier (scrub). */

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "_shots");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const STEPS = (process.env.SHOOT_STEPS || "0,300,600,900,1300,1700,2100,2500,3000")
  .split(",")
  .map(Number);
const URL = process.argv[2] || "file:///C:/dev/noctis/index.html?intro=0";

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required", "--enable-unsafe-swiftshader"]
  });
  const [vw, vh] = (process.env.SHOOT_VIEW || "1440x900").split("x").map(Number);
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !/ERR_FILE_NOT_FOUND/.test(msg.text())) console.log("CONSOLE:", msg.text());
  });

  console.log("url :", URL);
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForTimeout(3000);

  const etat = await page.evaluate(() => ({
    gsap: typeof window.gsap !== "undefined",
    st: typeof window.ScrollTrigger !== "undefined",
    lenis: typeof window.Lenis !== "undefined",
    heroFrames: (window.__noctisFrames || {}).hero || 0,
    atelierFrames: (window.__noctisFrames || {}).atelier || 0,
    sectionAtelier: (() => {
      const s = document.querySelector("[data-atelier]");
      return s ? { haut: s.offsetTop, hauteur: s.offsetHeight } : null;
    })()
  }));
  console.log("état :", JSON.stringify(etat));

  for (const y of STEPS) {
    await page.evaluate((value) => {
      if (window.__noctisLenis) window.__noctisLenis.scrollTo(value, { immediate: true });
      else window.scrollTo(0, value);
    }, y);
    await page.waitForTimeout(1100);
    await page.screenshot({ path: path.join(OUT, `flow-${String(y).padStart(4, "0")}.png`) });
    const t = await page.evaluate(() => ({
      hero: (window.__noctisFrames || {}).heroIndex || 0,
      atelier: (window.__noctisFrames || {}).atelierIndex || 0
    }));
    console.log(`  y=${y} → hero ${t.hero}/119 · atelier ${t.atelier}/119`);
  }

  await browser.close();
})();
