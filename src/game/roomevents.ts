/**
 * Room events (part of gameinteractions.cpp): enemies that keep coming in
 * some rooms, the wall that appears behind the character, the fairy, and the
 * special events of single rooms (secrets, walls and ladders that appear when
 * the enemies are beaten, …), run once per frame.
 *
 * Random numbers are drawn in a fixed order; keep it.
 */
import { playMusic, playSound, stopMusic } from '../platform/audio';
import { getKeyboardState } from '../platform/keyboard';
import {
  HP_OBJS_MAX,
  MAX_AW_RECORD,
  S_CONTROLED_FALL,
  S_JUMPING,
  S_QUIET,
  S_QUIET_SWORD,
  S_STOPPED_JUMPING,
  TILE_SIZE_X,
  TILE_SIZE_Y,
  TILE_UNIT,
  T_BAT,
  T_BFLY_SMALL,
  T_BIRD,
  T_BLOB,
  T_BLUESPIDER,
  T_BROKEN_STONE,
  T_CYCLOPS,
  T_ENEMY,
  T_FAIRY,
  T_FAIRY_BUBBLE,
  T_FSTONE,
  T_HAIRY,
  T_ITEM,
  T_LADDER,
  T_LAVA1,
  T_LAVA2,
  T_NADA,
  T_PIRANHA,
  T_PIRANHA2,
  T_REDDRAGON,
  T_RSTONE,
  T_SLIME,
  T_STONE,
  T_TRANSFORMER,
  T_WATERDRAGON,
  T_WATERMONSTER,
  T_WDOOR,
  T_WITCH,
} from './constants';
import { idiv, rand } from './cutil';
import { addObject } from './gameaux';
import type { GameObject } from './object';
import { sfx, tileIds } from './resources';
import { G } from './state';

/** Adds an enemy with its graphics; returns it. */
export function spawnEnemy(
  x: number,
  y: number,
  size: number,
  enemy: number,
  state: number,
  baseTile: number,
): GameObject {
  const o = G.objects[addObject(T_ENEMY, x, y, size, enemy, state)];
  o.baseTile = baseTile;
  return o;
}

export function roomEvents(): void {
  dropEnemies();
  if (G.roomAppearwall !== -1) appearingWall();
  if (G.roomFairy !== -1) fairy();
  waterAndLavaEnemies();
  spawnRoomEnemies();

  switch (G.world) {
    case 0:
      castleEvents();
      break;
    case 1:
      world1Events();
      break;
    case 2:
      world2Events();
      break;
    case 3:
      world3Events();
      break;
    case 4:
      world4Events();
      break;
    case 5:
      world5Events();
      break;
    case 6:
      world6Events();
      break;
    case 7:
      world7Events();
      break;
    case 8:
      world8Events();
      break;
    case 9:
      world9Events();
      break;
  }
}

// --- Enemies that keep coming ------------------------------------------------

/** A random x in the left (direction 1) or right (direction 0) part of the room, on the TILE_UNIT grid. */
function randomX(direction: number): number {
  const pos = direction === 1 ? rand() % (14 * TILE_SIZE_X) : 16 * TILE_SIZE_X + (rand() % (14 * TILE_SIZE_X));
  return idiv(pos, TILE_UNIT) * TILE_UNIT;
}

/** Stones falling (or rolling) in from above; `pause` frames before the next one. */
function dropStone(enemy: number, pause: number): void {
  if (rand() % 150 === 0 && G.stonesCounter === 0) {
    const direction = rand() % 2;
    spawnEnemy(randomX(direction), -2 * TILE_SIZE_Y, 0, enemy, direction, tileIds.fstone);
    G.stonesCounter = pause;
  } else {
    G.stonesCounter = G.stonesCounter > 0 ? G.stonesCounter - 1 : 0;
  }
}

