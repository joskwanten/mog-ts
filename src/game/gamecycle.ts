/**
 * Main state machine of the game (port of gamecycle.cpp: GameCycle and
 * drawcharacter). The globals defined at the top of gamecycle.cpp live in `G`
 * (state.ts); DebugReport and strupr1 are not ported.
 */
import { fillRect, memset, strokeRect } from '../engine/drawing';
import { Tile } from '../engine/tile';
import { readText } from '../platform/assets';
import { pauseMusic, playMusic, playSound, resumeMusic, stopMusic } from '../platform/audio';
import {
  SDLK_0,
  SDLK_1,
  SDLK_2,
  SDLK_3,
  SDLK_4,
  SDLK_5,
  SDLK_6,
  SDLK_7,
  SDLK_8,
  SDLK_9,
  SDLK_ESCAPE,
  SDLK_F5,
  SDLK_F6,
  SDLK_F7,
  SDLK_F8,
  SDLK_F9,
  SDLK_LAST,
  SDLK_LEFT,
  SDLK_PAGEDOWN,
  SDLK_PAGEUP,
  SDLK_RETURN,
  SDLK_RIGHT,
  SDLK_SPACE,
  SDLK_a,
  SDLK_b,
  SDLK_c,
  SDLK_d,
  SDLK_e,
  SDLK_f,
  SDLK_g,
  SDLK_h,
  SDLK_i,
  SDLK_j,
  SDLK_k,
  SDLK_l,
  SDLK_m,
  SDLK_n,
  SDLK_o,
  SDLK_p,
  SDLK_q,
  SDLK_r,
  SDLK_s,
  SDLK_t,
  SDLK_u,
  SDLK_v,
  SDLK_w,
  SDLK_x,
  SDLK_y,
  SDLK_z,
  getKeyboardState,
  keyName,
} from '../platform/keyboard';
import {
  GAME_VIEW_X,
  GAME_VIEW_Y,
  MASK_OFFSET,
  MAX_AW_RECORD,
  SCREEN_X,
  SCREEN_Y,
  S_DOWN_LADDER,
  S_ENTERING_WORLD,
  S_QUIET,
  State,
  TILE_SIZE_X,
  TILE_SIZE_Y,
  TILE_UNIT,
  T_DOOR_WALL,
  T_ENEMY,
  T_ITEM,
  T_LADDER_WALL,
  T_NADA,
  T_PAMPERSE,
  T_WALL,
} from './constants';
import { idiv, rand, setCharAt, toInt } from './cutil';
import {
  demon10Cycle,
  demon1Cycle,
  demon2Cycle,
  demon3Cycle,
  demon4Cycle,
  demon5Cycle,
  demon6Cycle,
  demon7Cycle,
  demon8Cycle,
  demon9Cycle,
  demonIntro,
  loadDemon1,
  loadDemon10,
  loadDemon2,
  loadDemon3,
  loadDemon4,
  loadDemon5,
  loadDemon6,
  loadDemon7,
  loadDemon8,
  loadDemon9,
} from './demons';
import {
  addObject,
  clearTypedWord,
  defaultConfig,
  drawItemsMap,
  drawMap,
  drawStats,
  findLadder,
  forgetDistantRooms,
  gameEnd,
  gameInit,
  initPaths,
  isWallOrBlocker,
  isWordTyped,
  loadConfig,
  loadRoom,
  newGame,
  releaseGraphics,
  resetRoomMemory,
  restoreRoomMemory,
  saveConfig,
  setSfxVolume,
  tilePrint,
  tilePrintOpaque,
  updateTypedWord,
  paletteColor,
} from './gameaux';
import { animateTiles, roomEvents, testInteractions, updateLevers } from './gameinteractions';
import { animateObjects } from './gameobjects';
import { loadGraphics } from './gametiles';
import { updatePlayer } from './ingamecycle';
import { readPassword } from './passwords';
import { gfx, sfx, tileIds } from './resources';
import { checkRoomChange } from './roomchange';
import { passageCycle } from './shrines';
import { G } from './state';
import { drawTile, drawTileCut, drawTileMask, drawTileNative, tileHits } from './tiledraw';

/** printf "%.Ni": at least N digits, sign in front. */
function fmtInt(n: number, digits: number): string {
  return n < 0 ? '-' + String(-n).padStart(digits, '0') : String(n).padStart(digits, '0');
}

/** Password entry keys (case 14), in the order the C++ tests them. */
const PASSWORD_KEYS: [number, string][] = [
  [SDLK_0, '0'],
  [SDLK_1, '1'],
  [SDLK_2, '2'],
  [SDLK_3, '3'],
  [SDLK_4, '4'],
  [SDLK_5, '5'],
  [SDLK_6, '6'],
  [SDLK_7, '7'],
  [SDLK_8, '8'],
  [SDLK_9, '9'],
  [SDLK_a, 'A'],
  [SDLK_b, 'B'],
  [SDLK_c, 'C'],
  [SDLK_d, 'D'],
  [SDLK_e, 'E'],
  [SDLK_f, 'F'],
  [SDLK_g, 'G'],
  [SDLK_h, 'H'],
  [SDLK_i, 'I'],
  [SDLK_j, 'J'],
  [SDLK_k, 'K'],
  [SDLK_l, 'L'],
  [SDLK_m, 'M'],
  [SDLK_n, 'N'],
  [SDLK_o, 'O'],
  [SDLK_p, 'P'],
  [SDLK_q, 'Q'],
  [SDLK_r, 'R'],
  [SDLK_s, 'S'],
  [SDLK_t, 'T'],
  [SDLK_u, 'U'],
  [SDLK_v, 'V'],
  [SDLK_w, 'W'],
  [SDLK_x, 'X'],
  [SDLK_y, 'Y'],
  [SDLK_z, 'Z'],
];

const STORY_TEXT: string[] = [
  '           STORY',
  'POPOLON WENT INTO MT.ATOS TO',
  'RESCUE APHRODITE KIDNAPPED',
  'BY HUDNOS. BUT IT WAS A TRAP',
  'MADE BY GALIOUS. HE ATTACKED',
  "THE CASTLE DURING POPOLON'S",
  'ABSENCE AND ALSO KIDNAPPED',
  'AND IMPRISONED A BABY FROM',
  'THE HEAVEN WHO WAS SUPPOSED',
  'TO BE BORN TO POPOLON AND',
  'APHRODITE SEVERAL YEARS',
  'LATER...',
];

const EPILOGUE_TEXT: string[] = [
  '          EPILOGUE',
  'THANKS TO YOU,THE BABY WAS',
  'RESCUED SAFELY.THE KINGDOM',
  'TOOK BACK PACE AND VIGOR.',
  'POPOLON WAS AWARDED THE',
  'CROWN FOR HIS ACHIEVEMENT.IT',
  'WAS DECIDED THAT HE PROTECT',
  'THE KINGDOM WITH APHRODITE',
  'AS HIS WIFE FOR THE REST OF',
  'THEIR LIVES.THIS LEGEND WILL',
  'BE TOLD AGAIN WHEN THEY ARE',
  'APT TO LOSE BELIEF IN LOVE.',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '       ORIGINAL  STAFF',
  '',
  '       MAIN PROGRAMMER',
  '          Y.HARUKI',
  '',
  '       SUB  PROGRAMMER',
  '           I.AKADA',
  '           M.OZAWA',
  '            T.OKA',
  '         Y.HIRONAKA',
  '           K.OZAWA',
  '         S.YOSHINAWA',
  '',
  '      GRAPHIC DESIGNER',
  '          R.SHOGAKI',
  '         C.TANIGAKI',
  '          T.MIYOSHI',
  '         K.SHIRAKAGI',
  '',
  '       SOUND  CREATOR',
  '          K.UEHARA',
  '',
  '',
  '    PLANNER AND DIRECTOR',
  '          R.SHOGAKI',
  '',
  '',
  '',
  '',
  '   WE PROMISE TO CONTINUE',
  '   SENDING ROMANTIC GAME',
  '   MESSAGES.',
  '',
  '   THANK YOU VERY MUCH',
  '   FOR YOUR JOINING IN',
  '   THIS STORY.',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '    PRESENTED BY KONAMI',
  '    ORIGINALLY AT  1987',
  '',
  '    REMAKE PRESENTED BY ',
  // The Latin-1 'Ñ' has no glyph in tilePrint: it is drawn as a blank.
  '   SANTI ONTAÑON AT 2002',
];

const LETTER: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

const ROOM_PREFIXES: string[] = ['map', 'w01', 'w02', 'w03', 'w04', 'w05', 'w06', 'w07', 'w08', 'w09', 'w10'];

/** `emscripten_run_script_string("localStorage['mogN']")`. */
function readSaveSlot(slot: number): string | null {
  try {
    return localStorage.getItem(`mog${slot}`);
  } catch {
    return null;
  }
}

export function gameCycle(screen: Uint32Array): void {
  const keyboard = getKeyboardState();

  G.frameCounter++;

  STATE_HANDLERS[G.state]?.(screen, keyboard);

  G.oldRoomDemonroom = G.roomDemonroom;

  // Clear the screen borders:
  if (G.state === State.Playing || G.state === State.InterScreen) {
    fillRect(screen, 0, 0, GAME_VIEW_X, SCREEN_Y, SCREEN_X, paletteColor(0));
    fillRect(
      screen,
      GAME_VIEW_X + 32 * TILE_SIZE_X,
      0,
      SCREEN_X - (GAME_VIEW_X + 32 * TILE_SIZE_X),
      SCREEN_Y,
      SCREEN_X,
      paletteColor(0),
    );
    fillRect(
      screen,
      GAME_VIEW_X,
      GAME_VIEW_Y + 20 * TILE_SIZE_Y,
      32 * TILE_SIZE_X,
      SCREEN_Y - (GAME_VIEW_Y + 20 * TILE_SIZE_Y),
      SCREEN_X,
      paletteColor(0),
    );
  }

  // Screen views:
  if (G.state === State.Playing || G.state === State.InterScreen) {
    const zx = G.zoom;
    const zy = toInt((G.zoom * (400.0 - GAME_VIEW_Y)) / 640.0);

    G.logicDx[0] = G.physicDx[0] = 640;
    G.logicDy[0] = G.physicDy[0] = GAME_VIEW_Y;
    G.logicX[0] = G.physicX[0] = 0;
    G.logicY[0] = G.physicY[0] = 0;

    G.logicDx[1] = zx;
    G.logicDy[1] = zy;
    G.logicX[1] = Math.max(Math.min(640 - zx, GAME_VIEW_X + G.playerX - (idiv(zx, 2) - TILE_SIZE_X)), 0);
    G.logicY[1] = Math.max(Math.min(400 - zy, GAME_VIEW_Y + G.playerY - idiv(zy, 2)), GAME_VIEW_Y);

    G.physicX[1] = 0;
    G.physicY[1] = GAME_VIEW_Y;
    G.physicDx[1] = 640;
    G.physicDy[1] = 400 - GAME_VIEW_Y;
  } else {
    G.logicDx[0] = G.physicDx[0] = 640;
    G.logicDy[0] = G.physicDy[0] = 400;
    G.logicX[0] = G.physicX[0] = 0;
    G.logicY[0] = G.physicY[0] = 0;

    G.logicDx[1] = G.physicDx[1] = 0;
  }

  // Old keyboard state:
  for (let i = 0; i < SDLK_LAST; i++) G.oldKeyboard[i] = keyboard[i];

  G.cycle++;
}

