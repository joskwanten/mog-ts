import type { Bitmap } from './bitmap';

/** A rectangular region of a Bitmap with a drawing hot-spot offset (port of sprites.h). */
export class Sprite {
  constructor(
    public bitmap: Bitmap,
    public x: number,
    public y: number,
    public w: number,
    public h: number,
    public offsetX = 0,
    public offsetY = 0,
  ) {}

  /** Draw scaled to sx×sy; omit sx/sy to draw at native size. */
  draw(
    x: number,
    y: number,
    sx: number,
    sy: number,
    screen: Uint32Array,
    screenX: number,
    screenY: number,
    pitch: number,
  ): void {
    this.bitmap.drawSprite(
      this.x,
      this.y,
      this.w,
      this.h,
      x - this.offsetX,
      y - this.offsetY,
      sx,
      sy,
      screen,
      screenX,
      screenY,
      pitch,
    );
  }

  drawCut(
    x: number,
    y: number,
    sx: number,
    sy: number,
    screen: Uint32Array,
    screenX: number,
    screenY: number,
    pitch: number,
    cut: number,
  ): void {
    this.bitmap.drawSpriteCut(
      this.x,
      this.y,
      this.w,
      this.h,
      x - this.offsetX,
      y - this.offsetY,
      sx,
      sy,
      screen,
      screenX,
      screenY,
      pitch,
      cut,
    );
  }

  drawMask(
    type: number,
    x: number,
    y: number,
    sx: number,
    sy: number,
    colbuffer: Uint8Array,
    screenX: number,
    screenY: number,
    pitch: number,
  ): void {
    this.bitmap.drawSpriteMask(
      type,
      this.x,
      this.y,
      this.w,
      this.h,
      x - this.offsetX,
      y - this.offsetY,
      sx,
      sy,
      colbuffer,
      screenX,
      screenY,
      pitch,
    );
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
    return this.bitmap.collisionTest(
      this.x,
      this.y,
      this.w,
      this.h,
      x - this.offsetX,
      y - this.offsetY,
      sx,
      sy,
      colbuffer,
      screenX,
      screenY,
      pitch,
    );
  }

  overlaps(s: Sprite, x1: number, y1: number, x2: number, y2: number): boolean {
    return this.bitmap.overlaps(
      s.bitmap,
      x1 - this.offsetX,
      y1 - this.offsetY,
      x2 - s.offsetX,
      y2 - s.offsetY,
      this.w,
      this.h,
      s.w,
      s.h,
      this.x + this.y * this.bitmap.getWidth(),
      s.x + s.y * s.bitmap.getWidth(),
    );
  }
}
