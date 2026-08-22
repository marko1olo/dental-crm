import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	integerToWordsRu,
	kopecksToWordsRu,
	legalMoneyInWordsRu,
	RUBLE_FORMS,
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

	test("kopecksToWordsRu formats rubles and kopecks in title case", () => {
		assert.equal(kopecksToWordsRu(0), "Ноль рублей 00 копеек");
		assert.equal(kopecksToWordsRu(100), "Один рубль 00 копеек");
		assert.equal(kopecksToWordsRu(250), "Два рубля 50 копеек");
		assert.equal(kopecksToWordsRu(1545050), "Пятнадцать тысяч четыреста пятьдесят рублей 50 копеек");
		assert.equal(kopecksToWordsRu(2101), "Двадцать один рубль 01 копейка");
		assert.equal(kopecksToWordsRu(2202), "Двадцать два рубля 02 копейки");
		assert.equal(kopecksToWordsRu(2505), "Двадцать пять рублей 05 копеек");
	});

	test("legalMoneyInWordsRu returns full formal legal amount in words", () => {
		const result = legalMoneyInWordsRu(15450.5);
		assert.ok(result.includes("15 450,50 ₽") || result.includes("15 450,50"));
		assert.ok(result.includes("(Пятнадцать тысяч четыреста пятьдесят) рублей 50 копеек"));
	});
});
