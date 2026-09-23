/* Vérifie la séquence vidéo 2 : dernière image de la vidéo 1 qui se dissout
   lentement dans le fond texture, carré minuscule qui s'ouvre au défilement
   jusqu'au plein écran, fermeture automatique à l'arrêt du défilement,
   marche arrière quand on remonte, et lecture de la vidéo (sans scrub). */

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "_shots");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required", "--enable-unsafe-swiftshader"]
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

  await page.goto("file:///C:/dev/noctis/index.html", { waitUntil: "load" });
  await page.waitForTimeout(2000);

  const geo = await page.evaluate(() => {
    const section = document.querySelector("[data-reveal]");
    const sticky = section.querySelector(".hero__sticky");
    return {
      viewport: window.innerHeight,
      rush: window.innerHeight,
      travel: section.offsetHeight - sticky.offsetHeight - window.innerHeight
    };
  });
  console.log(
    "hero : écran =", geo.viewport,
    "· rush =", Math.round(geo.rush),
    "· course du carré =", Math.round(geo.travel)
  );

  // défilement « continu » : le carré ne se referme que si on s'arrête
  // (le site a scroll-behavior:smooth, on force donc chaque pas en instantané)
  const bouger = async (cible) => {
    await page.evaluate(async (arrivee) => {
      const depart = window.pageYOffset;
      const pas = (arrivee - depart) / 14;
      for (let i = 1; i <= 14; i += 1) {
        window.scrollTo({ top: depart + pas * i, behavior: "instant" });
        await new Promise((suite) => window.setTimeout(suite, 45));
      }
    }, Math.round(cible));
  };

  const mesurer = async () =>
    await page.evaluate(() => {
      const section = document.querySelector("[data-reveal]");
      const v = section.querySelector("[data-reveal-frames]");
      const frame = section.querySelector("[data-reveal-frame]");
      const texture = section.querySelector("[data-reveal-texture]");
      const clip = getComputedStyle(frame).clipPath;
      const inset = /inset\(([\d.]+)px/.exec(clip);
      const screen = section.querySelector(".hero__sticky").clientHeight;
      return {
        y: Math.round(window.pageYOffset),
        valeur: window.__noctisReveal ? window.__noctisReveal().toFixed(3) : "?",
        frame: (window.__noctisFrames ? window.__noctisFrames.atelierIndex : 0) + "/119",
        fondTexture: getComputedStyle(texture).opacity,
        carre: inset ? Math.round(screen - 2 * parseFloat(inset[1])) + "px (opacité " + getComputedStyle(frame).opacity + ")" : clip
      };
    });

  // on parcourt la séquence : rush, dissolution du fond, ouverture, plein écran
  const etapes = [
    ["rush-90", geo.rush * 0.9],
    ["rush-100", geo.rush],
    ["fondu-30", geo.rush + geo.travel * 0.1],
    ["fondu-70", geo.rush + geo.travel * 0.22],
    ["minuscule", geo.rush + geo.travel * 0.3],
    ["ouverture", geo.rush + geo.travel * 0.55],
    ["plein", geo.rush + geo.travel * 0.9],
    ["fin", geo.rush + geo.travel],
    ["apres", geo.rush + geo.travel + geo.viewport * 0.6]
  ];

  for (const [nom, position] of etapes) {
    await bouger(position);
    console.log(`  ${nom.padEnd(10)} y=${Math.round(position)} →`, JSON.stringify(await mesurer()));
    await page.screenshot({ path: path.join(OUT, `atelier-${nom}.png`) });
  }

  // 1) on s'arrête de défiler : le carré doit se refermer tout seul
  await bouger(geo.rush + geo.travel * 0.6);
  console.log("  arrêt      (ouverture) →", JSON.stringify(await mesurer()));
  await page.waitForTimeout(3000);
  console.log("  arrêt      (+3 s)      →", JSON.stringify(await mesurer()));
  await page.screenshot({ path: path.join(OUT, "atelier-arret.png") });

  // 2) plein écran atteint : il doit rester
  await bouger(geo.rush + geo.travel);
  console.log("  plein      (atteint)   →", JSON.stringify(await mesurer()));
  await page.waitForTimeout(2500);
  console.log("  plein      (+2,5 s)    →", JSON.stringify(await mesurer()));

  // 3) on remonte : la séquence repart en arrière et la vidéo 1 revient
  await bouger(geo.rush * 0.95);
  console.log("  remontée   →", JSON.stringify(await mesurer()));
  await page.screenshot({ path: path.join(OUT, "atelier-remontee.png") });

  // mesure des micro-saccades : on descend la section en continu pendant que
  // la vidéo joue, et on relève les écarts entre images
  await page.evaluate((value) => window.scrollTo({ top: value, behavior: "instant" }), Math.round(geo.rush));
  await page.waitForTimeout(900);
  const perf = await page.evaluate(async (course) => {
    const ecarts = [];
    let precedent = performance.now();
    let y = window.pageYOffset;
    return await new Promise((resolve) => {
      const suivant = (maintenant) => {
        ecarts.push(maintenant - precedent);
        precedent = maintenant;
        y += course / 150;
        window.scrollTo({ top: y, behavior: "instant" });
        if (ecarts.length < 150) requestAnimationFrame(suivant);
        else resolve(ecarts.slice(5));
      };
      requestAnimationFrame(suivant);
    });
  }, geo.travel);
  const tri = [...perf].sort((a, b) => a - b);
  const moyenne = perf.reduce((a, b) => a + b, 0) / perf.length;
  const saccades = perf.filter((v) => v > 34).length;
  console.log(
    "fluidité : image médiane =", tri[Math.floor(tri.length / 2)].toFixed(1) + "ms",
    "· pire =", tri[tri.length - 1].toFixed(1) + "ms",
    "· moyenne =", moyenne.toFixed(1) + "ms",
    "· images > 34ms =", saccades + "/" + perf.length
  );

  // ------------------------------------------------------------------
  // Fluidité de la vidéo 1 (le rush, en séquence d'images) : on descend le
  // premier écran en continu et on relève, à chaque image affichée, de
  // combien d'images de la séquence on a avancé.
  // ------------------------------------------------------------------
  const rushFluidite = async (url, etiquette) => {
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(3600);
    const mesures = await page.evaluate(async () => {
      const ecarts = [];
      const avance = [];
      let precedent = window.performance.now();
      let dernier = -1;
      let y = 0;
      return await new Promise((resolve) => {
        const suivant = (maintenant) => {
          ecarts.push(maintenant - precedent);
          precedent = maintenant;
          y += 6;
          window.scrollTo({ top: y, behavior: "instant" });
          const i = window.__noctisFrames ? window.__noctisFrames.heroIndex || 0 : 0;
          avance.push(i - dernier);
          dernier = i;
          if (y < window.innerHeight) requestAnimationFrame(suivant);
          else resolve({ ecarts: ecarts.slice(4), avance: avance.slice(4) });
        };
        requestAnimationFrame(suivant);
      });
    });
    const tri = [...mesures.ecarts].sort((a, b) => a - b);
    const max = mesures.avance.reduce((a, b) => Math.max(a, b), 0);
    const bloquees = mesures.avance.filter((v) => v === 0).length;
    console.log(
      `rush ${etiquette} : image médiane =`, tri[Math.floor(tri.length / 2)].toFixed(1) + "ms",
      "· pire =", tri[tri.length - 1].toFixed(1) + "ms",
      "· images de séquence sautées au maximum =", max,
      "· images affichées sans avancer =", bloquees + "/" + mesures.avance.length
    );
  };

  await rushFluidite("http://localhost:5180/index.html", "avec séquence");
  await rushFluidite("http://localhost:5180/index.html?reveal=0", "séquence coupée");

  await browser.close();
})();
