/**
 * RGBA bitmap (port of bitmaps.cpp, which used 8-bit indexed PCX images).
 *
 * Pixels are 32-bit RGBA, packed as in ImageData on a little-endian machine
 * (0xAABBGGRR). A fully transparent pixel is always stored as 0, so `pixel !== 0`
 * means "drawn": that pixel is copied (or blended, for partial alpha) into the
 * frame buffer and paints/tests the collision buffer. The collision buffer is
 * separate and stays 8-bit: every pixel is a bit-set of collision types
 * (T_WALL, T_PLAYER, ...).
 *
 * A bitmap can have an HD version (`hd`): the same picture at an integer
 * multiple of its size. The collision buffer always uses the bitmap itself;
 * a frame buffer with that scale draws from the HD version (see drawColour).
 *
 * The scaled blitters keep the original Bresenham-style stepping exactly,
 * including its quirks (e.g. `spy >> 2` as initial error when shrinking),
 * because collision detection depends on which pixels get touched.
 */

import type { Screen } from './screen';

/** Pack a colour (0..255 per component) as an RGBA pixel. */
export function rgba(r: number, g: number, b: number, a = 255): number {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** Draw pixel `p` (not 0) at `d`: copied when opaque, blended over the frame buffer otherwise. */
function put(screen: Uint32Array, d: number, p: number): void {
  const a = p >>> 24;
  if (a === 0xff) {
    screen[d] = p;
    return;
  }
  const q = screen[d];
  const mix = (shift: number) => Math.round((((p >>> shift) & 0xff) * a + ((q >>> shift) & 0xff) * (255 - a)) / 255);
  screen[d] = rgba(mix(0), mix(8), mix(16));
}

/** Opaque RGBA colours for a 768-byte palette of 6-bit VGA values (as stored by the game). */
export function paletteToRGBA(palette: Uint8Array): Uint32Array {
  const lut = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = rgba((palette[i * 3] << 2) & 0xff, (palette[i * 3 + 1] << 2) & 0xff, (palette[i * 3 + 2] << 2) & 0xff);
  }
  return lut;
}

/** A decoded 8-bit PCX image: colour indices plus its palette (6-bit values). */
export interface IndexedImage {
  width: number;
  height: number;
  indices: Uint8Array;
  palette: Uint8Array;
}

/** Decode a PCX file (8 bpp, RLE, 256-colour palette at the end); null if it is not one. */
export function decodePCX(data: Uint8Array): IndexedImage | null {
  let pos = 0;
  const getc = (): number => (pos < data.length ? data[pos++] : -1);

  if (getc() !== 10 || getc() !== 5 || getc() !== 1) return null;
  if (getc() !== 8) return null;

  // Window origin (ignored), then window extents.
  pos += 4;
  const width = getc() + getc() * 256 + 1;
  const height = getc() + getc() * 256 + 1;

  // Skip the rest of the 128-byte header.
  pos += 116;

  const size = width * height;
  const indices = new Uint8Array(size);
  let offset = 0;
  while (offset < size) {
    let columns = width;
    while (columns > 0 && offset < size) {
      let byte = getc() & 0xff;
      if (byte <= 192) {
        indices[offset++] = byte;
        columns--;
      } else {
        let count = byte & 63;
        byte = getc() & 0xff;
        for (; count !== 0 && offset < size; count--) {
          indices[offset++] = byte;
          columns--;
        }
      }
    }
  }

  // The palette is stored 8-bit; the game works with 6-bit VGA values.
  // (A missing palette leaves it black, like the original loader.)
  const palette = new Uint8Array(768);
  if (getc() === 12) for (let c = 0; c < 768; c++) palette[c] = (getc() & 0xff) >> 2;
  return { width, height, indices, palette };
}

export class Bitmap {
  private image: Uint32Array | null = null;
  private width = 0;
  private height = 0;
  /** The same picture at a higher resolution (an integer multiple of the size), or null. */
  hd: Bitmap | null = null;

  /** An indexed image in the colours of `colors` (default: its own palette); index 0 is transparent. */
  static fromIndexed(img: IndexedImage, colors = paletteToRGBA(img.palette)): Bitmap {
    const pixels = new Uint32Array(img.indices.length);
    for (let i = 0; i < pixels.length; i++) {
      const c = img.indices[i];
      if (c !== 0) pixels[i] = colors[c];
    }
    return Bitmap.fromRGBA(img.width, img.height, pixels);
  }

