/**
 * Weapon hits (part of gameinteractions.cpp): which weapon object touched a
 * target (`weaponCollision`) and what a sword or weapon hit does to each kind
 * of enemy (`hitEnemy`). Called from testInteractions, once per object per frame.
 *
 * The tests read G.collision (painted while drawing), where weapons and the
 * sword are painted as T_WEAPON.
 */
import { playMusic, playSound, stopMusic } from '../platform/audio';
import {
  GAME_VIEW_X,
  GAME_VIEW_Y,
  HIT_PERIOD,
  MASK_OFFSET,
  MAX_OBJECTS,
  TILE_SIZE_X,
  TILE_SIZE_Y,
  TILE_UNIT,
  T_BAMBU,
  T_BAT,
  T_BDEMON,
  T_BFLY_GIANT,
  T_BFLY_LARGE,
  T_BFLY_MEDIUM,
  T_BFLY_SMALL,
  T_BIRD,
  T_BLACK,
  T_BLOB,
  T_BLUESPIDER,
  T_BOUNCINGBALL,
  T_CHICKEN,
  T_CYCLOPS,
  T_DEMON1,
  T_DEMON10,
  T_DEMON10_BALL,
  T_DEMON1_BONES,
  T_DEMON1_BONES2,
  T_DEMON2_BALLS,
  T_DEMON2_HEAD,
  T_DEMON3,
  T_DEMON4,
  T_DEMON5,
  T_DEMON6,
  T_DEMON6_BULLET,
  T_DEMON7,
  T_DEMON7_BULLET,
  T_DEMON8,
  T_DEMON8_BULLET,
  T_DEMON9,
  T_ENEMY,
  T_EXPLOSION,
  T_FEET,
  T_FLAME,
  T_FLAME_BULLET,
  T_FSTONE,
  T_GHOST,
  T_GHOST_BULLET,
  T_GLIZARD,
  T_GLIZARD_TONGUE,
  T_GORILLA,
  T_GREENMONKEY,
  T_HAIRY,
  T_HEAD,
  T_HEAD_BULLET,
  T_JUMPINGBUSH,
  T_KNIGHT,
  T_KNIGHTHEAD,
  T_LAVA3,
  T_LIVINGWALL,
  T_MEGABAT,
  T_MEGABAT2,
  T_MEGABAT3,
  T_MINE_EXP,
  T_NADA,
  T_OCTOPUS,
  T_OWL,
  T_PACMAN,
  T_PAMPERSE_BALL,
  T_PIRANHA,
  T_PLANT,
  T_PORCUPINE,
  T_REDDRAGON,
  T_REDJUMPER,
  T_RFL_ARROW,
  T_RFL_ARROW2,
  T_RFL_FIRE,
  T_RFL_RFIRE,
  T_ROCKMAN,
  T_RSTONE,
  T_SKELETON,
  T_SLIME,
  T_SNAKE,
  T_SNAKE_BULLET,
  T_SPIDER,
  T_STONEMAN,
  T_TRANSFORMER,
  T_VENT2,
  T_WATERBUG,
  T_WATERDRAGON,
  T_WATERMONSTER_ARM,
  T_WEAPON,
  T_WEAPON_ARROW,
  T_WEAPON_ARROW2,
  T_WEAPON_FIRE,
  T_WEAPON_MINE,
  T_WEAPON_RFIRE,
  T_WHITEBEAR,
  T_WHITEFIREBALL,
  T_WHITESTAR,
  T_WITCH,
  T_WITCH2,
  T_WORM,
  T_WORM2,
} from './constants';
import { idiv } from './cutil';
import { addObject, isWordTyped, rememberObject } from './gameaux';
import type { GameObject } from './object';
import { sfx, tileIds } from './resources';
import { spawnEnemy } from './roomevents';
import { G } from './state';
import { tileHits, tileHitsNative } from './tiledraw';

/** weaponCollision's result when no weapon object was touched: the hit came from the sword. */
export const SWORD = -1;

/** Objects to remove at the end of testInteractions (file-local in the C++ code). */
export const toDelete: boolean[] = new Array<boolean>(MAX_OBJECTS).fill(false);

/** Whether an enemy has taken a hit this frame: most enemies are skipped once one has. */
let enemyHit = false;

/** Clears the per-frame state; called at the start of testInteractions. */
export function beginWeaponHits(): void {
  toDelete.fill(false);
  enemyHit = false;
}

/** What an explosion leaves behind (see T_EXPLOSION in gameobjects.ts). */
const NO_LOOT = 0;
const LOOT = 1;
const RICH_LOOT = 2;

