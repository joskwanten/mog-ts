/**
 * Port of demons.cpp: the demon intro effect, the demon room background and
 * the loader + AI cycle of each of the ten demons.
 *
 * G.fightingDemon counts the frames of a demon fight: 1–159 is the intro
 * (demonIntro), at 160 the demon appears (loadDemonN adds its objects), then the
 * fight runs (demonNCycle every frame); 162–193 the defeated demon dissolves
 * (demonIntro again).
 *
 * The demon is object G.demonObject, drawn with the tiles from tileIds.demon on
 * (its baseTile). Its `size` is its life; `state` is its AI state, `state2` mostly
 * a frame counter and `state3` a per-demon extra.
 */
import { Tile } from '../engine/tile';
import { playSound } from '../platform/audio';
import {
  GAME_VIEW_X,
  GAME_VIEW_Y,
  SCREEN_X,
  SCREEN_Y,
  TILE_SIZE_X,
  TILE_SIZE_Y,
  TILE_UNIT,
  T_DEMON1,
  T_DEMON10,
  T_DEMON10_BALL,
  T_DEMON1_BONES,
  T_DEMON2,
  T_DEMON2_BALLS,
  T_DEMON2_HEAD,
  T_DEMON3,
  T_DEMON3_FIRE,
  T_DEMON4,
  T_DEMON5,
  T_DEMON5_FIRE,
  T_DEMON6,
  T_DEMON6_BULLET,
  T_DEMON7,
  T_DEMON7_BULLET,
  T_DEMON8,
  T_DEMON8_BULLET,
  T_DEMON9,
  T_DEMON9_FIRE,
  T_ENEMY,
  T_LCLOUD,
} from './constants';
import { f32, idiv, rand, toInt } from './cutil';
import { addObject, loadBitmap, paletteColor } from './gameaux';
import type { GameObject } from './object';
import { gfx, sfx, tileIds } from './resources';
import { G } from './state';
import { drawTile } from './tiledraw';

/**
 * sound.cpp: Sound_subst_music_now() is an empty function in the Emscripten
 * reference build (its body is commented out), so the "demon-fast" /
 * "demon-vfast" music switch does nothing there either.
 */
function soundSubstMusicNow(_f: string): void {
  // intentionally empty, like the reference build
}

// ---------------------------------------------------------------------------
// Intro and background

/** G.fightingDemon on the frame the demon appears (the loaders also run when the graphics are reloaded). */
const DEMON_APPEARS = 160;

/** Replay the intro up to `state` after the graphics were reloaded (the bitmaps lost the dissolve). */
export function redoDemonIntro(state: number, screen: Uint32Array | null): void {
  const frames = state < 193 ? state : 160;
  for (let i = 0; i < frames; i++) demonIntro(i, screen);
}

/**
 * The order in which the dissolve effect clears the TILE_UNIT squares of a
 * tile: each of the 16 steps clears square (x, y) of every 4×4-square quadrant.
 */
const DISSOLVE_X = [3, 2, 1, 0, 0, 0, 0, 1, 2, 3, 3, 3, 2, 1, 1, 2];
const DISSOLVE_Y = [3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 1, 2, 2, 2, 1, 1];

/**
 * Dissolve step `step` (0–15) on the `cols`×`rows` tiles of a bitmap from tile
 * column `col` (row 0). Rows are SCREEN_X pixels apart, as in the C++.
 */
function dissolveTiles(img: Uint32Array, step: number, col: number, cols: number, rows: number): void {
  const half = 4 * TILE_UNIT;
  const sx = DISSOLVE_X[step] * TILE_UNIT;
  const sy = DISSOLVE_Y[step] * TILE_UNIT;
  for (let tx = 0; tx < cols; tx++) {
    for (let ty = 0; ty < rows; ty++) {
      for (let i = 0; i < TILE_UNIT; i++) {
        for (let j = 0; j < TILE_UNIT; j++) {
          const offs = TILE_SIZE_X * (col + tx) + sx + (sy + i + TILE_SIZE_Y * ty) * SCREEN_X + j;
          img[offs] = 0;
          img[offs + half] = 0;
          img[offs + half * SCREEN_X] = 0;
          img[offs + half + half * SCREEN_X] = 0;
        }
      }
    }
  }
}

/** The part of each world's demon bitmap that dissolves when the demon is defeated (in tiles). */
const DEMON_SHEETS = new Map<number, { col: number; cols: number; rows: number }>([
  [1, { col: 10, cols: 10, rows: 7 }],
  [2, { col: 0, cols: 24, rows: 6 }],
  [3, { col: 0, cols: 32, rows: 9 }],
  [4, { col: 0, cols: 40, rows: 10 }],
  [5, { col: 0, cols: 40, rows: 10 }],
  [6, { col: 0, cols: 20, rows: 20 }],
  [7, { col: 0, cols: 40, rows: 10 }],
  [8, { col: 0, cols: 20, rows: 20 }],
  [9, { col: 0, cols: 40, rows: 10 }],
  [10, { col: 0, cols: 40, rows: 10 }],
]);

/** `screen` may be null (C++ passes 0 from redoDemonIntro). */
export function demonIntro(state: number, screen: Uint32Array | null): void {
  if (state === 1) {
    gfx.back = loadBitmap(`back${G.world}.pcx`);
    G.demonBackState = 0;
    G.demonMusic = 0;
  }

  // Monster entrance effect (a flashing checkerboard):
  if (state < 32 && screen !== null && (state & 0x02) !== 0) {
    for (let i = GAME_VIEW_Y; i < SCREEN_Y; i++) {
      for (let j = 0, offs = i * SCREEN_X; j < SCREEN_X; j++, offs++) {
        if (((j + i) & 0x01) === 0) screen[offs] = paletteColor(255);
      }
    }
  }

  // Make the tiles disappear:
  if (state >= 32 && state < 64) {
    const step = idiv(state - 32, 2);
    const img = gfx.tiles!.getPixels()!;
    dissolveTiles(img, step, 34, 4, 2);
    dissolveTiles(img, step, 38, 2, 3);
  }

  // Make the monster's symbol disappear:
  if (state >= 64 && state < 96) {
    dissolveTiles(gfx.tiles2!.getPixels()!, idiv(state - 64, 2), 0, 8, 8);
    G.smokeCount = 0;
  }

  // Make the side walls disappear in world 3:
  if (state === 96 && G.world === 3) {
    const wallCols = [0, 1, 30, 31];
    const roomTiles = G.roomTiles!;

    for (let ty = 0; ty < 20; ty++) {
      if (ty % 4 !== 3) {
        for (const tx of wallCols) roomTiles[tx + ty * G.roomWidth] = 127;
      }
    }
    roomTiles[2 + 19 * G.roomWidth] = 125;
    roomTiles[3 + 19 * G.roomWidth] = 125;
    G.objects[0].size = 7;
  }

  // Smoke before the monster appears:
  if (state > 96 && state < 160 && screen !== null) {
    if ((state & 0x04) === 0) {
      G.smokeT[G.smokeCount] = 1;
      G.smokeX[G.smokeCount] = (4 + (rand() % 23)) * TILE_SIZE_X;
      G.smokeY[G.smokeCount] = (4 + (rand() % 8)) * TILE_SIZE_Y;
      G.smokeCount++;
      if (G.smokeCount === 8) G.smokeCount = 0;
    }

    for (let i = 0; i < 8; i++) {
      if (G.smokeT[i] > 0) {
        drawTile(
          screen,
          tileIds.demonsmoke + ((G.smokeT[i] >> 3) & 0x01),
          GAME_VIEW_X + G.smokeX[i],
          GAME_VIEW_Y + G.smokeY[i],
          TILE_SIZE_X * 4,
          TILE_SIZE_Y * 4,
        );
        G.smokeT[i]++;
        if (G.smokeT[i] >= 32) G.smokeT[i] = 0;
      }
    }
  }

  // Make the monster disappear:
  if (state >= 162 && state < 194 && gfx.demon !== null) {
    const step = idiv(state - 162, 2);
    const img = gfx.demon.getPixels()!;

    if (G.world === 1) G.objects[G.demonObject].state = tileIds.demon + 1;
    const sheet = DEMON_SHEETS.get(G.world);
    if (sheet !== undefined) dissolveTiles(img, step, sheet.col, sheet.cols, sheet.rows);
  }
}