  /** Build a bitmap from RGBA pixels (fully transparent pixels are normalised to 0). */
  static fromRGBA(width: number, height: number, pixels: Uint32Array): Bitmap {
    const b = new Bitmap();
    b.width = width;
    b.height = height;
    for (let i = 0; i < pixels.length; i++) if (pixels[i] >>> 24 === 0) pixels[i] = 0;
    b.image = pixels;
    return b;
  }

  /** The pixels (mutable: the game animates water and dissolves tiles in place). */
  getPixels(): Uint32Array | null {
    return this.image;
  }
  getWidth(): number {
    return this.width;
  }
  getHeight(): number {
    return this.height;
  }

  /** The HD version if it is exactly `scale` times this bitmap's size. */
  private hdFor(scale: number): Bitmap | null {
    const hd = this.hd;
    return hd !== null && hd.width === this.width * scale && hd.height === this.height * scale ? hd : null;
  }

  /** Whether this bitmap has an HD version for a screen of this scale. */
  hasHd(scale: number): boolean {
    return this.hdFor(scale) !== null;
  }

  /** The scale of the HD version relative to this bitmap (0: none). */
  private hdScale(): number {
    return this.hd === null ? 0 : this.hd.width / this.width;
  }

  /** Make the w×h rectangle at (x, y) transparent (also in the HD version). */
  clearRect(x: number, y: number, w: number, h: number): void {
    const image = this.image;
    if (image === null) return;
    for (let r = 0; r < h; r++) image.fill(0, x + (y + r) * this.width, x + w + (y + r) * this.width);
    const k = this.hdScale();
    if (k > 0) this.hd!.clearRect(x * k, y * k, w * k, h * k);
  }

  /** Rotate the `w` pixels of row `y` from column `x` left by `n` (also in the HD version). */
  rotateRowLeft(x: number, y: number, w: number, n: number): void {
    const image = this.image;
    if (image === null) return;
    const row = x + y * this.width;
    for (let k = 0; k < n; k++) {
      const first = image[row];
      image.copyWithin(row, row + 1, row + w);
      image[row + w - 1] = first;
    }
    const k = this.hdScale();
    if (k > 0) for (let r = 0; r < k; r++) this.hd!.rotateRowLeft(x * k, y * k + r, w * k, n * k);
  }

  /**
   * Copy logical pixel `s` of this bitmap to logical pixel `d` of the screen,
   * unless it is transparent (an HD screen gets the matching HD block).
   */
  copyPixel(s: number, screen: Screen, d: number): void {
    const image = this.image;
    if (image === null || image[s] === 0) return;
    const k = screen.scale;
    const hd = k === 1 ? null : this.hdFor(k);
    if (hd === null) {
      screen.plot(d, image[s]);
      return;
    }
    const sx = s % this.width;
    const sy = (s - sx) / this.width;
    const src = sy * k * hd.width + sx * k;
    const dst = screen.physical(d);
    for (let r = 0; r < k; r++) {
      for (let q = 0; q < k; q++) {
        const p = hd.image![src + r * hd.width + q];
        if (p !== 0) put(screen.pixels, dst + r * screen.width + q, p);
      }
    }
  }

  /** Draw the whole bitmap scaled to `sx`×`sy` at (x, y). */
  draw(
    x: number,
    y: number,
    sx: number,
    sy: number,
    screen: Screen,
    screenX: number,
    screenY: number,
    pitch: number,
  ): void {
    this.drawColour(0, 0, this.width, this.height, x, y, sx, sy, screen, screenX, screenY, pitch, null);
  }

