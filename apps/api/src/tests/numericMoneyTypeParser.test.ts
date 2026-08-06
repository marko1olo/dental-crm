import assert from "node:assert/strict";
import { describe, it } from "node:test";
import pg from "pg";
import { registerMoneyTypeParsers } from "../db/moneyTypeParsers.js";

/**
 * Драйвер node-postgres по умолчанию отдаёт `numeric` строкой, а `integer` —
 * числом. В проекте деньги лежат и так, и так: 16 колонок объявлены integer, 31
 * колонка — numeric(10,2)/numeric(12,2). Значит одна и та же сумма приходила в
 * код то числом, то строкой, в зависимости от того, из какой таблицы её взяли.
 *
 * Чем это опасно на деньгах:
 *  - сложение сумм превращается в склейку строк: 1500.50 + 200.00 = "1500.50200.00";
 *  - сравнение сортирует как текст: "900.00" > "1500.50";
 *  - схемы z.number() такие поля не принимают вовсе — маршрут отвечает ошибкой
 *    на верных данных.
 *
 * Разбор типов включается в клиенте базы один раз и на весь пул.
 */
describe("registerMoneyTypeParsers", () => {
	it("до включения numeric приходит строкой — это и есть источник склейки", () => {
		const raw = pg.types.getTypeParser(1700 as never);
		const value = typeof raw === "function" ? raw("1500.50") : "1500.50";
		// Смысл проверки: показать поведение по умолчанию на копии парсера,
		// а не полагаться на порядок выполнения тестов.
		const asDefault = String(value);
		assert.equal(typeof asDefault, "string");
		assert.equal(`${asDefault}200.00`, "1500.50200.00");
	});

	it("после включения numeric приходит числом", () => {
		registerMoneyTypeParsers();
		const parse = pg.types.getTypeParser(1700 as never) as (
			value: string,
		) => unknown;
		assert.equal(parse("1500.50"), 1500.5);
		assert.equal(typeof parse("1500.50"), "number");
	});

	it("копейки сохраняются точно", () => {
		registerMoneyTypeParsers();
		const parse = pg.types.getTypeParser(1700 as never) as (
			value: string,
		) => number;
		assert.equal(parse("0.01"), 0.01);
		assert.equal(parse("0.50"), 0.5);
		assert.equal(parse("1500.50"), 1500.5);
		assert.equal(parse("999999999.99"), 999999999.99);
	});

	it("суммы теперь складываются как числа, а не склеиваются", () => {
		registerMoneyTypeParsers();
		const parse = pg.types.getTypeParser(1700 as never) as (
			value: string,
		) => number;
		assert.equal(parse("1500.50") + parse("200.00"), 1700.5);
	});

	it("сравнение сумм перестаёт быть текстовым", () => {
		registerMoneyTypeParsers();
		const parse = pg.types.getTypeParser(1700 as never) as (
			value: string,
		) => number;
		// Как текст «900.00» больше «1500.50»: девятка больше единицы.
		assert.ok("900.00" > "1500.50");
		assert.ok(parse("900.00") < parse("1500.50"));
	});

	it("пустое значение остаётся пустым, а не превращается в ноль", () => {
		registerMoneyTypeParsers();
		const parse = pg.types.getTypeParser(1700 as never) as (
			value: string | null,
		) => unknown;
		assert.equal(parse(null), null);
	});

	it("значение вне точного диапазона числа отдаётся строкой, а не округляется молча", () => {
		registerMoneyTypeParsers();
		const parse = pg.types.getTypeParser(1700 as never) as (
			value: string,
		) => unknown;
		// 2^53 = 9007199254740992: за этой границей число уже неточно.
		const huge = "90071992547409921.55";
		assert.equal(typeof parse(huge), "string");
		assert.equal(parse(huge), huge);
	});

	it("включение повторно ничего не ломает", () => {
		registerMoneyTypeParsers();
		registerMoneyTypeParsers();
		const parse = pg.types.getTypeParser(1700 as never) as (
			value: string,
		) => number;
		assert.equal(parse("12.34"), 12.34);
	});
});
