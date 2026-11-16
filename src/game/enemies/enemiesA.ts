/**
 * Enemy cases T_WORM … T_LAVA3 of the big `switch(object[i].enemy)` in
 * GameObjectAnimation (gameobjects.cpp). One function per `case`; `break`
 * became `return` (or the end of the function).
 *
 * The function-level C locals `j`, `t_x`, `t_y` are only used inside single
 * cases and always assigned before being read, so they are locals here.
 * `collision` comes from `ctx` (set to T_WALL|T_LADDER_WALL|T_DOOR_WALL before
 * every enemy); cases that declare their own block-local `collision` in C
 * (T_FSTONE, T_BLOB) shadow it with a local constant here as well.
 */
import { playSound } from '../../platform/audio';
import {
  GAME_VIEW_X,
  GAME_VIEW_Y,
  S_JUMPING,
  S_JUMPING_SWORD,
  S_SJ_SWORD,
  S_STOPPED_JUMPING,
  SCREEN_X,
  SCREEN_Y,
  T_BAMBU,
  T_BAT,
  T_BLACK,
  T_BLOB,
  T_BLUESPIDER,
  T_BOUNCINGBALL,
  T_BUBBLE,
  T_DEMON1_BONES,
  T_DEMON1_BONES2,
  T_DEMON2_BALLS,
  T_DEMON3_FIRE,
  T_DEMON5_FIRE,
  T_DEMON9_FIRE,
  T_ENEMY,
  T_FEET,
  T_FSTONE,
  T_JUMPINGBUSH,
  T_KNIGHT,
  T_LADDER,
  T_LADDER_WALL,
  T_LAVA1,
  T_LAVA2,
  T_LAVA3,
  T_LIVINGWALL,
  T_MEGABAT,
  T_MEGABAT2,
  T_MEGABAT3,
  T_NADA,
  T_PORCUPINE,
  T_PORCUPINE_BULLET,
  T_REDJUMPER,
  T_RSTONE,
  T_SKELETON,
  T_SLIME,
  T_SMOKE,
  T_VENT2,
  T_WALL,
  T_WATERMONSTER,
  T_WATERMONSTER_ARM,
  T_WHITEBEAR,
  T_WHITEBEAR_BULLET,
  T_WHITEFIREBALL,
  T_WITCH,
  T_WORM,
  TILE_SIZE_X,
  TILE_SIZE_Y,
  TILE_UNIT,
} from '../constants';
import { idiv, rand } from '../cutil';
import { addObject, findLadder, isWall, isWallOrBlocker } from '../gameaux';
import { sfx, tileIds } from '../resources';
import { G } from '../state';
import { collisionAt, tileHits } from '../tiledraw';
import type { EnemyUpdater, ObjAnimCtx } from './types';

