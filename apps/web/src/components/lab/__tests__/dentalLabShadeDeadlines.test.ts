import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	formatPatientAnonymizedName,
	formatPatientName152Fz,
	addWorkingDays,
	calculateWorkingDaysRemaining,
} from "../labMath";
import { checkDentalLabFinancialGate } from "../dentalLabFinancialGateEngine";

describe("Dental Lab 3D Shade — Deadlines & Mandate 8e", () => {
	it("5. Anonymized patient name formatting generates valid full and courier-masked names (Mandate 8ap)", () => {
		const res1 = formatPatientAnonymizedName("Иванов Иван Иванович");
		assert.equal(res1.fullName, "Иванов Иван Иванович");
		assert.equal(res1.courierMaskedName, "Иванов И. И.");

		const res2 = formatPatientAnonymizedName("Смирнова Екатерина Васильевна");
		assert.equal(res2.fullName, "Смирнова Екатерина Васильевна");
		assert.equal(res2.courierMaskedName, "Смирнова Е. В.");

		const resSingle = formatPatientAnonymizedName("Сидоров");
		assert.equal(resSingle.courierMaskedName, "Сидоров");

		const resEmpty = formatPatientAnonymizedName("");
		assert.equal(resEmpty.courierMaskedName, "Пациент");

		// Backward-compatibility alias check
		assert.equal(formatPatientName152Fz("Иванов Иван Иванович").courierMaskedName, "Иванов И. И.");
	});

	it("6. Working days remaining calculation accurately evaluates normal, urgent, and overdue deadlines", () => {
		const baseDate = new Date("2026-09-21T10:00:00Z");

		const target5Days = addWorkingDays(baseDate, 5);
		const rem5 = calculateWorkingDaysRemaining(target5Days, baseDate);
		assert.ok(rem5);
		assert.equal(rem5.workingDays, 5);
		assert.equal(rem5.isOverdue, false);
		assert.equal(rem5.isUrgent, false);
		assert.ok(rem5.labelRu.includes("В графике: 5 раб. дн."));

		const remToday = calculateWorkingDaysRemaining(baseDate, baseDate);
		assert.ok(remToday);
		assert.equal(remToday.workingDays, 0);
		assert.equal(remToday.isUrgent, true);
		assert.ok(remToday.labelRu.includes("сегодня"));

		const target1Day = addWorkingDays(baseDate, 1);
		const rem1 = calculateWorkingDaysRemaining(target1Day, baseDate);
		assert.ok(rem1);
		assert.equal(rem1.workingDays, 1);
		assert.equal(rem1.isUrgent, true);
		assert.ok(rem1.labelRu.includes("Срочно: 1 раб. дн."));

		const pastDate = new Date("2026-09-17T10:00:00Z");
		const remOverdue = calculateWorkingDaysRemaining(pastDate, baseDate);
		assert.ok(remOverdue);
		assert.equal(remOverdue.isOverdue, true);
		assert.ok(remOverdue.workingDays < 0);
		assert.ok(remOverdue.labelRu.includes("Дедлайн просрочен"));
	});

	it("7. Mandate 8e item 7 invariant: Treatment plan expiration (>30 days) never blocks lab order", () => {
		const gateRes = checkDentalLabFinancialGate({
			stageTotalKopecks: 2400000,
			paidKopecks: 2400000,
			minAdvancePercent: 50,
			treatmentPlanAgeDays: 45,
			isPlanExpired: true,
		});

		assert.equal(gateRes.isGatePassed, true);
		assert.ok(gateRes.isPlanExpiredNotice);
		assert.ok(gateRes.isPlanExpiredNotice.includes("НЕ БЛОКИРУЕТ"));
	});
});
