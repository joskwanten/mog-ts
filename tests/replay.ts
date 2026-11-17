/**
 * Deterministic replay harness: runs the game headless with a fixed random
 * seed and a scripted, pseudo-random input sequence, and records a hash of
 * the frame buffer and collision buffer of every frame.
 *
 * Used as a golden-master test: refactorings must not change a single pixel.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { State } from '../src/game/constants';
import { srand } from '../src/game/cutil';
import { gameCycle } from '../src/game/gamecycle';
import { G } from '../src/game/state';
import { registerBinary } from '../src/platform/assets';
import { setSoundListener } from '../src/platform/audio';
import {
  SDLK_DOWN,
  SDLK_LEFT,
  SDLK_RIGHT,
  SDLK_SPACE,
  SDLK_UP,
  SDLK_m,
  pollKeyboard,
  setKey,
} from '../src/platform/keyboard';

const ROOT = join(__dirname, '..');
const W = 640;
const H = 400;

function preloadGraphics(set: string): void {
  const dir = join(ROOT, 'assets', 'graphics', set);
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.pcx')) registerBinary(`graphics/${set}/${f}`, new Uint8Array(readFileSync(join(dir, f))));
  }
}

/** Sounds and music requested during the current frame (part of every frame's record). */
let frameSounds: string[] = [];
setSoundListener((e) => frameSounds.push(e));
function takeSounds(): string {
  const s = frameSounds.length ? `:${frameSounds.join('+')}` : '';
  frameSounds = [];
  return s;
}

const rgb = new Uint32Array(640 * 400);
const rgbView = new Uint8Array(rgb.buffer);

/** The frame as the player sees it: opaque RGB pixels (the alpha byte is ignored, as by the video output). */
function rgbBytes(screen: Uint32Array): Uint8Array {
  for (let i = 0; i < screen.length; i++) rgb[i] = (screen[i] | 0xff000000) >>> 0;
  return rgbView;
}

