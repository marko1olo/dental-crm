import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type {
	DentalPricelistAnalysisRequest,
	ServiceCatalogItem,
} from "@dental/shared";
import { itemFromGroq } from "./analyzer.js";

/**
 * Копейки и счётные значения в НЕЙРО-ветке разбора прайса.
 *
 * ЧТО БЫЛО СЛОМАНО. Детерминированный разбор научили копейкам, а второй режим —
 * тот, который продукт продаёт как «серверную нейро-проверку» — продолжал их
 * уничтожать. Одна функция asNumberOrNull с `Math.round` обслуживала и деньги
 * (priceRub, priceMaxRub), и счёт (durationMinutes): цена 1500,50 из ответа
 * модели становилась 1501, и НИ ОДНА проверка не возражала, потому что целое
 * число тривиально точно до копейки и расширенный контракт его пропускал.
 * Клиника получала прайс, отличающийся от присланного, без ошибки на экране.
 *
 * ЧЕСТНО О ПРЕДЕЛЕ. Ветка Groq целиком в этом окружении не исполняется: ключа
 * провайдера нет, а платный вызов запрещён. Поэтому проверяется не HTTP-путь, а
 * itemFromGroq — функция, в которую ветка передаёт каждую запись ответа модели
 * (analyzer.ts, callGroqPricelist). Запись здесь поддельная, а разбор —
 * настоящий, тот же самый код. Сквозной путь POST /api/pricelist/analyze с
 * useServerAi: true остаётся НЕ ПРОВЕРЕННЫМ.
 */

/** Каталог не нужен: проверяется чтение чисел, а не сопоставление с услугой. */
const EMPTY_CATALOG: ServiceCatalogItem[] = [];

/** Запрос того же вида, что приходит на POST /api/pricelist/analyze. */
const AI_REQUEST: DentalPricelistAnalysisRequest = {
	sourceName: "groq-kopecks-test",
	sourceKind: "text",
	rawText: "Лечение кариеса",
	imageMimeType: "image/jpeg",
	preferredSpecialty: "universal",
	useServerAi: true,
};

/**
 * Строка источника БЕЗ цифр выбрана намеренно: детерминированный откат по ней
 * даёт priceRub: null и durationMinutes: null, поэтому любое ненулевое значение
 * в проверке пришло именно из разобранной записи модели, а не из отката.
 */
const SOURCE_TEXT_WITHOUT_DIGITS = "Лечение кариеса";

function parseGroqRecord(record: Record<string, unknown>) {
	const item = itemFromGroq(
		{ sourceText: SOURCE_TEXT_WITHOUT_DIGITS, ...record },
		0,
		AI_REQUEST,
		EMPTY_CATALOG,
	);
	assert.ok(item, "запись модели должна разобраться в позицию прайса");
	return item;
}

/**
 * Позиция, разобранная из ответа модели, имеет id «price-ai-N». Позиция,
 * которую контракт отверг и заменил детерминированным откатом, — «price-N».
 * Это единственный внешний признак того, что разбор записи МОДЕЛИ уцелел.
 */
const AI_ITEM_ID = "price-ai-1";
const FALLBACK_ITEM_ID = "price-1";

describe("нейро-разбор прайса сохраняет копейки", () => {
	test("1500,50 остаётся 1500,50, а не превращается в 1501", () => {
		const item = parseGroqRecord({ priceRub: 1500.5 });
		assert.equal(item.priceRub, 1500.5);
		assert.equal(item.id, AI_ITEM_ID);
	});

	test("копейки верхней границы диапазона тоже уцелели", () => {
		const item = parseGroqRecord({ priceRub: 12000.1, priceMaxRub: 18000.25 });
		assert.equal(item.priceRub, 12000.1);
		assert.equal(item.priceMaxRub, 18000.25);
	});

	test("цена строкой — «1500,50» и «1500.50» — читается, а не теряется", () => {
		// JSON языковой модели регулярно приносит число строкой. Раньше
		// Number("1500,50") давал NaN, и цена исчезала целиком.
		assert.equal(parseGroqRecord({ priceRub: "1500,50" }).priceRub, 1500.5);
		assert.equal(parseGroqRecord({ priceRub: "1500.50" }).priceRub, 1500.5);
	});

	test("целая цена остаётся целой, дробной части не появляется", () => {
		assert.equal(parseGroqRecord({ priceRub: 12500 }).priceRub, 12500);
	});
});

describe("выдуманный ноль вместо неизвестной цены не появляется", () => {
	test("логическое значение вместо цены не становится услугой за 0 ₽", () => {
		// Number(false) === 0 и Number([]) === 0. Раньше запись с таким полем
		// давала цену 0 ₽ — выдуманное значение вместо неизвестного.
		for (const junk of [false, [], {}, "бесплатно", null]) {
			const item = parseGroqRecord({ priceRub: junk });
			assert.notEqual(
				item.priceRub,
				0,
				`значение ${JSON.stringify(junk)} стало ценой 0 ₽`,
			);
			assert.equal(
				item.priceRub,
				null,
				`значение ${JSON.stringify(junk)} должно остаться неизвестным`,
			);
		}
	});

	test("ноль из модели — это не названная цена, а не услуга за 0 ₽", () => {
		// Промпт (groqSystemPrompt) требует «If a price is absent, use null».
		// Ноль означает, что инструкцию проигнорировали, и цена неизвестна.
		assert.equal(parseGroqRecord({ priceRub: 0 }).priceRub, null);
	});
});

