/**
 * taxCertificateAndRefund.test.ts — Tax deduction breakdown and refund receipt upon cancellation.
 * Mandate 8b: <= 120 lines.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateProportionalRefundAllocation,
	calculateTaxDeductionBreakdown,
	generateFiscalReceipt54Fz,
	generateFiscalRefundReceipt54Fz,
	generateTaxDeductionCertificate,
} from "../../fiscalReceiptEngine.js";
import type { TreatmentPlanItem } from "../../../treatment-plans/types.js";

describe("Fiscal Receipt Engine — Tax Certificate & Refund", () => {
	const sampleItems: TreatmentPlanItem[] = [
		{
			id: "1",
			toothNumber: 16,
			code804n: "A16.07.002.001",
			name: "Кариес",
			priceRub: 4000,
			unitPriceRub: 4000,
			discountRub: 0,
			quantity: 1,
			category: "Терапия",
			stageKind: "stage_1_therapy",
		},
		{
			id: "2",
			toothNumber: 36,
			code804n: "A16.07.054.001",
			name: "Имплантация",
			priceRub: 45000,
			unitPriceRub: 45000,
			discountRub: 0,
			quantity: 1,
			category: "Хирургия",
			stageKind: "stage_2_surgery",
		},
	];

	it("calculates tax deduction breakdown: Code 01 standard vs Code 02 expensive unlimited", () => {
		const breakdown = calculateTaxDeductionBreakdown(sampleItems);
		assert.equal(breakdown.code01Rub, 4000);
		assert.equal(breakdown.code02Rub, 45000);
		assert.equal(breakdown.totalRub, 49000);
		assert.equal(breakdown.refund13EstimateRub, 6370);
	});

	it("generates tax deduction certificate KND 1151156 with payer relationships", () => {
		const receipt = generateFiscalReceipt54Fz({
			items: sampleItems,
			splitPayment: { cardRub: 49000 },
			patientId: "pat-1",
			patientName: "Иванов И. И.",
			customerContact: "+7 (999) 000-00-00",
		});
		const cert = generateTaxDeductionCertificate({
			receipt,
			payerFullName: "Иванова М. С.",
			payerRelationship: "spouse",
			taxYear: 2026,
		});
		assert.equal(cert.payerRelationshipCode, "2");
		assert.equal(cert.taxYear, 2026);
		assert.equal(cert.breakdown.totalRub, 49000);
	});

	it("generates refund receipt upon cancellation of stage with exact kopeck math", () => {
		const refundItems: TreatmentPlanItem[] = [sampleItems[0]!];
		const refundReceipt = generateFiscalRefundReceipt54Fz({
			items: refundItems,
			originalReceipt: {
				receiptNumber: "ЧЕК-2026-0001",
				patientId: "pat-1",
				patientName: "Иванов И. И.",
				customerContact: "+7 (999) 000-00-00",
			},
			refundReason: "Отказ от части услуг",
		});
		assert.equal(refundReceipt.operationType, "income_return");
		assert.equal(refundReceipt.totalRub, 4000);
		assert.equal(refundReceipt.totalKopecks, 400000);
	});
});
