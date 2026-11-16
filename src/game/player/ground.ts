/** Player states on the ground: standing, walking, and the standing sword swing. */
import { playSound } from '../../platform/audio';
import {
  S_DOWN_LADDER,
  S_JUMPING,
  S_QUIET,
  S_QUIET_SWORD,
  S_UC_FALL_SWORD,
  S_UNCONTROLED_FALL,
  S_UP_LADDER,
  S_WALKING_LEFT,
  S_WALKING_RIGHT,
  TILE_UNIT,
} from '../constants';
import { idiv, rand } from '../cutil';
import { sfx } from '../resources';
import { G } from '../state';
import { PlayerStep, characterTile, fireWeaponOnKey, holdSwordLevel, swingSword } from './step';

/** S_QUIET: standing still. */
export function standStill(s: PlayerStep): void {
  // A direction key turns the character; pressed while already facing that way, it walks.
  if (s.held(G.keyLeft)) {
    if (!G.facingRight) {
      if (!G.inLava) G.playerState = S_WALKING_LEFT;
      G.walkState = 0;
    }
    G.facingRight = false;
  }
  if (s.held(G.keyRight)) {
    if (G.facingRight) {
      if (!G.inLava) G.playerState = S_WALKING_RIGHT;
      G.walkState = 1;
    }
    G.facingRight = true;
  }
  if (s.justPressed(G.keyUp) && s.ladderUp === -1 && !G.inLava) {
    let inertia = 0;
    if (s.held(G.keyLeft) && !G.oldKeyboard[G.keyRight]) inertia = -1;
    if (s.held(G.keyRight) && !G.oldKeyboard[G.keyLeft]) inertia = 1;
    startJump(inertia);
  }
  climbOntoLadder(s);
  if (!s.collides(characterTile(), G.playerX, G.playerY + 1)) startFalling();
  if (s.justPressed(G.keySword) && !G.inLava) swingSword();
  fireWeaponOnKey(s);
}

/** S_WALKING_RIGHT (dir 1) and S_WALKING_LEFT (dir -1). */
export function walk(s: PlayerStep, dir: 1 | -1): void {
  const forward = dir > 0 ? G.keyRight : G.keyLeft;
  const back = dir > 0 ? G.keyLeft : G.keyRight;
  const turnAround = dir > 0 ? S_WALKING_LEFT : S_WALKING_RIGHT;
  // walkState decides whether holding the other key turns the character around.
  const thisWay = dir > 0 ? 0 : 1;

  if (G.inWater) {
    if ((G.playerSubState & 0x01) === 0) s.nextX = G.playerX + dir * TILE_UNIT;
  } else {
    // Effect of the boots
    s.nextX = G.playerX + dir * TILE_UNIT * 2;
    if (G.items[4]) s.nextX += dir * idiv(TILE_UNIT, 2);
  }
  G.facingRight = dir > 0;
  G.playerSubState++;
  if (G.playerSubState > 7) G.playerSubState = 0;
  G.playerFrame = G.playerSubState < 4 ? 1 : 0;

  if (s.held(forward) && !G.oldKeyboard[back]) G.walkState = thisWay;

  if (s.held(back) && G.walkState === thisWay) G.playerState = turnAround;

  if (!s.held(forward)) G.playerState = s.held(back) ? turnAround : S_QUIET;

  if (s.justPressed(G.keyUp) && s.ladderUp === -1 && !G.inLava) startJump(dir);
  climbOntoLadder(s);
  // NOTE (original): walking left tests the floor at playerY+TILE_UNIT, walking right at playerY+1.
  const floorY = G.playerY + (dir > 0 ? 1 : TILE_UNIT);
  if (!s.collides(characterTile(), G.playerX, floorY)) {
    startFalling();
    s.nextX = G.playerX; // If the character must fall, he cannot walk
  }
  if (s.justPressed(G.keySword) && !G.inLava) swingSword();
  fireWeaponOnKey(s);
}

/** S_QUIET_SWORD: swinging the sword while standing. */
export function swingStanding(s: PlayerStep): void {
  let swordDelay = 4;

  if (G.stoneHitCounter >= 6 && G.character === 1) swordDelay = 2 + (rand() % 2);

  G.playerFrame = 3;
  holdSwordLevel();
  if (G.swordTime >= (G.inWater ? swordDelay * 2 : swordDelay)) {
    G.playerState = S_QUIET;
    G.playerSubState = 0;
    G.playerFrame = 0;
    G.sword = false;
  }

  if (!s.collides(characterTile(), s.nextX, G.playerY + 1)) {
    if (G.playerState === S_QUIET) {
      G.playerState = S_UNCONTROLED_FALL;
      G.playerSubState = 0;
    }
    if (G.playerState === S_QUIET_SWORD) {
      G.playerState = S_UC_FALL_SWORD;
      G.playerSubState = 0;
    }
  }
  G.playerSubState++;
  G.swordTime++;
  fireWeaponOnKey(s);
}

function startJump(inertia: number): void {
  playSound(sfx.jump);
  G.playerState = S_JUMPING;
  if (G.characterOverVerticalLever) G.jumpingFromElevator = true;
  G.playerSubState = 0;
  G.jumpInertia = inertia;
}

/** UP at a ladder or DOWN above one: get on it. */
function climbOntoLadder(s: PlayerStep): void {
  if (s.justPressed(G.keyUp) && s.ladderUp !== -1) {
    G.playerState = S_UP_LADDER;
    G.playerSubState = 0;
    s.nextX = G.objects[s.ladderUp].x;
    G.onLadder = s.ladderUp;
  }
  if (s.justPressed(G.keyDown) && s.ladderDown !== -1 && G.playerState !== S_JUMPING) {
    G.playerState = S_DOWN_LADDER;
    G.playerSubState = 0;
    s.nextX = G.objects[s.ladderDown].x;
    G.onLadder = s.ladderDown;
  }
}

function startFalling(): void {
  G.playerState = S_UNCONTROLED_FALL;
  G.playerSubState = 0;
  G.playerFrame = 0;
}
