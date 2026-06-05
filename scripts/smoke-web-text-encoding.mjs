import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const webSrcRoot = path.join("apps", "web", "src");
const sourceExtensions = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const mojibakePattern = /(?:\u00c3.|\u00c2.|\u00d0.|\u00d1.|\u00e2.|\ufffd)/g;

function walkSourceFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(fullPath));
      continue;
    }
    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sourceFiles = walkSourceFiles(webSrcRoot);
const sources = Object.fromEntries(sourceFiles.map((filePath) => [filePath, readFileSync(filePath, "utf8")]));
const sourceBlob = Object.values(sources).join("\n");

const mojibakeHits = [];
for (const [filePath, source] of Object.entries(sources)) {
  const hits = source.match(mojibakePattern);
  if (hits?.length) mojibakeHits.push({ filePath, hits: hits.slice(0, 5) });
}

assert(
  mojibakeHits.length === 0,
  `web source contains mojibake markers: ${JSON.stringify(mojibakeHits.slice(0, 8))}`
);

const requiredReadableRussian = [
  "КЛКТ/КТ-серия готова к просмотру срезов.",
  "КТ-срезы: выберите готовую КЛКТ/КТ-серию.",
  "Точные числовые настройки КТ-срезов",
  "Клинические протоколы КТ-срезов",
  "срез включится после КЛКТ/КТ-серии",
  "Публичный поиск получает только реквизиты клиники",
  "Пациентов, снимки, базы и локальные пути сюда не отправлять.",
  "Нейро-проверка",
  "КЛКТ/КТ-срезы",
  "CRM сам ищет старые базы, выгрузки, снимки и следы стоматологических программ.",
  "Автоплан миграции: источников",
  "Пакет миграции:",
  "системные следы"
];

const missing = requiredReadableRussian.filter((snippet) => !sourceBlob.includes(snippet));
assert(missing.length === 0, `web source lost required readable Russian snippets: ${missing.join(" | ")}`);

console.log(
  JSON.stringify(
    {
      ok: true,
      checkedFiles: sourceFiles.length,
      mojibakeHits: 0,
      requiredSnippets: requiredReadableRussian.length
    },
    null,
    2
  )
);
