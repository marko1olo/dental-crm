// READ-ONLY. Builds the API route table (method + full path) from apps/api/src.
// Handles: app.get("/x"), server.post<{...}>("/x"), prefixed plugin registration.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const API = "C:/Clinic_MVP/dental-crm/apps/api/src";

// prefix map, read from server.ts registrations
const serverSrc = readFileSync(path.join(API, "server.ts"), "utf8");
const PREFIX_BY_FILE = {};
for (const m of serverSrc.matchAll(/register\(\s*(\w+)\s*,\s*\{\s*prefix:\s*"([^"]+)"/g)) {
  PREFIX_BY_FILE[m[1]] = m[2];
}
// map exported plugin identifier -> file
const IDENT_FILE = {};
for (const m of serverSrc.matchAll(/import\s*\{?\s*([\w\s,]+?)\s*\}?\s*from\s*"([^"]+)"/g)) {
  for (const id of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
    IDENT_FILE[id] = m[2];
  }
}

function files(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const f = path.join(dir, e);
    if (statSync(f).isDirectory()) { if (e !== "dist" && e !== "node_modules") out.push(...files(f)); continue; }
    if (/\.(test|spec)\.ts$/.test(e)) continue;
    if (e.endsWith(".ts")) out.push(f);
  }
  return out;
}

// Which prefix applies to a given source file?
function prefixFor(file) {
  const rel = "./" + path.relative(API, file).replace(/\\/g, "/").replace(/\.ts$/, "");
  for (const [ident, pfx] of Object.entries(PREFIX_BY_FILE)) {
    const spec = IDENT_FILE[ident];
    if (!spec) continue;
    const norm = spec.replace(/\.js$/, "");
    if (norm === rel) return pfx;
  }
  return "";
}

const ROUTE_RE = /\b(?:app|fastify|server|instance)\s*\.\s*(get|post|put|patch|delete|head|options)\s*(?:<[\s\S]{0,900}?>)?\s*\(\s*[`"']([^`"']+)[`"']/g;

const rows = [];
for (const f of files(path.join(API, "routes")).concat(files(path.join(API)).filter((x) => !x.includes("routes")))) {
  const src = readFileSync(f, "utf8");
  const pfx = prefixFor(f);
  ROUTE_RE.lastIndex = 0;
  let m;
  while ((m = ROUTE_RE.exec(src))) {
    const line = src.slice(0, m.index).split("\n").length;
    let p = m[2];
    if (!p.startsWith("/")) continue;
    const full = (pfx + (p === "/" ? "" : p)) || p;
    rows.push({ method: m[1].toUpperCase(), path: full, at: path.relative("C:/Clinic_MVP/dental-crm", f).replace(/\\/g, "/") + ":" + line });
  }
}
const seen = new Set();
const uniq = rows.filter((r) => { const k = r.method + " " + r.path; if (seen.has(k)) return false; seen.add(k); return true; });
uniq.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));
if (process.argv[2] === "--json") console.log(JSON.stringify(uniq, null, 1));
else for (const r of uniq) console.log(`${r.method}\t${r.path}\t${r.at}`);
console.error("TOTAL ROUTES: " + uniq.length);
