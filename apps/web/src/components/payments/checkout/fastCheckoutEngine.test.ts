import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateStageAdvanceAmount,
	calculateFastCheckoutDiscount,
	applyQuickCheckoutPreset,
	generate54FzFiscalPayload,
	validateBuyerInn,
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

		it("omits Tag 1228 (buyerInn) for physical persons even if non-empty string provided", () => {
			const input: FastCheckoutInput = {
				orderId: "ORD-9913",
				totalBillKop: 100000,
				payments: [{ method: "bank_card", amountKop: 100000 }],
				clientType: "physical_person",
				buyerInn: "770123456789",
			};
			const payload = generate54FzFiscalPayload(input);
			assert.equal(payload.buyerInn, undefined, "Tag 1228 must be undefined for physical persons");
		});

		it("includes Tag 1228 (buyerInn) for legal entity / B2B transactions", () => {
			const input: FastCheckoutInput = {
				orderId: "ORD-9914",
				totalBillKop: 5000000,
				payments: [{ method: "bank_card", amountKop: 5000000 }],
				clientType: "legal_entity",
				buyerInn: "7701234567",
			};
			const payload = generate54FzFiscalPayload(input);
			assert.equal(payload.buyerInn, "7701234567");
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

		it("allows 0 ₽ total bill (Mandate 8e: 100% warranty rework / staff discount)", () => {
			const input: FastCheckoutInput = {
				orderId: "ORD-WARRANTY-ZERO",
				totalBillKop: 0,
				payments: [],
				clientType: "physical_person",
			};
			const res = validateCheckoutSplit(input);
			assert.equal(res.isValid, true, "0 ₽ bill for warranty rework must be valid");
			assert.equal(res.remainingDueKop, 0);
		});
	});

	describe("4. 54-FZ Buyer INN Verification (Mandate 8e: Zero obstacle for physical persons)", () => {
		it("accepts physical persons paying without INN (FFD 1.2 Tag 1228 is B2B-only)", () => {
			const input: FastCheckoutInput = {
				orderId: "ORD-PHYS-1",
				totalBillKop: 250000,
				payments: [{ method: "bank_card", amountKop: 250000 }],
				clientType: "physical_person",
				buyerInn: "", // Empty INN for patient
			};
			const res = validateCheckoutSplit(input);
			assert.equal(res.isValid, true);
		});

		it("never blocks checkout for physical persons even if INN is incomplete or non-12 digits", () => {
			const innResShort = validateBuyerInn({ clientType: "physical_person", buyerInn: "12345" });
			assert.equal(innResShort.isValid, true, "Physical person INN must never block validation");
			assert.equal(innResShort.isRequired, false);

			const input: FastCheckoutInput = {
				orderId: "ORD-PHYS-2",
				totalBillKop: 150000,
				payments: [{ method: "bank_card", amountKop: 150000 }],
				clientType: "physical_person",
				buyerInn: "12345",
			};
			const res = validateCheckoutSplit(input);
			assert.equal(res.isValid, true, "Checkout split must remain valid even with short INN");
		});

		it("requires valid 10-digit INN for legal entities", () => {
			const invalidInput: FastCheckoutInput = {
				orderId: "ORD-B2B-1",
				totalBillKop: 250000,
				payments: [{ method: "bank_card", amountKop: 250000 }],
				clientType: "legal_entity",
				buyerInn: "123", // Too short
			};
			const resInvalid = validateCheckoutSplit(invalidInput);
			assert.equal(resInvalid.isValid, false);
			assert.ok(resInvalid.errorMessageRu?.includes("10 цифр"));

			const validInput: FastCheckoutInput = {
				orderId: "ORD-B2B-2",
				totalBillKop: 250000,
				payments: [{ method: "bank_card", amountKop: 250000 }],
				clientType: "legal_entity",
				buyerInn: "7701234567",
			};
			const resValid = validateCheckoutSplit(validInput);
			assert.equal(resValid.isValid, true);
		});
	});

	describe("5. Doctor Discount & Warranty Autonomy (Mandate 8e)", () => {
		const GROSS_KOP = 1258050; // 12 580.50 ₽

		it("calculates 100% warranty discount (due 0 ₽) without admin password", () => {
			const res = calculateFastCheckoutDiscount({
				grossKop: GROSS_KOP,
				preset: "warranty_100",
			});
			assert.equal(res.grossKop, GROSS_KOP);
			assert.equal(res.discountKop, GROSS_KOP);
			assert.equal(res.netKop, 0);
			assert.equal(res.effectivePercent, 100);
		});

		it("calculates 100% staff / colleague discount (due 0 ₽)", () => {
			const res = calculateFastCheckoutDiscount({
				grossKop: GROSS_KOP,
				preset: "colleague_100",
			});
			assert.equal(res.netKop, 0);
			assert.equal(res.discountKop, GROSS_KOP);
			assert.equal(res.effectivePercent, 100);
		});

		it("calculates round_hundreds discount in patient favor", () => {
			// 12 580.50 ₽ -> rounds down to 12 500.00 ₽ (discount 80.50 ₽ = 8050 kop)
			const res = calculateFastCheckoutDiscount({
				grossKop: GROSS_KOP,
				preset: "round_hundreds",
			});
			assert.equal(res.netKop, 1250000);
			assert.equal(res.discountKop, 8050);
		});

		it("calculates 5% and 10% presets accurately in integer kopecks", () => {
			const res5 = calculateFastCheckoutDiscount({
				grossKop: 100000, // 1000.00 ₽
				preset: "discount_5",
			});
			assert.equal(res5.discountKop, 5000);
			assert.equal(res5.netKop, 95000);

			const res10 = calculateFastCheckoutDiscount({
				grossKop: 100000,
				preset: "discount_10",
			});
			assert.equal(res10.discountKop, 10000);
			assert.equal(res10.netKop, 90000);
		});

		it("calculates manual percentage discount accurately", () => {
			const res = calculateFastCheckoutDiscount({
				grossKop: 100000,
				preset: "manual_percent",
				customPercent: 15,
			});
			assert.equal(res.discountKop, 15000);
			assert.equal(res.netKop, 85000);
		});
	});

	describe("6. 1-Click Split Presets (Exact kopecks, no float drift)", () => {
		it("calculates split_50_50 cleanly for odd kopeck total", () => {
			const res = applyQuickCheckoutPreset({
				totalBillKop: 100001, // 1000.01 ₽
				preset: "split_50_50",
			});
			assert.equal(res.payments.length, 2);
			const card = res.payments.find((p) => p.method === "bank_card")!;
			const cash = res.payments.find((p) => p.method === "cash")!;
			assert.equal(card.amountKop + cash.amountKop, 100001, "Sum of split must equal exact total");
			assert.equal(card.amountKop, 50000);
			assert.equal(cash.amountKop, 50001);
		});

		it("calculates use_deposit with card remainder when deposit is partial", () => {
			const res = applyQuickCheckoutPreset({
				totalBillKop: 1000000, // 10 000 ₽
				preset: "use_deposit",
				availableDepositKop: 300000, // 3 000 ₽
			});
			assert.equal(res.payments.length, 2);
			const dep = res.payments.find((p) => p.method === "patient_deposit")!;
			const card = res.payments.find((p) => p.method === "bank_card")!;
			assert.equal(dep.amountKop, 300000);
			assert.equal(card.amountKop, 700000);
		});
	});
});

