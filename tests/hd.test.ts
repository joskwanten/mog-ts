/**
 * The HD path: every bitmap of the original set gets an HD version that is
 * the PCX enlarged 2× by repeating pixels. Rendered at scale 2 from those HD
 * bitmaps (including the demons dissolving and the water scrolling in the HD
 * sheets), every frame of the coverage run must equal the 1× golden master.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { gfx } from '../src/game/resources';
import { registerNearestHd, runCoverage } from './replay';

test('a 2× rendering from HD graphics matches the 1× golden master', () => {
  registerNearestHd('original', 2);
  const { hashes } = runCoverage({ seed: 4321, roomFrames: 30, passageFrames: 80, demonFrames: 400, scale: 2 });
  expect(gfx.tiles?.hd).toBeTruthy();
  const golden = readFileSync(join(__dirname, 'golden', 'coverage.txt'), 'utf8')
    .trim()
    .split('\n');
  const first = hashes.findIndex((h, i) => h !== golden[i]);
  expect(first === -1 ? null : { frame: first, got: hashes[first], want: golden[first] }).toBeNull();
  expect(hashes.length).toBe(golden.length);
});
