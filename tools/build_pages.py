"""Génère les pages NOCTIS qui partagent exactement les mêmes en-tête, menu et pied de page.

Usage : python tools/build_pages.py
Les pages produites sont du HTML statique : une fois générées, elles peuvent être
éditées à la main (mais un nouveau lancement du script les réécrira).
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HEAD = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="https://noctis.fr/{slug}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="assets/img/hero-plate.jpg">
<meta name="theme-color" content="#0C0C0C">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

<div class="loader" aria-hidden="true">
  <div class="loader__inner">
    <svg class="logo-mark" viewBox="0 0 34 42" fill="none" stroke="currentColor">
      <line x1="6" y1="2" x2="6" y2="40" stroke-width="0.8"/>
      <line x1="6" y1="2" x2="28" y2="40" stroke-width="2.2"/>
      <line x1="28" y1="2" x2="28" y2="40" stroke-width="0.8"/>
    </svg>
    <span class="loader__bar"><i></i></span>
  </div>
</div>

<a class="skip-link" href="#contenu">Aller au contenu</a>

<header class="header">
  <div class="header__socials">
    <a href="#" target="_blank" rel="noopener" aria-label="LinkedIn NOCTIS">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.71h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.6c0-1.34-.03-3.07-1.9-3.07-1.9 0-2.2 1.46-2.2 2.97V21h-4V9Z"/></svg>
    </a>
    <a href="#" target="_blank" rel="noopener" aria-label="Instagram NOCTIS">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.97.24 2.67.51.72.28 1.3.66 1.87 1.23.57.57.95 1.15 1.23 1.87.27.7.46 1.5.51 2.67.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.24 1.97-.51 2.67a5.2 5.2 0 0 1-1.23 1.87 5.2 5.2 0 0 1-1.87 1.23c-.7.27-1.5.46-2.67.51-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.97-.24-2.67-.51a5.2 5.2 0 0 1-1.87-1.23 5.2 5.2 0 0 1-1.23-1.87c-.27-.7-.46-1.5-.51-2.67C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.24-1.97.51-2.67.28-.72.66-1.3 1.23-1.87A5.2 5.2 0 0 1 5.88 2.78c.7-.27 1.5-.46 2.67-.51C9.82 2.21 10.2 2.2 12 2.2Zm0 1.8c-3.15 0-3.5.01-4.73.07-.94.04-1.45.2-1.79.33-.45.17-.77.38-1.11.72-.34.34-.55.66-.72 1.11-.13.34-.29.85-.33 1.79C3.26 9.25 3.25 9.6 3.25 12s.01 2.75.07 3.98c.04.94.2 1.45.33 1.79.17.45.38.77.72 1.11.34.34.66.55 1.11.72.34.13.85.29 1.79.33 1.23.06 1.58.07 4.73.07s3.5-.01 4.73-.07c.94-.04 1.45-.2 1.79-.33.45-.17.77-.38 1.11-.72.34-.34.55-.66.72-1.11.13-.34.29-.85.33-1.79.06-1.23.07-1.58.07-3.98s-.01-2.75-.07-3.98c-.04-.94-.2-1.45-.33-1.79a2.98 2.98 0 0 0-.72-1.11 2.98 2.98 0 0 0-1.11-.72c-.34-.13-.85-.29-1.79-.33C15.5 4.01 15.15 4 12 4Zm0 3.05a4.95 4.95 0 1 1 0 9.9 4.95 4.95 0 0 1 0-9.9Zm0 1.8a3.15 3.15 0 1 0 0 6.3 3.15 3.15 0 0 0 0-6.3Zm5.15-2.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z"/></svg>
    </a>
    <a href="#" target="_blank" rel="noopener" aria-label="Facebook NOCTIS">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.63c-.3-.04-1.3-.13-2.5-.13-2.5 0-4.2 1.5-4.2 4.28V9.9H7.3V13h2.7v8h3.5Z"/></svg>
    </a>
  </div>

  <a class="header__logo" href="index.html" aria-label="NOCTIS — accueil">
    <svg class="logo-mark" viewBox="0 0 34 42" fill="none" stroke="currentColor" aria-hidden="true">
      <line x1="6" y1="2" x2="6" y2="40" stroke-width="0.8"/>
      <line x1="6" y1="2" x2="28" y2="40" stroke-width="2.2"/>
      <line x1="28" y1="2" x2="28" y2="40" stroke-width="0.8"/>
    </svg>
    <span class="logo-word">NOCTIS</span>
  </a>

  <div class="header__nav">
    <button class="nav-trigger" type="button" data-menu-toggle aria-expanded="false" aria-controls="menu">
      <span class="header__nav-label">Naviguer</span>
      <span class="burger" aria-hidden="true"><i></i><i></i></span>
      <span class="sr-only">Ouvrir le menu</span>
    </button>
  </div>
</header>

<div class="menu" id="menu">
  <div class="menu__body">
    <nav aria-label="Navigation principale">
      <ul class="menu__list">
        <li><a href="index.html"><span class="menu__index">01</span>Accueil</a></li>
        <li><a href="realisations.html"><span class="menu__index">02</span>Réalisations</a></li>
        <li><a href="stock.html"><span class="menu__index">03</span>Stock disponible</a></li>
        <li><a href="contact.html"><span class="menu__index">04</span>Contact</a></li>
      </ul>
    </nav>
  </div>
  <div class="menu__foot">
    <ul class="menu__foot-links">
      <li><a href="cookies.html">Cookies</a></li>
      <li><a href="confidentialite.html">Confidentialité</a></li>
      <li><a href="conditions.html">Conditions</a></li>
      <li><a href="contact.html">contact@noctis.fr</a></li>
    </ul>
    <div class="menu__socials">
      <a href="#" target="_blank" rel="noopener" aria-label="LinkedIn NOCTIS"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.71h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.6c0-1.34-.03-3.07-1.9-3.07-1.9 0-2.2 1.46-2.2 2.97V21h-4V9Z"/></svg></a>
      <a href="#" target="_blank" rel="noopener" aria-label="Instagram NOCTIS"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.97.24 2.67.51.72.28 1.3.66 1.87 1.23.57.57.95 1.15 1.23 1.87.27.7.46 1.5.51 2.67.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.24 1.97-.51 2.67a5.2 5.2 0 0 1-1.23 1.87 5.2 5.2 0 0 1-1.87 1.23c-.7.27-1.5.46-2.67.51-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.97-.24-2.67-.51a5.2 5.2 0 0 1-1.87-1.23 5.2 5.2 0 0 1-1.23-1.87c-.27-.7-.46-1.5-.51-2.67C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.24-1.97.51-2.67.28-.72.66-1.3 1.23-1.87A5.2 5.2 0 0 1 5.88 2.78c.7-.27 1.5-.46 2.67-.51C9.82 2.21 10.2 2.2 12 2.2Zm0 1.8c-3.15 0-3.5.01-4.73.07-.94.04-1.45.2-1.79.33-.45.17-.77.38-1.11.72-.34.34-.55.66-.72 1.11-.13.34-.29.85-.33 1.79C3.26 9.25 3.25 9.6 3.25 12s.01 2.75.07 3.98c.04.94.2 1.45.33 1.79.17.45.38.77.72 1.11.34.34.66.55 1.11.72.34.13.85.29 1.79.33 1.23.06 1.58.07 4.73.07s3.5-.01 4.73-.07c.94-.04 1.45-.2 1.79-.33.45-.17.77-.38 1.11-.72.34-.34.55-.66.72-1.11.13-.34.29-.85.33-1.79.06-1.23.07-1.58.07-3.98s-.01-2.75-.07-3.98c-.04-.94-.2-1.45-.33-1.79a2.98 2.98 0 0 0-.72-1.11 2.98 2.98 0 0 0-1.11-.72c-.34-.13-.85-.29-1.79-.33C15.5 4.01 15.15 4 12 4Zm0 3.05a4.95 4.95 0 1 1 0 9.9 4.95 4.95 0 0 1 0-9.9Zm0 1.8a3.15 3.15 0 1 0 0 6.3 3.15 3.15 0 0 0 0-6.3Zm5.15-2.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z"/></svg></a>
      <a href="#" target="_blank" rel="noopener" aria-label="Facebook NOCTIS"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.63c-.3-.04-1.3-.13-2.5-.13-2.5 0-4.2 1.5-4.2 4.28V9.9H7.3V13h2.7v8h3.5Z"/></svg></a>
    </div>
  </div>
</div>

<main id="contenu">
{body}
</main>

<footer class="footer">
  <div class="wrap">
    <div class="footer__top">
      <div class="footer__brand">
        <svg class="logo-mark" viewBox="0 0 34 42" fill="none" stroke="currentColor" aria-hidden="true">
          <line x1="6" y1="2" x2="6" y2="40" stroke-width="0.8"/>
          <line x1="6" y1="2" x2="28" y2="40" stroke-width="2.2"/>
          <line x1="28" y1="2" x2="28" y2="40" stroke-width="0.8"/>
        </svg>
        <p>NOCTIS est un atelier automobile de luxe dédié au design sur mesure, à la performance et au savoir-faire.</p>
      </div>
      <div class="footer__col">
        <h4>Atelier</h4>
        <ul>
          <li><a href="realisations.html">Réalisations</a></li>
          <li><a href="stock.html">Stock disponible</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <h4>Informations</h4>
        <ul>
          <li><a href="cookies.html">Cookies</a></li>
          <li><a href="confidentialite.html">Confidentialité</a></li>
          <li><a href="conditions.html">Conditions</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <h4>Contact</h4>
        <ul>
          <li><a href="mailto:contact@noctis.fr">contact@noctis.fr</a></li>
          <li><a href="contact.html">Sur rendez-vous</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <span>© <span data-year>2026</span> NOCTIS — Tous droits réservés</span>
      <span>Propulsé par NEVOLABS</span>
      <div class="footer__socials">
        <a href="#" target="_blank" rel="noopener" aria-label="LinkedIn NOCTIS"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.71h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.6c0-1.34-.03-3.07-1.9-3.07-1.9 0-2.2 1.46-2.2 2.97V21h-4V9Z"/></svg></a>
        <a href="#" target="_blank" rel="noopener" aria-label="Instagram NOCTIS"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.97.24 2.67.51.72.28 1.3.66 1.87 1.23.57.57.95 1.15 1.23 1.87.27.7.46 1.5.51 2.67.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.24 1.97-.51 2.67a5.2 5.2 0 0 1-1.23 1.87 5.2 5.2 0 0 1-1.87 1.23c-.7.27-1.5.46-2.67.51-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.97-.24-2.67-.51a5.2 5.2 0 0 1-1.87-1.23 5.2 5.2 0 0 1-1.23-1.87c-.27-.7-.46-1.5-.51-2.67C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.24-1.97.51-2.67.28-.72.66-1.3 1.23-1.87A5.2 5.2 0 0 1 5.88 2.78c.7-.27 1.5-.46 2.67-.51C9.82 2.21 10.2 2.2 12 2.2Zm0 1.8c-3.15 0-3.5.01-4.73.07-.94.04-1.45.2-1.79.33-.45.17-.77.38-1.11.72-.34.34-.55.66-.72 1.11-.13.34-.29.85-.33 1.79C3.26 9.25 3.25 9.6 3.25 12s.01 2.75.07 3.98c.04.94.2 1.45.33 1.79.17.45.38.77.72 1.11.34.34.66.55 1.11.72.34.13.85.29 1.79.33 1.23.06 1.58.07 4.73.07s3.5-.01 4.73-.07c.94-.04 1.45-.2 1.79-.33.45-.17.77-.38 1.11-.72.34-.34.55-.66.72-1.11.13-.34.29-.85.33-1.79.06-1.23.07-1.58.07-3.98s-.01-2.75-.07-3.98c-.04-.94-.2-1.45-.33-1.79a2.98 2.98 0 0 0-.72-1.11 2.98 2.98 0 0 0-1.11-.72c-.34-.13-.85-.29-1.79-.33C15.5 4.01 15.15 4 12 4Zm0 3.05a4.95 4.95 0 1 1 0 9.9 4.95 4.95 0 0 1 0-9.9Zm0 1.8a3.15 3.15 0 1 0 0 6.3 3.15 3.15 0 0 0 0-6.3Zm5.15-2.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z"/></svg></a>
        <a href="#" target="_blank" rel="noopener" aria-label="Facebook NOCTIS"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.63c-.3-.04-1.3-.13-2.5-.13-2.5 0-4.2 1.5-4.2 4.28V9.9H7.3V13h2.7v8h3.5Z"/></svg></a>
      </div>
    </div>
  </div>
</footer>

<div class="cookie-bar" data-cookie-bar role="dialog" aria-label="Préférences de cookies">
  <p>Nous utilisons des cookies pour mesurer l'audience du site et améliorer votre expérience. Vous pouvez accepter, refuser ou en savoir plus dans notre <a href="cookies.html">politique cookies</a>.</p>
  <div class="cookie-bar__actions">
    <button class="btn btn--solid" type="button" data-cookie-choice="accepted"><span data-text="Accepter"><span>Accepter</span></span></button>
    <button class="btn" type="button" data-cookie-choice="refused"><span data-text="Refuser"><span>Refuser</span></span></button>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js" defer></script>
<script src="assets/js/main.js" defer></script>
</body>
</html>
"""


