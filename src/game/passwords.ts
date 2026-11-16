/**
 * Port of passwords.cpp: encode/decode the game state as a 45-character password.
 *
 * `bool` bit arrays become boolean[]; `char *passwd` becomes a JS string
 * (characters past the end of the string read as C's '\0').
 */
import { idiv } from './cutil';
import { G } from './state';

function digit2BCD(digit: number, BCD: boolean[]): void {
  BCD[0] = (digit & 0x08) !== 0;
  BCD[1] = (digit & 0x04) !== 0;
  BCD[2] = (digit & 0x02) !== 0;
  BCD[3] = (digit & 0x01) !== 0;
}

const b2i = (b: boolean): number => (b ? 1 : 0);

function BCD2digit(BCD: boolean[]): number {
  return (b2i(BCD[3]) << 0) + (b2i(BCD[2]) << 1) + (b2i(BCD[1]) << 2) + (b2i(BCD[0]) << 3);
}

function value2block(val: number, block: boolean[]): void {
  block[0] = (val & 0x10) !== 0;
  block[1] = (val & 0x08) !== 0;
  block[2] = (val & 0x04) !== 0;
  block[3] = (val & 0x02) !== 0;
  block[4] = (val & 0x01) !== 0;
}

function block2value(block: boolean[]): number {
  return (
    (b2i(block[4]) << 0) + (b2i(block[3]) << 1) + (b2i(block[2]) << 2) + (b2i(block[1]) << 3) + (b2i(block[0]) << 4)
  );
}

function writebits(bits: boolean[], dest: boolean[], start: number, len: number): void {
  for (let i = 0; i < len; i++) {
    dest[start + i] = bits[i];
  }
}

function readbits(bits: boolean[], data: boolean[], start: number, len: number): void {
  for (let i = 0; i < len; i++) {
    bits[i] = data[start + i];
  }
}

/** C `passwd[i]`: '\0' past the end of the string. */
function charAt(passwd: string, i: number): string {
  return i < passwd.length ? passwd[i] : '\0';
}

/** Returns the 45 password characters (C wrote them into `passwd[0..44]`). */
function bits2characters(bits: boolean[]): string[] {
  const lbits: boolean[] = new Array<boolean>(5).fill(false);
  const str = 'F3RU72G4X5BKN90PQTHVE6OMWAJ18DSILYCZ';
  const passwd: string[] = [];

  for (let i = 0; i < 45; i++) {
    const pos = i & 0x03;
    readbits(lbits, bits, i * 5, 5);
    const val = block2value(lbits);
    passwd[i] = str[val + 3 - pos];
  }
  return passwd;
}

function characters2bits(bits: boolean[], passwd: string): void {
  const lbits: boolean[] = new Array<boolean>(5).fill(false);
  const str = 'F3RU72G4X5BKN90PQTHVE6OMWAJ18DSILYCZ.... ';

  for (let i = 0; i < 45; i++) {
    const pos = i & 0x03;
    let val = 0;
    const ch = charAt(passwd, i);
    // strchr also finds the terminating '\0'
    const idx = ch === '\0' ? str.length : str.indexOf(ch);
    if (idx >= 0) val = idx + pos - 3;

    value2block(val, lbits);
    writebits(lbits, bits, i * 5, 5);
  }
}

function pwChar2num(ch: string): number {
  if (ch === ' ') return 0;
  if (ch >= '0' && ch <= '9') return ch.charCodeAt(0) - 48 + 1;
  if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0) - 65 + 1 + 10;
  return 0; // fallback for unknown characters
}

function pwChecksumchars2num(ch1: string, ch2: string): number {
  // unsigned char result
  return (((pwChar2num(ch1) - 1) << 4) | (pwChar2num(ch2) - 1)) & 0xff;
}

function addchecksum(passwd: string[]): void {
  const hex = '0123456789ABCDEF';
  let sum = 0; // unsigned char

  for (let pos = 0; pos < 43; pos++) {
    sum = (sum + pwChar2num(passwd[pos] ?? '\0')) & 0xff;
  }

  passwd[43] = hex[(sum >> 4) % 16];
  passwd[44] = hex[sum % 16];
}

