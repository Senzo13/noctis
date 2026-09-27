# NOCTIS — édition studio, septembre 2026

Référence inspectée : `C:/dev/vyro_website`, rendue sur les ports 5181 en 390 et
1440 px. Noctis conserve son atelier automobile sombre, ses photos et son film.

Révision 42, après retour utilisateur : la vidéo 0 est conservée et joue seule,
sans la phrase « Nous ne modifions pas les véhicules », sans jauge et sans
boutons de créations/film. Le titre « L’ordinaire s’arrête ici » prend le relais.
Le film 1 conserve son scroll desktop ; le parcours atelier reste allongé.

La référence précise est `FlavorSlider.jsx` de Vyro : section épinglée,
translation horizontale pilotée par la progression verticale, titre voyageant
avec les images. Une capture à 1440 × 900 et trois positions à la molette ont
confirmé ce comportement (x = 0, −196, −805 px). Noctis reprend ce mécanisme
pour les gestes d’atelier et la collection. La course est calculée depuis la
largeur réelle du contenu, jusqu’au bord de la dernière carte. Les flèches
pilotent la position verticale correspondante ; il n’y a pas de barre horizontale.
Sur mobile et en mouvement réduit, les gestes d’atelier se lisent verticalement.
La collection garde un rail tactile natif, avec boutons.

Le logo blanc du NAS est repris à l’identique, sans filtre, et le crédit est
aligné en bas à droite. Le pack `output/atelier-film/` contient deux keyframes,
une référence de gros plan moteur et le prompt Seedance 2.5. Le zoom moteur
prévoit trois annotations : admission, culasses, pistons et bielles. Les
coordonnées et les intervalles sont éditables ; ils devront suivre le MP4 réel.
Le premier rendu Runway décrit par l’utilisateur n’a pas été fourni au projet :
l’ancien atelier reste actif. Le prompt corrigé supprime la pose de film animé
et précise les accélérations entre détails, freinages et inspections lentes.

| Principe observé chez Vyro | Traduction pour Noctis |
| --- | --- |
| Produit et message immédiatement présents | Hero mobile épuré, voiture entière et titre |
| Traitement média différent selon l'écran | Photographie responsive mobile ; séquence au scroll desktop |
| Grandes ruptures de couleur et de taille | Collection sur papier chaud, détails matière sur charbon |
| Composition qui suit le produit | Trois gestes illustrés et finitions explorables |
| Marque assumée jusque dans la clôture | Signature NOCTIS typographique dans le footer |

Direction retenue : portfolio d'un atelier, précis et tactile. Les alternatives
catalogue technique et cinéma permanent ont été écartées : la première rigidifie
la marque, la seconde est la cause du parcours mobile trop long et obscur.
Les couleurs alimentaires, les rotations et les canettes de Vyro ne sont pas reprises.

Règles : serif contrastée + sans utilitaire, texte net sans halo, noir/ivoire et
accent matière, 44 px minimum pour les contrôles tactiles, photos sans zoom agressif.
Mobile : courte intro de 33 images, sans charger les séquences desktop ; pas de
Lenis ni de section épinglée. En mouvement réduit, l’intro est ignorée. Les finitions utilisent des onglets clavier,
les services des disclosures HTML, la collection un rail natif avec boutons.

Mouvement : le film desktop conserve GSAP ; changements de matière en CSS ; aucun
mouvement décoratif requis pour lire. En mouvement réduit, les contenus sont fixes.
Les nouveautés sont regroupées dans `refinement.css` et `experience.js` ; les
pages HTML et le modèle des pages secondaires chargent ces deux fichiers.

Références complémentaires consultées : [Homepage Scroll — Charles Leclerc](https://www.awwwards.com/inspiration/homepage-scroll-charles-leclerc)
et [Dynamic layout — LUCA DINI](https://www.awwwards.com/inspiration/dynamic-layout-luca-dini).
Le connecteur Awwwards n’était pas disponible ; la vérification du mouvement
s’appuie sur le rendu local de Vyro, sans prétendre avoir audité ces sites externes.

Révision 43 : commandes reprises des composants NevoLabs locaux
`GalleryNavigation` et `SiteBlock` : capsule, boutons blancs, chevrons
Lucide SVG de 18 px, trait 2,6, hover discret, appui et focus clavier.
Les caractères fléchés des deux carrousels et du lien collection sont remplacés.
Licence Lucide conservée dans assets/vendor/lucide-LICENSE.txt.

Révision 44 : intégration effective du paquet npm officiel `lucide@1.48.0`.
`assets/js/icons.js` importe createIcons, ChevronLeft, ChevronRight et ArrowUpRight.
`npm ci` puis `npm run build:icons` reconstruit le bundle local de 3,3 Ko.
Le bundle est livré avec le site statique ; aucun CDN d’icônes n’est nécessaire.
Les tracés SVG des contrôles ne sont plus recopiés dans le HTML.

Révision 45 — vidéo2 livrée et validée intégrée. Montage source préservé,
conversion HDR versSDR pour le web. Titres recalés sur peinture/carbone/moteur,
trajectoires des annotations relevées sur le film. Mobile et mouvement réduit :
lecteur natif sans préchargement MP4 et légendes sous image ; desktop : même
séquence pilotée au scroll.


## Révision 46 — contraste, composition et définition native

Identité, Intention et Cohérence deviennent des compositions éditoriales libres :
titres monumentaux, alignements alternés, photographies pleinement visibles,
lecture sur noir, brun charbon et bordeaux. Le tween des panneaux à 45 %
d’opacité et l’empilement sticky sont supprimés. Le mobile conserve un ordre
titre, image, texte, lien sans masquage. Direction issue de la hiérarchie
typographique et des compositions du projet local Vyro.

Les vidéos 0 et 1 sont réextraites des sources 1080p à 30 images/s natives ;
vidéo 2 directement du ProRes à 24 images/s, toutes en WebP qualité 90.
Les films gardent leur montage et le raccord intro/hero.
Intention → scrubbing précis ; moteur → GSAP ScrollTrigger + Lenis + canvas ;
raison → même signal de défilement pour les deux films, pas de second lissage.
Mouvement réduit → visuel statique et lecteur atelier volontaire.
Risque mémoire → cache borné à 18 images décodées par séquence, hors cache
compressé ; tampon canvas plafonné à la résolution des sources.
