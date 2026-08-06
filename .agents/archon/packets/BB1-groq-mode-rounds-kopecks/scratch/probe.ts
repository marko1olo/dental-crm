/*
 * Independent adversarial probe for BB1. Reviewer #3 instrument.
 * Drives the REAL exported public entry analyzePricelist (the same function
 * routes/pricelist.ts calls) and, separately, executes the PARENT blob's
 * regex chain + asNumberOrNull verbatim so parent-vs-HEAD is measured, not argued.
 */

import type {
	DentalPricelistAnalysisRequest,
	ServiceCatalogItem,
} from "@dental/shared";
import {
	analyzePricelist,
	itemFromGroq,
} from "../../../../../apps/api/src/pricelist/analyzer.js";

const CATALOG: ServiceCatalogItem[] = [];

function normalizeText(value: string): string {
	return value
		.normalize("NFKC")
		.replace(/[‐‑‒–—]/g, "-")
		.replace(/\s+/g, " ")
		.trim();
}

/** PARENT blob stripPriceFromTitle: verbatim, two .replace steps, no range rule. */
function stripParent(line: string): string {
	return normalizeText(
		line
			.replace(/\b[A-ZА-Я]?\d{2}\.\d{2}\.\d{3}\b/giu, " ")
			.replace(
				/(?:от\s*)?\d{1,3}(?:[\s.]\d{3})+(?:[.,]\d{1,2})?\s*(?:-|до)?\s*\d{0,3}(?:[\s.]\d{3})?(?:[.,]\d{1,2})?\s*(?:₽|руб\.?|р\.?)?/giu,
				" ",
			)
			.replace(
				/\b\d{3,7}(?:[.,]\d{1,2})?\s*(?:₽|руб\.?|р\.?)(?![А-Яа-яЁёA-Za-z])/giu,
				" ",
			)
			.replace(/[;|]+$/g, ""),
	);
}

