/**
 * Port of ingamecycle.cpp: the player character's movement, jumping, ladders,
 * sword, weapons, doors, water/lava and room exits.
 *
 * updatePlayer runs the hazard checks, then the handler of the current player
 * state (src/game/player/), then moves the character against the walls. The
 * collision tests read G.collision (what was drawn this frame), so the order
 * of the tests is kept exactly as in the C++ code.
 */
import { pauseMusic, playSound, resumeMusic } from '../platform/audio';
import { SDLK_LCTRL, SDLK_RCTRL, getKeyboardState } from '../platform/keyboard';
import {
  S_CONTROLED_FALL,
  S_C_FALL_SWORD,
  S_DEATH,
  S_DOORPASS,
  S_DOWN_LADDER,
  S_ENTERING_PASSAGE,
  S_ENTERING_WORLD,
  S_HIT,
  S_HIT_COLISION,
  S_HIT_RECOVERY,
  S_JUMPING,
  S_JUMPING_SWORD,
  S_QUIET,
  S_QUIET_LADDER,
  S_QUIET_SWORD,
  S_SJ_SWORD,
  S_SLOWDOORPASS,
  S_STOPPED_JUMPING,
  S_SWORD_LADDER,
  S_UC_FALL_SWORD,
  S_UNCONTROLED_FALL,
  S_UP_LADDER,
  S_WALKING_LEFT,
  S_WALKING_RIGHT,
  TILE_UNIT,
  T_DOOR_WALL,
  T_LADDER_WALL,
  T_WALL,
} from './constants';
import {
  fallControlled,
  fallUncontrolled,
  jump,
  jumpStopped,
  swingFallingControlled,
  swingFallingUncontrolled,
  swingJumpStopped,
  swingJumping,
} from './player/air';
import { checkEnemyContact, checkLava, checkWater } from './player/damage';
import { standStill, swingStanding, walk } from './player/ground';
import { climbDown, climbUp, findLadders, holdOnLadder, swingOnLadder } from './player/ladder';
import { correctPosition, moveCharacter, releaseLadderWhenHit } from './player/movement';
import {
  die,
  enterPassage,
  enterWorld,
  hitInPlace,
  knockedBack,
  passDoor,
  passDoorSlowly,
  recoverFromHit,
} from './player/scripted';
import { PlayerStep, characterTile } from './player/step';
import { sfx } from './resources';
import { G } from './state';

/** One handler per player state (S_*). */
const STATE_HANDLERS: Readonly<Record<number, (s: PlayerStep) => void>> = {
  [S_QUIET]: standStill,
  [S_WALKING_RIGHT]: (s) => walk(s, 1),
  [S_WALKING_LEFT]: (s) => walk(s, -1),
  [S_UNCONTROLED_FALL]: fallUncontrolled,
  [S_CONTROLED_FALL]: fallControlled,
  [S_JUMPING]: jump,
  [S_STOPPED_JUMPING]: jumpStopped,
  [S_QUIET_SWORD]: swingStanding,
  [S_UC_FALL_SWORD]: swingFallingUncontrolled,
  [S_C_FALL_SWORD]: swingFallingControlled,
  [S_JUMPING_SWORD]: swingJumping,
  [S_SJ_SWORD]: swingJumpStopped,
  [S_UP_LADDER]: climbUp,
  [S_DOWN_LADDER]: climbDown,
  [S_QUIET_LADDER]: holdOnLadder,
  [S_SWORD_LADDER]: swingOnLadder,
  [S_HIT]: knockedBack,
  [S_HIT_COLISION]: hitInPlace,
  [S_HIT_RECOVERY]: recoverFromHit,
  [S_DEATH]: die,
  [S_DOORPASS]: passDoor,
  [S_SLOWDOORPASS]: passDoorSlowly,
  [S_ENTERING_PASSAGE]: enterPassage,
  [S_ENTERING_WORLD]: enterWorld,
};

export function updatePlayer(): void {
  const oldX = G.playerX;
  const oldY = G.playerY;

  // World 8 without item 6: left/right are swapped (restored at the end).
  const invertMove = G.world === 8 && !G.items[6];
  if (invertMove) swapLeftRight();

  // SDL_PumpEvents() is part of getKeyboardState() here.
  // Collision mask: ladder walls only stop a character that is not on a ladder.
  const s = new PlayerStep(
    getKeyboardState(),
    G.onLadder === -1 ? T_WALL | T_LADDER_WALL | T_DOOR_WALL : T_WALL | T_DOOR_WALL,
  );

  if (
    G.onLadder === -1 &&
    (G.playerState === S_UP_LADDER || G.playerState === S_DOWN_LADDER || G.playerState === S_QUIET_LADDER)
  ) {
    G.playerState = S_QUIET;
    G.playerFrame = 0;
  }

  // Is the character in a position to climb a ladder?
  if (G.playerState === S_QUIET || G.playerState === S_WALKING_RIGHT || G.playerState === S_WALKING_LEFT) {
    findLadders(s);
  }

  if (G.playerState !== S_ENTERING_PASSAGE && G.playerState !== S_ENTERING_WORLD) checkEnemyContact();
  checkWater();
  checkLava();
  useBible(s);

  if (G.playerState !== S_JUMPING) G.jumpingFromElevator = false;

  if (G.frozen > 0) {
    // Frozen (white bear bullet): shake left and right.
    G.frozen--;
    if ((G.frozen & 0x01) === 0) {
      if ((G.frozen & 0x02) === 0) {
        s.nextX = G.playerX + TILE_UNIT;
      } else {
        s.nextX = G.playerX - TILE_UNIT;
      }
    }
  } else {
    STATE_HANDLERS[G.playerState]?.(s);
  }

  // Check collisions:
  const base = characterTile();
  moveCharacter(s, base);
  correctPosition(s, base);
  releaseLadderWhenHit(s, base);

  // Correct the sword's position:
  if (G.sword) {
    G.swordX += G.playerX - oldX;
    G.swordY += G.playerY - oldY;
  }

  for (const c of [0, 1]) {
    if (G.experience[c] >= 96) {
      playSound(sfx.powerup);
      G.energy[c] = G.maxEnergy[c];
      G.experience[c] = 0;
    }
  }

  if (invertMove) swapLeftRight();
}

function swapLeftRight(): void {
  [G.keyLeft, G.keyRight] = [G.keyRight, G.keyLeft];
}

/** CTRL with the bible (item 19): pause the music for a while (128 cycles). */
function useBible(s: PlayerStep): void {
  if (
    G.items[19] &&
    (s.justPressed(SDLK_LCTRL) || s.justPressed(SDLK_RCTRL)) &&
    G.bibleCounter > 0 &&
    G.bibleSubcounter === 0
  ) {
    G.bibleCounter--;
    G.bibleSubcounter = 128;
    pauseMusic();
  }

  if (G.bibleSubcounter > 0) {
    if ((G.bibleSubcounter & 0xf) === 0) {
      playSound(sfx.bible);
    }
    G.bibleSubcounter--;
    if (G.bibleSubcounter === 0) {
      resumeMusic();
    }
  }
}
