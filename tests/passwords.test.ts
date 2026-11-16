import { beforeEach, describe, expect, it } from 'vitest';
import { generatePassword, readPassword } from '../src/game/passwords';
import { DEFAULT_PASSWORD, G } from '../src/game/state';

/** Clear everything readpassword() reads into (it ORs items and adds to counters). */
function resetState(): void {
  G.arrows = 0;
  G.coins = 0;
  G.keys = 0;
  G.maxEnergy = [0, 0];
  G.energy = [0, 0];
  G.shownEnergy = [0, 0];
  G.character = 0;
  G.characterAlive = [true, true];
  G.canRevive = [true, true];
  G.items = G.items.map(() => false);
  G.hasCross = false;
  G.hasWorldKey = false;
  G.worldItems = G.worldItems.map((row) => row.map(() => false));
  G.worldDoorsOpen = G.worldDoorsOpen.map(() => false);
  G.nextWorld = 0;
}

describe('passwords', () => {
  beforeEach(resetState);

  it('round-trips the default password', () => {
    expect(DEFAULT_PASSWORD).toBe('UR3FUR3FUR4F423RUR3FUR3FUR3FUR3FUR3FUR3FURS48');
    expect(readPassword(DEFAULT_PASSWORD)).toBe(true);
    expect(generatePassword()).toBe(DEFAULT_PASSWORD);
  });

  it('rejects a password with a wrong checksum', () => {
    expect(readPassword(DEFAULT_PASSWORD.slice(0, 43) + '00')).toBe(false);
  });

  it('round-trips a modified game state', () => {
    G.arrows = 123;
    G.coins = 45;
    G.keys = 7;
    G.maxEnergy = [20 * 16, 9 * 16];
    G.character = 1;
    G.characterAlive = [true, true];
    G.items[0] = true;
    G.items[5] = true;
    G.items[29] = true;
    G.items[30] = true; // bronze shield
    G.items[33] = true;
    G.items[36] = true;
    G.hasCross = true;
    G.hasWorldKey = true;
    G.worldItems[0] = [true, false, true, true];
    G.worldItems[1] = [false, true, false, false];
    G.worldItems[9] = [true, true, true, true];
    G.worldDoorsOpen[0] = true;
    G.worldDoorsOpen[1] = true;
    G.nextWorld = 3;

    const pw = generatePassword();
    expect(pw).toHaveLength(45);
    expect(pw).not.toBe(DEFAULT_PASSWORD);

    const expected = {
      n_arrows: G.arrows,
      n_coins: G.coins,
      n_keys: G.keys,
      player_max: [...G.maxEnergy],
      character: G.character,
      live_character: [...G.characterAlive],
      item: [...G.items],
      cross: G.hasCross,
      world_key: G.hasWorldKey,
      world_item: G.worldItems.map((r) => [...r]),
      world_doors_open: [...G.worldDoorsOpen],
      next_world: G.nextWorld,
    };

    resetState();
    expect(readPassword(pw)).toBe(true);
    expect({
      n_arrows: G.arrows,
      n_coins: G.coins,
      n_keys: G.keys,
      player_max: [...G.maxEnergy],
      character: G.character,
      live_character: [...G.characterAlive],
      item: [...G.items],
      cross: G.hasCross,
      world_key: G.hasWorldKey,
      world_item: G.worldItems.map((r) => [...r]),
      world_doors_open: [...G.worldDoorsOpen],
      next_world: G.nextWorld,
    }).toEqual(expected);
    expect(G.energy).toEqual(G.maxEnergy);
    expect(generatePassword()).toBe(pw);
  });
});