/** Projectiles leave nothing behind when shot down. */
const PROJECTILES = new Set([
  T_HEAD_BULLET,
  T_GHOST_BULLET,
  T_LAVA3,
  T_DEMON6_BULLET,
  T_DEMON7_BULLET,
  T_DEMON8_BULLET,
  T_SNAKE_BULLET,
  T_DEMON10_BALL,
  T_PAMPERSE_BALL,
]);

/**
 * The index of the weapon object (arrow, fire, mine, mine explosion) whose
 * sprite overlaps tile `tile` drawn at screen position (tx, ty), or SWORD.
 * Arrows and fire that hit are marked for deletion; a mine that is hit explodes.
 * `old` receives the weapon's type at the moment of the hit.
 */
export function weaponCollision(tile: number, tx: number, ty: number, old?: { value: number }): number {
  let found = SWORD;
  // NOTE (original): `t` is not reset per object, so an exploding mine that misses its own
  // test below is tested again with the tile of the previous weapon.
  let t = tileIds.weapons;

  for (let i = 0; i < G.objectCount; i++) {
    const w = G.objects[i];
    switch (w.type) {
      case T_WEAPON_ARROW:
        t = tileIds.weapons + (w.state === 0 ? 0 : 6);
        break;
      case T_WEAPON_ARROW2:
        t = tileIds.weapons + (w.state === 0 ? 1 : 7);
        break;
      case T_WEAPON_FIRE:
        t = tileIds.weapons + (w.state === 0 ? 3 : 8);
        break;
      case T_WEAPON_RFIRE:
        t = tileIds.weapons + 2;
        break;
      case T_WEAPON_MINE:
        t = tileIds.weapons + 9;
        break;
      case T_MINE_EXP:
        break;
      default:
        continue;
    }

    if (
      w.type === T_MINE_EXP &&
      !toDelete[i] &&
      (G.tiles[tileIds.weapons + w.tile].overlaps(G.tiles[tile], w.drawX, w.drawY, tx, ty) ||
        G.tiles[tileIds.weapons + w.tile].overlaps(G.tiles[tile], w.drawX, w.drawY - idiv(TILE_SIZE_Y * 2, 3), tx, ty))
    ) {
      if (old !== undefined) old.value = w.type;
      found = i;
    } else if (
      (w.type === T_WEAPON_ARROW2 || !toDelete[i]) &&
      G.tiles[t].overlaps(G.tiles[tile], w.drawX, w.drawY, tx, ty)
    ) {
      if (old !== undefined) old.value = w.type;
      if (w.type === T_WEAPON_MINE) {
        detonateMine(w);
        found = i;
      } else {
        // Arrows and fire are used up (ceramic arrows fly on):
        if (w.type === T_WEAPON_ARROW || w.type === T_WEAPON_FIRE || w.type === T_WEAPON_RFIRE) toDelete[i] = true;
        return i;
      }
    }
  }
  return found;
}

/** A mine goes off: it becomes an explosion (a bigger sprite, hence the move). */
export function detonateMine(mine: GameObject): void {
  playSound(sfx.mine);
  mine.x -= TILE_SIZE_X;
  mine.y -= TILE_SIZE_Y * 2 + TILE_UNIT;
  mine.type = T_MINE_EXP;
  mine.state = 0;
  G.firedMines--;
}

/** Whether `weapon` (a weaponCollision result) is a weapon object of the given type. */
function weaponIs(weapon: number, type: number): boolean {
  return weapon !== SWORD && G.objects[weapon].type === type;
}

function isMine(weapon: number): boolean {
  return weaponIs(weapon, T_WEAPON_MINE) || weaponIs(weapon, T_MINE_EXP);
}

/**
 * After a hit the target ignores weapons for a while (`lastHit` frames):
 * HIT_PERIOD after the sword or when `short` holds, twice that after a mine.
 */
function stun(o: GameObject, weapon: number, short: boolean): void {
  if (weapon === SWORD || short) o.lastHit = HIT_PERIOD;
  if (isMine(weapon)) o.lastHit = HIT_PERIOD * 2;
}

/** Shields send arrows and fire back; any other weapon object is destroyed. */
function deflect(weapon: number): void {
  const w = G.objects[weapon];
  switch (w.type) {
    case T_WEAPON_ARROW:
      w.type = T_RFL_ARROW;
      break;
    case T_WEAPON_ARROW2:
      w.type = T_RFL_ARROW2;
      break;
    case T_WEAPON_FIRE:
      w.type = T_RFL_FIRE;
      break;
    case T_WEAPON_RFIRE:
      w.type = T_RFL_RFIRE;
      break;
    default:
      toDelete[weapon] = true;
      return;
  }
  toDelete[weapon] = false;
}