function worm(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  if (o.state === 0) o.state = 1;
  if (o.state > 0) o.state++;
  else o.state--;
  if (o.state >= 29) o.state = 1;
  if (o.state <= -29) o.state = -1;

  if (o.state > 0) {
    if (
      (tileHits(tileIds.worm, GAME_VIEW_X + o.x + TILE_UNIT, GAME_VIEW_Y + o.y) & collision) === 0 &&
      o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
      (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
    ) {
      if (o.state % 2 === 0) o.x += TILE_UNIT;
    } else {
      if (o.state > 20) o.state = -21;
    }
  } else {
    if (
      (tileHits(tileIds.worm, GAME_VIEW_X + o.x - TILE_UNIT, GAME_VIEW_Y + o.y) & collision) === 0 &&
      o.x > 0 &&
      (collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
    ) {
      if (o.state % 2 === 0) o.x -= TILE_UNIT;
    } else {
      if (o.state < -20) o.state = 21;
    }
  }
}

function bat(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  let j: number;
  let tX: number, tY: number;
  switch (o.state) {
    case 0: // Bat at rest:
      o.state2++;
      if (o.state2 >= 64) {
        const x = idiv(o.x, TILE_SIZE_X);
        const y = idiv(o.y, TILE_SIZE_Y);
        o.state = 1;
        o.state2 = 0;
        o.state3 = -1;
        if (isWall(x, y) || !isWall(x, y - 1)) {
          o.state2 = 16;
          o.state3 = 0;
        }
      }
      break;
    case 1: // Bat moving:
      switch (o.state3) {
        case -1:
          o.y += TILE_UNIT;
          break;
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
      if ((o.state2 >= 16 && o.state3 !== -1) || (o.state2 >= 32 && o.state3 === -1)) {
        tX = idiv(o.x, TILE_SIZE_X);
        tY = idiv(o.y, TILE_SIZE_Y);
        if (
          isWall(tX, tY - 1) &&
          isWall(tX + 1, tY - 1) &&
          !isWall(tX, tY) &&
          !isWall(tX + 1, tY) &&
          rand() % 8 === 0 &&
          tY !== 0
        ) {
          o.state = 0;
          o.state2 = 0;
        } else {
          o.state = 1;
          o.state2 = 0;

          // If the random number is greater than 11, keep the same direction.
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
          if (o.y > (G.roomHeight - 6) * TILE_SIZE_Y) {
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

function skeleton(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  o.state2++;

  if (o.size === 8) {
    if (rand() % 128 === 0 && (o.state2 >> 2) % 2 === 0 && o.state < 2) {
      o.state += 2;
      o.state2 = 0;
    }
    if (o.state === 0) {
      if (
        (tileHits(tileIds.skeleton, GAME_VIEW_X + o.x - TILE_UNIT, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x -= TILE_UNIT;
        if (rand() % 32 === 0) {
          // Jump:
          let nfloors = 0;
          const floors: number[] = [];
          const tx = idiv(o.x, TILE_SIZE_X);
          const ty = idiv(o.y, TILE_SIZE_Y);
          if (
            tx > 5 &&
            !isWall(tx - 3, ty - 3) &&
            !isWall(tx - 4, ty - 3) &&
            !isWall(tx - 5, ty - 3) &&
            isWall(tx - 3, ty - 2) &&
            isWall(tx - 4, ty - 2) &&
            isWall(tx - 5, ty - 2) &&
            !isWall(tx - 1, ty - 2) &&
            (tileHits(tileIds.skeleton, GAME_VIEW_X + o.x - 4 * TILE_SIZE_X, GAME_VIEW_Y + o.y - 4 * TILE_SIZE_Y) &
              collision) ===
              0
          ) {
            floors[nfloors++] = ty - 4;
          }
          if (
            tx > 5 &&
            !isWall(tx - 3, ty + 5) &&
            !isWall(tx - 4, ty + 5) &&
            !isWall(tx - 5, ty + 5) &&
            isWall(tx - 3, ty + 6) &&
            isWall(tx - 4, ty + 6) &&
            isWall(tx - 5, ty + 6) &&
            !isWall(tx - 1, ty + 2) &&
            (tileHits(
              tileIds.skeleton,
              GAME_VIEW_X + o.x - (4 * TILE_SIZE_X + 6 * TILE_UNIT),
              GAME_VIEW_Y + o.y + 4 * TILE_SIZE_Y,
            ) &
              collision) ===
              0
          ) {
            floors[nfloors++] = ty + 4;
          }
          if (nfloors !== 0) {
            o.desiredFloor = floors[rand() % nfloors] * TILE_SIZE_Y;
            o.state = 5;
            o.state3 = 0;
          }
        }
      } else {
        o.state = 1;
        o.state2 = 0;
        o.x += TILE_UNIT * 2;
      }
    }
    if (o.state === 1) {
      if (
        (tileHits(tileIds.skeleton + 2, GAME_VIEW_X + o.x + TILE_UNIT, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x > 0 &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x += TILE_UNIT;
        if (rand() % 32 === 0) {
          // Jump:
          let nfloors = 0;
          const floors: number[] = [];
          const tx = idiv(o.x, TILE_SIZE_X);
          const ty = idiv(o.y, TILE_SIZE_Y);
          if (
            tx + 7 < G.roomWidth &&
            !isWall(tx + 5, ty - 3) &&
            !isWall(tx + 6, ty - 3) &&
            !isWall(tx + 7, ty - 3) &&
            isWall(tx + 5, ty - 2) &&
            isWall(tx + 6, ty - 2) &&
            isWall(tx + 7, ty - 2) &&
            !isWall(tx + 3, ty - 2) &&
            (tileHits(tileIds.skeleton + 2, GAME_VIEW_X + o.x + 4 * TILE_SIZE_X, GAME_VIEW_Y + o.y - 4 * TILE_SIZE_Y) &
              collision) ===
              0
          ) {
            floors[nfloors++] = ty - 4;
          }
          if (
            tx + 6 < G.roomWidth &&
            !isWall(tx + 5, ty + 5) &&
            !isWall(tx + 6, ty + 5) &&
            !isWall(tx + 7, ty + 5) &&
            isWall(tx + 5, ty + 6) &&
            isWall(tx + 6, ty + 6) &&
            isWall(tx + 7, ty + 6) &&
            !isWall(tx + 3, ty + 2) &&
            (tileHits(
              tileIds.skeleton + 2,
              GAME_VIEW_X + o.x + 4 * TILE_SIZE_X + 6 * TILE_UNIT,
              GAME_VIEW_Y + o.y + 4 * TILE_SIZE_Y,
            ) &
              collision) ===
              0
          ) {
            floors[nfloors++] = ty + 4;
          }
          if (nfloors !== 0) {
            o.desiredFloor = floors[rand() % nfloors] * TILE_SIZE_Y;
            o.state = 4;
            o.state3 = 0;
          }
        }
      } else {
        o.state = 0;
        o.state2 = 0;
        o.x -= TILE_UNIT * 2;
      }
    }
    if ((o.state === 2 || o.state === 3) && o.state2 >= 64) {
      o.state -= 2;
      o.state2 = 0;
    }
  } else {
    if (o.state2 >= 2) {
      o.size++;
      if (o.state >= 2) o.state -= 2;
      o.state2 = 0;
    }
  }
  // Jump states:
  if (o.state === 4) {
    o.x += 2 * TILE_UNIT;
    if (o.desiredFloor < o.y) {
      o.state3 = 0;
      o.y -= 4 * TILE_UNIT;
    } else {
      if (o.state3 < 2) o.y -= TILE_UNIT * 2;
      if (o.state3 >= 2 && o.state3 < 4) o.y -= TILE_UNIT;
      if (o.state3 >= 6) {
        o.state = 6;
        o.state3 = 0;
      }
    }
    o.state3++;
  }
  if (o.state === 5) {
    o.x -= 2 * TILE_UNIT;
    if (o.desiredFloor < o.y) {
      o.state3 = 0;
      o.y -= 4 * TILE_UNIT;
    } else {
      if (o.state3 < 2) o.y -= TILE_UNIT * 2;
      if (o.state3 >= 2 && o.state3 < 4) o.y -= TILE_UNIT;
      if (o.state3 >= 6) {
        o.state = 7;
        o.state3 = 0;
      }
    }
    o.state3++;
  }
  if (o.state === 6) {
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
    o.state3++;
  }
  if (o.state === 7) {
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
    o.state3++;
  }
}

function smoke(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state++;
  if (o.state2 === 0) {
    if (o.state >= 48) {
      o.state2++;
      o.state = 0;
    }
  } else {
    if (o.state2 === 4) {
      if (o.state >= 51) {
        o.state2++;
        o.state = 0;
      }
    } else {
      if (o.state >= 33) {
        o.state2++;
        o.state = 0;
      }
      if (o.state2 >= 8) o.state2 = 0;
    }
  }
}

function slime(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  if (o.state === 0) {
    // Moving left:
    if ((tileHits(tileIds.slime, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y + TILE_UNIT) & collision) === 0) {
      // Falling:
      o.y += TILE_UNIT;
    } else {
      if ((tileHits(tileIds.slime, GAME_VIEW_X + o.x - TILE_UNIT, GAME_VIEW_Y + o.y) & collision) !== 0) {
        o.state = 1;
        o.x += TILE_UNIT;
        o.state2++;
      } else {
        o.x -= TILE_UNIT;
        o.state2++;
      }
    }
  } else {
    // Moving right:
    if ((tileHits(tileIds.slime + 2, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y + TILE_UNIT) & collision) === 0) {
      // Falling:
      o.y += TILE_UNIT;
    } else {
      if ((tileHits(tileIds.slime + 2, GAME_VIEW_X + o.x + TILE_UNIT, GAME_VIEW_Y + o.y) & collision) !== 0) {
        o.state = 0;
        o.x -= TILE_UNIT;
        o.state2++;
      } else {
        o.x += TILE_UNIT;
        o.state2++;
      }
    }
  }

  if (o.state2 >= 12) o.state2 = 0;
  // Remove it when it leaves the screen:
  if (o.x >= SCREEN_X || o.x <= -2 * TILE_SIZE_X || o.y >= SCREEN_Y) {
    o.type = T_NADA;
  }
}

function bouncingball(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.tile = 0;
  if (o.state2 === 0) {
    o.state -= TILE_UNIT * o.state3;
    if (isWall(idiv(o.x, TILE_SIZE_X), idiv(o.y + o.state, TILE_SIZE_Y))) o.state2 = 1;
  } else {
    o.state += TILE_UNIT * o.state3;
    if (o.state >= 0) o.state2 = 0;
  }
}

function watermonster(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  let j: number;
  if (o.state < 16 && (o.state & 0x01) === 0) o.state2 += TILE_UNIT;
  if (o.state === 16) {
    let pos: number;

    if (o.x < G.playerX) {
      pos = G.playerX - TILE_SIZE_X;
    } else {
      pos = G.playerX + 2 * TILE_SIZE_X;
    }
    const val = addObject(T_ENEMY, pos, 15 * TILE_SIZE_Y, 5, T_WATERMONSTER_ARM, 0);
    G.objects[val].baseTile = tileIds.watermonster;
  }

  if (o.state === 24 || o.state === 64) {
    playSound(sfx.enemybullet);
    j = addObject(T_ENEMY, o.x + TILE_SIZE_X, o.y, 0, T_BUBBLE, 0);
    G.objects[j].state = G.playerX - o.x;
    G.objects[j].state2 = G.playerY - (o.y + TILE_SIZE_Y);
    G.objects[j].baseTile = tileIds.watermonster;
    G.objects[j].tile = 4;
  }

  if (o.state >= 16 && o.state < 32) {
    o.state3++;
  }
  if (o.state >= 32 && o.state < 48) {
    o.state3--;
  }

  if (o.state >= 80 && (o.state & 0x01) === 0) o.state2 -= TILE_UNIT;
  if (o.state >= 96) {
    o.type = T_NADA;
    G.watermonsterState = -96;
  }
  o.state++;
}

function watermonsterArm(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  if (o.state < 24) o.state2++;
  else o.state2--;
  if (o.state >= 48) o.type = T_NADA;
  o.state++;
}

function bubble(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
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

function fstone(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  // Block-local `collision` in the C++ (shadows the loop-level one):
  const collision = T_WALL | T_LADDER_WALL;
  o.state3++;
  if (o.state2 <= 0) {
    if (
      o.y >= 0 &&
      (tileHits(tileIds.fstone + ((o.state3 >> 2) & 0x03), GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y) & collision) === 0 &&
      (tileHits(tileIds.fstone + ((o.state3 >> 2) & 0x03), GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y + 2 * TILE_UNIT) &
        collision) !==
        0
    ) {
      o.state2 = 23;
      o.state = rand() % 2;
      playSound(sfx.stones);
    } else {
      o.y += 4 * TILE_UNIT;
    }
  } else {
    if (o.state2 < 4) o.y += 4 * TILE_UNIT;
    if (o.state2 >= 4 && o.state2 < 8) o.y += 2 * TILE_UNIT;
    if (o.state2 >= 8 && o.state2 < 12) o.y += TILE_UNIT;
    if (o.state2 >= 14 && o.state2 < 18) o.y -= TILE_UNIT;
    if (o.state2 >= 18 && o.state2 < 22) o.y -= 2 * TILE_UNIT;
    if (o.state2 >= 22) o.y -= 4 * TILE_UNIT;
    o.state2--;
  }
  if (o.state === 0) o.x -= TILE_UNIT;
  else o.x += TILE_UNIT;

  if (o.x >= SCREEN_X || o.x <= -2 * TILE_SIZE_X || o.y >= SCREEN_Y) {
    o.type = T_NADA;
  }
}

function rstone(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  o.state3++;
  if (o.state === 0) {
    // Moving left:
    if ((tileHits(tileIds.slime, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y + 2 * TILE_UNIT) & collision) === 0) {
      // Falling:
      o.y += TILE_UNIT;
      if (o.state2 < 4) o.y += 4 * TILE_UNIT;
      if (o.state2 >= 4 && o.state2 < 8) o.y += 2 * TILE_UNIT;
      if (o.state2 >= 8) o.y += TILE_UNIT;
      o.state2--;
      o.x -= TILE_UNIT;
    } else {
      o.y = idiv(o.y, TILE_SIZE_Y) * TILE_SIZE_Y;
      if (o.state2 !== 12) playSound(sfx.stones);
      o.state2 = 12;
      if ((tileHits(tileIds.slime, GAME_VIEW_X + o.x - TILE_UNIT, GAME_VIEW_Y + o.y) & collision) !== 0) {
        o.state = 1;
        o.x += TILE_UNIT;
      } else {
        o.x -= TILE_UNIT;
      }
    }
  } else {
    // Moving right:
    if ((tileHits(tileIds.slime, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y + 2 * TILE_UNIT) & collision) === 0) {
      // Falling:
      o.y += TILE_UNIT;
      if (o.state2 < 4) o.y += 4 * TILE_UNIT;
      if (o.state2 >= 4 && o.state2 < 8) o.y += 2 * TILE_UNIT;
      if (o.state2 >= 8) o.y += TILE_UNIT;
      o.state2--;
      o.x += TILE_UNIT;
    } else {
      o.y = idiv(o.y, TILE_SIZE_Y) * TILE_SIZE_Y;
      if (o.state2 !== 12) playSound(sfx.stones);
      o.state2 = 12;
      if ((tileHits(tileIds.slime, GAME_VIEW_X + o.x + TILE_UNIT, GAME_VIEW_Y + o.y) & collision) !== 0) {
        o.state = 0;
        o.x -= TILE_UNIT;
      } else {
        o.x += TILE_UNIT;
      }
    }
  }

  // Remove it when it leaves the screen:
  if (o.x >= SCREEN_X || o.x <= -2 * TILE_SIZE_X || o.y >= SCREEN_Y) {
    o.type = T_NADA;
  }
}

function knight(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  o.state3++;
  switch (o.state) {
    case 10: // Same, but cannot climb/descend ladders
    case 0: {
      o.onLadder = -1;
      o.state2 = 2 + ((o.state3 >> 2) & 0x01);
      if (
        (tileHits(tileIds.knight + o.state2, GAME_VIEW_X + o.x + TILE_UNIT, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        let j: number;

        if (o.state3 % 2 === 0) o.x += TILE_UNIT;

        if (o.state === 0) {
          for (j = 0; j < G.objectCount; j++) {
            if (G.objects[j].type === T_LADDER && o.x === G.objects[j].x && G.objects[j].y !== 0 && rand() % 5 === 0) {
              if (o.y === G.objects[j].y - 3 * TILE_SIZE_Y) {
                o.state = 4;
              }
              if (o.y === G.objects[j].y + (G.objects[j].size - 2) * TILE_SIZE_Y) {
                if (o.state !== 4 || rand() % 2 === 0) o.state = 2;
              }
              if (o.state === 4) o.y += TILE_UNIT;
              if (o.state === 2) o.y -= TILE_UNIT;
            }
          }
        } else {
          o.state = 0;
        }
      } else {
        o.state = 1;
      }
      if (rand() % 64 === 0) {
        // Jump:
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
            tileIds.knight + o.state2,
            GAME_VIEW_X + o.x + 4 * TILE_SIZE_X,
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
            tileIds.knight + o.state2,
            GAME_VIEW_X + o.x + 4 * TILE_SIZE_X + 4 * TILE_UNIT,
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
      break;
    }
    case 11: // Same, but cannot climb/descend ladders
    case 1: {
      o.onLadder = -1;
      o.state2 = (o.state3 >> 2) & 0x01;
      if (
        (tileHits(tileIds.knight + o.state2, GAME_VIEW_X + o.x - TILE_UNIT, GAME_VIEW_Y + o.y) & collision) === 0 &&
        o.x - TILE_UNIT > 0 &&
        (collisionAt(GAME_VIEW_X + o.x - TILE_UNIT, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        let j: number;

        if (o.state3 % 2 === 0) o.x -= TILE_UNIT;

        if (o.state === 1) {
          for (j = 0; j < G.objectCount; j++) {
            if (G.objects[j].type === T_LADDER && o.x === G.objects[j].x && G.objects[j].y !== 0 && rand() % 4 === 0) {
              if (o.y === G.objects[j].y - 3 * TILE_SIZE_Y) {
                o.state = 5;
              }
              if (o.y === G.objects[j].y + (G.objects[j].size - 2) * TILE_SIZE_Y) {
                if (o.state !== 5 || rand() % 2 === 0) o.state = 3;
              }
              if (o.state === 5) o.y += TILE_UNIT;
              if (o.state === 3) o.y -= TILE_UNIT;
            }
          }
        } else {
          o.state = 1;
        }
      } else {
        o.state = 0;
      }
      if (rand() % 64 === 0) {
        // Jump:
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
            tileIds.knight + o.state2,
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
            tileIds.knight + o.state2,
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
      break;
    }
    case 2:
    case 3:
      if (o.onLadder === -1) o.onLadder = findLadder(o.x, o.y);

      o.state2 = 4 + ((o.state3 >> 2) & 0x01);

      // NOTE (original): no check that findLadder found a ladder (onLadder may stay -1).
      if (o.y > G.objects[o.onLadder].y - 3 * TILE_SIZE_Y) {
        o.y -= TILE_UNIT;
        if (o.y < 0) o.state += 8;
      } else {
        o.y = G.objects[o.onLadder].y - 3 * TILE_SIZE_Y;
        o.state += 8;
      }
      break;
    case 4:
    case 5:
      if (o.onLadder === -1) o.onLadder = findLadder(o.x, o.y);

      o.state2 = 6 + ((o.state3 >> 2) & 0x01);

      // NOTE (original): no check that findLadder found a ladder (onLadder may stay -1).
      if (o.y < G.objects[o.onLadder].y + (G.objects[o.onLadder].size - 2) * TILE_SIZE_Y) {
        o.y += TILE_UNIT;
        if (o.y > (G.roomHeight - 2) * TILE_SIZE_Y) o.state += 6;
      } else {
        o.y = G.objects[o.onLadder].y + (G.objects[o.onLadder].size - 2) * TILE_SIZE_Y;
        o.state += 6;
      }
      break;
    // Jump states:
    case 6:
      o.state2 = 11;
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
      o.state2 = 10;
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
      o.state2 = 11;
      o.x += 2 * TILE_UNIT;
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
    case 9:
      o.state2 = 10;
      o.x -= 2 * TILE_UNIT;
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
  }
}

function blob(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  // Block-local `collision` in the C++ (shadows the loop-level one):
  const collision = T_WALL | T_LADDER_WALL;

  if (o.state3 === 0) {
    o.state2 = 0;
    const res = tileHits(tileIds.blob + 1, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y - 4 * TILE_UNIT) & collision;
    if (
      o.y >= TILE_SIZE_Y &&
      o.y < TILE_SIZE_Y * 16 &&
      (tileHits(tileIds.blob + 1, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y) & collision) === 0 &&
      res !== 0 &&
      res !== (T_WALL | T_LADDER_WALL)
    ) {
      playSound(sfx.blob);
      o.state3 = 50;
      o.state = rand() % 2;
      o.y = idiv(o.y, TILE_SIZE_Y) * TILE_SIZE_Y;
    } else {
      o.y -= 4 * TILE_UNIT;
    }
  } else {
    if (o.state3 >= 24) o.state2 = 1;
    else o.state2 = 0;
    if (o.state3 < 4) o.y -= 4 * TILE_UNIT;
    if (o.state3 >= 4 && o.state3 < 8) o.y -= 2 * TILE_UNIT;
    if (o.state3 >= 8 && o.state3 < 12) o.y -= TILE_UNIT;
    if (o.state3 >= 14 && o.state3 < 18) o.y += TILE_UNIT;
    if (o.state3 >= 18 && o.state3 < 22) o.y += 2 * TILE_UNIT;
    if (o.state3 >= 22 && o.state3 < 24) o.y += 4 * TILE_UNIT;

    o.state3--;
  }

  if (o.state2 === 0) {
    if (o.state === 0) o.x -= TILE_UNIT;
    else o.x += TILE_UNIT;
  }

  if (o.x >= SCREEN_X || o.x <= -2 * TILE_SIZE_X || o.y < -2 * TILE_SIZE_Y) {
    o.type = T_NADA;
  }
}

function bambu(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state--;

  if (o.state < 0) {
    o.state = (rand() % 256) + 128;
  }

  if (o.state < 20) o.tile = 0;
  if (o.state >= 20 && o.state < 24) o.tile = 1;
  if (o.state >= 24 && o.state < 28) o.tile = 2;
  if (o.state >= 28 && o.state < 44) o.tile = 3;
  if (o.state >= 44 && o.state < 48) o.tile = 2;
  if (o.state >= 48 && o.state < 52) o.tile = 1;
  if (o.state >= 52 && o.state < 68) o.tile = 0;
  if (o.state >= 68) o.tile = -1;
}

function porcupine(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  o.state3++;

  switch (o.state) {
    case 0:
      o.tile = (o.state3 >> 3) & 0x01;
      if (
        (tileHits(tileIds.porcupine + o.tile, GAME_VIEW_X + o.x - TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        o.x > 0 &&
        (collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x -= TILE_UNIT * 2;
      } else {
        o.state = 1;
      }
      if (rand() % 128 === 0) {
        o.state = 2;
        o.state3 = 0;
      } else {
        if (rand() % 128 === 0) {
          o.state = 4;
          o.state3 = 0;
        }
      }
      break;
    case 1:
      o.tile = ((o.state3 >> 3) & 0x01) + 4;
      if (
        (tileHits(tileIds.porcupine + o.tile, GAME_VIEW_X + o.x + TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x += TILE_UNIT * 2;
      } else {
        o.state = 0;
      }
      if (rand() % 128 === 0) {
        o.state = 3;
        o.state3 = 0;
      } else {
        if (rand() % 128 === 0) {
          o.state = 5;
          o.state3 = 0;
        }
      }
      break;
    case 2:
      o.tile = ((o.state3 >> 3) & 0x01) * 4 + 3;
      if (o.state3 >= 64) o.state = 0;
      break;
    case 3:
      o.tile = ((o.state3 >> 3) & 0x01) * 4 + 3;
      if (o.state3 >= 64) o.state = 1;
      break;
    case 4:
      o.tile = 2;
      if (o.state3 === 48) {
        playSound(sfx.karrow);
        const val = addObject(T_ENEMY, o.x, o.y, 0, T_PORCUPINE_BULLET, 1);
        G.objects[val].baseTile = tileIds.porcupine;
      }
      if (o.state3 >= 64) o.state = 0;
      break;
    case 5:
      o.tile = 6;
      if (o.state3 === 48) {
        playSound(sfx.karrow);
        const val = addObject(T_ENEMY, o.x, o.y, 0, T_PORCUPINE_BULLET, 0);
        G.objects[val].baseTile = tileIds.porcupine;
      }
      if (o.state3 >= 64) o.state = 1;
      break;
  }
}

function porcupineBullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  if ((tileHits(tileIds.porcupine + 8, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y) & collision) !== 0) {
    o.type = T_NADA;
  }

  if (o.state === 0) o.x += idiv(TILE_SIZE_X, 2);
  else o.x -= idiv(TILE_SIZE_X, 2);

  if (o.x < -2 * TILE_SIZE_X || o.x > G.roomWidth * TILE_SIZE_X) {
    o.type = T_NADA;
  }
}

function jumpingbush(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  let tmp: number;
  o.tile = 0;

  tmp = o.state;

  if (G.playerState === S_JUMPING || G.playerState === S_JUMPING_SWORD) {
    if (G.playerSubState === 1 && ctx.firstJumpingBush) playSound(sfx.jumptree);
    if (G.character === 0) {
      if (G.playerSubState - 1 === 0) o.state = o.state - TILE_UNIT * 7;
      if (G.playerSubState - 1 === 1) o.state = o.state - TILE_UNIT * 6;
      if (G.playerSubState - 1 === 2) o.state = o.state - TILE_UNIT * 6;
      if (G.playerSubState - 1 === 3) o.state = o.state - TILE_UNIT * 6;
      if (G.playerSubState - 1 === 4) o.state = o.state - TILE_UNIT * 5;
      if (G.playerSubState - 1 === 5) o.state = o.state - TILE_UNIT * 5;
      if (G.playerSubState - 1 === 6) o.state = o.state - TILE_UNIT * 5;
      if (G.playerSubState - 1 === 7) o.state = o.state - TILE_UNIT * 4;
      if (G.playerSubState - 1 === 8) o.state = o.state - TILE_UNIT * 4;
      if (G.playerSubState - 1 === 9) o.state = o.state - TILE_UNIT * 3;
      if (G.playerSubState - 1 === 10) o.state = o.state - TILE_UNIT * 2;
      if (G.playerSubState - 1 === 11) o.state = o.state - TILE_UNIT * 1;
    } else {
      if (G.playerSubState - 1 === 0) o.state = o.state - TILE_UNIT * 7;
      if (G.playerSubState - 1 === 1) o.state = o.state - TILE_UNIT * 6;
      if (G.playerSubState - 1 === 2) o.state = o.state - TILE_UNIT * 6;
      if (G.playerSubState - 1 === 3) o.state = o.state - TILE_UNIT * 6;
      if (G.playerSubState - 1 === 4) o.state = o.state - TILE_UNIT * 5;
      if (G.playerSubState - 1 === 5) o.state = o.state - TILE_UNIT * 5;
      if (G.playerSubState - 1 === 6) o.state = o.state - TILE_UNIT * 4;
      if (G.playerSubState - 1 === 7) o.state = o.state - TILE_UNIT * 3;
      if (G.playerSubState - 1 === 11) o.state = o.state - TILE_UNIT * 1;
    }
    o.state3 = 0;
  } else {
    tmp = o.state = o.state2;
    if (o.state < 0 && G.playerState !== S_STOPPED_JUMPING && G.playerState !== S_SJ_SWORD) {
      if (o.state3 === 3) o.state = o.state + TILE_UNIT;
      if (o.state3 === 4) o.state = o.state + TILE_UNIT * 2;
      if (o.state3 === 5) o.state = o.state + TILE_UNIT * 3;
      if (o.state3 === 6) o.state = o.state + TILE_UNIT * 4;
      if (o.state3 === 7) o.state = o.state + TILE_UNIT * 4;
      if (o.state3 === 8) o.state = o.state + TILE_UNIT * 5;
      if (o.state3 === 9) o.state = o.state + TILE_UNIT * 5;
      if (o.state3 === 10) o.state = o.state + TILE_UNIT * 5;
      if (o.state3 >= 11) o.state = o.state + TILE_UNIT * 6;
      if (o.state >= 0) {
        tmp = o.state = 0;
        o.state2 = 0;
      }
      o.state3++;
    } else {
      if (o.state >= 0) {
        tmp = o.state = 0;
        o.state2 = 0;
      }
      o.state3 = 0;
    }
  }

  const dif = o.state - tmp;
  if (dif !== 0) {
    if ((tileHits(tileIds.jumpingbush, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y + o.state2 + dif) & collision) === 0) {
      o.state2 += dif;
    }
  }

  ctx.firstJumpingBush = false;
}

function bluespider(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  o.tile = o.state3 % 12 >> 2;

  switch (o.state) {
    case 0: // Still
      if (G.playerY >= o.y - TILE_UNIT && G.playerY < o.y + TILE_SIZE_Y) {
        if (G.playerX < o.x) o.state = 1;
        else o.state = 3;
      }
      break;
    case 1: // Advancing left
      if (
        (tileHits(tileIds.bluespider, GAME_VIEW_X + o.x + o.state2 - 2 * TILE_UNIT, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        (collisionAt(GAME_VIEW_X + o.x + o.state2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.state2 -= 2 * TILE_UNIT;
      } else {
        o.state = 2;
      }
      o.state3 += 2;
      break;
    case 2: // Retreating left
      o.state3++;
      o.state2 += TILE_UNIT;
      if (o.state2 === 0) o.state = 0;
      break;
    case 3: // Advancing right
      if (
        (tileHits(tileIds.bluespider, GAME_VIEW_X + o.x + o.state2 + 2 * TILE_UNIT, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        (collisionAt(GAME_VIEW_X + o.x + o.state2 + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) &
          collision) !==
          0
      ) {
        o.state2 += 2 * TILE_UNIT;
      } else {
        o.state = 4;
      }
      o.state3 += 2;
      break;
    case 4: // Retreating right
      o.state3++;
      o.state2 -= TILE_UNIT;
      if (o.state2 === 0) o.state = 0;
      break;
  }
}

function whitefireball(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  switch (o.state) {
    case 0:
      o.x += TILE_UNIT * 2;
      break;
    case 1:
      o.x += TILE_UNIT * 2;
      o.y -= TILE_UNIT * 2;
      break;
    case 2:
      o.y -= TILE_UNIT * 2;
      break;
    case 3:
      o.x -= TILE_UNIT * 2;
      o.y -= TILE_UNIT * 2;
      break;
    case 4:
      o.x -= TILE_UNIT * 2;
      break;
    case 5:
      o.x -= TILE_UNIT * 2;
      o.y += TILE_UNIT * 2;
      break;
    case 6:
      o.y += TILE_UNIT * 2;
      break;
    case 7:
      o.x += TILE_UNIT * 2;
      o.y += TILE_UNIT * 2;
      break;
  }
  if (o.x <= 0) {
    if (o.state === 3) o.state = 1;
    if (o.state === 4) o.state = 0;
    if (o.state === 5) o.state = 7;
    o.state3 = 0;
  }
  if (o.x >= 30 * TILE_SIZE_X) {
    if (o.state === 7) o.state = 5;
    if (o.state === 0) o.state = 4;
    if (o.state === 1) o.state = 3;
    o.state3 = 0;
  }
  if (o.y <= 0) {
    if (o.state === 1) o.state = 7;
    if (o.state === 2) o.state = 6;
    if (o.state === 3) o.state = 5;
    o.state3 = 0;
  }
  if (o.y >= 17 * TILE_SIZE_X) {
    if (o.state === 7) o.state = 1;
    if (o.state === 6) o.state = 2;
    if (o.state === 5) o.state = 3;
    o.state3 = 0;
  }

  if (o.state3 >= 32) {
    o.state = rand() % 8;
    o.state3 = 0;
  }
  o.state3++;
  o.tile = o.state;
}

function demon1Bones(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.x += o.state;
  o.state2++;
  o.state3++;
  if (o.state3 < 16) {
    if (o.state3 < 8) o.y -= TILE_UNIT;
    if (o.state3 < 12) o.y -= TILE_UNIT;
    o.y -= TILE_UNIT;
  } else {
    if (o.state3 > 20) o.y += TILE_UNIT;
    if (o.state3 > 24) o.y += TILE_UNIT;
    if (o.state3 > 32) {
      o.y += TILE_UNIT;
      // G.object[i].x-=G.object[i].state;
    }
    o.y += TILE_UNIT;
  }
  if (o.state2 >= 8) o.state2 = 0;
  if (o.x < 0 || o.y >= SCREEN_Y) o.type = T_NADA;
}

function demon1Bones2(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.x += o.state;
  o.state2++;
  o.state3++;
  if (o.state3 < 16) {
    if (o.state3 < 8) o.y -= TILE_UNIT;
    if (o.state3 < 12) o.y -= TILE_UNIT;
    o.y -= TILE_UNIT;
  } else {
    if (o.state3 > 20) o.y += TILE_UNIT;
    if (o.state3 > 24) o.y += TILE_UNIT;
    if (o.state3 > 32) {
      o.y += TILE_UNIT;
      // G.object[i].x-=G.object[i].state;
    }
    o.y += TILE_UNIT;
  }
  if (o.state2 >= 8) o.state2 = 0;
  if (o.x < 0 || o.y >= SCREEN_Y) o.type = T_NADA;
}

function black(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state3++;

  switch (o.state) {
    case 0:
      if (
        !isWallOrBlocker(idiv(o.x, TILE_SIZE_X), idiv(o.y, TILE_SIZE_Y)) &&
        isWallOrBlocker(idiv(o.x, TILE_SIZE_X), idiv(o.y, TILE_SIZE_Y) + 2) &&
        o.x > 0
      ) {
        if ((o.state3 & 0x01) === 0 || o.state2 === 1) o.x--;
        if (o.state2 === 1) o.x--;
        if (G.playerX < o.x && o.y === G.playerY) o.state2 = 1;
      } else {
        o.state2 = 0;
        o.state = 1;
      }
      break;
    case 1:
      if (
        !isWallOrBlocker(idiv(o.x, TILE_SIZE_X) + 2, idiv(o.y, TILE_SIZE_Y)) &&
        isWallOrBlocker(idiv(o.x, TILE_SIZE_X) + 2, idiv(o.y, TILE_SIZE_Y) + 2)
      ) {
        if ((o.state3 & 0x01) === 0 || o.state2 === 1) o.x++;
        if (o.state2 === 1) o.x++;
        if (G.playerX > o.x && o.y === G.playerY) o.state2 = 1;
      } else {
        o.state2 = 0;
        o.state = 0;
      }
      break;
  }
}

function witch(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  let j: number;
  let noOtherWitch = true;

  if (o.state <= 0) {
    for (j = 0; j < G.objectCount; j++) {
      if (G.objects[j].type === T_ENEMY && G.objects[j].enemy === T_WITCH && G.objects[j].state > 0) {
        noOtherWitch = false;
      }
    }

    if (noOtherWitch && rand() % 64 === 0) {
      o.state = 16;
    }
  } else {
    o.state--;
  }
}

function whitebear(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  o.state3++;

  if (G.playerX > o.x && o.y === G.playerY && o.state < 2) {
    o.state = 3;
    o.state3 = 0;
  }
  if (G.playerX < o.x && o.y === G.playerY && o.state < 2) {
    o.state = 2;
    o.state3 = 0;
  }

  switch (o.state) {
    case 0:
      o.tile = (o.state3 >> 3) & 0x01;
      if (
        (tileHits(tileIds.whitebear + o.tile, GAME_VIEW_X + o.x - TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        o.x > 0 &&
        (collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x -= TILE_UNIT * 2;

        if (rand() % 32 === 0) {
          // Jump:
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
              tileIds.whitebear + o.tile,
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
              tileIds.whitebear + o.tile,
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
      o.tile = ((o.state3 >> 3) & 0x01) + 2;
      if (
        (tileHits(tileIds.whitebear + o.tile, GAME_VIEW_X + o.x + TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x += TILE_UNIT * 2;

        if (rand() % 32 === 0) {
          // Jump:
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
              tileIds.whitebear + o.tile,
              GAME_VIEW_X + o.x + 4 * TILE_SIZE_X,
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
              tileIds.whitebear + o.tile,
              GAME_VIEW_X + o.x + 4 * TILE_SIZE_X + 4 * TILE_UNIT,
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
    case 2:
      if (o.state3 < 32) o.tile = 1;
      else o.tile = 0;
      if (o.state3 === 32) {
        playSound(sfx.bearbullet);
        const val = addObject(T_ENEMY, o.x - TILE_SIZE_X, o.y, 0, T_WHITEBEAR_BULLET, 0);
        G.objects[val].baseTile = tileIds.whitebear;
        o.desiredFloor = val;
      }
      if (o.state3 >= 64 && G.objects[o.desiredFloor].type !== T_ENEMY) {
        if (G.frozen > 0) {
          o.state = 4;
          o.state3 = 0;
        } else {
          o.state = 0;
          o.state3 = 0;
        }
      }
      break;
    case 3:
      if (o.state3 < 32) o.tile = 3;
      else o.tile = 2;
      if (o.state3 === 32) {
        playSound(sfx.bearbullet);
        const val = addObject(T_ENEMY, o.x + TILE_SIZE_X, o.y, 0, T_WHITEBEAR_BULLET, 1);
        G.objects[val].baseTile = tileIds.whitebear;
        o.desiredFloor = val;
      }
      if (o.state3 >= 64 && G.objects[o.desiredFloor].type !== T_ENEMY) {
        if (G.frozen > 0) {
          o.state = 5;
          o.state3 = 0;
        } else {
          o.state = 1;
          o.state3 = 0;
        }
      }
      break;
    case 4:
      o.tile = (o.state3 >> 3) & 0x01;
      if (
        (tileHits(tileIds.whitebear + o.tile, GAME_VIEW_X + o.x - TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        o.x > 0 &&
        (collisionAt(GAME_VIEW_X + o.x - 1, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x -= TILE_UNIT * 4;
      } else {
        o.state = 1;
      }
      break;
    case 5:
      o.tile = ((o.state3 >> 3) & 0x01) + 2;
      if (
        (tileHits(tileIds.whitebear + o.tile, GAME_VIEW_X + o.x + TILE_UNIT * 2, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
      ) {
        o.x += TILE_UNIT * 4;
      } else {
        o.state = 0;
      }
      break;
    // Jump states:
    case 6:
      o.tile = 2;
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
      o.tile = 0;
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
      o.tile = 2;
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
      o.tile = 0;
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

function whitebearBullet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  if ((tileHits(tileIds.whitebear + 4 + o.state, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y) & collision) !== 0) {
    o.type = T_NADA;
  }

  if (o.state === 0) o.x -= idiv(TILE_SIZE_X, 2);
  else o.x += idiv(TILE_SIZE_X, 2);

  if (o.x < -2 * TILE_SIZE_X || o.x > G.roomWidth * TILE_SIZE_X) {
    o.type = T_NADA;
  }
}

function feet(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  let haspair = false;
  let j: number;
  let val = idiv(TILE_SIZE_Y, 2);

  for (j = 0; j < G.objectCount; j++) {
    if (G.objects[j].type === T_ENEMY && G.objects[j].enemy === T_FEET && G.objects[j].y === o.y && i !== j) {
      haspair = true;
    }
  }
  o.yoffs = -idiv(TILE_SIZE_Y, 2);

  if (haspair) {
    if (o.state3 >= 0 && o.state3 < 8) {
      o.tile = 2 + o.state;
      if (o.state === 0) o.x -= TILE_UNIT;
      else o.x += TILE_UNIT;
    }
    if (o.state3 >= 8 && o.state3 < 24) {
      o.tile = o.state;
      if (o.state === 0) o.x -= TILE_UNIT;
      else o.x += TILE_UNIT;
    }
    if (o.state3 >= 24 && o.state3 < 32) {
      o.tile = 1 + o.state;
      if (o.state === 0) o.x -= TILE_UNIT;
      else o.x += TILE_UNIT;
    }
    if (o.state3 >= 32) {
      val = 0;
      o.yoffs = 0;
      o.tile = o.state;
      if (o.state3 >= 64) o.state3 = 0;
    }
  } else {
    if (o.state3 >= 0 && o.state3 < 4) {
      o.tile = 2 + o.state;
      if (o.state === 0) o.x -= TILE_UNIT * 2;
      else o.x += TILE_UNIT * 2;
    }
    if (o.state3 >= 4 && o.state3 < 12) {
      o.tile = o.state;
      if (o.state === 0) o.x -= TILE_UNIT * 2;
      else o.x += TILE_UNIT * 2;
    }
    if (o.state3 >= 12 && o.state3 < 16) {
      o.tile = 1 + o.state;
      if (o.state === 0) o.x -= TILE_UNIT * 2;
      else o.x += TILE_UNIT * 2;
    }
    if (o.state3 >= 16) {
      val = 0;
      o.yoffs = 0;
      o.tile = o.state;
      if (o.state3 >= 20) o.state3 = 0;
    }
  }

  if (o.state === 0) {
    if (
      (tileHits(tileIds.feet + o.tile, GAME_VIEW_X + o.x - TILE_UNIT * 2, GAME_VIEW_Y + o.y - val) & collision) === 0 &&
      o.x > 0 &&
      (collisionAt(GAME_VIEW_X + o.x - TILE_UNIT, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
    ) {
      // (empty in the original)
    } else {
      o.state = 3;
    }
  } else {
    if (
      (tileHits(tileIds.feet + o.tile, GAME_VIEW_X + o.x + TILE_UNIT * 2, GAME_VIEW_Y + o.y - val) & collision) === 0 &&
      o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
      (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0
    ) {
      // (empty in the original)
    } else {
      o.state = 0;
    }
  }

  o.state3++;
}

function demon2Balls(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state2--;
  if (o.state2 >= 12) o.y -= TILE_UNIT;
  if (o.state2 >= 8) o.y -= TILE_UNIT;
  if (o.state2 >= 4) o.y -= TILE_UNIT;
  if (o.state2 >= 0) o.y -= TILE_UNIT;
  if (o.state2 < -4) o.y += TILE_UNIT;
  if (o.state2 < -8) o.y += TILE_UNIT;
  if (o.state2 < -12) o.y += TILE_UNIT;
  if (o.state2 < -16) o.y += TILE_UNIT;
  if (o.state2 < -20) o.y += TILE_UNIT;
  if (o.state2 < -24) o.y += TILE_UNIT;
  o.x += o.state;
  if (o.x < 0 || o.x > G.roomWidth * TILE_SIZE_X || o.y >= G.roomHeight * TILE_SIZE_Y) o.type = 0;
}

function redjumper(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  o.state3++;
  switch (o.state) {
    case 0:
      o.tile = (o.state3 >> 2) & 0x01;
      if (
        (tileHits(tileIds.redjumper + o.tile, GAME_VIEW_X + o.x + 2 * TILE_UNIT, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        o.x + 2 * TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
        (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0 &&
        rand() % 32 !== 0
      ) {
        o.x += 2 * TILE_UNIT;
      } else {
        o.state = 1;
      }
      if (rand() % 64 === 0) {
        // Jump:
        // (uses the function-level `j` of animateObjects in the C++)
        let j: number;
        let nfloors = 0;
        const floors: number[] = [];
        const py = [1, 5, 9, 13, 17];
        const tx = idiv(o.x, TILE_SIZE_X);
        const ty = idiv(o.y, TILE_SIZE_Y);
        for (j = 0; j < 5; j++) {
          if (
            py[j] !== ty &&
            !isWall(tx + 4, py[j] + 1) &&
            !isWall(tx + 5, py[j] + 1) &&
            !isWall(tx + 6, py[j] + 1) &&
            !isWall(tx + 7, py[j] + 1) &&
            isWall(tx + 4, py[j] + 2) &&
            isWall(tx + 5, py[j] + 2) &&
            isWall(tx + 6, py[j] + 2) &&
            isWall(tx + 7, py[j] + 2) &&
            (tileHits(
              tileIds.redjumper + o.tile,
              GAME_VIEW_X + o.x + 4 * TILE_SIZE_X,
              GAME_VIEW_Y + py[j] * TILE_SIZE_Y,
            ) &
              collision) ===
              0 &&
            (Math.abs(ty - py[j]) < 12 ||
              ((tileHits(
                tileIds.redjumper + o.tile,
                GAME_VIEW_X + o.x + 6 * TILE_SIZE_X,
                GAME_VIEW_Y + py[j] * TILE_SIZE_Y,
              ) &
                collision) ===
                0 &&
                !isWall(tx + 8, py[j] + 1) &&
                !isWall(tx + 9, py[j] + 1) &&
                isWall(tx + 8, py[j] + 2) &&
                isWall(tx + 9, py[j] + 2)))
          ) {
            floors[nfloors++] = py[j];
          }
        }
        if (nfloors !== 0) {
          o.desiredFloor = floors[rand() % nfloors] * TILE_SIZE_Y;
          o.state = 6;
          o.state3 = 0;
        }
      }
      break;
    case 1:
      o.tile = 3 + ((o.state3 >> 2) & 0x01);
      if (
        (tileHits(tileIds.redjumper + o.tile, GAME_VIEW_X + o.x - 2 * TILE_UNIT, GAME_VIEW_Y + o.y) & collision) ===
          0 &&
        o.x - 2 * TILE_UNIT > 0 &&
        (collisionAt(GAME_VIEW_X + o.x - 2 * TILE_UNIT, GAME_VIEW_Y + o.y + TILE_SIZE_Y * 2) & collision) !== 0 &&
        rand() % 32 !== 0
      ) {
        o.x -= 2 * TILE_UNIT;
      } else {
        o.state = 0;
      }
      if (rand() % 64 === 0) {
        // Jump:
        let j: number;
        let nfloors = 0;
        const floors: number[] = [];
        const py = [1, 5, 9, 13, 17];
        const tx = idiv(o.x, TILE_SIZE_X);
        const ty = idiv(o.y, TILE_SIZE_Y);
        for (j = 0; j < 5; j++) {
          if (
            py[j] !== ty &&
            !isWall(tx - 3, py[j] + 1) &&
            !isWall(tx - 4, py[j] + 1) &&
            !isWall(tx - 5, py[j] + 1) &&
            !isWall(tx - 6, py[j] + 1) &&
            isWall(tx - 3, py[j] + 2) &&
            isWall(tx - 4, py[j] + 2) &&
            isWall(tx - 5, py[j] + 2) &&
            isWall(tx - 6, py[j] + 2) &&
            (tileHits(
              tileIds.redjumper + o.tile,
              GAME_VIEW_X + o.x - 4 * TILE_SIZE_X,
              GAME_VIEW_Y + py[j] * TILE_SIZE_Y,
            ) &
              collision) ===
              0 &&
            (Math.abs(ty - py[j]) < 12 ||
              ((tileHits(
                tileIds.redjumper + o.tile,
                GAME_VIEW_X + o.x - 6 * TILE_SIZE_X,
                GAME_VIEW_Y + py[j] * TILE_SIZE_Y,
              ) &
                collision) ===
                0 &&
                !isWall(tx - 7, py[j] + 1) &&
                !isWall(tx - 8, py[j] + 1) &&
                isWall(tx - 7, py[j] + 2) &&
                isWall(tx - 8, py[j] + 2)))
          ) {
            floors[nfloors++] = py[j];
          }
        }

        if (nfloors !== 0) {
          o.desiredFloor = floors[rand() % nfloors] * TILE_SIZE_Y;
          o.state = 7;
          o.state3 = 0;
        }
      }
      break;
    // Jump states:
    case 6:
      o.tile = 2;
      o.x += 2 * TILE_UNIT;
      if (o.desiredFloor < o.y) {
        o.state3 = 0;
        o.y -= 6 * TILE_UNIT;
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
        o.y -= 6 * TILE_UNIT;
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
      o.tile = 2;
      o.x += 2 * TILE_UNIT;
      if (o.state3 >= 2) o.y += TILE_UNIT;
      if (o.state3 >= 4) o.y += TILE_UNIT;
      if (o.state3 >= 6) o.y += TILE_UNIT * 2;
      if (o.state3 >= 10) {
        o.y += TILE_UNIT * 2;
        o.x -= TILE_UNIT;
      }
      if (o.y >= o.desiredFloor) {
        o.y = o.desiredFloor;
        o.state = 0;
        o.state3 = 0;
      }
      break;
    case 9:
      o.tile = 5;
      o.x -= 2 * TILE_UNIT;
      if (o.state3 >= 2) o.y += TILE_UNIT;
      if (o.state3 >= 4) o.y += TILE_UNIT;
      if (o.state3 >= 6) o.y += TILE_UNIT * 2;
      if (o.state3 >= 10) {
        o.y += TILE_UNIT * 2;
        o.x += TILE_UNIT;
      }
      if (o.y >= o.desiredFloor) {
        o.y = o.desiredFloor;
        o.state = 1;
        o.state3 = 0;
      }
      break;
  }
}

function vent2(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const collision = ctx.collision;
  o.state3++;
  switch (o.state) {
    case 0:
      if (o.state3 < 6) {
        o.tile = 3;
      }
      if (o.state3 >= 6 && o.state3 < 22) {
        if (
          (tileHits(tileIds.blob, GAME_VIEW_X + o.x + TILE_UNIT, GAME_VIEW_Y + o.y) & collision) === 0 &&
          o.x + TILE_UNIT < (G.roomWidth - 2) * TILE_SIZE_X &&
          (collisionAt(GAME_VIEW_X + o.x + TILE_SIZE_X * 2, GAME_VIEW_Y + o.y - TILE_UNIT) & collision) !== 0
        ) {
          o.x += TILE_UNIT;
        } else {
          o.state = 1;
          o.x -= TILE_UNIT;
        }
        o.tile = 0;
      }
      if (o.state3 >= 22 && o.state3 < 28) {
        if (o.state3 === 22) playSound(sfx.blob);
        o.tile = 2;
      }
      if (o.state3 >= 28) {
        o.tile = 1;
        if (o.state3 > 52) o.state3 = 0;
      }
      break;
    case 1:
      if (o.state3 < 6) {
        o.tile = 2;
      }
      if (o.state3 >= 6 && o.state3 < 22) {
        if (
          (tileHits(tileIds.blob, GAME_VIEW_X + o.x - TILE_UNIT, GAME_VIEW_Y + o.y) & collision) === 0 &&
          o.x - TILE_UNIT > 0 &&
          (collisionAt(GAME_VIEW_X + o.x - TILE_UNIT, GAME_VIEW_Y + o.y - TILE_UNIT) & collision) !== 0
        ) {
          o.x -= TILE_UNIT;
        } else {
          o.state = 0;
          o.x += TILE_UNIT;
        }
        o.tile = 0;
      }
      if (o.state3 >= 22 && o.state3 < 28) {
        if (o.state3 === 22) playSound(sfx.blob);
        o.tile = 3;
      }
      if (o.state3 >= 28) {
        o.tile = 1;
        if (o.state3 > 52) o.state3 = 0;
      }
      break;
    case 2:
      if (Math.abs(o.x - G.playerX) < 5 * TILE_SIZE_X && G.playerY >= o.y && G.playerY <= o.y + TILE_SIZE_Y * 2) {
        if (o.x < G.playerX) o.state = 0;
        else o.state = 1;
        o.state3 = 0;
      }
      o.tile = 1;
      break;
  }
}

function livingwall(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state3++;
  if (o.state2 === 0) {
    if (o.y === G.playerY - TILE_SIZE_Y && o.x > G.playerX + 2 * TILE_SIZE_X) o.state = 1;
    if (o.state === 0) {
      o.tile = -1;
    } else {
      o.tile = 0;
    }
    if (o.state !== 0 && (o.state3 & 0x01) === 0) {
      o.x--;
    }
  } else {
    if (o.y === G.playerY - TILE_SIZE_Y && o.x < G.playerX - 2 * TILE_SIZE_X) o.state = 1;
    if (o.state === 0) {
      o.tile = -1;
    } else {
      o.tile = 0;
    }
    if (o.state !== 0 && (o.state3 & 0x01) === 0) {
      o.x++;
    }
  }
}

function megabat(i: number, ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  if ((o.state2 & 0x0f) === 8) playSound(sfx.flapwings);
  // falls through (case T_MEGABAT has no break in the C++)
  megabat2(i, ctx);
}

/** Shared body of T_MEGABAT2 / T_MEGABAT3 (and the tail of T_MEGABAT). */
function megabat2(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  let j: number;
  switch (o.state3) {
    case -1:
      o.y += TILE_UNIT;
      break;
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
    o.state = 1;
    o.state2 = 0;

    // If the random number is greater than 11, keep the same direction.
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

function demon3Fire(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state2++;
  if (o.state2 > 10) o.type = T_NADA;
}

function demon9Fire(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state2++;
  if (o.state2 > 5) o.type = T_NADA;
}

function demon5Fire(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.state2++;
  if (o.state2 > 5) o.type = T_NADA;
}

function lava1(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  o.tile = 5;
  o.state2++;
  if (o.state2 >= 16) o.type = T_NADA;
}

function lava2(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  if (o.state2 === 0) o.state3 = 22 + (rand() % 10);
  o.tile = (o.state2 % 2) + idiv(o.state2 & 0x08, 4);
  o.state2++;
  if (o.state2 < o.state3) {
    o.y -= TILE_UNIT * 4;
  } else {
    switch (o.state2 % 6) {
      case 0:
      case 1:
        o.y -= TILE_UNIT;
        break;
      case 3:
      case 4:
        o.y += TILE_UNIT;
        break;
    }
    if (o.state2 === o.state3 + 32) {
      let j: number;

      o.type = T_NADA;
      j = addObject(T_ENEMY, o.x, o.y, 1, T_LAVA3, -4);
      G.objects[j].baseTile = tileIds.lava;
      j = addObject(T_ENEMY, o.x, o.y, 1, T_LAVA3, -3);
      G.objects[j].baseTile = tileIds.lava;
      j = addObject(T_ENEMY, o.x, o.y, 1, T_LAVA3, -2);
      G.objects[j].baseTile = tileIds.lava;
      j = addObject(T_ENEMY, o.x, o.y, 1, T_LAVA3, -1);
      G.objects[j].baseTile = tileIds.lava;
      j = addObject(T_ENEMY, o.x, o.y, 1, T_LAVA3, 1);
      G.objects[j].baseTile = tileIds.lava;
      j = addObject(T_ENEMY, o.x, o.y, 1, T_LAVA3, 2);
      G.objects[j].baseTile = tileIds.lava;
      j = addObject(T_ENEMY, o.x, o.y, 1, T_LAVA3, 3);
      G.objects[j].baseTile = tileIds.lava;
      j = addObject(T_ENEMY, o.x, o.y, 1, T_LAVA3, 4);
      G.objects[j].baseTile = tileIds.lava;

      playSound(sfx.fireball2);
    }
  }
}

function lava3(i: number, _ctx: ObjAnimCtx): void {
  const o = G.objects[i];
  const xm = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const xm2 = [-6, -4, -2, -1, 0, 1, 2, 4, 6];
  const xm3 = [-7, -5, -3, -1, 0, 1, 3, 5, 7];

  if (o.state2 === 0) {
    switch (o.state) {
      case 4:
      case -4:
        o.state2 = 12;
        break;
      case 3:
      case -3:
        o.state2 = 8;
        break;
      case 2:
      case -2:
        o.state2 = 4;
        break;
    }
  }
  o.tile = 4;
  if (o.state2 < 16) o.x += xm3[o.state + 4];
  if (o.state2 >= 16 && o.state2 < 32) o.x += xm2[o.state + 4];
  if (o.state2 >= 32) o.x += xm[o.state + 4];
  o.state2++;
  if (o.state2 < 20) {
    if (o.state2 < 8) o.y -= TILE_UNIT;
    if (o.state2 < 12) o.y -= TILE_UNIT;
    if (o.state2 < 16) o.y -= TILE_UNIT;
    if (o.state2 < 18) o.y -= idiv(TILE_UNIT, 2);
    if (o.state2 < 19) o.y -= idiv(TILE_UNIT, 2);
  } else {
    let miny = TILE_SIZE_Y * 12;

    if (G.world === 10) miny = TILE_SIZE_Y * 16;
    if (o.state2 >= 22) o.y += idiv(TILE_UNIT, 2);
    if (o.state2 >= 24) o.y += idiv(TILE_UNIT, 2);
    if (o.state2 >= 26) o.y += TILE_UNIT;
    if (o.state2 >= 28) o.y += TILE_UNIT;
    if (o.state2 >= 32) o.y += TILE_UNIT;
    if (o.state2 >= 50 && o.y >= miny) {
      o.enemy = T_LAVA1;
      o.state2 = 0;
    }
  }
}

/** `case T_WORM:` … `case T_LAVA3:` of the enemy switch. */
export const ENEMY_UPDATERS_A: Record<number, EnemyUpdater> = {
  [T_WORM]: worm,
  [T_BAT]: bat,
  [T_SKELETON]: skeleton,
  [T_SMOKE]: smoke,
  [T_SLIME]: slime,
  [T_BOUNCINGBALL]: bouncingball,
  [T_WATERMONSTER]: watermonster,
  [T_WATERMONSTER_ARM]: watermonsterArm,
  [T_BUBBLE]: bubble,
  [T_FSTONE]: fstone,
  [T_RSTONE]: rstone,
  [T_KNIGHT]: knight,
  [T_BLOB]: blob,
  [T_BAMBU]: bambu,
  [T_PORCUPINE]: porcupine,
  [T_PORCUPINE_BULLET]: porcupineBullet,
  [T_JUMPINGBUSH]: jumpingbush,
  [T_BLUESPIDER]: bluespider,
  [T_WHITEFIREBALL]: whitefireball,
  [T_DEMON1_BONES]: demon1Bones,
  [T_DEMON1_BONES2]: demon1Bones2,
  [T_BLACK]: black,
  [T_WITCH]: witch,
  [T_WHITEBEAR]: whitebear,
  [T_WHITEBEAR_BULLET]: whitebearBullet,
  [T_FEET]: feet,
  [T_DEMON2_BALLS]: demon2Balls,
  [T_REDJUMPER]: redjumper,
  [T_VENT2]: vent2,
  [T_LIVINGWALL]: livingwall,
  [T_MEGABAT]: megabat,
  [T_MEGABAT2]: megabat2,
  [T_MEGABAT3]: megabat2,
  [T_DEMON3_FIRE]: demon3Fire,
  [T_DEMON9_FIRE]: demon9Fire,
  [T_DEMON5_FIRE]: demon5Fire,
  [T_LAVA1]: lava1,
  [T_LAVA2]: lava2,
  [T_LAVA3]: lava3,
};
