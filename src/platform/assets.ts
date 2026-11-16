/**
 * Game data access (replaces fopen/f1open on the Emscripten virtual FS).
 *
 * - Room files are bundled as text and are available synchronously.
 * - Graphics (PCX) are fetched up front for the active and default sets, so
 *   the game can keep its synchronous `loadBitmap()` calls.
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
const soundUrls = import.meta.glob('../../assets/sound/*/*.{wav,ogg}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const PREFIX = '../../assets/';

/** "graphics/original/tiles.pcx" → bundled URL. */
const urlIndex = new Map<string, string>();
for (const [k, v] of Object.entries({ ...graphicUrls, ...soundUrls })) urlIndex.set(k.slice(PREFIX.length), v);

const textIndex = new Map<string, string>();
for (const [k, v] of Object.entries(roomTexts)) textIndex.set(k.slice(PREFIX.length), v);

const binaryCache = new Map<string, Uint8Array>();

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

/** Fetch all PCX files of the given graphic sets into the cache. */
export async function preloadGraphics(sets: string[]): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const [path, url] of urlIndex) {
    if (!path.endsWith('.pcx')) continue;
    const set = path.split('/')[1];
    if (!sets.includes(set) || binaryCache.has(path)) continue;
    jobs.push(
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
          return r.arrayBuffer();
        })
        .then((buf) => {
          binaryCache.set(path, new Uint8Array(buf));
        }),
    );
  }
  await Promise.all(jobs);
}

/** All sound file paths (e.g. "sound/original/jump.wav") of the given sets. */
export function soundPaths(sets: string[]): string[] {
  return [...urlIndex.keys()].filter((p) => p.startsWith('sound/') && sets.includes(p.split('/')[1]));
}