/** A hit on an invulnerable target (armour, stones, …): it clangs, and weapons bounce off. */
export function blockHit(o: GameObject, weapon: number): void {
  if (weapon === SWORD && o.lastHit === 0) playSound(sfx.armourhit);
  stun(o, weapon, weaponIs(weapon, T_WEAPON_ARROW2));
  if (weapon !== SWORD && !isMine(weapon)) {
    deflect(weapon);
    playSound(sfx.armourhit);
  }
}

/**
 * Whether a hit gets past a shield: it must come from the enemy's back, which
 * is to its right (`back` 1) or to its left (`back` 0). Mines always get through.
 * Weapon objects fly right in state 0 and left in state 1.
 */
function hitFromBehind(o: GameObject, weapon: number, back: number): boolean {
  if (weapon === SWORD) return (back === 1 && G.playerX > o.x) || (back === 0 && G.playerX < o.x);
  const w = G.objects[weapon];
  return (back === 1 && w.state === 1) || (back === 0 && w.state === 0) || isMine(weapon);
}

/** Takes energy (`size`): one point, two with item 24 (the sabre). Then `die` or the hit sound. */
function wound(o: GameObject, die: () => void, hurt: () => void = () => playSound(sfx.enemyhit)): void {
  o.size--;
  if (G.items[24]) o.size--;
  if (o.size <= 0) die();
  else hurt();
}

/** Experience points, doubled by item 14 (the vase). */
function gainExperience(points: number): void {
  G.experience[G.character] += points;
  if (G.items[14]) G.experience[G.character] += points;
}

function explode(o: GameObject, loot: number): void {
  o.type = T_EXPLOSION;
  o.state = loot;
  o.size = 27;
}

/** Big enemies blow up in four more explosions around them. */
function burst(o: GameObject): void {
  addObject(T_EXPLOSION, o.x - TILE_SIZE_X, o.y - TILE_SIZE_Y, 43, 0, 3);
  addObject(T_EXPLOSION, o.x - TILE_SIZE_X, o.y + TILE_SIZE_Y, 59, 0, 3);
  addObject(T_EXPLOSION, o.x + TILE_SIZE_X, o.y - TILE_SIZE_Y, 75, 0, 3);
  addObject(T_EXPLOSION, o.x + TILE_SIZE_X, o.y + TILE_SIZE_Y, 91, 0, 3);
}

function forget(i: number): void {
  rememberObject(G.roomX, G.roomY, i, T_ENEMY);
}

/** One hit on a world demon; below zero energy the fight moves on. */
function damageDemon(o: GameObject, hitSound = true): void {
  o.size--;
  if (o.size < 0) {
    G.fightingDemon++;
    stopMusic();
    playMusic('demon3', 'demon4', null);
  } else if (hitSound) {
    playSound(sfx.demonhit);
  }
}

/** Whether tile `t` (scaled to w×h, default 32×32) at the object's draw position touches a weapon. */
function weaponOn(o: GameObject, t: number, w?: number, h?: number): boolean {
  return (tileHits(t, o.drawX, o.drawY, w, h) & T_WEAPON) !== 0;
}

/** Like weaponOn, with tile `t` at its own size. */
function weaponOnNative(o: GameObject, t: number): boolean {
  return (tileHitsNative(t, o.drawX, o.drawY) & T_WEAPON) !== 0;
}

/** The current sprite of a native-size enemy. */
function spriteOf(o: GameObject): number {
  return o.baseTile + o.tile;
}

