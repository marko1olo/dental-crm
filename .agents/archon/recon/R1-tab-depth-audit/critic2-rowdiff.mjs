// READ-ONLY. Diffs live row counts NOW against db-rowcounts.txt captured at 14:49 by the recon.
import { readFileSync } from "node:fs";
import pg from "pg";
for (const f of ["C:/Clinic_MVP/dental-crm/.env", "C:/Clinic_MVP/dental-crm/.env.local"]) {
  let txt = ""; try { txt = readFileSync(f, "utf8"); } catch { continue; }
  for (const line of txt.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line); if (!m) continue;
    let v = m[2].trim().replace(/\s+#.*$/, "");
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const then = {};
const txt = readFileSync("C:/Clinic_MVP/dental-crm/.agents/archon/recon/R1-tab-depth-audit/db-rowcounts.txt", "utf8");
let inNon = false;
for (const line of txt.split(/\r?\n/)) {
  if (line.startsWith("--- NON-EMPTY")) { inNon = true; continue; }
  if (line.startsWith("--- EMPTY")) { inNon = false; continue; }
  if (inNon && line.includes("\t")) { const [t, n] = line.split("\t"); then[t] = Number(n); }
  else if (!inNon && line.trim() && !line.startsWith("---") && !line.startsWith("TABLES") && !line.startsWith("NON-EMPTY")) then[line.trim()] = 0;
}

const tabs = (await c.query(`select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' order by 1`)).rows.map((r) => r.relname);
const now = {};
for (const t of tabs) now[t] = (await c.query(`select count(*)::int n from "${t}"`)).rows[0].n;

console.log(`tables recorded at 14:49 = ${Object.keys(then).length}; tables now = ${tabs.length}`);
console.log("\n--- ROW COUNTS THAT CHANGED SINCE THE RECON MEASURED THEM ---");
let changed = 0;
for (const t of tabs) {
  if (!(t in then)) { console.log(`  ${t}: ABSENT at 14:49 -> ${now[t]} now`); changed++; continue; }
  if (then[t] !== now[t]) { console.log(`  ${t}: ${then[t]} -> ${now[t]}  (delta ${now[t] - then[t]})`); changed++; }
}
for (const t of Object.keys(then)) if (!tabs.includes(t)) { console.log(`  ${t}: present at 14:49, GONE now`); changed++; }
if (!changed) console.log("  (none — substrate unchanged)");
console.log(`\nTOTAL TABLES WITH A CHANGED COUNT: ${changed}`);

const ae = (await c.query(`select max(created_at) mx from audit_events`)).rows[0].mx;
console.log(`\nlatest audit_events.created_at = ${ae}`);
try {
  const o = (await c.query(`select name, created_at, updated_at from organizations order by created_at`)).rows;
  for (const r of o) console.log(`org "${r.name}" created=${r.created_at} updated=${r.updated_at}`);
} catch (e) { console.log("org ts query failed: " + e.message); }
await c.end();
