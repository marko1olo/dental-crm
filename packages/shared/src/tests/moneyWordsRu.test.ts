import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	getDeclension,
	integerToWordsRu,
	KOPECK_FORMS,
	kopecksToWordsRu,
	legalMoneyInWordsFromKopecksRu,
	legalMoneyInWordsRu,
	MILLION_FORMS,
	moneyToWordsRu,
	RUBLE_FORMS,
	rublesToWordsRu,
	THOUSAND_FORMS,
} from "../moneyWordsRu.js";

describe("moneyWordsRu canonical shared engine", () => {
	describe("getDeclension", () => {
		test("correctly selects forms for rubles", () => {
			assert.equal(getDeclension(0, RUBLE_FORMS), "рублей");
			assert.equal(getDeclension(1, RUBLE_FORMS), "рубль");
			assert.equal(getDeclension(2, RUBLE_FORMS), "рубля");
			assert.equal(getDeclension(3, RUBLE_FORMS), "рубля");
			assert.equal(getDeclension(4, RUBLE_FORMS), "рубля");
			assert.equal(getDeclension(5, RUBLE_FORMS), "рублей");
			assert.equal(getDeclension(11, RUBLE_FORMS), "рублей");
			assert.equal(getDeclension(12, RUBLE_FORMS), "рублей");
			assert.equal(getDeclension(14, RUBLE_FORMS), "рублей");
			assert.equal(getDeclension(20, RUBLE_FORMS), "рублей");
			assert.equal(getDeclension(21, RUBLE_FORMS), "рубль");
			assert.equal(getDeclension(22, RUBLE_FORMS), "рубля");
			assert.equal(getDeclension(25, RUBLE_FORMS), "рублей");
		});

		test("correctly selects forms for kopecks (21 копейка, 22 копейки, 25 копеек)", () => {
			assert.equal(getDeclension(0, KOPECK_FORMS), "копеек");
			assert.equal(getDeclension(1, KOPECK_FORMS), "копейка");
			assert.equal(getDeclension(2, KOPECK_FORMS), "копейки");
			assert.equal(getDeclension(5, KOPECK_FORMS), "копеек");
			assert.equal(getDeclension(21, KOPECK_FORMS), "копейка");
			assert.equal(getDeclension(22, KOPECK_FORMS), "копейки");
			assert.equal(getDeclension(25, KOPECK_FORMS), "копеек");
		});
	});

	describe("rublesToWordsRu & integerToWordsRu", () => {
		test("converts 0, 1, 2, 5 rubles accurately", () => {
			assert.equal(rublesToWordsRu(0), "ноль рублей");
			assert.equal(rublesToWordsRu(1), "один рубль");
			assert.equal(rublesToWordsRu(2), "два рубля");
			assert.equal(rublesToWordsRu(5), "пять рублей");
			assert.equal(rublesToWordsRu(21), "двадцать один рубль");
			assert.equal(rublesToWordsRu(22), "двадцать два рубля");
		});

		test("handles thousands and millions correctly", () => {
			assert.equal(rublesToWordsRu(1000), "одна тысяча рублей");
			assert.equal(rublesToWordsRu(2000), "две тысячи рублей");
			assert.equal(rublesToWordsRu(5000), "пять тысяч рублей");
			assert.equal(rublesToWordsRu(1000000), "один миллион рублей");
			assert.equal(rublesToWordsRu(2000000), "два миллиона рублей");
			assert.equal(rublesToWordsRu(5000000), "пять миллионов рублей");
			assert.equal(rublesToWordsRu(1002003), "один миллион две тысячи три рубля");
		});

		test("converts feminine forms for thousands and kopecks", () => {
			assert.equal(integerToWordsRu(1, THOUSAND_FORMS, true), "одна тысяча");
			assert.equal(integerToWordsRu(2, THOUSAND_FORMS, true), "две тысячи");
			assert.equal(integerToWordsRu(21, KOPECK_FORMS, true), "двадцать одна копейка");
			assert.equal(integerToWordsRu(22, KOPECK_FORMS, true), "двадцать две копейки");
		});
	});

	describe("kopecksToWordsRu & moneyToWordsRu", () => {
		test("formats title case rubles and 2-digit kopecks", () => {
			assert.equal(kopecksToWordsRu(0), "Ноль рублей 00 копеек");
			assert.equal(kopecksToWordsRu(100), "Один рубль 00 копеек");
			assert.equal(kopecksToWordsRu(200), "Два рубля 00 копеек");
			assert.equal(kopecksToWordsRu(500), "Пять рублей 00 копеек");
			assert.equal(kopecksToWordsRu(250), "Два рубля 50 копеек");
			assert.equal(kopecksToWordsRu(2101), "Двадцать один рубль 01 копейка");
			assert.equal(kopecksToWordsRu(2202), "Двадцать два рубля 02 копейки");
			assert.equal(kopecksToWordsRu(2505), "Двадцать пять рублей 05 копеек");
			assert.equal(kopecksToWordsRu(1545050), "Пятнадцать тысяч четыреста пятьдесят рублей 50 копеек");
		});

		test("moneyToWordsRu is exact alias of kopecksToWordsRu", () => {
			assert.equal(moneyToWordsRu(1545050), kopecksToWordsRu(1545050));
			assert.equal(moneyToWordsRu(2101), "Двадцать один рубль 01 копейка");
			assert.equal(moneyToWordsRu(0), "Ноль рублей 00 копеек");
		});

		test("absence of floating point drift and exact kopecks handling", () => {
			// 0.1 + 0.2 floating point sum in kopecks
			const kopecks = Math.round((0.1 + 0.2) * 100);
			assert.equal(kopecks, 30);
			assert.equal(kopecksToWordsRu(kopecks), "Ноль рублей 30 копеек");

			// 4.35 rubles in kopecks
			const exactKop = Math.round(4.35 * 100);
			assert.equal(exactKop, 435);
			assert.equal(kopecksToWordsRu(exactKop), "Четыре рубля 35 копеек");
		});

		test("handles millions in kopecks without distortion", () => {
			assert.equal(kopecksToWordsRu(100000000), "Один миллион рублей 00 копеек");
			assert.equal(kopecksToWordsRu(200000000), "Два миллиона рублей 00 копеек");
			assert.equal(kopecksToWordsRu(500000000), "Пять миллионов рублей 00 копеек");
		});

		test("handles negative balances with minus sign", () => {
			assert.equal(kopecksToWordsRu(-15050), "минус Сто пятьдесят рублей 50 копеек");
		});
	});

	describe("legalMoneyInWordsFromKopecksRu & legalMoneyInWordsRu", () => {
		test("formats legal document amount in words strictly from kopecks", () => {
			const result = legalMoneyInWordsFromKopecksRu(3850000);
			assert.ok(result.includes("38 500,00 ₽") || result.includes("38 500,00"));
			assert.ok(result.includes("(Тридцать восемь тысяч пятьсот) рублей 00 копеек"));
			assert.ok(!result.includes("миллион"), "Must NOT inflate kopecks to millions");
		});

		test("formats legal document amount in words from decimal rubles", () => {
			const result = legalMoneyInWordsRu(15450.5);
			assert.ok(result.includes("15 450,50 ₽") || result.includes("15 450,50"));
			assert.ok(result.includes("(Пятнадцать тысяч четыреста пятьдесят) рублей 50 копеек"));
		});

		test("handles empty/null gracefully", () => {
			assert.equal(legalMoneyInWordsRu(null), "не указана");
			assert.equal(legalMoneyInWordsRu(undefined), "не указана");
			assert.equal(legalMoneyInWordsFromKopecksRu(null), "не указана");
		});
	});
});
