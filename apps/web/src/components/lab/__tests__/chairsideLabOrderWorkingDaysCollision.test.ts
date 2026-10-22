import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
	ORTHOPEDIC_WORK_TYPES,
	addWorkingDaysRu,
	checkLabDeadlineAndAlert,
} from "../dentalLabWorkflowEngine";
import {
	calculateLabReadinessDate,
	checkFittingAppointmentCollision,
	toIsoDate,
} from "../dentalLabOrderEngine";

describe("chairsideLabOrder — Working Days & Collision Guard", () => {
	test("addWorkingDaysRu гарантированно пропускает субботы и воскресенья", () => {
		const friday = new Date(2026, 9, 2);
		assert.equal(friday.getDay(), 5);

		const nextDay = addWorkingDaysRu(friday, 1);
		assert.equal(nextDay.getDay(), 1);
		assert.equal(toIsoDate(nextDay), "2026-10-05");

		const fiveDaysLater = addWorkingDaysRu(friday, 5);
		assert.equal(fiveDaysLater.getDay(), 5);
		assert.equal(toIsoDate(fiveDaysLater), "2026-10-09");
	});

	test("calculateLabReadinessDate рассчитывает срок готовности по нормативам конструкций ЗТЛ", () => {
		const startDate = "2026-10-05";
		const zirkonPreset = ORTHOPEDIC_WORK_TYPES.crown_zirconia;
		assert.equal(zirkonPreset.standardTurnaroundWorkingDays, 5);
		assert.equal(calculateLabReadinessDate(startDate, zirkonPreset.standardTurnaroundWorkingDays), "2026-10-12");

		const pmmaPreset = ORTHOPEDIC_WORK_TYPES.temporary_pmma;
		assert.equal(calculateLabReadinessDate(startDate, pmmaPreset.standardTurnaroundWorkingDays), "2026-10-07");

		const claspPreset = ORTHOPEDIC_WORK_TYPES.clasp_prosthesis;
		assert.equal(calculateLabReadinessDate(startDate, claspPreset.standardTurnaroundWorkingDays), "2026-10-19");
	});

	test("Автоматический расчет даты примерки: следующий рабочий день после готовности", () => {
		const labReadyFriday = "2026-10-09";
		const fittingDate = calculateLabReadinessDate(labReadyFriday, 1);
		assert.equal(fittingDate, "2026-10-12");
	});

	test("Выявляет критическую коллизию, если прием назначен раньше готовности ЗТЛ", () => {
		const collision = checkFittingAppointmentCollision("2026-10-15", "2026-10-12");
		assert.equal(collision.hasCollision, true);
		assert.equal(collision.daysGap, 3);
		assert.match(collision.warningRu || "", /прием на примерку назначен раньше готовности/i);

		const cValid = checkFittingAppointmentCollision("2026-10-15", "2026-10-15");
		assert.equal(cValid.hasCollision, false);

		const alert = checkLabDeadlineAndAlert({
			expectedLabDate: "2026-10-15",
			fittingDate: "2026-10-12",
			currentDate: "2026-10-02",
			orderNumber: "ЗТЛ-1",
			patientName: "Иванов И.И.",
		});
		assert.equal(alert.hasAlert, true);
		assert.equal(alert.status, "VISIT_CONFLICT");
	});
});
