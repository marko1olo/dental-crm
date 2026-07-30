/**
 * Ищет CSS-переменные, которые используются через var(), но нигде не
 * объявлены. Такая переменная не даёт ошибки: свойство просто становится
 * недействительным и наследуется или берётся начальное значение. В тёмной
 * теме это выглядит как «текст пропал».
 *
 * var(--x, запас) с запасным значением не считается дефектом.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "apps/web/src";
const cssFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      walk(p);
    } else if (e.name.endsWith(".css")) cssFiles.push(p);
  }
})(ROOT);

const defined = new Set();
const used = new Map();
const withFallback = new Set();

for (const f of cssFiles) {
  const css = fs.readFileSync(f, "utf8");
  for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);
  for (const m of css.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
    const name = m[1];
    if (m[2]) withFallback.add(name);
    if (!used.has(name)) used.set(name, new Map());
    const perFile = used.get(name);
    perFile.set(f, (perFile.get(f) || 0) + 1);
  }
}

// Переменные могут задаваться и из JS через style.setProperty.
const jsDefined = new Set();
(function walkJs(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      walkJs(p);
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      const src = fs.readFileSync(p, "utf8");
      for (const m of src.matchAll(/["'`](--[\w-]+)["'`]/g)) jsDefined.add(m[1]);
      for (const m of src.matchAll(/(--[\w-]+)\s*:/g)) jsDefined.add(m[1]);
    }
  }
})(ROOT);

const missing = [...used.entries()]
  .filter(([n]) => !defined.has(n) && !jsDefined.has(n))
  .map(([n, files]) => ({
    name: n,
    count: [...files.values()].reduce((a, b) => a + b, 0),
    files: [...files.keys()].map((f) => f.replace(/\\/g, "/").replace("apps/web/src/", "")),
    fallback: withFallback.has(n),
  }))
  .sort((a, b) => b.count - a.count);

console.log(`объявлено переменных в CSS: ${defined.size}`);
console.log(`использовано через var():   ${used.size}`);
console.log(`НЕ ОБЪЯВЛЕНО НИГДЕ:         ${missing.length}\n`);
for (const m of missing) {
  const flag = m.fallback ? " (есть var(--x, запас) — не дефект)" : "";
  console.log(`  ${String(m.count).padStart(3)}x  ${m.name}${flag}`);
  console.log(`        ${m.files.slice(0, 4).join(", ")}`);
}
const hard = missing.filter((m) => !m.fallback);
console.log(`\nбез запасного значения (реальные дефекты): ${hard.length}, ${hard.reduce((a, b) => a + b.count, 0)} вхождений`);
