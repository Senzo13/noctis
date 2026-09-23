# Vidéos

Déposez ici les vidéos sources du site (voir README principal, §4 bis). Elles ne sont
**jamais jouées par un `<video>`** : elles sont découpées en séquences d'images
(`assets/frames/…`) par `python tools/build_frames.py`.

- `intro.mp4` — **intro du site (vidéo 0)**, 2,2 s, 1920×1080. C'est un plan à part : il joue
  à chaque arrivée sur la page d'accueil, puis laisse la main au rush.
- `hero.mp4` — rush du hero (vidéo 1), 8 s, 1920×1080 (et `hero-mobile.mp4` en 1080×1920).
  Le rush démarre à l'image 19 (`HERO_START` dans `main.js`), mesurée comme le raccord exact
  avec la dernière image de l'intro.
- `atelier.mp4` — vidéo 2, l'atelier, 8 s, 1920×1080.

`hero-start-frame.jpg` est l'image de départ à utiliser dans Leonardo (image → vidéo) :
c'est la maquette client avec le texte incrusté retiré.

Tant que les fichiers `*.mp4` sont absents, le site affiche automatiquement les images
de repli : rien ne casse, aucune erreur visible pour le visiteur.
