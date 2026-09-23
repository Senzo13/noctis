"""Optimise les photographies générées en WebP, sans recadrage ni agrandissement.

Usage : python tools/build_images.py
Les originaux et prompts sont conservés dans assets/source/generated/.
Ce script ne lit aucune séquence vidéo et ne modifie jamais ses posters.
"""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

def main():
    manifest = json.loads((ROOT / 'assets/source/generated/manifest.json').read_text(encoding='utf-8'))
    total = 0
    for asset in manifest['assets']:
        source = ROOT / asset['source']
        target = ROOT / asset['output']
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as original:
            image = original.convert('RGB')
            image.save(target, 'WEBP', quality=88, method=6)
            small = image.copy()
            small.thumbnail((640, 2000), Image.Resampling.LANCZOS)
            small.save(target.with_name(target.stem + '-640.webp'), 'WEBP', quality=84, method=6)
        total += target.stat().st_size
        print(f'{target.name}: {image.width}x{image.height}, {target.stat().st_size // 1024} Ko')
    print(f'{len(manifest["assets"])} photographies, {total / 1024 / 1024:.2f} Mo (grands formats)')

if __name__ == '__main__':
    main()
