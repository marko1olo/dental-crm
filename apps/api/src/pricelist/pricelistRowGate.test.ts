import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ServiceCatalogItem } from "@dental/shared";
import { analyzePricelist } from "./analyzer.js";

/**
 * УСЛУГА ИЗ ПРАЙСА НЕ ИСЧЕЗАЕТ МОЛЧА.
 *
 * ЧТО БЫЛО СЛОМАНО. Гейт строк прайса оставлял позицию, только если прочитана
 * ЦЕНА ИЛИ опознана КАТЕГОРИЯ; при двух неизвестных строка УДАЛЯЛАСЬ, и
 * предупреждения об удалении не было ни одного. Измерено на дереве до правки
 * (зонд scratch/probe-row-gate.ts, код выхода 0):
 *   «Полировка одного зуба 290 руб»                    → 0 позиций
 *   «Полная реабилитация обеих челюстей 2 500 000 руб» → 0 позиций
 *   «Полная реабилитация 2 000 001 руб»                → 0 позиций
 *   «Полная реабилитация 2 000 000 руб»                → позиция, 2 000 000 ₽
 * Один рубль сверх потолка parseMoney удалял услугу из прайса, один рубль ниже —
 * оставлял. «Фторлак 200 руб» при той же отвергнутой цене выживал только из-за
 * правила /фтор/ в categoryRules, а слов «полировка» и «реабилитация» там нет:
 * жить строке или нет, решал конечный список ключевых слов.
 *
 * Хуже удаления была его НЕВИДИМОСТЬ. На тексте из четырёх строк — служебная
 * дата, адрес, «Коронка 12 500 руб», «Цены указаны в рублях» — приходила одна
 * позиция и warnings: [], то есть три выброшенные строки не оставляли следа.
 * Клиника загружает прайс и не узнаёт, что услуги в нём нет; отказ от ЦЕНЫ она
 * видит (price_not_found), а отказ от ПОЗИЦИИ не видела никак.
 *
 * ЧЕМ ЗАМЕНЕНО, и почему гейт не снят целиком: в присланном тексте действительно
 * стоят адрес, телефон и дата редакции, и услугой они не являются. Три правила
 * вместо одного:
 *   1. знак рубля рядом с числом снимает гейт — цену написал человек, и позиция
 *      остаётся с предупреждением price_not_found, как у «All-on-6»;
 *   2. отброшенные строки считаются, и число уходит в warnings ответа;
 *   3. no_pricelist_rows_detected значит «ни одной строки не пришло», а не «все
 *      отброшены» — раньше эти два события были неразличимы.
 *
 * Границы окна цены 300…2 000 000 ₽ здесь НЕ проверяются и не закрепляются:
 * позиция обязана существовать при любом решении parseMoney, поэтому цена
 * сверяется только с предупреждением, а не с числом.
 */

/** Каталог не нужен: проверяется гейт строк, а не сопоставление с услугой. */
const EMPTY_CATALOG: ServiceCatalogItem[] = [];

const SKIPPED_PREFIX = "pricelist_rows_skipped:";

async function analyze(rawText: string) {
	return analyzePricelist(
		{
			sourceName: "row-gate-test",
			sourceKind: "text",
			rawText,
			imageMimeType: "image/jpeg",
			preferredSpecialty: "universal",
			useServerAi: false,
		},
		EMPTY_CATALOG,
	);
}

/** Сколько строк отброшено по предупреждению ответа; null — предупреждения нет. */
function skippedRows(warnings: string[]): number | null {
	const warning = warnings.find((value) => value.startsWith(SKIPPED_PREFIX));
	return warning === undefined
		? null
		: Number(warning.slice(SKIPPED_PREFIX.length));
}

describe("строка со знаком рубля из прайса не исчезает", () => {
	test("позиция остаётся, даже когда цена не прочитана", async () => {
		for (const line of [
			// Ниже нижней границы цены.
			"Полировка одного зуба 290 руб",
			// Выше потолка цены — обе строки, и «дорогая», и на рубль за потолком.
			"Полная реабилитация обеих челюстей 2 500 000 руб",
			"Полная реабилитация 2 000 001 руб",
		]) {
			const response = await analyze(line);
			assert.equal(
				response.items.length,
				1,
				`позиция исчезла из прайса целиком («${line}»)`,
			);
			const item = response.items[0];
			assert.ok(item, `позиции нет («${line}»)`);
			assert.ok(item.title.length > 0, `название пустое («${line}»)`);
			assert.equal(item.sourceLine, 1, `потерян номер строки («${line}»)`);
			// Цена может быть любой — важно, что отказ от неё ВИДЕН, а не проглочен
			// вместе со строкой.
			if (item.priceRub === null) {
				assert.ok(
					item.warnings.includes("price_not_found"),
					`отказ от цены не показан клинике («${line}»)`,
				);
			}
			assert.equal(
				skippedRows(response.warnings),
				null,
				`законная услуга посчитана отброшенной («${line}»)`,
			);
			assert.ok(
				!response.warnings.includes("no_pricelist_rows_detected"),
				`услуга есть, а прайс объявлен пустым («${line}»)`,
			);
		}
	});

	test("название услуги не теряет написанную цену", async () => {
		// Цена ценой не признана, значит и вырезать её из названия не за что:
		// врач видит название в каталоге, пациент — в подписываемом документе.
		const response = await analyze("Полировка одного зуба 290 руб");
		const item = response.items[0];
		assert.ok(item, "позиция исчезла");
		assert.ok(
			item.title.includes("290"),
			`из названия ушло число, ценой не ставшее: «${item.title}»`,
		);
		assert.ok(
			item.title.includes("Полировка"),
			`порвано название услуги: «${item.title}»`,
		);
	});

	test("рубль сверх потолка цены не решает, есть ли позиция", async () => {
		// Немонотонность гейта: 2 000 000 давало позицию, 2 000 001 — ничего.
		const under = await analyze("Полная реабилитация 2 000 000 руб");
		const over = await analyze("Полная реабилитация 2 000 001 руб");
		assert.equal(
			over.items.length,
			under.items.length,
			"один рубль разницы всё ещё удаляет услугу из прайса",
		);
	});
});

