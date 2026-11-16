/**
 * Rename every snake_case local variable, parameter and function to camelCase through
 * the TypeScript language service (scope-correct, like "Rename Symbol").
 * Usage: node tools/camel-locals.mjs
 */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, root);
const files = new Map(parsed.fileNames.map((f) => [path.resolve(f), { text: fs.readFileSync(f, 'utf8'), version: 0 }]));
const host = {
  getScriptFileNames: () => [...files.keys()],
  getScriptVersion: (f) => String(files.get(path.resolve(f))?.version ?? 0),
  getScriptSnapshot: (f) => {
    const e = files.get(path.resolve(f));
    return e
      ? ts.ScriptSnapshot.fromString(e.text)
      : fs.existsSync(f)
        ? ts.ScriptSnapshot.fromString(fs.readFileSync(f, 'utf8'))
        : undefined;
  },
  getCurrentDirectory: () => root,
  getCompilationSettings: () => parsed.options,
  getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories,
};
const service = ts.createLanguageService(host, ts.createDocumentRegistry());
const SNAKE = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/;
const camel = (n) => n.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

function nextDeclaration() {
  const program = service.getProgram();
  for (const [f] of files) {
    if (!f.includes(`${path.sep}src${path.sep}`) && !f.includes(`${path.sep}tests${path.sep}`)) continue;
    const sf = program.getSourceFile(f);
    let found;
    const visit = (node) => {
      if (found) return;
      if (
        (ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isFunctionDeclaration(node)) &&
        ts.isIdentifier(node.name) &&
        SNAKE.test(node.name.text)
      ) {
        found = node.name;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    if (found) return { file: f, sf, id: found };
  }
  return null;
}

let n = 0;
for (let d = nextDeclaration(); d; d = nextDeclaration()) {
  const to = camel(d.id.text);
  const locs = service.findRenameLocations(d.file, d.id.getStart(d.sf), false, false, {
    providePrefixAndSuffixTextForRename: true,
  });
  const byFile = new Map();
  for (const l of locs) {
    const f = path.resolve(l.fileName);
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f).push(l);
  }
  for (const [f, list] of byFile) {
    const e = files.get(f);
    list.sort((a, b) => b.textSpan.start - a.textSpan.start);
    let text = e.text;
    for (const l of list)
      text =
        text.slice(0, l.textSpan.start) +
        (l.prefixText ?? '') +
        to +
        (l.suffixText ?? '') +
        text.slice(l.textSpan.start + l.textSpan.length);
    e.text = text;
    e.version++;
  }
  n++;
}
for (const [f, e] of files) if (e.version > 0) fs.writeFileSync(f, e.text);
console.log(`renamed ${n} locals/parameters`);