/** The order in which the pixels of each 4×4 block fade in (an ordered dither). */
const FADE_IN_ORDER = [0, 8, 2, 9, 12, 4, 14, 6, 3, 10, 1, 11, 15, 7, 13, 5];

export function drawDemonBackground(screen: Uint32Array, pitch: number): void {
  const backBmp = gfx.back;
  if (backBmp === null || G.fightingDemon <= 96) return;

  if (G.demonBackState < 16) {
    // Fading in: draw the pixels whose turn has come (colour 0 is transparent).
    const img = backBmp.getPixels()!;
    for (let ty = 0; ty < SCREEN_Y - GAME_VIEW_Y; ty++) {
      for (let tx = 0; tx < SCREEN_X; tx++) {
        if (FADE_IN_ORDER[(ty % 4) * 4 + (tx % 4)] <= G.demonBackState) {
          const pixel = img[tx + ty * pitch];
          if (pixel !== 0) screen[tx + (ty + GAME_VIEW_Y) * pitch] = pixel;
        }
      }
    }
    G.demonBackState++;
  } else {
    backBmp.draw(0, GAME_VIEW_Y, SCREEN_X, SCREEN_Y, screen, SCREEN_X, SCREEN_Y, pitch);
  }
}

// ---------------------------------------------------------------------------
// Shared helpers for the demons

/** A demon tile in the demon bitmap, in tile units: [x, y, width, height]. */
type TileRect = readonly [number, number, number, number];

/** Load demon<n>.pcx and back<n>.pcx and make `rects` the demon tiles (tileIds.demon + i). */
function loadDemonGraphics(n: number, rects: readonly TileRect[]): void {
  gfx.demon = loadBitmap(`demon${n}.pcx`);
  gfx.back = loadBitmap(`back${n}.pcx`);
  const demonBmp = gfx.demon!;

  // (the C++ deletes the old G.tiles[tileIds.demon + i] here before replacing them)
  rects.forEach(([x, y, w, h], i) => {
    G.tiles[tileIds.demon + i] = new Tile(
      demonBmp,
      x * TILE_SIZE_X,
      y * TILE_SIZE_Y,
      w * TILE_SIZE_X,
      h * TILE_SIZE_Y,
      T_ENEMY,
    );
  });
}

/** Add an object drawn with the demon tiles; returns its index. */
function addDemonObject(x: number, y: number, size: number, enemy: number, state: number): number {
  const o = addObject(T_ENEMY, x, y, size, enemy, state);
  G.objects[o].baseTile = tileIds.demon;
  return o;
}

/** Set the demon's life: lower when `weakened` (the player has the world's item that weakens it). */
function setDemonLife(demon: GameObject, weakened: boolean, weakLife: number, fullLife: number): void {
  demon.size = weakened ? weakLife : fullLife;
  G.demonMaxLife = demon.size;
}

/** Speed the music up when the demon's life drops below a half and a quarter. */
function updateDemonMusic(life: number): void {
  if (life < idiv(G.demonMaxLife, 2) && G.demonMusic === 0) {
    G.demonMusic = 1;
    soundSubstMusicNow('demon-fast');
  }
  if (life < idiv(G.demonMaxLife, 4) && G.demonMusic === 1) {
    G.demonMusic = 2;
    soundSubstMusicNow('demon-vfast');
  }
}

// ----------- DEMON 1 -------------

export function loadDemon1(): void {
  loadDemonGraphics(1, [
    [0, 0, 10, 7],
    [10, 0, 10, 7],
    [20, 0, 10, 7],
    [30, 0, 10, 7],
    [0, 7, 10, 7],
    [10, 7, 10, 7],
    [0, 14, 10, 7],
    [10, 14, 10, 7],
    [20, 14, 10, 7],
    [40, 14, 10, 7],
    [0, 14, 10, 7],
    [0, 14, 10, 7],
    // Bones:
    [30, 7, 2, 2],
    [32, 7, 2, 2],
    [34, 7, 2, 2],
    [36, 7, 2, 2],
    [30, 7, 1, 1],
    [31, 7, 1, 1],
    [32, 7, 1, 1],
    [33, 7, 1, 1],
  ]);

  if (G.fightingDemon === DEMON_APPEARS) {
    G.demonObject = addDemonObject(TILE_SIZE_X * 19, TILE_SIZE_Y * 8, 0, T_DEMON1, tileIds.demon + 1);
    setDemonLife(G.objects[G.demonObject], G.worldItems[0][0], 24, 32);
  }
}

function demon1ThrowBones(demon: GameObject): void {
  playSound(sfx.demon1bones);
  addDemonObject(demon.x + TILE_SIZE_X, demon.y + 2 * TILE_SIZE_Y, 1, T_DEMON1_BONES, -TILE_UNIT);
  addDemonObject(demon.x + TILE_SIZE_X, demon.y + idiv(3 * TILE_SIZE_Y, 2), 1, T_DEMON1_BONES, -2 * TILE_UNIT);
  // (the C++ adds TILE_SIZE_Y to x here; same value as TILE_SIZE_X)
  addDemonObject(demon.x + TILE_SIZE_Y, demon.y + TILE_SIZE_Y, 1, T_DEMON1_BONES, -3 * TILE_UNIT);
}

/**
 * Demon 1 keeps its tile (tileIds.demon + pose) in `state`. On the ground it
 * moves between poses 0–2 through the in-between poses 4 and 5 (`state3` is the
 * pose to go to after them); it jumps up from pose 1 (`state3` = 1 while rising).
 */
