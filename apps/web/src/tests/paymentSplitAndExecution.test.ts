/**
 * apps/web/src/tests/paymentSplitAndExecution.test.ts
 *
 * Unit tests for Payment Split Math, Integer-Kopeck Parity, Idempotency Locks,
 * and Canonical 54-FZ FFD 1.2 SSOT Integration (@dental/shared/fiscal).
 *
 * Mandate 8e: Cashier Autonomy (Non-blocking buyer INN for physical persons).
 * Mandate 8i: Zero Float Drift / Integer-Kopeck Math.
 */

import { describe, expect, it } from "vitest";
import {
	autoAlignSplitRemainder,
	calculate5050Split,
	isSplitBalanced,
} from "../components/finance/modal/payment/splitModules/paymentSplitMath.js";
import {
	acquirePaymentLock,
	clearAllPaymentLocks,
	generatePaymentIdempotencyKey,
	isInFlightPaymentLocked,
	releasePaymentLock,
} from "../components/finance/modal/payment/executionModules/paymentIdempotencyManager.js";
import { validate54FzBuyerInn } from "../components/finance/cashboxOperations.js";
import {
	rubToKopecks,
	kopecksToRub,
} from "@dental/shared";
import {
	calculateCanonicalSplit,
	validateTenderParity,
} from "@dental/shared/fiscal";

describe("Payment Split Math & Kopeck Parity (Mandate 8i)", () => {
	it("calculates 50/50 split with exact kopeck parity for even amounts", () => {
		const totalRub = 5000.50;
		const split = calculate5050Split(totalRub);

		expect(split.electronicRub).toBe(2500.25);
		expect(split.cashRub).toBe(2500.25);
		expect(split.electronicRub + split.cashRub).toBe(totalRub);

		// Kopeck validation
		const totalKop = rubToKopecks(totalRub);
		const splitKop = rubToKopecks(split.electronicRub) + rubToKopecks(split.cashRub);
		expect(splitKop).toBe(totalKop);
	});

	it("calculates 50/50 split with odd kopeck remainder preservation without penny loss", () => {
		const totalRub = 100.01;
		const split = calculate5050Split(totalRub);

		// 10001 kopecks: electronic = 5001 kop (50.01 RUB), cash = 5000 kop (50.00 RUB)
		expect(split.electronicRub).toBe(50.01);
		expect(split.cashRub).toBe(50.00);

		const totalKop = rubToKopecks(totalRub);
		const splitKop = rubToKopecks(split.electronicRub) + rubToKopecks(split.cashRub);
		expect(splitKop).toBe(totalKop);
		expect(totalKop).toBe(10001);
	});

	it("handles zero edge case safely in 50/50 split", () => {
		const zeroSplit = calculate5050Split(0);
		expect(zeroSplit.electronicRub).toBe(0);
		expect(zeroSplit.cashRub).toBe(0);
	});

	it("correctly auto-aligns split remainder to card when under-allocated", () => {
		const totalDueRub = 10000;
		const splitCardRub = 3000;
		const splitCashRub = 2000;
		const splitDepositRub = 1000;
		const totalAllocatedRub = splitCardRub + splitCashRub + splitDepositRub; // 6000

		const result = autoAlignSplitRemainder({
			totalDueRub,
			totalAllocatedRub,
			splitCardRub,
			splitCashRub,
			splitDepositRub,
		});

		// 4000 diff added to card (3000 + 4000 = 7000)
		expect(result.nextCardRub).toBe(7000);
		expect(result.nextCashRub).toBe(2000);
		expect(result.nextCardRub + result.nextCashRub + splitDepositRub).toBe(totalDueRub);
	});

	it("correctly auto-aligns split remainder when over-allocated (excess reduction)", () => {
		const totalDueRub = 5000;
		const splitCardRub = 4000;
		const splitCashRub = 2000;
		const totalAllocatedRub = 6000; // 1000 excess

		const result = autoAlignSplitRemainder({
			totalDueRub,
			totalAllocatedRub,
			splitCardRub,
			splitCashRub,
		});

		// Excess 1000 deducted from card: 4000 - 1000 = 3000
		expect(result.nextCardRub).toBe(3000);
		expect(result.nextCashRub).toBe(2000);
		expect(result.nextCardRub + result.nextCashRub).toBe(totalDueRub);
	});

	it("verifies isSplitBalanced accurately across all payment tenders down to kopeck", () => {
		const totalRub = 15000;

		// Exactly balanced
		expect(
			isSplitBalanced(totalRub, [5000, 4000, 2000, 2000, 1000, 500, 500]),
		).toBe(true);

		// Underpaid by 1 kopeck (499.99 instead of 500)
		expect(
			isSplitBalanced(totalRub, [5000, 4000, 2000, 2000, 1000, 500, 499.99]),
		).toBe(false);

		// Overpaid
		expect(
			isSplitBalanced(totalRub, [10000, 6000]),
		).toBe(false);
	});
});

