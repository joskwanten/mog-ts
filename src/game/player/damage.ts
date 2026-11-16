/** What hurts the character: enemies (and mines), water and lava. */
import { playSound } from '../../platform/audio';
import {
  HIT_TIME,
  S_DEATH,
  S_DOORPASS,
  S_DOWN_LADDER,
  S_ENTERING_PASSAGE,
  S_ENTERING_WORLD,
  S_HIT,
  S_HIT_COLISION,
  S_HIT_RECOVERY,
  S_QUIET_LADDER,
  S_SLOWDOORPASS,
  S_SWORD_LADDER,
  S_UP_LADDER,
  TILE_UNIT,
  T_BAMBU,
  T_BAT,
  T_BDEMON,
  T_BDEMON_BULLET,
  T_BFLY_BULLET,
  T_BFLY_GIANT,
  T_BFLY_LARGE,
  T_BFLY_MEDIUM,
  T_BFLY_SMALL,
  T_BIRD,
  T_BLACK,
  T_BLOB,
  T_BLUESPIDER,
  T_BOUNCINGBALL,
  T_BUBBLE,
  T_CHICKEN,
  T_CHICKEN_EGG,
  T_CLOUD,
  T_CYCLOPS,
  T_CYCLOPS_BULLET,
  T_DEMON1,
  T_DEMON10,
  T_DEMON10_BALL,
  T_DEMON1_BONES,
  T_DEMON1_BONES2,
  T_DEMON2,
  T_DEMON2_BALLS,
  T_DEMON2_HEAD,
  T_DEMON3,
  T_DEMON3_FIRE,
  T_DEMON4,
  T_DEMON5,
  T_DEMON5_FIRE,
  T_DEMON6,
  T_DEMON6_BULLET,
  T_DEMON7,
  T_DEMON7_BULLET,
  T_DEMON8,
  T_DEMON8_BULLET,
  T_DEMON9,
  T_DEMON9_FIRE,
  T_EGG_EXPLOSION,
  T_ENEMY,
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
  T_HAIRYBULLET,
  T_JUMPINGBUSH,
  T_KNIGHT,
  T_KNIGHTHEAD,
  T_LAVA,
  T_LAVA1,
  T_LAVA2,
  T_LAVA3,
  T_LCLOUD,
  T_LIGHTNING,
  T_LIGHTNING_FIRE,
  T_MEGABAT,
  T_MEGABAT2,
  T_MEGABAT3,
  T_NADA,
  T_OCTOPUS,
  T_OWL,
  T_PACMAN,
  T_PAMPERSE_BALL,
  T_PIRANHA,
  T_PLANT,
  T_PLANT_BULLET,
  T_PORCUPINE,
  T_PORCUPINE_BULLET,
  T_REDDRAGON,
  T_REDDRAGON_BULLET,
  T_REDJUMPER,
  T_ROCKMAN,
  T_RSTONE,
  T_SKELETON,
  T_SMOKE,
  T_SNAKE,
  T_SNAKE_BULLET,
  T_STONEMAN,
  T_STONEMAN_BULLET,
  T_TRANSFORMER,
  T_TRANSF_BULLET,
  T_VENT2,
  T_WATER,
  T_WATERMONSTER_ARM,
  T_WHITEBEAR_BULLET,
  T_WHITEFIREBALL,
  T_WITCH,
  T_WITCH2,
  T_WORM,
  T_WORM2,
} from '../constants';
import { idiv } from '../cutil';
import { sfx, tileIds } from '../resources';
import { G } from '../state';
import { characterTile, touches } from './step';

/** What touching an enemy does. */
interface EnemyHit {
  /** Energy lost; -1 freezes the character instead. */
  damage: number;
  /** 0: not a bullet; otherwise its strength (which shields can stop it, see takeHit). */
  bullet: number;
  /** A demon (or its bullets): the half-damage item 12 does not help. */
  demon: boolean;
  /** For demons: the damage when item 1 of world `world` has been found. */
  weakened?: { world: number; damage: number };
}

