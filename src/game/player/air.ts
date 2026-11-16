/**
 * Player states in the air: falling (uncontrolled after walking off a ledge,
 * controlled at the end of a jump), jumping, a jump stopped by a ceiling, and
 * the sword swing in each of them.
 *
 * In the air playerSubState counts the frames of the jump or fall; in water
 * it advances only every fourth cycle.
 */
import { playSound } from '../../platform/audio';
import {
  S_CONTROLED_FALL,
  S_C_FALL_SWORD,
  S_JUMPING,
  S_JUMPING_SWORD,
  S_QUIET,
  S_QUIET_SWORD,
  S_SJ_SWORD,
  S_STOPPED_JUMPING,
  S_UC_FALL_SWORD,
  S_UNCONTROLED_FALL,
  TILE_SIZE_X,
  TILE_UNIT,
  T_DOOR_WALL,
  T_LADDER_WALL,
  T_WALL,
} from '../constants';
import { idiv } from '../cutil';
import { sfx } from '../resources';
import { G } from '../state';
import { PlayerStep, characterTile, fireWeaponOnKey, holdSwordLow, swingSword } from './step';

const U = TILE_UNIT;
const H = idiv(TILE_UNIT, 2);

/**
 * Fall distance per frame, by frame of the fall; the last value repeats.
 * (In water the original writes TILE_UNIT for 2*H in the controlled fall: the
 * same value.)
 */
const FALL = [1 * U, 2 * U, 3 * U, 4 * U, 4 * U, 5 * U, 5 * U, 5 * U, 6 * U];
const FALL_WATER = [1 * H, 1 * H, 2 * H, 2 * H, 2 * H, 2 * H, 3 * H, 3 * H, 3 * H];

/**
 * Rise per frame of a jump (playerSubState 0..11), per character (Popolon,
 * Aphrodite); undefined: no vertical movement in that frame.
 */
const JUMP: readonly (readonly (number | undefined)[])[] = [
  [7 * U, 6 * U, 6 * U, 6 * U, 5 * U, 5 * U, 5 * U, 4 * U, 4 * U, 3 * U, 2 * U, 1 * U],
  [7 * U, 6 * U, 6 * U, 6 * U, 5 * U, 5 * U, 4 * U, 3 * U, undefined, undefined, undefined, 1 * U],
];
const JUMP_WATER: readonly (readonly (number | undefined)[])[] = [
  [4 * H, 3 * H, 3 * H, 3 * H, 3 * H, 3 * H, 2 * H, 2 * H, 2 * H, 3 * H, 1 * H, 1 * H],
  [4 * H, 3 * H, 3 * H, 3 * H, 3 * H, 2 * H, 2 * H, 1 * H, undefined, undefined, undefined, 1 * H],
];
/** Jump frames in water that move only on even cycles. */
const JUMP_WATER_EVEN_CYCLES: readonly (readonly number[])[] = [[9, 11], [11]];

/** S_UNCONTROLED_FALL: falling after walking off a ledge. */
export function fallUncontrolled(s: PlayerStep): void {
  s.collision = T_WALL | T_LADDER_WALL | T_DOOR_WALL;
  G.playerFrame = 0;
  const base = characterTile();
  fall(s, G.playerSubState);
  if (s.collides(base, G.playerX, s.nextY)) {
    if (G.playerSubState >= 2) playSound(sfx.fall);
    G.playerState = S_QUIET;
    G.playerSubState = 0;
    G.playerFrame = 0;
  }
  if (s.justPressed(G.keySword)) swingSword();
  fireWeaponOnKey(s);
}

/** S_UC_FALL_SWORD: swinging the sword while falling uncontrolled. */
export function swingFallingUncontrolled(s: PlayerStep): void {
  G.playerFrame = 4;
  holdSwordLow();
  if (G.swordTime >= (G.inWater ? 8 : 4)) {
    G.playerState = S_UNCONTROLED_FALL;
    G.playerFrame = 0;
    G.sword = false;
  }

  const base = characterTile();
  fall(s, G.playerSubState);
  if (s.collides(base, G.playerX, s.nextY)) {
    playSound(sfx.fall);
    if (G.playerState === S_UNCONTROLED_FALL) {
      G.playerState = S_QUIET;
      G.playerSubState = 0;
      G.playerFrame = 0;
    }
    if (G.playerState === S_UC_FALL_SWORD) {
      G.playerState = S_QUIET_SWORD;
      G.playerSubState = 0;
    }
  }
  G.swordTime++;
  fireWeaponOnKey(s);
}

