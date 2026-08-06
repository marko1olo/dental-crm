import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildDictationSystemPrompt,
	dictationTodayDate,
} from "../../ai/dictationParser.js";

/**
 * «СЕГОДНЯ» В ПОДСКАЗКЕ МОДЕЛИ — ДЕНЬ КЛИНИКИ, А НЕ ДЕНЬ ПО UTC.
 *
 * Запуск: из apps/api
 *   node --import tsx --test src/tests/ai/dictationPromptClinicDay.test.ts
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ. В системную подсказку разбора диктовки подставлялось
 * `new Date().toISOString().split("T")[0]` — календарный день по UTC. У всех
 * российских поясов смещение положительное, поэтому день по UTC отстаёт от
 * местного каждую ночь: в Москве с 00:00 до 03:00, в Самаре (пояс по умолчанию
 * в схеме клиник) до 04:00, на Камчатке — половину суток. Вечерняя смена
 * работает именно в этом окне.
 *
 * Вред для клиники: врач диктует «запиши на завтра», модель отсчитывает
 * «завтра» от вчерашнего числа и возвращает СЕГОДНЯ. Дата приходит из модели
 * готовым полем `date`, на глаз в тексте ответа её не проверить.
 *
 * Часы здесь ПРИБИТЫ — момент передаётся третьим параметром явно, а для пути с
 * значением по умолчанию используется `t.mock.timers`. Иначе проверка проходила
 * бы половину суток и падала другую, а сторож, зависящий от времени прогона, —
 * не сторож.
 *
 * Момент выбран так, чтобы день по UTC и день клиники ГАРАНТИРОВАННО не
 * совпадали: 2026-07-29T22:00:00Z — это 29 июля по UTC и уже 30 июля в Москве
 * (+3), в Самаре (+4) и на Камчатке (+12).
 */

/** 29 июля 22:00 по Гринвичу: в России уже 30-е. */
const PINNED_MS = Date.parse("2026-07-29T22:00:00Z");

/** Прежний расчёт — ровно то, что стояло в подсказке до починки. */
function dayByUtc(moment: Date): string {
	return moment.toISOString().split("T")[0] ?? "";
}

describe("дата в подсказке разбора диктовки считается в поясе клиники", () => {
	it("стенд: в выбранный момент день по UTC и день клиники расходятся", () => {
		assert.equal(dayByUtc(new Date(PINNED_MS)), "2026-07-29");
	});

	it("Москва получает 30 июля, когда по UTC ещё 29-е", () => {
		assert.equal(
			dictationTodayDate("Europe/Moscow", new Date(PINNED_MS)),
			"2026-07-30",
		);
	});

	it("Самара — пояс по умолчанию в схеме клиник — тоже 30 июля", () => {
		assert.equal(
			dictationTodayDate("Europe/Samara", new Date(PINNED_MS)),
			"2026-07-30",
		);
	});

	it("Камчатка получает 30 июля: там уже десять утра", () => {
		assert.equal(
			dictationTodayDate("Asia/Kamchatka", new Date(PINNED_MS)),
			"2026-07-30",
		);
	});

	it("пояс, где действительно 29-е, получает 29-е — расчёт не сдвигает всё вперёд", () => {
		assert.equal(
			dictationTodayDate("America/New_York", new Date(PINNED_MS)),
			"2026-07-29",
		);
		assert.equal(dictationTodayDate("UTC", new Date(PINNED_MS)), "2026-07-29");
	});

	it("несуществующий пояс не роняет разбор диктовки и отдаёт день сервера, а не UTC", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED_MS });
		const now = new Date();
		const pad = (value: number) => String(value).padStart(2, "0");
		const serverDay = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
		assert.equal(dictationTodayDate("Марс/Олимп", now), serverDay);
		assert.match(dictationTodayDate("Марс/Олимп", now), /^\d{4}-\d{2}-\d{2}$/);
	});

	it("без пояса берётся местный день машины, а не день по UTC", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED_MS });
		const now = new Date();
		const pad = (value: number) => String(value).padStart(2, "0");
		const serverDay = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
		assert.equal(dictationTodayDate(), serverDay);
		assert.equal(dictationTodayDate(null), serverDay);
	});
});

describe("подсказка контекста schedule несёт день клиники", () => {
	it("в тексте подсказки стоит 30 июля для Самары, а не 29-е по UTC", () => {
		const prompt = buildDictationSystemPrompt(
			"schedule",
			"Europe/Samara",
			new Date(PINNED_MS),
		);
		assert.ok(
			prompt.includes("Для вычисления даты сегодня: 2026-07-30."),
			`в подсказке нет дня клиники; подсказка: ${prompt}`,
		);
		assert.ok(
			!prompt.includes("2026-07-29"),
			"в подсказке остался день по UTC — модель отсчитает «завтра» от вчерашнего числа",
		);
	});

	it("Камчатка и Москва получают свой день, а не общий серверный", () => {
		const kamchatka = buildDictationSystemPrompt(
			"schedule",
			"Asia/Kamchatka",
			new Date(PINNED_MS),
		);
		const newYork = buildDictationSystemPrompt(
			"schedule",
			"America/New_York",
			new Date(PINNED_MS),
		);
		assert.ok(kamchatka.includes("Для вычисления даты сегодня: 2026-07-30."));
		assert.ok(newYork.includes("Для вычисления даты сегодня: 2026-07-29."));
		assert.notEqual(
			kamchatka,
			newYork,
			"подсказка обязана зависеть от пояса клиники",
		);
	});

	it("остальные поля подсказки на месте: вынос в отдельную функцию ничего не потерял", () => {
		const prompt = buildDictationSystemPrompt(
			"schedule",
			"Europe/Samara",
			new Date(PINNED_MS),
		);
		for (const field of [
			"patientName",
			"doctorName",
			"startTime",
			"reason",
			"note",
		]) {
			assert.ok(
				prompt.includes(field),
				`в подсказке schedule потеряно поле ${field}`,
			);
		}
		assert.ok(prompt.includes("Время переводи в 24ч"));
	});

	it("подсказки patient и visit не содержат даты и не зависят от пояса", () => {
		const patient = buildDictationSystemPrompt(
			"patient",
			"Asia/Kamchatka",
			new Date(PINNED_MS),
		);
		const visit = buildDictationSystemPrompt(
			"visit",
			"Asia/Kamchatka",
			new Date(PINNED_MS),
		);
		assert.equal(
			patient,
			buildDictationSystemPrompt("patient", "UTC", new Date(PINNED_MS)),
		);
		assert.equal(
			visit,
			buildDictationSystemPrompt("visit", "UTC", new Date(PINNED_MS)),
		);
		assert.ok(
			patient.includes("birthDate"),
			"в подсказке patient потеряно поле birthDate",
		);
		assert.ok(
			visit.includes("toothUpdates"),
			"в подсказке visit потеряно поле toothUpdates",
		);
		assert.ok(
			visit.includes("МКБ-10"),
			"в подсказке visit потеряна ссылка на МКБ-10",
		);
	});
});
