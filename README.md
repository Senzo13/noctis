# NOCTIS — site vitrine (clone français)

Site statique multi-pages, en français, construit à partir de la maquette fournie
(`assets/source/hero-composite.png`) et du site de référence `forgeautomotive.co.uk`.

Thème sombre éditorial, typographie serif pour les titres, animations au défilement
(GSAP + ScrollTrigger + Lenis), vidéos pilotées par le scroll.

---

## 1. Lancer le site en local

Les fichiers sont statiques : un simple serveur local suffit (les vidéos et les
animations ne se chargent pas correctement en `file://`).

```powershell
cd C:\dev\noctis
python -m http.server 5173
# puis ouvrir http://localhost:5173
```

Alternative : `npx serve .`

## 2. Déployer

Le site n'a aucune étape de build. Deux options immédiates :

- **Netlify / Vercel** : glisser-déposer le dossier, ou connecter le dépôt GitHub
  `Senzo13/noctis` (aucune commande de build, répertoire de publication = racine).
- **GitHub Pages** : activer Pages sur la branche `main` (racine).

Avant la mise en ligne, remplacez le domaine `https://noctis.fr/` par le domaine
réel dans les balises `canonical` / `og:` de chaque page et dans `sitemap.xml`.

## 3. Structure

```
index.html              Accueil (hero + séquence vidéo 2, services, réalisations, stock, CTA)
realisations.html       Grille des réalisations
stock.html              Véhicules disponibles
contact.html            Formulaire de contact
cookies.html            Politique cookies
confidentialite.html    Politique de confidentialité (RGPD)
conditions.html         Conditions générales
robots.txt / sitemap.xml
assets/css/style.css    Design system complet (thème, composants, responsive)
assets/js/main.js       Animations, menu, vidéos, formulaire, cookies
assets/img/*            Visuels dérivés de la maquette
assets/video/*          Emplacements des vidéos (hero + atelier)
assets/source/*         Image source fournie par le client
tools/*                 Scripts utilitaires (dérivation d'images, capture QA)
```

## 4. Le rush du hero : 2.5D intégré (et vidéo en option)

Le hero n'a **pas besoin de vidéo pour fonctionner**. Comme le site de référence (qui
décode une séquence image + carte de profondeur en WebGL), le site fait avancer la
caméra vers la voiture centrale directement dans le navigateur :

- `assets/img/hero-depth.png` — carte de profondeur approximative du plateau
  (générée par `tools/make_depth.py`).
- `assets/js/main.js` — shader WebGL : au défilement, les zones proches grandissent
  plus vite que les zones lointaines, les voitures latérales s'écartent, la voiture
  centrale remplit le cadre, puis le texte apparaît.
- Réglage de puissance : `MAX_AMOUNT` (dans `main.js`, 0.68 par défaut).

Ordre de priorité des couches du hero :

1. `assets/video/hero.mp4` s'il existe (rush filmé, piloté par le scroll) ;
2. sinon le rendu 2.5D WebGL (par défaut, aucun fichier à produire) ;
3. sinon l'image fixe `hero-plate.jpg` (si WebGL est indisponible).

## 4 bis. Les deux vidéos (optionnelles, avec Leonardo)

**Les deux vidéos sont jouées image par image, pas par un `<video>`.** Elles sont
converties en **séquences d'images** (`assets/frames/…`, 120 images WebP chacune, une image
sur deux des 240 images sources) et dessinées dans un `<canvas>` selon la position de
défilement.

> **Pourquoi ?** Un navigateur ne déplace `currentTime` que quelques fois par seconde : le
> pipeline « seek + décodage + composition » plafonne, donc un scrub vidéo avance par
> paquets (on voit des sauts de 10 images), et c'est pire encore sur un fichier dont les
> images clés sont rares (`atelier.mp4` n'en a qu'une). Une image déjà chargée, elle,
> s'affiche instantanément : c'est la technique des séquences d'images utilisée par les
> pages « scroll video » (Apple, AirPods). Elle a un second avantage : plus rien ne se
> décode pendant le défilement (mesure : au plus **1 image de séquence d'écart** entre deux
> images affichées, sur les deux vidéos).

**Vidéo 1 — le rush du hero.** Ses images suivent le premier écran de défilement du hero :
le travelling avant est contrôlé au doigt.

