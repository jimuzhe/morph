#!/usr/bin/env python3
"""Generate Morph icons from plugin-icon-source.png (512px master)."""

from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ICON_SRC = ROOT / "icons" / "plugin-icon-source.png"
CORNER_RADIUS_RATIO = 0.22
MASTER_SIZE = 512


def apply_rounded_corners(img: Image.Image, radius_ratio: float = CORNER_RADIUS_RATIO) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    radius = max(2, round(min(w, h) * radius_ratio))

    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def build_master() -> Image.Image:
    if not ICON_SRC.exists():
        raise SystemExit(f"Missing icon source: {ICON_SRC}")

    master = apply_rounded_corners(Image.open(ICON_SRC))
    if master.size != (MASTER_SIZE, MASTER_SIZE):
        master = master.resize((MASTER_SIZE, MASTER_SIZE), Image.Resampling.LANCZOS)

    master.save(ROOT / "icons" / "icon-master.png")
    return master


def save_resized(src: Image.Image, size: int, dest: Path) -> None:
    out = src.resize((size, size), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest)


def write_favicon_svg(src: Image.Image, dest: Path) -> None:
    buf = io.BytesIO()
    src.resize((128, 128), Image.Resampling.LANCZOS).save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    dest.write_text(
        f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Morph">
  <image href="data:image/png;base64,{b64}" width="128" height="128"/>
</svg>
'''
    )


def main() -> None:
    master = build_master()

    save_resized(master, 32, ROOT / "site" / "public" / "favicon.png")
    save_resized(master, 48, ROOT / "site" / "public" / "favicon-48.png")
    save_resized(master, 180, ROOT / "site" / "public" / "apple-touch-icon.png")
    save_resized(master, 512, ROOT / "site" / "public" / "icon-512.png")

    for path in (
        ROOT / "site" / "public" / "favicon.svg",
        ROOT / "site" / "public" / "icon.svg",
        ROOT / "public" / "favicon.svg",
    ):
        write_favicon_svg(master, path)

    for size in (16, 48, 128, 192):
        save_resized(master, size, ROOT / "icons" / f"icon{size}.png")
        save_resized(master, size, ROOT / "public" / f"icon{size}.png")

    save_resized(master, 180, ROOT / "public" / "apple-touch-icon.png")

    print("Morph icons generated from single master (matches website tab icon).")


if __name__ == "__main__":
    main()
