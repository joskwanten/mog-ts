import type { Screen } from '../engine/screen';
import { gfx, sfx, tileIds } from './resources';
import { drawTile, drawTileMask, drawTileNative, drawTileNoMask } from './tiledraw';
/**
 * Port of gameaux.cpp: game initialisation, resource (re)loading, room
 * loading, map/status drawing and assorted helpers.
 */
import { Bitmap, decodePCX, paletteToRGBA, rgba } from '../engine/bitmap';
import { fillRect, memset } from '../engine/drawing';
import { GRAPHIC_SETS, SOUND_SETS, readBinary, readImage } from '../platform/assets';
import { createSound, releaseMusicTemporarily, setSfxGain, setSoundPath, stopMusic } from '../platform/audio';
import type { SDLKey } from '../platform/keyboard';
import {
  SDLK_DOWN,
  SDLK_F1,
  SDLK_F2,
  SDLK_LEFT,
  SDLK_RIGHT,
  SDLK_SPACE,
  SDLK_UNKNOWN,
  SDLK_UP,
  SDLK_a,
  SDLK_m,
  SDLK_z,
  getKeyboardState,
} from '../platform/keyboard';
import {
  GAME_VIEW_X,
  GAME_VIEW_Y,
  HIT_PERIOD,
  HP_OBJS_MAX,
  MAX_AW_RECORD,
  MAX_EXPERIENCE,
  MAX_LEVERS,
  SCREEN_X,
  SCREEN_Y,
  S_QUIET,
  State,
  TILE_SIZE_X,
  TILE_SIZE_Y,
  TILE_UNIT,
  T_ARMOUR,
  T_BAMBU,
  T_BAT,
  T_BLACK,
  T_BLOB,
  T_BLUESPIDER,
  T_BOUNCINGBALL,
  T_BROKEN_STONE,
  T_BUBBLE,
  T_DEMON1,
  T_DEMON1_BONES,
  T_DEMON1_BONES2,
  T_DEMON2,
  T_DEMON2_BALLS,
  T_DEMON2_HEAD,
  T_DEMON3_FIRE,
  T_DEMON5,
  T_DEMON5_FIRE,
  T_DEMON9_FIRE,
  T_DOOR,
  T_ENEMY,
  T_EXPLOSION,
  T_FAIRY,
  T_FAIRY_BUBBLE,
  T_FEET,
  T_FSTONE,
  T_GLIZARD_TONGUE,
  T_GORILLA,
  T_HITWALL,
  T_ITEM,
  T_JUMPINGBUSH,
  T_KEYDOOR,
  T_KNIGHT,
  T_LADDER,
  T_LAVA1,
  T_LAVA2,
  T_LAVA3,
  T_LIGHTNING,
  T_MEGABAT,
  T_MEGABAT2,
  T_MEGABAT3,
  T_MINE_EXP,
  T_NADA,
  T_PAMPERSE,
  T_PORCUPINE_BULLET,
  T_RFL_ARROW,
  T_RFL_ARROW2,
  T_RFL_FIRE,
  T_RFL_RFIRE,
  T_RSTONE,
  T_SKELETON,
  T_SLIME,
  T_SMOKE,
  T_STONE,
  T_TOMB,
  T_WATERMONSTER,
  T_WATERMONSTER_ARM,
  T_WDOOR,
  T_WEAPON_ARROW,
  T_WEAPON_ARROW2,
  T_WEAPON_FIRE,
  T_WEAPON_MINE,
  T_WEAPON_RFIRE,
  T_WHITEBEAR_BULLET,
  T_WHITEFIREBALL,
  T_WITCH,
  T_WKEYDOOR,
  T_WNOKEYDOOR,
  T_WNOKEYDOOR2,
  T_WNOKEYDOOR3,
  T_WORM,
} from './constants';
import { Scanner, idiv } from './cutil';
import { drawDemonBackground } from './demons';
import { loadGraphics } from './gametiles';
import type { GameObject } from './object';
import { readPassword } from './passwords';
import { G } from './state';

export { loadRoom } from './roomfile';

/** localStorage key of the configuration file. */
const CFG_KEY = 'mog.cfg';

/** C `%.3i`. */
function pad3(n: number): string {
  return n < 0 ? '-' + String(-n).padStart(3, '0') : String(n).padStart(3, '0');
}

export function releaseGraphics(): void {
  G.collision = null;

  G.tiles = [];
  // (the C++ keeps tileCount; only the tiles are deleted)

  gfx.enemy = null;
  gfx.enemy2 = null;
  gfx.tiles = null;
  gfx.tiles2 = null;
  gfx.menu = null;
  gfx.konami = null;
  gfx.final = null;
}

export function setSfxVolume(volume: number): void {
  // The per-sound Mix_VolumeChunk calls (commented out in the original) become one SFX gain.
  setSfxGain(volume);
}

export function releaseSounds(definitive: boolean): void {
  if (definitive) stopMusic();
  else releaseMusicTemporarily();
  // (deleteSound() for every S_* is a no-op here: sound buffers are shared and cached)
}

export function gameEnd(): void {
  releaseGraphics();
  releaseSounds(true);

  G.roomTiles = null;
}

export function newGame(): void {
  G.hitTime = 0;
  G.world = 0;
  G.roomX = 5;
  G.roomY = 12;

  G.arrows = 0;
  G.coins = 0;
  G.keys = 0;

  G.firedArrows = 0;
  G.firedMines = 0;
  G.energy[0] = G.energy[1] = 16;
  G.maxEnergy[0] = G.maxEnergy[1] = 16;
  G.experience[0] = G.experience[1] = 0;
  G.shownEnergy[0] = G.shownEnergy[1] = 16;
  G.shownExperience[0] = G.shownExperience[1] = 0;
  G.characterAlive[0] = G.characterAlive[1] = true;
  G.character = 0;
  G.frozen = 0;

  G.playerX = 20 * TILE_SIZE_X;
  G.playerY = 9 * TILE_SIZE_Y;
  G.facingRight = true;
  G.playerFrame = 0;
  G.playerState = S_QUIET;
  G.playerSubState = 0;
  G.currentWeapon = -1;
  G.fightingDemon = 0;
  G.enterCut = 0;
  G.mineStepped = false;
  G.bibleCounter = 16;
  G.bibleSubcounter = 0;
  G.canRevive[0] = G.canRevive[1] = true;
  G.zeusPassword = false;

  G.world3Room06Counter = 0;
  G.world5Room44State = 0;
  G.world5Room44State2 = 0;
  G.world5Room64State = 0;
  G.world6Room35State = 0;
  G.world7Room12State = 0;
  G.world8Room12State = 0;
  G.world10DoorX = G.world10DoorY = -1;

  clearTypedWord();
  for (let i = 0; i < 38; i++) G.items[i] = false;
  for (let i = 0; i < 10; i++) {
    G.worldDoorsOpen[i] = false;
    for (let j = 0; j < 4; j++) G.worldItems[i][j] = false;
  }
  G.hasWorldKey = false;
  G.hasCross = false;
  G.nextWorld = 0;

  for (let i = 0; i < MAX_LEVERS; i++) {
    G.leverRoomX[i] = G.leverDrx[i][0];
    G.leverRoomY[i] = G.leverDry[i][0];
    G.leverX[i] = G.leverDx[i][0];
    G.leverY[i] = G.leverDy[i][0];
    G.leverGoingTo[i] = 1;
  }

  for (let i = 0; i < MAX_AW_RECORD; i++) {
    G.appearwallRecordX[i] = -1;
    G.appearwallRecordY[i] = -1;
  }

  readPassword(G.password);

  // Developer start position (to be removed):
  if (G.devStartWorld !== -1) {
    G.world = G.devStartWorld;
    G.roomX = G.devStartX;
    G.roomY = G.devStartY;

    for (let i = 0; i < G.world; i++) G.worldDoorsOpen[i] = true;
    G.nextWorld = G.world;
  }
  // (a commented-out block of debug start values follows in the original)
}

