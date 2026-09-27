"""Extract the reviewed portrait film at native 1080x1920 / 24fps.

Media only: does not edit page markup, captions or JavaScript.
Usage: python tools/install_atelier_mobile_media.py path/to/source.mp4
Existing output directories/files are never overwritten.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from fractions import Fraction
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def probe(source: Path) -> dict:
    return json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height,r_frame_rate,nb_frames,color_space,color_transfer,color_primaries:format=duration",
        "-of", "json", str(source),
    ]))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--tag", default="20260927")
    args = parser.parse_args()
    if not args.tag.replace("-", "").isalnum():
        parser.error("--tag must contain only letters, numbers or hyphens")
    source = args.source.resolve(strict=True)
    metadata = probe(source)
    stream = metadata["streams"][0]
    if (stream["width"], stream["height"], Fraction(stream["r_frame_rate"])) != (1080, 1920, Fraction(24)):
        parser.error("Expected the reviewed native 1080x1920 24fps source")
    if stream.get("color_transfer") != "bt709":
        parser.error("Expected SDR BT.709; review color conversion for this source")
    frames = ROOT / "assets/frames" / f"atelier-mobile-1080p24-{args.tag}"
    video = ROOT / "assets/video" / f"atelier-mobile-{args.tag}.mp4"
    if frames.exists() or video.exists():
        parser.error("Output already exists; choose a fresh --tag to preserve existing media")
    frames.mkdir(parents=True)
    frame_cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-n", "-i", str(source),
                 "-map", "0:v:0", "-an", "-fps_mode", "passthrough", "-c:v", "libwebp",
                 "-quality", "90", "-compression_level", "4", "-threads", "2", str(frames / "%03d.webp")]
    video_cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-n", "-i", str(source),
                 "-map", "0:v:0", "-an", "-fps_mode", "passthrough", "-c:v", "libx264",
                 "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-threads", "4",
                 "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                 "-movflags", "+faststart", str(video)]
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(subprocess.run, cmd, check=True) for cmd in (frame_cmd, video_cmd)]
        for future in futures:
            future.result()
    images = sorted(frames.glob("*.webp"))
    assert len(images) == int(stream["nb_frames"]), "Unexpected extracted frame count"
    assert int(probe(video)["streams"][0]["nb_frames"]) == len(images), "Video frame count changed"
    result = {
        "source": str(source), "sourceMetadata": metadata, "fps": 24,
        "frameDirectory": str(frames.relative_to(ROOT)).replace("\\", "/") + "/",
        "frameCount": len(images), "frameBytes": sum(image.stat().st_size for image in images),
        "width": 1080, "height": 1920, "webpQuality": 90,
        "video": str(video.relative_to(ROOT)).replace("\\", "/"), "videoBytes": video.stat().st_size,
    }
    report_dir = ROOT / "tools/_frames/atelier-mobile-review"
    report_dir.mkdir(parents=True, exist_ok=True)
    (report_dir / f"media-{args.tag}.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
