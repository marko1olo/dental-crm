import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { money, moneyUnknownLabel } from "../AppHelpers.js";

/**
 * Показ суммы человеку.
 *
 * Раньше стоял голый `toLocaleString("ru-RU")` без указания знаков после
 * запятой. Пока копеек в программе не было, это работало. С копейками 1500,5
 * выводилось как «1 500,5 ₽» — для денег неверная запись: полтинник читается
 * как пять копеек, а в договоре или чеке такая строка недопустима.
 *
 * Разряды русская локаль разделяет неразрывным пробелом (U+00A0), а в новых
 * версиях ICU — узким неразрывным (U+202F). Поэтому сравниваем по нормализации,
 * а не по обычному пробелу: иначе проверка падала бы на целом коде.
 */
const plain = (value: string) => value.replace(/[   ]/g, " ");

describe("money", () => {
	it("круглая сумма печатается без копеек", () => {
		assert.equal(plain(money(1500)), "1 500 ₽");
		assert.equal(plain(money(0)), "0 ₽");
		assert.equal(plain(money(1000000)), "1 000 000 ₽");
	});

	it("полтинник печатается двумя знаками, а не одним", () => {
		assert.equal(plain(money(1500.5)), "1 500,50 ₽");
		assert.equal(plain(money(0.5)), "0,50 ₽");
	});

	it("одна копейка видна", () => {
		assert.equal(plain(money(0.01)), "0,01 ₽");
		assert.equal(plain(money(1500.01)), "1 500,01 ₽");
	});

	it("строка из драйвера базы тоже переживается", () => {
		// Колонки numeric приходили из node-postgres строками; такое значение
		// могло долететь до форматирования и печаталось как «NaN ₽».
		assert.equal(plain(money("1500.50")), "1 500,50 ₽");
		assert.equal(plain(money("1500")), "1 500 ₽");
	});

	it("разряды разделены, дробная часть отделена запятой", () => {
		assert.equal(plain(money(1234567.89)), "1 234 567,89 ₽");
	});
});

/**
 * НЕИЗВЕСТНАЯ СУММА И НОЛЬ — РАЗНЫЕ УТВЕРЖДЕНИЯ О ДЕНЬГАХ.
 *
 * Здесь стояли ДВЕ проверки, закреплявшие дефект: «пусто — это ноль» требовала
 * `money(null) === "0 ₽"`, а «мусор не превращается в NaN» — того же от
 * нечитаемой строки. Обе описывали симптом верно (NaN на экране недопустим) и
 * лечили его подменой на ноль, из-за которой «пациент не должен ничего» и
 * «сколько должен, не посчитано» печатались клинике одной строкой.
 *
 * Набор закрывает ОБЕ стороны: неизвестное не выглядит нулём, а настоящий ноль
 * не прячется. Одностороннюю проверку легко пройти, вернув обратно `: 0`.
 */
describe("money: неизвестная сумма не выглядит нулём", () => {
	it("null не печатается как «0 ₽»", () => {
		assert.equal(money(null), moneyUnknownLabel);
		assert.ok(!money(null).includes("0 ₽"), `получено: ${money(null)}`);
		// Знак рубля тоже не ставится: «не определено ₽» читалось бы как сумма.
		assert.ok(!money(null).includes("₽"), `получено: ${money(null)}`);
	});

	it("undefined не печатается как «0 ₽»", () => {
		// Доезжает сюда через `money(obj?.field)` и через отсутствующее поле JSON.
		assert.equal(money(undefined), moneyUnknownLabel);
		assert.ok(
			!money(undefined).includes("0 ₽"),
			`получено: ${money(undefined)}`,
		);
	});

	it("нечитаемая строка не печатается ни как «0 ₽», ни как «NaN ₽»", () => {
		for (const garbage of ["не сумма", "1 500,50", "—"]) {
			assert.equal(money(garbage), moneyUnknownLabel, `вход: ${garbage}`);
			assert.ok(!money(garbage).includes("NaN"), `вход: ${garbage}`);
		}
	});

	it("пустая строка — это не ноль", () => {
		// `Number("")` в JavaScript равно 0, поэтому незаполненное поле проезжало
		// через `Number.isFinite` как честный ноль — тот же дефект другой дверью.
		assert.equal(money(""), moneyUnknownLabel);
		assert.equal(money("   "), moneyUnknownLabel);
		assert.ok(!money("").includes("0 ₽"), `получено: ${money("")}`);
	});

	it("NaN и бесконечность — не ноль", () => {
		assert.equal(money(Number.NaN), moneyUnknownLabel);
		assert.equal(money(Number.POSITIVE_INFINITY), moneyUnknownLabel);
	});

	it("НАСТОЯЩИЙ ноль остаётся «0 ₽» и не прячется", () => {
		// Обратная сторона: ноль рублей — законная сумма. Если её тоже увести в
		// «не определено», экран снова начнёт врать, только в другую сторону.
		assert.equal(plain(money(0)), "0 ₽");
		assert.ok(plain(money(0)).includes("0 ₽"));
		assert.equal(plain(money("0")), "0 ₽");
		assert.equal(plain(money("0.00")), "0 ₽");
		assert.notEqual(money(0), moneyUnknownLabel);
	});

	it("ноль и неизвестное различимы на экране", () => {
		// Одно утверждение, ради которого сделана вся правка.
		assert.notEqual(money(0), money(null));
	});
});