/** Draw background tile `t` in room cell (col, row). */
function drawRoomTile(screen: Screen, t: number, col: number, row: number): void {
  drawTile(screen, t, GAME_VIEW_X + col * TILE_SIZE_X, GAME_VIEW_Y + row * TILE_SIZE_Y, TILE_SIZE_X, TILE_SIZE_Y);
}

/** The wall pattern over world 5 room (1,3) until item 9 is taken, by row % 4 and column % 2. */
const WORLD5_ROOM13_PATTERN = [
  [127, 128],
  [129, 130],
  [128, 127],
  [130, 129],
];

function drawRoomBackground(screen: Screen): void {
  const roomTiles = G.roomTiles!;
  const width = G.roomWidth;
  const height = G.roomHeight;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) drawRoomTile(screen, roomTiles[col + row * width], col, row);
  }

  if (G.world === 5 && G.roomX === 1 && G.roomY === 3 && !G.items[9]) {
    // NOTE (original): the tile test `tile==125 || ... || tile>=135 || tile<=140` is always true,
    // so every tile is redrawn with the pattern.
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) drawRoomTile(screen, WORLD5_ROOM13_PATTERN[row % 4][col % 2], col, row);
    }
  }

  if (G.roomDemonroom) {
    drawTile(
      screen,
      tileIds.demonsign,
      GAME_VIEW_X + TILE_SIZE_X * 12,
      GAME_VIEW_Y + TILE_SIZE_Y * 4,
      TILE_SIZE_X * 8,
      TILE_SIZE_Y * 8,
    );

    drawDemonBackground(screen, SCREEN_X);

    // The walls go in front of the demon background:
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const t = roomTiles[col + row * width];
        if (t === 125 || t === 126) drawRoomTile(screen, t, col, row);
      }
    }
  }
}

/** The castle levers in the current room. */
function drawLevers(screen: Screen): void {
  for (let i = 0; i < MAX_LEVERS; i++) {
    if (G.roomX === G.leverRoomX[i] && G.roomY === G.leverRoomY[i]) {
      drawTile(
        screen,
        tileIds.lever,
        GAME_VIEW_X + G.leverX[i],
        GAME_VIEW_Y + G.leverY[i],
        TILE_SIZE_X * 4,
        TILE_SIZE_Y * 2,
      );
    }
  }
}

// type=0 normal
// type=1 only background
// type=2 only objects
export function drawMap(screen: Screen, type: number): void {
  if (type !== 2) drawRoomBackground(screen);

  if (type !== 1) {
    if (G.world === 0) drawLevers(screen);

    // In object order: later objects paint over (and their collision types over) earlier ones.
    for (let i = 0; i < G.objectCount; i++) {
      const o = G.objects[i];
      o.drawX = GAME_VIEW_X + o.x + o.xoffs;
      o.drawY = GAME_VIEW_Y + o.y + o.yoffs;
      drawObject(screen, o);
    }
  }
}

/** Draw a room object that is not an enemy (doors, items, weapons, ...); enemies go to drawEnemy. */
function drawObject(screen: Screen, o: GameObject): void {
  const x = GAME_VIEW_X + o.x;
  const y = GAME_VIEW_Y + o.y;

  switch (o.type) {
    case T_LADDER:
      for (let j = 0; j < o.size && o.y + j * TILE_SIZE_Y < G.roomHeight * TILE_SIZE_Y; j++) {
        drawTile(screen, tileIds.ladder, x, y + j * TILE_SIZE_Y, TILE_SIZE_X * 2, TILE_SIZE_Y);
      }
      break;
    case T_STONE:
      drawTile(screen, tileIds.stone, x, y);
      drawTileMask(tileIds.stone + 2, x, y);
      break;
    case T_BROKEN_STONE:
      drawTile(screen, tileIds.stone + 1, x, y);
      break;
    case T_WDOOR:
      drawTile(screen, tileIds.wdoor, x, y, TILE_SIZE_X * 4, TILE_SIZE_Y * 3);
      if (o.state === 1) {
        // Open: a ladder leads in.
        drawTile(screen, tileIds.ladder, x + TILE_SIZE_X, y + TILE_SIZE_Y, TILE_SIZE_X * 2, TILE_SIZE_Y);
        drawTile(screen, tileIds.ladder, x + TILE_SIZE_X, y + 2 * TILE_SIZE_Y, TILE_SIZE_X * 2, TILE_SIZE_Y);
      }
      break;
    case T_DOOR:
      drawTile(screen, tileIds.door, x, y);
      break;
    case T_KEYDOOR:
      drawKeyDoor(screen, o, x, y);
      break;
    case T_WKEYDOOR:
      drawWorldKeyDoor(screen, o, x, y);
      break;
    case T_WNOKEYDOOR:
    case T_WNOKEYDOOR2:
    case T_WNOKEYDOOR3:
      drawWorldNoKeyDoor(screen, o, x, y);
      break;
    case T_ITEM:
      drawItem(screen, o.state, x, y);
      break;
    case T_EXPLOSION:
      drawTile(screen, tileIds.explosion + idiv(o.size % 9, 3), x, y);
      break;

    // The player's weapons (state 0: flying right) and the reflected enemy shots:
    case T_WEAPON_ARROW:
      o.state3 = o.x;
      drawTileNative(screen, tileIds.weapons + (o.state === 0 ? 0 : 6), x, y);
      break;
    case T_WEAPON_ARROW2:
      o.state3 = o.x;
      drawTileNative(screen, tileIds.weapons + (o.state === 0 ? 1 : 7), x, y);
      break;
    case T_RFL_ARROW:
      drawTileNative(screen, tileIds.weapons + (o.state === 0 ? 14 : 15), x, y);
      break;
    case T_RFL_ARROW2:
      drawTileNative(screen, tileIds.weapons + (o.state === 0 ? 16 : 17), x, y);
      break;
    case T_RFL_FIRE:
      drawTileNative(screen, tileIds.weapons + (o.state === 0 ? 18 : 19), x, y);
      break;
    case T_RFL_RFIRE:
      drawTileNative(screen, tileIds.weapons + 20, x, y);
      break;
    case T_WEAPON_FIRE:
      o.state3 = o.x;
      drawTile(screen, tileIds.weapons + (o.state === 0 ? 3 : 8), x, y, TILE_SIZE_X, TILE_SIZE_Y);
      break;
    case T_WEAPON_RFIRE:
      drawTile(screen, tileIds.weapons + o.tile, x, y, TILE_SIZE_X, TILE_SIZE_Y);
      break;
    case T_WEAPON_MINE:
      o.state3 = o.x;
      drawTileNative(screen, tileIds.weapons + o.tile, x, y);
      break;
    case T_MINE_EXP:
      drawTileNative(screen, tileIds.weapons + o.tile, x, y);
      G.tiles[tileIds.weapons + o.tile].drawMaskNative(
        x,
        y - idiv(TILE_SIZE_Y * 3, 2),
        G.collision!,
        SCREEN_X,
        SCREEN_Y,
        SCREEN_X,
      );
      break;

    case T_ARMOUR:
      drawTile(screen, o.baseTile, x, y, TILE_SIZE_X * 2, TILE_SIZE_Y * 3);
      break;
    case T_TOMB:
      drawTile(screen, tileIds.tomb, x, y);
      break;
    case T_FAIRY_BUBBLE:
      drawTile(screen, tileIds.fairy + 6 + o.state3, x, y, idiv(TILE_SIZE_X, 2), idiv(TILE_SIZE_Y, 2));
      break;
    case T_FAIRY: {
      let frame: number;
      if (o.state3 < 80) frame = ((o.state3 >> 3) & 0x01) + 4;
      else frame = ((o.state3 >> 2) & 0x01) + (o.state >= 0 ? 2 : 0);
      drawTile(screen, tileIds.fairy + frame, x, y);
      break;
    }
    case T_HITWALL: {
      const wall = G.world === 0 ? 105 : 125;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          drawTile(screen, wall, x + col * TILE_SIZE_X, y + row * TILE_SIZE_Y, TILE_SIZE_X, TILE_SIZE_Y);
        }
      }
      break;
    }
    case T_PAMPERSE:
      drawTile(screen, 182, x, y);
      break;
    case T_ENEMY:
      drawEnemy(screen, o, x, y);
      break;
  }
}

