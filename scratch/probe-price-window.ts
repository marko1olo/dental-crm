/**
 * ЗОНД ВЕДУЩЕГО, ТОЛЬКО ЧТЕНИЕ. Ничего не пишет, ничего не правит.
 *
 * Вопрос: окно правдоподобия цены в parseMoney (300 … 2 000 000 ₽,
 * apps/api/src/pricelist/analyzer.ts:392) отбрасывает законные строки русского
 * стоматологического прайса, и если да — видит ли клиника предупреждение или
 * цена исчезает молча.
 *
 * Прямой вызов parseMoney невозможен: функция не экспортирована. Поэтому зонд
 * идёт через analyzePricelist ровно тем же способом, что и тесты в
 * pricelist/pricelistLastNumber.test.ts — включая preferredSpecialty, отсутствие
 * которого один раз уже дало мне ложный ZodError на каждой строке.
 */
import type { ServiceCatalogItem } from "@dental/shared";
import { analyzePricelist } from "../apps/api/src/pricelist/analyzer.js";

const EMPTY_CATALOG: ServiceCatalogItem[] = [];

const LINES = [
	// ── ниже нижней границы 300 ₽: всё это есть в настоящих прайсах ──
	"Аппликационная анестезия 150",
	"Аппликационная анестезия 150 руб",
	"Снимок прицельный 250 руб",
	"Фторлак 200 руб",
	"Полировка одного зуба 290 руб",
	// ── ровно на границе ──
	"Консультация 300 руб",
	"Консультация 299 руб",
	// ── внутри окна, контроль ──
	"Лечение кариеса 3500 руб",
	// ── выше верхней границы 2 000 000 ₽ ──
	"Полная реабилитация обеих челюстей 2 500 000 руб",
	"All-on-6 обе челюсти цирконий 3 000 000 руб",
	// ── ровно на верхней границе ──
	"Полная реабилитация 2 000 000 руб",
	"Полная реабилитация 2 000 001 руб",
];

for (const line of LINES) {
	const response = await analyzePricelist(
		{
			sourceName: "lead-price-window-probe",
			sourceKind: "text",
			rawText: line,
			imageMimeType: "image/jpeg",
			preferredSpecialty: "universal",
			useServerAi: false,
		},
		EMPTY_CATALOG,
	);
	const item = response.items[0];
	const warnings = [
		...(response.warnings ?? []),
		...(((item as unknown as { warnings?: string[] })?.warnings) ?? []),
	];
	console.log(
		JSON.stringify({
			line,
			items: response.items.length,
			price: item ? (item.priceRub ?? null) : "НЕТ ПОЗИЦИИ",
			title: item?.name ?? null,
			warnings,
		}),
	);
}
