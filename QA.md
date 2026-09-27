# Vérification de l’édition studio — révision 43

27 septembre 2026. Référence locale Vyro : source FlavorSlider.jsx et captures
à la molette sur le serveur temporaire 5181. Son déplacement horizontal a été
observé directement, puis adapté aux chapitres atelier et collection de Noctis.

## Contrôles de cette révision

- `tools/verify-intro.cjs` : vidéo 0 à 1440, 390 et 375 px. Deux images canvas
  différentes pendant la lecture, fin d’intro, retour du titre et scroll libéré.
  Absence du manifeste d’ouverture et de jauge. Les 33 images intro-mobile
  sont les seules images de séquence chargées sur mobile. Réduction des
  mouvements et absence de JavaScript vérifiées. Suppression d’un bref
  dédoublement de voiture au premier affichage de l’intro.
- `tools/verify-scroll.cjs` : molette avant/arrière avec pointeur sur les images,
  pin stable, commandes suivant/précédent, dernière carte entière et sortie de
  section à 1440 × 900 et 1366 × 768. Titres vérifiés au début de chaque section.
  Redimensionnement vers 390 px : retrait des pins et du déplacement appliqué.
  Lecture mobile verticale des gestes, rail tactile de collection ; versions
  sans JavaScript et en mouvement réduit accessibles, sans débordement.
- `tools/verify-experience.cjs` : 24 contrôles de pages (six routes × quatre
  largeurs 320/390/768/1440) réussis. Interactions relancées seules avec
  `--interactions` et terminées sans erreur JavaScript ni requête échouée :
  menu et focus, cinq matières, contrôles des rails, services, trois légendes
  du film, changement desktop/mobile et navigation sans JavaScript.
  Des chargements incomplets intermittents avaient perturbé les tentatives
  simultanées ; la cause n’a pas été établie. La passe isolée est réussie.
- Pack Seedance : aperçus et repères moteur contrôlés à 390 et 1440 px,
  téléchargement du ZIP vérifié. Prompt visible et PROMPT.txt identiques,
  mêmes images START et END. Protection déjà appliquée, suppression de
  l’animation de pellicule, ajout de changements de vitesse de la caméra.
- Syntaxe JavaScript et modèle Python des pages secondaires validés.

## Limites du film

Le premier rendu Runway décrit par l’utilisateur n’a pas été fourni dans le
projet. Le prompt et le pack sont corrigés ; aucune modification du MP4
existant n’est revendiquée. L’ancien film atelier reste actif sur le site.
Les intervalles et coordonnées de timeline.json doivent être recalés sur
la prochaine vidéo réelle avant installation.

Le script d’installation a été exercé précédemment sur une fixture synthétique
de 10 s : 120 images et repères installés, vidéo de 8 s rejetée. Cette fixture
n’est pas la vidéo du site. Les repères ont été contrôlés dans le lecteur au
scroll, sans erreurs de coordonnées ou d’activation.

## Reproduire

Démarrer `python tools/serve.py 5180` après vérification du port, puis exécuter :

```text
node tools/verify-intro.cjs
node tools/verify-scroll.cjs
node tools/verify-experience.cjs
```

Playwright et Chrome sont nécessaires. Captures sous `tools/_shots/intro`,
`tools/_shots/scroll` et `tools/_shots/experience`, ignorées par Git.
Tests tactiles et tailles mobiles émulés sous Chrome, pas sur appareil iOS
physique. Le site reste une démonstration statique ; aucun service d’envoi
du formulaire n’est ajouté.

Révision 43 — boutons : contrôle visuel sur fond clair et sombre à 1440 px,
et collection à 390 px. Deux SVG par navigation, clics opérationnels, focus
au clavier visible, aucun débordement horizontal. Le hover ne transforme
plus le bouton inactif en disque gris.