/** A key door: three tiles high; opening (state < 0) it sinks into the floor. */
function drawKeyDoor(screen: Screen, o: GameObject, x: number, y: number): void {
  const drawRow = (row: number): void =>
    drawTile(screen, tileIds.keydoor, x, y + row * TILE_SIZE_Y, TILE_SIZE_X, TILE_SIZE_Y);

  if (o.state >= 0) {
    for (let row = 0; row < 3; row++) drawRow(row);
  } else {
    if (o.state < -20) drawRow(2);
    if (o.state < -12) drawRow(1);
    drawRow(0);
  }
}

/**
 * A world key door. Opening (state < 0) it swings open in two frames, 2 and
 * then 3 tiles wide; to the right if state2 is 0, else to the left.
 */
function drawWorldKeyDoor(screen: Screen, o: GameObject, x: number, y: number): void {
  if (o.state >= 0) {
    drawTile(screen, tileIds.wkeydoor, x, y, TILE_SIZE_X, TILE_SIZE_Y * 3);
    return;
  }
  const frame = o.state < -20 ? 1 : 2;
  const width = frame + 1;
  const dx = o.state2 === 0 ? 0 : -(width - 1) * TILE_SIZE_X;
  drawTile(screen, tileIds.wkeydoor + frame, x + dx, y, TILE_SIZE_X * width, TILE_SIZE_Y * 3);
}

/**
 * A world door without key (three graphics: WNOKEYDOOR, and 2/3 share the
 * second set). Opening (state < 0) it turns through frames 1, 2, 3 (state2 0)
 * or 3, 2, 1; frame 2 is 3 tiles wide, the others 2.
 */
function drawWorldNoKeyDoor(screen: Screen, o: GameObject, x: number, y: number): void {
  const base = tileIds.wnokeydoor + (o.type === T_WNOKEYDOOR2 || o.type === T_WNOKEYDOOR3 ? 4 : 0);

  if (o.state >= 0) {
    drawTile(screen, base, x, y, TILE_SIZE_X, TILE_SIZE_Y * 3);
    return;
  }
  let frame = o.state < -16 ? 1 : o.state < -8 ? 2 : 3;
  if (o.state2 !== 0) frame = 4 - frame;
  if (frame === 2) {
    drawTile(screen, base + 2, x - TILE_SIZE_X, y, TILE_SIZE_X * 3, TILE_SIZE_Y * 3);
  } else {
    drawTile(screen, base + frame, x - idiv(TILE_SIZE_X, 2), y, TILE_SIZE_X * 2, TILE_SIZE_Y * 3);
  }
}

/**
 * An item lying in the room, by its number: -1 coins, -2 key, -3 arrows,
 * 0..31 items, 32..35 weapons, 36 cross, 37 world key, 38.. world items.
 */
function drawItem(screen: Screen, item: number, x: number, y: number): void {
  if (item === -1) drawTile(screen, tileIds.coin, x, y);
  else if (item === -2) drawTile(screen, tileIds.key, x, y);
  else if (item === -3) drawTile(screen, tileIds.arrow, x, y);
  else if (item >= 0 && item < 32) drawTile(screen, tileIds.items + item, x, y);
  else if (item === 32 || item === 33) {
    drawTile(screen, tileIds.weapons + item - 32, x, y, TILE_SIZE_X * 2, TILE_SIZE_Y);
  } else if (item === 34 || item === 35) {
    drawTile(screen, tileIds.weapons + item - 32, x, y, TILE_SIZE_X, TILE_SIZE_Y);
  } else if (item === 36 || item === 37) drawTile(screen, tileIds.items + item, x, y);
  else if (item >= 38) drawTile(screen, tileIds.items + item - 6, x, y);
}

/**
 * Draw `baseTile + tile` at its own size at the object's position plus offset
 * (nothing while tile < 0). With `noMask` it paints no collision: the item
 * that makes this enemy harmless is owned.
 */
function drawEnemyNative(screen: Screen, o: GameObject, noMask = false): void {
  if (o.tile < 0) return;
  const t = o.baseTile + o.tile;
  const x = GAME_VIEW_X + o.x + o.xoffs;
  const y = GAME_VIEW_Y + o.y + o.yoffs;
  if (noMask) G.tiles[t].drawNoMaskNative(x, y, screen, SCREEN_X, SCREEN_Y, SCREEN_X);
  else drawTileNative(screen, t, x, y);
}

/** A fire beam to the right: `head` at (x, y), `n` times `body`, then `tip`. */
function drawBeamRight(screen: Screen, head: number, body: number, tip: number, x: number, y: number, n: number): void {
  drawTileNative(screen, head, x, y);
  for (let j = 0; j < n; j++) drawTileNative(screen, body, x + (j + 2) * TILE_SIZE_X, y);
  drawTileNative(screen, tip, x + (n + 2) * TILE_SIZE_X, y);
}

/** A fire beam to the left: `head` at (x, y), `n` times `body`, then `tip`. */
function drawBeamLeft(screen: Screen, head: number, body: number, tip: number, x: number, y: number, n: number): void {
  drawTileNative(screen, head, x, y);
  for (let j = 0; j < n; j++) drawTileNative(screen, body, x - (j + 1) * TILE_SIZE_X, y);
  drawTileNative(screen, tip, x - (n + 2) * TILE_SIZE_X, y);
}

/** Lightning segments: the x where each of the 5 segment shapes starts and ends (in TILE_UNITs). */
const LIGHTNING_START = [6, 10, 15, 3, 3];
const LIGHTNING_END = [5, 5, 10, 13, 13];