export function demon1Cycle(): void {
  const demon = G.objects[G.demonObject];
  const demonTile = tileIds.demon;
  demon.state2--;
  updateDemonMusic(demon.size);

  if (demon.y < TILE_SIZE_Y * 8) {
    // Flying:
    demon.state = demonTile + 2 + ((demon.state2 >> 2) & 0x01);
    if (demon.state2 <= 0 && demon.state3 === 1) {
      if (rand() % 2 === 0) demon1ThrowBones(demon);
      demon.state3 = 0;
    }

    if (demon.state3 === 1) demon.y -= TILE_UNIT * 2;
    else demon.y += TILE_UNIT * 2;
    if (demon.y === TILE_SIZE_Y * 8) playSound(sfx.demon1jump);
    return;
  }

  if (demon.state2 > 0) return;
  switch (demon.state - demonTile) {
    case 1:
      switch (idiv(rand() % 90, 10)) {
        case 0:
        case 1:
          demon.state = demonTile + 4;
          demon.state2 = 8;
          demon.state3 = demonTile;
          demon.x = TILE_SIZE_X * 18 + idiv(TILE_SIZE_X, 2);
          break;
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
          demon.state = demonTile + 5;
          demon.state2 = 8;
          demon.state3 = demonTile + 2;
          demon.x = TILE_SIZE_X * 19;
          break;
        default:
          // Jump:
          demon.state = demonTile + 2;
          demon.state2 = idiv(((rand() % 3) + 2) * TILE_SIZE_Y, 2);
          demon.state3 = 1;
          demon.y -= TILE_UNIT * 2;
          break;
      }
      break;
    case 0:
      demon.state = demonTile + 4;
      demon.state2 = 8;
      demon.state3 = demonTile + 1;
      demon.x = TILE_SIZE_X * 18 + idiv(TILE_SIZE_X, 2);
      break;
    case 2:
      demon.state = demonTile + 5;
      demon.state2 = 8;
      demon.state3 = demonTile + 1;
      demon.x = TILE_SIZE_X * 19;
      break;
    case 4:
      demon.state = demon.state3;
      demon.state2 = ((rand() % 3) + 1) * 8;
      if (demon.state === demonTile) demon.x = TILE_SIZE_X * 18;
      else demon.x = TILE_SIZE_X * 19;
      break;
    case 5:
      if (demon.state3 === demonTile + 2) demon1ThrowBones(demon);
      demon.state = demon.state3;
      demon.state2 = ((rand() % 4) + 1) * 8;
      demon.x = TILE_SIZE_X * 19;
      break;
    default:
      demon.state = demonTile;
      demon.state2 = 8;
      demon.x = TILE_SIZE_X * 19;
      break;
  }
}

// ----------- DEMON 2 -------------

export function loadDemon2(): void {
  loadDemonGraphics(2, [
    [0, 0, 6, 6],
    [6, 0, 6, 6],
    [12, 0, 6, 6],
    [18, 0, 6, 6],
    [24, 0, 1, 1],
    [25, 0, 1, 1],
    [26, 0, 1, 1],
    // Red balls:
    [27, 0, 1, 1],
  ]);

  if (G.fightingDemon === DEMON_APPEARS) {
    G.demonObject = addDemonObject(TILE_SIZE_X * 13, TILE_SIZE_Y * 5, 0, T_DEMON2, tileIds.demon);
    // The head is the part that can be hit:
    G.demonObject2 = addDemonObject(
      TILE_SIZE_X * 15 + idiv(TILE_SIZE_X, 2),
      TILE_SIZE_Y * 5 + TILE_UNIT,
      0,
      T_DEMON2_HEAD,
      -1,
    );
    setDemonLife(G.objects[G.demonObject2], G.worldItems[1][0], 32, 48);
  }
}

/** Demon 2 runs a fixed 388-frame loop (`state2` of the body); it shoots from its head. */
export function demon2Cycle(): void {
  const body = G.objects[G.demonObject];
  const head = G.objects[G.demonObject2];
  const demonTile = tileIds.demon;

  updateDemonMusic(head.size);

  const t = body.state2;
  if (t < 128) {
    body.state = demonTile;
  }
  if (t >= 128 && t < 160) {
    body.state = demonTile + 1;
  }
  if (t >= 160 && t < 352) {
    const frame = (t & 0x04) === 0 ? 0 : 1;
    body.state = demonTile + 2 + frame;
    head.state = demonTile + 4 + frame;
    if ((t & 0x07) === 0) {
      // Shoot red balls:
      playSound(sfx.demon2ball);
      const ball =
        G.objects[addDemonObject(TILE_SIZE_X * 15 + idiv(TILE_SIZE_X, 2), TILE_SIZE_Y * 4, 1, T_DEMON2_BALLS, 0)];
      ball.state = (rand() % (6 * TILE_UNIT + 1)) - 3 * TILE_UNIT;
      ball.state2 = 12 + (rand() % 8);
    }
  }
  if (t >= 352 && t < 384) {
    body.state = demonTile + 1;
    head.state = -1;
  }
  if (t >= 388) body.state2 = 0;

  body.state2++;
}

// ----------- DEMON 3 -------------

export function loadDemon3(): void {
  loadDemonGraphics(3, [
    [0, 0, 16, 3],
    [0, 3, 16, 3],
    [0, 6, 16, 3],
    [16, 0, 16, 3],
    [16, 3, 16, 3],
    [16, 6, 16, 3],
    [0, 9, 2, 1],
    [2, 9, 1, 1],
    [3, 9, 2, 1],
    [0, 10, 2, 1],
    [2, 10, 1, 1],
    [3, 10, 2, 1],
  ]);

  if (G.fightingDemon === DEMON_APPEARS) {
    G.demonObject = addDemonObject(0, 0, 0, T_DEMON3, 0);
    const demon = G.objects[G.demonObject];
    demon.tile = -1;
    setDemonLife(demon, G.worldItems[2][0], 64, 96);
  }
}

/** Demon 3 (16 tiles wide) comes in from a side, breathes fire across the room and goes back. */
const D3 = {
  HIDDEN: 0,
  FROM_LEFT: 1,
  FROM_RIGHT: 2,
  /** On the left side, breathing fire to the right. */
  FIRE_RIGHT: 3,
  FIRE_LEFT: 4,
  BACK_LEFT: 5,
  BACK_RIGHT: 6,
  /** FROM_LEFT/FROM_RIGHT + 6: comes in only partly. */
  FROM_LEFT_PARTLY: 7,
  FROM_RIGHT_PARTLY: 8,
} as const;

