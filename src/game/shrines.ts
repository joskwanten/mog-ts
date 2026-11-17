/**
 * Port of shrines.cpp: the "passage" screens behind the shrine doors.
 *
 * The castle has eleven of them (eight shops with three wares, Demeter's
 * password room, Death and Asclepius); worlds 1–9 each have one, a hint giver or
 * a one-item shop. Every screen has the same frame and two speech balloons; the
 * room then draws its keeper and runs its dialogue.
 *
 * G.passageState is the step of the dialogue and G.selecting the cursor; the
 * game resets both (and G.shopItems) when the player enters a passage.
 */
import type { Screen } from '../engine/screen';
import { playSound } from '../platform/audio';
import { SDLK_F5, SDLK_F6, SDLK_F7, SDLK_F8, SDLK_F9, getKeyboardState } from '../platform/keyboard';
import { GAME_VIEW_X, GAME_VIEW_Y, TILE_SIZE_X, TILE_SIZE_Y } from './constants';
import { tilePrint } from './gameaux';
import { generatePassword } from './passwords';
import { sfx, tileIds } from './resources';
import { G } from './state';
import { drawTile, drawTileNative } from './tiledraw';

// const int MAX_FIRED_ARROWS[2]={2,3}; is defined in shrines.cpp but not used here.

export function passageCycle(map: number, mapX: number, mapY: number, screen: Screen): void {
  drawPassageFrame(screen);
  const room = map === 0 ? CASTLE_ROOMS.get(`${mapX},${mapY}`) : WORLD_ROOMS.get(map);
  room?.(screen);
}

// ---------------------------------------------------------------------------
// Layout and drawing helpers

/** Screen position of a tile column/row of the game view. */
const viewX = (col: number): number => GAME_VIEW_X + col * TILE_SIZE_X;
const viewY = (row: number): number => GAME_VIEW_Y + row * TILE_SIZE_Y;

/** Draw a one-cell tile at a column/row of the game view. */
function drawCell(screen: Screen, tile: number, col: number, row: number): void {
  drawTile(screen, tile, viewX(col), viewY(row), TILE_SIZE_X, TILE_SIZE_Y);
}

/** Print text at a column/row of the whole screen (not offset by the game view). */
function printAt(screen: Screen, text: string, col: number, row: number): void {
  tilePrint(text, TILE_SIZE_X * col, TILE_SIZE_Y * row, screen);
}

/** The keeper's message: lines from row 9 down, at column 10. */
const MESSAGE_COL = 10;
const MESSAGE_ROW = 9;
function say(screen: Screen, lines: readonly string[]): void {
  lines.forEach((line, i) => printAt(screen, line, MESSAGE_COL, MESSAGE_ROW + i));
}

/** Row of the answers / prices line; the cursor stands one row above it. */
const CHOICE_ROW = 13;
const CURSOR_TILE = 152;

function drawCursor(screen: Screen, col: number): void {
  drawTile(screen, CURSOR_TILE, viewX(col), viewY(CHOICE_ROW - 1), TILE_SIZE_X, TILE_SIZE_Y * 2);
}

/** Draw the cursor in front of choice G.selecting; `cols` are the choices' columns. */
function drawChoiceCursor(screen: Screen, cols: readonly number[]): void {
  const col = cols[G.selecting] as number | undefined;
  if (col !== undefined) drawCursor(screen, col);
}

/** A key that went down this frame. Reads the live key state (rooms may clear a key). */
function pressed(key: number): boolean {
  return !!getKeyboardState()[key] && !G.oldKeyboard[key];
}

/** Move G.selecting with left/right between 0 and `last`. */
function moveCursor(last: number): void {
  if (pressed(G.keyRight) && G.selecting < last) {
    G.selecting++;
    playSound(sfx.select);
  }
  if (pressed(G.keyLeft) && G.selecting > 0) {
    G.selecting--;
    playSound(sfx.select);
  }
}

