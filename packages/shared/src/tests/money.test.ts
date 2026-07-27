import { describe, test } from "node:test";
import assert from "node:assert";
import {
	RU_MONEY_MINUS,
	RU_MONEY_NBSP,
	formatKopecksRu,
	kopecksToNumericString,
	kopecksToWholeRubles,
	multiplyKopecks,
	parseKopecks,
	percentageOfKopecks,
	rublesToKopecks,
	splitKopecks,
	sumKopecks,
} from "../utils/money.js";

/**
 * Ожидаемые строки собираются из констант модуля, а не переписываются вручную:
 * неразрывный пробел и типографский минус в литерале теста не отличить глазами
 * от обычных пробела и дефиса, и тест падал с сообщением «−42,75 ₽ !== −42,75 ₽».
 */
const money = (digits: string) => `${digits}${RU_MONEY_NBSP}₽`;

describe("parseKopecks", () => {
	test("разбирает строку numeric из драйвера точно", () => {
		assert.strictEqual(parseKopecks("150.50"), 15050);
		assert.strictEqual(parseKopecks("0.01"), 1);
		assert.strictEqual(parseKopecks("0.10"), 10);
		assert.strictEqual(parseKopecks("1.1"), 110);
		assert.strictEqual(parseKopecks("1000"), 100000);
	});

	test("пустое значение и null считаются нулём", () => {
		assert.strictEqual(parseKopecks(null), 0);
		assert.strictEqual(parseKopecks(undefined), 0);
		assert.strictEqual(parseKopecks(""), 0);
	});

	test("отрицательный баланс — это долг, а не ошибка", () => {
		assert.strictEqual(parseKopecks("-42.75"), -4275);
	});

	test("целое число из колонки integer — это рубли", () => {
		assert.strictEqual(parseKopecks(1500), 150000);
	});

	test("мусор не превращается молча в ноль", () => {
		assert.throws(() => parseKopecks("сто рублей"));
		assert.throws(() => parseKopecks("12.345"));
		assert.throws(() => parseKopecks(Number.NaN));
	});

	test("не теряет копейки там, где ошибается плавающая точка", () => {
		// 0.1 + 0.2 в double даёт 0.30000000000000004.
		assert.strictEqual(
			sumKopecks([parseKopecks("0.10"), parseKopecks("0.20")]),
			parseKopecks("0.30"),
		);
		// 4.35 * 100 в double даёт 434.99999999999994 — классическая ловушка.
		assert.strictEqual(parseKopecks("4.35"), 435);
	});
});

describe("kopecksToNumericString", () => {
	test("возвращает ровно два знака для записи в numeric(12, 2)", () => {
		assert.strictEqual(kopecksToNumericString(15050), "150.50");
		assert.strictEqual(kopecksToNumericString(1), "0.01");
		assert.strictEqual(kopecksToNumericString(0), "0.00");
		assert.strictEqual(kopecksToNumericString(100000), "1000.00");
		assert.strictEqual(kopecksToNumericString(-4275), "-42.75");
	});

	test("обход туда-обратно не меняет сумму", () => {
		for (const text of ["0.00", "0.01", "99.99", "150.50", "123456.78"]) {
			assert.strictEqual(kopecksToNumericString(parseKopecks(text)), text);
		}
	});

	test("дробные копейки — признак прохода через float, это ошибка", () => {
		assert.throws(() => kopecksToNumericString(50.5));
	});
});

describe("rublesToKopecks / kopecksToWholeRubles", () => {
	test("целые рубли переводятся точно в обе стороны", () => {
		assert.strictEqual(rublesToKopecks(1500), 150000);
		assert.strictEqual(kopecksToWholeRubles(150000), 1500);
	});

	test("нецелые рубли не принимаются", () => {
		assert.throws(() => rublesToKopecks(150.5));
	});

	test("сумма с копейками не выдаёт себя за целые рубли", () => {
		assert.throws(() => kopecksToWholeRubles(15050));
	});
});

describe("multiplyKopecks", () => {
	test("цена на количество считается точно", () => {
		assert.strictEqual(multiplyKopecks(parseKopecks("1234.56"), 3), 370368);
	});

	test("дробное количество отклоняется", () => {
		assert.throws(() => multiplyKopecks(1000, 1.5));
	});
});

describe("percentageOfKopecks", () => {
	test("доля считается от точной суммы", () => {
		// 80% от 1000.00 = 800.00
		assert.strictEqual(percentageOfKopecks(100000, 8000), 80000);
		// 13% НДФЛ от 15 000.00 = 1 950.00
		assert.strictEqual(percentageOfKopecks(1500000, 1300), 195000);
	});

	test("остаток отбрасывается, доля не превышает саму сумму", () => {
		// 33.33% от 0.10 — меньше копейки, значит ноль.
		assert.strictEqual(percentageOfKopecks(10, 3333), 3);
		assert.ok(percentageOfKopecks(12345, 10000) <= 12345);
	});
});

describe("splitKopecks", () => {
	test("сумма частей равна исходной сумме", () => {
		const parts = splitKopecks(10000, 3);
		assert.deepStrictEqual(parts, [3334, 3333, 3333]);
		assert.strictEqual(sumKopecks(parts), 10000);
	});

	test("делится без остатка — части одинаковые", () => {
		assert.deepStrictEqual(splitKopecks(9000, 3), [3000, 3000, 3000]);
	});

	test("одна копейка на три платежа не исчезает", () => {
		const parts = splitKopecks(1, 3);
		assert.strictEqual(sumKopecks(parts), 1);
		assert.deepStrictEqual(parts, [1, 0, 0]);
	});

	test("рассрочка любой длины сходится до копейки", () => {
		for (const total of [1, 7, 99, 10000, 123457]) {
			for (const parts of [2, 3, 5, 6, 7, 12]) {
				assert.strictEqual(
					sumKopecks(splitKopecks(total, parts)),
					total,
					`${total} копеек на ${parts} частей`,
				);
			}
		}
	});

	test("долг делится с сохранением знака", () => {
		assert.strictEqual(sumKopecks(splitKopecks(-10000, 3)), -10000);
	});
});

describe("formatKopecksRu", () => {
	test("показывает копейки и разделяет разряды", () => {
		assert.strictEqual(formatKopecksRu(15050), money("150,50"));
		assert.strictEqual(
			formatKopecksRu(150000000),
			money(`1${RU_MONEY_NBSP}500${RU_MONEY_NBSP}000,00`),
		);
		assert.strictEqual(formatKopecksRu(1), money("0,01"));
		assert.strictEqual(formatKopecksRu(0), money("0,00"));
	});

	test("разряды и знак рубля отделены неразрывным пробелом", () => {
		// Обычный пробел позволил бы разорвать сумму при переносе строки.
		assert.ok(formatKopecksRu(150000000).includes(RU_MONEY_NBSP));
		assert.ok(!formatKopecksRu(150000000).includes(" "));
	});

	test("долг показывается типографским минусом", () => {
		assert.strictEqual(formatKopecksRu(-4275), `${RU_MONEY_MINUS}${money("42,75")}`);
	});
});
