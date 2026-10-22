import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	addWorkingDaysRu,
	formatDateToIsoDay,
	formatRussianDate,
	checkLabDeadlineAndAlert,
} from "../dentalLabWorkflowEngine";

describe("3. Date Utilities & Working Days Math", () => {
	test("addWorkingDaysRu пропускает субботу и воскресенье", () => {
		const friday = new Date(2026, 7, 28);
		const monday = addWorkingDaysRu(friday, 1);
		assert.equal(monday.getDay(), 1, "Должен быть понедельник");
		assert.equal(monday.getDate(), 31);

		const nextFriday = addWorkingDaysRu(friday, 5);
		assert.equal(nextFriday.getDay(), 5, "Должна быть следующая пятница");
		assert.equal(nextFriday.getDate(), 4);
		assert.equal(nextFriday.getMonth(), 8);
	});

	test("formatDateToIsoDay и formatRussianDate форматируют даты", () => {
		const d = new Date(2026, 7, 28);
		const iso = formatDateToIsoDay(d);
		assert.equal(iso, "2026-08-28");
		const ru = formatRussianDate(iso);
		assert.equal(ru, "28.08.2026");
	});
});

describe("4. Deadline Detection, fittingDate & isDelayedAlert Engine", () => {
	const baseDate = new Date(2026, 7, 28);

	test("Возвращает ON_TRACK, когда срок ЗТЛ в будущем и примерка назначена после готовности", () => {
		const alert = checkLabDeadlineAndAlert({
			expectedLabDate: new Date(2026, 8, 5),
			fittingDate: new Date(2026, 8, 6),
			appointmentId: "appt-100",
			currentDate: baseDate,
			isInstalledOrCompleted: false,
		});

		assert.equal(alert.hasAlert, false);
		assert.equal(alert.isDelayedAlert, false);
		assert.equal(alert.lab_delay_alert, false);
		assert.equal(alert.status, "ON_TRACK");
		assert.equal(alert.severity, "OK");
		assert.equal(alert.appointmentId, "appt-100");
		assert.ok(alert.daysDifference > 0);
	});

	test("Возвращает VISIT_CONFLICT и isDelayedAlert=true, если готовность ЗТЛ ПОЗЖЕ даты примерки (fittingDate)", () => {
		const alert = checkLabDeadlineAndAlert({
			expectedLabDate: new Date(2026, 8, 10),
			fittingDate: new Date(2026, 8, 5),
			appointmentId: "appt-101",
			currentDate: baseDate,
			isInstalledOrCompleted: false,
		});

		assert.equal(alert.hasAlert, true);
		assert.equal(alert.isDelayedAlert, true);
		assert.equal(alert.lab_delay_alert, true);
		assert.equal(alert.status, "VISIT_CONFLICT");
		assert.equal(alert.severity, "CRITICAL");
		assert.ok(alert.alertMessageRu.includes("КРИТИЧЕСКИЙ КОНФЛИКТ"));
		assert.ok(alert.recommendedActionRu.includes("переноса визита"));
	});

	test("Возвращает OVERDUE и isDelayedAlert=true, если текущая дата превысила срок готовности ЗТЛ", () => {
		const alert = checkLabDeadlineAndAlert({
			expectedLabDate: new Date(2026, 7, 25),
			fittingDate: new Date(2026, 8, 1),
			currentDate: baseDate,
			isInstalledOrCompleted: false,
		});

		assert.equal(alert.hasAlert, true);
		assert.equal(alert.isDelayedAlert, true);
		assert.equal(alert.lab_delay_alert, true);
		assert.equal(alert.status, "OVERDUE");
		assert.equal(alert.severity, "CRITICAL");
		assert.ok(alert.daysDifference < 0);
		assert.ok(alert.alertMessageRu.includes("ПРОСРОЧЕНО ЗТЛ"));
	});

	test("Возвращает URGENT_TODAY, если срок готовности ЗТЛ сегодня", () => {
		const alert = checkLabDeadlineAndAlert({
			expectedLabDate: new Date(2026, 7, 28),
			currentDate: baseDate,
			isInstalledOrCompleted: false,
		});

		assert.equal(alert.hasAlert, true);
		assert.equal(alert.isDelayedAlert, false);
		assert.equal(alert.status, "URGENT_TODAY");
		assert.equal(alert.severity, "WARNING");
		assert.equal(alert.daysDifference, 0);
	});

	test("Если заказ уже сдан пациенту (isInstalledOrCompleted), задержка не выставляется", () => {
		const alert = checkLabDeadlineAndAlert({
			expectedLabDate: new Date(2026, 7, 20),
			fittingDate: new Date(2026, 7, 15),
			currentDate: baseDate,
			isInstalledOrCompleted: true,
		});

		assert.equal(alert.hasAlert, false);
		assert.equal(alert.isDelayedAlert, false);
		assert.equal(alert.status, "ON_TRACK");
		assert.equal(alert.severity, "OK");
	});
});