describe("Canonical 54-FZ FFD 1.2 SSOT Integration (@dental/shared/fiscal)", () => {
	it("maps multi-tender split to statutory FFD 1.2 tags (1031, 1081, 1215, 1217) with exact kopeck parity", () => {
		const splitSummary = calculateCanonicalSplit({
			totalDueRub: 25000,
			cashRub: 5000,
			cardRub: 8000,
			sbpRub: 2000,
			depositRub: 3000,
			familyWalletRub: 2000,
			insuranceRub: 4000,
			certificateRub: 1000,
		});

		expect(splitSummary.isBalanced).toBe(true);
		expect(splitSummary.tag1031_cashRub).toBe(5000);
		expect(splitSummary.tag1081_electronicRub).toBe(10000); // card 8000 + sbp 2000
		expect(splitSummary.tag1215_advanceOffsetRub).toBe(5000); // deposit 3000 + family 2000
		expect(splitSummary.tag1217_counterProvisionRub).toBe(5000); // dms 4000 + cert 1000
	});

	it("validates tender parity in integer kopecks via validateTenderParity", () => {
		const validParity = validateTenderParity({
			totalDueKopecks: 1500000,
			cashKopecks: 500000,
			cardKopecks: 1000000,
		});
		expect(validParity.isValid).toBe(true);
		expect(validParity.diffKopecks).toBe(0);

		const underAllocated = validateTenderParity({
			totalDueKopecks: 1500000,
			cashKopecks: 500000,
			cardKopecks: 999999,
		});
		expect(underAllocated.isValid).toBe(false);
		expect(underAllocated.remainingKopecks).toBe(1);
	});

	it("never blocks physical persons for empty INN (Mandate 8e Cashier Autonomy)", () => {
		const individualNoInn = validate54FzBuyerInn("", "physical");
		expect(individualNoInn.isValid).toBe(true);
		expect(individualNoInn.isRequired).toBe(false);

		const legalEmptyInn = validate54FzBuyerInn("", "legal_entity");
		expect(legalEmptyInn.isValid).toBe(false);
		expect(legalEmptyInn.isRequired).toBe(true);

		const legalValidInn = validate54FzBuyerInn("7707083893", "legal_entity");
		expect(legalValidInn.isValid).toBe(true);
	});
});


describe("Payment Idempotency & Concurrency Lock Manager (Mandate 8e)", () => {
	it("generates unique idempotency keys with patient and composite context", () => {
		const ctx1 = generatePaymentIdempotencyKey({
			prefix: "pay",
			patientId: "patient-100",
			amountRub: 5000,
			method: "split",
		});
		const ctx2 = generatePaymentIdempotencyKey({
			prefix: "pay",
			patientId: "patient-100",
			amountRub: 5000,
			method: "split",
		});

		expect(ctx1.clientMutationId).toBeTruthy();
		expect(ctx2.clientMutationId).toBeTruthy();
		expect(ctx1.clientMutationId).not.toBe(ctx2.clientMutationId);
		expect(ctx1.headers["Idempotency-Key"]).toBe(ctx1.clientMutationId);
	});

	it("locks and prevents double-submission race conditions", () => {
		clearAllPaymentLocks();
		const clientMutationId = `test-mutation-${Date.now()}`;

		// First acquisition succeeds
		const acquiredFirst = acquirePaymentLock(clientMutationId);
		expect(acquiredFirst).toBe(true);
		expect(isInFlightPaymentLocked(clientMutationId)).toBe(true);

		// Immediate re-acquisition fails (double-click guard)
		const acquiredSecond = acquirePaymentLock(clientMutationId);
		expect(acquiredSecond).toBe(false);

		// Release lock
		releasePaymentLock(clientMutationId);
		expect(isInFlightPaymentLocked(clientMutationId)).toBe(false);

		// Re-acquisition succeeds after release
		const acquiredThird = acquirePaymentLock(clientMutationId);
		expect(acquiredThird).toBe(true);
		releasePaymentLock(clientMutationId);
	});
});
