// R3-i18n-route :: READ-ONLY Cyrillic census with lexical classification.
// Writes ONLY into this packet directory. Never touches source.
// Cyrillic is matched via \u escapes so this file stays ASCII-safe.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] ?? "C:/Clinic_MVP/dental-crm";
const OUT = process.argv[3] ?? path.join(ROOT, ".agents/archon/recon/R3-i18n-route");

const CYR = /[Ѐ-ӿԀ-ԯ]/;
const CYR_G = /[Ѐ-ӿԀ-ԯ]/g;

const SKIP_DIR = new Set([
  "node_modules", ".git", "dist", "build", ".vite", "coverage", ".next",
  "playwright-report", "test-results", ".turbo", ".cache",
]);

const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const TEXTY_EXT = new Set([".css", ".html", ".json", ".sql", ".md", ".txt", ".yml", ".yaml", ".csv", ".svg"]);

function walk(dir, acc) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIR.has(e.name)) continue;
      walk(p, acc);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (CODE_EXT.has(ext) || TEXTY_EXT.has(ext)) acc.push(p);
    }
  }
  return acc;
}

function rel(p) { return path.relative(ROOT, p).split(path.sep).join("/"); }

// area classification — what SHIPS to a user vs what does not
function areaOf(r) {
  if (/(^|\/)scratch\//.test(r)) return "scratch";
  if (/^apps\/web\/src\//.test(r)) return "web-src";
  if (/^apps\/api\/src\//.test(r)) return "api-src";
  if (/^packages\/shared\/src\//.test(r)) return "shared-src";
  if (/^apps\/web\/(public|index\.html)/.test(r)) return "web-public";
  if (/^scripts\//.test(r)) return "scripts";
  if (/^(tests|e2e)\//.test(r) || /\.spec\.[tj]sx?$/.test(r) || /\.test\.[tj]sx?$/.test(r)) return "tests";
  if (/^apps\/api\/(drizzle|migrations)\//.test(r) || /\.sql$/.test(r)) return "migrations";
  if (/^(docs|\.agents|\.dente)/.test(r) || /\.md$/.test(r)) return "docs";
  return "other";
}

// ---- lexical scanner -------------------------------------------------------
// buckets: comment | string | tpl | jsx | regex | code
function scanCode(src, ext) {
  const isJsx = ext === ".tsx" || ext === ".jsx";
  const n = src.length;
  let i = 0, line = 1;
  const perLine = new Map(); // line -> Set(bucket)
  const literals = []; // {line, bucket, text, prefixCtx, interpolated}
  const counts = { comment: 0, string: 0, tpl: 0, jsx: 0, regex: 0, code: 0 };
  let lastSignificant = ""; // last non-space char in NORMAL state (regex heuristic)

  function mark(bucket, ln, chars) {
    counts[bucket] += chars;
    if (!perLine.has(ln)) perLine.set(ln, new Set());
    perLine.get(ln).add(bucket);
  }
  function lineStartIdx(idx) {
    let s = src.lastIndexOf("\n", idx - 1);
    return s + 1;
  }

  while (i < n) {
    const c = src[i];
    if (c === "\n") { line++; i++; continue; }

    // line comment
    if (c === "/" && src[i + 1] === "/") {
      let j = src.indexOf("\n", i);
      if (j < 0) j = n;
      const seg = src.slice(i, j);
      const m = seg.match(CYR_G);
      if (m) mark("comment", line, m.length);
      i = j;
      continue;
    }
    // block comment
    if (c === "/" && src[i + 1] === "*") {
      let j = src.indexOf("*/", i + 2);
      if (j < 0) j = n; else j += 2;
      const seg = src.slice(i, j);
      let ln = line;
      for (const part of seg.split("\n")) {
        const m = part.match(CYR_G);
        if (m) mark("comment", ln, m.length);
        ln++;
      }
      line += (seg.split("\n").length - 1);
      i = j;
      continue;
    }
    // regex literal (heuristic: / after an operator/opening position)
    if (c === "/" && /^[({[,;:=!&|?+\-*%<>~^]$|^$/.test(lastSignificant)) {
      let j = i + 1, inClass = false, ok = false;
      while (j < n) {
        const d = src[j];
        if (d === "\\") { j += 2; continue; }
        if (d === "\n") break;
        if (d === "[") inClass = true;
        else if (d === "]") inClass = false;
        else if (d === "/" && !inClass) { ok = true; break; }
        j++;
      }
      if (ok) {
        const seg = src.slice(i, j + 1);
        const m = seg.match(CYR_G);
        if (m) mark("regex", line, m.length);
        i = j + 1;
        lastSignificant = "/";
        continue;
      }
    }
    // string literals
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1, buf = "";
      while (j < n) {
        const d = src[j];
        if (d === "\\") { buf += src.slice(j, j + 2); j += 2; continue; }
        if (d === q) break;
        if (d === "\n") break; // unterminated -> bail
        buf += d; j++;
      }
      const m = buf.match(CYR_G);
      if (m) {
        mark("string", line, m.length);
        const ls = lineStartIdx(i);
        literals.push({
          line, bucket: "string", text: buf,
          prefix: src.slice(Math.max(ls, i - 60), i).replace(/\s+/g, " ").trim(),
          interpolated: false,
        });
      }
      const consumed = src.slice(i, j + 1);
      line += (consumed.split("\n").length - 1);
      i = j + 1;
      lastSignificant = q;
      continue;
    }
    // template literal
    if (c === "`") {
      let j = i + 1, depth = 0, buf = "", interp = false;
      while (j < n) {
        const d = src[j];
        if (d === "\\") { buf += src.slice(j, j + 2); j += 2; continue; }
        if (d === "$" && src[j + 1] === "{") { interp = true; depth = 1; j += 2; buf += "{X}";
          while (j < n && depth > 0) {
            if (src[j] === "{") depth++;
            else if (src[j] === "}") depth--;
            else if (src[j] === "\n") line++;
            if (depth === 0) { j++; break; }
            j++;
          }
          continue;
        }
        if (d === "`") break;
        buf += d; j++;
      }
      const m = buf.match(CYR_G);
      if (m) {
        const startLine = line;
        mark("tpl", startLine, m.length);
        const ls = lineStartIdx(i);
        literals.push({
          line: startLine, bucket: "tpl", text: buf,
          prefix: src.slice(Math.max(ls, i - 60), i).replace(/\s+/g, " ").trim(),
          interpolated: interp,
        });
      }
      const consumed = src.slice(i, j + 1);
      line += (consumed.split("\n").length - 1);
      i = j + 1;
      lastSignificant = "`";
      continue;
    }
    // bare code / JSX text
    if (CYR.test(c)) {
      // greedily consume the whole cyrillic-ish run
      let j = i;
      while (j < n && src[j] !== "\n" && src[j] !== "<" && src[j] !== "{" && src[j] !== "}") j++;
      const seg = src.slice(i, j);
      const m = seg.match(CYR_G);
      const bucket = isJsx ? "jsx" : "code";
      if (m) {
        mark(bucket, line, m.length);
        const ls = lineStartIdx(i);
        literals.push({
          line, bucket, text: seg.trim(),
          prefix: src.slice(Math.max(ls, i - 60), i).replace(/\s+/g, " ").trim(),
          interpolated: false,
        });
      }
      i = j;
      continue;
    }
    if (!/\s/.test(c)) lastSignificant = c;
    i++;
  }
  return { counts, perLine, literals };
}

// ---- run -------------------------------------------------------------------
const files = walk(ROOT, []);
const report = {
  scanned: files.length,
  byArea: {},
  codeBuckets: {},
  fileRows: [],
  literals: [],
};

for (const f of files) {
  let src;
  try { src = fs.readFileSync(f, "utf8"); } catch { continue; }
  if (!CYR.test(src)) continue;
  const r = rel(f);
  const area = areaOf(r);
  const ext = path.extname(f).toLowerCase();
  const lines = src.split("\n");
  const cyrLines = lines.reduce((a, l) => a + (CYR.test(l) ? 1 : 0), 0);
  const cyrChars = (src.match(CYR_G) || []).length;

  const A = report.byArea[area] ??= { files: 0, cyrLines: 0, cyrChars: 0, totalLines: 0 };
  A.files++; A.cyrLines += cyrLines; A.cyrChars += cyrChars; A.totalLines += lines.length;

  const row = { file: r, area, ext, lines: lines.length, cyrLines, cyrChars };

  if (CODE_EXT.has(ext)) {
    const { counts, perLine, literals } = scanCode(src, ext);
    const B = report.codeBuckets[area] ??= { comment: 0, string: 0, tpl: 0, jsx: 0, regex: 0, code: 0,
      lineComment: 0, lineString: 0, lineTpl: 0, lineJsx: 0, lineRegex: 0, lineCode: 0, lineMixed: 0 };
    for (const k of Object.keys(counts)) B[k] += counts[k];
    for (const [, set] of perLine) {
      if (set.size > 1) B.lineMixed++;
      const only = set.size === 1 ? [...set][0] : null;
      if (only === "comment") B.lineComment++;
      else if (only === "string") B.lineString++;
      else if (only === "tpl") B.lineTpl++;
      else if (only === "jsx") B.lineJsx++;
      else if (only === "regex") B.lineRegex++;
      else if (only === "code") B.lineCode++;
    }
    row.buckets = counts;
    row.translatableLiterals = literals.filter((l) => l.bucket !== "comment").length;
    for (const l of literals) report.literals.push({ file: r, area, ...l });
  }
  report.fileRows.push(row);
}

fs.writeFileSync(path.join(OUT, "census_raw.json"), JSON.stringify(report, null, 1), "utf8");

// ---- console summary (ASCII only) -----------------------------------------
const pad = (s, w) => String(s).padEnd(w);
const num = (s, w) => String(s).padStart(w);
console.log("FILES SCANNED (code+texty, excl node_modules/dist/.git): " + report.scanned);
console.log("");
console.log("== CYRILLIC-BEARING FILES AND LINES BY AREA ==");
console.log(pad("area", 14) + num("files", 7) + num("cyrLines", 10) + num("cyrChars", 10));
const areas = Object.entries(report.byArea).sort((a, b) => b[1].cyrLines - a[1].cyrLines);
let tf = 0, tl = 0, tc = 0;
for (const [a, v] of areas) {
  console.log(pad(a, 14) + num(v.files, 7) + num(v.cyrLines, 10) + num(v.cyrChars, 10));
  tf += v.files; tl += v.cyrLines; tc += v.cyrChars;
}
console.log(pad("TOTAL", 14) + num(tf, 7) + num(tl, 10) + num(tc, 10));
console.log("");
console.log("== CODE FILES ONLY: WHERE THE CYRILLIC CHARACTERS ACTUALLY LIVE (chars) ==");
console.log(pad("area", 14) + num("comment", 9) + num("string", 9) + num("tpl", 8) + num("jsxText", 9) + num("regex", 7) + num("bareTs", 8));
for (const [a, v] of Object.entries(report.codeBuckets)) {
  console.log(pad(a, 14) + num(v.comment, 9) + num(v.string, 9) + num(v.tpl, 8) + num(v.jsx, 9) + num(v.regex, 7) + num(v.code, 8));
}
console.log("");
console.log("== CODE FILES ONLY: LINES BY SOLE BUCKET (mixed = line has 2+ kinds) ==");
console.log(pad("area", 14) + num("cmtOnly", 9) + num("strOnly", 9) + num("tplOnly", 9) + num("jsxOnly", 9) + num("rgxOnly", 9) + num("bareOnly", 9) + num("mixed", 8));
for (const [a, v] of Object.entries(report.codeBuckets)) {
  console.log(pad(a, 14) + num(v.lineComment, 9) + num(v.lineString, 9) + num(v.lineTpl, 9) + num(v.lineJsx, 9) + num(v.lineRegex, 9) + num(v.lineCode, 9) + num(v.lineMixed, 8));
}
console.log("");
const ship = report.literals.filter((l) => ["web-src", "api-src", "shared-src"].includes(l.area) && l.bucket !== "comment");
const uniq = new Set(ship.map((l) => l.text.trim()));
console.log("== TRANSLATION UNITS IN SHIPPING CODE (web-src + api-src + shared-src) ==");
console.log("literal occurrences : " + ship.length);
console.log("distinct strings    : " + uniq.size);
console.log("interpolated tpl    : " + ship.filter((l) => l.interpolated).length);
console.log("by bucket           : " + JSON.stringify(ship.reduce((a, l) => { a[l.bucket] = (a[l.bucket] || 0) + 1; return a; }, {})));
console.log("");
console.log("wrote census_raw.json");