function dropEnemies(): void {
  if (G.roomSlimes) {
    // SLIMES:
    if (rand() % 200 === 0 && G.slimeCounter === 0) {
      const direction = rand() % 2;
      spawnEnemy(randomX(direction), -2 * TILE_SIZE_Y, 2, T_SLIME, direction, tileIds.slime);
      G.slimeCounter = 128;
    } else {
      G.slimeCounter = G.slimeCounter > 0 ? G.slimeCounter - 1 : 0;
    }
  }

  if (G.roomWatermonster) {
    if (G.watermonsterState === 0 && !G.inWater) {
      playSound(sfx.appearing);
      G.watermonsterState = 1;
      spawnEnemy(
        4 * TILE_SIZE_X + (rand() % 21) * TILE_SIZE_X,
        15 * TILE_SIZE_Y,
        4,
        T_WATERMONSTER,
        0,
        tileIds.watermonster,
      );
    }
    if (G.watermonsterState < 0 && !G.inWater) G.watermonsterState++;
  }

  if (G.roomFallingstones) dropStone(T_FSTONE, 128);
  if (G.roomRollingstones) dropStone(T_RSTONE, 192);

  if (G.roomBlobs) {
    // Blobs come up from below:
    if (rand() % 250 === 0) {
      const direction = rand() % 2;
      spawnEnemy(randomX(direction), 20 * TILE_SIZE_Y, 1, T_BLOB, direction, tileIds.blob);
    }
  }
}

function waterAndLavaEnemies(): void {
  if (G.roomLava && !G.items[11]) {
    // Fire coming out of the lava (not with item 11):
    if (rand() % 200 === 0) {
      const x = 2 * TILE_SIZE_X + (rand() % (TILE_SIZE_X * 22));
      const y = (G.world === 10 ? 17 : 16) * TILE_SIZE_Y;
      spawnEnemy(x, y, 0, T_LAVA1, 0, tileIds.lava);
      spawnEnemy(x, y, 0, T_LAVA2, 0, tileIds.lava);
      playSound(sfx.fireball);
    }
  }

  if (G.roomPiranhas) {
    if (G.piranhasCounter > 0) G.piranhasCounter--;
    if (!G.inWater && rand() % 100 === 0 && G.piranhasCounter === 0) {
      // A piranha comes out:
      G.piranhasCounter = 200;
      const x = 2 * TILE_SIZE_X + (rand() % (TILE_SIZE_X * 22));
      const piranha = spawnEnemy(x, 14 * TILE_SIZE_Y, 1, T_PIRANHA, x < 16 * TILE_SIZE_X ? 0 : 2, tileIds.piranha);
      piranha.lastHit = 0;
      piranha.experience = 2;
      spawnEnemy(x, 14 * TILE_SIZE_Y, 0, T_PIRANHA2, 0, tileIds.piranha);
    }
  }

  if (G.roomWaterdragons !== -1) {
    if (G.roomWaterdragons > 0) G.roomWaterdragons--;
    if (G.roomWaterdragons === 0) {
      if (!G.inWater) {
        // A water dragon comes out:
        const x = 2 * TILE_SIZE_X + (rand() % (TILE_SIZE_X * 22));
        const direction = x < 16 * TILE_SIZE_X ? 0 : 1;
        const dragon = spawnEnemy(x, 14 * TILE_SIZE_Y, 4, T_WATERDRAGON, direction, tileIds.waterdragon);
        dragon.tile = direction * 2;
        dragon.lastHit = 0;
        dragon.experience = 6;
        spawnEnemy(x + TILE_SIZE_X, 14 * TILE_SIZE_Y, 0, T_PIRANHA2, 0, tileIds.piranha);
      }
      G.roomWaterdragons = 320;
    }
  }
}

/** Butterflies, birds and the red dragon appear once when the room is entered. */
function spawnRoomEnemies(): void {
  if (G.roomBfly === 1) {
    for (const [tx, ty] of [
      [4, 6],
      [4, 12],
      [12, 6],
      [12, 12],
      [20, 6],
      [20, 12],
      [24, 6],
      [24, 12],
    ]) {
      const bfly = spawnEnemy(tx * TILE_SIZE_X, ty * TILE_SIZE_Y, 1, T_BFLY_SMALL, 0, tileIds.bfly);
      bfly.lastHit = 0;
      bfly.experience = 2;
    }
    G.roomBfly = 2;
  }

  if (G.roomBirds >= 0) {
    // Five birds from x, entering one by one (state2 is their delay):
    const flock = (x: number, first: number): void => {
      for (let j = 0; j < 5; j++) {
        const bird = spawnEnemy(x, -2 * TILE_SIZE_Y, 2, T_BIRD, 0, tileIds.bird);
        bird.tile = -1;
        bird.lastHit = 0;
        bird.experience = 4;
        bird.state2 = 16 + (first + j) * 16;
        bird.state3 = 1;
      }
    };
    if (G.roomBirds === 1) {
      flock(22 * TILE_SIZE_X, 0);
      flock(8 * TILE_SIZE_X, 5);
    } else {
      flock(8 * TILE_SIZE_X, 0);
    }
    G.roomBirds = -1;
  }

  if (G.roomReddragon === 1) {
    const dragon = spawnEnemy(0, 0, 25, T_REDDRAGON, 0, tileIds.reddragon);
    dragon.tile = -1;
    dragon.experience = 16;
    G.roomReddragon = 0;
  }
}

