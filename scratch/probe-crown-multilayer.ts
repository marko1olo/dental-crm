/*
 * Зонд: «мульти» не назначает материал сам, а настоящий многослойный цирконий не теряется.
 * Обе стороны обязательны: заявка о материале уезжает в документ, который подписывает пациент.
 */
import { analyzePricelist } from "../apps/api/src/pricelist/analyzer.js";

const LINES = [
	"Коронка на мультиюнит абатменте 30000 руб",
	"Коронка мультислойная циркониевая 25000 руб",
	"Коронка циркониевая multilayer 25000 руб",
	"Коронка циркониевая 22000 руб",
	"Коронка металлокерамическая 15000 руб",
	"Коронка multilayer 25000 руб",
	"Коронка e.max 30000 руб",
];

for (const line of LINES) {
	const response = await analyzePricelist(
		{ sourceName: "probe", sourceKind: "text", rawText: line, imageMimeType: undefined, preferredSpecialty: "universal", useServerAi: false } as never,
		[],
	);
	const item = response.items[0];
	console.log(`${line.padEnd(44)} материал ${String(item?.materialKind).padEnd(16)} тип ${JSON.stringify(item?.crownType ?? null)}`);
}
