/**
 * Bulk "Rename Symbol" through the TypeScript language service.
 *
 * Usage: node tools/rename.mjs tools/renames.json
 *
 * renames.json is a list of { "file": "src/…", "name": "old", "to": "new",
 * "kind"?: "function" | "property" | "member" | "class" | "variable" }.
 * The declaration named `name` is looked up in `file` (functions, variables,
 * classes, properties of object literals, class members, parameters are not
 * renamed). Every reference in the project is renamed, exactly like an
 * editor would, so the result keeps type-checking.
 */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, root);
const files = new Map(parsed.fileNames.map((f) => [path.resolve(f), { text: fs.readFileSync(f, 'utf8'), version: 0 }]));

const host = {
  getScriptFileNames: () => [...files.keys()],
  getScriptVersion: (f) => String(files.get(path.resolve(f))?.version ?? 0),
  getScriptSnapshot: (f) => {
    const e = files.get(path.resolve(f));
    if (e) return ts.ScriptSnapshot.fromString(e.text);
    if (!fs.existsSync(f)) return undefined;
    return ts.ScriptSnapshot.fromString(fs.readFileSync(f, 'utf8'));
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

function findDeclaration(sf, name, kind) {
  let found;
  const visit = (node) => {
    if (found) return;
    const n = node.name;
    if (n && (ts.isIdentifier(n) || ts.isStringLiteral(n)) && n.text === name) {
      const ok =
        ((kind === undefined || kind === 'function') && ts.isFunctionDeclaration(node)) ||
        ((kind === undefined || kind === 'property') && ts.isPropertyAssignment(node)) ||
        ((kind === undefined || kind === 'member') &&
          (ts.isMethodDeclaration(node) ||
            ts.isPropertyDeclaration(node) ||
            (ts.isParameter(node) && ts.isConstructorDeclaration(node.parent)))) ||
        ((kind === undefined || kind === 'class') &&
          (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))) ||
        ((kind === undefined || kind === 'variable') && ts.isVariableDeclaration(node)) ||
        (kind === 'propsig' && ts.isPropertySignature(node));
      if (ok) {
        found = n;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

let done = 0;
for (const r of spec) {
  const file = path.resolve(root, r.file);
  const program = service.getProgram();
  const sf = program.getSourceFile(file);
  if (!sf) throw new Error(`no source file ${r.file}`);
  const decl = findDeclaration(sf, r.name, r.kind);
  if (!decl) {
    console.warn(`skip: ${r.file}: ${r.name} not found`);
    continue;
  }
  const locs = service.findRenameLocations(file, decl.getStart(sf), false, false, {
    providePrefixAndSuffixTextForRename: true,
  });
  if (!locs) {
    console.warn(`skip: ${r.file}: ${r.name} cannot be renamed`);
    continue;
  }
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
    for (const l of list) {
      const repl = (l.prefixText ?? '') + r.to + (l.suffixText ?? '');
      text = text.slice(0, l.textSpan.start) + repl + text.slice(l.textSpan.start + l.textSpan.length);
    }
    e.text = text;
    e.version++;
  }
  done++;
}

for (const [f, e] of files) {
  if (e.version > 0) fs.writeFileSync(f, e.text);
}
console.log(`renamed ${done}/${spec.length} symbols`);