export function demon3Cycle(): void {
  const demon = G.objects[G.demonObject];

  demon.state2++;
  updateDemonMusic(demon.size);

  switch (demon.state) {
    case D3.HIDDEN:
      demon.tile = -1;
      if (demon.state2 >= 64) {
        demon.state2 = 0;
        demon.state = 2 - idiv(rand() % 4, 2);
        if (demon.state === D3.FROM_LEFT) demon.x = -TILE_SIZE_X * 16;
        else demon.x = 32 * TILE_SIZE_X;
        // At the player's floor (one of five), give or take one:
        demon.y = idiv(G.playerY, TILE_SIZE_Y * 4) + ((rand() % 3) - 1);
        if (demon.y < 0) demon.y = 0;
        if (demon.y > 4) demon.y = 4;
        if (rand() % 10 === 0) demon.y = rand() % 5;
        demon.y *= TILE_SIZE_Y * 4;
        if (rand() % 8 === 0) demon.state += 6;
      }
      break;
    case D3.FROM_LEFT:
    case D3.FROM_LEFT_PARTLY:
      demon.tile = (demon.state2 & 0x08) !== 0 ? 1 : 2;
      if ((demon.state2 & 0x03) === 0) demon.x += TILE_SIZE_X;
      if (demon.x === (demon.state === D3.FROM_LEFT ? 0 : -4 * TILE_SIZE_X)) {
        demon.state = D3.FIRE_RIGHT;
        demon.state2 = 0;
        demon.tile = 0;
      }
      break;
    case D3.FROM_RIGHT:
    case D3.FROM_RIGHT_PARTLY:
      demon.tile = (demon.state2 & 0x08) !== 0 ? 4 : 5;
      if ((demon.state2 & 0x03) === 0) demon.x -= TILE_SIZE_X;
      if (demon.x === (demon.state === D3.FROM_RIGHT ? 16 : 20) * TILE_SIZE_X) {
        demon.state = D3.FIRE_LEFT;
        demon.state2 = 0;
        demon.tile = 3;
      }
      break;
    case D3.FIRE_RIGHT:
      demon.tile = 0;
      if (demon.state2 === 16) {
        addObject(T_ENEMY, demon.x + 16 * TILE_SIZE_X, demon.y + TILE_SIZE_Y, 0, T_DEMON3_FIRE, 0);
        playSound(sfx.firebreath);
      }
      if (demon.state2 >= 64) {
        demon.state2 = 0;
        demon.state = D3.BACK_LEFT;
      }
      break;
    case D3.FIRE_LEFT:
      demon.tile = 3;
      if (demon.state2 === 16) {
        addObject(T_ENEMY, demon.x - 2 * TILE_SIZE_X, demon.y + TILE_SIZE_Y, 0, T_DEMON3_FIRE, 1);
        playSound(sfx.firebreath);
      }
      if (demon.state2 >= 64) {
        demon.state2 = 0;
        demon.state = D3.BACK_RIGHT;
      }
      break;
    case D3.BACK_LEFT:
      demon.tile = (demon.state2 & 0x08) === 0 ? 1 : 2;
      if ((demon.state2 & 0x03) === 0) demon.x -= TILE_SIZE_X;
      if (demon.x === -16 * TILE_SIZE_X) {
        demon.state = D3.HIDDEN;
        demon.state2 = 0;
      }
      break;
    case D3.BACK_RIGHT:
      demon.tile = (demon.state2 & 0x08) === 0 ? 4 : 5;
      if ((demon.state2 & 0x03) === 0) demon.x += TILE_SIZE_X;
      if (demon.x === 32 * TILE_SIZE_X) {
        demon.state = D3.HIDDEN;
        demon.state2 = 0;
      }
      break;
  }
}

// ----------- DEMON 4 -------------

export function loadDemon4(): void {
  loadDemonGraphics(4, [
    [0, 0, 10, 5],
    [10, 0, 10, 5],
    [20, 0, 10, 5],
    [30, 0, 10, 5],
    [20, 5, 10, 5],
    [30, 5, 10, 5],
  ]);

  if (G.fightingDemon === DEMON_APPEARS) {
    G.demonObject = addDemonObject(8 * TILE_SIZE_X, 10 * TILE_SIZE_Y, 0, T_DEMON4, 0);
    const demon = G.objects[G.demonObject];
    demon.tile = 0;
    setDemonLife(demon, G.worldItems[3][0], 32, 48);
  }
}

/** Demon 4 walks to and fro and jumps over the player. */
const D4 = {
  WALK_RIGHT: 0,
  WALK_LEFT: 1,
  JUMP_RIGHT: 2,
  LAND_RIGHT: 3,
  JUMP_LEFT: 4,
  LAND_LEFT: 5,
} as const;

/** Demon 4 jumping in direction `dir`: crouch for 16 frames, then rise. */
function demon4Jump(demon: GameObject, dir: number, crouchTile: number, riseTile: number, landState: number): void {
  if (demon.state2 < 16) {
    demon.tile = crouchTile;
    return;
  }
  demon.x += 2 * dir;
  if (demon.state2 < 26) demon.tile = riseTile;
  else demon.tile = 0;
  if (demon.state2 < 20) demon.y -= TILE_UNIT * 2;
  if (demon.state2 < 24) demon.y -= TILE_UNIT * 2;
  if (demon.state2 < 28) demon.y -= TILE_UNIT;
  if (demon.state2 < 30) demon.y -= TILE_UNIT;
  if (demon.state2 < 32) demon.y -= TILE_UNIT;
  if (demon.state2 === 36) {
    demon.state = landState;
    demon.state2 = 0;
  }
}

/** Demon 4 coming down in direction `dir`, then landing and turning towards the player. */
function demon4Land(demon: GameObject, dir: number, fallTile: number, landTile: number): void {
  if (demon.state2 <= 20) {
    demon.x += 2 * dir;
    if (demon.state2 < 10) demon.tile = 0;
    else demon.tile = fallTile;
    if (demon.state2 > 16) demon.y += TILE_UNIT * 2;
    if (demon.state2 > 12) demon.y += TILE_UNIT * 2;
    if (demon.state2 > 8) demon.y += TILE_UNIT;
    if (demon.state2 > 6) demon.y += TILE_UNIT;
    if (demon.state2 > 4) demon.y += TILE_UNIT;
  } else {
    if (demon.state2 === 21) playSound(sfx.demon4jump);
    demon.tile = landTile;
    if (demon.state2 === 36) {
      if (G.playerX < demon.x) demon.state = D4.WALK_LEFT;
      else demon.state = D4.WALK_RIGHT;
    }
  }
}

