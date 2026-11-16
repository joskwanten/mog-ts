/**
 * Keyboard state in SDL 1.2 terms.
 *
 * The game logic polls a key-state array indexed by SDL 1.2 key symbols
 * (`keyboard[SDLK_SPACE]`) and keeps its own copy of the previous frame
 * (`oldKeyboard`) for edge detection, exactly like the C++ remake. Key
 * bindings are stored as these numbers too, so saved configs stay compatible.
 */

export const SDLK_UNKNOWN = 0;
export const SDLK_BACKSPACE = 8;
export const SDLK_TAB = 9;
export const SDLK_RETURN = 13;
export const SDLK_PAUSE = 19;
export const SDLK_ESCAPE = 27;
export const SDLK_SPACE = 32;
export const SDLK_QUOTE = 39;
export const SDLK_COMMA = 44;
export const SDLK_MINUS = 45;
export const SDLK_PERIOD = 46;
export const SDLK_SLASH = 47;
export const SDLK_0 = 48;
export const SDLK_1 = 49;
export const SDLK_2 = 50;
export const SDLK_3 = 51;
export const SDLK_4 = 52;
export const SDLK_5 = 53;
export const SDLK_6 = 54;
export const SDLK_7 = 55;
export const SDLK_8 = 56;
export const SDLK_9 = 57;
export const SDLK_SEMICOLON = 59;
export const SDLK_EQUALS = 61;
export const SDLK_LEFTBRACKET = 91;
export const SDLK_BACKSLASH = 92;
export const SDLK_RIGHTBRACKET = 93;
export const SDLK_BACKQUOTE = 96;
export const SDLK_a = 97;
export const SDLK_b = 98;
export const SDLK_c = 99;
export const SDLK_d = 100;
export const SDLK_e = 101;
export const SDLK_f = 102;
export const SDLK_g = 103;
export const SDLK_h = 104;
export const SDLK_i = 105;
export const SDLK_j = 106;
export const SDLK_k = 107;
export const SDLK_l = 108;
export const SDLK_m = 109;
export const SDLK_n = 110;
export const SDLK_o = 111;
export const SDLK_p = 112;
export const SDLK_q = 113;
export const SDLK_r = 114;
export const SDLK_s = 115;
export const SDLK_t = 116;
export const SDLK_u = 117;
export const SDLK_v = 118;
export const SDLK_w = 119;
export const SDLK_x = 120;
export const SDLK_y = 121;
export const SDLK_z = 122;
export const SDLK_DELETE = 127;
export const SDLK_KP0 = 256;
export const SDLK_KP_PERIOD = 266;
export const SDLK_KP_DIVIDE = 267;
export const SDLK_KP_MULTIPLY = 268;
export const SDLK_KP_MINUS = 269;
export const SDLK_KP_PLUS = 270;
export const SDLK_KP_ENTER = 271;
export const SDLK_UP = 273;
export const SDLK_DOWN = 274;
export const SDLK_RIGHT = 275;
export const SDLK_LEFT = 276;
export const SDLK_INSERT = 277;
export const SDLK_HOME = 278;
export const SDLK_END = 279;
export const SDLK_PAGEUP = 280;
export const SDLK_PAGEDOWN = 281;
export const SDLK_F1 = 282;
export const SDLK_F2 = 283;
export const SDLK_F3 = 284;
export const SDLK_F4 = 285;
export const SDLK_F5 = 286;
export const SDLK_F6 = 287;
export const SDLK_F7 = 288;
export const SDLK_F8 = 289;
export const SDLK_F9 = 290;
export const SDLK_F10 = 291;
export const SDLK_F11 = 292;
export const SDLK_F12 = 293;
export const SDLK_CAPSLOCK = 301;
export const SDLK_RSHIFT = 303;
export const SDLK_LSHIFT = 304;
export const SDLK_RCTRL = 305;
export const SDLK_LCTRL = 306;
export const SDLK_RALT = 307;
export const SDLK_LALT = 308;
export const SDLK_RMETA = 309;
export const SDLK_LMETA = 310;
export const SDLK_LAST = 323;

export type SDLKey = number;

/** KeyboardEvent.code → SDL 1.2 key symbol. */
const CODE_TO_SDLK: Record<string, SDLKey> = {
  Backspace: SDLK_BACKSPACE,
  Tab: SDLK_TAB,
  Enter: SDLK_RETURN,
  Pause: SDLK_PAUSE,
  Escape: SDLK_ESCAPE,
  Space: SDLK_SPACE,
  Quote: SDLK_QUOTE,
  Comma: SDLK_COMMA,
  Minus: SDLK_MINUS,
  Period: SDLK_PERIOD,
  Slash: SDLK_SLASH,
  Semicolon: SDLK_SEMICOLON,
  Equal: SDLK_EQUALS,
  BracketLeft: SDLK_LEFTBRACKET,
  Backslash: SDLK_BACKSLASH,
  BracketRight: SDLK_RIGHTBRACKET,
  Backquote: SDLK_BACKQUOTE,
  Delete: SDLK_DELETE,
  NumpadDecimal: SDLK_KP_PERIOD,
  NumpadDivide: SDLK_KP_DIVIDE,
  NumpadMultiply: SDLK_KP_MULTIPLY,
  NumpadSubtract: SDLK_KP_MINUS,
  NumpadAdd: SDLK_KP_PLUS,
  NumpadEnter: SDLK_KP_ENTER,
  ArrowUp: SDLK_UP,
  ArrowDown: SDLK_DOWN,
  ArrowRight: SDLK_RIGHT,
  ArrowLeft: SDLK_LEFT,
  Insert: SDLK_INSERT,
  Home: SDLK_HOME,
  End: SDLK_END,
  PageUp: SDLK_PAGEUP,
  PageDown: SDLK_PAGEDOWN,
  CapsLock: SDLK_CAPSLOCK,
  ShiftRight: SDLK_RSHIFT,
  ShiftLeft: SDLK_LSHIFT,
  ControlRight: SDLK_RCTRL,
  ControlLeft: SDLK_LCTRL,
  AltRight: SDLK_RALT,
  AltLeft: SDLK_LALT,
  MetaRight: SDLK_RMETA,
  MetaLeft: SDLK_LMETA,
};
for (let i = 0; i < 26; i++) CODE_TO_SDLK['Key' + String.fromCharCode(65 + i)] = SDLK_a + i;
for (let i = 0; i < 10; i++) {
  CODE_TO_SDLK['Digit' + i] = SDLK_0 + i;
  CODE_TO_SDLK['Numpad' + i] = SDLK_KP0 + i;
}
for (let i = 1; i <= 12; i++) CODE_TO_SDLK['F' + i] = SDLK_F1 + i - 1;

