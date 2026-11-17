/**
 * Port of gameinteractions.cpp: collisions between the weapons/character and
 * the room objects, room events, firing secondary weapons and tile animations.
 * What weapons do to enemies is in weaponhits.ts, the room events in roomevents.ts.
 *
 * Collision detection reads G.collision, which is painted while drawing, so
 * the order of the statements matters.
 */
import type { Bitmap } from '../engine/bitmap';
import { playMusic, playSound, stopMusic } from '../platform/audio';
import { getKeyboardState } from '../platform/keyboard';
import {
  GAME_VIEW_X,
  GAME_VIEW_Y,
  HIT_PERIOD,
  MAX_LEVERS,
  MAX_OBJECTS,
  SCREEN_X,
  S_CONTROLED_FALL,
  S_DEATH,
  S_DOORPASS,
  S_ENTERING_PASSAGE,
  S_ENTERING_WORLD,
  S_HIT_RECOVERY,
  S_QUIET,
  S_QUIET_SWORD,
  S_SLOWDOORPASS,
  S_UNCONTROLED_FALL,
  S_WALKING_LEFT,
  S_WALKING_RIGHT,
  State,
  TILE_SIZE_X,
  TILE_SIZE_Y,
  TILE_UNIT,
  T_ARMOUR,
  T_BROKEN_STONE,
  T_DOOR,
  T_DOOR_WALL,
  T_ENEMY,
  T_FAIRY,
  T_HITWALL,
  T_ITEM,
  T_KEYDOOR,
  T_LADDER_WALL,
  T_MINE_EXP,
  T_NADA,
  T_PAMPERSE,
  T_PLAYER,
  T_STONE,
  T_TOMB,
  T_WALL,
  T_WDOOR,
  T_WEAPON,
  T_WEAPON_ARROW,
  T_WEAPON_ARROW2,
  T_WEAPON_FIRE,
  T_WEAPON_MINE,
  T_WEAPON_RFIRE,
  T_WKEYDOOR,
  T_WNOKEYDOOR,
  T_WNOKEYDOOR2,
  T_WNOKEYDOOR3,
} from './constants';
import { idiv } from './cutil';
import { addObject, clearTypedWord, isWall, isWordTyped, rememberObject, updateRememberedObject } from './gameaux';
import type { GameObject } from './object';
import { sfx, tileIds } from './resources';
import { G } from './state';
import { tileHits, tileHitsNative } from './tiledraw';
import { SWORD, beginWeaponHits, blockHit, detonateMine, hitEnemy, toDelete, weaponCollision } from './weaponhits';

export { roomEvents } from './roomevents';
export { weaponCollision } from './weaponhits';

