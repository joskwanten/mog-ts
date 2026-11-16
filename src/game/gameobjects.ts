/**
 * Port of GameObjectAnimation (gameobjects.cpp): the per-frame update of all
 * room objects. The non-enemy object types are handled here; every enemy
 * `case` of the big switch lives in enemies/enemiesA.ts / enemiesB.ts.
 *
 * Control flow notes (checked against the C++):
 * - No code follows the enemy switch inside the loop body, and no case uses
 *   `continue`, `goto` or `return`, so dispatching to one function per case
 *   and returning from it is equivalent to the C `break`.
 * - No case modifies the loop variable `i`. The function-level locals `j`,
 *   `t_x`, `t_y` are always assigned before being read inside the case that
 *   uses them, so they become locals of those case functions.
 * - `collision` and `firstJumpingBush` live in `ctx` (one per call), as in C:
 *   `collision` is reset before every enemy; `firstJumpingBush` persists
 *   across the loop.
 */
import { playSound } from '../platform/audio';
import {
  T_ARMOUR,
  T_ARMOUR_ARROW,
  T_BROKEN_STONE,
  T_DOOR_WALL,
  T_ENEMY,
  T_EXPLOSION,
  T_FAIRY,
  T_FAIRY_BUBBLE,
  T_ITEM,
  T_LADDER_WALL,
  T_MINE_EXP,
  T_NADA,
  T_PAMPERSE,
  T_PAMPERSE_BALL,
  T_RFL_ARROW,
  T_RFL_ARROW2,
  T_RFL_FIRE,
  T_RFL_RFIRE,
  T_WALL,
  T_WEAPON_ARROW,
  T_WEAPON_ARROW2,
  T_WEAPON_FIRE,
  T_WEAPON_MINE,
  T_WEAPON_RFIRE,
  TILE_SIZE_X,
  TILE_SIZE_Y,
} from './constants';
import { idiv, rand } from './cutil';
import { ENEMY_UPDATERS_A } from './enemies/enemiesA';
import { ENEMY_UPDATERS_B } from './enemies/enemiesB';
import type { EnemyUpdater, ObjAnimCtx } from './enemies/types';
import { addObject } from './gameaux';
import { GameObject } from './object';
import { sfx, tileIds } from './resources';
import { G } from './state';

/** `switch (G.objects[i].enemy)`: one updater per enemy type. */
let ENEMY_UPDATERS: Record<number, EnemyUpdater> | null = null;

/** Merged lazily so circular module imports can never see a half-initialised table. */
function enemyUpdaters(): Record<number, EnemyUpdater> {
  if (ENEMY_UPDATERS === null) ENEMY_UPDATERS = { ...ENEMY_UPDATERS_A, ...ENEMY_UPDATERS_B };
  return ENEMY_UPDATERS;
}

export function animateObjects(): void {
  let i: number;
  const ctx: ObjAnimCtx = { collision: 0, firstJumpingBush: true };

  // Object animations:
  for (i = 0; i < G.objectCount; i++) {
    const o = G.objects[i];
    if (o.lastHit > 0) o.lastHit--;

    if (o.type === T_BROKEN_STONE) brokenStone(o);

    if (o.type === T_EXPLOSION) explosion(o);

    if (o.type === T_WEAPON_ARROW || o.type === T_WEAPON_ARROW2) flyingArrow(o);

    if (o.type === T_RFL_ARROW || o.type === T_RFL_ARROW2 || o.type === T_RFL_FIRE || o.type === T_RFL_RFIRE)
      reflectedWeapon(o);

    if (o.type === T_WEAPON_FIRE) flyingFire(o);

    if (o.type === T_WEAPON_RFIRE) rollingFire(o);

    if (o.type === T_WEAPON_MINE) mine(o);

    if (o.type === T_MINE_EXP) mineExplosion(o);

    if (o.type === T_FAIRY_BUBBLE) fairyBubble(o);

    if (o.type === T_FAIRY) fairy(o);

    if (o.type === T_ARMOUR) armour(o);

    if (o.type === T_ENEMY && G.bibleSubcounter === 0) {
      ctx.collision = T_WALL | T_LADDER_WALL | T_DOOR_WALL;
      // switch(G.object[i].enemy): nothing follows the switch in the loop body.
      enemyUpdaters()[o.enemy]?.(i, ctx);
    }
  }
}

