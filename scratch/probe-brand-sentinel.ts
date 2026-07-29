/*
 * Зонд: служебное слово вместо бренда не доезжает до экрана, настоящий бренд доезжает,
 * а находка детерминированного разбора не обнуляется незнанием модели.
 *
 * Обе стороны обязательны: бренды законно латиницей, и «починка», прячущая
 * «Straumann», была бы хуже самого дефекта.
 */
import { itemFromGroq } from "../apps/api/src/pricelist/analyzer.js";

const request = {
	sourceName: "probe", sourceKind: "text", rawText: "x",
	imageMimeType: undefined, preferredSpecialty: "universal", useServerAi: true,
} as never;

console.log("=== строка БЕЗ бренда: заглушка обязана дать null ===");
for (const brand of ["unknown", "UNKNOWN", "n/a", "-", "none", "", "Straumann", "Filtek Z550", null]) {
	const item = itemFromGroq(
		{ sourceText: "Коронка на импланте 25000 руб", title: "Коронка на импланте", priceRub: 25000, brand },
		0, request, [],
	);
	console.log(`  ${JSON.stringify(brand).padEnd(16)} → ${JSON.stringify(item?.brand ?? null)}`);
}

console.log("=== строка С брендом: заглушка обязана уступить находке разбора ===");
for (const brand of ["unknown", "n/a", null, "Nobel"]) {
	const item = itemFromGroq(
		{ sourceText: "Имплантация Straumann BLX 85000 руб", title: "Имплантация Straumann BLX", priceRub: 85000, brand },
		0, request, [],
	);
	console.log(`  ${JSON.stringify(brand).padEnd(16)} → ${JSON.stringify(item?.brand ?? null)}`);
}