// KONAMI LOGO APPEARING:
function konamiAppear(screen: Uint32Array, keyboard: Uint8Array): void {
  let i: number;

  if (G.subState === 0) {
    initPaths();
    if (!loadConfig('mog.cfg')) {
      defaultConfig();
      saveConfig('mog.cfg');
    }
    gameEnd();
    gameInit();
    resetRoomMemory();
    // setMusicVolume(musicVolume);
    setSfxVolume(sfx.volume);
    // Clear the screen:
    // Clear to the colour of the logo's top-left pixel (0 = transparent: palette colour 0).
    memset(screen, 0, gfx.konami!.getPixels()![0] || paletteColor(0), SCREEN_X * SCREEN_Y);
    // set_palete((BYTE *)konamiBitmap->getPalette());

    for (; G.subState < 25; G.subState++) {
      gfx.konami!.drawSprite(
        0,
        G.subState,
        gfx.konami!.getWidth(),
        1,
        0,
        G.subState * idiv(SCREEN_Y, 200),
        SCREEN_X,
        1,
        screen,
        SCREEN_X,
        SCREEN_Y,
        SCREEN_X,
      );
    }
  }

  for (i = 0; i < G.subState * idiv(SCREEN_Y, 200); i++) {
    gfx.konami!.drawSprite(0, i, gfx.konami!.getWidth(), 1, 0, i, SCREEN_X, 1, screen, SCREEN_X, SCREEN_Y, SCREEN_X);
  }
  G.subState++;
  if (G.subState >= 200) {
    G.subState = 0;
    G.state = State.KonamiLogo;
  }

  if (keyboard[SDLK_SPACE] !== 0) {
    G.state = State.TitleMenu;
    G.subState = 0;
  }
}

function konamiLogo(screen: Uint32Array, keyboard: Uint8Array): void {
  G.subState++;
  gfx.konami!.draw(0, 0, SCREEN_X, SCREEN_Y, screen, SCREEN_X, SCREEN_Y, SCREEN_X);
  if (G.subState > 100) {
    G.subState = 0;
    G.state = State.TitleMenu;
  }
  if (keyboard[SDLK_SPACE] !== 0) {
    G.state = State.TitleMenu;
    G.subState = 0;
  }
}

// MAIN MENU:
function titleMenu(screen: Uint32Array, keyboard: Uint8Array): void {
  let tmp: string;
  // Clear the screen:
  G.subState++;
  memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
  // set_palete((BYTE *)tilesBitmap->getPalette());
  gfx.menu!.draw(0, 0, SCREEN_X, SCREEN_Y, screen, SCREEN_X, SCREEN_Y, SCREEN_X);
  tilePrint('PUSH SPACE KEY', TILE_SIZE_X * 13, TILE_SIZE_Y * 19, screen);

  tmp = `F10 OR 9 CHANGES GRAPHIC SET: ${G.graphicsPath.slice(9)}`;
  tmp = tmp.slice(0, tmp.length - 1);
  tmp = tmp.toUpperCase();
  tilePrint(tmp, TILE_SIZE_X * 2, TILE_SIZE_Y * 21, screen);
  tmp = `F11 OR 0 CHANGES SOUND SET: ${G.soundPath.slice(6)}`;
  tmp = tmp.toUpperCase();
  tmp = tmp.slice(0, tmp.length - 1);
  tilePrint(tmp, TILE_SIZE_X * 2, TILE_SIZE_Y * 22, screen);
  tilePrint('PRESS K TO REDEFINE THE KEYS', TILE_SIZE_X * 6, TILE_SIZE_Y * 23, screen);

  if (keyboard[SDLK_SPACE] !== 0 && G.oldKeyboard[SDLK_SPACE] === 0) {
    G.devStartX = -1;
    G.devStartY = -1;
    G.devStartWorld = -1;
    G.password = 'UR3FUR3FUR4F423RUR3FUR3FUR3FUR3FUR3FUR3FURS48';
    G.state = State.PlayStart;
    G.subState = 0;
  }
  if (keyboard[SDLK_k] !== 0 && G.oldKeyboard[SDLK_k] === 0) {
    G.state = State.RedefineKeys;
    G.subState = 0;
  }
  if (keyboard[SDLK_l] !== 0 && G.oldKeyboard[SDLK_l] === 0) {
    // for(i=0;i<45;i++) password[i]=' ';
    G.password = ' '.repeat(45) + G.password.slice(45);
    G.passwordPos = 0;
    G.state = State.PasswordEntry;
    G.subState = 0;
  }

  if (keyboard[SDLK_g] !== 0 && G.oldKeyboard[SDLK_g] === 0) {
    G.devStartX = 5;
    G.devStartY = 12;
    G.devStartWorld = 0;
    G.state = State.DevStart;
    G.subState = 0;
  }

  if (G.subState >= 256) {
    G.state = State.Story;
    G.subState = 0;
  }
}

function playStart(screen: Uint32Array, keyboard: Uint8Array): void {
  let tmp: string;
  // SPACE was pressed:
  if (G.subState === 0) playSound(sfx.gamestart);
  if (G.subState % 4 === 0) {
    memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
    gfx.menu!.draw(0, 0, SCREEN_X, SCREEN_Y, screen, SCREEN_X, SCREEN_Y, SCREEN_X);
    tilePrint('  PLAY START  ', TILE_SIZE_X * 13, TILE_SIZE_Y * 19, screen);
  }
  if (G.subState % 4 === 2) {
    memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
    gfx.menu!.draw(0, 0, SCREEN_X, SCREEN_Y, screen, SCREEN_X, SCREEN_Y, SCREEN_X);
  }
  if (G.subState >= 30) {
    if (G.world === 0) tmp = 'castle';
    else tmp = 'world';
    playMusic(tmp, null, null);

    G.state = State.Playing;
    G.subState = 0;
    newGame();
  } else {
    G.subState++;
  }
}

function playing(screen: Uint32Array, keyboard: Uint8Array): void {
  let tmp: string;
  // GAME!!!
  if (G.subState === 0) {
    G.subState = 1;
    // First cycle:
    forgetDistantRooms(G.roomX, G.roomY);
    loadRoom(G.world, G.roomX, G.roomY);
    restoreRoomMemory(G.roomX, G.roomY);
    // set_palete((BYTE *)tilesBitmap->getPalette());

    G.oldSword = false;
    G.hitTime = 0;
    G.frozen = 0;
    G.onLadder = -1;
    G.previousXCollision = false;
    G.previousYCollision = false;
    G.pauseFlag = false;
  }

  if (G.nextWorld >= 10 && G.world10DoorX === -1) {
    const x = [1, 5, 9, 14];
    const y = [6, 12, 2, 4];
    const i = rand() % 4;
    G.world10DoorX = x[i];
    G.world10DoorY = y[i];
  }

  memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
  memset(G.collision!, 0, 0, SCREEN_X * SCREEN_Y);
  drawMap(screen, 0);

  updateTypedWord();

  if (!G.pauseFlag) {
    if (G.roomDemonroom) {
      if (
        (G.nextWorld <= 1 && G.fightingDemon === 0 && G.world === 1 && isWordTyped('yomar')) ||
        (G.nextWorld <= 2 && G.fightingDemon === 0 && G.world === 2 && isWordTyped('elohim')) ||
        (G.nextWorld <= 3 && G.fightingDemon === 0 && G.world === 3 && isWordTyped('hahakla')) ||
        (G.nextWorld <= 4 && G.fightingDemon === 0 && G.world === 4 && isWordTyped('barechet')) ||
        (G.nextWorld <= 5 && G.fightingDemon === 0 && G.world === 5 && isWordTyped('heotymeo')) ||
        (G.nextWorld <= 6 && G.fightingDemon === 0 && G.world === 6 && isWordTyped('lepha')) ||
        (G.nextWorld <= 7 && G.fightingDemon === 0 && G.world === 7 && isWordTyped('nawabra')) ||
        (G.nextWorld <= 8 && G.fightingDemon === 0 && G.world === 8 && isWordTyped('ascher')) ||
        (G.nextWorld <= 9 && G.fightingDemon === 0 && G.world === 9 && isWordTyped('xywoleh')) ||
        (G.nextWorld <= 10 && G.fightingDemon === 0 && G.world === 10 && isWordTyped('hamalech'))
      ) {
        // DEMON!!!
        clearTypedWord();
        stopMusic();
        playMusic('demon1', 'demon2', null);
        G.fightingDemon = 1;
      }
    } else {
      if (G.fightingDemon !== 0) {
        releaseGraphics();
        loadGraphics();
      }
      G.fightingDemon = 0;
    }

    // Demon effects:
    if (G.fightingDemon !== 0) {
      if (G.fightingDemon < 160) {
        demonIntro(G.fightingDemon, screen);
        G.fightingDemon++;
      }
      if (G.fightingDemon === 160) {
        if (G.world === 1) loadDemon1();
        if (G.world === 2) loadDemon2();
        if (G.world === 3) loadDemon3();
        if (G.world === 4) loadDemon4();
        if (G.world === 5) loadDemon5();
        if (G.world === 6) loadDemon6();
        if (G.world === 7) loadDemon7();
        if (G.world === 8) loadDemon8();
        if (G.world === 9) loadDemon9();
        if (G.world === 10) loadDemon10();
        G.fightingDemon++;
      }
      if (G.fightingDemon === 161 && G.bibleSubcounter === 0) {
        if (G.world === 1) demon1Cycle();
        if (G.world === 2) demon2Cycle();
        if (G.world === 3) demon3Cycle();
        if (G.world === 4) demon4Cycle();
        if (G.world === 5) demon5Cycle();
        if (G.world === 6) demon6Cycle();
        if (G.world === 7) demon7Cycle();
        if (G.world === 8) demon8Cycle();
        if (G.world === 9) demon9Cycle();
        if (G.world === 10) demon10Cycle();
      }
      if (G.fightingDemon >= 162 && G.fightingDemon < 194) {
        demonIntro(G.fightingDemon, screen);
        G.fightingDemon++;
      }
      if (G.fightingDemon === 194) {
        G.objects[G.demonObject].type = T_NADA;
        switch (G.world) {
          case 1:
            G.worldKeyItem = addObject(T_ITEM, 15 * TILE_SIZE_X, 13 * TILE_SIZE_Y, 0, 0, 37);
            break;
          case 2:
            G.objects[G.demonObject2].type = T_NADA;
            G.worldKeyItem = addObject(T_ITEM, 15 * TILE_SIZE_X, 9 * TILE_SIZE_Y, 0, 0, 37);
            break;
          case 3:
            G.worldKeyItem = addObject(T_ITEM, 15 * TILE_SIZE_X, 9 * TILE_SIZE_Y, 0, 0, 37);
            break;
          case 4:
            G.worldKeyItem = addObject(T_ITEM, 15 * TILE_SIZE_X, 13 * TILE_SIZE_Y, 0, 0, 37);
            break;
          case 5:
            G.worldKeyItem = addObject(T_ITEM, 15 * TILE_SIZE_X, 13 * TILE_SIZE_Y, 0, 0, 37);
            break;
          case 6:
            G.worldKeyItem = addObject(T_ITEM, 12 * TILE_SIZE_X, 17 * TILE_SIZE_Y, 0, 0, 37);
            break;
          case 7:
            G.worldKeyItem = addObject(T_ITEM, 16 * TILE_SIZE_X, 17 * TILE_SIZE_Y, 0, 0, 37);
            break;
          case 8:
            G.worldKeyItem = addObject(T_ITEM, 16 * TILE_SIZE_X, 9 * TILE_SIZE_Y, 0, 0, 37);
            break;
          case 9: {
            let i: number;
            for (i = 0; i < G.objectCount; i++) if (G.objects[i].type === T_ENEMY) G.objects[i].type = T_NADA;
            G.worldKeyItem = addObject(T_ITEM, 15 * TILE_SIZE_X, 17 * TILE_SIZE_Y, 0, 0, 37);
            break;
          }
          case 10:
            G.nextWorld = 11;
            G.fightingDemon++;
            break;
        }
        G.fightingDemon++;
      }
      if (G.fightingDemon === 195) {
        // Waiting for the key to be picked up:
      }
      if (G.fightingDemon >= 196 && G.fightingDemon < 356) {
        // Key picked up:
        G.fightingDemon++;

        if (G.world === 10 && G.fightingDemon >= 230) {
          stopMusic();
          playMusic('worldkey2', 'world', null);

          G.fightingDemon = 431;
          G.nextWorld = 11;
        }

        // Make the character jump:
        if (G.world !== 10) {
          let baseY = 13;
          const t = (G.fightingDemon - 196) % 32;
          if ((idiv(G.fightingDemon - 196, 32) & 0x01) === 0) G.facingRight = true;
          else G.facingRight = false;
          G.playerFrame = 2;
          G.playerState = 0;
          G.playerSubState = 0;
          if (G.world === 1) baseY = 13;
          if (G.world === 2) baseY = 9;
          if (G.world === 3) baseY = 9;
          if (G.world === 4) baseY = 13;
          if (G.world === 5) baseY = 13;
          if (G.world === 6) baseY = 17;
          if (G.world === 7) baseY = 17;
          if (G.world === 8) baseY = 9;
          if (G.world === 9) baseY = 17;
          if (t < 12) {
            G.playerY = baseY * TILE_SIZE_Y - t * TILE_UNIT * 8;
          }
          if (t >= 12 && t < 14) {
            G.playerY = baseY * TILE_SIZE_Y - 12 * TILE_UNIT * 8 - (t - 12) * TILE_UNIT * 4;
          }
          if (t >= 14 && t < 16) {
            G.playerY = baseY * TILE_SIZE_Y - 12 * TILE_UNIT * 8 - (2 * TILE_UNIT * 4 + (t - 14) * TILE_UNIT * 2);
          }
          if (t >= 16 && t < 18) {
            G.playerY = baseY * TILE_SIZE_Y - 12 * TILE_UNIT * 8 - (2 * TILE_UNIT * 4 + (18 - t) * TILE_UNIT * 2);
          }
          if (t >= 18 && t < 20) {
            G.playerY = baseY * TILE_SIZE_Y - 12 * TILE_UNIT * 8 - (20 - t) * TILE_UNIT * 4;
          }
          if (t >= 20) {
            G.playerY = baseY * TILE_SIZE_Y - (32 - t) * TILE_UNIT * 8;
          }
        }
      }
      if (G.fightingDemon >= 356 && G.fightingDemon < 432) {
        if (G.nextWorld === 11) {
          G.fightingDemon = 432;
        } else {
          G.objects[G.worldKeyItem].type = T_NADA;
          tmp = ` I HAVE TAKEN WORLD ${G.world} BACK ! `;
          tilePrintOpaque(tmp, GAME_VIEW_X + 2 * TILE_SIZE_X, 8 * TILE_SIZE_Y, screen);
          G.fightingDemon++;
          G.playerFrame = 0;
          if (G.fightingDemon === 431 && G.world === 3) {
            // Make the side walls of world 3 reappear:
            let tx: number, ty: number;
            const x = [0, 1, 30, 31];

            for (ty = 0; ty < 20; ty++) {
              if (ty % 4 !== 3) {
                for (tx = 0; tx < 4; tx++) G.roomTiles![x[tx] + ty * G.roomWidth] = 125;
              }
            }
            G.roomTiles![2 + 19 * G.roomWidth] = 126;
            G.roomTiles![3 + 19 * G.roomWidth] = 126;
            G.objects[0].size = 9;
          }
        }
      }
    }

    drawCharacter(screen);

    testInteractions();
    animateTiles(gfx.tiles!);
    animateObjects();

    if (G.fightingDemon < 196 || G.fightingDemon >= 432) updatePlayer();
    updateLevers();
    roomEvents();
    checkRoomChange();
  } else {
    if (isWordTyped('zeus') && G.world === 0 && G.roomX === 5 && G.roomY === 12 && G.pauseFlag) {
      G.zeusPassword = true;
    }
    if (G.pauseState < 0) {
      drawTile(
        screen,
        tileIds.pause[G.character],
        GAME_VIEW_X + G.playerX,
        GAME_VIEW_Y + G.playerY - TILE_SIZE_Y,
        TILE_SIZE_X * 2 + 2 * TILE_UNIT,
        TILE_SIZE_Y * 3,
      );
    } else {
      if (G.pauseState < 4) {
        drawTile(
          screen,
          tileIds.pause[G.character] + 1,
          GAME_VIEW_X + G.playerX,
          GAME_VIEW_Y + G.playerY - TILE_SIZE_Y,
          TILE_SIZE_X * 2 + 2 * TILE_UNIT,
          TILE_SIZE_Y * 3,
        );
      } else {
        drawTile(
          screen,
          tileIds.pause[G.character] + 2,
          GAME_VIEW_X + G.playerX,
          GAME_VIEW_Y + G.playerY - TILE_SIZE_Y,
          TILE_SIZE_X * 2 + 2 * TILE_UNIT,
          TILE_SIZE_Y * 3,
        );
      }
    }
    G.pauseState++;
    if (G.pauseState >= 8) G.pauseState = 0;
  }

  drawStats(screen);

  if (keyboard[SDLK_ESCAPE] !== 0 && G.oldKeyboard[SDLK_ESCAPE] === 0) {
    G.oldState = G.state;
    G.menuOption = 0;
    G.state = State.Options;
  }

  if (
    keyboard[G.keyItem] !== 0 &&
    G.oldKeyboard[G.keyItem] === 0 &&
    G.energy[G.character] > 0 &&
    !G.pauseFlag &&
    G.enterCut === 0
  ) {
    playSound(sfx.f1);
    G.selecting = 0;
    G.state = State.ItemScreen;
    G.subState = 0;
  }

  if (keyboard[G.keyPause] !== 0 && G.oldKeyboard[G.keyPause] === 0) {
    G.pauseFlag = G.pauseFlag ? false : true;
    if (G.pauseFlag) {
      G.pauseState = -256;
      pauseMusic();
      playSound(sfx.pause);
    } else {
      if (G.bibleSubcounter === 0) resumeMusic();
    }
  }

  // Views:
  if (keyboard[SDLK_PAGEUP] !== 0 && G.zoom < 640) G.zoom += 8;
  if (keyboard[SDLK_PAGEDOWN] !== 0 && G.zoom > 320) G.zoom -= 8;
}