/** Draw a T_ENEMY object at screen position (x, y) (without xoffs/yoffs). */
function drawEnemy(screen: Screen, o: GameObject, x: number, y: number): void {
  const b = o.baseTile;

  switch (o.enemy) {
    case T_WORM: {
      // state > 0: coming out of the ground, < 0: going back in.
      let step: number, frame: number;
      if (o.state < 0) {
        step = Math.min(Math.max(-o.state - 1, 0), 27);
        frame = G.wormStateTileI[step];
      } else {
        step = Math.min(Math.max(o.state - 1, 0), 27);
        frame = G.wormStateTile[step];
      }
      drawTile(screen, b + frame, x, y + G.wormStateY[step] * TILE_UNIT);
      break;
    }
    case T_BAT: {
      // Hanging from the ceiling (frame 2) or flying:
      const col = idiv(o.x, TILE_SIZE_X);
      const row = idiv(o.y, TILE_SIZE_Y);
      let frame = 2;
      if (isWall(col, row) || !isWall(col, row - 1) || o.state === 1 || row === 0) frame = (o.state2 >> 2) % 2;
      drawTile(screen, b + frame, x, y);
      break;
    }
    case T_SKELETON:
      drawSkeleton(screen, o, x, y);
      break;
    case T_SMOKE:
      drawSmoke(screen, o, x, y);
      break;

    // Harmless (no collision) once the protecting item is owned:
    case T_BAMBU:
      drawEnemyNative(screen, o, G.items[10]);
      break;
    case T_WHITEFIREBALL:
      drawEnemyNative(screen, o, G.items[2]);
      break;
    case T_LAVA1:
    case T_LAVA2:
    case T_LAVA3:
      drawEnemyNative(screen, o, G.items[23]);
      break;

    case T_SLIME:
      drawTile(screen, b + (o.state === 0 ? 0 : 2) + (o.state2 < 6 ? 0 : 1), x, y);
      break;
    case T_WATERMONSTER:
      drawTile(screen, b, x, y - o.state2, TILE_SIZE_X * 3, TILE_SIZE_Y * 2);
      drawTile(screen, b + 5, x, y, TILE_SIZE_X * 3, TILE_SIZE_Y * 2);
      break;
    case T_WATERMONSTER_ARM: {
      const length = idiv(o.state2 * TILE_SIZE_Y, 2);
      drawTile(screen, b + 1, x, y - length, TILE_SIZE_X, TILE_SIZE_Y);
      const segment = b + ((o.state2 & 0x01) === 0 ? 2 : 3);
      for (let j = 0; j < length; j += TILE_SIZE_Y) drawTile(screen, segment, x, y - j, TILE_SIZE_X, TILE_SIZE_Y);
      break;
    }
    case T_BUBBLE:
      drawTile(screen, b + o.tile, x, y, TILE_SIZE_X, TILE_SIZE_Y);
      break;
    case T_FSTONE:
    case T_RSTONE:
      drawTile(screen, b + ((o.state3 >> 2) & 0x03), x, y);
      break;
    case T_KNIGHT:
      drawKnight(screen, o, x, y);
      break;
    case T_BLOB:
      drawTile(screen, b + o.state2, x, y);
      break;
    case T_PORCUPINE_BULLET:
      drawTile(screen, b + 8, x, y);
      break;
    case T_JUMPINGBUSH:
      drawTile(screen, b, x, y + o.state2);
      o.drawY = y + o.state2;
      break;
    case T_BLACK:
      drawTile(screen, b, x, y);
      break;
    case T_WITCH:
      if (o.state !== 0) {
        if (G.items[1]) drawTileNoMask(screen, b, x, y);
        else drawTile(screen, b, x, y);
      }
      break;
    case T_WHITEBEAR_BULLET:
      drawTile(screen, b + 4 + o.state, x, y);
      break;
    case T_FEET:
      drawTile(screen, b + o.tile, x, y + o.yoffs);
      o.drawY = y - idiv(TILE_SIZE_Y, 2);
      break;
    case T_BOUNCINGBALL:
      if (o.tile >= 0) {
        drawTileNative(screen, b + o.tile, x, y + o.state);
        o.drawY = y + o.state;
      }
      break;
    case T_BLUESPIDER:
      if (o.tile >= 0) {
        drawTileNative(screen, b + o.tile, x + o.state2, y);
        o.drawX = x + o.state2;
      }
      break;
    case T_MEGABAT:
      drawTile(screen, b + ((o.state2 >> 3) % 2), x, y, TILE_SIZE_X * 4, TILE_SIZE_Y * 2);
      break;
    case T_MEGABAT2:
      drawTile(screen, b + ((o.state2 >> 2) % 2), x, y);
      break;
    case T_MEGABAT3:
      drawTile(screen, b + 2 + ((o.state2 >> 2) % 2), x, y, TILE_SIZE_X * 2, TILE_SIZE_Y * 1);
      break;

    // Demons and their attacks (state is the tile for the demon bodies):
    case T_DEMON1:
      drawTile(screen, o.state, x, y, TILE_SIZE_X * 10, TILE_SIZE_Y * 7);
      break;
    case T_DEMON1_BONES:
      drawTile(screen, tileIds.demon + 12 + (o.state2 >> 1), x, y);
      break;
    case T_DEMON1_BONES2:
      drawTile(screen, tileIds.demon + 12 + (o.state2 >> 1), x, y, TILE_SIZE_X, TILE_SIZE_Y);
      break;
    case T_DEMON2:
      drawTile(screen, o.state, x, y, TILE_SIZE_X * 6, TILE_SIZE_Y * 6);
      break;
    case T_DEMON2_BALLS:
      drawTile(screen, tileIds.demon + 7, x, y, TILE_SIZE_X, TILE_SIZE_Y);
      break;
    case T_DEMON2_HEAD:
      if (o.state >= 0) drawTile(screen, o.state, x, y, TILE_SIZE_X, TILE_SIZE_Y);
      break;
    case T_DEMON3_FIRE: {
      const d = tileIds.demon;
      if (o.state === 0) drawBeamRight(screen, d + 6, d + 7, d + 8, x, y, o.state2);
      else drawBeamLeft(screen, d + 11, d + 10, d + 9, x, y, o.state2);
      break;
    }
    case T_DEMON9_FIRE: {
      const d = tileIds.demon;
      drawBeamLeft(screen, d + 8, d + 7, d + 6, x, y, o.state2);
      break;
    }
    case T_DEMON5:
      drawTileNative(screen, b + o.state3, x, y + TILE_SIZE_Y);
      drawTileNative(screen, b + o.tile, x + 4 * TILE_SIZE_X, y);
      break;
    case T_DEMON5_FIRE: {
      const d = tileIds.demon;
      if (o.state === 0) drawBeamRight(screen, d + 20, d + 21, d + 22, x, y, o.state2);
      else drawBeamLeft(screen, d + 25, d + 24, d + 23, x, y, o.state2);
      break;
    }

    case T_GORILLA:
      if (o.tile >= 0) {
        const gx = x + o.xoffs;
        const gy = y + o.yoffs;
        if (o.state >= 5) {
          drawTileNative(screen, b + 6, gx, gy - 2 * TILE_SIZE_Y);
          drawTileMask(b + 6, gx, gy - 3 * TILE_SIZE_Y, 2 * TILE_SIZE_X, 2 * TILE_SIZE_Y);
        }
        drawTileNative(screen, b + o.tile, gx, gy);
      }
      break;
    case T_GLIZARD_TONGUE:
      drawLizardTongue(screen, o, x, y);
      break;
    case T_LIGHTNING: {
      let dx = 0;
      for (let j = 0; j < o.state3; j++) {
        drawTileNative(
          screen,
          b + 6 + o.lightning[j] + (o.state2 % 3) * 5,
          x + o.xoffs + dx,
          y + o.yoffs + j * TILE_SIZE_Y * 2,
        );
        // The next segment starts where this one ends:
        if (j < o.state3 - 1) dx += (LIGHTNING_END[o.lightning[j]] - LIGHTNING_START[o.lightning[j + 1]]) * TILE_UNIT;
      }
      break;
    }
    default:
      drawEnemyNative(screen, o);
  }
}

