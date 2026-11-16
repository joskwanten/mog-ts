/**
 * Room files (`assets/rooms/*.txt`): the background tiles, the objects and the
 * room specials. Part of gameaux.cpp (`loadroom`).
 *
 * File format (whitespace-separated, read with fscanf in the original):
 *
 *     width height  tile*        background
 *     n  (KEYWORD numbers*)*n    objects (ENEMY is followed by the enemy name)
 *     SPECIAL numbers* ...       room specials until the end of the file
 */
import { readText } from '../platform/assets';
import {
  HP_OBJS_MAX,
  TILE_SIZE_X,
  T_ARMOUR,
  T_BAMBU,
  T_BAT,
  T_BDEMON,
  T_BLACK,
  T_BLUESPIDER,
  T_BOUNCINGBALL,
  T_CHICKEN,
  T_CLOUD,
  T_CYCLOPS,
  T_DOOR,
  T_ENEMY,
  T_FAIRY_BUBBLE,
  T_FEET,
  T_FLAME,
  T_GHOST,
  T_GLIZARD,
  T_GORILLA,
  T_GREENMONKEY,
  T_HAIRY,
  T_HEAD,
  T_HITWALL,
  T_ITEM,
  T_JUMPINGBUSH,
  T_KEYDOOR,
  T_KNIGHT,
  T_KNIGHTHEAD,
  T_LADDER,
  T_LCLOUD,
  T_LIVINGWALL,
  T_MEGABAT,
  T_NADA,
  T_OCTOPUS,
  T_OWL,
  T_PACMAN,
  T_PLANT,
  T_PORCUPINE,
  T_REDJUMPER,
  T_ROCKMAN,
  T_SKELETON,
  T_SMOKE,
  T_SNAKE,
  T_SPIDER,
  T_STONE,
  T_STONEMAN,
  T_TOMB,
  T_TRANSFORMER,
  T_VENT2,
  T_WATERBUG,
  T_WDOOR,
  T_WHITEBEAR,
  T_WHITEFIREBALL,
  T_WHITESTAR,
  T_WITCH,
  T_WITCH2,
  T_WKEYDOOR,
  T_WNOKEYDOOR,
  T_WNOKEYDOOR2,
  T_WNOKEYDOOR3,
  T_WORM,
  T_WORM2,
} from './constants';
import { Scanner, idiv, rand } from './cutil';
import { addObject } from './gameaux';
import type { GameObject } from './object';
import { tileIds } from './resources';
import { G } from './state';

const PREFIXES = ['map', 'w01', 'w02', 'w03', 'w04', 'w05', 'w06', 'w07', 'w08', 'w09', 'w10'];

/** C `%.2i`. */
function pad2(n: number): string {
  return n < 0 ? '-' + String(-n).padStart(2, '0') : String(n).padStart(2, '0');
}

/** The castle room (mapX, mapY) holding the door to world w+1, for every world. */
const WORLD_DOOR_ROOMS: readonly (readonly [number, number])[] = [
  [3, 12],
  [10, 11],
  [10, 8],
  [0, 8],
  [8, 8],
  [14, 12],
  [5, 2],
  [4, 4],
  [7, 0],
];

/** Objects that are just a type, a position and a size. */
const SIZED_OBJECTS: Readonly<Record<string, number>> = {
  DOOR: T_DOOR,
  KEYDOOR: T_KEYDOOR,
  WKEYDOOR: T_WKEYDOOR,
  HITWALL: T_HITWALL,
};

/** Objects that are just a type and a position. */
const PLACED_OBJECTS: Readonly<Record<string, number>> = {
  WNOKEYDOOR: T_WNOKEYDOOR,
  WNOKEYDOOR2: T_WNOKEYDOOR2,
  WNOKEYDOOR3: T_WNOKEYDOOR3,
};

/** The tileIds entries that are a single tile number. */
type TileKey = { [K in keyof typeof tileIds]: (typeof tileIds)[K] extends number ? K : never }[keyof typeof tileIds];

/** An object field the room file can set. */
type ReadField = 'state' | 'state2' | 'state3';

/**
 * How an ENEMY line becomes an object. All fields not named here keep the
 * values of resetObject (0, unionX/Y -1). `experience` is only written when
 * given: like the original, an enemy without it keeps the slot's old value.
 */
