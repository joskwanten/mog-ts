"""
Make in-between frames for an animation with RIFE (AI frame interpolation).

The game shows some animations with very few frames, each for several game frames
(a bat's wings: 2 positions, 4 frames each). For a cycle of tiles t0 t1 … this writes
assets/graphics/<set>/hd/anim/<t>.png for every tile: a strip of `--steps` frames at
HD size, frame 0 the tile itself and the others on the way to the next tile of the
cycle. The game shows them in the frames the tile is on screen (render-only; the
collisions stay those of the tile). The pictures come from the set's HD graphics
(hd/<sheet>.png), so make those first (tools/upscale-hd.py).

RIFE suits small movements (a flame, a turning coin). For two very different poses, such
as the bat's wings down and up, it cross-fades instead of moving the wings; draw those
frames by hand (or with an image model) in the same strip layout.

Colour (on a flat background that contrasts with the sprite) and transparency are
interpolated separately (RIFE works on RGB), on an enlarged copy with a margin, which
suits RIFE's motion estimation better than a small sprite.

Usage: python3 tools/inbetween.py <set> <tile> <tile> [...] [--steps 4]
  e.g. python3 tools/inbetween.py naramura 437 438     (the bat's wings)
Needs Pillow and rife-ncnn-vulkan (RIFE=path/to/rife-ncnn-vulkan, default
~/Develop/tools/rife/rife-ncnn-vulkan, with the rife-v4.6 model next to it).
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BINARY = Path(os.environ.get("RIFE", Path.home() / "Develop/tools/rife/rife-ncnn-vulkan"))
SHEETS = {"menu": "start"}  # gfx name → file name, where they differ
MARGIN = 0.25  # margin around the sprite, as a fraction of its size
ENLARGE = 4  # RIFE works on the sprite enlarged this many times


def tile_rects() -> dict[int, tuple[str, int, int, int, int]]:
    """Tile number → (sheet file stem, x, y, w, h) from the tile table (tests/golden/tiles.txt)."""
    rects = {}
    for line in (ROOT / "tests" / "golden" / "tiles.txt").read_text().splitlines():
        m = re.match(r"(\d+) (\w+) (\d+),(\d+) (\d+)x(\d+) ", line)
        if m:
            name = m.group(2)
            rects[int(m.group(1))] = (SHEETS.get(name, name), *(int(m.group(i)) for i in range(3, 7)))
    return rects


def rife(a: Image.Image, b: Image.Image, t: float, tmp: Path) -> Image.Image:
    """The frame at time t (0..1) between a and b."""
    pa, pb, out = tmp / "a.png", tmp / "b.png", tmp / "out.png"
    a.save(pa)
    b.save(pb)
    subprocess.run(
        [str(BINARY), "-0", str(pa), "-1", str(pb), "-o", str(out), "-s", f"{t}", "-m", str(BINARY.parent / "rife-v4.6")],
        check=True,
        capture_output=True,
    )
    return Image.open(out).convert("RGB")


def prepare(img: Image.Image, pad: int, background: tuple[int, int, int]) -> tuple[Image.Image, Image.Image]:
    """Colour (on a flat background that contrasts with the sprite, so RIFE can follow the
    outline) and opacity of an RGBA sprite, with a transparent margin of `pad` pixels and
    enlarged ENLARGE times."""
    w, h = img.size
    canvas = Image.new("RGBA", (w + 2 * pad, h + 2 * pad))
    canvas.paste(img, (pad, pad))
    flat = Image.new("RGBA", canvas.size, background + (255,))
    flat.alpha_composite(canvas)
    size = (canvas.width * ENLARGE, canvas.height * ENLARGE)
    return flat.convert("RGB").resize(size, Image.LANCZOS), canvas.getchannel("A").convert("RGB").resize(size, Image.LANCZOS)


def contrasting(frames: list[Image.Image]) -> tuple[int, int, int]:
    """A background colour far from the sprites' average colour."""
    total = [0, 0, 0]
    n = 0
    for f in frames:
        for r, g, b, a in f.getdata():
            if a > 128:
                total[0] += r
                total[1] += g
                total[2] += b
                n += 1
    avg = [v / max(n, 1) for v in total]
    return tuple(255 if v < 128 else 0 for v in avg)  # type: ignore[return-value]


def unmix(rgb: Image.Image, alpha: Image.Image, background: tuple[int, int, int]) -> Image.Image:
    """Remove the background colour from pixels that were composited onto it with `alpha`."""
    out = rgb.copy()
    px, pa = out.load(), alpha.load()
    for y in range(out.height):
        for x in range(out.width):
            a = pa[x, y] / 255
            if 0 < a < 1:
                px[x, y] = tuple(
                    max(0, min(255, round((c - bg * (1 - a)) / a))) for c, bg in zip(px[x, y], background)
                )
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("set")
    ap.add_argument("tiles", type=int, nargs="+", help="the tiles of the animation cycle, in order")
    ap.add_argument("--steps", type=int, default=4, help="frames per tile (the game frames it stays on screen)")
    args = ap.parse_args()

    hd_dir = ROOT / "assets" / "graphics" / args.set / "hd"
    out_dir = hd_dir / "anim"
    out_dir.mkdir(exist_ok=True)
    rects = tile_rects()

    def hd_tile(t: int) -> Image.Image:
        sheet, x, y, w, h = rects[t]
        img = Image.open(hd_dir / f"{sheet}.png").convert("RGBA")
        k = img.width // Image.open(ROOT / "assets" / "graphics" / args.set / f"{sheet}.pcx").width
        return img.crop((x * k, y * k, (x + w) * k, (y + h) * k))

    frames = [hd_tile(t) for t in args.tiles]
    w, h = frames[0].size
    pad = round(max(w, h) * MARGIN)
    background = contrasting(frames)
    prepared = [prepare(f, pad, background) for f in frames]

    with tempfile.TemporaryDirectory() as tmp:
        for i, t in enumerate(args.tiles):
            j = (i + 1) % len(args.tiles)
            strip = Image.new("RGBA", (w * args.steps, h))
            strip.paste(frames[i], (0, 0))
            for k in range(1, args.steps):
                time = k / args.steps
                rgb = rife(prepared[i][0], prepared[j][0], time, Path(tmp))
                alpha = rife(prepared[i][1], prepared[j][1], time, Path(tmp)).convert("L")
                frame = rgb.resize((w + 2 * pad, h + 2 * pad), Image.LANCZOS)
                a = alpha.resize(frame.size, Image.LANCZOS)
                # Undo the background: where the sprite is partly transparent, the colour was
                # mixed with it.
                frame = unmix(frame, a, background)
                frame.putalpha(a)
                strip.paste(frame.crop((pad, pad, pad + w, pad + h)), (k * w, 0))
            target = out_dir / f"{t}.png"
            strip.save(target, optimize=True)
            print(f"tile {t} → {target.relative_to(ROOT)} ({args.steps} frames, towards tile {args.tiles[j]})")


if __name__ == "__main__":
    main()