/** Checks whether the sword or a weapon hit enemy `i` (`o`, with lastHit 0) and applies the hit. */
export function hitEnemy(i: number, o: GameObject): void {
  switch (o.enemy) {
    case T_WORM:
      hitWorm(i, o);
      break;
    case T_BAT:
      hitBat(i, o);
      break;
    case T_SKELETON:
      hitSkeleton(i, o);
      break;
    case T_SLIME:
      hitSlime(o);
      break;
    case T_WATERMONSTER_ARM:
      hitWatermonsterArm(o);
      break;
    case T_KNIGHT:
      hitKnight(i, o);
      break;
    case T_BLOB:
      if (weaponOn(o, tileIds.blob + o.state2) && !enemyHit) {
        enemyHit = true;
        weaponCollision(tileIds.blob + o.state2, o.drawX, o.drawY);
        gainExperience(2);
        explode(o, LOOT);
        playSound(sfx.enemykill);
      }
      break;
    case T_WITCH:
      hitWitch(i, o);
      break;

    case T_RSTONE:
    case T_FSTONE:
    case T_BLACK:
    case T_HEAD:
    case T_OCTOPUS:
      if (o.tile >= 0 && weaponOnNative(o, spriteOf(o)) && !enemyHit) {
        const weapon = weaponCollision(spriteOf(o), o.drawX, o.drawY);
        enemyHit = true;
        blockHit(o, weapon);
      }
      break;

    case T_JUMPINGBUSH:
    case T_WHITEFIREBALL:
    case T_PORCUPINE:
    case T_WHITEBEAR:
    case T_REDJUMPER:
    case T_VENT2:
    case T_LAVA3:
    case T_PIRANHA:
    case T_WHITESTAR:
    case T_KNIGHTHEAD:
    case T_CHICKEN:
    case T_ROCKMAN:
    case T_BFLY_SMALL:
    case T_BFLY_MEDIUM:
    case T_BFLY_LARGE:
    case T_BFLY_GIANT:
    case T_GHOST:
    case T_GHOST_BULLET:
    case T_HEAD_BULLET:
    case T_WORM2:
    case T_WATERDRAGON:
    case T_WATERBUG:
    case T_BIRD:
    case T_PACMAN:
    case T_DEMON6_BULLET:
    case T_OWL:
    case T_GREENMONKEY:
    case T_PLANT:
    case T_DEMON7_BULLET:
    case T_TRANSFORMER:
    case T_FLAME:
    case T_WITCH2:
    case T_FLAME_BULLET:
    case T_DEMON8_BULLET:
    case T_SNAKE:
    case T_GLIZARD:
    case T_GORILLA:
    case T_SNAKE_BULLET:
    case T_DEMON10_BALL:
    case T_PAMPERSE_BALL:
      if (o.tile >= 0 && weaponOnNative(o, spriteOf(o)) && !enemyHit) {
        const weapon = weaponCollision(spriteOf(o), o.drawX, o.drawY);
        enemyHit = true;
        stun(o, weapon, weaponIs(weapon, T_WEAPON_ARROW2));
        wound(o, () => {
          forget(i);
          gainExperience(o.experience);
          o.x += o.xoffs;
          o.y += o.yoffs;
          explode(o, PROJECTILES.has(o.enemy) ? NO_LOOT : LOOT);
          playSound(sfx.enemykill);
        });
      }
      break;

    case T_BAMBU:
      if (o.tile >= 1 && weaponOnNative(o, spriteOf(o)) && !enemyHit) {
        const weapon = weaponCollision(spriteOf(o), o.drawX, o.drawY);
        enemyHit = true;
        stun(o, weapon, G.currentWeapon === 1);
        wound(o, () => {
          forget(i);
          gainExperience(o.experience);
          o.x += o.xoffs;
          o.y += o.yoffs;
          explode(o, NO_LOOT);
          playSound(sfx.enemykill);
        });
      }
      break;

    case T_REDDRAGON:
      if (o.tile >= 0 && weaponOnNative(o, spriteOf(o)) && !enemyHit) {
        const weapon = weaponCollision(spriteOf(o), o.drawX, o.drawY);
        enemyHit = true;
        stun(o, weapon, G.currentWeapon === 1);
        wound(o, () => {
          forget(i);
          gainExperience(o.experience);
          o.x += o.xoffs;
          o.y += o.yoffs;
          explode(o, LOOT);
          playSound(sfx.enemykill);
          burst(o);
        });
      }
      break;

    case T_STONEMAN:
      hitStoneman(i, o);
      break;

    case T_HAIRY:
    case T_CYCLOPS:
    case T_BDEMON:
      if (o.tile >= 0 && weaponOnNative(o, spriteOf(o)) && !enemyHit) {
        const weapon = weaponCollision(spriteOf(o), o.drawX, o.drawY);
        stun(o, weapon, G.currentWeapon === 1);
        enemyHit = true;
        wound(o, () => {
          forget(i);
          gainExperience(o.experience);
          o.x += idiv(TILE_SIZE_X, 2) + o.xoffs;
          o.y += idiv(TILE_SIZE_Y, 2) + o.yoffs;
          explode(o, LOOT);
          playSound(sfx.enemykill);
          burst(o);
        });
      }
      break;

    case T_SPIDER:
      // The spider is tested at its thread end; no weaponCollision (commented out in the original).
      if (
        o.tile >= 0 &&
        (tileHitsNative(o.baseTile, GAME_VIEW_X + o.x, GAME_VIEW_Y + o.y + TILE_SIZE_Y * o.tile) & T_WEAPON) !== 0 &&
        !enemyHit
      ) {
        enemyHit = true;
        wound(o, () => {
          forget(i);
          gainExperience(o.experience);
          explode(o, LOOT);
          playSound(sfx.enemykill);
        });
      }
      break;

    case T_BLUESPIDER:
      // No weaponCollision (commented out in the original).
      if (o.tile >= 0 && weaponOnNative(o, spriteOf(o)) && !enemyHit) {
        enemyHit = true;
        wound(o, () => {
          forget(i);
          gainExperience(o.experience);
          o.x += o.state2;
          explode(o, LOOT);
          playSound(sfx.enemykill);
        });
      }
      break;

    case T_BOUNCINGBALL:
      if (o.tile >= 0 && weaponOnNative(o, spriteOf(o)) && !enemyHit) {
        const weapon = weaponCollision(spriteOf(o), o.drawX, o.drawY);
        enemyHit = true;
        stun(o, weapon, G.currentWeapon === 1);
        wound(o, () => {
          forget(i);
          gainExperience(o.experience);
          o.y += o.state;
          explode(o, LOOT);
          playSound(sfx.enemykill);
        });
      }
      break;

    case T_FEET:
      if (o.tile >= 0 && weaponOnNative(o, spriteOf(o)) && !enemyHit) {
        const weapon = weaponCollision(spriteOf(o), o.drawX, o.drawY);
        enemyHit = true;
        stun(o, weapon, G.currentWeapon === 1);
        wound(o, () => {
          forget(i);
          gainExperience(o.experience);
          explode(o, LOOT);
          playSound(sfx.enemykill);
        });
      }
      break;

    case T_LIVINGWALL:
      hitLivingWall(i, o);
      break;

    case T_MEGABAT: {
      // The giant bat splits into two bats when hit:
      const t = tileIds.megabat + ((o.state2 >> 3) % 2);
      if (weaponOn(o, t, TILE_SIZE_X * 4, TILE_SIZE_Y * 2) && !enemyHit) {
        enemyHit = true;
        weaponCollision(t, o.drawX, o.drawY);
        o.type = T_NADA;
        playSound(sfx.enemyhit);
        // NOTE (original): the first spawn may reuse this very slot (now T_NADA), moving `o`
        // before the second bat's position is read from it.
        spawnEnemy(o.x + TILE_SIZE_X, o.y, 1, T_MEGABAT2, 0, tileIds.bat);
        spawnEnemy(o.x + TILE_SIZE_X * 2, o.y, 1, T_MEGABAT2, 0, tileIds.bat);
      }
      break;
    }
    case T_MEGABAT2: {
      // ... and each of those into two small bats:
      const t = tileIds.bat + ((o.state2 >> 2) % 2);
      if (weaponOn(o, t) && !enemyHit) {
        enemyHit = true;
        weaponCollision(t, o.drawX, o.drawY);
        o.type = T_NADA;
        playSound(sfx.enemyhit);
        spawnEnemy(o.x, o.y, 1, T_MEGABAT3, 0, tileIds.megabat);
        spawnEnemy(o.x, o.y, 1, T_MEGABAT3, 0, tileIds.megabat);
      }
      break;
    }
    case T_MEGABAT3: {
      const t = tileIds.megabat + ((o.state2 >> 2) % 2);
      if (weaponOn(o, t, TILE_SIZE_X * 4, TILE_SIZE_Y * 2) && !enemyHit) {
        enemyHit = true;
        weaponCollision(t, o.drawX, o.drawY);
        gainExperience(2);
        explode(o, LOOT);
        playSound(sfx.enemykill);
      }
      break;
    }

    case T_GLIZARD_TONGUE:
      hitTongue(o);
      break;

    // WORLD DEMONS:
    case T_DEMON1:
      if (o.size >= 0 && weaponOn(o, o.state + 6, TILE_SIZE_X * 10, TILE_SIZE_Y * 7)) {
        const weapon = weaponCollision(o.state + 6, o.drawX, o.drawY);
        if (weapon === SWORD || weaponIs(weapon, T_WEAPON_ARROW)) {
          if (weapon === SWORD) o.lastHit = HIT_PERIOD;
          damageDemon(o);
        }
      }
      break;
    case T_DEMON1_BONES: {
      // A bone breaks into two small bones:
      const t = tileIds.demon + 12 + (o.state2 >> 1);
      if (weaponOn(o, t) && !enemyHit) {
        enemyHit = true;
        weaponCollision(t, o.drawX, o.drawY);
        explode(o, NO_LOOT);
        playSound(sfx.enemykill);
        spawnEnemy(o.x, o.y, 1, T_DEMON1_BONES2, -TILE_UNIT, tileIds.demon);
        spawnEnemy(o.x, o.y, 1, T_DEMON1_BONES2, TILE_UNIT, tileIds.demon);
      }
      break;
    }
    case T_DEMON1_BONES2: {
      const t = tileIds.demon + 12 + (o.state2 >> 1);
      if (weaponOn(o, t) && !enemyHit) {
        enemyHit = true;
        weaponCollision(t, o.drawX, o.drawY);
        explode(o, NO_LOOT);
        playSound(sfx.enemykill);
      }
      break;
    }

    case T_DEMON2_HEAD:
      if (o.state >= 0 && weaponOn(o, o.state, TILE_SIZE_X, TILE_SIZE_Y)) {
        const weapon = weaponCollision(o.state, o.drawX, o.drawY);
        if (weapon === SWORD || weaponIs(weapon, T_WEAPON_ARROW)) {
          if (weapon === SWORD) o.lastHit = HIT_PERIOD;
          damageDemon(o);
        }
      }
      break;
    case T_DEMON2_BALLS:
      if (weaponOn(o, tileIds.demon + 7, TILE_SIZE_X, TILE_SIZE_Y) && !enemyHit) {
        enemyHit = true;
        weaponCollision(tileIds.demon + 7, o.drawX, o.drawY);
        explode(o, NO_LOOT);
        playSound(sfx.enemykill);
      }
      break;

    case T_DEMON3:
      if (o.size >= 0 && weaponOnNative(o, spriteOf(o))) {
        const weapon = weaponCollision(spriteOf(o), o.drawX, o.drawY);
        if (weapon === SWORD || weaponIs(weapon, T_WEAPON_FIRE)) {
          if (weapon === SWORD) o.lastHit = HIT_PERIOD;
          damageDemon(o);
        }
      }
      break;

    case T_DEMON4:
      // Only mines hurt it (and there is no hit sound):
      if (o.size >= 0 && weaponOnNative(o, spriteOf(o))) {
        const weapon = weaponCollision(spriteOf(o), o.drawX, o.drawY);
        if (weaponIs(weapon, T_WEAPON_MINE) || (weaponIs(weapon, T_MINE_EXP) && G.objects[weapon].state === 0)) {
          o.lastHit = HIT_PERIOD * 2;
          damageDemon(o, false);
        }
      }
      break;

    case T_DEMON5: {
      const t = o.baseTile + o.state3 + 8;
      if (o.size >= 0 && (tileHitsNative(t, o.drawX, o.drawY + TILE_SIZE_Y) & T_WEAPON) !== 0) {
        const weapon = weaponCollision(t, o.drawX, o.drawY + TILE_SIZE_Y);
        if (weapon === SWORD || weaponIs(weapon, T_WEAPON_ARROW)) {
          o.lastHit = HIT_PERIOD;
          damageDemon(o);
        }
      }
      break;
    }

    case T_DEMON6:
      if (o.size >= 0 && weaponOnNative(o, o.baseTile + 3)) {
        const weapon = weaponCollision(o.baseTile + 3, o.drawX, o.drawY);
        if (weapon === SWORD || weaponIs(weapon, T_WEAPON_ARROW) || weaponIs(weapon, T_WEAPON_FIRE)) {
          o.lastHit = HIT_PERIOD;
          damageDemon(o);
        }
      }
      break;

    case T_DEMON7:
      if (o.size >= 0 && weaponOnNative(o, spriteOf(o) + 4)) {
        const weapon = weaponCollision(spriteOf(o) + 4, o.drawX, o.drawY);
        if (weapon === SWORD || weaponIs(weapon, T_WEAPON_ARROW2)) {
          o.lastHit = HIT_PERIOD * 2;
          damageDemon(o);
        }
      }
      break;

    case T_DEMON8:
      if (o.size >= 0 && weaponOnNative(o, spriteOf(o))) {
        const weapon = weaponCollision(spriteOf(o), o.drawX, o.drawY);
        if (weapon === SWORD || weaponIs(weapon, T_WEAPON_RFIRE)) {
          o.lastHit = HIT_PERIOD;
          damageDemon(o);
        }
      }
      break;

    case T_DEMON9:
      if (o.size >= 0 && weaponOnNative(o, spriteOf(o) + 3)) {
        const weapon = weaponCollision(spriteOf(o) + 3, o.drawX, o.drawY);
        if (weapon === SWORD || weaponIs(weapon, T_WEAPON_ARROW2)) {
          o.lastHit = HIT_PERIOD * 2;
          damageDemon(o);
        }
      }
      break;

    case T_DEMON10:
      // Only with the cross:
      if (o.size >= 0 && o.tile >= 0 && weaponOnNative(o, spriteOf(o) + 2) && G.hasCross) {
        const weapon = weaponCollision(spriteOf(o) + 2, o.drawX, o.drawY);
        stun(o, weapon, weaponIs(weapon, T_WEAPON_ARROW2));
        damageDemon(o);
      }
      break;
  }
}

