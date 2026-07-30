/**
 * Считает, какие CSS-классы реально встречаются в разметке и каких из них
 * нет ни в одной таблице стилей проекта.
 */
import fs from "node:fs";
import path from "node:path";

const SRC = "apps/web/src";
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "__tests__" || e.name === "tests") continue;
      walk(p);
    } else if (/\.(tsx|jsx)$/.test(e.name)) files.push(p);
  }
})(SRC);

// Все классы, объявленные в CSS проекта.
const declared = new Set();
(function walkCss(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      walkCss(p);
    } else if (e.name.endsWith(".css")) {
      const css = fs.readFileSync(p, "utf8");
      for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*(?:\\:[\w-]+)?)/g)) {
        declared.add(m[1].replace(/\\/g, ""));
      }
    }
  }
})(SRC);

const used = new Map();
const perFile = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  // className="..." и className={`...`} — берём только литеральные куски.
  for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g)) {
    const raw = m[1] ?? m[2] ?? m[3] ?? "";
    for (const cls of raw.split(/[\s]+/)) {
      const c = cls.trim();
      if (!c || c.includes("$") || c.includes("{") || c.includes("(")) continue;
      used.set(c, (used.get(c) || 0) + 1);
      if (!perFile.has(c)) perFile.set(c, new Set());
      perFile.get(c).add(f);
    }
  }
}

const dead = [...used.entries()].filter(([c]) => !declared.has(c)).sort((a, b) => b[1] - a[1]);
const live = [...used.entries()].filter(([c]) => declared.has(c));

console.log(`классов в разметке: ${used.size}`);
console.log(`  объявлено в CSS:  ${live.length}`);
console.log(`  НЕ объявлено:     ${dead.length}  (${dead.reduce((n, [, c]) => n + c, 0)} вхождений)`);

// Группируем мёртвые по смыслу утилиты.
const buckets = {
  "раскладка (flex/grid/выравнивание)": /^(flex|grid|inline-flex|block|inline|hidden|items-|justify-|self-|content-|place-|flex-|grow|shrink|order-|col-|row-|gap-|space-)/,
  "размеры": /^(w-|h-|min-w-|min-h-|max-w-|max-h-|size-)/,
  "отступы": /^(p-|px-|py-|pt-|pb-|pl-|pr-|m-|mx-|my-|mt-|mb-|ml-|mr-)/,
  "типографика": /^(text-|font-|leading-|tracking-|uppercase|lowercase|capitalize|truncate|whitespace-|break-)/,
  "цвет и фон": /^(bg-|border-|ring-|from-|to-|via-|fill-|stroke-|divide-)/,
  "скругления и тени": /^(rounded|shadow)/,
  "состояния и темы": /^(dark:|hover:|focus:|active:|disabled:|group-|sm:|md:|lg:|xl:)/,
  "прочее": /./,
};
const counts = {};
const samples = {};
for (const [c, n] of dead) {
  for (const [name, re] of Object.entries(buckets)) {
    if (re.test(c)) {
      counts[name] = (counts[name] || 0) + n;
      (samples[name] ??= []).push(`${c}(${n})`);
      break;
    }
  }
}
console.log("\nмёртвые классы по назначению:");
for (const [name, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${name}`);
  console.log(`         ${samples[name].slice(0, 10).join(" ")}`);
}

console.log("\nтоп-30 мёртвых классов:");
for (const [c, n] of dead.slice(0, 30)) {
  console.log(`  ${String(n).padStart(4)}x  ${c}   (${perFile.get(c).size} файл(ов))`);
}
