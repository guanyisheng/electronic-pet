#!/usr/bin/env python3
"""Compose an 8x11 Codex v2 atlas from per-cell PNGs."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

CELL_W, CELL_H = 192, 208
COLS, ROWS = 8, 11
ROW_SPECS = [
    ("idle", 6),
    ("running-right", 8),
    ("running-left", 8),
    ("waving", 4),
    ("jumping", 5),
    ("failed", 8),
    ("waiting", 6),
    ("running", 6),
    ("review", 6),
    ("look-9", 8),
    ("look-10", 8),
]


def fit_cell(src: Image.Image, chroma: tuple[int, int, int]) -> Image.Image:
    img = src.convert("RGBA")
    if img.size == (CELL_W, CELL_H):
        return img
    scale = min(CELL_W / img.width, CELL_H / img.height)
    nw = max(1, int(img.width * scale))
    nh = max(1, int(img.height * scale))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CELL_W, CELL_H), (*chroma, 0))
    canvas.paste(resized, ((CELL_W - nw) // 2, CELL_H - nh), resized)
    return canvas


def chroma_to_alpha(img: Image.Image, chroma: tuple[int, int, int], threshold: int = 48) -> Image.Image:
    px = img.convert("RGBA")
    data = list(px.getdata())
    out = []
    cr, cg, cb = chroma
    for r, g, b, a in data:
        dist = abs(r - cr) + abs(g - cg) + abs(b - cb)
        if dist <= threshold * 3:
            out.append((r, g, b, 0))
        else:
            out.append((r, g, b, a))
    px.putdata(out)
    return px


def load_frame(path: Path, chroma: tuple[int, int, int]) -> Image.Image:
    return chroma_to_alpha(fit_cell(Image.open(path), chroma), chroma)


def parse_chroma(text: str) -> tuple[int, int, int]:
    h = text.strip().lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames-root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--chroma-key", default="#00FF00")
    parser.add_argument("--tray-output", default="")
    parser.add_argument("--pet-json", default="")
    parser.add_argument("--pet-id", default="")
    parser.add_argument("--display-name", default="")
    parser.add_argument("--description", default="")
    args = parser.parse_args()

    root = Path(args.frames_root)
    chroma = parse_chroma(args.chroma_key)
    atlas = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    missing = []
    for row_index, (name, count) in enumerate(ROW_SPECS):
        for col in range(count):
            path = root / name / f"{col:02d}.png"
            if not path.exists():
                missing.append(str(path))
                continue
            cell = load_frame(path, chroma)
            atlas.paste(cell, (col * CELL_W, row_index * CELL_H), cell)
    if missing:
        raise SystemExit("Missing frames:\n" + "\n".join(missing))

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(out)
    if out.suffix.lower() != ".webp":
        atlas.save(out.with_suffix(".webp"), "WEBP", quality=92, lossless=True)

    if args.tray_output:
        idle = load_frame(root / "idle" / "00.png", chroma)
        Path(args.tray_output).parent.mkdir(parents=True, exist_ok=True)
        idle.resize((128, 128), Image.Resampling.LANCZOS).save(args.tray_output)

    if args.pet_json:
        meta = {
            "format": "electronic-pet-skin",
            "formatVersion": 1,
            "id": args.pet_id or Path(args.pet_json).parent.name,
            "displayName": args.display_name or args.pet_id or "Pet",
            "description": args.description,
            "spriteVersionNumber": 2,
            "spritesheetPath": "spritesheet.webp",
            "trayPath": "tray.png",
        }
        Path(args.pet_json).write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"ok {out} {atlas.size[0]}x{atlas.size[1]}")


if __name__ == "__main__":
    main()
