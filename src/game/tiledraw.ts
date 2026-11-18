/**
 * Short forms for drawing game tiles and testing collisions.
 *
 * The game draws everything into a SCREEN_X×SCREEN_Y RGBA frame buffer and
 * paints each tile's collision type into G.collision at the same pixels.
 * These helpers fix the common arguments (the collision buffer and the screen
 * size). Positions are screen coordinates; most callers add GAME_VIEW_X/Y to
 * room coordinates. Sizes default to a 2×2-tile sprite (32×32 pixels).
 */
import type { Screen } from '../engine/screen';
import { SCREEN_X, SCREEN_Y, TILE_SIZE_X, TILE_SIZE_Y } from './constants';
import { G } from './state';

const SPRITE_W = TILE_SIZE_X * 2;
const SPRITE_H = TILE_SIZE_Y * 2;

/** Draw tile `t` scaled to w×h and paint its collision type. */
export function drawTile(screen: Screen, t: number, x: number, y: number, w = SPRITE_W, h = SPRITE_H): void {
  G.tiles[t].draw(x, y, w, h, screen, G.collision!, SCREEN_X, SCREEN_Y, SCREEN_X);
}

/** Draw tile `t` showing its in-between frame `phase` if it has one (render-only), and paint its collision type. */
export function drawTilePhase(
  screen: Screen,
  t: number,
  phase: number,
  x: number,
  y: number,
  w = SPRITE_W,
  h = SPRITE_H,
): void {
  G.tiles[t].drawPhase(x, y, w, h, screen, G.collision!, SCREEN_X, SCREEN_Y, SCREEN_X, phase);
}

/** Draw tile `t` at its own size and paint its collision type. */
export function drawTileNative(screen: Screen, t: number, x: number, y: number): void {
  G.tiles[t].drawNative(x, y, screen, G.collision!, SCREEN_X, SCREEN_Y, SCREEN_X);
}

/** Draw tile `t` with `cut` rows hidden (characters entering a door); no collision. */
export function drawTileCut(
  screen: Screen,
  t: number,
  x: number,
  y: number,
  cut: number,
  w = SPRITE_W,
  h = SPRITE_H,
): void {
  G.tiles[t].drawCut(x, y, w, h, screen, G.collision!, SCREEN_X, SCREEN_Y, SCREEN_X, cut);
}

/** Paint only the collision type of tile `t`. */
export function drawTileMask(t: number, x: number, y: number, w = SPRITE_W, h = SPRITE_H): void {
  G.tiles[t].drawMask(x, y, w, h, G.collision!, SCREEN_X, SCREEN_Y, SCREEN_X);
}

/** Draw tile `t` without painting a collision type. */
export function drawTileNoMask(screen: Screen, t: number, x: number, y: number, w = SPRITE_W, h = SPRITE_H): void {
  G.tiles[t].drawNoMask(x, y, w, h, screen, SCREEN_X, SCREEN_Y, SCREEN_X);
}

/** The collision types (OR-ed T_* bits) under the opaque pixels of tile `t` drawn at (x, y). */
export function tileHits(t: number, x: number, y: number, w = SPRITE_W, h = SPRITE_H): number {
  return G.tiles[t].collisionTest(x, y, w, h, G.collision!, SCREEN_X, SCREEN_Y, SCREEN_X);
}

/** Like tileHits, at the tile's own size. */
export function tileHitsNative(t: number, x: number, y: number): number {
  return G.tiles[t].collisionTestNative(x, y, G.collision!, SCREEN_X, SCREEN_Y, SCREEN_X);
}

/** The collision types painted at screen pixel (x, y) (undefined outside the buffer, like the C++ out-of-range read). */
export function collisionAt(x: number, y: number): number {
  return G.collision![x + y * SCREEN_X];
}
