// Reviewer probe (read-only). Drives the HEAD deterministic pricelist parser and, side by side,
// a verbatim reimplementation of the PARENT-commit parser copied off the "-" side of the diff.
// No network, no DB, no writes.
import { analyzePricelist } from "../../../../apps/api/src/pricelist/analyzer.ts";

// ---- PARENT implementations, copied verbatim from the diff's removed lines ----
function oldParseMoney(value) {
  if (!value) return null;
  const normalized = value.replace(/[^\d]/g, "");
  if (!normalized) return null;
  const price = Number(normalized);
  return Number.isFinite(price) && price >= 300 && price <= 2_000_000 ? Math.round(price) : null;
}
function oldExtractPrice(line) {
  const withoutServiceCodes = line.replace(/\b[A-ZА-Я]?\d{2}\.\d{2}\.\d{3}\b/giu, " ");
  const candidates = [];
  const priceRegex =
    /(?:от\s*)?(\d{1,3}(?:[\s.]\d{3})+|\d{3,7})(?:\s*(?:-|до)\s*(\d{1,3}(?:[\s.]\d{3})+|\d{3,7}))?\s*(₽|руб\.?|р\.?)?/giu;
  // Selection logic is UNCHANGED by the diff, so it must be read from HEAD, not guessed.
  for (const match of withoutServiceCodes.matchAll(priceRegex)) {
    const priceRub = oldParseMoney(match[1]);
    const priceMaxRub = oldParseMoney(match[2]);
    if (priceRub !== null) {
      candidates.push({
        priceRub,
        priceMaxRub: priceMaxRub !== null && priceMaxRub >= priceRub ? priceMaxRub : null,
        explicit: Boolean(match[3] || match[2])
      });
    }
  }
  if (!candidates.length) return { priceRub: null, priceMaxRub: null };
  const explicit = candidates.filter((candidate) => candidate.explicit);
  const selected = (explicit.length ? explicit : candidates).at(-1);
  return { priceRub: selected?.priceRub ?? null, priceMaxRub: selected?.priceMaxRub ?? null };
}
function oldStripPriceFromTitle(line) {
  return line
    .replace(/\b[A-ZА-Я]?\d{2}\.\d{2}\.\d{3}\b/giu, " ")
    .replace(/(?:от\s*)?\d{1,3}(?:[\s.]\d{3})+\s*(?:-|до)?\s*\d{0,3}(?:[\s.]\d{3})?\s*(?:₽|руб\.?|р\.?)?/giu, " ")
    .replace(/\b\d{3,7}\s*(?:₽|руб\.?|р\.?)\b/giu, " ")
    .replace(/[;|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const lines = [
  "Лечение кариеса 1500,50",
  "Пломба композитная 2300,25",
  "Коронка металлокерамика 1 500,50 руб.",
  "Имплантация Straumann 12.500,50",
  "Удаление зуба 1500,5",
  "Реставрация 1500,505",
  "Консультация врача-стоматолога 1500 руб.",
  "Профгигиена 1500 ₽",
  "Снимок прицельный 1500 р.",
  "Хирургия A16.07.001 5500 руб.",
  "Винир 1500,00 руб.",
  "Гигиена полости рта 1500 рублей",
  "Отбеливание 12000-18000 руб",
  "Отбеливание ZOOM 12000 - 18000 руб.",
  "Брекеты от 90000 до 150000 руб.",
  "Скидка 10% на лечение 4500 р",
  "Наркоз 1 час 9500 руб.",
  "Ортопантомограмма 1 500 руб",
  "Лечение пульпита 3 канала 8500",
  "Композитная реставрация 12.500",
  "Чистка 990,90 руб",
  "Установка импланта 45 000,99 ₽",
  "Слепок 1500,05",
  "Плазмолифтинг 4 500,00 - 6 000,50 руб.",
  "Шинирование 1500,50 руб. за зуб"
];

const { dentalPricelistAnalysisRequestSchema } = await import("../../../../packages/shared/src/index.ts");
const request = dentalPricelistAnalysisRequestSchema.parse({
  rawText: lines.join("\n"),
  useServerAi: false,
  sourceName: "reviewer-probe"
});

const res = await analyzePricelist(request, []);
console.log("parserMode:", res.parserMode, "items:", res.items.length);
console.log("");
console.log("| input | OLD price | NEW price | OLD title | NEW title |");
for (const item of res.items) {
  const old = oldExtractPrice(item.sourceText);
  const oldTitle = oldStripPriceFromTitle(item.sourceText);
  const priceChanged = old.priceRub !== item.priceRub || old.priceMaxRub !== item.priceMaxRub;
  const titleChanged = oldTitle !== item.title;
  console.log(
    [
      JSON.stringify(item.sourceText),
      `OLD=${old.priceRub}/${old.priceMaxRub}`,
      `NEW=${item.priceRub}/${item.priceMaxRub}`,
      priceChanged ? "PRICE-DIFF" : "price-same",
      `OLDTITLE=${JSON.stringify(oldTitle)}`,
      `NEWTITLE=${JSON.stringify(item.title)}`,
      titleChanged ? "TITLE-DIFF" : "title-same"
    ].join("  ")
  );
}
console.log("");
console.log("--- category summaries (min/max/avg) ---");
for (const s of res.summary) {
  console.log(s.category, s.specialty, "count", s.count, "priced", s.pricedCount, "min", s.minPriceRub, "max", s.maxPriceRub, "avg", s.averagePriceRub,
    s.minPriceRub !== null && s.averagePriceRub !== null && (s.averagePriceRub < s.minPriceRub || s.averagePriceRub > s.maxPriceRub) ? "*** AVG OUT OF RANGE ***" : "");
}
