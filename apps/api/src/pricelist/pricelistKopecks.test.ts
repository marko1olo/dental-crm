import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { ServiceCatalogItem } from "@dental/shared";
import { analyzePricelist } from "./analyzer.js";

/**
 * Копейки в разборе прайса.
 *
 * ЧТО БЫЛО СЛОМАНО. Контракт (packages/shared/src/index.ts) принимает копейки в
 * priceRub, minPriceRub, maxPriceRub и averagePriceRub, но получить дробное
 * значение было НЕВОЗМОЖНО ни при каком прайсе: регулярка в extractPrice
 * останавливалась на запятой, а parseMoney выбрасывал из строки всё, кроме
 * цифр, и округлял результат до рубля. Клиника вставляла «Лечение кариеса
 * 1500,50» и получала услугу за 1500 ₽ — без ошибки, без предупреждения.
 * Расширенное поле в контракте при таком разборе — фасад: тип позволяет
 * копейки, а код их уничтожает раньше, чем они дойдут до проверки.
 *
 * Разбор идёт через analyzePricelist с useServerAi: false — детерминированная
 * ветка, без обращения к внешнему провайдеру. Внутри она сама прогоняет ответ
 * через dentalPricelistAnalysisResponseSchema.parse(), поэтому успешный вызов
 * заодно доказывает, что результат проходит контракт: значение с тремя знаками
 * после запятой уронило бы этот вызов.
 */

/** Каталог не нужен: проверяется разбор цены, а не сопоставление с услугой. */
const EMPTY_CATALOG: ServiceCatalogItem[] = [];

async function parseLines(...lines: readonly string[]) {
	const response = await analyzePricelist(
		{
			sourceName: "kopecks-test",
			sourceKind: "text",
			rawText: lines.join("\n"),
			imageMimeType: "image/jpeg",
			preferredSpecialty: "universal",
			useServerAi: false,
		},
		EMPTY_CATALOG,
	);
	return response;
}

/** Цена одной строки прайса. */
async function priceOf(line: string): Promise<number | null> {
	const response = await parseLines(line);
	const item = response.items[0];
	assert.ok(item, `строка «${line}» не разобралась ни в одну позицию прайса`);
	return item.priceRub;
}

describe("разбор прайса сохраняет копейки", () => {
	test("1500,50 остаётся 1500,50, а не превращается в 1500", async () => {
		assert.equal(await priceOf("Лечение кариеса 1500,50"), 1500.5);
	});

	test("точка как десятичный разделитель тоже читается", async () => {
		assert.equal(await priceOf("Лечение кариеса 1500.50"), 1500.5);
	});

	test("одна цифра после запятой — это десять копеек, а не одна", async () => {
		// «1500,5» в прайсе значит 1500 рублей 50 копеек. Прочитать это как
		// 1500,05 значило бы потерять 45 копеек на каждой такой строке.
		assert.equal(await priceOf("Лечение кариеса 1500,5"), 1500.5);
	});

	test("копейки доезжают до контракта вместе со знаком рубля", async () => {
		assert.equal(await priceOf("Лечение кариеса 1500,50 ₽"), 1500.5);
		assert.equal(await priceOf("Лечение кариеса 1500,50 руб."), 1500.5);
	});
});

describe("разделитель разрядов не путается с копейками", () => {
	/*
	 * Это главный риск правки. Разделитель разрядов и десятичный разделитель в
	 * русском прайсе — один и тот же символ, различаются они ТОЛЬКО числом цифр
	 * после него: ровно три — разряды, одна или две — копейки. Если перепутать,
	 * цена 12.500 станет 12 рублями 50 копейками, то есть ошибкой в тысячу раз.
	 */
	test("точка перед тремя цифрами — это разряды: 12.500 = 12500", async () => {
		assert.equal(await priceOf("Коронка металлокерамика 12.500"), 12500);
	});

	test("пробел перед тремя цифрами — тоже разряды: 12 500 = 12500", async () => {
		assert.equal(await priceOf("Коронка металлокерамика 12 500"), 12500);
	});

	test("разряды и копейки вместе: 12.500,50 = 12500,50", async () => {
		assert.equal(await priceOf("Коронка металлокерамика 12.500,50"), 12500.5);
	});

	test("целая цена остаётся целой, дробной части не появляется", async () => {
		assert.equal(await priceOf("Лечение кариеса 1500"), 1500);
		assert.equal(await priceOf("Коронка 12500 руб."), 12500);
	});
});

