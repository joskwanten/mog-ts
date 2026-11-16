/**
 * Global game state.
 *
 * The C++ remake keeps its whole state in file-scope globals (mostly defined
 * in gamecycle.cpp and shared through `extern`). They live here in one object
 * `G`, under their original names, so every ported function can be checked
 * line-by-line against the C++ source. Constants are in constants.ts.
 */
import type { Tile } from '../engine/tile';
import type { SDLKey } from '../platform/keyboard';
import {
  SDLK_DOWN,
  SDLK_F1,
  SDLK_F2,
  SDLK_LAST,
  SDLK_LEFT,
  SDLK_RIGHT,
  SDLK_SPACE,
  SDLK_UP,
  SDLK_m,
} from '../platform/keyboard';
import { HP_OBJS_MAX, MAX_AW_RECORD, MAX_LEVERS, MAX_OBJECTS, TILE_SIZE_X as TX, TILE_SIZE_Y as TY } from './constants';
import { GameObject } from './object';

const fill = <T>(n: number, v: T): T[] => Array.from({ length: n }, () => v);
const grid = <T>(rows: number, cols: number, v: T): T[][] => Array.from({ length: rows }, () => fill(cols, v));

export const DEFAULT_PASSWORD = 'UR3FUR3FUR4F423RUR3FUR3FUR3FUR3FUR3FUR3FURS48';