/** The skeleton: rising from the ground (size 7..1), else a body plus the half sprite in front of it. */
function drawSkeleton(screen: Screen, o: GameObject, x: number, y: number): void {
  const b = o.baseTile;

  switch (o.size) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      drawTile(screen, b + 6, x, y);
      return;
    case 6:
      drawTile(screen, b + 5, x, y);
      return;
    case 7:
      drawTile(screen, b + 4, x, y);
      return;
  }

  const step = (o.state2 >> 2) % 2;
  const left = -8 * TILE_UNIT;
  const right = 8 * TILE_UNIT;
  const drawPair = (body: number, front: number, dx: number): void => {
    drawTile(screen, b + body, x, y);
    drawTile(screen, b + front, x + dx, y);
  };
  switch (o.state) {
    case 0: // walking left
      drawPair(step, 7 + step, left);
      break;
    case 1: // walking right
      drawPair(2 + step, 9 + step, right);
      break;
    case 2: // standing left
      drawPair(0, 7, left);
      break;
    case 3: // standing right
      drawPair(2, 9, right);
      break;
    case 5:
    case 7: // jumping left
      drawPair(1, 7, left);
      break;
    case 4:
    case 6: // jumping right
      drawPair(3, 9, right);
      break;
  }
}

/**
 * The smoke cloud (size 0: small, else big) grows and shrinks with state2
 * (1..7); it is harmless (no collision) once item 21 is owned.
 */
function drawSmoke(screen: Screen, o: GameObject, x: number, y: number): void {
  const draw = G.items[21] ? drawTileNoMask : drawTile;
  const t = o.size === 0 ? o.baseTile : o.baseTile + 4;
  const late = o.state % 6 >= 3; // second half of the animation step

  switch (o.state2) {
    case 1:
    case 7:
      if (late) draw(screen, t, x, y);
      break;
    case 2:
    case 6:
      draw(screen, t + (late ? 1 : 0), x, y);
      break;
    case 3:
    case 5:
      draw(screen, t + (late ? 2 : 1), x, y);
      break;
    case 4:
      draw(screen, t + (late ? 3 : 2), x, y);
      break;
  }
}

/** The knight (frame state2) and, when it faces the player, its second sprite in front. */
function drawKnight(screen: Screen, o: GameObject, x: number, y: number): void {
  const b = o.baseTile;

  drawTile(screen, b + o.state2, x, y);
  if (o.state === 1 || o.state === 7 || o.state === 9) {
    if (o.state2 === 0) drawTile(screen, b + 8, x - TILE_SIZE_X * 2, y);
    else drawTile(screen, b + 8, x + TILE_UNIT * 2 - TILE_SIZE_X * 2, y - TILE_UNIT);
  }
  if (o.state === 0 || o.state === 6 || o.state === 8) {
    if (o.state2 === 2) drawTile(screen, b + 9, x + TILE_SIZE_X * 2, y);
    else drawTile(screen, b + 9, x + TILE_SIZE_X * 2 - TILE_UNIT * 2, y - TILE_UNIT);
  }
}

/** The lizard's tongue: grows for state2 0..28 and shrinks back; up (state 0) or down. */
function drawLizardTongue(screen: Screen, o: GameObject, x: number, y: number): void {
  const b = o.baseTile;
  let n = o.state2 <= 28 ? idiv(o.state2, 2) + 2 : idiv(48 - o.state2, 2) + 2;
  if (n >= 12) n = 12;

  const tx = x + o.xoffs + TILE_SIZE_X + TILE_UNIT * 5;
  const ty = y + o.yoffs + TILE_SIZE_Y + TILE_UNIT * 5;
  for (let j = 0; j < n; j++) {
    if (o.state === 0) drawTileNative(screen, b + 14 + j, tx, ty - (n - j) * TILE_SIZE_Y);
    else drawTileNative(screen, b + 14 - (n - j), tx, ty + j * TILE_SIZE_Y);
  }
}

/** One character's energy bar (with the maximum-energy marker) and experience bar. */
function drawCharacterBars(screen: Screen, c: number, x: number, colour: number): void {
  fillRect(screen, x + Math.min(G.maxEnergy[c], 96), 20, 2, 8, paletteColor(235));
  fillRect(screen, x, 20, Math.max(0, Math.min(G.shownEnergy[c], 96)), 8, paletteColor(colour));
  if (G.shownExperience[c] > 0) {
    fillRect(screen, x, 36, Math.min(G.shownExperience[c], 96), 8, paletteColor(colour));
  }
}

export function drawStats(screen: Screen): void {
  screen.fillSpan(SCREEN_X * TILE_SIZE_Y * 3, paletteColor(0), SCREEN_X * TILE_SIZE_Y);

  drawTile(screen, tileIds.stats, GAME_VIEW_X + TILE_SIZE_X * 2, 0, TILE_SIZE_X * 30, TILE_SIZE_Y * 3);

  // Arrows, coins and keys:
  tilePrint(pad3(G.arrows), GAME_VIEW_X + TILE_SIZE_X * 24, 0, screen);
  tilePrint(pad3(G.coins), GAME_VIEW_X + TILE_SIZE_X * 24, TILE_SIZE_Y, screen);
  tilePrint(pad3(G.keys), GAME_VIEW_X + TILE_SIZE_X * 24, TILE_SIZE_Y * 2, screen);

  // Current weapon (2 and 3 are one tile wide, centred):
  const weapon = G.currentWeapon;
  if (weapon === 2 || weapon === 3) {
    drawTile(
      screen,
      tileIds.weapons + weapon,
      GAME_VIEW_X + TILE_SIZE_X * 28 + TILE_UNIT * 4,
      TILE_SIZE_Y,
      TILE_SIZE_X,
      TILE_SIZE_Y,
    );
  } else if (weapon === 0 || weapon === 1 || weapon === 4 || weapon === 5) {
    drawTile(
      screen,
      tileIds.weapons + weapon,
      GAME_VIEW_X + TILE_SIZE_X * 28,
      TILE_SIZE_Y,
      TILE_SIZE_X * 2,
      TILE_SIZE_Y,
    );
  }

  // Map:
  tilePrint(G.world === 0 ? 'CASTLE' : `WORLD ${G.world}`, 3 * TILE_SIZE_X + GAME_VIEW_X, 3 * TILE_SIZE_Y, screen);

  // Energy and experience: the shown values follow the real ones every other frame.
  const tick = (G.frameCounter & 0x01) === 0;
  for (let i = 0; i < 2; i++) {
    if (tick) {
      if (G.shownEnergy[i] < G.energy[i]) G.shownEnergy[i]++;
      if (G.shownEnergy[i] > G.energy[i]) G.shownEnergy[i]--;
      if (G.shownExperience[i] < G.experience[i]) G.shownExperience[i]++;
      // NOTE (original): increments (not decrements) when above; wraps to 0 past MAX_EXPERIENCE below.
      if (G.shownExperience[i] > G.experience[i]) G.shownExperience[i]++;
    }
    if (G.shownExperience[i] > MAX_EXPERIENCE) G.shownExperience[i] = 0;
  }

  drawCharacterBars(screen, 0, 112, 47);
  drawCharacterBars(screen, 1, 288, 194);
}

/**
 * The remake's font: glyph position (column, row in tiles) in tiles.pcx per
 * character. Characters without a glyph (e.g. space) are left empty.
 */