// --- The wall that appears behind the character, and the fairy ---------------

/**
 * A wall (one tile wide, three high, at roomAppearwallX/Y) that closes behind
 * the character once it has walked past. States: 0 waiting, 1/2 the character
 * entered from the left/right, 3–26 the wall growing. Rooms where it has
 * closed are recorded, and it stays closed there.
 */
function appearingWall(): void {
  const x = G.roomAppearwallX;
  const y = G.roomAppearwallY;
  const inRow = G.playerY >= (y - 1) * TILE_SIZE_Y && G.playerY <= (y + 2) * TILE_SIZE_Y;

  switch (G.roomAppearwall) {
    case 0:
      if (inRow && G.playerX < (x - 3) * TILE_SIZE_X) G.roomAppearwall = 1;
      if (inRow && G.playerX > (x + 2) * TILE_SIZE_X) G.roomAppearwall = 2;
      break;
    case 1:
      if (G.playerX >= (x + 2) * TILE_SIZE_X) G.roomAppearwall = 3;
      if (!inRow) G.roomAppearwall = 0;
      break;
    case 2:
      if (G.playerX <= (x - 3) * TILE_SIZE_X) G.roomAppearwall = 3;
      if (!inRow) G.roomAppearwall = 0;
      break;
    default:
      if (G.roomAppearwall < 26) G.roomAppearwall++;

      setTile(x, y, tileIds.wall);
      if (G.roomAppearwall >= 12) setTile(x, y + 1, tileIds.wall);
      if (G.roomAppearwall >= 26) {
        setTile(x, y + 2, tileIds.wall);
        if (findWallRecord(G.roomX, G.roomY) === -1) {
          const k = findWallRecord(-1, -1);
          if (k !== -1) {
            G.appearwallRecordX[k] = G.roomX;
            G.appearwallRecordY[k] = G.roomY;
          }
        }
      }
      break;
  }

  if (findWallRecord(G.roomX, G.roomY) !== -1) {
    setTile(x, y, tileIds.wall);
    setTile(x, y + 1, tileIds.wall);
    setTile(x, y + 2, tileIds.wall);
    G.roomAppearwall = -1;
  }
}

/** The record of the appearing wall in room (roomX, roomY), or -1 (-1, -1: a free record). */
function findWallRecord(roomX: number, roomY: number): number {
  for (let i = 0; i < MAX_AW_RECORD; i++) {
    if (G.appearwallRecordX[i] === roomX && G.appearwallRecordY[i] === roomY) return i;
  }
  return -1;
}

/**
 * Standing still at the fairy's spot for 128 frames calls the fairy: the
 * bubbles gather in the centre and the fairy appears (at 153).
 */
