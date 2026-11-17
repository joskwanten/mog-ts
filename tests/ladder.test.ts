/**
 * Regression: holding LEFT+RIGHT or UP+DOWN on a ladder makes the character get
 * off and then look at the ladder again in the same frame (object[-1] in the
 * C++). That must not crash.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { Screen } from '../src/engine/screen';
import { S_QUIET_LADDER, State } from '../src/game/constants';
import { srand } from '../src/game/cutil';
import { findLadder } from '../src/game/gameaux';
import { gameCycle } from '../src/game/gamecycle';
import { G } from '../src/game/state';
import { registerBinary } from '../src/platform/assets';
import { pollKeyboard, SDLK_DOWN, SDLK_LEFT, SDLK_RIGHT, SDLK_SPACE, SDLK_UP, setKey } from '../src/platform/keyboard';

test('pressing opposite directions on a ladder does not crash', () => {
  const dir = join(__dirname, '..', 'assets', 'graphics', 'original');
  for (const f of readdirSync(dir))
    registerBinary(`graphics/original/${f}`, new Uint8Array(readFileSync(join(dir, f))));
  srand(1);
  const screen = new Screen(640, 400);
  const all = [SDLK_UP, SDLK_DOWN, SDLK_LEFT, SDLK_RIGHT, SDLK_SPACE];
  const frame = (keys: number[]) => {
    for (const k of all) setKey(k, false);
    for (const k of keys) setKey(k, true);
    pollKeyboard();
    gameCycle(screen);
  };
  while (G.state !== State.Playing) frame(G.frameCounter % 20 === 19 ? [SDLK_SPACE] : []);
  frame([]);
  // Castle start room: ladders at x=224 from y=0 and from y=192 (top reached at y≈150).
  for (const [y, keys] of [
    [100, [SDLK_LEFT, SDLK_RIGHT]],
    [146, [SDLK_LEFT, SDLK_RIGHT]],
    [150, [SDLK_LEFT, SDLK_RIGHT]],
    [150, [SDLK_UP, SDLK_DOWN]],
    [-30, [SDLK_LEFT, SDLK_RIGHT]],
    [-30, [SDLK_UP, SDLK_DOWN]],
  ] as [number, number[]][]) {
    G.state = State.Playing;
    G.subState = 1;
    G.playerX = 224;
    G.playerY = y;
    G.playerState = S_QUIET_LADDER;
    G.onLadder = findLadder(G.playerX, G.playerY);
    expect(G.onLadder).not.toBe(-1);
    expect(() => {
      for (let f = 0; f < 20; f++) frame(keys);
    }).not.toThrow();
  }
});
