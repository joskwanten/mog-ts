import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { runPlayerMoves } from './replay';

const GOLDEN = join(__dirname, 'golden', 'player.txt');

test('player movement replay matches the golden master', () => {
  const { hashes } = runPlayerMoves({ seed: 777, roomStep: 6, starts: 1 });
  if (!existsSync(GOLDEN) || process.env.UPDATE_GOLDEN) {
    writeFileSync(GOLDEN, hashes.join('\n') + '\n');
    return;
  }
  const golden = readFileSync(GOLDEN, 'utf8').trim().split('\n');
  const first = hashes.findIndex((h, i) => h !== golden[i]);
  expect(first === -1 ? null : { frame: first, got: hashes[first], want: golden[first] }).toBeNull();
  expect(hashes.length).toBe(golden.length);
}, 120000);