/** Moves the levers (moving platforms of the castle) and whoever stands on them. */
export function updateLevers(): void {
  const oldX = G.playerX;
  const oldY = G.playerY;

  G.characterOverVerticalLever = false;

  for (let i = 0; i < MAX_LEVERS; i++) {
    const to = G.leverGoingTo[i];
    const destX = G.leverDx[i][to];
    const destY = G.leverDy[i][to];
    const destRoomX = G.leverDrx[i][to];
    const destRoomY = G.leverDry[i][to];
    let characterOver = false;

    if (
      G.world === 0 &&
      G.roomX === G.leverRoomX[i] &&
      G.roomY === G.leverRoomY[i] &&
      G.playerY >= G.leverY[i] - TILE_SIZE_Y * 2 &&
      G.playerY < G.leverY[i] + TILE_SIZE_Y * 2
    ) {
      if (
        G.playerX > G.leverX[i] - TILE_SIZE_Y * 2 &&
        G.playerX < G.leverX[i] + 4 * TILE_SIZE_X &&
        (G.playerState === S_QUIET ||
          G.playerState === S_WALKING_RIGHT ||
          G.playerState === S_WALKING_LEFT ||
          G.playerState === S_QUIET_SWORD ||
          G.playerState === S_HIT_RECOVERY ||
          G.playerState === S_CONTROLED_FALL ||
          G.playerState === S_UNCONTROLED_FALL)
      ) {
        characterOver = true;
      }
      if (
        G.playerX > G.leverX[i] - (TILE_SIZE_Y * 2 - 5 * TILE_UNIT) &&
        G.playerX < G.leverX[i] + 4 * TILE_SIZE_X - 4 * TILE_UNIT
      ) {
        characterOver = true;
      }
    }

    if (G.leverX[i] < destX) {
      G.leverX[i] += TILE_UNIT * 2;
      if (characterOver) G.playerX += TILE_UNIT * 2;
    }
    if (G.leverX[i] > destX) {
      G.leverX[i] -= TILE_UNIT * 2;
      if (characterOver) G.playerX -= TILE_UNIT * 2;
    }
    // Vertical levers move on into the next room:
    if ((G.leverY[i] < destY && G.leverRoomY[i] === destRoomY) || G.leverRoomY[i] < destRoomY) {
      if (characterOver && G.playerY === G.leverY[i] - TILE_SIZE_Y * 2) G.playerY += TILE_UNIT * 2;
      G.leverY[i] += TILE_UNIT * 2;
      if (G.leverY[i] > G.roomHeight * TILE_SIZE_Y) {
        G.leverY[i] = TILE_SIZE_Y;
        G.leverRoomY[i]++;
      }
      if (characterOver) G.characterOverVerticalLever = true;
    }
    if ((G.leverY[i] > destY && G.leverRoomY[i] === destRoomY) || G.leverRoomY[i] > destRoomY) {
      if (characterOver && G.playerY === G.leverY[i] - TILE_SIZE_Y * 2) G.playerY -= TILE_UNIT * 2;
      G.leverY[i] -= TILE_UNIT * 2;
      if (G.leverY[i] < TILE_SIZE_Y) {
        G.leverY[i] = (G.roomHeight - 1) * TILE_SIZE_Y;
        G.leverRoomY[i]--;
      }
      if (characterOver) G.characterOverVerticalLever = true;
    }
    // Arrived: head back.
    if (
      G.leverX[i] === destX &&
      G.leverY[i] === destY &&
      G.leverRoomX[i] === destRoomX &&
      G.leverRoomY[i] === destRoomY
    ) {
      G.leverGoingTo[i] = to === 0 ? 1 : 0;
    }
  }

  // Correct the sword position:
  if (G.sword) {
    G.swordX += G.playerX - oldX;
    G.swordY += G.playerY - oldY;
  }
}

/** Whether tile `t` (scaled to w×h, default 32×32) at the object's room position touches the character. */
function playerOn(t: number, o: GameObject, w?: number, h?: number): boolean {
  return (tileHits(t, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y, w, h) & T_PLAYER) !== 0;
}

/** Like playerOn, with tile `t` at its own size. */
function playerOnNative(t: number, o: GameObject): boolean {
  return (tileHitsNative(t, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y) & T_PLAYER) !== 0;
}

/**
 * Collisions of the frame: the sword and weapons against stones, enemies and
 * walls, weapons against the room, and the character against doors and items.
 */