const SDLK_NAMES: Record<number, string> = {
  [SDLK_BACKSPACE]: 'backspace',
  [SDLK_TAB]: 'tab',
  [SDLK_RETURN]: 'return',
  [SDLK_PAUSE]: 'pause',
  [SDLK_ESCAPE]: 'escape',
  [SDLK_SPACE]: 'space',
  [SDLK_DELETE]: 'delete',
  [SDLK_KP_PERIOD]: '[.]',
  [SDLK_KP_DIVIDE]: '[/]',
  [SDLK_KP_MULTIPLY]: '[*]',
  [SDLK_KP_MINUS]: '[-]',
  [SDLK_KP_PLUS]: '[+]',
  [SDLK_KP_ENTER]: 'enter',
  [SDLK_UP]: 'up',
  [SDLK_DOWN]: 'down',
  [SDLK_RIGHT]: 'right',
  [SDLK_LEFT]: 'left',
  [SDLK_INSERT]: 'insert',
  [SDLK_HOME]: 'home',
  [SDLK_END]: 'end',
  [SDLK_PAGEUP]: 'page up',
  [SDLK_PAGEDOWN]: 'page down',
  [SDLK_CAPSLOCK]: 'caps lock',
  [SDLK_RSHIFT]: 'right shift',
  [SDLK_LSHIFT]: 'left shift',
  [SDLK_RCTRL]: 'right ctrl',
  [SDLK_LCTRL]: 'left ctrl',
  [SDLK_RALT]: 'right alt',
  [SDLK_LALT]: 'left alt',
  [SDLK_RMETA]: 'right meta',
  [SDLK_LMETA]: 'left meta',
};

/** keyName() equivalent (same lower-case names as SDL 1.2). */
export function keyName(key: SDLKey): string {
  if (SDLK_NAMES[key] !== undefined) return SDLK_NAMES[key];
  if (key >= SDLK_KP0 && key <= SDLK_KP0 + 9) return `[${key - SDLK_KP0}]`;
  if (key >= SDLK_F1 && key <= SDLK_F12) return `f${key - SDLK_F1 + 1}`;
  if (key > 32 && key < 127) return String.fromCharCode(key);
  return 'unknown key';
}

/** Live key state, updated by DOM events (1 = held). */
const keyState = new Uint8Array(SDLK_LAST);

/**
 * Keys pressed since the last poll. A tap that is pressed and released
 * between two game frames would otherwise never be seen by the game; we keep
 * it "down" for exactly one poll, like a real keyboard matrix scan would.
 */
const pressedSincePoll = new Uint8Array(SDLK_LAST);

/** The array the game reads, refreshed by getKeyboardState(). */
const frameState = new Uint8Array(SDLK_LAST);

/** Fired for every key press, used for key redefinition and listeners. */
type KeyListener = (key: SDLKey, ev: KeyboardEvent) => void;
const listeners: KeyListener[] = [];

export function onKeyDown(listener: KeyListener): void {
  listeners.push(listener);
}

export function toSDLKey(ev: KeyboardEvent): SDLKey {
  return CODE_TO_SDLK[ev.code] ?? SDLK_UNKNOWN;
}

export function installKeyboard(target: Window = window): void {
  target.addEventListener('keydown', (ev) => {
    const key = toSDLKey(ev);
    if (key === SDLK_UNKNOWN) return;
    // Let browser shortcuts (Cmd+R, Cmd+Q, ...) through.
    if (ev.metaKey || ev.ctrlKey) return;
    ev.preventDefault();
    if (!ev.repeat) {
      keyState[key] = 1;
      pressedSincePoll[key] = 1;
      for (const l of listeners) l(key, ev);
    }
  });
  target.addEventListener('keyup', (ev) => {
    const key = toSDLKey(ev);
    if (key === SDLK_UNKNOWN) return;
    keyState[key] = 0;
  });
  // Releasing keys when the window loses focus avoids stuck movement.
  target.addEventListener('blur', () => keyState.fill(0));
}

/** Simulate key presses/releases (used by tests and the debug bot). */
export function setKey(key: SDLKey, down: boolean): void {
  keyState[key] = down ? 1 : 0;
  if (down) pressedSincePoll[key] = 1;
}

/**
 * Snapshot the keyboard for the coming game frame. Called once per frame by
 * the main loop, before gameCycle runs.
 */
export function pollKeyboard(): void {
  for (let i = 0; i < SDLK_LAST; i++) frameState[i] = keyState[i] | pressedSincePoll[i];
  pressedSincePoll.fill(0);
}

/** SDL_PumpEvents + getKeyboardState: the key state of the current frame. */
export function getKeyboardState(): Uint8Array {
  return frameState;
}
