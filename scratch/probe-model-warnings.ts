/*
 * Зонд: предупреждение, выдуманное моделью, не доезжает до экрана английским.
 *
 * itemFromGroq экспортирован именно для такой проверки: ветка Groq в этом
 * окружении не исполняется (ключа нет, платный вызов запрещён), поэтому честное
 * доказательство — вызвать разбор записи модели напрямую.
 */
import { itemFromGroq } from "../apps/api/src/pricelist/analyzer.js";

const request = {
	sourceName: "probe",
	sourceKind: "text",
	rawText: "Коронка циркониевая 25000 руб",
	imageMimeType: undefined,
	preferredSpecialty: "universal",
	useServerAi: true,
} as never;

const cases: Array<{ label: string; warnings: unknown }> = [
	{ label: "выдумка модели", warnings: ["price_ambiguous", "two_prices_in_one_row"] },
	{ label: "выдумка + известное", warnings: ["totally_made_up", "price_not_found"] },
	{ label: "только известные", warnings: ["price_not_found", "category_uncertain"] },
	{ label: "не массив", warnings: "price_ambiguous" },
];

for (const testCase of cases) {
	const item = itemFromGroq(
		{ sourceText: "Коронка циркониевая 25000 руб", title: "Коронка циркониевая", priceRub: 25000, warnings: testCase.warnings },
		0,
		request,
		[],
	);
	console.log(`${testCase.label.padEnd(22)} → ${JSON.stringify(item?.warnings ?? null)}`);
}