/** A broken stone counts down, then becomes its content (item, key, enemy, …). */
function brokenStone(o: GameObject): void {
  o.size--;
  if (o.size === 0) {
    if (o.state2 === 0) {
      o.type = T_NADA;
    } else {
      // Give specific objects:
      switch (o.state2) {
        case -1:
          o.type = T_ITEM;
          o.size = 10;
          o.state = -1;
          break;
        case -2:
          o.type = T_ITEM;
          o.size = 2;
          o.state = -2;
          break;
        case -3:
          o.type = T_ITEM;
          o.size = 50;
          o.state = -3;
          break;
        default:
          // Objects that are not coins, keys or arrows:
          if (o.state2 < 37) {
            // Weapon or item:
            if (!G.items[o.state2 - 1]) {
              o.type = T_ITEM;
              o.state = o.state2 - 1;
              if (o.state >= 32) {
                // Weapon objects are smaller:
                o.y += TILE_SIZE_Y;
              }
            } else {
              o.type = T_NADA;
            }
          } else {
            o.type = T_NADA;
            if (o.state2 === 38 && G.nextWorld === 0 && !G.hasWorldKey) {
              // World key:
              o.type = T_ITEM;
              o.state = 37;
            }
            if (o.state2 === 37 && !G.hasCross) {
              // Cross:
              o.type = T_ITEM;
              o.state = 36;
            }
            if (o.state2 === 39) {
              // Enemy:
              o.type = T_ENEMY;
              o.enemy = T_PAMPERSE_BALL;
              o.size = 20;
              o.state = 0;
              o.state2 = 0;
              o.baseTile = tileIds.pamperseball;
              o.tile = 0;
            }
            if (o.state2 === 40) {
              // Pamperse:
              o.type = T_PAMPERSE;
            }
          }
      }
    }
  }
}

/** Explosion animation (enemy killed). */
function explosion(o: GameObject): void {
  o.size--;
  if (o.size === 0) {
    switch (o.state) {
      case 0:
        o.type = T_NADA;
        break;
      case 1:
        switch (rand() % 30) {
          case 0:
          case 2:
          case 3:
            o.type = T_ITEM;
            o.size = 1;
            o.state = -1;
            break;
          case 4:
          case 5:
            o.type = T_ITEM;
            o.size = 1;
            o.state = -2;
            break;
          case 6:
          case 7:
          case 8:
            o.type = T_ITEM;
            o.size = 10;
            o.state = -3;
            break;
          default:
            o.type = T_NADA;
        }
        break;
      case 2:
        switch (rand() % 30) {
          case 0:
          case 1:
          case 2:
            o.type = T_ITEM;
            o.size = 5;
            o.state = -1;
            break;
          case 3:
          case 4:
            o.type = T_ITEM;
            o.size = 1;
            o.state = -2;
            break;
          case 5:
          case 6:
          case 7:
            o.type = T_ITEM;
            o.size = 20;
            o.state = -3;
            break;
          default:
            o.type = T_NADA;
        }
        break;
      case 3:
        switch (rand() % 3) {
          case 0:
            o.type = T_ITEM;
            o.size = 1;
            o.state = -1;
            break;
          case 1:
            o.type = T_ITEM;
            o.size = 1;
            o.state = -2;
            break;
          case 2:
            o.type = T_ITEM;
            o.size = 10;
            o.state = -3;
            break;
          default:
            o.type = T_NADA;
        }
        break;
    }
  }
}

