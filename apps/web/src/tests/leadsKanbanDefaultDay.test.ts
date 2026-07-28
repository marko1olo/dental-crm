import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dateInputValuePlusDays, todayDateInputValue } from "../AppHelpers";

/**
 * ЗАПИСЬ ЛИДА НА ПРИЁМ: ДЕНЬ ПО УМОЛЧАНИЮ — ЗАВТРА КЛИНИКИ, А НЕ СЕГОДНЯ.
 *
 * Запуск: из apps/web
 *   node --import tsx --import ./testCssStub.mjs --test \
 *     src/tests/leadsKanbanDefaultDay.test.ts
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ. В воронке лидов стояло:
 *   const tomorrow = new Date();
 *   tomorrow.setDate(tomorrow.getDate() + 1);
 *   setAppointmentDate(tomorrow.toISOString().split("T")[0] ?? "");
 * Шаг setDate календарный и верный, а toISOString его отменял: он отдаёт день по
 * Гринвичу. У всех российских поясов смещение положительное, поэтому день по UTC
 * отстаёт от местного каждую ночь — в Москве с 00:00 до 03:00, в Самаре до
 * 04:00, на Камчатке половину суток. В этот промежуток «завтра» превращалось в
 * СЕГОДНЯШНЕЕ число.
 *
 * Вред: обращение с сайта записывают на сегодня вместо завтра. Первичный пациент
 * приходит в день, когда его не ждут, — или не приходит вовсе, а лид в воронке
 * уже отмечен записанным.
 *
 * Проверяется и поведение общего расчёта, и текст самого модуля: расчёт можно
 * вернуть на место в обход общего помощника, и одна проверка поведения этого не
 * заметит.
 */

/** 29 июля 22:00 по Гринвичу: по UTC ещё 29-е, в России уже 30-е. */
const PINNED = Date.parse("2026-07-29T22:00:00Z");

describe("день по умолчанию для записи лида", () => {
	it("в Москве это 31 июля, потому что сегодня там уже 30-е", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		assert.equal(todayDateInputValue("Europe/Moscow"), "2026-07-30", "стенд: сегодня в Москве");
		assert.equal(dateInputValuePlusDays(1, "Europe/Moscow"), "2026-07-31");
	});

	it("день по умолчанию НЕ РАВЕН сегодняшнему дню клиники — это главное утверждение", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		for (const zone of ["Europe/Moscow", "Europe/Samara", "Asia/Kamchatka", "Asia/Yekaterinburg"]) {
			assert.notEqual(
				dateInputValuePlusDays(1, zone),
				todayDateInputValue(zone),
				`в поясе ${zone} «завтра» совпало с «сегодня» — пациента запишут не в тот день`
			);
		}
	});

	it("прежний расчёт на этом же моменте давал именно сегодняшнее число", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		// Воспроизведение прежнего кода: шаг по местному календарю, чтение в UTC.
		const previous = new Date();
		previous.setUTCDate(previous.getUTCDate() + 1);
		const previousDay = previous.toISOString().slice(0, 10);
		assert.equal(previousDay, "2026-07-30", "стенд: прежний расчёт отдавал 30 июля");
		// А 30 июля в Москве — это СЕГОДНЯ. Вот и вся ошибка.
		assert.equal(previousDay, todayDateInputValue("Europe/Moscow"));
		assert.notEqual(dateInputValuePlusDays(1, "Europe/Moscow"), previousDay);
	});
});

describe("воронка лидов не считает календарный день сама", () => {
	const source = readFileSync(
		join(dirname(fileURLToPath(import.meta.url)), "..", "components", "leads", "LeadsKanbanView.tsx"),
		"utf8"
	);

	/**
	 * Комментарии выброшены: разбор дефекта обязан называть прежний расчёт
	 * дословно, иначе следующий агент не поймёт, что было сломано.
	 */
	const code = source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

	it("день не вытаскивается из toISOString", () => {
		assert.ok(
			!/toISOString\(\)\s*\.\s*(split\(\s*["']T["']\s*\)\s*\[0\]|slice\(\s*0\s*,\s*10\s*\)|substring\(\s*0\s*,\s*10\s*\))/.test(
				code
			),
			"toISOString даёт день по UTC; календарный день клиники так получать нельзя"
		);
	});

	it("шага по суткам своими руками в модуле нет", () => {
		assert.ok(!/setDate\(/.test(code), "сдвиг дня делает общий помощник, а не компонент");
		assert.ok(!/24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(code), "сутки не всегда равны 24 часам");
	});

	it("день по умолчанию берётся у общего календарного помощника, и с поясом клиники", () => {
		assert.match(code, /dateInputValuePlusDays\(\s*1\s*,\s*clinicTimeZone\s*\)/);
		assert.match(code, /clinicSettings\?\.profile\?\.timezone/);
	});

	// Полное время приёма по-прежнему уходит на сервер как ISO — это верно и
	// трогать это не надо: там переводится МГНОВЕНИЕ, а не выдёргивается дата.
	it("отправка мгновения приёма через toISOString сохранена", () => {
		assert.match(code, /startDateTime\.toISOString\(\)/);
		assert.match(code, /endDateTime\.toISOString\(\)/);
	});
});