interface EnemySpec {
  enemy: number;
  size: number;
  /** First tile (looked up in tileIds when the room is loaded). */
  tile: TileKey;
  experience?: number;
  /** The numbers that follow x and y in the file, in order. */
  reads?: readonly ReadField[];
  /** Extra initialisation, run after all numbers are read. */
  setup?: (o: GameObject) => void;
}

/** state 1 (right) when the player faces right, else 0 (left). */
function faceLikePlayer(o: GameObject): void {
  o.state = G.facingRight ? 1 : 0;
}

/** Like faceLikePlayer, but one in four turn the other way. */
function faceLikePlayerMostly(o: GameObject): void {
  faceLikePlayer(o);
  if (rand() % 4 === 0) o.state = 1 - o.state;
}

/** Every ENEMY except SMOKE (which numbers the smokes in the room; see readEnemy). */
const ENEMIES = new Map<string, EnemySpec>([
  ['WORM', { enemy: T_WORM, size: 1, tile: 'worm', reads: ['state'] }],
  ['BAT', { enemy: T_BAT, size: 1, tile: 'bat' }],
  ['SKELETON', { enemy: T_SKELETON, size: 8, tile: 'skeleton', setup: faceLikePlayerMostly }],
  ['BOUNCINGBALL', { enemy: T_BOUNCINGBALL, size: 4, tile: 'bouncingball', experience: 2, reads: ['state3'] }],
  ['JUMPINGBUSH', { enemy: T_JUMPINGBUSH, size: 5, tile: 'jumpingbush', experience: 2 }],
  ['BLUESPIDER', { enemy: T_BLUESPIDER, size: 1, tile: 'bluespider', experience: 2 }],
  [
    'WHITEFIREBALL',
    {
      enemy: T_WHITEFIREBALL,
      size: 1,
      tile: 'whitefireball',
      experience: 2,
      setup: (o) => {
        o.state = rand() % 8;
      },
    },
  ],
  ['KNIGHT', { enemy: T_KNIGHT, size: 6, tile: 'knight', setup: faceLikePlayerMostly }],
  [
    'BAMBU',
    {
      enemy: T_BAMBU,
      size: 2,
      tile: 'bambu',
      experience: 2,
      setup: (o) => {
        o.state2 = -1;
      },
    },
  ],
  ['PORCUPINE', { enemy: T_PORCUPINE, size: 2, tile: 'porcupine', experience: 4 }],
  ['BLACK', { enemy: T_BLACK, size: 0, tile: 'black' }],
  ['WITCH', { enemy: T_WITCH, size: 3, tile: 'witch' }],
  ['WHITEBEAR', { enemy: T_WHITEBEAR, size: 2, tile: 'whitebear', experience: 4, setup: faceLikePlayer }],
  [
    'FEET',
    {
      enemy: T_FEET,
      size: 4,
      tile: 'feet',
      experience: 4,
      setup: (o) => {
        o.state = 3;
        // Every other column of feet starts half a cycle later:
        if ((idiv(o.x, TILE_SIZE_X * 2) & 0x01) === 0) o.state3 = 32;
      },
    },
  ],
  ['REDJUMPER', { enemy: T_REDJUMPER, size: 3, tile: 'redjumper', experience: 4, setup: faceLikePlayer }],
  [
    'REDVENT',
    {
      enemy: T_VENT2,
      size: 1,
      tile: 'blob',
      experience: 2,
      setup: (o) => {
        faceLikePlayer(o);
        if (rand() % 2 === 0) o.state = 2;
      },
    },
  ],
  [
    'LIVINGWALL',
    {
      enemy: T_LIVINGWALL,
      size: 32,
      tile: 'livingwall',
      reads: ['state2'],
      setup: (o) => {
        o.tile = -1;
      },
    },
  ],
  ['MEGABAT', { enemy: T_MEGABAT, size: 1, tile: 'megabat' }],
  [
    'WHITESTAR',
    {
      enemy: T_WHITESTAR,
      size: 1,
      tile: 'whitestar',
      experience: 2,
      setup: (o) => {
        o.state3 = 1;
      },
    },
  ],
  ['SPIDER', { enemy: T_SPIDER, size: 1, tile: 'spider', experience: 2 }],
  ['KNIGHTHEAD', { enemy: T_KNIGHTHEAD, size: 16, tile: 'knighthead', experience: 8 }],
  ['CHICKEN', { enemy: T_CHICKEN, size: 5, tile: 'chicken', experience: 6 }],
  [
    'ROCKMAN',
    {
      enemy: T_ROCKMAN,
      size: 4,
      tile: 'rockman',
      experience: 8,
      setup: (o) => {
        o.state2 = -8 * (rand() % 16);
        o.tile = -1;
      },
    },
  ],
  [
    'CLOUD',
    {
      enemy: T_CLOUD,
      size: 0,
      tile: 'cloud',
      setup: (o) => {
        o.state3 = rand() % 12;
      },
    },
  ],
  ['GHOST', { enemy: T_GHOST, size: 7, tile: 'ghost', experience: 6 }],
  [
    'HEAD',
    {
      enemy: T_HEAD,
      size: 3,
      tile: 'head',
      reads: ['state'],
      setup: (o) => {
        o.tile = 2 + o.state;
      },
    },
  ],
  ['WORM2', { enemy: T_WORM2, size: 2, tile: 'worm2', experience: 4 }],
  [
    'OCTOPUS',
    {
      enemy: T_OCTOPUS,
      size: 0,
      tile: 'octopus',
      experience: 4,
      reads: ['state', 'state2'],
      setup: (o) => {
        // The second number picks the colour (graphics), it is not a state:
        o.baseTile = tileIds.octopus + o.state2;
        o.state2 = 0;
      },
    },
  ],
  [
    'HAIRY',
    {
      enemy: T_HAIRY,
      size: 24,
      tile: 'hairy',
      experience: 10,
      setup: (o) => {
        o.state = 1 + (rand() % 11);
      },
    },
  ],
  ['WATERBUG', { enemy: T_WATERBUG, size: 1, tile: 'waterbug', experience: 6 }],
  ['STONEMAN', { enemy: T_STONEMAN, size: 5, tile: 'stoneman', experience: 6 }],
  ['PACMAN', { enemy: T_PACMAN, size: 6, tile: 'pacman', experience: 8 }],
  ['OWL', { enemy: T_OWL, size: 9, tile: 'owl', experience: 10 }],
  ['GREENMONKEY', { enemy: T_GREENMONKEY, size: 4, tile: 'greenmonkey', experience: 8 }],
  ['PLANT', { enemy: T_PLANT, size: 24, tile: 'plant', experience: 12 }],
  ['TRANSFORMER', { enemy: T_TRANSFORMER, size: 4, tile: 'transformer', experience: 6 }],
  ['FLAME', { enemy: T_FLAME, size: 4, tile: 'flame', experience: 8 }],
  ['WITCH2', { enemy: T_WITCH2, size: 4, tile: 'witch2', experience: 8, reads: ['state3'] }],
  ['CYCLOPS', { enemy: T_CYCLOPS, size: 35, tile: 'cyclops', experience: 16 }],
  [
    'LCLOUD',
    {
      enemy: T_LCLOUD,
      size: 0,
      tile: 'lcloud',
      setup: (o) => {
        o.state = rand() % 2;
      },
    },
  ],
  ['SNAKE', { enemy: T_SNAKE, size: 4, tile: 'snake', experience: 8 }],
  ['GLIZARD', { enemy: T_GLIZARD, size: 10, tile: 'glizard', experience: 16 }],
  ['GORILLA', { enemy: T_GORILLA, size: 4, tile: 'gorilla', experience: 12 }],
  [
    'BDEMON',
    {
      enemy: T_BDEMON,
      size: 60,
      tile: 'bdemon',
      experience: 16,
      setup: (o) => {
        o.xoffs = 5 * TILE_SIZE_X;
      },
    },
  ],
]);

