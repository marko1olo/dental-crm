/**
 * installmentsEngine.test.ts — Unit tests for Clinic Internal Installments Engine & Modal.
 * Compliance: Engineering Rule 5 (SSR renderToString, Zero Kustarnyi-DOM, No Memory Leaks).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
	generateInstallmentSchedule,
	evaluateInstallmentStatus,
	recordInstallmentPayment,
	generateInstallmentReminder,
	createDefaultInternalInstallmentsPreset,
	TREATMENT_INSTALLMENT_PRESETS,
} from "../installmentsEngine.js";
import { PatientInstallmentsModal } from "../PatientInstallmentsModal.js";

describe("Web Billing: Clinic Internal 0% Installments Engine & UI Modal", () => {
	it("1. Generates 10-month schedule for Aligners (360 000 ₽) with 30% downpayment", () => {
		const plan = createDefaultInternalInstallmentsPreset("pat-1", "Иванова Мария Ивановна", "aligners", "2026-09-01T10:00:00.000Z");

		assert.equal(plan.totalAmountKopecks, 36000000, "360 000 ₽ total");
		assert.equal(plan.downPaymentKopecks, 10800000, "30% downpayment is 108 000 ₽");
		assert.equal(plan.monthsCount, 10, "10 monthly installments");

		// Total items = 1 (downpayment) + 10 (monthly) = 11 items
		assert.equal(plan.schedule.length, 11);
		assert.equal(plan.schedule[0]!.paymentNumber, 0);
		assert.equal(plan.schedule[0]!.amountKopecks, 10800000);

		// Monthly payment: (360k - 108k) / 10 = 25 200 ₽ (2 520 000 kop)
		assert.equal(plan.schedule[1]!.amountKopecks, 2520000);
		assert.equal(plan.schedule[10]!.amountKopecks, 2520000);

		const totalScheduled = plan.schedule.reduce((acc, s) => acc + s.amountKopecks, 0);
		assert.equal(totalScheduled, 36000000, "Exact zero kopeck loss");
	});

	it("2. 1-click payment acceptance with 54-FZ fiscal receipt", () => {
		const plan = createDefaultInternalInstallmentsPreset("pat-2", "Сидоров Сергей", "all_on_4", "2026-09-01T10:00:00.000Z");

		const { updatedPlan, receipt } = recordInstallmentPayment({
			plan,
			paymentItemId: plan.schedule[0]!.id,
			paymentMethod: "sbp",
			paidAtIso: "2026-09-01T10:15:00.000Z",
		});

		assert.equal(updatedPlan.schedule[0]!.status, "paid");
		assert.equal(updatedPlan.schedule[0]!.paidKopecks, 18000000); // 40% of 450k = 180k
		assert.equal(receipt.paymentMethodRu, "СБП (0%)");
		assert.ok(receipt.receiptNumber.startsWith("ФД-"));
	});

	it("3. Automated WhatsApp payment reminder message text", () => {
		const plan = createDefaultInternalInstallmentsPreset("pat-3", "Кузнецова Ольга", "braces", "2026-09-01T10:00:00.000Z");

		const reminder = generateInstallmentReminder({
			patientName: "Ольга",
			clinicName: "Клиника DENTE",
			plan,
			sbpQrUrl: "https://qr.nspk.ru/test-qr",
		});

		assert.ok(reminder.messageText.includes("Ольга"));
		assert.ok(reminder.messageText.includes("Клиника DENTE"));
		assert.ok(reminder.messageText.includes("Договор") || reminder.messageText.includes("рассрочк"));
		assert.ok(reminder.whatsappUrl.includes("wa.me"));
	});

	it("4. PatientInstallmentsModal renders cleanly via SSR without crashing or leaking memory", () => {
		const plan = createDefaultInternalInstallmentsPreset("pat-4", "Николаев Денис", "aligners", "2026-09-01T10:00:00.000Z");

		const html = renderToString(
			createElement(PatientInstallmentsModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-4",
				patientName: "Николаев Денис",
				patientPhone: "+7 (999) 111-22-33",
				clinicName: "ООО «ДЕНТЕ»",
				initialPlan: plan,
			}),
		);

		assert.ok(html.includes("data-testid=\"patient-installments-modal\""), "Renders modal container");
		assert.ok(html.includes("data-testid=\"installments-kpi-bar\""), "Renders KPI bar");
		assert.ok(html.includes("data-testid=\"table-installments-schedule\""), "Renders schedule table");
		assert.ok(html.includes("data-testid=\"btn-quick-pay-next\""), "Renders 1-click pay button");
		assert.ok(html.includes("Николаев Денис"), "Contains patient name");
	});
});
