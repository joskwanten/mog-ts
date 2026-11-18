"""
Make HD graphics for a graphic set with Real-ESRGAN.

For every PCX of assets/graphics/<set>/ this writes assets/graphics/<set>/hd/<name>.png
at twice the size:
  - the picture in the palette of konami.pcx (as the game shows it), upscaled by
    Real-ESRGAN (x4 model, then reduced to x2 with Lanczos), and
  - the transparency (colour index 0) upscaled the same way, so outlines (letters,
    sprites) get smooth, anti-aliased edges instead of steps; only the edges change,
    inside and outside stay fully opaque or transparent (--alpha nearest: repeat the
    pixels instead). The collisions use the PCX anyway.
Transparent areas are filled with the nearest opaque colour before upscaling, so
the upscaler does not pull dark edges into the sprites.

Room tiles (the 16×16 tiles the room files are made of) are upscaled once more in the
arrangement the rooms use, and the result replaces them in the HD sheet; otherwise the
upscaler sees each tile next to whatever lies beside it in the sheet, and repeating
patterns (leaves, walls) get visible seams. A repeating block is upscaled as a whole
between copies of itself, so it repeats seamlessly; other tiles among their neighbours.
Their dithering is softened a little first (--denoise), otherwise the upscaler reads
patterns into the noise. The tile numbers come from tests/golden/tiles.txt (the tile
table of loadGraphics).

Usage: python3 tools/upscale-hd.py <set> [--model realesrgan-x4plus] [--only tiles.pcx,...] [--denoise 0.5]
       [--alpha smooth|nearest]
Needs Pillow and realesrgan-ncnn-vulkan (REALESRGAN=path/to/realesrgan-ncnn-vulkan,
default ~/Develop/tools/realesrgan/realesrgan-ncnn-vulkan).
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SCALE = 2
BINARY = Path(os.environ.get("REALESRGAN", Path.home() / "Develop/tools/realesrgan/realesrgan-ncnn-vulkan"))


def load_indexed(path: Path, palette: list[int]) -> tuple[Image.Image, Image.Image]:
    """The PCX in the given palette (RGB) and its opacity mask (L: 255 = drawn)."""
    im = Image.open(path)
    if im.mode != "P":
        raise SystemExit(f"{path}: not an 8-bit PCX")
    im.putpalette(palette)
    mask = im.point(lambda i: 0 if i == 0 else 255, mode="L")
    return im.convert("RGB"), mask


def bleed(rgb: Image.Image, mask: Image.Image, steps: int = 8) -> Image.Image:
    """Fill transparent pixels with the colour of nearby opaque ones (a few dilation steps)."""
    out = rgb.copy()
    filled = mask.copy()
    for _ in range(steps):
        grown = filled.filter(ImageFilter.MaxFilter(3))
        # Average colour of opaque neighbours: blur colour·mask and divide by blurred mask.
        weighted = Image.composite(out, Image.new("RGB", out.size), filled).filter(ImageFilter.BoxBlur(1))
        weight = filled.filter(ImageFilter.BoxBlur(1))
        px_new, px_w = weighted.load(), weight.load()
        px_out, px_fill, px_grow = out.load(), filled.load(), grown.load()
        w, h = out.size
        for y in range(h):
            for x in range(w):
                if px_fill[x, y] == 0 and px_grow[x, y] != 0 and px_w[x, y] > 0:
                    r, g, b = px_new[x, y]
                    k = 255 / px_w[x, y]
                    px_out[x, y] = (min(255, round(r * k)), min(255, round(g * k)), min(255, round(b * k)))
        filled = grown
    return out


def upscale(rgb: Image.Image, model: str, tmp: Path, denoise: float = 0) -> Image.Image:
    """Upscale 2× with Real-ESRGAN; `denoise` > 0 first softens dithering (Gaussian radius in source pixels)."""
    src, dst = tmp / "in.png", tmp / "out.png"
    (rgb.filter(ImageFilter.GaussianBlur(denoise)) if denoise > 0 else rgb).save(src)
    subprocess.run(
        [str(BINARY), "-i", str(src), "-o", str(dst), "-n", model, "-s", "4", "-m", str(BINARY.parent / "models")],
        check=True,
        capture_output=True,
    )
    big = Image.open(dst).convert("RGB")
    return big.resize((rgb.width * SCALE, rgb.height * SCALE), Image.LANCZOS)


TILE = 16
NEIGHBOURS = [(dx, dy) for dy in (-1, 0, 1) for dx in (-1, 0, 1)]


def tile_table() -> dict[int, tuple[str, int, int]]:
    """Room-sized tiles: tile number → (PCX name, x, y) of its 16×16 source rectangle."""
    files = {"tiles": "tiles.pcx", "tiles2": "tiles2.pcx"}
    table = {}
    for line in (ROOT / "tests" / "golden" / "tiles.txt").read_text().splitlines():
        m = re.match(r"(\d+) (\w+) (\d+),(\d+) 16x16 ", line)
        if m and m.group(2) in files:
            table[int(m.group(1))] = (files[m.group(2)], int(m.group(3)), int(m.group(4)))
    return table


class RoomTiles:
    """How the room files put tiles next to each other."""

    def __init__(self, table: dict[int, tuple[str, int, int]]):
        self.table = table
        self.seen: dict[tuple[int, int, int], Counter] = defaultdict(Counter)
        for room in (ROOT / "assets" / "rooms").glob("*.txt"):
            words = room.read_text().split()
            w, h = int(words[0]), int(words[1])
            cells = [int(v) for v in words[2 : 2 + w * h]]  # the objects of the room follow
            for y in range(h):
                for x in range(w):
                    t = cells[x + y * w]
                    for dx, dy in NEIGHBOURS:
                        if 0 <= x + dx < w and 0 <= y + dy < h:
                            self.seen[(t, dx, dy)][cells[x + dx + (y + dy) * w]] += 1
        self.used = sorted({t for (t, _, _) in self.seen if t in table})

    def neighbour(self, t: int, dx: int, dy: int) -> int:
        """The tile that belongs next to t in direction (dx, dy): the most common one that has t as its
        most common neighbour the other way (so a leaf above a floor still gets a leaf below it)."""
        if (dx, dy) == (0, 0):
            return t
        ranked = [n for n, _ in self.seen[(t, dx, dy)].most_common() if n in self.table]
        for n in ranked:
            back = self.seen[(n, -dx, -dy)].most_common(1)
            if back and back[0][0] == t:
                return n
        return ranked[0] if ranked else t

    def context(self, t: int) -> list[int]:
        """The 3×3 tiles around t (t in the middle), in NEIGHBOURS order."""
        return [self.neighbour(t, dx, dy) for dx, dy in NEIGHBOURS]

    def block(self, t: int, limit: int = 8) -> list[list[int]] | None:
        """The repeating block t starts, as rows of tiles, if following the neighbours to the right
        and down comes back to t (a pattern that repeats in both directions); otherwise None."""

        def period(dx: int, dy: int) -> int:
            n = t
            for k in range(1, limit + 1):
                n = self.neighbour(n, dx, dy)
                if n == t:
                    return k
            return 0

        p, q = period(1, 0), period(0, 1)
        if not p or not q:
            return None
        rows = []
        first = t
        for _ in range(q):
            row = [first]
            for _ in range(p - 1):
                row.append(self.neighbour(row[-1], 1, 0))
            if self.neighbour(row[-1], 1, 0) != row[0]:
                return None
            rows.append(row)
            first = self.neighbour(first, 0, 1)
        return rows if first == t else None


def compose(
    sheets: dict[str, tuple[Image.Image, Image.Image]],
    table: dict[int, tuple[str, int, int]],
    grid: list[list[int]],
) -> tuple[Image.Image, Image.Image]:
    """The picture (and opacity mask) of a grid of tiles."""
    rgb = Image.new("RGB", (len(grid[0]) * TILE, len(grid) * TILE))
    mask = Image.new("L", rgb.size)
    for j, row in enumerate(grid):
        for i, n in enumerate(row):
            name, x, y = table[n]
            src_rgb, src_mask = sheets[name]
            box = (x, y, x + TILE, y + TILE)
            rgb.paste(src_rgb.crop(box), (i * TILE, j * TILE))
            mask.paste(src_mask.crop(box), (i * TILE, j * TILE))
    return rgb, mask


def smooth_alpha(mask: Image.Image, model: str, tmp: Path) -> Image.Image:
    """The opacity mask at 2×, with smooth edges: the mask upscaled like a picture, used only
    along the outlines (pixels that are fully inside or outside stay as they were)."""
    up = upscale(mask.convert("RGB"), model, tmp).convert("L")
    # A steeper curve: soft but not blurry edges.
    up = up.point(lambda v: 0 if v < 48 else 255 if v > 208 else round((v - 48) * 255 / 160))
    near = mask.resize(up.size, Image.NEAREST)
    inside = mask.filter(ImageFilter.MinFilter(3)).resize(up.size, Image.NEAREST)
    outside = mask.filter(ImageFilter.MaxFilter(3)).resize(up.size, Image.NEAREST)
    edge = ImageChops.difference(outside, inside)  # 255 near an outline
    return Image.composite(up, near, edge)


def upscale_room_tiles(
    sheets: dict[str, tuple[Image.Image, Image.Image]],
    target: str,
    big: Image.Image,
    model: str,
    tmp: Path,
    denoise: float = 0,
) -> tuple[int, int]:
    """
    Re-upscale the room tiles of `target` and paste them into its HD image `big`.

    A repeating block (the 4×4 leaves, a brick tile that repeats itself) is upscaled as a
    whole, surrounded by copies of itself, and the middle copy is used: its tiles come
    from one run and its edges fit the next copy, so it repeats without seams. Every other
    room tile is upscaled in the middle of its 3×3 neighbours. Returns (blocks, single tiles).
    """
    table = tile_table()
    rooms = RoomTiles(table)
    k = SCALE
    done: set[int] = set()
    blocks = 0
    for t in rooms.used:
        if t in done or table[t][0] != target:
            continue
        grid = rooms.block(t)
        if grid is None or any(table[n][0] != target for row in grid for n in row):
            continue
        p, q = len(grid[0]), len(grid)
        tiled = [[grid[j % q][i % p] for i in range(3 * p)] for j in range(3 * q)]
        rgb, mask = compose(sheets, table, tiled)
        up = upscale(bleed(rgb, mask), model, tmp, denoise)
        for j, row in enumerate(grid):
            for i, n in enumerate(row):
                if n in done:
                    continue
                _, x, y = table[n]
                ox, oy = (p + i) * TILE * k, (q + j) * TILE * k
                big.paste(up.crop((ox, oy, ox + TILE * k, oy + TILE * k)), (x * k, y * k))
                done.add(n)
        blocks += 1

    singles = [t for t in rooms.used if t not in done and table[t][0] == target]
    if singles:
        cols = 16
        rows_ = (len(singles) + cols - 1) // cols
        rgb = Image.new("RGB", (cols * 3 * TILE, rows_ * 3 * TILE))
        mask = Image.new("L", rgb.size)
        for idx, t in enumerate(singles):
            ctx = rooms.context(t)
            c_rgb, c_mask = compose(sheets, table, [ctx[0:3], ctx[3:6], ctx[6:9]])
            at = ((idx % cols) * 3 * TILE, (idx // cols) * 3 * TILE)
            rgb.paste(c_rgb, at)
            mask.paste(c_mask, at)
        up = upscale(bleed(rgb, mask), model, tmp, denoise)
        for idx, t in enumerate(singles):
            _, x, y = table[t]
            ox, oy = ((idx % cols) * 3 + 1) * TILE * k, ((idx // cols) * 3 + 1) * TILE * k
            big.paste(up.crop((ox, oy, ox + TILE * k, oy + TILE * k)), (x * k, y * k))
    return blocks, len(singles)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("set")
    ap.add_argument("--model", default="realesrgan-x4plus")
    ap.add_argument("--only", default="")
    ap.add_argument(
        "--denoise",
        type=float,
        default=0.5,
        help="soften the dithering of room tiles before upscaling (Gaussian radius in game pixels; 0 = off)",
    )
    ap.add_argument("--alpha", choices=["smooth", "nearest"], default="smooth", help="how to enlarge transparency")
    args = ap.parse_args()

    set_dir = ROOT / "assets" / "graphics" / args.set
    out_dir = set_dir / "hd"
    out_dir.mkdir(exist_ok=True)
    palette = Image.open(set_dir / "konami.pcx").getpalette()
    only = {n for n in args.only.split(",") if n}

    sheets = {n: load_indexed(set_dir / n, palette) for n in ("tiles.pcx", "tiles2.pcx")}
    with tempfile.TemporaryDirectory() as t:
        for pcx in sorted(set_dir.glob("*.pcx")):
            if only and pcx.name not in only:
                continue
            rgb, mask = load_indexed(pcx, palette)
            big = upscale(bleed(rgb, mask), args.model, Path(t))
            blocks, singles = upscale_room_tiles(sheets, pcx.name, big, args.model, Path(t), args.denoise)
            if blocks or singles:
                print(f"{pcx.name}: {blocks} repeating blocks, {singles} other room tiles upscaled in context")
            alpha = (
                smooth_alpha(mask, args.model, Path(t))
                if args.alpha == "smooth"
                else mask.resize(big.size, Image.NEAREST)
            )
            big.putalpha(alpha)
            target = out_dir / (pcx.stem + ".png")
            big.save(target, optimize=True)
            print(f"{pcx.name} → {target.relative_to(ROOT)} {big.size[0]}×{big.size[1]}")


if __name__ == "__main__":
    main()
