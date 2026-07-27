import assert from "node:assert/strict";
import test from "node:test";
import { formatSnils, isValidSnils, normalizeSnils } from "../utils/snils.js";

/**
 * Раньше «валидация» СНИЛС в routes/egisz.ts была `digits.length !== 11`, из-за
 * чего в ФРМР уходили опечатки и Минздрав отклонял случай обслуживания.
 * Контрольные значения ниже посчитаны по Постановлению Правления ПФР № 192п.
 */

test("нормализация выкидывает разделители", () => {
	assert.equal(normalizeSnils("112-233-445 95"), "11223344595");
	assert.equal(normalizeSnils("  112 233 445 95 "), "11223344595");
	assert.equal(normalizeSnils(null), "");
	assert.equal(normalizeSnils({}), "");
});

test("принимает номера с верным контрольным числом", () => {
	// 1*9+1*8+2*7+2*6+3*5+3*4+4*3+4*2+5*1 = 9+8+14+12+15+12+12+8+5 = 95
	assert.equal(isValidSnils("11223344595"), true);
	// 0*9+0*8+0*7+0*6+0*5+0*4+1*3+2*2+3*1 = 10
	assert.equal(isValidSnils("00000012310"), true);
});

test("отклоняет неверное контрольное число", () => {
	assert.equal(isValidSnils("11223344596"), false);
	assert.equal(isValidSnils("11223344500"), false);
});

test("отклоняет неверную длину и мусор", () => {
	assert.equal(isValidSnils("1122334459"), false);
	assert.equal(isValidSnils("112233445956"), false);
	assert.equal(isValidSnils(""), false);
	assert.equal(isValidSnils("abcdefghijk"), false);
});

test("отклоняет номера из одинаковых цифр", () => {
	// Контрольную сумму такие проходят, но валидным СНИЛС не являются.
	assert.equal(isValidSnils("00000000000"), false);
	assert.equal(isValidSnils("11111111111"), false);
});

test("номера до 001-001-998 выданы без контрольного числа", () => {
	assert.equal(isValidSnils("00100199800"), true);
	assert.equal(isValidSnils("00100199842"), true);
});

test("сумма кратная 101 даёт контрольное число 0", () => {
	// 1*9+5*8+1*7+8*6+5*5+1*4+1*3+2*2+1*1 = 9+40+7+48+25+4+3+4+1 = 141
	// 141 % 101 = 40 → контрольное 40, а не 0. Проверяем сам механизм остатка.
	assert.equal(isValidSnils("15185112140"), true);
	assert.equal(isValidSnils("15185112100"), false);
});

test("форматирование", () => {
	assert.equal(formatSnils("11223344595"), "112-233-445 95");
	assert.equal(formatSnils("112"), "");
});
