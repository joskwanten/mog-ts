/**
 * Enemy cases T_PIRANHA … T_PAMPERSE_BALL of animateObjects
 * (port of the second half of the enemy switch in gameobjects.cpp).
 *
 * Every `case T_XXX:` is one function; `break` became `return` (or stays a
 * `break` of an inner switch). Loop-level locals of the C++ function
 * (`collision`) come from ctx; `j`, `t_x`, `t_y` are locals here.
 */
import { playSound } from '../../platform/audio';
import {
  GAME_VIEW_X,
  GAME_VIEW_Y,
  SCREEN_X,
  SCREEN_Y,
  TILE_SIZE_X,
  TILE_SIZE_Y,
  TILE_UNIT,
  T_ARMOUR_ARROW,
  T_BDEMON,
  T_BDEMON_BULLET,
  T_BFLY_BULLET,
  T_BFLY_GIANT,
  T_BFLY_LARGE,
  T_BFLY_MEDIUM,
  T_BFLY_SMALL,
  T_BIRD,
  T_BUBBLE,
  T_CHICKEN,
  T_CHICKEN_EGG,
  T_CLOUD,
  T_CYCLOPS,
  T_CYCLOPS_BULLET,
  T_DEMON10_BALL,
  T_DEMON6_BULLET,
  T_DEMON7_BULLET,
  T_DEMON8_BULLET,
  T_DOOR_WALL,
  T_EGG_EXPLOSION,
  T_ENEMY,
  T_FLAME,
  T_FLAME_BULLET,
  T_GHOST,
  T_GHOST_BULLET,
  T_GLIZARD,
  T_GLIZARD_TONGUE,
  T_GORILLA,
  T_GREENMONKEY,
  T_HAIRY,
  T_HAIRYBULLET,
  T_HEAD,
  T_HEAD_BULLET,
  T_KNIGHTHEAD,
  T_LADDER_WALL,
  T_LCLOUD,
  T_LIGHTNING,
  T_LIGHTNING_FIRE,
  T_NADA,
  T_OCTOPUS,
  T_OWL,
  T_PACMAN,
  T_PAMPERSE_BALL,
  T_PIRANHA,
  T_PIRANHA2,
  T_PLANT,
  T_PLANT_BULLET,
  T_REDDRAGON,
  T_REDDRAGON_BULLET,
  T_ROCKMAN,
  T_SNAKE,
  T_SNAKE_BULLET,
  T_SPIDER,
  T_STONEMAN,
  T_STONEMAN_BULLET,
  T_TRANSFORMER,
  T_TRANSF_BULLET,
  T_WALL,
  T_WATERBUG,
  T_WATERDRAGON,
  T_WHITESTAR,
  T_WITCH2,
  T_WORM2,
} from '../constants';
import { idiv, rand, toInt } from '../cutil';
import { addObject, isWall, isWallOrBlocker } from '../gameaux';
import { sfx, tileIds } from '../resources';
import { G } from '../state';
import { collisionAt, tileHits, tileHitsNative } from '../tiledraw';
import type { EnemyUpdater, ObjAnimCtx } from './types';

function piranha(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  switch (o.state) {
    case 0:
    case 2:
      o.tile = o.state;
      if (o.state2 === 0) {
        // Decide how high it will jump
        o.state2 = o.state3 = (rand() % 16) + 12;
        playSound(sfx.enterwater);
      }
      if (o.state2 >= 16) o.y -= TILE_UNIT * 2;
      if (o.state2 >= 12) o.y -= TILE_UNIT * 2;
      if (o.state2 >= 8) o.y -= TILE_UNIT * 2;
      if (o.state2 >= 4) o.y -= TILE_UNIT * 2;
      if (o.state2 >= 2) o.y -= TILE_UNIT;
      o.state2--;
      if (o.state2 === 0) o.state++;
      break;
    case 1:
    case 3:
      o.tile = o.state;
      if (o.state2 >= 16) o.y += TILE_UNIT * 2;
      if (o.state2 >= 12) o.y += TILE_UNIT * 2;
      if (o.state2 >= 8) o.y += TILE_UNIT * 2;
      if (o.state2 >= 4) o.y += TILE_UNIT * 2;
      if (o.state2 >= 2) o.y += TILE_UNIT;
      o.state2++;
      if (o.state2 === o.state3) {
        o.enemy = T_PIRANHA2;
        o.state2 = 0;
        playSound(sfx.enterwater);
      }
      break;
  }
  if (o.state === 0 || o.state === 1) o.x += TILE_UNIT;
  else o.x -= TILE_UNIT;
}

function piranha2(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.tile = 4;
  o.state2++;
  if (o.state2 >= 16) o.type = T_NADA;
}

function whitestar(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const col: boolean[] = [false, false, false, false, false, false, false, false];

  switch (o.state3) {
    case 0:
      o.x += TILE_UNIT;
      break;
    case 1:
      o.x -= TILE_UNIT;
      break;
    case 2:
      o.y += TILE_UNIT;
      break;
    case 3:
      o.y -= TILE_UNIT;
      break;
  }
  o.state2++;
  if ((o.state2 & 0x01) === 0) o.tile = (o.tile + 1) % 2;

  if (o.x % TILE_SIZE_X === 0 && o.y % TILE_SIZE_Y === 0) {
    const tx = idiv(o.x, TILE_SIZE_X);
    const ty = idiv(o.y, TILE_SIZE_Y);

    col[0] = isWall(tx + 2, ty) || isWall(tx + 2, ty + 1);
    col[1] = isWall(tx - 1, ty) || isWall(tx - 1, ty + 1);
    col[2] = isWall(tx, ty + 2) || isWall(tx + 1, ty + 2);
    col[3] = isWall(tx, ty - 1) || isWall(tx + 1, ty - 1);

    col[4] = isWall(tx + 2, ty + 2);
    col[5] = isWall(tx - 1, ty + 2);
    col[6] = isWall(tx + 2, ty - 1);
    col[7] = isWall(tx - 1, ty - 1);

    if (col[0]) {
      if (o.state === 0) {
        o.state3 = 2;
      } else {
        o.state3 = 3;
      }
    }
    if (col[1]) {
      if (o.state === 0) {
        o.state3 = 3;
      } else {
        o.state3 = 2;
      }
    }
    if (col[2]) {
      if (o.state === 0) {
        o.state3 = 1;
      } else {
        o.state3 = 0;
      }
    }
    if (col[3]) {
      if (o.state === 0) {
        o.state3 = 0;
      } else {
        o.state3 = 1;
      }
    }
    if (!col[0] && !col[1] && !col[2] && !col[3]) {
      if (col[4]) {
        if (o.state === 0) {
          o.state3 = 2;
        } else {
          o.state3 = 0;
        }
      }
      if (col[5]) {
        if (o.state === 0) {
          o.state3 = 1;
        } else {
          o.state3 = 2;
        }
      }
      if (col[6]) {
        if (o.state === 0) {
          o.state3 = 0;
        } else {
          o.state3 = 3;
        }
      }
      if (col[7]) {
        if (o.state === 0) {
          o.state3 = 3;
        } else {
          o.state3 = 1;
        }
      }
    }
  }

  if (rand() % 500 === 0) o.state = (o.state + 1) % 2;
}

function spider(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state2++;
  if (o.state2 >= 48) o.state2 = 0;
  if (o.state2 < 16) o.tile = 0;
  if (o.state2 >= 16 && o.state2 < 24) o.tile = 1;
  if (o.state2 >= 24 && o.state2 < 40) o.tile = 2;
  if (o.state2 >= 40 && o.state2 < 48) o.tile = 1;
}

function knighthead(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  let j: number;
  o.state2++;
  if (o.state2 >= 256 && (o.state2 & 0x01f) >= 15) o.tile = 0;
  else o.tile = 1;
  if ((o.state2 & 0x1f) === 0 && o.state < 4 * TILE_SIZE_X) o.state += TILE_UNIT;
  o.xoffs = toInt(o.state * Math.cos(o.state2 / 10));
  o.yoffs = toInt(o.state * Math.sin(o.state2 / 10));
  if (rand() % 200 === 0) {
    playSound(sfx.enemybullet);
    j = addObject(T_ENEMY, o.x + TILE_SIZE_X + o.xoffs, o.y + TILE_SIZE_Y + o.yoffs, 0, T_BUBBLE, 0);
    object[j].state = G.playerX - o.x;
    object[j].state2 = G.playerY - (o.y + TILE_SIZE_Y);
    object[j].baseTile = tileIds.knighthead;
    object[j].tile = 2;
  }
}

