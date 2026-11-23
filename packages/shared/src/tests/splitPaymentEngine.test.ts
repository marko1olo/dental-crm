import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	allocateSplitPaymentAcrossItems,
	autoAlignSplitRemainder,
	balanceSplitDepositPlusCard,
	balanceSplitTenderRemainder,
	calculate5050Split,
	calculateDmsSplitBill,
	isSplitBalanced,
	type SplitPaymentPositionItem,
	type SplitPaymentTenderInput,
	SplitPaymentValidationError,
	validateAndBalanceSplitPayment,
} from "../billing/splitPayment.js";
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
		const totalAllocatedFamilyKop = allocated.reduce((sum, a) => sum + a.familyDepositKopecks, 0);

		assert.equal(totalAllocatedCashKop, 500000);
		assert.equal(totalAllocatedCardKop, 700000);
		assert.equal(totalAllocatedFamilyKop, 300000);
		assert.equal(totalAllocatedCashKop + totalAllocatedCardKop + totalAllocatedFamilyKop, 1500000);

		// Row Sum Invariant: each position row sum strictly matches its item total
		for (const row of allocated) {
			const rowSum =
				row.cashKopecks +
				row.cardKopecks +
				row.sbpKopecks +
				row.advanceDepositKopecks +
				row.familyDepositKopecks +
				row.creditKopecks +
				row.certificateKopecks +
				row.dmsKopecks;
			assert.equal(rowSum, row.itemTotalKopecks);
		}
	});

	it("8. 1-Click Remainder Balancer: balances exact kopecks to card or SBP without calculator", () => {
		const actTotalKopecks = 1245050; // 12 450.50 ₽
		// Patient paid 2,000.00 ₽ in cash
		const currentTenders: SplitPaymentTenderInput = {
			cashKopecks: 200000,
		};

		// 1-Click: "+ на Карту"
		const balancedCard = balanceSplitTenderRemainder({
			actTotalKopecks,
			currentTenders,
			targetKind: "card",
		});

		assert.equal(balancedCard.cashKopecks, 200000);
		assert.equal(balancedCard.cardKopecks, 1045050); // 10 450.50 ₽ exactly

		const valCard = validateAndBalanceSplitPayment({
			actTotalKopecks,
			tenders: balancedCard,
		});
		assert.equal(valCard.isBalanced, true);
		assert.equal(valCard.discrepancyKopecks, 0);

		// 1-Click: "+ в СБП"
		const balancedSbp = balanceSplitTenderRemainder({
			actTotalKopecks,
			currentTenders,
			targetKind: "sbp",
		});
		assert.equal(balancedSbp.sbpKopecks, 1045050);

		const valSbp = validateAndBalanceSplitPayment({
			actTotalKopecks,
			tenders: balancedSbp,
		});
		assert.equal(valSbp.isBalanced, true);
	});

	it("9. 1-Click Deposit + Card Combo: spends available deposit first and closes remaining tail on card", () => {
		const actTotalKopecks = 1000033; // 10 000.33 ₽
		const availableDepositKopecks = 325000; // 3 250.00 ₽ on patient account

		const balanced = balanceSplitDepositPlusCard({
			actTotalKopecks,
			currentTenders: {},
			availableDepositKopecks,
			secondaryTender: "card",
		});

		assert.equal(balanced.advanceDepositKopecks, 325000); // 3 250.00 ₽ from deposit
		assert.equal(balanced.cardKopecks, 675033); // 6 750.33 ₽ on card

		const val = validateAndBalanceSplitPayment({
			actTotalKopecks,
			tenders: balanced,
		});

		assert.equal(val.isBalanced, true);
		assert.equal(val.actTotalKopecks, 1000033);
		assert.equal(val.totalTendersKopecks, 1000033);
		assert.equal(val.ffd12Tags.tag1215_advanceOffsetKopecks, 325000);
		assert.equal(val.ffd12Tags.tag1081_electronicKopecks, 675033);
		assert.equal(val.discrepancyKopecks, 0);
	});

	it("10. Multi-tender split with DMS Insurance allocates dmsKopecks accurately across line items", () => {
		const positions: SplitPaymentPositionItem[] = [
			{ id: "pos-1", name: "Лечение пульпита зуба 1.6", code804n: "A16.07.030.001", quantity: 1, priceRub: 6000 },
			{ id: "pos-2", name: "Анестезия инфильтрационная", code804n: "A11.07.010", quantity: 1, priceRub: 1000 },
			{ id: "pos-3", name: "Компьютерная томография", code804n: "A06.07.012", quantity: 1, priceRub: 3000 },
		];

		// Act total: 10,000 ₽. DMS letter covers 7,000 ₽, patient pays 3,000 ₽ by card.
		const validation = validateAndBalanceSplitPayment({
			actTotalRub: 10000,
			tenders: {
				dmsInsuranceRub: 7000,
				cardRub: 3000,
			},
		});

		assert.equal(validation.isBalanced, true);
		assert.equal(validation.ffd12Tags.tag1217_counterProvisionKopecks, 700000);
		assert.equal(validation.ffd12Tags.tag1081_electronicKopecks, 300000);

		const allocated = allocateSplitPaymentAcrossItems(positions, validation);
		assert.equal(allocated.length, 3);

		const totalDmsAllocated = allocated.reduce((sum, a) => sum + a.dmsKopecks, 0);
		const totalCardAllocated = allocated.reduce((sum, a) => sum + a.cardKopecks, 0);
		const totalCertAllocated = allocated.reduce((sum, a) => sum + a.certificateKopecks, 0);

		assert.equal(totalDmsAllocated, 700000);
		assert.equal(totalCardAllocated, 300000);
		assert.equal(totalCertAllocated, 0);
		assert.equal(totalDmsAllocated + totalCardAllocated, 1000000);

		// Row Sum Invariant
		for (const row of allocated) {
			const rowSum =
				row.cashKopecks +
				row.cardKopecks +
				row.sbpKopecks +
				row.advanceDepositKopecks +
				row.familyDepositKopecks +
				row.creditKopecks +
				row.certificateKopecks +
				row.dmsKopecks;
			assert.equal(rowSum, row.itemTotalKopecks);
		}
	});

	it("11. calculate5050Split splits odd amount without losing a single kopeck", () => {
		const split = calculate5050Split(15000.33);
		assert.equal(split.cashRub + split.electronicRub, 15000.33);
		assert.equal(rubToKopecks(split.cashRub) + rubToKopecks(split.electronicRub), 1500033);
	});

	it("12. autoAlignSplitRemainder eliminates rounding gaps to exact kopecks", () => {
		const aligned = autoAlignSplitRemainder({
			totalDueRub: 10000,
			totalAllocatedRub: 8000,
			splitCardRub: 5000,
			splitCashRub: 3000,
		});
		assert.equal(aligned.nextCardRub, 7000);
		assert.equal(aligned.nextCashRub, 3000);
	});

	it("13. isSplitBalanced verifies exact allocation down to 0 kopeck discrepancy", () => {
		assert.equal(isSplitBalanced(1500, [500, 1000]), true);
		assert.equal(isSplitBalanced(1500, [500, 999.99]), false);
	});

	it("14. calculateDmsSplitBill performs 0-drift split for full coverage, franchise, and limit overflow", () => {
		// Full coverage (0% franchise, limit >= bill)
		const full = calculateDmsSplitBill({
			totalBillRub: 12500.5,
			availableCoverageRub: 50000,
		});
		assert.equal(full.dmsCoveredRub, 12500.5);
		assert.equal(full.patientCoPayRub, 0);
		assert.equal(full.isFullyCovered, true);
		assert.equal(full.dmsCoveredKopecks + full.patientCoPayKopecks, 1250050);

		// 20% franchise with odd kopecks
		const franchise20 = calculateDmsSplitBill({
			totalBillRub: 13333.33,
			franchisePercent: 20,
		});
		assert.equal(franchise20.dmsCoveredKopecks + franchise20.patientCoPayKopecks, 1333333);
		assert.equal(franchise20.isFullyCovered, false);
		assert.equal(franchise20.franchiseAppliedKopecks, 266667); // round(1333333 * 0.20)
		assert.equal(franchise20.dmsCoveredKopecks, 1066666);
		assert.equal(franchise20.patientCoPayKopecks, 266667);

		// Limit overflow: bill 25,000 ₽, remaining letter limit 15,000 ₽
		const overflow = calculateDmsSplitBill({
			totalBillRub: 25000,
			availableCoverageRub: 15000,
			franchisePercent: 0,
		});
		assert.equal(overflow.dmsCoveredRub, 15000);
		assert.equal(overflow.patientCoPayRub, 10000);
		assert.equal(overflow.isFullyCovered, false);
		assert.equal(overflow.dmsCoveredKopecks + overflow.patientCoPayKopecks, 2500000);

		// Limit overflow with franchise: bill 10,000 ₽, 10% franchise (DMS initial 9,000 ₽), but limit is 6,000 ₽
		const overflowFranchise = calculateDmsSplitBill({
			totalBillRub: 10000,
			availableCoverageRub: 6000,
			franchisePercent: 10,
		});
		assert.equal(overflowFranchise.dmsCoveredRub, 6000);
		assert.equal(overflowFranchise.patientCoPayRub, 4000);
		assert.equal(overflowFranchise.dmsCoveredKopecks + overflowFranchise.patientCoPayKopecks, 1000000);
	});

	it("15. Mandate 8e: 100% doctor discount preserves all positions in receipt (zero act returns all items with 0 kopecks)", () => {
		const positions: SplitPaymentPositionItem[] = [
			{ id: "pos-1", name: "Консультация ортопеда", code804n: "B01.066.001", quantity: 1, priceRub: 2000, discountRub: 2000 },
			{ id: "pos-2", name: "Гарантийная переделка пломбы", code804n: "A16.07.002", quantity: 1, priceRub: 5000, discountRub: 5000 },
		];

		const validation = validateAndBalanceSplitPayment({
			actTotalRub: 0,
			tenders: {},
		});

		assert.equal(validation.isBalanced, true);
		assert.equal(validation.actTotalKopecks, 0);

		const allocated = allocateSplitPaymentAcrossItems(positions, validation);

		// Must return ALL positions, never empty []
		assert.equal(allocated.length, 2);
		assert.equal(allocated[0]?.itemId, "pos-1");
		assert.equal(allocated[0]?.itemName, "Консультация ортопеда");
		assert.equal(allocated[0]?.itemTotalKopecks, 0);
		assert.equal(allocated[0]?.itemTotalRub, 0);
		assert.equal(allocated[0]?.cashKopecks, 0);
		assert.equal(allocated[0]?.cardKopecks, 0);

		assert.equal(allocated[1]?.itemId, "pos-2");
		assert.equal(allocated[1]?.itemName, "Гарантийная переделка пломбы");
		assert.equal(allocated[1]?.itemTotalKopecks, 0);
		assert.equal(allocated[1]?.itemTotalRub, 0);
		assert.equal(allocated[1]?.cashKopecks, 0);
		assert.equal(allocated[1]?.cardKopecks, 0);
	});

	it("16. Strict 2D Matrix Convergence: prevents row overpayment anomaly (51+50=101 at 100 price)", () => {
		const positions: SplitPaymentPositionItem[] = [
			{ id: "pos-1", name: "Услуга А", quantity: 1, priceKopecks: 100, priceRub: 1 },
			{ id: "pos-2", name: "Услуга Б", quantity: 1, priceKopecks: 100, priceRub: 1 },
		];

		const validation = validateAndBalanceSplitPayment({
			actTotalKopecks: 200,
			tenders: {
				cashKopecks: 101,
				cardKopecks: 99,
			},
		});

		assert.equal(validation.isBalanced, true);

		const allocated = allocateSplitPaymentAcrossItems(positions, validation);
		assert.equal(allocated.length, 2);

		// Column sum convergence
		const sumCash = allocated.reduce((s, a) => s + a.cashKopecks, 0);
		const sumCard = allocated.reduce((s, a) => s + a.cardKopecks, 0);
		assert.equal(sumCash, 101);
		assert.equal(sumCard, 99);

		// Row sum convergence: each row must strictly equal 100 kopecks (NO 101 overpayment!)
		for (const row of allocated) {
			const rowSum =
				row.cashKopecks +
				row.cardKopecks +
				row.sbpKopecks +
				row.advanceDepositKopecks +
				row.familyDepositKopecks +
				row.creditKopecks +
				row.certificateKopecks +
				row.dmsKopecks;
			assert.equal(rowSum, 100);
			assert.equal(rowSum, row.itemTotalKopecks);
			assert.ok(row.cashKopecks >= 0);
			assert.ok(row.cardKopecks >= 0);
			assert.ok(row.cashKopecks <= 100);
			assert.ok(row.cardKopecks <= 100);
		}
	});

	it("17. Property-Based Stress Test: 20 000 iterations verifying strict 2D convergence (row sums and column sums)", () => {
		// High-performance deterministic PRNG (XorShift32) for reproducible property-based testing
		let seed = 123456789;
		function nextRandom(): number {
			seed ^= seed << 13;
			seed ^= seed >> 17;
			seed ^= seed << 5;
			return (seed >>> 0) / 4294967296;
		}

		function randomInt(min: number, max: number): number {
			return Math.floor(nextRandom() * (max - min + 1)) + min;
		}

		const ITERATIONS = 20000;
		for (let iter = 0; iter < ITERATIONS; iter++) {
			// 1. Generate 1 to 15 positions
			const numPositions = randomInt(1, 15);
			const positions: SplitPaymentPositionItem[] = [];
			let grandTotalKop = 0;

			for (let p = 0; p < numPositions; p++) {
				const priceKop = randomInt(0, 10) === 0 ? 0 : randomInt(1, 50000);
				const qty = randomInt(1, 3);
				const itemTotal = priceKop * qty;
				grandTotalKop += itemTotal;

				positions.push({
					id: `pos-${iter}-${p}`,
					name: `Позиция ${p + 1}`,
					quantity: qty,
					priceKopecks: priceKop,
					priceRub: kopecksToRub(priceKop),
				});
			}

			// 2. If grandTotalKop === 0
			if (grandTotalKop === 0) {
				const valZero = validateAndBalanceSplitPayment({
					actTotalKopecks: 0,
					tenders: {},
				});
				const allocZero = allocateSplitPaymentAcrossItems(positions, valZero);
				assert.equal(allocZero.length, positions.length);
				for (const item of allocZero) {
					assert.equal(item.itemTotalKopecks, 0);
					assert.equal(item.cashKopecks, 0);
					assert.equal(item.cardKopecks, 0);
				}
				continue;
			}

			// 3. Random partition of grandTotalKop into 7 tenders
			const cuts: number[] = [];
			for (let c = 0; c < 7; c++) {
				cuts.push(randomInt(0, grandTotalKop));
			}
			cuts.sort((a, b) => a - b);

			const tenderAmounts = [
				cuts[0] ?? 0,
				(cuts[1] ?? 0) - (cuts[0] ?? 0),
				(cuts[2] ?? 0) - (cuts[1] ?? 0),
				(cuts[3] ?? 0) - (cuts[2] ?? 0),
				(cuts[4] ?? 0) - (cuts[3] ?? 0),
				(cuts[5] ?? 0) - (cuts[4] ?? 0),
				(cuts[6] ?? 0) - (cuts[5] ?? 0),
				grandTotalKop - (cuts[6] ?? 0),
			];

			const tendersInput: SplitPaymentTenderInput = {
				cashKopecks: tenderAmounts[0],
				cardKopecks: tenderAmounts[1],
				sbpKopecks: tenderAmounts[2],
				advanceDepositKopecks: tenderAmounts[3],
				familyDepositKopecks: tenderAmounts[4],
				creditKopecks: tenderAmounts[5],
				certificateOrBonusKopecks: tenderAmounts[6],
				dmsInsuranceKopecks: tenderAmounts[7],
			};

			const validation = validateAndBalanceSplitPayment({
				actTotalKopecks: grandTotalKop,
				tenders: tendersInput,
			});

			assert.equal(validation.isBalanced, true);

			const allocated = allocateSplitPaymentAcrossItems(positions, validation);
			assert.equal(allocated.length, positions.length);

			// 4. Verify Column Sum Conservation:
			let colCash = 0;
			let colCard = 0;
			let colSbp = 0;
			let colAdv = 0;
			let colFam = 0;
			let colCredit = 0;
			let colCert = 0;
			let colDms = 0;

			// 5. Verify Row Sum Conservation & Non-negativity:
			for (let i = 0; i < allocated.length; i++) {
				const row = allocated[i];
				assert.ok(row !== undefined);

				const expectedItemTotal = (positions[i]?.priceKopecks ?? 0) * (positions[i]?.quantity ?? 1);
				assert.equal(row.itemTotalKopecks, expectedItemTotal);

				assert.ok(row.cashKopecks >= 0);
				assert.ok(row.cardKopecks >= 0);
				assert.ok(row.sbpKopecks >= 0);
				assert.ok(row.advanceDepositKopecks >= 0);
				assert.ok(row.familyDepositKopecks >= 0);
				assert.ok(row.creditKopecks >= 0);
				assert.ok(row.certificateKopecks >= 0);
				assert.ok(row.dmsKopecks >= 0);

				const rowSum =
					row.cashKopecks +
					row.cardKopecks +
					row.sbpKopecks +
					row.advanceDepositKopecks +
					row.familyDepositKopecks +
					row.creditKopecks +
					row.certificateKopecks +
					row.dmsKopecks;

				assert.equal(rowSum, row.itemTotalKopecks, `Iteration ${iter}: Row sum must equal itemTotalKopecks`);

				colCash += row.cashKopecks;
				colCard += row.cardKopecks;
				colSbp += row.sbpKopecks;
				colAdv += row.advanceDepositKopecks;
				colFam += row.familyDepositKopecks;
				colCredit += row.creditKopecks;
				colCert += row.certificateKopecks;
				colDms += row.dmsKopecks;
			}

			assert.equal(colCash, tenderAmounts[0], `Iteration ${iter}: Column Cash sum mismatch`);
			assert.equal(colCard, tenderAmounts[1], `Iteration ${iter}: Column Card sum mismatch`);
			assert.equal(colSbp, tenderAmounts[2], `Iteration ${iter}: Column SBP sum mismatch`);
			assert.equal(colAdv, tenderAmounts[3], `Iteration ${iter}: Column Advance sum mismatch`);
			assert.equal(colFam, tenderAmounts[4], `Iteration ${iter}: Column Family sum mismatch`);
			assert.equal(colCredit, tenderAmounts[5], `Iteration ${iter}: Column Credit sum mismatch`);
			assert.equal(colCert, tenderAmounts[6], `Iteration ${iter}: Column Certificate sum mismatch`);
			assert.equal(colDms, tenderAmounts[7], `Iteration ${iter}: Column DMS sum mismatch`);
		}
	});
});



