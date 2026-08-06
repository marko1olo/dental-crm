/*
 * toothHistoryEvents.test.ts — история зуба не выдаёт непрочитанное за пустое.
 *
 * ЧТО ЭТИ ПРОВЕРКИ ДЕРЖАТ. Панель истории зуба читала ответ так:
 * `const data = await res.json(); setEvents(data.events || [])`, а отказ сервера
 * не проверялся вовсе (`if (res.ok)` без ветки else). Любой неожиданный ответ
 * становился пустым списком, и на экране печаталось «История пуста» — то есть
 * утверждение о пациенте «с этим зубом ничего не делали», сделанное по
 * непрочитанному ответу.
 *
 * Главная проверка здесь одна: тело, не соответствующее контракту сервера, даёт
 * null (отказ), а НЕ пустой массив. Ни одна из этих проверок не прошла бы на
 * `data.events || []`.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	type ToothHistoryEvent,
	toothHistoryAuthorLabel,
	toothHistoryEventFromServer,
	toothHistoryEventsFromResponseBody,
} from "./toothHistoryEvents";

test("ФИО врача в карте не обрезается", () => {
	// БЫЛО: authorId.substring(0, 8) + "..." — «Автор: Иванова ...».
	assert.equal(
		toothHistoryAuthorLabel("Иванова Мария Петровна"),
		"Автор: Иванова Мария Петровна",
	);
	assert.equal(toothHistoryAuthorLabel("Ким О Ён"), "Автор: Ким О Ён");
});

test("служебные значения автора не печатаются латиницей и обрубками", () => {
	// "System" сервер ставит позициям плана лечения, "Не указан" — записям без автора.
	assert.equal(toothHistoryAuthorLabel("System"), "Записано программой");
	assert.equal(toothHistoryAuthorLabel("system"), "Записано программой");
	assert.equal(toothHistoryAuthorLabel("Не указан"), "Автор не указан");
	assert.equal(toothHistoryAuthorLabel(null), "Автор не указан");
	for (const label of [
		toothHistoryAuthorLabel("System"),
		toothHistoryAuthorLabel("Не указан"),
		toothHistoryAuthorLabel(null),
	]) {
		assert.ok(!/[A-Za-z]/.test(label), `в «${label}» осталась латиница`);
		assert.ok(!label.endsWith("..."), `«${label}» обрублено`);
	}
});

test("идентификатор пользователя не выдаётся за имя врача", () => {
	// Для записей дневника сервер присылает id пользователя, а не ФИО.
	assert.equal(
		toothHistoryAuthorLabel("e3f1c2a4-1111-2222-3333-444455556666"),
		"Автор: имя в записи не сохранено",
	);
	assert.equal(
		toothHistoryAuthorLabel("a1b2c3d4e5f6a7b8c9d0e1f2"),
		"Автор: имя в записи не сохранено",
	);
});

test("тело по контракту сервера читается целиком", () => {
	// Форма взята из apps/api/src/routes/toothHistory.ts.
	const body = JSON.stringify({
		events: [
			{
				type: "state_change",
				date: "2026-03-14T09:20:00.000Z",
				description: "Статус: Caries → Filled",
				authorId: "Иванова Мария Петровна",
			},
			{
				type: "diary",
				date: "2026-01-09T07:00:00.000Z",
				description: "Лечение кариеса, пломба",
				authorId: "e3f1c2a4-1111-2222-3333-444455556666",
			},
		],
	});
	const events = toothHistoryEventsFromResponseBody(body);
	assert.ok(events !== null, "тело по контракту не должно читаться как отказ");
	assert.equal(events.length, 2);
	assert.equal(events[0]?.kind, "state_change");
	assert.equal(events[0]?.author, "Иванова Мария Петровна");
	assert.equal(events[1]?.kind, "diary");
});

test("честная пустота остаётся пустотой, а не отказом", () => {
	const events = toothHistoryEventsFromResponseBody(
		JSON.stringify({ events: [] }),
	);
	assert.deepEqual(events, []);
});

test("ответ не по контракту — отказ чтения, а не пустая история", () => {
	// Каждое из этих тел прежде превращалось в «История пуста».
	for (const body of [
		"",
		"   ",
		"<html>502 Bad Gateway</html>",
		JSON.stringify({}),
		JSON.stringify({ events: null }),
		JSON.stringify({ events: "нет" }),
		JSON.stringify({ error: "PatientNotFound" }),
		JSON.stringify([]),
		JSON.stringify(null),
	]) {
		assert.equal(
			toothHistoryEventsFromResponseBody(body),
			null,
			`тело ${JSON.stringify(body)} обязано читаться как отказ`,
		);
	}
});

test("событие без даты и без описания показывать нечем", () => {
	assert.equal(toothHistoryEventFromServer({}), null);
	assert.equal(toothHistoryEventFromServer({ authorId: "System" }), null);
	assert.equal(toothHistoryEventFromServer(null), null);
	assert.equal(toothHistoryEventFromServer("diary"), null);
	assert.equal(toothHistoryEventFromServer([{ type: "diary" }]), null);
});

test("нечитаемая дата не становится «Invalid Date» на экране", () => {
	const event = toothHistoryEventFromServer({
		type: "diary",
		date: "не дата",
		description: "Пломба 26",
	});
	assert.ok(event !== null);
	assert.equal(event.dateIso, null);
	assert.equal(event.description, "Пломба 26");
});

test("описание врача бывает пустым, и дата события при этом остаётся", () => {
	// На сервере description = treatmentDescription || anamnesis: врач мог не
	// заполнить ни то, ни другое, и тогда приходит null.
	const event = toothHistoryEventFromServer({
		type: "diary",
		date: "2026-02-02T10:00:00.000Z",
		description: null,
		authorId: "  ",
	});
	assert.ok(event !== null, "дата приёма — факт, и терять его нельзя");
	assert.equal(event.description, null);
	assert.equal(event.author, null, "пробелы автором не считаются");
});

test("незнакомый вид события не выбрасывается и не переименовывается", () => {
	const event = toothHistoryEventFromServer({
		type: "xray",
		date: "2026-02-02T10:00:00.000Z",
		description: "Снимок",
	});
	assert.ok(event !== null, "событие произошло, спрятать его нельзя");
	assert.equal(event.kind, null, "придуманный вид соврал бы значком");
});

test("выброшенные строки не роняют остальные события", () => {
	const body = JSON.stringify({
		events: [
			{},
			{
				type: "plan",
				date: "2026-05-01T08:00:00.000Z",
				description: "План: коронка",
			},
		],
	});
	const events = toothHistoryEventsFromResponseBody(
		body,
	) as ToothHistoryEvent[];
	assert.equal(events.length, 1);
	assert.equal(events[0]?.description, "План: коронка");
});