function itemScreen(screen: Uint32Array, keyboard: Uint8Array): void {
  // ITEMS SCREEN:
  memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
  memset(G.collision!, 0, 0, SCREEN_X * SCREEN_Y);

  drawStats(screen);

  // Popolon and Aphrodite:
  if (G.characterAlive[0]) {
    drawTile(screen, tileIds.stats + 1, GAME_VIEW_X + TILE_SIZE_X * 12, GAME_VIEW_Y + TILE_SIZE_Y * 1);
  }
  if (G.characterAlive[1]) {
    drawTile(screen, tileIds.stats + 2, GAME_VIEW_X + TILE_SIZE_X * 18, GAME_VIEW_Y + TILE_SIZE_Y * 1);
  }

  // Blinking frame:
  if (((G.subState >> 2) & 0x01) === 0 || G.selecting === 1) {
    if (G.character === 0) {
      drawTile(screen, tileIds.stats + 3, GAME_VIEW_X + TILE_SIZE_X * 12, GAME_VIEW_Y + TILE_SIZE_Y * 1);
    } else {
      drawTile(screen, tileIds.stats + 3, GAME_VIEW_X + TILE_SIZE_X * 18, GAME_VIEW_Y + TILE_SIZE_Y * 1);
    }
  }

  // Items:
  tilePrint('ITEM', TILE_SIZE_X * 18, GAME_VIEW_Y + TILE_SIZE_Y * 5, screen);
  {
    let i: number, j: number;

    for (i = 0; i < 3; i++) {
      for (j = 0; j < 10; j++) {
        if (i === 2 && j === 7) {
          if (G.items[j + i * 10]) {
            drawTile(
              screen,
              tileIds.items + j + i * 10,
              GAME_VIEW_X + TILE_SIZE_X * (6 + j * 2),
              GAME_VIEW_Y + TILE_SIZE_Y * (6 + i * 2),
            );
          } else {
            if (G.items[30]) {
              drawTile(
                screen,
                tileIds.items + 30,
                GAME_VIEW_X + TILE_SIZE_X * (6 + j * 2),
                GAME_VIEW_Y + TILE_SIZE_Y * (6 + i * 2),
              );
            } else {
              if (G.items[31]) {
                drawTile(
                  screen,
                  tileIds.items + 31,
                  GAME_VIEW_X + TILE_SIZE_X * (6 + j * 2),
                  GAME_VIEW_Y + TILE_SIZE_Y * (6 + i * 2),
                );
              }
            }
          }
        } else {
          if (G.items[j + i * 10]) {
            drawTile(
              screen,
              tileIds.items + j + i * 10,
              GAME_VIEW_X + TILE_SIZE_X * (6 + j * 2),
              GAME_VIEW_Y + TILE_SIZE_Y * (6 + i * 2),
            );
          }
        }
      }
    }
  }

  // World tiles:
  if (G.hasWorldKey) {
    drawTile(screen, tileIds.items + 37, GAME_VIEW_X + TILE_SIZE_X * 25, GAME_VIEW_Y + TILE_SIZE_Y * 13);
  }
  if (G.hasCross) {
    drawTile(screen, tileIds.items + 36, GAME_VIEW_X + TILE_SIZE_X * 23, GAME_VIEW_Y + TILE_SIZE_Y * 13);
  }

  if (G.world >= 1) {
    let i: number;
    for (i = 0; i < 4; i++) {
      if (G.worldItems[G.world - 1][i]) {
        drawTile(
          screen,
          tileIds.items + 32 + i,
          GAME_VIEW_X + TILE_SIZE_X * (15 + i * 2),
          GAME_VIEW_Y + TILE_SIZE_Y * 13,
        );
      }
    }
  }

  // NOTE (original): in the castle (map 0) this reads worldItems[-1][3], out of
  // bounds (undefined behaviour: whatever byte precedes worldItems in memory).
  // Treated as false here.
  if (G.world >= 1 && G.worldItems[G.world - 1][3]) {
    // Draw map:
    tilePrint('MAP', 6 * TILE_SIZE_X + GAME_VIEW_X, GAME_VIEW_Y + 13 * TILE_SIZE_Y, screen);
    drawItemsMap(G.world, G.roomX, G.roomY, ((G.subState >> 2) & 0x01) === 0 ? true : false, screen);
  }

  // Weapons:
  {
    let i: number;
    drawTile(
      screen,
      tileIds.stats + 5,
      GAME_VIEW_X + TILE_SIZE_X * 13,
      GAME_VIEW_Y + TILE_SIZE_Y * 15,
      TILE_SIZE_X * 1,
      TILE_SIZE_Y * 3,
    );
    for (i = 0; i < 15; i++) {
      drawTile(
        screen,
        tileIds.stats + 6,
        GAME_VIEW_X + TILE_SIZE_X * (14 + i),
        GAME_VIEW_Y + TILE_SIZE_Y * 15,
        TILE_SIZE_X * 1,
        TILE_SIZE_Y * 3,
      );
    }
    drawTile(
      screen,
      tileIds.stats + 7,
      GAME_VIEW_X + TILE_SIZE_X * 29,
      GAME_VIEW_Y + TILE_SIZE_Y * 15,
      TILE_SIZE_X * 1,
      TILE_SIZE_Y * 3,
    );

    if (G.items[32]) {
      drawTile(
        screen,
        tileIds.weapons,
        GAME_VIEW_X + TILE_SIZE_X * 14,
        GAME_VIEW_Y + TILE_SIZE_Y * 16,
        TILE_SIZE_X * 2,
        TILE_SIZE_Y * 1,
      );
    }
    if (G.items[33]) {
      drawTile(
        screen,
        tileIds.weapons + 1,
        GAME_VIEW_X + TILE_SIZE_X * 17,
        GAME_VIEW_Y + TILE_SIZE_Y * 16,
        TILE_SIZE_X * 2,
        TILE_SIZE_Y * 1,
      );
    }
    if (G.items[34]) {
      drawTile(
        screen,
        tileIds.weapons + 2,
        GAME_VIEW_X + TILE_SIZE_X * 20 + idiv(TILE_SIZE_X, 2),
        GAME_VIEW_Y + TILE_SIZE_Y * 16,
        TILE_SIZE_X,
        TILE_SIZE_Y,
      );
    }
    if (G.items[35]) {
      drawTile(
        screen,
        tileIds.weapons + 3,
        GAME_VIEW_X + TILE_SIZE_X * 22 + idiv(TILE_SIZE_X, 2),
        GAME_VIEW_Y + TILE_SIZE_Y * 16,
        TILE_SIZE_X,
        TILE_SIZE_Y,
      );
    }
    if (G.items[37]) {
      drawTile(
        screen,
        tileIds.weapons + 5,
        GAME_VIEW_X + TILE_SIZE_X * 24,
        GAME_VIEW_Y + TILE_SIZE_Y * 16,
        TILE_SIZE_X * 2,
        TILE_SIZE_Y * 1,
      );
    }
    if (G.items[36]) {
      drawTile(
        screen,
        tileIds.weapons + 4,
        GAME_VIEW_X + TILE_SIZE_X * 27,
        GAME_VIEW_Y + TILE_SIZE_Y * 16,
        TILE_SIZE_X * 2,
        TILE_SIZE_Y * 1,
      );
    }

    if (G.currentWeapon !== -1) {
      // Blinking frame (weapons):
      if (((G.subState >> 2) & 0x01) === 0 || G.selecting === 0) {
        const pos = [0, 3, 6, 8, 13, 10];

        if (G.character === 0) {
          drawTile(
            screen,
            tileIds.stats + 4,
            GAME_VIEW_X + TILE_SIZE_X * (14 + pos[G.currentWeapon]),
            GAME_VIEW_Y + TILE_SIZE_Y * 15 + TILE_UNIT * 4,
          );
        } else {
          drawTile(
            screen,
            tileIds.stats + 4,
            GAME_VIEW_X + TILE_SIZE_X * (14 + pos[G.currentWeapon]),
            GAME_VIEW_Y + TILE_SIZE_Y * 15 + TILE_UNIT * 4,
          );
        }
      }
    }
  }

  if (
    G.oldKeyboard[G.keyLeft] === 0 &&
    G.oldKeyboard[G.keyRight] === 0 &&
    (keyboard[G.keyLeft] !== 0 || keyboard[G.keyRight] !== 0)
  ) {
    if (G.selecting === 0) {
      if (G.characterAlive[0] && G.characterAlive[1]) {
        let forbiden = false;

        if (G.world === 5 && !G.items[22]) forbiden = true;
        if (G.world === 7 && !G.items[0]) forbiden = true;

        if (!forbiden) {
          if (G.character === 0) G.character = 1;
          else G.character = 0;
          playSound(sfx.select);
        }
      }
    } else {
      if (keyboard[G.keyRight] !== 0) {
        playSound(sfx.select);
        do {
          switch (G.currentWeapon) {
            case 0:
              G.currentWeapon = 1;
              break;
            case 1:
              G.currentWeapon = 2;
              break;
            case 2:
              G.currentWeapon = 3;
              break;
            case 3:
              G.currentWeapon = 5;
              break;
            case 4:
              G.currentWeapon = 0;
              break;
            case 5:
              G.currentWeapon = 4;
              break;
          }
        } while (!G.items[32 + G.currentWeapon]);
      } else {
        playSound(sfx.select);
        do {
          switch (G.currentWeapon) {
            case 0:
              G.currentWeapon = 4;
              break;
            case 1:
              G.currentWeapon = 0;
              break;
            case 2:
              G.currentWeapon = 1;
              break;
            case 3:
              G.currentWeapon = 2;
              break;
            case 4:
              G.currentWeapon = 5;
              break;
            case 5:
              G.currentWeapon = 3;
              break;
          }
        } while (!G.items[32 + G.currentWeapon]);
      }
    }
  }

  if (
    G.oldKeyboard[G.keyUp] === 0 &&
    G.oldKeyboard[G.keyDown] === 0 &&
    G.currentWeapon !== -1 &&
    (keyboard[G.keyUp] !== 0 || keyboard[G.keyDown] !== 0)
  ) {
    playSound(sfx.select);
    if (G.selecting === 1) G.selecting = 0;
    else G.selecting = 1;
  }

  if (G.currentWeapon === -1) {
    if (G.items[37]) G.currentWeapon = 5;
    if (G.items[36]) G.currentWeapon = 4;
    if (G.items[35]) G.currentWeapon = 3;
    if (G.items[34]) G.currentWeapon = 2;
    if (G.items[33]) G.currentWeapon = 1;
    if (G.items[32]) G.currentWeapon = 0;
  }

  G.subState++;

  if (G.oldKeyboard[G.keyItem] === 0 && keyboard[G.keyItem] !== 0) {
    G.state = State.Playing;
    G.subState = 1;
  }

  // Angel's halo:
  if (
    G.items[8] &&
    (G.fightingDemon === 0 || G.fightingDemon === 432) &&
    G.oldKeyboard[SDLK_RETURN] === 0 &&
    keyboard[SDLK_RETURN] !== 0
  ) {
    if (G.world !== 0) {
      G.state = State.WorldEntry;
      G.subState = 0;
    } else {
      G.state = State.Playing;
      G.subState = 1;
    }
    if (G.world !== 0) resetRoomMemory();
    G.world = 0;
    G.roomX = 5;
    G.roomY = 9;
    G.playerX = TILE_SIZE_X * 16;
    G.playerY = TILE_SIZE_Y * 5;
    G.playerState = 0;
    G.playerFrame = 0;
    G.firedArrows = 0;
    G.firedMines = 0;
    loadRoom(G.world, G.roomX, G.roomY);
  }

  // Feather:
  if (
    G.items[26] &&
    G.world === 0 &&
    keyboard[SDLK_RETURN] === 0 &&
    ((G.oldKeyboard[SDLK_1] === 0 && keyboard[SDLK_1] !== 0) ||
      (G.oldKeyboard[SDLK_2] === 0 && keyboard[SDLK_2] !== 0) ||
      (G.oldKeyboard[SDLK_3] === 0 && keyboard[SDLK_3] !== 0) ||
      (G.oldKeyboard[SDLK_4] === 0 && keyboard[SDLK_4] !== 0) ||
      (G.oldKeyboard[SDLK_5] === 0 && keyboard[SDLK_5] !== 0) ||
      (G.oldKeyboard[SDLK_6] === 0 && keyboard[SDLK_6] !== 0) ||
      (G.oldKeyboard[SDLK_7] === 0 && keyboard[SDLK_7] !== 0) ||
      (G.oldKeyboard[SDLK_8] === 0 && keyboard[SDLK_8] !== 0) ||
      (G.oldKeyboard[SDLK_9] === 0 && keyboard[SDLK_9] !== 0))
  ) {
    let go = false;

    if (G.oldKeyboard[SDLK_1] === 0 && keyboard[SDLK_1] !== 0 && G.worldDoorsOpen[0]) {
      G.roomX = 3;
      G.roomY = 12;
      G.playerX = TILE_SIZE_X * 9;
      G.playerY = TILE_SIZE_Y * 5;
      go = true;
    }
    if (G.oldKeyboard[SDLK_2] === 0 && keyboard[SDLK_2] !== 0 && G.worldDoorsOpen[1]) {
      G.roomX = 10;
      G.roomY = 11;
      G.playerX = TILE_SIZE_X * 25;
      G.playerY = TILE_SIZE_Y * 5;
      go = true;
    }
    if (G.oldKeyboard[SDLK_3] === 0 && keyboard[SDLK_3] !== 0 && G.worldDoorsOpen[2]) {
      G.roomX = 10;
      G.roomY = 8;
      G.playerX = TILE_SIZE_X * 21;
      G.playerY = TILE_SIZE_Y * 5;
      go = true;
    }
    if (G.oldKeyboard[SDLK_4] === 0 && keyboard[SDLK_4] !== 0 && G.worldDoorsOpen[3]) {
      G.roomX = 0;
      G.roomY = 8;
      G.playerX = TILE_SIZE_X * 9;
      G.playerY = TILE_SIZE_Y * 9;
      go = true;
    }
    if (G.oldKeyboard[SDLK_5] === 0 && keyboard[SDLK_5] !== 0 && G.worldDoorsOpen[4]) {
      G.roomX = 8;
      G.roomY = 8;
      G.playerX = TILE_SIZE_X * 9;
      G.playerY = TILE_SIZE_Y * 5;
      go = true;
    }
    if (G.oldKeyboard[SDLK_6] === 0 && keyboard[SDLK_6] !== 0 && G.worldDoorsOpen[5]) {
      G.roomX = 14;
      G.roomY = 12;
      G.playerX = TILE_SIZE_X * 21;
      G.playerY = TILE_SIZE_Y * 5;
      go = true;
    }
    if (G.oldKeyboard[SDLK_7] === 0 && keyboard[SDLK_7] !== 0 && G.worldDoorsOpen[6]) {
      G.roomX = 5;
      G.roomY = 2;
      G.playerX = TILE_SIZE_X * 5;
      G.playerY = TILE_SIZE_Y * 17;
      go = true;
    }
    if (G.oldKeyboard[SDLK_8] === 0 && keyboard[SDLK_8] !== 0 && G.worldDoorsOpen[7]) {
      G.roomX = 4;
      G.roomY = 4;
      G.playerX = TILE_SIZE_X * 13;
      G.playerY = TILE_SIZE_Y * 17;
      go = true;
    }
    if (G.oldKeyboard[SDLK_9] === 0 && keyboard[SDLK_9] !== 0 && G.worldDoorsOpen[8]) {
      G.roomX = 7;
      G.roomY = 0;
      G.playerX = TILE_SIZE_X * 13;
      G.playerY = TILE_SIZE_Y * 5;
      go = true;
    }
    if (go) {
      G.state = State.Playing;
      G.subState = 1;
      G.playerState = 0;
      G.playerFrame = 0;
      loadRoom(G.world, G.roomX, G.roomY);
    }
  }

  if (keyboard[SDLK_ESCAPE] !== 0 && G.oldKeyboard[SDLK_ESCAPE] === 0) {
    G.oldState = G.state;
    G.menuOption = 0;
    G.state = State.Options;
  }
}