def page_hero(slug: str, label: str, title: str, intro: str, image: str) -> str:
    return f"""
  <section class="page-hero">
    <div class="page-hero__bg">
      <img src="assets/img/{image}" alt="" aria-hidden="true" data-intro-image>
    </div>
    <div class="page-hero__inner">
      <nav class="breadcrumb" aria-label="Fil d'ariane">
        <a href="index.html">Accueil</a><span aria-hidden="true">/</span><span>{label}</span>
      </nav>
      <h1 class="h-display" data-anim="fade-up">{title}</h1>
      <p class="lead" data-anim="fade-up">{intro}</p>
    </div>
  </section>"""


CONTACT_BODY = page_hero(
    "contact",
    "Contact",
    "Démarrer votre projet",
    "Décrivez-nous le véhicule, l'intention et le résultat recherché. Nous revenons vers vous sous 24 h ouvrées avec une première lecture de votre projet.",
    "detail-red.jpg",
) + """

  <section class="section">
    <div class="wrap">
      <div class="contact__grid">
        <div class="contact__details" data-anim="stagger">
          <div class="contact__detail">
            <span>E-mail</span>
            <a href="mailto:contact@noctis.fr">contact@noctis.fr</a>
          </div>
          <div class="contact__detail">
            <span>Atelier</span>
            <p>Sur rendez-vous</p>
          </div>
          <div class="contact__detail">
            <span>Délai de réponse</span>
            <p>Sous 24 h ouvrées</p>
          </div>
          <div class="contact__detail">
            <span>Langues</span>
            <p>Français · Anglais</p>
          </div>
        </div>

        <form class="form" data-contact-form novalidate>
          <div class="form__row">
            <div class="field">
              <label for="nom">Nom et prénom *</label>
              <input id="nom" name="nom" type="text" required autocomplete="name" placeholder="Votre nom">
            </div>
            <div class="field">
              <label for="email">E-mail *</label>
              <input id="email" name="email" type="email" required autocomplete="email" placeholder="vous@exemple.fr">
            </div>
          </div>

          <div class="form__row">
            <div class="field">
              <label for="telephone">Téléphone</label>
              <input id="telephone" name="telephone" type="tel" autocomplete="tel" placeholder="+33 ...">
            </div>
            <div class="field">
              <label for="vehicule">Véhicule</label>
              <input id="vehicule" name="vehicule" type="text" placeholder="Marque, modèle, année">
            </div>
          </div>

          <div class="field">
            <label for="service">Service souhaité</label>
            <select id="service" name="service">
              <option>Projet complet</option>
              <option>Carrosserie</option>
              <option>Intérieur</option>
              <option>Jantes</option>
              <option>Éclairage</option>
              <option>Échappement</option>
              <option>Protection / film</option>
              <option>Autre demande</option>
            </select>
          </div>

          <div class="field">
            <label for="message">Votre projet *</label>
            <textarea id="message" name="message" required placeholder="Décrivez l'intention, les éléments souhaités et le calendrier envisagé."></textarea>
          </div>

          <label class="consent">
            <input type="checkbox" name="consentement" required>
            <span>J'accepte que NOCTIS utilise ces informations pour me répondre, conformément à la <a href="confidentialite.html">politique de confidentialité</a>.</span>
          </label>

          <div class="form__foot">
            <button class="btn btn--solid" type="submit"><span data-text="Envoyer la demande"><span>Envoyer la demande</span></span></button>
            <p class="form__note">Les champs marqués d'un astérisque sont obligatoires.</p>
          </div>
          <p class="form__status" data-form-status role="status" aria-live="polite"></p>
        </form>
      </div>
    </div>
  </section>
"""