/** Clear an object slot before reading it. baseTile and experience are not cleared (as in the original). */
function resetObject(o: GameObject): void {
  o.type = T_NADA;
  o.x = 0;
  o.y = 0;
  o.xoffs = 0;
  o.yoffs = 0;
  o.size = 0;
  o.enemy = 0;
  o.state = 0;
  o.state2 = 0;
  o.state3 = 0;
  o.lastHit = 0;
  o.tile = 0;
  o.unionX = -1;
  o.unionY = -1;
}

function readPosition(o: GameObject, fp: Scanner): void {
  o.x = fp.int0();
  o.y = fp.int0();
}

/** Room loading state shared by the object readers. */
interface RoomContext {
  fp: Scanner;
  map: number;
  mapX: number;
  mapY: number;
  /** Number of SMOKE enemies read so far (their animations are staggered). */
  smokes: number;
}

/** The ENEMY line after its keyword: the enemy name, x, y and the enemy's own numbers. */
function readEnemy(o: GameObject, ctx: RoomContext): void {
  const fp = ctx.fp;
  const name = fp.str();

  if (name === 'SMOKE') {
    o.type = T_ENEMY;
    o.enemy = T_SMOKE;
    o.state = -(ctx.smokes * 33);
    o.baseTile = tileIds.smoke;
    ctx.smokes++;
    readPosition(o, fp);
    o.size = fp.int0();
    return;
  }

  const spec = name === null ? undefined : ENEMIES.get(name);
  if (spec === undefined) return; // unknown enemy: the object stays T_NADA

  o.type = T_ENEMY;
  o.enemy = spec.enemy;
  o.size = spec.size;
  o.baseTile = tileIds[spec.tile];
  if (spec.experience !== undefined) o.experience = spec.experience;
  readPosition(o, fp);
  for (const field of spec.reads ?? []) o[field] = fp.int0();
  spec.setup?.(o);
}