export function generatePassword(): string {
  let i: number;
  let val: number;
  const bits: boolean[] = new Array<boolean>(45 * 5);
  const BCD: boolean[] = new Array<boolean>(4).fill(false);
  const block: boolean[] = new Array<boolean>(5).fill(false);

  for (i = 0; i < 45 * 5; i++) bits[i] = false;

  // Store arrows, keys and coins.
  // Arrows:
  val = idiv(G.arrows, 100);
  digit2BCD(val, BCD);
  writebits(BCD, bits, 12, 4);
  val = idiv(G.arrows, 10) % 10;
  digit2BCD(val, BCD);
  writebits(BCD, bits, 0, 4);
  val = G.arrows % 10;
  digit2BCD(val, BCD);
  writebits(BCD, bits, 4, 4);
  // Coins:
  val = idiv(G.coins, 100);
  digit2BCD(val, BCD);
  writebits(BCD, bits, 28, 4);
  val = idiv(G.coins, 10) % 10;
  digit2BCD(val, BCD);
  writebits(BCD, bits, 16, 4);
  val = G.coins % 10;
  digit2BCD(val, BCD);
  writebits(BCD, bits, 20, 4);
  // Keys:
  val = idiv(G.keys, 100);
  digit2BCD(val, BCD);
  writebits(BCD, bits, 44, 4);
  val = idiv(G.keys, 10) % 10;
  digit2BCD(val, BCD);
  writebits(BCD, bits, 32, 4);
  val = G.keys % 10;
  digit2BCD(val, BCD);
  writebits(BCD, bits, 36, 4);

  // Store life meters.
  // Popolon:
  val = idiv(G.maxEnergy[0], 16);
  value2block(val, block);
  writebits(block, bits, 14 * 5 + 4, 5);
  value2block(6, block);
  writebits(block, bits, 13 * 5 + 1, 5);
  // Aphrodite:
  val = idiv(G.maxEnergy[1], 16);
  value2block(val, block);
  writebits(block, bits, 11 * 5 + 3, 5);
  value2block(6, block);
  writebits(block, bits, 10 * 5, 5);

  // Store world information.
  const wstart = [85, 93, 101, 109, 117, 125, 133, 141, 149, 157];
  for (i = 0; i < 10; i++) {
    BCD[0] = G.worldItems[i][2];
    BCD[1] = G.worldItems[i][1];
    BCD[2] = G.worldItems[i][0];
    BCD[3] = G.worldItems[i][3];
    writebits(BCD, bits, wstart[i], 4);

    BCD[0] = false;
    if (G.nextWorld - 1 === i && !G.worldDoorsOpen[i]) BCD[2] = true;
    else BCD[2] = false;
    if (G.nextWorld - 1 > i) BCD[1] = true;
    else BCD[1] = false;
    if (G.worldDoorsOpen[i]) BCD[3] = true;
    else BCD[3] = false;
    writebits(BCD, bits, wstart[i] + 4, 4);
  }

  // Store objects.
  // Standard objects:
  for (i = 0; i < 30; i++) {
    if (i === 27) {
      // shield:
      if (G.items[27] || G.items[30] || G.items[31]) bits[35 * 5 + 2 + 27] = true;
      if (G.items[31] && !G.items[27]) bits[35 * 5 + 2 + 30] = true;
      if (G.items[27]) bits[35 * 5 + 2 + 31] = true;
    } else {
      if (G.items[i]) bits[35 * 5 + 2 + i] = true;
    }
  }
  // Weapons:
  for (i = 0; i < 4; i++) {
    if (G.items[32 + i]) bits[33 * 5 + i] = true;
  }
  if (G.items[32 + 4]) bits[33 * 5 + 5] = true;
  if (G.items[32 + 5]) bits[33 * 5 + 4] = true;
  // Special items:
  if (G.hasWorldKey) bits[35 * 5 + 1] = true;
  if (G.hasCross) bits[35 * 5] = true;
  // Store characters:
  if (G.character === 0) {
    if (G.characterAlive[1]) val = 17;
    else val = 16;
  } else {
    if (G.characterAlive[0]) val = 2;
    else val = 0;
  }
  if (G.canRevive[0]) val += 8;
  if (G.canRevive[1]) val += 4;
  value2block(val, block);
  writebits(block, bits, 42 * 5, 5);

  const passwd = bits2characters(bits);

  // Generate checksum:
  addchecksum(passwd);

  return passwd.join('');
}

