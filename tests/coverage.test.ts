import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { runCoverage } from './replay';

const GOLDEN = join(__dirname, 'golden', 'coverage.txt');

test('coverage replay (all rooms, shrines, demon fights) matches the golden master', () => {
  const { hashes } = runCoverage({ seed: 4321, roomFrames: 30, passageFrames: 80, demonFrames: 400 });
  if (!existsSync(GOLDEN) || process.env.UPDATE_GOLDEN) {
    writeFileSync(GOLDEN, hashes.join('\n') + '\n');
    return;
  }
  const golden = readFileSync(GOLDEN, 'utf8').trim().split('\n');
  const first = hashes.findIndex((h, i) => h !== golden[i]);
  expect(first === -1 ? null : { frame: first, got: hashes[first], want: golden[first] }).toBeNull();
  expect(hashes.length).toBe(golden.length);
}, 120000);
