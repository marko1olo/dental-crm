/** Перепись видов уважения флага: отказ против выдачи из памяти. Только чтение. */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const dbDir = path.resolve("apps/api/src/db");
const routesDir = path.resolve("apps/api/src/routes");

function walk(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) { out.push(...walk(path.join(dir, e.name), rel)); continue; }
    if (!e.name.endsWith(".ts") || e.name.endsWith(".test.ts")) continue;
    out.push(rel);
  }
  return out;
}
const parse = (f: string, s: string) => ts.createSourceFile(f, s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function isFlagAccess(n: ts.Node): boolean {
  return ts.isPropertyAccessExpression(n) && n.name.text === "DENTAL_STATE_PERSISTENCE"
    && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "env";
}
function subtreeHas(root: ts.Node, pred: (n: ts.Node) => boolean): boolean {
  let f = false;
  const v = (n: ts.Node) => { if (f) return; if (pred(n)) { f = true; return; } ts.forEachChild(n, v); };
  v(root); return f;
}
function ownHas(root: ts.Node, pred: (n: ts.Node) => boolean): boolean {
  let f = false;
  const isFn = (n: ts.Node) => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n);
  const v = (n: ts.Node) => { if (f) return; if (pred(n)) { f = true; return; } if (isFn(n)) return; ts.forEachChild(n, v); };
  ts.forEachChild(root, v); return f;
}

function scan(file: string, src: string) {
  const sf = parse(file, src);
  const predicates = new Set<string>();
  const isPredBody = (body: ts.Node | undefined): boolean => {
    if (!body) return false;
    if (!ts.isBlock(body)) return subtreeHas(body, isFlagAccess);
    return body.statements.length === 1 && ts.isReturnStatement(body.statements[0]!)
      && subtreeHas(body.statements[0]!, isFlagAccess);
  };
  const collectPred = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) && n.name && isPredBody(n.body)) predicates.add(n.name.text);
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer
        && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))
        && isPredBody(n.initializer.body)) predicates.add(n.name.text);
    ts.forEachChild(n, collectPred);
  };
  ts.forEachChild(sf, collectPred);

  const gates: { line: number; kind: "отказ" | "память" }[] = [];
  const isGateCond = (c: ts.Node) => subtreeHas(c, (n) => isFlagAccess(n)
    || (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && predicates.has(n.expression.text)));
  const visit = (n: ts.Node) => {
    if (ts.isIfStatement(n) && isGateCond(n.expression)) {
      const t = n.thenStatement;
      const throws = ts.isThrowStatement(t) || (ts.isBlock(t) && ownHas(t, ts.isThrowStatement));
      gates.push({ line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, kind: throws ? "отказ" : "память" });
    }
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(sf, visit);

  const specs: string[] = [];
  const impVisit = (n: ts.Node) => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) specs.push(n.moduleSpecifier.text);
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const a = n.arguments[0]; if (a && ts.isStringLiteral(a)) specs.push(a.text);
    }
    ts.forEachChild(n, impVisit);
  };
  ts.forEachChild(sf, impVisit);

  return { predicates: [...predicates], gates, specs, readsFlag: subtreeHas(sf, isFlagAccess) };
}

const dbFiles = walk(dbDir);
const respects = new Map<string, { kinds: string[]; gates: number; predicates: string[] }>();
const ignores: string[] = [];
const neither: string[] = [];
for (const f of dbFiles) {
  const s = scan(f, readFileSync(path.join(dbDir, ...f.split("/")), "utf8"));
  if (s.readsFlag) {
    respects.set(f, { kinds: [...new Set(s.gates.map((g) => g.kind))].sort(), gates: s.gates.length, predicates: s.predicates });
  } else if (s.specs.some((x) => x.endsWith("client.js"))) ignores.push(f);
  else neither.push(f);
}
console.log(`db: ${dbFiles.length}  уважают: ${respects.size}  игнорят+база: ${ignores.length}  вне хранилища: ${neither.length}`);
for (const [f, v] of [...respects].sort()) console.log(`  ${f.padEnd(34)} gates=${String(v.gates).padStart(2)} kinds=[${v.kinds.join("|")}] pred=[${v.predicates.join(",")}]`);
console.log(`вне хранилища: ${neither.sort().join(", ")}`);

const ignoreSet = new Set(ignores);
const respectSet = new Set(respects.keys());
const routeFiles = walk(routesDir);
let mixed = 0;
console.log("");
for (const r of routeFiles) {
  const s = scan(r, readFileSync(path.join(routesDir, ...r.split("/")), "utf8"));
  const db = s.specs.filter((x) => x.includes("/db/")).map((x) => `${path.posix.basename(x).replace(/\.js$/, "")}.ts`);
  const R = [...new Set(db.filter((n) => respectSet.has(n)))].sort();
  const I = [...new Set(db.filter((n) => ignoreSet.has(n)))].sort();
  if (R.length && I.length) { mixed++; console.log(`  ${r}\n     R: ${R.join(", ")}\n     I: ${I.join(", ")}`); }
}
console.log(`\nмаршрутных модулей: ${routeFiles.length}  смешивают: ${mixed}`);