/** Swallow the sword key for the rest of the frame (so the next dialogue step does not see it). */
function consumeSword(): void {
  getKeyboardState()[G.keySword] = 0;
}

const WALL_TILE = 143;

function drawPassageFrame(screen: Screen): void {
  for (let i = 0; i < 32; i++) {
    drawCell(screen, WALL_TILE, i, 0);
    drawCell(screen, WALL_TILE, i, 18);
  }
  for (let i = 0; i < 19; i++) {
    drawCell(screen, WALL_TILE, 0, i);
    drawCell(screen, WALL_TILE, 1, i);
    drawCell(screen, WALL_TILE, 30, i);
    drawCell(screen, WALL_TILE, 31, i);
  }

  // The player, standing on the ladder he came in by:
  drawTile(screen, tileIds.ladder, viewX(15), viewY(19), TILE_SIZE_X * 2, TILE_SIZE_Y);
  drawTile(screen, tileIds.character[G.character] + 7, viewX(15), viewY(16));

  // The two speech balloons:
  drawBalloon(screen, 4, 10, 145, 11, 4);
  drawBalloon(screen, 11, 15, 144, 20, 15);
}

/** A speech balloon from column 4 to 27 and row `top` to `bottom`, with its tail tile. */
function drawBalloon(
  screen: Screen,
  top: number,
  bottom: number,
  tailTile: number,
  tailCol: number,
  tailRow: number,
): void {
  drawCell(screen, 151, 4, top);
  drawCell(screen, 150, 27, top);
  drawCell(screen, 149, 27, bottom);
  drawCell(screen, 148, 4, bottom);
  for (let i = 5; i < 27; i++) {
    drawCell(screen, 146, i, top);
    drawCell(screen, 146, i, bottom);
  }
  for (let i = top + 1; i < bottom; i++) {
    drawCell(screen, 147, 4, i);
    drawCell(screen, 147, 27, i);
  }
  drawCell(screen, tailTile, tailCol, tailRow);
}

// ---------------------------------------------------------------------------
// Keepers

interface Keeper {
  name: string;
  /** Tile of the keeper's picture. */
  portrait: number;
}

const ARES: Keeper = { name: 'ARES', portrait: 153 };
const HEPHAESTUS: Keeper = { name: 'HEPHAESTUS', portrait: 153 };
const DEMETER: Keeper = { name: 'DEMETER', portrait: 154 };
const ATHENA: Keeper = { name: 'ATHENA', portrait: 161 };
const DEATH: Keeper = { name: 'DEATH', portrait: 167 };
const ASCLEPIUS: Keeper = { name: 'ASCLEPIUS', portrait: 178 };

/** The keeper's name (centred on column 20) and picture. */
function drawKeeper(screen: Screen, keeper: Keeper): void {
  printAt(screen, keeper.name, 20 - (keeper.name.length >> 1), 5);
  drawTile(screen, keeper.portrait, viewX(15), viewY(2));
}

type PassageRoom = (screen: Screen) => void;

/** A keeper who only gives a hint. */
function hint(keeper: Keeper, lines: readonly string[]): PassageRoom {
  return (screen) => {
    drawKeeper(screen, keeper);
    say(screen, lines);
  };
}

// ---------------------------------------------------------------------------
// Shops

/** Draws a ware with its left edge at tile column `col`. */
type WareLook = (screen: Screen, col: number) => void;

interface Ware {
  price: number;
  look: WareLook;
  buy(): void;
}

/** The ware's tile at its own size, top at `row`. */
function nativeLook(tile: () => number, row = 7): WareLook {
  return (screen, col) => drawTileNative(screen, tile(), viewX(col), viewY(row));
}

/** The ware's tile scaled to w×h, top at `row`. */
function scaledLook(tile: () => number, row = 7, w = TILE_SIZE_X * 2, h = TILE_SIZE_Y * 2): WareLook {
  return (screen, col) => drawTile(screen, tile(), viewX(col), viewY(row), w, h);
}