function resumeAfterReset(screen: Uint32Array, keyboard: Uint8Array): void {
  if (G.oldKeyboard[G.keyItem] === 0 && G.oldKeyboard[SDLK_RETURN] === 0) {
    G.state = State.Playing;
    G.subState = 1;
  }
}

function passage(screen: Uint32Array, keyboard: Uint8Array): void {
  let tmp: string;
  // INSIDE A PASSAGE, SHOP, ETC.:
  if (G.subState === 0) {
    G.subState = 1;
    G.selecting = 0;
    G.passageState = 0;
    G.shopItems[0] = true;
    G.shopItems[1] = true;
    G.shopItems[2] = true;
  }

  memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
  memset(G.collision!, 0, 0, SCREEN_X * SCREEN_Y);

  drawStats(screen);

  passageCycle(G.world, G.roomX, G.roomY, screen);

  if (G.oldKeyboard[G.keyDown] === 0 && keyboard[G.keyDown] !== 0) {
    G.state = State.Playing;
    G.subState = 1;
    // Restore the normal game music:
    stopMusic();
    const tmp2 = 'entering';
    if (G.world === 0) tmp = 'castle';
    else tmp = 'world';
    playMusic(tmp2, tmp, null);

    if (G.world !== 0) {
      G.roomY++;
      G.playerY = 0;
      G.playerState = S_DOWN_LADDER;
      G.playerFrame = 5;
    }
  }

  if (keyboard[SDLK_ESCAPE] !== 0 && G.oldKeyboard[SDLK_ESCAPE] === 0) {
    G.oldState = G.state;
    G.menuOption = 0;
    G.state = State.Options;
  }
}