export function demon4Cycle(): void {
  const demon = G.objects[G.demonObject];

  demon.state2++;
  updateDemonMusic(demon.size);

  switch (demon.state) {
    case D4.WALK_RIGHT:
      demon.x++;
      demon.tile = (demon.state2 >> 3) % 2;
      if (demon.x >= 19 * TILE_SIZE_X) demon.state = D4.WALK_LEFT;
      if (G.playerX < demon.x + 12 * TILE_SIZE_X) {
        demon.state = D4.JUMP_RIGHT;
        demon.state2 = 0;
      }
      break;
    case D4.WALK_LEFT:
      demon.x--;
      demon.tile = (demon.state2 >> 3) % 2;
      if (demon.x <= 3 * TILE_SIZE_X) demon.state = D4.WALK_RIGHT;
      if (G.playerX > demon.x - 4 * TILE_SIZE_X) {
        demon.state = D4.JUMP_LEFT;
        demon.state2 = 0;
      }
      break;
    // At a wall the demon turns, but this frame still moves on.
    case D4.JUMP_RIGHT:
      if (demon.x >= 19 * TILE_SIZE_X) demon.state = D4.JUMP_LEFT;
      demon4Jump(demon, 1, 2, 3, D4.LAND_RIGHT);
      break;
    case D4.LAND_RIGHT:
      if (demon.x >= 19 * TILE_SIZE_X) demon.state = D4.LAND_LEFT;
      demon4Land(demon, 1, 5, 4);
      break;
    case D4.JUMP_LEFT:
      if (demon.x <= 3 * TILE_SIZE_X) demon.state = D4.JUMP_RIGHT;
      demon4Jump(demon, -1, 4, 5, D4.LAND_LEFT);
      break;
    case D4.LAND_LEFT:
      if (demon.x <= 3 * TILE_SIZE_X) demon.state = D4.LAND_RIGHT;
      demon4Land(demon, -1, 3, 2);
      break;
  }
}

// ----------- DEMON 5 -------------

export function loadDemon5(): void {
  loadDemonGraphics(5, [
    [0, 0, 10, 4],
    [10, 0, 10, 4],
    [20, 0, 4, 4],
    [24, 0, 4, 4],
    [28, 0, 4, 4],
    [32, 0, 4, 4],
    [20, 4, 4, 4],
    [24, 4, 4, 4],
    [28, 4, 4, 4],
    [32, 4, 4, 4],
    [20, 8, 4, 4],
    [24, 8, 4, 4],
    [28, 8, 4, 4],
    [32, 8, 4, 4],
    [20, 12, 4, 4],
    [24, 12, 4, 4],
    [28, 12, 4, 4],
    [32, 12, 4, 4],
    // NOTE (original): the C++ computes the y of these two with TILE_SIZE_X (same value as TILE_SIZE_Y).
    [0, 6, 10, 4],
    [10, 6, 10, 4],
    [0, 4, 2, 1],
    [2, 4, 1, 1],
    [3, 4, 2, 1],
    [0, 5, 2, 1],
    [2, 5, 1, 1],
    [3, 5, 2, 1],
  ]);

  if (G.fightingDemon === DEMON_APPEARS) {
    G.demonObject = addDemonObject(14 * TILE_SIZE_X, 9 * TILE_SIZE_Y, 0, T_DEMON5, 0);
    const demon = G.objects[G.demonObject];
    demon.tile = 0;
    demon.state3 = 2;
    // NOTE (original): checks worldItems[3][0], not worldItems[4][0].
    setDemonLife(demon, G.worldItems[3][0], 40, 64);
  }
}

/** Demon 5's wing-flap animation. */
const DEMON5_FRAMES = [0, 18, 1, 19];

/** Flap: slowly in the even states, fast in the odd ones. */
function demon5Flap(demon: GameObject): void {
  demon.tile = DEMON5_FRAMES[(demon.state2 >> ((demon.state & 0x01) === 0 ? 2 : 1)) % 4];
}

/** Pick the next spot (unionX, unionY) for demon 5 to fly to. */
function demon5PickSpot(demon: GameObject): void {
  demon.unionX = (8 + (rand() % 8)) * TILE_SIZE_X;
  demon.unionY = (4 + (rand() % 7)) * TILE_SIZE_Y;
}

/**
 * Demon 5: states 0/1 hover, 2/3 and 4/5 fly to two spots in turn, 6/7 breathe
 * fire (each state +2; the odd one of each pair flaps fast). `state3` is the
 * height of its mouth (2–5, +4 while breathing) and follows the player.
 */
export function demon5Cycle(): void {
  const demon = G.objects[G.demonObject];

  demon.state2++;
  updateDemonMusic(demon.size);

  switch (demon.state) {
    case 0:
    case 1:
      demon5Flap(demon);
      if (demon.state2 >= 32) {
        demon.state += 2;
        demon.state2 = 0;
        demon5PickSpot(demon);
      }
      break;

    case 2:
    case 3:
    case 4:
    case 5:
      demon5Flap(demon);
      if (demon.y < demon.unionY) demon.y += TILE_UNIT * 2;
      if (demon.y > demon.unionY) demon.y -= TILE_UNIT * 2;
      if (demon.x < demon.unionX) demon.x += TILE_UNIT * 2;
      if (demon.x > demon.unionX) demon.x -= TILE_UNIT * 2;
      if ((demon.state2 & 0x07) === 0) {
        let dp = 2;
        if (G.playerY > demon.y && G.playerY <= demon.y + 2 * TILE_SIZE_Y) dp = 3;
        if (G.playerY > demon.y + 2 * TILE_SIZE_Y && G.playerY <= demon.y + 3 * TILE_SIZE_Y) dp = 4;
        if (G.playerY > demon.y + 3 * TILE_SIZE_Y) dp = 5;
        if (demon.state3 < dp) demon.state3++;
        if (demon.state3 > dp) demon.state3--;
      }
      if (demon.x === demon.unionX && demon.y === demon.unionY) {
        if (demon.state < 4) {
          demon.state += 2;
          demon.state2 = 0;
          demon5PickSpot(demon);
        } else if ((demon.state2 & 0x0f) === 0) {
          demon.state += 2;
          demon.state2 = 0;
          demon.state3 += 4;
        }
      }
      break;

    case 6:
    case 7:
      demon5Flap(demon);
      if (demon.state2 === 32) {
        const mouthY = [0, TILE_SIZE_Y, 2 * TILE_SIZE_Y, 3 * TILE_SIZE_Y];
        addObject(
          T_ENEMY,
          demon.x - 2 * TILE_SIZE_X,
          demon.y + mouthY[demon.state3 - 6] + TILE_SIZE_Y,
          0,
          T_DEMON5_FIRE,
          1,
        );
        playSound(sfx.firebreath);
      }
      if (demon.state2 >= 64) {
        demon.state = rand() & 0x01;
        demon.state2 = 0;
        demon.state3 -= 4;
      }
      break;
  }
}

// ----------- DEMON 6 -------------

export function loadDemon6(): void {
  loadDemonGraphics(6, [
    [0, 0, 10, 5],
    [0, 5, 10, 5],
    [0, 10, 10, 5],
    [0, 15, 10, 5],
    // Blue balls:
    [10, 0, 2, 2],
    [10, 2, 2, 2],
  ]);

  if (G.fightingDemon === DEMON_APPEARS) {
    G.demonObject = addDemonObject(TILE_SIZE_X * 12, TILE_SIZE_Y * 14, 0, T_DEMON6, 0);
    // NOTE (original): demons 6..10 all check worldItems[1][0].
    setDemonLife(G.objects[G.demonObject], G.worldItems[1][0], 48, 80);
  }
}

const D6 = { STAND: 0, MOVE_LEFT: 1, MOVE_RIGHT: 2, AIM: 3, SHOOT: 4 } as const;

