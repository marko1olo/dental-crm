/**
 * apps/web/src/components/analytics/__tests__/widgetRoleAndFieldSanitizer.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock role labels, text fallbacks, numeric parser.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	numberOrNull,
	roleLabel,
	textOr,
} from "../analyticsWidgetData.js";

test("роль переводится по общей карте названий, сокращение ADMIN тоже", () => {
	assert.equal(roleLabel("DOCTOR"), "Врач");
	assert.equal(roleLabel("ADMIN"), "Администратор");
	assert.equal(roleLabel("ADMINISTRATOR"), "Администратор");
	assert.equal(roleLabel("assistant"), "Ассистент");
	assert.equal(roleLabel("OWNER"), "Владелец");
	assert.equal(roleLabel("manager"), "Управляющий");
});

test("пустая роль не роняет виджет и не печатается пустым местом", () => {
	assert.equal(roleLabel(undefined), "роль не указана");
	assert.equal(roleLabel(""), "роль не указана");
	assert.equal(roleLabel("   "), "роль не указана");
	assert.equal(roleLabel(null), "роль не указана");
	assert.equal(roleLabel(42), "роль не указана");
});

test("незнакомая роль показывается как есть, а не прячется", () => {
	assert.equal(roleLabel("куратор"), "куратор");
});

test("текст поля: непустая строка или подпись вместо пустоты", () => {
	assert.equal(textOr("  Иванов  ", "нет"), "Иванов");
	assert.equal(textOr("", "нет"), "нет");
	assert.equal(textOr(undefined, "нет"), "нет");
	assert.equal(textOr(123, "нет"), "нет");
});

test("число: numeric-строка из базы читается, мусор к нулю не приводится", () => {
	assert.equal(numberOrNull("42.5"), 42.5);
	assert.equal(numberOrNull(0), 0);
	assert.equal(numberOrNull("н/д"), null);
	assert.equal(numberOrNull(undefined), null);
	assert.equal(numberOrNull(Number.NaN), null);
});