/** PARENT blob asNumberOrNull: verbatim from 2a914a78d^:analyzer.ts:733-737. */
function asNumberOrNullParent(value: unknown): number | null {
	if (value === null || value === undefined || value === "") return null;
	const number = Number(value);
	return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

const LINES = [
	"Лечение кариеса 1500,50 руб",
	"Пломба композитная 2300,25 руб",
	"Отбеливание 12000-18000 руб",
	"Отбеливание 12000-18000 ₽",
	"Отбеливание от 12000 до 18000 руб",
	"Консультация 500-700 р.",
	"Коронка E-max 1500-2000 руб за единицу",
	"Кабинет 305-310 осмотр 1200 руб",
	"Анестезия аппликационная 200-500 руб",
	"Штифт стекловолоконный 1500-2000 мкм",
	"Гарантия на пломбу 100-200 дней 900 руб",
	"Файл ProTaper размер 021-025 стерильный 450 руб",
	"Имплантация Osstem акция 2024-2026 45000 руб",
	"Скайс на зуб 1200 руб",
	"Оборот 12000-18000",
	"Снимок прицельный 350 р.",
	"Чистка 300,01 руб",
	"Чистка полировка 300,05 руб",
	"Чистка фторирование 300,07 руб",
];

console.log(
	"=== 1. TITLE: PARENT regex chain vs HEAD real analyzePricelist ===",
);
const req: DentalPricelistAnalysisRequest = {
	sourceName: "bb1-reviewer3",
	sourceKind: "text",
	rawText: LINES.join("\n"),
	preferredSpecialty: "universal",
	useServerAi: false,
};

const res = await analyzePricelist(req, CATALOG);
const byLine = new Map<number, (typeof res.items)[number]>();
for (const it of res.items) byLine.set(it.sourceLine, it);

LINES.forEach((line, i) => {
	const head = byLine.get(i + 1);
	const parentTitle = stripParent(normalizeText(line));
	const headTitle = head ? head.title : "<<ITEM DROPPED>>";
	const flag = parentTitle === headTitle ? "same" : "DIFF";
	console.log(
		`[${flag}] src=${JSON.stringify(line)}\n        parentTitle=${JSON.stringify(parentTitle)}\n        headTitle  =${JSON.stringify(headTitle)}\n        headPrice=${head ? head.priceRub : "-"} max=${head ? head.priceMaxRub : "-"} dur=${head ? head.durationMinutes : "-"}`,
	);
});

console.log("\n=== 2. SUMMARY (average, kopeck path) ===");
for (const s of res.summary) {
	console.log(
		`${s.category}/${s.specialty} count=${s.count} priced=${s.pricedCount} min=${s.minPriceRub} max=${s.maxPriceRub} avg=${s.averagePriceRub}`,
	);
}

console.log("\n=== 3. PARENT asNumberOrNull EXECUTED (the defect) ===");
for (const v of [
	1500.5,
	"1500,50",
	"1500.50",
	18000.25,
	12000.1,
	0,
	99999,
	45.7,
	-30,
	600,
] as unknown[]) {
	console.log(
		`  parent(${JSON.stringify(v)}) = ${JSON.stringify(asNumberOrNullParent(v))}`,
	);
}
for (const v of [false, [], {}, "бесплатно", null] as unknown[]) {
	console.log(
		`  parent(${JSON.stringify(v)}) = ${JSON.stringify(asNumberOrNullParent(v))}   <-- fabricated zero?`,
	);
}

console.log("\n=== 4. HEAD itemFromGroq on the SAME inputs (post-fix) ===");
const aiReq: DentalPricelistAnalysisRequest = {
	...req,
	rawText: "Лечение кариеса",
	useServerAi: true,
};
for (const rec of [
	{ priceRub: 1500.5 },
	{ priceRub: "1500,50" },
	{ priceRub: 1500.505 },
	{ priceRub: "1500.505" },
	{ priceRub: false },
	{ priceRub: 0 },
	{ priceRub: 1500.5, durationMinutes: 45.7 },
	{ priceRub: 1500.5, durationMinutes: 0 },
	{ durationMinutes: 99999 },
	{ priceRub: 18000, priceMaxRub: 12000 },
	{ priceMaxRub: 18000 },
]) {
	const it = itemFromGroq(
		{ sourceText: "Лечение кариеса", ...rec },
		0,
		aiReq,
		CATALOG,
	);
	console.log(
		`  ${JSON.stringify(rec)} -> id=${it?.id} price=${it?.priceRub} max=${it?.priceMaxRub} dur=${it?.durationMinutes}`,
	);
}

console.log(
	"\n=== 5. AVERAGE FORMULA: parent float vs HEAD kopecks, disagreement sweep ===",
);
const { parseKopecks, sumKopecks, kopecksToNumericString } = await import(
	"@dental/shared"
);
const parentAvg = (p: number[]) =>
	Math.round((p.reduce((s, x) => s + x, 0) / p.length) * 100) / 100;
const headAvg = (p: number[]) =>
	Number(
		kopecksToNumericString(
			Math.round(sumKopecks(p.map((x) => parseKopecks(x))) / p.length),
		),
	);
let diffs = 0;
let checked = 0;
const shown: string[] = [];
for (let seed = 1; seed <= 200000; seed++) {
	const n = 2 + (seed % 4);
	const prices: number[] = [];
	for (let k = 0; k < n; k++) {
		const r = 300 + ((seed * 7919 + k * 131) % 1_900_000);
		const kop = (seed * 37 + k * 53) % 100;
		prices.push(Number(`${r}.${String(kop).padStart(2, "0")}`));
	}
	checked++;
	const a = parentAvg(prices);
	const b = headAvg(prices);
	if (a !== b) {
		diffs++;
		if (shown.length < 6)
			shown.push(
				`prices=${JSON.stringify(prices)} parent=${a} head=${b} delta=${(b - a).toFixed(4)}`,
			);
	}
}
console.log(`  checked=${checked} disagreements=${diffs}`);
for (const s of shown) console.log(`   ${s}`);
console.log(
	`  headline example [300.01,300.05,300.07]: parent=${parentAvg([300.01, 300.05, 300.07])} head=${headAvg([300.01, 300.05, 300.07])}`,
);
