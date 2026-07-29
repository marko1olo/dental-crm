/*
 * Зонд: становится ли четырёхзначный год ценой услуги.
 *
 * Поставлен по находке ревьюера пакета MM1 и перепроверен ведущим независимо.
 * Опасность не в самой строке, а в том, что выдуманная цена уходит из прайса в
 * план лечения и в документ, который подписывает пациент, БЕЗ предупреждения:
 * price_not_found не ставится, потому что цена формально прочитана.
 *
 * Звать разборщик только полным запросом, иначе ZodError на каждой строке:
 * preferredSpecialty объявлен .default("universal") в контракте и прямой вызов
 * значения по умолчанию из схемы обходит.
 */
import { analyzePricelist } from "../apps/api/src/pricelist/analyzer.js";

const LINES = [
	"Прайс-лист 2025",
	"Прайс 2025 в рублях",
	"Прайс-лист действителен с 01.01.2025",
	"Редакция 2024",
	"Лицензия 5678/2024 стоматология",
	"Отбеливание 2025",
	"Гарантия 2025 дней",
];

for (const line of LINES) {
	const response = await analyzePricelist(
		{
			sourceName: "probe-year",
			sourceKind: "text",
			rawText: line,
			imageMimeType: undefined,
			preferredSpecialty: "universal",
			useServerAi: false,
		} as never,
		[],
	);
	const item = response.items[0];
	console.log(
		JSON.stringify({
			line,
			items: response.items.length,
			title: item?.title ?? null,
			price: item?.priceRub ?? null,
			itemWarnings: item?.warnings ?? [],
			responseWarnings: response.warnings,
		}),
	);
}