const GLYPHS: Record<string, [number, number]> = {
  '[': [36, 12],
  ']': [37, 12],
  ':': [38, 12],
  '\\': [39, 12],
  '!': [0, 21],
  '?': [2, 21],
  ',': [3, 21],
  '.': [4, 21],
  "'": [0, 22],
  '-': [1, 22],
  a: [21, 22],
  b: [22, 22],
  c: [23, 22],
  d: [21, 23],
  e: [22, 23],
  f: [21, 24],
  g: [22, 24],
  h: [5, 21],
};
for (let i = 0; i < 26; i++) GLYPHS[String.fromCharCode(65 + i)] = [i, 12];
for (let i = 0; i < 10; i++) GLYPHS[String(i)] = [26 + i, 12];

function printText(str: string, x: number, y: number, screen: Screen, opaque: boolean): void {
  const font = gfx.tiles!;
  for (let i = 0; i < str.length; i++) {
    const cx = x + i * TILE_SIZE_X;
    if (opaque) fillRect(screen, cx, y, TILE_SIZE_X, TILE_SIZE_Y, paletteColor(0));
    const glyph = GLYPHS[str[i]];
    if (glyph) {
      font.drawSprite(
        glyph[0] * TILE_SIZE_X,
        glyph[1] * TILE_SIZE_Y,
        TILE_SIZE_X,
        TILE_SIZE_Y,
        cx,
        y,
        TILE_SIZE_X,
        TILE_SIZE_Y,
        screen,
        SCREEN_X,
        SCREEN_Y,
        SCREEN_X,
      );
    }
  }
}

/** Draw text with the tile font (transparent background). */
export function tilePrint(str: string, x: number, y: number, screen: Screen): void {
  printText(str, x, y, screen, false);
}

/** Draw text with the tile font on a black background. */
export function tilePrintOpaque(str: string, x: number, y: number, screen: Screen): void {
  printText(str, x, y, screen, true);
}

export function findLadder(x: number, y: number): number {
  const object = G.objects;

  for (let i = 0; i < G.objectCount; i++) {
    const o = object[i];
    if (o.type === T_LADDER && o.x === x && o.y <= y + 3 * TILE_SIZE_Y && o.y + (o.size - 2) * TILE_SIZE_Y >= y) {
      return i;
    }
  }

  return -1;
}

/** Add an object, reusing the first unused (T_NADA) slot if there is one. Returns its index. */
export function addObject(type: number, x: number, y: number, size: number, enemy: number, state: number): number {
  const object = G.objects;
  let i = 0;
  while (i < G.objectCount && object[i].type !== T_NADA) i++;

  // NOTE (original): no check against MAX_OBJECTS.
  const o = object[i];
  o.type = type;
  o.x = x;
  o.y = y;
  o.xoffs = 0;
  o.yoffs = 0;
  o.size = size;
  o.enemy = enemy;
  o.state = state;
  o.state2 = 0;
  o.state3 = 0;
  o.lastHit = HIT_PERIOD;
  o.tile = 0;
  o.unionX = -1;
  o.unionY = -1;
  o.experience = 0;
  o.drawX = x;
  o.drawY = y;

  if (i === G.objectCount) G.objectCount++;
  return i;
}

/** Writes the configuration (same text format as the C++ file) to localStorage. */
export function saveConfig(filename: string): void {
  void filename; // the browser port always uses the CFG_KEY localStorage entry
  let fp = '';
  // Keyboard configuration:
  fp += `${G.keyUp} ${G.keyDown} ${G.keyLeft} ${G.keyRight}\n`;
  fp += `${G.keySword} ${G.keyWeapon} ${G.keyItem} ${G.keyPause}\n`;

  // Graphics path:
  fp += `${G.graphicsPath}\n`;

  // Sound path:
  fp += `${G.soundPath}\n`;

  // Music and SFX volumes:
  fp += `${G.musicVolume} ${sfx.volume}\n`;

  try {
    localStorage.setItem(CFG_KEY, fp);
  } catch {
    // storage unavailable (private mode, blocked): the configuration is not saved
  }
}

/** Port of cargar_configuracion_old (the real loader; the Emscripten version forced naramura/jorito). */
export function loadConfig(filename: string): boolean {
  let i: number;
  const itmp = [0, 0, 0, 0];
  let tmp: string;
  let text: string | null = null;

  try {
    text = localStorage.getItem(CFG_KEY);
  } catch {
    text = null;
  }
  if (text === null) {
    console.log(`Could not open cfg: ${filename}`);
    return false;
  }
  const fp = new Scanner(text);

  /** fscanf(fp,"%i %i %i %i",...) === 4 */
  const scan4 = (): boolean => {
    for (let k = 0; k < 4; k++) {
      const v = fp.int();
      if (v === null) return false;
      itmp[k] = v;
    }
    return true;
  };

  // Keyboard configuration:
  if (!scan4()) return false;
  G.keyUp = itmp[0] as SDLKey;
  G.keyDown = itmp[1] as SDLKey;
  G.keyLeft = itmp[2] as SDLKey;
  G.keyRight = itmp[3] as SDLKey;

  if (!scan4()) return false;
  G.keySword = itmp[0] as SDLKey;
  G.keyWeapon = itmp[1] as SDLKey;
  G.keyItem = itmp[2] as SDLKey;
  G.keyPause = itmp[3] as SDLKey;

  // Graphics path:
  tmp = fp.str() ?? '';

  for (i = 0; i < G.graphicsPathCount; i++) {
    if (tmp === G.graphicsPaths[i]) {
      G.graphicsPathIndex = i;
      G.graphicsPath = G.graphicsPaths[i];
    }
  }

  if (G.graphicsPathIndex === -1) return false;

  // Sound path:
  tmp = fp.str() ?? '';

  for (i = 0; i < G.soundPathCount; i++) {
    if (tmp === G.soundPaths[i]) {
      G.soundPathIndex = i;
      G.soundPath = G.soundPaths[i];
    }
  }
  setSoundPath(G.soundPath);

  if (G.soundPathIndex === -1) return false;

  // Music and SFX volumes:
  const mv = fp.int();
  if (mv !== null) {
    G.musicVolume = mv;
    const sv = fp.int();
    if (sv !== null) sfx.volume = sv;
  }

  return true;
}

export function defaultConfig(): void {
  G.keyUp = SDLK_UP;
  G.keyDown = SDLK_DOWN;
  G.keyLeft = SDLK_LEFT;
  G.keyRight = SDLK_RIGHT;
  G.keySword = SDLK_SPACE;
  G.keyWeapon = SDLK_m;
  G.keyItem = SDLK_F1;
  G.keyPause = SDLK_F2;

  // Default graphics set: original
  // (the C++ used graphicsPaths[4] with graphicsPathIndex=0, i.e. "naramura" on its directory listing)
  G.graphicsPathIndex = 0;
  G.graphicsPath = G.graphicsPaths[0];

  // Default sound set: original
  G.soundPathIndex = 0;
  G.soundPath = G.soundPaths[0];
  setSoundPath(G.soundPath);
}

/*
 * Room memory: objects changed in recently visited rooms (opened stones, taken
 * items, killed enemies), so that a room looks the same when the player comes
 * back soon. Slot i remembers object memObject[i] of room (memRoomX, memRoomY).
 */

export function resetRoomMemory(): void {
  for (let i = 0; i < HP_OBJS_MAX; i++) G.memObject[i] = -1;
}

