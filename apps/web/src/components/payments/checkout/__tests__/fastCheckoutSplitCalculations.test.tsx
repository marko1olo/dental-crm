/**
 * fastCheckoutSplitCalculations.test.tsx
 *
 * Unit tests for Fast Checkout Math, Split State Conversion & 1-Click Autobalance:
 * - Mandate 8e: Doctor & Staff Autonomy (1-click auto-balance, zero unnecessary manual arithmetic)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No roadblocks, cash change, physical persons without INN)
 * - Mandate 8o: Scope-bounded verifiable assertions
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	balanceRemainderToSplitMethod,
	calculateSplitRemainingKop,
	paymentsToSplitState,
	splitStateToCheckoutPayments,
	validateCheckoutSplit,
} from "../fastCheckoutEngine.js";

describe("Fast Checkout Split Calculations & Math Autonomy (Mandates 8e, 8n)", () => {
	it("1. splitStateToCheckoutPayments: transforms partial split state to integer kopecks items", () => {
		const payments = splitStateToCheckoutPayments({
			cardRub: 1500,
			cashRub: 500,
			sbpRub: 350.5,
			depositRub: 200,
			loyaltyRub: 100,
			dmsRub: 0,
		});

		assert.equal(payments.length, 5);
		assert.deepEqual(payments[0], { method: "bank_card", amountKop: 150000 });
		assert.deepEqual(payments[1], { method: "cash", amountKop: 50000 });
		assert.deepEqual(payments[2], { method: "sbp_qr", amountKop: 35050 });
		assert.deepEqual(payments[3], { method: "patient_deposit", amountKop: 20000 });
		assert.deepEqual(payments[4], { method: "loyalty_points", amountKop: 10000 });

		// Zero amounts are pruned
		const emptyPayments = splitStateToCheckoutPayments({
			cardRub: 0,
			cashRub: 0,
			sbpRub: 0,
		});
		assert.equal(emptyPayments.length, 0);

		// Prunes undefined/empty object
		const defaultPayments = splitStateToCheckoutPayments({});
		assert.equal(defaultPayments.length, 0);
	});

	it("2. paymentsToSplitState: converts kopeck items back to ruble amounts accurately", () => {
		const state = paymentsToSplitState([
			{ method: "bank_card", amountKop: 250050 },
			{ method: "cash", amountKop: 100000 },
			{ method: "sbp_qr", amountKop: 50000 },
			{ method: "patient_deposit", amountKop: 30000 },
			{ method: "loyalty_points", amountKop: 15000 },
			{ method: "dms_insurance", amountKop: 75000 },
		]);

		assert.equal(state.cardRub, 2500.5);
		assert.equal(state.cashRub, 1000);
		assert.equal(state.sbpRub, 500);
		assert.equal(state.depositRub, 300);
		assert.equal(state.loyaltyRub, 150);
		assert.equal(state.dmsRub, 750);
	});

	it("3. calculateSplitRemainingKop: calculates remaining unallocated deficit accurately", () => {
		const totalBillKop = 500000; // 5 000.00 ₽

		// Case A: Partial payment leaves positive deficit
		const remainingA = calculateSplitRemainingKop(totalBillKop, [
			{ method: "bank_card", amountKop: 200000 },
			{ method: "cash", amountKop: 100000 },
		]);
		assert.equal(remainingA, 200000); // 2 000.00 ₽ remaining

		// Case B: Full payment leaves 0
		const remainingB = calculateSplitRemainingKop(totalBillKop, [
			{ method: "bank_card", amountKop: 500000 },
		]);
		assert.equal(remainingB, 0);

		// Case C: Overpayment leaves negative value
		const remainingC = calculateSplitRemainingKop(totalBillKop, [
			{ method: "bank_card", amountKop: 600000 },
		]);
		assert.equal(remainingC, -100000);
	});

	it("4. balanceRemainderToSplitMethod: 1-Click discrepancy balancer (Mandates 8e, 8n)", () => {
		const totalBillKop = 600000; // 6 000.00 ₽
		const partialPayments = [
			{ method: "cash" as const, amountKop: 200000 },
		];

		// 1-Click balance to card
		const balancedToCard = balanceRemainderToSplitMethod({
			totalBillKop,
			currentPayments: partialPayments,
			targetMethod: "bank_card",
		});

		assert.equal(balancedToCard.length, 2);
		assert.deepEqual(balancedToCard[0], { method: "cash", amountKop: 200000 });
		assert.deepEqual(balancedToCard[1], { method: "bank_card", amountKop: 400000 });

		// 1-Click balance to SBP when no existing payments
		const balancedToSbp = balanceRemainderToSplitMethod({
			totalBillKop: 350000,
			currentPayments: [],
			targetMethod: "sbp_qr",
		});
		assert.equal(balancedToSbp.length, 1);
		assert.deepEqual(balancedToSbp[0], { method: "sbp_qr", amountKop: 350000 });

		// 1-Click balance when already fully paid produces no unnecessary 0-kop item
		const alreadyPaid = balanceRemainderToSplitMethod({
			totalBillKop: 200000,
			currentPayments: [{ method: "cash" as const, amountKop: 200000 }],
			targetMethod: "bank_card",
		});
		assert.equal(alreadyPaid.length, 1);
		assert.equal(alreadyPaid[0]?.method, "cash");
	});

	it("5. validateCheckoutSplit: verifies auto-balanced split produces isValid: true (Legacy Integrity)", () => {
		const totalBillKop = 450000; // 4 500.00 ₽
		// Initially underpaid with 1 500.00 ₽
		const partialPayments = splitStateToCheckoutPayments({
			cardRub: 1500,
			cashRub: 0,
			sbpRub: 0,
			depositRub: 0,
			loyaltyRub: 0,
		});
		const invalidResult = validateCheckoutSplit({
			orderId: "TEST-01",
			totalBillKop,
			payments: partialPayments,
		});
		assert.equal(invalidResult.isValid, false);
		assert.equal(invalidResult.remainingDueKop, 300000); // 3 000.00 ₽

		// Auto-allocate remaining 3 000.00 ₽ to card: 1500 + 3000 = 4500 ₽
		const balancedPayments = splitStateToCheckoutPayments({
			cardRub: 4500,
			cashRub: 0,
			sbpRub: 0,
			depositRub: 0,
			loyaltyRub: 0,
		});
		const validResult = validateCheckoutSplit({
			orderId: "TEST-01",
			totalBillKop,
			payments: balancedPayments,
		});
		assert.equal(validResult.isValid, true);
		assert.equal(validResult.remainingDueKop, 0);
	});

	it("6. validateCheckoutSplit underpayment & overpayment detection", () => {
		const totalBillKop = 500000; // 5 000.00 ₽

		// Underpayment
		const underpaid = validateCheckoutSplit({
			orderId: "TEST-UNDER",
			totalBillKop,
			payments: [{ method: "bank_card", amountKop: 400000 }],
		});
		assert.equal(underpaid.isValid, false);
		assert.equal(underpaid.remainingDueKop, 100000);
		assert.ok(underpaid.errorMessageRu?.includes("Недоплата: 1000.00 ₽"));

		// Overpayment
		const overpaid = validateCheckoutSplit({
			orderId: "TEST-OVER",
			totalBillKop,
			payments: [{ method: "bank_card", amountKop: 650000 }],
		});
		assert.equal(overpaid.isValid, false);
		assert.equal(overpaid.remainingDueKop, -150000);
		assert.ok(overpaid.errorMessageRu?.includes("Переплата по безналу/сертификатам: 1500.00 ₽"));
	});

	it("7. validateCheckoutSplit cash change calculation", () => {
		const totalBillKop = 250000; // 2 500.00 ₽

		// Patient tenders 3 000.00 ₽ cash for 2 500.00 ₽ bill -> 500.00 ₽ change
		const resultWithChange = validateCheckoutSplit({
			orderId: "TEST-CHANGE",
			totalBillKop,
			payments: [{ method: "cash", amountKop: 250000 }],
			cashTenderedKop: 300000,
		});

		assert.equal(resultWithChange.isValid, true);
		assert.equal(resultWithChange.cashChangeDueKop, 50000); // 500.00 ₽
		assert.equal(resultWithChange.remainingDueKop, 0);

		// Exact cash tendered -> 0 change
		const resultExact = validateCheckoutSplit({
			orderId: "TEST-EXACT",
			totalBillKop,
			payments: [{ method: "cash", amountKop: 250000 }],
			cashTenderedKop: 250000,
		});
		assert.equal(resultExact.isValid, true);
		assert.equal(resultExact.cashChangeDueKop, 0);
	});

	it("8. validateCheckoutSplit client type and INN autonomy (Mandate 8n)", () => {
		const totalBillKop = 100000;
		const payments = [{ method: "bank_card" as const, amountKop: 100000 }];

		// Physical person without INN: always valid (Mandate 8n)
		const physResult = validateCheckoutSplit({
			orderId: "TEST-PHYS",
			totalBillKop,
			payments,
			clientType: "physical_person",
			buyerInn: "",
		});
		assert.equal(physResult.isValid, true);

		// Legal entity without 10-digit INN: invalid
		const legalInvalid = validateCheckoutSplit({
			orderId: "TEST-LEGAL",
			totalBillKop,
			payments,
			clientType: "legal_entity",
			buyerInn: "123",
		});
		assert.equal(legalInvalid.isValid, false);
		assert.ok(legalInvalid.errorMessageRu?.includes("ИНН"));

		// Legal entity with valid 10-digit INN: valid
		const legalValid = validateCheckoutSplit({
			orderId: "TEST-LEGAL-OK",
			totalBillKop,
			payments,
			clientType: "legal_entity",
			buyerInn: "7707083893",
		});
		assert.equal(legalValid.isValid, true);

		// Zero bill: 100% warranty / service coverage
		const zeroBillResult = validateCheckoutSplit({
			orderId: "TEST-WARRANTY",
			totalBillKop: 0,
			payments: [],
		});
		assert.equal(zeroBillResult.isValid, true);
	});
});