function resumeAfterDown(screen: Uint32Array, keyboard: Uint8Array): void {
  if (G.oldKeyboard[G.keyDown] === 0) {
    G.state = State.Playing;
    G.subState = 1;
  }
}

function worldEntry(screen: Uint32Array, keyboard: Uint8Array): void {
  let tmp: string;
  // SHOWING THE WORLD OR CASTLE ENTRY MESSAGE:
  G.world3Room06Counter = 0;
  G.world5Room44State = 0;
  G.world5Room44State2 = 0;
  G.world5Room64State = 0;
  G.world6Room35State = 0;
  G.world7Room12State = 0;
  G.world8Room12State = 0;
  {
    let i: number;
    for (i = 0; i < MAX_AW_RECORD; i++) {
      G.appearwallRecordX[i] = -1;
      G.appearwallRecordY[i] = -1;
    }
  }

  if (G.subState === 0) {
    resetRoomMemory();
    stopMusic();
    if (G.world !== 0) playSound(sfx.gamestart);
  }

  memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
  memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
  memset(G.collision!, 0, 0, SCREEN_X * SCREEN_Y);

  drawStats(screen);

  if (G.world === 0) tmp = 'CASTLE !';
  else tmp = `WORLD ${G.world} !`;
  tilePrint(tmp, TILE_SIZE_X * 16, TILE_SIZE_Y * 12, screen);

  if (G.subState >= 30) {
    if (G.world === 0) {
      if (G.roomX === 5 && G.roomY === 9) {
        // Entering through the halo:
        if (G.subState === 30) {
          stopMusic();
          playMusic('castle', null, null);
        }
      } else {
        if (G.subState === 30) {
          stopMusic();
          playMusic('entering', 'castle', null);
        }

        G.playerState = S_ENTERING_WORLD;
        G.playerSubState = 33;
        G.enterCut = 32;
      }
    } else {
      stopMusic();
      playMusic('world', null, null);

      G.playerState = S_QUIET;
      G.playerSubState = 0;
      G.playerFrame = 0;
      G.facingRight = true;
      G.enterCut = 0;

      if (G.world === 1) {
        G.playerX = 16 * TILE_SIZE_X;
        G.playerY = TILE_SIZE_Y;
      }
      if (G.world === 2) {
        G.playerX = 15 * TILE_SIZE_X;
        G.playerY = 13 * TILE_SIZE_Y;
      }
      if (G.world === 3) {
        G.playerX = 15 * TILE_SIZE_X;
        G.playerY = 13 * TILE_SIZE_Y;
      }
      if (G.world === 4) {
        G.world4State = 0;
        G.playerX = 3 * TILE_SIZE_X;
        G.playerY = 17 * TILE_SIZE_Y;
      }
      if (G.world === 5) {
        G.playerX = 27 * TILE_SIZE_X;
        G.playerY = 9 * TILE_SIZE_Y;
      }
      if (G.world === 6) {
        G.playerX = 16 * TILE_SIZE_X;
        G.playerY = TILE_SIZE_Y;
      }
      if (G.world === 7) {
        G.playerX = 16 * TILE_SIZE_X;
        G.playerY = 17 * TILE_SIZE_Y;
      }
      if (G.world === 8) {
        G.playerX = 15 * TILE_SIZE_X;
        G.playerY = 1 * TILE_SIZE_Y;
      }
      if (G.world === 9) {
        G.playerX = 3 * TILE_SIZE_X;
        G.playerY = 1 * TILE_SIZE_Y;
      }
      if (G.world === 10) {
        G.playerX = 2 * TILE_SIZE_X;
        G.playerY = 1 * TILE_SIZE_Y;
      }
    }
    G.state = State.Playing;
    G.subState = 0;
  } else {
    G.subState++;
  }
}

function redefineKeys(screen: Uint32Array, keyboard: Uint8Array): void {
  let tmp: string;
  // REDEFINING KEYS!!!
  let found: boolean;
  let i: number;

  memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
  memset(G.collision!, 0, 0, SCREEN_X * SCREEN_Y);

  tmp = '';

  // NOTE (original): sprintf(tmp, keyName(...)) uses the key name as format string.
  if (G.subState >= 0) {
    tilePrint('PRESS A KEY FOR UP:', TILE_SIZE_X * 2, TILE_SIZE_Y * 2, screen);
  }
  if (G.subState >= 1) {
    tmp = keyName(G.keyUp);
    tilePrint(tmp.toUpperCase(), TILE_SIZE_X * 26, TILE_SIZE_Y * 2, screen);
    tilePrint('PRESS A KEY FOR DOWN:', TILE_SIZE_X * 2, TILE_SIZE_Y * 4, screen);
  }
  if (G.subState >= 2) {
    tmp = keyName(G.keyDown);
    tilePrint(tmp.toUpperCase(), TILE_SIZE_X * 26, TILE_SIZE_Y * 4, screen);
    tilePrint('PRESS A KEY FOR LEFT:', TILE_SIZE_X * 2, TILE_SIZE_Y * 6, screen);
  }
  if (G.subState >= 3) {
    tmp = keyName(G.keyLeft);
    tilePrint(tmp.toUpperCase(), TILE_SIZE_X * 26, TILE_SIZE_Y * 6, screen);
    tilePrint('PRESS A KEY FOR RIGHT:', TILE_SIZE_X * 2, TILE_SIZE_Y * 8, screen);
  }
  if (G.subState >= 4) {
    tmp = keyName(G.keyRight);
    tilePrint(tmp.toUpperCase(), TILE_SIZE_X * 26, TILE_SIZE_Y * 8, screen);
    tilePrint('PRESS A KEY FOR SWORD:', TILE_SIZE_X * 2, TILE_SIZE_Y * 10, screen);
  }
  if (G.subState >= 5) {
    tmp = keyName(G.keySword);
    tilePrint(tmp.toUpperCase(), TILE_SIZE_X * 26, TILE_SIZE_Y * 10, screen);
    tilePrint('PRESS A KEY FOR WEAPON:', TILE_SIZE_X * 2, TILE_SIZE_Y * 12, screen);
  }
  if (G.subState >= 6) {
    tmp = keyName(G.keyWeapon);
    tilePrint(tmp.toUpperCase(), TILE_SIZE_X * 26, TILE_SIZE_Y * 12, screen);
    tilePrint('PRESS A KEY FOR ITEM:', TILE_SIZE_X * 2, TILE_SIZE_Y * 14, screen);
  }
  if (G.subState >= 7) {
    tmp = keyName(G.keyItem);
    tilePrint(tmp.toUpperCase(), TILE_SIZE_X * 26, TILE_SIZE_Y * 14, screen);
    tilePrint('PRESS A KEY FOR PAUSE:', TILE_SIZE_X * 2, TILE_SIZE_Y * 16, screen);
  }
  if (G.subState >= 8) {
    tmp = keyName(G.keyPause);
    tilePrint(tmp.toUpperCase(), TILE_SIZE_X * 26, TILE_SIZE_Y * 16, screen);
  }

  tilePrint('TO GO TO THE TITLE SCREEN PRESS:  ESC', TILE_SIZE_X * 2, TILE_SIZE_Y * 18, screen);
  tilePrint('TO EXIT THE GAME PRESS:   F12/APPLE+Q', TILE_SIZE_X * 2, TILE_SIZE_Y * 19, screen);
  tilePrint('TO CHANGE THE ZOOM:         PGUP:PGDN', TILE_SIZE_X * 2, TILE_SIZE_Y * 20, screen);

  found = false;
  for (i = 0; !found && i < SDLK_LAST; i++) {
    if (keyboard[i] !== 0 && G.oldKeyboard[i] === 0) {
      switch (G.subState) {
        case 0:
          G.keyUp = i;
          G.subState++;
          found = true;
          break;
        case 1:
          G.keyDown = i;
          G.subState++;
          found = true;
          break;
        case 2:
          G.keyLeft = i;
          G.subState++;
          found = true;
          break;
        case 3:
          G.keyRight = i;
          G.subState++;
          found = true;
          break;
        case 4:
          G.keySword = i;
          G.subState++;
          found = true;
          break;
        case 5:
          G.keyWeapon = i;
          G.subState++;
          found = true;
          break;
        case 6:
          G.keyItem = i;
          G.subState++;
          found = true;
          break;
        case 7:
          G.keyPause = i;
          G.subState++;
          found = true;
          break;
      }
    }
  }

  if (
    G.subState === 8 &&
    ((keyboard[SDLK_SPACE] !== 0 && G.oldKeyboard[SDLK_SPACE] === 0) ||
      (keyboard[SDLK_RETURN] !== 0 && G.oldKeyboard[SDLK_RETURN] === 0) ||
      (keyboard[SDLK_ESCAPE] !== 0 && G.oldKeyboard[SDLK_ESCAPE] === 0) ||
      (keyboard[SDLK_k] !== 0 && G.oldKeyboard[SDLK_k] === 0))
  ) {
    G.state = State.TitleMenu;
    G.subState = 0;
    // NOTE (original): saved as "MoG.cfg" but loaded as "mog.cfg" (case 0); the same
    // file only on a case-insensitive file system.
    saveConfig('MoG.cfg');
  }
}

