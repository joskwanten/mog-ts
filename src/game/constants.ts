/**
 * Game constants (port of mog.h).
 * Tile/object types (T_*), enemy types and player states (S_*) keep their
 * original names and values so the port can be compared with the C++ code.
 */

export const MAX_EXPERIENCE = 96;

export const MAX_TILES = 1024;
export const MAX_OBJECTS = 256;

export const MAX_AW_RECORD = 32;

export const TILE_SIZE_X = 16;
export const TILE_SIZE_Y = 16;
export const GAME_VIEW_X = 64;
export const GAME_VIEW_Y = 64;
export const TILE_UNIT = 2;

export const T_WALL = 1;
export const T_WATER = 2;
export const T_LADDER_WALL = 4;
export const T_DOOR_WALL = 8;
export const T_PLAYER = 16;
export const T_WEAPON = 32;
export const T_ENEMY = 64;
export const T_LAVA = 128;

export const T_NADA = 0;
export const T_LADDER = 2;
export const T_WDOOR = 10;
export const T_STONE = 20;
export const T_BROKEN_STONE = 30;
export const T_KEYDOOR = 40;
export const T_EXPLOSION = 50;
export const T_DOOR = 60;
export const T_ITEM = 70;
export const T_WEAPON_ARROW = 80;
export const T_ARMOUR = 90;
export const T_TOMB = 100;
export const T_WKEYDOOR = 110;
export const T_WNOKEYDOOR = 120;
export const T_WEAPON_ARROW2 = 130;
export const T_FAIRY_BUBBLE = 140;
export const T_FAIRY = 150;
export const T_HITWALL = 160;
export const T_WNOKEYDOOR2 = 170;
export const T_WEAPON_FIRE = 180;
export const T_WEAPON_MINE = 190;
export const T_MINE_EXP = 200;
export const T_RFL_ARROW = 210;
export const T_RFL_ARROW2 = 220;
export const T_RFL_FIRE = 230;
export const T_WEAPON_RFIRE = 240;
export const T_RFL_RFIRE = 250;
export const T_WNOKEYDOOR3 = 260;
export const T_PAMPERSE = 270;

export const T_WORM = 1;
export const T_BAT = 2;
export const T_SKELETON = 3;
export const T_SMOKE = 4;
export const T_SLIME = 5;
export const T_BOUNCINGBALL = 6;
export const T_WATERMONSTER = 7;
export const T_WATERMONSTER_ARM = 8;
export const T_BUBBLE = 9;
export const T_JUMPINGBUSH = 10;
export const T_BLUESPIDER = 11;
export const T_WHITEFIREBALL = 12;
export const T_FSTONE = 13;
export const T_RSTONE = 14;
export const T_KNIGHT = 15;
export const T_BLOB = 16;
export const T_BAMBU = 17;
export const T_PORCUPINE = 18;
export const T_PORCUPINE_BULLET = 19;
export const T_BLACK = 20;
export const T_WITCH = 21;
export const T_WHITEBEAR = 22;
export const T_WHITEBEAR_BULLET = 23;
export const T_FEET = 24;
export const T_REDJUMPER = 25;
export const T_VENT2 = 26;
export const T_LIVINGWALL = 27;
export const T_MEGABAT = 28;
export const T_MEGABAT2 = 29;
export const T_MEGABAT3 = 30;
export const T_LAVA1 = 31;
export const T_LAVA2 = 32;
export const T_LAVA3 = 33;
export const T_PIRANHA = 34;
export const T_PIRANHA2 = 35;
export const T_WHITESTAR = 36;
export const T_SPIDER = 37;
export const T_KNIGHTHEAD = 38;
export const T_CHICKEN = 39;
export const T_CHICKEN_EGG = 40;
export const T_EGG_EXPLOSION = 41;
export const T_ROCKMAN = 42;
export const T_CLOUD = 43;
export const T_BFLY_SMALL = 44;
export const T_BFLY_MEDIUM = 45;
export const T_BFLY_LARGE = 46;
export const T_BFLY_GIANT = 47;
export const T_BFLY_BULLET = 48;
export const T_ARMOUR_ARROW = 49;
export const T_GHOST = 50;
export const T_GHOST_BULLET = 51;
export const T_HEAD = 52;
export const T_HEAD_BULLET = 53;
export const T_WORM2 = 54;
export const T_OCTOPUS = 55;
export const T_HAIRY = 56;
export const T_HAIRYBULLET = 57;
export const T_WATERDRAGON = 58;
export const T_WATERBUG = 59;
export const T_BIRD = 60;
export const T_STONEMAN = 61;
export const T_STONEMAN_BULLET = 62;
export const T_PACMAN = 63;
export const T_REDDRAGON = 64;
export const T_REDDRAGON_BULLET = 65;
export const T_OWL = 66;
export const T_GREENMONKEY = 67;
export const T_PLANT = 68;
export const T_PLANT_BULLET = 69;
export const T_TRANSFORMER = 70;
export const T_TRANSF_BULLET = 71;
export const T_FLAME = 72;
export const T_FLAME_BULLET = 73;
export const T_WITCH2 = 74;
export const T_CYCLOPS = 75;
export const T_CYCLOPS_BULLET = 76;
export const T_LCLOUD = 77;
export const T_LIGHTNING = 78;
export const T_LIGHTNING_FIRE = 80;
export const T_SNAKE = 81;
export const T_SNAKE_BULLET = 82;
export const T_GLIZARD = 83;
export const T_GLIZARD_TONGUE = 84;
export const T_GORILLA = 85;
export const T_GORILLA_ARM = 86;
export const T_BDEMON = 87;
export const T_BDEMON_BULLET = 88;
export const T_PAMPERSE_BALL = 89;

