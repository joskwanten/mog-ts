import type { Screen } from './screen';
import type { Bitmap } from './bitmap';
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