COOKIES_BODY = page_hero(
    "cookies",
    "Cookies",
    "Politique cookies",
    "Ce site utilise un nombre limité de cookies, uniquement pour mesurer son audience et améliorer votre expérience de navigation.",
    "floor-texture.jpg",
) + """

  <section class="section">
    <div class="wrap">
      <div class="prose" data-anim="fade-up">
        <h2>Qu'est-ce qu'un cookie ?</h2>
        <p>Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d'un site. Il permet de conserver des informations relatives à votre navigation, par exemple vos préférences d'affichage ou des statistiques de fréquentation anonymisées.</p>

        <h2>Cookies utilisés</h2>
        <ul>
          <li><strong>Cookies essentiels</strong> — nécessaires au fonctionnement du site et à la mémorisation de votre choix concernant les cookies. Ils ne peuvent pas être désactivés.</li>
          <li><strong>Cookies de mesure d'audience</strong> — statistiques agrégées et anonymes (pages consultées, durée de visite). Ils nous aident à améliorer le contenu et les parcours.</li>
          <li><strong>Cookies tiers</strong> — aucun cookie publicitaire n'est déposé sur ce site.</li>
        </ul>

        <h2>Votre choix</h2>
        <p>Lors de votre première visite, un bandeau vous permet d'accepter ou de refuser les cookies de mesure d'audience. Votre choix est conservé localement dans votre navigateur et peut être modifié à tout moment en effaçant les données du site.</p>

        <h2>Gérer les cookies depuis votre navigateur</h2>
        <p>Vous pouvez à tout moment configurer votre navigateur pour refuser les cookies, être alerté avant leur dépôt ou les supprimer. Le refus de certains cookies peut affecter le confort de navigation.</p>

        <h2>Contact</h2>
        <p>Pour toute question relative aux cookies : <a href="mailto:contact@noctis.fr">contact@noctis.fr</a>.</p>

        <p><em>Dernière mise à jour : à compléter avant mise en ligne. Ce document doit être relu par un conseil juridique pour être pleinement conforme.</em></p>
      </div>
    </div>
  </section>
"""


