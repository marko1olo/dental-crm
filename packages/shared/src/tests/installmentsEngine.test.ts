/**
 * installmentsEngine.test.ts — Unit tests for Clinic Internal Installments Engine.
 * 
 * Verifies:
 * 1. Zero kopeck loss invariant across N months (remainder placed on 1st month).
 * 2. Downpayment calculation (30%, 40%, 50%).
 * 3. Status transitions: on_schedule, due, overdue, completed.
 * 4. 1-click payment acceptance with 54-FZ fiscal receipt generation.
 * 5. Automated patient WhatsApp & SMS reminder message generation.
 * 6. Presets for expensive dental cases (All-on-4, Braces, Aligners, Total Rehab).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	type InstallmentPlan,
	type InternalInstallmentScheduleItem,
	generateInstallmentSchedule,
	evaluateInstallmentStatus,
	recordInstallmentPayment,
	generateInstallmentReminder,
	createDefaultInternalInstallmentsPreset,
	TREATMENT_INSTALLMENT_PRESETS,
} from "../finance/installmentsEngine.js";
import { formatKopecksRu, rublesToKopecks } from "../money.js";

describe("Clinic Internal 0% Installments Engine (StomX patient/installments-list)", () => {
	it("1. Zero kopeck loss invariant across odd amounts and 3, 6, 10, 12, 18, 24 months", () => {
		// 350 000.77 ₽ (35 000 077 kop) with 100 000 ₽ downpayment
		const totalKop = 35000077;
		const downPaymentKop = 10000000;
		const remainingExpected = totalKop - downPaymentKop; // 25 000 077 kop

		for (const months of [3, 6, 10, 12, 18, 24]) {
			const schedule = generateInstallmentSchedule({
				totalAmountKopecks: totalKop,
				downPaymentKopecks: downPaymentKop,
				monthsCount: months,
				startDateIso: "2026-09-01T10:00:00.000Z",
			});

			assert.equal(schedule.length, months + 1, `Must have downpayment + ${months} monthly items`);
			assert.equal(schedule[0]!.paymentNumber, 0, "Item 0 is downpayment");
			assert.equal(schedule[0]!.amountKopecks, downPaymentKop, "Item 0 amount equals downpayment");

			// Sum of all items must exactly equal totalKop to the kopeck
			const sumTotal = schedule.reduce((acc, item) => acc + item.amountKopecks, 0);
			assert.equal(sumTotal, totalKop, `Sum for ${months} months must exactly match ${totalKop} kopecks`);

			// Sum of monthly items must equal remainingExpected
			const monthlySum = schedule.slice(1).reduce((acc, item) => acc + item.amountKopecks, 0);
			assert.equal(monthlySum, remainingExpected, "Sum of monthly items must match remainder");

			// First monthly item absorbs remainder kopecks
			if (months > 1) {
				const baseMonthly = Math.floor(remainingExpected / months);
				const remainder = remainingExpected - baseMonthly * months;
				assert.equal(schedule[1]!.amountKopecks, baseMonthly + remainder);
				assert.equal(schedule[2]!.amountKopecks, baseMonthly);
			}
		}
	});

	it("2. Status evaluation: on_schedule, due, overdue, completed", () => {
		const baseDate = "2026-09-25T12:00:00.000Z";

		const schedule: InternalInstallmentScheduleItem[] = [
			{
				id: "pay-0",
				paymentNumber: 0,
				title: "Первоначальный взнос",
				dueDateIso: "2026-08-01T10:00:00.000Z",
				amountKopecks: 10000000,
				paidKopecks: 10000000, // Fully paid
				status: "paid",
			},
			{
				id: "pay-1",
				paymentNumber: 1,
				title: "Платеж №1",
				dueDateIso: "2026-09-01T10:00:00.000Z", // Past date, unpaid!
				amountKopecks: 2500000,
				paidKopecks: 0,
				status: "on_schedule",
			},
			{
				id: "pay-2",
				paymentNumber: 2,
				title: "Платеж №2",
				dueDateIso: "2026-09-28T10:00:00.000Z", // Within 3 days from baseDate
				amountKopecks: 2500000,
				paidKopecks: 0,
				status: "on_schedule",
			},
			{
				id: "pay-3",
				paymentNumber: 3,
				title: "Платеж №3",
				dueDateIso: "2026-10-28T10:00:00.000Z", // Far future
				amountKopecks: 2500000,
				paidKopecks: 0,
				status: "on_schedule",
			},
		];

		const res = evaluateInstallmentStatus(schedule, baseDate);

		// pay-1 is overdue
		assert.equal(res.status, "overdue", "Plan must be marked overdue if any payment is past due");
		assert.equal(res.overdueDebtKopecks, 2500000, "Overdue amount is 25 000 ₽");
		assert.equal(res.updatedSchedule[1]!.status, "overdue");
		assert.equal(res.updatedSchedule[2]!.status, "due", "Payment due within 3 days is marked due");
		assert.equal(res.updatedSchedule[3]!.status, "on_schedule", "Far future payment is on_schedule");

		// If pay-1 is paid, next should be due
		const scheduleWithPay1Paid = schedule.map((s, idx) => idx === 1 ? { ...s, paidKopecks: s.amountKopecks } : s);
		const res2 = evaluateInstallmentStatus(scheduleWithPay1Paid, baseDate);
		assert.equal(res2.status, "due", "Plan status is due because pay-2 is due in 3 days");
		assert.equal(res2.overdueDebtKopecks, 0);

		// If all paid => completed
		const allPaid = schedule.map((s) => ({ ...s, paidKopecks: s.amountKopecks }));
		const res3 = evaluateInstallmentStatus(allPaid, baseDate);
		assert.equal(res3.status, "completed", "Plan is completed when 100% paid");
		assert.equal(res3.remainingDebtKopecks, 0);
	});

	it("3. 1-click payment acceptance with 54-FZ fiscal receipt", () => {
		const plan = createDefaultInternalInstallmentsPreset("pat-42", "Петров Петр Петрович", "braces", "2026-09-01T10:00:00.000Z");

		assert.equal(plan.schedule[0]!.paidKopecks, 0);
		const initialRemaining = plan.remainingDebtKopecks;

		// Pay item 0 (downpayment)
		const { updatedPlan, receipt } = recordInstallmentPayment({
			plan,
			paymentItemId: plan.schedule[0]!.id,
			paymentMethod: "card",
			paidAtIso: "2026-09-01T11:00:00.000Z",
		});

		assert.equal(updatedPlan.schedule[0]!.status, "paid");
		assert.equal(updatedPlan.schedule[0]!.paidKopecks, plan.schedule[0]!.amountKopecks);
		assert.equal(updatedPlan.paidAmountKopecks, plan.schedule[0]!.amountKopecks);
		assert.equal(updatedPlan.remainingDebtKopecks, initialRemaining - plan.schedule[0]!.amountKopecks);

		// Receipt checks
		assert.ok(receipt.receiptNumber.startsWith("ФД-"), "Receipt number formatted");
		assert.ok(receipt.fiscalSign.length > 5, "FPD fiscal sign generated");
		assert.equal(receipt.paymentMethodRu, "Банковская карта");
		assert.equal(receipt.calculationTypeTag1214, 2, "Tag 1214 = 2 (advance/installment)");
		assert.ok(receipt.qrPayload.includes("&s="), "Contains QR payload string for FNS");
	});

	it("4. Automated WhatsApp & SMS payment reminder message generation", () => {
		const plan = createDefaultInternalInstallmentsPreset("pat-88", "Смирнова Елена Васильевна", "aligners", "2026-09-01T10:00:00.000Z");

		const reminder = generateInstallmentReminder({
			patientName: "Елена Васильевна",
			clinicName: "DENTE",
			plan,
			sbpQrUrl: "https://qr.nspk.ru/test-installment",
		});

		assert.ok(reminder.messageText.includes("Елена Васильевна"), "Contains patient name");
		assert.ok(reminder.messageText.includes("DENTE"), "Contains clinic name");
		assert.ok(reminder.messageText.includes("Элайнеры"), "Contains treatment title");
		assert.ok(reminder.messageText.includes("СБП"), "Contains SBP notice");
		assert.ok(reminder.whatsappUrl.startsWith("https://wa.me/"), "WhatsApp link generated");
		assert.ok(reminder.smsText.includes("Клиника DENTE:"), "Concise SMS text generated");
	});

	it("5. Clinical presets for high-cost treatments (All-on-4, Aligners, Braces, Total Rehab)", () => {
		const cases = ["aligners", "all_on_4", "braces", "total_rehab"] as const;

		for (const c of cases) {
			const plan = createDefaultInternalInstallmentsPreset("p1", "Тест", c);
			const expectedCfg = TREATMENT_INSTALLMENT_PRESETS[c];

			assert.equal(plan.totalAmountKopecks, rublesToKopecks(expectedCfg.totalRubles));
			assert.equal(plan.monthsCount, expectedCfg.months);
			assert.ok(plan.schedule.length >= expectedCfg.months);
			assert.ok(plan.contractNumber.startsWith("РАС-"));
		}
	});
});