export function readPassword(passwd: string): boolean {
  let i: number;
  const pt: string[] = [];
  const bits: boolean[] = new Array<boolean>(45 * 5).fill(false);
  const BCD: boolean[] = new Array<boolean>(4).fill(false);
  const block: boolean[] = new Array<boolean>(5).fill(false);
  let val: number;

  for (i = 0; i < 45; i++) pt[i] = charAt(passwd, i);
  addchecksum(pt);
  const computedChecksum = pwChecksumchars2num(pt[43], pt[44]);
  const enteredChecksum = pwChecksumchars2num(charAt(passwd, 43), charAt(passwd, 44));
  if (computedChecksum - enteredChecksum !== 0) return false;

  characters2bits(bits, passwd);

  // Read arrows, keys and coins.
  // NOTE (original): the counters are added to, not assigned (callers reset them first).
  // Arrows:
  readbits(BCD, bits, 12, 4);
  val = BCD2digit(BCD);
  G.arrows += val * 100;
  readbits(BCD, bits, 0, 4);
  val = BCD2digit(BCD);
  G.arrows += val * 10;
  readbits(BCD, bits, 4, 4);
  val = BCD2digit(BCD);
  G.arrows += val;
  // Coins:
  readbits(BCD, bits, 28, 4);
  val = BCD2digit(BCD);
  G.coins += val * 100;
  readbits(BCD, bits, 16, 4);
  val = BCD2digit(BCD);
  G.coins += val * 10;
  readbits(BCD, bits, 20, 4);
  val = BCD2digit(BCD);
  G.coins += val;
  // Keys:
  readbits(BCD, bits, 44, 4);
  val = BCD2digit(BCD);
  G.keys += val * 100;
  readbits(BCD, bits, 32, 4);
  val = BCD2digit(BCD);
  G.keys += val * 10;
  readbits(BCD, bits, 36, 4);
  val = BCD2digit(BCD);
  G.keys += val;

  // Read life meters.
  // Popolon:
  readbits(block, bits, 14 * 5 + 4, 5);
  val = block2value(block);
  G.maxEnergy[0] = G.energy[0] = G.shownEnergy[0] = val * 16;
  // Aphrodite:
  readbits(block, bits, 11 * 5 + 3, 5);
  val = block2value(block);
  G.maxEnergy[1] = G.energy[1] = G.shownEnergy[1] = val * 16;

  // Read objects.
  // Standard objects:
  for (i = 0; i < 30; i++) {
    if (i === 27) {
      // shield:
      if (bits[35 * 5 + 2 + 31]) G.items[27] = true;
      if (bits[35 * 5 + 2 + 30]) G.items[31] = true;
      if (!bits[35 * 5 + 2 + 31] && !bits[35 * 5 + 2 + 30] && bits[35 * 5 + 2 + 27]) G.items[30] = true;
    } else {
      if (bits[35 * 5 + 2 + i]) G.items[i] = true;
    }
  }
  // Weapons:
  for (i = 0; i < 4; i++) {
    if (bits[33 * 5 + i]) G.items[32 + i] = true;
  }
  if (bits[33 * 5 + 5]) G.items[32 + 4] = true;
  if (bits[33 * 5 + 4]) G.items[32 + 5] = true;
  // Special items:
  if (bits[35 * 5 + 1]) G.hasWorldKey = true;
  if (bits[35 * 5]) G.hasCross = true;

  // Read world information.
  const wstart = [85, 93, 101, 109, 117, 125, 133, 141, 149, 157];
  G.nextWorld = 0;
  if (G.hasWorldKey) G.nextWorld = 1;
  for (i = 0; i < 10; i++) {
    readbits(BCD, bits, wstart[i], 4);
    G.worldItems[i][2] = BCD[0];
    G.worldItems[i][1] = BCD[1];
    G.worldItems[i][0] = BCD[2];
    G.worldItems[i][3] = BCD[3];

    readbits(BCD, bits, wstart[i] + 4, 4);
    if (BCD[3]) {
      G.worldDoorsOpen[i] = true;
      if (G.hasWorldKey) G.nextWorld = i + 2;
      else G.nextWorld = i + 1;
    }
  }

  // Read characters:
  readbits(block, bits, 42 * 5, 5);
  // NOTE (original): both flags are set to true unconditionally, so the stored
  // "can revive" bits never clear them.
  G.canRevive[0] = G.canRevive[1] = true;
  if (block[1]) G.canRevive[0] = true;
  if (block[2]) G.canRevive[1] = true;
  block[1] = false;
  block[2] = false;
  val = block2value(block);
  switch (val) {
    case 17:
      G.characterAlive[0] = G.characterAlive[1] = true;
      G.character = 0;
      break;
    case 16:
      G.characterAlive[0] = true;
      G.characterAlive[1] = false;
      G.character = 0;
      break;
    case 2:
      G.characterAlive[0] = G.characterAlive[1] = true;
      G.character = 1;
      break;
    case 0:
      G.characterAlive[0] = false;
      G.characterAlive[1] = true;
      G.character = 1;
      break;
  }

  return true;
}
