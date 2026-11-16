/**
 * Golden master of the tile table built by loadGraphics (original graphic set):
 * every tile's source rectangle, collision type, hot spot and bitmap, plus the
 * tile numbers in tileIds. Room files refer to tiles by number, so this must
 * never change by accident.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { loadGraphics } from '../src/game/gametiles';
import { gfx, tileIds } from '../src/game/resources';
import { G } from '../src/game/state';
import { registerBinary } from '../src/platform/assets';

const GOLDEN = join(__dirname, 'golden', 'tiles.txt');

test('tile table matches the golden master', () => {
  const dir = join(__dirname, '..', 'assets', 'graphics', 'original');
  for (const f of readdirSync(dir))
    registerBinary(`graphics/original/${f}`, new Uint8Array(readFileSync(join(dir, f))));
  loadGraphics();
  const names = new Map(Object.entries(gfx).map(([k, v]) => [v, k]));
  const lines = [`tileIds ${JSON.stringify(tileIds)}`];
  for (let i = 0; i < G.tileCount; i++) {
    const t = G.tiles[i];
    const s = t.sprite;
    lines.push(
      `${i} ${names.get(s.bitmap)} ${s.x},${s.y} ${s.w}x${s.h} type=${t.collisionType} off=${s.offsetX},${s.offsetY}`,
    );
  }
  const text = lines.join('\n') + '\n';
  if (!existsSync(GOLDEN) || process.env.UPDATE_GOLDEN) writeFileSync(GOLDEN, text);
  expect(text).toBe(readFileSync(GOLDEN, 'utf8'));
});