function hitWorm(i: number, o: GameObject): void {
  // The worm's frame follows its state (negative: the other direction).
  const frames = o.state < 0 ? G.wormStateTileI : G.wormStateTile;
  const t = tileIds.worm + frames[Math.min(Math.max(Math.abs(o.state) - 1, 0), 27)];
  if (weaponOn(o, t) && !enemyHit) {
    enemyHit = true;
    weaponCollision(t, o.drawX, o.drawY);
    forget(i);
    playSound(sfx.enemykill);
    gainExperience(2);
    explode(o, LOOT);
  }
}

function hitBat(i: number, o: GameObject): void {
  const t = tileIds.bat + (o.state === 1 ? (o.state2 >> 2) % 2 : 2);
  // Typing "umbrella" with item 25 (the dagger) kills all bats.
  if ((weaponOn(o, t) && !enemyHit) || (G.items[25] && isWordTyped('umbrella'))) {
    if (G.currentWeapon !== 1) enemyHit = true;
    weaponCollision(t, o.drawX, o.drawY);
    forget(i);
    playSound(sfx.enemykill);
    gainExperience(2);
    explode(o, LOOT);
  }
}

function hitSkeleton(i: number, o: GameObject): void {
  let t = tileIds.skeleton + 4;
  if (o.size === 8) t = tileIds.skeleton + ((o.state2 >> 2) % 2) + (o.state === 1 || o.state === 3 ? 2 : 0);
  if (!weaponOn(o, t) || enemyHit) return;

  const weapon = weaponCollision(t, o.drawX, o.drawY);
  enemyHit = true;
  if (hitFromBehind(o, weapon, 1 - (o.state & 0x01))) {
    stun(o, weapon, weaponIs(weapon, T_WEAPON_ARROW2));
    wound(
      o,
      () => {
        forget(i);
        playSound(sfx.enemykill);
        gainExperience(8);
        explode(o, NO_LOOT);
      },
      () => {
        playSound(sfx.skeletonhit);
        o.state2 = -48;
      },
    );
  } else {
    if (weapon !== SWORD) deflect(weapon);
    playSound(sfx.armourhit);
  }
}

