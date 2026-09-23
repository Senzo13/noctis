/* Test réaliste : on scrolle à la molette comme un utilisateur (donc via le
   défilement lissé par Lenis) et on relève l'état de la séquence à chaque
   étape : scrub de la vidéo 1, fondu du fond texture, ouverture du carré,
   lecture de la vidéo 2. Le but est de voir que rien ne se fait par sauts. */

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "_shots");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--autoplay-policy=no-user-gesture-required", "--enable-unsafe-swiftshader"],
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));
  page.on("console", (msg) => { if (msg.type() === "error") console.log("CONSOLE:", msg.text()); });

  await page.goto("file:///C:/dev/noctis/index.html?debug=1&intro=0", { waitUntil: "load" });
  await page.waitForTimeout(2500);

  const steps = [];
  await page.mouse.move(720, 450);
  let precedentV1 = -1;
  let plusGrosSaut = 0;
  for (let i = 0; i < 26; i += 1) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(320);
    const state = await page.evaluate(() => {
      const section = document.querySelector("[data-reveal]");
      const frame = section.querySelector("[data-reveal-frame]");
      const texture = section.querySelector("[data-reveal-texture]");
      const inset = /inset\(([\d.]+)px/.exec(getComputedStyle(frame).clipPath);
      const ecran = section.querySelector(".hero__sticky").clientHeight;
      const suivi = window.__noctisFrames || {};
      return {
        y: Math.round(window.pageYOffset),
        image1: suivi.heroIndex || 0,
        fond: Number(getComputedStyle(texture).opacity),
        carre: inset ? Math.round(ecran - 2 * parseFloat(inset[1])) : null,
        carreOpacite: Number(getComputedStyle(frame).opacity),
        image2: suivi.atelierIndex || 0
      };
    });
    const file = path.join(OUT, `wheel-${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: file });
    steps.push({ i, file, ...state });
    if (precedentV1 >= 0) plusGrosSaut = Math.max(plusGrosSaut, state.image1 - precedentV1);
    precedentV1 = state.image1;
    console.log(
      `i=${String(i).padStart(2)} y=${String(state.y).padStart(5)}` +
      `  image1=${state.image1}/119  fond=${state.fond.toFixed(2)}` +
      `  carré=${state.carre}px (opacité ${state.carreOpacite.toFixed(2)})  image2=${state.image2}/119`
    );
  }

  console.log("plus gros saut de la séquence vidéo 1 entre deux relevés :", plusGrosSaut + " image(s) sur 120");
  fs.writeFileSync(path.join(OUT, "steps.json"), JSON.stringify(steps, null, 2));
  console.log("captures :", steps.length);
  await browser.close();
})();
