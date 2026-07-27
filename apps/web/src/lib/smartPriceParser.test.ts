import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePriceDictationLocal } from "./smartPriceParser";

/**
 * Разбор диктовки прайса. Живой путь: AiOrchestrator.processPriceDictation.
 * Цена из этого разбора попадает в справочник услуг, значит ошибка здесь
 * уходит в счёт пациенту.
 *
 * Проверок у разбора не было. Ожидания получены замерами на живом разборе,
 * scratch/probe-price-parser.mjs.
 */
describe("parsePriceDictationLocal: цена", () => {
	it("разбирает цену, надиктованную словами", () => {
		assert.equal(parsePriceDictationLocal("лечение кариеса пять тысяч рублей терапия").price, 5000);
		assert.equal(parsePriceDictationLocal("чистка две тысячи пятьсот рублей гигиена").price, 2500);
		assert.equal(parsePriceDictationLocal("винир сто тысяч рублей").price, 100000);
		assert.equal(parsePriceDictationLocal("имплантация сорок тысяч рублей").price, 40000);
	});

	it("разбирает цену в родительном падеже", () => {
		// «сорока тысяч», «тридцати тысяч» — именно так и диктуют.
		assert.equal(parsePriceDictationLocal("имплантация сорока тысяч рублей").price, 40000);
		// БЫЛО: цена не находилась вовсе. Все регулярки ищут «руб», «тысяч»,
		// «цена», «стоимость» или «за», а textToNumbers к этому моменту уже
		// заменил слова цифрами. «удаление зуба тридцати тысяч» превращалось
		// в «удаление зуба 30000», и 30000 уходило в НАЗВАНИЕ услуги.
		assert.equal(parsePriceDictationLocal("удаление зуба тридцати тысяч").price, 30000);
	});

	it("разбирает цифры с множителем словом", () => {
		// БЫЛО: «5 тысяч» превращалось в «5 1000» — цифровой токен не попадал
		// в накопитель числительных, множитель применялся к нулю. Цена
		// терялась, а мусор «5 1000» уходил в название услуги.
		assert.equal(parsePriceDictationLocal("лечение кариеса 5 тысяч").price, 5000);
	});

	it("разбирает цену цифрами", () => {
		assert.equal(parsePriceDictationLocal("лечение кариеса 5000 рублей").price, 5000);
		assert.equal(parsePriceDictationLocal("осмотр 500 руб").price, 500);
		assert.equal(parsePriceDictationLocal("осмотр стоимость 500 рублей").price, 500);
		assert.equal(parsePriceDictationLocal("консультация за 1500").price, 1500);
	});

	it("маленькое число после «за» понимается как тысячи", () => {
		// В стоматологии «за 5» означает 5000, а не 5 рублей.
		assert.equal(parsePriceDictationLocal("консультация за 5").price, 5000);
	});
});

describe("parsePriceDictationLocal: название и категория", () => {
	it("название услуги не содержит ни цены, ни слов-подсказок", () => {
		assert.equal(parsePriceDictationLocal("лечение кариеса пять тысяч рублей терапия").serviceName, "Лечение кариеса");
		assert.equal(parsePriceDictationLocal("лечение кариеса 5 тысяч").serviceName, "Лечение кариеса");
		assert.equal(parsePriceDictationLocal("удаление зуба тридцати тысяч").serviceName, "Удаление зуба");
		// БЫЛО: «Осмотр стоимость» — слово-подсказка оставалось в названии.
		assert.equal(parsePriceDictationLocal("осмотр стоимость 500 рублей").serviceName, "Осмотр");
		assert.equal(parsePriceDictationLocal("консультация за 1500").serviceName, "Консультация");
	});

	it("в названии услуги не остаётся цифр", () => {
		const inputs = [
			"лечение кариеса 5 тысяч",
			"удаление зуба тридцати тысяч",
			"осмотр стоимость 500 рублей",
			"винир сто тысяч рублей",
			"коронка цена двадцать пять тысяч ортопедия",
		];
		for (const input of inputs) {
			const { serviceName } = parsePriceDictationLocal(input);
			assert.ok(!/\d/.test(serviceName), `в названии «${serviceName}» осталась цифра (вход «${input}»)`);
		}
	});

	it("определяет категорию по ключевому слову", () => {
		assert.equal(parsePriceDictationLocal("лечение кариеса пять тысяч рублей терапия").category, "Терапия");
		assert.equal(parsePriceDictationLocal("чистка две тысячи пятьсот рублей гигиена").category, "Гигиена");
		assert.equal(parsePriceDictationLocal("коронка цена двадцать пять тысяч ортопедия").category, "Ортопедия");
		assert.equal(parsePriceDictationLocal("имплантация сорок тысяч рублей").category, "Имплантация");
	});

	it("не выдумывает цену и категорию из пустого ввода", () => {
		const result = parsePriceDictationLocal("");
		assert.equal(result.price, null);
		assert.equal(result.category, null);
		assert.equal(result.serviceName, "");
	});
});