/** Forget rooms that are far away: ladders and stones more than 5 rooms, the rest more than 2. */
export function forgetDistantRooms(roomX: number, roomY: number): void {
  for (let i = 0; i < HP_OBJS_MAX; i++) {
    if (G.memObject[i] !== -1) {
      const dist = Math.abs(roomX - G.memRoomX[i]) + Math.abs(roomY - G.memRoomY[i]);
      const type = G.memObjectType[i];
      const maxDist = type === T_LADDER || type === T_STONE ? 5 : 2;
      if (dist > maxDist) G.memObject[i] = -1;
    }
  }
}

/**
 * A remembered stone was broken: show what was under it (state2), unless it
 * was taken already. `aux` is the remembered extra value (0: not taken; 40: pamperse).
 */
function restoreBrokenStone(o: GameObject, aux: number): void {
  if (o.state2 < 37 && o.state2 > 0) {
    // Weapon or item:
    if (!G.items[o.state2 - 1]) {
      o.type = T_ITEM;
      o.state = o.state2 - 1;
      if (o.state >= 32) {
        // Weapon objects are smaller:
        o.y += TILE_SIZE_Y;
      }
    } else {
      o.type = T_NADA;
    }
  } else if (o.state2 < 0) {
    // Coins, a key or arrows:
    o.type = T_NADA;
    if (aux === 0) {
      switch (o.state2) {
        case -1:
          o.type = T_ITEM;
          o.size = 10;
          o.state = -1;
          break;
        case -2:
          o.type = T_ITEM;
          o.size = 2;
          o.state = -2;
          break;
        case -3:
          o.type = T_ITEM;
          o.size = 50;
          o.state = -3;
          break;
      }
    }
  } else {
    // World item:
    o.type = T_NADA;
    if (o.state2 === 38 && G.nextWorld === 0 && !G.hasWorldKey) {
      // World key:
      o.type = T_ITEM;
      o.state = 37;
    }
    if (o.state2 === 37 && !G.hasCross) {
      // Cross:
      o.type = T_ITEM;
      o.state = 36;
    }

    if (o.state2 === 40 || aux === 40) {
      o.type = T_PAMPERSE;
    }
  }
}

/** Apply the room memory to the room just loaded: remembered stones are broken, everything else is gone. */
export function restoreRoomMemory(roomX: number, roomY: number): void {
  for (let i = 0; i < HP_OBJS_MAX; i++) {
    if (G.memObject[i] !== -1 && G.memRoomX[i] === roomX && G.memRoomY[i] === roomY) {
      const o = G.objects[G.memObject[i]];
      if (o.type === T_STONE) restoreBrokenStone(o, G.memObjectAux[i]);
      else o.type = T_NADA;
    }
  }
}

/** Remember object `obj` of room (roomX, roomY) in the first free slot (if any). */
export function rememberObject(roomX: number, roomY: number, obj: number, type: number): void {
  for (let i = 0; i < HP_OBJS_MAX; i++) {
    if (G.memObject[i] === -1) {
      G.memRoomX[i] = roomX;
      G.memRoomY[i] = roomY;
      G.memObject[i] = obj;
      G.memObjectType[i] = type;
      G.memObjectAux[i] = 0;
      if (type === T_STONE && G.objects[obj].state2 === 40) G.memObjectAux[i] = 40;
      return;
    }
  }
}

export function updateRememberedObject(roomX: number, roomY: number, obj: number, aux: number): void {
  for (let i = 0; i < HP_OBJS_MAX; i++) {
    if (G.memObject[i] === obj && G.memRoomX[i] === roomX && G.memRoomY[i] === roomY) {
      G.memObjectAux[i] = aux;
      return;
    }
  }
}

/* Typed words (cheat codes): the last 16 letter keys pressed, newest first. */

export function clearTypedWord(): void {
  for (let i = 0; i < 16; i++) G.typedKeys[i] = SDLK_UNKNOWN;
}

export function updateTypedWord(): void {
  const keyboard = getKeyboardState();

  for (let key: SDLKey = SDLK_a; key <= SDLK_z; key = key + 1) {
    if (keyboard[key] !== 0 && G.oldKeyboard[key] === 0) {
      for (let j = 15; j > 0; j--) G.typedKeys[j] = G.typedKeys[j - 1];
      G.typedKeys[0] = key;
      return;
    }
  }
}

/** Whether the last keys typed spell `word` (at most 16 letters). */
export function isWordTyped(word: string): boolean {
  const l = Math.min(word.length, 16);

  for (let i = 0; i < l; i++) {
    // (C narrows the SDLKey to char; only SDLK_a..z / 0 are stored)
    if (G.typedKeys[i] !== word.charCodeAt(l - 1 - i)) return false;
  }

  return true;
}

