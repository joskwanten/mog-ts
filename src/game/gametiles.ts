/**
 * Port of gametiles.cpp: loads the graphic sets and cuts them into tiles.
 * The tile order defines the tile numbers used by the room files.
 */
import type { Bitmap } from '../engine/bitmap';
import { Tile } from '../engine/tile';
import {
  MAX_TILES,
  SCREEN_X,
  SCREEN_Y,
  State,
  TILE_SIZE_X,
  TILE_SIZE_Y,
  T_DOOR_WALL,
  T_ENEMY,
  T_LADDER_WALL,
  T_LAVA,
  T_NADA,
  T_PLAYER,
  T_WALL,
  T_WATER,
  T_WEAPON,
} from './constants';
import {
  loadDemon1,
  loadDemon10,
  loadDemon2,
  loadDemon3,
  loadDemon4,
  loadDemon5,
  loadDemon6,
  loadDemon7,
  loadDemon8,
  loadDemon9,
} from './demons';
import { attachInbetweens, loadBitmap, loadPalette } from './gameaux';
import { gfx, tileIds } from './resources';
import { G } from './state';

/** Tile size in pixels (TILE_SIZE_X === TILE_SIZE_Y). */
const T = TILE_SIZE_X;

/** Add one tile: the source rectangle (x, y, w, h) in pixels of `bmp`. */
function add(bmp: Bitmap, x: number, y: number, w: number, h: number, type = 0, ox = 0, oy = 0): void {
  G.tiles[G.tileCount++] = new Tile(bmp, x, y, w, h, type, ox, oy);
}

/** Add cols×rows tiles of w×h pixels, row by row, starting at pixel (x, y). */
function addGrid(
  bmp: Bitmap,
  x: number,
  y: number,
  cols: number,
  rows: number,
  w: number,
  h: number,
  type = 0,
  ox = 0,
  oy = 0,
): void {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) add(bmp, x + c * w, y + r * h, w, h, type, ox, oy);
}