export function testInteractions(): void {
  beginWeaponHits();
  const keyboard = getKeyboardState();

  G.oldSword = G.sword;

  if (G.stoneHitCounter > 0) G.stoneHitCounter--;

  // The checks run in sequence: an object that changes type in one check can
  // meet the next one in the same frame (a mine that goes off, for example).
  for (let i = 0; i < G.objectCount; i++) {
    const o = G.objects[i];

    if (o.type === T_PAMPERSE && playerOn(182, o)) {
      // END OF THE GAME!!!! THEY HAVE PAMPERSE!!!!:
      G.state = State.Ending;
      G.subState = 0;
    }
    if (o.type === T_STONE && o.lastHit === 0) hitStone(i, o, keyboard);
    if (o.type === T_FAIRY) touchFairy(o);
    if (o.type === T_ARMOUR) hitArmour(o);
    if (o.type === T_ENEMY && o.lastHit === 0) hitEnemy(i, o);
    if (o.type === T_HITWALL && o.lastHit === 0) hitWall(i, o);
    if (o.type === T_WEAPON_ARROW || o.type === T_WEAPON_ARROW2) checkArrow(i, o);
    if (o.type === T_WEAPON_FIRE) moveFire(i, o);
    if (o.type === T_WEAPON_RFIRE) steerRollingFire(i, o);
    if (o.type === T_WEAPON_MINE) checkMine(o);
    if (o.type === T_MINE_EXP) checkMineExplosion(o);
  }

  for (let i = 0; i < G.objectCount; i++) {
    const o = G.objects[i];
    switch (o.type) {
      case T_KEYDOOR:
        if (pushDoor(o, tileIds.keydoor, TILE_UNIT, G.keys > 0) && o.state >= 24) {
          playSound(sfx.door2);
          o.state = -28;
          G.keys--;
          G.playerState = S_DOORPASS;
          G.playerSubState = 0;
        }
        break;

      case T_WKEYDOOR:
        if (pushDoor(o, tileIds.wkeydoor, TILE_UNIT * 2, G.keys > 0) && o.state >= 24) {
          playSound(sfx.door);
          o.state = -28;
          o.state2 = G.playerX > o.x ? 1 : 0;
          G.keys--;
          G.playerState = S_DOORPASS;
          G.playerSubState = 0;
        }
        break;

      case T_WNOKEYDOOR:
      case T_WNOKEYDOOR2:
      case T_WNOKEYDOOR3:
        // Revolving doors: only Popolon or a character with item 28 can turn them.
        if (pushDoor(o, tileIds.wnokeydoor, TILE_UNIT * 2, G.character === 0 || G.items[28])) {
          if (o.state >= 24) {
            o.state = -24;
            o.state2 = G.playerX > o.x ? 1 : 0;
            G.playerState = S_SLOWDOORPASS;
            G.playerSubState = 0;
            playSound(sfx.rotatedoor);
          }
          // One-way doors:
          if (o.type === T_WNOKEYDOOR2 && G.playerState === S_WALKING_RIGHT) o.state = 0;
          if (o.type === T_WNOKEYDOOR3 && G.playerState === S_WALKING_LEFT) o.state = 0;
        }
        break;

      case T_WDOOR:
        worldDoor(i, o, keyboard);
        break;

      case T_DOOR:
        // Entering a shrine or shop (one in the castle needs item 29, the salt):
        if (
          G.playerX >= o.x - 4 * TILE_UNIT &&
          G.playerX <= o.x + 4 * TILE_UNIT &&
          G.playerY === o.y &&
          keyboard[G.keyDown] !== 0 &&
          G.oldKeyboard[G.keyDown] === 0 &&
          G.enterCut === 0 &&
          G.playerState !== S_DEATH
        ) {
          const needSalt = G.roomX === 11 && G.roomY === 10 && G.world === 0;
          if (!needSalt || G.items[29]) {
            G.playerSubState = 0;
            G.playerState = S_ENTERING_PASSAGE;
            G.inDoor = i;
          }
        }
        break;

      case T_ITEM:
        pickUp(i, o);
        break;
    }
  }

  // Reset the typed word:
  if (G.items[25] && isWordTyped('umbrella')) {
    clearTypedWord();
  }

  for (let i = 0; i < MAX_OBJECTS; i++) {
    if (!toDelete[i]) continue;
    const o = G.objects[i];
    if (
      o.type === T_WEAPON_ARROW ||
      o.type === T_WEAPON_ARROW2 ||
      o.type === T_WEAPON_FIRE ||
      o.type === T_WEAPON_RFIRE
    )
      G.firedArrows--;
    o.type = T_NADA;
  }

  if (G.coins > 999) G.coins = 999;
  if (G.arrows > 999) G.arrows = 999;
  if (G.keys > 999) G.keys = 999;
}