**Vidéo 2 — l'atelier.** Elle se déclenche à la fin du rush, quand la phrase manifeste est
affichée. La séquence (celle du site officiel) est **épinglée dans le hero**, donc la page
ne descend pas plus bas tant qu'elle n'est pas terminée :

1. la **dernière image de la vidéo 1 reste affichée** pendant tout le rush, puis elle se
   dissout lentement (presque un écran de défilement) dans le fond texture noir, sous la
   phrase manifeste qui, elle, ne bouge pas ;
2. **tant qu'on ne continue pas à défiler, il ne se passe rien de plus** ;
3. un carré **minuscule** apparaît alors au centre de l'écran et laisse voir la vidéo 2 ;
4. ce carré grandit au défilement jusqu'à occuper **tout l'écran** — les images de la
   vidéo 2 avancent avec l'ouverture — puis la page reprend sa course.

La séquence est **élastique** : si le défilement s'arrête, le carré se referme tout seul et
les images de la vidéo 2 repartent de la première ; si on remonte le site, toute la
séquence repart en arrière (le carré se referme, le fond texture s'efface et la dernière
image de la vidéo 1 revient). Une fois le carré plein écran, en revanche, il reste en place
le temps de parcourir les images au défilement.

Les trois réglages de cette chorégraphie sont en haut de `initRevealSequence()` dans
`assets/js/main.js` : `DISSOLVE_FROM`/`DISSOLVE_TO` (lenteur du fondu, en écrans parcourus),
`SQUARE_IN`/`SQUARE_SEEN` (apparition du carré) et `OPEN_START`/`OPEN_END` (ouverture), plus
`IDLE_AFTER`/`IDLE_TAU` (délai et vitesse de la fermeture automatique).

> **Ne jamais toucher à la mise en page pendant le rush.** La séquence tourne à côté du
> scrub de la vidéo 1 : elle lit uniquement `window.pageYOffset` (position mise en cache au
> chargement, jamais de `getBoundingClientRect` en cours de route), n'écrit une propriété
> que lorsque sa valeur change, et ses couches (fond texture + carré) restent en
> permanence dans la composition. C'est ce qui garantit que la vidéo 1 reste fluide, et
> que le fondu lui-même ne décroche pas. `?reveal=0` coupe la séquence, pour comparer.

