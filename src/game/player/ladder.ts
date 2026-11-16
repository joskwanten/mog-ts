/** Player states on a ladder: climbing up or down, holding on, and the sword swing. */
import { GameObject } from '../object';
import { playSound } from '../../platform/audio';
import {
  MASK_OFFSET,
  S_DOWN_LADDER,
  S_QUIET,
  S_QUIET_LADDER,
  S_SWORD_LADDER,
  S_UP_LADDER,
  TILE_SIZE_X,
  TILE_SIZE_Y,
  TILE_UNIT,
  T_LADDER,
  T_NADA,
} from '../constants';
import { idiv } from '../cutil';
import { isWall, rememberObject } from '../gameaux';
import { sfx, tileIds } from '../resources';
import { G } from '../state';
import { PlayerStep, fireWeaponOnKey, holdSwordLevel, touches } from './step';

/** Find the ladders the character could climb up or down from where it stands (the last match wins). */
export function findLadders(s: PlayerStep): void {
  for (let i = 0; i < G.objectCount; i++) {
    const ladder = G.objects[i];
    if (ladder.type !== T_LADDER) continue;
    if (G.playerX >= ladder.x - 4 && G.playerX <= ladder.x + 8) {
      if (G.playerY >= ladder.y - 1 * TILE_SIZE_Y && G.playerY <= ladder.y + (ladder.size - 2) * TILE_SIZE_Y) {
        s.ladderUp = i;
      }
      if (G.playerY >= ladder.y - 3 * TILE_SIZE_Y && G.playerY <= ladder.y - 2 * TILE_SIZE_Y) {
        s.ladderDown = i;
      }
    }
  }
}

/** S_UP_LADDER */
export function climbUp(s: PlayerStep): void {
  s.nextX = ladder().x;
  if (G.playerSubState > 7) G.playerSubState = 0;
  G.playerFrame = G.playerSubState < 4 ? 7 : 8;
  if (s.held(G.keyUp) && !s.held(G.keyDown)) {
    G.playerSubState++;
    if (G.playerY > ladderTop()) {
      s.nextY = G.playerY - TILE_UNIT;
    }
    if (s.nextY <= ladderTop()) leaveLadder();
  }
  if (s.held(G.keyDown)) stepDown(s);
  turnOnLadder(s);
}

/** S_DOWN_LADDER */
export function climbDown(s: PlayerStep): void {
  s.nextX = ladder().x;
  if (G.playerSubState > 7) G.playerSubState = 0;
  G.playerFrame = G.playerSubState < 4 ? 5 : 6;
  if (s.held(G.keyDown) && !s.held(G.keyUp)) {
    G.playerSubState++;
    if (G.playerY < ladderBottom()) {
      s.nextY = G.playerY + TILE_UNIT;
    }
    if (s.nextY >= ladderBottom()) leaveLadder();
  }
  if (s.held(G.keyUp)) stepUp(s);
  turnOnLadder(s);
}

/** S_QUIET_LADDER: holding on to the ladder. */
export function holdOnLadder(s: PlayerStep): void {
  s.nextX = ladder().x;
  if (G.playerSubState > 7) G.playerSubState = 0;
  G.playerFrame = 0;
  if (s.held(G.keyUp)) stepUp(s);
  if (s.held(G.keyDown)) {
    stepDown(s);
    // NOTE (original): overwrites the next_y set just above.
    s.nextY = G.playerY + 2;
  }
  if (s.held(G.keyLeft) && !s.held(G.keyUp) && !s.held(G.keyDown)) stepOff(s, -1);
  if (s.held(G.keyRight) && !s.held(G.keyUp) && !s.held(G.keyDown)) stepOff(s, 1);
  if (s.justPressed(G.keySword) && G.playerState === S_QUIET_LADDER) {
    playSound(sfx.sword);
    G.playerState = S_SWORD_LADDER;
    G.swordTime = 0;
    G.playerSubState = 0;
    G.playerFrame = 3;
  }
  fireWeaponOnKey(s);
}

/** S_SWORD_LADDER: swinging the sword on a ladder. */
export function swingOnLadder(s: PlayerStep): void {
  s.nextX = ladder().x;
  G.playerFrame = 3;
  holdSwordLevel();
  if (G.swordTime >= 4) {
    G.playerState = S_QUIET_LADDER;
    G.playerSubState = 0;
    G.playerFrame = 0;
    G.sword = false;
  }

  G.swordTime++;
  fireWeaponOnKey(s);
}

/** Stand-in for `object[-1]` (see ladder()). */
const NO_LADDER = new GameObject();

