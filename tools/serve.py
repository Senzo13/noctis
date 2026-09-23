"""Serveur de développement local pour le site NOCTIS.

Corrige deux limites de `python -m http.server` qui font croire à des bugs :

  * il n'envoie aucun en-tête de cache -> Chrome applique un cache heuristique
    (basé sur Last-Modified) et peut resservir un HTML/CSS/JS périmé pendant
    plusieurs minutes sans revalider ;
  * il ne gère pas les requêtes HTTP Range -> utile surtout si vous remettez
    des vidéos <video> sur le site.

Usage : python tools/serve.py [port]        (port par défaut : 5180)
"""

from __future__ import annotations

import http.server
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5180


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        # aucun cache : on travaille sur les fichiers en direct
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def do_GET(self) -> None:  # noqa: N802
        range_header = self.headers.get("Range")
        if not range_header:
            return super().do_GET()

        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().do_GET()

        try:
            file = open(path, "rb")
        except OSError:
            self.send_error(404, "Fichier introuvable")
            return

        try:
            size = os.fstat(file.fileno()).st_size
            match = re.match(r"bytes=(\d*)-(\d*)", range_header)
            if not match:
                self.send_error(400, "Requête Range invalide")
                return
            start = int(match.group(1)) if match.group(1) else 0
            end = int(match.group(2)) if match.group(2) else size - 1
            end = min(end, size - 1)
            if start > end:
                self.send_error(416, "Plage non satisfaisable")
                return

            self.send_response(206)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(end - start + 1))
            self.end_headers()

            file.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk = file.read(min(65536, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)
        finally:
            file.close()

    def log_message(self, fmt: str, *args) -> None:
        if "200" in fmt % args or "206" in fmt % args:
            return  # on n'affiche que les erreurs
        super().log_message(fmt, *args)


def main() -> None:
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as server:
        print(f"NOCTIS — http://127.0.0.1:{PORT}/  (Ctrl+C pour arrêter)")
        server.serve_forever()


if __name__ == "__main__":
    main()