/** Stones break after some hits (at once with item 20 and the sword key, outside world 10). */
function hitStone(i: number, o: GameObject, keyboard: Uint8Array): void {
  const smash = G.items[20] && keyboard[G.keySword] !== 0 && G.world !== 10;
  if ((tileHits(tileIds.stone + 2, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y) & T_WEAPON) === 0 && !smash) return;

  // Stone hit!!
  G.stoneHitCounter += 8;
  const weapon = weaponCollision(tileIds.stone, o.drawX, o.drawY);
  if (weapon === SWORD || G.objects[weapon].type === T_MINE_EXP) o.lastHit = HIT_PERIOD;
  if (!smash) playSound(sfx.swordhit);
  if (G.character === 0 || G.items[18]) o.size -= 5;
  else o.size--;
  if (o.size <= 0) playSound(sfx.enemykill);
  if (o.size <= 0 || smash) {
    // Stone destroyed
    rememberObject(G.roomX, G.roomY, i, T_STONE);
    o.type = T_BROKEN_STONE;
    o.size = 8;
  }
}

/** The fairy, once landed, refills the energy. */
function touchFairy(o: GameObject): void {
  if (o.state3 >= 80 && playerOn(tileIds.fairy + ((o.state3 >> 2) & 0x01), o)) {
    o.type = T_NADA;
    playSound(sfx.powerup);
    G.energy[G.character] = G.maxEnergy[G.character];
  }
}

function hitArmour(o: GameObject): void {
  if (
    o.tile >= 0 &&
    (tileHitsNative(o.baseTile + o.tile, GAME_VIEW_X + o.x + o.xoffs, GAME_VIEW_Y + o.y + o.yoffs) & T_WEAPON) !== 0
  ) {
    blockHit(o, weaponCollision(o.baseTile + o.tile, o.drawX, o.drawY));
  }
}

/** Walls (4×3 tiles) that break under sword hits: Popolon's, or anybody's with item 15. */
function hitWall(i: number, o: GameObject): void {
  // NOTE (original): the C++ also chose tile 105 or 125 by world, but always tests tile 105.
  if (
    !G.sword ||
    !(G.character === 0 || G.items[15]) ||
    (tileHits(105, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y, TILE_SIZE_X * 4, TILE_SIZE_Y * 3) & T_WEAPON) === 0
  ) {
    return;
  }

  const sword = G.tiles[tileIds.sword[G.character] + (G.facingRight ? 0 : 1)];
  let hit = false;
  for (let tx = 0; tx < 4; tx++) {
    for (let ty = 0; ty < 3; ty++) {
      const x = GAME_VIEW_X + tx * TILE_SIZE_X + o.x;
      const y = GAME_VIEW_Y + ty * TILE_SIZE_Y + o.y;
      if (G.tiles[105].overlaps(sword, x, y, GAME_VIEW_X + G.swordX, GAME_VIEW_Y + G.swordY)) hit = true;
    }
  }
  if (!hit) return;

  // Wall hit!!
  o.lastHit = HIT_PERIOD;
  o.size--;
  if (o.size === 0) {
    playSound(sfx.ladderdisapear);
    rememberObject(G.roomX, G.roomY, i, T_HITWALL);
    o.type = T_NADA;
    if (G.world === 0 && G.roomX === 9 && G.roomY === 11) {
      // This one hides coins:
      o.type = T_ITEM;
      o.state = -1;
      o.size = 10;
      o.x += TILE_SIZE_X;
      o.y += TILE_SIZE_Y;
    }
  } else {
    playSound(sfx.swordhit);
  }
}

const WALLS = T_WALL | T_LADDER_WALL | T_DOOR_WALL;