/** S_CONTROLED_FALL: the falling half of a jump, steerable with left/right. */
export function fallControlled(s: PlayerStep): void {
  s.collision = T_WALL | T_LADDER_WALL | T_DOOR_WALL;
  G.playerFrame = 2;
  // (The tile is taken before steering, which may turn the character around.)
  const base = characterTile();

  if (G.previousXCollision) G.jumpInertia = 0;
  steer(s);

  s.nextY = G.playerY;
  // The fall starts after three frames of hanging in the air.
  fall(s, G.playerSubState - 3);
  if (!s.collides(base, G.playerX, G.playerY) && s.collides(base, G.playerX, s.nextY)) {
    G.playerState = S_QUIET;
    G.playerSubState = 0;
    G.playerFrame = 0;
  }

  if (s.justPressed(G.keySword)) swingSword();
  fireWeaponOnKey(s);
}

/** S_C_FALL_SWORD: swinging the sword in a controlled fall. */
export function swingFallingControlled(s: PlayerStep): void {
  G.playerFrame = 4;
  // (The tile is taken before steering, which may turn the character around.)
  const base = characterTile();
  steer(s);

  holdSwordLow();
  if (G.swordTime >= 4) {
    G.playerState = S_CONTROLED_FALL;
    G.playerFrame = 2;
    if (G.facingRight) {
      G.playerX -= 2;
    } else {
      G.playerX += 2;
    }
    G.sword = false;
  }

  s.nextY = G.playerY;
  fall(s, G.playerSubState - 3);

  if (!s.collides(base, G.playerX, G.playerY) && s.collides(base, G.playerX, s.nextY)) {
    if (G.playerState === S_CONTROLED_FALL) {
      G.playerState = S_QUIET;
      G.playerSubState = 0;
      G.playerFrame = 0;
    }
    if (G.playerState === S_C_FALL_SWORD) {
      G.playerState = S_QUIET_SWORD;
      G.playerSubState = 0;
    }
  }

  G.swordTime++;
  fireWeaponOnKey(s);
}

/** S_JUMPING */
export function jump(s: PlayerStep): void {
  G.playerFrame = 2;
  if (!G.previousYCollision) {
    shortenJump(s);
    rise(s);
  }

  // Stop rising under a ceiling that spans the character and four units to either side.
  const base = characterTile();
  let ceiling = true;
  for (let dx = -4; ceiling && dx <= 4; dx++) {
    ceiling = s.collides(base, G.playerX + dx * TILE_UNIT, s.nextY);
  }
  if (ceiling || G.previousYCollision) {
    G.playerSubState = 11;
    G.playerState = S_STOPPED_JUMPING;
  }

  if (G.previousXCollision) G.jumpInertia = 0;
  drift(s);

  if (G.playerSubState >= 13) {
    G.playerState = S_CONTROLED_FALL;
    G.playerSubState = 0;
  }
  if (s.justPressed(G.keySword)) swingSword();
  fireWeaponOnKey(s);
}

/** S_STOPPED_JUMPING: a jump that hit a ceiling hangs until its fall starts. */
export function jumpStopped(s: PlayerStep): void {
  G.playerFrame = 2;
  shortenJump(s);

  if (G.previousXCollision) G.jumpInertia = 0;
  drift(s);

  if (G.playerSubState >= 13) {
    G.playerState = S_CONTROLED_FALL;
    G.playerSubState = 0;
  }
  if (s.justPressed(G.keySword)) swingSword();
  fireWeaponOnKey(s);
}

/** S_JUMPING_SWORD: swinging the sword while jumping. */
export function swingJumping(s: PlayerStep): void {
  G.playerFrame = 4;
  holdSwordLow();
  if (G.swordTime >= (G.inWater ? 8 : 4)) {
    G.playerState = S_JUMPING;
    G.playerFrame = 2;
    G.sword = false;
  }

  shortenJump(s);
  rise(s);

  const base = characterTile();
  if (
    s.collides(base, G.playerX, s.nextY) &&
    s.collides(base, G.playerX + idiv(TILE_SIZE_X, 2), s.nextY) &&
    s.collides(base, G.playerX - idiv(TILE_SIZE_X, 2), s.nextY)
  ) {
    G.playerSubState = 11;
    if (G.playerState === S_JUMPING_SWORD) {
      G.playerState = S_SJ_SWORD;
    }
    if (G.playerState === S_JUMPING) {
      G.playerState = S_STOPPED_JUMPING;
    }
  }

  drift(s);

  if (G.playerSubState >= 13) {
    if (G.playerState === S_JUMPING_SWORD) {
      G.playerState = S_C_FALL_SWORD;
      G.playerSubState = 0;
    }
    if (G.playerState === S_JUMPING) {
      G.playerState = S_CONTROLED_FALL;
      G.playerSubState = 0;
    }
  }

  G.swordTime++;
  fireWeaponOnKey(s);
}

