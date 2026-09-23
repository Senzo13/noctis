/* Vérifie que la séquence vidéo 2 suit bien l'ouverture du carré
   (et qu'elle ne « tourne » pas toute seule : les images sont au défilement). */

const { chromium } = require("playwright");
const BROWSER = process.env.NOCTIS_BROWSER === "edge"
  ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  : "C:/Program Files/Google/Chrome/Application/chrome.exe";
// ?intro=0 : la séquence d'intro (vidéo 0) verrouille le défilement ; les
// mesures ci-dessous pilotent le scroll dès l'arrivée, donc on la coupe.
const URL = process.argv[2] || "http://127.0.0.1:5180/index.html?intro=0";

(async () => {
  const browser = await chromium.launch({
    executablePath: BROWSER,
    args: ["--autoplay-policy=no-user-gesture-required", "--enable-unsafe-swiftshader"]
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 911 } });
  await page.goto(URL, { waitUntil: "load" });

  const geo = await page.evaluate(() => {
    const s = document.querySelector("[data-reveal]");
    const st = s.querySelector(".hero__sticky");
    return {
      haut: s.offsetTop,
      rush: window.innerHeight,
      course: s.offsetHeight - st.offsetHeight - window.innerHeight
    };
  });
  const aller = async (y) => {
    await page.evaluate((value) => {
      if (window.__noctisLenis) window.__noctisLenis.scrollTo(value, { immediate: true });
      else window.scrollTo(0, value);
    }, y);
    await page.waitForTimeout(300);
  };

  const lire = () =>
    page.evaluate(() => {
      const f = window.__noctisFrames || {};
      return {
        index: f.atelierIndex || 0,
        ouverture: (window.__noctisReveal || function () { return 0; })().toFixed(3)
      };
    });

  await aller(geo.haut + geo.rush); // fin du rush, le carré n'est pas encore ouvert
  const a = await lire();
  await page.waitForTimeout(1500); // sans scroll : les images ne doivent pas bouger
  const b = await lire();
  await aller(geo.haut + geo.rush + geo.course * 0.55); // le carré s'ouvre
  const c = await lire();
  await page.waitForTimeout(1500); // on lâche : le carré se referme tout seul
  const d = await lire();
  await aller(geo.haut + geo.rush + geo.course * 0.95); // le carré remplit l'écran
  const e = await lire();
  await page.waitForTimeout(1500); // plein écran : la séquence reste ouverte
  const f = await lire();

  console.log("fin du rush :", JSON.stringify(a));
  console.log("1,5 s plus tard, sans scroll :", JSON.stringify(b));
  console.log("carré à moitié ouvert :", JSON.stringify(c));
  console.log("1,5 s plus tard, sans scroll :", JSON.stringify(d));
  console.log("carré plein écran :", JSON.stringify(e));
  console.log("1,5 s plus tard :", JSON.stringify(f));
  console.log(
    a.index === b.index
      ? "OK : la séquence ne bouge pas toute seule (elle attend le scroll)"
      : "PROBLEME : la séquence bouge toute seule"
  );
  console.log(
    c.ouverture > 0.4 && c.index === 0
      ? "OK : le carré s'ouvre d'abord sans jouer les images (elles attendent le plein écran)"
      : "PROBLEME : les images ne devraient pas démarrer avant le plein écran"
  );
  console.log(
    Number(d.ouverture) < Number(c.ouverture)
      ? "OK : à l'arrêt, la séquence recule (fermeture automatique)"
      : "PROBLEME : la séquence ne se referme pas à l'arrêt"
  );
  console.log(
    e.index > 0
      ? "OK : plein écran, les images avancent au défilement"
      : "PROBLEME : les images ne suivent pas le défilement une fois le carré plein"
  );
  console.log(
    f.index >= e.index && f.ouverture === e.ouverture
      ? "OK : plein écran, la séquence tient sa position à l'arrêt"
      : "PROBLEME : la séquence bouge alors que le carré est plein écran"
  );

  await browser.close();
})();