Deux pièges de rendu ont été mesurés puis supprimés (ils coûtaient ~90 ms au premier
affichage du fondu, soit une bonne dizaine d'images perdues) :

- le fond texture était dessiné avec un **filtre CSS** (`grayscale/brightness/contrast`) et
  un **grain SVG en `mix-blend-mode: screen`** : tout est désormais **incrusté une fois pour
  toutes** dans `assets/img/noir-texture.jpg` (généré avec `ffmpeg` depuis
  `floor-texture.jpg`) ;
- la vidéo 2 n'était **peinte qu'au moment du fondu** (son premier rendu = décodage +
  upload de la première image, d'où le décrochage) : sa fenêtre minuscule reste maintenant
  peinte en permanence (opacité 0 pendant le rush) et ses images se chargent dès le milieu
  du rush, donc elle est déjà prête quand le fondu commence.

### Regénérer les séquences d'images

```powershell
python tools/build_frames.py     # à relancer après avoir remplacé une vidéo source
```

Les fichiers `assets/video/*.mp4` ne sont plus chargés par le site : ce sont les
**sources** des séquences (et la variante verticale `hero-mobile.mp4` sert à la séquence
`assets/frames/hero-mobile/` utilisée sur mobile).

> Pourquoi la vidéo 2 n'est pas scrubée comme la première ? Un scrub image par image
> n'est fluide que si **chaque image est une image clé**. `atelier.mp4` n'en contient
> qu'une (en-tête) : chaque déplacement de `currentTime` obligeait le navigateur à
> redécoder le plan depuis le début, d'où les saccades. Seule la découpe du carré
> (un `clip-path`, aucune retouche de la vidéo) suit ici le défilement.

Deux fichiers sont attendus :

| Fichier | Rôle | Format | Durée |
|---|---|---|---|
| `assets/video/hero.mp4` | Rush du hero (les 3 voitures), **scrubé** | 1920×1080 (16:9) + variante 1080×1920 | **8 s** (10 s max) |
| `assets/video/atelier.mp4` | Séquence vidéo 2 (le carré qui s'ouvre), **lue** | 1920×1080 ou 1280×720 | 8 s |

*Durée hero : entre 5 s et 8 s, tout fonctionne — ce qui compte est un mouvement linéaire
et continu. La vidéo 1 est parcourue sur 100vh de défilement, soit ~900 px sur un écran de
1440×900 : à 8 s et 25 fps cela fait 4,5 px de scroll par image, donc un scrub parfaitement
fluide. La vidéo 2, elle, n'a aucune contrainte de découpage : elle est simplement lue.*

Tant que les fichiers sont absents, l'effet 2.5D prend le relais — le site est complet et
présentable dès maintenant, sans aucune vidéo.

### Prompt vidéo 1 — hero : le rush dans les voitures

Génération **image → vidéo** à partir de `assets/video/hero-start-frame.jpg`.
Le mouvement doit être un **travelling avant rapide et continu** : la caméra part du plan
large, fonce entre les voitures et termine collée à la voiture centrale, dans le noir —
c'est là que le texte « Nous ne modifions pas les véhicules » apparaît.
Durée : **5 s par génération** (deux générations enchaînées donnent 10 s, voir plus bas).

**Piège à éviter** : les verbes « charges / drives / accelerating » font bouger *les
voitures* dans la plupart des modèles. Il faut formuler **uniquement le mouvement de
caméra** et affirmer que les voitures sont immobiles.

> Camera-only push-in. The three cars are parked and completely motionless, like a
> photograph — they never move, their wheels never turn, nothing about them changes. The
> camera is what travels: it flies forward from a wide shot, low over the wet black
> asphalt, straight between the two side cars, and keeps advancing until the lens is
> almost touching the centre car's front grille and headlights, ending in near-blackness
> against the bodywork. One single continuous camera move, fast and constant, never
> slowing down; no cuts, no rotation, no zoom-out, no camera shake. Perspective changes
> only because the camera gets closer to the parked cars. Wet reflections streak past the
> lens, faint volumetric haze, rim light flaring as the lens passes the headlights.
> Photorealistic, wide-angle automotive advertising look, shallow depth of field. The
> final second ends on a dark close-up of the car body so title text can be overlaid.

Négatif (champ « negative prompt » si dispo) :

> cars moving, vehicles driving, wheels rotating, engines running, subjects in motion,
> morphing, deformation, people, text, logo, watermark

Réglages Leonardo conseillés : Camera Motion = **Zoom In / Forward** (intensité haute),
Motion Strength **moyenne** — monter la force de mouvement fait bouger les voitures plutôt
que la caméra, 16:9, 5 s, pas de boucle.

### Enchaîner deux plans pour un trajet plus long

Leonardo ne tient pas un trajet très long sur une seule génération : générez deux clips
et prenez la **dernière image du clip 1** comme image de départ du clip 2 (Leonardo permet
d'exporter la dernière frame). Clip 2 : *« continue the same forward rush, camera now
inside the car, pushing through the windscreen into the dark cockpit, reflections on the
glass, ending in total darkness »*.

Puis assemblez les deux, avec une image clé par image pour garder le scrub fluide :

```bash
printf "file 'clip1.mp4'\nfile 'clip2.mp4'\n" > liste.txt
ffmpeg -f concat -safe 0 -i liste.txt -an -c:v libx264 -pix_fmt yuv420p \
  -g 1 -keyint_min 1 -sc_threshold 0 -crf 20 -movflags +faststart \
  assets/video/hero.mp4
```

### Prompt vidéo 2 — atelier

> Dark luxury automotive atelier, slow cinematic macro shots: gloved hands applying
> paint protection film on a black car body, polishing a deep red paintwork, carbon fibre
> detail, soft directional studio light, dust-free workshop, shallow depth of field.
> Slow steady camera movement, no cuts, no faces, no text, no logo, photorealistic,
> moody dark automotive advertising look.

### Encoder pour un scroll parfaitement fluide

Un scrub image par image n'est fluide que si **chaque image est une image clé**.
Commande ffmpeg recommandée (à lancer sur le fichier exporté par Leonardo) :

```bash
ffmpeg -i source.mp4 -an -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -g 1 -keyint_min 1 -sc_threshold 0 -crf 20 -movflags +faststart \
  assets/video/hero.mp4
```

Variante mobile (recadrage vertical) :

```bash
ffmpeg -i source.mp4 -an -vf "crop=ih*9/16:ih,scale=1080:1920" -c:v libx264 \
  -pix_fmt yuv420p -g 1 -keyint_min 1 -sc_threshold 0 -crf 20 \
  -movflags +faststart assets/video/hero-mobile.mp4
```

## 5. Remplacer les visuels

Tous les visuels actuels sont **dérivés de la maquette fournie** (recadrages des
voitures). Pour un rendu définitif, déposez vos propres photos dans `assets/img/`
en conservant les noms de fichiers :

| Fichier | Emplacement | Cadrage conseillé |
|---|---|---|
| `hero-plate.jpg` | Hero, sections réalisations et CTA | 16:9, 1920×1080 |
| `car-left.jpg`, `car-center.jpg`, `car-right.jpg` | Panneaux, galerie, cartes | 4:3 ou 4:5 |
| `build-1.jpg`, `build-2.jpg`, `build-3.jpg` | Rail « L'ordinaire s'arrête ici », cartes | 4:5 portrait |
| `detail-red.jpg`, `detail-grille.jpg`, `detail-light.jpg` | Détails atelier, bandeaux | paysage |
| `floor-texture.jpg` | Fonds de section | paysage |
| `noir-texture.jpg` | Fond texture noir de la vidéo 2 (**déjà filtré + grain incrusté**, ne pas réappliquer de filtre CSS dessus) | 16:9, ~1440 px de large |

Pour régénérer automatiquement les visuels à partir d'une nouvelle image composite
(avec le texte incrusté retiré) :

```powershell
python tools/derive_assets.py "chemin\vers\image.png"
```

## 6. À compléter avant la mise en ligne

- [ ] Adresse e-mail de contact réelle (`contact@noctis.fr` est un exemple) — présente
      dans le pied de page, le menu et `contact.html`.
- [ ] Numéro de téléphone si vous souhaitez l'afficher dans l'en-tête.
- [ ] Liens des réseaux sociaux (LinkedIn, Instagram, Facebook) : actuellement `#`.
- [ ] Domaine dans les `canonical`, `og:image`, `robots.txt` et `sitemap.xml`.
- [ ] Brancher le formulaire : il affiche une confirmation côté navigateur ; pour
      recevoir les demandes, connectez-le à Netlify Forms, Formspree ou un endpoint
      maison (`<form action="...">` dans `contact.html`).
- [ ] Faire relire les pages légales (cookies, confidentialité, conditions) par un
      conseil juridique — les textes fournis sont des bases à adapter.
- [ ] Remplacer les visuels provisoires par vos photos (voir §5).

## 7. Outils

```powershell
python tools/derive_assets.py <image.png>   # visuels du site à partir de la maquette
python tools/build_pages.py                 # regénère contact.html + pages légales
node tools/shoot.cjs                        # captures QA (desktop + mobile)
node tools/shoot-hero.cjs                   # captures QA de la séquence du hero
node tools/shoot-atelier.cjs                # captures QA de la vidéo 2 (carré + fluidité)
```

Les captures nécessitent Playwright et Chrome ; `build_pages.py` réécrit les pages
concernées, donc ne lancez ces scripts que si vous acceptez de régénérer ces fichiers.

## 8. Notes techniques

- **Animations** : GSAP 3.13 + ScrollTrigger + Lenis 1.1.20 (fichiers locaux dans
  `assets/vendor/`). Lenis lisse l'entrée du défilement : sans lui, un cran de molette
  fait avancer la vidéo 1 de ~26 images d'un coup (le scrub « saute »), alors qu'avec lui
  c'est réparti image par image (max mesuré : 4). Si un fichier manque, le site reste
  entièrement lisible et navigable (aucun contenu masqué).
- **Réglages de test** : `?reveal=0` coupe la séquence vidéo 2, `?lenis=0` coupe le
  défilement lissé, `?debug=1` affiche le panneau de diagnostic.
- **Accessibilité** : lien d'évitement, focus visibles, alternatives textuelles,
  respect de `prefers-reduced-motion` (les vidéos pilotées par le scroll sont
  neutralisées et le contenu s'affiche normalement).
- **SEO** : balises `title`/`description` par page, Open Graph, `robots.txt`,
  `sitemap.xml`, structure de titres hiérarchisée.
- **Poids** : aucune dépendance de build ; polices Google Fonts (Geist + Playfair
  Display), images en JPEG optimisé.
