/**
 * Codemod for src/game/gametiles.ts: rewrite the 800+ statements
 *   G.tiles[G.tileCount++] = new Tile(bmp, x, y, w, h, type, ox?, oy?);
 * into `add(...)` and, for runs of equally sized tiles laid out row by row,
 * `addGrid(...)`. Tile order (and so every tile number) is unchanged; each
 * emitted line gets a comment with the tile numbers it creates.
 * Usage: node tools/compact-tiles.mjs
 */
import ts from 'typescript';
import fs from 'node:fs';

const FILE = 'src/game/gametiles.ts';
const text = fs.readFileSync(FILE, 'utf8');
const sf = ts.createSourceFile(FILE, text, ts.ScriptTarget.Latest, true);
let fn;
ts.forEachChild(sf, (n) => {
  if (ts.isFunctionDeclaration(n) && n.name?.text === 'loadGraphics') fn = n;
});

const T = 16;
const env = { TILE_SIZE_X: T, TILE_SIZE_Y: T, TILE_UNIT: 2, idiv: (a, b) => Math.trunc(a / b) };
function evalNum(expr) {
  if (!/^[\w\s*+\-/(),.]+$/.test(expr)) return null;
  try {
    const v = Function(...Object.keys(env), `return (${expr});`)(...Object.values(env));
    return Number.isInteger(v) ? v : null;
  } catch {
    return null;
  }
}
/** Pixel value written in tile units where possible: 64 → `4 * T`. */
function px(v) {
  if (v === 0) return '0';
  if (v % T === 0) return v === T ? 'T' : v === -T ? '-T' : `${v / T} * T`;
  return String(v);
}

/** Parse `G.tiles[G.tileCount++] = new Tile(...)`, or return null. */
function parseAdd(stmt) {
  if (!ts.isExpressionStatement(stmt)) return null;
  const e = stmt.expression;
  if (!ts.isBinaryExpression(e) || e.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return null;
  if (e.left.getText(sf).replace(/\s/g, '') !== 'G.tiles[G.tileCount++]') return null;
  if (!ts.isNewExpression(e.right) || e.right.expression.getText(sf) !== 'Tile') return null;
  const a = e.right.arguments.map((x) => x.getText(sf).replace(/\s+/g, ' '));
  const nums = a.slice(1, 5).map(evalNum);
  const ox = a[6] !== undefined ? evalNum(a[6]) : 0;
  const oy = a[7] !== undefined ? evalNum(a[7]) : 0;
  if (nums.some((n) => n === null) || ox === null || oy === null) return { raw: a };
  return { bmp: a[0], x: nums[0], y: nums[1], w: nums[2], h: nums[3], type: a[5], ox, oy };
}

const stmts = fn.body.statements;
const out = [];
let index = null; // running tile number when statically known
let i = 0;
const indent = '  ';
const leading = (s) =>
  (ts.getLeadingCommentRanges(text, s.pos) ?? [])
    .map((r) => text.slice(r.pos, r.end))
    .filter((c) => !/^\/\/\s*\d+\s*$/.test(c)); // drop old "// 123" index markers

while (i < stmts.length) {
  const s = stmts[i];
  const comments = leading(s);
  const a = parseAdd(s);
  if (/G\.tileCount = 0/.test(s.getText(sf))) index = 0;
  if (!a) {
    if (s.getText(sf).includes('G.tileCount++')) index = null; // nested adds: numbering unknown
    for (const c of comments) out.push(indent + c);
    out.push(indent + s.getText(sf).replace(/\n/g, '\n'));
    i++;
    continue;
  }
  for (const c of comments) out.push(indent + c);
  if (a.raw) {
    out.push(`${indent}add(${a.raw.join(', ')});${index !== null ? ` // ${index}` : ''}`);
    if (index !== null) index++;
    i++;
    continue;
  }
  // Grow a grid: same bitmap/size/type/offset, x advancing by w; rows restart at the same x.
  let cols = 1;
  let rows = 1;
  let j = i + 1;
  const same = (b) =>
    b && !b.raw && b.bmp === a.bmp && b.w === a.w && b.h === a.h && b.type === a.type && b.ox === a.ox && b.oy === a.oy;
  const at = (k) => (k < stmts.length && leading(stmts[k]).length === 0 ? parseAdd(stmts[k]) : null);
  while (same(at(j)) && at(j).y === a.y && at(j).x === a.x + cols * a.w) {
    cols++;
    j++;
  }
  if (cols > 1) {
    for (;;) {
      let ok = true;
      for (let c = 0; c < cols; c++) {
        const b = at(j + c);
        if (!same(b) || b.y !== a.y + rows * a.h || b.x !== a.x + c * a.w) {
          ok = false;
          break;
        }
      }
      if (!ok) break;
      rows++;
      j += cols;
    }
  }
  const n = cols * rows;
  const tail = [
    a.type === '0' ? (a.ox || a.oy ? '0' : null) : a.type,
    a.ox || a.oy ? px(a.ox) : null,
    a.oy ? px(a.oy) : null,
  ];
  while (tail.length && tail[tail.length - 1] === null) tail.pop();
  const extra = tail.length ? ', ' + tail.map((t) => t ?? '0').join(', ') : '';
  const range = index !== null ? ` // ${n > 1 ? `${index}–${index + n - 1}` : index}` : '';
  if (n === 1) out.push(`${indent}add(${a.bmp}, ${px(a.x)}, ${px(a.y)}, ${px(a.w)}, ${px(a.h)}${extra});${range}`);
  else
    out.push(
      `${indent}addGrid(${a.bmp}, ${px(a.x)}, ${px(a.y)}, ${cols}, ${rows}, ${px(a.w)}, ${px(a.h)}${extra});${range}`,
    );
  if (index !== null) index += n;
  i += n;
}

const header = text.slice(0, fn.body.getStart(sf) + 1);
const footer = text.slice(fn.body.end - 1);
const helpers = `
/** Tile size in pixels (TILE_SIZE_X === TILE_SIZE_Y). */
const T = TILE_SIZE_X;

/** Add one tile: the source rectangle (x, y, w, h) in pixels of \`bmp\`. */
function add(bmp: Bitmap, x: number, y: number, w: number, h: number, type = 0, ox = 0, oy = 0): void {
  G.tiles[G.tileCount++] = new Tile(bmp, x, y, w, h, type, ox, oy);
}

/** Add cols×rows tiles of w×h pixels, row by row, starting at pixel (x, y). */
function addGrid(bmp: Bitmap, x: number, y: number, cols: number, rows: number, w: number, h: number, type = 0, ox = 0, oy = 0): void {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) add(bmp, x + c * w, y + r * h, w, h, type, ox, oy);
}
`;
const fnStart = fn.getStart(sf);
const result =
  text.slice(0, fnStart) + helpers.trimStart() + '\n' + header.slice(fnStart) + '\n' + out.join('\n') + '\n' + footer;
fs.writeFileSync(FILE, result);
console.log(`loadGraphics: ${stmts.length} statements → ${out.length} lines`);