/** Arrows stop at walls and doors (but not at walls that are only ladder walls). */
function checkArrow(i: number, o: GameObject): void {
  const t = tileIds.weapons + (o.type === T_WEAPON_ARROW2 ? 1 : 0) + (o.state !== 0 ? 6 : 0);
  const res = tileHits(t, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y, TILE_SIZE_X * 2, TILE_SIZE_Y) & WALLS;
  if (res !== 0 && res !== (T_WALL | T_LADDER_WALL)) toDelete[i] = true;
}

/** Fire stops at walls, and drops down where there is no floor. */
function moveFire(i: number, o: GameObject): void {
  const t = o.state !== 0 ? 8 : 3;
  if ((tileHits(tileIds.weapons + t, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y, TILE_SIZE_X, TILE_SIZE_Y) & WALLS) !== 0) {
    toDelete[i] = true;
  }
  const below = GAME_VIEW_Y + o.y + idiv(TILE_SIZE_Y, 2);
  if ((tileHits(tileIds.weapons, GAME_VIEW_X + o.x, below, TILE_SIZE_X, TILE_SIZE_Y) & WALLS) === 0) {
    o.y += idiv(TILE_SIZE_Y, 2);
    if (o.state === 0) o.x -= idiv(TILE_SIZE_X, 2);
    else o.x += idiv(TILE_SIZE_X, 2);
  }
}

/**
 * Rolling fire follows the walls around corners. It moves right/left/up/down
 * in states 0/1/2/3 and is steered whenever it is exactly on a tile.
 */
function steerRollingFire(i: number, o: GameObject): void {
  const tx = idiv(o.x, TILE_SIZE_X);
  const ty = idiv(o.y, TILE_SIZE_Y);
  if (o.x !== tx * TILE_SIZE_X || o.y !== ty * TILE_SIZE_Y) return;

  let nTx = tx;
  let nTy = ty;
  if (o.state === 0) nTx++;
  else if (o.state === 1) nTx--;
  else if (o.state === 2) nTy--;
  else if (o.state === 3) nTy++;

  if (isWall(nTx, nTy) && nTx >= 0 && nTx < 32 && nTy >= 0 && nTy < 20) {
    // A wall ahead: it dies, unless it was falling.
    if (o.state === 0 || o.state === 1 || o.state === 2) toDelete[i] = true;
    else if (o.state === 3) o.state = isWall(tx + 1, nTy) ? 0 : 1;
    return;
  }

  switch (o.state) {
    case 0:
      if (isWall(tx - 1, ty + 1) && !isWall(tx, ty + 1)) o.state = 3;
      else if (isWall(tx - 1, ty - 1) && !isWall(tx, ty - 1)) o.state = 2;
      break;
    case 1:
      if (isWall(tx + 1, ty + 1) && !isWall(tx, ty + 1)) o.state = 3;
      else if (isWall(tx + 1, ty - 1) && !isWall(tx, ty - 1)) o.state = 2;
      break;
    case 2:
      if (isWall(tx - 1, ty + 1) && !isWall(tx - 1, ty)) o.state = 1;
      else if (isWall(tx + 1, ty + 1) && !isWall(tx + 1, ty)) o.state = 0;
      break;
    case 3:
      if (isWall(tx - 1, ty - 1) && !isWall(tx - 1, ty)) o.state = 1;
      else if (isWall(tx + 1, ty - 1) && !isWall(tx + 1, ty)) o.state = 0;
      break;
  }
  // No wall around at all: fall.
  if (
    !isWall(tx + 1, ty) &&
    !isWall(tx - 1, ty) &&
    !isWall(tx, ty + 1) &&
    !isWall(tx, ty - 1) &&
    !isWall(tx + 1, ty + 1) &&
    !isWall(tx + 1, ty - 1) &&
    !isWall(tx - 1, ty + 1) &&
    !isWall(tx - 1, ty - 1)
  ) {
    o.state = 3;
  }
}

/** A mine is armed (state2 1) once the character has left it, and goes off when stepped on. */
function checkMine(o: GameObject): void {
  if (playerOnNative(tileIds.weapons + 9, o)) {
    if (o.state2 === 1) {
      // Character stepped on a mine:
      G.mineStepped = true;
      detonateMine(o);
    }
  } else {
    o.state2 = 1;
  }
}

