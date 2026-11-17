/**
 * The game rendered at 1280×800 (scale 2) without HD graphics: every game
 * pixel becomes a 2×2 block, so the picture must equal the 1× golden master.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { runReplay } from './replay';

test('a 2× rendering without HD graphics matches the 1× golden master', () => {
  const { hashes } = runReplay({ frames: 4000, seed: 1234, scale: 2 });
  const golden = readFileSync(join(__dirname, 'golden', 'replay.txt'), 'utf8')
    .trim()
    .split('\n');
  const first = hashes.findIndex((h, i) => h !== golden[i]);
  expect(first === -1 ? null : { frame: first, got: hashes[first], want: golden[first] }).toBeNull();
  expect(hashes.length).toBe(golden.length);
});