export const T_DEMON1 = 101;
export const T_DEMON1_BONES = 102;
export const T_DEMON1_BONES2 = 103;
export const T_DEMON2 = 201;
export const T_DEMON2_BALLS = 202;
export const T_DEMON2_HEAD = 203;
export const T_DEMON3 = 301;
export const T_DEMON3_FIRE = 302;
export const T_DEMON4 = 401;
export const T_DEMON5 = 501;
export const T_DEMON5_FIRE = 502;
export const T_DEMON6 = 601;
export const T_DEMON6_BULLET = 602;
export const T_DEMON7 = 701;
export const T_DEMON7_BULLET = 702;
export const T_DEMON8 = 801;
export const T_DEMON8_BULLET = 802;
export const T_DEMON9 = 901;
export const T_DEMON9_FIRE = 902;
export const T_DEMON10 = 1001;
export const T_DEMON10_BALL = 1002;

export const S_QUIET = 0;
export const S_WALKING_RIGHT = 1;
export const S_WALKING_LEFT = 2;
export const S_UNCONTROLED_FALL = 3;
export const S_CONTROLED_FALL = 4;
export const S_JUMPING = 5;
export const S_STOPPED_JUMPING = 6;
export const S_QUIET_SWORD = 7;
export const S_UC_FALL_SWORD = 8;
export const S_C_FALL_SWORD = 9;
export const S_JUMPING_SWORD = 10;
export const S_SJ_SWORD = 11;
export const S_UP_LADDER = 12;
export const S_DOWN_LADDER = 13;
export const S_QUIET_LADDER = 14;
export const S_SWORD_LADDER = 15;
export const S_HIT = 16;
export const S_HIT_COLISION = 17;
export const S_HIT_RECOVERY = 18;
export const S_DEATH = 19;
export const S_DOORPASS = 20;
export const S_ENTERING_PASSAGE = 21;
export const S_ENTERING_WORLD = 22;
export const S_SLOWDOORPASS = 23;

export const MASK_OFFSET = 18;

export const HIT_TIME = 32;

export const FIRE_ARROW_PERIOD = 4;
export const HIT_PERIOD = 4;

export const MAX_LEVERS = 21;

/** Size of the "already visited rooms" object memory (HP_* functions). */
export const HP_OBJS_MAX = 512;

/** Logical screen size of the remake (all graphics are drawn for 640×400). */
export const SCREEN_X = 640;
export const SCREEN_Y = 400;

/** Game states (G.state): the screens and phases of GameCycle. */
export const State = {
  KonamiAppear: 0,
  KonamiLogo: 1,
  TitleMenu: 2,
  PlayStart: 3,
  Playing: 4,
  ItemScreen: 5,
  /** Back to playing after an emergency reset to the castle (room file missing). */
  ResumeAfterReset: 6,
  Passage: 7,
  /** Back to playing once DOWN is released (not entered anywhere in the remake). */
  ResumeAfterDown: 8,
  WorldEntry: 9,
  RedefineKeys: 10,
  CharacterDead: 11,
  Tomb: 12,
  LeaveTomb: 13,
  PasswordEntry: 14,
  DevStart: 15,
  /** The 6 black frames between rooms. */
  InterScreen: 16,
  Story: 17,
  Ending: 18,
  Options: 19,
} as const;