function hitKnight(i: number, o: GameObject): void {
  const t = tileIds.knight + o.state2;
  if (!weaponOn(o, t) || enemyHit) return;

  const weapon = weaponCollision(t, o.drawX, o.drawY);
  enemyHit = true;
  if (o.state >= 2 || hitFromBehind(o, weapon, o.state)) {
    stun(o, weapon, weaponIs(weapon, T_WEAPON_ARROW2));
    wound(o, () => {
      forget(i);
      playSound(sfx.enemykill);
      gainExperience(8);
      explode(o, RICH_LOOT);
    });
  } else {
    if (weapon !== SWORD) deflect(weapon);
    playSound(sfx.armourhit);
  }
}

function hitSlime(o: GameObject): void {
  const t = tileIds.slime + idiv(o.state2, 6) + (o.state === 1 ? 2 : 0);
  if (weaponOn(o, t) && !enemyHit) {
    const weapon = weaponCollision(t, o.drawX, o.drawY);
    enemyHit = true;
    stun(o, weapon, G.currentWeapon === 1);
    wound(o, () => {
      gainExperience(4);
      explode(o, LOOT);
      playSound(sfx.enemykill);
    });
  }
}

/** The water monster's arm: a hand on top of `state2` half-tiles of arm. */
function hitWatermonsterArm(o: GameObject): void {
  const x = GAME_VIEW_X + o.x;
  const y = GAME_VIEW_Y + o.y;
  const height = idiv(o.state2 * TILE_SIZE_Y, 2);
  let weapon = SWORD;
  let hit = false;

  if ((tileHits(tileIds.watermonster + 1, x, y - height, TILE_SIZE_X, TILE_SIZE_Y) & T_WEAPON) !== 0) {
    // NOTE (original): the hand is tested at the top of the arm, but weaponCollision looks at its foot.
    weapon = weaponCollision(tileIds.watermonster + 1, x, y);
    hit = true;
  }
  for (let j = 0; j < height; j += TILE_SIZE_Y) {
    if ((tileHits(tileIds.watermonster + 2, x, y - j, TILE_SIZE_X, TILE_SIZE_Y) & T_WEAPON) !== 0) {
      const w = weaponCollision(tileIds.watermonster + 2, x, y - j);
      if (w !== SWORD) weapon = w;
      hit = true;
    }
  }
  if (hit) {
    stun(o, weapon, G.currentWeapon === 1);
    wound(o, () => {
      gainExperience(6);
      o.y -= height;
      explode(o, NO_LOOT);
      playSound(sfx.enemykill);
      burst(o);
    });
  }
}