function checkMineExplosion(o: GameObject): void {
  if (playerOnNative(tileIds.weapons + 12, o)) {
    if (o.state % 8 === 0) G.energy[G.character] -= 2;
  } else {
    o.state2 = 1;
  }
}

/** Whether the character walks into door tile `tile` from either side, `reach` pixels away. */
function playerPushes(o: GameObject, tile: number, reach: number): boolean {
  const x = GAME_VIEW_X + o.x;
  const y = GAME_VIEW_Y + o.y;
  // NOTE (original): the second and third coltest of each side test the same position
  // (y + TILE_SIZE_Y), so only two positions are tested here.
  const touches = (dx: number): boolean =>
    (tileHits(tile, x + dx, y, TILE_SIZE_X, TILE_SIZE_Y) & T_PLAYER) !== 0 ||
    (tileHits(tile, x + dx, y + TILE_SIZE_Y, TILE_SIZE_X, TILE_SIZE_Y) & T_PLAYER) !== 0;
  return (touches(reach) && G.playerState === S_WALKING_LEFT) || (touches(-reach) && G.playerState === S_WALKING_RIGHT);
}

/**
 * Doors open after the character has pushed them for 24 frames (`state` counts
 * up); a negative `state` is the opening animation. Returns whether the door
 * is being pushed (and may be opened) this frame.
 */
function pushDoor(o: GameObject, tile: number, reach: number, canOpen: boolean): boolean {
  if (o.state < 0 || o.state > 24) {
    o.state++;
    return false;
  }
  if (playerPushes(o, tile, reach) && canOpen) {
    o.state++;
    return true;
  }
  o.state = 0;
  return false;
}

/** The castle rooms with the doors to worlds 1–9. */
const WORLD_DOOR_ROOMS = [
  [3, 12],
  [10, 11],
  [10, 8],
  [0, 8],
  [8, 8],
  [14, 12],
  [5, 2],
  [4, 4],
  [7, 0],
];

/** The world behind the door in this castle room. */
function worldBehindDoor(): number {
  if (G.roomX === G.world10DoorX && G.roomY === G.world10DoorY) return 10;
  const k = WORLD_DOOR_ROOMS.findIndex(([x, y]) => G.roomX === x && G.roomY === y);
  return k === -1 ? 10 : k + 1;
}

/** World doors open with the world key; then the character enters with "down". */
function worldDoor(i: number, o: GameObject, keyboard: Uint8Array): void {
  const world = worldBehindDoor();

  if (
    G.hasWorldKey &&
    world === G.nextWorld &&
    G.playerX >= o.x &&
    G.playerX <= o.x + 2 * TILE_SIZE_X &&
    G.playerY === o.y + TILE_SIZE_Y
  ) {
    playSound(sfx.wdoor);
    G.worldDoorsOpen[G.nextWorld - 1] = true;
    o.state = 1;
    G.hasWorldKey = false;
  }

  if (
    o.state === 1 &&
    G.playerX >= o.x + TILE_SIZE_X - 4 * TILE_UNIT &&
    G.playerX <= o.x + TILE_SIZE_X + 4 * TILE_UNIT &&
    G.playerY === o.y + TILE_SIZE_Y &&
    keyboard[G.keyDown] !== 0
  ) {
    // World 5 is closed to Aphrodite without item 22, world 7 to Popolon without item 0:
    const forbidden =
      (world === 5 && !G.items[22] && G.character === 1) || (world === 7 && !G.items[0] && G.character === 0);
    if (!forbidden && G.playerState !== S_ENTERING_WORLD) {
      G.playerSubState = 0;
      G.playerState = S_ENTERING_WORLD;
      G.inDoor = i;
    }
  }
}