export const G = {
  // --- Paths (main.cpp) -----------------------------------------------------
  defaultGraphicsPath: 'graphics/original/',
  defaultSoundPath: 'sound/original/',
  graphicsPaths: [] as string[],
  graphicsPathCount: 0,
  graphicsPathIndex: 0,
  graphicsPath: 'graphics/original/',
  soundPaths: [] as string[],
  soundPathCount: 0,
  soundPathIndex: 0,
  soundPath: 'sound/original/',

  // --- Graphics -------------------------------------------------------------
  tileCount: 0,
  tiles: [] as Tile[],
  /** Collision buffer: one byte of T_* collision bits per screen pixel. */
  collision: null as Uint8Array | null,
  /** Palette (768 bytes, 6-bit VGA values) taken from konami.pcx. */
  palette: new Uint8Array(768),

  // --- Demons (demons.cpp) ----------------------------------------------------
  smokeCount: 0,
  smokeX: fill(8, 0),
  smokeY: fill(8, 0),
  smokeT: fill(8, 0),
  demonBackState: 0,
  demonMaxLife: 0,
  demonMusic: 0,

  // --- State machine --------------------------------------------------------
  state: 0,
  subState: 0,
  oldState: 0,
  menuOption: 0,
  cycle: 0,

  // --- Developer start position ---------------------------------------------
  devStartX: -1,
  devStartY: -1,
  devStartWorld: -1,

  // --- Game -----------------------------------------------------------------
  interScreen: 0,
  frameCounter: 0,
  pauseFlag: false,
  pauseState: 0,
  /** World the character is in (0 = castle). */
  world: 0,
  /** Room inside the world. */
  roomX: 0,
  roomY: 0,
  /** Character position inside the room (pixels, 16 per tile). */
  playerX: 0,
  playerY: 0,
  playerFrame: 0,
  /** Facing direction. */
  facingRight: true,
  playerState: 0,
  playerSubState: 0,
  walkState: 0,
  jumpInertia: 0,
  sword: false,
  oldSword: false,
  swordX: 0,
  swordY: 0,
  swordTime: 0,
  /** Ladder object the character is on, or -1. */
  onLadder: -1,
  previousXCollision: false,
  previousYCollision: false,
  /** Counter until the character can be damaged again. */
  hitTime: 0,
  /** Selected character: 0 = Popolon, 1 = Aphrodite. */
  character: 0,
  characterAlive: [true, true],
  canRevive: [true, true],
  currentWeapon: -1,
  firedArrows: 0,
  firedMines: 0,
  /** Object index of the door just entered. */
  inDoor: -1,
  frozen: 0,
  inWater: false,
  inLava: false,
  waterCounter: 0,
  lavaCounter: 0,
  mineStepped: false,
  /** 0-29 items, 30-31 bronze/silver shield, 32-37 weapons. */
  items: fill(38, false),
  worldItems: grid(10, 4, false),
  hasCross: false,
  hasWorldKey: false,
  nextWorld: 0,
  worldDoorsOpen: fill(10, false),
  worldKeyItem: 0,
  /** Controls the cut-off of the character sprite while entering doors. */
  enterCut: 0,
  /** Whether character or weapon is being selected. */
  selecting: 0,
  shopItems: fill(3, false),
  passageState: 0,
  oldKeyboard: new Uint8Array(SDLK_LAST),
  /** Speeds up the sword while Aphrodite breaks rocks. */
  stoneHitCounter: 0,
  bibleCounter: 0,
  bibleSubcounter: 0,
  zeusPassword: false,
  zeusUsed: false,

  // --- Room flags -----------------------------------------------------------
  roomSlimes: false,
  roomWaterdragons: -1,
  roomReddragon: 0,
  slimeCounter: 0,
  roomWatermonster: false,
  roomFallingstones: false,
  roomRollingstones: false,
  stonesCounter: 0,
  roomBlobs: false,
  roomDemonroom: false,
  oldRoomDemonroom: false,
  world5Room44State: 0,
  world5Room44State2: 0,
  world5Room44State3: 0,
  world5Room64State: 0,
  world6Room35State: 0,
  world7Room12State: 0,
  world8Room12State: 0,
  room26State: 0,
  room56State: 0,
  roomBfly: 0,
  roomFairy: -1,
  roomAppearwall: -1,
  roomAppearwallX: 0,
  roomAppearwallY: 0,
  appearwallRecordX: fill(MAX_AW_RECORD, -1),
  appearwallRecordY: fill(MAX_AW_RECORD, -1),
  fairyX: 0,
  fairyY: 0,
  fightingDemon: 0,
  watermonsterState: 0,
  world3Room06Counter: 0,
  world4State: 0,
  world10DoorX: -1,
  world10DoorY: -1,
  roomLava: false,
  lavaState: 0,
  roomPiranhas: false,
  piranhasCounter: 0,
  roomBirds: -1,

  // --- Inventory / player stats -----------------------------------------------
  arrows: 0,
  coins: 0,
  keys: 0,
  energy: [0, 0],
  experience: [0, 0],
  maxEnergy: [0, 0],
  shownEnergy: [0, 0],
  shownExperience: [0, 0],

  // --- Current room ---------------------------------------------------------
  roomWidth: 0,
  roomHeight: 0,
  roomTiles: null as number[] | null,
  jumpingFromElevator: false,
  characterOverVerticalLever: false,

  // --- Objects (ladders, stones, enemies, ...) --------------------------------
  objects: Array.from({ length: MAX_OBJECTS }, () => new GameObject()),
  objectCount: 0,

  // --- Object indices of the demon(s) in a demon room -------------------------
  demonObject: 0,
  demonObject2: 0,

  // --- Transporters (levers) ------------------------------------------------
  leverRoomX: fill(MAX_LEVERS, 0),
  leverRoomY: fill(MAX_LEVERS, 0),
  leverX: fill(MAX_LEVERS, 0),
  leverY: fill(MAX_LEVERS, 0),
  leverDrx: [
    [13, 13],
    [13, 13],
    [1, 1],
    [1, 1],
    [3, 3],
    [0, 0],
    [3, 3],
    [3, 3],
    [2, 2],
    [5, 5],
    [11, 11],
    [11, 11],
    [12, 12],
    [11, 11],
    [8, 8],
    [6, 6],
    [6, 6],
    [6, 6],
    [8, 8],
    [8, 8],
    [12, 12],
  ],
  leverDry: [
    [13, 13],
    [9, 15],
    [9, 15],
    [14, 14],
    [15, 15],
    [12, 12],
    [4, 4],
    [3, 7],
    [2, 2],
    [6, 6],
    [4, 4],
    [5, 5],
    [5, 5],
    [3, 7],
    [6, 6],
    [4, 4],
    [3, 5],
    [2, 2],
    [2, 2],
    [2, 6],
    [2, 2],
  ],
  leverDx: [
    [5 * TX, 23 * TX],
    [14 * TX, 14 * TX],
    [14 * TX, 14 * TX],
    [5 * TX, 23 * TX],
    [4 * TX, 19 * TX],
    [8 * TX, 18 * TX],
    [4 * TX, 24 * TX],
    [14 * TX, 14 * TX],
    [8 * TX, 20 * TX],
    [6 * TX, 22 * TX],
    [4 * TX, 24 * TX],
    [6 * TX, 22 * TX],
    [6 * TX, 20 * TX],
    [14 * TX, 14 * TX],
    [4 * TX, 24 * TX],
    [7 * TX, 24 * TX],
    [14 * TX, 14 * TX],
    [4 * TX, 24 * TX],
    [6 * TX, 24 * TX],
    [14 * TX, 14 * TX],
    [10 * TX, 18 * TX],
  ],
  leverDy: [
    [11 * TY, 11 * TY],
    [11 * TY, 15 * TY],
    [11 * TY, 13 * TY],
    [11 * TY, 11 * TY],
    [7 * TY, 7 * TY],
    [7 * TY, 7 * TY],
    [7 * TY, 7 * TY],
    [11 * TY, 15 * TY],
    [7 * TY, 7 * TY],
    [11 * TY, 11 * TY],
    [11 * TY, 11 * TY],
    [7 * TY, 7 * TY],
    [11 * TY, 11 * TY],
    [3 * TY, 11 * TY],
    [7 * TY, 7 * TY],
    [7 * TY, 7 * TY],
    [7 * TY, 16 * TY],
    [7 * TY, 7 * TY],
    [3 * TY, 3 * TY],
    [7 * TY, 15 * TY],
    [7 * TY, 7 * TY],
  ],
  leverGoingTo: fill(MAX_LEVERS, 0),

  wormStateTile: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  wormStateTileI: [5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  wormStateY: [0, 0, 0, 0, -2, -2, -2, -2, -6, -6, -6, -6, -2, -2, -2, -2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],

  // --- Memory of objects in rooms already visited -----------------------------
  memRoomX: fill(HP_OBJS_MAX, 0),
  memRoomY: fill(HP_OBJS_MAX, 0),
  memObject: fill(HP_OBJS_MAX, 0),
  memObjectType: fill(HP_OBJS_MAX, 0),
  memObjectAux: fill(HP_OBJS_MAX, 0),

  musicVolume: 127,

  zoom: 640,

  // --- Screen views (render.cpp): view 0 = status bar, view 1 = game area ------
  logicDx: [640, 0, 0, 0],
  logicDy: [400, 0, 0, 0],
  logicX: [0, 0, 0, 0],
  logicY: [0, 0, 0, 0],
  physicDx: [640, 0, 0, 0],
  physicDy: [400, 0, 0, 0],
  physicX: [0, 0, 0, 0],
  physicY: [0, 0, 0, 0],

  // --- Keys (SDL 1.2 key symbols) ---------------------------------------------
  keyUp: SDLK_UP as SDLKey,
  keyDown: SDLK_DOWN as SDLKey,
  keyLeft: SDLK_LEFT as SDLKey,
  keyRight: SDLK_RIGHT as SDLKey,
  keySword: SDLK_SPACE as SDLKey,
  keyWeapon: SDLK_m as SDLKey,
  keyItem: SDLK_F1 as SDLKey,
  keyPause: SDLK_F2 as SDLKey,
  /** Last 16 letters typed (for the demon names / cheat words). */
  typedKeys: fill(16, 0) as SDLKey[],

  /** Current password (45 characters + padding, like the C++ `char[48]`). */
  password: DEFAULT_PASSWORD,
  passwordPos: 0,
};

export type GameState = typeof G;