function characterDead(screen: Uint32Array, keyboard: Uint8Array): void {
  let tmp: string;
  // CHARACTER DEAD MESSAGE:
  let i: number, j: number;

  j = G.subState * TILE_SIZE_X;
  if (j > SCREEN_X) j = SCREEN_X;
  if (j > 0) {
    for (i = 0; i < SCREEN_Y; i++) {
      memset(screen, i * SCREEN_X, paletteColor(0), j);
    }
  }

  if (G.subState >= 40) {
    if (G.subState === 40) {
      if (!G.characterAlive[1] && !G.characterAlive[0]) {
        G.zeusUsed = false;
        playSound(sfx.gameover);
      }
    }
    if (!G.characterAlive[0] && G.characterAlive[1]) {
      tilePrint('POPOLON OUT', TILE_SIZE_X * 14, TILE_SIZE_Y * 12, screen);
    }
    if (!G.characterAlive[1] && G.characterAlive[0]) {
      tilePrint('APHRODITE OUT', TILE_SIZE_X * 13, TILE_SIZE_Y * 12, screen);
    }
    if (!G.characterAlive[1] && !G.characterAlive[0]) {
      tilePrint('GAME OVER', TILE_SIZE_X * 15, TILE_SIZE_Y * 12, screen);
      if (G.zeusPassword && !G.zeusUsed) {
        tilePrint('F5 CONTINUE', TILE_SIZE_X * 14, TILE_SIZE_Y * 14, screen);
        if (keyboard[SDLK_F5] !== 0 && G.oldKeyboard[SDLK_F5] === 0) {
          G.zeusUsed = true;
        }
      }
    }
  }

  if (G.characterAlive[1] || G.characterAlive[0]) {
    if (G.subState > 72) {
      j = (G.subState - 72) * TILE_SIZE_X;
      if (j > SCREEN_X) j = SCREEN_X;
      if (j > 0) {
        for (i = 0; i < SCREEN_Y; i++) {
          memset(screen, i * SCREEN_X, paletteColor(0), j);
        }
      }
    }
  } else {
    if (G.subState > 160) {
      j = (G.subState - 160) * TILE_SIZE_X;
      if (j > SCREEN_X) j = SCREEN_X;
      if (j > 0) {
        for (i = 0; i < SCREEN_Y; i++) {
          memset(screen, i * SCREEN_X, paletteColor(0), j);
        }
      }
    }
  }

  drawStats(screen);

  if (G.characterAlive[1] || G.characterAlive[0]) {
    if (G.subState >= 120) {
      let tmpX: number, tmpY: number, heur: number, actHeur: number;
      const collision = T_WALL | T_LADDER_WALL | T_DOOR_WALL;

      // Reinitialise the room:
      forgetDistantRooms(G.roomX, G.roomY);
      loadRoom(G.world, G.roomX, G.roomY);
      restoreRoomMemory(G.roomX, G.roomY);

      memset(G.collision!, 0, 0, SCREEN_X * SCREEN_Y);
      drawMap(screen, 1);
      memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);

      // Compute the new position of the character in the room:
      G.character = 1 - G.character;
      tmpX = 8;
      tmpY = 4;
      actHeur = (15 - 7) * (15 - 7) + (10 - 3) * (10 - 3);
      for (i = 2; i < 16; i++) {
        for (j = 8; j < 22; j++) {
          if (
            isWallOrBlocker(j, i) &&
            isWallOrBlocker(j + 1, i) &&
            !isWallOrBlocker(j, i - 1) &&
            !isWallOrBlocker(j + 1, i - 1) &&
            !isWallOrBlocker(j, i - 2) &&
            !isWallOrBlocker(j + 1, i - 2) &&
            (tileHits(
              tileIds.character[G.character] + MASK_OFFSET,
              GAME_VIEW_X + j * TILE_SIZE_X,
              GAME_VIEW_Y + (i - 2) * TILE_SIZE_Y,
            ) &
              collision) ===
              0
          ) {
            heur = (15 - j) * (15 - j) + (9 - i) * (9 - i);
            if (heur < actHeur) {
              tmpX = j;
              tmpY = i;
              actHeur = heur;
            }
          }
        }
      }
      G.playerX = tmpX * TILE_SIZE_X;
      G.playerY = (tmpY - 2) * TILE_SIZE_Y;
      G.playerState = S_QUIET;
      G.playerSubState = 0;
      G.playerFrame = 0;
      G.firedArrows = 0;
      G.firedMines = 0;
      G.onLadder = findLadder(G.playerX, G.playerY);

      if (G.fightingDemon !== 0) {
        releaseGraphics();
        loadGraphics();

        stopMusic();
        playMusic('demonroom2', 'demonroom1', null);
      } else {
        stopMusic();
        if (G.world === 0) tmp = 'castle';
        else tmp = 'world';
        playMusic(tmp, null, null);
      }
      G.oldRoomDemonroom = false;
      G.fightingDemon = 0;
      G.state = State.Playing;
      G.subState = 0;
    } else {
      G.subState++;
    }
  } else {
    if (G.subState >= 208) {
      if (G.zeusUsed) {
        G.world = 0;
        G.roomX = 5;
        G.roomY = 12;

        G.firedArrows = 0;
        G.firedMines = 0;
        // NOTE (original): "experience[0]=experience[0]=0"; [1] is not reset.
        G.experience[0] = G.experience[0] = 0;
        G.shownEnergy[0] = G.energy[0] = G.maxEnergy[0];
        G.shownEnergy[1] = G.energy[1] = G.maxEnergy[1];
        // NOTE (original): same for shownExperience.
        G.shownExperience[0] = G.shownExperience[0] = 0;
        G.characterAlive[0] = G.characterAlive[1] = true;
        G.character = 0;
        G.frozen = 0;

        G.oldRoomDemonroom = false;
        G.playerX = 20 * TILE_SIZE_X;
        G.playerY = 9 * TILE_SIZE_Y;
        G.facingRight = true;
        G.playerFrame = 0;
        G.playerState = S_QUIET;
        G.playerSubState = 0;
        G.currentWeapon = -1;
        G.fightingDemon = 0;
        G.enterCut = 0;
        G.mineStepped = false;
        G.bibleCounter = 16;
        G.bibleSubcounter = 0;
        G.canRevive[0] = G.canRevive[1] = true;

        releaseGraphics();
        loadGraphics();

        stopMusic();
        playMusic('castle', null, null);
        G.state = State.Playing;
        G.subState = 0;
      } else {
        G.state = State.KonamiAppear;
        G.subState = 0;
      }
    } else {
      G.subState++;
    }
  }

  if (keyboard[SDLK_ESCAPE] !== 0 && G.oldKeyboard[SDLK_ESCAPE] === 0) {
    G.oldState = G.state;
    G.menuOption = 0;
    G.state = State.Options;
  }
}

function tomb(screen: Uint32Array, keyboard: Uint8Array): void {
  // LOOKING AT A TOMB:
  if (G.subState === 0) {
    stopMusic();
    // Music for looking through the magnifying glass:
    playMusic('tomb1', 'tomb2', null);
    G.subState = 1;
  }

  memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
  memset(G.collision!, 0, 0, SCREEN_X * SCREEN_Y);

  drawStats(screen);

  // Draw the magnifying glass:
  drawTile(
    screen,
    tileIds.magnifier,
    GAME_VIEW_X + TILE_SIZE_X * 4,
    GAME_VIEW_Y + TILE_SIZE_Y * 2,
    TILE_SIZE_X * 24,
    TILE_SIZE_Y * 12,
  );

  if (G.world === 1 && G.roomX === 2 && G.roomY === 7)
    tilePrintOpaque(
      'YOMAR',
      GAME_VIEW_X + TILE_SIZE_X * 13 + idiv(TILE_SIZE_X, 2),
      GAME_VIEW_Y + TILE_SIZE_Y * 6 + idiv(TILE_SIZE_Y, 2),
      screen,
    );
  if (G.world === 2 && G.roomX === 4 && G.roomY === 1)
    tilePrintOpaque(
      'ELOHIM',
      GAME_VIEW_X + TILE_SIZE_X * 13,
      GAME_VIEW_Y + TILE_SIZE_Y * 6 + idiv(TILE_SIZE_Y, 2),
      screen,
    );
  if (G.world === 3 && G.roomX === 2 && G.roomY === 4)
    tilePrintOpaque(
      'HAHAKLA',
      GAME_VIEW_X + TILE_SIZE_X * 13 - idiv(TILE_SIZE_X, 2),
      GAME_VIEW_Y + TILE_SIZE_Y * 6 + idiv(TILE_SIZE_Y, 2),
      screen,
    );
  if (G.world === 4 && G.roomX === 4 && G.roomY === 0)
    tilePrintOpaque(
      'BARECHET',
      GAME_VIEW_X + TILE_SIZE_X * 12,
      GAME_VIEW_Y + TILE_SIZE_Y * 6 + idiv(TILE_SIZE_Y, 2),
      screen,
    );
  if (G.world === 5 && G.roomX === 1 && G.roomY === 2)
    tilePrintOpaque(
      'HEOTYMEO',
      GAME_VIEW_X + TILE_SIZE_X * 12,
      GAME_VIEW_Y + TILE_SIZE_Y * 6 + idiv(TILE_SIZE_Y, 2),
      screen,
    );
  if (G.world === 6 && G.roomX === 1 && G.roomY === 3)
    tilePrintOpaque(
      'LEPHA',
      GAME_VIEW_X + TILE_SIZE_X * 13 + idiv(TILE_SIZE_X, 2),
      GAME_VIEW_Y + TILE_SIZE_Y * 6 + idiv(TILE_SIZE_Y, 2),
      screen,
    );
  if (G.world === 7 && G.roomX === 4 && G.roomY === 4)
    tilePrintOpaque(
      'NAWABRA',
      GAME_VIEW_X + TILE_SIZE_X * 12 + idiv(TILE_SIZE_X, 2),
      GAME_VIEW_Y + TILE_SIZE_Y * 6 + idiv(TILE_SIZE_Y, 2),
      screen,
    );
  if (G.world === 8 && G.roomX === 3 && G.roomY === 3)
    tilePrintOpaque(
      'ASCHER',
      GAME_VIEW_X + TILE_SIZE_X * 13,
      GAME_VIEW_Y + TILE_SIZE_Y * 6 + idiv(TILE_SIZE_Y, 2),
      screen,
    );
  if (G.world === 9 && G.roomX === 1 && G.roomY === 0)
    tilePrintOpaque(
      'XYWOLEH',
      GAME_VIEW_X + TILE_SIZE_X * 12 + idiv(TILE_SIZE_X, 2),
      GAME_VIEW_Y + TILE_SIZE_Y * 6 + idiv(TILE_SIZE_Y, 2),
      screen,
    );
  if (G.world === 10)
    tilePrintOpaque(
      'HAMALECH',
      GAME_VIEW_X + TILE_SIZE_X * 12,
      GAME_VIEW_Y + TILE_SIZE_Y * 6 + idiv(TILE_SIZE_Y, 2),
      screen,
    );

  if (
    (G.oldKeyboard[G.keyWeapon] === 0 && keyboard[G.keyWeapon] !== 0) ||
    (G.oldKeyboard[G.keySword] === 0 && keyboard[G.keySword] !== 0)
  ) {
    G.state = State.LeaveTomb;
    G.subState = 0;
  }

  if (keyboard[SDLK_ESCAPE] !== 0 && G.oldKeyboard[SDLK_ESCAPE] === 0) {
    G.oldState = G.state;
    G.menuOption = 0;
    G.state = State.Options;
  }
}

function leaveTomb(screen: Uint32Array, keyboard: Uint8Array): void {
  let tmp: string;
  if (keyboard[G.keyWeapon] === 0) {
    G.state = State.Playing;
    G.subState = 1;
    stopMusic();
    if (G.world === 0) tmp = 'castle';
    else tmp = 'world';
    playMusic(tmp, null, null);
  }
}

