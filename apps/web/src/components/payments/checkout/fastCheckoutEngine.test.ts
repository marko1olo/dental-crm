import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateStageAdvanceAmount,
	generate54FzFiscalPayload,
	validateCheckoutSplit,
	type FastCheckoutInput,
} from "./fastCheckoutEngine";

describe("fastCheckoutEngine & 54-FZ Tag 1215 Suite", () => {
	const STAGE_AMOUNT_KOP = 4500000; // 45 000.00 ₽ (например, этап хирургии / ортопедии)

	describe("1. calculateStageAdvanceAmount Modes", () => {
		it("calculates 100% full stage payment correctly (Tag 1214 = 4)", () => {
			const res = calculateStageAdvanceAmount(STAGE_AMOUNT_KOP, "full");
			assert.equal(res.mode, "full");
			assert.equal(res.totalStageAmountKop, 4500000);
			assert.equal(res.requiredAmountKop, 4500000);
			assert.equal(res.advanceOffsetTag1215Kop, 0);
			assert.equal(res.ffdTag1214, 4); // Полный расчет
			assert.equal(res.isAdvanceReceipt, false);
			assert.equal(res.isAdvanceOffsetReceipt, false);
		});

		it("calculates 30% partial prepayment (Tag 1214 = 2)", () => {
			const res = calculateStageAdvanceAmount(STAGE_AMOUNT_KOP, "advance_30");
			assert.equal(res.mode, "advance_30");
			assert.equal(res.requiredAmountKop, 1350000); // 13 500.00 ₽
			assert.equal(res.remainingDueKop, 3150000);
			assert.equal(res.ffdTag1214, 2); // Частичная предоплата
			assert.equal(res.isAdvanceReceipt, true);
		});

		it("calculates 50% partial prepayment (Tag 1214 = 2)", () => {
			const res = calculateStageAdvanceAmount(STAGE_AMOUNT_KOP, "advance_50");
			assert.equal(res.mode, "advance_50");
			assert.equal(res.requiredAmountKop, 2250000); // 22 500.00 ₽
			assert.equal(res.remainingDueKop, 2250000);
			assert.equal(res.ffdTag1214, 2); // Частичная предоплата
			assert.equal(res.isAdvanceReceipt, true);
		});

		it("calculates stage completion with Tag 1215 advance offset", () => {
			// Ранее пациент внес 13 500 ₽ аванса. Сейчас этап сдается, доплата 31 500 ₽
			const previouslyPaidKop = 1350000;
			const res = calculateStageAdvanceAmount(
				STAGE_AMOUNT_KOP,
				"advance_offset_tag1215",
				previouslyPaidKop
			);
			assert.equal(res.mode, "advance_offset_tag1215");
			assert.equal(res.totalStageAmountKop, 4500000);
			assert.equal(res.advanceOffsetTag1215Kop, 1350000); // Тег 1215
			assert.equal(res.requiredAmountKop, 3150000); // К доплате
			assert.equal(res.ffdTag1214, 4); // Полный расчет с зачетом аванса
			assert.equal(res.isAdvanceOffsetReceipt, true);
		});
	});

	describe("2. generate54FzFiscalPayload with Tag 1215 Prepayment Offset", () => {
		it("generates correct FFD 1.2 payload for advance offset + card remainder", () => {
			const input: FastCheckoutInput = {
				orderId: "ORD-9912",
				totalBillKop: 4500000,
				payments: [
					{ method: "patient_deposit", amountKop: 1350000 }, // Тег 1215 (Зачет аванса)
					{ method: "bank_card", amountKop: 3150000 }, // Тег 1081 (Безналичные)
				],
				patientPhone: "+79991234567",
			};

			const payload = generate54FzFiscalPayload(input, {
				paymentMethodTag1214: 4,
				paymentSubjectTag1212: 4,
			});

			assert.equal(payload.ffdVersion, "1.2");
			assert.equal(payload.orderId, "ORD-9912");
			assert.equal(payload.totalSumKop, 4500000);
			assert.equal(payload.paymentMethodTag1214, 4);
			assert.equal(payload.paymentSubjectTag1212, 4);
			assert.equal(payload.paymentsDistribution.advancePrepaymentKop, 1350000); // Тег 1215
			assert.equal(payload.paymentsDistribution.electronicKop, 3150000); // Тег 1081
			assert.equal(payload.paymentsDistribution.cashKop, 0);
		});
	});

	describe("3. validateCheckoutSplit", () => {
		it("validates exact split balance without errors", () => {
			const input: FastCheckoutInput = {
				orderId: "ORD-1",
				totalBillKop: 4500000,
				payments: [
					{ method: "patient_deposit", amountKop: 1350000 },
					{ method: "sbp_qr", amountKop: 3150000 },
				],
			};
			const res = validateCheckoutSplit(input);
			assert.equal(res.isValid, true);
			assert.equal(res.remainingDueKop, 0);
		});

		it("detects underpayment accurately", () => {
			const input: FastCheckoutInput = {
				orderId: "ORD-2",
				totalBillKop: 4500000,
				payments: [{ method: "cash", amountKop: 4000000 }],
			};
			const res = validateCheckoutSplit(input);
			assert.equal(res.isValid, false);
			assert.equal(res.remainingDueKop, 500000);
		});
	});
});