  /**
   * Draw the source rectangle (x1, y1, spx, spy) scaled to (x, y, sx, sy), in
   * logical pixels (`screenX`×`screenY`, row stride `pitch`), with `cut` rows
   * hidden (see blit) or null.
   *
   * On a screen with scale 1 this is the remake's blit. On a larger screen it
   * draws the same picture at the higher resolution: from the HD version of
   * the bitmap when there is one of exactly that scale (the same blit, in
   * physical pixels), otherwise every logical pixel becomes a scale×scale block.
   */
  private drawColour(
    x1: number,
    y1: number,
    spx: number,
    spy: number,
    x: number,
    y: number,
    sx: number,
    sy: number,
    screen: Screen,
    screenX: number,
    screenY: number,
    pitch: number,
    cut: number | null,
  ): void {
    const image = this.image;
    if (image === null) return;
    const out = screen.pixels;
    const k = screen.scale;
    const hd = k === 1 ? null : this.hdFor(k);
    if (hd !== null) {
      const hdImage = hd.image!;
      hd.blitAny(
        x1 * k,
        y1 * k,
        spx * k,
        spy * k,
        x * k,
        y * k,
        sx * k,
        sy * k,
        screenX * k,
        screenY * k,
        screen.width,
        cut === null ? null : cut * k,
        (d, s) => put(out, d, hdImage[s]),
      );
    } else if (k === 1) {
      this.blitAny(x1, y1, spx, spy, x, y, sx, sy, screenX, screenY, pitch, cut, (d, s) => put(out, d, image[s]));
    } else {
      const w = screen.width;
      this.blitAny(x1, y1, spx, spy, x, y, sx, sy, screenX, screenY, pitch, cut, (d, s) => {
        const p = screen.physical(d);
        const c = image[s];
        for (let r = 0; r < k; r++) for (let q = 0; q < k; q++) put(out, p + r * w + q, c);
      });
    }
  }

  /** The blit for this draw: the unscaled fast path when possible. */
  private blitAny(
    x1: number,
    y1: number,
    spx: number,
    spy: number,
    x: number,
    y: number,
    sx: number,
    sy: number,
    screenX: number,
    screenY: number,
    pitch: number,
    cut: number | null,
    plot: (d: number, s: number) => void,
  ): void {
    if (cut === null && sx === spx && sy === spy) this.blit1(x1, y1, spx, spy, x, y, screenX, screenY, pitch, plot);
    else this.blit(x1, y1, spx, spy, x, y, sx, sy, screenX, screenY, pitch, cut, plot);
  }

  /**
   * Generic scaled blit of the source rectangle (x1, y1, spx, spy) to a
   * destination rectangle (x, y, sx, sy). `plot(dest, src)` is called for
   * every opaque source pixel that lands inside the screen. `cut` is only
   * used by drawSpriteCut (rows hidden at the top/bottom).
   */
  private blit(
    x1: number,
    y1: number,
    spx: number,
    spy: number,
    x: number,
    y: number,
    sx: number,
    sy: number,
    screenX: number,
    screenY: number,
    pitch: number,
    cut: number | null,
    plot: (d: number, s: number) => void,
  ): void {
    const image = this.image;
    if (image === null) return;
    const srcW = this.width;
    let v1 = 0;
    let v2 = 0;
    if (cut !== null) {
      if (cut < 0) v1 = -cut;
      if (cut > 0) v2 = cut;
    }
    let xError: number, yError: number, xt: number, yt: number, offso: number, offsd: number;

    if (sy > spy) {
      yError = sy >> 1;
      offso = (y1 + v2 - v1) * srcW;
      offsd = y * pitch;
      yt = 0;
      for (let i = cut !== null ? v1 : 0; i < sy - v2; i++) {
        if (i + y >= 0 && i + y < screenY && (cut !== null ? yt >= v1 && yt < spy - v2 : yt < spy)) {
          if (sx > spx) {
            xError = sx >> 1;
            xt = x1;
            for (let j = 0; j < sx; j++) {
              if (j + x >= 0 && j + x < screenX && xt < srcW && image[xt + offso] !== 0)
                plot(x + j + offsd, xt + offso);
              xError -= spx;
              if (xError < 0) {
                xError += sx;
                xt++;
              }
            }
          } else {
            xError = spx >> 1;
            xt = 0;
            for (let j = 0; j < spx; j++) {
              if (xt + x >= 0 && xt + x < screenX && image[x1 + j + offso] !== 0) plot(x + xt + offsd, x1 + j + offso);
              xError -= sx;
              if (xError < 0) {
                xError += spx;
                xt++;
              }
            }
          }
        }
        yError -= spy;
        offsd += pitch;
        if (yError < 0) {
          yError += sy;
          yt++;
          offso += srcW;
        }
      }
    } else {
      yError = spy >> 2;
      offso = (y1 + v2 - v1) * srcW;
      offsd = y * pitch;
      yt = 0;
      for (let i = 0; i < spy; i++) {
        if (yt + y >= 0 && yt + y < screenY && (cut === null || (yt >= v1 && yt < spy - v2))) {
          if (sx > spx) {
            xError = sx >> 1;
            xt = x1;
            for (let j = 0; j < sx; j++) {
              if (j + x >= 0 && j + x < screenX && xt < srcW && image[xt + offso] !== 0)
                plot(x + j + offsd, xt + offso);
              xError -= spx;
              if (xError < 0) {
                xError += sx;
                xt++;
              }
            }
          } else {
            xError = spx >> 1;
            xt = 0;
            for (let j = 0; j < spx; j++) {
              if (xt + x >= 0 && xt + x < screenX && image[x1 + j + offso] !== 0) plot(x + xt + offsd, x1 + j + offso);
              xError -= sx;
              if (xError < 0) {
                xError += spx;
                xt++;
              }
            }
          }
        }
        yError -= sy;
        offso += srcW;
        if (yError < 0) {
          yError += spy;
          yt++;
          offsd += pitch;
        }
      }
    }
  }