const enemy = (damage: number, bullet = 0): EnemyHit => ({ damage, bullet, demon: false });
const demon = (damage: number, bullet = 0): EnemyHit => ({ damage, bullet, demon: true });
const demonOf = (world: number, damage: number, weakenedDamage: number): EnemyHit => ({
  damage,
  bullet: 0,
  demon: true,
  weakened: { world, damage: weakenedDamage },
});

/** Enemies not listed do 2 damage. */
const DEFAULT_HIT = enemy(2);

const ENEMY_HITS = new Map<number, EnemyHit>([
  [T_BAT, enemy(2)],
  [T_WORM, enemy(2)],
  [T_SKELETON, enemy(6)],
  [T_SMOKE, enemy(2)], // if (item[21]) obj=oldobj;
  [T_BOUNCINGBALL, enemy(2)],
  [T_WATERMONSTER_ARM, enemy(4)],
  [T_BUBBLE, enemy(2, 2)],
  [T_JUMPINGBUSH, enemy(2)],
  [T_BLUESPIDER, enemy(2)],
  [T_WHITEFIREBALL, enemy(2)], // if (item[2]) obj=oldobj;
  [T_FSTONE, enemy(6)],
  [T_RSTONE, enemy(6)],
  [T_BLOB, enemy(2)],
  [T_BAMBU, enemy(4)], // if (item[10]) obj=oldobj;
  [T_PORCUPINE, enemy(4)],
  [T_PORCUPINE_BULLET, enemy(4, 1)],
  [T_KNIGHT, enemy(6)],
  [T_BLACK, enemy(4)],
  [T_WITCH, enemy(2)], // if (item[1]) obj=oldobj;
  [T_WHITEBEAR_BULLET, enemy(-1, 1)],
  [T_FEET, enemy(4)],
  [T_REDJUMPER, enemy(4)],
  [T_VENT2, enemy(2)],
  [T_MEGABAT, enemy(6)],
  [T_MEGABAT2, enemy(2)],
  [T_MEGABAT3, enemy(2)],
  [T_DEMON1, demonOf(0, 8, 4)],
  [T_DEMON1_BONES, demon(2, 3)],
  [T_DEMON1_BONES2, demon(2, 3)],
  [T_DEMON2, demonOf(1, 24, 12)],
  [T_DEMON2_HEAD, demonOf(1, 24, 12)],
  [T_DEMON2_BALLS, demon(2, 3)],
  [T_DEMON3, demonOf(2, 48, 24)],
  [T_DEMON3_FIRE, demonOf(2, 24, 12)],
  [T_LAVA1, enemy(2)], // if (item[23]) obj=oldobj;
  [T_LAVA2, enemy(2)],
  [T_LAVA3, enemy(2)],
  [T_PIRANHA, enemy(2)],
  [T_KNIGHTHEAD, enemy(2)],
  [T_CHICKEN, enemy(6)],
  [T_CHICKEN_EGG, enemy(4, 1)],
  [T_EGG_EXPLOSION, enemy(4)],
  [T_ROCKMAN, enemy(8)],
  [T_CLOUD, enemy(2)],
  [T_BFLY_SMALL, enemy(1)],
  [T_BFLY_MEDIUM, enemy(2)],
  [T_BFLY_LARGE, enemy(4)],
  [T_BFLY_GIANT, enemy(8)],
  [T_BFLY_BULLET, enemy(2, 1)],
  [T_DEMON4, demonOf(3, 24, 12)],
  [T_GHOST, enemy(4)],
  [T_GHOST_BULLET, enemy(2, 1)],
  [T_WORM2, enemy(4)],
  [T_OCTOPUS, enemy(6)],
  [T_HAIRY, enemy(8)],
  [T_HAIRYBULLET, enemy(2, 2)],
  [T_DEMON5, demonOf(4, 32, 16)],
  [T_DEMON5_FIRE, demon(8)],
  [T_BIRD, enemy(4)],
  [T_PACMAN, enemy(8)],
  [T_STONEMAN, enemy(8)],
  [T_STONEMAN_BULLET, enemy(4, 1)],
  [T_REDDRAGON, enemy(16)],
  [T_REDDRAGON_BULLET, enemy(4, 2)],
  [T_DEMON6, demonOf(5, 64, 32)],
  [T_DEMON6_BULLET, demon(8, 3)],
  [T_OWL, enemy(16)],
  [T_GREENMONKEY, enemy(8)],
  [T_PLANT, enemy(16)],
  [T_PLANT_BULLET, enemy(4, 2)],
  [T_DEMON7, demonOf(6, 48, 24)],
  [T_DEMON7_BULLET, demon(8, 3)],
  [T_FLAME, enemy(12)],
  [T_FLAME_BULLET, enemy(4, 1)],
  [T_TRANSFORMER, enemy(12)],
  [T_TRANSF_BULLET, enemy(4, 1)],
  [T_WITCH2, enemy(20)],
  [T_CYCLOPS, enemy(12)],
  [T_CYCLOPS_BULLET, enemy(4, 2)],
  [T_DEMON8, demonOf(7, 64, 32)],
  [T_DEMON8_BULLET, demon(10, 3)],
  [T_SNAKE, enemy(12)],
  [T_SNAKE_BULLET, enemy(4, 1)],
  [T_GORILLA, enemy(8)],
  [T_GLIZARD, enemy(16)],
  [T_GLIZARD_TONGUE, enemy(16)],
  [T_BDEMON, enemy(20)],
  [T_BDEMON_BULLET, enemy(8, 2)],
  [T_LCLOUD, enemy(6)],
  [T_LIGHTNING, enemy(40)],
  [T_LIGHTNING_FIRE, enemy(40)],
  [T_DEMON9, demonOf(8, 64, 32)],
  [T_DEMON9_FIRE, demonOf(8, 12, 6)],
  [T_DEMON10, demonOf(9, 88, 44)],
  [T_DEMON10_BALL, demonOf(9, 24, 12)],
  [T_PAMPERSE_BALL, enemy(20)],
]);