function fairy(): void {
  if (G.playerState === S_QUIET && G.playerX >= G.fairyX - idiv(TILE_SIZE_X, 2) && G.playerY === G.fairyY) {
    if (G.roomFairy < 128) G.roomFairy++;
  } else {
    if (G.roomFairy < 128) G.roomFairy = 0;
  }
  if (G.roomFairy < 128) return;

  // Make the fairy appear!!
  if (G.roomFairy === 128) {
    stopMusic();
    playMusic('fairy', 'castle', null);
  }
  G.roomFairy++;

  // Steer all bubbles towards the centre:
  let anyBubble = false;
  for (let i = 0; i < G.objectCount; i++) {
    const b = G.objects[i];
    if (b.type !== T_FAIRY_BUBBLE) continue;
    anyBubble = true;
    if (b.x >= 13 * TILE_SIZE_X && b.x < 17 * TILE_SIZE_X && b.y >= 9 * TILE_SIZE_X && b.y < 13 * TILE_SIZE_Y) {
      b.type = T_NADA;
      continue;
    }
    const dx = 15 * TILE_SIZE_X - b.x;
    const dy = 11 * TILE_SIZE_Y - b.y;
    if (Math.abs(dx) > 4 * Math.abs(dy)) {
      b.state = dx > 0 ? 4 : -4;
      b.state2 = 0;
    } else if (Math.abs(dx) > 2 * Math.abs(dy)) {
      b.state = dx > 0 ? 4 : -4;
      b.state2 = dy > 0 ? 2 : -2;
    } else if (Math.abs(dy) > 4 * Math.abs(dx)) {
      b.state = 0;
      // NOTE (original): asymmetric speed (2 down, -4 up).
      b.state2 = dy > 0 ? 2 : -4;
    } else if (Math.abs(dy) > 2 * Math.abs(dx)) {
      b.state = dx > 0 ? 2 : -2;
      b.state2 = dy > 0 ? 4 : -4;
    } else {
      b.state = dx > 0 ? 4 : -4;
      b.state2 = dy > 0 ? 4 : -4;
    }
    b.x += b.state;
    b.y += b.state2;
  }

  if (G.roomFairy === 153) {
    addObject(T_FAIRY, 15 * TILE_SIZE_X, 11 * TILE_SIZE_Y, 0, 0, 0);
  }
  if (!anyBubble && G.roomFairy >= 153) {
    G.roomFairy = -1;
  }
}

// --- Helpers for the room events ---------------------------------------------

function inRoom(x: number, y: number): boolean {
  return G.roomX === x && G.roomY === y;
}

function tileAt(x: number, y: number): number {
  return G.roomTiles![x + y * G.roomWidth];
}

function setTile(x: number, y: number, t: number): void {
  G.roomTiles![x + y * G.roomWidth] = t;
}

/** Sets a block of room tiles, top-left at (x, y). */
function setTiles(x: number, y: number, rows: number[][]): void {
  rows.forEach((row, dy) => row.forEach((t, dx) => setTile(x + dx, y + dy, t)));
}

/** Background tiles (4×3) that replace a wall to open a passage. */
const PASSAGE = [
  [127, 128, 127, 128],
  [129, 130, 129, 130],
  [128, 127, 128, 127],
];

/** The same with another top row. */
const PASSAGE_131 = [
  [131, 132, 131, 132],
  [129, 130, 129, 130],
  [128, 127, 128, 127],
];

function anyObject(test: (o: GameObject) => boolean): boolean {
  for (let i = 0; i < G.objectCount; i++) {
    if (test(G.objects[i])) return true;
  }
  return false;
}

/** Whether an enemy (of the given kind) is still in the room. */
function anyEnemy(enemy?: number): boolean {
  return anyObject((o) => o.type === T_ENEMY && (enemy === undefined || o.enemy === enemy));
}

function anyLadderAt(x: number, y?: number): boolean {
  return anyObject((o) => o.type === T_LADDER && o.x === x && (y === undefined || o.y === y));
}

/** Makes item `item` appear at (tx, ty) unless the character has it or it is already in the room. */
function revealItem(item: number, tx: number, ty: number): void {
  if (G.items[item] || anyObject((o) => o.type === T_ITEM && o.state === item)) return;
  playSound(sfx.ladderdisapear);
  addObject(T_ITEM, tx * TILE_SIZE_X, ty * TILE_SIZE_Y, 0, T_ITEM, item);
}

/** Opens a passage in a wall (unless it is open already, tested by the tile at (x, y)). */
function openPassage(x: number, y: number, tiles: number[][]): void {
  if (tileAt(x, y) === tiles[0][0]) return;
  playSound(sfx.ladderdisapear);
  setTiles(x, y, tiles);
}

/** A ladder down from the top of the room (3 tiles), unless there is one at x already. */
function topLadder(tx: number): void {
  if (anyLadderAt(tx * TILE_SIZE_X, 0)) return;
  addObject(T_LADDER, tx * TILE_SIZE_X, 0, 3, 0, 0);
  // Sound:
  playSound(sfx.ladderdisapear);
}

// --- The castle (world 0) -----------------------------------------------------