CONFIDENTIALITE_BODY = page_hero(
    "confidentialite",
    "Confidentialité",
    "Politique de confidentialité",
    "Nous ne collectons que les informations nécessaires au traitement de votre demande et ne les transmettons jamais à des tiers à des fins commerciales.",
    "car-center.jpg",
) + """

  <section class="section">
    <div class="wrap">
      <div class="prose" data-anim="fade-up">
        <h2>Données collectées</h2>
        <p>Via le formulaire de contact : nom et prénom, adresse e-mail, numéro de téléphone (facultatif), véhicule concerné, service souhaité et description de votre projet. Aucune donnée bancaire n'est collectée sur ce site.</p>

        <h2>Finalité du traitement</h2>
        <ul>
          <li>Répondre à votre demande et préparer une proposition commerciale.</li>
          <li>Assurer le suivi de la relation et la gestion du projet.</li>
          <li>Mesurer l'audience du site de manière agrégée et anonyme.</li>
        </ul>

        <h2>Base légale</h2>
        <p>Le traitement repose sur votre consentement (article 6.1.a du RGPD) et sur l'intérêt légitime de NOCTIS à répondre aux demandes qui lui sont adressées.</p>

        <h2>Durée de conservation</h2>
        <p>Les données envoyées via le formulaire sont conservées trois ans à compter du dernier contact, sauf obligation légale contraire.</p>

        <h2>Vos droits</h2>
        <p>Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Pour exercer ces droits, écrivez à <a href="mailto:contact@noctis.fr">contact@noctis.fr</a>. Vous pouvez également introduire une réclamation auprès de la CNIL.</p>

        <h2>Sécurité</h2>
        <p>Les données sont hébergées sur des serveurs sécurisés et accessibles uniquement aux personnes habilitées de l'atelier.</p>

        <p><em>Dernière mise à jour : à compléter avant mise en ligne. Ce document doit être relu par un conseil juridique pour être pleinement conforme.</em></p>
      </div>
    </div>
  </section>
"""