/**
 * Picks up a stack of coins, keys or arrows and returns its size. A stack of
 * size `placed` is one placed in the room: it is remembered as taken.
 */
function takeStack(i: number, o: GameObject, placed: number): number {
  playSound(sfx.item);
  o.type = T_NADA;
  if (o.size === placed) updateRememberedObject(G.roomX, G.roomY, i, 1);
  return o.size;
}

/** Items (`state`): -1/-2/-3 coins/keys/arrows, 0–31 items, 32–35 weapons, 36 cross, 37 world key, 38+ world items. */
function pickUp(i: number, o: GameObject): void {
  const s = o.state;
  if (s === -1) {
    if (playerOn(tileIds.coin, o)) G.coins += takeStack(i, o, 10);
  } else if (s === -2) {
    if (playerOn(tileIds.key, o)) G.keys += takeStack(i, o, 2);
  } else if (s === -3) {
    if (playerOn(tileIds.arrow, o)) G.arrows += takeStack(i, o, 50);
  } else if (s >= 0 && s < 32) {
    if (playerOn(tileIds.items + s, o)) {
      playSound(sfx.item);
      o.type = T_NADA;
      G.items[s] = true;
    }
  } else if (s === 36) {
    if (playerOn(tileIds.items + s, o)) {
      playSound(sfx.item);
      o.type = T_NADA;
      G.hasCross = true;
    }
  } else if (s >= 32 && s < 36) {
    if (playerOn(tileIds.weapons + s - 32, o, TILE_SIZE_X * 2, TILE_SIZE_Y)) {
      playSound(sfx.item);
      o.type = T_NADA;
      G.items[s] = true;
    }
  } else if (s === 37) {
    if (playerOn(tileIds.items + 37, o) && G.fightingDemon < 196) {
      G.hasWorldKey = true;
      G.maxEnergy[G.character] += 16;
      G.energy[G.character] = G.maxEnergy[G.character];

      stopMusic();
      if (G.world === 0) {
        playMusic('worldkey', 'castle', null);
        G.nextWorld = 1;
        o.type = T_NADA;
      } else {
        // In a world the key appears when its demon is beaten.
        playMusic('worldkey', 'worldkey2', 'world');
        G.fightingDemon++;
        G.nextWorld = G.world + 1;
      }
    }
  } else if (s >= 38) {
    if (playerOn(tileIds.items + s - 6, o)) {
      G.worldItems[G.world - 1][s - 38] = true;
      playSound(sfx.item);
      o.type = T_NADA;
    }
  }
}

/** Uses up one arrow; with world item 2 (the rod) arrows are free during a demon fight. */
function useArrow(): void {
  // NOTE (original): worldItems[map-1] is read with map===0 if fightingDemon!==0 in the castle
  // (out of bounds in C; would throw here).
  if (G.fightingDemon !== 0 && G.worldItems[G.world - 1][2]) G.arrows++;
  G.arrows--;
}

/** Fire and mines can only be put down standing or walking on solid ground. */
function onGround(): boolean {
  if (G.playerState !== S_QUIET && G.playerState !== S_WALKING_LEFT && G.playerState !== S_WALKING_RIGHT) return false;
  const tx = idiv(G.playerX, TILE_SIZE_X);
  const ty = idiv(G.playerY, TILE_SIZE_Y) + 2;
  return isWall(tx, ty) || isWall(tx + 1, ty);
}

