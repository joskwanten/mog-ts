/**
 * Presents the game's 8-bit indexed frame buffer on a canvas (port of render.cpp).
 *
 * The game draws every frame into a 640×400 indexed buffer. The palette
 * (G.colors) holds 6-bit VGA values, so each component is shifted left by 2.
 * The remake describes up to four "views" (logic source rect → physical
 * destination rect); view 0 is the status bar or full screen, view 1 the
 * game area (used by its zoom feature).
 */
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
  private readonly lut = new Uint32Array(256);
  private readonly staging: HTMLCanvasElement;
  private readonly stagingCtx: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement) {
    canvas.width = SCREEN_X;
    canvas.height = SCREEN_Y;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
    this.frame = new ImageData(SCREEN_X, SCREEN_Y);
    this.frame32 = new Uint32Array(this.frame.data.buffer);
    this.staging = document.createElement('canvas');
    this.staging.width = SCREEN_X;
    this.staging.height = SCREEN_Y;
    this.stagingCtx = this.staging.getContext('2d', { alpha: false })!;
    this.stagingCtx.imageSmoothingEnabled = false;
  }

  /** Rebuild the colour lookup table from a 768-byte 6-bit palette. */
  setPalette(colors: Uint8Array): void {
    for (let i = 0; i < 256; i++) {
      const r = (colors[i * 3] << 2) & 0xff;
      const g = (colors[i * 3 + 1] << 2) & 0xff;
      const b = (colors[i * 3 + 2] << 2) & 0xff;
      // ImageData is RGBA in memory → little-endian ABGR as uint32.
      this.lut[i] = (0xff << 24) | (b << 16) | (g << 8) | r;
    }
  }

  /** Convert the indexed buffer and draw it using the view rectangles. */
  present(buffer: Uint8Array, views: ViewRects): void {
    const out = this.frame32;
    const lut = this.lut;
    for (let i = 0; i < buffer.length; i++) out[i] = lut[buffer[i]];
    this.stagingCtx.putImageData(this.frame, 0, 0);

    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_X, SCREEN_Y);
    for (let v = 0; v < 4; v++) {
      if (views.logicDx[v] === 0) continue;
      ctx.drawImage(
        this.staging,
        views.logicX[v],
        views.logicY[v],
        views.logicDx[v],
        views.logicDy[v],
        views.physicX[v],
        views.physicY[v],
        views.physicDx[v],
        views.physicDy[v],
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
