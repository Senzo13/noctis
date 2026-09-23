/* ==========================================================================
   NOCTIS — interactions & animations
   Dépendances (CDN) : GSAP + ScrollTrigger, Lenis
   Tout est optionnel : sans JS/CDN, le site reste lisible et navigable.
   ========================================================================== */

(function () {
  "use strict";

  var html = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined";
  var hasScrollTrigger = hasGsap && typeof window.ScrollTrigger !== "undefined";

  /* --- Défilement fluide (Lenis) ----------------------------------------
     Sans lui, chaque cran de molette arrive d'un seul coup : la vidéo 1 est
     scrubbée par sauts de plusieurs images (le fameux « +10 frames »). Lenis
     lisse l'entrée du défilement, donc le scrub de la vidéo 1, le fondu et
     l'ouverture du carré suivent le doigt image par image.
     ?lenis=0 coupe le lissage (utile pour comparer). */

  var lenis = null;
  var lenisEnabled = window.location.search.indexOf("lenis=0") === -1;
  if (typeof window.Lenis !== "undefined" && !reduceMotion && lenisEnabled) {
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

  /* --- Chargement ------------------------------------------------------- */

  function hideLoader() {
    document.body.classList.add("is-loaded");
    document.dispatchEvent(new CustomEvent("noctis:reveal"));
  }

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* Intro vidéo : elle se lance automatiquement à l'arrivée, et on ne
     révèle la page qu'à sa fin (le logo reste en repli si elle échoue). */
  var introVideo = document.querySelector("[data-intro-video]");
  var introFinished = !introVideo;
  if (introVideo && !reduceMotion) {
    introVideo.muted = true;
    introVideo.defaultMuted = true;
    introVideo.setAttribute("muted", "");
    var revealPage = function () {
      if (introFinished) return;
      introFinished = true;
      hideLoader();
    };
    introVideo.addEventListener("ended", revealPage, { once: true });
    introVideo.addEventListener("error", revealPage, { once: true });
    // on révèle un peu avant la fin : le fondu s'enchaîne avec le hero
    var introTick = function () {
      if (introVideo.duration && introVideo.currentTime >= introVideo.duration - 0.35) {
        introVideo.removeEventListener("timeupdate", introTick);
        revealPage();
      }
    };
    introVideo.addEventListener("timeupdate", introTick);
    var introPlay = introVideo.play();
    if (introPlay && typeof introPlay.catch === "function") {
      introPlay.catch(function () {
        // autoplay refusé : le repli temporel ci-dessous révèle la page
      });
    }
  }

  /* --- Panneau de diagnostic : ajouter ?debug=1 à l'URL ---------------- */

  if (window.location.search.indexOf("debug") !== -1) {
    var panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;left:12px;bottom:12px;z-index:9999;font:12px/1.6 monospace;background:rgba(0,0,0,.85);" +
      "color:#7CFF9B;padding:10px 12px;border:1px solid #7CFF9B;white-space:pre;pointer-events:none;max-width:92vw";
    document.body.appendChild(panel);
    window.setInterval(function () {
      panel.textContent = [
        "build : v20 (vidéos 1 et 2 en séquences d'images scrubbées)",
        "fenêtre : " + window.innerWidth + "x" + window.innerHeight,
        "gsap:" + (typeof window.gsap !== "undefined" ? "ok" : "ABSENT") +
          "  scrolltrigger:" + (typeof window.ScrollTrigger !== "undefined" ? "ok" : "ABSENT") +
          "  lenis:" + (typeof window.Lenis !== "undefined" ? "ok" : "ABSENT"),
        "hero 2.5D actif : " + (document.querySelector(".hero__media.is-3d") ? "oui (images en cours)" : "non"),
        "images hero chargées : " + window.__noctisFrames.hero + "/" + window.__noctisFrames.total,
        "images vidéo 2       : " + window.__noctisFrames.atelier + "/" + window.__noctisFrames.total,
        "séquence ouverte     : " + (window.__noctisReveal ? window.__noctisReveal().toFixed(3) : "absente"),
        "scroll  : " + Math.round(window.pageYOffset) + " px"
      ].join("\n");
    }, 250);
  }

  // repli temporel : plus long quand l'intro doit jouer (elle dure ~3 s)
  var introDelay = (introVideo && !reduceMotion) ? 4500 : 250;
  if (document.readyState === "complete") {
    window.setTimeout(function () { if (!introFinished) hideLoader(); }, introDelay);
  } else {
    window.addEventListener("load", function () {
      window.setTimeout(function () { if (!introFinished) hideLoader(); }, introDelay);
    });
    window.setTimeout(function () { if (!introFinished) hideLoader(); }, introDelay);
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
    if (reduceMotion || !hasScrollTrigger) {
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

  var navTriggers = document.querySelectorAll("[data-menu-toggle]");
  var menu = document.querySelector(".menu");

  function setMenu(open) {
    html.classList.toggle("menu-open", open);
    html.classList.toggle("is-locked", open);
    if (lenis) {
      if (open) lenis.stop();
      else lenis.start();
    }
    navTriggers.forEach(function (btn) {
      btn.setAttribute("aria-expanded", String(open));
    });
    if (header) header.classList.remove("is-hidden");
    if (open && menu) {
      var first = menu.querySelector("a");
      if (first) window.setTimeout(function () { first.focus(); }, 500);
    }
  }

  navTriggers.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setMenu(!html.classList.contains("menu-open"));
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && html.classList.contains("menu-open")) setMenu(false);
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

    // Le tampon du canvas reste à la taille CSS × 1 : les images sources font
    // 1280 px de large, un tampon en 2× (écrans Retina) ne coûterait que du
    // remplissage sans apporter de détail.
    var dpr = 1;
    var images = new Array(count);
    var pretes = new Uint8Array(count);
    var charge = false;
    var dessinee = -1;
    var cible = 0;
    var premiere = false;

    function fichier(i) {
      var n = String(i + 1);
      while (n.length < 3) n = "0" + n;
      return base + n + ".webp";
    }

    function charger(i) {
      if (images[i]) return;
      var img = new Image();
      img.decoding = "async";
      img.onload = function () {
        pretes[i] = 1;
        suivi[cle] = (suivi[cle] || 0) + 1;
        if (!premiere) {
          premiere = true;
          canvas.classList.add("is-ready");
          if (typeof options.onFirstReady === "function") options.onFirstReady();
        }
        if (i === cible || dessinee < 0) peindre(i);
      };
      img.onerror = function () { pretes[i] = 0; };
      images[i] = img;
      img.src = fichier(i);
    }

    // On commence par une trame large (une image sur huit) pour que la
    // séquence réponde partout tout de suite, puis on comble les trous.
    function load() {
      if (charge) return;
      charge = true;
      var ordre = [];
      var i;
      for (i = 0; i < count; i += 8) ordre.push(i);
      for (i = 0; i < count; i += 1) if (i % 8 !== 0) ordre.push(i);
      ordre.forEach(function (n, rang) {
        window.setTimeout(function () { charger(n); }, rang * 14);
      });
    }

    function resize() {
      var largeur = canvas.clientWidth || window.innerWidth;
      var hauteur = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(largeur * dpr);
      canvas.height = Math.round(hauteur * dpr);
      if (dessinee >= 0) peindre(dessinee);
    }

    function peindre(i) {
      var img = images[i];
      if (!img || !pretes[i]) return;
      var cw = canvas.width;
      var ch = canvas.height;
      var iw = img.naturalWidth;
      var ih = img.naturalHeight;
      if (!cw || !ch || !iw || !ih) return;
      // même cadrage qu'un object-fit: cover
      var echelle = Math.max(cw / iw, ch / ih);
      var w = iw * echelle;
      var h = ih * echelle;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      dessinee = i;
      suivi[cle + "Index"] = i;
    }

    function plusProche(i) {
      if (pretes[i]) return i;
      for (var d = 1; d < count; d += 1) {
        if (i - d >= 0 && pretes[i - d]) return i - d;
        if (i + d < count && pretes[i + d]) return i + d;
      }
      return -1;
    }

    // p = progression 0 → 1 de la séquence
    function setProgress(p) {
      var valeur = p < 0 ? 0 : p > 1 ? 1 : p;
      cible = Math.round(valeur * (count - 1));
      if (cible === dessinee) return;
      var i = plusProche(cible);
      if (i >= 0) peindre(i);
    }

    resize();
    window.addEventListener("resize", resize);

    return { load: load, setProgress: setProgress, resize: resize, currentIndex: function () { return dessinee; } };
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
    var sub = section.querySelector("[data-reveal-sub]");
    var cues = Array.prototype.slice.call(frame.querySelectorAll(".reveal__cue"));
    var scrim = frame.querySelector("[data-reveal-scrim]");
    var finale = frame.querySelector("[data-reveal-finale]");
    if (!sticky || !frame) return;

    // Les images de la vidéo 2 sont dessinées dans le carré : elles avancent
    // avec l'ouverture, et repartent en arrière quand il se referme.
    var frames = framesCanvas ? initFrameSequence({
      canvas: framesCanvas,
      base: "assets/frames/atelier/",
      count: 120,
      cle: "atelier"
    }) : null;

    // Le fondu du fond texture se mesure en « écrans » parcourus depuis le
    // haut du hero : le rush occupe l'écran 0 → 1, la dernière image de la
    // vidéo 1 reste donc affichée pendant tout le rush, puis se dissout
    // lentement dans le fond texture (presque un écran de défilement).
    var DISSOLVE_FROM = 0.96;
    var DISSOLVE_TO = 1.78;

    // La séquence du carré se mesure en progression 0 → 1 après le rush :
    // la phrase reste seule tant qu'on ne continue pas à défiler, puis un
    // carré minuscule apparaît et grandit jusqu'au plein écran.
    var SQUARE_IN = 0.24;
    var SQUARE_SEEN = 0.34;
    var OPEN_START = 0.38;
    var OPEN_END = 0.7;
    // une fois l'écran entièrement rempli, la séquence reste ouverte
    var FULL_AT = OPEN_END - 0.01;

    // Immobile, le carré se referme tout seul (et rejoue à la prochaine
    // poussée) — sauf une fois l'écran entièrement rempli.
    var IDLE_AFTER = 800;
    var IDLE_TAU = 700;

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
    var lastSub = "";
    var lastY = window.pageYOffset;
    var lastMove = window.performance.now();
    var lastFrame = lastMove;

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
      var screen = size.h || window.innerHeight || 1;
      return Math.max(1, section.offsetHeight - sticky.offsetHeight - screen);
    }

    function measure() {
      size.w = sticky.clientWidth || window.innerWidth;
      size.h = sticky.clientHeight || window.innerHeight;
      origin = section.getBoundingClientRect().top + window.pageYOffset;
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

      // la phrase « Chaque décision est intentionnelle… » apparaît sous la
      // phrase manifeste, légèrement après le fond texture
      var subOpacity = smooth(ramp(position, 1.02, 1.55)).toFixed(3);
      if (sub && subOpacity !== lastSub) {
        sub.style.opacity = subOpacity;
        lastSub = subOpacity;
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
        var joue = value >= FULL_AT + 0.005;
        var image = frames.currentIndex();
        cues.forEach(function (cue) {
          var bornes = (cue.getAttribute("data-cue") || "0,0").split(",");
          var actif = joue && image >= Number(bornes[0]) && image <= Number(bornes[1]);
          if (cue._actif !== actif) {
            cue._actif = actif;
            cue.classList.toggle("is-active", actif);
          }
        });

        // fin de la vidéo 2 : scrim + mot de clôture (transition de sortie)
        var fin = value >= 0.93;
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
      now = now || window.performance.now();
      var position = readPosition();
      var target = readProgress();

      // le défilement pousse le carré ; à l'arrêt, il se referme tout seul
      var y = window.pageYOffset;
      if (Math.abs(y - lastY) > 0.4) {
        lastY = y;
        lastMove = now;
      }

      // Les images de la vidéo 2 commencent à se charger dès le milieu du
      // rush : elles sont prêtes (et déjà décodées) quand le fondu démarre.
      if (position > 0.5 && frames) frames.load();

      if (now - lastMove < IDLE_AFTER || current >= FULL_AT) {
        // léger lissage : la fenêtre suit le défilement sans à-coups
        current += (target - current) * 0.18;
        if (Math.abs(target - current) < 0.0008) current = target;
      } else if (current > 0) {
        current -= current * Math.min(1, (now - lastFrame) / IDLE_TAU);
        if (current < 0.001) current = 0;
      }
      lastFrame = now;

      // le fond texture suit le défilement (pas la valeur élastique du carré)
      apply(current, position);

      // on ne continue à tourner que tant que quelque chose peut bouger
      if (active && (current > 0 || position < DISSOLVE_TO)) raf = window.requestAnimationFrame(loop);
    }

    function start() {
      if (!raf) raf = window.requestAnimationFrame(loop);
    }

    // le défilement relance la boucle (elle s'arrête dès que tout est stable)
    window.addEventListener("scroll", function () {
      lastMove = window.performance.now();
      if (active) start();
    }, { passive: true });

    measure();
    current = readProgress();
    apply(current, readPosition());
    window.__noctisReveal = function () { return current; };

    window.addEventListener("resize", function () {
      measure();
      current = readProgress();
      apply(current, readPosition());
    });

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
  }

  var revealSection = document.querySelector("[data-reveal]");
  // ?reveal=0 : coupe la séquence (utile pour comparer la fluidité du rush)
  var revealEnabled = window.location.search.indexOf("reveal=0") === -1;
  if (revealSection && !reduceMotion && revealEnabled) initRevealSequence(revealSection);

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

  /* --- Bandeau cookies -------------------------------------------------- */

  var cookieBar = document.querySelector("[data-cookie-bar]");
  if (cookieBar) {
    var STORAGE_KEY = "noctis-cookie-consent";
    var stored = null;
    try { stored = window.localStorage.getItem(STORAGE_KEY); } catch (err) { stored = null; }
    if (!stored) {
      window.setTimeout(function () { cookieBar.classList.add("is-visible"); }, 1400);
    }
    cookieBar.querySelectorAll("[data-cookie-choice]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        try { window.localStorage.setItem(STORAGE_KEY, btn.dataset.cookieChoice); } catch (err) { /* ignore */ }
        cookieBar.classList.remove("is-visible");
      });
    });
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

  if (!hasGsap || !hasScrollTrigger || reduceMotion) {
    document.querySelectorAll(".hero__statement").forEach(splitWords);
    return;
  }

  html.classList.add("gsap-ready");
  window.gsap.registerPlugin(window.ScrollTrigger);
  var gsap = window.gsap;

  /* Le rush (vidéo 1) occupe le premier écran de défilement du hero ; le reste
     de la hauteur sert à la séquence du carré vidéo 2 (voir initRevealVideo). */
  function rushEnd() {
    return "+=" + window.innerHeight;
  }

  /* Hero : le titre s'affiche à l'arrivée (comme la maquette), puis la phrase
     manifeste se révèle mot à mot au défilement. */
  var hero = document.querySelector("[data-hero]");
  if (hero) {
    var statement = hero.querySelector(".hero__statement");
    var words = splitWords(statement);
    var titleBlock = hero.querySelector(".hero__title-block");
    var title = hero.querySelector(".hero__title");
    var foot = hero.querySelector(".hero__foot");
    var media = hero.querySelector(".hero__media");
    var veil = hero.querySelector(".hero__veil");

    var mediaEl = hero.querySelector(".hero__media");
    var depthHero = null;
    if (mediaEl && hero.querySelector("[data-hero-canvas]")) {
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

    gsap.set(words, { opacity: 0 });
    if (veil) gsap.set(veil, { opacity: 0 });

    // arrivée sur le site : elle se joue quand l'intro se termine, pour que
    // le fondu du préloader s'enchaîne avec l'apparition du titre
    var arrival = gsap
      .timeline({ defaults: { ease: "power3.out" }, paused: true })
      .from(title, { yPercent: 14, opacity: 0, duration: 1.05 })
      .from(foot, { y: 20, opacity: 0, duration: 1 }, "-=0.8");
    if (document.body.classList.contains("is-loaded")) {
      arrival.play();
    } else {
      document.addEventListener("noctis:reveal", function () { arrival.play(); }, { once: true });
    }

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
      .to([titleBlock, foot], { opacity: 0, y: -30, duration: 0.2, ease: "none" }, 0)
      .to(veil, { opacity: 1, duration: 0.35, ease: "none" }, 0.7)
      .to(words, { opacity: 1, duration: 0.45, stagger: 0.06, ease: "none" }, 1)
      .to(statement, { duration: 0.1 }, 1.85);

    if (media) {
      // la vidéo apporte son propre mouvement, l'échelle l'amplifie
      gsap.to(media, {
        scale: 1.12,
        ease: "power1.in",
        scrollTrigger: { trigger: hero, start: "top top", end: rushEnd, scrub: true }
      });
    }

    // Vidéo 1 : les images préchargées suivent le défilement, image par image.
    var heroFramesCanvas = hero.querySelector("[data-hero-frames]");
    if (heroFramesCanvas) {
      var portrait = window.matchMedia("(max-width: 767px)").matches;
      var heroFrames = initFrameSequence({
        canvas: heroFramesCanvas,
        base: portrait ? "assets/frames/hero-mobile/" : "assets/frames/hero/",
        count: 120,
        cle: "hero",
        onFirstReady: function () {
          // la séquence prend le relais sur le rendu 2.5D
          if (depthHero) depthHero.disable();
        }
      });
      if (heroFrames) {
        heroFrames.load();
        window.ScrollTrigger.create({
          trigger: hero,
          start: "top top",
          end: rushEnd,
          onUpdate: function (self) { heroFrames.setProgress(self.progress); }
        });
      }
    }
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

    gsap.utils.toArray('[data-anim="fade-up"]').forEach(function (el) {
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
    gsap.utils.toArray(".panel").forEach(function (panel, index, list) {
      if (index === list.length - 1) return;
      gsap.to(panel, {
        scale: 0.94,
        opacity: 0.45,
        ease: "none",
        scrollTrigger: {
          trigger: list[index + 1],
          start: "top bottom",
          end: "top top",
          scrub: true
        }
      });
    });

    /* Rail horizontal (L'ordinaire s'arrête ici) */
    var rail = document.querySelector(".rail");
    var railSticky = document.querySelector(".rail-sticky");
    if (rail && railSticky && window.matchMedia("(min-width: 1024px)").matches) {
      var distance = function () {
        return Math.max(0, rail.scrollWidth - window.innerWidth + 64);
      };
      gsap.to(rail, {
        x: function () { return -distance(); },
        ease: "none",
        scrollTrigger: {
          trigger: railSticky,
          start: "top top",
          end: function () { return "+=" + distance(); },
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });
    }
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
