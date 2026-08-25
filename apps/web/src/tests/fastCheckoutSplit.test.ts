/**
 * DENTE Dental CRM — Fast Checkout Split-Payment Balancer & 1-Click Cash Fill Test Suite
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildFiscalReceiptPayloadSignature,
	createFiscalCompositeIdempotencyKey,
	verifyFiscalCompositeIdempotencyKey,
} from "@dental/shared";
import {
	balanceRemainderToSplitMethod,
	calculateCashChangeKop,
	calculateSplitRemainingKop,
	calculateStageAdvanceAmount,
	generate54FzFiscalPayload,
	paymentsToSplitState,
	splitStateToCheckoutPayments,
	validateCheckoutSplit,
	type CheckoutSplitItem,
	type FastCheckoutInput,
} from "../components/payments/checkout/fastCheckoutEngine";

describe("Fast Checkout Split-Payment Balancer & 1-Click Cash Fill Suite", () => {
	const TOTAL_BILL_KOP = 450000; // 4 500.00 ₽

	describe("1. Multi-Tender Split Conversion & State Helpers", () => {
		it("converts rubles split state to kopeck CheckoutSplitItem array accurately", () => {
			const payments = splitStateToCheckoutPayments({
				cardRub: 3000,
				cashRub: 1500,
			});

			assert.equal(payments.length, 2);
			assert.deepEqual(payments, [
				{ method: "bank_card", amountKop: 300000 },
				{ method: "cash", amountKop: 150000 },
			]);
		});

		it("filters out zero and negative split amounts", () => {
			const payments = splitStateToCheckoutPayments({
				cardRub: 2000,
				cashRub: 0,
				sbpRub: -500,
				depositRub: 2500,
			});

			assert.equal(payments.length, 2);
			assert.deepEqual(payments, [
				{ method: "bank_card", amountKop: 200000 },
				{ method: "patient_deposit", amountKop: 250000 },
			]);
		});

		it("converts payments array back to split state in rubles with 2 decimals", () => {
			const payments: CheckoutSplitItem[] = [
				{ method: "bank_card", amountKop: 200050 }, // 2000.50 ₽
				{ method: "sbp_qr", amountKop: 149950 }, // 1499.50 ₽
				{ method: "loyalty_points", amountKop: 100000 }, // 1000.00 ₽
			];

			const state = paymentsToSplitState(payments);
			assert.equal(state.cardRub, 2000.5);
			assert.equal(state.sbpRub, 1499.5);
			assert.equal(state.loyaltyRub, 1000);
			assert.equal(state.cashRub, 0);
			assert.equal(state.depositRub, 0);
		});
	});

	describe("2. 1-Click Remainder Balancer Math", () => {
		it("calculates remaining unallocated kopecks correctly", () => {
			const payments: CheckoutSplitItem[] = [
				{ method: "bank_card", amountKop: 300000 }, // 3 000.00 ₽
			];
			const remainingKop = calculateSplitRemainingKop(TOTAL_BILL_KOP, payments);
			assert.equal(remainingKop, 150000); // 1 500.00 ₽
		});

		it("balances remainder to Cash: entering 3 000 ₽ card fills 1 500 ₽ cash", () => {
			const currentPayments: CheckoutSplitItem[] = [
				{ method: "bank_card", amountKop: 300000 },
			];
			const balanced = balanceRemainderToSplitMethod({
				totalBillKop: TOTAL_BILL_KOP,
				currentPayments,
				targetMethod: "cash",
			});

			assert.equal(balanced.length, 2);
			assert.deepEqual(balanced, [
				{ method: "bank_card", amountKop: 300000 },
				{ method: "cash", amountKop: 150000 },
			]);
			assert.equal(calculateSplitRemainingKop(TOTAL_BILL_KOP, balanced), 0);
		});

		it("balances remainder to Card: entering 1 000 ₽ SBP + 500 ₽ loyalty fills 3 000 ₽ card", () => {
			const currentPayments: CheckoutSplitItem[] = [
				{ method: "sbp_qr", amountKop: 100000 },
				{ method: "loyalty_points", amountKop: 50000 },
			];
			const balanced = balanceRemainderToSplitMethod({
				totalBillKop: TOTAL_BILL_KOP,
				currentPayments,
				targetMethod: "bank_card",
			});

			assert.equal(balanced.length, 3);
			assert.deepEqual(balanced, [
				{ method: "sbp_qr", amountKop: 100000 },
				{ method: "loyalty_points", amountKop: 50000 },
				{ method: "bank_card", amountKop: 300000 },
			]);
			assert.equal(calculateSplitRemainingKop(TOTAL_BILL_KOP, balanced), 0);
		});

		it("updates existing targetMethod amount if target is already in the split list", () => {
			// Initially: Card 2000 ₽, Cash 1000 ₽ on 4500 ₽ bill (remaining = 1500 ₽)
			// User clicks [+ в Нал] -> Cash becomes 1000 + 1500 = 2500 ₽
			const currentPayments: CheckoutSplitItem[] = [
				{ method: "bank_card", amountKop: 200000 },
				{ method: "cash", amountKop: 100000 },
			];
			const balanced = balanceRemainderToSplitMethod({
				totalBillKop: TOTAL_BILL_KOP,
				currentPayments,
				targetMethod: "cash",
			});

			assert.equal(balanced.length, 2);
			assert.deepEqual(balanced, [
				{ method: "bank_card", amountKop: 200000 },
				{ method: "cash", amountKop: 250000 }, // 4500 - 2000 = 2500
			]);
			assert.equal(calculateSplitRemainingKop(TOTAL_BILL_KOP, balanced), 0);
		});
	});

	describe("3. Cash Change Calculation on Partial Cash Split", () => {
		it("calculates exact cash change when cash is part of a split payment", () => {
			// Total bill: 4 500 ₽ (Card 3 000 ₽ + Cash 1 500 ₽)
			// Customer gives a 2 000 ₽ banknote for the cash portion
			const res = calculateCashChangeKop(200000, 150000);
			assert.equal(res.isUnderpaid, false);
			assert.equal(res.changeDueKop, 50000); // 500.00 ₽ change
			assert.equal(res.missingKop, 0);
		});

		it("returns 0 change when exact cash amount is tendered", () => {
			const res = calculateCashChangeKop(150000, 150000);
			assert.equal(res.isUnderpaid, false);
			assert.equal(res.changeDueKop, 0);
			assert.equal(res.missingKop, 0);
		});

		it("detects underpaid cash when tendered amount is less than cash tender requirement", () => {
			const res = calculateCashChangeKop(100000, 150000);
			assert.equal(res.isUnderpaid, true);
			assert.equal(res.missingKop, 50000); // 500.00 ₽ missing
			assert.equal(res.changeDueKop, 0);
		});
	});

	describe("4. 100% Split Check Balance Validation (Kopeck-Exact)", () => {
		it("passes validation when split sum matches total bill exactly down to kopecks", () => {
			const input: FastCheckoutInput = {
				orderId: "CHK-SPLIT-001",
				totalBillKop: 450050, // 4 500.50 ₽
				payments: [
					{ method: "bank_card", amountKop: 300025 },
					{ method: "cash", amountKop: 150025 },
				],
				cashTenderedKop: 200000, // Gave 2 000.00 ₽ for the 1 500.25 ₽ cash part
			};

			const val = validateCheckoutSplit(input);
			assert.equal(val.isValid, true);
			assert.equal(val.totalPaidKop, 450050);
			assert.equal(val.remainingDueKop, 0);
			assert.equal(val.cashChangeDueKop, 49975); // 499.75 ₽ change
		});

		it("fails validation on underpayment by 1 kopeck", () => {
			const input: FastCheckoutInput = {
				orderId: "CHK-SPLIT-002",
				totalBillKop: 450000,
				payments: [
					{ method: "bank_card", amountKop: 300000 },
					{ method: "cash", amountKop: 149999 }, // 1 kopeck short
				],
			};

			const val = validateCheckoutSplit(input);
			assert.equal(val.isValid, false);
			assert.equal(val.remainingDueKop, 1);
			assert.match(val.errorMessageRu ?? "", /Недоплата: 0.01 ₽/);
		});

		it("fails validation on non-cash overpayment by 1 kopeck", () => {
			const input: FastCheckoutInput = {
				orderId: "CHK-SPLIT-003",
				totalBillKop: 450000,
				payments: [
					{ method: "bank_card", amountKop: 300001 }, // 1 kopeck over
					{ method: "cash", amountKop: 150000 },
				],
			};

			const val = validateCheckoutSplit(input);
			assert.equal(val.isValid, false);
			assert.equal(val.remainingDueKop, -1);
			assert.match(val.errorMessageRu ?? "", /Переплата/);
		});
	});

	describe("5. 54-FZ FFD 1.2 Statutory Payload & Idempotency Protection", () => {
		it("generates correct FFD 1.2 tags for split payments", () => {
			const input: FastCheckoutInput = {
				orderId: "CHK-SPLIT-004",
				totalBillKop: 9400000, // 94 000.00 ₽
				payments: [
					{ method: "cash", amountKop: 1400000 }, // Tag 1031 (Наличные)
					{ method: "bank_card", amountKop: 4000000 }, // Tag 1081 (Безналичные)
					{ method: "sbp_qr", amountKop: 2000000 }, // Tag 1081 (Безналичные)
					{ method: "patient_deposit", amountKop: 1000000 }, // Tag 1215 (Зачет аванса)
					{ method: "loyalty_points", amountKop: 1000000 }, // Tag 1216 (Иная форма/бонусы)
				],
				patientPhone: "+7 (999) 000-11-22",
			};

			const payload = generate54FzFiscalPayload(input);
			assert.equal(payload.ffdVersion, "1.2");
			assert.equal(payload.totalSumKop, 9400000);
			assert.equal(payload.paymentsDistribution.cashKop, 1400000); // Tag 1031
			assert.equal(payload.paymentsDistribution.electronicKop, 6000000); // Tag 1081 (40k card + 20k SBP)
			assert.equal(payload.paymentsDistribution.advancePrepaymentKop, 1000000); // Tag 1215
			assert.equal(payload.paymentsDistribution.barterOtherKop, 1000000); // Tag 1216 / Barter
			assert.equal(payload.clientContact, "+7 (999) 000-11-22");
		});

		it("generates and verifies composite Idempotency-Key for fast checkout double-click prevention", () => {
			const rawUuid = "550e8400-e29b-41d4-a716-446655440000";
			const signature = buildFiscalReceiptPayloadSignature({
				patientId: "CHK-SPLIT-005",
				operationType: "income",
				taxationSystem: "usn_income",
				totalKopecks: 450000,
				cashKopecks: 150000,
				electronicCardKopecks: 300000,
				items: [
					{
						name: "Стоматологические услуги по плану лечения",
						priceKopecks: 450000,
						quantity: 1,
						amountKopecks: 450000,
					},
				],
			});

			const compositeKey = createFiscalCompositeIdempotencyKey(rawUuid, signature);
			assert.match(compositeKey, /^550e8400-e29b-41d4-a716-446655440000#[0-9a-f]{64}$/);

			const verification = verifyFiscalCompositeIdempotencyKey(compositeKey, signature);
			assert.equal(verification.isValid, true);
			assert.equal(verification.uuid, rawUuid);

			// Passing idempotencyKey to generate54FzFiscalPayload embeds it
			const payload = generate54FzFiscalPayload(
				{
					orderId: "CHK-SPLIT-005",
					totalBillKop: 450000,
					payments: [
						{ method: "bank_card", amountKop: 300000 },
						{ method: "cash", amountKop: 150000 },
					],
				},
				{
					idempotencyKey: compositeKey,
				}
			);
			assert.equal(payload.idempotencyKey, compositeKey);
		});
	});
});