describe("длительность приёма осталась целым числом минут", () => {
	test("дробная длительность округляется до минуты и не роняет позицию", () => {
		/*
		 * ЭТО ПРОВЕРКА РАЗДЕЛЕНИЯ ЧИТАТЕЛЕЙ, а не арифметики. Если кто-то
		 * «починит» копейки, просто убрав округление из общего читателя,
		 * durationMinutes станет 45.7, контракт (`z.number().int().positive()`)
		 * отвергнет позицию целиком, и разбор модели молча заменится
		 * детерминированным откатом. Поймает это именно проверка id.
		 */
		const item = parseGroqRecord({ priceRub: 1500.5, durationMinutes: 45.7 });
		assert.equal(item.durationMinutes, 46);
		assert.ok(
			Number.isInteger(item.durationMinutes),
			"длительность обязана быть целой",
		);
		assert.equal(item.id, AI_ITEM_ID);
		assert.equal(item.priceRub, 1500.5);
	});

	test("нулевая длительность больше не уничтожает всю позицию", () => {
		// Раньше 0 доезжал до контракта, где объявлено positive(), safeParse
		// падал, и вся разобранная моделью позиция выбрасывалась в откат.
		const item = parseGroqRecord({ priceRub: 1500.5, durationMinutes: 0 });
		assert.equal(item.id, AI_ITEM_ID);
		assert.equal(item.durationMinutes, null);
		assert.equal(item.priceRub, 1500.5);
	});

	test("длительность вне разумных границ отбрасывается, а не принимается", () => {
		// 99999 минут — это 69 суток приёма. Детерминированный разбор такое
		// значение не пропускал, нейро-ветка не проверяла границу вовсе.
		assert.equal(
			parseGroqRecord({ durationMinutes: 99999 }).durationMinutes,
			null,
		);
		assert.equal(
			parseGroqRecord({ durationMinutes: -30 }).durationMinutes,
			null,
		);
		assert.equal(
			parseGroqRecord({ durationMinutes: 600 }).durationMinutes,
			600,
		);
	});
});

describe("диапазон цены не выворачивается наизнанку", () => {
	test("убывающая пара сортируется, а не схлопывается в бо́льшую цену", () => {
		/*
		 * ЗАФИКСИРОВАННОЕ ЗДЕСЬ ПОВЕДЕНИЕ ИЗМЕНЕНО ОСОЗНАННО, а не подогнано под
		 * код. Прежняя проверка требовала priceRub 18000 и priceMaxRub null, то
		 * есть схлопывания пары в бо́льшее из двух чисел. Безопасным такой исход не
		 * был — он был ДОРОЖЕ для пациента: модель, прочитавшая «Консультация
		 * 1000/500» как priceRub 1000 и priceMaxRub 500, ставила в каталог
		 * консультацию за 1000 ₽, а 500 ₽ исчезали из прайса совсем.
		 *
		 * Детерминированный разбор от этого правила уже отказался — см.
		 * pricelistKopecks.test.ts, «пара цен не схлопывается в бо́льшую». Две
		 * ветки разбора одного и того же прайса не могут давать разные цены, а
		 * ветка модели вызывается на тех же строках.
		 */
		const item = parseGroqRecord({ priceRub: 18000, priceMaxRub: 12000 });
		assert.equal(item.priceRub, 12000, "ценой осталась бо́льшая из двух границ");
		assert.equal(item.priceMaxRub, 18000, "вторая граница пары потеряна");
	});

	test("равные границы диапазоном остаются", () => {
		const item = parseGroqRecord({ priceRub: 12000.5, priceMaxRub: 12000.5 });
		assert.equal(item.priceMaxRub, 12000.5);
	});
});

describe("запись, которую разобрать нечем, не выдаёт себя за разбор", () => {
	test("запись без текста источника не превращается в позицию прайса", () => {
		assert.equal(
			itemFromGroq({ priceRub: 1500.5 }, 0, AI_REQUEST, EMPTY_CATALOG),
			null,
		);
		assert.equal(itemFromGroq(null, 0, AI_REQUEST, EMPTY_CATALOG), null);
		assert.equal(
			itemFromGroq("Лечение кариеса 1500,50", 0, AI_REQUEST, EMPTY_CATALOG),
			null,
		);
	});

	test("откат помечен своим id, и его ни с чем не спутать", () => {
		// Строка настолько короткая, что контракт отвергает позицию модели
		// (title_too_short не мешает, но пустое название — мешает).
		const item = itemFromGroq(
			{
				sourceText: SOURCE_TEXT_WITHOUT_DIGITS,
				category: "не существует такой категории",
			},
			0,
			AI_REQUEST,
			EMPTY_CATALOG,
		);
		assert.ok(item);
		assert.equal(item.id, FALLBACK_ITEM_ID);
	});
});