function chicken(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  const collision = ctx.collision;
  o.state3++;
  switch (o.state) {
    case 0:
      o.tile = 2 + ((o.state3 >> 3) & 0x01);
      if (
        (tileHits(tileIds.chicken + o.tile, GAME_VIEW_X + o.x + 2 * TILE_UNIT, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x + 2 * TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x += 2 * TILE_UNIT;
      } else {
        o.state = 1;
      }
      break;
    case 1:
      o.tile = (o.state3 >> 3) & 0x01;
      if (
        (tileHits(tileIds.chicken + o.tile, GAME_VIEW_X + o.x - 2 * TILE_UNIT, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x - 2 * TILE_UNIT > 0 &&
        (collisionAt(GAME_VIEW_X + o.x - 2 * TILE_UNIT, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x -= 2 * TILE_UNIT;
      } else {
        o.state = 0;
      }
      break;
    case 2:
      o.tile = 1;
      if (o.state3 === 32) {
        // Fire an egg
        const obj = addObject(T_ENEMY, o.x, o.y, 0, T_CHICKEN_EGG, 0);
        object[obj].baseTile = tileIds.chicken;
        object[obj].tile = 4;
        object[obj].state3 = G.playerX;
        o.state2 = obj;
      }
      if (o.state3 >= 32 && object[o.state2].type === T_NADA) {
        o.state = 0;
      }
      break;
    case 3:
      o.tile = 3;
      if (o.state3 === 32) {
        // Fire an egg
        const obj = addObject(T_ENEMY, o.x, o.y, 0, T_CHICKEN_EGG, 0);
        object[obj].baseTile = tileIds.chicken;
        object[obj].tile = 4;
        object[obj].state3 = G.playerX;
        o.state2 = obj;
      }
      if (o.state3 >= 32 && object[o.state2].type === T_NADA) {
        o.state = 1;
      }
      break;
  }
  if (o.y === G.playerY && o.state < 2) {
    if (o.x < G.playerX) {
      o.state = 3;
      o.state3 = 0;
    } else {
      o.state = 2;
      o.state3 = 0;
    }
  }
}

function chickenEgg(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  if (o.state2 === 0) {
    // Check the path
    let tx: number;
    for (tx = o.x; tx !== o.state3; tx < o.state3 ? tx++ : tx--) {
      if (
        (tileHitsNative(tileIds.chicken + o.tile, GAME_VIEW_X + tx, GAME_VIEW_Y + o.y) & collision) !== 0 ||
        tx < 0 ||
        tx > G.roomWidth * TILE_SIZE_X ||
        (collisionAt(GAME_VIEW_X + tx + TILE_SIZE_X, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) === 0
      ) {
        if (tx < o.state3) {
          o.state3 = tx - 1;
        } else {
          o.state3 = tx + 1;
        }
      }
    }
  }
  o.state2++;
  o.tile = 4 + ((o.state2 >> 3) & 0x01);
  if (o.x < o.state3) {
    o.x++;
    if (o.state3 - o.x > 16) o.x += TILE_UNIT;
    if (o.state3 - o.x > 32) o.x += TILE_UNIT;
    if (o.state3 - o.x > 64) o.x += TILE_UNIT;
  } else {
    o.x--;
    if (o.x - o.state3 > 16) o.x -= TILE_UNIT;
    if (o.x - o.state3 > 32) o.x -= TILE_UNIT;
    if (o.x - o.state3 > 64) o.x -= TILE_UNIT;
  }
  if (o.state3 === o.x) {
    o.state3 = -1;
    o.state2 = 0;
    o.enemy = T_EGG_EXPLOSION;
  }
}

function eggExplosion(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state2++;
  if (o.state2 === 32) {
    playSound(sfx.chickenbomb);
    o.x -= TILE_SIZE_X;
    o.y -= TILE_SIZE_Y;
    o.tile = 7;
  }
  if (o.state2 === 40) {
    o.tile = 6;
  }
  if (o.state2 === 48) {
    o.type = T_NADA;
  }
}

function cloud(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  let j: number;
  o.tile = (o.state2 >> 3) % 2;
  switch (o.state3) {
    case 0:
      o.y += TILE_UNIT;
      break;
    case 1:
      o.y += TILE_UNIT;
      o.x -= TILE_UNIT;
      break;
    case 2:
      o.y -= TILE_UNIT;
      o.x -= TILE_UNIT;
      break;
    case 3:
      o.y -= TILE_UNIT;
      break;
    case 4:
      o.y -= TILE_UNIT;
      o.x += TILE_UNIT;
      break;
    case 5:
      o.y += TILE_UNIT;
      o.x += TILE_UNIT;
      break;
    case 6:
      o.x += TILE_UNIT;
      break;
    case 7:
      o.x -= TILE_UNIT;
      break;

    case 8:
      o.y += TILE_UNIT;
      o.x -= idiv(TILE_UNIT, 2);
      break;
    case 9:
      o.y -= TILE_UNIT;
      o.x -= idiv(TILE_UNIT, 2);
      break;
    case 10:
      o.y -= TILE_UNIT;
      o.x += idiv(TILE_UNIT, 2);
      break;
    case 11:
      o.y += TILE_UNIT;
      o.x += idiv(TILE_UNIT, 2);
      break;
  }
  o.state2++;
  if (
    (o.state2 >= 16 && o.state3 !== -1) ||
    (o.state2 >= 32 && o.state3 === -1) ||
    o.y === (G.roomHeight - 2) * TILE_SIZE_Y
  ) {
    o.state = 1;
    o.state2 = 0;

    // If the random number is greater than 11, keep the same direction
    j = o.state3;
    o.state3 = rand() % 32;
    if (o.state3 > 11) o.state3 = j;

    if (o.x > (G.roomWidth - 7) * TILE_SIZE_X) {
      if (o.state3 === 4) o.state3 = 2;
      if (o.state3 === 5) o.state3 = 1;
      if (o.state3 === 6) o.state3 = 7;
      if (o.state3 === 10) o.state3 = 9;
      if (o.state3 === 11) o.state3 = 8;
    }
    if (o.x < TILE_SIZE_X * 5) {
      if (o.state3 === 2) o.state3 = 4;
      if (o.state3 === 1) o.state3 = 5;
      if (o.state3 === 7) o.state3 = 6;
      if (o.state3 === 9) o.state3 = 10;
      if (o.state3 === 8) o.state3 = 11;
    }
    if (o.y > (G.roomHeight - 4) * TILE_SIZE_Y) {
      if (o.state3 === 0) o.state3 = 3;
      if (o.state3 === 1) o.state3 = 2;
      if (o.state3 === 5) o.state3 = 4;
      if (o.state3 === 11) o.state3 = 10;
      if (o.state3 === 8) o.state3 = 9;
    }
    if (o.y < TILE_SIZE_Y * 5) {
      if (o.state3 === 3) o.state3 = 0;
      if (o.state3 === 2) o.state3 = 1;
      if (o.state3 === 4) o.state3 = 5;
      if (o.state3 === 10) o.state3 = 11;
      if (o.state3 === 9) o.state3 = 8;
    }
  }
}

function rockman(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  o.state2++;
  switch (o.state) {
    case 0:
      o.tile = -1;
      if (o.state2 >= 64) {
        playSound(sfx.rockman);
        o.state = 1;
        o.state2 = 0;
      }
      break;
    case 1:
      if (o.state2 < 8) o.tile = 0;
      if (o.state2 >= 8 && o.state2 < 16) o.tile = 1;
      if (o.state2 >= 16 && o.state2 < 24) o.tile = 2;
      if (o.state2 >= 24) {
        if (o.state3 === 0) o.tile = 3;
        else o.tile = 5;
      }
      if (o.state2 >= 32) {
        o.state = 2;
        o.state2 = 0;
      }
      break;
    case 2:
      if (o.state3 === 0) {
        o.tile = 3 + ((o.state2 >> 3) & 0x01);
        if (
          (tileHits(tileIds.rockman + o.tile, GAME_VIEW_X + o.x + 2 * TILE_UNIT, GAME_VIEW_Y + o.y) & collision) ===
            0 &&
          o.x + 2 * TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
          (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
        ) {
          o.x += TILE_UNIT;
        } else {
          o.state3 = 1;
        }
      } else {
        o.tile = 5 + ((o.state2 >> 3) & 0x01);
        if (
          (tileHits(tileIds.rockman + o.tile, GAME_VIEW_X + o.x - 2 * TILE_UNIT, GAME_VIEW_Y + o.y) & collision) ===
            0 &&
          o.x - 2 * TILE_UNIT > 0 &&
          (collisionAt(GAME_VIEW_X + o.x - 2 * TILE_UNIT, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
        ) {
          o.x -= TILE_UNIT;
        } else {
          o.state3 = 0;
        }
      }
      if (o.state2 >= 128 && rand() % 400 === 0) {
        playSound(sfx.rockman);
        o.state = 3;
        o.state2 = 0;
      }
      break;
    case 3:
      if (o.state2 >= 24) o.tile = 0;
      if (o.state2 >= 16 && o.state2 < 24) o.tile = 1;
      if (o.state2 >= 8 && o.state2 < 16) o.tile = 2;
      if (o.state2 < 8) {
        if (o.state3 === 0) o.tile = 3;
        else o.tile = 5;
      }
      if (o.state2 >= 32) {
        o.state = 0;
        o.state2 = -(rand() % 8) * 8;
      }
      break;
  }
}

/** T_BFLY_SMALL / T_BFLY_MEDIUM / T_BFLY_LARGE / T_BFLY_GIANT share this body. */
function bfly(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  let j: number;
  if (o.enemy === T_BFLY_SMALL) o.tile = 1 + ((o.state >> 3) & 0x01);
  if (o.enemy === T_BFLY_MEDIUM) o.tile = 3 + ((o.state >> 3) & 0x01);
  if (o.enemy === T_BFLY_LARGE) o.tile = 5 + ((o.state >> 3) & 0x01);
  if (o.enemy === T_BFLY_GIANT) o.tile = 7 + ((o.state >> 4) & 0x01);
  o.state2++;
  o.state++;

  if (o.unionX !== -1) {
    // Fusing butterflies
    if (o.x > o.unionX + TILE_UNIT * 4) {
      o.x -= TILE_UNIT * 4;
    } else {
      if (o.x < o.unionX - TILE_UNIT * 4) {
        o.x += TILE_UNIT * 4;
      } else {
        o.x = o.unionX;
      }
    }
    if (o.y > o.unionY + TILE_UNIT * 4) {
      o.y -= TILE_UNIT * 4;
    } else {
      if (o.y < o.unionY - TILE_UNIT * 4) {
        o.y += TILE_UNIT * 4;
      } else {
        o.y = o.unionY;
      }
    }

    if (o.x === o.unionX && o.y === o.unionY && o.x === object[o.desiredFloor].x && o.y === object[o.desiredFloor].y) {
      // FUSION!
      playSound(sfx.blob);
      object[o.desiredFloor].type = T_NADA;
      o.desiredFloor = -1;
      o.unionX = -1;
      // NOTE (original): unionX is reset twice; unionY is never reset.
      o.unionX = -1;
      if (o.enemy === T_BFLY_LARGE) {
        o.enemy = T_BFLY_GIANT;
        o.size = 8;
        o.experience = 16;
      }
      if (o.enemy === T_BFLY_MEDIUM) {
        o.enemy = T_BFLY_LARGE;
        o.size = 4;
        o.experience = 8;
      }
      if (o.enemy === T_BFLY_SMALL) {
        o.enemy = T_BFLY_MEDIUM;
        o.size = 2;
        o.experience = 4;
      }
      o.x -= idiv(TILE_SIZE_X, 2);
      o.y -= idiv(TILE_SIZE_Y, 2);
      o.state = 0;
    }
  } else {
    // Flying butterflies
    switch (o.state3) {
      case 0:
        o.y += TILE_UNIT;
        break;
      case 1:
        o.y += TILE_UNIT;
        o.x -= TILE_UNIT;
        break;
      case 2:
        o.y -= TILE_UNIT;
        o.x -= TILE_UNIT;
        break;
      case 3:
        o.y -= TILE_UNIT;
        break;
      case 4:
        o.y -= TILE_UNIT;
        o.x += TILE_UNIT;
        break;
      case 5:
        o.y += TILE_UNIT;
        o.x += TILE_UNIT;
        break;
      case 6:
        o.x += TILE_UNIT;
        break;
      case 7:
        o.x -= TILE_UNIT;
        break;

      case 8:
        o.y += TILE_UNIT;
        o.x -= idiv(TILE_UNIT, 2);
        break;
      case 9:
        o.y -= TILE_UNIT;
        o.x -= idiv(TILE_UNIT, 2);
        break;
      case 10:
        o.y -= TILE_UNIT;
        o.x += idiv(TILE_UNIT, 2);
        break;
      case 11:
        o.y += TILE_UNIT;
        o.x += idiv(TILE_UNIT, 2);
        break;
    }
    o.state2++;
    if (o.state2 >= 16) {
      o.state2 = 0;

      // If the random number is greater than 11, keep the same direction
      j = o.state3;
      o.state3 = rand() % 32;
      if (o.state3 > 11) o.state3 = j;

      if (o.x > (G.roomWidth - 7) * TILE_SIZE_X) {
        if (o.state3 === 4) o.state3 = 2;
        if (o.state3 === 5) o.state3 = 1;
        if (o.state3 === 6) o.state3 = 7;
        if (o.state3 === 10) o.state3 = 9;
        if (o.state3 === 11) o.state3 = 8;
      }
      if (o.x < TILE_SIZE_X * 5) {
        if (o.state3 === 2) o.state3 = 4;
        if (o.state3 === 1) o.state3 = 5;
        if (o.state3 === 7) o.state3 = 6;
        if (o.state3 === 9) o.state3 = 10;
        if (o.state3 === 8) o.state3 = 11;
      }
      if (o.y > (G.roomHeight - 4) * TILE_SIZE_Y) {
        if (o.state3 === 0) o.state3 = 3;
        if (o.state3 === 1) o.state3 = 2;
        if (o.state3 === 5) o.state3 = 4;
        if (o.state3 === 11) o.state3 = 10;
        if (o.state3 === 8) o.state3 = 9;
      }
      if (o.y < TILE_SIZE_Y * 5) {
        if (o.state3 === 3) o.state3 = 0;
        if (o.state3 === 2) o.state3 = 1;
        if (o.state3 === 4) o.state3 = 5;
        if (o.state3 === 10) o.state3 = 11;
        if (o.state3 === 9) o.state3 = 8;
      }
    }
    if (
      (o.enemy === T_BFLY_MEDIUM && rand() % 150 === 0) ||
      (o.enemy === T_BFLY_LARGE && rand() % 80 === 0) ||
      (o.enemy === T_BFLY_GIANT && rand() % 50 === 0)
    ) {
      // Fire
      const bullet = addObject(T_ENEMY, o.x + TILE_SIZE_X, o.y + TILE_SIZE_Y, 0, T_BFLY_BULLET, 0);
      object[bullet].baseTile = tileIds.bfly;
      object[bullet].tile = 0;
    }

    if (o.state >= 256) {
      if (o.enemy !== T_BFLY_GIANT) {
        let other: number,
          j: number,
          n: number,
          me = 0;
        // NOTE (original): `int others[8]` overflows with more than 8 butterflies of one size.
        const others: number[] = [];

        for (j = 0, n = 0; j < G.objectCount; j++) {
          if (object[j].type === T_ENEMY && object[j].enemy === o.enemy) {
            others[n] = j;
            if (j === i) me = n;
            n++;
          }
        }
        if ((me & 0x01) === 0) other = me + 1;
        else other = me - 1;
        if (other >= 0 && other < n) {
          o.desiredFloor = others[other];
          object[others[other]].desiredFloor = i;
          const tx = idiv(o.x + object[others[other]].x, 2);
          const ty = idiv(o.y + object[others[other]].y, 2);
          object[others[other]].unionX = o.unionX = tx;
          object[others[other]].unionY = o.unionY = ty;
        }
      }
    }
  }
}

function bflyBullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  let j: number;
  switch (o.state3) {
    case 0:
      o.y += TILE_UNIT;
      break;
    case 1:
      o.y += TILE_UNIT;
      o.x -= TILE_UNIT;
      break;
    case 2:
      o.y -= TILE_UNIT;
      o.x -= TILE_UNIT;
      break;
    case 3:
      o.y -= TILE_UNIT;
      break;
    case 4:
      o.y -= TILE_UNIT;
      o.x += TILE_UNIT;
      break;
    case 5:
      o.y += TILE_UNIT;
      o.x += TILE_UNIT;
      break;
    case 6:
      o.x += TILE_UNIT;
      break;
    case 7:
      o.x -= TILE_UNIT;
      break;

    case 8:
      o.y += TILE_UNIT;
      o.x -= idiv(TILE_UNIT, 2);
      break;
    case 9:
      o.y -= TILE_UNIT;
      o.x -= idiv(TILE_UNIT, 2);
      break;
    case 10:
      o.y -= TILE_UNIT;
      o.x += idiv(TILE_UNIT, 2);
      break;
    case 11:
      o.y += TILE_UNIT;
      o.x += idiv(TILE_UNIT, 2);
      break;
  }
  o.state2++;
  if (o.state2 >= 16) {
    o.state2 = 0;

    // If the random number is greater than 11, keep the same direction
    j = o.state3;
    o.state3 = rand() % 32;
    if (o.state3 > 11) o.state3 = j;
  }
  if (o.x >= TILE_SIZE_X * G.roomWidth || o.y >= TILE_SIZE_X * G.roomHeight || o.x < 0 || o.y < 0) {
    o.type = T_NADA;
  }
}

function armourArrow(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  // Block-local `collision` in the original (shadows the loop-level one).
  const collision = T_WALL | T_LADDER_WALL | T_DOOR_WALL;
  if ((tileHits(tileIds.armourarrow + o.tile, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y) & collision) !== 0) {
    o.type = T_NADA;
  }
  if (o.state === 0) {
    o.x -= idiv(TILE_SIZE_X, 2);
    o.tile = 0;
    if (o.x < -TILE_SIZE_X * 2) o.type = T_NADA;
  } else {
    o.x += idiv(TILE_SIZE_X, 2);
    o.tile = 1;
    if (o.x >= G.roomWidth * TILE_SIZE_X) o.type = T_NADA;
  }
}

function ghost(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  let j: number;
  o.state2++;
  o.tile = (o.state2 >> 2) % 2;
  if ((o.state2 & 0x1f) === 0) {
    // Fire
    j = addObject(T_ENEMY, o.x + idiv(TILE_SIZE_X, 2), o.y + idiv(TILE_SIZE_Y, 2), 0, T_GHOST_BULLET, 0);
    object[j].state = G.playerX - o.x;
    object[j].state2 = G.playerY - (o.y + TILE_SIZE_Y);
    object[j].baseTile = tileIds.ghost;
    object[j].tile = 2;
    object[j].size = 1;
    playSound(sfx.enemybullet);
  }
  if (o.state2 >= 80 && (o.state2 & 0x01) === 0) o.tile = -1;
  if (o.state2 === 88) {
    o.state2 = 0;
    // Change position
    let j: number;
    const candidates: boolean[] = new Array<boolean>(25).fill(false);
    let candidateCount: number, selected: number, act: number;
    const xs = [6, 11, 16, 21, 25];
    const ys = [1, 5, 9, 13, 17];
    let xt: number, yt: number;

    candidateCount = 0;
    for (j = 0; j < 25; j++) {
      xt = xs[j % 5];
      yt = ys[idiv(j, 5)];
      if (!isWall(xt, yt) && !isWall(xt + 1, yt) && isWall(xt, yt + 2) && isWall(xt + 1, yt + 2)) {
        candidates[j] = true;
        candidateCount++;
      } else {
        candidates[j] = false;
      }
    }
    // NOTE (original): with candidateCount == 0 this is a division by zero (crash in C; NaN here, ghost stays).
    selected = rand() % candidateCount;
    act = 0;
    for (j = 0; j < 25; j++) {
      if (candidates[j]) {
        if (act === selected) {
          o.x = xs[j % 5] * TILE_SIZE_X;
          o.y = ys[idiv(j, 5)] * TILE_SIZE_Y;
        }
        act++;
      }
    }
  }
}

function ghostBullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  let j: number;
  for (j = 0; j < 2; j++) {
    if (Math.abs(o.state) > Math.abs(o.state2)) {
      o.x += o.state > 0 ? TILE_UNIT : -TILE_UNIT;
      o.state3 -= Math.abs(o.state2);
      if (o.state3 < 0) {
        o.state3 += Math.abs(o.state);
        o.y += o.state2 > 0 ? TILE_UNIT : -TILE_UNIT;
      }
    } else {
      o.y += o.state2 > 0 ? TILE_UNIT : -TILE_UNIT;
      o.state3 -= Math.abs(o.state);
      if (o.state3 < 0) {
        o.state3 += Math.abs(o.state2);
        o.x += o.state > 0 ? TILE_UNIT : -TILE_UNIT;
      }
    }
    if (o.x < 0 || o.x >= SCREEN_X || o.y < 0 || o.y >= SCREEN_Y) {
      o.type = T_NADA;
    }
  }
}

function head(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  switch (o.state) {
    case 0:
      o.tile = 2;
      if (G.playerX > o.x && G.playerY >= o.y - TILE_SIZE_Y && G.playerY < o.y + TILE_SIZE_Y) {
        o.state2++;
        if (o.state2 >= 64) {
          o.state = 2;
          o.state2 = 128;
        }
      } else {
        o.state2 = 0;
      }
      break;
    case 1:
      o.tile = 3;
      if (G.playerX < o.x && G.playerY >= o.y - TILE_SIZE_Y && G.playerY < o.y + TILE_SIZE_Y) {
        o.state2++;
        if (o.state2 >= 64) {
          o.state = 3;
          o.state2 = 128;
        }
      } else {
        o.state2 = 0;
      }
      break;
    case 2:
      o.tile = 0;
      o.state2--;
      if ((o.state2 & 0x07) === 0) {
        // Fire a ball
        const j = addObject(T_ENEMY, o.x + TILE_SIZE_X, o.y + idiv(TILE_SIZE_Y, 2), 0, T_HEAD_BULLET, 0);
        object[j].state = G.playerX - o.x + (rand() % (4 * TILE_SIZE_X)) - 2 * TILE_SIZE_X;
        object[j].state2 = G.playerY - o.y + (rand() % (4 * TILE_SIZE_Y)) - 2 * TILE_SIZE_Y;
        object[j].baseTile = tileIds.head;
        object[j].tile = 4;
        object[j].size = 1;
        playSound(sfx.headbullet);
      }
      if (o.state2 <= 0) o.state = 0;
      break;
    case 3:
      o.tile = 1;
      o.state2--;
      if ((o.state2 & 0x07) === 0) {
        // Fire a ball
        const j = addObject(T_ENEMY, o.x - TILE_SIZE_X, o.y + idiv(TILE_SIZE_Y, 2), 0, T_HEAD_BULLET, 0);
        object[j].state = G.playerX - o.x + (rand() % (4 * TILE_SIZE_X)) - 2 * TILE_SIZE_X;
        object[j].state2 = G.playerY - o.y + (rand() % (4 * TILE_SIZE_Y)) - 2 * TILE_SIZE_Y;
        object[j].baseTile = tileIds.head;
        object[j].tile = 4;
        object[j].size = 1;
        playSound(sfx.headbullet);
      }
      if (o.state2 <= 0) o.state = 1;
      break;
  }
}

function headBullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  let j: number;
  for (j = 0; j < 2; j++) {
    if (Math.abs(o.state) > Math.abs(o.state2)) {
      o.x += o.state > 0 ? TILE_UNIT : -TILE_UNIT;
      o.state3 -= Math.abs(o.state2);
      if (o.state3 < 0) {
        o.state3 += Math.abs(o.state);
        o.y += o.state2 > 0 ? TILE_UNIT : -TILE_UNIT;
      }
    } else {
      o.y += o.state2 > 0 ? TILE_UNIT : -TILE_UNIT;
      o.state3 -= Math.abs(o.state);
      if (o.state3 < 0) {
        o.state3 += Math.abs(o.state2);
        o.x += o.state > 0 ? TILE_UNIT : -TILE_UNIT;
      }
    }
    if (o.x < 0 || o.x >= SCREEN_X || o.y < 0 || o.y >= SCREEN_Y) {
      o.type = T_NADA;
    }
  }
}

function worm2(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  o.state2++;
  switch (o.state) {
    case 0:
      o.tile = (o.state2 >> 3) % 2;
      if (
        (tileHits(tileIds.worm2, GAME_VIEW_X + o.x + TILE_UNIT, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X
      ) {
        if ((collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) === 0) {
          if (
            (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 7, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0 &&
            (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 7, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2 - 1) & collision) ===
              0
          ) {
            o.state2 = 0;
            o.state = 2;
          } else {
            o.state = 1;
          }
        } else {
          if (o.state2 % 2 === 0) o.x += TILE_UNIT;
        }
      } else {
        o.state = 1;
      }
      break;
    case 1:
      o.tile = ((o.state2 >> 3) % 2) + 2;
      if ((tileHits(tileIds.worm2, GAME_VIEW_X + o.x - TILE_UNIT, GAME_VIEW_Y + o.y) & collision) === 0 && o.x > 0) {
        if ((collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) === 0) {
          if (
            (collisionAt(GAME_VIEW_X + o.x - (1 + TILE_SIZE_X * 5), GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) &
              collision) !==
              0 &&
            (collisionAt(GAME_VIEW_X + o.x - (1 + TILE_SIZE_X * 5), GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2 - 1) &
              collision) ===
              0
          ) {
            o.state2 = 0;
            o.state = 3;
          } else {
            o.state = 0;
          }
        } else {
          if (o.state2 % 2 === 0) o.x -= TILE_UNIT;
        }
      } else {
        o.state = 0;
      }
      break;
    // Jumping!
    case 2:
      o.tile = 1;
      if (o.state2 < 6) o.y -= TILE_UNIT * 2;
      if (o.state2 >= 6 && o.state2 < 14) o.y -= TILE_UNIT;
      if (o.state2 >= 14 && o.state2 < 20) o.y -= idiv(TILE_UNIT, 2);

      if (o.state2 >= 30 && o.state2 < 36) o.y += idiv(TILE_UNIT, 2);
      if (o.state2 >= 36 && o.state2 < 44) o.y += TILE_UNIT;
      if (o.state2 >= 44) o.y += TILE_UNIT * 2;
      o.x += TILE_UNIT;
      if (o.state2 >= 48) o.state = 0;
      break;
    case 3:
      o.tile = 3;
      if (o.state2 < 6) o.y -= TILE_UNIT * 2;
      if (o.state2 >= 6 && o.state2 < 14) o.y -= TILE_UNIT;
      if (o.state2 >= 14 && o.state2 < 20) o.y -= idiv(TILE_UNIT, 2);

      if (o.state2 >= 30 && o.state2 < 36) o.y += idiv(TILE_UNIT, 2);
      if (o.state2 >= 36 && o.state2 < 44) o.y += TILE_UNIT;
      if (o.state2 >= 44) o.y += TILE_UNIT * 2;
      o.x -= TILE_UNIT;
      if (o.state2 >= 48) o.state = 1;
      break;
  }
}

function octopus(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  o.state2++;
  o.tile = ((o.state2 >> 2) % 2) * 8;
  switch (o.state) {
    case 0:
      o.yoffs = toInt(Math.sin(o.state2 / 4.0) * TILE_SIZE_Y);
      break;
    case 1:
      {
        // Look for a target
        let candidateCount = 0;
        // NOTE (original): `int candidates[16]`; with no other octopus, rand()%0 (crash in C).
        const candidates: number[] = [];
        let j: number;

        o.yoffs = 0;
        for (j = 0; j < G.objectCount; j++) {
          if (object[j].type === T_ENEMY && object[j].enemy === T_OCTOPUS && j !== i) {
            candidates[candidateCount++] = j;
          }
        }
        j = candidates[rand() % candidateCount];
        o.unionX = object[j].x - o.x;
        o.unionY = object[j].y - o.y;
        o.desiredFloor = j;
        o.state = 2;
        o.state3 = 0;
      }
      break;
    case 2:
      {
        let j: number;
        const tx = o.unionX,
          ty = o.unionY;

        for (j = 0; j < 4 && (Math.abs(o.unionX) > TILE_UNIT || Math.abs(o.unionY) > TILE_UNIT); j++) {
          if (Math.abs(tx) > Math.abs(ty)) {
            const tmp = tx > 0 ? TILE_UNIT : -TILE_UNIT;
            o.x += tmp;
            o.unionX -= tmp;
            o.state3 -= Math.abs(ty);
            if (o.state3 < 0) {
              const tmp = ty > 0 ? TILE_UNIT : -TILE_UNIT;
              o.state3 += Math.abs(tx);
              o.y += tmp;
              o.unionY -= tmp;
            }
          } else {
            const tmp = ty > 0 ? TILE_UNIT : -TILE_UNIT;
            o.y += tmp;
            o.unionY -= tmp;
            o.state3 -= Math.abs(tx);
            if (o.state3 < 0) {
              const tmp = tx > 0 ? TILE_UNIT : -TILE_UNIT;
              o.state3 += Math.abs(ty);
              o.x += tmp;
              o.unionX -= tmp;
            }
          }
        }
      }

      if (Math.abs(o.unionX) <= TILE_UNIT && Math.abs(o.unionY) <= TILE_UNIT) {
        playSound(sfx.colormonster);
        o.x = object[o.desiredFloor].x;
        o.y = object[o.desiredFloor].y;
        o.state = 0;
        o.state2 = 0;
        object[o.desiredFloor].state = 1;
      }
      break;
  }
}

function hairy(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  let j: number;
  o.state3++;
  o.tile = (o.state3 >> 4) & 0x01;
  if (o.state3 % 0x0f === 0) {
    const j = addObject(T_ENEMY, o.x + TILE_SIZE_X, o.y + TILE_SIZE_Y, 0, T_HAIRYBULLET, 0);
    object[j].state = 1 + (rand() % 11);
    object[j].baseTile = tileIds.hairy;
    object[j].tile = 2;
  }
  switch (o.state) {
    case 1:
      o.y += TILE_UNIT;
      o.x -= TILE_UNIT;
      break;
    case 2:
      o.y -= TILE_UNIT;
      o.x -= TILE_UNIT;
      break;
    case 3:
      o.y -= TILE_UNIT;
      break;
    case 4:
      o.y -= TILE_UNIT;
      o.x += TILE_UNIT;
      break;
    case 5:
      o.y += TILE_UNIT;
      o.x += TILE_UNIT;
      break;
    case 6:
      o.x += TILE_UNIT;
      break;
    case 7:
      o.x -= TILE_UNIT;
      break;

    case 8:
      o.y += TILE_UNIT;
      o.x -= idiv(TILE_UNIT, 2);
      break;
    case 9:
      o.y -= TILE_UNIT;
      o.x -= idiv(TILE_UNIT, 2);
      break;
    case 10:
      o.y -= TILE_UNIT;
      o.x += idiv(TILE_UNIT, 2);
      break;
    case 11:
      o.y += TILE_UNIT;
      o.x += idiv(TILE_UNIT, 2);
      break;
  }
  o.state2++;
  if (o.state2 >= 16) {
    o.state2 = 0;

    // If the random number is greater than 11, keep the same direction
    j = o.state;
    o.state = 1 + (rand() % 31);
    if (o.state > 11) o.state = j;

    if (o.x > (G.roomWidth - 7) * TILE_SIZE_X) {
      if (o.state === 4) o.state = 2;
      if (o.state === 5) o.state = 1;
      if (o.state === 6) o.state = 7;
      if (o.state === 10) o.state = 9;
      if (o.state === 11) o.state = 8;
    }
    if (o.x < TILE_SIZE_X * 5) {
      if (o.state === 2) o.state = 4;
      if (o.state === 1) o.state = 5;
      if (o.state === 7) o.state = 6;
      if (o.state === 9) o.state = 10;
      if (o.state === 8) o.state = 11;
    }
    if (o.y > (G.roomHeight - 4) * TILE_SIZE_Y) {
      if (o.state === 0) o.state = 3;
      if (o.state === 1) o.state = 2;
      if (o.state === 5) o.state = 4;
      if (o.state === 11) o.state = 10;
      if (o.state === 8) o.state = 9;
    }
    if (o.y < TILE_SIZE_Y * 5) {
      if (o.state === 3) o.state = 0;
      if (o.state === 2) o.state = 1;
      if (o.state === 4) o.state = 5;
      if (o.state === 10) o.state = 11;
      if (o.state === 9) o.state = 8;
    }
  }
}

function hairybullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const seq = [0, 3, 1, 2];

  o.state2++;
  o.tile = 2 + seq[(o.state2 >> 2) % 4];

  switch (o.state) {
    case 1:
      o.y += TILE_UNIT;
      o.x -= TILE_UNIT;
      break;
    case 2:
      o.y -= TILE_UNIT;
      o.x -= TILE_UNIT;
      break;
    case 3:
      o.y -= TILE_UNIT;
      break;
    case 4:
      o.y -= TILE_UNIT;
      o.x += TILE_UNIT;
      break;
    case 5:
      o.y += TILE_UNIT;
      o.x += TILE_UNIT;
      break;
    case 6:
      o.x += TILE_UNIT;
      break;
    case 7:
      o.x -= TILE_UNIT;
      break;

    case 8:
      o.y += TILE_UNIT;
      o.x -= idiv(TILE_UNIT, 2);
      break;
    case 9:
      o.y -= TILE_UNIT;
      o.x -= idiv(TILE_UNIT, 2);
      break;
    case 10:
      o.y -= TILE_UNIT;
      o.x += idiv(TILE_UNIT, 2);
      break;
    case 11:
      o.y += TILE_UNIT;
      o.x += idiv(TILE_UNIT, 2);
      break;
  }

  if (o.x < -2 * TILE_SIZE_X || o.x > 32 * TILE_SIZE_X || o.y < -2 * TILE_SIZE_Y || o.y >= 20 * TILE_SIZE_Y)
    o.type = T_NADA;
}

function waterdragon(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  switch (o.state) {
    case 0:
    case 1:
      playSound(sfx.enterwater);
      o.desiredFloor = 1 + idiv(rand() % 40, 10) * 4;
      o.state += 2;
      o.state2 = 0;
      break;
    case 2:
    case 3:
      if (o.y > o.desiredFloor * TILE_SIZE_Y) {
        o.y -= idiv(TILE_SIZE_Y, 2);
      } else {
        o.state += 2;
      }
      break;
    case 4:
    case 5:
      if (o.state2 < 2) o.y -= TILE_UNIT * 3;
      if (o.state2 >= 2 && o.state2 < 4) o.y -= TILE_UNIT * 2;
      if (o.state2 >= 4 && o.state2 < 6) o.y -= TILE_UNIT;
      if (o.state2 >= 6 && o.state2 < 8) o.y -= idiv(TILE_UNIT, 2);
      if (o.state2 >= 10 && o.state2 < 12) o.y += idiv(TILE_UNIT, 2);
      if (o.state2 >= 12 && o.state2 < 14) o.y += TILE_UNIT;
      if (o.state2 >= 14 && o.state2 < 16) o.y += TILE_UNIT * 2;
      if (o.state2 >= 16 && o.state2 < 18) o.y += TILE_UNIT * 3;
      if (o.state2 === 18) {
        o.y = o.desiredFloor * TILE_SIZE_Y;

        const tx = idiv(o.x, TILE_SIZE_X);
        const ty = idiv(o.y, TILE_SIZE_Y);
        if (
          isWallOrBlocker(tx + 1, ty + 1) ||
          isWallOrBlocker(tx + 2, ty + 1) ||
          !isWallOrBlocker(tx + 1, ty + 2) ||
          !isWallOrBlocker(tx + 2, ty + 2)
        ) {
          o.state += 6;
        } else {
          o.state += 2;
          o.state2 = 0;
          o.state3 = 0;
        }
      } else {
        o.state2++;
      }
      break;
    case 6:
      {
        o.state2++;
        o.tile = (o.state2 >> 3) % 2;

        const tx = idiv(o.x, TILE_SIZE_X);
        const ty = idiv(o.y, TILE_SIZE_Y);
        if (
          isWallOrBlocker(tx + 1, ty + 1) ||
          isWallOrBlocker(tx + 2, ty + 1) ||
          isWallOrBlocker(tx + 3, ty + 1) ||
          !isWallOrBlocker(tx + 1, ty + 2) ||
          !isWallOrBlocker(tx + 2, ty + 2) ||
          !isWallOrBlocker(tx + 3, ty + 2)
        ) {
          o.state = 7;
          o.x -= TILE_UNIT * 2;
          o.state3++;
          if (o.state3 >= 4) {
            o.state += 2;
            o.state2 = 0;
          }
        } else {
          o.x += TILE_UNIT * 2;
        }
      }
      break;
    case 7:
      {
        o.state2++;
        o.tile = 2 + ((o.state2 >> 3) % 2);

        const tx = idiv(o.x, TILE_SIZE_X);
        const ty = idiv(o.y, TILE_SIZE_Y);
        if (
          isWallOrBlocker(tx + 1, ty + 1) ||
          isWallOrBlocker(tx + 2, ty + 1) ||
          isWallOrBlocker(tx + 3, ty + 1) ||
          !isWallOrBlocker(tx + 1, ty + 2) ||
          !isWallOrBlocker(tx + 2, ty + 2) ||
          !isWallOrBlocker(tx + 3, ty + 2)
        ) {
          o.state = 6;
          o.x += TILE_UNIT * 2;
          o.state3++;
          if (o.state3 >= 4) {
            o.state += 2;
            o.state2 = 0;
          }
        } else {
          o.x -= TILE_UNIT * 2;
        }
      }
      break;
    case 8:
    case 9:
      if (o.state2 < 2) o.y -= TILE_UNIT * 3;
      if (o.state2 >= 2 && o.state2 < 4) o.y -= TILE_UNIT * 2;
      if (o.state2 >= 4 && o.state2 < 6) o.y -= TILE_UNIT;
      if (o.state2 >= 6 && o.state2 < 8) o.y -= idiv(TILE_UNIT, 2);
      if (o.state2 >= 10 && o.state2 < 12) o.y += idiv(TILE_UNIT, 2);
      if (o.state2 >= 12 && o.state2 < 14) o.y += TILE_UNIT;
      if (o.state2 >= 14 && o.state2 < 16) o.y += TILE_UNIT * 2;
      if (o.state2 >= 16 && o.state2 < 18) o.y += TILE_UNIT * 3;
      if (o.state2 === 18) {
        o.state += 2;
        o.y = o.desiredFloor * TILE_SIZE_Y;
      } else {
        o.state2++;
      }
      break;
    case 10:
    case 11:
      if (o.y < 14 * TILE_SIZE_Y) {
        o.y += idiv(TILE_SIZE_Y, 2);
      } else {
        playSound(sfx.enterwater);
        o.type = T_ENEMY;
        o.enemy = T_PIRANHA2;
        o.x += TILE_SIZE_X;
        o.state = 0;
        o.state2 = 0;
        o.state3 = 0;
        o.size = 0;
        o.baseTile = tileIds.piranha;
        o.tile = 0;
      }
      break;
  }
}

function waterbug(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  switch (o.state) {
    case 0:
      o.state2++;
      o.tile = (o.state2 >> 4) % 2;
      if (
        (tileHitsNative(tileIds.waterbug, GAME_VIEW_X + o.x + 4 * TILE_UNIT, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X
      ) {
        o.x += 4 * TILE_UNIT;
      } else {
        o.state = 1;
      }
      if (rand() % 200 === 0) {
        o.state = 64;
        o.state3 = 0;
      }
      break;
    case 1:
      o.state2++;
      o.tile = ((o.state2 >> 4) % 2) + 2;
      if (
        (tileHitsNative(tileIds.waterbug + 2, GAME_VIEW_X + o.x - 4 * TILE_UNIT, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        o.x > 0
      ) {
        o.x -= 4 * TILE_UNIT;
      } else {
        o.state = 0;
      }
      if (rand() % 200 === 0) {
        o.state = 64;
        o.state3 = 1;
      }
      break;
    default:
      o.state--;
      if (o.state === 2) o.state = o.state3;
  }
}

function bird(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  switch (o.state) {
    case 0:
      o.state2--;
      if (o.state2 <= 0) o.state = 3;
      break;
    case 1:
      o.tile = ((o.state2 >> 3) % 2) + (1 - o.state3);
      o.state2++;
      if (o.state2 <= 6) {
        o.x += TILE_UNIT * o.state3;
        o.y += TILE_UNIT;
      }
      if (o.state2 > 6 && o.state2 <= 10) o.x += TILE_UNIT * o.state3;
      if (o.state2 > 10) {
        o.x += TILE_UNIT * o.state3;
        o.y -= TILE_UNIT;
      }
      if (o.state2 === 16) {
        if (o.x >= (G.roomWidth - 6) * TILE_SIZE_X) o.state3 = -1;
        if (o.x <= 4 * TILE_SIZE_X) o.state3 = 1;
        o.state2 = 0;
        o.state = o.desiredFloor;
      }
      break;
    case 2:
      o.tile = ((o.state2 >> 3) % 2) + (1 - o.state3);
      o.state2++;
      if (o.state2 <= 6) {
        o.x += TILE_UNIT * o.state3;
        o.y -= TILE_UNIT;
      }
      if (o.state2 > 6 && o.state2 <= 10) o.x += TILE_UNIT * o.state3;
      if (o.state2 > 10) {
        o.x += TILE_UNIT * o.state3;
        o.y += TILE_UNIT;
      }
      if (o.state2 === 16) {
        if (o.x >= (G.roomWidth - 6) * TILE_SIZE_X) o.state3 = -1;
        if (o.x <= 4 * TILE_SIZE_X) o.state3 = 1;
        o.state2 = 0;
        o.state = o.desiredFloor;
      }
      break;
    case 3:
      o.tile = ((o.state2 >> 3) % 2) + (1 - o.state3);
      o.state2++;
      o.y += 2 * TILE_UNIT;
      if (o.y >= 16 * TILE_SIZE_Y) {
        o.desiredFloor = 4;
        o.state = 1;
        o.state2 = 0;
      }
      break;
    case 4:
      o.tile = ((o.state2 >> 3) % 2) + (1 - o.state3);
      o.state2++;
      o.y -= 2 * TILE_UNIT;
      if (o.y < 4 * TILE_SIZE_Y) {
        o.desiredFloor = 5;
        o.state = 2;
        o.state2 = 0;
      }
      break;
    case 5:
      o.tile = ((o.state2 >> 3) % 2) + (1 - o.state3);
      o.state2++;
      o.y += 2 * TILE_UNIT;
      if (o.y >= 12 * TILE_SIZE_Y) {
        o.desiredFloor = 6;
        o.state = 1;
        o.state2 = 0;
      }
      break;
    case 6:
      o.tile = ((o.state2 >> 3) % 2) + (1 - o.state3);
      o.state2++;
      o.y -= 2 * TILE_UNIT;
      if (o.y < 12 * TILE_SIZE_Y) {
        o.desiredFloor = 7;
        o.state = 2;
        o.state2 = 0;
      }
      break;
    case 7:
      o.tile = ((o.state2 >> 3) % 2) + (1 - o.state3);
      o.state2++;
      o.y += 2 * TILE_UNIT;
      if (o.y >= 16 * TILE_SIZE_Y) {
        o.desiredFloor = 8;
        o.state = 1;
        o.state2 = 0;
      }
      break;
    case 8:
      o.tile = ((o.state2 >> 3) % 2) + (1 - o.state3);
      o.state2++;
      o.y -= 2 * TILE_UNIT;
      if (o.y < 2 * TILE_SIZE_Y) {
        o.desiredFloor = 3;
        o.state = 2;
        o.state2 = 0;
      }
      break;
  }
}

function stoneman(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  const collision = ctx.collision;
  switch (o.state) {
    case 0:
      o.tile = 0;
      if (rand() % 200 === 0) {
        o.state = 1;
        o.state2 = 0;
      }
      break;
    case 1:
      o.tile = (o.state2 >> 5) + 1;
      o.state2++;
      if (o.state2 >= 64) {
        o.state = 2;
        o.state2 = 0;
        o.state3 = 0;
      }
      break;
    case 2:
      o.state2++;
      o.tile = ((o.state2 >> 3) % 2) + 3;
      if (
        (tileHitsNative(tileIds.stoneman + o.tile, GAME_VIEW_X + o.x + 1 * TILE_UNIT, GAME_VIEW_Y + o.y) &
          collision) ===
          0 &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X
      ) {
        o.x += 1 * TILE_UNIT;
        if (rand() % 200 === 0) {
          if (o.state3 === 1) {
            o.state = 4;
            o.state2 = 0;
          }
          if (o.state3 === 0) {
            o.state3 = rand() % 2;
            o.state = 5;
            o.state2 = 0;
          }
        }
      } else {
        o.state = 3;
      }
      break;
    case 3:
      o.state2++;
      o.tile = ((o.state2 >> 3) % 2) + 5;
      if (
        (tileHitsNative(tileIds.stoneman + o.tile, GAME_VIEW_X + o.x - 1 * TILE_UNIT, GAME_VIEW_Y + o.y) &
          collision) ===
          0 &&
        (collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0 &&
        o.x > 0
      ) {
        o.x -= 1 * TILE_UNIT;
        if (rand() % 200 === 0) {
          if (o.state3 === 1) {
            o.state = 4;
            o.state2 = 0;
          }
          if (o.state3 === 0) {
            o.state3 = rand() % 2;
            o.state = 6;
            o.state2 = 0;
          }
        }
      } else {
        o.state = 2;
      }
      break;
    case 4:
      o.tile = 2 - (o.state2 >> 5);
      o.state2++;
      if (o.state2 >= 64) {
        o.state = 0;
        o.state2 = 0;
        o.state3 = 0;
      }
      break;
    case 5:
      o.state2++;
      if (o.state2 === 16) {
        playSound(sfx.enemybullet);
        const val = addObject(T_ENEMY, o.x, o.y, 0, T_STONEMAN_BULLET, 0);
        object[val].baseTile = tileIds.stoneman;
        object[val].tile = 7;

        o.state2 = 0;
        o.state = 2;
      }
      break;
    case 6:
      o.state2++;
      if (o.state2 === 16) {
        playSound(sfx.enemybullet);
        const val = addObject(T_ENEMY, o.x, o.y, 0, T_STONEMAN_BULLET, 1);
        object[val].baseTile = tileIds.stoneman;
        object[val].tile = 7;

        o.state2 = 0;
        o.state = 3;
      }
      break;
  }
}

function stonemanBullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  if ((tileHitsNative(tileIds.stoneman + o.tile, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y) & collision) !== 0) {
    o.type = T_NADA;
  }

  if (o.state === 0) o.x += idiv(TILE_SIZE_X, 2);
  else o.x -= idiv(TILE_SIZE_X, 2);

  if (o.x < -2 * TILE_SIZE_X || o.x > G.roomWidth * TILE_SIZE_X) {
    o.type = T_NADA;
  }
}

function pacman(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  let bt = 0;

  bt = (6 - o.size) * 2;
  if (bt >= 6) bt = 6;

  switch (o.state) {
    case 0:
      o.state2++;
      o.tile = ((o.state2 >> 2) % 2) + bt;
      if (
        !isWallOrBlocker(idiv(o.x, TILE_SIZE_X) + 2, idiv(o.y, TILE_SIZE_Y)) &&
        isWallOrBlocker(idiv(o.x, TILE_SIZE_X) + 2, idiv(o.y, TILE_SIZE_Y) + 2) &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X
      ) {
        o.x += TILE_UNIT;
      } else {
        o.state = 1;
      }
      break;
    case 1:
      o.state2++;
      o.tile = ((o.state2 >> 2) % 2) + bt + 8;
      if (
        !isWallOrBlocker(idiv(o.x, TILE_SIZE_X), idiv(o.y, TILE_SIZE_Y)) &&
        isWallOrBlocker(idiv(o.x, TILE_SIZE_X), idiv(o.y, TILE_SIZE_Y) + 2) &&
        o.x > 0
      ) {
        o.x -= TILE_UNIT;
      } else {
        o.state = 0;
      }
      break;
  }
}

function reddragon(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  switch (o.state) {
    case 0:
      {
        // Block-local dx/dy in the original (shadow the parameters).
        const dx = (2 + (rand() % 24)) * TILE_SIZE_X;
        const dy = (3 + (rand() % 9)) * TILE_SIZE_Y;
        o.x = dx;
        o.y = dy;
        o.state = 1;
        o.state2 = 0;
      }
      break;
    case 1:
      o.state2++;
      o.tile = ((o.state2 >> 1) % 2) - 1;
      if (o.state2 >= 32) {
        o.state = 2;
        o.unionX = G.playerX - o.x;
        o.unionY = G.playerY - o.y;
      }
      break;
    case 2:
      {
        let j: number;
        const tx = o.unionX,
          ty = o.unionY;
        o.state2++;
        if (o.unionX > 0) {
          o.tile = ((o.state2 >> 2) % 2) + 2;
        } else {
          o.tile = (o.state2 >> 2) % 2;
        }

        for (j = 0; j < 2 && (Math.abs(o.unionX) > TILE_UNIT || Math.abs(o.unionY) > TILE_UNIT); j++) {
          if (Math.abs(tx) > Math.abs(ty)) {
            const tmp = tx > 0 ? TILE_UNIT : -TILE_UNIT;
            o.x += tmp;
            o.unionX -= tmp;
            o.state3 -= Math.abs(ty);
            if (o.state3 < 0) {
              const tmp = ty > 0 ? TILE_UNIT : -TILE_UNIT;
              o.state3 += Math.abs(tx);
              o.y += tmp;
              o.unionY -= tmp;
            }
          } else {
            const tmp = ty > 0 ? TILE_UNIT : -TILE_UNIT;
            o.y += tmp;
            o.unionY -= tmp;
            o.state3 -= Math.abs(tx);
            if (o.state3 < 0) {
              const tmp = tx > 0 ? TILE_UNIT : -TILE_UNIT;
              o.state3 += Math.abs(ty);
              o.x += tmp;
              o.unionX -= tmp;
            }
          }
        }
      }

      if (Math.abs(o.unionX) <= TILE_UNIT && Math.abs(o.unionY) <= TILE_UNIT) {
        o.state = 3;
        o.state2 = 0;
        o.state3 = o.tile;
      }
      break;
    case 3:
      o.state2++;
      o.tile = ((o.state2 >> 2) % 2) - 1;
      if (o.tile !== -1) o.tile = o.state3;
      if (o.state2 >= 32) {
        o.state = 4;
        o.state2 = 0;
        o.unionX = G.playerX;
        o.unionY = G.playerY;
      }
      break;
    case 4:
      o.tile = -1;
      o.state2++;
      if (o.state2 === 16) {
        playSound(sfx.enemybullet);
        const j = addObject(T_ENEMY, o.x + TILE_SIZE_X, o.y, 0, T_REDDRAGON_BULLET, 0);
        object[j].state = G.playerX - o.x;
        object[j].state2 = G.playerY - (o.y + TILE_SIZE_Y);
        object[j].baseTile = tileIds.reddragon;
        object[j].tile = 4;
      }
      if (o.state2 === 32) {
        playSound(sfx.enemybullet);
        const j = addObject(T_ENEMY, o.x + TILE_SIZE_X, o.y, 0, T_REDDRAGON_BULLET, 0);
        object[j].state = G.playerX - o.x;
        object[j].state2 = G.playerY - (o.y + TILE_SIZE_Y);
        object[j].baseTile = tileIds.reddragon;
        object[j].tile = 4;
      }
      if (o.state2 === 48) o.state = 0;
      break;
  }
}

function reddragonBullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  let j: number;
  for (j = 0; j < 4; j++) {
    if (Math.abs(o.state) > Math.abs(o.state2)) {
      o.x += o.state > 0 ? TILE_UNIT : -TILE_UNIT;
      o.state3 -= Math.abs(o.state2);
      if (o.state3 < 0) {
        o.state3 += Math.abs(o.state);
        o.y += o.state2 > 0 ? TILE_UNIT : -TILE_UNIT;
      }
    } else {
      o.y += o.state2 > 0 ? TILE_UNIT : -TILE_UNIT;
      o.state3 -= Math.abs(o.state);
      if (o.state3 < 0) {
        o.state3 += Math.abs(o.state2);
        o.x += o.state > 0 ? TILE_UNIT : -TILE_UNIT;
      }
    }
    if (o.x < -2 * TILE_SIZE_X || o.x >= SCREEN_X || o.y < -2 * TILE_SIZE_Y || o.y >= SCREEN_Y) {
      o.type = T_NADA;
    }
  }
}

function demon6Bullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state3++;
  o.tile = 4 + ((o.state3 >> 3) % 2);
  o.unionX += o.state;
  o.unionY += o.state2;
  o.x = idiv(o.unionX, TILE_SIZE_X);
  o.y = idiv(o.unionY, TILE_SIZE_Y);
  if (o.x < -2 * TILE_SIZE_X || o.x >= SCREEN_X || o.y < -2 * TILE_SIZE_Y || o.y >= SCREEN_Y) {
    o.type = T_NADA;
  }
}

function owl(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state2++;
  //o.xoffs=2*TILE_SIZE_X*o.state3;
  if (o.state !== 2) {
    if (o.yoffs > 0) o.yoffs--;
    if (o.yoffs < 0) o.yoffs++;
  }
  switch (o.state) {
    case 0:
      switch (rand() % 8) {
        case 0:
          o.unionX = -TILE_UNIT;
          o.unionY = 0;
          break;
        case 1:
          o.unionX = TILE_UNIT;
          o.unionY = 0;
          break;
        case 2:
          o.unionX = -TILE_UNIT;
          o.unionY = -TILE_UNIT;
          break;
        case 3:
          o.unionX = -TILE_UNIT;
          o.unionY = TILE_UNIT;
          break;
        case 4:
          o.unionX = TILE_UNIT;
          o.unionY = -TILE_UNIT;
          break;
        case 5:
          o.unionX = TILE_UNIT;
          o.unionY = TILE_UNIT;
          break;
        case 6:
          o.unionX = 0;
          o.unionY = -TILE_UNIT;
          break;
        case 7:
          o.unionX = 0;
          o.unionY = TILE_UNIT;
          break;
      }
      o.state = 1;
      {
        // Block-local dx/dy in the original (shadow the parameters).
        const dx = o.x - G.playerX;
        const dy = o.y - G.playerY;
        const d = toInt(Math.sqrt(dx * dx + dy * dy));
        if (d < 5 * TILE_SIZE_X && o.state3 === 1) {
          playSound(sfx.owl);
          o.state = 2;
          o.state3 = 0;
          o.unionX = G.playerX - o.x;
          o.unionY = G.playerY - o.y;
          break;
        }
        o.state3 = 1;
      }
    // falls through
    case 1:
      if (o.size === 9) o.tile = (o.state2 >> 3) % 2;
      else o.tile = ((o.state2 >> 3) % 2) + 2;
      if (o.x < TILE_SIZE_X && o.unionX < 0) o.unionX = TILE_UNIT;
      if (o.x > TILE_SIZE_X * 29 && o.unionX > 0) o.unionX = -TILE_UNIT;
      if (o.y < TILE_SIZE_Y && o.unionY < 0) o.unionY = TILE_UNIT;
      if (o.y > TILE_SIZE_Y * 13 && o.unionY > 0) o.unionY = -TILE_UNIT;

      o.x += o.unionX;
      o.y += o.unionY;
      if (o.state2 === 32) {
        o.state = 0;
        o.state2 = 0;
      }
      break;
    case 2:
      if (o.size === 9) o.tile = (o.state2 >> 3) % 2;
      else o.tile = ((o.state2 >> 3) % 2) + 2;
      o.yoffs = toInt(Math.sin(o.state2 / 4.0) * TILE_SIZE_Y);
      if (o.state2 >= 64) o.state = 3;
      break;
    case 3:
      if (o.size === 9) o.tile = (o.state2 >> 3) % 2;
      else o.tile = ((o.state2 >> 3) % 2) + 2;
      {
        let j: number;
        // Block-local dx/dy in the original (shadow the parameters); always set by the loop.
        let d: number,
          dx = 0,
          dy = 0;

        for (j = 0; j < 4; j++) {
          dx = G.playerX - o.x;
          dy = G.playerY - o.y;
          // NOTE (original): compares dx > dy, not abs(dx) > abs(dy).
          if (dx > dy) {
            o.x += dx > 0 ? TILE_UNIT : -TILE_UNIT;
            o.state3 -= Math.abs(dy);
            if (o.state3 < 0) {
              o.state3 += Math.abs(dx);
              o.y += dy > 0 ? TILE_UNIT : -TILE_UNIT;
            }
          } else {
            o.y += dy > 0 ? TILE_UNIT : -TILE_UNIT;
            o.state3 -= Math.abs(dx);
            if (o.state3 < 0) {
              o.state3 += Math.abs(dy);
              o.x += dx > 0 ? TILE_UNIT : -TILE_UNIT;
            }
          }
        }

        d = toInt(Math.sqrt(dx * dx + dy * dy));
        if (d < 3 * TILE_SIZE_X) {
          o.state = 0;
          o.state2 = 0;
          o.state3 = 0;
        }
      }
      break;
  }
}

function greenmonkey(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  o.state3++;
  switch (o.state) {
    case 0:
      o.tile = ((o.state3 >> 3) & 0x01) + 2;
      if (
        (tileHits(tileIds.greenmonkey + o.tile, GAME_VIEW_X + o.x - TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        o.x > 0 &&
        (collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x -= TILE_UNIT * 4;

        if (rand() % 32 === 0) {
          // Jump
          let nfloors = 0;
          const floors: number[] = [];
          const tx = idiv(o.x, TILE_SIZE_X);
          const ty = idiv(o.y, TILE_SIZE_Y);
          if (
            !isWall(tx - 3, ty - 3) &&
            !isWall(tx - 4, ty - 3) &&
            !isWall(tx - 5, ty - 3) &&
            !isWall(tx - 6, ty - 3) &&
            isWall(tx - 3, ty - 2) &&
            isWall(tx - 4, ty - 2) &&
            isWall(tx - 5, ty - 2) &&
            isWall(tx - 6, ty - 2) &&
            !isWall(tx - 2, ty - 2) &&
            (tileHits(
              tileIds.greenmonkey + o.tile,
              GAME_VIEW_X + o.x - 4 * TILE_SIZE_X,
              GAME_VIEW_Y + o.y - 4 * TILE_SIZE_Y,
            ) &
              collision) ===
              0
          ) {
            floors[nfloors++] = ty - 4;
          }
          if (
            !isWall(tx - 3, ty + 5) &&
            !isWall(tx - 4, ty + 5) &&
            !isWall(tx - 5, ty + 5) &&
            !isWall(tx - 6, ty + 5) &&
            isWall(tx - 3, ty + 6) &&
            isWall(tx - 4, ty + 6) &&
            isWall(tx - 5, ty + 6) &&
            isWall(tx - 6, ty + 6) &&
            !isWall(tx - 2, ty + 2) &&
            (tileHits(
              tileIds.greenmonkey + o.tile,
              GAME_VIEW_X + o.x - (4 * TILE_SIZE_X + 4 * TILE_UNIT),
              GAME_VIEW_Y + o.y + 4 * TILE_SIZE_Y,
            ) &
              collision) ===
              0
          ) {
            floors[nfloors++] = ty + 4;
          }
          if (nfloors !== 0) {
            o.desiredFloor = floors[rand() % nfloors] * TILE_SIZE_Y;
            o.state = 7;
            o.state3 = 0;
          }
        }
      } else {
        o.state = 1;
      }
      break;
    case 1:
      o.tile = (o.state3 >> 3) & 0x01;
      if (
        (tileHits(tileIds.greenmonkey + o.tile, GAME_VIEW_X + o.x + TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x += TILE_UNIT * 4;

        if (rand() % 32 === 0) {
          // Jump
          let nfloors = 0;
          const floors: number[] = [];
          const tx = idiv(o.x, TILE_SIZE_X);
          const ty = idiv(o.y, TILE_SIZE_Y);
          if (
            !isWall(tx + 4, ty - 3) &&
            !isWall(tx + 5, ty - 3) &&
            !isWall(tx + 6, ty - 3) &&
            !isWall(tx + 7, ty - 3) &&
            isWall(tx + 4, ty - 2) &&
            isWall(tx + 5, ty - 2) &&
            isWall(tx + 6, ty - 2) &&
            isWall(tx + 7, ty - 2) &&
            !isWall(tx + 3, ty - 2) &&
            (tileHits(
              tileIds.greenmonkey + o.tile,
              GAME_VIEW_X + o.x + 5 * TILE_SIZE_X,
              GAME_VIEW_Y + o.y - 4 * TILE_SIZE_Y,
            ) &
              collision) ===
              0
          ) {
            floors[nfloors++] = ty - 4;
          }
          if (
            !isWall(tx + 4, ty + 5) &&
            !isWall(tx + 5, ty + 5) &&
            !isWall(tx + 6, ty + 5) &&
            !isWall(tx + 7, ty + 5) &&
            isWall(tx + 4, ty + 6) &&
            isWall(tx + 5, ty + 6) &&
            isWall(tx + 6, ty + 6) &&
            isWall(tx + 7, ty + 6) &&
            !isWall(tx + 3, ty + 2) &&
            (tileHits(
              tileIds.greenmonkey + o.tile,
              GAME_VIEW_X + o.x + 5 * TILE_SIZE_X,
              GAME_VIEW_Y + o.y + 4 * TILE_SIZE_Y,
            ) &
              collision) ===
              0
          ) {
            floors[nfloors++] = ty + 4;
          }
          if (nfloors !== 0) {
            o.desiredFloor = floors[rand() % nfloors] * TILE_SIZE_Y;
            o.state = 6;
            o.state3 = 0;
          }
        }
      } else {
        o.state = 0;
      }
      break;
    // Jump states
    case 6:
      o.tile = 4;
      o.x += 2 * TILE_UNIT;
      if (o.desiredFloor < o.y) {
        o.state3 = 0;
        o.y -= 4 * TILE_UNIT;
      } else {
        if (o.state3 < 2) o.y -= TILE_UNIT * 2;
        if (o.state3 >= 2 && o.state3 < 4) o.y -= TILE_UNIT;
        if (o.state3 >= 8) {
          o.state = 8;
          o.state3 = 0;
        }
      }
      break;
    case 7:
      o.tile = 5;
      o.x -= 2 * TILE_UNIT;
      if (o.desiredFloor < o.y) {
        o.state3 = 0;
        o.y -= 4 * TILE_UNIT;
      } else {
        if (o.state3 < 2) o.y -= TILE_UNIT * 2;
        if (o.state3 >= 2 && o.state3 < 4) o.y -= TILE_UNIT;
        if (o.state3 >= 8) {
          o.state = 9;
          o.state3 = 0;
        }
      }
      break;
    case 8:
      o.tile = 4;
      o.x += 2 * TILE_UNIT;
      if (o.state3 >= 2) o.y += TILE_UNIT;
      if (o.state3 >= 4) o.y += TILE_UNIT;
      if (o.state3 >= 6) o.y += TILE_UNIT * 2;
      if (o.state3 >= 10) o.y += TILE_UNIT * 2;
      if (o.y >= o.desiredFloor) {
        o.y = o.desiredFloor;
        o.state = 1;
        o.state3 = 0;
      }
      break;
    case 9:
      o.tile = 5;
      o.x -= 2 * TILE_UNIT;
      if (o.state3 >= 2) o.y += TILE_UNIT;
      if (o.state3 >= 4) o.y += TILE_UNIT;
      if (o.state3 >= 6) o.y += TILE_UNIT * 2;
      if (o.state3 >= 10) o.y += TILE_UNIT * 2;
      if (o.y >= o.desiredFloor) {
        o.y = o.desiredFloor;
        o.state = 0;
        o.state3 = 0;
      }
      break;
  }
}

function plant(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  if ((o.state2 & 0x0f) === 0) {
    switch (rand() % 8) {
      case 0:
        o.unionX = -TILE_UNIT;
        o.unionY = 0;
        break;
      case 1:
        o.unionX = TILE_UNIT;
        o.unionY = 0;
        break;
      case 2:
        o.unionX = -TILE_UNIT;
        o.unionY = -TILE_UNIT;
        break;
      case 3:
        o.unionX = -TILE_UNIT;
        o.unionY = TILE_UNIT;
        break;
      case 4:
        o.unionX = TILE_UNIT;
        o.unionY = -TILE_UNIT;
        break;
      case 5:
        o.unionX = TILE_UNIT;
        o.unionY = TILE_UNIT;
        break;
      case 6:
        o.unionX = 0;
        o.unionY = -TILE_UNIT;
        break;
      case 7:
        o.unionX = 0;
        o.unionY = TILE_UNIT;
        break;
    }
  }
  if (o.x < TILE_SIZE_X && o.unionX < 0) o.unionX = TILE_UNIT;
  if (o.x > TILE_SIZE_X * 29 && o.unionX > 0) o.unionX = -TILE_UNIT;
  if (o.y < TILE_SIZE_Y && o.unionY < 0) o.unionY = TILE_UNIT;
  if (o.y > TILE_SIZE_Y * 13 && o.unionY > 0) o.unionY = -TILE_UNIT;

  o.x += o.unionX;
  o.y += o.unionY;
  switch (o.state) {
    case 0:
      o.tile = 0;
      if ((o.state2 & 0x7f) === 0) {
        o.state = 1;
        playSound(sfx.enemybullet);
      }
      break;
    case 1:
      o.tile = 1;
      if ((o.state2 & 0x03) === 0) {
        // Fire
        const j = addObject(T_ENEMY, o.x + TILE_SIZE_X, o.y, 0, T_PLANT_BULLET, 0);
        object[j].state = (rand() % 15) - 8;
        object[j].state2 = -TILE_UNIT * 6;
        object[j].baseTile = tileIds.plant;
        object[j].tile = 2;
      }
      if ((o.state2 & 0x7f) === 0) o.state = 0;
      break;
  }
  o.state2++;
}

function plantBullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.x += o.state;
  o.y += o.state2;
  if (o.state2 < 8 * TILE_UNIT) o.state2++;
  if (o.x < -2 * TILE_SIZE_X || o.x >= SCREEN_X || o.y >= SCREEN_Y) {
    o.type = T_NADA;
  }
}

function demon7Bullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  switch (o.tile) {
    case 8:
      o.x += TILE_UNIT * 2;
      break;
    case 9:
      o.x -= TILE_UNIT * 2;
      break;
    case 10:
      o.y -= TILE_UNIT * 2;
      break;
    case 11:
      o.y += TILE_UNIT * 2;
      break;
    case 12:
      o.x -= TILE_UNIT;
      o.y -= TILE_UNIT;
      break;
    case 13:
      o.x += TILE_UNIT;
      o.y -= TILE_UNIT;
      break;
    case 14:
      o.x += TILE_UNIT;
      o.y += TILE_UNIT;
      break;
    case 15:
      o.x -= TILE_UNIT;
      o.y += TILE_UNIT;
      break;
  }
  if (o.x < -2 * TILE_SIZE_X || o.x >= SCREEN_X || o.y < -2 * TILE_SIZE_Y || o.y >= SCREEN_Y) {
    o.type = T_NADA;
  }
}

function witch2(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const col: boolean[] = [false, false, false, false];
  o.state2++;
  o.tile = (o.tile & 0x02) + ((o.state2 >> 3) % 2);

  ctx.collision = T_WALL | T_LADDER_WALL | T_DOOR_WALL;

  if (o.x % TILE_SIZE_X === 0 && o.y % TILE_SIZE_Y === 0) {
    const tx = idiv(o.x, TILE_SIZE_X);
    const ty = idiv(o.y, TILE_SIZE_Y);

    col[0] = isWall(tx + 2, ty) || isWall(tx + 2, ty + 1);
    col[1] = isWall(tx - 1, ty) || isWall(tx - 1, ty + 1);
    col[2] = isWall(tx, ty + 2) || isWall(tx + 1, ty + 2);
    col[3] = isWall(tx, ty - 1) || isWall(tx + 1, ty - 1);

    if (
      (tileHitsNative(tileIds.witch2 + o.tile, GAME_VIEW_X + o.x + 1 * TILE_SIZE_X, GAME_VIEW_Y + o.y) &
        ctx.collision) !==
      0
    )
      col[0] = true;
    if (
      (tileHitsNative(tileIds.witch2 + o.tile, GAME_VIEW_X + o.x - 1 * TILE_SIZE_X, GAME_VIEW_Y + o.y) &
        ctx.collision) !==
      0
    )
      col[1] = true;
    if (
      (tileHitsNative(tileIds.witch2 + o.tile, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y + TILE_SIZE_Y) & ctx.collision) !==
      0
    )
      col[2] = true;
    if (
      (tileHitsNative(tileIds.witch2 + o.tile, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y - TILE_SIZE_Y) & ctx.collision) !==
      0
    )
      col[3] = true;

    switch (o.state3) {
      case 0:
        if (!col[3]) {
          o.state3 = 2;
        } else {
          if (col[0]) {
            o.state3 = 6;
          }
        }
        break;
      case 1:
        if (!col[2]) {
          o.state3 = 7;
        } else {
          if (col[0]) {
            o.state3 = 3;
          }
        }
        break;
      case 2:
        if (!col[1]) {
          o.state3 = 4;
        } else {
          if (col[3]) {
            o.state3 = 0;
          }
        }
        break;
      case 3:
        if (!col[0]) {
          o.state3 = 1;
        } else {
          if (col[3]) {
            o.state3 = 5;
          }
        }
        break;
      case 4:
        if (!col[2]) {
          o.state3 = 6;
        } else {
          if (col[1]) {
            o.state3 = 2;
          }
        }
        break;
      case 5:
        if (!col[3]) {
          o.state3 = 3;
        } else {
          if (col[1]) {
            o.state3 = 7;
          }
        }
        break;
      case 6:
        if (!col[0]) {
          o.state3 = 0;
        } else {
          if (col[2]) {
            o.state3 = 4;
          }
        }
        break;
      case 7:
        if (!col[1]) {
          o.state3 = 5;
        } else {
          if (col[2]) {
            o.state3 = 1;
          }
        }
        break;
    }
  }

  switch (o.state3) {
    case 0:
    case 1:
      o.x += TILE_UNIT;
      o.tile = o.tile & 0x01;
      break;
    case 4:
    case 5:
      o.x -= TILE_UNIT;
      o.tile = o.tile | 0x02;
      break;
    case 6:
    case 7:
      o.y += TILE_UNIT;
      break;
    case 2:
    case 3:
      o.y -= TILE_UNIT;
      break;
  }
}

function flame(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  const collision = ctx.collision;
  let j: number;
  let tX: number, tY: number;
  o.state2++;
  switch (o.state) {
    case 0:
      if (o.state2 < 32) o.tile = 0;
      if (o.state2 >= 32 && o.state2 < 40) o.tile = 1;
      if (o.state2 >= 40 && o.state2 < 48) o.tile = 2;
      if (o.state2 >= 48 && o.state2 < 56) o.tile = 3;
      if (o.state2 >= 56) {
        o.state = 1;
        o.state2 = 0;
      }
      break;
    case 1:
      o.tile = 6 + ((o.state2 >> 3) % 2);
      if (
        (tileHits(tileIds.flame + o.tile, GAME_VIEW_X + o.x + TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x += TILE_UNIT;

        if (rand() % 200 === 0) {
          // Fire
          playSound(sfx.flamebullet);
          const j = addObject(T_ENEMY, o.x, o.y, 0, T_FLAME_BULLET, 0);
          object[j].state = G.playerX - o.x;
          object[j].state2 = G.playerY - o.y;
          object[j].baseTile = tileIds.flame;
          object[j].tile = 8;
        }
        if (o.state2 >= 256) {
          o.state = 3;
          o.state2 = 0;
        }
      } else {
        o.state = 2;
      }
      break;
    case 2:
      o.tile = 4 + ((o.state2 >> 3) % 2);
      if (
        (tileHits(tileIds.flame + o.tile, GAME_VIEW_X + o.x - TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x > 0 &&
        (collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x -= TILE_UNIT;

        if (rand() % 200 === 0) {
          // Fire
          //playSound(sfx.flamebullet);
          const j = addObject(T_ENEMY, o.x, o.y, 0, T_FLAME_BULLET, 0);
          object[j].state = G.playerX - o.x;
          object[j].state2 = G.playerY - o.y;
          object[j].baseTile = tileIds.flame;
          object[j].tile = 8;
        }
        if (o.state2 >= 256) {
          o.state = 3;
          o.state2 = 0;
        }
      } else {
        o.state = 1;
      }
      break;
    case 3:
      if (o.state2 < 32) o.tile = 3;
      if (o.state2 >= 32 && o.state2 < 40) o.tile = 2;
      if (o.state2 >= 40 && o.state2 < 48) o.tile = 1;
      if (o.state2 >= 48 && o.state2 < 56) o.tile = 0;
      if (o.state2 >= 56) {
        o.state = 4;
        o.state2 = 0;
        o.state3 = rand() % 12;
      }
      break;
    case 4:
      o.tile = (o.state2 >> 2) % 2;

      switch (o.state3) {
        case 0:
          o.y += TILE_UNIT * 2;
          break;
        case 1:
          o.y += TILE_UNIT * 2;
          o.x -= TILE_UNIT * 2;
          break;
        case 2:
          o.y -= TILE_UNIT * 2;
          o.x -= TILE_UNIT * 2;
          break;
        case 3:
          o.y -= TILE_UNIT * 2;
          break;
        case 4:
          o.y -= TILE_UNIT * 2;
          o.x += TILE_UNIT * 2;
          break;
        case 5:
          o.y += TILE_UNIT * 2;
          o.x += TILE_UNIT * 2;
          break;
        case 6:
          o.x += TILE_UNIT * 2;
          break;
        case 7:
          o.x -= TILE_UNIT * 2;
          break;

        case 8:
          o.y += TILE_UNIT * 2;
          o.x -= TILE_UNIT;
          break;
        case 9:
          o.y -= TILE_UNIT * 2;
          o.x -= TILE_UNIT;
          break;
        case 10:
          o.y -= TILE_UNIT * 2;
          o.x += TILE_UNIT;
          break;
        case 11:
          o.y += TILE_UNIT * 2;
          o.x += TILE_UNIT;
          break;
      }
      o.state2++;
      if (
        (o.state2 >= 16 && o.state3 !== -1) ||
        (o.state2 >= 32 && o.state3 === -1) ||
        o.y === (G.roomHeight - 2) * TILE_SIZE_Y
      ) {
        tX = idiv(o.x, TILE_SIZE_X);
        tY = idiv(o.y, TILE_SIZE_Y);
        if (
          isWall(tX, tY + 2) &&
          isWall(tX + 1, tY + 2) &&
          !isWall(tX, tY + 1) &&
          !isWall(tX + 1, tY + 1) &&
          rand() % 4 === 0
        ) {
          o.state = 0;
          o.state2 = 0;
        } else {
          o.state = 4;
          o.state2 = 0;

          // If the random number is greater than 11, keep the same direction
          j = o.state3;
          if (j === -1) o.state3 = rand() % 12;
          else o.state3 = rand() % 20;
          if (o.state3 > 11) o.state3 = j;

          if (o.x > (G.roomWidth - 7) * TILE_SIZE_X) {
            if (o.state3 === 4) o.state3 = 2;
            if (o.state3 === 5) o.state3 = 1;
            if (o.state3 === 6) o.state3 = 7;
            if (o.state3 === 10) o.state3 = 9;
            if (o.state3 === 11) o.state3 = 8;
          }
          if (o.x < TILE_SIZE_X * 5) {
            if (o.state3 === 2) o.state3 = 4;
            if (o.state3 === 1) o.state3 = 5;
            if (o.state3 === 7) o.state3 = 6;
            if (o.state3 === 9) o.state3 = 10;
            if (o.state3 === 8) o.state3 = 11;
          }
          if (o.y > (G.roomHeight - 4) * TILE_SIZE_Y) {
            if (o.state3 === 0) o.state3 = 3;
            if (o.state3 === 1) o.state3 = 2;
            if (o.state3 === 5) o.state3 = 4;
            if (o.state3 === 11) o.state3 = 10;
            if (o.state3 === 8) o.state3 = 9;
          }
          if (o.y < TILE_SIZE_Y * 5) {
            if (o.state3 === 3) o.state3 = 0;
            if (o.state3 === 2) o.state3 = 1;
            if (o.state3 === 4) o.state3 = 5;
            if (o.state3 === 10) o.state3 = 11;
            if (o.state3 === 9) o.state3 = 8;
          }
        }
      }
      break;
  }
}

/** T_FLAME_BULLET and T_TRANSF_BULLET share this body. */
function flameBullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  let j: number;
  for (j = 0; j < 2; j++) {
    if (Math.abs(o.state) > Math.abs(o.state2)) {
      o.x += o.state > 0 ? TILE_UNIT : -TILE_UNIT;
      o.state3 -= Math.abs(o.state2);
      if (o.state3 < 0) {
        o.state3 += Math.abs(o.state);
        o.y += o.state2 > 0 ? TILE_UNIT : -TILE_UNIT;
      }
    } else {
      o.y += o.state2 > 0 ? TILE_UNIT : -TILE_UNIT;
      o.state3 -= Math.abs(o.state);
      if (o.state3 < 0) {
        o.state3 += Math.abs(o.state2);
        o.x += o.state > 0 ? TILE_UNIT : -TILE_UNIT;
      }
    }
    if (o.x < -2 * TILE_SIZE_X || o.x >= SCREEN_X || o.y < -2 * TILE_SIZE_Y || o.y >= SCREEN_Y) {
      o.type = T_NADA;
    }
  }
}

function transformer(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  const collision = ctx.collision;
  let j: number;
  let tX: number, tY: number;
  o.state2++;
  switch (o.state) {
    case 0:
      if (o.state2 < 32) o.tile = 0;
      if (o.state2 >= 32 && o.state2 < 48) o.tile = 1;
      if (o.state2 >= 48 && o.state2 < 64) o.tile = 2;
      if (o.state2 >= 64) {
        o.state = 1;
        o.state2 = 0;
      }
      break;
    case 1:
      o.tile = 5 + ((o.state2 >> 3) % 2);
      if (
        (tileHits(tileIds.transformer + o.tile, GAME_VIEW_X + o.x + TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x += TILE_UNIT;

        if (rand() % 200 === 0) {
          // Fire
          playSound(sfx.enemybullet);
          const j = addObject(T_ENEMY, o.x, o.y, 0, T_TRANSF_BULLET, 0);
          object[j].state = G.playerX - o.x;
          object[j].state2 = G.playerY - o.y;
          object[j].baseTile = tileIds.transformer;
          object[j].tile = 10;
        }
        if (o.state2 >= 256) {
          o.state = 3;
          o.state2 = 0;
        }
      } else {
        o.state = 2;
      }
      break;
    case 2:
      o.tile = 7 + ((o.state2 >> 3) % 2);
      if (
        (tileHits(tileIds.transformer + o.tile, GAME_VIEW_X + o.x - TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        o.x > 0 &&
        (collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x -= TILE_UNIT;

        if (rand() % 200 === 0) {
          // Fire
          playSound(sfx.enemybullet);
          const j = addObject(T_ENEMY, o.x, o.y, 0, T_TRANSF_BULLET, 0);
          object[j].state = G.playerX - o.x;
          object[j].state2 = G.playerY - o.y;
          object[j].baseTile = tileIds.transformer;
          object[j].tile = 10;
        }
        if (o.state2 >= 256) {
          o.state = 3;
          o.state2 = 0;
        }
      } else {
        o.state = 1;
      }
      break;
    case 3:
      if (o.state2 < 16) o.tile = 9;
      if (o.state2 >= 16 && o.state2 < 32) o.tile = 1;
      if (o.state2 >= 32 && o.state2 < 48) o.tile = 0;
      if (o.state2 >= 48 && o.state2 < 64) o.tile = 2;
      if (o.state2 >= 64) {
        o.state = 4;
        o.state2 = 0;
        o.state3 = rand() % 12;
      }
      break;
    case 4:
      o.tile = 3 + ((o.state2 >> 3) % 2);

      switch (o.state3) {
        case 0:
          o.y += TILE_UNIT * 2;
          break;
        case 1:
          o.y += TILE_UNIT * 2;
          o.x -= TILE_UNIT * 2;
          break;
        case 2:
          o.y -= TILE_UNIT * 2;
          o.x -= TILE_UNIT * 2;
          break;
        case 3:
          o.y -= TILE_UNIT * 2;
          break;
        case 4:
          o.y -= TILE_UNIT * 2;
          o.x += TILE_UNIT * 2;
          break;
        case 5:
          o.y += TILE_UNIT * 2;
          o.x += TILE_UNIT * 2;
          break;
        case 6:
          o.x += TILE_UNIT * 2;
          break;
        case 7:
          o.x -= TILE_UNIT * 2;
          break;

        case 8:
          o.y += TILE_UNIT * 2;
          o.x -= TILE_UNIT;
          break;
        case 9:
          o.y -= TILE_UNIT * 2;
          o.x -= TILE_UNIT;
          break;
        case 10:
          o.y -= TILE_UNIT * 2;
          o.x += TILE_UNIT;
          break;
        case 11:
          o.y += TILE_UNIT * 2;
          o.x += TILE_UNIT;
          break;
      }
      o.state2++;
      if (
        (o.state2 >= 16 && o.state3 !== -1) ||
        (o.state2 >= 32 && o.state3 === -1) ||
        o.y === (G.roomHeight - 2) * TILE_SIZE_Y
      ) {
        tX = idiv(o.x, TILE_SIZE_X);
        tY = idiv(o.y, TILE_SIZE_Y);
        if (
          isWall(tX, tY + 2) &&
          isWall(tX + 1, tY + 2) &&
          !isWall(tX, tY + 1) &&
          !isWall(tX + 1, tY + 1) &&
          rand() % 4 === 0
        ) {
          o.state = 0;
          o.state2 = 0;
        } else {
          o.state = 4;
          o.state2 = 0;

          // If the random number is greater than 11, keep the same direction
          j = o.state3;
          if (j === -1) o.state3 = rand() % 12;
          else o.state3 = rand() % 20;
          if (o.state3 > 11) o.state3 = j;

          if (o.x > (G.roomWidth - 7) * TILE_SIZE_X) {
            if (o.state3 === 4) o.state3 = 2;
            if (o.state3 === 5) o.state3 = 1;
            if (o.state3 === 6) o.state3 = 7;
            if (o.state3 === 10) o.state3 = 9;
            if (o.state3 === 11) o.state3 = 8;
          }
          if (o.x < TILE_SIZE_X * 5) {
            if (o.state3 === 2) o.state3 = 4;
            if (o.state3 === 1) o.state3 = 5;
            if (o.state3 === 7) o.state3 = 6;
            if (o.state3 === 9) o.state3 = 10;
            if (o.state3 === 8) o.state3 = 11;
          }
          if (o.y > (G.roomHeight - 4) * TILE_SIZE_Y) {
            if (o.state3 === 0) o.state3 = 3;
            if (o.state3 === 1) o.state3 = 2;
            if (o.state3 === 5) o.state3 = 4;
            if (o.state3 === 11) o.state3 = 10;
            if (o.state3 === 8) o.state3 = 9;
          }
          if (o.y < TILE_SIZE_Y * 5) {
            if (o.state3 === 3) o.state3 = 0;
            if (o.state3 === 2) o.state3 = 1;
            if (o.state3 === 4) o.state3 = 5;
            if (o.state3 === 10) o.state3 = 11;
            if (o.state3 === 9) o.state3 = 8;
          }
        }
      }
      break;
  }
}

function cyclops(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  o.state2++;
  o.tile = (o.state2 >> 3) % 2;

  switch (o.state3) {
    case 0:
      o.y += idiv(TILE_UNIT, 2);
      break;
    case 1:
      o.y += idiv(TILE_UNIT, 2);
      o.x -= idiv(TILE_UNIT, 2);
      break;
    case 2:
      o.y -= idiv(TILE_UNIT, 2);
      o.x -= idiv(TILE_UNIT, 2);
      break;
    case 3:
      o.y -= idiv(TILE_UNIT, 2);
      break;
    case 4:
      o.y -= idiv(TILE_UNIT, 2);
      o.x += idiv(TILE_UNIT, 2);
      break;
    case 5:
      o.y += idiv(TILE_UNIT, 2);
      o.x += idiv(TILE_UNIT, 2);
      break;
    case 6:
      o.x += idiv(TILE_UNIT, 2);
      break;
    case 7:
      o.x -= idiv(TILE_UNIT, 2);
      break;
  }
  if (o.state2 >= 32 || o.y === (G.roomHeight - 2) * TILE_SIZE_Y) {
    if (o.state3 === -1) {
      // Fire a ray
      const j = addObject(T_ENEMY, o.x + TILE_SIZE_X, o.y + TILE_SIZE_Y, 0, T_CYCLOPS_BULLET, 0);
      object[j].baseTile = tileIds.cyclops;
      // NOTE (original, fixed): the C++ assigned this direction to animateObjects's own
      // dx/dy parameters (the screen size), corrupting collision addressing for the
      // objects after this one in the same frame. Here it is a local.
      const rx = G.playerX - (o.x + 1 * TILE_SIZE_X);
      const ry = G.playerY - (o.y + 1 * TILE_SIZE_Y);
      if (Math.abs(rx) > Math.abs(ry) * 2) {
        object[j].tile = 5;
        if (rx > 0) {
          object[j].state = 8;
        } else {
          object[j].state = 9;
        }
      } else {
        if (Math.abs(ry) > Math.abs(rx) * 2) {
          object[j].tile = 4;
          if (ry > 0) {
            object[j].state = 11;
          } else {
            object[j].state = 10;
          }
        } else {
          if (rx < 0) {
            if (ry < 0) {
              object[j].tile = 2;
              object[j].state = 12;
            } else {
              object[j].tile = 3;
              object[j].state = 15;
            }
          } else {
            if (ry < 0) {
              object[j].tile = 3;
              object[j].state = 13;
            } else {
              object[j].tile = 2;
              object[j].state = 14;
            }
          }
        }
      }
    }
    if (o.state3 !== -1 && rand() % 80 <= 20) {
      o.state3 = -1;
      o.state2 = 0;
    } else {
      o.state2 = 0;

      // If the random number is greater than 7, go towards the character
      o.state3 = rand() % 15;
      if (o.state3 > 7) {
        // Block-local dx/dy in the original (shadow the parameters).
        const dx = G.playerX - (o.x + 1 * TILE_SIZE_X);
        const dy = G.playerY - (o.y + 1 * TILE_SIZE_Y);
        if (Math.abs(dx) > Math.abs(dy) * 2) {
          if (dx > 0) {
            o.state3 = 6;
          } else {
            o.state3 = 7;
          }
        } else {
          if (Math.abs(dy) > Math.abs(dx) * 2) {
            if (dy > 0) {
              o.state3 = 0;
            } else {
              o.state3 = 3;
            }
          } else {
            if (dx < 0) {
              if (dy < 0) {
                o.state3 = 2;
              } else {
                o.state3 = 1;
              }
            } else {
              if (dy < 0) {
                o.state3 = 4;
              } else {
                o.state3 = 5;
              }
            }
          }
        }
      }

      if (o.x > (G.roomWidth - 7) * TILE_SIZE_X) {
        if (o.state3 === 4) o.state3 = 2;
        if (o.state3 === 5) o.state3 = 1;
        if (o.state3 === 6) o.state3 = 7;
        if (o.state3 === 10) o.state3 = 9;
        if (o.state3 === 11) o.state3 = 8;
      }
      if (o.x < TILE_SIZE_X * 5) {
        if (o.state3 === 2) o.state3 = 4;
        if (o.state3 === 1) o.state3 = 5;
        if (o.state3 === 7) o.state3 = 6;
        if (o.state3 === 9) o.state3 = 10;
        if (o.state3 === 8) o.state3 = 11;
      }
      if (o.y > (G.roomHeight - 4) * TILE_SIZE_Y) {
        if (o.state3 === 0) o.state3 = 3;
        if (o.state3 === 1) o.state3 = 2;
        if (o.state3 === 5) o.state3 = 4;
        if (o.state3 === 11) o.state3 = 10;
        if (o.state3 === 8) o.state3 = 9;
      }
      if (o.y < TILE_SIZE_Y * 5) {
        if (o.state3 === 3) o.state3 = 0;
        if (o.state3 === 2) o.state3 = 1;
        if (o.state3 === 4) o.state3 = 5;
        if (o.state3 === 10) o.state3 = 11;
        if (o.state3 === 9) o.state3 = 8;
      }
    }
  }
}

function cyclopsBullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  switch (o.state) {
    case 8:
      o.x += TILE_UNIT * 2;
      break;
    case 9:
      o.x -= TILE_UNIT * 2;
      break;
    case 10:
      o.y -= TILE_UNIT * 2;
      break;
    case 11:
      o.y += TILE_UNIT * 2;
      break;
    case 12:
      o.x -= TILE_UNIT;
      o.y -= TILE_UNIT;
      break;
    case 13:
      o.x += TILE_UNIT;
      o.y -= TILE_UNIT;
      break;
    case 14:
      o.x += TILE_UNIT;
      o.y += TILE_UNIT;
      break;
    case 15:
      o.x -= TILE_UNIT;
      o.y += TILE_UNIT;
      break;
  }
  if (o.x < -2 * TILE_SIZE_X || o.x >= 32 * TILE_SIZE_X || o.y < -2 * TILE_SIZE_Y || o.y >= 20 * TILE_SIZE_Y) {
    o.type = T_NADA;
  }
}

function demon8Bullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const step = TILE_UNIT * 4;

  ctx.collision = T_WALL | T_LADDER_WALL | T_DOOR_WALL;
  const collision = ctx.collision;
  o.state2++;
  if (o.state2 >= 1024) o.type = T_NADA;

  switch (o.state) {
    case 0: // - -
      if (
        (tileHits(o.baseTile + o.tile, GAME_VIEW_X + o.x - step, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x - step > 0
      ) {
        if (
          (tileHits(o.baseTile + o.tile, GAME_VIEW_X + o.x - step, GAME_VIEW_Y + o.y - step) & collision) === 0 &&
          o.y - step > 0
        ) {
          o.x -= step;
          o.y -= step;
        } else {
          o.x -= step;
          o.y += step;
          o.state = 1;
        }
      } else {
        if (
          (tileHits(o.baseTile + o.tile, GAME_VIEW_X + o.x + step, GAME_VIEW_Y + o.y - step) & collision) === 0 &&
          o.y - step > 0
        ) {
          o.x += step;
          o.y -= step;
          o.state = 2;
        } else {
          o.x += step;
          o.y += step;
          o.state = 3;
        }
      }
      break;
    case 1: // - +
      if (
        (tileHits(o.baseTile + o.tile, GAME_VIEW_X + o.x - step, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x - step > 0
      ) {
        if (
          (tileHits(o.baseTile + o.tile, GAME_VIEW_X + o.x - step, GAME_VIEW_Y + o.y + step) & collision) === 0 &&
          o.y + step < 18 * TILE_SIZE_X
        ) {
          o.x -= step;
          o.y += step;
        } else {
          o.x -= step;
          o.y -= step;
          o.state = 0;
        }
      } else {
        if (
          (tileHits(o.baseTile + o.tile, GAME_VIEW_X + o.x + step, GAME_VIEW_Y + o.y + step) & collision) === 0 &&
          o.y + step < 18 * TILE_SIZE_X
        ) {
          o.x += step;
          o.y += step;
          o.state = 3;
        } else {
          o.x += step;
          o.y -= step;
          o.state = 2;
        }
      }
      break;
    case 2: // + -
      if (
        (tileHits(o.baseTile + o.tile, GAME_VIEW_X + o.x + step, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x + step < 30 * TILE_SIZE_X
      ) {
        if (
          (tileHits(o.baseTile + o.tile, GAME_VIEW_X + o.x + step, GAME_VIEW_Y + o.y - step) & collision) === 0 &&
          o.y - step > 0
        ) {
          o.x += step;
          o.y -= step;
        } else {
          o.x += step;
          o.y += step;
          o.state = 3;
        }
      } else {
        if (
          (tileHits(o.baseTile + o.tile, GAME_VIEW_X + o.x - step, GAME_VIEW_Y + o.y - step) & collision) === 0 &&
          o.y - step > 0
        ) {
          o.x -= step;
          o.y -= step;
          o.state = 0;
        } else {
          o.x -= step;
          o.y += step;
          o.state = 1;
        }
      }
      break;
    case 3: // + +
      if (
        (tileHits(o.baseTile + o.tile, GAME_VIEW_X + o.x + step, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x + step < 30 * TILE_SIZE_X
      ) {
        if (
          (tileHits(o.baseTile + o.tile, GAME_VIEW_X + o.x + step, GAME_VIEW_Y + o.y + step) & collision) === 0 &&
          o.y + step < 18 * TILE_SIZE_X
        ) {
          o.x += step;
          o.y += step;
        } else {
          o.x += step;
          o.y -= step;
          o.state = 2;
        }
      } else {
        if (
          (tileHits(o.baseTile + o.tile, GAME_VIEW_X + o.x - step, GAME_VIEW_Y + o.y + step) & collision) === 0 &&
          o.y + step < 18 * TILE_SIZE_X
        ) {
          o.x -= step;
          o.y += step;
          o.state = 1;
        } else {
          o.x -= step;
          o.y -= step;
          o.state = 0;
        }
      }
      break;
  }
}

function snake(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  const collision = ctx.collision;

  o.state2++;

  if (G.playerX > o.x && o.y === G.playerY && o.state < 2 && o.state3 <= 96) {
    o.state = 3;
    o.state2 = 0;
  }
  if (G.playerX < o.x && o.y === G.playerY && o.state < 2 && o.state3 <= 96) {
    o.state = 2;
    o.state2 = 0;
  }

  if (o.state < 2 && rand() % 300 === 0) {
    o.state += 2;
    o.state2 = 0;
  }

  switch (o.state) {
    case 0:
      if (o.state3 >= 0) o.state3--;
      o.tile = (o.state2 >> 3) & 0x01;
      if (
        (tileHits(tileIds.snake + o.tile, GAME_VIEW_X + o.x - TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x > 0 &&
        (collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x -= TILE_UNIT;
      } else {
        o.state = 1;
      }
      break;
    case 1:
      if (o.state3 >= 0) o.state3--;
      o.tile = ((o.state2 >> 3) & 0x01) + 2;
      if (
        (tileHits(tileIds.snake + o.tile, GAME_VIEW_X + o.x + TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x += TILE_UNIT;
      } else {
        o.state = 0;
      }
      break;
    case 2:
      o.state3++;
      o.tile = 4;
      if (o.state2 === 32) {
        playSound(sfx.snakebullet);
        const val = addObject(T_ENEMY, o.x - TILE_SIZE_X, o.y + idiv(TILE_SIZE_Y, 2), 1, T_SNAKE_BULLET, 0);
        object[val].baseTile = tileIds.snake;
        o.desiredFloor = val;
        object[val].tile = 7;
      }
      if (o.state2 >= 64 && object[o.desiredFloor].type !== T_ENEMY) {
        o.state = 0;
        o.state2 = 0;
      }
      break;
    case 3:
      o.state3++;
      o.tile = 5;
      if (o.state2 === 32) {
        playSound(sfx.snakebullet);
        const val = addObject(T_ENEMY, o.x + TILE_SIZE_X, o.y + idiv(TILE_SIZE_Y, 2), 1, T_SNAKE_BULLET, 1);
        object[val].baseTile = tileIds.snake;
        o.desiredFloor = val;
        object[val].tile = 6;
      }
      if (o.state2 >= 64 && object[o.desiredFloor].type !== T_ENEMY) {
        o.state = 1;
        o.state2 = 0;
      }
      break;
  }
}

function snakeBullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  if ((tileHits(tileIds.snake + o.tile, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y) & collision) !== 0) {
    o.type = T_NADA;
  }

  if (o.state === 0) o.x -= idiv(TILE_SIZE_X, 2);
  else o.x += idiv(TILE_SIZE_X, 2);

  if (o.x < -2 * TILE_SIZE_X || o.x > G.roomWidth * TILE_SIZE_X) {
    o.type = T_NADA;
  }
}

function gorilla(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  o.state2++;

  if ((o.y === G.playerY || o.y === G.playerY + 4 * TILE_SIZE_Y) && o.state < 2) {
    o.state = 2;
    o.state2 = 0;
  }

  // NOTE (original): the gorilla tests collisions with the snake tiles (snakeTile).
  switch (o.state) {
    case 0:
      o.tile = (o.state2 >> 3) & 0x01;
      if (
        (tileHits(tileIds.snake + o.tile, GAME_VIEW_X + o.x - TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x > 0 &&
        (collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x -= TILE_UNIT * 2;
      } else {
        o.state = 1;
      }
      break;
    case 1:
      o.tile = ((o.state2 >> 3) & 0x01) + 2;
      if (
        (tileHits(tileIds.snake + o.tile, GAME_VIEW_X + o.x + TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x += TILE_UNIT * 2;
      } else {
        o.state = 0;
      }
      break;
    case 2:
      o.tile = 4 + ((o.state2 >> 3) & 0x01);
      if (o.state2 >= 48) {
        o.unionX = G.playerX;
        if (G.playerX < o.x) o.state = 3;
        else o.state = 4;
      }
      break;
    case 3:
      o.tile = (o.state2 >> 3) & 0x01;
      if (
        (tileHits(tileIds.snake + o.tile, GAME_VIEW_X + o.x - TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x > 0 &&
        (collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x -= TILE_UNIT * 2;
      } else {
        o.state = 1;
      }
      if (Math.abs(o.x - o.unionX) <= TILE_UNIT * 2) {
        o.state = 5;
        o.state2 = 0;
        o.tile = 7;
        playSound(sfx.gorilla);
      }
      break;
    case 4:
      o.tile = ((o.state2 >> 3) & 0x01) + 2;
      if (
        (tileHits(tileIds.snake + o.tile, GAME_VIEW_X + o.x + TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x += TILE_UNIT * 2;
      } else {
        o.state = 0;
      }
      if (Math.abs(o.x - o.unionX) <= TILE_UNIT * 2) {
        o.state = 6;
        o.state2 = 0;
        o.tile = 7;
        playSound(sfx.gorilla);
      }
      break;
    case 5:
    case 6:
      o.tile = 7;
      if (o.state2 >= 16) {
        o.state -= 5;
        o.state2 = 0;
      }
      break;
  }
}

function glizard(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  const collision = ctx.collision;
  o.state2++;

  if (o.x >= G.playerX - 3 * TILE_SIZE_X && o.x <= G.playerX + 1 * TILE_SIZE_Y && o.state < 2 && o.state2 >= 32) {
    let val: number;

    playSound(sfx.lizardtongue);
    if (G.playerY <= o.y) {
      o.state += 2;
      o.state2 = 0;

      val = addObject(T_ENEMY, o.x, o.y, 6, T_GLIZARD_TONGUE, 0);
      object[val].baseTile = tileIds.glizard;
    } else {
      o.state += 4;
      o.state2 = 0;

      val = addObject(T_ENEMY, o.x, o.y, 6, T_GLIZARD_TONGUE, 1);
      object[val].baseTile = tileIds.glizard;
    }
  }

  // NOTE (original): the lizard tests collisions with the snake tiles (snakeTile).
  switch (o.state) {
    case 0:
      o.tile = (o.state2 >> 1) & 0x01;
      if (
        (tileHits(
          tileIds.snake + o.tile,
          GAME_VIEW_X + o.x - TILE_UNIT * 2,
          GAME_VIEW_Y + o.y,
          TILE_SIZE_X * 4,
          TILE_SIZE_Y * 2,
        ) &
          collision) ===
          0 &&
        o.x > 0 &&
        (collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x -= TILE_UNIT * 2;
      } else {
        o.state = 1;
      }
      break;
    case 1:
      o.tile = (o.state2 >> 1) & 0x01;
      if (
        (tileHits(
          tileIds.snake + o.tile,
          GAME_VIEW_X + o.x + TILE_UNIT * 2,
          GAME_VIEW_Y + o.y,
          TILE_SIZE_X * 4,
          TILE_SIZE_Y * 2,
        ) &
          collision) ===
          0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 4, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x += TILE_UNIT * 2;
      } else {
        o.state = 0;
      }
      break;
    case 2:
    case 3:
      o.tile = 0;
      if (o.state2 >= 48) {
        o.state2 = 0;
        o.state -= 2;
      }
      break;
    case 4:
    case 5:
      o.tile = 0;
      if (o.state2 >= 48) {
        o.state2 = 0;
        o.state -= 4;
      }
      break;
  }
}

function glizardTongue(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state2++;
  if (o.state2 >= 48) o.type = T_NADA;
}

function bdemon(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  let j: number;
  o.state2++;
  o.tile = (o.state2 >> 3) % 2;
  switch (o.state) {
    case 0:
      o.state3 = 0;
      o.desiredFloor = 2;
      o.state2 = 320;
      o.state = 1;
      o.unionX = 5 * TILE_SIZE_X + (rand() % 18) * TILE_SIZE_X;
      o.unionY = 5 * TILE_SIZE_Y + (rand() % 6) * TILE_SIZE_Y;

      o.unionX = idiv(o.unionX + G.playerX, 2);
      o.unionY = idiv(o.unionY + G.playerY, 2);
      if (o.unionX < 5 * TILE_SIZE_X) o.unionX = 5 * TILE_SIZE_X;
      if (o.unionX > 23 * TILE_SIZE_X) o.unionX = 23 * TILE_SIZE_X;
      // NOTE (original): the unionY clamps assign unionX.
      if (o.unionY < 5 * TILE_SIZE_Y) o.unionX = 5 * TILE_SIZE_Y;
      if (o.unionY > 11 * TILE_SIZE_Y) o.unionX = 11 * TILE_SIZE_Y;
    // falls through
    case 1:
      o.state3 += o.desiredFloor;
      if ((o.state2 & 0x1f) === 0 && o.desiredFloor < 9) {
        o.desiredFloor++;
      }
      if (o.state2 >= 640) {
        o.state = 2;
        o.state2 = 0;
      }
      break;
    case 2:
      o.state3 += o.desiredFloor;
      if ((o.state2 & 0x1f) === 0 && o.desiredFloor > -9) {
        o.desiredFloor--;
      }
      if (o.state2 >= 640) {
        o.state = 1;
        o.state2 = 0;
      }
      break;
  }

  if (Math.abs(o.desiredFloor) > 2 && (o.state2 & 0x01) === 0) {
    if (o.x !== o.unionX) {
      if (o.x < o.unionX) o.x += idiv(TILE_UNIT, 2);
      else o.x -= idiv(TILE_UNIT, 2);
      if (o.y !== o.unionY) {
        if (o.y < o.unionY) o.y += idiv(TILE_UNIT, 2);
        else o.y -= idiv(TILE_UNIT, 2);
      }
    } else {
      if (o.y !== o.unionY) {
        if (o.y < o.unionY) o.y += idiv(TILE_UNIT, 2);
        else o.y -= idiv(TILE_UNIT, 2);
      } else {
        o.unionX = 5 * TILE_SIZE_X + idiv((rand() % 18) * TILE_SIZE_X, 2);
        o.unionY = 5 * TILE_SIZE_Y + idiv((rand() % 6) * TILE_SIZE_Y, 2);

        o.unionX = idiv(o.unionX + G.playerX, 2);
        o.unionY = idiv(o.unionY + G.playerY, 2);
        if (o.unionX < 5 * TILE_SIZE_X) o.unionX = 5 * TILE_SIZE_X;
        if (o.unionX > 23 * TILE_SIZE_X) o.unionX = 23 * TILE_SIZE_X;
        // NOTE (original): the unionY clamps assign unionX.
        if (o.unionY < 5 * TILE_SIZE_Y) o.unionX = 5 * TILE_SIZE_Y;
        if (o.unionY > 11 * TILE_SIZE_Y) o.unionX = 11 * TILE_SIZE_Y;
      }
    }
  }

  if ((o.state2 & 0x3f) === 0x3f) {
    playSound(sfx.bdemonbullet);
    j = addObject(
      T_ENEMY,
      o.x + TILE_SIZE_X + idiv(TILE_SIZE_X, 2) + o.xoffs,
      o.y + TILE_SIZE_Y * 2 + o.yoffs,
      0,
      T_BDEMON_BULLET,
      0,
    );
    object[j].state = G.playerX - object[j].x;
    object[j].state2 = G.playerY - object[j].y;
    object[j].baseTile = tileIds.bdemon;
    object[j].tile = 2;
  }

  o.xoffs = toInt(Math.cos(o.state3 / 80.0) * 5 * TILE_SIZE_X);
  o.yoffs = toInt(Math.sin(o.state3 / 80.0) * 5 * TILE_SIZE_Y);
}

function bdemonBullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  let j: number;
  for (j = 0; j < 2; j++) {
    if (Math.abs(o.state) > Math.abs(o.state2)) {
      o.x += o.state > 0 ? TILE_UNIT : -TILE_UNIT;
      o.state3 -= Math.abs(o.state2);
      if (o.state3 < 0) {
        o.state3 += Math.abs(o.state);
        o.y += o.state2 > 0 ? TILE_UNIT : -TILE_UNIT;
      }
    } else {
      o.y += o.state2 > 0 ? TILE_UNIT : -TILE_UNIT;
      o.state3 -= Math.abs(o.state);
      if (o.state3 < 0) {
        o.state3 += Math.abs(o.state2);
        o.x += o.state > 0 ? TILE_UNIT : -TILE_UNIT;
      }
    }
    if (o.x < -2 * TILE_SIZE_X || o.x >= SCREEN_X || o.y < -2 * TILE_SIZE_Y || o.y >= SCREEN_Y) {
      o.type = T_NADA;
    }
  }
}

function lcloud(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const object = G.objects;
  let j: number;
  if (rand() % 32 !== 0) o.state2++;

  switch (o.state) {
    case 0:
      o.tile = (o.state2 >> 3) % 2;
      if ((o.state2 & 0x01) === 0) o.x += idiv(TILE_UNIT, 2);
      if (o.x >= 27 * TILE_SIZE_X) o.state = 1;
      if (rand() % 300 === 0) {
        o.state += 2;
        o.state3 = 0;
      }
      break;
    case 1:
      o.tile = (o.state2 >> 3) % 2;
      if ((o.state2 & 0x01) === 0) o.x -= idiv(TILE_UNIT, 2);
      if (o.x <= 2 * TILE_SIZE_X) o.state = 0;
      if (rand() % 300 === 0) {
        o.state += 2;
        o.state3 = 0;
      }
      break;
    case 2:
      o.state3++;
      o.tile = ((o.state2 >> 3) % 2) + (o.state2 & 0x01) * 2;
      if ((o.state2 & 0x01) === 0) o.x += idiv(TILE_UNIT, 2);
      if (o.x >= 28 * TILE_SIZE_X) o.state = 3;
      if (o.state3 >= 32) {
        playSound(sfx.lightning);
        // Lightning
        const j = addObject(T_ENEMY, o.x, o.y + TILE_SIZE_Y * 2 + o.yoffs, 0, T_LIGHTNING, 0);
        object[j].baseTile = tileIds.lcloud;
        o.state -= 2;
      }
      break;
    case 3:
      o.state3++;
      o.tile = ((o.state2 >> 3) % 2) + (o.state2 & 0x01) * 2;
      if ((o.state2 & 0x01) === 0) o.x -= idiv(TILE_UNIT, 2);
      if (o.x <= 2 * TILE_SIZE_X) o.state = 2;
      if (o.state3 >= 32) {
        playSound(sfx.lightning);
        // Lightning
        j = addObject(T_ENEMY, o.x, o.y + TILE_SIZE_Y * 2 + o.yoffs, 0, T_LIGHTNING, 0);
        object[j].baseTile = tileIds.lcloud;
        o.state -= 2;
      }
      break;
  }

  o.yoffs = toInt((Math.sin(o.state2 / 10.0) * TILE_SIZE_Y) / 2);
}

function lightning(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state2++;
  o.state++;
  if (o.state - 1 < 6) {
    o.state3++;
    o.lightning[o.state - 1] = rand() % 5;
  } else {
    const init = [6, 10, 15, 3, 3];
    const end = [5, 5, 10, 13, 13];
    let j: number;

    o.y += 2 * TILE_SIZE_Y;
    o.x += (end[o.lightning[0]] - init[o.lightning[1]]) * TILE_UNIT;

    for (j = 0; j < 5; j++) o.lightning[j] = o.lightning[j + 1];
    o.lightning[5] = rand() % 5;

    if (o.state >= 9) {
      o.state3--;
      if (o.state3 === 0) {
        const tx = idiv(o.x, TILE_SIZE_X);
        if (isWall(tx, 19) && isWall(tx + 1, 19)) {
          o.enemy = T_LIGHTNING_FIRE;
          o.y = 17 * TILE_SIZE_Y;
          o.tile = 4;
          playSound(sfx.firebreath);
        } else {
          o.type = T_NADA;
        }
      }
    }
  }
}

function lightningFire(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state2++;
  o.tile = 4 + ((o.state2 >> 2) % 2);
  if (o.state2 >= 32) o.type = T_NADA;
}

function demon10Ball(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  if (o.state === 0) {
    o.state2++;
    o.tile = 4 + (o.state2 % 5);
    o.xoffs = toInt(Math.cos(o.state2 / 5.0) * o.state3);
    o.yoffs = toInt(Math.sin(o.state2 / 5.0) * o.state3);
  } else {
    o.tile = -1;
  }
}

function pamperseBall(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state2++;
  o.xoffs = toInt(Math.cos(o.state2 / 16.0) * o.state);
  o.yoffs = toInt(Math.sin(o.state2 / 16.0) * o.state);
  o.state++;
  if (
    o.x + o.xoffs < -2 * TILE_SIZE_X ||
    o.x + o.xoffs >= 32 * TILE_SIZE_X ||
    o.y + o.yoffs < -2 * TILE_SIZE_Y ||
    o.y + o.yoffs >= 20 * TILE_SIZE_X
  ) {
    o.type = T_NADA;
  }
}

export const ENEMY_UPDATERS_B: Record<number, EnemyUpdater> = {
  [T_PIRANHA]: piranha,
  [T_PIRANHA2]: piranha2,
  [T_WHITESTAR]: whitestar,
  [T_SPIDER]: spider,
  [T_KNIGHTHEAD]: knighthead,
  [T_CHICKEN]: chicken,
  [T_CHICKEN_EGG]: chickenEgg,
  [T_EGG_EXPLOSION]: eggExplosion,
  [T_CLOUD]: cloud,
  [T_ROCKMAN]: rockman,
  [T_BFLY_MEDIUM]: bfly,
  [T_BFLY_LARGE]: bfly,
  [T_BFLY_GIANT]: bfly,
  [T_BFLY_SMALL]: bfly,
  [T_BFLY_BULLET]: bflyBullet,
  [T_ARMOUR_ARROW]: armourArrow,
  [T_GHOST]: ghost,
  [T_GHOST_BULLET]: ghostBullet,
  [T_HEAD]: head,
  [T_HEAD_BULLET]: headBullet,
  [T_WORM2]: worm2,
  [T_OCTOPUS]: octopus,
  [T_HAIRY]: hairy,
  [T_HAIRYBULLET]: hairybullet,
  [T_WATERDRAGON]: waterdragon,
  [T_WATERBUG]: waterbug,
  [T_BIRD]: bird,
  [T_STONEMAN]: stoneman,
  [T_STONEMAN_BULLET]: stonemanBullet,
  [T_PACMAN]: pacman,
  [T_REDDRAGON]: reddragon,
  [T_REDDRAGON_BULLET]: reddragonBullet,
  [T_DEMON6_BULLET]: demon6Bullet,
  [T_OWL]: owl,
  [T_GREENMONKEY]: greenmonkey,
  [T_PLANT]: plant,
  [T_PLANT_BULLET]: plantBullet,
  [T_DEMON7_BULLET]: demon7Bullet,
  [T_WITCH2]: witch2,
  [T_FLAME]: flame,
  [T_FLAME_BULLET]: flameBullet,
  [T_TRANSF_BULLET]: flameBullet,
  [T_TRANSFORMER]: transformer,
  [T_CYCLOPS]: cyclops,
  [T_CYCLOPS_BULLET]: cyclopsBullet,
  [T_DEMON8_BULLET]: demon8Bullet,
  [T_SNAKE]: snake,
  [T_SNAKE_BULLET]: snakeBullet,
  [T_GORILLA]: gorilla,
  [T_GLIZARD]: glizard,
  [T_GLIZARD_TONGUE]: glizardTongue,
  [T_BDEMON]: bdemon,
  [T_BDEMON_BULLET]: bdemonBullet,
  [T_LCLOUD]: lcloud,
  [T_LIGHTNING]: lightning,
  [T_LIGHTNING_FIRE]: lightningFire,
  [T_DEMON10_BALL]: demon10Ball,
  [T_PAMPERSE_BALL]: pamperseBall,
};
