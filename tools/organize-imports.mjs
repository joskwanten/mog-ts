/** Run the TypeScript "Organize Imports" action (remove unused, sort) on src/ and tests/. */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile('tsconfig.json', ts.sys.readFile).config, ts.sys, root);
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
let n = 0;
for (const [f, e] of files) {
  const changes = service.organizeImports({ type: 'file', fileName: f }, {}, undefined);
  for (const c of changes) {
    const edits = [...c.textChanges].sort((a, b) => b.span.start - a.span.start);
    let text = e.text;
    for (const t of edits) text = text.slice(0, t.span.start) + t.newText + text.slice(t.span.start + t.span.length);
    if (text !== e.text) {
      e.text = text;
      e.version++;
      fs.writeFileSync(f, text);
      n++;
    }
  }
}
console.log(`organized imports in ${n} files`);
