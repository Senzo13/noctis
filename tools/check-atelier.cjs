/* Vérifie que la séquence vidéo 2 suit bien l'ouverture du carré
   (et qu'elle ne « tourne » pas toute seule : les images sont au défilement). */

const { chromium } = require("playwright");
const BROWSER = process.env.NOCTIS_BROWSER === "edge"
  ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  : "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = process.argv[2] || "http://127.0.0.1:5180/index.html";

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
  await aller(geo.haut + geo.rush + geo.course * 0.5); // le carré s'ouvre
  const c = await lire();
  await page.waitForTimeout(1500); // on lâche : le carré se referme tout seul
  const d = await lire();

  console.log("fin du rush :", JSON.stringify(a));
  console.log("1,5 s plus tard, sans scroll :", JSON.stringify(b));
  console.log("carré à moitié ouvert :", JSON.stringify(c));
  console.log("1,5 s plus tard, sans scroll :", JSON.stringify(d));
  console.log(
    a.index === b.index
      ? "OK : la séquence ne bouge pas toute seule (elle attend le scroll)"
      : "PROBLEME : la séquence bouge toute seule"
  );
  console.log(
    c.index > a.index
      ? "OK : les images avancent avec l'ouverture du carré"
      : "PROBLEME : les images ne suivent pas le scroll"
  );
  console.log(
    d.index < c.index
      ? "OK : à l'arrêt, la séquence recule (fermeture automatique)"
      : "PROBLEME : la séquence ne se referme pas à l'arrêt"
  );

  await browser.close();
})();