/**
 * The ladder the character is on.
 * NOTE (original): after getting off in the same frame (UP+DOWN, or LEFT+RIGHT held
 * together) the C++ reads object[-1], memory before the array. Deviation: that is a
 * zeroed object here instead of a crash; the character simply leaves the ladder.
 */
function ladder(): GameObject {
  return G.onLadder === -1 ? NO_LADDER : G.objects[G.onLadder];
}

/** The character's y at the top of the ladder. */
function ladderTop(): number {
  return ladder().y - 3 * TILE_SIZE_Y;
}

/** The character's y at the bottom of the ladder. */
function ladderBottom(): number {
  return ladder().y + (ladder().size - 2) * TILE_SIZE_Y;
}

/** UP while on the ladder (but not climbing up): climb up, or get off at the top. */
function stepUp(s: PlayerStep): void {
  G.playerState = S_UP_LADDER;
  if (G.playerY > ladderTop()) {
    s.nextY = G.playerY - TILE_UNIT;
  } else {
    leaveLadder();
  }
}

/** DOWN while on the ladder (but not climbing down): climb down, or get off at the bottom. */
function stepDown(s: PlayerStep): void {
  G.playerState = S_DOWN_LADDER;
  // NOTE (original): with UP and DOWN both held at the top of the ladder, the UP
  // branch above sets onLadder=-1 and the C++ reads object[-1] (out of bounds).
  // Deviation: the onLadder!==-1 guards avoid a crash; -1 behaves like a zeroed
  // object (the character leaves the ladder). (Only S_QUIET_LADDER can get here
  // with onLadder=-1.)
  if (G.onLadder !== -1 && G.playerY < ladderBottom()) {
    s.nextY = G.playerY + TILE_UNIT;
  } else {
    leaveLadder();
  }
}

/** LEFT/RIGHT alone while climbing: stop and face that way. */
function turnOnLadder(s: PlayerStep): void {
  if (s.held(G.keyLeft) && !s.held(G.keyUp) && !s.held(G.keyDown)) {
    G.playerState = S_QUIET_LADDER;
    G.facingRight = false;
  }
  if (s.held(G.keyRight) && !s.held(G.keyUp) && !s.held(G.keyDown)) {
    G.playerState = S_QUIET_LADDER;
    G.facingRight = true;
  }
}

/**
 * LEFT (dir -1) or RIGHT (dir 1) while holding on: step off sideways onto a
 * ledge near the bottom, get off near the top, or else just face that way.
 */
function stepOff(s: PlayerStep, dir: 1 | -1): void {
  const tx = idiv(G.playerX, TILE_SIZE_X);
  const ty = idiv(G.playerY, TILE_SIZE_Y);
  const dty = G.playerY - ty * TILE_SIZE_Y;
  const tile = dir > 0 ? tileIds.character[G.character] : tileIds.characterInv[G.character];
  // if (playerY>=(object[onLadder].y+(object[onLadder].size-2)*TILE_SIZE_Y)-TILE_UNIT*2 &&
  if (
    dty > idiv(TILE_SIZE_Y, 2) &&
    isWall(dir > 0 ? tx + 2 : tx - 1, ty + 3) &&
    !touches(tile + MASK_OFFSET, G.playerX + dir * 8 * TILE_UNIT, G.playerY, s.collision)
  ) {
    s.nextX = G.playerX + dir * TILE_UNIT * 6;
    getOff();
  } else if (G.playerY < ladder().y - 2 * TILE_SIZE_Y - idiv(TILE_SIZE_Y, 2)) {
    removeOneShotLadder();
    s.nextX = G.playerX + dir * TILE_UNIT * 4;
    s.nextY = ty * TILE_SIZE_Y;
    getOff();
  } else {
    G.playerState = S_QUIET_LADDER;
  }
  G.facingRight = dir > 0;
}

/** Leave the ladder at one of its ends. */
function leaveLadder(): void {
  removeOneShotLadder();
  getOff();
}

/** A ladder with state 1 disappears once used (and stays gone). */
function removeOneShotLadder(): void {
  if (G.onLadder !== -1 && G.objects[G.onLadder].state === 1) {
    G.objects[G.onLadder].type = T_NADA;
    playSound(sfx.ladderdisapear);
    rememberObject(G.roomX, G.roomY, G.onLadder, T_LADDER);
  }
}

function getOff(): void {
  G.playerState = S_QUIET;
  G.playerSubState = 0;
  G.onLadder = -1;
  G.playerFrame = 0;
}