function castleEvents(): void {
  if (inRoom(8, 9)) {
    // Item 9 appears where the stone was, once the room is clear:
    if (
      !G.items[9] &&
      !anyObject(
        (o) =>
          o.type === T_ENEMY ||
          ((o.type === T_STONE || o.type === T_BROKEN_STONE || o.type === T_ITEM) &&
            o.x === 4 * TILE_SIZE_X &&
            o.y === 17 * TILE_SIZE_Y),
      )
    ) {
      playSound(sfx.ladderdisapear);
      addObject(T_ITEM, 4 * TILE_SIZE_X, 17 * TILE_SIZE_Y, 0, T_ITEM, 9);
    }
  }

  if (inRoom(10, 6)) {
    // Item 6 appears once the room is clear:
    if (!G.items[6] && !anyObject((o) => o.type === T_ENEMY || (o.type === T_ITEM && o.state === 6))) {
      playSound(sfx.ladderdisapear);
      addObject(T_ITEM, 10 * TILE_SIZE_X, TILE_SIZE_Y, 0, T_ITEM, 6);
    }
  }

  if (inRoom(2, 6) && G.nextWorld >= 5) swordDance();
  if (inRoom(5, 6)) keyCombination();

  if (inRoom(6, 4) && G.nextWorld >= 7) {
    // Item 24 (the sabre) appears when 11 enemies of rooms (6, 3–5) are dead:
    let count = 0;
    for (let i = 0; i < HP_OBJS_MAX; i++) {
      if (
        G.memObject[i] !== -1 &&
        G.memObjectType[i] === T_ENEMY &&
        G.memRoomX[i] === 6 &&
        (G.memRoomY[i] === 3 || G.memRoomY[i] === 4 || G.memRoomY[i] === 5)
      ) {
        count++;
      }
    }
    if (count >= 11) revealItem(24, 26, 9);
  }

  if (inRoom(6, 15) && G.playerX <= 5 * TILE_SIZE_X) {
    // Forget all remembered ladders:
    for (let i = 0; i < HP_OBJS_MAX; i++) {
      if (G.memObject[i] !== -1 && G.memObjectType[i] === T_LADDER) G.memObject[i] = -1;
    }
  }

  if (inRoom(G.world10DoorX, G.world10DoorY) && G.nextWorld === 10) world10Door();
}

/**
 * Room (2, 6): standing at the right place, swing the sword three times facing
 * right, three times facing left, then jump three times: item 14 (the vase) appears.
 */
function swordDance(): void {
  if (G.playerX < TILE_SIZE_X * 19 || G.playerX >= TILE_SIZE_X * 23 || G.playerY < 12 * TILE_SIZE_Y) {
    G.room26State = 0;
    return;
  }

  const s = G.playerState;
  const step = (from: number, state: number, facing: boolean): void => {
    if (G.room26State === from && s === state && facing) G.room26State = from + 1;
  };
  for (let k = 0; k < 6; k++) step(k, k % 2 === 0 ? S_QUIET_SWORD : S_QUIET, G.facingRight);
  if (G.room26State <= 5 && s !== S_QUIET && s !== S_QUIET_SWORD) G.room26State = 0;

  for (let k = 6; k < 12; k++) step(k, k % 2 === 0 ? S_QUIET_SWORD : S_QUIET, !G.facingRight);
  if (G.room26State > 6 && G.room26State <= 11 && s !== S_QUIET && s !== S_QUIET_SWORD) G.room26State = 0;

  for (let k = 12; k < 18; k++) step(k, k % 2 === 0 ? S_JUMPING : S_QUIET, true);
  if (G.room26State >= 12 && s !== S_QUIET && s !== S_JUMPING && s !== S_CONTROLED_FALL && s !== S_STOPPED_JUMPING)
    G.room26State = 0;

  if (G.room26State === 18) {
    G.room26State = 0;
    revealItem(14, 16, 13);
  }
}

/**
 * Room (5, 6): on the floor at row 9, press right, down, left, up; then leave
 * that floor: item 25 (the dagger) appears (unless there are stones).
 */
function keyCombination(): void {
  const keyboard = getKeyboardState();
  if (
    G.playerX >= 4 * TILE_SIZE_X &&
    G.playerX <= 26 * TILE_SIZE_X &&
    G.playerY === 9 * TILE_SIZE_Y &&
    G.room56State < 4
  ) {
    if (G.room56State === 0 && keyboard[G.keyRight] !== 0 && keyboard[G.keyDown] === 0) G.room56State = 1;
    if (G.room56State === 1 && keyboard[G.keyDown] !== 0 && keyboard[G.keyLeft] === 0) G.room56State = 2;
    if (G.room56State === 2 && keyboard[G.keyLeft] !== 0 && keyboard[G.keyUp] === 0) G.room56State = 3;
    if (G.room56State === 3 && keyboard[G.keyUp] !== 0) G.room56State = 4;
  } else if (G.room56State === 4) {
    if (
      !G.items[25] &&
      !anyObject((o) => o.type === T_STONE || o.type === T_BROKEN_STONE || (o.type === T_ITEM && o.state === 25))
    ) {
      playSound(sfx.ladderdisapear);
      addObject(T_ITEM, 12 * TILE_SIZE_X, 1 * TILE_SIZE_Y, 0, T_ITEM, 25);
    }
  } else {
    G.room56State = 0;
  }
}

