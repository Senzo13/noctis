# NOCTIS — Film atelier installé

Le film Seedance fourni et validé par le client est installé comme vidéo 2,
après la séquence d’ouverture du carré. Les vidéos 0 et 1 sont conservées.

## Source et version web

Source : ProRes HDR 1920 × 1080, 24 images/s, 10,041667 secondes.
L’original reste intact dans le dossier de téléchargement du client.
Version web : H.264, 1080p, 24 images/s, sans audio, faststart,
conversion PQ/BT2020 vers SDR/BT709 avec tone mapping Mobius.
Le montage, les mouvements et la durée du film sont conservés.

Sur desktop, les 241 images natives du film sont extraites directement du ProRes
en WebP qualité 90, en 1920 × 1080 à 24 images/s pour
la lecture pilotée par le scroll. Les textes suivent l’image réellement
présentée, y compris lorsque l’on remonte. La vidéo MP4 complète conserve
la cadence source de 24 images/s. Le cache de décodage conserve au maximum
18 images par séquence ; les autres restent compressées. ScrollTrigger pilote
les deux séquences au scroll, avec Lenis et sans second lissage.

Sur mobile, les trois séquences se suivent au défilement natif : introduction,
hero, puis atelier. La vidéo atelier occupe un cadre mobile plus haut, centré sur la voiture et
le moteur ; les titres et noms des composants occupent une zone dédiée.
En mouvement réduit ou sans JavaScript, le lecteur natif reste disponible ;
le MP4 attend une action de lecture et les légendes suivent le film.

## Textes et composants

Les temps et points ont été examinés sur le film livré, et non sur les
keyframes de préparation. La configuration est dans `timeline.json` :

- 0–0,75 s : entrée dans l’atelier.
- 0,75–2,1 s : peinture et profondeur.
- 2,2–3,6 s : matière carbone.
- 4,05–5,7 s : ouverture et mécanique.
- 6,1–6,9 s : admission.
- 6,9–7,7 s : culasses.
- 7,7–8,55 s : pistons et bielles.
- 9,65–10 s : signature NOCTIS.

Les trajectoires des points sont interpolées depuis plusieurs positions
relevées dans le film. Coordonnées SVG : 1672 × 941. Les grands titres
s’effacent pendant les annotations techniques. Le retour au plan large
reste dégagé avant la signature.

## Références de génération conservées

PROMPT.txt, les deux keyframes et les références restent disponibles.
Réglages employés : Seedance 2.5, mode Keyframe, 10 secondes, 16:9,
1080p, audio désactivé. Les paramètres restent hors du prompt.
Le nouvel aperçu vidéo est celui du fichier réellement livré.

## Réinstaller une autre version

Après révision du montage et de timeline.json :

```powershell
python tools/install_atelier_video.py "C:/chemin/film.mov"
```

L’outil vérifie durée et ratio, convertit en vrai MP4 web, produit un nouveau
dossier de frames et installe les légendes. Il conserve les anciennes
séquences. Les choix de conversion sont centralisés dans cet outil.
