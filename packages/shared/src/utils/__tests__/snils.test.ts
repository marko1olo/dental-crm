import assert from "node:assert/strict";
import test from "node:test";
import { formatSnils, isValidSnils, normalizeSnils } from "../snils.js";

test("packages/shared/utils/snils: нормализация выкидывает разделители", () => {
	assert.equal(normalizeSnils("112-233-445 95"), "11223344595");
	assert.equal(normalizeSnils("  112 233 445 95 "), "11223344595");
	assert.equal(normalizeSnils(null), "");
	assert.equal(normalizeSnils({}), "");
});

test("packages/shared/utils/snils: принимает номера с верным контрольным числом", () => {
	assert.equal(isValidSnils("11223344595"), true);
	assert.equal(isValidSnils("00000012310"), true);
});

test("packages/shared/utils/snils: отклоняет неверное контрольное число", () => {
	assert.equal(isValidSnils("11223344596"), false);
	assert.equal(isValidSnils("11223344500"), false);
});

test("packages/shared/utils/snils: отклоняет неверную длину и мусор", () => {
	assert.equal(isValidSnils("1122334459"), false);
	assert.equal(isValidSnils("112233445956"), false);
	assert.equal(isValidSnils(""), false);
	assert.equal(isValidSnils("abcdefghijk"), false);
});

test("packages/shared/utils/snils: отклоняет номера из одинаковых цифр", () => {
	assert.equal(isValidSnils("00000000000"), false);
	assert.equal(isValidSnils("11111111111"), false);
});

test("packages/shared/utils/snils: номера до 001-001-998 выданы без контрольного числа", () => {
	assert.equal(isValidSnils("00100199800"), true);
	assert.equal(isValidSnils("00100199842"), true);
});

test("packages/shared/utils/snils: остаток от деления на 101", () => {
	assert.equal(isValidSnils("15185112140"), true);
	assert.equal(isValidSnils("15185112100"), false);
});

test("packages/shared/utils/snils: форматирование", () => {
	assert.equal(formatSnils("11223344595"), "112-233-445 95");
	assert.equal(formatSnils("112"), "");
});
