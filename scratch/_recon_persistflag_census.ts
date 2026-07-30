/**
 * Перепись: какие маршруты смешивают в одном запросе модуль, УВАЖАЮЩИЙ
 * DENTAL_STATE_PERSISTENCE, и модуль, который его ИГНОРИРУЕТ.
 *
 * Только чтение файлов. Ничего не запускается.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const apiSrc = path.resolve("apps/api/src");
const dbDir = path.join(apiSrc, "db");
const routesDir = path.join(apiSrc, "routes");

function walk(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) {
      out.push(...walk(path.join(dir, e.name), rel));
      continue;
    }
    if (!e.name.endsWith(".ts") || e.name.endsWith(".test.ts")) continue;
    out.push(rel);
  }
  return out;
}

function parse(file: string, src: string): ts.SourceFile {
  return ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/** Читает ли модуль process.env.DENTAL_STATE_PERSISTENCE — по дереву, не по тексту. */
function readsFlag(sf: ts.SourceFile): boolean {
  let found = false;
  const visit = (n: ts.Node): void => {
    if (found) return;
    if (
      ts.isPropertyAccessExpression(n) &&
      n.name.text === "DENTAL_STATE_PERSISTENCE" &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.name.text === "env"
    ) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(sf, visit);
  return found;
}

/** Обращается ли модуль к базе: импорт ./client.js (пул drizzle). */
function importSpecifiers(sf: ts.SourceFile): string[] {
  const out: string[] = [];
  const visit = (n: ts.Node): void => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      out.push(n.moduleSpecifier.text);
    }
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = n.arguments[0];
      if (arg && ts.isStringLiteral(arg)) out.push(arg.text);
    }
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(sf, visit);
  return out;
}

const dbFiles = walk(dbDir);
const respects = new Set<string>();
const ignores = new Set<string>();
for (const f of dbFiles) {
  const sf = parse(f, readFileSync(path.join(dbDir, ...f.split("/")), "utf8"));
  const specs = importSpecifiers(sf);
  const touchesDb = specs.some((s) => s.endsWith("client.js"));
  const flag = readsFlag(sf);
  if (flag) respects.add(f);
  else if (touchesDb) ignores.add(f);
}

console.log(`db модулей (без .test.ts): ${dbFiles.length}`);
console.log(`уважают флаг: ${respects.size} -> ${[...respects].sort().join(", ")}`);
console.log(`идут в базу и ИГНОРИРУЮТ флаг: ${ignores.size}`);
for (const f of [...ignores].sort()) console.log(`   ${f}`);
console.log("");

/* Маршруты, которые смешивают оба класса в одном файле. */
const routeFiles = walk(routesDir);
const mixed: { route: string; respected: string[]; ignored: string[] }[] = [];
for (const r of routeFiles) {
  const sf = parse(r, readFileSync(path.join(routesDir, ...r.split("/")), "utf8"));
  const specs = importSpecifiers(sf);
  const named = specs
    .filter((s) => s.includes("db/") || /(^|\/)\.\.?\//.test(s))
    .map((s) => path.posix.basename(s).replace(/\.js$/, ".ts"));
  const respected = [...new Set(named.filter((n) => respects.has(n)))].sort();
  const ignored = [...new Set(named.filter((n) => ignores.has(n)))].sort();
  if (respected.length > 0 && ignored.length > 0) mixed.push({ route: r, respected, ignored });
}

console.log(`маршрутных модулей: ${routeFiles.length}`);
console.log(`СМЕШИВАЮТ оба класса: ${mixed.length}`);
for (const m of mixed) {
  console.log(`   ${m.route}`);
  console.log(`      уважают:  ${m.respected.join(", ")}`);
  console.log(`      игнорят:  ${m.ignored.join(", ")}`);
}
