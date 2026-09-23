"""Derive NOCTIS site assets from the client hero composite PNG.

Input : the composite image (3 cars + burned-in header / title / subtitle)
Output: clean hero plate + crops used across the site (assets/img/*)

Usage: python tools/derive_assets.py [source.png]
       (par défaut : assets/source/hero-composite.png)
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
IMG_DIR = ROOT / "assets" / "img"

# Regions of the composite that contain burned-in interface text.
HEADER_BAND = (0, 0, 1672, 135)  # socials, logo, "NAVIGUER" + burger
TITLE_BAND = (452, 128, 1228, 398)  # "Pour ceux qui refusent l'ordinaire"
SUBTITLE_BAND = (538, 756, 1152, 858)  # "Un atelier automobile de luxe..."
BLACK_SOURCE = (60, 180, 400, 330)  # clean black background used to rebuild the bands

TEXT_THRESHOLD = 15


def _dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    out = mask.copy()
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            out |= np.roll(np.roll(mask, dy, axis=0), dx, axis=1)
    return out


def mirrored_tile(patch: np.ndarray, height: int, width: int) -> np.ndarray:
    """Tile a patch with mirrored repeats so the seams stay invisible."""
    ph, pw = patch.shape[:2]
    rows = []
    while sum(r.shape[0] for r in rows) < height:
        rows.append(patch if len(rows) % 2 == 0 else patch[::-1])
    stacked = np.concatenate(rows, axis=0)[:height]
    cols = []
    while sum(c.shape[1] for c in cols) < width:
        cols.append(stacked if len(cols) % 2 == 0 else stacked[:, ::-1])
    return np.concatenate(cols, axis=1)[:, :width]


def black_out_text(im: Image.Image, box: tuple[int, int, int, int], source: tuple[int, int, int, int]) -> None:
    """Clear burned-in UI text sitting on pure black (header, hero title).

    Both bands are plain black behind the glyphs (verified by pixel scan). The
    fill reuses real black background pixels so the film grain stays identical.
    """
    left, top, right, bottom = box
    patch = np.asarray(im.crop(source).convert("RGB"))
    fill = mirrored_tile(patch, bottom - top, right - left)
    im.paste(Image.fromarray(fill), (left, top))


def heal_band(im: Image.Image, box: tuple[int, int, int, int], threshold: int = 42, window: int = 41) -> None:
    """Erase text over the wet floor using a tiny patch-match from clean floor pixels."""
    left, top, right, bottom = box
    region = np.asarray(im.crop(box)).astype(np.float32)
    mask = _dilate(region.mean(axis=2) > threshold, 2)

    filled = region.copy()
    pending = mask.copy()
    for shift in (173, -173, 311, -311, 487, -487, 97, -97):
        cand = np.roll(region, shift, axis=1)
        cand_ok = ~np.roll(mask, shift, axis=1)
        take = pending & cand_ok
        filled[take] = cand[take]
        pending &= ~take
    if pending.any():  # fall back to the local median
        blur = np.asarray(
            im.crop(box).filter(ImageFilter.MedianFilter(size=window)).convert("RGB")
        ).astype(np.float32)
        filled[pending] = blur[pending]

    out = Image.fromarray(np.clip(filled, 0, 255).astype(np.uint8))
    # soften only the patched pixels so the seam disappears
    soft = out.filter(ImageFilter.GaussianBlur(1.4))
    mask_img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    im.paste(Image.composite(soft, out, mask_img), (left, top))


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "assets" / "source" / "hero-composite.png"
    im = Image.open(src).convert("RGB")
    IMG_DIR.mkdir(parents=True, exist_ok=True)

    # 1. clean plate -------------------------------------------------------
    plate = im.copy()
    black_out_text(plate, HEADER_BAND, BLACK_SOURCE)
    black_out_text(plate, TITLE_BAND, BLACK_SOURCE)
    heal_band(plate, SUBTITLE_BAND)
    plate = plate.resize((1920, 1080), Image.LANCZOS)
    plate.save(IMG_DIR / "hero-plate.jpg", quality=90, optimize=True)
    # image de départ à utiliser dans Leonardo (image -> vidéo)
    (ROOT / "assets" / "video").mkdir(parents=True, exist_ok=True)
    plate.save(ROOT / "assets" / "video" / "hero-start-frame.jpg", quality=90, optimize=True)

    # 2. crops -------------------------------------------------------------
    def save(name: str, box: tuple[int, int, int, int], size: tuple[int, int], quality: int = 88) -> None:
        crop = im.crop(box)
        # crop box comes from the clean plate space
        crop = plate.crop(
            (
                int(box[0] * 1920 / 1672),
                int(box[1] * 1080 / 941),
                int(box[2] * 1920 / 1672),
                int(box[3] * 1080 / 941),
            )
        )
        crop.resize(size, Image.LANCZOS).save(IMG_DIR / name, quality=quality, optimize=True)

    save("car-left.jpg", (30, 330, 530, 830), (900, 900))
    save("car-center.jpg", (560, 400, 1110, 830), (1000, 780))
    save("car-right.jpg", (1140, 350, 1650, 830), (900, 850))
    save("build-1.jpg", (30, 320, 530, 860), (800, 1000))
    save("build-2.jpg", (560, 390, 1110, 870), (800, 1000))
    save("build-3.jpg", (1140, 340, 1650, 880), (800, 1000))
    save("detail-red.jpg", (830, 430, 1120, 660), (900, 715))
    save("detail-grille.jpg", (1220, 470, 1600, 640), (950, 425))
    save("detail-light.jpg", (60, 430, 500, 600), (880, 340))
    save("floor-texture.jpg", (520, 700, 1160, 940), (1400, 525))

    print("assets written to", IMG_DIR)


if __name__ == "__main__":
    main()
