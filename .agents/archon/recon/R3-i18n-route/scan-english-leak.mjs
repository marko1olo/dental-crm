// R3-i18n-route. READ-ONLY. Finds bare JSX TEXT NODES in .tsx that are English
// prose with no Cyrillic -> English leaking into a Russian-only UI. The repo's
// own gates (smoke-api-text-encoding.mjs:158-216, smoke-ui-preferences.mjs:266)
// treat this as a defect, so measuring the residue tests whether they work.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] || "C:/Clinic_MVP/dental-crm";
const CYR = /[Ѐ-ӿ]/;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".vite", "coverage", "scratch", "__tests__", "tests"]);

// Latin tokens that are legitimately Latin in a Russian dental UI: brands,
// standards, units, file formats. Not leakage.
const ALLOW = new Set([
  "DENTE", "WhatsApp", "SMS", "MAX", "DICOM", "PDF", "XML", "CSV", "XLSX", "DBF", "JSON", "ZIP",
  "Email", "E-mail", "PWA", "OTP", "PIN", "JWT", "API", "URL", "ID", "IP", "QR", "SEO",
  "Telegram", "VK", "Mango", "Zadarma", "IDENT", "DentalPRO", "iStom", "Infodent",
  "CBCT", "MPR", "CT", "KND", "INN", "KPP", "OGRN", "OK", "SLA", "TIFF", "PNG", "JPG",
  "mm", "cm", "px", "kB", "MB", "GB", "ms", "Hz", "mA", "kV", "mSv", "Sv", "USD", "EUR", "RUB",
  "recall", "no-show", "Undo", "Wi-Fi", "USB", "LAN", "HTTP", "HTTPS", "TLS", "SSL",
]);

function walk(dir, out) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.isDirectory()) { if (SKIP_DIRS.has(e.name)) continue; walk(path.join(dir, e.name), out); }
    else if (e.isFile() && e.name.endsWith(".tsx") && !e.name.includes(".test.")) out.push(path.join(dir, e.name));
  }
  return out;
}

// Reuse the same lexer idea: only text sitting between > and < , outside strings
// and comments, is a JSX text node.
function jsxTextNodes(src) {
  const nodes = [];
  // Strip comments and string literals first so their contents cannot masquerade
  // as JSX text. Replace with same-length spaces to keep line numbers intact.
  const n = src.length; const buf = src.split("");
  let mode = "code", quote = "", i = 0; const tmpl = [];
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    if (mode === "code") {
      if (c === "/" && c2 === "/") { mode = "line"; buf[i] = buf[i + 1] = " "; i += 2; continue; }
      if (c === "/" && c2 === "*") { mode = "block"; buf[i] = buf[i + 1] = " "; i += 2; continue; }
      if (c === '"' || c === "'" || c === "`") { mode = "str"; quote = c; buf[i] = " "; i++; continue; }
      if (c === "{" && tmpl.length) tmpl[tmpl.length - 1]++;
      if (c === "}" && tmpl.length) { tmpl[tmpl.length - 1]--; if (tmpl[tmpl.length - 1] < 0) { tmpl.pop(); mode = "str"; quote = "`"; buf[i] = " "; i++; continue; } }
      i++; continue;
    }
    if (mode === "line") { if (c === "\n") { mode = "code"; i++; continue; } buf[i] = " "; i++; continue; }
    if (mode === "block") { if (c === "*" && c2 === "/") { buf[i] = buf[i + 1] = " "; mode = "code"; i += 2; continue; } if (c !== "\n") buf[i] = " "; i++; continue; }
    if (mode === "str") {
      if (c === "\\") { buf[i] = " "; if (i + 1 < n) buf[i + 1] = " "; i += 2; continue; }
      if (quote === "`" && c === "$" && c2 === "{") { buf[i] = buf[i + 1] = " "; tmpl.push(0); mode = "code"; i += 2; continue; }
      if (c === quote) { buf[i] = " "; mode = "code"; i++; continue; }
      if (quote !== "`" && c === "\n") { mode = "code"; i++; continue; }
      if (c !== "\n") buf[i] = " ";
      i++; continue;
    }
  }
  const clean = buf.join("");
  // JSX text = run between '>' and '<' that is not inside {} and holds a letter.
  const re = />([^<>{}]{2,})</g;
  let m;
  while ((m = re.exec(clean)) !== null) {
    const raw = m[1];
    if (!/[A-Za-zЀ-ӿ]/.test(raw)) continue;
    // A JSX text node is prose. Reject anything that is clearly leaked TS code:
    // generics (`as Array<{...}>`) make the lexer see a fake `>...<` span.
    if (/[;=()[\]]|\bconst\b|\bas\b\s+[A-Z]|=>/.test(raw)) continue;
    if (raw.length > 160) continue;
    const line = clean.slice(0, m.index).split("\n").length;
    nodes.push({ text: raw.replace(/\s+/g, " ").trim(), line });
  }
  return nodes;
}

const files = walk(path.join(ROOT, "apps/web/src"), []);
const leaks = new Map();
let totalNodes = 0, cyrNodes = 0, latinNodes = 0;

for (const f of files) {
  let src; try { src = fs.readFileSync(f, "utf8"); } catch { continue; }
  const rel = path.relative(ROOT, f).replace(/\\/g, "/");
  for (const nd of jsxTextNodes(src)) {
    if (!nd.text) continue;
    totalNodes++;
    if (CYR.test(nd.text)) { cyrNodes++; continue; }
    if (!/[A-Za-z]{3,}/.test(nd.text)) continue; // punctuation/numbers only
    latinNodes++;
    // strip allowed tokens; if anything English-word-like remains, it is a leak
    const words = nd.text.split(/[^A-Za-z-]+/).filter((w) => w.length >= 3);
    const residue = words.filter((w) => !ALLOW.has(w) && !ALLOW.has(w.toUpperCase()));
    if (residue.length === 0) continue;
    const key = nd.text;
    if (!leaks.has(key)) leaks.set(key, { at: `${rel}:${nd.line}`, count: 0, residue });
    leaks.get(key).count++;
  }
}

const list = [...leaks.entries()].map(([text, v]) => ({ text, ...v }))
  .sort((a, b) => b.text.length - a.text.length);

fs.writeFileSync(path.join(ROOT, ".agents/archon/recon/R3-i18n-route/english-leak.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), filesScanned: files.length, totalJsxTextNodes: totalNodes, cyrillicNodes: cyrNodes, latinOnlyNodes: latinNodes, distinctLeakCandidates: list.length, list }, null, 2), "utf8");

console.log("tsxFilesScanned", files.length);
console.log("totalJsxTextNodes", totalNodes);
console.log("cyrillicTextNodes", cyrNodes);
console.log("latinOnlyTextNodes", latinNodes);
console.log("distinctEnglishLeakCandidates", list.length);
console.log("wrote", ".agents/archon/recon/R3-i18n-route/english-leak.json");