export function loadGraphics(): void {
  // Graphics:
  gfx.konami = loadBitmap('konami.pcx');
  gfx.menu = loadBitmap('start.pcx');
  gfx.tiles = loadBitmap('tiles.pcx');
  gfx.tiles2 = loadBitmap('tiles2.pcx');
  gfx.enemy = loadBitmap('enemy.pcx');
  gfx.enemy2 = loadBitmap('enemy2.pcx');
  gfx.final = loadBitmap('final.pcx');
  if (
    gfx.konami === null ||
    gfx.menu === null ||
    gfx.tiles === null ||
    gfx.tiles2 === null ||
    gfx.enemy === null ||
    gfx.enemy2 === null ||
    gfx.final === null
  ) {
    console.error('ERROR: some image buffers cannot be created!');
    return;
  }
  if (
    gfx.konami.getPixels() === null ||
    gfx.menu.getPixels() === null ||
    gfx.tiles.getPixels() === null ||
    gfx.tiles2.getPixels() === null ||
    gfx.enemy.getPixels() === null ||
    gfx.enemy2.getPixels() === null ||
    gfx.final.getPixels() === null
  ) {
    console.error('ERROR: some graphic files cannot be found!');
    return;
  }
  loadPalette();
  G.collision = new Uint8Array(SCREEN_X * SCREEN_Y);
  G.tileCount = 0;
  // C++: new CTile*[MAX_TILES], all entries NULL.
  G.tiles = new Array<Tile>(MAX_TILES);
  // Backgrounds:
  // Blue bricks:
  addGrid(gfx.tiles!, 0, 0, 4, 1, T, T); // 0–3
  // Red bricks:
  addGrid(gfx.tiles!, 4 * T, 0, 4, 4, T, T); // 4–19
  addGrid(gfx.tiles!, 10 * T, 0, 4, 1, T, T); // 20–23
  // Green leaves:
  addGrid(gfx.tiles!, 14 * T, 0, 4, 4, T, T); // 24–39
  addGrid(gfx.tiles!, 18 * T, 0, 4, 1, T, T); // 40–43
  // Red rocks:
  addGrid(gfx.tiles!, 25 * T, 0, 4, 4, T, T); // 44–59
  addGrid(gfx.tiles!, 29 * T, 0, 4, 1, T, T); // 60–63
  // Blue column:
  addGrid(gfx.tiles!, 0, T, 2, 3, T, T); // 64–69
  // Red column:
  addGrid(gfx.tiles!, 20 * T, T, 2, 3, T, T); // 70–75
  // Yellow flag:
  addGrid(gfx.tiles!, 2 * T, T, 2, 3, T, T); // 76–81
  // Left curtain:
  addGrid(gfx.tiles!, 10 * T, T, 2, 3, T, T); // 82–87
  // Right curtain:
  addGrid(gfx.tiles!, 12 * T, T, 2, 3, T, T); // 88–93
  // Window:
  addGrid(gfx.tiles!, 18 * T, T, 2, 2, T, T); // 94–97
  // Chain:
  add(gfx.tiles!, 22 * T, 0, T, T); // 98
  add(gfx.tiles!, 22 * T, T, T, T); // 99
  add(gfx.tiles!, 22 * T, 2 * T, T, T); // 100
  // Crack:
  addGrid(gfx.tiles!, 23 * T, 0, 2, 2, T, T); // 101–104
  // Walls:
  // Bricks:
  tileIds.wall = G.tileCount;
  add(gfx.tiles!, 0, 4 * T, T, T, T_WALL); // 105
  // Bricks over ladders:
  add(gfx.tiles!, T, 4 * T, T, T, T_LADDER_WALL); // 106
  // Armour (left):
  add(gfx.tiles!, 6 * T, 4 * T, 2 * T, 3 * T, T_WALL); // 107
  // Armour (right):
  add(gfx.tiles!, 8 * T, 4 * T, 2 * T, 3 * T, T_WALL); // 108
  // Pause 0:
  tileIds.pause[0] = G.tileCount;
  add(gfx.tiles!, 20 * T, 19 * T, 36, 3 * T, T_WALL); // 109
  addGrid(gfx.tiles!, 356, 19 * T, 2, 1, 36, 3 * T); // 110–111
  // Pause 1:
  tileIds.pause[1] = G.tileCount;
  addGrid(gfx.tiles!, 428, 19 * T, 3, 1, 36, 3 * T); // 112–114
  tileIds.tomb = G.tileCount;
  add(gfx.tiles!, 36 * T, 2 * T, 2 * T, 2 * T); // 115
  // World doors with key:
  tileIds.wkeydoor = G.tileCount;
  add(gfx.tiles!, 12 * T, 17 * T, T, 3 * T, T_DOOR_WALL); // 116
  add(gfx.tiles!, 13 * T, 17 * T, 2 * T, 3 * T); // 117
  add(gfx.tiles!, 15 * T, 17 * T, 3 * T, 3 * T); // 118
  // Blue column without marks:
  addGrid(gfx.tiles!, 8 * T, 0, 2, 3, T, T); // 119–124
  // World decoration:
  add(gfx.tiles!, 33 * T, 0, T, T, T_WALL); // 125
  add(gfx.tiles!, 33 * T, T, T, T, T_LADDER_WALL); // 126
  addGrid(gfx.tiles!, 34 * T, 0, 2, 2, T, T); // 127–130
  addGrid(gfx.tiles!, 36 * T, 0, 2, 2, T, T); // 131–134
  addGrid(gfx.tiles!, 38 * T, 0, 2, 3, T, T); // 135–140
  // Water:
  addGrid(gfx.tiles!, 18 * T, 3 * T, 2, 1, T, T, T_WATER); // 141–142
  // Passage border:
  add(gfx.tiles!, 9 * T, 3 * T, T, T); // 143
  addGrid(gfx.tiles!, 29 * T, T, 4, 1, T, T); // 144–147
  addGrid(gfx.tiles!, 34 * T, 2 * T, 2, 2, T, T); // 148–151
  // Passage hand:
  add(gfx.tiles!, 33 * T, 2 * T, T, 2 * T); // 152
  // Passage characters:
  add(gfx.tiles!, 36 * T, 17 * T, 2 * T, 2 * T); // 153
  add(gfx.tiles!, 34 * T, 17 * T, 2 * T, 2 * T); // 154
  // Decoration column type 3:
  addGrid(gfx.tiles!, 6 * T, 21 * T, 6, 1, T, T); // 155–160
  // More passage characters:
  // ATHENA
  add(gfx.tiles!, 32 * T, 17 * T, 2 * T, 2 * T); // 161
  // World 2 bridge:
  add(gfx.tiles!, T, 21 * T, T, T, T_WALL); // 162
  // Fire:
  addGrid(gfx.tiles!, 8 * T, 11 * T, 2, 1, T, T, T_LAVA); // 163–164
  add(gfx.tiles!, 9 * T, 11 * T, T, T, T_WALL); // 165
  // Walk-through wall:
  add(gfx.tiles!, 0, 4 * T, T, T, T_NADA); // 166
  // Even more passage characters:
  // DEATH
  add(gfx.tiles!, 16 * T, 20 * T, 2 * T, 2 * T); // 167
  // Fire (animation):
  addGrid(gfx.tiles!, 34 * T, 21 * T, 5, 1, T, T, T_LAVA); // 168–172
  add(gfx.tiles!, 38 * T, 21 * T, T, T, T_LAVA); // 173
  add(gfx.tiles!, 37 * T, 21 * T, T, T, T_LAVA); // 174
  add(gfx.tiles!, 36 * T, 21 * T, T, T, T_LAVA); // 175
  add(gfx.tiles!, 35 * T, 21 * T, T, T, T_LAVA); // 176
  // Yet more passage characters:
  // HEPHAESTUS
  add(gfx.tiles!, 0, 23 * T, 2 * T, 2 * T); // 177
  // ASCLEPIUS
  add(gfx.tiles!, 4 * T, 10 * T, 2 * T, 2 * T); // 178
  // Stones that appear in world 5:
  addGrid(gfx.tiles!, 38 * T, 3 * T, 2, 1, T, T, T_WALL); // 179–180
  // Walkable water:
  add(gfx.tiles!, 19 * T, 3 * T, T, T, T_WALL); // 181
  // Pamperse:
  add(gfx.tiles2!, 4 * T, 14 * T, 2 * T, 2 * T, T_NADA); // 182
  // Objects:
  // Ladders:
  tileIds.ladder = G.tileCount;
  add(gfx.tiles!, 0, 7 * T, 2 * T, T); // 183
  // Stones:
  tileIds.stone = G.tileCount;
  add(gfx.tiles!, 0, 5 * T, 2 * T, 2 * T); // 184
  add(gfx.tiles!, 10 * T, 4 * T, 2 * T, 2 * T); // 185
  add(gfx.tiles!, 23 * T, 2 * T, 2 * T, 2 * T, T_WALL); // 186
  // World doors:
  tileIds.wdoor = G.tileCount;
  add(gfx.tiles!, 2 * T, 4 * T, 4 * T, 3 * T); // 187
  tileIds.door = G.tileCount;
  add(gfx.tiles!, 8 * T, 7 * T, 2 * T, 2 * T); // 188
  // Key doors:
  tileIds.keydoor = G.tileCount;
  add(gfx.tiles!, 8 * T, 3 * T, T, T, T_DOOR_WALL); // 189
  // Transporters:
  tileIds.lever = G.tileCount;
  // This tile has 2 flags, T_WALL and T_LADDER_WALL, to mark the special case where
  // arrows must not collide with it!
  add(gfx.tiles2!, 0, 16 * T, 4 * T, 2 * T, T_WALL | T_LADDER_WALL); // 190
  // Character: ---------------------
  tileIds.character[0] = G.tileCount;
  addGrid(gfx.tiles!, 0, 13 * T, 3, 1, 2 * T, 2 * T, T_PLAYER); // 191–193
  add(gfx.tiles!, 6 * T, 13 * T, 2 * T, 2 * T, T_PLAYER, -6); // 194
  add(gfx.tiles!, 8 * T, 13 * T, 2 * T, 2 * T, T_PLAYER); // 195
  addGrid(gfx.tiles!, 10 * T, 13 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, -2); // 196–197
  addGrid(gfx.tiles!, 14 * T, 13 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, 2); // 198–199
  // Hit!
  addGrid(gfx.tiles!, 24 * T, 17 * T, 4, 1, 2 * T, 2 * T, T_PLAYER, 2); // 200–203
  // Death:
  addGrid(gfx.tiles!, 30 * T, 10 * T, 5, 1, 2 * T, 2 * T, T_PLAYER, 2); // 204–208
  // Mask
  addGrid(gfx.tiles!, 0, 17 * T, 5, 1, 2 * T, 2 * T, T_PLAYER); // 209–213
  add(gfx.tiles!, 10 * T, 17 * T, 2 * T, 2 * T, T_PLAYER, -2); // 214
  add(gfx.tiles!, 10 * T, 17 * T, 2 * T, 2 * T, T_PLAYER, -2); // 215
  add(gfx.tiles!, 10 * T, 17 * T, 2 * T, 2 * T, T_PLAYER, 2); // 216
  add(gfx.tiles!, 10 * T, 17 * T, 2 * T, 2 * T, T_PLAYER, 2); // 217
  add(gfx.tiles!, 4 * T, 17 * T, 2 * T, 2 * T, T_PLAYER); // 218
  add(gfx.tiles!, 4 * T, 17 * T, 2 * T, 2 * T, T_PLAYER); // 219
  add(gfx.tiles!, 0, 17 * T, 2 * T, 2 * T, T_PLAYER); // 220
  add(gfx.tiles!, 0, 17 * T, 2 * T, 2 * T, T_PLAYER); // 221
  addGrid(gfx.tiles!, 30 * T, 10 * T, 5, 1, 2 * T, 2 * T, T_PLAYER, 2); // 222–226
  tileIds.characterInv[0] = G.tileCount;
  addGrid(gfx.tiles!, 0, 15 * T, 3, 1, 2 * T, 2 * T, T_PLAYER, 4); // 227–229
  add(gfx.tiles!, 6 * T, 15 * T, 2 * T, 2 * T, T_PLAYER, 10); // 230
  add(gfx.tiles!, 8 * T, 15 * T, 2 * T, 2 * T, T_PLAYER, 4); // 231
  addGrid(gfx.tiles!, 10 * T, 15 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, -2); // 232–233
  addGrid(gfx.tiles!, 14 * T, 15 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, 2); // 234–235
  // Hit!
  addGrid(gfx.tiles!, 20 * T, 17 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, 2); // 236–237
  addGrid(gfx.tiles!, 12 * T, 20 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, 2); // 238–239
  // Death:
  addGrid(gfx.tiles!, 30 * T, 8 * T, 5, 1, 2 * T, 2 * T, T_PLAYER, 2); // 240–244
  // Mask - inv
  addGrid(gfx.tiles!, 0, 19 * T, 5, 1, 2 * T, 2 * T, T_PLAYER, 4); // 245–249
  add(gfx.tiles!, 10 * T, 19 * T, 2 * T, 2 * T, T_PLAYER, -2); // 250
  add(gfx.tiles!, 10 * T, 19 * T, 2 * T, 2 * T, T_PLAYER, -2); // 251
  add(gfx.tiles!, 10 * T, 19 * T, 2 * T, 2 * T, T_PLAYER, 2); // 252
  add(gfx.tiles!, 10 * T, 19 * T, 2 * T, 2 * T, T_PLAYER, 2); // 253
  add(gfx.tiles!, 4 * T, 19 * T, 2 * T, 2 * T, T_PLAYER, 4); // 254
  add(gfx.tiles!, 4 * T, 19 * T, 2 * T, 2 * T, T_PLAYER, 4); // 255
  add(gfx.tiles!, 0, 19 * T, 2 * T, 2 * T, T_PLAYER, 4); // 256
  add(gfx.tiles!, 0, 19 * T, 2 * T, 2 * T, T_PLAYER, 4); // 257
  addGrid(gfx.tiles!, 30 * T, 8 * T, 5, 1, 2 * T, 2 * T, T_PLAYER, 2); // 258–262
  // Sword:
  tileIds.sword[0] = G.tileCount;
  add(gfx.tiles!, 18 * T, 13 * T, 2 * T, 2 * T, T_WEAPON); // 263
  add(gfx.tiles!, 18 * T, 15 * T, 2 * T, 2 * T, T_WEAPON); // 264
  tileIds.character[1] = G.tileCount;
  addGrid(gfx.tiles!, 20 * T, 13 * T, 3, 1, 2 * T, 2 * T, T_PLAYER); // 265–267
  add(gfx.tiles!, 26 * T, 13 * T, 2 * T, 2 * T, T_PLAYER, -6); // 268
  add(gfx.tiles!, 28 * T, 13 * T, 2 * T, 2 * T, T_PLAYER); // 269
  addGrid(gfx.tiles!, 30 * T, 13 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, -2); // 270–271
  addGrid(gfx.tiles!, 34 * T, 13 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, 2); // 272–273
  // Hit!
  addGrid(gfx.tiles!, 24 * T, 17 * T, 4, 1, 2 * T, 2 * T, T_PLAYER, 2); // 274–277
  // Death:
  addGrid(gfx.tiles!, 30 * T, 6 * T, 5, 1, 2 * T, 2 * T, T_PLAYER, 2); // 278–282
  // Mask
  addGrid(gfx.tiles!, 0, 17 * T, 5, 1, 2 * T, 2 * T, T_PLAYER); // 283–287
  add(gfx.tiles!, 10 * T, 17 * T, 2 * T, 2 * T, T_PLAYER, -2); // 288
  add(gfx.tiles!, 10 * T, 17 * T, 2 * T, 2 * T, T_PLAYER, -2); // 289
  add(gfx.tiles!, 10 * T, 17 * T, 2 * T, 2 * T, T_PLAYER, 2); // 290
  add(gfx.tiles!, 10 * T, 17 * T, 2 * T, 2 * T, T_PLAYER, 2); // 291
  add(gfx.tiles!, 4 * T, 17 * T, 2 * T, 2 * T, T_PLAYER); // 292
  add(gfx.tiles!, 4 * T, 17 * T, 2 * T, 2 * T, T_PLAYER); // 293
  add(gfx.tiles!, 0, 17 * T, 2 * T, 2 * T, T_PLAYER); // 294
  add(gfx.tiles!, 0, 17 * T, 2 * T, 2 * T, T_PLAYER); // 295
  addGrid(gfx.tiles!, 30 * T, 6 * T, 5, 1, 2 * T, 2 * T, T_PLAYER, 2); // 296–300
  tileIds.characterInv[1] = G.tileCount;
  addGrid(gfx.tiles!, 20 * T, 15 * T, 3, 1, 2 * T, 2 * T, T_PLAYER, 4); // 301–303
  add(gfx.tiles!, 26 * T, 15 * T, 2 * T, 2 * T, T_PLAYER, 10); // 304
  add(gfx.tiles!, 28 * T, 15 * T, 2 * T, 2 * T, T_PLAYER, 4); // 305
  addGrid(gfx.tiles!, 30 * T, 15 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, -2); // 306–307
  addGrid(gfx.tiles!, 34 * T, 15 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, 2); // 308–309
  // Hit!
  addGrid(gfx.tiles!, 20 * T, 17 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, 2); // 310–311
  addGrid(gfx.tiles!, 12 * T, 20 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, 2); // 312–313
  // Death:
  addGrid(gfx.tiles!, 30 * T, 4 * T, 5, 1, 2 * T, 2 * T, T_PLAYER, 2); // 314–318
  // Mask - inv
  addGrid(gfx.tiles!, 0, 19 * T, 5, 1, 2 * T, 2 * T, T_PLAYER, 4); // 319–323
  add(gfx.tiles!, 10 * T, 19 * T, 2 * T, 2 * T, T_PLAYER, -2); // 324
  add(gfx.tiles!, 10 * T, 19 * T, 2 * T, 2 * T, T_PLAYER, -2); // 325
  add(gfx.tiles!, 10 * T, 19 * T, 2 * T, 2 * T, T_PLAYER, 2); // 326
  add(gfx.tiles!, 10 * T, 19 * T, 2 * T, 2 * T, T_PLAYER, 2); // 327
  add(gfx.tiles!, 4 * T, 19 * T, 2 * T, 2 * T, T_PLAYER, 4); // 328
  add(gfx.tiles!, 4 * T, 19 * T, 2 * T, 2 * T, T_PLAYER, 4); // 329
  add(gfx.tiles!, 0, 19 * T, 2 * T, 2 * T, T_PLAYER, 4); // 330
  add(gfx.tiles!, 0, 19 * T, 2 * T, 2 * T, T_PLAYER, 4); // 331
  addGrid(gfx.tiles!, 30 * T, 8 * T, 5, 1, 2 * T, 2 * T, T_PLAYER, 2); // 332–336
  // Sword:
  tileIds.sword[1] = G.tileCount;
  add(gfx.tiles!, 38 * T, 13 * T, 2 * T, 2 * T, T_WEAPON); // 337
  add(gfx.tiles!, 38 * T, 15 * T, 2 * T, 2 * T, T_WEAPON); // 338
  // When HIT:
  tileIds.character[2] = G.tileCount;
  addGrid(gfx.tiles2!, 0, 18 * T, 3, 1, 2 * T, 2 * T, T_PLAYER); // 339–341
  add(gfx.tiles2!, 6 * T, 18 * T, 2 * T, 2 * T, T_PLAYER, -6); // 342
  add(gfx.tiles2!, 8 * T, 18 * T, 2 * T, 2 * T, T_PLAYER); // 343
  addGrid(gfx.tiles2!, 10 * T, 18 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, -2); // 344–345
  addGrid(gfx.tiles2!, 14 * T, 18 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, 2); // 346–347
  tileIds.characterInv[2] = G.tileCount;
  addGrid(gfx.tiles2!, 0, 20 * T, 3, 1, 2 * T, 2 * T, T_PLAYER, 4); // 348–350
  add(gfx.tiles2!, 6 * T, 20 * T, 2 * T, 2 * T, T_PLAYER, 10); // 351
  add(gfx.tiles2!, 8 * T, 20 * T, 2 * T, 2 * T, T_PLAYER, 4); // 352
  addGrid(gfx.tiles2!, 10 * T, 20 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, -2); // 353–354
  addGrid(gfx.tiles2!, 14 * T, 20 * T, 2, 1, 2 * T, 2 * T, T_PLAYER, 2); // 355–356
  // Status bar:
  tileIds.stats = G.tileCount;
  add(gfx.tiles!, 2 * T, 22 * T, 30 * T, 3 * T); // 357
  addGrid(gfx.tiles!, 0, 10 * T, 2, 1, 2 * T, 2 * T); // 358–359
  addGrid(gfx.tiles!, 29 * T, 2 * T, 2, 1, 2 * T, 2 * T, T_WALL); // 360–361
  addGrid(gfx.tiles!, 27 * T, 22 * T, 2, 1, T, 3 * T); // 362–363
  add(gfx.tiles!, 30 * T, 22 * T, T, 3 * T); // 364
  // Objects:
  tileIds.coin = G.tileCount;
  add(gfx.tiles!, 12 * T, 4 * T, 2 * T, 2 * T); // 365
  tileIds.arrow = G.tileCount;
  add(gfx.tiles!, 14 * T, 4 * T, 2 * T, 2 * T); // 366
  tileIds.key = G.tileCount;
  add(gfx.tiles!, 16 * T, 4 * T, 2 * T, 2 * T); // 367
  tileIds.items = G.tileCount;
  addGrid(gfx.tiles!, 10 * T, 6 * T, 10, 3, 2 * T, 2 * T); // 368–397
  add(gfx.tiles!, 36 * T, 19 * T, 2 * T, 2 * T); // 398
  add(gfx.tiles!, 34 * T, 19 * T, 2 * T, 2 * T); // 399
  addGrid(gfx.tiles!, 18 * T, 4 * T, 6, 1, 2 * T, 2 * T); // 400–405
  // Weapons:
  tileIds.weapons = G.tileCount;
  add(gfx.tiles!, 6 * T, 7 * T, 2 * T, T, T_WEAPON); // 406
  add(gfx.tiles!, 6 * T, 8 * T, 2 * T, T, T_WEAPON); // 407
  addGrid(gfx.tiles!, 6 * T, 9 * T, 2, 1, T, T, T_WEAPON); // 408–409
  add(gfx.tiles!, 6 * T, 10 * T, 2 * T, T, T_WEAPON); // 410
  add(gfx.tiles!, 6 * T, 11 * T, 2 * T, T, T_WEAPON); // 411
  add(gfx.tiles!, 4 * T, 7 * T, 2 * T, T, T_WEAPON); // 412
  add(gfx.tiles!, 2 * T, 7 * T, 2 * T, T, T_WEAPON); // 413
  add(gfx.tiles!, 22 * T, 3 * T, T, T, T_WEAPON); // 414
  // Mines: +9
  addGrid(gfx.tiles2!, 32 * T, 6 * T, 3, 1, 2 * T, T, T_WEAPON); // 415–417
  addGrid(gfx.tiles2!, 32 * T, 3 * T, 2, 1, 4 * T, 3 * T, T_WEAPON); // 418–419
  // Harmless weapons:
  // Arrows: +14
  add(gfx.tiles!, 6 * T, 7 * T, 2 * T, T, T_NADA); // 420
  add(gfx.tiles!, 4 * T, 7 * T, 2 * T, T, T_NADA); // 421
  // Ceramic arrows: +16
  add(gfx.tiles!, 6 * T, 8 * T, 2 * T, T, T_NADA); // 422
  add(gfx.tiles!, 2 * T, 7 * T, 2 * T, T, T_NADA); // 423
  // Fire: +18
  add(gfx.tiles!, 7 * T, 9 * T, T, T, T_NADA); // 424
  add(gfx.tiles!, 22 * T, 3 * T, T, T, T_NADA); // 425
  add(gfx.tiles!, 6 * T, 9 * T, T, T, T_NADA); // 426
  add(gfx.tiles!, 18 * T, 21 * T, T, T, T_WEAPON); // 427
  // Explosion:
  tileIds.explosion = G.tileCount;
  add(gfx.tiles!, 4 * T, 8 * T, 2 * T, 2 * T); // 428
  add(gfx.tiles!, 2 * T, 8 * T, 2 * T, 2 * T); // 429
  add(gfx.tiles!, 0, 8 * T, 2 * T, 2 * T); // 430
  // Enemies:
  // Worm:
  tileIds.worm = G.tileCount;
  addGrid(gfx.enemy!, 0, 2 * T, 6, 1, 2 * T, 2 * T, T_ENEMY); // 431–436
  // Bat:
  tileIds.bat = G.tileCount;
  addGrid(gfx.enemy!, 0, 4 * T, 3, 1, 2 * T, 2 * T, T_ENEMY); // 437–439
  // Skeleton:
  tileIds.skeleton = G.tileCount;
  addGrid(gfx.enemy!, 0, 0, 4, 1, 2 * T, 2 * T, T_ENEMY); // 440–443
  addGrid(gfx.enemy!, 8 * T, 0, 3, 1, 2 * T, 2 * T); // 444–446
  addGrid(gfx.enemy!, 14 * T, 0, 4, 1, 2 * T, 2 * T, T_ENEMY); // 447–450
  // Smoke:
  tileIds.smoke = G.tileCount;
  add(gfx.enemy!, 0, 6 * T, 2 * T, 2 * T); // 451
  addGrid(gfx.enemy!, 2 * T, 6 * T, 3, 1, 2 * T, 2 * T, T_ENEMY); // 452–454
  add(gfx.enemy!, 8 * T, 6 * T, 2 * T, 2 * T); // 455
  addGrid(gfx.enemy!, 10 * T, 6 * T, 3, 1, 2 * T, 2 * T, T_ENEMY); // 456–458
  // Slimes:
  tileIds.slime = G.tileCount;
  addGrid(gfx.enemy!, 6 * T, 4 * T, 4, 1, 2 * T, 2 * T, T_ENEMY); // 459–462
  // Bouncing balls:
  tileIds.bouncingball = G.tileCount;
  add(gfx.enemy!, 12 * T, 2 * T, T, T, T_ENEMY); // 463
  // Water monster:
  tileIds.watermonster = G.tileCount;
  add(gfx.enemy!, 0, 10 * T, 3 * T, 2 * T, T_ENEMY); // 464
  add(gfx.enemy!, 4 * T, 10 * T, T, T, T_ENEMY); // 465
  add(gfx.enemy!, 4 * T, 11 * T, T, T, T_ENEMY); // 466
  add(gfx.enemy!, 3 * T, 11 * T, T, T, T_ENEMY); // 467
  add(gfx.enemy!, 3 * T, 10 * T, T, T, T_ENEMY); // 468
  add(gfx.enemy!, 5 * T, 10 * T, 3 * T, 2 * T); // 469
  // Falling stones:
  tileIds.fstone = G.tileCount;
  addGrid(gfx.enemy!, 13 * T, 2 * T, 4, 1, 2 * T, 2 * T, T_ENEMY); // 470–473
  // Knight:
  tileIds.knight = G.tileCount;
  addGrid(gfx.enemy!, 22 * T, 0, 8, 1, 2 * T, 2 * T, T_ENEMY); // 474–481
  addGrid(gfx.enemy!, 22 * T, 2 * T, 2, 1, 2 * T, 2 * T, T_ENEMY); // 482–483
  add(gfx.enemy!, 38 * T, 2 * T, 2 * T, 2 * T, T_ENEMY); // 484
  add(gfx.enemy!, 38 * T, 0, 2 * T, 2 * T, T_ENEMY); // 485
  // Red blob:
  tileIds.blob = G.tileCount;
  addGrid(gfx.enemy!, 14 * T, 4 * T, 2, 1, 2 * T, 2 * T, T_ENEMY); // 486–487
  add(gfx.enemy!, 14 * T, 8 * T, 2 * T, 2 * T, T_ENEMY); // 488
  add(gfx.enemy!, 34 * T, 2 * T, 2 * T, 2 * T, T_ENEMY); // 489
  // Bamboo:
  tileIds.bambu = G.tileCount;
  add(gfx.enemy!, 26 * T, 2 * T, 2 * T, 2 * T); // 490
  addGrid(gfx.enemy!, 28 * T, 2 * T, 3, 1, 2 * T, 2 * T, T_ENEMY); // 491–493
  // Fairy:
  tileIds.fairy = G.tileCount;
  add(gfx.tiles2!, 0, 12 * T, 2 * T, 2 * T); // 494
  add(gfx.tiles2!, 0, 14 * T, 2 * T, 2 * T); // 495
  add(gfx.tiles2!, 2 * T, 12 * T, 2 * T, 2 * T); // 496
  add(gfx.tiles2!, 2 * T, 14 * T, 2 * T, 2 * T); // 497
  addGrid(gfx.tiles2!, 4 * T, 12 * T, 2, 1, 2 * T, 2 * T); // 498–499
  addGrid(gfx.tiles2!, 8 * T, 12 * T, 16, 1, 8, 8); // 500–515
  // Porcupine:
  tileIds.porcupine = G.tileCount;
  addGrid(gfx.enemy!, 18 * T, 4 * T, 9, 1, 2 * T, 2 * T, T_ENEMY); // 516–524
  // Fire jumping out of the lava:
  tileIds.lava = G.tileCount;
  addGrid(gfx.enemy!, 8 * T, 10 * T, 2, 2, 2 * T, 2 * T, T_ENEMY); // 525–528
  add(gfx.enemy!, 12 * T, 10 * T, 2 * T, 2 * T, T_ENEMY); // 529
  add(gfx.enemy!, 12 * T, 12 * T, 2 * T, 2 * T, T_ENEMY); // 530
  // Jumping bush:
  tileIds.jumpingbush = G.tileCount;
  add(gfx.enemy!, 0, 8 * T, 2 * T, 2 * T, T_ENEMY); // 531
  // Blue spider:
  tileIds.bluespider = G.tileCount;
  addGrid(gfx.enemy!, 0, 12 * T, 3, 1, 2 * T, 2 * T, T_ENEMY); // 532–534
  // White fireballs:
  tileIds.whitefireball = G.tileCount;
  addGrid(gfx.enemy!, 0, 14 * T, 8, 1, 2 * T, 2 * T, T_ENEMY); // 535–542
  // Black creature of world 2:
  tileIds.black = G.tileCount;
  add(gfx.enemy!, 18 * T, 6 * T, 2 * T, 2 * T, T_ENEMY); // 543
  // Witch:
  tileIds.witch = G.tileCount;
  add(gfx.enemy!, 16 * T, 6 * T, 2 * T, 2 * T, T_ENEMY); // 544
  // White bears of world 2:
  tileIds.whitebear = G.tileCount;
  addGrid(gfx.enemy!, 20 * T, 6 * T, 6, 1, 2 * T, 2 * T, T_ENEMY); // 545–550
  // Stone feet:
  tileIds.feet = G.tileCount;
  addGrid(gfx.enemy!, 2 * T, 8 * T, 6, 1, 2 * T, 2 * T, T_ENEMY); // 551–556
  // Red jumper:
  tileIds.redjumper = G.tileCount;
  addGrid(gfx.enemy!, 16 * T, 8 * T, 6, 1, 2 * T, 2 * T, T_ENEMY); // 557–562
  // Living wall:
  tileIds.livingwall = G.tileCount;
  add(gfx.enemy!, 36 * T, 2 * T, 2 * T, 3 * T, T_WALL); // 563
  // Mega bat:
  tileIds.megabat = G.tileCount;
  addGrid(gfx.enemy!, 32 * T, 6 * T, 2, 1, 4 * T, 2 * T, T_ENEMY); // 564–565
  addGrid(gfx.enemy!, 36 * T, 5 * T, 2, 1, 2 * T, T, T_ENEMY); // 566–567
  // Piranhas:
  tileIds.piranha = G.tileCount;
  addGrid(gfx.enemy!, 14 * T, 10 * T, 2, 1, 2 * T, 2 * T, T_ENEMY); // 568–569
  addGrid(gfx.enemy!, 16 * T, 12 * T, 2, 1, 2 * T, 2 * T, T_ENEMY); // 570–571
  add(gfx.enemy!, 14 * T, 12 * T, 2 * T, 2 * T, T_ENEMY); // 572
  // White stars:
  tileIds.whitestar = G.tileCount;
  addGrid(gfx.enemy!, 18 * T, 10 * T, 2, 1, 2 * T, 2 * T, T_ENEMY); // 573–574
  // Spiders:
  tileIds.spider = G.tileCount;
  add(gfx.enemy!, 37 * T, 10 * T, T, 3 * T, T_ENEMY); // 575
  add(gfx.enemy!, 37 * T, 13 * T, T, 3 * T, T_ENEMY); // 576
  add(gfx.enemy!, 24 * T, 10 * T, T, 3 * T, T_ENEMY); // 577
  // Knight head:
  tileIds.knighthead = G.tileCount;
  addGrid(gfx.enemy!, 28 * T, 8 * T, 2, 1, 2 * T, 2 * T, T_ENEMY); // 578–579
  add(gfx.enemy!, 32 * T, 8 * T, T, T, T_ENEMY); // 580
  // Chickens:
  tileIds.chicken = G.tileCount;
  addGrid(gfx.enemy!, 25 * T, 10 * T, 6, 1, 2 * T, 2 * T, T_ENEMY); // 581–586
  addGrid(gfx.enemy!, 25 * T, 12 * T, 2, 1, 4 * T, 4 * T, T_ENEMY); // 587–588
  // Rock men:
  tileIds.rockman = G.tileCount;
  add(gfx.enemy!, 33 * T, 14 * T, 2 * T, 2 * T, T_NADA); // 589
  addGrid(gfx.enemy!, 34 * T, 8 * T, 2, 1, 2 * T, 2 * T, T_NADA); // 590–591
  add(gfx.enemy!, 38 * T, 8 * T, 2 * T, 2 * T, T_ENEMY); // 592
  add(gfx.enemy!, 38 * T, 10 * T, 2 * T, 2 * T, T_ENEMY); // 593
  add(gfx.enemy!, 38 * T, 12 * T, 2 * T, 2 * T, T_ENEMY); // 594
  add(gfx.enemy!, 38 * T, 14 * T, 2 * T, 2 * T, T_ENEMY); // 595
  // Clouds:
  tileIds.cloud = G.tileCount;
  addGrid(gfx.enemy!, 33 * T, 12 * T, 2, 1, 2 * T, 2 * T, T_ENEMY); // 596–597
  // Butterflies:
  tileIds.bfly = G.tileCount;
  add(gfx.enemy!, 0, 17 * T, T, T, T_ENEMY); // 598
  addGrid(gfx.enemy!, 0, 16 * T, 2, 1, T, T, T_ENEMY); // 599–600
  addGrid(gfx.enemy!, 2 * T, 16 * T, 4, 1, 2 * T, 2 * T, T_ENEMY); // 601–604
  addGrid(gfx.enemy!, 10 * T, 16 * T, 2, 1, 4 * T, 3 * T, T_ENEMY); // 605–606
  // Ghosts:
  tileIds.ghost = G.tileCount;
  addGrid(gfx.enemy!, 16 * T, 14 * T, 2, 1, 2 * T, 2 * T, T_ENEMY); // 607–608
  add(gfx.enemy!, T, 17 * T, T, T, T_ENEMY); // 609
  // Heads:
  tileIds.head = G.tileCount;
  addGrid(gfx.enemy!, 20 * T, 14 * T, 2, 2, 2 * T, 2 * T, T_WALL); // 610–613
  add(gfx.enemy!, 18 * T, 16 * T, 2 * T, 2 * T, T_ENEMY); // 614
  // Armour arrows:
  tileIds.armourarrow = G.tileCount;
  add(gfx.tiles!, 8 * T, 9 * T, 2 * T, T, T_ENEMY); // 615
  add(gfx.tiles!, 8 * T, 10 * T, 2 * T, T, T_ENEMY); // 616
  // Worms of world 5:
  tileIds.worm2 = G.tileCount;
  addGrid(gfx.enemy!, 0, 18 * T, 4, 1, 2 * T, 2 * T, T_ENEMY); // 617–620
  // Little octopuses of world 5:
  tileIds.octopus = G.tileCount;
  add(gfx.enemy!, 8 * T, 18 * T, 2 * T, 2 * T, T_ENEMY); // 621
  add(gfx.enemy!, 8 * T, 20 * T, 2 * T, 2 * T, T_ENEMY); // 622
  add(gfx.enemy!, 8 * T, 22 * T, 2 * T, 2 * T, T_ENEMY); // 623
  add(gfx.enemy!, 10 * T, 19 * T, 2 * T, 2 * T, T_ENEMY); // 624
  add(gfx.enemy!, 10 * T, 21 * T, 2 * T, 2 * T, T_ENEMY); // 625
  add(gfx.enemy!, 10 * T, 23 * T, 2 * T, 2 * T, T_ENEMY); // 626
  add(gfx.enemy!, 12 * T, 19 * T, 2 * T, 2 * T, T_ENEMY); // 627
  add(gfx.enemy!, 12 * T, 21 * T, 2 * T, 2 * T, T_ENEMY); // 628
  add(gfx.enemy!, 12 * T, 23 * T, 2 * T, 2 * T, T_ENEMY); // 629
  add(gfx.enemy!, 14 * T, 19 * T, 2 * T, 2 * T, T_ENEMY); // 630
  add(gfx.enemy!, 14 * T, 21 * T, 2 * T, 2 * T, T_ENEMY); // 631
  add(gfx.enemy!, 14 * T, 23 * T, 2 * T, 2 * T, T_ENEMY); // 632
  add(gfx.enemy!, 16 * T, 19 * T, 2 * T, 2 * T, T_ENEMY); // 633
  add(gfx.enemy!, 16 * T, 21 * T, 2 * T, 2 * T, T_ENEMY); // 634
  add(gfx.enemy!, 16 * T, 23 * T, 2 * T, 2 * T, T_ENEMY); // 635
  add(gfx.enemy!, 6 * T, 12 * T, 2 * T, 2 * T, T_ENEMY); // 636
  // Hairy creature of world 5:
  tileIds.hairy = G.tileCount;
  addGrid(gfx.enemy!, 18 * T, 18 * T, 2, 1, 3 * T, 3 * T, T_ENEMY); // 637–638
  add(gfx.enemy!, 12 * T, 3 * T, T, T, T_ENEMY); // 639
  add(gfx.enemy!, 21 * T, 2 * T, T, 2 * T, T_ENEMY); // 640
  add(gfx.enemy!, 38 * T, 4 * T, 2 * T, T, T_ENEMY); // 641
  add(gfx.enemy!, 33 * T, 8 * T, T, 2 * T, T_ENEMY); // 642
  // Water dragon:
  tileIds.waterdragon = G.tileCount;
  add(gfx.enemy!, 0, 20 * T, 4 * T, 2 * T, T_ENEMY); // 643
  add(gfx.enemy!, 0, 22 * T, 4 * T, 2 * T, T_ENEMY); // 644
  add(gfx.enemy!, 4 * T, 20 * T, 4 * T, 2 * T, T_ENEMY); // 645
  add(gfx.enemy!, 4 * T, 22 * T, 4 * T, 2 * T, T_ENEMY); // 646
  // Water bug of world 5:
  tileIds.waterbug = G.tileCount;
  addGrid(gfx.enemy!, 0, 24 * T, 4, 1, 2 * T, T, T_ENEMY); // 647–650
  // Birds of world 6:
  tileIds.bird = G.tileCount;
  add(gfx.enemy!, 18 * T, 21 * T, 2 * T, 2 * T, T_ENEMY); // 651
  add(gfx.enemy!, 18 * T, 23 * T, 2 * T, 2 * T, T_ENEMY); // 652
  add(gfx.enemy!, 34 * T, 21 * T, 2 * T, 2 * T, T_ENEMY); // 653
  add(gfx.enemy!, 34 * T, 23 * T, 2 * T, 2 * T, T_ENEMY); // 654
  // Stone men of world 6:
  tileIds.stoneman = G.tileCount;
  add(gfx.enemy!, 13 * T, 2 * T, 2 * T, 2 * T, T_ENEMY); // 655
  add(gfx.enemy!, 20 * T, 21 * T, 2 * T, 2 * T, T_ENEMY); // 656
  add(gfx.enemy!, 20 * T, 23 * T, 2 * T, 2 * T, T_ENEMY); // 657
  add(gfx.enemy!, 22 * T, 21 * T, 2 * T, 2 * T, T_ENEMY); // 658
  add(gfx.enemy!, 22 * T, 23 * T, 2 * T, 2 * T, T_ENEMY); // 659
  add(gfx.enemy!, 24 * T, 21 * T, 2 * T, 2 * T, T_ENEMY); // 660
  add(gfx.enemy!, 24 * T, 23 * T, 2 * T, 2 * T, T_ENEMY); // 661
  add(gfx.enemy!, 24 * T, 15 * T, T, T, T_ENEMY); // 662
  // Pacman of world 6:
  tileIds.pacman = G.tileCount;
  add(gfx.enemy!, 30 * T, 16 * T, 2 * T, 2 * T, T_ENEMY); // 663
  add(gfx.enemy!, 30 * T, 18 * T, 2 * T, 2 * T, T_ENEMY); // 664
  add(gfx.enemy!, 28 * T, 16 * T, 2 * T, 2 * T, T_ENEMY); // 665
  add(gfx.enemy!, 28 * T, 18 * T, 2 * T, 2 * T, T_ENEMY); // 666
  add(gfx.enemy!, 26 * T, 16 * T, 2 * T, 2 * T, T_ENEMY); // 667
  add(gfx.enemy!, 26 * T, 18 * T, 2 * T, 2 * T, T_ENEMY); // 668
  add(gfx.enemy!, 24 * T, 16 * T, 2 * T, 2 * T, T_ENEMY); // 669
  add(gfx.enemy!, 24 * T, 18 * T, 2 * T, 2 * T, T_ENEMY); // 670
  add(gfx.enemy!, 20 * T, 12 * T, 2 * T, 2 * T, T_ENEMY); // 671
  add(gfx.enemy!, 35 * T, 14 * T, 2 * T, 2 * T, T_ENEMY); // 672
  add(gfx.enemy!, 38 * T, 16 * T, 2 * T, 2 * T, T_ENEMY); // 673
  add(gfx.enemy!, 38 * T, 18 * T, 2 * T, 2 * T, T_ENEMY); // 674
  add(gfx.enemy!, 36 * T, 16 * T, 2 * T, 2 * T, T_ENEMY); // 675
  add(gfx.enemy!, 36 * T, 18 * T, 2 * T, 2 * T, T_ENEMY); // 676
  add(gfx.enemy!, 22 * T, 10 * T, 2 * T, 2 * T, T_ENEMY); // 677
  add(gfx.enemy!, 22 * T, 12 * T, 2 * T, 2 * T, T_ENEMY); // 678
  // Red dragon of world 6:
  tileIds.reddragon = G.tileCount;
  addGrid(gfx.enemy!, 26 * T, 21 * T, 2, 1, 4 * T, 4 * T, T_ENEMY); // 679–680
  add(gfx.enemy!, 32 * T, 16 * T, 4 * T, 4 * T, T_ENEMY); // 681
  add(gfx.enemy!, 36 * T, 21 * T, 4 * T, 4 * T, T_ENEMY); // 682
  add(gfx.enemy!, 24 * T, 14 * T, T, T, T_ENEMY); // 683
  // Owl of world 7:
  tileIds.owl = G.tileCount;
  addGrid(gfx.enemy2!, 0, 0, 4, 1, 2 * T, 2 * T, T_ENEMY); // 684–687
  // Green monkey of world 7:
  tileIds.greenmonkey = G.tileCount;
  addGrid(gfx.enemy2!, 0, 2 * T, 6, 1, 2 * T, 2 * T, T_ENEMY); // 688–693
  // Plant of world 7:
  tileIds.plant = G.tileCount;
  addGrid(gfx.enemy2!, 0, 4 * T, 2, 1, 2 * T, 2 * T, T_ENEMY); // 694–695
  add(gfx.enemy2!, 4 * T, 4 * T, T, T, T_ENEMY); // 696
  // Transformer of world 8:
  tileIds.transformer = G.tileCount;
  addGrid(gfx.enemy2!, 0, 10 * T, 10, 1, 2 * T, 2 * T, T_ENEMY); // 697–706
  add(gfx.enemy2!, 20 * T, 10 * T, T, T, T_ENEMY); // 707
  // Flame of world 8:
  tileIds.flame = G.tileCount;
  addGrid(gfx.enemy2!, 0, 8 * T, 8, 1, 2 * T, 2 * T, T_ENEMY); // 708–715
  add(gfx.enemy2!, 16 * T, 8 * T, T, T, T_ENEMY); // 716
  // Witches of world 8:
  tileIds.witch2 = G.tileCount;
  addGrid(gfx.enemy2!, 0, 6 * T, 8, 1, 2 * T, 2 * T, T_ENEMY); // 717–724
  // Cyclops of world 8:
  tileIds.cyclops = G.tileCount;
  addGrid(gfx.enemy2!, 0, 12 * T, 2, 1, 4 * T, 4 * T, T_ENEMY); // 725–726
  addGrid(gfx.enemy2!, 8 * T, 12 * T, 4, 1, 2 * T, 2 * T, T_ENEMY); // 727–730
  // Snakes of world 9:
  tileIds.snake = G.tileCount;
  addGrid(gfx.enemy2!, 8 * T, 0, 6, 1, 2 * T, 2 * T, T_ENEMY); // 731–736
  add(gfx.enemy2!, 20 * T, 0, 2 * T, T, T_ENEMY); // 737
  add(gfx.enemy2!, 20 * T, T, 2 * T, T, T_ENEMY); // 738
  // Gorillas of world 9:
  tileIds.gorilla = G.tileCount;
  add(gfx.enemy2!, 12 * T, 2 * T, 2 * T, 2 * T, T_ENEMY); // 739
  add(gfx.enemy2!, 12 * T, 4 * T, 2 * T, 2 * T, T_ENEMY); // 740
  add(gfx.enemy2!, 14 * T, 2 * T, 2 * T, 2 * T, T_ENEMY); // 741
  add(gfx.enemy2!, 14 * T, 4 * T, 2 * T, 2 * T, T_ENEMY); // 742
  add(gfx.enemy2!, 16 * T, 2 * T, 2 * T, 2 * T, T_ENEMY); // 743
  add(gfx.enemy2!, 16 * T, 4 * T, 2 * T, 2 * T, T_ENEMY); // 744
  add(gfx.enemy2!, 18 * T, 2 * T, 2 * T, 2 * T, T_ENEMY); // 745
  add(gfx.enemy2!, 18 * T, 4 * T, 2 * T, 2 * T, T_ENEMY); // 746
  // Lizards of world 9:
  tileIds.glizard = G.tileCount;
  add(gfx.enemy2!, 22 * T, 0, 4 * T, 2 * T, T_ENEMY); // 747
  add(gfx.enemy2!, 22 * T, 2 * T, 4 * T, 2 * T, T_ENEMY); // 748
  add(gfx.enemy2!, 26 * T, 0, T, T, T_ENEMY); // 749
  add(gfx.enemy2!, 26 * T, T, T, T, T_ENEMY); // 750
  add(gfx.enemy2!, 26 * T, 2 * T, T, T, T_ENEMY); // 751
  add(gfx.enemy2!, 26 * T, 3 * T, T, T, T_ENEMY); // 752
  add(gfx.enemy2!, 26 * T, 4 * T, T, T, T_ENEMY); // 753
  add(gfx.enemy2!, 26 * T, 5 * T, T, T, T_ENEMY); // 754
  add(gfx.enemy2!, 26 * T, 6 * T, T, T, T_ENEMY); // 755
  add(gfx.enemy2!, 26 * T, 7 * T, T, T, T_ENEMY); // 756
  add(gfx.enemy2!, 26 * T, 8 * T, T, T, T_ENEMY); // 757
  add(gfx.enemy2!, 26 * T, 9 * T, T, T, T_ENEMY); // 758
  add(gfx.enemy2!, 26 * T, 10 * T, T, T, T_ENEMY); // 759
  add(gfx.enemy2!, 26 * T, 11 * T, T, T, T_ENEMY); // 760
  add(gfx.enemy2!, 27 * T, 0, T, T, T_ENEMY); // 761
  add(gfx.enemy2!, 27 * T, T, T, T, T_ENEMY); // 762
  add(gfx.enemy2!, 27 * T, 2 * T, T, T, T_ENEMY); // 763
  add(gfx.enemy2!, 27 * T, 3 * T, T, T, T_ENEMY); // 764
  add(gfx.enemy2!, 27 * T, 4 * T, T, T, T_ENEMY); // 765
  add(gfx.enemy2!, 27 * T, 5 * T, T, T, T_ENEMY); // 766
  add(gfx.enemy2!, 27 * T, 6 * T, T, T, T_ENEMY); // 767
  add(gfx.enemy2!, 27 * T, 7 * T, T, T, T_ENEMY); // 768
  add(gfx.enemy2!, 27 * T, 8 * T, T, T, T_ENEMY); // 769
  add(gfx.enemy2!, 27 * T, 9 * T, T, T, T_ENEMY); // 770
  add(gfx.enemy2!, 27 * T, 10 * T, T, T, T_ENEMY); // 771
  add(gfx.enemy2!, 27 * T, 11 * T, T, T, T_ENEMY); // 772
  // Clouds of world 9:
  tileIds.lcloud = G.tileCount;
  addGrid(gfx.enemy2!, 28 * T, 0, 2, 2, 2 * T, 2 * T, T_ENEMY); // 773–776
  add(gfx.enemy2!, 32 * T, 0, 2 * T, 2 * T, T_ENEMY); // 777
  add(gfx.enemy2!, 32 * T, 2 * T, 2 * T, 2 * T, T_ENEMY); // 778
  addGrid(gfx.enemy2!, 28 * T, 4 * T, 5, 3, 2 * T, 2 * T, T_ENEMY); // 779–793
  // Demon of world 9:
  tileIds.bdemon = G.tileCount;
  addGrid(gfx.enemy2!, 18 * T, 6 * T, 2, 1, 4 * T, 4 * T, T_ENEMY); // 794–795
  add(gfx.enemy2!, 22 * T, 10 * T, T, T, T_ENEMY); // 796
  // Balls of the PAMPERSE screen:
  tileIds.pamperseball = G.tileCount;
  add(gfx.enemy2!, 8 * T, 14 * T, 2 * T, 2 * T, T_ENEMY); // 797
  // World doors without key:
  tileIds.wnokeydoor = G.tileCount;
  add(gfx.tiles!, 32 * T, 22 * T, T, 3 * T, T_DOOR_WALL); // 798
  add(gfx.tiles!, 33 * T, 22 * T, 2 * T, 3 * T); // 799
  add(gfx.tiles!, 35 * T, 22 * T, 3 * T, 3 * T); // 800
  add(gfx.tiles!, 38 * T, 22 * T, 2 * T, 3 * T); // 801
  add(gfx.tiles2!, 32 * T, 0, T, 3 * T, T_DOOR_WALL); // 802
  add(gfx.tiles2!, 33 * T, 0, 2 * T, 3 * T); // 803
  add(gfx.tiles2!, 35 * T, 0, 3 * T, 3 * T); // 804
  add(gfx.tiles2!, 38 * T, 0, 2 * T, 3 * T); // 805
  // Collision tiles:
  tileIds.collision = G.tileCount;
  add(gfx.tiles!, 18 * T, 17 * T, 2 * T, 2 * T); // 806
  add(gfx.tiles!, 18 * T, 19 * T, 2 * T, 2 * T); // 807
  add(gfx.tiles!, 38 * T, 17 * T, 2 * T, 2 * T); // 808
  add(gfx.tiles!, 38 * T, 19 * T, 2 * T, 2 * T); // 809
  // Special tiles:
  tileIds.demonsign = G.tileCount;
  add(gfx.tiles2!, 0, 0, 8 * T, 8 * T); // 810
  tileIds.magnifier = G.tileCount;
  add(gfx.tiles2!, 8 * T, 0, 24 * T, 12 * T); // 811
  tileIds.demonsmoke = G.tileCount;
  addGrid(gfx.tiles2!, 0, 8 * T, 2, 1, 4 * T, 4 * T); // 812–813
  tileIds.demon = G.tileCount;
  if (G.fightingDemon >= 160) {
    if (G.world === 1) loadDemon1();
    if (G.world === 2) loadDemon2();
    if (G.world === 3) loadDemon3();
    if (G.world === 4) loadDemon4();
    if (G.world === 5) loadDemon5();
    if (G.world === 6) loadDemon6();
    if (G.world === 7) loadDemon7();
    if (G.world === 8) loadDemon8();
    if (G.world === 9) loadDemon9();
    if (G.world === 10) loadDemon10();
  }
  // Reload in the ENDING SCENE:
  if (G.state === State.Ending && G.subState >= 96) {
    // (the C++ deletes the old tiles here; references are simply replaced)
    G.tiles[tileIds.demon] = new Tile(gfx.final, 0, 0, TILE_SIZE_X * 20, TILE_SIZE_Y * 14, T_NADA);
    G.tiles[tileIds.demon + 1] = new Tile(gfx.final, TILE_SIZE_X * 20, 0, TILE_SIZE_X * 6, TILE_SIZE_Y * 2, T_NADA);
    G.tiles[tileIds.demon + 2] = new Tile(
      gfx.final,
      TILE_SIZE_X * 20,
      TILE_SIZE_Y * 2,
      TILE_SIZE_X * 6,
      TILE_SIZE_Y * 2,
      T_NADA,
    );
    G.tiles[tileIds.demon + 3] = new Tile(
      gfx.final,
      TILE_SIZE_X * 20,
      TILE_SIZE_Y * 4,
      TILE_SIZE_X * 6,
      TILE_SIZE_Y * 2,
      T_NADA,
    );
    G.tiles[tileIds.demon + 4] = new Tile(
      gfx.final,
      TILE_SIZE_X * 26,
      TILE_SIZE_Y * 2,
      TILE_SIZE_X * 2,
      TILE_SIZE_Y * 2,
      T_NADA,
    );
    G.tiles[tileIds.demon + 5] = new Tile(gfx.final, TILE_SIZE_X * 26, 0, TILE_SIZE_X * 2, TILE_SIZE_Y * 2, T_NADA);
    G.tiles[tileIds.demon + 6] = new Tile(gfx.final, TILE_SIZE_X * 28, 0, TILE_SIZE_X * 2, TILE_SIZE_Y * 2, T_NADA);
    G.tiles[tileIds.demon + 7] = new Tile(gfx.final, TILE_SIZE_X * 30, 0, TILE_SIZE_X * 8, TILE_SIZE_Y * 4, T_NADA);
  }

  attachInbetweens();
}
