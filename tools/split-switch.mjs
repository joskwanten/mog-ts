/**
 * Codemod: turn the cases of a big `switch` inside a function into separate
 * functions plus a dispatch table.
 *
 * Usage: node tools/split-switch.mjs <spec.json>
 * spec: {
 *   file, fn,                         function containing the switch
 *   discriminant,                     e.g. "G.state" (the first switch on it is split)
 *   params: "screen: Uint8Array, keyboard: Uint8Array",
 *   args: "screen, keyboard",
 *   shared: { "tmp": "let tmp: string;" },   locals of `fn` the cases use, re-declared per case
 *   table: "STATE_HANDLERS", tableType: "(screen: Uint8Array, keyboard: Uint8Array) => void",
 *   keyExpr: "State.%s" or null,      how a case label is written in the table (null = number)
 *   names: { "0": ["konamiAppear", "KonamiAppear"], ... }   function name, label name
 * }
 * A `break` that leaves the switch becomes `return`. Cases may not fall through.
 */
import ts from 'typescript';
import fs from 'node:fs';

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const text = fs.readFileSync(spec.file, 'utf8');
const sf = ts.createSourceFile(spec.file, text, ts.ScriptTarget.Latest, true);

let fn;
ts.forEachChild(sf, (n) => {
  if (ts.isFunctionDeclaration(n) && n.name?.text === spec.fn) fn = n;
});
if (!fn) throw new Error(`function ${spec.fn} not found`);

let sw;
const findSwitch = (n) => {
  if (sw) return;
  if (ts.isSwitchStatement(n) && n.expression.getText(sf) === spec.discriminant) {
    sw = n;
    return;
  }
  ts.forEachChild(n, findSwitch);
};
findSwitch(fn.body);
if (!sw) throw new Error('switch not found');

/** Breaks whose target is `sw` (not inside a nested loop or switch). */
function outerBreaks(node) {
  const out = [];
  const visit = (n, nested) => {
    if (ts.isBreakStatement(n) && !n.label && !nested) out.push(n);
    const isBreakable = ts.isSwitchStatement(n) || ts.isIterationStatement(n, false);
    if (ts.isFunctionLike(n)) return;
    ts.forEachChild(n, (c) => visit(c, nested || isBreakable));
  };
  visit(node, false);
  return out;
}

const functions = [];
const entries = [];
const clauses = sw.caseBlock.clauses;
for (let ci = 0; ci < clauses.length; ci++) {
  const c = clauses[ci];
  if (!ts.isCaseClause(c)) throw new Error('default clause not supported');
  const label = c.expression.getText(sf);
  const [name, labelName] = spec.names[label] ?? [];
  if (!name) throw new Error(`no name for case ${label}`);
  let stmts = [...c.statements];
  if (stmts.length === 0) throw new Error(`case ${label} falls through`);
  const last = stmts[stmts.length - 1];
  let bodyStart;
  let bodyEnd;
  let inner = stmts;
  if (ts.isBreakStatement(last)) inner = stmts.slice(0, -1);
  else if (!(ts.isReturnStatement(last) || (ts.isBlock(last) && endsWithBreak(last)))) {
    throw new Error(`case ${label} may fall through`);
  }
  // Unwrap `case N: { ... }` (optionally followed by break).
  if (inner.length === 1 && ts.isBlock(inner[0])) {
    const b = inner[0];
    bodyStart = b.getStart(sf) + 1;
    bodyEnd = b.end - 1;
    inner = [...b.statements];
  } else {
    bodyStart = c.expression.end + 1; // after the colon
    bodyEnd = inner.length ? inner[inner.length - 1].end : bodyStart;
  }
  // Breaks that leave the switch → return.
  const edits = [];
  for (const s of inner) for (const b of outerBreaks(s)) edits.push([b.getStart(sf), b.end, 'return;']);
  // A trailing `break;` of the unwrapped block is dropped.
  if (inner.length && ts.isBreakStatement(inner[inner.length - 1])) {
    const b = inner[inner.length - 1];
    const i = edits.findIndex((e) => e[0] === b.getStart(sf));
    if (i >= 0) edits.splice(i, 1);
    edits.push([b.getStart(sf), b.end, '']);
  }
  edits.sort((a, b) => b[0] - a[0]);
  let body = text.slice(bodyStart, bodyEnd);
  for (const [s, e, r] of edits) body = body.slice(0, s - bodyStart) + r + body.slice(e - bodyStart);
  const shared = Object.entries(spec.shared ?? {})
    .filter(([v]) => new RegExp(`\\b${v}\\b`).test(body))
    .map(([, decl]) => `  ${decl}\n`)
    .join('');
  // Comments written above the `case` line move above the new function.
  const ranges = ts.getLeadingCommentRanges(text, c.pos) ?? [];
  const lead = ranges.map((r) => text.slice(r.pos, r.end).trim()).join('\n');
  functions.push(
    `${lead ? lead + '\n' : ''}function ${name}(${spec.params}): void {\n${shared}${body.replace(/^\s*\n/, '')}\n}\n`,
  );
  const key = spec.keyExpr && labelName ? `[${spec.keyExpr.replace('%s', labelName)}]` : label;
  entries.push(`  ${key}: ${name},`);
}

function endsWithBreak(block) {
  const s = block.statements;
  return s.length > 0 && ts.isBreakStatement(s[s.length - 1]);
}

const table = `const ${spec.table}: Record<number, ${spec.tableType}> = {\n${entries.join('\n')}\n};\n`;
const dispatch = `${spec.table}[${spec.discriminant}]?.(${spec.args});`;
let out = text.slice(0, sw.getStart(sf)) + dispatch + text.slice(sw.end);
// Append the case functions and the table after the containing function.
const fnEnd = out.indexOf('\n}\n', out.indexOf(`function ${spec.fn}(`)) + 3;
out = out.slice(0, fnEnd) + '\n' + functions.join('\n') + '\n' + table + out.slice(fnEnd);
fs.writeFileSync(spec.file, out);
console.log(`split ${clauses.length} cases of ${spec.fn}`);