const itemLook = (n: number): WareLook => nativeLook(() => tileIds.items + n);

function arrows(price: number, look = nativeLook(() => tileIds.arrow)): Ware {
  return {
    price,
    look,
    buy: () => {
      G.arrows += 50;
    },
  };
}

function keys(price: number): Ware {
  return {
    price,
    look: nativeLook(() => tileIds.key),
    buy: () => {
      G.keys += 2;
    },
  };
}

function item(n: number, price: number, look = itemLook(n)): Ware {
  return {
    price,
    look,
    buy: () => {
      G.items[n] = true;
    },
  };
}

/** The shields (items 27, 30 and 31): buying one replaces the one you have. */
const SHIELDS = [27, 30, 31];
function shield(n: number, price: number, look = itemLook(n)): Ware {
  return {
    price,
    look,
    buy: () => {
      for (const s of SHIELDS) G.items[s] = s === n;
    },
  };
}

/** Columns of the wares (and the cursor); the price is printed four columns to the right. */
const THREE_WARES = [9, 15, 21];
const ONE_WARE = [15];

/** A shop's G.passageState: 1 after trying to buy something too expensive. */
const SHOP_WELCOME = 0;
const SHOP_NO_COINS = 1;

/** The prices line: each price as two digits, four columns right of its ware. */
function priceLine(prices: readonly number[], cols: readonly number[]): string {
  let line = '';
  prices.forEach((price, i) => {
    line = line.padEnd(cols[i] + 4 - MESSAGE_COL) + String(price).padStart(2, '0');
  });
  return line;
}