const drawItemsMapMaps: number[][] = [
  [
    0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],

  [
    0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,
    0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],

  [
    0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0,
    0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],

  [
    0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0,
    0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],

  [
    0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0,
    0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],

  [
    0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0,
    0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],

  [
    0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0,
    0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],

  [
    0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0,
    0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],

  [
    1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0,
    0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],

  [
    1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
];

/** Columns the world maps are shifted right by. */
const ITEMS_MAP_OFFSET = [3, 0, 2, 1, 0, 1, 1, 1, 2, 2];

/** The room the map item (13) marks in every world: the demon room. */
const ITEMS_MAP_MARKS: readonly (readonly [number, number])[] = [
  [1, 7],
  [8, 1],
  [3, 0],
  [4, 4],
  [7, 4],
  [3, 6],
  [3, 5],
  [6, 4],
  [0, 0],
  [4, 0],
];

/** Fill room (i, j) of the world `map` map. */
function fillMapRoom(screen: Screen, map: number, i: number, j: number, colour: number): void {
  fillRect(
    screen,
    GAME_VIEW_X + TILE_SIZE_X * 3 + (ITEMS_MAP_OFFSET[map - 1] + i) * TILE_SIZE_X,
    GAME_VIEW_Y + 15 * TILE_SIZE_Y + idiv(j * TILE_SIZE_Y, 2),
    TILE_SIZE_X - TILE_UNIT,
    idiv(TILE_SIZE_X, 2) - TILE_UNIT,
    paletteColor(colour),
  );
}

/** The world map on the items screen: the rooms, the marked room (with item 13) and the player's room. */
export function drawItemsMap(map: number, mapX: number, mapY: number, selfindicator: boolean, screen: Screen): void {
  if (map >= 1 && map <= 10) {
    const rooms = drawItemsMapMaps[map - 1];
    for (let j = 0; j < 9; j++) {
      for (let i = 0; i < 9; i++) {
        if (rooms[i + j * 10] === 1) fillMapRoom(screen, map, i, j, 255);
      }
    }
  }

  // Draw extras:
  if (map === 1) fillMapRoom(screen, map, 0, 6, 255);

  if (G.items[13]) {
    const [i, j] = ITEMS_MAP_MARKS[map - 1] ?? [0, 0];
    // NOTE (original): offs[map-1] is read out of bounds when map is 0 (castle).
    fillMapRoom(screen, map, i, j, 64);
  }

  if (selfindicator) fillMapRoom(screen, map, mapX, mapY, 180);
}

export function isWall(x: number, y: number): boolean {
  if (x < 0 || x >= G.roomWidth || y < 0 || y >= G.roomHeight) return true;
  const t = G.roomTiles![x + y * G.roomWidth];
  return t === 105 || t === 106 || t === 125 || t === 126 || t === 181;
}

/** A wall, a closed (key) door or a stone in room cell (x, y). */
export function isWallOrBlocker(x: number, y: number): boolean {
  const object = G.objects;
  if (isWall(x, y)) return true;

  for (let i = 0; i < G.objectCount; i++) {
    const o = object[i];
    const col = idiv(o.x, TILE_SIZE_X);
    const row = idiv(o.y, TILE_SIZE_Y);
    if (o.type === T_KEYDOOR || o.type === T_WKEYDOOR || o.type === T_WNOKEYDOOR) {
      if (col === x && row <= y && row + 2 >= y) return true;
    }
    if (o.type === T_STONE) {
      if ((col === x || col === x - 1) && (row === y || row === y - 1)) return true;
    }
  }

  return false;
}

/** Set the palette from konami.pcx (active set first, then the default set). */
export function loadPalette(): void {
  // loadBitmap copies the konami.pcx palette into G.colors (SDL_SetColors in the C++).
  loadBitmap('konami.pcx');
}

/** The opaque RGBA colour of index `i` of the game palette (G.palette, from konami.pcx). */
export function paletteColor(i: number): number {
  const p = G.palette;
  return rgba((p[i * 3] << 2) & 0xff, (p[i * 3 + 1] << 2) & 0xff, (p[i * 3 + 2] << 2) & 0xff);
}

/**
 * Load a PCX from the active graphics set, falling back to the default set.
 * Like the remake, every bitmap is shown in the palette of konami.pcx (loaded
 * first), so the indexed pixels are converted to RGBA with G.palette. An HD
 * version (`hd/<name>.png` next to the PCX) is attached when there is one.
 */
export function loadBitmap(name: string): Bitmap | null {
  for (const dir of [G.graphicsPath, G.defaultGraphicsPath]) {
    const data = readBinary(dir + name);
    const img = data === null ? null : decodePCX(data);
    if (img === null) continue;
    // (the C++ only copied the palette on the default-path branch; loadPalette()
    // set the screen palette from the active set via SDL)
    if (name === 'konami.pcx') G.palette.set(img.palette);
    const bmp = Bitmap.fromIndexed(img, paletteToRGBA(G.palette));
    const hd = readImage(`${dir}hd/${name.replace(/\.pcx$/, '.png')}`);
    // A copy: the game changes bitmaps in place (water, dissolving demons).
    if (hd !== null) bmp.hd = Bitmap.fromRGBA(hd.width, hd.height, hd.pixels.slice());
    return bmp;
  }
  console.error(`ERROR: file ${name} not found.`);
  return null;
}

export function reloadAll(): void {
  loadGraphics();
  loadSounds();
}

export function loadSounds(): void {
  // Sounds:
  sfx.gamestart = createSound('gamestart', 0);
  sfx.jump = createSound('jump', 0);
  sfx.sword = createSound('sword', 0);
  sfx.swordhit = createSound('stone_hit', 0);
  sfx.item = createSound('itemget', 0);
  sfx.ah = createSound('ah', 0);
  sfx.ah2 = createSound('ah2', 0);
  sfx.powerup = createSound('powerup', 0);
  sfx.enemyhit = createSound('enemy_hit', 0);
  sfx.skeletonhit = createSound('skeleton_hit', 0);
  sfx.door = createSound('doors', 0);
  sfx.enemykill = createSound('enemy_kill', 0);
  sfx.ladderdisapear = createSound('disappear', 0);
  sfx.armourhit = createSound('sword_armour', 0);
  sfx.pause = createSound('pause', 0);
  sfx.death = createSound('death', 0);
  sfx.gameover = createSound('game_over', 0);
  sfx.worldkey = createSound('worldkey', 0);
  sfx.entering = createSound('entering', 0);
  sfx.enterwater = createSound('enterwater', 0);
  sfx.select = createSound('select', 0);
  sfx.firearrow = createSound('firearrow', 0);
  sfx.firearrow2 = createSound('firearrow2', 0);
  sfx.fall = createSound('fall', 0);
  sfx.waterhit = createSound('waterhit', 0);
  sfx.lavahit = createSound('lavahit', 0);
  sfx.nocoins = createSound('nocoins', 0);
  sfx.stones = createSound('stones', 0);
  sfx.blob = createSound('blob', 0);
  sfx.shield = createSound('shield', 0);
  sfx.bell = createSound('bell', 0);
  sfx.flapwings = createSound('flapwings', 0);
  sfx.rotatedoor = createSound('rotatedoor', 0);
  sfx.demon2ball = createSound('demon2ball', 0);
  sfx.appearing = createSound('appearing', 0);
  sfx.firebreath = createSound('fbreath', 0);
  sfx.f1 = createSound('f1', 0);
  sfx.karrow = createSound('knightarrow', 0);
  sfx.jumptree = createSound('jumptree', 0);
  sfx.enemybullet = createSound('enemybullet', 0);
  sfx.headbullet = createSound('headbullet', 0);
  sfx.firefire = createSound('firefire', 0);
  sfx.dropmine = createSound('dropmine', 0);
  sfx.fireball = createSound('fireball', 0);
  sfx.fireball2 = createSound('fireball2', 0);
  sfx.wdoor = createSound('wdoor', 0);
  sfx.door2 = createSound('door2', 0);
  sfx.demonhit = createSound('demon_hit', 0);
  sfx.bearbullet = createSound('bearbullet', 0);
  sfx.chickenbomb = createSound('chickenbomb', 0);
  sfx.colormonster = createSound('colormonster', 0);
  sfx.waterstone = createSound('waterstone', 0);
  sfx.demon4jump = createSound('demon4jump', 0);
  sfx.rockman = createSound('rockman', 0);
  sfx.mine = createSound('mine', 0);
  sfx.bible = createSound('bible', 0);
  sfx.demon1bones = createSound('demon1bones', 0);
  sfx.demon1jump = createSound('demon1jump', 0);
  sfx.owl = createSound('owl', 0);
  sfx.demon7bullet = createSound('demon7bullet', 0);
  sfx.demon8bullet = createSound('demon8bullet', 0);
  sfx.flamebullet = createSound('flamebullet', 0);
  sfx.snakebullet = createSound('snakebullet', 0);
  sfx.gorilla = createSound('gorilla', 0);
  sfx.lizardtongue = createSound('lizardtongue', 0);
  sfx.bdemonbullet = createSound('bdemonbullet', 0);
  sfx.lightning = createSound('lightning', 0);
}

export function gameInit(): void {
  initPaths();
  reloadAll();

  // State machine:
  G.state = State.KonamiAppear;
  G.subState = 0;

  // Initialise the game:
  G.world = 0;
  G.roomX = 5;
  G.roomY = 12;
  G.roomTiles = null;
  newGame();
}

/**
 * Port of path.cpp: the C++ listed the graphics/ and sound/ directories; the
 * browser port uses the bundled sets from assets.ts.
 */
export function initPaths(): void {
  if (G.graphicsPaths.length === 0) {
    G.graphicsPaths = GRAPHIC_SETS.map((s) => `graphics/${s}/`);
    G.graphicsPathCount = G.graphicsPaths.length;
  }

  if (G.soundPaths.length === 0) {
    G.soundPaths = SOUND_SETS.map((s) => `sound/${s}/`);
    G.soundPathCount = G.soundPaths.length;
  }

  // Keep the current sets if they are valid, otherwise use the first one.
  let k = G.graphicsPaths.indexOf(G.graphicsPath);
  if (k === -1) k = 0;
  G.graphicsPathIndex = k;
  G.graphicsPath = G.graphicsPaths[k];

  k = G.soundPaths.indexOf(G.soundPath);
  if (k === -1) k = 0;
  G.soundPathIndex = k;
  G.soundPath = G.soundPaths[k];
  setSoundPath(G.soundPath);
}
