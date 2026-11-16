/**
 * Helpers that reproduce C semantics the original code relies on.
 */

/** C integer division (truncates toward zero). Use for every `int / int`. */
export function idiv(a: number, b: number): number {
  return Math.trunc(a / b);
}

/** C `int(x)` cast of a float: truncate toward zero. */
export function toInt(x: number): number {
  return Math.trunc(x);
}

/** C `(float)` arithmetic is single precision; round like the original where it matters. */
export const f32 = Math.fround;

let seed = 1;

/** Seed the pseudo random generator (C `srand`). */
export function srand(s: number): void {
  seed = s >>> 0 || 1;
}

/** C `rand()`: non-negative 31-bit integer. Deterministic for a given seed (useful for tests). */
export function rand(): number {
  // xorshift32, reduced to 31 bits.
  seed ^= seed << 13;
  seed >>>= 0;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  seed >>>= 0;
  return seed & 0x7fffffff;
}

srand(Date.now());

/** Replace one character of a string (for code that edits `char[]` buffers in place). */
export function setCharAt(s: string, index: number, ch: string): string {
  if (index >= s.length) s = s.padEnd(index + 1, ' ');
  return s.slice(0, index) + ch + s.slice(index + 1);
}

/**
 * Minimal `fscanf` replacement over a text file: whitespace-separated tokens,
 * `%i` (C semantics: 0x.. hex, leading 0 octal) and `%s`.
 */
export class Scanner {
  private tokens: string[];
  private pos = 0;

  constructor(text: string) {
    this.tokens = text.split(/\s+/).filter((t) => t.length > 0);
  }

  /** `fscanf("%s")`; returns null at end of file. */
  str(): string | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos++] : null;
  }

  /** `fscanf("%i")`; returns null at end of file or if the token is not a number. */
  int(): number | null {
    const t = this.str();
    if (t === null) return null;
    const m = /^([+-]?)(0[xX][0-9a-fA-F]+|0[0-7]*|[1-9][0-9]*)/.exec(t);
    if (!m) return null;
    const sign = m[1] === '-' ? -1 : 1;
    const body = m[2];
    let v: number;
    if (/^0[xX]/.test(body)) v = parseInt(body.slice(2), 16);
    else if (body.length > 1 && body[0] === '0') v = parseInt(body, 8);
    else v = parseInt(body, 10);
    // fscanf stops at the first character that does not belong to the number;
    // the rest of the token stays in the stream.
    if (m[0].length < t.length) this.tokens[--this.pos] = t.slice(m[0].length);
    return sign * v;
  }

  /** Like int() but returns 0 instead of null (for code that ignores fscanf's return value). */
  int0(): number {
    return this.int() ?? 0;
  }

  eof(): boolean {
    return this.pos >= this.tokens.length;
  }
}