/** FNV-1a over a byte array. */
function fnv(buf: Uint8Array, h = 0x811c9dc5): number {
  for (let i = 0; i < buf.length; i++) {
    h ^= buf[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Rooms visited by teleport during the replay, to exercise many enemy types. */
const TELEPORTS: [number, number, number][] = [
  [0, 5, 7],
  [1, 1, 2],
  [2, 1, 4],
  [3, 2, 5],
  [4, 2, 2],
  [5, 5, 2],
  [6, 3, 6],
  [7, 2, 4],
  [8, 4, 4],
  [9, 1, 6],
  [10, 2, 0],
  [0, 9, 11],
  [3, 3, 1],
  [7, 3, 5],
];

export interface ReplayResult {
  hashes: string[];
}

export function runReplay(opts: { frames: number; seed: number }): ReplayResult {
  preloadGraphics('original');
  srand(opts.seed);
  let inputSeed = opts.seed;
  const rnd = () => {
    inputSeed = (Math.imul(inputSeed, 1103515245) + 12345) & 0x7fffffff;
    return inputSeed;
  };
  const keys = [SDLK_UP, SDLK_DOWN, SDLK_LEFT, SDLK_RIGHT, SDLK_SPACE, SDLK_m];
  const screen = new Uint32Array(W * H);
  const hashes: string[] = [];
  let teleport = 0;

  for (let f = 0; f < opts.frames; f++) {
    // Input: start the game from the title screen, then random play.
    for (const k of keys) setKey(k, false);
    if (G.state === State.KonamiLogo || G.state === State.TitleMenu || G.state === State.KonamiAppear) {
      if (f % 40 === 39) setKey(SDLK_SPACE, true);
    } else if (G.state === State.Playing) {
      const r = rnd();
      setKey(keys[r % keys.length], true);
      if ((r >> 8) % 3 === 0) setKey(keys[(r >> 12) % 4], true);
      // Keep the characters alive so the replay keeps exploring.
      G.energy[0] = Math.max(G.energy[0], 8);
      G.energy[1] = Math.max(G.energy[1], 8);
      if (f % 250 === 0 && teleport < TELEPORTS.length) {
        const [map, mx, my] = TELEPORTS[teleport++];
        G.world = map;
        G.roomX = mx;
        G.roomY = my;
        G.playerX = 15 * 16;
        G.playerY = 9 * 16;
        G.playerState = 0;
        G.onLadder = -1;
        G.nextWorld = Math.max(G.nextWorld, map);
        G.subState = 0;
      }
    } else if (f % 20 === 19) {
      setKey(SDLK_SPACE, true);
    }

    pollKeyboard();
    gameCycle(screen);
    const h = fnv(G.collision ?? new Uint8Array(0), fnv(rgbBytes(screen)));
    hashes.push(
      `${h.toString(16).padStart(8, '0')}:${G.state}:${G.world}.${G.roomX}.${G.roomY}:${G.playerX},${G.playerY}${takeSounds()}`,
    );
  }
  return { hashes };
}

/** Every room file as [world, roomX, roomY]. */
function allRooms(): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const f of readdirSync(join(ROOT, 'assets', 'rooms')).sort()) {
    const m = /^(map|w(\d\d))(\d\d)(\d\d)\.txt$/.exec(f);
    if (m) out.push([m[2] ? Number(m[2]) : 0, Number(m[3]), Number(m[4])]);
  }
  return out;
}

const PASSAGES: [number, number, number][] = [
  [0, 5, 9],
  [0, 8, 15],
  [0, 0, 13],
  [0, 11, 10],
  [0, 9, 7],
  [0, 12, 2],
  [0, 2, 2],
  [0, 2, 5],
  [0, 12, 8],
  [0, 8, 1],
  [0, 7, 7],
  [1, 0, 6],
  [2, 3, 1],
  [3, 3, 3],
  [4, 4, 1],
  [5, 5, 1],
  [6, 5, 3],
  [7, 6, 1],
  [8, 1, 1],
  [9, 2, 0],
];

const DEMON_ROOMS: [number, number, number][] = [
  [1, 1, 7],
  [2, 8, 1],
  [3, 3, 0],
  [4, 4, 4],
  [5, 7, 4],
  [6, 3, 6],
  [7, 3, 5],
  [8, 6, 4],
  [9, 0, 0],
  [10, 4, 0],
];

/**
 * Coverage replay: visits every room (random play), every shrine/shop
 * screen and every demon fight, hashing each frame like runReplay.
 */
export function runCoverage(opts: {
  seed: number;
  roomFrames: number;
  passageFrames: number;
  demonFrames: number;
}): ReplayResult {
  preloadGraphics('original');
  srand(opts.seed);
  let inputSeed = opts.seed;
  const rnd = () => {
    inputSeed = (Math.imul(inputSeed, 1103515245) + 12345) & 0x7fffffff;
    return inputSeed;
  };
  const keys = [SDLK_UP, SDLK_DOWN, SDLK_LEFT, SDLK_RIGHT, SDLK_SPACE, SDLK_m];
  const screen = new Uint32Array(W * H);
  const hashes: string[] = [];
  const step = (randomInput: boolean) => {
    for (const k of keys) setKey(k, false);
    if (randomInput) {
      const r = rnd();
      setKey(keys[r % keys.length], true);
      if ((r >> 8) % 3 === 0) setKey(keys[(r >> 12) % 4], true);
    }
    G.energy[0] = Math.max(G.energy[0], 8);
    G.energy[1] = Math.max(G.energy[1], 8);
    pollKeyboard();
    gameCycle(screen);
    const h = fnv(G.collision ?? new Uint8Array(0), fnv(rgbBytes(screen)));
    hashes.push(
      `${h.toString(16).padStart(8, '0')}:${G.state}:${G.world}.${G.roomX}.${G.roomY}:${G.playerX},${G.playerY}${takeSounds()}`,
    );
  };
  const enter = (world: number, rx: number, ry: number) => {
    G.world = world;
    G.roomX = rx;
    G.roomY = ry;
    G.playerX = 15 * 16;
    G.playerY = 9 * 16;
    G.playerState = 0;
    G.onLadder = -1;
    G.fightingDemon = 0;
    G.nextWorld = world;
    G.state = State.Playing;
    G.subState = 0;
  };

  // Boot to the game.
  while (G.state !== State.Playing) {
    for (const k of keys) setKey(k, false);
    if (hashes.length % 20 === 19) setKey(SDLK_SPACE, true);
    pollKeyboard();
    gameCycle(screen);
    hashes.push(`${G.state}${takeSounds()}`);
  }
  for (const [w, x, y] of allRooms()) {
    enter(w, x, y);
    for (let f = 0; f < opts.roomFrames; f++) step(true);
  }
  // Shrines and shops: random keys except DOWN (which leaves the passage).
  const passageKeys = [SDLK_UP, SDLK_LEFT, SDLK_RIGHT, SDLK_SPACE, SDLK_m];
  for (const [w, x, y] of PASSAGES) {
    G.world = w;
    G.roomX = x;
    G.roomY = y;
    G.state = State.Passage;
    G.subState = 0;
    for (let f = 0; f < opts.passageFrames; f++) {
      for (const k of keys) setKey(k, false);
      if (f % 3 !== 0) setKey(passageKeys[rnd() % passageKeys.length], true);
      pollKeyboard();
      gameCycle(screen);
      const h = fnv(G.collision ?? new Uint8Array(0), fnv(rgbBytes(screen)));
      hashes.push(`${h.toString(16).padStart(8, '0')}:${G.state}:${G.world}.${G.roomX}.${G.roomY}${takeSounds()}`);
    }
  }
  for (const [w, x, y] of DEMON_ROOMS) {
    enter(w, x, y);
    step(false);
    G.fightingDemon = 1;
    for (let f = 0; f < opts.demonFrames; f++) step(true);
  }
  return { hashes };
}

/**
 * Player physics replay: in every `roomStep`-th room, from seeded random start
 * positions, run fixed input patterns (walk, jump, fall, ladders, sword) that
 * hold keys long enough to reach edges, walls and ladder ends.
 */
export function runPlayerMoves(opts: { seed: number; roomStep: number; starts: number }): ReplayResult {
  preloadGraphics('original');
  srand(opts.seed);
  let inputSeed = opts.seed;
  const rnd = () => {
    inputSeed = (Math.imul(inputSeed, 1103515245) + 12345) & 0x7fffffff;
    return inputSeed;
  };
  const keys = [SDLK_UP, SDLK_DOWN, SDLK_LEFT, SDLK_RIGHT, SDLK_SPACE, SDLK_m];
  const PATTERNS: [number[], number][] = [
    [[SDLK_LEFT], 18],
    [[SDLK_RIGHT], 18],
    [[SDLK_UP, SDLK_LEFT], 14],
    [[], 6],
    [[SDLK_UP, SDLK_RIGHT], 14],
    [[], 6],
    [[SDLK_UP], 14],
    [[SDLK_DOWN], 20],
    [[SDLK_UP], 20],
    [[SDLK_SPACE], 3],
    [[SDLK_LEFT, SDLK_SPACE], 8],
    [[SDLK_RIGHT], 4],
    [[SDLK_UP, SDLK_SPACE], 10],
    [[SDLK_DOWN, SDLK_SPACE], 6],
    [[SDLK_m], 2],
    [[SDLK_LEFT], 30],
  ];
  const screen = new Uint32Array(W * H);
  const hashes: string[] = [];
  const frame = () => {
    G.energy[0] = Math.max(G.energy[0], 8);
    G.energy[1] = Math.max(G.energy[1], 8);
    pollKeyboard();
    gameCycle(screen);
    if (G.state !== State.Playing && G.state !== State.InterScreen) {
      G.state = State.Playing;
      G.subState = 1;
    }
    const h = fnv(G.collision ?? new Uint8Array(0), fnv(rgbBytes(screen)));
    hashes.push(
      `${h.toString(16).padStart(8, '0')}:${G.world}.${G.roomX}.${G.roomY}:${G.playerX},${G.playerY}:${G.playerState}:${G.onLadder}${takeSounds()}`,
    );
  };
  while (G.state !== State.Playing) {
    for (const k of keys) setKey(k, false);
    if (hashes.length % 20 === 19) setKey(SDLK_SPACE, true);
    pollKeyboard();
    gameCycle(screen);
    hashes.push(`${G.state}${takeSounds()}`);
  }
  const rooms = allRooms().filter((_, i) => i % opts.roomStep === 0);
  for (const [w, x, y] of rooms) {
    for (let s = 0; s < opts.starts; s++) {
      G.world = w;
      G.roomX = x;
      G.roomY = y;
      G.playerX = (1 + (rnd() % 28)) * 16;
      G.playerY = (1 + (rnd() % 16)) * 16;
      G.playerState = 0;
      G.onLadder = -1;
      G.fightingDemon = 0;
      G.nextWorld = w;
      G.items[32] = true; // a secondary weapon to fire with M
      G.currentWeapon = 0;
      G.arrows = 50;
      G.state = State.Playing;
      G.subState = 0;
      for (const [held, frames] of PATTERNS) {
        for (let f = 0; f < frames; f++) {
          for (const k of keys) setKey(k, false);
          for (const k of held) setKey(k, true);
          frame();
        }
      }
    }
  }
  return { hashes };
}