describe("сводка по категории сходится с ценами до копейки", () => {
	test("min и max — дословные копии цен, среднее округлено до копейки", async () => {
		const response = await parseLines(
			"Лечение кариеса 1500,50",
			"Пломба композитная 2300,25",
		);

		const prices = response.items
			.map((item) => item.priceRub)
			.filter((price): price is number => price !== null);
		assert.deepEqual(prices.slice().sort((a, b) => a - b), [1500.5, 2300.25]);

		const summary = response.summary.find((entry) => entry.pricedCount === 2);
		assert.ok(summary, "обе цены должны попасть в одну сводку по категории");
		assert.equal(summary.minPriceRub, 1500.5);
		assert.equal(summary.maxPriceRub, 2300.25);

		/*
		 * (1500,50 + 2300,25) / 2 = 1900,375 — три знака после запятой, то есть
		 * значение, которое контракт обязан отвергнуть. Потребитель округляет его
		 * до копейки САМ, и именно поэтому вызов выше не падает.
		 */
		assert.equal(summary.averagePriceRub, 1900.38);
	});

	test("среднее всегда лежит внутри диапазона min..max", async () => {
		// Прежнее округление среднего до РУБЛЯ выбрасывало его за границы
		// диапазона на глазах у пользователя: min 1500,50 · max 1500,50 · среднее 1501.
		const response = await parseLines(
			"Лечение кариеса 1500,50",
			"Лечение кариеса глубокого 1500,50",
		);
		const summary = response.summary.find((entry) => entry.pricedCount === 2);
		assert.ok(summary);
		assert.equal(summary.minPriceRub, 1500.5);
		assert.equal(summary.maxPriceRub, 1500.5);
		assert.equal(summary.averagePriceRub, 1500.5);
	});
});

describe("название услуги не тащит за собой цену", () => {
	test("копеечная цена со знаком рубля вырезается из названия целиком", async () => {
		const response = await parseLines("Лечение кариеса 1500,50 руб.");
		const item = response.items[0];
		assert.ok(item);
		assert.equal(item.priceRub, 1500.5);
		// Ни «1500», ни хвост «,50» не должны остаться в названии: врач видит это
		// название в каталоге услуг.
		assert.ok(
			!/\d/.test(item.title),
			`в названии осталась цифра: «${item.title}»`,
		);
	});

	test("знак рубля и «р.» тоже уносят цену из названия", async () => {
		for (const line of [
			"Лечение кариеса 1500,50 ₽",
			"Лечение кариеса 1500,50 р.",
			"Лечение кариеса 1500 руб",
		]) {
			const response = await parseLines(line);
			const item = response.items[0];
			assert.ok(item, `строка «${line}» не разобралась`);
			assert.ok(
				!/\d/.test(item.title),
				`в названии осталась цифра: «${item.title}» (строка «${line}»)`,
			);
		}
	});

	test("буква после цены не откусывается вместе с ценой", async () => {
		/*
		 * Границу справа задаёт запрет буквы, а не \b. Без него альтернатива
		 * `р\.?` съела бы первую букву следующего слова: «1500 рабочих» стало бы
		 * «абочих». Проверяется на слове, начинающемся с «р» и с «руб» —
		 * это единственные два случая, где ошибка возможна.
		 */
		const response = await parseLines("Снятие 1500 рублей залога за каппу");
		const item = response.items[0];
		assert.ok(item);
		assert.ok(
			item.title.includes("рублей") || item.title.includes("рубл"),
			`слово «рублей» повреждено: «${item.title}»`,
		);
	});
});

describe("границы цены сохранены", () => {
	test("слишком маленькое число ценой не считается", async () => {
		// Нижняя граница 300 ₽ существует, чтобы номер зуба, количество единиц и
		// год не попадали в цену. Копейки её не отменяют.
		assert.equal(await priceOf("Лечение кариеса 12,50"), null);
	});

	test("цена с копейками у нижней границы проходит", async () => {
		assert.equal(await priceOf("Лечение кариеса 300,50"), 300.5);
	});
});

describe("зафиксированное поведение на некорректном вводе", () => {
	/*
	 * ЧЕСТНО О ПРЕДЕЛЕ. Три знака после запятой в прайсе — не деньги, а ошибка
	 * набора. Регулярка захватывает не больше двух знаков, поэтому «1500,505»
	 * читается как 1500,50, а лишняя цифра отбрасывается. Это НЕ идеальное
	 * поведение: правильнее было бы пометить строку предупреждением через
	 * item.warnings, чтобы клиника увидела, что цену надо проверить руками.
	 *
	 * Пока поведение просто ЗАФИКСИРОВАНО тестом, а не оставлено на случай: до
	 * правки такая строка теряла 50 копеек целиком (давала 1500), теперь теряет
	 * полкопейки. Долг записан в handoff пакета AA3.
	 */
	test("третий знак отбрасывается, а не превращается в рубли", async () => {
		assert.equal(await priceOf("Лечение кариеса 1500,505"), 1500.5);
	});
});
