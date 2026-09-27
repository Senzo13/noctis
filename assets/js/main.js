/* ==========================================================================
   NOCTIS — interactions & animations
   Dépendances (CDN) : GSAP + ScrollTrigger, Lenis
   Tout est optionnel : sans JS/CDN, le site reste lisible et navigable.
   ========================================================================== */

(function () {
  "use strict";

  var html = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var compactExperience = window.matchMedia("(max-width: 1000px), (pointer: coarse)").matches;
  var simpleExperience = reduceMotion || compactExperience;
  html.classList.toggle("is-compact", compactExperience);
  html.classList.toggle("is-simple", simpleExperience);
  var hasGsap = typeof window.gsap !== "undefined";
  var hasScrollTrigger = hasGsap && typeof window.ScrollTrigger !== "undefined";
  var mobileFilm = compactExperience && !reduceMotion && hasScrollTrigger && Boolean(document.querySelector("[data-hero]"));
  var mobileHeroTrigger = null;
  html.classList.toggle("has-mobile-film", mobileFilm);

  /* --- Défilement fluide (Lenis) ----------------------------------------
     Sans lui, chaque cran de molette arrive d'un seul coup : la vidéo 1 est
     scrubbée par sauts de plusieurs images (le fameux « +10 frames »). Lenis
     lisse l'entrée du défilement, donc le scrub de la vidéo 1, le fondu et
     l'ouverture du carré suivent le doigt image par image.
     ?lenis=0 coupe le lissage (utile pour comparer). */

  var lenis = null;
  var lenisEnabled = window.location.search.indexOf("lenis=0") === -1;
  if (typeof window.Lenis !== "undefined" && !simpleExperience && lenisEnabled) {
    lenis = new window.Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      smoothWheel: true
    });
    window.__noctisLenis = lenis;
    if (hasScrollTrigger) lenis.on("scroll", window.ScrollTrigger.update);
    if (hasGsap) {
      window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      var lenisFrame = function (time) {
        lenis.raf(time);
        window.requestAnimationFrame(lenisFrame);
      };
      window.requestAnimationFrame(lenisFrame);
    }
  }

  /* --- Chargement & intro (vidéo 0) ------------------------------------- */

  var introDone = false;
  var introTimeline = null;
  var introRetired = false;
  var heroTargetFrame = 38;
  var heroPortrait = null;

  function retireIntro() {
    if (introRetired || !introDone) return;
    introRetired = true;
    if (introFramesCanvas) introFramesCanvas.classList.add("is-done");
    window.setTimeout(function () {
      if (introSequence) introSequence.dispose();
      if (introFramesCanvas) introFramesCanvas.style.display = "none";
    }, 600);
  }

  /* Révèle le site : l'intro a fini sa course, la page redevient défilable et
     le rush prend le relais sur l'image de raccord (aucun saut de cadrage). */
  function revealPage() {
    if (introDone) return;
    introDone = true;
    html.classList.remove("is-intro", "is-locked");
    if (simpleExperience) html.classList.remove("gsap-ready");
    if (lenis) lenis.start();
    document.body.classList.add("is-loaded");
    // le rush prend la main sur l'image de raccord, puis l'intro se retire
    // (ses images sont libérées une fois le fondu terminé)
    heroScrubLive = true;
    startHeroSequence();
    scrubHero(rushProgress());
    if (!heroSequence || heroSequence.currentIndex() === heroTargetFrame) retireIntro();
    // Failed/slow requests never lock the page or reveal the unrelated poster.
    // Keep the final painted intro frame while releasing its decoded cache.
    window.setTimeout(function () { if (!introRetired && introSequence) introSequence.dispose(); }, 15000);
    document.dispatchEvent(new CustomEvent("noctis:reveal"));
  }

  // Garde-fou : quelle que soit la panne (script, image, frame perdue), la
  // page redevient lisible et défilable.
  window.setTimeout(revealPage, 4200);

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ------------------------------------------------------------------ */
  /* Trois séquences d'images, trois rôles                                */
  /*                                                                      */
  /*  · vidéo 0 (l'intro) : son propre plan, `assets/frames/intro`. Elle    */
  /*    joue d'elle-même à l'arrivée, caméra comprise (travelling de la     */
  /*    séquence + décadrage + parallaxe souris, comme la vidéo 1).         */
  /*  · vidéo 1 (le rush) : la séquence du hero, pilotée au défilement.     */
  /*    Elle reprend à HERO_START, l'image où l'intro se raccorde —         */
  /*    mesurée image par image : la dernière image de l'intro correspond à  */
  /*    l'image 19 du rush (corrélation des contours maximale, même cadrage  */
  /*    de la voiture et même exposition). Le relais se fait donc en fondu   */
  /*    invisible, sur la même image.                                        */
  /*  · vidéo 2 (l'atelier) : inchangée, ouverte par le carré.              */
  /* ------------------------------------------------------------------ */

  var INTRO_LAST = 64;      // vidéo 0 : segment natif à 30 images/s
  var HERO_START = 38;      // même raccord que l’ancienne image 19 à 15 images/s
  var heroSection = document.querySelector("[data-hero]");
  var heroFramesCanvas = heroSection ? heroSection.querySelector("[data-hero-frames]") : null;
  var introFramesCanvas = heroSection ? heroSection.querySelector("[data-intro-frames]") : null;
  var introSequence = null;
  var heroSequence = null;
  var depthHero = null;
  var heroScrubLive = false;   // le défilement ne pilote la séquence qu'après l'intro

  // Mobile uses the same filmed handoff, with portrait intro/hero sources.
  var shouldPlayIntro = !reduceMotion && hasGsap && !window.location.hash && window.location.search.indexOf("intro=0") === -1;
  if (shouldPlayIntro && introFramesCanvas) {
    introSequence = initFrameSequence({
      canvas: introFramesCanvas,
      base: compactExperience && innerHeight >= innerWidth ? "assets/frames/intro-mobile-1080p30-20260927-q90/" : "assets/frames/intro-1080p30-20260927-q90/",
      count: INTRO_LAST + 1,
      cle: "intro",
      maxDecoded: 18,
      maxWidth: compactExperience && innerHeight >= innerWidth ? 608 : 1920,
      firstRange: INTRO_LAST
    });
    if (introSequence) introSequence.load();
  }

  /* Le rush (vidéo 1) n'entre en scène qu'à la fin de l'intro : on ne charge
     ses images qu'à ce moment-là, pour ne pas doubler la mémoire occupée. */
  function startHeroSequence() {
    if (heroSequence || !heroFramesCanvas || (simpleExperience && !mobileFilm)) return heroSequence;
    var portrait = compactExperience && innerHeight >= innerWidth;
    heroPortrait = portrait;
    heroSequence = initFrameSequence({
      canvas: heroFramesCanvas,
      base: portrait ? "assets/frames/hero-mobile-1080p30-20260927-q90/" : "assets/frames/hero-1080p30-20260927-q90/",
      count: 240,
      cle: "hero",
      maxDecoded: 18,
      maxWidth: portrait ? 608 : 1920,
      // l'image de raccord et ses voisines d'abord : le relais est prêt
      firstRange: HERO_START + 8,
      onFirstReady: function () {
        // la séquence prend le relais sur le rendu 2.5D
        if (depthHero) depthHero.disable();
      },
      onFrame: function (index) { if (introDone && index === heroTargetFrame) retireIntro(); }
    });
    if (heroSequence) {
      heroSequence.setIndex(heroTargetFrame);
      heroSequence.load();
    }
    return heroSequence;
  }

  // Le défilement conduit le rush à partir de l'image de raccord : la position
  // de défilement 0 correspond à la fin de l'intro.
  function scrubHero(progress) {
    if (!heroSequence || !heroScrubLive) return;
    var p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
    heroTargetFrame = Math.round(HERO_START + p * (heroSequence.count - 1 - HERO_START));
    heroSequence.setIndex(heroTargetFrame);
  }

  // course du rush, en écrans (le hero épingle un écran de défilement)
  function rushProgress() {
    var screen = window.innerHeight || 1;
    var p = window.pageYOffset / screen;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  /* --- La caméra de l'intro ---------------------------------------------
     Le mouvement reprend exactement celui de la vidéo 1 : travelling avant
     (la séquence d'images) + décadrage qui se resserre + parallaxe souris
     (portée par le média du hero). Rien de tout cela ne touche le DOM :
     tout se joue dans le dessin du canvas, donc le scrub du défilement peut
     prendre la suite sans le moindre raccord. */

  var introCam = { frame: 0, zoom: 1.06, panX: -0.014, panY: 0.01 };

  function applyIntroCam() {
    if (!introSequence) return;
    introSequence.setIndex(introCam.frame);
    introSequence.setCamera(introCam);
  }

  // Vidéo 0 seule : aucune phrase ni jauge devant le plan d'ouverture.
  function playIntro() {
    introTimeline = window.gsap.timeline({ onComplete: revealPage })
      .to(introCam, { frame: INTRO_LAST, duration: 2.35, ease: "power2.inOut", onUpdate: applyIntroCam }, 0)
      .to(introCam, { zoom: 1, panX: 0, panY: 0, duration: 2.6, ease: "power2.out", onUpdate: applyIntroCam }, 0)
      .call(function () { startHeroSequence(); }, null, 1.5);
  }

  // La vidéo 0 joue à chaque arrivée sur le site. Deux exceptions : un lien
  // profond (ancre) qu'il serait absurde de couvrir, et ?intro=0 pour les
  // mesures de QA qui doivent piloter le défilement dès l'arrivée.
  var introPlays = Boolean(
    introSequence && hasGsap && !reduceMotion &&
    !window.location.hash &&
    window.location.search.indexOf("intro=0") === -1
  );
  if (introPlays) {
    html.classList.add("gsap-ready");
    // l'intro se joue depuis le haut : on empêche le navigateur de restaurer
    // une position de défilement en plein milieu de la séquence
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
      lenis.stop();
    } else {
      html.classList.add("is-locked");
      window.scrollTo(0, 0);
    }
    playIntro();
  } else {
    window.setTimeout(revealPage, 0);
  }

  /* --- Panneau de diagnostic : ajouter ?debug=1 à l'URL ---------------- */

  if (window.location.search.indexOf("debug") !== -1) {
    var panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;left:12px;bottom:12px;z-index:9999;font:12px/1.6 monospace;background:rgba(0,0,0,.85);" +
      "color:#7CFF9B;padding:10px 12px;border:1px solid #7CFF9B;white-space:pre;pointer-events:none;max-width:92vw";
    document.body.appendChild(panel);
    window.setInterval(function () {
      var frames = window.__noctisFrames || { intro: 0, hero: 0, atelier: 0, total: 120 };
      panel.textContent = [
        "build : v22 (vidéo 0 = plan d'ouverture à part, raccord mesuré au rush)",
        "fenêtre : " + window.innerWidth + "x" + window.innerHeight,
        "gsap:" + (typeof window.gsap !== "undefined" ? "ok" : "ABSENT") +
          "  scrolltrigger:" + (typeof window.ScrollTrigger !== "undefined" ? "ok" : "ABSENT") +
          "  lenis:" + (typeof window.Lenis !== "undefined" ? "ok" : "ABSENT"),
        "hero 2.5D actif : " + (document.querySelector(".hero__media.is-3d") ? "oui (images en cours)" : "non"),
        "intro terminée : " + (introDone ? "oui" : "non") +
          "  image : " + (introSequence ? introSequence.currentIndex() : "-"),
        "images vidéo 0       : " + (frames.intro || 0) + "/" + (INTRO_LAST + 1),
        "images hero chargées : " + frames.hero + "/" + frames.total,
        "images vidéo 2       : " + frames.atelier + "/" + frames.total,
        "séquence ouverte     : " + (window.__noctisReveal ? window.__noctisReveal().toFixed(3) : "absente"),
        "scroll  : " + Math.round(window.pageYOffset) + " px"
      ].join("\n");
    }, 250);
  }

  /* --- Découpage des textes en mots ------------------------------------- */

  function splitWords(el) {
    if (!el || el.dataset.split === "true") return Array.prototype.slice.call(el.querySelectorAll(".word"));
    var parts = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    parts.forEach(function (word, index) {
      var span = document.createElement("span");
      span.className = "word";
      span.textContent = word;
      el.appendChild(span);
      if (index < parts.length - 1) el.appendChild(document.createTextNode(" "));
    });
    el.dataset.split = "true";
    return Array.prototype.slice.call(el.querySelectorAll(".word"));
  }

  /* GSAP mesure un mot en le sortant de son parent : le blanc qui le séparait
     du mot suivant passe alors devant lui, et la phrase se colle
     (« lesvéhicules »). C'est visible dès que la phrase est animée dans un
     bloc que le navigateur ne peut pas mesurer (display:none, visibility…).
     On mesure donc l'écart réel entre les mots, et on refait la découpe si
     deux mots se touchent. */
  function repareEspaces(el, words) {
    if (!el || words.length < 2) return words;
    var colle = false;
    for (var i = 1; i < words.length; i += 1) {
      var avant = words[i - 1].getBoundingClientRect();
      var apres = words[i].getBoundingClientRect();
      var memeLigne = Math.abs(avant.top - apres.top) < 2;
      if (!memeLigne) continue;                        // mot à la ligne : normal
      if (apres.left - (avant.left + avant.width) > 0.5) continue;
      colle = true;                                    // deux mots se touchent
      break;
    }
    if (!colle) return words;
    var textes = words.map(function (mot) { return mot.textContent.trim(); });
    el.dataset.split = "false";
    el.textContent = textes.join(" ");
    return splitWords(el);
  }

  /* ------------------------------------------------------------------ */
  /* Illumination au défilement : les mots sont d'abord grisés, puis ils  */
  /* s'éclairent un à un quand on descend, comme si on les lisait du      */
  /* doigt sur un cahier.                                                 */
  /* ------------------------------------------------------------------ */

  function initTextIllumination(el) {
    var words = splitWords(el);
    if (!words.length) return;

    function clamp01(value) {
      return value < 0 ? 0 : value > 1 ? 1 : value;
    }

    // état de repli (mouvement réduit ou absence de GSAP) : tout visible
    if (simpleExperience || !hasScrollTrigger) {
      words.forEach(function (word) { word.style.opacity = "1"; });
      return;
    }

    var count = words.length;
    // base « non éclairé » : assez lisible pour qu'on devine le texte,
    // assez faible pour que l'éclairage se voie
    words.forEach(function (word) { word.style.opacity = "0.22"; });

    window.ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      end: "top 30%",
      scrub: 0.4,
      onUpdate: function (self) {
        // bord d'éclairage : il avance avec le scroll, les mots déjà lus
        // restent allumés, celui du bord s'allume en douceur
        var curseur = self.progress * (count + 2);
        for (var i = 0; i < count; i += 1) {
          var d = curseur - i;
          var t = clamp01(d);
          words[i].style.opacity = (0.22 + 0.78 * t).toFixed(3);
        }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Ouverture « carré » d'une image : un petit carré centré grandit au   */
  /* défilement jusqu'à révéler l'image entière. Même signature que la    */
  /* vidéo 2, réutilisée sur les visuels des sections.                    */
  /* ------------------------------------------------------------------ */

  function initImageReveal(img) {
    var box = img.parentElement;
    if (!box) return;
    if (simpleExperience || !hasScrollTrigger) {
      img.style.clipPath = "none";
      return;
    }
    var small = Math.max(44, Math.min(box.clientWidth, box.clientHeight) * 0.18);
    function open(progress) {
      var w = box.clientWidth || 1;
      var h = box.clientHeight || 1;
      var side = small + (Math.max(w, h) - small) * progress;
      var ix = Math.max(0, (w - side) / 2);
      var iy = Math.max(0, (h - side) / 2);
      img.style.clipPath = "inset(" + iy + "px " + ix + "px)";
    }
    open(0);
    window.ScrollTrigger.create({
      trigger: box,
      start: "top 88%",
      end: "top 32%",
      scrub: 0.5,
      onUpdate: function (self) { open(self.progress); }
    });
  }

  /* ------------------------------------------------------------------ */
  /* L'atelier : les trois gestes, en séquence. Au défilement, la liste   */
  /* des gestes s'allume geste par geste et le plan de travail change de  */
  /* cadrage ; la lumière rasante balaie la pièce à chaque passage.       */
  /* Sous 1024 px (ou sans mouvement), la section reste une pile simple : */
  /* la liste, puis les trois plans, dans l'ordre.                        */
  /* ------------------------------------------------------------------ */

  function initCraftSequence() {
    var stage = document.querySelector("[data-craft]");
    if (!stage || simpleExperience || !hasScrollTrigger) return;

    var steps = Array.prototype.slice.call(stage.querySelectorAll("[data-craft-step]"));
    var frames = Array.prototype.slice.call(stage.querySelectorAll("[data-craft-frame]"));
    if (!steps.length || !frames.length) return;

    var large = window.matchMedia("(min-width: 1024px)").matches;
    var actif = 0;

    function setActif(index) {
      if (index === actif) return;
      actif = index;
      steps.forEach(function (step, i) {
        step.classList.toggle("is-active", i === index);
      });
      frames.forEach(function (frame, i) {
        frame.classList.toggle("is-active", i === index);
      });
    }

    if (!large) return;   // pile statique : rien à piloter

    window.ScrollTrigger.create({
      trigger: stage,
      start: "top top",
      end: "bottom bottom",
      onUpdate: function (self) {
        var index = Math.floor(self.progress * steps.length);
        if (index < 0) index = 0;
        if (index > steps.length - 1) index = steps.length - 1;
        setActif(index);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Parallaxe à la souris : la scène bouge un peu avec le curseur, comme  */
  /* une caméra de jeu (léger, désactivé en mouvement réduit).             */
  /* ------------------------------------------------------------------ */

  function initMouseParallax(target, strength) {
    if (!target || simpleExperience || !hasGsap) return;
    var qx = window.gsap.quickTo(target, "x", { duration: 0.9, ease: "power3.out" });
    var qy = window.gsap.quickTo(target, "y", { duration: 0.9, ease: "power3.out" });
    window.addEventListener("mousemove", function (event) {
      var nx = (event.clientX / window.innerWidth) - 0.5;
      var ny = (event.clientY / window.innerHeight) - 0.5;
      qx(nx * strength);
      qy(ny * strength);
    }, { passive: true });
    window.addEventListener("mouseout", function () {
      qx(0);
      qy(0);
    });
  }

  function scrollToTarget(target) {
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    var top = el.getBoundingClientRect().top + window.pageYOffset - 70;
    if (lenis) lenis.scrollTo(top);
    else window.scrollTo({ top: top, behavior: "smooth" });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    var href = link.getAttribute("href");
    if (!href || href === "#" || href.length < 2) return;
    link.addEventListener("click", function (event) {
      var target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      scrollToTarget(target);
    });
  });

  /* --- En-tête : fond au défilement + masquage en descente -------------- */

  var header = document.querySelector(".header");
  if (header) {
    var lastY = window.pageYOffset;
    var onScroll = function () {
      var y = window.pageYOffset;
      header.classList.toggle("is-scrolled", y > 60);
      var down = y > lastY && y > 400;
      if (!html.classList.contains("menu-open")) header.classList.toggle("is-hidden", down);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* --- Menu plein écran ------------------------------------------------- */

  /* --- Repère de progression de lecture --------------------------------- */

  var barreProgression = document.querySelector("[data-scroll-progress] i");
  if (barreProgression) {
    var derniereProgression = -1;
    var majProgression = function () {
      var course = document.documentElement.scrollHeight - window.innerHeight;
      var p = course > 0 ? window.pageYOffset / course : 0;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      var arrondi = Math.round(p * 1000);
      if (arrondi === derniereProgression) return;
      derniereProgression = arrondi;
      barreProgression.style.width = (arrondi / 10).toFixed(1) + "%";
    };
    window.addEventListener("scroll", majProgression, { passive: true });
    window.addEventListener("resize", majProgression);
    majProgression();
  }

  /* --- Méthode : l'étape au centre de l'écran s'allume ------------------ */

  /* La seule bande claire du site : l'en-tête passe en noir tant qu'elle est
     sous lui, sinon il disparaît (texte blanc sur fond ivoire). */
  var bandeClaire = document.querySelector(".ordinary--clair");
  var entete = document.querySelector(".header");
  if (bandeClaire && entete && "IntersectionObserver" in window) {
    var observateurClair = new IntersectionObserver(
      function (entrees) {
        entrees.forEach(function (entree) {
          entete.classList.toggle("is-on-light", entree.isIntersecting);
        });
      },
      // une bande de la hauteur de l'en-tête, tout en haut de l'écran
      { rootMargin: "-84px 0px -100% 0px", threshold: 0 }
    );
    observateurClair.observe(bandeClaire);
  }

  var etapes = Array.prototype.slice.call(document.querySelectorAll("[data-step]"));
  if (etapes.length) {
    if ("IntersectionObserver" in window) {
      var observateurEtapes = new IntersectionObserver(
        function (entrees) {
          entrees.forEach(function (entree) {
            if (!entree.isIntersecting) return;
            etapes.forEach(function (etape) { etape.classList.remove("is-active"); });
            entree.target.classList.add("is-active");
          });
        },
        // bande étroite au milieu de l'écran : une seule étape active à la fois
        { rootMargin: "-46% 0px -46% 0px", threshold: 0 }
      );
      etapes.forEach(function (etape) { observateurEtapes.observe(etape); });
    } else {
      etapes.forEach(function (etape) { etape.classList.add("is-active"); });
    }
  }

  var navTriggers = document.querySelectorAll("[data-menu-toggle]");
  var menu = document.querySelector(".menu");

  function setMenu(open) {
    if (menu) menu.inert = !open;
    document.querySelector(".header__logo").inert = open;
    document.querySelector("main").inert = open;
    document.querySelector(".footer").inert = open;
    html.classList.toggle("menu-open", open);
    html.classList.toggle("is-locked", open);
    if (lenis) {
      if (open) lenis.stop();
      else lenis.start();
    }
    navTriggers.forEach(function (btn) {
      btn.setAttribute("aria-expanded", String(open));
      var label = btn.querySelector(".header__nav-label");
      if (label) label.textContent = open ? "Fermer" : "Menu";
      var accessibleLabel = btn.querySelector(".sr-only");
      if (accessibleLabel) accessibleLabel.textContent = open ? "Fermer le menu" : "Ouvrir le menu";
    });
    if (header) header.classList.remove("is-hidden");
    if (open && menu) {
      var first = menu.querySelector("a");
      if (first) window.setTimeout(function () { if (html.classList.contains("menu-open")) first.focus(); }, 100);
    }
    if (!open && navTriggers[0]) navTriggers[0].focus({ preventScroll: true });
  }

  navTriggers.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setMenu(!html.classList.contains("menu-open"));
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && html.classList.contains("menu-open")) setMenu(false);
    if (event.key === "Tab" && html.classList.contains("menu-open") && menu) {
      var links = Array.prototype.slice.call(menu.querySelectorAll("a[href]")).filter(function (link) { return link.getClientRects().length > 0; });
      var first = navTriggers[0];
      var last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  if (menu) {
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Séquence d'images pilotée par le défilement                          */
  /*                                                                     */
  /* Les deux vidéos du site sont jouées image par image : elles sont     */
  /* préchargées en WebP (`assets/frames/…`) puis dessinées dans un       */
  /* <canvas> selon la position de défilement.                            */
  /*                                                                     */
  /* Pourquoi pas un <video> scrubbé ? Un navigateur ne déplace           */
  /* `currentTime` que quelques fois par seconde (le pipeline de décodage */
  /* et de composition plafonne, surtout sur un fichier long) : le scrub   */
  /* « saute » des images. Une image déjà chargée, elle, s'affiche         */
  /* instantanément — c'est la technique des séquences d'images           */
  /* (« image sequence scrub »), exactement ce qu'on veut ici.            */
  /* ------------------------------------------------------------------ */

  function initFrameSequence(options) {
    var canvas = options.canvas;
    var count = options.count;
    var base = options.base;
    var cle = options.cle || "sequence";
    var ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return null;

    var suivi = window.__noctisFrames || (window.__noctisFrames = { hero: 0, atelier: 0, total: count });
    suivi.total = count;

    // Respecte les écrans Retina, sans dépasser la largeur des images sources.
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var images = new Array(count);
    var bounded = Boolean(options.maxDecoded && window.createImageBitmap);
    var blobs = bounded ? new Array(count) : null;
    var requested = new Uint8Array(count);
    var decoding = new Uint8Array(count);
    var decodeJobs = 0;
    var decodedLimit = options.maxDecoded || count;
    var pretes = new Uint8Array(count);
    var charge = false;
    var dessinee = -1;
    var cible = 0;
    var premiere = false;
    // séquence libérée (l'intro rend ses images au navigateur après le relais)
    var mort = false;
    var queue = [];
    var loading = 0;
    var concurrency = 6;
    // caméra de l'intro, appliquée dans le dessin (voir peindre/setCamera)
    var camera = { zoom: 1, panX: 0, panY: 0 };

    function fichier(i) {
      var n = String(i + 1);
      while (n.length < 3) n = "0" + n;
      return base + n + ".webp";
    }

    function charger(i) {
      if (mort || requested[i]) return;
      requested[i] = 1;
      loading += 1;
      if (bounded) {
        fetch(fichier(i)).then(function (response) {
          if (!response.ok) throw new Error("Frame " + response.status);
          return response.blob();
        }).then(function (blob) {
          loading -= 1;
          if (mort) return;
          blobs[i] = blob;
          suivi[cle] = (suivi[cle] || 0) + 1;
          decodeNearby();
          pump();
        }).catch(function () { loading -= 1; pump(); });
        return;
      }
      var img = new Image();
      img.decoding = "async";
      function ready() {
        loading -= 1;
        if (mort) return;
        pretes[i] = 1;
        suivi[cle] = (suivi[cle] || 0) + 1;
        if (!premiere) {
          premiere = true;
          canvas.classList.add("is-ready");
          if (typeof options.onFirstReady === "function") options.onFirstReady();
        }
        var nearest = plusProche(cible);
        if (nearest >= 0 && nearest !== dessinee) peindre(nearest);
        pump();
      }
      function failed() { loading -= 1; pretes[i] = 0; pump(); }
      img.onload = function () {
        // Download completion does not mean the WebP is decoded. Decode off
        // the drawing path so a scroll update never pays that cost.
        if (img.decode) img.decode().then(ready, failed);
        else ready();
      };
      img.onerror = failed;
      images[i] = img;
      img.src = fichier(i);
    }

    function pump() {
      while (!mort && loading < concurrency && queue.length) {
        var i = queue.shift();
        if (!requested[i]) charger(i);
      }
    }

    // Full-HD frames stay compressed outside a small seek window. Keeping
    // 241 decoded 1080p frames would consume almost 2 GB for this film alone.
    function decodeNearby() {
      if (!bounded || mort) return;
      var radius = Math.floor((decodedLimit - 1) / 2);
      var candidates = [];
      for (var distance = 0; distance <= radius; distance += 1) {
        [cible + distance, cible - distance].forEach(function (i) {
          if (i >= 0 && i < count && blobs[i] && !images[i] && !decoding[i] && candidates.indexOf(i) === -1) candidates.push(i);
        });
      }
      while (decodeJobs < 2 && candidates.length) {
        (function (i) {
          decoding[i] = 1;
          decodeJobs += 1;
          createImageBitmap(blobs[i]).then(function (bitmap) {
            decoding[i] = 0;
            decodeJobs -= 1;
            if (mort || Math.abs(i - cible) > radius + 1) bitmap.close();
            else {
              images[i] = bitmap;
              pretes[i] = 1;
              if (!premiere) {
                premiere = true;
                canvas.classList.add("is-ready");
                if (typeof options.onFirstReady === "function") options.onFirstReady();
              }
              var cached = [];
              for (var n = 0; n < count; n += 1) if (images[n]) cached.push(n);
              cached.sort(function (a, b) { return Math.abs(b - cible) - Math.abs(a - cible); });
              while (cached.length > decodedLimit) {
                var old = cached.shift();
                images[old].close();
                images[old] = null;
                pretes[old] = 0;
              }
              suivi[cle + "Decoded"] = cached.length;
              var nearest = plusProche(cible);
              if (nearest >= 0 && nearest !== dessinee) peindre(nearest);
            }
            decodeNearby();
          }, function () { decoding[i] = 0; decodeJobs -= 1; blobs[i] = null; decodeNearby(); });
        })(candidates.shift());
      }
    }

    function prioritize(index) {
      if (!charge || mort || pretes[index]) return;
      var nearby = [];
      for (var distance = 0; distance <= 3; distance += 1) {
        [index + distance, index - distance].forEach(function (i) {
          if (i >= 0 && i < count && !requested[i] && nearby.indexOf(i) === -1) nearby.push(i);
        });
      }
      queue = nearby.concat(queue.filter(function (i) { return nearby.indexOf(i) === -1; }));
      pump();
      decodeNearby();
    }

    // On commence par une trame large (une image sur huit) pour que la
    // séquence réponde partout tout de suite, puis on comble les trous.
    // `firstRange` (l'intro, vidéo 0) passe en premier et sans trou : elle
    // joue tout de suite, alors que le rush peut se permettre d'attendre.
    function load() {
      if (charge || mort) return;
      charge = true;
      var ordre = [];
      var i;
      if (options.firstRange) {
        for (i = 0; i <= options.firstRange && i < count; i += 1) ordre.push(i);
      }
      for (i = 0; i < count; i += 8) ordre.push(i);
      for (i = 0; i < count; i += 1) if (i % 8 !== 0 && ordre.indexOf(i) === -1) ordre.push(i);
      queue = ordre;
      prioritize(cible);
      pump();
    }

    function resize() {
      if (mort) return;
      var largeur = canvas.clientWidth || window.innerWidth;
      var hauteur = canvas.clientHeight || window.innerHeight;
      var scale = Math.min(dpr, (options.maxWidth || 1280) / largeur);
      canvas.width = Math.round(largeur * scale);
      canvas.height = Math.round(hauteur * scale);
      if (dessinee >= 0) peindre(dessinee);
    }

    function peindre(i) {
      if (mort) return;
      var img = images[i];
      if (!img || !pretes[i]) return;
      var cw = canvas.width;
      var ch = canvas.height;
      var iw = img.naturalWidth || img.width;
      var ih = img.naturalHeight || img.height;
      if (!cw || !ch || !iw || !ih) return;
      // même cadrage qu'un object-fit: cover, caméra comprise : l'intro
      // (vidéo 0) avance la caméra dans le même dessin, sans toucher au DOM
      // (aucune transformation d'élément, donc aucune bagarre avec GSAP)
      var zoom = camera.zoom > 0 ? camera.zoom : 1;
      var echelle = (options.contain ? Math.min(cw / iw, ch / ih) : Math.max(cw / iw, ch / ih)) * zoom;
      var w = iw * echelle;
      var h = ih * echelle;
      // le débattement est borné par ce que le zoom laisse dépasser : jamais
      // de bande vide sur un bord
      var margeX = Math.max(0, (w - cw) / 2);
      var margeY = Math.max(0, (h - ch) / 2);
      var dx = Math.max(-margeX, Math.min(margeX, camera.panX * cw));
      var dy = Math.max(-margeY, Math.min(margeY, camera.panY * ch));
      if (options.contain || options.mobileComposition) { ctx.fillStyle = "#090909"; ctx.fillRect(0, 0, cw, ch); }
      if (options.mobileComposition && ch > cw) {
        var regionY = ch * 0.30;
        var regionH = Math.min(cw * 1.25, ch * 0.56);
        var regionScale = Math.max(cw / iw, regionH / ih);
        var regionW = iw * regionScale;
        var imageH = ih * regionScale;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, regionY, cw, regionH);
        ctx.clip();
        ctx.drawImage(img, (cw - regionW) / 2, regionY + (regionH - imageH) / 2, regionW, imageH);
        ctx.restore();
      } else ctx.drawImage(img, (cw - w) / 2 - dx, (ch - h) / 2 - dy, w, h);
      dessinee = i;
      suivi[cle + "Index"] = i;
      if (typeof options.onFrame === "function") options.onFrame(i);
    }

    function plusProche(i) {
      if (pretes[i]) return i;
      for (var d = 1; d < count; d += 1) {
        if (i - d >= 0 && pretes[i - d]) return i - d;
        if (i + d < count && pretes[i + d]) return i + d;
      }
      return -1;
    }

    // i = index d'image, borné à la séquence
    function setIndex(i) {
      if (mort) return;
      cible = i < 0 ? 0 : i > count - 1 ? count - 1 : Math.round(i);
      if (bounded) decodeNearby();
      if (cible === dessinee) return;
      prioritize(cible);
      var proche = plusProche(cible);
      if (proche >= 0 && proche !== dessinee) peindre(proche);
    }

    // p = progression 0 → 1 de la séquence
    function setProgress(p) {
      var valeur = p < 0 ? 0 : p > 1 ? 1 : p;
      setIndex(valeur * (count - 1));
    }

    // Caméra de l'intro : zoom (1 = cadrage exact) et débattement latéral,
    // exprimés en fraction de la largeur/hauteur affichée.
    function setCamera(value) {
      if (mort) return;
      var zoom = value.zoom === undefined ? 1 : value.zoom;
      var panX = value.panX || 0;
      var panY = value.panY || 0;
      if (zoom === camera.zoom && panX === camera.panX && panY === camera.panY) return;
      camera.zoom = zoom;
      camera.panX = panX;
      camera.panY = panY;
      if (dessinee >= 0) peindre(dessinee);
    }

    /* Libère les images de la séquence : l'intro n'a plus besoin d'être en
       mémoire une fois que le rush (vidéo 1) a pris le relais. Le dessin déjà
       présent sur le canvas reste affiché. */
    function dispose() {
      if (mort) return;
      mort = true;
      suivi[cle + "Decoded"] = 0;
      queue.length = 0;
      window.removeEventListener("resize", resize);
      for (var i = 0; i < count; i += 1) {
        if (images[i]) {
          if (bounded) images[i].close();
          images[i].onload = null;
          images[i].onerror = null;
          images[i] = null;
          pretes[i] = 0;
        }
        if (blobs) blobs[i] = null;
      }
    }

    resize();
    window.addEventListener("resize", resize);

    return {
      load: load,
      count: count,
      setIndex: setIndex,
      setProgress: setProgress,
      setCamera: setCamera,
      dispose: dispose,
      resize: resize,
      currentIndex: function () { return dessinee; }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Vidéo 2 : le carré s'ouvre à la fin du rush (séquence du site officiel) */
  /*                                                                      */
  /* Le rush terminé (la phrase manifeste est affichée), le hero reste     */
  /* épinglé : le fond texture noir apparaît en fondu, puis un carré       */
  /* s'ouvre au centre et grandit au défilement jusqu'à occuper tout       */
  /* l'écran. La page ne descend pas plus bas tant que le carré n'est pas  */
  /* plein écran.                                                          */
  /*                                                                      */
  /* Les images de la vidéo 2 avancent avec l'ouverture (et repartent en   */
  /* arrière si le carré se referme ou si on remonte le site).             */
  /* ------------------------------------------------------------------ */

  function initRevealSequence(section) {
    var sticky = section.querySelector(".hero__sticky") || section.firstElementChild;
    var frame = section.querySelector("[data-reveal-frame]");
    var framesCanvas = section.querySelector("[data-reveal-frames]");
    var texture = section.querySelector("[data-reveal-texture]");
    var cues = Array.prototype.slice.call(frame.querySelectorAll(".reveal__cue, [data-component-label]"));
    var frameFps = Number(frame.dataset.frameFps) || 12;
    if (!Number.isFinite(frameFps) || frameFps <= 0) frameFps = 12;
    // Parse annotations once; the scroll loop only interpolates their coordinates.
    var cueData = cues.map(function (cue) {
      var range = (cue.getAttribute("data-cue") || "0,-1").split(",").map(Number);
      var track = [];
      if (cue.dataset.anchorTrack) {
        try {
          var parsed = JSON.parse(cue.dataset.anchorTrack);
          if (Array.isArray(parsed)) {
            track = parsed.filter(function (point) {
              return point && Number.isFinite(point.time) && Number.isFinite(point.x) && Number.isFinite(point.y);
            }).sort(function (a, b) { return a.time - b.time; });
          }
        } catch (_) { /* Older two-point annotations remain a valid fallback. */ }
      }
      return {
        element: cue, start: range[0], end: range[1], track: track,
        from: (cue.dataset.anchorFrom || "0,0").split(",").map(Number),
        to: (cue.dataset.anchorTo || cue.dataset.anchorFrom || "0,0").split(",").map(Number),
        label: (cue.dataset.label || "0,0").split(",").map(Number),
        circle: cue.querySelector("circle"), path: cue.querySelector("path")
      };
    });
    var scrim = frame.querySelector("[data-reveal-scrim]");
    var finale = frame.querySelector("[data-reveal-finale]");
    var mobileComponent = null;
    if (mobileFilm) {
      mobileComponent = document.createElement("div");
      mobileComponent.className = "reveal__mobile-component";
      frame.appendChild(mobileComponent);
    }
    // Le beat manifeste est le seul texte de la séquence : il revient seul sur
    // le fond texture (ses mots s'allument au défilement), puis s'efface quand
    // le carré s'ouvre. Il n'est jamais affiché en même temps que le titre.
    var beat = document.querySelector("[data-manifesto-beat]");
    var manifesto = document.querySelector("[data-manifesto]");
    var beatWords = manifesto ? splitWords(manifesto) : [];
    if (!sticky || !frame) return;

    // Les images de la vidéo 2 sont dessinées dans le carré : elles avancent
    // avec l'ouverture, et repartent en arrière quand il se referme.
    var frames = framesCanvas ? initFrameSequence({
      canvas: framesCanvas,
      base: frame.dataset.frameBase || "assets/frames/atelier/",
      count: Number(frame.dataset.frameCount) || 120,
      cle: "atelier",
      maxDecoded: 18,
      maxWidth: 1920,
      contain: mobileFilm,
      mobileComposition: mobileFilm,
      onFrame: function (index) { updateCues(index); }
    }) : null;

    // Le fondu du fond texture se mesure en « écrans » parcourus depuis le
    // haut du hero : le rush occupe l'écran 0 → 1, la dernière image de la
    // vidéo 1 reste donc affichée pendant tout le rush, puis se dissout
    // lentement dans le fond texture (presque un écran de défilement).
    var DISSOLVE_FROM = 0.96;
    var DISSOLVE_TO = 1.6;

    // La séquence du carré se mesure en progression 0 → 1 après le rush :
    // la phrase reste seule tant qu'on ne continue pas à défiler, puis un
    // carré minuscule apparaît et grandit jusqu'au plein écran.
    var SQUARE_IN = 0.08;
    var SQUARE_SEEN = 0.14;
    var OPEN_START = 0.16;
    var OPEN_END = 0.36;
    // une fois l'écran entièrement rempli, la séquence reste ouverte
    var FULL_AT = OPEN_END - 0.01;

    var size = { w: 0, h: 0 };
    // position absolue du haut du hero : évite tout getBoundingClientRect
    // pendant le défilement (lire la mise en page à chaque image après les
    // écritures de GSAP faisait saccader le scrub de la vidéo 1)
    var origin = 0;
    var current = 0;
    var raf = 0;
    var active = false;
    var lastClip = "";
    var lastOpacity = "";
    var lastTexture = "";
    var lastBeat = "";
    var travel = 1;
    var lastCueIndex = -2;
    var lastCuePlaying = false;

    function interpolateAnchorTrack(track, time) {
      if (time <= track[0].time) return track[0];
      for (var i = 1; i < track.length; i++) {
        if (time <= track[i].time) {
          var from = track[i - 1];
          var to = track[i];
          var fraction = (time - from.time) / Math.max(0.000001, to.time - from.time);
          return { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction };
        }
      }
      return track[track.length - 1];
    }

    function updateCues(index) {
      var playing = current >= FULL_AT + 0.005;
      if (index === lastCueIndex && playing === lastCuePlaying) return;
      lastCueIndex = index;
      lastCuePlaying = playing;
      var componentText = "";
      var componentDetail = "";
      cueData.forEach(function (data) {
        var cue = data.element;
        var visible = playing && index >= data.start && index <= data.end;
        cue.classList.toggle("is-active", visible);
        if (visible && cue.hasAttribute("data-component-label") && data.circle && data.path) {
          if (mobileComponent) {
            componentText = cue.querySelector("text").textContent;
            componentDetail = cue.querySelector(".component-detail").textContent;
          }
          var fraction = (index - data.start) / Math.max(1, data.end - data.start);
          var anchor = data.track.length ? interpolateAnchorTrack(data.track, index / frameFps) : {
            x: data.from[0] + (data.to[0] - data.from[0]) * fraction,
            y: data.from[1] + (data.to[1] - data.from[1]) * fraction
          };
          data.circle.setAttribute("cx", anchor.x);
          data.circle.setAttribute("cy", anchor.y);
          data.path.setAttribute("d", "M" + (data.label[0] + 260) + " " + (data.label[1] + 14) + " H" + (anchor.x - 65) + " L" + anchor.x + " " + anchor.y);
        }
      });
      if (mobileComponent) {
        if (mobileComponent.dataset.name !== componentText) {
          mobileComponent.dataset.name = componentText;
          mobileComponent.textContent = "";
          var smallLabel = document.createElement("small");
          smallLabel.textContent = componentDetail;
          mobileComponent.appendChild(smallLabel);
          mobileComponent.appendChild(document.createTextNode(componentText));
        }
        mobileComponent.classList.toggle("is-active", Boolean(componentText));
      }
    }

    function clamp(value, min, max) {
      return value < min ? min : value > max ? max : value;
    }

    function ramp(value, from, to) {
      return clamp((value - from) / (to - from), 0, 1);
    }

    // adoucit le début et la fin des fondus
    function smooth(value) {
      return value * value * (3 - 2 * value);
    }

    // Le rush occupe le premier écran de défilement ; la séquence du carré
    // occupe tout le reste, jusqu'à la fin de l'épinglage du hero.
    // Tout est calculé depuis la position de défilement (aucune lecture de
    // mise en page en cours d'animation).
    function readPosition() {
      return (window.pageYOffset - origin) / (size.h || window.innerHeight || 1);
    }

    function readProgress() {
      var screen = size.h || window.innerHeight || 1;
      return clamp((window.pageYOffset - origin - screen) / revealTravel(), 0, 1);
    }

    // course de la séquence du carré, en pixels
    function revealTravel() {
      return travel;
    }

    function measure() {
      size.w = sticky.clientWidth || window.innerWidth;
      size.h = sticky.clientHeight || window.innerHeight;
      origin = section.getBoundingClientRect().top + window.pageYOffset;
      travel = Math.max(1, section.offsetHeight - sticky.offsetHeight - size.h);
    }

    function apply(value, position) {
      // Fond texture : il se dissout lentement dans la dernière image de la
      // vidéo 1 (celle-ci reste donc visible longtemps), et il revient si on
      // remonte le site. Il ne bouge pas quand le défilement s'arrête.
      var textureOpacity = smooth(ramp(position, DISSOLVE_FROM, DISSOLVE_TO)).toFixed(3);
      if (texture && textureOpacity !== lastTexture) {
        texture.style.opacity = textureOpacity;
        lastTexture = textureOpacity;
      }

      // La phrase manifeste revient SEULE (le titre n'est plus là), juste
      // après le fond texture ; ses mots s'allument au défilement comme une
      // ligne qu'on lit du doigt. Tant que l'intro n'a pas rendu la main, on
      // ne touche pas à cette couche : c'est l'intro qui la pilote.
      if (beat && introDone) {
        var beatIn = smooth(ramp(position, DISSOLVE_FROM + 0.12, DISSOLVE_TO - 0.4));
        var lit = ramp(position, 1.02, 1.62) * (beatWords.length + 2);
        for (var w = 0; w < beatWords.length; w += 1) {
          var mot = beatWords[w];
          var teinte = clamp(lit - w, 0, 1);
          var motOp = (0.22 + 0.78 * teinte).toFixed(3);
          if (mot._op !== motOp) {
            mot._op = motOp;
            mot.style.opacity = motOp;
          }
        }
        // elle s'efface dès que le carré commence à s'ouvrir, et disparaît
        // complètement en haut du site (le titre reprend alors sa place)
        var beatOut = 1 - smooth(ramp(value, OPEN_START - 0.06, OPEN_START + 0.2));
        var beatKey = (beatIn * beatOut).toFixed(3);
        if (beatKey !== lastBeat) {
          beat.style.opacity = beatKey;
          lastBeat = beatKey;
        }
      }

      // ouverture : le carré part d'une fenêtre minuscule au centre et
      // grandit jusqu'à couvrir tout l'écran
      var seen = smooth(ramp(value, SQUARE_IN, SQUARE_SEEN));
      var open = smooth(ramp(value, OPEN_START, OPEN_END));
      var small = Math.max(40, Math.min(size.w, size.h) * 0.08);
      var side = small + (Math.max(size.w, size.h) - small) * open;
      var insetX = Math.max(0, (size.w - side) / 2);
      var insetY = Math.max(0, (size.h - side) / 2);
      var radius = Math.min(16 * (1 - open), Math.max(2, side * 0.16));
      var seenText = seen.toFixed(3);
      if (seenText !== lastOpacity) {
        frame.style.opacity = seenText;
        lastOpacity = seenText;
      }
      var clip =
        "inset(" + insetY.toFixed(2) + "px " + insetX.toFixed(2) + "px round " + radius.toFixed(2) + "px)";
      if (clip !== lastClip) {
        frame.style.clipPath = clip;
        lastClip = clip;
      }

      // les images de la vidéo 2 ne démarrent qu'une fois le carré plein
      // écran (et repartent en arrière s'il se referme ou si on remonte)
      if (frames) {
        frames.setProgress(ramp(value, FULL_AT, 1));

        // textes flottants calés sur les gestes (indice d'image courante)
        updateCues(frames.currentIndex());

        // fin de la vidéo 2 : scrim + mot de clôture (transition de sortie)
        var fin = ramp(value, FULL_AT, 1) >= Number(frame.dataset.finaleAt || 0.87);
        if (scrim && scrim._fin !== fin) {
          scrim._fin = fin;
          scrim.classList.toggle("is-active", fin);
        }
        if (finale && finale._fin !== fin) {
          finale._fin = fin;
          finale.classList.toggle("is-active", fin);
        }
      }
    }

    function loop(now) {
      raf = 0;
      if (simpleExperience && !mobileFilm) { if (frames) frames.dispose(); return; }
      now = now || window.performance.now();
      var position = readPosition();
      var target = readProgress();

      if (position > 0.5 && frames) frames.load();
      // Lenis already smooths the scroll signal used by video 1. Applying
      // another interpolation here makes video 2 trail behind the wheel.
      current = target;

      // le fond texture suit le défilement (pas la valeur élastique du carré)
      apply(current, position);

    }

    function start() {
      if ((!simpleExperience || mobileFilm) && !raf) raf = window.requestAnimationFrame(loop);
    }

    measure();
    current = readProgress();
    apply(current, readPosition());
    window.__noctisReveal = function () { return current; };

    // Use the same synchronous scroll signal as the hero sequence. A
    // requestAnimationFrame fallback remains for the script without GSAP.
    var sceneTrigger = null;
    if (hasScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      sceneTrigger = window.ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: function () { return "+=" + (travel + size.h); },
        onRefreshInit: measure,
        onRefresh: loop,
        onUpdate: loop
      });
    } else {
      window.addEventListener("scroll", function () { if (active) start(); }, { passive: true });
    }

    function resizeReveal() {
      measure();
      current = readProgress();
      apply(current, readPosition());
    }
    window.addEventListener("resize", resizeReveal);

    if ("IntersectionObserver" in window) {
      var watcher = new IntersectionObserver(function (entries) {
        active = entries[0].isIntersecting;
        if (active) {
          start();
        }
      }, { rootMargin: "20% 0px 20% 0px" });
      watcher.observe(section);
    } else {
      start();
    }
    return function () {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      if (watcher) watcher.disconnect();
      if (sceneTrigger) sceneTrigger.kill();
      if (frames) frames.dispose();
      window.removeEventListener("resize", resizeReveal);
      if (mobileComponent) mobileComponent.remove();
    };
  }

  var revealSection = document.querySelector("[data-reveal]");
  // ?reveal=0 : coupe la séquence (utile pour comparer la fluidité du rush)
  var revealEnabled = window.location.search.indexOf("reveal=0") === -1;
  var revealStop = null;
  if (revealSection && (!simpleExperience || mobileFilm) && revealEnabled) revealStop = initRevealSequence(revealSection);

  /* ------------------------------------------------------------------
     Rush 2.5D : la caméra fonce vers la voiture centrale
     (même principe que la séquence du site de référence : une carte de
     profondeur décale les pixels, les plans proches grandissent plus vite).
     ------------------------------------------------------------------ */

  var VERTEX_SHADER = [
    "attribute vec2 aPos;",
    "varying vec2 vUv;",
    "void main() {",
    "  vUv = aPos * 0.5 + 0.5;",
    "  gl_Position = vec4(aPos, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FRAGMENT_SHADER = [
    "precision mediump float;",
    "uniform sampler2D uColour;",
    "uniform sampler2D uDepth;",
    "uniform vec2 uCoverScale;",
    "uniform vec2 uCenter;",
    "uniform float uAmount;",
    "uniform float uTime;",
    "varying vec2 vUv;",
    "float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }",
    "void main() {",
    "  vec2 uv = clamp((vUv - 0.5) * uCoverScale + 0.5, 0.0015, 0.9985);",
    "  float depth = texture2D(uDepth, uv).r;",
    "  float amount = clamp(uAmount * depth, 0.0, 0.82);",
    "  vec2 displaced = clamp((uv - uCenter) * (1.0 - amount) + uCenter, 0.0015, 0.9985);",
    "  vec3 colour = texture2D(uColour, displaced).rgb;",
    "  if (amount > 0.03) {",
    "    vec2 streak = (displaced - uCenter) * amount * 0.03;",
    "    colour += texture2D(uColour, clamp(displaced - streak, 0.0015, 0.9985)).rgb;",
    "    colour += texture2D(uColour, clamp(displaced + streak, 0.0015, 0.9985)).rgb;",
    "    colour /= 3.0;",
    "  }",
    "  colour += (hash(floor(gl_FragCoord.xy * 0.5) + uTime) - 0.5) * 0.03;",
    "  float vig = smoothstep(1.05, 0.30, length((vUv - 0.5) * vec2(1.04, 1.0)));",
    "  colour *= mix(0.58, 1.0, vig);",
    "  colour *= (1.0 - 0.30 * uAmount);",
    "  gl_FragColor = vec4(colour, 1.0);",
    "}"
  ].join("\n");

  function initDepthHero(canvas, colourSrc, depthSrc, mediaEl) {
    var gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "high-performance" });
    if (!gl) return null;

    function compile(type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || "shader");
      }
      return shader;
    }

    var program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
    gl.useProgram(program);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var u = {
      cover: gl.getUniformLocation(program, "uCoverScale"),
      center: gl.getUniformLocation(program, "uCenter"),
      amount: gl.getUniformLocation(program, "uAmount"),
      time: gl.getUniformLocation(program, "uTime"),
      colour: gl.getUniformLocation(program, "uColour"),
      depth: gl.getUniformLocation(program, "uDepth")
    };

    var MAX_AMOUNT = 0.75;
    var IMAGE = { w: 1920, h: 1080 };
    var state = {
      progress: 0,
      current: 0,
      ready: false,
      enabled: true,
      disabled: false,
      colour: null,
      depth: null
    };

    function loadTexture(src) {
      return new Promise(function (resolve, reject) {
        var image = new Image();
        image.onload = function () {
          try {
            var texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            resolve(texture);
          } catch (error) {
            // ex. ouverture directe en file:// : on garde l'image fixe
            reject(error);
          }
        };
        image.onerror = reject;
        image.src = src;
      });
    }

    Promise.all([loadTexture(colourSrc), loadTexture(depthSrc)])
      .then(function (textures) {
        state.colour = textures[0];
        state.depth = textures[1];
        state.ready = true;
        resize();
        // si une vidéo a pris le relais entre-temps, on n'affiche pas le 2.5D
        if (!state.disabled) {
          mediaEl.classList.add("is-3d");
          window.requestAnimationFrame(render);
        }
      })
      .catch(function () { /* on garde l'image fixe */ });

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var width = canvas.clientWidth || window.innerWidth;
      var height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      var canvasAspect = width / height;
      var imageAspect = IMAGE.w / IMAGE.h;
      var cover = imageAspect > canvasAspect
        ? [canvasAspect / imageAspect, 1]
        : [1, imageAspect / canvasAspect];
      gl.uniform2f(u.cover, cover[0], cover[1]);
    }

    function render(time) {
      if (simpleExperience) return;
      if (state.enabled && state.ready && !state.disabled) {
        state.current += (state.progress - state.current) * 0.09;
        var eased = Math.pow(Math.max(state.current, 0), 1.5);
        gl.uniform1f(u.amount, eased * MAX_AMOUNT);
        gl.uniform1f(u.time, time * 0.001);
        gl.uniform2f(u.center, 0.5, 0.4);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, state.colour);
        gl.uniform1i(u.colour, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, state.depth);
        gl.uniform1i(u.depth, 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      window.requestAnimationFrame(render);
    }

    window.addEventListener("resize", function () {
      if (state.ready) resize();
    });

    return {
      setProgress: function (value) { state.progress = value; },
      activate: function () { mediaEl.classList.add("is-3d"); },
      disable: function () {
        state.disabled = true;
        state.enabled = false;
        mediaEl.classList.remove("is-3d");
      }
    };
  }

  /* --- Formulaire de contact ------------------------------------------- */

  var form = document.querySelector("[data-contact-form]");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var status = form.querySelector("[data-form-status]");
      if (!form.checkValidity()) {
        if (status) status.textContent = "Merci de compléter les champs obligatoires.";
        return;
      }
      if (status) {
        status.textContent =
          "Merci. Votre demande a bien été enregistrée — nous revenons vers vous sous 24 h ouvrées.";
      }
      form.reset();
    });
  }

  /* --- Animations GSAP -------------------------------------------------- */

  // Changing viewport or motion preferences must never leave pinned content
  // hidden. Once simplified, keep native scrolling for this page visit.
  function simplifyExperience() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches && mobileFilm) {
      mobileFilm = false;
      reduceMotion = true;
      html.classList.remove("has-mobile-film");
      if (mobileHeroTrigger) mobileHeroTrigger.kill();
      if (introTimeline) introTimeline.kill();
      if (heroSequence) heroSequence.dispose();
      if (introSequence) introSequence.dispose();
      if (revealStop) { revealStop(); revealStop = null; }
      if (hasScrollTrigger) window.ScrollTrigger.getAll().forEach(function (trigger) { trigger.kill(true); });
      html.classList.remove("is-intro", "is-locked");
      if (heroSection) heroSection.querySelector(".hero__title-block").style.opacity = "1";
      retireIntro();
    }
    if (simpleExperience) return;
    simpleExperience = true;
    compactExperience = true;
    html.classList.add("is-simple", "is-compact");
    if (introTimeline) introTimeline.kill();
    if (heroSequence) heroSequence.dispose();
    if (introSequence) introSequence.dispose();
    if (revealStop) { revealStop(); revealStop = null; }
    if (depthHero) depthHero.disable();
    if (lenis) { lenis.destroy(); window.__noctisLenis = null; }
    if (hasScrollTrigger) window.ScrollTrigger.getAll().forEach(function (trigger) { trigger.kill(true); });
    if (hasGsap) {
      window.gsap.killTweensOf("main, main *");
      window.gsap.set("main, main *", { clearProps: "transform,opacity,visibility,filter,clipPath" });
    }
    html.classList.remove("gsap-ready");
    document.querySelectorAll("[data-count]").forEach(function (el) { el.textContent = el.dataset.count; });
    mobileFilm = !window.matchMedia("(prefers-reduced-motion: reduce)").matches && hasScrollTrigger && Boolean(heroSection);
    html.classList.toggle("has-mobile-film", mobileFilm);
    heroSequence = null;
    if (mobileFilm) {
      heroScrubLive = true;
      startHeroSequence();
      scrubHero(rushProgress());
      setupMobileHero();
      if (revealEnabled) revealStop = initRevealSequence(heroSection);
    }
    revealPage();
  }
  window.matchMedia("(max-width: 1000px), (pointer: coarse)").addEventListener("change", function (event) { if (event.matches) simplifyExperience(); });
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", function (event) { if (event.matches) simplifyExperience(); });

  function setupMobileHero() {
    if (!mobileFilm || !heroSection) return;
    if (mobileHeroTrigger) mobileHeroTrigger.kill();
    window.gsap.registerPlugin(window.ScrollTrigger);
    var mobileTitle = heroSection.querySelector(".hero__title-block");
    mobileHeroTrigger = window.ScrollTrigger.create({
      trigger: heroSection,
      start: "top top",
      end: function () { return "+=" + (heroSection.querySelector(".hero__sticky").clientHeight || window.innerHeight); },
      onUpdate: function (self) {
        scrubHero(self.progress);
        if (mobileTitle) mobileTitle.style.opacity = String(1 - Math.min(1, self.progress * 3));
      }
    });
  }
  setupMobileHero();
  window.addEventListener("resize", function () {
    if (mobileFilm && heroSequence && heroPortrait !== (innerHeight >= innerWidth)) {
      heroSequence.dispose();
      heroSequence = null;
      startHeroSequence();
      scrubHero(rushProgress());
    }
  });

  if (!hasGsap || !hasScrollTrigger || simpleExperience) {
    document.querySelectorAll(".hero__statement").forEach(splitWords);
    return;
  }

  html.classList.add("gsap-ready");
  window.gsap.registerPlugin(window.ScrollTrigger);
  var gsap = window.gsap;

  // Parallaxe caméra à la souris sur la scène du hero et l'intro
  initMouseParallax(document.querySelector(".hero__media"), 24);

  /* Le rush (vidéo 1) occupe le premier écran de défilement du hero ; le reste
     de la hauteur sert à la séquence du carré vidéo 2 (voir initRevealVideo). */
  function rushEnd() {
    return "+=" + window.innerHeight;
  }

  /* Hero : le titre s'affiche à l'arrivée (comme la maquette), puis la phrase
     manifeste se révèle mot à mot au défilement. */
  var hero = document.querySelector("[data-hero]");
  if (hero) {
    var titleBlock = hero.querySelector(".hero__title-block");
    var title = hero.querySelector(".hero__title");
    var media = hero.querySelector(".hero__media");
    var veil = hero.querySelector(".hero__veil");

    // Le rendu 2.5D n'est là que pour couvrir le temps de chargement de la
    // séquence d'images : si celle-ci est déjà prête (l'intro tourne dessus),
    // on ne le crée même pas.
    var mediaEl = media;
    var sequenceEnMain = heroFramesCanvas && heroFramesCanvas.classList.contains("is-ready");
    if (mediaEl && hero.querySelector("[data-hero-canvas]") && !sequenceEnMain) {
      try {
        depthHero = initDepthHero(
          hero.querySelector("[data-hero-canvas]"),
          "assets/img/hero-plate.jpg",
          "assets/img/hero-depth.png",
          mediaEl
        );
      } catch (error) {
        depthHero = null;
      }
    }

    if (veil) gsap.set(veil, { opacity: 0 });

    // Le titre est lisible immédiatement ; le mouvement commence au scroll.
    // séquence pilotée par le défilement
    var heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: rushEnd,
        scrub: 0.7,
        onUpdate: function (self) {
          if (depthHero) depthHero.setProgress(self.progress);
        }
      }
    });

    heroTl
      .to(titleBlock, { opacity: 0, y: -30, duration: 0.2, ease: "none" }, 0)
      .to(veil, { opacity: 1, duration: 0.35, ease: "none" }, 0.7);

    if (media) {
      // la vidéo apporte son propre mouvement, l'échelle l'amplifie
      gsap.to(media, {
        scale: 1.12,
        ease: "power1.in",
        scrollTrigger: { trigger: hero, start: "top top", end: rushEnd, scrub: true }
      });
    }

    // Vidéo 1 : les images préchargées suivent le défilement, image par image.
    // Le rush reprend à l'image de raccord (HERO_START), donc sans saut de
    // cadrage avec la fin de l'intro. La séquence n'existe qu'à partir de la
    // fin de l'intro : `scrubHero` ne fait rien avant (voir heroScrubLive).
    window.ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: rushEnd,
      onUpdate: function (self) { scrubHero(self.progress); }
    });
  } else {
    document.querySelectorAll(".hero__statement").forEach(splitWords);
  }

  /* La séquence atelier (fond texture + ouverture du carré vidéo) est
     pilotée plus haut par initRevealVideo : elle ne dépend ni de GSAP ni
     du CDN, et n'utilise aucun scrub vidéo. */

  /* Apparitions au défilement */
  if (hasScrollTrigger) {
    document.querySelectorAll("[data-illuminate]").forEach(function (el) {
      initTextIllumination(el);
    });
    document.querySelectorAll("[data-reveal-image]").forEach(function (img) {
      initImageReveal(img);
    });

    gsap.utils.toArray('[data-anim="fade-up"]').forEach(function (el) {
      /* Les grands textes ne se contentent pas de monter : ils sortent du flou.
         Le halo fantôme (feuille de style) reste après l'animation ; ici on ne
         fait que dissiper la brume, comme une pièce qu'on éclaire. */
      var grandTexte = el.matches(".h-display, .h-section, .h-card");
      if (grandTexte) {
        gsap.fromTo(
          el,
          { opacity: 0.14, y: 40, filter: "blur(13px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.4,
            ease: "power3.out",
            clearProps: "filter",
            scrollTrigger: { trigger: el, start: "top 88%", once: true }
          }
        );
        return;
      }
      gsap.fromTo(
        el,
        { opacity: 0, y: 44 },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        }
      );
    });

    /* L'atelier : les trois gestes se suivent au défilement. */
    initCraftSequence();

    gsap.utils.toArray('[data-anim="fade"]').forEach(function (el) {
      gsap.fromTo(
        el,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true }
        }
      );
    });

    gsap.utils.toArray('[data-anim="stagger"]').forEach(function (el) {
      gsap.fromTo(
        el.children,
        { opacity: 0, y: 34 },
        {
          opacity: 1,
          y: 0,
          duration: 0.95,
          ease: "power3.out",
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: "top 85%", once: true }
        }
      );
    });

    gsap.utils.toArray("[data-parallax]").forEach(function (el) {
      var strength = parseFloat(el.dataset.parallax) || 0.12;
      gsap.fromTo(
        el,
        { yPercent: -strength * 100 },
        {
          yPercent: strength * 100,
          ease: "none",
          scrollTrigger: { trigger: el.parentElement || el, start: "top bottom", end: "bottom top", scrub: true }
        }
      );
    });

    /* Panneaux empilés : léger recul de la carte précédente */
    /* L'atelier en chiffres : les nombres montent à l'entrée dans la section */
    gsap.utils.toArray("[data-count]").forEach(function (el) {
      var cible = Number(el.dataset.count) || 0;
      var compteur = { v: 0 };
      gsap.to(compteur, {
        v: cible,
        duration: 1.7,
        ease: "power2.out",
        snap: { v: 1 },
        onUpdate: function () { el.textContent = String(Math.round(compteur.v)); },
        scrollTrigger: { trigger: el, start: "top 90%", once: true }
      });
    });



  }

  /* Les images de fond suivent un léger zoom au chargement */
  document.querySelectorAll("[data-intro-image]").forEach(function (img) {
    gsap.fromTo(img, { scale: 1.12 }, { scale: 1, duration: 1.8, ease: "power3.out" });
  });

  if (hasScrollTrigger) {
    window.addEventListener("load", function () {
      window.ScrollTrigger.refresh();
    });
  }
})();
