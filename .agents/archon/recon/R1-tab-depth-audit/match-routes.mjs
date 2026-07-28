// READ-ONLY. Matches web-called /api paths against API route literals.
import { readFileSync } from "node:fs";

const dir = new URL("./", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const web = readFileSync(dir + "web-api-paths.txt", "utf8").split(/\r?\n/).filter(Boolean);
const api = readFileSync(dir + "api-route-literals.txt", "utf8").split(/\r?\n/).filter(Boolean);

const norm = (p) =>
  p
    .replace(/\/+$/, "")
    .split("/")
    .map((seg) => (seg.startsWith(":") || seg === "*" ? "*" : seg))
    .join("/");

const apiSet = new Set(api.map(norm));
const apiNorm = api.map((p) => ({ raw: p, n: norm(p) }));

const unmatched = [];
for (const w of web) {
  const n = norm(w);
  if (apiSet.has(n)) continue;
  // try prefix match: web path may be longer (query stripped) or shorter
  const hit = apiNorm.find((a) => a.n === n || n.startsWith(a.n + "/") || a.n.startsWith(n + "/"));
  if (!hit) unmatched.push(w);
}
console.log("WEB PATHS:", web.length, "API LITERALS:", api.length);
console.log("=== WEB PATHS WITH NO API LITERAL (candidate 404s) ===");
for (const u of unmatched) console.log(u);
