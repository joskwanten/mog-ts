/**
 * RGBA bitmaps: indexed images become RGBA with index 0 transparent, partly
 * transparent pixels blend over the frame buffer, and every drawn pixel
 * (any alpha) paints the collision buffer. On a 2× screen a bitmap draws
 * from its HD version, or as 2×2 blocks without one.
 */
import { expect, test } from 'vitest';
import { Bitmap, rgba } from '../src/engine/bitmap';
import { Screen } from '../src/engine/screen';

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
  const screen = new Screen(W, H);
  screen.pixels.fill(rgba(9, 9, 9));
  bmp.drawSprite(0, 0, W, H, 0, 0, W, H, screen, W, H, W);
  expect([...screen.pixels]).toEqual([rgba(9, 9, 9), rgba(1, 2, 3), rgba(9, 9, 9), rgba(9, 9, 9)]);
});

test('partly transparent pixels blend over the frame buffer and still collide', () => {
  const bmp = Bitmap.fromRGBA(W, H, Uint32Array.of(rgba(255, 0, 100, 128), 0, 0, 0));
  const screen = new Screen(W, H);
  screen.pixels.fill(rgba(0, 255, 100));
  bmp.drawSprite(0, 0, W, H, 0, 0, W, H, screen, W, H, W);
  expect(screen.pixels[0]).toBe(rgba(128, 127, 100));

  const collision = new Uint8Array(W * H);
  bmp.drawSpriteMask(4, 0, 0, W, H, 0, 0, W, H, collision, W, H, W);
  expect([...collision]).toEqual([4, 0, 0, 0]);
});

const A = rgba(200, 0, 0);
const B = rgba(0, 200, 0);
const C = rgba(0, 0, 200);

/** A 2×1 bitmap (A, transparent) with a 4×2 HD version. */
function withHd(): Bitmap {
  const bmp = Bitmap.fromRGBA(2, 1, Uint32Array.of(A, 0));
  // HD: the left pixel becomes a 2×2 block with detail, the right one stays transparent.
  bmp.hd = Bitmap.fromRGBA(4, 2, Uint32Array.of(A, B, 0, 0, C, 0, 0, 0));
  return bmp;
}

test('on a 2× screen a bitmap without HD version is drawn as 2×2 blocks', () => {
  const bmp = Bitmap.fromRGBA(2, 1, Uint32Array.of(A, B));
  const screen = new Screen(2, 1, 2);
  bmp.drawSprite(0, 0, 2, 1, 0, 0, 2, 1, screen, 2, 1, 2);
  expect([...screen.pixels]).toEqual([A, A, B, B, A, A, B, B]);
});

test('on a 2× screen the HD version is drawn; collisions use the bitmap itself', () => {
  const bmp = withHd();
  const screen = new Screen(2, 1, 2);
  bmp.drawSprite(0, 0, 2, 1, 0, 0, 2, 1, screen, 2, 1, 2);
  expect([...screen.pixels]).toEqual([A, B, 0, 0, C, 0, 0, 0]);

  const collision = new Uint8Array(2);
  bmp.drawSpriteMask(1, 0, 0, 2, 1, 0, 0, 2, 1, collision, 2, 1, 2);
  expect([...collision]).toEqual([1, 0]);
});

test('an HD version of another scale is ignored', () => {
  const bmp = withHd();
  const screen = new Screen(2, 1, 3);
  bmp.drawSprite(0, 0, 2, 1, 0, 0, 2, 1, screen, 2, 1, 2);
  expect(screen.pixels.slice(0, 3)).toEqual(Uint32Array.of(A, A, A));
});

test('clearing a rectangle also clears it in the HD version', () => {
  const bmp = withHd();
  bmp.clearRect(0, 0, 1, 1);
  expect([...bmp.getPixels()!]).toEqual([0, 0]);
  expect([...bmp.hd!.getPixels()!]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
});
