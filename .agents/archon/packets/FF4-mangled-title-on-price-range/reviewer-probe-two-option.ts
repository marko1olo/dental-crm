/*
 * REVIEWER probe 2 (read-only): in a Russian pricelist «A/B» most often means
 * TWO DISCRETE OPTIONS (взрослый/детский, первичный/повторный, старая цена/новая
 * цена, одна челюсть/две), not a range — a range is written with a dash or
 * «от…до». This probe measures what the committed fix does to those lines, and
 * is run twice: once at HEAD, once with reviewer-revert-hook.mjs.
 */
import { analyzePricelist } from "../../../../apps/api/src/pricelist/analyzer.js";
import type { ServiceCatalogItem } from "@dental/shared";

const EMPTY: ServiceCatalogItem[] = [];

const lines = [
  "Консультация 1000/500 руб",
  "Осмотр 500/300 руб",
  "Отбеливание 18000/12000 руб",
  "Отбеливание 18000/12000",
  "Осмотр 300/500 руб",
  "Чистка 4000/6000 руб",
  // dash equivalents: was the descending-pair behaviour pre-existing for «-»?
  "Отбеливание 18000-12000 руб",
  "Консультация 1000-500 руб",
  // document / license / contract numbers written with a slash
  "Договор 1234/2025 Отбеливание 12000 руб",
  "Лицензия 5678/2024 Осмотр 500 руб",
  "Кабинет 101/102 Осмотр 500 руб",
  // dosage / material quantity
  "Анестезия Ультракаин 1000/2000 мг 500 руб",
];

for (const flavour of ["combined", "isolated"] as const) {
  console.log(`### ${flavour}`);
  const batches = flavour === "combined" ? [lines] : lines.map((line) => [line]);
  for (const batch of batches) {
    const response = await analyzePricelist(
      {
        sourceName: "reviewer-probe-2",
        sourceKind: "text",
        rawText: batch.join("\n"),
        imageMimeType: "image/jpeg",
        preferredSpecialty: "universal",
        useServerAi: false,
      },
      EMPTY,
    );
    for (const line of batch) {
      const item = response.items.find((candidate) => candidate.sourceText === line);
      console.log(
        item
          ? `title=«${item.title}» price=${item.priceRub} max=${item.priceMaxRub} | src=${line}`
          : `NO ITEM | src=${line}`,
      );
    }
  }
}