describe("отброшенная строка прайса считается", () => {
	test("служебная строка услугой не становится, но её отбрасывание видно", async () => {
		for (const line of [
			"Прайс-лист действителен с 01.01.2025",
			"г. Москва, ул. Ленина, д. 5",
			"Цены указаны в рублях",
		]) {
			const response = await analyze(line);
			assert.equal(
				response.items.length,
				0,
				`служебная строка стала услугой прайса («${line}»)`,
			);
			assert.equal(
				skippedRows(response.warnings),
				1,
				`отбрасывание строки не посчитано («${line}»): ${JSON.stringify(response.warnings)}`,
			);
		}
	});

	test("счётчик считает все отброшенные строки, а не первую", async () => {
		const response = await analyze(
			[
				"Прайс-лист действителен с 01.01.2025",
				"г. Москва, ул. Ленина, д. 5",
				"Коронка 12 500 руб",
				"Цены указаны в рублях",
			].join("\n"),
		);
		assert.equal(response.items.length, 1, "гейт пропустил служебные строки");
		assert.equal(
			skippedRows(response.warnings),
			3,
			`три строки исчезли из прайса молча: ${JSON.stringify(response.warnings)}`,
		);
	});

	test("на прайсе без отброшенных строк предупреждения нет", async () => {
		const response = await analyze(
			["Коронка 12 500 руб", "Лечение кариеса 1500,50"].join("\n"),
		);
		assert.equal(response.items.length, 2, "потеряна законная услуга");
		assert.equal(
			skippedRows(response.warnings),
			null,
			`выдумано отбрасывание строк: ${JSON.stringify(response.warnings)}`,
		);
	});
});

describe("пустой прайс и отброшенный прайс различимы", () => {
	test("строк не пришло вовсе — no_pricelist_rows_detected", async () => {
		// Одни заголовки колонок: splitPricelistLines их отбрасывает ещё до гейта,
		// то есть строк прайса не приходит ни одной.
		const response = await analyze("Наименование ; Цена\nУслуга ; Стоимость");
		assert.equal(response.items.length, 0, "заголовок стал услугой");
		assert.ok(
			response.warnings.includes("no_pricelist_rows_detected"),
			`пустой прайс не назван пустым: ${JSON.stringify(response.warnings)}`,
		);
		assert.equal(
			skippedRows(response.warnings),
			null,
			"выдумано отбрасывание строк, которых не было",
		);
	});

	test("строки пришли и все отброшены — это НЕ пустой прайс", async () => {
		const response = await analyze(
			[
				"Прайс-лист действителен с 01.01.2025",
				"г. Москва, ул. Ленина, д. 5",
			].join("\n"),
		);
		assert.equal(response.items.length, 0, "служебные строки стали услугами");
		assert.equal(
			skippedRows(response.warnings),
			2,
			`отброшенные строки не посчитаны: ${JSON.stringify(response.warnings)}`,
		);
		assert.ok(
			!response.warnings.includes("no_pricelist_rows_detected"),
			"два разных события снова дают одно предупреждение",
		);
	});
});

describe("снятие гейта знаком рубля не заводит услуги из мусора", () => {
	test("контактная строка услугой не становится", async () => {
		// Телефон гасится ещё в сканере цены, знака рубля в строке нет — позиции
		// быть не должно, иначе телефон клиники попадёт в каталог услуг.
		for (const line of ["Тел 8 999 123 45 67", "Запись 8 (999) 123-45-67"]) {
			const response = await analyze(line);
			assert.equal(
				response.items.length,
				0,
				`контактная строка стала услугой («${line}»)`,
			);
		}
	});

	test("знак рубля обязан стоять вплотную к числу", async () => {
		/*
		 * Между числом и знаком рубля стоит слово — подписью «это цена» такой знак
		 * не является, и служебная строка услугой не становится.
		 *
		 * ЧИСЛО ЗДЕСЬ ЗАВЕДОМО НЕ ЦЕНА (за потолком parseMoney) УМЫШЛЕННО: иначе
		 * проверялся бы не гейт. Измерено на этой же правке: «Прайс 2025 в рублях»
		 * и «Прайс-лист 2025» дают услугу с ценой 2025 ₽ — четырёхзначный год
		 * читается как деньги, строка выживает по ПРОЧИТАННОЙ ЦЕНЕ, и к знаку рубля
		 * это отношения не имеет. Тот дефект живёт в extractPrice (looksLikeYear
		 * применяется только к верхней границе пары «5678/2024») и этой правкой не
		 * закрыт.
		 */
		const response = await analyze("Прайс 2 000 001 в рублях");
		assert.equal(
			response.items.length,
			0,
			"служебная строка признана услугой по далёкому знаку рубля",
		);
	});

	test("знак рубля считается подписью во всех написаниях", async () => {
		// «руб», «рублей», «₽» — одна и та же подпись человека. Проверка отдельная
		// от currencyPattern, который запрещает букву справа и «рублей» не знает.
		for (const line of [
			"Полировка одного зуба 290 руб",
			"Полировка одного зуба 290 рублей",
			"Полировка одного зуба 290 ₽",
		]) {
			const response = await analyze(line);
			assert.equal(
				response.items.length,
				1,
				`знак рубля не признан подписью («${line}»)`,
			);
		}
	});
});