/** The six-ball spreads demon 6 shoots (in units of PI/48 around the player's direction). */
const DEMON6_SPREADS = [
  [-8, -6, -2, 2, 4, 8],
  [-8, -2, 0, 2, 6, 8],
  [-8, -4, -2, 0, 2, 8],
  [-8, -6, -2, 3, 5, 8],
];

function demon6Shoot(demon: GameObject): void {
  playSound(sfx.demon2ball);

  // Angle towards the character (single precision, like the C++ floats):
  const PI = f32(3.141592);
  const dx = f32(G.playerX - (demon.x + 4 * TILE_SIZE_X));
  const dy = f32(G.playerY - demon.y);
  const angle = f32(Math.atan2(dy, dx));

  // Shoot a few balls at different angles:
  const spread = DEMON6_SPREADS[rand() % 4];
  for (let i = 0; i < 6; i++) {
    const ball = G.objects[addDemonObject(demon.x + 4 * TILE_SIZE_X, demon.y, 1, T_DEMON6_BULLET, 0)];
    const a = f32(angle + f32(f32(PI / 48) * spread[i]));
    ball.unionX = ball.x * TILE_SIZE_X;
    ball.unionY = ball.y * TILE_SIZE_Y;
    ball.state = toInt(f32(f32(f32(Math.cos(a)) * TILE_SIZE_X) * 6));
    ball.state2 = toInt(f32(f32(f32(Math.sin(a)) * TILE_SIZE_Y) * 6));
    ball.tile = 4;
  }
}

export function demon6Cycle(): void {
  const walkFrames = [0, 1, 2, 1];
  const demon = G.objects[G.demonObject];

  updateDemonMusic(demon.size);
  demon.state2++;

  switch (demon.state) {
    case D6.STAND:
      demon.tile = walkFrames[(demon.state2 >> 3) % 4];
      demon.state = rand() % 32 >> 4;
      demon.state3 = rand() % 80 >> 1;

      // Tendency to move towards the character:
      if (demon.x + 4 * TILE_SIZE_X < G.playerX && rand() % 32 < 20) demon.state = D6.MOVE_RIGHT;
      if (demon.x + 4 * TILE_SIZE_X > G.playerX && rand() % 32 < 20) demon.state = D6.MOVE_LEFT;
      break;
    case D6.MOVE_LEFT:
      demon.tile = walkFrames[(demon.state2 >> 3) % 4];
      demon.state3--;
      if (demon.state3 <= 0 || demon.x <= 5 * TILE_SIZE_X) {
        if (rand() % 32 < 4) {
          demon.state = D6.AIM;
          demon.state2 = 0;
        } else {
          demon.state = D6.STAND;
        }
      } else {
        demon.x -= TILE_UNIT;
      }
      break;
    case D6.MOVE_RIGHT:
      demon.tile = walkFrames[(demon.state2 >> 3) % 4];
      demon.state3--;
      // NOTE (original): `== 0` here vs `<= 0` when moving left.
      if (demon.state3 === 0 || demon.x >= 17 * TILE_SIZE_X) {
        if (rand() % 32 < 8) {
          demon.state = D6.AIM;
          demon.state2 = 0;
        } else {
          demon.state = D6.STAND;
        }
      } else {
        demon.x += TILE_UNIT;
      }
      break;
    case D6.AIM:
      // `state3` is the number of volleys:
      demon.tile = 2;
      demon.state3 = idiv((rand() % 13) + 3, 4);
      demon.state = D6.SHOOT;
      demon.state2 = 0;
      break;
    case D6.SHOOT:
      if (demon.state2 === 32) {
        if (demon.state3 === 0) {
          demon.state = D6.STAND;
          demon.state2 = 0;
        } else {
          demon.state2 = 0;
          demon.state3--;
          demon6Shoot(demon);
        }
      }
      break;
  }
}

// ----------- DEMON 7 -------------

export function loadDemon7(): void {
  loadDemonGraphics(7, [
    [0, 0, 8, 8],
    [8, 0, 8, 8],
    [16, 0, 8, 8],
    [24, 0, 8, 8],
    [0, 10, 8, 8],
    [8, 10, 8, 8],
    [16, 10, 8, 8],
    [24, 10, 8, 8],
    // Bullets in eight directions:
    [0, 8, 2, 2],
    [2, 8, 2, 2],
    [4, 8, 2, 2],
    [6, 8, 2, 2],
    [8, 8, 2, 2],
    [10, 8, 2, 2],
    [12, 8, 2, 2],
    [14, 8, 2, 2],
  ]);

  if (G.fightingDemon === DEMON_APPEARS) {
    G.demonObject = addDemonObject(TILE_SIZE_X * 12, TILE_SIZE_Y * 4, 0, T_DEMON7, 0);
    setDemonLife(G.objects[G.demonObject], G.worldItems[1][0], 48, 80);
  }
}

const D7 = { MOUTH_CLOSED: 0, SHOOTING: 1, RESTING: 2 } as const;

/** Pick demon 7's next move: a direction (unionX, unionY) and a number of frames (`state3`). */
function demon7PickMove(demon: GameObject): void {
  switch (rand() % 6) {
    case 0:
    case 1:
      demon.unionX = TILE_UNIT;
      demon.unionY = 0;
      demon.state3 = 32 + (rand() % 4) * 8;
      break;
    case 2:
    case 3:
      demon.unionX = -TILE_UNIT;
      demon.unionY = 0;
      demon.state3 = 32 + (rand() % 4) * 8;
      break;
    case 4:
      demon.unionX = 0;
      demon.unionY = TILE_UNIT;
      demon.state3 = 8 + (rand() % 4) * 8;
      break;
    case 5:
      demon.unionX = 0;
      demon.unionY = -TILE_UNIT;
      demon.state3 = 8 + (rand() % 4) * 8;
      break;
  }
}

/** The bullet tile (8–15) for a shot in direction (dx, dy): horizontal, vertical or diagonal. */
function demon7BulletTile(dx: number, dy: number): number {
  if (Math.abs(dx) > Math.abs(dy) * 2) return dx > 0 ? 8 : 9;
  if (Math.abs(dy) > Math.abs(dx) * 2) return dy > 0 ? 11 : 10;
  if (dx < 0) return dy < 0 ? 12 : 15;
  return dy < 0 ? 13 : 14;
}

