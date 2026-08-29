import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	allocateSplitPaymentAcrossItems,
	type SplitPaymentPositionItem,
	type SplitPaymentTenderInput,
	SplitPaymentValidationError,
	validateAndBalanceSplitPayment,
} from "../finance/splitPayment.js";
import { rubToKopecks, kopecksToRub } from "../fiscal/kopecksArithmetic.js";

describe("Wave 23: Domain 1 — Split Payment Engine (Святость денег и ACID)", () => {
	it("1. Statutory Wave 23 scenario: 15,000 ₽ Act = 5,000 ₽ Cash + 7,000 ₽ Card + 3,000 ₽ Family Deposit (Tag 1215)", () => {
		const actTotalRub = 15000;
		const tenders: SplitPaymentTenderInput = {
			cashRub: 5000,
			cardRub: 7000,
			familyDepositRub: 3000,
			familyGroupId: "fam-grp-100",
			sponsorPatientId: "pat-sponsor-1",
			sponsorFullName: "Иванов Иван Иванович",
		};

		const result = validateAndBalanceSplitPayment({
			actTotalRub,
			tenders,
		});

		// 100% strict integer kopeck checks
		assert.equal(result.isBalanced, true);
		assert.equal(result.status, "exact");
		assert.equal(result.actTotalKopecks, 1500000);
		assert.equal(result.actTotalRub, 15000);
		assert.equal(result.totalTendersKopecks, 1500000);
		assert.equal(result.totalTendersRub, 15000);
		assert.equal(result.discrepancyKopecks, 0);
		assert.equal(result.discrepancyRub, 0);

		// 54-FZ FFD 1.2 Tag Breakdown
		assert.equal(result.ffd12Tags.tag1031_cashKopecks, 500000);
		assert.equal(result.ffd12Tags.tag1031_cashRub, 5000);
		assert.equal(result.ffd12Tags.tag1081_electronicKopecks, 700000);
		assert.equal(result.ffd12Tags.tag1081_electronicRub, 7000);
		assert.equal(result.ffd12Tags.tag1215_advanceOffsetKopecks, 300000);
		assert.equal(result.ffd12Tags.tag1215_advanceOffsetRub, 3000);
		assert.equal(result.ffd12Tags.tag1216_creditKopecks, 0);
		assert.equal(result.ffd12Tags.tag1217_counterProvisionKopecks, 0);
		assert.equal(result.ffd12Tags.totalKopecks, 1500000);
		assert.equal(result.ffd12Tags.totalRub, 15000);

		// Normalized tender list check
		assert.equal(result.tenders.length, 3);
		const cashTender = result.tenders.find((t) => t.kind === "cash");
		const cardTender = result.tenders.find((t) => t.kind === "card");
		const familyTender = result.tenders.find((t) => t.kind === "family_deposit");

		assert.ok(cashTender);
		assert.equal(cashTender.ffd12Tag, 1031);
		assert.equal(cashTender.amountKopecks, 500000);

		assert.ok(cardTender);
		assert.equal(cardTender.ffd12Tag, 1081);
		assert.equal(cardTender.amountKopecks, 700000);

		assert.ok(familyTender);
		assert.equal(familyTender.ffd12Tag, 1215);
		assert.equal(familyTender.amountKopecks, 300000);
		assert.equal(familyTender.metadata?.familyGroupId, "fam-grp-100");
	});

	it("2. Underpayment detection: rejects split missing 1,000 ₽", () => {
		const result = validateAndBalanceSplitPayment({
			actTotalRub: 15000,
			tenders: {
				cashRub: 5000,
				cardRub: 6000, // 1000 short
				familyDepositRub: 3000,
			},
		});

		assert.equal(result.isBalanced, false);
		assert.equal(result.status, "underpaid");
		assert.equal(result.discrepancyKopecks, -100000);
		assert.equal(result.discrepancyRub, -1000);
		assert.ok(result.errorMessage?.includes("Недостаточно средств"));
	});

	it("3. Overpayment detection: rejects split exceeding act total by 500 ₽", () => {
		const result = validateAndBalanceSplitPayment({
			actTotalRub: 15000,
			tenders: {
				cashRub: 5000,
				cardRub: 7500, // 500 excess
				familyDepositRub: 3000,
			},
		});

		assert.equal(result.isBalanced, false);
		assert.equal(result.status, "overpaid");
		assert.equal(result.discrepancyKopecks, 50000);
		assert.equal(result.discrepancyRub, 500);
		assert.ok(result.errorMessage?.includes("превышает сумму счета"));
	});

	it("4. throwOnMismatch gate: immediately throws SplitPaymentValidationError on unbalance", () => {
		assert.throws(
			() => {
				validateAndBalanceSplitPayment({
					actTotalRub: 15000,
					tenders: {
						cashRub: 5000,
						cardRub: 7000,
						familyDepositRub: 2999.99, // 1 kopeck short!
					},
					throwOnMismatch: true,
				});
			},
			(err: unknown) => {
				assert.ok(err instanceof SplitPaymentValidationError);
				assert.equal(err.code, "SplitMismatch");
				assert.equal(err.details?.discrepancyKopecks, -1);
				return true;
			},
		);
	});

	it("5. Strict fractional kopeck exactness without IEEE-754 drift", () => {
		// Act total: 15,000.45 ₽
		const actKopecks = 1500045;
		const result = validateAndBalanceSplitPayment({
			actTotalKopecks: actKopecks,
			tenders: {
				cashKopecks: 500020, // 5,000.20 ₽
				cardKopecks: 700025, // 7,000.25 ₽
				familyDepositKopecks: 300000, // 3,000.00 ₽
			},
		});

		assert.equal(result.isBalanced, true);
		assert.equal(result.actTotalKopecks, 1500045);
		assert.equal(result.totalTendersKopecks, 1500045);
		assert.equal(result.discrepancyKopecks, 0);
	});

	it("6. Multi-source 5-tender split (Cash + Card + SBP + Personal Advance + DMS Insurance)", () => {
		const result = validateAndBalanceSplitPayment({
			actTotalRub: 25000,
			tenders: {
				cashRub: 5000, // Tag 1031
				cardRub: 10000, // Tag 1081
				sbpRub: 3000, // Tag 1081
				advanceDepositRub: 4000, // Tag 1215
				dmsInsuranceRub: 3000, // Tag 1217
			},
		});

		assert.equal(result.isBalanced, true);
		assert.equal(result.ffd12Tags.tag1031_cashKopecks, 500000);
		assert.equal(result.ffd12Tags.tag1081_electronicKopecks, 1300000); // 10,000 + 3,000
		assert.equal(result.ffd12Tags.tag1215_advanceOffsetKopecks, 400000);
		assert.equal(result.ffd12Tags.tag1217_counterProvisionKopecks, 300000);
		assert.equal(result.ffd12Tags.totalKopecks, 2500000);
	});

	it("7. Largest Remainder (Hamilton-Hare) allocation across Act 804n line items with 0 kopeck loss", () => {
		const positions: SplitPaymentPositionItem[] = [
			{ id: "pos-1", name: "Консультация ортопеда", code804n: "B01.066.001", quantity: 1, priceRub: 2000 },
			{ id: "pos-2", name: "Установка коронки E.max", code804n: "A16.07.004", quantity: 1, priceRub: 10000 },
			{ id: "pos-3", name: "Проф. гигиена AirFlow", code804n: "A16.07.006", quantity: 1, priceRub: 3000 },
		];

		const validation = validateAndBalanceSplitPayment({
			actTotalRub: 15000,
			tenders: {
				cashRub: 5000,
				cardRub: 7000,
				familyDepositRub: 3000,
			},
		});

		const allocated = allocateSplitPaymentAcrossItems(positions, validation);

		assert.equal(allocated.length, 3);
		// Pos 1 (2,000 ₽): 2/15 of 5,000 cash = 666.67 -> exact kopecks
		const totalAllocatedCashKop = allocated.reduce((sum, a) => sum + a.cashKopecks, 0);
		const totalAllocatedCardKop = allocated.reduce((sum, a) => sum + a.cardKopecks, 0);
		const totalAllocatedAdvKop = allocated.reduce((sum, a) => sum + a.advanceDepositKopecks, 0);

		assert.equal(totalAllocatedCashKop, 500000);
		assert.equal(totalAllocatedCardKop, 700000);
		assert.equal(totalAllocatedAdvKop, 300000);
		assert.equal(totalAllocatedCashKop + totalAllocatedCardKop + totalAllocatedAdvKop, 1500000);
	});
});
