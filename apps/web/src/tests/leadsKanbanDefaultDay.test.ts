import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dateInputValuePlusDays, todayDateInputValue } from "../AppHelpers";
import { resolveKanbanDefaultDayScheduleWindow } from "../components/leads/LeadsKanbanView";

/**
 * ЗАПИСЬ ЛИДА НА ПРИЁМ: ДЕНЬ ПО УМОЛЧАНИЮ — ЗАВТРА КЛИНИКИ, А НЕ СЕГОДНЯ.
 */

const PINNED = Date.parse("2026-07-29T22:00:00Z");

describe("день по умолчанию для записи лида", () => {
	it("в Москве это 31 июля, потому что сегодня там уже 30-е", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		assert.equal(
			todayDateInputValue("Europe/Moscow"),
			"2026-07-30",
			"стенд: сегодня в Москве",
		);
		assert.equal(dateInputValuePlusDays(1, "Europe/Moscow"), "2026-07-31");
	});

	it("день по умолчанию НЕ РАВЕН сегодняшнему дню клиники — это главное утверждение", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		for (const zone of [
			"Europe/Moscow",
			"Europe/Samara",
			"Asia/Kamchatka",
			"Asia/Yekaterinburg",
		]) {
			assert.notEqual(
				dateInputValuePlusDays(1, zone),
				todayDateInputValue(zone),
				`в поясе ${zone} «завтра» совпало с «сегодня» — пациента запишут не в тот день`,
			);
		}
	});

	it("прежний UTC-расчёт расходился с местным днём клиники ночью", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		const previous = new Date();
		previous.setUTCDate(previous.getUTCDate() + 1);
		const previousDay = previous.toISOString().slice(0, 10);
		assert.equal(previousDay, "2026-07-30");
		assert.equal(previousDay, todayDateInputValue("Europe/Moscow"));
		assert.notEqual(dateInputValuePlusDays(1, "Europe/Moscow"), previousDay);
	});
});

describe("resolveKanbanDefaultDayScheduleWindow использует пояс клиники и корректно считает длительность", () => {
	it("выбирает завтра в поясе клиники Europe/Moscow, а не UTC-вчера", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		const win = resolveKanbanDefaultDayScheduleWindow({
			clinicSettings: {
				profile: {
					timezone: "Europe/Moscow",
					defaultVisitMinutes: 45,
				},
			},
		});
		assert.equal(win.clinicTimeZone, "Europe/Moscow");
		assert.equal(win.targetDate, "2026-07-31");
		const startMs = Date.parse(win.appointmentStart);
		const endMs = Date.parse(win.appointmentEnd);
		assert.equal(endMs - startMs, 45 * 60000);
	});

	it("поддерживает явную дату и время записи, сохраняя ISO-интервал визита", () => {
		const win = resolveKanbanDefaultDayScheduleWindow(
			{
				clinicSettings: {
					profile: {
						timezone: "Asia/Kamchatka",
						defaultVisitMinutes: 60,
					},
				},
			},
			"2026-08-15",
			"14:30",
		);
		assert.equal(win.targetDate, "2026-08-15");
		const startMs = Date.parse(win.appointmentStart);
		const endMs = Date.parse(win.appointmentEnd);
		assert.equal(endMs - startMs, 60 * 60000);
		assert.ok(win.delegatedActions.includes("batchUpdateStage"));
	});
});