function shop(keeper: Keeper, wares: readonly Ware[]): PassageRoom {
  const cols = wares.length === 1 ? ONE_WARE : THREE_WARES;
  const prices = priceLine(
    wares.map((w) => w.price),
    cols,
  );

  return (screen) => {
    drawKeeper(screen, keeper);
    say(
      screen,
      G.passageState === SHOP_WELCOME ? ['YOU CAN BUY SOME OF', 'MY TREASURE'] : ['COINS ARE NOT', 'ENOUGH.'],
    );
    wares.forEach((ware, i) => {
      if (G.shopItems[i]) ware.look(screen, cols[i]);
    });
    printAt(screen, prices, MESSAGE_COL, CHOICE_ROW);
    drawChoiceCursor(screen, cols);

    // One-item shops do not read left/right at all.
    if (wares.length > 1) {
      if (pressed(G.keyRight) || pressed(G.keyLeft)) G.passageState = SHOP_WELCOME;
      moveCursor(wares.length - 1);
    }

    if (pressed(G.keySword)) {
      G.passageState = SHOP_WELCOME;
      // NOTE (original): a one-item shop has one price; selecting is assumed to be 0
      // there (out of range, the C++ price[] read buys nothing; neither does this).
      const ware = wares[G.selecting] as Ware | undefined;
      if (ware === undefined) return;
      if (G.coins >= ware.price && G.shopItems[G.selecting]) {
        G.coins -= ware.price;
        G.shopItems[G.selecting] = false;
        ware.buy();
        playSound(sfx.item);
      } else if (G.shopItems[G.selecting] && G.coins < ware.price) {
        playSound(sfx.nocoins);
        G.passageState = SHOP_NO_COINS;
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Rooms that are not a shop or a hint

/** Demeter's password room: G.passageState steps. */
const PASSWORD_ASK = 0;
const PASSWORD_DECLINED = 1;
const PASSWORD_SHOW = 2;
const PASSWORD_BYE = 3;

const SAVE_KEYS = [SDLK_F5, SDLK_F6, SDLK_F7, SDLK_F8, SDLK_F9];

function demeterPasswordRoom(screen: Screen): void {
  printAt(screen, 'h F5 TO F9', 6, 21);
  drawKeeper(screen, DEMETER);

  // Save the game: F5..F9 store the password in slot 1..5 (the last key pressed wins).
  let slot = -1;
  SAVE_KEYS.forEach((key, i) => {
    if (pressed(key)) slot = i + 1;
  });
  if (slot !== -1) {
    const passwd = generatePassword();

    // The Emscripten build ran: localStorage['mog<slot>'] = '<passwd>'
    // NOTE (original): the C++ passwd buffer is 48 chars and not
    // NUL-terminated after the 45 written ones; we store the 45 chars.
    try {
      localStorage.setItem(`mog${slot}`, passwd);
    } catch {
      // no localStorage (tests / private mode)
    }
    playSound(sfx.select);
  }

  const choices = [9, 21];
  if (G.passageState === PASSWORD_ASK) {
    say(screen, [
      'YOU WANT THE SECRET',
      'CODE TO WAKEN',
      'MY MEMORY KEEP THE',
      'RECORDS ABOUT YOU?',
      '   YES         NO',
    ]);
    drawChoiceCursor(screen, choices);
    moveCursor(1);
    if (pressed(G.keySword)) {
      if (G.selecting === 0) G.passageState = PASSWORD_SHOW;
      if (G.selecting === 1) G.passageState = PASSWORD_DECLINED;
      consumeSword();
    }
  }
  if (G.passageState === PASSWORD_DECLINED) {
    say(screen, ['RESCUE THE BABY AS ', 'SOON AS POSSIBLE']);
  }
  if (G.passageState === PASSWORD_SHOW) {
    say(screen, [...passwordLines(generatePassword()), 'DID YOU GET THEM?', '   YES']);
    drawCursor(screen, choices[0]);
    if (pressed(G.keySword)) G.passageState = PASSWORD_BYE;
  }
  if (G.passageState === PASSWORD_BYE) {
    say(screen, ['SEE YOU AGAIN']);
  }
}

/** The 45 password characters as three lines of four groups of four ("XXXX XXXX XXXX XXXX"). */
function passwordLines(passwd: string): string[] {
  const lines: string[] = [];
  for (let line = 0; line < 3; line++) {
    const buf = new Array<string>(19).fill(' ');
    for (let i = 0; i < 16; i++) {
      const c = line * 16 + i;
      if (c < 45) buf[(i >> 2) * 5 + (i & 3)] = passwd[c];
    }
    lines.push(buf.join(''));
  }
  return lines;
}

/** Death's G.passageState steps. */
const DEATH_ASK = 0;
const DEATH_DECLINED = 1;
const DEATH_REVIVED = 2;

function deathRoom(screen: Screen): void {
  drawKeeper(screen, DEATH);
  const nobodyToRevive = (G.characterAlive[0] || !G.canRevive[0]) && (G.characterAlive[1] || !G.canRevive[1]);
  if (nobodyToRevive && G.passageState === DEATH_ASK) {
    say(screen, ['IF YOUR LOVER IS', 'KILLED,COME BACK', 'HERE WITH abc100,', 'dec100, AND fgc20.']);
    return;
  }

  if (G.passageState === DEATH_ASK) {
    say(screen, ['GIVE ME abc100,', 'dec100 AND fgc20 IN', 'RETURN FOR REVIVING', 'YOUR LOVER.', '   YES       NO']);
    drawChoiceCursor(screen, [9, 20]);
    moveCursor(1);
    if (pressed(G.keySword)) {
      if (G.selecting === 0 && G.arrows >= 100 && G.coins >= 100 && G.keys >= 20) {
        const lover = 1 - G.character;
        G.arrows -= 100;
        G.coins -= 100;
        G.keys -= 20;
        G.canRevive[lover] = false;
        G.characterAlive[0] = G.characterAlive[1] = true;
        G.energy[lover] = G.maxEnergy[lover];
        G.passageState = DEATH_REVIVED;
      }
      if (G.selecting === 1) G.passageState = DEATH_DECLINED;
      consumeSword();
    }
  }
  if (G.passageState === DEATH_DECLINED) {
    say(screen, ['THEN,YOU MUST FIGHT', 'ALL BY YOURSELF', 'GO,RIGHT NOW.']);
  }
  if (G.passageState === DEATH_REVIVED) {
    say(screen, ['YOUR LOVER HAS', 'REVIVED, GO AND GET', 'BACK THE LITTLE BABY', 'TOGETHER. GO AHEAD!']);
  }
}

// ---------------------------------------------------------------------------
// The rooms

// Unlike the other shops, the Ares shop at 8,15 draws its wares scaled (item 36, a
// weapon tile, to 2×1 tiles, one row lower); the Hephaestus shop at 0,13 shows item 37
// (also a weapon tile) one row lower.
const SCALED_ARROWS = scaledLook(() => tileIds.arrow);
const SCALED_SHIELD_30 = scaledLook(() => tileIds.items + 30);
const SCALED_WEAPON_4 = scaledLook(() => tileIds.weapons + 4, 8, TILE_SIZE_X * 2, TILE_SIZE_Y);
const WEAPON_5 = nativeLook(() => tileIds.weapons + 5, 8);

/** The castle's passage rooms, by "mapX,mapY". */
const CASTLE_ROOMS = new Map<string, PassageRoom>([
  ['5,9', demeterPasswordRoom],
  ['8,15', shop(ARES, [arrows(20, SCALED_ARROWS), shield(30, 30, SCALED_SHIELD_30), item(36, 20, SCALED_WEAPON_4)])],
  ['0,13', shop(HEPHAESTUS, [item(37, 30, WEAPON_5), keys(5), arrows(20)])],
  ['11,10', deathRoom],
  ['9,7', shop(HEPHAESTUS, [arrows(20), item(22, 25), keys(5)])],
  ['12,2', shop(ARES, [arrows(20), item(12, 50), keys(5)])],
  ['2,2', shop(HEPHAESTUS, [item(20, 30), arrows(20), keys(5)])],
  ['2,5', shop(DEMETER, [arrows(20), item(0, 25), keys(5)])],
  ['12,8', shop(ARES, [arrows(20), shield(31, 40), keys(5)])],
  ['8,1', shop(ARES, [arrows(20), shield(27, 50), keys(5)])],
  ['7,7', hint(ASCLEPIUS, ['SEE A FAIRY TO', 'RESTORE YOUR', 'VITALITY.'])],
]);

/** The one passage room of worlds 1–9, by world. */
const WORLD_ROOMS = new Map<number, PassageRoom>([
  [1, hint(DEMETER, ['TAKE A MINE WITH YOU', 'WHEN YOU GO TO', 'WORLD 4'])],
  [2, hint(ATHENA, ['HIT THE WALL WITH', 'YOUR SWORD IF YOU', 'WANT TO GO TO THE', 'OPPOSITE SHORE.'])],
  [3, hint(ATHENA, ['APHRODITE.DO NOT BE', 'AFRAID OF WATER.'])],
  [4, hint(DEMETER, ['THE PURE WATER IS', 'INSIDE THE WALL.'])],
  [5, shop(DEMETER, [item(3, 30)])],
  [6, hint(ATHENA, ['HIT THE WALL WHEN', 'YOU ARE HALFWAY OF', 'THE STAIRS.'])],
  [7, hint(DEMETER, ['FIND THE SPELL', 'WRITTEN ON A STONE', 'MONUMENT UNDER THE', 'WATER.'])],
  [8, shop(DEMETER, [item(11, 30)])],
  [9, hint(DEMETER, ['A GATE WHICH LEADS', 'TO GALIOUS WILL', 'APPEAR SOMEWHERE IN', 'THE CASTLE.'])],
]);
