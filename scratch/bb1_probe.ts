/*
 * ADVERSARIAL PROBE — BB1. Read-only.
 * Different instrument from the builder's: drives the REAL exported public entry
 * analyzePricelist() in deterministic mode, HEAD vs the parent blob, and diffs
 * title/price/summary. The builder tested via node:test unit files; this walks
 * the whole deterministic pipeline the way routes/pricelist.ts does.
 */
import { writeFileSync } from "node:fs";
import { analyzePricelist as headAnalyze } from "../apps/api/src/pricelist/analyzer.js";
import { analyzePricelist as parentAnalyze } from "./pricelist/analyzer_parent.js";

const lines: string[] = [
  "Отбеливание 12000-18000 руб",
  "Отбеливание 12000-18000 ₽",
  "Отбеливание от 12000 до 18000 руб",
  "Отбеливание 12000-18000",
  "Отбеливание 12.000-18.000 руб",
  "Лечение кариеса 1500,50 руб",
  "Имплантация 25000 руб",
  "Бахилы 100-200",
  "Анестезия аппликационная 200-500 руб",
  "Штифт стекловолоконный 1500-2000 мкм",
  "Оборот 12000-18000",
  "Снимок 3D 2020-2024",
  "Гигиена полости рта от 3000 до 5000",
  "Консультация 500-700 р.",
  "Рентген 1 снимок 350-400",
  "Кабинет 305-310 осмотр 1200 руб",
  "Коронка E-max 1500-2000 руб за единицу",
  "Шинирование зубов 3.4-4.3 15000 руб",
  "Пломба композитная 2300,25",
  "Удаление зуба 1500 рабочих дней гарантии 4000 руб",
  "Профгигиена 45 мин 4500 руб",
  "Скидка 10-15 процентов 5000 руб"
];

type Row = {
  line: string;
  parentTitle: string | null;
  headTitle: string | null;
  titleChanged: boolean;
  parentPrice: [number | null, number | null];
  headPrice: [number | null, number | null];
  priceChanged: boolean;
  /** true = new regex removed text from the title but NO price was extracted. */
  textLostWithoutPrice: boolean;
};

async function run(): Promise<void> {
  const out: { rows: Row[]; average: unknown; errors: string[] } = { rows: [], average: null, errors: [] };

  for (const line of lines) {
    const req = {
      sourceName: "probe",
      sourceKind: "text" as const,
      rawText: line,
      imageMimeType: "image/jpeg" as const,
      preferredSpecialty: "universal" as const,
      useServerAi: false
    };
    try {
      const [p, h] = await Promise.all([parentAnalyze(req, []), headAnalyze(req, [])]);
      const pi = p.items[0];
      const hi = h.items[0];
      const parentTitle = pi ? pi.title : null;
      const headTitle = hi ? hi.title : null;
      const headPrice: [number | null, number | null] = [hi ? hi.priceRub : null, hi ? hi.priceMaxRub : null];
      out.rows.push({
        line,
        parentTitle,
        headTitle,
        titleChanged: parentTitle !== headTitle,
        parentPrice: [pi ? pi.priceRub : null, pi ? pi.priceMaxRub : null],
        headPrice,
        priceChanged:
          (pi ? pi.priceRub : null) !== headPrice[0] || (pi ? pi.priceMaxRub : null) !== headPrice[1],
        textLostWithoutPrice:
          parentTitle !== headTitle &&
          (headTitle ?? "").length < (parentTitle ?? "").length &&
          headPrice[0] === null
      });
    } catch (error) {
      out.errors.push(`${line} :: ${(error as Error).message}`);
    }
  }

  // summarize() float-accumulation claim, driven through the public entry.
  const avgReq = {
    sourceName: "probe-avg",
    sourceKind: "text" as const,
    rawText: "Консультация первичная 300,01 руб\nКонсультация повторная 300,05 руб\nКонсультация детская 300,07 руб",
    imageMimeType: "image/jpeg" as const,
    preferredSpecialty: "universal" as const,
    useServerAi: false
  };
  const [pa, ha] = await Promise.all([parentAnalyze(avgReq, []), headAnalyze(avgReq, [])]);
  out.average = {
    parent: pa.summary.map((s) => ({ c: s.category, n: s.count, min: s.minPriceRub, max: s.maxPriceRub, avg: s.averagePriceRub })),
    head: ha.summary.map((s) => ({ c: s.category, n: s.count, min: s.minPriceRub, max: s.maxPriceRub, avg: s.averagePriceRub })),
    naiveFloat: (300.01 + 300.05 + 300.07) / 3
  };

  writeFileSync(new URL("./bb1_out.json", import.meta.url), JSON.stringify(out, null, 1), "utf8");
  console.log("ROWS", out.rows.length, "ERRORS", out.errors.length);
}

await run();