CONDITIONS_BODY = page_hero(
    "conditions",
    "Conditions",
    "Conditions générales",
    "Les présentes conditions encadrent l'utilisation du site NOCTIS ainsi que les prestations de personnalisation réalisées par l'atelier.",
    "car-left.jpg",
) + """

  <section class="section">
    <div class="wrap">
      <div class="prose" data-anim="fade-up">
        <h2>1. Objet</h2>
        <p>Le site noctis.fr présente l'activité de l'atelier NOCTIS : personnalisation, carrosserie, intérieur, jantes, éclairage, échappement et protection de véhicules. Les informations présentées ont une valeur indicative et ne constituent pas une offre contractuelle.</p>

        <h2>2. Devis et commandes</h2>
        <p>Toute prestation fait l'objet d'un devis écrit, établi après étude du véhicule et des souhaits du client. La commande est réputée ferme à réception du devis signé et, le cas échéant, de l'acompte indiqué.</p>

        <h2>3. Délais</h2>
        <p>Les délais annoncés sont donnés à titre indicatif et dépendent de la disponibilité des pièces et des contraintes d'atelier. Ils ne constituent pas un engagement ferme sauf mention contraire écrite.</p>

        <h2>4. Garantie et conformité</h2>
        <p>Les modifications réalisées doivent rester conformes à la réglementation en vigueur (homologation, éclairage, émissions sonores, assurance). Le client est informé des contraintes applicables avant travaux ; les déclarations administratives éventuelles restent à sa charge.</p>

        <h2>5. Propriété intellectuelle</h2>
        <p>Les textes, visuels, photographies et créations graphiques présents sur ce site sont la propriété de NOCTIS. Toute reproduction sans autorisation écrite est interdite.</p>

        <h2>6. Droit applicable</h2>
        <p>Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité avant toute action judiciaire.</p>

        <p><em>Dernière mise à jour : à compléter avant mise en ligne. Ce document doit être relu par un conseil juridique pour être pleinement conforme.</em></p>
      </div>
    </div>
  </section>
"""


PAGES = {
    "contact.html": (
        "Contact — NOCTIS",
        "Démarrez votre projet sur mesure avec l'atelier NOCTIS : décrivez votre véhicule et l'intention recherchée.",
        CONTACT_BODY,
    ),
    "cookies.html": (
        "Politique cookies — NOCTIS",
        "Informations sur les cookies utilisés par le site NOCTIS et sur la gestion de vos préférences.",
        COOKIES_BODY,
    ),
    "confidentialite.html": (
        "Politique de confidentialité — NOCTIS",
        "Comment NOCTIS collecte, utilise et protège les données transmises via son site.",
        CONFIDENTIALITE_BODY,
    ),
    "conditions.html": (
        "Conditions générales — NOCTIS",
        "Conditions générales d'utilisation du site et des prestations de l'atelier NOCTIS.",
        CONDITIONS_BODY,
    ),
}


def main() -> None:
    for filename, (title, description, body) in PAGES.items():
        html = HEAD.format(title=title, description=description, slug=filename, body=body)
        (ROOT / filename).write_text(html, encoding="utf-8")
        print("écrit :", filename)


if __name__ == "__main__":
    main()
