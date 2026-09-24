import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	integerToWordsRu,
	kopecksToWordsRu,
	rublesToWordsRu,
	legalMoneyInWordsFromKopecksRu,
	legalMoneyInWordsRu,
	RUBLE_FORMS,
	KOPECK_FORMS,
	getDeclension,
} from "./moneyWordsRu.js";

describe("moneyWordsRu", () => {
	test("integerToWordsRu converts numbers accurately with Russian grammar", () => {
		assert.equal(integerToWordsRu(0), "ноль");
		assert.equal(integerToWordsRu(1, RUBLE_FORMS), "один рубль");
		assert.equal(integerToWordsRu(2, RUBLE_FORMS), "два рубля");
		assert.equal(integerToWordsRu(4, RUBLE_FORMS), "четыре рубля");
		assert.equal(integerToWordsRu(5, RUBLE_FORMS), "пять рублей");
		assert.equal(integerToWordsRu(11, RUBLE_FORMS), "одиннадцать рублей");
		assert.equal(integerToWordsRu(21, RUBLE_FORMS), "двадцать один рубль");
		assert.equal(integerToWordsRu(22, RUBLE_FORMS), "двадцать два рубля");
		assert.equal(integerToWordsRu(100, RUBLE_FORMS), "сто рублей");
		assert.equal(integerToWordsRu(1000, RUBLE_FORMS), "одна тысяча рублей");
		assert.equal(integerToWordsRu(2000, RUBLE_FORMS), "две тысячи рублей");
		assert.equal(integerToWordsRu(5000, RUBLE_FORMS), "пять тысяч рублей");
		assert.equal(integerToWordsRu(15450, RUBLE_FORMS), "пятнадцать тысяч четыреста пятьдесят рублей");
		assert.equal(integerToWordsRu(1000000, RUBLE_FORMS), "один миллион рублей");
		assert.equal(integerToWordsRu(1002003, RUBLE_FORMS), "один миллион две тысячи три рубля");
	});

	test("integerToWordsRu and rublesToWordsRu preserve negative sign without dropping minus", () => {
		assert.equal(integerToWordsRu(-1, RUBLE_FORMS), "минус один рубль");
		assert.equal(integerToWordsRu(-100, RUBLE_FORMS), "минус сто рублей");
		assert.equal(rublesToWordsRu(-100), "минус сто рублей");
		assert.equal(rublesToWordsRu(100), "сто рублей");
		assert.equal(rublesToWordsRu(0), "ноль рублей");
	});

	test("kopecksToWordsRu formats rubles and kopecks in title case with proper grammar on negative values", () => {
		assert.equal(kopecksToWordsRu(0), "Ноль рублей 00 копеек");
		assert.equal(kopecksToWordsRu(100), "Один рубль 00 копеек");
		assert.equal(kopecksToWordsRu(250), "Два рубля 50 копеек");
		assert.equal(kopecksToWordsRu(1545050), "Пятнадцать тысяч четыреста пятьдесят рублей 50 копеек");
		assert.equal(kopecksToWordsRu(2101), "Двадцать один рубль 01 копейка");
		assert.equal(kopecksToWordsRu(2202), "Двадцать два рубля 02 копейки");
		assert.equal(kopecksToWordsRu(2505), "Двадцать пять рублей 05 копеек");
		// Отрицательные суммы: "Минус" с заглавной, далее строчными
		assert.equal(kopecksToWordsRu(-150050), "Минус одна тысяча пятьсот рублей 50 копеек");
		assert.equal(kopecksToWordsRu(-100), "Минус один рубль 00 копеек");
		assert.equal(kopecksToWordsRu(-1), "Минус ноль рублей 01 копейка");
	});

	test("legalMoneyInWordsRu returns full formal legal amount in words", () => {
		const result = legalMoneyInWordsRu(15450.5);
		assert.ok(result.includes("15 450,50 ₽") || result.includes("15 450,50"));
		assert.ok(result.includes("(Пятнадцать тысяч четыреста пятьдесят) рублей 50 копеек"));
	});

	test("legalMoneyInWordsFromKopecksRu correctly formats exact kopecks without 100x inflation", () => {
		// 38 500.00 ₽ in kopecks is 3 850 000 kopecks
		const result = legalMoneyInWordsFromKopecksRu(3850000);
		assert.ok(result.includes("38 500,00 ₽") || result.includes("38 500,00"));
		assert.ok(result.includes("(Тридцать восемь тысяч пятьсот) рублей 00 копеек"));
		assert.ok(!result.includes("миллион"), "Must NOT inflate kopecks to millions!");
	});

	test("legalMoneyInWordsFromKopecksRu formats 1 000 000 rub and 0 rub boundary values", () => {
		// 1 000 000.00 ₽
		const millionResult = legalMoneyInWordsFromKopecksRu(100000000);
		assert.ok(millionResult.includes("(Один миллион) рублей 00 копеек"));

		// 0.00 ₽
		const zeroResult = legalMoneyInWordsFromKopecksRu(0);
		assert.ok(zeroResult.includes("(Ноль) рублей 00 копеек"));
	});

	test("legalMoneyInWordsFromKopecksRu includes minus in parentheses for negative amounts", () => {
		// -1 500.50 ₽ = -150050 kopecks
		const negativeResult = legalMoneyInWordsFromKopecksRu(-150050);
		assert.ok(
			negativeResult.includes("(Минус одна тысяча пятьсот) рублей 50 копеек"),
			`Expected '(Минус одна тысяча пятьсот) рублей 50 копеек', got: ${negativeResult}`,
		);
	});

	test("getDeclension handles all Russian noun forms correctly", () => {
		assert.equal(getDeclension(1, RUBLE_FORMS), "рубль");
		assert.equal(getDeclension(2, RUBLE_FORMS), "рубля");
		assert.equal(getDeclension(4, RUBLE_FORMS), "рубля");
		assert.equal(getDeclension(5, RUBLE_FORMS), "рублей");
		assert.equal(getDeclension(11, RUBLE_FORMS), "рублей");
		assert.equal(getDeclension(21, RUBLE_FORMS), "рубль");
		assert.equal(getDeclension(22, RUBLE_FORMS), "рубля");
		assert.equal(getDeclension(25, RUBLE_FORMS), "рублей");
		assert.equal(getDeclension(1, KOPECK_FORMS), "копейка");
		assert.equal(getDeclension(2, KOPECK_FORMS), "копейки");
		assert.equal(getDeclension(5, KOPECK_FORMS), "копеек");
		assert.equal(getDeclension(21, KOPECK_FORMS), "копейка");
	});
});
