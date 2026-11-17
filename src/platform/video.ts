/**
 * Presents the game's RGBA frame buffer on a canvas (port of render.cpp).
 *
 * The game draws every frame into a Screen: 640×400 logical pixels, each
 * `scale`×`scale` RGBA pixels (packed as in ImageData). The frame is opaque:
 * its alpha byte is ignored. The view rectangles are in logical pixels.
 * The remake describes up to four "views" (logic source rect → physical
 * destination rect); view 0 is the status bar or full screen, view 1 the
 * game area (used by its zoom feature).
 */
import type { Screen } from '../engine/screen';
import { SCREEN_X, SCREEN_Y } from '../game/constants';

export interface ViewRects {
  logicDx: number[];
  logicDy: number[];
  logicX: number[];
  logicY: number[];
  physicDx: number[];
  physicDy: number[];
  physicX: number[];
  physicY: number[];
}

export class Video {
  readonly ctx: CanvasRenderingContext2D;
  private readonly frame: ImageData;
  private readonly frame32: Uint32Array;
  private readonly staging: HTMLCanvasElement;
  private readonly stagingCtx: CanvasRenderingContext2D;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly scale = 1,
  ) {
    const w = SCREEN_X * scale;
    const h = SCREEN_Y * scale;
    canvas.width = w;
    canvas.height = h;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
    this.frame = new ImageData(w, h);
    this.frame32 = new Uint32Array(this.frame.data.buffer);
    this.staging = document.createElement('canvas');
    this.staging.width = w;
    this.staging.height = h;
    this.stagingCtx = this.staging.getContext('2d', { alpha: false })!;
    this.stagingCtx.imageSmoothingEnabled = false;
  }

  /** Draw the frame buffer using the view rectangles. */
  present(screen: Screen, views: ViewRects): void {
    const buffer = screen.pixels;
    const out = this.frame32;
    for (let i = 0; i < buffer.length; i++) out[i] = buffer[i] | 0xff000000;
    this.stagingCtx.putImageData(this.frame, 0, 0);

    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const k = this.scale;
    for (let v = 0; v < 4; v++) {
      if (views.logicDx[v] === 0) continue;
      ctx.drawImage(
        this.staging,
        views.logicX[v] * k,
        views.logicY[v] * k,
        views.logicDx[v] * k,
        views.logicDy[v] * k,
        views.physicX[v] * k,
        views.physicY[v] * k,
        views.physicDx[v] * k,
        views.physicDy[v] * k,
      );
    }
  }

  /** Scale the canvas (CSS) to the largest size that fits the window, keeping square pixels. */
  fitToWindow(): void {
    const scale = Math.min(window.innerWidth / SCREEN_X, window.innerHeight / SCREEN_Y);
    this.canvas.style.width = `${Math.floor(SCREEN_X * scale)}px`;
    this.canvas.style.height = `${Math.floor(SCREEN_Y * scale)}px`;
  }
}