  /** Unscaled fast path, pixel-for-pixel identical to `blit` when sx==spx and sy==spy. */
  private blit1(
    x1: number,
    y1: number,
    spx: number,
    spy: number,
    x: number,
    y: number,
    screenX: number,
    screenY: number,
    pitch: number,
    plot: (d: number, s: number) => void,
  ): void {
    const image = this.image!;
    const srcW = this.width;
    for (let i = 0; i < spy; i++) {
      const dy = i + y;
      if (dy < 0 || dy >= screenY) continue;
      const srow = x1 + (y1 + i) * srcW;
      const drow = x + dy * pitch;
      for (let j = 0; j < spx; j++) {
        const dx = j + x;
        if (dx >= 0 && dx < screenX && image[srow + j] !== 0) plot(drow + j, srow + j);
      }
    }
  }

  drawSprite(
    x1: number,
    y1: number,
    spx: number,
    spy: number,
    x: number,
    y: number,
    sx: number,
    sy: number,
    screen: Screen,
    screenX: number,
    screenY: number,
    pitch: number,
  ): void {
    this.drawColour(x1, y1, spx, spy, x, y, sx, sy, screen, screenX, screenY, pitch, null);
  }

  drawSpriteCut(
    x1: number,
    y1: number,
    spx: number,
    spy: number,
    x: number,
    y: number,
    sx: number,
    sy: number,
    screen: Screen,
    screenX: number,
    screenY: number,
    pitch: number,
    cut: number,
  ): void {
    this.drawColour(x1, y1, spx, spy, x, y, sx, sy, screen, screenX, screenY, pitch, cut);
  }

  /** OR the collision `type` into every pixel covered by the sprite. */
  drawSpriteMask(
    type: number,
    x1: number,
    y1: number,
    spx: number,
    spy: number,
    x: number,
    y: number,
    sx: number,
    sy: number,
    colbuffer: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
  ): void {
    if (this.image === null) return;
    const plot = (d: number) => {
      colbuffer[d] |= type;
    };
    if (sx === spx && sy === spy) this.blit1(x1, y1, spx, spy, x, y, screenX, screenY, pitch, plot);
    else this.blit(x1, y1, spx, spy, x, y, sx, sy, screenX, screenY, pitch, null, plot);
  }

  /** OR together the collision-buffer values under every opaque sprite pixel. */
  collisionTest(
    x1: number,
    y1: number,
    spx: number,
    spy: number,
    x: number,
    y: number,
    sx: number,
    sy: number,
    colbuffer: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
  ): number {
    if (this.image === null) return 0;
    let retval = 0;
    const plot = (d: number) => {
      retval |= colbuffer[d] ?? 0;
    };
    if (sx === spx && sy === spy) this.blit1(x1, y1, spx, spy, x, y, screenX, screenY, pitch, plot);
    else this.blit(x1, y1, spx, spy, x, y, sx, sy, screenX, screenY, pitch, null, plot);
    return retval;
  }

  /** Pixel-exact overlap test between two sprites (offs = source offset of each sprite). */
  overlaps(
    b: Bitmap,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dx1: number,
    dy1: number,
    dx2: number,
    dy2: number,
    offs1: number,
    offs2: number,
  ): boolean {
    const image = this.image;
    const bimage = b.image;
    if (image === null || bimage === null) return false;
    const dx = x1 - x2;
    const dy = y1 - y2;
    for (let j = 0; j < dy1; j++) {
      for (let i = 0; i < dx1; i++) {
        if (image[offs1 + i + j * this.width] !== 0) {
          const xt = i + dx;
          const yt = j + dy;
          if (xt >= 0 && xt < dx2 && yt >= 0 && yt < dy2) {
            if (bimage[offs2 + xt + yt * b.width] !== 0) return true;
          }
        }
      }
    }
    return false;
  }
}