function passwordEntry(screen: Uint32Array, keyboard: Uint8Array): void {
  let tmp: string;
  let i: number, j: number;
  const ypos = [8, 10, 12];
  const xpos = [10, 11, 12, 13, 15, 16, 17, 18, 20, 21, 22, 23, 25, 26, 27, 28];
  let x: number, y: number;
  // password[k] as a C char (NUL past the end of the string).
  const pc = (k: number): string => (k < G.password.length ? G.password[k] : '\0');
  // tilePrint stops at the first NUL of buf.
  const cstr = (s: string): string => {
    const z = s.indexOf('\0');
    return z < 0 ? s : s.slice(0, z);
  };
  let buf: string;

  // Entering the code!!!!:
  memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
  tilePrint('h F5 TO F9', TILE_SIZE_X * 9, TILE_SIZE_Y * 2, screen);

  tilePrint('ENTER THE SECRET', TILE_SIZE_X * 9, TILE_SIZE_Y * 4, screen);
  tilePrint('CODE AND PRESS', TILE_SIZE_X * 9, TILE_SIZE_Y * 5, screen);
  tilePrint('RETURN KEY.', TILE_SIZE_X * 9, TILE_SIZE_Y * 6, screen);

  buf =
    pc(0) +
    pc(1) +
    pc(2) +
    pc(3) +
    ' ' +
    pc(4) +
    pc(5) +
    pc(6) +
    pc(7) +
    ' ' +
    pc(8) +
    pc(9) +
    pc(10) +
    pc(11) +
    ' ' +
    pc(12) +
    pc(13) +
    pc(14) +
    pc(15);
  tilePrint(cstr(buf), TILE_SIZE_X * 10, TILE_SIZE_Y * 8, screen);

  buf =
    pc(16) +
    pc(17) +
    pc(18) +
    pc(19) +
    ' ' +
    pc(20) +
    pc(21) +
    pc(22) +
    pc(23) +
    ' ' +
    pc(24) +
    pc(25) +
    pc(26) +
    pc(27) +
    ' ' +
    pc(28) +
    pc(29) +
    pc(30) +
    pc(31);
  tilePrint(cstr(buf), TILE_SIZE_X * 10, TILE_SIZE_Y * 10, screen);

  buf =
    pc(32) +
    pc(33) +
    pc(34) +
    pc(35) +
    ' ' +
    pc(36) +
    pc(37) +
    pc(38) +
    pc(39) +
    ' ' +
    pc(40) +
    pc(41) +
    pc(42) +
    pc(43) +
    ' ' +
    pc(44) +
    ' ' +
    ' ' +
    ' ';
  tilePrint(cstr(buf), TILE_SIZE_X * 10, TILE_SIZE_Y * 12, screen);

  // Draw the cursor:
  x = xpos[G.passwordPos % 16];
  y = ypos[idiv(G.passwordPos, 16)];
  strokeRect(screen, x * TILE_SIZE_X - 1, y * TILE_SIZE_Y - 1, TILE_SIZE_X, TILE_SIZE_Y, SCREEN_X, paletteColor(180));

  if (G.subState === 0) {
    let slot = -1;
    // Load the game from disk (browser storage):

    if (G.oldKeyboard[SDLK_F5] === 0 && keyboard[SDLK_F5] !== 0) slot = 1;
    if (G.oldKeyboard[SDLK_F6] === 0 && keyboard[SDLK_F6] !== 0) slot = 2;
    if (G.oldKeyboard[SDLK_F7] === 0 && keyboard[SDLK_F7] !== 0) slot = 3;
    if (G.oldKeyboard[SDLK_F8] === 0 && keyboard[SDLK_F8] !== 0) slot = 4;
    if (G.oldKeyboard[SDLK_F9] === 0 && keyboard[SDLK_F9] !== 0) slot = 5;

    if (slot !== -1) {
      const saved = readSaveSlot(slot);
      // Copies 48 chars. NOTE (original): for an empty slot
      // emscripten_run_script_string returns NULL, which is read anyway
      // (zero bytes in a release build): the password becomes empty.
      G.password = saved === null ? '\0'.repeat(48) : saved.slice(0, 48);
      playSound(sfx.select);
    }

    if (G.oldKeyboard[SDLK_ESCAPE] === 0 && keyboard[SDLK_ESCAPE] !== 0) {
      G.state = State.KonamiAppear;
      G.subState = 0;
    }

    if (G.oldKeyboard[SDLK_RETURN] === 0 && keyboard[SDLK_RETURN] !== 0) {
      if (readPassword(G.password)) G.subState = 2;
      else G.subState = 1;
    }
    if (G.oldKeyboard[SDLK_LEFT] === 0 && keyboard[SDLK_LEFT] !== 0 && G.passwordPos > 0) G.passwordPos--;
    if (G.oldKeyboard[SDLK_RIGHT] === 0 && keyboard[SDLK_RIGHT] !== 0 && G.passwordPos < 44) G.passwordPos++;
    // One test per key, in the original order 0-9, A-Z (36 ifs in the C++):
    for (const [key, ch] of PASSWORD_KEYS) {
      if (G.oldKeyboard[key] === 0 && keyboard[key] !== 0) {
        G.password = setCharAt(G.password, G.passwordPos, ch);
        G.passwordPos++;
      }
    }

    if (G.passwordPos > 44) G.passwordPos = 44;
  }

  if (G.subState === 1) {
    tilePrint('THAT IS THE WRONG', TILE_SIZE_X * 9, TILE_SIZE_Y * 17, screen);
    tilePrint('CODE', TILE_SIZE_X * 9, TILE_SIZE_Y * 19, screen);
    if (G.oldKeyboard[SDLK_RETURN] === 0 && keyboard[SDLK_RETURN] !== 0) G.subState = 0;
  }
  if (G.subState >= 2) {
    tilePrint('MY MEMORY HAS BEEN', TILE_SIZE_X * 9, TILE_SIZE_Y * 17, screen);
    tilePrint('BROUGHT BACK!', TILE_SIZE_X * 9, TILE_SIZE_Y * 18, screen);
    tilePrint('DEFEAT GALIOUS AND', TILE_SIZE_X * 9, TILE_SIZE_Y * 19, screen);
    tilePrint('SAVE PAMPERSE AS', TILE_SIZE_X * 9, TILE_SIZE_Y * 20, screen);
    tilePrint('SOON AS POSSIBLE! GO!', TILE_SIZE_X * 9, TILE_SIZE_Y * 21, screen);
    G.subState++;

    if (G.subState > 66) {
      j = (G.subState - 66) * TILE_SIZE_X;
      if (j > SCREEN_X) j = SCREEN_X;
      if (j > 0) {
        for (i = 0; i < SCREEN_Y; i++) {
          memset(screen, i * SCREEN_X, paletteColor(0), j);
        }
      }
    }

    if (G.subState >= 112) {
      if (G.world === 0) tmp = 'castle';
      else tmp = 'world';
      playMusic(tmp, null, null);
      G.state = State.Playing;
      G.subState = 0;
      newGame();
    }
  }
}

function devStart(screen: Uint32Array, keyboard: Uint8Array): void {
  let tmp: string;
  let filename: string;

  // Developers entry code:
  memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);

  tilePrint('START ROOM:', TILE_SIZE_X * 9, TILE_SIZE_Y * 2, screen);

  tmp = `ROOM X: ${fmtInt(G.devStartX, 2)}`;
  tilePrint(tmp, TILE_SIZE_X * 9, TILE_SIZE_Y * 4, screen);
  tmp = `ROOM Y: ${fmtInt(G.devStartY, 2)}`;
  tilePrint(tmp, TILE_SIZE_X * 9, TILE_SIZE_Y * 5, screen);
  tmp = `MAP: ${fmtInt(G.devStartWorld, 2)}`;
  tilePrint(tmp, TILE_SIZE_X * 9, TILE_SIZE_Y * 6, screen);

  if (keyboard[G.keyUp] !== 0 && G.oldKeyboard[G.keyUp] === 0) {
    if (G.devStartY > 0) G.devStartY--;
  }
  if (keyboard[G.keyDown] !== 0 && G.oldKeyboard[G.keyDown] === 0) {
    if (G.devStartY < 15) G.devStartY++;
  }
  if (keyboard[G.keyLeft] !== 0 && G.oldKeyboard[G.keyLeft] === 0) {
    if (G.devStartX > 0) G.devStartX--;
  }
  if (keyboard[G.keyRight] !== 0 && G.oldKeyboard[G.keyRight] === 0) {
    if (G.devStartX < 14) G.devStartX++;
  }
  if (keyboard[SDLK_PAGEDOWN] !== 0 && G.oldKeyboard[SDLK_PAGEDOWN] === 0) {
    if (G.devStartWorld > 0) G.devStartWorld--;
  }
  if (keyboard[SDLK_PAGEUP] !== 0 && G.oldKeyboard[SDLK_PAGEUP] === 0) {
    if (G.devStartWorld < 10) G.devStartWorld++;
  }

  filename = `rooms/${ROOM_PREFIXES[G.devStartWorld]}${fmtInt(G.devStartX, 2)}${fmtInt(G.devStartY, 2)}.txt`;
  if (readText(filename) !== null) {
    tilePrint('PRESS SPACE TO START', TILE_SIZE_X * 9, TILE_SIZE_Y * 8, screen);
    if (keyboard[SDLK_SPACE] !== 0 && G.oldKeyboard[SDLK_SPACE] === 0) {
      G.password = 'UR3QUR5FUG4F123NUL7WHUD4VT7WHUD4VYTFUR3FURS76';
      G.state = State.PlayStart;
      G.subState = 30;
    }
  } else {
    tilePrint('NOT VALID ROOM', TILE_SIZE_X * 9, TILE_SIZE_Y * 8, screen);
  }
}

function interScreen(screen: Uint32Array, keyboard: Uint8Array): void {
  // INTER-SCREEN
  if (G.interScreen === 0) {
    G.state = State.Playing;
  } else {
    memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
    G.interScreen--;
  }
}

function story(screen: Uint32Array, keyboard: Uint8Array): void {
  // STORY SCREEN:
  let i: number;
  let y = 0,
    tmpy: number;

  if (G.subState === 0) {
    // music:
    playMusic('story', null, null);
  }

  G.subState++;

  if (G.subState < 27 * TILE_SIZE_Y) y = 27 * TILE_SIZE_Y - G.subState;
  if (G.subState >= 27 * TILE_SIZE_Y && G.subState < 39 * TILE_SIZE_Y) y = 0;
  if (G.subState >= 39 * TILE_SIZE_Y) y = 39 * TILE_SIZE_Y - G.subState;

  memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
  for (i = 0; i < 12; i++) {
    tmpy = y + i * TILE_SIZE_Y * 2;
    if (tmpy < 25 * TILE_SIZE_Y && tmpy > -TILE_SIZE_Y) {
      tilePrint(STORY_TEXT[i], GAME_VIEW_X + TILE_SIZE_X * 2, tmpy, screen);
    }
  }

  if (G.subState >= 64 * TILE_SIZE_Y || (keyboard[SDLK_SPACE] !== 0 && G.oldKeyboard[SDLK_SPACE] === 0)) {
    // music:
    stopMusic();
    G.state = State.KonamiAppear;
    G.subState = 0;
  }
}