/** The door to world 10 appears in its castle room once world 9 is done. */
function world10Door(): void {
  let found = false;
  for (let i = 0; i < G.objectCount; i++) {
    if (G.objects[i].type === T_WDOOR) {
      found = true;
      if (G.worldDoorsOpen[9]) G.objects[i].state = 1;
    }
  }
  if (found) return;

  // Put the door behind everything:
  for (let i = G.objectCount; i > 0; i--) {
    // C struct copy (in place, like the original).
    // NOTE (original): writes object[objectCount], out of bounds if objectCount===MAX_OBJECTS.
    Object.assign(G.objects[i], G.objects[i - 1]);
    G.objects[i].lightning = G.objects[i - 1].lightning.slice();
  }
  G.objectCount++;

  if (G.onLadder !== -1) G.onLadder++;

  G.objects[0].type = T_NADA;

  if (G.roomX === 1) addObject(T_WDOOR, 12 * TILE_SIZE_X, 16 * TILE_SIZE_Y, 10, 0, 0);
  if (G.roomX === 5) addObject(T_WDOOR, 20 * TILE_SIZE_X, 8 * TILE_SIZE_Y, 10, 0, 0);
  if (G.roomX === 9) addObject(T_WDOOR, 8 * TILE_SIZE_X, 16 * TILE_SIZE_Y, 10, 0, 0);
  if (G.roomX === 14) addObject(T_WDOOR, 20 * TILE_SIZE_X, 0 * TILE_SIZE_Y, 10, 0, 0);
}

// --- Worlds 1–9 -----------------------------------------------------------------

function world1Events(): void {
  if (inRoom(2, 7)) {
    // Wall that disappears when all creatures are killed:
    if (!anyEnemy(T_BLUESPIDER)) openPassage(0, 0, PASSAGE);
  }

  if (inRoom(2, 5)) {
    // Ladder that appears when all enemies are killed:
    if (!anyEnemy() && !anyLadderAt(20 * TILE_SIZE_X) && tileAt(20, 3) !== 126) {
      addObject(T_LADDER, 20 * TILE_SIZE_X, 4 * TILE_SIZE_Y, 3, 0, 0);
      setTiles(20, 3, [[126, 126]]);
      // Sound:
      playSound(sfx.ladderdisapear);
    }
  }
}

function world2Events(): void {
  if (inRoom(3, 2)) {
    // Ladder that appears when the witch is killed:
    if (!anyEnemy(T_WITCH) && !anyObject((o) => o.type === T_LADDER)) {
      addObject(T_LADDER, 15 * TILE_SIZE_X, 0, 3, 0, 0);
      // Sound:
      playSound(sfx.ladderdisapear);
    }
  }

  if (inRoom(5, 1)) {
    // Bridge that appears with the doll (item 5):
    if (G.items[5] && tileAt(8, 7) !== 162) {
      for (let x = 8; x < 24; x++) setTile(x, 7, 162);
      playSound(sfx.ladderdisapear);
    }
  }

  if (inRoom(7, 0)) {
    // Ladder that appears when all enemies are killed:
    if (!anyEnemy() && !anyLadderAt(25 * TILE_SIZE_X) && tileAt(25, 3) !== 126) {
      addObject(T_LADDER, 25 * TILE_SIZE_X, 4 * TILE_SIZE_Y, 3, 0, 0);
      setTiles(25, 3, [[126, 126]]);
      // Sound:
      playSound(sfx.ladderdisapear);
    }
  }

  if (inRoom(7, 1)) {
    // Wall that disappears when the witch is killed:
    if (!anyEnemy()) openPassage(G.roomWidth - 4, 8, PASSAGE);
  }
}

