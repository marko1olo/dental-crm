/*
 * Зонд: отказ от года не выключается дробной частью, а законная копеечная цена не теряется.
 *
 * Дыра была в том, что looksLikeYear сверяется с /^(?:19|20)\d{2}$/, а
 * String(2025.5) этому образцу не подходит никогда — одна десятая копейки
 * отключала всю проверку года.
 */
import { itemFromGroq } from "../apps/api/src/pricelist/analyzer.js";

const request = {
	sourceName: "probe", sourceKind: "text", rawText: "x",
	imageMimeType: undefined, preferredSpecialty: "universal", useServerAi: true,
} as never;

const CASES: Array<[string, number]> = [
	["Отбеливание 2025", 2025],
	["Отбеливание 2025", 2025.5],
	["Отбеливание 2025", 2025.01],
	["Отбеливание 2025", 2025.0],
	["Прайс-лист 2025", 2025.5],
	["Консультация 2025 руб", 2025.5],
	["Консультация 2025,50 руб", 2025.5],
	["Лечение кариеса 1500,50", 1500.5],
];

for (const [sourceText, priceRub] of CASES) {
	const item = itemFromGroq({ sourceText, title: sourceText, priceRub }, 0, request, []);
	console.log(`${sourceText.padEnd(26)} модель ${String(priceRub).padEnd(9)} → ${JSON.stringify(item?.priceRub ?? null)}`);
}
