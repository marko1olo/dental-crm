// READ-ONLY. For every Drizzle table declared in the repo, count INSERT writers
// anywhere in the repo (not just apps/api/src) and READ sites.
//
// TRAP THIS SCRIPT WAS REWRITTEN FOR: the first version matched only
// `.insert(ident)` and therefore scored generated_documents (4 live rows) as
// zero-writer, because the real writer is `.insert(schema.generatedDocuments)`
// at apps/api/src/db/documentQuery.ts:135. Namespaced access and newlines inside
// the call are now both handled, and the live row counts are used as a
// cross-check: any table with rows but zero detected writers is reported as a
// DETECTOR MISS, not as a finding.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = "C:/Clinic_MVP/dental-crm";
const SEARCH_DIRS = ["apps/api/src", "apps/web/src", "packages", "scripts", "apps/api/drizzle", "drizzle", "apps/api/migrations"]
  .map((d) => path.join(ROOT, d)).filter((d) => existsSync(d));

function files(dir, exts = [".ts", ".tsx", ".mjs", ".cjs", ".js", ".sql"]) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const f = path.join(dir, e);
    let st; try { st = statSync(f); } catch { continue; }
    if (st.isDirectory()) {
      if (["node_modules", "dist", ".git", "artifacts"].includes(e)) continue;
      out.push(...files(f, exts)); continue;
    }
    if (exts.some((x) => e.endsWith(x))) out.push(f);
  }
  return out;
}

const schemaFiles = files(path.join(ROOT, "apps/api/src/db"), [".ts"])
  .concat(files(path.join(ROOT, "packages"), [".ts"]));
const tables = new Map();
for (const f of schemaFiles) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/export\s+const\s+(\w+)\s*=\s*pgTable\(\s*["'`]([^"'`]+)["'`]/g)) {
    tables.set(m[1], { sql: m[2], at: path.relative(ROOT, f).replace(/\\/g, "/") + ":" + (src.slice(0, m.index).split("\n").length) });
  }
}

const INS = /\.\s*insert\(\s*(?:\w+\s*\.\s*)?(\w+)\s*[,)]/g;   // .insert(x) / .insert(schema.x)
const RAW = /INSERT\s+INTO\s+(?:public\s*\.\s*)?["`]?([a-zA-Z_][a-zA-Z0-9_]*)["`]?/gi;
const FROM = /\.\s*(?:from|select)\(\s*(?:\w+\s*\.\s*)?(\w+)\s*[,)]/g;

const inserts = new Map();
const reads = new Map();
const allFiles = SEARCH_DIRS.flatMap((d) => files(d));
const lineOf = (src, idx) => src.slice(0, idx).split("\n").length;
for (const f of allFiles) {
  if (/\.(test|spec)\.[tj]sx?$/.test(f)) continue;
  let src; try { src = readFileSync(f, "utf8"); } catch { continue; }
  const rel = path.relative(ROOT, f).replace(/\\/g, "/");
  for (const [re, bag, pfx] of [[INS, inserts, ""], [RAW, inserts, "SQL:"], [FROM, reads, ""]]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const k = pfx + m[1];
      if (!bag.has(k)) bag.set(k, []);
      bag.get(k).push(`${rel}:${lineOf(src, m.index)}`);
    }
  }
}

// live row counts, if the earlier probe produced them
const live = new Map();
try {
  const txt = readFileSync(path.join(ROOT, ".agents/archon/recon/R1-tab-depth-audit/db-rowcounts.txt"), "utf8");
  let inNonEmpty = false;
  for (const line of txt.split(/\r?\n/)) {
    if (line.startsWith("--- NON-EMPTY")) { inNonEmpty = true; continue; }
    if (line.startsWith("--- EMPTY")) { inNonEmpty = false; continue; }
    if (inNonEmpty && line.includes("\t")) { const [t, n] = line.split("\t"); live.set(t, Number(n)); }
    else if (!inNonEmpty && /^[a-z_][a-z0-9_]*$/.test(line.trim()) && line.trim()) live.set(line.trim(), 0);
  }
} catch {}

const rows = [];
for (const [ident, { sql, at }] of tables) {
  const w = (inserts.get(ident) ?? []).concat(inserts.get("SQL:" + sql) ?? []);
  const r = reads.get(ident) ?? [];
  rows.push({ ident, sql, at, writers: w.length, writerAt: w.slice(0, 2), readers: r.length, readerAt: r.slice(0, 2), live: live.has(sql) ? live.get(sql) : "?" });
}
rows.sort((a, b) => a.writers - b.writers || b.readers - a.readers || a.sql.localeCompare(b.sql));

const zeroW = rows.filter((r) => r.writers === 0);
const misses = zeroW.filter((r) => typeof r.live === "number" && r.live > 0);
console.log(`DECLARED TABLES: ${rows.length}   FILES SCANNED: ${allFiles.length}`);
console.log(`ZERO-WRITER TABLES: ${zeroW.length}`);
console.log(`  of which DETECTOR MISSES (live rows > 0, so a writer must exist): ${misses.length}` +
  (misses.length ? "  -> " + misses.map((m) => `${m.sql}(${m.live})`).join(", ") : ""));
console.log(`ZERO-WRITER AND READ BY CODE (panel that can never fill): ${zeroW.filter((r) => r.readers > 0 && !(typeof r.live === "number" && r.live > 0)).length}`);
console.log("\nsql_name\tident\twriters\treaders\tlive_rows\tdecl\tfirst_writer\tfirst_reader");
for (const r of rows) {
  console.log([r.sql, r.ident, r.writers, r.readers, r.live, r.at, r.writerAt.join(" | ") || "-", r.readerAt.join(" | ") || "-"].join("\t"));
}
