/*
 * REVIEWER probe (read-only). Drives the REAL analyzePricelist deterministic
 * branch over a matrix the author did NOT test, to find whether the new `/`
 * range separator converts something that is not a money range.
 */
import { analyzePricelist } from "../../../../apps/api/src/pricelist/analyzer.js";
import type { ServiceCatalogItem } from "@dental/shared";

const EMPTY: ServiceCatalogItem[] = [];

const lines = [
  // --- reported defect + author-claimed already-correct forms
  "Отбеливание 12000-18000 руб",
  "Отбеливание 12000/18000 руб",
  // --- per-unit price with THOUSANDS SEPARATOR (author only tested no-separator)
  "Гигиена 3 000/1 час",
  "Гигиена 3.000/1 час",
  "Пломба 1 500/2 поверхности",
  "Коронка 15 000/зуб",
  "Имплантация 45.000/1 имплант",
  // --- per-unit price with a 3-DIGIT denominator (author only tested 1-2 digits)
  "Седация 5000/120 мин",
  "Наркоз 12000/100 мин",
  "Хранение 3000/365 дней",
  // --- ratio / fraction forms that are NOT money
  "Шинирование 1/2 челюсти 4000 руб",
  "Кюретаж 1/4 полости 2500 руб",
  // --- counts and line numbers (must never become money)
  "12/18 Отбеливание 5000 руб",
  "Позиция 3/25 Кариес 4000 руб",
  // --- dates written with slash
  "Акция 01/2026 Отбеливание 12000 руб",
  "Прайс 2025/2026 Отбеливание 12000 руб",
  // --- tooth numbers / ages (author tested these)
  "Каппа 12-16 лет",
  "Каппа 12/16 лет",
  // --- reversed range: upper < lower
  "Отбеливание 18000/12000 руб",
  // --- three-part slash chain
  "Отбеливание 12000/15000/18000 руб",
  // --- previous-word bite check
  "Оборот 12000/18000 руб",
  // --- currency-marker after slash pair
  "Отбеливание 12000/18000 ₽",
];

const response = await analyzePricelist(
  {
    sourceName: "reviewer-probe",
    sourceKind: "text",
    rawText: lines.join("\n"),
    imageMimeType: "image/jpeg",
    preferredSpecialty: "universal",
    useServerAi: false,
  },
  EMPTY,
);

for (const line of lines) {
  const item = response.items.find((candidate) => candidate.sourceText === line)
    ?? response.items.find((candidate) => line.includes(candidate.title) && candidate.title.length > 2);
  if (!item) {
    console.log(`NO ITEM      | ${line}`);
    continue;
  }
  console.log(
    `title=«${item.title}» price=${item.priceRub} max=${item.priceMaxRub} unit=${item.unit} | src=${line}`,
  );
}
console.log(`items=${response.items.length} lines=${lines.length}`);