export function demon7Cycle(): void {
  const demon = G.objects[G.demonObject];

  updateDemonMusic(demon.size);
  demon.state2++;

  switch (demon.state) {
    case D7.MOUTH_CLOSED: // about to open it
      demon.tile = 0;
      if (demon.state2 >= 16) {
        demon.state = D7.SHOOTING;
        demon.state2 = 0;
        demon7PickMove(demon);
      }
      break;
    case D7.SHOOTING: // mouth open
      demon.tile = 3;

      if ((demon.state2 & 0x0f) === 0) {
        // Shoot:
        playSound(sfx.demon7bullet);
        const bullet =
          G.objects[addDemonObject(demon.x + 3 * TILE_SIZE_X, demon.y + 3 * TILE_SIZE_Y, 1, T_DEMON7_BULLET, 0)];
        bullet.tile = demon7BulletTile(
          G.playerX - (demon.x + 3 * TILE_SIZE_X),
          G.playerY - (demon.y + 3 * TILE_SIZE_Y),
        );
      }

      // Move:
      if (demon.state3 <= 0) {
        demon7PickMove(demon);
      } else {
        demon.state3--;
        demon.x += demon.unionX;
        demon.y += demon.unionY;

        // Bounce off the edges of its area:
        if (demon.x <= 6 * TILE_SIZE_X && demon.unionX < 0) demon.unionX = TILE_UNIT;
        if (demon.x >= 18 * TILE_SIZE_X && demon.unionX > 0) demon.unionX = -TILE_UNIT;
        if (demon.y <= 4 * TILE_SIZE_Y && demon.unionY < 0) demon.unionY = TILE_UNIT;
        if (demon.y >= 11 * TILE_SIZE_Y && demon.unionY > 0) demon.unionY = -TILE_UNIT;
      }

      if (demon.state2 >= 256) {
        demon.state = D7.RESTING;
        demon.state2 = 0;
      }
      break;
    case D7.RESTING: // after shooting
      if (demon.state2 < 64) demon.tile = 1;
      if (demon.state2 >= 64 && demon.state2 < 96) demon.tile = 2;
      if (demon.state2 >= 96 && demon.state2 < 128) demon.tile = 1;
      if (demon.state2 >= 128) {
        demon.state = D7.MOUTH_CLOSED;
        demon.state2 = 8;
      }
      break;
  }
}

// ----------- DEMON 8 -------------

export function loadDemon8(): void {
  loadDemonGraphics(8, [
    [0, 0, 6, 4],
    [6, 0, 6, 4],
    [0, 4, 6, 4],
    [6, 4, 6, 4],
    [0, 8, 6, 4],
    [6, 8, 6, 4],
    [0, 12, 6, 4],
    // Bullet:
    [12, 0, 2, 2],
  ]);

  if (G.fightingDemon === DEMON_APPEARS) {
    G.demonObject = addDemonObject(TILE_SIZE_X * 13, 0, 0, T_DEMON8, 0);
    setDemonLife(G.objects[G.demonObject], G.worldItems[1][0], 64, 96);
  }
}

/** Demon 8 walks along the four floors of the room and climbs between them at x = 7 and 19 tiles. */
const D8 = { IDLE: 0, WALK_RIGHT: 1, WALK_LEFT: 2, STOP: 3, SHOOT: 4, CHANGE_FLOOR: 5 } as const;

function demon8Walk(demon: GameObject): void {
  const right = demon.state === D8.WALK_RIGHT;
  demon.tile = 4 + ((demon.state2 >> 2) % 2);
  demon.state3--;
  if (demon.state3 < 0) {
    demon.state = D8.STOP;
    demon.state2 = 0;
  } else if (right) {
    demon.x += idiv(TILE_UNIT, 2);
    if (demon.x >= 24 * TILE_SIZE_X) demon.state = D8.WALK_LEFT;
  } else {
    demon.x -= idiv(TILE_UNIT, 2);
    if (demon.x <= 2 * TILE_SIZE_X) demon.state = D8.WALK_RIGHT;
  }

  // At a stairway: go to the player's floor (or, sometimes, a random one):
  let playerFloor = idiv(G.playerY, 4 * TILE_SIZE_Y);
  if (
    (demon.x === 7 * TILE_SIZE_X || demon.x === 19 * TILE_SIZE_X) &&
    (demon.y !== playerFloor * 4 * TILE_SIZE_Y || rand() % 4 === 0)
  ) {
    demon.state = D8.CHANGE_FLOOR;
    if (demon.y === playerFloor * 4 * TILE_SIZE_Y) playerFloor = rand() % 4;
    demon.state3 = playerFloor * 4 * TILE_SIZE_Y;
  }
}

export function demon8Cycle(): void {
  const demon = G.objects[G.demonObject];

  updateDemonMusic(demon.size);
  demon.state2++;

  switch (demon.state) {
    case D8.IDLE:
      demon.tile = (demon.state2 >> 4) % 2;
      if (demon.state2 >= 32) {
        switch (idiv(rand() % 80, 8)) {
          case 0:
          case 1:
          case 2:
          case 3:
            demon.state = D8.WALK_RIGHT;
            demon.state3 = (4 + (rand() % 8)) * 16;
            break;
          case 4:
          case 5:
          case 6:
          case 7:
            demon.state = D8.WALK_LEFT;
            demon.state3 = (4 + (rand() % 8)) * 16;
            break;
          default:
            demon.state = D8.STOP;
        }
        demon.state2 = 0;
      }
      break;
    case D8.WALK_RIGHT:
    case D8.WALK_LEFT:
      demon8Walk(demon);
      break;
    case D8.STOP:
      // Standing still
      demon.tile = 6;
      if (demon.state2 >= 16) {
        demon.state = D8.SHOOT;
        demon.state2 = 0;
      }
      break;
    case D8.SHOOT:
      demon.tile = 2;
      if (demon.state2 >= 48) {
        demon.state = D8.IDLE;
        demon.state2 = 0;
      }
      // Shoot two bullets, twice:
      if (demon.state2 === 32 || demon.state2 === 40) {
        if (demon.state2 === 32) playSound(sfx.demon8bullet);
        let bullet = G.objects[addDemonObject(demon.x + 1 * TILE_SIZE_X, demon.y, 1, T_DEMON8_BULLET, 0)];
        bullet.tile = 7;
        bullet.state = rand() % 2;
        bullet = G.objects[addDemonObject(demon.x + 3 * TILE_SIZE_X, demon.y, 1, T_DEMON8_BULLET, 0)];
        bullet.tile = 7;
        bullet.state = 2 + (rand() % 2);
      }
      break;
    case D8.CHANGE_FLOOR:
      // Go up or down to floor y = state3:
      demon.tile = 3;
      if (demon.y < demon.state3) {
        demon.y += TILE_UNIT * 2;
      } else if (demon.y > demon.state3) {
        demon.y -= TILE_UNIT * 2;
      } else {
        demon.state = D8.IDLE;
        demon.state2 = 0;
      }
      break;
  }
}

// ----------- DEMON 9 -------------

