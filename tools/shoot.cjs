/* Capture des écrans du site pour contrôle visuel.
   Usage : node tools/shoot.cjs [dossier-de-sortie] */

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const OUT = process.argv[2] || path.join(__dirname, "_shots");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = "file:///C:/dev/noctis/";

const PAGES = ["index.html", "realisations.html", "stock.html", "contact.html"];

async function capture(page, url, width, height, prefix) {
  await page.setViewportSize({ width, height });
  await page.goto(ROOT + url, { waitUntil: "load" });
  await page.waitForTimeout(1800);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const shots = Math.min(14, Math.ceil(total / height));
  const files = [];
  for (let i = 0; i < shots; i += 1) {
    await page.evaluate((y) => window.scrollTo(0, y), i * height);
    await page.waitForTimeout(450);
    const file = path.join(OUT, `${prefix}-${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: file });
    files.push(file);
  }
  return files;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--allow-file-access-from-files"] });
  const context = await browser.newContext({ reducedMotion: "reduce", deviceScaleFactor: 1 });
  const page = await context.newPage();

  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text());
  });

  for (const url of PAGES) {
    const name = url.replace(".html", "");
    const files = await capture(page, url, 1440, 900, `desk-${name}`);
    console.log(`${url}: ${files.length} captures`);
  }

  await capture(page, "index.html", 390, 844, "mob-index");
  console.log("mobile ok");

  await browser.close();
})();
