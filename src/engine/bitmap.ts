/**
 * 8-bit indexed bitmap loaded from a PCX file (port of bitmaps.cpp).
 *
 * All drawing happens into 8-bit indexed buffers ("screens") of size
 * `screen_x * screen_y` with a row stride of `pitch`. Colour index 0 is
 * transparent. The same routines also paint/test the collision buffer: there
 * every pixel is a bit-set of collision types (T_WALL, T_PLAYER, ...).
 *
 * The scaled blitters keep the original Bresenham-style stepping exactly,
 * including its quirks (e.g. `spy >> 2` as initial error when shrinking),
 * because collision detection depends on which pixels get touched.
 */
export class Bitmap {
  private image: Uint8Array | null = null;
  private palette = new Uint8Array(768);
  private width = 0;
  private height = 0;

  /** Decode a PCX file (8 bpp, RLE, 256-colour palette at the end). */
  static fromPCX(data: Uint8Array): Bitmap {
    const b = new Bitmap();
    b.loadPCX(data);
    return b;
  }

  /** Build a bitmap from raw indexed pixels (used by tests and tools). */
  static fromPixels(width: number, height: number, pixels: Uint8Array, palette?: Uint8Array): Bitmap {
    const b = new Bitmap();
    b.width = width;
    b.height = height;
    b.image = pixels;
    if (palette) b.palette.set(palette);
    return b;
  }

  private loadPCX(data: Uint8Array): boolean {
    let pos = 0;
    const getc = (): number => (pos < data.length ? data[pos++] : -1);

    if (getc() !== 10 || getc() !== 5 || getc() !== 1) return false;
    if (getc() !== 8) return false;

    // Window origin (ignored), then window extents.
    getc();
    getc();
    getc();
    getc();
    let a = getc();
    let b = getc();
    this.width = a + b * 256 + 1;
    a = getc();
    b = getc();
    this.height = a + b * 256 + 1;

    // Skip the rest of the 128-byte header.
    pos += 116;

    const size = this.width * this.height;
    const image = new Uint8Array(size);
    let offset = 0;
    while (offset < size) {
      let columnas = this.width;
      while (columnas > 0 && offset < size) {
        let byte = getc() & 0xff;
        if (byte <= 192) {
          image[offset++] = byte;
          columnas--;
        } else {
          let contador = byte & 63;
          byte = getc() & 0xff;
          for (; contador !== 0 && offset < size; contador--) {
            image[offset++] = byte;
            columnas--;
          }
        }
      }
    }
    this.image = image;

    if (getc() !== 12) return false;
    // The palette is stored 8-bit; the game works with 6-bit VGA values.
    for (let c = 0; c < 768; c++) this.palette[c] = (getc() & 0xff) >> 2;
    return true;
  }

  getPixels(): Uint8Array | null {
    return this.image;
  }
  getPalette(): Uint8Array {
    return this.palette;
  }
  getWidth(): number {
    return this.width;
  }
  getHeight(): number {
    return this.height;
  }

  /** Draw the whole bitmap scaled to `sx`×`sy` at (x, y). */
  draw(
    x: number,
    y: number,
    sx: number,
    sy: number,
    screen: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
  ): void {
    const image = this.image;
    if (image === null) return;
    const srcW = this.width;
    const srcH = this.height;
    let xError: number, yError: number, xt: number, yt: number, offso: number, offsd: number;

    if (sy > srcH) {
      yError = sy >> 1;
      offso = 0;
      offsd = y * pitch;
      yt = 0;
      for (let i = 0; i < sy; i++) {
        if (i + y >= 0 && i + y < screenY && yt < srcH) {
          if (sx > srcW) {
            xError = sx >> 1;
            xt = 0;
            for (let j = 0; j < sx; j++) {
              if (j + x >= 0 && j + x < screenX && xt < srcW && image[xt + offso] !== 0)
                screen[x + j + offsd] = image[xt + offso];
              xError -= srcW;
              if (xError < 0) {
                xError += sx;
                xt++;
              }
            }
          } else {
            xError = srcW >> 1;
            xt = 0;
            for (let j = 0; j < srcW; j++) {
              if (xt + x >= 0 && xt + x < screenX && image[j + offso] !== 0) screen[x + xt + offsd] = image[j + offso];
              xError -= sx;
              if (xError < 0) {
                xError += srcW;
                xt++;
              }
            }
          }
        }
        yError -= srcH;
        offsd += pitch;
        if (yError < 0) {
          yError += sy;
          yt++;
          offso += srcW;
        }
      }
    } else {
      yError = srcH >> 2;
      offso = 0;
      offsd = y * pitch;
      yt = 0;
      for (let i = 0; i < srcH; i++) {
        if (yt + y >= 0 && yt + y < screenY) {
          if (sx > srcW) {
            xError = sx >> 1;
            xt = 0;
            for (let j = 0; j < sx; j++) {
              if (j + x >= 0 && j + x < screenX && xt < srcW && image[xt + offso] !== 0)
                screen[x + j + offsd] = image[xt + offso];
              xError -= srcW;
              if (xError < 0) {
                xError += sx;
                xt++;
              }
            }
          } else {
            xError = srcW >> 1;
            xt = 0;
            for (let j = 0; j < srcW; j++) {
              if (xt + x >= 0 && xt + x < screenX && image[j + offso] !== 0) screen[x + xt + offsd] = image[j + offso];
              xError -= sx;
              if (xError < 0) {
                xError += srcW;
                xt++;
              }
            }
          }
        }
        yError -= sy;
        offso += srcW;
        if (yError < 0) {
          yError += srcH;
          yt++;
          offsd += pitch;
        }
      }
    }
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
    screen: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
  ): void {
    const image = this.image;
    if (image === null) return;
    const plot = (d: number, s: number) => {
      screen[d] = image[s];
    };
    if (sx === spx && sy === spy) this.blit1(x1, y1, spx, spy, x, y, screenX, screenY, pitch, plot);
    else this.blit(x1, y1, spx, spy, x, y, sx, sy, screenX, screenY, pitch, null, plot);
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
    screen: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
    cut: number,
  ): void {
    const image = this.image;
    if (image === null) return;
    this.blit(x1, y1, spx, spy, x, y, sx, sy, screenX, screenY, pitch, cut, (d, s) => {
      screen[d] = image[s];
    });
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
    screen: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
  ): void {
    if (this.image === null) return;
    const plot = (d: number) => {
      screen[d] |= type;
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
    screen: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
  ): number {
    if (this.image === null) return 0;
    let retval = 0;
    const plot = (d: number) => {
      retval |= screen[d] ?? 0;
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
