/**
 * RGBA bitmaps: indexed images become RGBA with index 0 transparent, partly
 * transparent pixels blend over the frame buffer, and every drawn pixel
 * (any alpha) paints the collision buffer.
 */
import { expect, test } from 'vitest';
import { Bitmap, rgba } from '../src/engine/bitmap';

const W = 4;
const H = 1;

test('indexed images use the given colours; index 0 is transparent', () => {
  const colors = new Uint32Array(256);
  colors[1] = rgba(10, 20, 30);
  colors[2] = rgba(40, 50, 60);
  const bmp = Bitmap.fromIndexed(
    {
      width: 3,
      height: 1,
      indices: Uint8Array.of(0, 1, 2),
      palette: new Uint8Array(768),
    },
    colors,
  );
  expect([...bmp.getPixels()!]).toEqual([0, rgba(10, 20, 30), rgba(40, 50, 60)]);
});

test('fully transparent pixels are normalised to 0 and not drawn', () => {
  const bmp = Bitmap.fromRGBA(W, H, Uint32Array.of(rgba(255, 0, 0, 0), rgba(1, 2, 3), 0, 0));
  expect(bmp.getPixels()![0]).toBe(0);
  const screen = new Uint32Array(W * H).fill(rgba(9, 9, 9));
  bmp.drawSprite(0, 0, W, H, 0, 0, W, H, screen, W, H, W);
  expect([...screen]).toEqual([rgba(9, 9, 9), rgba(1, 2, 3), rgba(9, 9, 9), rgba(9, 9, 9)]);
});

test('partly transparent pixels blend over the frame buffer and still collide', () => {
  const bmp = Bitmap.fromRGBA(W, H, Uint32Array.of(rgba(255, 0, 100, 128), 0, 0, 0));
  const screen = new Uint32Array(W * H).fill(rgba(0, 255, 100));
  bmp.drawSprite(0, 0, W, H, 0, 0, W, H, screen, W, H, W);
  expect(screen[0]).toBe(rgba(128, 127, 100));

  const collision = new Uint8Array(W * H);
  bmp.drawSpriteMask(4, 0, 0, W, H, 0, 0, W, H, collision, W, H, W);
  expect([...collision]).toEqual([4, 0, 0, 0]);
});
