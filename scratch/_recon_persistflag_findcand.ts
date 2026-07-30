import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
const routesDir = path.resolve("apps/api/src/routes");
const RESPECT = new Set(["appointmentsQuery.ts","clinicalQuery.ts","dashboardQuery.ts","domainStateHydration.ts","patientsQuery.ts","pricelistQuery.ts","protocolTemplateQuery.ts","settingsQuery.ts","staffAuthorityQuery.ts"]);
const IGNORE = new Set(["aiQuery.ts","auditQuery.ts","billingQuery.ts","clinicalTasksQuery.ts","customCrmTaskTypesQuery.ts","dadataGeocodedAddressesQuery.ts","documentQuery.ts","imagingQuery.ts","labQuery.ts","landingFieldMappingsQuery.ts","lostPatientsFiltersQuery.ts","patientArchiveReasonsAndBlacklistsQuery.ts","patientNoShowRiskQuery.ts","patientReclamationsQuery.ts","patientTaskTicketsQuery.ts","recentPatientHistoryQuery.ts","singleSessionEnforcementsQuery.ts","visitsQuery.ts"]);
function walk(d: string, p = ""): string[] { const o: string[] = [];
  for (const e of readdirSync(d, { withFileTypes: true })) { const r = p ? `${p}/${e.name}` : e.name;
    if (e.isDirectory()) { o.push(...walk(path.join(d, e.name), r)); continue; }
    if (!e.name.endsWith(".ts") || e.name.endsWith(".test.ts")) continue; o.push(r); } return o; }
for (const f of walk(routesDir).sort()) {
  const src = readFileSync(path.join(routesDir, ...f.split("/")), "utf8");
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const specs: string[] = [];
  const v = (n: ts.Node) => { if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) specs.push(n.moduleSpecifier.text);
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) { const a = n.arguments[0]; if (a && ts.isStringLiteral(a)) specs.push(a.text); }
    ts.forEachChild(n, v); };
  ts.forEachChild(sf, v);
  const names = specs.filter(s => s.includes("/db/")).map(s => `${path.posix.basename(s).replace(/\.js$/, "")}.ts`);
  const R = [...new Set(names.filter(n => RESPECT.has(n)))];
  const I = [...new Set(names.filter(n => IGNORE.has(n)))];
  if (R.length > 0 && I.length === 0) console.log(`CANDIDATE ${f}  R=${R.join(",")}  lines=${src.split("\n").length}`);
}
