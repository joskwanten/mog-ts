/**
 * Game data access (replaces fopen/f1open on the Emscripten virtual FS).
 *
 * - Room files are bundled as text and are available synchronously.
 * - Graphics (PCX) are fetched up front for the active and default sets, so
 *   the game can keep its synchronous `loadBitmap()` calls. A set may have HD
 *   versions of its bitmaps as PNG in `graphics/<set>/hd/` (e.g. tiles.png at
 *   twice the size of tiles.pcx); they are decoded to RGBA while preloading.
 *   `hd/anim/<tile>.png` holds in-between frames for tile number <tile>.
 * - Sounds are decoded by the audio module (see audio.ts).
 *
 * Paths use the remake's layout: `graphics/<set>/`, `sound/<set>/`, `rooms/`.
 */

const roomTexts = import.meta.glob('../../assets/rooms/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const graphicUrls = import.meta.glob('../../assets/graphics/*/*.pcx', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const hdUrls = import.meta.glob(['../../assets/graphics/*/hd/*.png', '../../assets/graphics/*/hd/anim/*.png'], {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const soundUrls = import.meta.glob('../../assets/sound/*/*.{wav,ogg}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const PREFIX = '../../assets/';

/** "graphics/original/tiles.pcx" → bundled URL. */
const urlIndex = new Map<string, string>();
for (const [k, v] of Object.entries({ ...graphicUrls, ...hdUrls, ...soundUrls }))
  urlIndex.set(k.slice(PREFIX.length), v);

const textIndex = new Map<string, string>();
for (const [k, v] of Object.entries(roomTexts)) textIndex.set(k.slice(PREFIX.length), v);

const binaryCache = new Map<string, Uint8Array>();

/** A decoded image: RGBA pixels packed as in ImageData. */
export interface RGBAImage {
  width: number;
  height: number;
  pixels: Uint32Array;
}

const imageCache = new Map<string, RGBAImage>();

/** Graphic sets in menu order; "original" first, like the remake's default. */
export const GRAPHIC_SETS = ['original', 'naramura', 'alternate', 'boltian', 'hinox', 'alfonso'];
/** Sound sets in menu order. */
export const SOUND_SETS = ['original', 'jorito', 'Rob', 'wolf', 'alternate', 'Bart'];

export function assetUrl(path: string): string | undefined {
  return urlIndex.get(path);
}

/** Synchronous text read; null if the file does not exist (fopen returned NULL). */
export function readText(path: string): string | null {
  return textIndex.get(path) ?? null;
}

/** Synchronous binary read of a preloaded file; null if missing or not loaded. */
export function readBinary(path: string): Uint8Array | null {
  return binaryCache.get(path) ?? null;
}

/** Put a file into the cache directly (used by tests running outside the browser). */
export function registerBinary(path: string, data: Uint8Array): void {
  binaryCache.set(path, data);
}

/** Paths of the preloaded images whose path starts with `prefix`. */
export function imagePaths(prefix: string): string[] {
  return [...imageCache.keys()].filter((p) => p.startsWith(prefix));
}

/** Synchronous read of a preloaded image (HD graphics); null if missing or not loaded. */
export function readImage(path: string): RGBAImage | null {
  return imageCache.get(path) ?? null;
}

/** Put a decoded image into the cache directly (used by tests running outside the browser). */
export function registerImage(path: string, image: RGBAImage): void {
  imageCache.set(path, image);
}

async function fetchBytes(path: string, url: string): Promise<ArrayBuffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.arrayBuffer();
}

/** Decode a PNG (or any browser image) to straight, non-premultiplied RGBA. */
async function decodeImage(data: ArrayBuffer): Promise<RGBAImage> {
  const bmp = await createImageBitmap(new Blob([data]), {
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
  });
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0);
  const rgba = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
  return {
    width: bmp.width,
    height: bmp.height,
    pixels: new Uint32Array(rgba.buffer, rgba.byteOffset, rgba.length / 4),
  };
}

/** Fetch all PCX files (and decode the HD PNGs) of the given graphic sets into the cache. */
export async function preloadGraphics(sets: string[]): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const [path, url] of urlIndex) {
    const set = path.split('/')[1];
    if (!path.startsWith('graphics/') || !sets.includes(set)) continue;
    if (path.endsWith('.pcx') && !binaryCache.has(path)) {
      jobs.push(fetchBytes(path, url).then((buf) => void binaryCache.set(path, new Uint8Array(buf))));
    } else if (path.endsWith('.png') && !imageCache.has(path)) {
      jobs.push(
        fetchBytes(path, url)
          .then(decodeImage)
          .then((img) => void imageCache.set(path, img)),
      );
    }
  }
  await Promise.all(jobs);
}

/** All sound file paths (e.g. "sound/original/jump.wav") of the given sets. */
export function soundPaths(sets: string[]): string[] {
  return [...urlIndex.keys()].filter((p) => p.startsWith('sound/') && sets.includes(p.split('/')[1]));
}
