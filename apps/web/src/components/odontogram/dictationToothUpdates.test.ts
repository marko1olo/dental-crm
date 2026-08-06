/*
 * dictationToothUpdates.test.ts — диктовка на схему зуба не врёт об успехе.
 *
 * ЧТО ЭТИ ПРОВЕРКИ ДЕРЖАТ. Обработчик диктовки в OdontogramModule.tsx читал
 * `const { code, state } = data.payload`, а сервер кладёт эти поля не в
 * `payload`, а в каждую строку `payload.toothUpdates`. Поэтому первая ветка
 * совпадала всегда, `parseInt(undefined)` давал NaN, и врач видел зелёное
 * «AI: Зуб undefined обновлен (undefined)» при пустой карте.
 *
 * Первая проверка ниже — ровно на это тело ответа: она не прошла бы ни на
 * прежнем чтении `payload.code`, ни на недостижимой ветке `data.toothUpdates`.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	dictationApplyMessage,
	dictationApplyPlanFromResponseBody,
} from "./dictationToothUpdates";

/** Ответ местного разбора приёма: localDictationParser.ts:404. */
function localVisitBody(toothUpdates: unknown): string {
	return JSON.stringify({
		action: "update_tooth",
		payload: { toothUpdates, emkUpdates: { diagnosis: "кариес" } },
	});
}

test("строки лежат в payload.toothUpdates, и они находятся", () => {
	const plan = dictationApplyPlanFromResponseBody(
		localVisitBody([
			{ code: "26", state: "missing" },
			{ code: "36", state: "implant" },
			{ code: "16", state: "planned" },
		]),
	);
	assert.ok(plan !== null);
	assert.deepEqual(plan.applied, [
		{ toothNumber: 26, state: "Missing" },
		{ toothNumber: 36, state: "Implant" },
		{ toothNumber: 16, state: "Planned_Implant" },
	]);
	assert.deepEqual(plan.manual, []);
});

test("разбор языковой моделью кладёт строки в корень — тоже находятся", () => {
	// dictationParser.ts:39 отдаёт toothUpdates без обёртки payload.
	const plan = dictationApplyPlanFromResponseBody(
		JSON.stringify({
			toothUpdates: [{ code: "48", state: "missing" }],
			emkUpdates: {},
		}),
	);
	assert.ok(plan !== null);
	assert.deepEqual(plan.applied, [{ toothNumber: 48, state: "Missing" }]);
});

test("неоднозначное слово диктовки не превращается в диагноз", () => {
	// "treatment" — это и кариес, и пульпит, и пломба: сервер повод не сохраняет.
	const plan = dictationApplyPlanFromResponseBody(
		localVisitBody([
			{ code: "26", state: "treatment" },
			{ code: "27", state: "done" },
			{ code: "28", state: "prosthetics" },
			{ code: "35", state: "watch" },
			{ code: "37", state: "calculus" },
		]),
	);
	assert.ok(plan !== null);
	assert.deepEqual(plan.applied, [], "диагноз наугад ставить нельзя");
	assert.equal(plan.manual.length, 5);
	assert.deepEqual(
		plan.manual.map((item) => item.toothNumber),
		[26, 27, 28, 35, 37],
	);
});

test("нечитаемый номер зуба назван, а не выброшен молча", () => {
	const plan = dictationApplyPlanFromResponseBody(
		localVisitBody([
			{ code: "верхний", state: "missing" },
			{ code: "99", state: "missing" },
			{ code: "26абв", state: "missing" },
			{ code: "36", state: "missing" },
		]),
	);
	assert.ok(plan !== null);
	// БЫЛО: parseInt("верхний") = NaN уходил в тело запроса как null, а
	// parseInt("26абв") молча превращался в зуб 26.
	assert.deepEqual(plan.applied, [{ toothNumber: 36, state: "Missing" }]);
	assert.deepEqual(plan.unreadableCodes, ["верхний", "99", "26абв"]);
});

test("незнакомое состояние не пишется в формулу", () => {
	const plan = dictationApplyPlanFromResponseBody(
		localVisitBody([{ code: "26", state: "caries" }]),
	);
	assert.ok(plan !== null);
	// "caries" — не слово диктовки и не состояние схемы. Прежний код ставил
	// именно его: `state || "caries"`.
	assert.deepEqual(plan.applied, []);
	assert.equal(plan.manual.length, 1);
});

test("один зуб дважды не отмечается дважды", () => {
	const plan = dictationApplyPlanFromResponseBody(
		localVisitBody([
			{ code: "26", state: "missing" },
			{ code: "26", state: "implant" },
		]),
	);
	assert.ok(plan !== null);
	assert.deepEqual(plan.applied, [{ toothNumber: 26, state: "Missing" }]);
});

test("сервер не разобрал фразу — это пустой план, а не отказ чтения", () => {
	// parseDictationLocally вернул null, ai.ts отправил его как есть.
	for (const body of [
		"",
		"null",
		JSON.stringify({ action: "schedule", payload: {} }),
	]) {
		const plan = dictationApplyPlanFromResponseBody(body);
		assert.ok(plan !== null, `тело ${JSON.stringify(body)} — не отказ`);
		assert.deepEqual(plan.applied, []);
		assert.deepEqual(plan.manual, []);
	}
});

test("тело не по контракту — отказ чтения", () => {
	for (const body of [
		"<html>502</html>",
		JSON.stringify([]),
		JSON.stringify("готово"),
	]) {
		assert.equal(dictationApplyPlanFromResponseBody(body), null);
	}
});

test("текст для врача без латиницы, с русскими названиями и согласованием", () => {
	const plan = dictationApplyPlanFromResponseBody(
		localVisitBody([
			{ code: "26", state: "missing" },
			{ code: "36", state: "implant" },
		]),
	);
	assert.ok(plan !== null);
	const message = dictationApplyMessage(plan);
	assert.equal(message.tone, "success");
	assert.ok(
		message.text.includes("2 зуба"),
		`нет согласования: ${message.text}`,
	);
	assert.ok(
		message.text.includes("отсутствует"),
		"нет русского названия состояния",
	);
	assert.ok(
		message.text.includes("имплантат"),
		"нет русского названия состояния",
	);
	// БЫЛО: «AI: Зуб 26 обновлен (Missing)».
	assert.ok(
		!/[A-Za-z]/.test(message.text),
		`осталась латиница: ${message.text}`,
	);
});

test("зелёным — только когда на схеме действительно всё отмечено", () => {
	const partial = dictationApplyPlanFromResponseBody(
		localVisitBody([
			{ code: "26", state: "missing" },
			{ code: "27", state: "treatment" },
		]),
	);
	assert.ok(partial !== null);
	assert.equal(dictationApplyMessage(partial).tone, "warning");

	const nothing = dictationApplyPlanFromResponseBody("null");
	assert.ok(nothing !== null);
	const message = dictationApplyMessage(nothing);
	assert.equal(message.tone, "info");
	assert.ok(
		message.text.includes("двадцать шестой"),
		"нет примера, как сказать",
	);

	const one = dictationApplyPlanFromResponseBody(
		localVisitBody([{ code: "26", state: "missing" }]),
	);
	assert.ok(one !== null);
	assert.ok(
		dictationApplyMessage(one).text.includes("1 зуб"),
		"согласование единственного числа",
	);
});