/** Uses the selected secondary weapon (they all need arrows). */
export function fireWeapon(): void {
  // How many arrows (or mines) each character can have in flight:
  const maxFired = [2, 3];
  if (G.items[16]) maxFired[0] = 3;
  if (G.currentWeapon === 5) maxFired[0] = G.items[17] ? 3 : 2;
  if (G.currentWeapon === 2 || G.currentWeapon === 3) maxFired[0] = maxFired[1] = 2;

  const fired = G.currentWeapon === 5 ? G.firedMines : G.firedArrows;
  if (!(G.arrows > 0 && fired < maxFired[G.character])) return;

  // The character's y, rounded to a tile row:
  let y = idiv(G.playerY, TILE_SIZE_Y);
  if (G.playerY % TILE_SIZE_Y > idiv(TILE_SIZE_Y, 2)) y++;
  y *= TILE_SIZE_Y;

  /** Shoots weapon object `type` from the character's front. */
  const shoot = (type: number): void => {
    if (G.facingRight) addObject(type, G.playerX + TILE_SIZE_X, y + TILE_SIZE_Y, 0, 0, 0);
    else addObject(type, G.playerX - TILE_SIZE_X, y + TILE_SIZE_Y, 0, 0, 1);
  };

  switch (G.currentWeapon) {
    case 0: // NORMAL ARROWS:
      useArrow();
      G.firedArrows++;
      shoot(T_WEAPON_ARROW);
      playSound(sfx.firearrow);
      break;
    case 1: // CERAMIC ARROWS:
      useArrow();
      G.firedArrows++;
      shoot(T_WEAPON_ARROW2);
      playSound(sfx.firearrow2);
      break;
    case 2: // ROLLING FIRE:
      if (onGround()) {
        const tx = idiv(G.playerX, TILE_SIZE_X);
        const ty = idiv(y, TILE_SIZE_Y);
        useArrow();
        G.firedArrows++;
        const k = addObject(
          T_WEAPON_RFIRE,
          (tx + 1) * TILE_SIZE_X,
          (ty + 1) * TILE_SIZE_Y,
          0,
          0,
          G.facingRight ? 0 : 1,
        );
        G.objects[k].tile = 2;
        playSound(sfx.firefire);
      }
      break;
    case 3: // FIRE:
      if (onGround()) {
        useArrow();
        G.firedArrows++;
        shoot(T_WEAPON_FIRE);
        playSound(sfx.firefire);
      }
      break;
    case 4: // MAGNIFYING GLASS
      for (let i = 0; i < G.objectCount; i++) {
        const o = G.objects[i];
        if (
          o.type === T_TOMB &&
          o.x >= G.playerX - TILE_SIZE_X &&
          o.x <= G.playerX + TILE_SIZE_X &&
          o.y >= G.playerY - TILE_UNIT &&
          o.y <= G.playerY + TILE_UNIT
        ) {
          // Look at a tomb:
          G.state = State.Tomb;
          G.subState = 0;
        }
      }
      break;
    case 5: // MINES
      if (onGround()) {
        useArrow();
        G.firedMines++;
        const k = addObject(T_WEAPON_MINE, G.playerX, y + TILE_SIZE_Y + TILE_UNIT, 0, 0, 0);
        G.objects[k].tile = 9;
        playSound(sfx.dropmine);
      }
      break;
  }
}

/** Pixels each row of the water tile scrolls per frame (the lower rows faster). */
const WATER_SPEED = [1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4];

/** The lava tiles cycle 163→173→…→176→168→…→172→163. */
const LAVA_NEXT = new Map([
  [163, 173],
  [168, 169],
  [169, 170],
  [170, 171],
  [171, 172],
  [172, 163],
  [173, 174],
  [174, 175],
  [175, 176],
  [176, 168],
]);

export function animateTiles(tiles: Bitmap): void {
  // Water animation (water tile: 19,3), scrolling each row to the left in the tile sheet:
  for (let j = 0; j < TILE_SIZE_Y; j++)
    tiles.rotateRowLeft(19 * TILE_SIZE_X, 3 * TILE_SIZE_Y + j, TILE_SIZE_X, WATER_SPEED[j]);

  // Lava, every other frame, in the room itself:
  G.lavaState++;
  if ((G.lavaState & 0x01) === 0) {
    const room = G.roomTiles!;
    for (let offs = 0; offs < G.roomHeight * G.roomWidth; offs++) {
      const next = LAVA_NEXT.get(room[offs]);
      if (next !== undefined) room[offs] = next;
    }
  }
}
