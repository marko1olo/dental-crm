import assert from "node:assert/strict";
import test from "node:test";
import {
	WIDGET_LOAD_ERROR_MESSAGE,
	numberOrNull,
	parseWidgetListPayload,
	roleLabel,
	textOr,
} from "./analyticsWidgetData.js";

/**
 * Виджеты аналитики: три вещи, которые они делали неправильно.
 *
 * 1. `res.json()` вызывался без проверки `res.ok`. Ответ 401 отдаёт корректный
 *    JSON-объект с сообщением, `Array.isArray` давал false, и виджет писал
 *    «Правила повторной записи пусты» — провал запроса выдавался за «данных нет».
 * 2. Пустое тело роняло `res.json()` исключением, которое глотал `catch`, —
 *    получалось то же ложное «пусто».
 * 3. Поля элемента читались без проверки: `rule.creditedRole.toUpperCase()`
 *    бросал TypeError во время отрисовки и ронял весь раздел «Аналитика».
 *
 * Всё это проверяется обычным node:test, потому что решение вынесено в чистые
 * функции: ни fetch, ни DOM.
 */

const identity = (row: Record<string, unknown>) => row;

test("ответ 401 — это ошибка, а не пустой список", () => {
	const result = parseWidgetListPayload(401, JSON.stringify({ message: "Нет доступа" }), identity);
	assert.equal(result.ok, false);
	assert.equal(result.ok === false && result.message, WIDGET_LOAD_ERROR_MESSAGE);
});

test("ответ 500 — это ошибка, а не пустой список", () => {
	const result = parseWidgetListPayload(500, "", identity);
	assert.equal(result.ok, false);
});

test("пустое тело на статусе 200 — ошибка, а не пустой список", () => {
	const result = parseWidgetListPayload(200, "", identity);
	assert.equal(result.ok, false);
	assert.equal(result.ok === false && result.message, WIDGET_LOAD_ERROR_MESSAGE);
});

test("не JSON в теле — ошибка", () => {
	assert.equal(parseWidgetListPayload(200, "<html>502</html>", identity).ok, false);
});

test("пустой массив — это успешный пустой список", () => {
	const result = parseWidgetListPayload(200, "[]", identity);
	assert.equal(result.ok, true);
	assert.deepEqual(result.ok === true && result.items, []);
});

test("список внутри конверта {data} тоже читается", () => {
	const result = parseWidgetListPayload(200, JSON.stringify({ success: true, data: [{ id: "1" }] }), identity);
	assert.equal(result.ok, true);
	assert.equal(result.ok === true && result.items.length, 1);
});

test("элементы, не являющиеся объектами, до разметки не доходят", () => {
	const result = parseWidgetListPayload(200, JSON.stringify([null, "строка", 7, { id: "1" }]), identity);
	assert.equal(result.ok, true);
	assert.equal(result.ok === true && result.items.length, 1);
});

test("роль переводится по общей карте названий, сокращение ADMIN тоже", () => {
	assert.equal(roleLabel("DOCTOR"), "Врач");
	assert.equal(roleLabel("ADMIN"), "Администратор");
	assert.equal(roleLabel("ADMINISTRATOR"), "Администратор");
	assert.equal(roleLabel("assistant"), "Ассистент");
	assert.equal(roleLabel("OWNER"), "Владелец");
	assert.equal(roleLabel("manager"), "Управляющий");
});

test("пустая роль не роняет виджет и не печатается пустым местом", () => {
	// Именно этот случай ронял весь раздел: `.toUpperCase()` на undefined.
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
