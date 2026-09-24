#!/usr/bin/env python3
"""
make-webp.py — convert the source landmark images into optimised WebP.

Reads  assets/<source>            (the originals, left untouched)
Writes assets/landmarks/<id>.webp (resized, quality-tuned for mobile)

Usage:
    python3 tools/make-webp.py            # convert all
    python3 tools/make-webp.py --width 1200
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required:  pip install --user Pillow")

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "assets"
OUT_DIR = ROOT / "assets" / "landmarks"

# source filename -> table id used in config.js
MAPPING = {
    "france.jpeg": "france",
    "italy.jpeg": "italia",
    "mexico.jpeg": "mexico",
    "jordan.png": "jordan",
    "egypt.png": "egypt",
}


def convert(source: Path, target: Path, max_width: int, quality: int) -> None:
    with Image.open(source) as im:
        im = im.convert("RGB")
        if im.width > max_width:
            ratio = max_width / im.width
            im = im.resize((max_width, round(im.height * ratio)), Image.LANCZOS)
        target.parent.mkdir(parents=True, exist_ok=True)
        im.save(target, "WEBP", quality=quality, method=6)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--width", type=int, default=1200, help="max width in px")
    ap.add_argument("--quality", type=int, default=80, help="WebP quality 1-100")
    args = ap.parse_args()

    missing = []
    for filename, table_id in MAPPING.items():
        source = SRC_DIR / filename
        if not source.exists():
            missing.append(filename)
            continue

        target = OUT_DIR / f"{table_id}.webp"
        convert(source, target, args.width, args.quality)

        before = source.stat().st_size / 1024
        after = target.stat().st_size / 1024
        print(f"{filename:<14} -> landmarks/{table_id}.webp"
              f"   {before:8.0f} KB -> {after:7.0f} KB"
              f"   ({100 - after / before * 100:.0f}% smaller)")

    if missing:
        print("\nMissing source images (skipped): " + ", ".join(missing), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
