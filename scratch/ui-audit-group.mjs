/** Группирует находки аудита по первопричине, а не по экземплярам. */
import fs from "node:fs";

const r = JSON.parse(fs.readFileSync("scratch/ui-audit-out/report.json", "utf8"));
const KINDS = ["invisibleText", "overflowX", "lowContrast", "tinyTargets", "clippedText", "unnamedControls"];
const only = process.argv[2];

/** Ключ группировки: последний селектор в пути + цвета — это и есть правило. */
function keyOf(kind, f) {
  const tail = (f.sel || "").split(" > ").slice(-1)[0];
  if (kind === "invisibleText" || kind === "lowContrast") return `${tail} | ${f.color} на ${f.bg}`;
  if (kind === "tinyTargets") return `${tail} | ${f.w}x${f.h}`;
  if (kind === "overflowX") return `${tail}`;
  if (kind === "clippedText") return `${tail}`;
  return tail;
}

for (const kind of KINDS) {
  if (only && only !== kind) continue;
  const groups = new Map();
  for (const s of r.states) {
    for (const f of s[kind] || []) {
      const k = keyOf(kind, f);
      if (!groups.has(k)) groups.set(k, { count: 0, states: new Set(), sample: f, views: new Set() });
      const g = groups.get(k);
      g.count += 1;
      g.states.add(`${s.viewport}/${s.theme}`);
      g.views.add(s.view);
    }
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].count - a[1].count);
  const total = sorted.reduce((n, [, g]) => n + g.count, 0);
  console.log(`\n### ${kind}: ${total} находок, ${sorted.length} различимых причин`);
  for (const [k, g] of sorted.slice(0, 18)) {
    const views = [...g.views].join(",");
    console.log(`  ${String(g.count).padStart(3)}x  ${k}`);
    console.log(`       состояния: ${[...g.states].join(" ")} | экраны: ${views.slice(0, 90)}`);
    if (g.sample.text) console.log(`       текст: "${g.sample.text}"`);
    if (g.sample.ratio !== undefined) console.log(`       контраст ${g.sample.ratio} (нужно ${g.sample.need ?? "1.15+"}), ${g.sample.fontSize ?? "?"}px`);
    if (g.sample.overhang) console.log(`       вылезает на ${g.sample.overhang}px за ${g.sample.viewport}px, ширина ${g.sample.width}`);
    if (g.sample.html) console.log(`       ${g.sample.html.slice(0, 100)}`);
    console.log(`       путь: ${g.sample.sel}`);
  }
}
