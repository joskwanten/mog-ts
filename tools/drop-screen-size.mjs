/**
 * Codemod: remove the `dx`/`dy` screen-size parameters from the game functions.
 *
 * In the remake every drawing/collision function received the screen size
 * (640×400) as `dx, dy`. They are constants, so this codemod
 *   - replaces every reference to such a parameter with SCREEN_X / SCREEN_Y,
 *   - removes the parameters from the declaration,
 *   - removes the matching arguments at every direct call.
 * Symbols are resolved with the type checker, so unrelated locals named dx/dy
 * (directions) are untouched. Only functions in src/game/ are considered;
 * `--list` prints the candidates without changing anything.
 */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const listOnly = process.argv.includes('--list');
const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const gameDir = path.join(root, 'src', 'game') + path.sep;

const NAMES = { dx: 'SCREEN_X', _dx: 'SCREEN_X', dy: 'SCREEN_Y', _dy: 'SCREEN_Y' };

/** file → list of { start, end, text } */
const edits = new Map();
const addEdit = (sf, start, end, text) => {
  if (!edits.has(sf.fileName)) edits.set(sf.fileName, []);
  edits.get(sf.fileName).push({ start, end, text });
};

const targets = []; // { decl, sf, indexes, paramSymbols }
for (const sf of program.getSourceFiles()) {
  if (!sf.fileName.startsWith(gameDir)) continue;
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.body) {
      const idx = node.parameters
        .map((p, i) =>
          ts.isIdentifier(p.name) && NAMES[p.name.text] && (p.type?.getText(sf) ?? '') === 'number' ? i : -1,
        )
        .filter((i) => i >= 0);
      const names = idx.map((i) => node.parameters[i].name.text.replace('_', ''));
      if (names.includes('dx') && names.includes('dy')) targets.push({ decl: node, sf, indexes: idx });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

if (listOnly) {
  for (const t of targets) console.log(path.relative(root, t.sf.fileName), t.decl.name?.text, t.indexes);
  process.exit(0);
}

/** Range that removes argument/parameter k from a list (including one separating comma). */
function removalRange(list, k, sf) {
  const items = [...list];
  const keep = (i) => !removeSet.has(i);
  void keep;
  if (k > 0) return [items[k - 1].end, items[k].end];
  if (items.length > 1) return [items[k].getStart(sf), items[k + 1].getStart(sf)];
  return [items[k].getStart(sf), items[k].end];
}
let removeSet = new Set();

for (const t of targets) {
  const { decl, sf, indexes } = t;
  const paramSymbols = new Map(
    indexes.map((i) => [checker.getSymbolAtLocation(decl.parameters[i].name), NAMES[decl.parameters[i].name.text]]),
  );
  const deletions = [];
  // References inside the body.
  const visit = (node) => {
    if (ts.isIdentifier(node) && node.parent !== undefined) {
      const sym = checker.getSymbolAtLocation(node);
      if (sym && paramSymbols.has(sym) && !indexes.some((i) => decl.parameters[i].name === node)) {
        addEdit(sf, node.getStart(sf), node.end, paramSymbols.get(sym));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(decl.body);
  // Parameters (remove from the highest index down so ranges stay valid relative to each other).
  removeSet = new Set(indexes);
  for (const k of [...indexes].sort((a, b) => b - a)) {
    const [s, e] = removalRange(decl.parameters, k, sf);
    deletions.push({ sf, s, e });
  }
  // Direct calls.
  const sym = decl.name ? checker.getSymbolAtLocation(decl.name) : undefined;
  if (sym) {
    for (const f of program.getSourceFiles()) {
      if (!f.fileName.startsWith(root + path.sep + 'src') && !f.fileName.startsWith(root + path.sep + 'tests'))
        continue;
      const v = (node) => {
        if (ts.isCallExpression(node)) {
          let callee = node.expression;
          let s2 = checker.getSymbolAtLocation(callee);
          if (s2 && s2.flags & ts.SymbolFlags.Alias) s2 = checker.getAliasedSymbol(s2);
          if (s2 === sym) {
            for (const k of [...indexes].sort((a, b) => b - a)) {
              if (k < node.arguments.length) {
                const [s, e] = removalRange(node.arguments, k, f);
                deletions.push({ sf: f, s, e });
              }
            }
          }
        }
        ts.forEachChild(node, v);
      };
      v(f);
    }
  }
  for (const d of deletions) addEdit(d.sf, d.s, d.e, '');
}

// Apply: drop replacements that fall inside a deletion, merge adjacent deletions.
let total = 0;
for (const [file, list] of edits) {
  const dels = list.filter((e) => e.text === '');
  const kept = list.filter((e) => e.text === '' || !dels.some((d) => e.start >= d.start && e.end <= d.end));
  kept.sort((a, b) => b.start - a.start || b.end - a.end);
  let text = fs.readFileSync(file, 'utf8');
  let lastStart = Infinity;
  for (const e of kept) {
    if (e.end > lastStart) continue; // overlapping (already covered)
    text = text.slice(0, e.start) + e.text + text.slice(e.end);
    lastStart = e.start;
    total++;
  }
  // Make sure SCREEN_X / SCREEN_Y are imported.
  const needs = ['SCREEN_X', 'SCREEN_Y'].filter((n) => new RegExp(`\\b${n}\\b`).test(text));
  if (
    needs.length &&
    !/from '\.\/constants'|from '\.\.\/constants'|constants';/.test(text.match(/import[^;]*SCREEN_X[^;]*;/)?.[0] ?? '')
  ) {
    const rel = path.relative(path.dirname(file), path.join(root, 'src', 'game', 'constants')).replace(/\\/g, '/');
    const spec = rel.startsWith('.') ? rel : './' + rel;
    const have = new RegExp(`import \\{([^}]*)\\} from '${spec.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}';`);
    const m = text.match(have);
    if (m) {
      const names = new Set(
        m[1]
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      );
      for (const n of needs) names.add(n);
      text = text.replace(have, `import { ${[...names].join(', ')} } from '${spec}';`);
    } else {
      text = `import { ${needs.join(', ')} } from '${spec}';\n` + text;
    }
  }
  fs.writeFileSync(file, text);
}
console.log(`${targets.length} functions, ${total} edits`);