function damageOf(hit: EnemyHit): number {
  if (hit.weakened && G.worldItems[hit.weakened.world][1]) return hit.weakened.damage;
  return hit.damage;
}

/** Has the character collided with an enemy (or stepped on a mine)? Then take the hit, or die. */
export function checkEnemyContact(): void {
  if (G.hitTime > 0) G.hitTime--;
  const base = characterTile();
  const touchesEnemy = (dx: number, dy: number): boolean =>
    touches(base + G.playerFrame, G.playerX + dx, G.playerY + dy, T_ENEMY);
  if (
    G.playerState !== S_HIT &&
    G.playerState !== S_HIT_COLISION &&
    G.playerState !== S_HIT_RECOVERY &&
    G.playerState !== S_DEATH &&
    G.hitTime === 0 &&
    ((touchesEnemy(0, 0) &&
      touchesEnemy(TILE_UNIT, 0) &&
      touchesEnemy(-TILE_UNIT, 0) &&
      touchesEnemy(0, TILE_UNIT) &&
      touchesEnemy(0, -TILE_UNIT)) ||
      G.mineStepped)
  ) {
    takeHit();
  }

  if (G.energy[G.character] <= 0 && G.playerState !== S_DEATH) {
    G.playerState = S_DEATH;
    G.playerSubState = 0;
  }
}

