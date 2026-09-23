"""Construit une carte de profondeur approximative du visuel hero.

Le site s'en sert pour un effet 2.5D : au défilement, la caméra « fonce » vers la
voiture centrale (les zones proches grandissent plus vite que les zones lointaines),
exactement comme la séquence vidéo décalée du site de référence.

Usage : python tools/make_depth.py
Sortie : assets/img/hero-depth.png  (niveaux de gris, blanc = proche)
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 1920, 1080

# Géométrie du plateau (repère 1920x1080, déduit de la maquette) :
# les trois voitures de face sur un sol mouillé.
CARS = [
    {"cx": 320, "hw": 300, "top": 379, "bottom": 930, "d_top": 0.42, "d_bottom": 0.70},
    {"cx": 958, "hw": 335, "top": 455, "bottom": 945, "d_top": 0.58, "d_bottom": 1.00},
    {"cx": 1600, "hw": 305, "top": 400, "bottom": 930, "d_top": 0.42, "d_bottom": 0.70},
]
FLOOR_START = 790  # ligne où commencent les reflets du sol


def smoothstep(edge0: float, edge1: float, value: np.ndarray) -> np.ndarray:
    t = np.clip((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def main() -> None:
    ys, xs = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)

    # fond : lointain, puis le sol qui se rapproche vers le bas du cadre
    floor = np.where(
        ys >= FLOOR_START,
        0.35 + 0.60 * (ys - FLOOR_START) / (HEIGHT - FLOOR_START),
        0.05 + 0.28 * (ys / FLOOR_START),
    )
    depth = floor.astype(np.float32)

    for car in CARS:
        cy = (car["top"] + car["bottom"]) / 2
        hh = (car["bottom"] - car["top"]) / 2
        radius = np.sqrt(((xs - car["cx"]) / car["hw"]) ** 2 + ((ys - cy) / hh) ** 2)
        mask = np.clip((1.08 - radius) / 0.28, 0.0, 1.0)
        vertical = np.clip((ys - car["top"]) / (car["bottom"] - car["top"]), 0.0, 1.0)
        car_depth = car["d_top"] + (car["d_bottom"] - car["d_top"]) * vertical
        depth = np.maximum(depth, mask * car_depth)

    depth = np.clip(depth, 0.0, 1.0)
    image = Image.fromarray((depth * 255).astype(np.uint8), mode="L")
    image = image.filter(ImageFilter.GaussianBlur(6))
    image.save(ROOT / "assets" / "img" / "hero-depth.png", optimize=True)
    print("écrit : assets/img/hero-depth.png")


if __name__ == "__main__":
    main()