function ending(screen: Uint32Array, keyboard: Uint8Array): void {
  // ENDING SEQUENCE!!!!:
  G.subState++;
  if (G.subState < 40) {
    let i: number;

    const j = idiv(G.subState, 4) * TILE_SIZE_X;
    for (i = 0; i < G.roomHeight * TILE_SIZE_Y; i++) {
      memset(screen, (GAME_VIEW_Y + i) * SCREEN_X + GAME_VIEW_X, paletteColor(0), j);
      memset(screen, (GAME_VIEW_Y + i) * SCREEN_X + GAME_VIEW_X + (G.roomWidth * TILE_SIZE_X - j), paletteColor(0), j);
    }
    for (i = 0; i < TILE_SIZE_Y; i++) {
      memset(
        screen,
        (GAME_VIEW_Y + idiv(G.subState, 4) * TILE_SIZE_Y + i) * SCREEN_X + GAME_VIEW_X,
        paletteColor(0),
        G.roomWidth * TILE_SIZE_X,
      );
      memset(
        screen,
        (GAME_VIEW_Y + (G.roomHeight - (idiv(G.subState, 4) + 1)) * TILE_SIZE_Y + i) * SCREEN_X + GAME_VIEW_X,
        paletteColor(0),
        G.roomWidth * TILE_SIZE_X,
      );
    }
    for (i = 0; i < G.objectCount; i++) {
      if (G.objects[i].type === T_PAMPERSE) {
        drawTile(screen, 182, GAME_VIEW_X + G.objects[i].x, GAME_VIEW_Y + G.objects[i].y);
      }
    }
    drawCharacter(screen);
  }

  if (G.subState === 96) {
    stopMusic();
    memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);

    // for(i=0;i<8;i++) delete tiles[demonTile+i]; (garbage collected)
    G.tiles[tileIds.demon] = new Tile(gfx.final!, 0, 0, TILE_SIZE_X * 20, TILE_SIZE_Y * 14, T_NADA);

    G.tiles[tileIds.demon + 1] = new Tile(gfx.final!, TILE_SIZE_X * 20, 0, TILE_SIZE_X * 6, TILE_SIZE_Y * 2, T_NADA);
    G.tiles[tileIds.demon + 2] = new Tile(
      gfx.final!,
      TILE_SIZE_X * 20,
      TILE_SIZE_Y * 2,
      TILE_SIZE_X * 6,
      TILE_SIZE_Y * 2,
      T_NADA,
    );
    G.tiles[tileIds.demon + 3] = new Tile(
      gfx.final!,
      TILE_SIZE_X * 20,
      TILE_SIZE_Y * 4,
      TILE_SIZE_X * 6,
      TILE_SIZE_Y * 2,
      T_NADA,
    );
    G.tiles[tileIds.demon + 4] = new Tile(
      gfx.final!,
      TILE_SIZE_X * 26,
      TILE_SIZE_Y * 2,
      TILE_SIZE_X * 2,
      TILE_SIZE_Y * 2,
      T_NADA,
    );
    G.tiles[tileIds.demon + 5] = new Tile(gfx.final!, TILE_SIZE_X * 26, 0, TILE_SIZE_X * 2, TILE_SIZE_Y * 2, T_NADA);
    G.tiles[tileIds.demon + 6] = new Tile(gfx.final!, TILE_SIZE_X * 28, 0, TILE_SIZE_X * 2, TILE_SIZE_Y * 2, T_NADA);
    G.tiles[tileIds.demon + 7] = new Tile(gfx.final!, TILE_SIZE_X * 30, 0, TILE_SIZE_X * 8, TILE_SIZE_Y * 4, T_NADA);
  }

  if (G.subState === 128) {
    stopMusic();
    playMusic('end1', null, null);
  }
  if (G.subState >= 128 && G.subState < 464) {
    memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
    // POPOLON AND APHRODITE:
    drawTileNative(
      screen,
      tileIds.demon + 1 + ((G.subState >> 4) % 2),
      GAME_VIEW_X + 13 * TILE_SIZE_X + idiv(TILE_SIZE_X, 2),
      GAME_VIEW_Y + 8 * TILE_SIZE_Y,
    );

    // PAMPERSE:
    {
      let y = 10 * TILE_SIZE_Y - (G.subState - 256);
      if (y >= 10 * TILE_SIZE_Y) y = 10 * TILE_SIZE_Y;
      if (y <= 8 * TILE_SIZE_Y) y = 8 * TILE_SIZE_Y;
      drawTileNative(screen, tileIds.demon + 3, GAME_VIEW_X + 13 * TILE_SIZE_X + idiv(TILE_SIZE_X, 2), GAME_VIEW_Y + y);
    }

    // CASTLE:
    drawTileNative(screen, tileIds.demon, GAME_VIEW_X + 6 * TILE_SIZE_X, GAME_VIEW_Y);
    // FIREWORKS:
    {
      const i = (G.subState >> 4) % 4;

      if (i === 0) {
        drawTileNative(
          screen,
          tileIds.demon + 6,
          GAME_VIEW_X + 18 * TILE_SIZE_X + idiv(TILE_SIZE_X, 2),
          GAME_VIEW_Y + 1 * TILE_SIZE_Y + idiv(TILE_SIZE_Y, 2),
        );
      }
      if (i === 2) {
        drawTileNative(
          screen,
          tileIds.demon + 6,
          GAME_VIEW_X + 12 * TILE_SIZE_X,
          GAME_VIEW_Y + 1 * TILE_SIZE_Y + idiv(TILE_SIZE_Y, 2),
        );
      }
    }

    // FLAG:
    if (G.subState < 196) {
      drawTileNative(
        screen,
        tileIds.demon + 4,
        GAME_VIEW_X + 16 * TILE_SIZE_X,
        GAME_VIEW_Y + 2 * TILE_SIZE_Y + TILE_UNIT * 2,
      );
    }
    if (G.subState >= 192 && G.subState < 224) {
      drawTileNative(
        screen,
        tileIds.demon + 4,
        GAME_VIEW_X + 16 * TILE_SIZE_X,
        GAME_VIEW_Y + 2 * TILE_SIZE_Y + (G.subState - 192) + TILE_UNIT * 2,
      );
    }
    if (G.subState >= 224 && G.subState < 256) {
      drawTileNative(
        screen,
        tileIds.demon + 5,
        GAME_VIEW_X + 16 * TILE_SIZE_X,
        GAME_VIEW_Y + 2 * TILE_SIZE_Y + (32 - (G.subState - 224)) + TILE_UNIT * 2,
      );
    }
    if (G.subState >= 256) {
      drawTileNative(
        screen,
        tileIds.demon + 5,
        GAME_VIEW_X + 16 * TILE_SIZE_X,
        GAME_VIEW_Y + 2 * TILE_SIZE_Y + TILE_UNIT * 2,
      );
    }

    // SHOUTS:
    if (G.subState >= 320) {
      drawTileNative(screen, tileIds.demon + 7, GAME_VIEW_X + 20 * TILE_SIZE_X, GAME_VIEW_Y + 9 * TILE_SIZE_Y);
    }
  }

  if (G.subState === 464) {
    memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
    stopMusic();
  }

  if (G.subState === 512) {
    playMusic('end2', null, null);
  }

  if (G.subState >= 512) {
    let i: number;
    let y = 0,
      tmpy: number;

    if (G.subState < 512 + 27 * TILE_SIZE_Y) y = 27 * TILE_SIZE_Y - (G.subState - 512);
    if (G.subState >= 512 + 27 * TILE_SIZE_Y && G.subState < 512 + 39 * TILE_SIZE_Y) y = 0;
    if (G.subState >= 512 + 39 * TILE_SIZE_Y && G.subState < 512 + 157 * TILE_SIZE_Y)
      y = 39 * TILE_SIZE_Y - (G.subState - 512);
    if (G.subState >= 512 + 157 * TILE_SIZE_Y && G.subState < 512 + 169 * TILE_SIZE_Y) y = -118 * TILE_SIZE_Y;
    if (G.subState >= 512 + 169 * TILE_SIZE_Y) y = 51 * TILE_SIZE_Y - (G.subState - 512);

    memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);
    for (i = 0; i < 68; i++) {
      tmpy = y + i * TILE_SIZE_Y * 2;
      if (tmpy < 25 * TILE_SIZE_Y && tmpy > -TILE_SIZE_Y) {
        tilePrint(EPILOGUE_TEXT[i], GAME_VIEW_X + TILE_SIZE_X * 2, tmpy, screen);
      }
    }
  }

  if (G.subState >= 3500) {
    stopMusic();
    G.state = State.KonamiAppear;
    G.subState = 0;
  }
}

function options(screen: Uint32Array, keyboard: Uint8Array): void {
  let tmp: string;
  // OPTIONS MENU:
  memset(screen, 0, paletteColor(0), SCREEN_X * SCREEN_Y);

  fillRect(
    screen,
    TILE_SIZE_X * 10,
    TILE_SIZE_Y * 5 + G.menuOption * TILE_SIZE_Y * 2,
    TILE_SIZE_X * 19,
    TILE_SIZE_Y,
    SCREEN_X,
    paletteColor(47),
  );

  tilePrint('OPTIONS MENU', TILE_SIZE_X * 14, TILE_SIZE_Y * 2, screen);
  tilePrint('QUIT GAME', TILE_SIZE_X * 15, TILE_SIZE_Y * 5, screen);
  tmp = `MUSIC VOLUME: ${fmtInt(idiv(100 * G.musicVolume, 127), 3)}`;
  tilePrint(tmp, TILE_SIZE_X * 11, TILE_SIZE_Y * 7, screen);
  tmp = `SFX VOLUME: ${fmtInt(idiv(100 * sfx.volume, 127), 3)}`;
  tilePrint(tmp, TILE_SIZE_X * 12, TILE_SIZE_Y * 9, screen);

  if (G.world === 0) tmp = `CASTLE    ${LETTER[G.roomX]}${G.roomY + 1}`;
  else tmp = `WORLD ${fmtInt(G.world, 2)}  ${LETTER[G.roomX]}${G.roomY + 1}`;
  tilePrint(tmp, TILE_SIZE_X * 13, TILE_SIZE_Y * 12, screen);

  if (keyboard[SDLK_ESCAPE] !== 0 && G.oldKeyboard[SDLK_ESCAPE] === 0) {
    G.state = G.oldState;
    saveConfig('MoG.cfg');
  }
  if (keyboard[G.keyDown] !== 0 && G.oldKeyboard[G.keyDown] === 0 && G.menuOption < 2) G.menuOption++;
  if (keyboard[G.keyUp] !== 0 && G.oldKeyboard[G.keyUp] === 0 && G.menuOption > 0) G.menuOption--;

  if (keyboard[G.keySword] !== 0 && G.oldKeyboard[G.keySword] === 0 && G.menuOption === 0) {
    stopMusic();
    G.state = State.KonamiAppear;
    G.subState = 0;
    saveConfig('MoG.cfg');
  }

  if (keyboard[G.keyRight] !== 0 && G.menuOption === 1 && G.musicVolume < 127) {
    G.musicVolume++;
    // setMusicVolume(musicVolume);
  }
  if (keyboard[G.keyLeft] !== 0 && G.menuOption === 1 && G.musicVolume > 0) {
    G.musicVolume--;
    // setMusicVolume(musicVolume);
  }
  if (keyboard[G.keyRight] !== 0 && G.menuOption === 2 && sfx.volume < 127) {
    sfx.volume++;
    setSfxVolume(sfx.volume);
  }
  if (keyboard[G.keyLeft] !== 0 && G.menuOption === 2 && sfx.volume > 0) {
    sfx.volume--;
    setSfxVolume(sfx.volume);
  }
}

const STATE_HANDLERS: Record<number, (screen: Uint32Array, keyboard: Uint8Array) => void> = {
  [State.KonamiAppear]: konamiAppear,
  [State.KonamiLogo]: konamiLogo,
  [State.TitleMenu]: titleMenu,
  [State.PlayStart]: playStart,
  [State.Playing]: playing,
  [State.ItemScreen]: itemScreen,
  [State.ResumeAfterReset]: resumeAfterReset,
  [State.Passage]: passage,
  [State.ResumeAfterDown]: resumeAfterDown,
  [State.WorldEntry]: worldEntry,
  [State.RedefineKeys]: redefineKeys,
  [State.CharacterDead]: characterDead,
  [State.Tomb]: tomb,
  [State.LeaveTomb]: leaveTomb,
  [State.PasswordEntry]: passwordEntry,
  [State.DevStart]: devStart,
  [State.InterScreen]: interScreen,
  [State.Story]: story,
  [State.Ending]: ending,
  [State.Options]: options,
};

export function drawCharacter(screen: Uint32Array): void {
  const oldc = G.character;

  if (G.hitTime > 0 && G.playerFrame < 9) {
    if (((G.hitTime >> 1) & 0x01) !== 0) G.character = 2;
    else G.character = 0;
  }
  if (G.facingRight) {
    if (G.enterCut === 0) {
      drawTile(
        screen,
        tileIds.character[G.character] + G.playerFrame,
        GAME_VIEW_X + G.playerX,
        GAME_VIEW_Y + G.playerY,
      );
    } else {
      drawTileCut(
        screen,
        tileIds.character[G.character] + G.playerFrame,
        GAME_VIEW_X + G.playerX,
        GAME_VIEW_Y + G.playerY,
        G.enterCut,
      );
    }
    if (G.sword) {
      drawTile(screen, tileIds.sword[oldc], GAME_VIEW_X + G.swordX, GAME_VIEW_Y + G.swordY);
      drawTileMask(
        tileIds.sword[oldc],
        GAME_VIEW_X + G.swordX,
        GAME_VIEW_Y + G.swordY,
        TILE_SIZE_X * 2,
        TILE_SIZE_Y * 2 + TILE_UNIT,
      );
      drawTileMask(
        tileIds.sword[oldc],
        GAME_VIEW_X + G.swordX,
        GAME_VIEW_Y + G.swordY,
        TILE_SIZE_X * 2,
        TILE_SIZE_Y * 2 - TILE_UNIT,
      );
    }
  } else {
    if (G.enterCut === 0) {
      drawTile(
        screen,
        tileIds.characterInv[G.character] + G.playerFrame,
        GAME_VIEW_X + G.playerX,
        GAME_VIEW_Y + G.playerY,
      );
    } else {
      drawTileCut(
        screen,
        tileIds.characterInv[G.character] + G.playerFrame,
        GAME_VIEW_X + G.playerX,
        GAME_VIEW_Y + G.playerY,
        G.enterCut,
      );
    }
    if (G.sword) {
      drawTile(screen, tileIds.sword[oldc] + 1, GAME_VIEW_X + G.swordX, GAME_VIEW_Y + G.swordY);
      drawTileMask(
        tileIds.sword[oldc] + 1,
        GAME_VIEW_X + G.swordX,
        GAME_VIEW_Y + G.swordY,
        TILE_SIZE_X * 2,
        TILE_SIZE_Y * 2 + TILE_UNIT,
      );
      drawTileMask(
        tileIds.sword[oldc] + 1,
        GAME_VIEW_X + G.swordX,
        GAME_VIEW_Y + G.swordY,
        TILE_SIZE_X * 2,
        TILE_SIZE_Y * 2 - TILE_UNIT,
      );
    }
  }
  G.character = oldc;
}
