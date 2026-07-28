// READ-ONLY. SELECT-only probe of the live PostgreSQL. Prints table names and
// row counts only. NEVER prints the connection string or any secret.
import { readFileSync } from "node:fs";
import pg from "pg";

// dotenv lives in apps/api/node_modules, not the root, so .env is parsed here
// directly. Values are used and never printed.
for (const f of ["C:/Clinic_MVP/dental-crm/.env", "C:/Clinic_MVP/dental-crm/.env.local"]) {
  let txt = "";
  try { txt = readFileSync(f, "utf8"); } catch { continue; }
  for (const line of txt.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim().replace(/\s+#.*$/, "");
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not present in env after loading .env — cannot probe.");
  process.exit(2);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const mode = process.argv[2] ?? "all";

if (mode === "like") {
  const pat = process.argv[3];
  const r = await client.query(
    `select table_name from information_schema.tables
     where table_schema='public' and table_name ilike $1 order by 1`, [pat]);
  console.log(r.rows.map((x) => x.table_name).join("\n") || "(no table matches " + pat + ")");
} else {
  const t = await client.query(
    `select table_name from information_schema.tables
     where table_schema='public' and table_type='BASE TABLE' order by 1`);
  console.log("TABLES IN public: " + t.rows.length);
  const rows = [];
  for (const { table_name } of t.rows) {
    const c = await client.query(`select count(*)::int as n from "${table_name}"`);
    rows.push({ table: table_name, n: c.rows[0].n });
  }
  const nonEmpty = rows.filter((r) => r.n > 0);
  console.log("NON-EMPTY: " + nonEmpty.length + "   EMPTY: " + (rows.length - nonEmpty.length));
  console.log("\n--- NON-EMPTY (table\\trows) ---");
  for (const r of nonEmpty.sort((a, b) => b.n - a.n)) console.log(`${r.table}\t${r.n}`);
  console.log("\n--- EMPTY (0 rows) ---");
  for (const r of rows.filter((r) => r.n === 0)) console.log(r.table);
}
await client.end();
