// READ-ONLY. For each of the 14 views, walk the local import graph from its root
// component and collect every /api/... path literal reachable from it.
// Also reports transitive file count and total LOC.
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const WEB = "C:/Clinic_MVP/dental-crm/apps/web/src";

const ROOTS = {
  shift: ["ShiftView.tsx"],
  schedule: ["ScheduleView.tsx"],
  patients: ["PatientsView.tsx"],
  imaging: ["ImagingView.tsx"],
  visit: ["VisitView.tsx"],
  documents: ["DocumentsView.tsx"],
  finance: ["FinanceView.tsx"],
  analytics: ["pages/AnalyticsDashboardView.tsx"],
  communications: ["CommunicationsView.tsx"],
  inventory: ["components/InventoryView.tsx"],
  scanner: ["ScannerView.tsx"],
  leads: ["components/leads/LeadsKanbanView.tsx"],
  settings: ["SettingsView.tsx"],
  marketing: ["MarketingView.tsx"],
};

function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  let base = path.resolve(path.dirname(fromFile), spec);
  base = base.replace(/\.js$/, "").replace(/\.jsx$/, "");
  const cands = [
    base + ".tsx", base + ".ts", base + "/index.tsx", base + "/index.ts", base,
  ];
  for (const c of cands) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

// Runtime edges only. `import type {...} from` / `export type {...} from` are
// erased by the bundler, so following them fabricates connectivity that does not
// exist at runtime — AppLogicContext.tsx:2 is exactly such an edge.
const IMPORT_RE = /(?:^|\n)\s*(?:import|export)(?!\s+type\s)[\s\S]{0,400}?from\s*["']([^"']+)["']/g;
const DYN_RE = /import\(\s*["']([^"']+)["']\s*\)/g;
const API_RE = /\/api\/[A-Za-z0-9/_.:${}\-]*/g;

function walk(rootRel) {
  const root = path.resolve(WEB, rootRel);
  if (!existsSync(root)) return { missing: true, files: [], apis: new Map(), loc: 0 };
  const seen = new Set();
  const queue = [root];
  const apis = new Map(); // path -> [file:line]
  let loc = 0;
  while (queue.length) {
    const f = queue.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    if (/\.(test|spec)\.[tj]sx?$/.test(f)) continue;
    let src;
    try { src = readFileSync(f, "utf8"); } catch { continue; }
    const lines = src.split(/\r?\n/);
    loc += lines.length;
    // API literals — only on lines that look like a real request, not prose.
    lines.forEach((line, i) => {
      if (!/\/api\//.test(line)) return;
      // Skip comment-only lines (prose about a removed route).
      const trimmed = line.trim();
      if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) return;
      for (const m of line.match(API_RE) ?? []) {
        const key = m.replace(/\$\{[^}]*\}/g, ":p").replace(/[.,;)`"']+$/, "");
        if (!apis.has(key)) apis.set(key, []);
        apis.get(key).push(`${path.relative(WEB, f).replace(/\\/g, "/")}:${i + 1}`);
      }
    });
    for (const re of [IMPORT_RE, DYN_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(src))) {
        const r = resolveImport(f, m[1]);
        if (r) queue.push(r);
      }
    }
  }
  return { missing: false, files: [...seen], apis, loc };
}

const out = {};
for (const [view, roots] of Object.entries(ROOTS)) {
  const merged = { files: new Set(), apis: new Map(), loc: 0, missingRoots: [] };
  for (const r of roots) {
    const res = walk(r);
    if (res.missing) { merged.missingRoots.push(r); continue; }
    res.files.forEach((f) => merged.files.add(f));
    merged.loc += res.loc;
    for (const [k, v] of res.apis) {
      if (!merged.apis.has(k)) merged.apis.set(k, []);
      merged.apis.get(k).push(...v);
    }
  }
  out[view] = {
    transitiveFiles: merged.files.size,
    transitiveLoc: merged.loc,
    missingRoots: merged.missingRoots,
    apiPaths: [...merged.apis.entries()].map(([p, at]) => ({ p, at: at.slice(0, 3) })).sort((a, b) => a.p.localeCompare(b.p)),
  };
}
console.log(JSON.stringify(out, null, 1));
