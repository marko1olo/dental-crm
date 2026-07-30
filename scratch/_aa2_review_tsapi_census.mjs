// READ-ONLY adversarial census using the TypeScript compiler API (NOT @babel/parser).
// Purpose: independently re-derive the component counts claimed by packet AA2.
import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const ROOT = "C:/Clinic_MVP/dental-crm/apps/web/src";
const IGNORED = new Set(["node_modules", "dist", "__snapshots__", "tests", "__tests__"]);

function collect(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORED.has(e.name)) continue;
      collect(full, out);
      continue;
    }
    if (!e.isFile()) continue;
    if (![".ts", ".tsx"].includes(extname(e.name))) continue;
    if (e.name.endsWith(".d.ts")) continue;
    if (/\.test\.tsx?$/.test(e.name)) continue;
    out.push(full);
  }
  return out;
}

const NAME_RE = /^[A-Z][A-Za-z0-9_$]*[a-z][A-Za-z0-9_$]*$/;

function hasJsxDeep(node) {
  let found = false;
  const visit = (n) => {
    if (found) return;
    if (
      ts.isJsxElement(n) ||
      ts.isJsxSelfClosingElement(n) ||
      ts.isJsxFragment(n)
    ) {
      found = true;
      return;
    }
    // Skip pure type positions so `const x: SomeJsxType` never counts.
    if (
      ts.isTypeNode(n) ||
      ts.isTypeAliasDeclaration(n) ||
      ts.isInterfaceDeclaration(n)
    )
      return;
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(node, visit);
  if (!found && (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node))) found = true;
  return found;
}

const files = collect(ROOT).sort();
const components = [];
const shapes = { exportFunction: 0, annotatedConst: 0, plainArrowConst: 0, wrapperConst: 0, classDecl: 0, other: 0 };
const annotatedList = [];
let parseErrors = 0;

for (const full of files) {
  const rel = relative(ROOT, full).split(sep).join("/");
  const src = readFileSync(full, "utf8");
  const sf = ts.createSourceFile(full, src, ts.ScriptTarget.ES2022, true, full.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if (sf.parseDiagnostics && sf.parseDiagnostics.length > 0) parseErrors++;

  const exportedNames = new Set();
  const declared = new Map(); // name -> {line, jsx, shape, annotated}

  const note = (name, line, jsx, shape, annotated) => {
    declared.set(name, { line, jsx, shape, annotated });
  };

  for (const st of sf.statements) {
    const isExported = !!(ts.getCombinedModifierFlags(st) & ts.ModifierFlags.Export) ||
      (st.modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

    if (ts.isFunctionDeclaration(st) && st.name) {
      note(st.name.text, sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1, hasJsxDeep(st), "exportFunction", false);
      if (isExported) exportedNames.add(st.name.text);
      continue;
    }
    if (ts.isClassDeclaration(st) && st.name) {
      note(st.name.text, sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1, hasJsxDeep(st), "classDecl", false);
      if (isExported) exportedNames.add(st.name.text);
      continue;
    }
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) continue;
        const annotated = !!d.type;
        let shape = "other";
        if (d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) {
          shape = annotated ? "annotatedConst" : "plainArrowConst";
        } else if (d.initializer && ts.isCallExpression(d.initializer)) {
          shape = annotated ? "annotatedConst" : "wrapperConst";
        } else if (annotated) {
          shape = "annotatedConst";
        }
        note(d.name.text, sf.getLineAndCharacterOfPosition(d.getStart(sf)).line + 1, d.initializer ? hasJsxDeep(d.initializer) : false, shape, annotated);
        if (isExported) exportedNames.add(d.name.text);
      }
      continue;
    }
    if (ts.isExportDeclaration(st) && !st.moduleSpecifier && st.exportClause && ts.isNamedExports(st.exportClause)) {
      for (const spec of st.exportClause.elements) exportedNames.add((spec.propertyName ?? spec.name).text);
      continue;
    }
    if (ts.isExportAssignment(st)) continue;
    if (st.kind === ts.SyntaxKind.ExportAssignment) continue;
    // export default function / class
    if (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) continue;
  }

  // export default <expr/decl>
  for (const st of sf.statements) {
    if (st.kind !== ts.SyntaxKind.ExportAssignment) continue;
  }

  for (const [name, info] of declared) {
    if (!exportedNames.has(name)) continue;
    if (!info.jsx) continue;
    if (!NAME_RE.test(name)) continue;
    components.push({ file: rel, name, line: info.line, shape: info.shape, annotated: info.annotated });
    shapes[info.shape] = (shapes[info.shape] ?? 0) + 1;
    if (info.annotated) annotatedList.push(`${rel}:${info.line} ${name}`);
  }
}

console.log("TS-COMPILER-API CENSUS (independent instrument)");
console.log("files scanned:", files.length);
console.log("files with parse diagnostics:", parseErrors);
console.log("exported JSX-bearing PascalCase components:", components.length);
console.log("shape breakdown:", JSON.stringify(shapes, null, 1));
console.log("TYPE-ANNOTATED (the claimed ast-grep blind spot):", annotatedList.length);
if (process.argv.includes("--list-annotated")) for (const a of annotatedList) console.log("  ", a);
if (process.argv.includes("--list-all")) for (const c of components) console.log(`${c.file}:${c.line} ${c.name} [${c.shape}]`);