function world3Events(): void {
  if (inRoom(0, 6)) {
    if (G.world3Room06Counter >= 5) openPassage(G.roomWidth - 4, 0, PASSAGE);
  }

  if (inRoom(3, 1)) {
    // Ladder that appears when all enemies are killed:
    if (!anyEnemy() && !anyLadderAt(2 * TILE_SIZE_X)) topLadder(2);
  }
}

function world4Events(): void {
  // Clearing rooms (2, 1) and (3, 0) opens the way in room (4, 2):
  if (inRoom(2, 1) && !anyEnemy()) G.world4State |= 1;
  if (inRoom(3, 0) && !anyEnemy()) G.world4State |= 2;

  if (inRoom(4, 2)) {
    if ((G.world4State & 0x01) === 0) {
      setTiles(14, 12, [
        [126, 126, 126, 126],
        [126, 126, 126, 126],
        [126, 126, 126, 126],
      ]);
    }
    // Make the shrine ladder appear:
    if ((G.world4State & 0x02) !== 0) topLadder(15);
  }
}

function world5Events(): void {
  if (inRoom(4, 4)) stonesInTheWater();

  // Killing the hairy monsters of rooms (1, 3) and (6, 3) unlocks rooms (4, 4) and (6, 4):
  if (inRoom(1, 3) && !anyEnemy(T_HAIRY)) G.world5Room44State2 = 1;
  if (inRoom(6, 3) && !anyEnemy(T_HAIRY)) G.world5Room64State = 1;

  if (inRoom(6, 4)) {
    if (tileAt(31, 8) === 125 && G.world5Room64State === 1) {
      playSound(sfx.ladderdisapear);
      setTiles(28, 8, [
        [131, 135, 136, 132],
        [129, 137, 138, 130],
        [128, 139, 140, 127],
      ]);
    }
  }
}

/**
 * World 5, room (4, 4): standing on a bank (left or right) for a while makes
 * stepping stones appear one after another in the water (row 11), and sink
 * again behind the character. world5Room44State counts the frames,
 * world5Room44State3 is the side it started from.
 */
function stonesInTheWater(): void {
  const interval = 160;
  const STONE = [179, 180];
  const NO_STONE = [129, 130];
  const NO_STONE2 = [130, 129];
  const at = (x: number, tiles: number[]): void => setTiles(x, 11, [tiles]);

  if (G.world5Room44State > 0 && G.world5Room44State < interval) {
    if (G.playerY === 9 * TILE_SIZE_Y && G.playerX >= 2 * TILE_SIZE_X && G.playerX < 4 * TILE_SIZE_X) {
      G.world5Room44State++;
      G.world5Room44State3 = 0;
      if (G.world5Room44State === interval) {
        playSound(sfx.waterstone);
        at(7, STONE);
      }
    } else if (G.playerY === 9 * TILE_SIZE_Y && G.playerX >= 26 * TILE_SIZE_X && G.playerX < 28 * TILE_SIZE_X) {
      G.world5Room44State++;
      G.world5Room44State3 = 1;
      if (G.world5Room44State === interval) {
        playSound(sfx.waterstone);
        at(23, STONE);
      }
    } else {
      G.world5Room44State = G.world5Room44State2;
    }
  }

  if (G.world5Room44State < interval) return;
  G.world5Room44State++;
  const step = G.world5Room44State;
  if (step % interval !== 0 || step < interval * 2 || step > interval * 6) return;

  playSound(sfx.waterstone);
  if (G.world5Room44State3 === 0) {
    // From the left bank: 7 → 12 → 18 → 23.
    if (step === interval * 2) at(12, STONE);
    if (step === interval * 3) {
      at(18, STONE);
      at(7, NO_STONE);
    }
    if (step === interval * 4) {
      at(23, STONE);
      at(12, NO_STONE2);
    }
    if (step === interval * 5) at(18, NO_STONE2);
    if (step === interval * 6) at(23, NO_STONE);
  } else {
    // From the right bank: 23 → 18 → 12 → 7.
    if (step === interval * 2) at(18, STONE);
    if (step === interval * 3) {
      at(23, NO_STONE);
      at(12, STONE);
    }
    if (step === interval * 4) {
      at(18, NO_STONE2);
      at(7, STONE);
    }
    if (step === interval * 5) at(12, NO_STONE2);
    if (step === interval * 6) at(7, NO_STONE);
  }
}

