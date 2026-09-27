"""Install the reviewed 10-second Runway film and its scroll captions.

Usage: python tools/install_atelier_video.py path/to/film.mp4
Requires ffmpeg and ffprobe. Review output/atelier-film/timeline.json first.
Existing sequences are preserved; output paths are unique per installation.
"""
from __future__ import annotations

import argparse
from fractions import Fraction
from datetime import datetime
from html import escape
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[1]


def component_svg(timing: dict) -> str:
    """Leader lines use reference-image coordinates, adjustable after render."""
    groups = []
    fps = timing["webFps"]
    for part in timing.get("components", []):
        start, end = math.ceil(part["start"] * fps), math.ceil(part["end"] * fps) - 1
        x, y = part["label"]
        anchors = part.get("anchors", [])
        anchor_from = [anchors[0]["x"], anchors[0]["y"]] if anchors else part["anchorFrom"]
        anchor_to = [anchors[-1]["x"], anchors[-1]["y"]] if anchors else part["anchorTo"]
        ax, ay = anchor_from
        pair = lambda values: ",".join(str(value) for value in values)
        track = f' data-anchor-track="{escape(json.dumps(anchors, separators=(",", ":")), quote=True)}"' if anchors else ''
        groups.append(f'<g data-component-label data-cue="{start},{end}" data-label="{pair(part["label"])}" data-anchor-from="{pair(anchor_from)}" data-anchor-to="{pair(anchor_to)}"{track}><path d="M{x+260} {y+14} H{ax-65} L{ax} {ay}"/><circle cx="{ax}" cy="{ay}" r="4"/><text x="{x}" y="{y}">{escape(part["name"])}</text><text class="component-detail" x="{x}" y="{y+30}">{escape(part["detail"])}</text></g>')
    view_box = " ".join(str(value) for value in timing.get("componentViewBox", [0, 0, 1672, 941]))
    return f'<svg class="component-labels" viewBox="{view_box}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + ''.join(groups) + '</svg>'


def inspect_video(source: Path) -> dict:
    result = subprocess.run([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height,codec_name,pix_fmt,color_space,color_transfer,color_primaries,r_frame_rate:format=duration", "-of", "json", str(source)
    ], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def web_video_filter(stream: dict) -> str:
    """Convert HDR luminance and gamut; do not change framing, timing or speed."""
    if stream.get("color_transfer") in ("smpte2084", "arib-std-b67"):
        return ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
                "tonemap=tonemap=mobius:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,"
                "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=limited")
    return ("scale=in_color_matrix=auto:out_color_matrix=bt709,format=yuv420p,"
            "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=limited")


