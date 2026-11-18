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
| bitmaps.cpp, sprites.h, tiles.h | `src/engine/bitmap.ts`, `sprite.ts`, `tile.ts`                   | `Bitmap` (RGBA; `decodePCX`, `rgba`), `Sprite`, `Tile`                                                                                                                             |
| drawing.cpp, line_clip.cpp      | `src/engine/drawing.ts`                                          | `fillRect`, `strokeRect`, `drawLine` on a `Screen`; `memset`                                                                                                                       |
| keyboard.cpp, SDL keys          | `src/platform/keyboard.ts`                                       | `SDLK_*`, `getKeyboardState`, `keyName`                                                                                                                                            |
| sound.cpp                       | `src/platform/audio.ts`                                          | `playSound`, `createSound`, `playMusic`, `stopMusic`, …                                                                                                                            |
| filehandling.cpp, path.cpp      | `src/platform/assets.ts`                                         | `readText`, `readBinary`, `GRAPHIC_SETS`, `SOUND_SETS`                                                                                                                             |
| render.cpp, main.cpp            | `src/platform/video.ts`, `src/main.ts`                           | `Video`, game loop                                                                                                                                                                 |
| — (new)                         | `src/platform/glvideo.ts`, `src/game/lights.ts`                  | `GLVideo` (WebGL output with lighting, shadows, bloom), `sceneLighting` (read-only light sources)                                                                                  |
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

**Frame buffer and collision.** The game works in logical pixels (640×400). Every frame
it draws into a `Screen` (`src/engine/screen.ts`): RGBA pixels (packed as in `ImageData`;
the alpha byte is ignored on output), `scale`×`scale` of them per logical pixel (default 2:
1280×800). It paints the same logical pixels' collision types (`T_WALL`, `T_PLAYER`, …)
into the 8-bit `G.collision`.
Collision tests read that buffer, so the order of drawing and testing is behaviour. Do not
reorder statements without the replay tests.

**Colour.** The remake drew in 256 colours with the palette of `konami.pcx`. Here
`loadBitmap` converts each PCX to RGBA with that palette (`G.palette`); colour index 0
becomes transparent (stored as 0). A pixel that is not 0 is drawn — blended when its
alpha is below 255 — and paints the collision buffer. Colours the game gives as palette
indices (bars, map, screen clears) go through `paletteColor(i)`.

**HD graphics.** A bitmap may have an HD version (`Bitmap.hd`, loaded from
`graphics/<set>/hd/<name>.png`, an integer multiple of the PCX size). The collision buffer
always uses the PCX. On a screen of the HD version's scale, colour is drawn from the HD
bitmap with the same blit in physical pixels; otherwise each logical pixel becomes a block.
Code that changes a bitmap in place (water, dissolving demons) uses `clearRect` /
`rotateRowLeft`, which change the HD version too; per-pixel copies use `copyPixel`.

**Integer semantics.** C `int` arithmetic stays integer: every `int / int` is
`idiv(a, b)`; `int(float)` is `toInt(x)`; `rand()` comes from `cutil.ts` (seedable).

**Original quirks.** Bugs of the remake are kept and marked `// NOTE (original):`. Fix
one only on purpose, and update the golden replays in the same change. Fixed so far:
the cyclops overwrote the screen-size parameters for the rest of the frame
(`NOTE (original, fixed)` in `enemies/enemiesB.ts`).

**Formatting.** `npm run format` (Prettier); `npm run lint` checks formatting and types.

## Tests

All tests are golden masters: they record, frame by frame, a hash of the frame buffer (as
RGB) and the collision buffer plus the sounds and music requested, and compare with `tests/golden/`.

- `tests/replay.test.ts` — 4000 frames of seeded random play with teleports through all worlds.
- `tests/coverage.test.ts` — every one of the 311 rooms with random play, every shrine and
  shop screen, every demon fight (~15 000 frames, ~75 s).
- `tests/player.test.ts` — fixed movement patterns (walk, jump, fall, ladders, sword,
  weapon) from random start positions in every 6th room.
- `tests/tiles.test.ts` — the complete tile table (tile numbers are used by the room files).
- `tests/bitmap.test.ts` — RGBA conversion, transparency, alpha blending, HD drawing.
- `tests/scale2.test.ts` — the replay at scale 2 (blocks) equals the 1× golden.
- `tests/hd.test.ts` — the coverage run at scale 2 from HD bitmaps (the PCX enlarged by
  repeating pixels) equals the 1× golden.
- `tests/passwords.test.ts` — password round trips.

After an intended behaviour change: `UPDATE_GOLDEN=1 npx vitest run`, and review why frames
changed. Never update the goldens to make a refactoring pass.
