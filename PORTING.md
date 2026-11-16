# Porting notes and conventions

The game logic is a translation of the C++ remake (v0.63, via
`joskwanten/mog-emscripten`); the sources are in `reference/cpp/`. It was done in two
passes:

1. **Faithful port** — every C++ file became one TypeScript module with the same
   behaviour, frame for frame, keeping the original identifiers.
2. **Clean-up** — identifiers renamed to English `camelCase` through the TypeScript
   language service (`tools/rename.mjs`, `tools/camel-locals.mjs`), formatting with
   Prettier; codemods for the screen-size parameters (`tools/drop-screen-size.mjs`), the
   tile drawing/collision calls (`tools/tilecalls.py`, `tools/collision-at.py`) and the
   game-state switch (`tools/split-switch.mjs`). The old → new names are listed in
   [NAMES.md](NAMES.md). The replay tests prove the behaviour did not change.

## Module map

| C++ file                        | TypeScript module                                                | Main exports                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bitmaps.cpp, sprites.h, tiles.h | `src/engine/bitmap.ts`, `sprite.ts`, `tile.ts`                   | `Bitmap`, `Sprite`, `Tile`                                                                                                                                                         |
| drawing.cpp, line_clip.cpp      | `src/engine/drawing.ts`                                          | `fillRect`, `strokeRect`, `drawLine`, `memset`                                                                                                                                     |
| keyboard.cpp, SDL keys          | `src/platform/keyboard.ts`                                       | `SDLK_*`, `getKeyboardState`, `keyName`                                                                                                                                            |
| sound.cpp                       | `src/platform/audio.ts`                                          | `playSound`, `createSound`, `playMusic`, `stopMusic`, …                                                                                                                            |
| filehandling.cpp, path.cpp      | `src/platform/assets.ts`                                         | `readText`, `readBinary`, `GRAPHIC_SETS`, `SOUND_SETS`                                                                                                                             |
| render.cpp, main.cpp            | `src/platform/video.ts`, `src/main.ts`                           | `Video`, game loop                                                                                                                                                                 |
| mog.h                           | `src/game/constants.ts`                                          | all `#define`s                                                                                                                                                                     |
| object.h                        | `src/game/object.ts`                                             | `GameObject`                                                                                                                                                                       |
| globals                         | `src/game/state.ts`, `src/game/resources.ts`                     | `G` (game state); `gfx`, `tileIds`, `sfx` (loaded resources)                                                                                                                       |
| —                               | `src/game/cutil.ts`                                              | C semantics: `idiv`, `toInt`, `rand`, `Scanner`                                                                                                                                    |
| gamecycle.cpp                   | `src/game/gamecycle.ts`                                          | `gameCycle` (dispatches to one function per `State`), `drawCharacter`                                                                                                              |
| ingamecycle.cpp                 | `src/game/ingamecycle.ts` + `src/game/player/*`                  | `updatePlayer` (the steps of a frame); per player state in `ground.ts`, `air.ts`, `ladder.ts`, `scripted.ts`; `damage.ts`, `movement.ts`, shared `PlayerStep` context in `step.ts` |
| gameinteractions.cpp            | `src/game/gameinteractions.ts`, `weaponhits.ts`, `roomevents.ts` | `testInteractions`, `updateLevers`, `fireWeapon`, `animateTiles`; weapons vs enemies (`weaponCollision`); `roomEvents` per world                                                   |
| gameobjects.cpp                 | `src/game/gameobjects.ts` + `enemies/enemiesA.ts`, `enemiesB.ts` | `animateObjects`, one function per enemy                                                                                                                                           |
| gameaux.cpp                     | `src/game/gameaux.ts`, `roomfile.ts`                             | `drawMap`, `drawStats`, `newGame`, `addObject`, config, room memory, …; the room-file parser `loadRoom` (enemy table)                                                              |
| gametiles.cpp                   | `src/game/gametiles.ts`                                          | `loadGraphics` (all tile definitions)                                                                                                                                              |
| roomchange.cpp                  | `src/game/roomchange.ts`                                         | `checkRoomChange`                                                                                                                                                                  |
| demons.cpp                      | `src/game/demons.ts`                                             | demon intro and the ten demon fights                                                                                                                                               |
| shrines.cpp                     | `src/game/shrines.ts`                                            | `passageCycle` (shrines, shops, old men)                                                                                                                                           |
| passwords.cpp                   | `src/game/passwords.ts`                                          | `generatePassword`, `readPassword`                                                                                                                                                 |
| —                               | `src/game/tiledraw.ts`                                           | `drawTile`, `tileHits`, `collisionAt`, … (tile drawing/collision short forms)                                                                                                      |

## Conventions

**State.** All shared game state lives in one object `G` (`src/game/state.ts`), as in the
remake (which used globals); loaded bitmaps, tile numbers and sounds are in
`src/game/resources.ts`. Module-private state is a module-level `let`. Game states are
`State.*` constants.

**Frame buffer and collision.** Every frame the game draws into a 640×400 8-bit indexed
buffer and paints the same pixels' collision types (`T_WALL`, `T_PLAYER`, …) into
`G.collision`. Collision tests read that buffer, so the order of drawing and testing is
behaviour. Do not reorder statements without the replay tests.

**Integer semantics.** C `int` arithmetic stays integer: every `int / int` is
`idiv(a, b)`; `int(float)` is `toInt(x)`; `rand()` comes from `cutil.ts` (seedable).

**Original quirks.** Bugs of the remake are kept and marked `// NOTE (original):`. Fix
one only on purpose, and update the golden replays in the same change. Fixed so far:
the cyclops overwrote the screen-size parameters for the rest of the frame
(`NOTE (original, fixed)` in `enemies/enemiesB.ts`).

**Formatting.** `npm run format` (Prettier); `npm run lint` checks formatting and types.

## Tests

All tests are golden masters: they record, frame by frame, a hash of the frame buffer and
the collision buffer plus the sounds and music requested, and compare with `tests/golden/`.

- `tests/replay.test.ts` — 4000 frames of seeded random play with teleports through all worlds.
- `tests/coverage.test.ts` — every one of the 311 rooms with random play, every shrine and
  shop screen, every demon fight (~15 000 frames, ~75 s).
- `tests/player.test.ts` — fixed movement patterns (walk, jump, fall, ladders, sword,
  weapon) from random start positions in every 6th room.
- `tests/tiles.test.ts` — the complete tile table (tile numbers are used by the room files).
- `tests/passwords.test.ts` — password round trips.

After an intended behaviour change: `UPDATE_GOLDEN=1 npx vitest run`, and review why frames
changed. Never update the goldens to make a refactoring pass.