def encode_web_video(source: Path, destination: Path, stream: dict) -> None:
    """The browser asset is an actual H.264 MP4, never a renamed source file."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-v", "error", "-n", "-i", str(source), "-map", "0:v:0", "-an",
        "-vf", web_video_filter(stream), "-c:v", "libx264", "-preset", "medium",
        "-crf", "18", "-pix_fmt", "yuv420p", "-color_primaries", "bt709",
        "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
        "-movflags", "+faststart", str(destination)
    ], check=True)
    encoded = inspect_video(destination)
    if (encoded["streams"][0]["codec_name"] != "h264" or
            encoded["streams"][0]["pix_fmt"] != "yuv420p" or
            abs(float(encoded["format"]["duration"]) - float(inspect_video(source)["format"]["duration"])) > 0.12):
        raise SystemExit("La conversion web n’a pas conservé le format ou la durée attendus ; site inchangé.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--timeline", type=Path, default=ROOT / "output/atelier-film/timeline.json")
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()
    source = args.source.resolve(strict=True)
    for command in ("ffmpeg", "ffprobe"):
        if not shutil.which(command):
            raise SystemExit(f"{command} absent du PATH")
    timing = json.loads(args.timeline.read_text(encoding="utf-8"))
    duration = float(timing["duration"])
    info = inspect_video(source)
    if abs(float(info["format"]["duration"]) - duration) > 0.12:
        raise SystemExit(f"Le film doit durer {duration:g} secondes ; durée reçue : {info['format']['duration']}.")
    stream = info["streams"][0]
    fps = float(Fraction(stream["r_frame_rate"]))
    timing["webFps"] = fps
    if abs(stream["width"] / stream["height"] - 16 / 9) > 0.015:
        raise SystemExit("Le film desktop doit être au ratio 16:9.")
    if not 1 <= fps <= 60:
        raise SystemExit("La cadence native doit être comprise entre 1 et 60 images/s.")
    previous_end = 0
    for cue in timing["cues"]:
        if not (previous_end <= cue["start"] < cue["end"] <= duration and cue["placement"] in ("tl", "tr", "br")):
            raise SystemExit("Les repères temporels doivent être ordonnés, sans chevauchement, et compris dans le film.")
        previous_end = cue["end"]
    if not 0 <= timing["finaleAt"] <= 1:
        raise SystemExit("finaleAt doit être une fraction comprise entre 0 et 1.")
    previous_end = 0
    view_box = timing.get("componentViewBox", [0, 0, 1672, 941])
    if (len(view_box) != 4 or not all(isinstance(value, (int, float)) and math.isfinite(value) for value in view_box)
            or view_box[2] <= 0 or view_box[3] <= 0):
        raise SystemExit("componentViewBox doit contenir quatre nombres finis et des dimensions positives.")
    for part in timing.get("components", []):
        if not previous_end <= part["start"] < part["end"] <= duration:
            raise SystemExit("Les composants doivent suivre des intervalles ordonnés dans le film.")
        anchors = part.get("anchors", [])
        for key in (("label",) if anchors else ("label", "anchorFrom", "anchorTo")):
            point = part.get(key, [])
            if len(point) != 2 or not all(isinstance(value, (int, float)) and math.isfinite(value) for value in point):
                raise SystemExit("Chaque point doit avoir deux coordonnées numériques finies.")
        if "anchors" in part:
            if not isinstance(anchors, list) or len(anchors) < 2:
                raise SystemExit("anchors doit contenir au moins deux repères {time,x,y}.")
            previous_time = -math.inf
            for anchor in anchors:
                if (not isinstance(anchor, dict) or not all(isinstance(anchor.get(key), (int, float)) and math.isfinite(anchor[key]) for key in ("time", "x", "y"))
                        or not part["start"] <= anchor["time"] <= part["end"] or anchor["time"] <= previous_time):
                    raise SystemExit("Les anchors doivent être des points finis, ordonnés dans l’intervalle du composant.")
                previous_time = anchor["time"]
        previous_end = part["end"]
    if args.check_only:
        print("Film et repères valides ; aucune modification.")
        return

    token = datetime.now().strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:6]
    frames = ROOT / "assets/frames" / f"atelier-v2-{token}"
    frames.mkdir(parents=True, exist_ok=False)
    mp4 = ROOT / "assets/video" / f"atelier-v2-{token}.mp4"
    encode_web_video(source, mp4, stream)
    count = round(float(info["format"]["duration"]) * fps)
    subprocess.run([
        "ffmpeg", "-v", "error", "-i", str(source), "-an", "-vf",
        web_video_filter(stream) + f",fps={fps},scale='min(1920,iw)':-2",
        "-frames:v", str(count), "-c:v", "libwebp",
        "-quality", "90", str(frames / "%03d.webp")
    ], check=True)
    if len(list(frames.glob("*.webp"))) != count:
        raise SystemExit("Nombre d’images incomplet ; le site n’a pas été modifié.")
    relative = frames.relative_to(ROOT).as_posix() + "/"
    html_file = ROOT / "index.html"
    page = html_file.read_text(encoding="utf-8")
    page = re.sub(r'data-frame-base="[^"]+"', f'data-frame-base="{relative}"', page)
    page = re.sub(r'data-frame-count="\d+"', f'data-frame-count="{count}"', page)
    page = re.sub(r' data-frame-fps="[^"]+"', '', page)
    page = page.replace('data-reveal-frame', f'data-reveal-frame data-frame-fps="{fps}"', 1)
    page = re.sub(r' data-finale-at="[^"]+"', '', page)
    page = page.replace('data-reveal-frame', f'data-reveal-frame data-finale-at="{timing["finaleAt"]}"', 1)
    page = re.sub(r'(class="hero__reveal-poster" src=")[^"]+', rf'\g<1>{relative}001.webp', page)
    captions = []
    for cue in timing["cues"]:
        start = math.ceil(cue["start"] * fps)
        end = min(count - 1, math.ceil(cue["end"] * fps) - 1)
        captions.append(f'<span class="reveal__cue reveal__cue--{cue["placement"]}" data-cue="{start},{end}"><small>{escape(cue["label"])}</small>{escape(cue["line1"])}<br><em>{escape(cue["line2"])}</em></span>')
    page, replacements = re.subn(r'(<div class="reveal__captions">).*?(</div>)', lambda m: m[1] + "\n          " + "\n          ".join(captions) + "\n        " + m[2], page, count=1, flags=re.S)
    if replacements != 1:
        raise SystemExit("Zone de sous-titres introuvable ; le site n’a pas été modifié.")
    page = re.sub(r'<svg class="component-labels".*?</svg>\s*', '', page, flags=re.S)
    page = page.replace('<div class="reveal__scrim"', component_svg(timing) + '\n        <div class="reveal__scrim"', 1)
    video_relative = mp4.relative_to(ROOT).as_posix()
    page = re.sub(r'(<video\b[^>]*data-atelier-video[^>]*>)(.*?)(</video>)',
                  lambda match: re.sub(r'poster="[^"]+"', f'poster="{relative}001.webp"', match[1])
                  + f'\n        <source src="{video_relative}" type="video/mp4">\n      ' + match[3], page, flags=re.S)
    args.timeline.write_text(json.dumps(timing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    html_file.write_text(page, encoding="utf-8")
    print(f"Installé : {relative}, {count} images ; MP4 web : {mp4.relative_to(ROOT)} ; original inchangé : {source}")


if __name__ == "__main__":
    main()
