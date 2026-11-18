/**
 * Light sources for the lighting effect (not in the remake). Read-only: this
 * looks at the game state after a frame and never changes it, so the game
 * plays the same with or without lighting.
 */
import {
  GAME_VIEW_X,
  GAME_VIEW_Y,
  State,
  T_BAT,
  T_EGG_EXPLOSION,
  T_ENEMY,
  T_EXPLOSION,
  T_FAIRY,
  T_FAIRY_BUBBLE,
  T_ITEM,
  T_LAVA,
  T_LAVA1,
  T_LAVA2,
  T_LAVA3,
  T_LIVINGWALL,
  T_MEGABAT,
  T_MEGABAT2,
  T_MEGABAT3,
  T_MINE_EXP,
  T_RFL_FIRE,
  T_RFL_RFIRE,
  T_VENT2,
  T_WEAPON_FIRE,
  T_WEAPON_RFIRE,
  T_WHITEFIREBALL,
  TILE_SIZE_X,
  TILE_SIZE_Y,
} from './constants';
import { G } from './state';

/** A round light at screen position (x, y) in game pixels. */
export interface Light {
  x: number;
  y: number;
  radius: number;
  r: number;
  g: number;
  b: number;
  intensity: number;
}

export interface SceneLighting {
  /** Whether the room is lit (only while playing; menus and shrines are shown as they are). */
  active: boolean;
  /** Brightness where no light falls (0..1). */
  ambient: number;
  lights: Light[];
  /** Glows behind the enemies (stronger behind dark ones such as bats) and the items, added to the picture. */
  halos: Light[];
}

export const MAX_LIGHTS = 64;
export const MAX_HALOS = 32;

/** Enemies without a halo: parts of the room rather than figures. */
const NO_HALO = new Set([T_LIVINGWALL, T_VENT2, T_LAVA1, T_LAVA2, T_LAVA3, T_EGG_EXPLOSION]);
/** Dark enemies that are hard to see get a stronger halo. */
const DARK_ENEMIES = new Set([T_BAT, T_MEGABAT, T_MEGABAT2, T_MEGABAT3]);
const HALO: [number, number, number] = [0.6, 0.5, 0.85];
const GOLD: [number, number, number] = [1.0, 0.8, 0.35];

const WARM: [number, number, number] = [1.0, 0.85, 0.6];
const FIRE: [number, number, number] = [1.0, 0.55, 0.2];
const FAIRY: [number, number, number] = [0.7, 0.9, 1.0];

function light(x: number, y: number, radius: number, [r, g, b]: [number, number, number], intensity: number): Light {
  return { x: GAME_VIEW_X + x, y: GAME_VIEW_Y + y, radius, r, g, b, intensity };
}

/** The lighting of the current frame. */
export function sceneLighting(): SceneLighting {
  const active = G.state === State.Playing || G.state === State.InterScreen;
  if (!active) return { active, ambient: 1, lights: [], halos: [] };

  const lights: Light[] = [];
  const halos: Light[] = [];
  // The characters carry a light.
  lights.push(light(G.playerX + TILE_SIZE_X, G.playerY + TILE_SIZE_Y, 150, WARM, 0.32));

  for (let i = 0; i < G.objectCount && lights.length < MAX_LIGHTS; i++) {
    const o = G.objects[i];
    const cx = o.x + TILE_SIZE_X;
    const cy = o.y + TILE_SIZE_Y;
    switch (o.type) {
      case T_WEAPON_FIRE:
      case T_WEAPON_RFIRE:
      case T_RFL_FIRE:
      case T_RFL_RFIRE:
        lights.push(light(cx, cy, 90, FIRE, 0.8));
        break;
      case T_EXPLOSION:
      case T_MINE_EXP:
        lights.push(light(cx, cy, 110, FIRE, 0.9));
        break;
      case T_FAIRY:
      case T_FAIRY_BUBBLE:
        lights.push(light(cx, cy, 80, FAIRY, 0.6));
        break;
      case T_ITEM:
        // Items lying in the room glow gold, gently pulsing; the real items (state >= 0) more
        // than coins, keys and arrows.
        if (G.state === State.Playing && halos.length < MAX_HALOS) {
          const pulse = 0.85 + 0.15 * Math.sin(G.frameCounter * 0.2 + i);
          halos.push(light(cx, cy, 34, GOLD, (o.state >= 0 ? 0.34 : 0.19) * pulse));
        }
        break;
      case T_ENEMY:
        if (o.enemy === T_WHITEFIREBALL) lights.push(light(cx, cy, 70, WARM, 0.6));
        // Halos only while playing: during the room change the screen is black and the
        // objects of the new room already exist.
        if (G.state === State.Playing && !NO_HALO.has(o.enemy) && halos.length < MAX_HALOS) {
          halos.push(light(cx + o.xoffs, cy + o.yoffs, 36, HALO, DARK_ENEMIES.has(o.enemy) ? 0.42 : 0.22));
        }
        break;
    }
  }

  // Lava glows: one light per lava cell, every other column (enough to light the room around it).
  const tiles = G.roomTiles;
  if (tiles !== null) {
    for (let row = 0; row < G.roomHeight; row++) {
      for (let col = 0; col < G.roomWidth && lights.length < MAX_LIGHTS; col += 2) {
        const t = G.tiles[tiles[col + row * G.roomWidth]];
        if (t !== undefined && t.collisionType === T_LAVA) {
          lights.push(light((col + 1) * TILE_SIZE_X, row * TILE_SIZE_Y + TILE_SIZE_Y / 2, 60, FIRE, 0.5));
        }
      }
    }
  }

  const ambient = G.roomDemonroom ? 0.82 : G.world === 0 ? 0.96 : 0.93;
  return { active, ambient, lights, halos };
}
