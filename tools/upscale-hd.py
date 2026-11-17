"""
Make HD graphics for a graphic set with Real-ESRGAN.

For every PCX of assets/graphics/<set>/ this writes assets/graphics/<set>/hd/<name>.png
at twice the size:
  - the picture in the palette of konami.pcx (as the game shows it), upscaled by
    Real-ESRGAN (x4 model, then reduced to x2 with Lanczos), and
  - the transparency (colour index 0) enlarged by repeating pixels, so the outlines
    stay exactly those of the original (the collisions use the PCX anyway).
Transparent areas are filled with the nearest opaque colour before upscaling, so
the upscaler does not pull dark edges into the sprites.

Usage: python3 tools/upscale-hd.py <set> [--model realesrgan-x4plus] [--only tiles.pcx,...]
Needs Pillow and realesrgan-ncnn-vulkan (REALESRGAN=path/to/realesrgan-ncnn-vulkan,
default ~/Develop/tools/realesrgan/realesrgan-ncnn-vulkan).
"""

import argparse
import os
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageFilter

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


def upscale(rgb: Image.Image, model: str, tmp: Path) -> Image.Image:
    src, dst = tmp / "in.png", tmp / "out.png"
    rgb.save(src)
    subprocess.run(
        [str(BINARY), "-i", str(src), "-o", str(dst), "-n", model, "-s", "4", "-m", str(BINARY.parent / "models")],
        check=True,
        capture_output=True,
    )
    big = Image.open(dst).convert("RGB")
    return big.resize((rgb.width * SCALE, rgb.height * SCALE), Image.LANCZOS)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("set")
    ap.add_argument("--model", default="realesrgan-x4plus")
    ap.add_argument("--only", default="")
    args = ap.parse_args()

    set_dir = ROOT / "assets" / "graphics" / args.set
    out_dir = set_dir / "hd"
    out_dir.mkdir(exist_ok=True)
    palette = Image.open(set_dir / "konami.pcx").getpalette()
    only = {n for n in args.only.split(",") if n}

    with tempfile.TemporaryDirectory() as t:
        for pcx in sorted(set_dir.glob("*.pcx")):
            if only and pcx.name not in only:
                continue
            rgb, mask = load_indexed(pcx, palette)
            big = upscale(bleed(rgb, mask), args.model, Path(t))
            alpha = mask.resize(big.size, Image.NEAREST)
            big.putalpha(alpha)
            target = out_dir / (pcx.stem + ".png")
            big.save(target, optimize=True)
            print(f"{pcx.name} → {target.relative_to(ROOT)} {big.size[0]}×{big.size[1]}")


if __name__ == "__main__":
    main()