/** Arrows (normal and ceramic) fly horizontally. */
function flyingArrow(o: GameObject): void {
  if (o.type === T_WEAPON_ARROW) {
    if (o.state === 0) o.x += TILE_SIZE_X;
    else o.x -= TILE_SIZE_X;
  }
  if (o.type === T_WEAPON_ARROW2) {
    if (o.state === 0) o.x += idiv(TILE_SIZE_X, 2);
    else o.x -= idiv(TILE_SIZE_X, 2);
  }

  if (o.x < -2 * TILE_SIZE_X || o.x > G.roomWidth * TILE_SIZE_X) {
    o.type = T_NADA;
    G.firedArrows--;
  }
}

/** Arrows/fire reflected by an armour fly back diagonally. */
function reflectedWeapon(o: GameObject): void {
  if (o.type === T_RFL_ARROW || o.type === T_RFL_FIRE || o.type === T_RFL_RFIRE) {
    if (o.state === 0) o.x -= TILE_SIZE_X;
    else o.x += TILE_SIZE_X;
  }
  if (o.type === T_RFL_ARROW2) {
    if (o.state === 0) o.x -= idiv(TILE_SIZE_X, 2);
    else o.x += idiv(TILE_SIZE_X, 2);
  }
  o.y -= TILE_SIZE_Y;

  if (o.x < -2 * TILE_SIZE_X || o.x > G.roomWidth * TILE_SIZE_X || o.y < 0) {
    G.firedArrows--;
    o.type = T_NADA;
  }
}

/** Fire (secondary weapon). */
function flyingFire(o: GameObject): void {
  if (o.state === 0) o.x += idiv(TILE_SIZE_X, 2);
  else o.x -= idiv(TILE_SIZE_X, 2);
  if (o.x < -2 * TILE_SIZE_X || o.x > G.roomWidth * TILE_SIZE_X || o.y > G.roomHeight * TILE_SIZE_Y) {
    o.type = T_NADA;
    G.firedArrows--;
  }
}

/** Rolling fire (secondary weapon). */
function rollingFire(o: GameObject): void {
  o.state2++;
  if (((o.state2 >> 2) & 0x01) === 0) o.tile = 2;
  else o.tile = 21;
  switch (o.state) {
    case 0:
      o.x += idiv(TILE_SIZE_X, 2);
      break;
    case 1:
      o.x -= idiv(TILE_SIZE_X, 2);
      break;
    case 2:
      o.y -= idiv(TILE_SIZE_Y, 2);
      break;
    case 3:
      o.y += idiv(TILE_SIZE_Y, 2);
      break;
  }
  if (o.x < -2 * TILE_SIZE_X || o.x > G.roomWidth * TILE_SIZE_X || o.y > G.roomHeight * TILE_SIZE_Y || o.state2 >= 64) {
    o.type = T_NADA;
    G.firedArrows--;
  }
}

/** Mine waiting to explode. */
function mine(o: GameObject): void {
  const off = [0, 1, 2, 1];
  o.state++;
  o.tile = 9 + off[(o.state >> 2) % 4];
}

/** Mine explosion. */
function mineExplosion(o: GameObject): void {
  o.state++;
  o.tile = 12 + ((o.state >> 2) % 2);
  if (o.state >= 64) o.type = T_NADA;
}

/** Bubbles around the fairy. */
function fairyBubble(o: GameObject): void {
  o.state3 = (o.state3 + 1) % 16;

  o.x += o.state;
  o.y += o.state2;

  if (o.x < 2 * TILE_SIZE_X) {
    o.state = (rand() % 2) + 1;
    if (o.y < 10 * TILE_SIZE_Y) {
      o.state2 = (rand() % 2) + 1;
    } else {
      o.state2 = -((rand() % 2) + 1);
    }
  }
  if (o.x > 30 * TILE_SIZE_X) {
    o.state = -((rand() % 2) + 1);
    if (o.y < 10 * TILE_SIZE_Y) {
      o.state2 = (rand() % 2) + 1;
    } else {
      o.state2 = -((rand() % 2) + 1);
    }
  }
  if (o.y < 2 * TILE_SIZE_Y) {
    o.state2 = (rand() % 2) + 1;
    if (o.x < 16 * TILE_SIZE_X) {
      o.state = (rand() % 2) + 1;
    } else {
      o.state = -((rand() % 2) + 1);
    }
  }
  if (o.y > 18 * TILE_SIZE_Y) {
    o.state2 = -((rand() % 2) + 1);
    if (o.x < 16 * TILE_SIZE_X) {
      o.state = (rand() % 2) + 1;
    } else {
      o.state = -((rand() % 2) + 1);
    }
  }
}