/** One object line: the keyword and its numbers. Unknown keywords leave a T_NADA object. */
function readObject(o: GameObject, ctx: RoomContext): void {
  const { fp, map, mapX, mapY } = ctx;
  const keyword = fp.str();

  switch (keyword) {
    case 'LADDER':
      o.type = T_LADDER;
      readPosition(o, fp);
      o.size = fp.int0();
      o.state = fp.int0();
      break;
    case 'STONE':
      o.type = T_STONE;
      o.size = 15;
      readPosition(o, fp);
      o.state2 = fp.int0(); // what is under the stone
      break;
    case 'WDOOR':
      o.type = T_WDOOR;
      readPosition(o, fp);
      o.size = fp.int0();
      // Open (state 1) once the player has entered that world:
      o.state = WORLD_DOOR_ROOMS.some(([x, y], w) => mapX === x && mapY === y && G.worldDoorsOpen[w]) ? 1 : 0;
      break;
    case 'DOOR':
    case 'KEYDOOR':
    case 'WKEYDOOR':
    case 'HITWALL':
      o.type = SIZED_OBJECTS[keyword];
      readPosition(o, fp);
      o.size = fp.int0();
      break;
    case 'WNOKEYDOOR':
    case 'WNOKEYDOOR2':
    case 'WNOKEYDOOR3':
      o.type = PLACED_OBJECTS[keyword];
      readPosition(o, fp);
      break;
    case 'ARMOUR':
      o.type = T_ARMOUR;
      readPosition(o, fp);
      o.state = fp.int0();
      o.baseTile = o.state === 0 ? 107 : 108;
      break;
    case 'WITEM':
      // A world item (state 0..3), only if not taken yet:
      readPosition(o, fp);
      o.state = fp.int0();
      if (!G.worldItems[map - 1][o.state]) {
        o.type = T_ITEM;
        o.state += 38;
      }
      break;
    case 'ITEM':
      readPosition(o, fp);
      o.state = fp.int0();
      if (!G.items[o.state]) o.type = T_ITEM;
      break;
    case 'TOMB':
      o.type = T_TOMB;
      readPosition(o, fp);
      o.state += 38;
      break;
    case 'ENEMY':
      readEnemy(o, ctx);
      break;
  }
}

/** Clear the room specials before reading them. */
function resetRoomSpecials(): void {
  G.slimeCounter = 0;
  G.stonesCounter = 0;
  G.roomSlimes = false;
  G.roomWatermonster = false;
  G.watermonsterState = -128;
  G.roomDemonroom = false;
  G.roomFallingstones = false;
  G.roomRollingstones = false;
  G.roomBlobs = false;
  G.roomFairy = -1;
  G.roomAppearwall = -1;
  G.roomAppearwallX = 0;
  G.roomAppearwallY = 0;
  G.roomLava = false;
  G.roomPiranhas = false;
  G.roomBfly = 0;
  G.roomWaterdragons = -1;
  G.roomBirds = -1;
  G.roomReddragon = 0;
}