function hitWitch(i: number, o: GameObject): void {
  if (o.state === 0 || !weaponOn(o, tileIds.witch) || enemyHit) return;

  enemyHit = true;
  const weapon = weaponCollision(tileIds.witch, o.drawX, o.drawY);
  stun(o, weapon, G.currentWeapon === 1);
  // The witches share their energy:
  for (let j = 0; j < G.objectCount; j++) {
    if (G.objects[j].type === T_ENEMY && G.objects[j].enemy === T_WITCH) {
      G.objects[j].size--;
      // NOTE (original): uses i instead of j, so the extra damage only hits the touched witch.
      if (G.items[24]) o.size--;
    }
  }

  if (o.size <= 0) {
    for (let j = 0; j < G.objectCount; j++) {
      if (G.objects[j].type === T_ENEMY && G.objects[j].enemy === T_WITCH) {
        G.objects[j].type = T_NADA;
        rememberObject(G.roomX, G.roomY, j, T_ENEMY);
      }
    }
    gainExperience(4);
    explode(o, LOOT);
    playSound(sfx.enemykill);
  } else {
    playSound(sfx.enemyhit);
  }
}

/** The stone man is invulnerable until it has crumbled (tile 3 and up). */
function hitStoneman(i: number, o: GameObject): void {
  if (o.tile < 3) {
    if (o.tile >= 0 && weaponOnNative(o, spriteOf(o)) && !enemyHit) {
      const weapon = weaponCollision(spriteOf(o), o.drawX, o.drawY);
      enemyHit = true;
      blockHit(o, weapon);
    }
  } else if (weaponOnNative(o, spriteOf(o))) {
    const weapon = weaponCollision(spriteOf(o), o.drawX, o.drawY);
    stun(o, weapon, G.currentWeapon === 1);
    wound(o, () => {
      forget(i);
      gainExperience(o.experience);
      o.x += o.xoffs;
      o.y += o.yoffs;
      explode(o, LOOT);
      playSound(sfx.enemykill);
    });
  }
}

