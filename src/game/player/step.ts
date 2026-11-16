/**
 * The per-frame context of updatePlayer and the helpers shared by the player
 * state handlers (key tests, collision tests, the sword).
 *
 * Positions passed to the collision helpers are room coordinates; the helpers
 * add GAME_VIEW_X/Y. All collision tests read G.collision, which holds what was
 * drawn this frame, so the order of the tests is part of the behaviour.
 */
import { playSound } from '../../platform/audio';
import type { SDLKey } from '../../platform/keyboard';
import {
  GAME_VIEW_X,
  GAME_VIEW_Y,
  MASK_OFFSET,
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
  S_WALKING_LEFT,
  S_WALKING_RIGHT,
  TILE_SIZE_X,
  TILE_UNIT,
} from '../constants';
import { fireWeapon } from '../gameinteractions';
import { sfx, tileIds } from '../resources';
import { G } from '../state';
import { tileHits } from '../tiledraw';

/** What one call of updatePlayer works with: this frame's keys and the movement being built up. */
export class PlayerStep {
  /** Where the character wants to go this frame; the collision pass decides where it ends up. */
  nextX = G.playerX;
  nextY = G.playerY;
  /** Index of a ladder the character can climb up from here, or -1. */
  ladderUp = -1;
  /** Index of a ladder the character can climb down from here, or -1. */
  ladderDown = -1;

  constructor(
    /** This frame's keyboard state. */
    readonly keys: Uint8Array,
    /** The collision types that stop the character (the falling states widen it). */
    public collision: number,
  ) {}

  /** Is `key` down this frame? */
  held(key: SDLKey): boolean {
    return !!this.keys[key];
  }

  /** Was `key` pressed this frame (down now, up in the previous frame)? */
  justPressed(key: SDLKey): boolean {
    return !!this.keys[key] && !G.oldKeyboard[key];
  }

  /**
   * Would the character's collision mask (character tile `base`, current
   * frame) at room position (x, y) touch anything in `collision`?
   */
  collides(base: number, x: number, y: number): boolean {
    return touches(base + G.playerFrame + MASK_OFFSET, x, y, this.collision);
  }
}

/** The first tile of the current character, facing the current way. */
export function characterTile(): number {
  return G.facingRight ? tileIds.character[G.character] : tileIds.characterInv[G.character];
}

/** Does tile `tile` drawn at room position (x, y) cover any of the collision types in `mask`? */
export function touches(tile: number, x: number, y: number, mask: number): boolean {
  return (tileHits(tile, GAME_VIEW_X + x, GAME_VIEW_Y + y) & mask) !== 0;
}

/** Fire the secondary weapon when its key was just pressed. */
export function fireWeaponOnKey(s: PlayerStep): void {
  if (s.justPressed(G.keyWeapon)) fireWeapon();
}

/**
 * Start a sword swing from the current (walking, falling or jumping) state.
 *
 * The C++ code repeats a chain of `if (playerState == …)` tests in every state
 * that can swing. Each branch moves to a sword state that no later branch
 * tests, so the chain is a switch; every state lists only the branches its
 * own code can reach.
 */
export function swingSword(): void {
  playSound(sfx.sword);
  switch (G.playerState) {
    case S_UNCONTROLED_FALL:
      // (The C++ standing/walking states also reset playerSubState here, which they had just set to 0.)
      G.playerState = S_UC_FALL_SWORD;
      G.swordTime = 0;
      G.playerFrame = 3;
      break;
    case S_CONTROLED_FALL:
      G.playerState = S_C_FALL_SWORD;
      G.swordTime = 0;
      G.playerFrame = 4;
      break;
    case S_STOPPED_JUMPING:
      G.playerState = S_SJ_SWORD;
      G.swordTime = 0;
      G.playerFrame = 4;
      break;
    case S_JUMPING:
      G.playerState = S_JUMPING_SWORD;
      G.swordTime = 0;
      G.playerFrame = 4;
      break;
    case S_QUIET:
    case S_WALKING_LEFT:
    case S_WALKING_RIGHT:
      G.playerState = S_QUIET_SWORD;
      G.swordTime = 0;
      G.playerSubState = 0;
      G.playerFrame = 3;
      break;
  }
}

/** Hold the sword out level (standing, or on a ladder). */
export function holdSwordLevel(): void {
  G.sword = true;
  if (G.facingRight) G.swordX = G.playerX + 2 * TILE_SIZE_X + 3 * TILE_UNIT;
  else G.swordX = G.playerX - 2 * TILE_SIZE_X - 5 * TILE_UNIT;
  G.swordY = G.playerY;
}

/** Hold the sword out low (jumping or falling). */
export function holdSwordLow(): void {
  G.sword = true;
  if (G.facingRight) G.swordX = G.playerX + 2 * TILE_SIZE_X;
  else G.swordX = G.playerX - 2 * TILE_SIZE_X - 2 * TILE_UNIT;
  G.swordY = G.playerY + TILE_UNIT;
}
