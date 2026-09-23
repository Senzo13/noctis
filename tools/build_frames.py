"""Découpe les vidéos sources en séquences d'images pour le scrub au défilement.

Le site ne joue pas ses vidéos avec un <video> : il dessine des images
préchargées dans un <canvas> (voir README §4 bis). Cette commande régénère
ces images à partir de assets/video/*.mp4, après avoir remplacé une vidéo.

Usage : python tools/build_frames.py
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# (source, dossier de sortie, largeur cible, qualité WebP, pas, filtre optionnel)
# `pas` = on garde une image sur deux : 240 images à 30 fps → 120 images
# (15 images par seconde, largement suffisant pour un scrub au défilement).
SEQUENCES = [
    ("assets/video/hero.mp4", "assets/frames/hero", 1920, 80, 2, None),
    ("assets/video/hero.mp4", "assets/frames/hero-mobile", 720, 80, 2, "crop=ih*9/16:ih"),
    ("assets/video/atelier.mp4", "assets/frames/atelier", 1280, 58, 2, None),
]


def main() -> int:
    if shutil.which("ffmpeg") is None:
        print("ffmpeg est introuvable dans le PATH.", file=sys.stderr)
        return 1

    for source, cible, largeur, qualite, pas, extra in SEQUENCES:
        entree = ROOT / source
        sortie = ROOT / cible
        if not entree.exists():
            print(f"· {source} absent — séquence ignorée")
            continue
        sortie.mkdir(parents=True, exist_ok=True)
        for ancienne in sortie.glob("*.webp"):
            ancienne.unlink()
        filtre = f"select=not(mod(n\\,{pas}))"
        if extra:
            filtre = f"{filtre},{extra}"
        filtre = f"{filtre},scale={largeur}:-2"
        subprocess.run(
            [
                "ffmpeg",
                "-v", "error",
                "-y",
                "-i", str(entree),
                "-vf", filtre,
                "-vsync", "0",
                "-c:v", "libwebp",
                "-quality", str(qualite),
                str(sortie / "%03d.webp"),
            ],
            check=True,
        )
        images = sorted(sortie.glob("*.webp"))
        poids = sum(image.stat().st_size for image in images) / 1024
        print(f"· {cible} : {len(images)} images · {poids:.0f} Ko")

    print("Pensez à incrémenter ?v= des scripts dans les pages HTML (cache).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
