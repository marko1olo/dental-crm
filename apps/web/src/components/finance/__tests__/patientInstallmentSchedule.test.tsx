/**
 * patientInstallmentSchedule.test.tsx — Unit Tests for Wave 23: Stage Payments, 0% Installments & Overdue Debt Invariants.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
	type ClinicalStagePaymentItem,
	type PatientDebtSummary,
	calculatePatientDebtSummary,
	createDefaultImplantStagesPreset,
	formatKopecksRu,
	generate0PercentInstallmentSchedule,
	generateDebtPaymentReminderMessage,
	parseKopecks,
	rublesToKopecks,
} from "@dental/shared";
import { PatientInstallmentScheduleModal } from "../PatientInstallmentScheduleModal";

describe("Wave 23 / Domain 4: Patient Stage Payments, 0% Installments & Overdue Debt Engine", () => {
	it("1. Scenario: 300 000 ₽ Implants (Surgery 150k + Orthopedics 150k) — Default Preset Integrity", () => {
		const stages = createDefaultImplantStagesPreset(300000, "2026-08-29T10:00:00.000Z");

		assert.equal(stages.length, 2, "Should have exactly 2 main clinical stages");
		assert.equal(stages[0]!.category, "surgery");
		assert.equal(stages[0]!.totalCostKopecks, 15000000, "Stage 1 Surgery should be exactly 150 000.00 ₽ (15 000 000 kop)");
		assert.equal(stages[0]!.code804n, "A16.07.006.001", "Stage 1 code should be A16.07.006.001 (Implantation)");

		assert.equal(stages[1]!.category, "orthopedics");
		assert.equal(stages[1]!.totalCostKopecks, 15000000, "Stage 2 Orthopedics should be exactly 150 000.00 ₽ (15 000 000 kop)");
		assert.equal(stages[1]!.code804n, "A16.07.004.002", "Stage 2 code should be A16.07.004.002 (Crowns on implants)");

		const totalSumKop = stages.reduce((acc, s) => acc + s.totalCostKopecks, 0);
		assert.equal(totalSumKop, 30000000, "Total plan cost must be exact 30 000 000 kopecks (300 000 ₽)");
	});

	it("2. Exact Kopeck Debt Calculation & Progress Tracking", () => {
		const stages: ClinicalStagePaymentItem[] = [
			{
				id: "stage-1",
				stageNumber: 1,
				category: "surgery",
				title: "Хирургический этап",
				code804n: "A16.07.006.001",
				totalCostKopecks: 15000000, // 150 000 ₽ (15 000 000 kop)
				paidKopecks: 15000000, // 150 000 ₽ (fully paid)
				dueDateIso: "2026-08-01T00:00:00.000Z",
				status: "paid",
				servicesCount: 2,
			},
			{
				id: "stage-2",
				stageNumber: 2,
				category: "orthopedics",
				title: "Ортопедический этап",
				code804n: "A16.07.004.002",
				totalCostKopecks: 15000000, // 150 000 ₽
				paidKopecks: 5000000, // 50 000 ₽ paid, 100 000 ₽ remaining
				dueDateIso: "2026-11-01T00:00:00.000Z",
				status: "partially_paid",
				servicesCount: 3,
			},
		];

		const summary = calculatePatientDebtSummary(stages, "2026-08-29T12:00:00.000Z");

		assert.equal(summary.totalPlanCostKopecks, 30000000, "Total plan is 30 000 000 kop");
		assert.equal(summary.totalPaidKopecks, 20000000, "Total paid is 20 000 000 kop (200 000 ₽)");
		assert.equal(summary.remainingDebtKopecks, 10000000, "Remaining debt is 10 000 000 kop (100 000 ₽)");
		assert.equal(summary.paidPercent, 67, "67% paid");
		assert.equal(summary.hasDebt, true, "Patient has active debt");
		assert.equal(summary.hasOverdueDebt, false, "Stage 2 due date is in the future, not overdue");
		assert.equal(summary.ndflRefund13PercentKopecks, 2600000, "13% NDFL on 200 000 ₽ paid is 26 000 ₽ (2 600 000 kop)");
	});

	it("3. Overdue Debt Detection when Due Date has Passed", () => {
		const stages: ClinicalStagePaymentItem[] = [
			{
				id: "stage-1",
				stageNumber: 1,
				category: "surgery",
				title: "Хирургический этап (Просрочен)",
				code804n: "A16.07.006.001",
				totalCostKopecks: 15000000,
				paidKopecks: 10000000, // 50 000 ₽ unpaid
				dueDateIso: "2026-07-01T00:00:00.000Z", // Past date!
				status: "overdue",
				servicesCount: 2,
			},
		];

		const summary = calculatePatientDebtSummary(stages, "2026-08-29T12:00:00.000Z");

		assert.equal(summary.hasOverdueDebt, true, "Must flag overdue debt");
		assert.equal(summary.overdueDebtKopecks, 5000000, "Overdue debt is exact 5 000 000 kop (50 000 ₽)");
	});

	it("4. 0% Installments Engine: Zero Kopeck Loss Invariant (3, 6, 12, 24 months)", () => {
		const totalDebtKop = 10000055; // 100 000.55 ₽ (has odd kopecks)

		for (const months of [3, 6, 12, 24] as const) {
			const schedule = generate0PercentInstallmentSchedule(
				totalDebtKop,
				months,
				"2026-08-29T10:00:00.000Z",
			);

			assert.equal(schedule.length, months, `Should generate exactly ${months} payments`);

			const sumKopecks = schedule.reduce((acc, row) => acc + row.amountKopecks, 0);
			assert.equal(
				sumKopecks,
				totalDebtKop,
				`Sum of ${months}-month installment schedule must EXACTLY equal ${totalDebtKop} kop with 0 drift`,
			);
		}
	});

	it("5. WhatsApp Payment Reminder Message Generation", () => {
		const stages = createDefaultImplantStagesPreset(300000);
		const summary = calculatePatientDebtSummary(stages);
		const msg = generateDebtPaymentReminderMessage("Иванов И. И.", "DENTE", summary, "https://qr.nspk.ru/test-pay");

		assert.ok(msg.includes("Иванов И. И."), "Includes patient name");
		assert.ok(msg.includes("DENTE"), "Includes clinic name");
		assert.ok(msg.includes("300"), "Includes total cost");
		assert.ok(msg.includes("13% НДФЛ"), "Includes NDFL 13% notice");
		assert.ok(msg.includes("https://qr.nspk.ru/test-pay"), "Includes SBP QR payment link");
	});

	it("6. PatientInstallmentScheduleModal Component Rendering", () => {
		const stages = createDefaultImplantStagesPreset(300000);

		const html = renderToString(
			createElement(PatientInstallmentScheduleModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Иванов Иван Сергеевич",
				doctorName: "Д-р Смирнов А. В.",
				initialStages: stages,
			}),
		);

		assert.ok(html.includes("data-testid=\"patient-installment-schedule-modal\""), "Renders modal container");
		assert.ok(html.includes("data-testid=\"tab-clinical-stages\""), "Renders stages tab");
		assert.ok(html.includes("data-testid=\"tab-0-installments\""), "Renders installments tab");
		assert.ok(html.includes("data-testid=\"tab-fiscal-ndfl\""), "Renders fiscal ndfl tab");
		assert.ok(html.includes("data-testid=\"stage-item-stage-implant-surgery-1\""), "Renders surgery stage");
		assert.ok(html.includes("data-testid=\"stage-item-stage-implant-ortho-2\""), "Renders orthopedics stage");
		assert.ok(html.includes("data-testid=\"pay-stage-btn-stage-implant-surgery-1\""), "Renders 1-click pay stage button");
		assert.ok(html.includes("data-testid=\"copy-whatsapp-reminder-btn\""), "Renders WhatsApp copy button");
		assert.ok(html.includes("data-testid=\"print-schedule-btn\""), "Renders print button");
	});
});
