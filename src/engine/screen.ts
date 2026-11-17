/**
 * The colour frame buffer.
 *
 * The game works in logical pixels: 640×400, the resolution of the remake
 * and of the collision buffer. The frame buffer has `scale`×`scale` physical
 * pixels per logical pixel, so graphics can be shown at a higher resolution
 * (e.g. 1280×800) while the game logic and collision detection stay on the
 * original raster. Pixels are RGBA, packed as in ImageData (0xAABBGGRR); the
 * frame is opaque, its alpha byte is ignored on output.
 */
export class Screen {
  /** Physical size in pixels. */
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint32Array;

  constructor(
    readonly logicalWidth: number,
    readonly logicalHeight: number,
    readonly scale = 1,
  ) {
    this.width = logicalWidth * scale;
    this.height = logicalHeight * scale;
    this.pixels = new Uint32Array(this.width * this.height);
  }

  /** Physical index of the top-left pixel of logical pixel `i` (x + y * logicalWidth). */
  physical(i: number): number {
    const x = i % this.logicalWidth;
    const y = (i - x) / this.logicalWidth;
    return (y * this.width + x) * this.scale;
  }

  /** Set logical pixel `i` to `color`. */
  plot(i: number, color: number): void {
    const s = this.scale;
    if (s === 1) {
      this.pixels[i] = color;
      return;
    }
    const p = this.physical(i);
    for (let r = 0; r < s; r++) this.pixels.fill(color, p + r * this.width, p + r * this.width + s);
  }

  /**
   * C `memset` on the logical buffer: set `count` logical pixels from logical
   * index `offset` on (running on into the next rows), clipped to the buffer.
   */
  fillSpan(offset: number, color: number, count: number): void {
    const n = this.logicalWidth * this.logicalHeight;
    let i = Math.max(0, offset);
    const end = Math.min(n, offset + count);
    if (this.scale === 1) {
      if (i < end) this.pixels.fill(color, i, end);
      return;
    }
    const s = this.scale;
    while (i < end) {
      const x = i % this.logicalWidth;
      const len = Math.min(end - i, this.logicalWidth - x);
      const p = this.physical(i);
      for (let r = 0; r < s; r++) this.pixels.fill(color, p + r * this.width, p + r * this.width + len * s);
      i += len;
    }
  }
}