/** The fairy. */
function fairy(o: GameObject): void {
  o.state3++;
  o.x += o.state;
  o.y += o.state2;

  if (o.state3 === 112) {
    o.size = 1;
    o.state = (rand() % 2) + 1;
    if (rand() % 2 === 0) o.state = -o.state;
    o.state2 = (rand() % 2) + 1;
    if (rand() % 2 === 0) o.state2 = -o.state2;
  }
  if (o.size === 1) {
    if ((o.state3 & 0x1f) === 0) {
      o.state = (rand() % 2) + 1;
      if (rand() % 2 === 0) o.state = -o.state;
      o.state2 = (rand() % 2) + 1;
      if (rand() % 2 === 0) o.state2 = -o.state2;
    }
    if (o.state3 >= 320) o.size = 2;
  }
  if (o.size >= 1) {
    if (o.x < 2 * TILE_SIZE_X) {
      o.state = (rand() % 2) + 1;
      if (o.y < 10 * TILE_SIZE_Y) {
        o.state2 = (rand() % 2) + 1;
      } else {
        o.state2 = -((rand() % 2) + 1);
      }
    }
    if (o.x > 30 * TILE_SIZE_X) {
      o.state = -((rand() % 2) + 1);
      if (o.y < 10 * TILE_SIZE_Y) {
        o.state2 = (rand() % 2) + 1;
      } else {
        o.state2 = -((rand() % 2) + 1);
      }
    }
    if (o.y < 2 * TILE_SIZE_Y) {
      o.state2 = (rand() % 2) + 1;
      if (o.x < 16 * TILE_SIZE_X) {
        o.state = (rand() % 2) + 1;
      } else {
        o.state = -((rand() % 2) + 1);
      }
    }
    if (o.y > 18 * TILE_SIZE_Y) {
      o.state2 = -((rand() % 2) + 1);
      if (o.x < 16 * TILE_SIZE_X) {
        o.state = (rand() % 2) + 1;
      } else {
        o.state = -((rand() % 2) + 1);
      }
    }
  }
}

/** Living armours (they shoot arrows). */
function armour(o: GameObject): void {
  if (o.state === 0) {
    if (G.playerY === o.y + TILE_SIZE_Y && G.playerX < o.x && G.playerX + 8 * TILE_SIZE_X > o.x) {
      o.state2++;
    } else {
      o.state2 = 0;
    }
    if (o.state2 >= 64 && rand() % 32 === 0) {
      // Fire arrows:
      playSound(sfx.karrow);
      const arrow = addObject(T_ENEMY, o.x - 2 * TILE_SIZE_X, o.y, 0, T_ARMOUR_ARROW, 0);
      G.objects[arrow].baseTile = tileIds.armourarrow;
      o.tile = 0;
    }
  } else {
    if (G.playerY === o.y + TILE_SIZE_Y && G.playerX > o.x && G.playerX - 8 * TILE_SIZE_X < o.x) {
      o.state2++;
    } else {
      o.state2 = 0;
    }
    if (o.state2 >= 64 && rand() % 32 === 0) {
      // Fire arrows:
      playSound(sfx.karrow);
      const arrow = addObject(T_ENEMY, o.x + 2 * TILE_SIZE_X, o.y, 0, T_ARMOUR_ARROW, 1);
      G.objects[arrow].baseTile = tileIds.armourarrow;
      o.tile = 1;
    }
  }
}