export function loadDemon9(): void {
  loadDemonGraphics(9, [
    [0, 0, 15, 9],
    [15, 0, 15, 9],
    [30, 0, 15, 9],
    [0, 9, 15, 9],
    [15, 9, 15, 9],
    [30, 9, 15, 9],
    [0, 18, 2, 1],
    [2, 18, 1, 1],
    [3, 18, 2, 1],
  ]);

  if (G.fightingDemon === DEMON_APPEARS) {
    G.demonObject = addDemonObject(TILE_SIZE_X * 12, TILE_SIZE_Y * 10, 0, T_DEMON9, 0);
    const demon = G.objects[G.demonObject];
    demon.tile = 2;
    setDemonLife(demon, G.worldItems[1][0], 96, 160);

    // Four lightning clouds:
    for (let i = 0; i < 4; i++) {
      const cloud = G.objects[addObject(T_ENEMY, TILE_SIZE_X * (8 + 4 * i), TILE_SIZE_Y, 0, T_LCLOUD, 0)];
      cloud.state = idiv(rand() % 16, 10);
      cloud.state2 = 0;
      cloud.lastHit = 0;
      cloud.baseTile = tileIds.lcloud;
      cloud.tile = 0;
    }
  }
}

/** Demon 9: states 0/1 walk left/right; +2 breathes fire for 64 frames (`state3`). */
function demon9Walk(demon: GameObject, dir: number): void {
  const seq = [2, 1, 0, 1];
  demon.state2++;
  demon.tile = seq[(demon.state2 >> 4) % 4];
  if ((demon.state2 & 0x01) === 0) demon.x += dir * idiv(TILE_UNIT, 2);
  if (dir < 0 && demon.x <= 9 * TILE_SIZE_X) demon.state = 1;
  if (dir > 0 && demon.x >= 15 * TILE_SIZE_X) demon.state = 0;
  // NOTE (original): `% 0x00f` (modulo 15), probably meant `& 0x0f`.
  if (demon.state2 % 0x00f === 0 && rand() % 100 < 50) {
    demon.state3 = 64;
    demon.state += 2;
  }
}

export function demon9Cycle(): void {
  const demon = G.objects[G.demonObject];

  updateDemonMusic(demon.size);

  switch (demon.state) {
    case 0:
      demon9Walk(demon, -1);
      break;
    case 1:
      demon9Walk(demon, 1);
      break;
    case 2:
    case 3:
      demon.state3--;
      if (demon.state3 <= 0) {
        demon.state -= 2;
      } else if ((demon.state3 & 0x0f) === 0) {
        // The mouth's position for each of the three tiles:
        const dx = [-TILE_SIZE_X * 3, -TILE_SIZE_X * 3, -TILE_SIZE_X];
        const dy = [7 * TILE_SIZE_Y, 3 * TILE_SIZE_Y, 3 * TILE_SIZE_Y];
        addObject(T_ENEMY, demon.x + dx[demon.tile], demon.y + dy[demon.tile], 0, T_DEMON9_FIRE, 0);
        playSound(sfx.firebreath);
      }
      break;
  }
}

// ----------- DEMON 10 -------------

export function loadDemon10(): void {
  loadDemonGraphics(10, [
    [0, 0, 7, 7],
    [7, 0, 7, 7],
    [14, 0, 7, 7],
    [21, 0, 7, 7],
    [0, 7, 2, 2],
    [2, 7, 2, 2],
    [4, 7, 2, 2],
    [6, 7, 2, 2],
    [8, 7, 2, 2],
  ]);

  if (G.fightingDemon === DEMON_APPEARS) {
    G.demonObject = addDemonObject(TILE_SIZE_X * 12, TILE_SIZE_Y * 4, 0, T_DEMON10, 0);
    const demon = G.objects[G.demonObject];
    demon.tile = 1;
    setDemonLife(demon, G.worldItems[1][0], 128, 196);

    // Eight balls circling the demon; `state3` of the demon is the first one's index:
    for (let i = 0; i < 8; i++) {
      const o = addDemonObject(TILE_SIZE_X * 15 - idiv(TILE_SIZE_X, 2), TILE_SIZE_Y * 7, 16, T_DEMON10_BALL, 0);
      if (i === 0) demon.state3 = o;
      const ball = G.objects[o];
      ball.lastHit = 0;
      ball.tile = 4;
      ball.state2 = i * 4;
      ball.state3 = TILE_SIZE_X * 6;
    }
  }
}

/**
 * Demon 10: states 0–5 wait (48 frames), +6 swing every other ball out and back
 * in (32 frames) and -5 to the next wait; after five swings (state 11) it
 * teleports. Without balls left it waits in state 12 and teleports in 13.
 */
const D10_TELEPORT = 11;
const D10_ALONE = 12;
const D10_ALONE_TELEPORT = 13;

/** Teleport destinations of demon 10, in tiles. */
const DEMON10_SPOTS_X = [12, 8, 12, 16, 22];
const DEMON10_SPOTS_Y = [4, 8, 0, 0, 8];

export function demon10Cycle(): void {
  const demon = G.objects[G.demonObject];
  /** Ball i (0–7); balls that were destroyed are no longer T_ENEMY. */
  const ball = (i: number): GameObject => G.objects[i + demon.state3];

  demon.state2++;
  updateDemonMusic(demon.size);

  switch (demon.state) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      demon.tile = 1;
      if (demon.state2 >= 48) {
        let found = false;

        demon.state += 6;
        demon.state2 = 0;

        for (let i = 0; i < 8; i++) if (ball(i).type === T_ENEMY) found = true;
        if (!found) demon.state = D10_ALONE;
      }
      break;
    case 6:
    case 7:
    case 8:
    case 9:
    case 10:
      demon.tile = 0;
      if (demon.state2 > 16) {
        for (let i = 0; i < 8; i += 2) {
          if (ball(i).type === T_ENEMY) {
            if (demon.state2 < 25) ball(i).state3 += TILE_SIZE_X;
            else ball(i).state3 -= TILE_SIZE_X;
          }
        }
      }
      if (demon.state2 >= 32) {
        demon.state -= 5;
        demon.state2 = 0;
      }
      break;
    case D10_TELEPORT:
    case D10_ALONE_TELEPORT:
      demon.tile = -1;

      for (let i = 0; i < 8; i++) {
        if (ball(i).type === T_ENEMY) ball(i).state = 1;
      }

      if (demon.state2 === 64) {
        const spot = rand() % 5;
        demon.x = DEMON10_SPOTS_X[spot] * TILE_SIZE_X;
        demon.y = DEMON10_SPOTS_Y[spot] * TILE_SIZE_Y;
      }

      if (demon.state2 >= 64) {
        // Blink in:
        demon.tile = -1 + 2 * ((demon.state2 >> 2) % 2);
        if (demon.state2 >= 95) {
          if (demon.state === D10_ALONE_TELEPORT) demon.state = D10_ALONE;
          else demon.state = 0;
          demon.state2 = 0;
          for (let i = 0; i < 8; i++) {
            if (ball(i).type === T_ENEMY) {
              ball(i).x = demon.x + 2 * TILE_SIZE_X + idiv(TILE_SIZE_X, 2);
              ball(i).y = demon.y + 3 * TILE_SIZE_Y;
              ball(i).state = 0;
            }
          }
        }
      }
      break;
    case D10_ALONE:
      demon.tile = 1;
      if (demon.state2 >= 128) {
        demon.state = D10_ALONE_TELEPORT;
        demon.state2 = 0;
      }
      break;
  }
}