function takeHit(): void {
  const xoffs = G.facingRight ? 0 : -2 * TILE_UNIT;

  // Collision with an enemy! On which side?
  const leftTouches = (dx: number): boolean => touches(tileIds.collision, G.playerX + xoffs + dx, G.playerY, T_ENEMY);
  const rightTouches = (dx: number): boolean =>
    touches(tileIds.collision + 1, G.playerX + xoffs + dx, G.playerY, T_ENEMY);
  let leftCol = leftTouches(0);
  let rightCol = rightTouches(0);
  if (!leftCol && !rightCol) {
    leftCol = leftTouches(-2 * TILE_UNIT);
    rightCol = rightTouches(2 * TILE_UNIT);
  }

  // The nearest enemy object is the one that hit.
  let damage = 2;
  let dist = -1;
  let obj = -1;
  let bullet = 0;
  // NOTE (original): never reset, so it stays set when a demon was nearer at some point of the loop.
  let worldDemon = false;
  for (let i = 0; i < G.objectCount; i++) {
    if (G.objects[i].type !== T_ENEMY) continue;
    const d = Math.abs(G.objects[i].x - G.playerX) + Math.abs(G.objects[i].y - G.playerY);
    if (dist === -1 || d < dist) {
      // (oldobj=obj; only used by commented-out code)
      const hit = ENEMY_HITS.get(G.objects[i].enemy) ?? DEFAULT_HIT;
      obj = i;
      damage = damageOf(hit);
      bullet = hit.bullet;
      if (hit.demon) worldDemon = true;
      dist = d;
    }
  }

  if (!worldDemon && G.items[12]) damage = idiv(damage, 2);

  // Can the shield stop it? Only bullets coming from the front.
  if (bullet !== 0 && !G.sword) {
    if (G.items[30] && bullet > 1) bullet = 0;
    if (G.items[31] && bullet > 2) bullet = 0;
    if (!G.items[27] && !G.items[30] && !G.items[31]) bullet = 0;
    if (bullet !== 0) {
      if (G.facingRight) {
        if (!rightCol || leftCol) bullet = 0;
      } else {
        if (rightCol || !leftCol) bullet = 0;
      }
    }
  } else {
    bullet = 0;
  }

  if (obj === -1 && !G.mineStepped) return;
  if (bullet !== 0) {
    // Bullet stopped by the shield:
    playSound(sfx.shield);
    G.objects[obj].type = T_NADA;
    return;
  }

  // Hit:
  if (damage === -1) {
    G.frozen = 48;
    G.objects[obj].type = T_NADA;
    return;
  }
  if (G.mineStepped) {
    damage = 4;
    G.mineStepped = false;
  }
  if (G.energy[G.character] < 8) playSound(sfx.ah2);
  else playSound(sfx.ah);
  G.energy[G.character] -= damage;

  G.sword = false;
  // onLadder=-1;
  if (
    G.playerState === S_UP_LADDER ||
    G.playerState === S_DOWN_LADDER ||
    G.playerState === S_QUIET_LADDER ||
    G.playerState === S_SWORD_LADDER
  ) {
    G.playerState = S_HIT_COLISION;
    G.playerSubState = 0;
  } else if (
    G.playerState !== S_DOORPASS &&
    G.playerState !== S_ENTERING_PASSAGE &&
    G.playerState !== S_ENTERING_WORLD &&
    G.playerState !== S_SLOWDOORPASS
  ) {
    if (leftCol && !rightCol) G.facingRight = false;
    if (!leftCol && rightCol) G.facingRight = true;
    G.playerState = S_HIT;
    G.playerSubState = 0;
  } else {
    G.hitTime = HIT_TIME;
  }
  G.frozen = 0;
}

/** Is the character in the water? Water slowly hurts Popolon (Aphrodite only after a long time). */
export function checkWater(): void {
  if (touches(characterTile() + G.playerFrame, G.playerX, G.playerY, T_WATER)) {
    if (!G.inWater) {
      playSound(sfx.enterwater);
    }
    G.inWater = true;
    G.waterCounter++;
    if (G.playerState !== S_HIT) {
      if (G.character === 0) {
        if (G.waterCounter >= 8) {
          playSound(sfx.waterhit);
          G.energy[0] -= 2;
          G.waterCounter = 0;
        }
      }
      if (G.character === 1) {
        if (G.waterCounter >= 192) {
          playSound(sfx.waterhit);
          G.energy[1] -= 2;
          G.waterCounter = 0;
        }
      }
    }
  } else {
    G.inWater = false;
    // waterCounter=0;
  }
}

/** Is the character in the lava? */
export function checkLava(): void {
  G.inLava = false;
  if (touches(characterTile() + G.playerFrame, G.playerX, G.playerY, T_LAVA) && G.playerState !== S_DEATH) {
    if (G.world !== 0 || G.roomX !== 8 || G.roomY !== 11) G.inLava = true;
    G.lavaCounter++;
    G.inWater = true; // to slow down the movement!
    // (disabled in the original: forcing playerState=S_QUIET from walking/jumping/sword states)
    G.playerFrame = 0;
    if (G.lavaCounter >= 4) {
      playSound(sfx.lavahit);
      G.energy[G.character] -= 2;
      G.lavaCounter = 0;
    }
  }
}