function world6Events(): void {
  // Clearing rooms (3, 2), (2, 5) and (1, 5) opens the ways in room (3, 5):
  if (inRoom(3, 2) && !anyEnemy()) G.world6Room35State |= 1;
  if (inRoom(2, 5) && !anyEnemy()) G.world6Room35State |= 2;
  if (inRoom(1, 5) && !anyEnemy()) G.world6Room35State |= 4;

  if (inRoom(3, 5)) {
    if ((G.world6Room35State & 0x01) !== 0) openPassage(0, 12, PASSAGE_131);

    if ((G.world6Room35State & 0x06) === 0x06 && tileAt(29, 19) === 125) {
      playSound(sfx.ladderdisapear);
      setTiles(28, 15, [[126, 126]]);
      setTiles(28, 19, [[130, 129]]);
      addObject(T_LADDER, 28 * TILE_SIZE_X, 16 * TILE_SIZE_Y, 5, 0, 0);
    }
  }

  if (inRoom(5, 4)) {
    // Ladder that appears when the dragon is killed:
    if (!anyEnemy()) topLadder(15);
  }
}

function world7Events(): void {
  if (inRoom(0, 2) && !anyEnemy(T_BAT)) G.world7Room12State = 1;

  if (inRoom(1, 2)) {
    if ((G.world7Room12State & 0x01) !== 0) openPassage(8, 0, PASSAGE);
  }

  if (inRoom(5, 2)) {
    if (!anyEnemy()) openPassage(4, 16, PASSAGE_131);
  }

  if (inRoom(3, 4)) {
    if (
      !anyObject((o) => o.type === T_ENEMY || (o.type === T_LADDER && o.y === 12 * TILE_SIZE_Y)) &&
      tileAt(16, 11) !== 126
    ) {
      playSound(sfx.ladderdisapear);
      setTiles(16, 11, [[126, 126]]);
      // NOTE (original): the x of the ladder uses TILE_SIZE_Y.
      addObject(T_LADDER, 16 * TILE_SIZE_Y, 12 * TILE_SIZE_Y, 3, 0, 0);
    }
  }
}

function world8Events(): void {
  if (inRoom(3, 2)) {
    if (!anyEnemy(T_TRANSFORMER)) openPassage(28, 4, PASSAGE_131);
  }

  if (G.roomY === 4 && G.roomX < 6 && tileAt(4, 12) !== 125 && G.items[11]) {
    // With item 11 the lava floor (rows 12–19) becomes solid:
    playSound(sfx.ladderdisapear);
    for (let y = 12; y < 20; y++) {
      for (let x = 0; x < 32; x++) setTile(x, y, 125);
    }
  }

  if (inRoom(5, 4)) {
    if (!anyEnemy(T_CYCLOPS)) openPassage(28, 4, PASSAGE_131);
  }

  if (inRoom(1, 3) && !anyEnemy()) G.world8Room12State = 1;

  if (inRoom(1, 2) && G.world8Room12State !== 0) {
    if (!anyObject((o) => o.type === T_LADDER && o.y === 0)) {
      addObject(T_LADDER, 15 * TILE_SIZE_X, 0, 3, 0, 0);
      // Sound:
      playSound(sfx.ladderdisapear);
    }
  }
}

function world9Events(): void {
  /** Nothing to do while enemies are left or a ladder hangs from the top. */
  const busy = (): boolean => anyObject((o) => (o.type === T_LADDER && o.y === 0) || o.type === T_ENEMY);

  if (inRoom(1, 7) && !busy()) {
    // Sound:
    playSound(sfx.ladderdisapear);
    addObject(T_LADDER, 2 * TILE_SIZE_X, 0, 3, 0, 0);
    setTiles(2, 0, [
      [127, 128],
      [129, 130],
      [128, 127],
    ]);
  }

  if (inRoom(3, 2) && !busy()) {
    // Sound:
    playSound(sfx.ladderdisapear);
    addObject(T_LADDER, 4 * TILE_SIZE_X, 0, 3, 0, 0);
  }

  if (inRoom(2, 1) && !busy()) {
    // Sound:
    playSound(sfx.ladderdisapear);
    addObject(T_LADDER, 15 * TILE_SIZE_X, 0, 3, 0, 0);
  }

  if (inRoom(1, 0) && !anyEnemy() && tileAt(4, 0) === 125) {
    // Sound:
    playSound(sfx.ladderdisapear);
    setTiles(4, 0, PASSAGE);
  }
}
