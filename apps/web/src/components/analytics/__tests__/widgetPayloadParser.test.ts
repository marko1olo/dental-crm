/**
 * apps/web/src/components/analytics/__tests__/widgetPayloadParser.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock widget response payload parser tests.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	parseWidgetListPayload,
	WIDGET_LOAD_ERROR_MESSAGE,
} from "../analyticsWidgetData.js";

const identity = (row: Record<string, unknown>) => row;

test("ответ 401 — это ошибка, а не пустой список", () => {
	const result = parseWidgetListPayload(
		401,
		JSON.stringify({ message: "Нет доступа" }),
		identity,
	);
	assert.equal(result.ok, false);
	assert.equal(
		result.ok === false && result.message,
		WIDGET_LOAD_ERROR_MESSAGE,
	);
});

test("ответ 500 — это ошибка, а не пустой список", () => {
	const result = parseWidgetListPayload(500, "", identity);
	assert.equal(result.ok, false);
});

test("пустое тело на статусе 200 — ошибка, а не пустой список", () => {
	const result = parseWidgetListPayload(200, "", identity);
	assert.equal(result.ok, false);
	assert.equal(
		result.ok === false && result.message,
		WIDGET_LOAD_ERROR_MESSAGE,
	);
});

test("не JSON в теле — ошибка", () => {
	assert.equal(
		parseWidgetListPayload(200, "<html>502</html>", identity).ok,
		false,
	);
});

test("пустой массив — это успешный пустой список", () => {
	const result = parseWidgetListPayload(200, "[]", identity);
	assert.equal(result.ok, true);
	assert.deepEqual(result.ok === true && result.items, []);
});

test("список внутри конверта {data} тоже читается", () => {
	const result = parseWidgetListPayload(
		200,
		JSON.stringify({ success: true, data: [{ id: "1" }] }),
		identity,
	);
	assert.equal(result.ok, true);
	assert.equal(result.ok === true && result.items.length, 1);
});

test("элементы, не являющиеся объектами, до разметки не доходят", () => {
	const result = parseWidgetListPayload(
		200,
		JSON.stringify([null, "строка", 7, { id: "1" }]),
		identity,
	);
	assert.equal(result.ok, true);
	assert.equal(result.ok === true && result.items.length, 1);
});