function hitLivingWall(i: number, o: GameObject): void {
  if (o.state !== 0 && weaponOn(o, tileIds.livingwall, TILE_SIZE_X * 2, TILE_SIZE_Y * 3) && !enemyHit) {
    const weapon = weaponCollision(tileIds.livingwall, o.drawX, o.drawY);
    enemyHit = true;
    stun(o, weapon, G.currentWeapon === 1);
    wound(o, () => {
      forget(i);
      o.y += TILE_SIZE_Y;
      gainExperience(4);
      explode(o, LOOT);
      playSound(sfx.enemykill);
    });
  }

  // A moving living wall that reaches the character crushes it:
  if (o.type === T_ENEMY && o.state !== 0) {
    const character = G.facingRight ? tileIds.character[G.character] : tileIds.characterInv[G.character];
    const front = o.state2 === 0 ? TILE_UNIT : -TILE_UNIT;
    if (
      G.tiles[tileIds.livingwall].overlaps(
        G.tiles[character + G.playerFrame + MASK_OFFSET],
        GAME_VIEW_X + o.x + front,
        GAME_VIEW_Y + o.y,
        GAME_VIEW_X + G.playerX,
        GAME_VIEW_Y + G.playerY,
      )
    ) {
      G.energy[G.character] = 0;
    }
  }
}

/** The lizard's tongue: up to 12 segments, pointing up (state 0) or down. */
function hitTongue(o: GameObject): void {
  const length = Math.min((o.state2 <= 28 ? idiv(o.state2, 2) : idiv(48 - o.state2, 2)) + 2, 12);
  const x = GAME_VIEW_X + o.x + o.xoffs + TILE_SIZE_X + TILE_UNIT * 5;
  const y = GAME_VIEW_Y + o.y + o.yoffs + TILE_SIZE_Y + TILE_UNIT * 5;
  let weapon = SWORD;
  let touched = false;

  for (let j = 0; j < length; j++) {
    const t = o.state === 0 ? o.baseTile + 14 + j : o.baseTile + 14 + (length - j);
    const ty = o.state === 0 ? y - (length - j) * TILE_SIZE_Y : y + j * TILE_SIZE_Y;
    if ((tileHits(t, x, ty, TILE_SIZE_X, TILE_SIZE_Y) & T_WEAPON) !== 0) {
      touched = true;
      const w = weaponCollision(t, x, ty);
      if (w !== SWORD) weapon = w;
    }
  }

  if (touched) {
    stun(o, weapon, G.currentWeapon === 1);
    wound(o, () => {
      o.x += TILE_SIZE_X;
      explode(o, NO_LOOT);
      playSound(sfx.enemykill);
    });
  }
}
