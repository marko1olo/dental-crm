/**
 * zReportAndWarranty.test.ts — Denominations, Z-report, 1-click stage checkout and 100% warranty.
 * Mandate 8b: <= 120 lines.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateDenominationsTotalRub,
	generateFiscalReceipt54Fz,
	generateShiftCloseZReport54Fz,
} from "../../fiscalReceiptEngine.js";
import { DEFAULT_TREATMENT_STAGES, generateFiscalReceiptPayload, validateCheckoutSplit } from "../../../payments/checkout/fastCheckoutEngine.js";
import type { TreatmentPlanItem } from "../../../treatment-plans/types.js";

describe("Fiscal Receipt Engine — Z-Report, Stages & Warranty", () => {
	it("calculates exact cash drawer amount from bill denominations and fractional coins", () => {
		const total = calculateDenominationsTotalRub({
			b5000: 3, b2000: 2, b1000: 5, b500: 4, b200: 5, b100: 8, b50: 3,
			c10: 4, c5: 6, c2: 3, c1: 4, coinsFractionalRub: 0.50,
		});
		assert.equal(total, 28030.50);
	});

	it("generates statutory shift close Z-report with POS, SBP QR, and advance offset reconciliation", () => {
		const zReport = generateShiftCloseZReport54Fz({
			shiftNumber: 42,
			cashierFullName: "Сидорова Анна Павловна",
			clinicLegalName: "ООО «ДЕНТЕ КЛИНИКА»",
			clinicInn: "7701234567",
			summary: {
				receivedRub: 145000.50, receivedCount: 6, cashRub: 25000.50,
				advanceRub: 10000, familyWalletRub: 15000, refundedRub: 5000, refundedCount: 1,
				byMethod: [
					{ method: "cash", amountRub: 25000.50, count: 2 },
					{ method: "card", amountRub: 80000, count: 3 },
					{ method: "online", amountRub: 40000, count: 1 },
				],
			},
		});
		assert.equal(zReport.shiftNumber, 42);
		assert.equal(zReport.incomeCount, 6);
		assert.equal(zReport.incomeTotalRub, 160000.5);
		assert.equal(zReport.cashInDrawerCalculatedRub, 25000.50);
	});

	it("handles 1-click stage checkout with exact kopeck allocation across payment methods", () => {
		const stage1 = DEFAULT_TREATMENT_STAGES[1]!;
		const sbpValidation = validateCheckoutSplit({
			orderId: "CHK-STG-1", totalBillKop: stage1.amountKop,
			payments: [{ method: "sbp_qr", amountKop: stage1.amountKop }],
		});
		assert.equal(sbpValidation.isValid, true);
		assert.equal(sbpValidation.remainingDueKop, 0);

		const cashValidation = validateCheckoutSplit({
			orderId: "CHK-STG-2", totalBillKop: stage1.amountKop,
			payments: [{ method: "cash", amountKop: stage1.amountKop }],
			cashTenderedKop: 500000,
		});
		assert.equal(cashValidation.isValid, true);
		assert.equal(cashValidation.cashChangeDueKop, 100000);
	});

	it("handles 100% warranty discount (0.00 ₽) generating internal warranty act without OFD transmission", () => {
		const warrantyItems: TreatmentPlanItem[] = [
			{
				id: "proc-warranty-1",
				toothNumber: 26,
				code804n: "A16.07.002.001",
				name: "Коррекция пломбы",
				category: "therapy",
				unitPriceRub: 4000,
				priceRub: 0,
				quantity: 1,
				discountRub: 4000,
				stageKind: "stage_1_therapy",
			},
		];
		const receipt = generateFiscalReceipt54Fz({
			items: warrantyItems, splitPayment: { cashRub: 0, cardRub: 0 },
			patientId: "patient-1", patientName: "Пациент", customerContact: "+7 (999) 000-11-22",
		});
		assert.equal(receipt.totalRub, 0);
		assert.equal(receipt.isWarrantyZeroAct, true);
		assert.ok(receipt.receiptNumber.startsWith("АКТ-ГАР-"));
		assert.equal(receipt.ofdUrl, "");
	});
});