/** The fairy room: the fairy's position and 16 bubbles flying around. */
function readFairy(fp: Scanner): void {
  const object = G.objects;

  G.roomFairy = 0;
  G.fairyX = fp.int0();
  G.fairyY = fp.int0();
  // (the original reuses the function's loop variable i here; the object loop is done by then)
  for (let k = 0; k < 16; k++) {
    // NOTE (original): C leaves the evaluation order of the two rand() arguments unspecified; JS (and clang) go left to right.
    const obj = addObject(
      T_FAIRY_BUBBLE,
      (rand() % 24) * TILE_SIZE_X + 4 * TILE_SIZE_X,
      (rand() % 12) * TILE_SIZE_X + 4 * TILE_SIZE_X,
      0,
      0,
      0,
    );
    const bubble = object[obj];
    bubble.state3 = rand() % 16;
    bubble.state = (rand() % 2) + 1;
    if (rand() % 2 === 0) bubble.state = -bubble.state;
    bubble.state2 = (rand() % 2) + 1;
    if (rand() % 2 === 0) bubble.state2 = -bubble.state2;
  }
}

/**
 * PAMPERSE: unless this room's pamperse stone is remembered, hide it under a
 * random stone (state2 40).
 */
function hidePamperse(mapX: number, mapY: number): void {
  const object = G.objects;
  let found = false;

  for (let i = 0; !found && i < HP_OBJS_MAX; i++) {
    if (G.memObject[i] !== -1 && G.memRoomX[i] === mapX && G.memRoomY[i] === mapY) {
      if (G.memObjectType[i] === T_STONE && G.memObjectAux[i] === 40) found = true;
    }
  }

  // (loops forever in a room without stones, as in the original)
  while (!found) {
    const i = rand() % G.objectCount;
    if (object[i].type === T_STONE) {
      object[i].state2 = 40;
      found = true;
    }
  }
}

/** The room specials: keywords (some with numbers) until the end of the file. */
function readRoomSpecials(ctx: RoomContext): void {
  const { fp, map, mapX, mapY } = ctx;
  let keyword: string | null;

  resetRoomSpecials();
  while ((keyword = fp.str()) !== null) {
    switch (keyword) {
      case 'SLIME':
        G.roomSlimes = true;
        break;
      case 'WATERMONSTER':
        G.roomWatermonster = true;
        break;
      case 'DEMONROOM':
        if (map >= G.nextWorld) G.roomDemonroom = true;
        break;
      case 'FALLINGSTONES':
        G.roomFallingstones = true;
        break;
      case 'ROLLINGSTONES':
        G.roomRollingstones = true;
        break;
      case 'BLOBS':
        G.roomBlobs = true;
        break;
      case 'FAIRY':
        readFairy(fp);
        break;
      case 'APPEARWALL':
        G.roomAppearwall = 0;
        G.roomAppearwallX = fp.int0();
        G.roomAppearwallY = fp.int0();
        break;
      case 'LAVA':
        G.roomLava = true;
        break;
      case 'PIRANHAS':
        G.roomPiranhas = true;
        break;
      case 'BUTTERFLY':
        G.roomBfly = 1;
        break;
      case 'WATERDRAGONS':
        G.roomWaterdragons = 256;
        break;
      case 'BIRDS':
        G.roomBirds = 0;
        break;
      case 'BIRDS2':
        G.roomBirds = 1;
        break;
      case 'REDDRAGON':
        G.roomReddragon = 1;
        break;
      case 'PAMPERSE':
        hidePamperse(mapX, mapY);
        break;
    }
  }
}

/** Load room (mapX, mapY) of world `map` (0 = castle). Returns false if there is no such room file. */
export function loadRoom(map: number, mapX: number, mapY: number): boolean {
  G.roomTiles = null;

  const text = readText(`rooms/${PREFIXES[map]}${pad2(mapX)}${pad2(mapY)}.txt`);
  if (text === null) return false;
  const fp = new Scanner(text);
  const ctx: RoomContext = { fp, map, mapX, mapY, smokes: 0 };

  // Background:
  G.roomWidth = fp.int0();
  G.roomHeight = fp.int0();
  const roomTiles = new Array<number>(G.roomWidth * G.roomHeight);
  G.roomTiles = roomTiles;
  for (let i = 0; i < roomTiles.length; i++) roomTiles[i] = fp.int0();

  // Objects:
  G.objectCount = fp.int0();
  for (let i = 0; i < G.objectCount; i++) {
    const o = G.objects[i];
    resetObject(o);
    readObject(o, ctx);
  }

  readRoomSpecials(ctx);
  return true;
}
