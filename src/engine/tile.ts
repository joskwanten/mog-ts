import type { Screen } from './screen';
import { Bitmap } from './bitmap';
import { Sprite } from './sprite';

/**
 * A drawable game tile: a sprite plus the collision type it paints into the
 * collision buffer (port of tiles.h).
 *
 * The C++ overloads without sx/sy (native size) are folded into the same
 * methods: pass `sx`/`sy` explicitly, or use the `*N` (native) variants.
 */
export class Tile {
  sprite: Sprite;
  collisionType: number;
  /**
   * In-between frames (not in the remake; render-only): a strip of `frames` frames of
   * the tile's size whose HD version holds the pictures (frame 0 is the tile itself).
   * See drawPhase.
   */
  private strip: Bitmap | null = null;
  private frames = 0;

  constructor(src: Bitmap, x: number, y: number, dx: number, dy: number, type: number, xOffs = 0, yOffs = 0) {
    this.sprite = new Sprite(src, x, y, dx, dy, xOffs, yOffs);
    this.collisionType = type;
  }

  /** Draw scaled to sx×sy and paint the collision mask. */
  draw(
    x: number,
    y: number,
    sx: number,
    sy: number,
    screen: Screen,
    colbuffer: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
  ): void {
    this.sprite.draw(x, y, sx, sy, screen, screenX, screenY, pitch);
    this.sprite.drawMask(this.collisionType, x, y, sx, sy, colbuffer, screenX, screenY, pitch);
  }

  /**
   * Give this tile in-between frames: `image` is a strip of frames side by side, each an
   * integer multiple (the HD scale) of the tile's size. Frame 0 should be the tile itself.
   * Returns the number of frames (0 if the image does not fit the tile).
   */
  setInbetweens(image: { width: number; height: number; pixels: Uint32Array }): number {
    const { w, h } = this.sprite;
    const scale = image.height / h;
    const frames = image.width / (w * scale);
    if (!Number.isInteger(scale) || !Number.isInteger(frames) || frames < 2) return 0;
    this.strip = Bitmap.fromRGBA(w * frames, h, new Uint32Array(w * frames * h).fill(0xff000000));
    this.strip.hd = Bitmap.fromRGBA(image.width, image.height, image.pixels.slice());
    this.frames = frames;
    return frames;
  }

  /**
   * Like draw, but shows in-between frame `phase` (0 … frames − 1) when the screen can
   * show it in HD. The collision mask is always the tile's own, so the game is unchanged.
   */
  drawPhase(
    x: number,
    y: number,
    sx: number,
    sy: number,
    screen: Screen,
    colbuffer: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
    phase: number,
  ): void {
    const strip = this.strip;
    const s = this.sprite;
    if (strip !== null && phase > 0 && phase < this.frames && strip.hasHd(screen.scale)) {
      strip.drawSprite(phase * s.w, 0, s.w, s.h, x - s.offsetX, y - s.offsetY, sx, sy, screen, screenX, screenY, pitch);
    } else {
      s.draw(x, y, sx, sy, screen, screenX, screenY, pitch);
    }
    s.drawMask(this.collisionType, x, y, sx, sy, colbuffer, screenX, screenY, pitch);
  }

  /** Native-size draw + collision mask (C++ `draw(x,y,screen,colbuffer,...)`). */
  drawNative(
    x: number,
    y: number,
    screen: Screen,
    colbuffer: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
  ): void {
    this.draw(x, y, this.sprite.w, this.sprite.h, screen, colbuffer, screenX, screenY, pitch);
  }

  drawCut(
    x: number,
    y: number,
    sx: number,
    sy: number,
    screen: Screen,
    _colbuffer: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
    cut: number,
  ): void {
    this.sprite.drawCut(x, y, sx, sy, screen, screenX, screenY, pitch, cut);
  }

  drawMask(
    x: number,
    y: number,
    sx: number,
    sy: number,
    colbuffer: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
  ): void {
    this.sprite.drawMask(this.collisionType, x, y, sx, sy, colbuffer, screenX, screenY, pitch);
  }

  /** Native-size variant of drawMask. */
  drawMaskNative(x: number, y: number, colbuffer: Uint8Array, screenX: number, screenY: number, pitch: number): void {
    this.drawMask(x, y, this.sprite.w, this.sprite.h, colbuffer, screenX, screenY, pitch);
  }

  drawNoMask(
    x: number,
    y: number,
    sx: number,
    sy: number,
    screen: Screen,
    screenX: number,
    screenY: number,
    pitch: number,
  ): void {
    this.sprite.draw(x, y, sx, sy, screen, screenX, screenY, pitch);
  }

  /** Native-size variant of drawNoMask. */
  drawNoMaskNative(x: number, y: number, screen: Screen, screenX: number, screenY: number, pitch: number): void {
    this.sprite.draw(x, y, this.sprite.w, this.sprite.h, screen, screenX, screenY, pitch);
  }

  collisionTest(
    x: number,
    y: number,
    sx: number,
    sy: number,
    colbuffer: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
  ): number {
    return this.sprite.collisionTest(x, y, sx, sy, colbuffer, screenX, screenY, pitch);
  }

  /** Native-size variant of coltest. */
  collisionTestNative(
    x: number,
    y: number,
    colbuffer: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
  ): number {
    return this.sprite.collisionTest(x, y, this.sprite.w, this.sprite.h, colbuffer, screenX, screenY, pitch);
  }

  overlaps(t: Tile, x1: number, y1: number, x2: number, y2: number): boolean {
    return this.sprite.overlaps(t.sprite, x1, y1, x2, y2);
  }
}