/** S_SJ_SWORD: swinging the sword in a stopped jump. */
export function swingJumpStopped(s: PlayerStep): void {
  G.playerFrame = 4;
  holdSwordLow();
  if (G.swordTime >= (G.inWater ? 8 : 4)) {
    G.playerState = S_STOPPED_JUMPING;
    G.playerFrame = 0;
    G.sword = false;
  }

  shortenJump(s);
  drift(s);

  if (G.playerSubState >= 13) {
    if (G.playerState === S_SJ_SWORD) {
      G.playerState = S_C_FALL_SWORD;
      G.playerSubState = 0;
    }
    if (G.playerState === S_STOPPED_JUMPING) {
      G.playerState = S_CONTROLED_FALL;
      G.playerSubState = 0;
    }
  }
  G.swordTime++;
  fireWeaponOnKey(s);
}

/** Advance the jump/fall frame counter (in water only every fourth cycle). */
function advance(): void {
  if (!G.inWater || (G.cycle & 0x03) === 0) G.playerSubState++;
}

/** Fall for frame `t` of the fall (nothing for t < 0), then advance. */
function fall(s: PlayerStep, t: number): void {
  if (t >= 0) {
    if (G.inWater) {
      // In water the first step is taken on even cycles only.
      if (t !== 0 || (G.cycle & 0x01) === 0) s.nextY = G.playerY + FALL_WATER[Math.min(t, FALL_WATER.length - 1)];
    } else {
      s.nextY = G.playerY + FALL[Math.min(t, FALL.length - 1)];
    }
  }
  advance();
}

/** Popolon's jump is cut short when UP is released; Aphrodite's always skips frames 8–10. */
function shortenJump(s: PlayerStep): void {
  if (G.character === 0) {
    if (!s.held(G.keyUp) && G.playerSubState < 11) G.playerSubState = 11;
  }
  if (G.character === 1) {
    if (G.playerSubState === 8) G.playerSubState = 11;
  }
}

/** Rise for the current jump frame. */
function rise(s: PlayerStep): void {
  const t = G.playerSubState;
  let dy: number | undefined;
  if (G.inWater) {
    const evenCyclesOnly = JUMP_WATER_EVEN_CYCLES[G.character]?.includes(t) ?? false;
    if (!evenCyclesOnly || (G.cycle & 0x01) === 0) dy = JUMP_WATER[G.character]?.[t];
  } else {
    dy = JUMP[G.character]?.[t];
  }
  if (dy !== undefined) s.nextY = G.playerY - dy;
}

/** Keep the jump's sideways momentum (jumpInertia), then advance. */
function drift(s: PlayerStep): void {
  if (G.inWater) {
    if (G.jumpInertia === 1) s.nextX = G.playerX + H;
    if (G.jumpInertia === -1) s.nextX = G.playerX - H;
  } else {
    if (G.jumpInertia === 1) s.nextX = G.playerX + TILE_UNIT * 2;
    if (G.jumpInertia === -1) s.nextX = G.playerX - TILE_UNIT * 2;
  }
  advance();
}

/** Sideways control in a controlled fall: no key (or both) keeps the momentum. */
function steer(s: PlayerStep): void {
  const left = s.held(G.keyLeft);
  const right = s.held(G.keyRight);
  if (left === right) s.nextX = G.playerX + G.jumpInertia * (G.inWater ? H : TILE_UNIT * 2);
  if (right && !left) steerToward(s, 1);
  if (left && !right) steerToward(s, -1);
}

function steerToward(s: PlayerStep, dir: 1 | -1): void {
  G.facingRight = dir > 0;
  // 1: steering along with the momentum, 0: no momentum, -1: against it.
  const along = G.jumpInertia * dir;
  if (G.inWater) {
    if (along === 1) s.nextX = G.playerX + dir * TILE_UNIT;
    if (along === 0) s.nextX = G.playerX + dir * H;
    if (along === -1) if ((G.cycle & 0x01) === 0) s.nextX = G.playerX - dir * H;
  } else {
    if (along === 1) s.nextX = G.playerX + dir * TILE_UNIT * 3;
    if (along === 0) s.nextX = G.playerX + dir * TILE_UNIT * 2;
    if (along === -1) s.nextX = G.playerX - dir * TILE_UNIT;
  }
}
