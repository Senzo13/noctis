"""Prepare le logo NevoLabs en blanc pour le credit de pied de page de NOCTIS.

La source fournie est un PNG sombre (bleu nuit) avec transparence : on garde
le dessin (canal alpha, donc les bords lisses) et on passe l'encre en blanc.

Usage : python tools/build_nevolabs.py <source.png>
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image


def main() -> None:
    source = Path(sys.argv[1])
    sortie = Path(__file__).resolve().parents[1] / "assets" / "img" / "nevolabs-blanc.png"

    image = Image.open(source).convert("RGBA")
    donnees = np.asarray(image).astype(np.uint8).copy()

    # encre blanche, dessin inchangé (l'alpha porte la forme et l'antialiasing)
    donnees[..., 0] = 255
    donnees[..., 1] = 255
    donnees[..., 2] = 255

    # recadrage serré sur le dessin
    alpha = donnees[..., 3]
    lignes, colonnes = np.where(alpha > 4)
    marge = 1
    haut = max(0, lignes.min() - marge)
    bas = min(donnees.shape[0], lignes.max() + 1 + marge)
    gauche = max(0, colonnes.min() - marge)
    droite = min(donnees.shape[1], colonnes.max() + 1 + marge)
    donnees = donnees[haut:bas, gauche:droite]

    resultat = Image.fromarray(donnees, "RGBA")
    resultat.save(sortie)
    print(sortie, resultat.size)

    # contrôle visuel : le logo posé sur le noir du site
    fond = Image.new("RGBA", (resultat.width + 64, resultat.height + 48), (12, 12, 12, 255))
    fond.alpha_composite(resultat, (32, 24))
    apercu = Path(__file__).resolve().parent / "_shots" / "nevolabs-apercu.png"
    apercu.parent.mkdir(parents=True, exist_ok=True)
    fond.convert("RGB").resize((fond.width * 2, fond.height * 2), Image.LANCZOS).save(apercu)
    print(apercu)


if __name__ == "__main__":
    main()