Révision 44 — bibliothèque Lucide : build npm réussi. L’onglet Chrome utilisateur
localhost:5180 affichait encore la CSS v42 et les caractères ←/→. Après
rechargement, CSS v44 et bundle Lucide v44 chargés ; les quatre boutons
contiennent les SVG lucide-chevron-left/right générés par la bibliothèque.
Le clic suivant de la collection a été exercé dans cet onglet. Capture réelle :
tools/_shots/experience/lucide-44-buttons.png.


## Révision 45 — film livré

Film ProRes de 10,041667 s validé : conversion web H.264 BT709 en 1080p24,
textes et annotations contrôlés sur les plans réels. Tests atelier aux largeurs
1440/1920, lecteur mobile normal et mouvement réduit : PASS.

## Révision 46 — opacité, pleine définition et cadence native

- `verify-panels.cjs` : PASS aux largeurs 320, 390, 768, 1440 et 1920.
  Trois positions par panneau : opacité 1, aucun recouvrement ou débordement.
  Captures dans tools/_shots/panels.
- `verify-atelier-film.cjs` : PASS, 241 images 1920×1080 à 24 images/s.
  Quatre textes, trois composants, ancrages interpolés, retour arrière et finale ;
  aucun MP4 avant lecture volontaire sur mobile.
- Séquences 0/1 extraites directement de leurs sources 1080p30 : intro 65 images
  sur le même segment, hero 240 images, raccord à l’index 38. Qualité WebP 90 ;
  recadrage mobile natif 608×1080. Sources intactes.
- Mesure locale de réponse à un saut de scroll : ancien moteur 1218 ms à froid /
  209 ms à chaud, nouveau moteur final 115 ms / 48 ms. Conditions locales Chrome ;
  ces chiffres ne représentent pas une connexion internet réelle.
- Défilement continu du film en 5 s (vitesse double), DPR 2 : retard médian
  et p95 de 0 image, maximum 1 image ; aucune tâche longue >50 ms ; cache
  décodé limité à 18 images, canvas 1920 px. Écran du test 144 Hz.
  Traces : tools/_shots/reveal-perf-{before,final,continuous}.json.
- Syntaxe JavaScript/Python et git diff --check validés.

La mémoire des images décodées est bornée ; les fichiers compressés restent
en cache pendant la visite. La qualité plus élevée augmente le volume réseau.
Tests mobiles émulés, sans validation sur iPhone physique.

Intro finale : verify-intro.cjs PASS à 1440/390/375, mouvement réduit et sans JS.
Animation, retour du titre et déverrouillage du scroll vérifiés. Mobile :
65 images intro et un seul poster atelier, aucune séquence desktop chargée.


## Révision 47 — régression mobile corrigée

La validation précédente acceptait à tort un remplacement de l’expérience
mobile par un visuel fixe et un lecteur natif. Le nouveau contrat vérifié est
l’enchaînement filmé 0 → 1 → 2 au défilement, avec une composition mobile dédiée.

- `verify-mobile-film.cjs` : PASS à 390×844, 375×667 et 320×700. Gestes
  tactiles CDP, raccord, avance des deux films, quatre titres, trois composants,
  retour arrière, sortie du hero, rotation et préférence de mouvement réduit.
- `verify-mobile-handoff.cjs` : PASS avec les requêtes hero retardées au-delà
  de la fin d’intro et avec leur échec complet. La dernière image d’intro
  reste réellement peinte, le scroll se déverrouille, puis le relais attend
  le dessin de l’image cible. Aucun écran noir.
- Aucun MP4 chargé en parcours mobile normal ; lecteur natif disponible en
  mouvement réduit. Aucun débordement ou verrouillage après l’intro.
- Contrôle visuel à 390 px : image moteur agrandie dans une fenêtre adaptée,
  titre composant au-dessus. Cas limite 320×568 / PISTONS & BIELLES : titre
  finit à 130 px, image débute à 170 px, sans chevauchement.
- Capture navigateur : tools/_shots/mobile-film/browser-admission-v47.png.

Vérifications mobiles émulées sous Chrome, pas de test sur iPhone physique.
