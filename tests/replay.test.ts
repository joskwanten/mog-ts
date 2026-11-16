import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { runReplay } from './replay';

const GOLDEN = join(__dirname, 'golden', 'replay.txt');

test('replay matches the golden master frame by frame', () => {
  const { hashes } = runReplay({ frames: 4000, seed: 1234 });
  if (!existsSync(GOLDEN) || process.env.UPDATE_GOLDEN) {
    writeFileSync(GOLDEN, hashes.join('\n') + '\n');
    return;
  }
  const golden = readFileSync(GOLDEN, 'utf8').trim().split('\n');
  const first = hashes.findIndex((h, i) => h !== golden[i]);
  expect(first === -1 ? null : { frame: first, got: hashes[first], want: golden[first] }).toBeNull();
  expect(hashes.length).toBe(golden.length);
});
