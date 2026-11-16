/**
 * Moving the character from (playerX, playerY) towards (nextX, nextY) against
 * the walls in the collision buffer.
 */
import {
  MASK_OFFSET,
  MAX_LEVERS,
  S_HIT,
  S_HIT_COLISION,
  S_HIT_RECOVERY,
  S_QUIET,
  TILE_SIZE_X,
  TILE_SIZE_Y,
  TILE_UNIT,
  T_LADDER_WALL,
} from '../constants';
import { idiv } from '../cutil';
import { tileIds } from '../resources';
import { G } from '../state';
import { PlayerStep, touches } from './step';

/**
 * Move to (s.nextX, s.nextY), or as close as the walls allow, with the
 * character tile `base`. Sets previousXCollision/previousYCollision; may
 * change s.nextY (it is the loop variable of the vertical search).
 */
export function moveCharacter(s: PlayerStep, base: number): void {
  const blocked = (x: number, y: number): boolean => s.collides(base, x, y);
  let testXCol = false;
  let found = false;

  G.previousYCollision = false;
  if (blocked(s.nextX, s.nextY)) {
    const inc = s.nextY > G.playerY ? -1 : 1;
    if (s.nextY > G.playerY) {
      // Moving down into a wall: when already stuck, first look sideways.
      if (blocked(G.playerX, G.playerY)) found = slideTo(s.nextX, s.nextY, blocked);
      // Then come up from nextY towards the old position until free.
      for (s.nextY += inc; !found && s.nextY !== G.playerY; s.nextY += inc) {
        if (!blocked(G.playerX, s.nextY)) {
          G.playerY = s.nextY;
          testXCol = true;
          found = true;
        }
      }
    } else if (s.nextY < G.playerY) {
      // Moving up into a wall: come down from nextY, looking sideways at each row.
      for (; !found && s.nextY !== G.playerY; s.nextY += inc) {
        found = slideTo(s.nextX, s.nextY, blocked);
      }
      if (!found) G.previousYCollision = true;
    }
  } else if (s.nextY >= G.playerY) {
    // NOTE (original): the C++ declares a new `found` here that shadows the outer
    // one, so the outer `found` stays false and the x-collision test below always runs.
    if (!landOnTransporter(s)) {
      G.playerY = s.nextY;
      testXCol = true;
    }
  } else {
    G.playerY = s.nextY;
    testXCol = true;
  }

  if (testXCol || !found) {
    if (blocked(s.nextX, G.playerY)) {
      slideTo(s.nextX, G.playerY, blocked);
      G.previousXCollision = true;
    } else {
      G.previousXCollision = false;
      G.playerX = s.nextX;
    }
  }
}

/**
 * Put the character at the first free x of x, x+1, x-1, x+2, x-2, … (up to
 * half a tile) on row y; false if there is none.
 */
function slideTo(x: number, y: number, blocked: (x: number, y: number) => boolean): boolean {
  for (let i = 0; i <= idiv(TILE_SIZE_X, 2); i++) {
    if (!blocked(x + i, y)) {
      G.playerX = x + i;
      G.playerY = y;
      return true;
    }
    if (!blocked(x - i, y)) {
      G.playerX = x - i;
      G.playerY = y;
      return true;
    }
  }
  return false;
}

/** Has the character landed on top of a transporter (the elevators of the castle)? Then stand on it. */
function landOnTransporter(s: PlayerStep): boolean {
  for (let i = 0; i < MAX_LEVERS; i++) {
    if (
      G.world === 0 &&
      G.roomX === G.leverRoomX[i] &&
      G.roomY === G.leverRoomY[i] &&
      G.playerY >= G.leverY[i] - TILE_SIZE_Y * 2 &&
      G.playerY < G.leverY[i] &&
      G.playerX > G.leverX[i] - (TILE_SIZE_X * 2 - 4 * TILE_UNIT) &&
      G.playerX < G.leverX[i] + 4 * TILE_SIZE_X - 3 * TILE_UNIT
    ) {
      G.playerY = G.leverY[i] - TILE_SIZE_Y * 2;
      G.playerX = s.nextX;
      return true;
    }
  }
  return false;
}

/** Push a standing (or hit) character that ended up inside a wall back out. */
export function correctPosition(s: PlayerStep, base: number): void {
  if (
    (G.playerState === S_QUIET ||
      G.playerState === S_HIT ||
      G.playerState === S_HIT_RECOVERY ||
      G.playerState === S_HIT_COLISION) &&
    s.collides(base, G.playerX, G.playerY)
  ) {
    const wallAt = (): boolean => touches(tileIds.collision, G.playerX, G.playerY, s.collision);
    // NOTE (original): all four tests are identical, so the corrections below never apply.
    const leftCol = wallAt();
    const rightCol = wallAt();
    const upCol = wallAt();
    const downCol = wallAt();

    if (leftCol && !rightCol) G.playerX += TILE_UNIT;
    if (!leftCol && rightCol) G.playerX -= TILE_UNIT;
    if (upCol && !downCol) G.playerY += TILE_UNIT;
    if (!upCol && downCol) G.playerY -= TILE_UNIT;
  }
}

/**
 * When on a ladder and hit by an enemy, don't leave the ladder until no longer
 * colliding with the passable blocks above the ladder.
 */
export function releaseLadderWhenHit(s: PlayerStep, base: number): void {
  if (G.onLadder !== -1 && (G.playerState === S_HIT || G.playerState === S_HIT_COLISION)) {
    if (!touches(base + G.playerFrame + MASK_OFFSET, s.nextX, s.nextY, T_LADDER_WALL)) {
      G.onLadder = -1;
    }
  }
}
