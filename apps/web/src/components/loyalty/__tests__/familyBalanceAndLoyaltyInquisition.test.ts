/**
 * familyBalanceAndLoyaltyInquisition.test.ts — Unit tests for:
 * 1. Family Shared Wallet (Семейный баланс: debitFamilySharedBalance & creditFamilySharedBalance).
 * 2. Dental Loyalty Standards (3% base, 5% family, 30% max invoice coverage).
 * 3. Referral Program: «Приведи друга — обоим по 1000 бонусов на чистку» (REFERRAL_HYGIENE_1000_PRESET).
 * 4. 1-click Express Guarantee Letter attachment for statutory DMS (EXPRESS_GUARANTEE_LETTER_PRESETS).
 *
 * Invariants tested:
 * - Mandates 8b, 8i, 8n: Exact integer kopecks, no float drift, 54-FZ Tag 1215 fiscal split.
 * - Single shared family wallet: parent pays for child/spouse directly without manual transfer fee.
 * - Doctor autonomy override: 100% coverage when authorized by treating physician.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	debitFamilySharedBalance,
	creditFamilySharedBalance,
	calculateReferralReward,
	calculateLoyaltyAccrual,
	calculateLoyaltyRedemption,
	type DebitFamilySharedBalanceInput,
	type CreditFamilySharedBalanceInput,
} from "../program/loyaltyEngine.js";
import {
	REFERRAL_HYGIENE_1000_PRESET,
	REFERRAL_PROGRAM_PRESETS,
	DENTAL_LOYALTY_STANDARDS,
} from "../program/loyaltyPresets.js";
import {
	EXPRESS_GUARANTEE_LETTER_PRESETS,
} from "../../insurance/dmsInsurancePresets.js";

describe("1. Family Shared Balance (Единый семейный кошелек)", () => {
	it("1.1 Debits child treatment costs from shared family wallet by parent sponsor without manual transfer fees", () => {
		const input: DebitFamilySharedBalanceInput = {
			familyGroupId: "fam-group-42",
			familyName: "Семья Ивановых",
			sponsorPatientId: "pat-parent-1",
			sponsorFullName: "Иванов Иван Иванович",
			targetPatientId: "pat-child-1",
			targetPatientName: "Иванова София Ивановна",
			targetRoleRu: "Ребенок",
			invoiceAmountKop: 1000000, // 10 000.00 ₽ (пломба + профгигиена)
			availableFamilyPointsRub: 5000, // 5 000 бонусов на общем счете
			requestedPointsRub: 3000, // списать 3 000 бонусов (30% лимит)
			maxCoveragePercent: 30,
			allowFullCoverage: false,
			staffNameRu: "Администратор / Касса",
		};

		const result = debitFamilySharedBalance(input);

		assert.equal(result.success, true);
		assert.equal(result.isOneWalletTransferFree, true);
		assert.equal(result.debitedPointsRub, 3000);
		assert.equal(result.debitedPointsKop, 300000);
		assert.equal(result.remainingFamilyBalanceRub, 2000); // 5000 - 3000
		assert.equal(result.remainingInvoiceDueRub, 7000); // 10000 - 3000
		assert.equal(result.remainingInvoiceDueKop, 700000);

		// 54-FZ Fiscal check: Tag 1215 (prepayment/bonus) + Tag 1081 (card/cash) === totalGross
		assert.equal(result.fiscal54FzSplit.tag1215AdvancePrepaymentBonusKop, 300000);
		assert.equal(result.fiscal54FzSplit.tag1081ElectronicCardKop, 700000);
		assert.equal(
			result.fiscal54FzSplit.tag1215AdvancePrepaymentBonusKop +
				result.fiscal54FzSplit.tag1081ElectronicCardKop,
			1000000
		);

		// Ledger audit verification
		assert.ok(result.ledgerEntry.id.startsWith("fam-tx-"));
		assert.equal(result.ledgerEntry.operationType, "redemption");
		assert.equal(result.ledgerEntry.patientId, "pat-child-1");
		assert.equal(result.ledgerEntry.patientName, "Иванова София Ивановна");
		assert.equal(result.ledgerEntry.pointsDeltaRub, -3000);
		assert.equal(result.ledgerEntry.balanceAfterRub, 2000);
		assert.match(result.ledgerEntry.noteRu, /Иванова София Ивановна/);
		assert.match(result.ledgerEntry.noteRu, /Иванов Иван Иванович/);
	});

	it("1.2 Clamps family bonus redemption to standard 30% coverage limit when requested amount exceeds limit", () => {
		const input: DebitFamilySharedBalanceInput = {
			familyGroupId: "fam-group-42",
			familyName: "Семья Ивановых",
			sponsorPatientId: "pat-parent-1",
			sponsorFullName: "Иванов Иван Иванович",
			targetPatientId: "pat-spouse-1",
			targetPatientName: "Иванова Ольга Сергеевна",
			targetRoleRu: "Супруг / Супруга",
			invoiceAmountKop: 2000000, // 20 000 ₽
			availableFamilyPointsRub: 15000,
			requestedPointsRub: 10000, // Requested 10k, but 30% limit of 20k is 6k
			maxCoveragePercent: 30,
			allowFullCoverage: false,
		};

		const result = debitFamilySharedBalance(input);

		// 30% of 20 000 ₽ = 6 000 ₽
		assert.equal(result.maxAllowedRedemptionRub, 6000);
		assert.equal(result.debitedPointsRub, 6000);
		assert.equal(result.remainingFamilyBalanceRub, 9000); // 15000 - 6000
		assert.equal(result.remainingInvoiceDueRub, 14000);
	});

	it("1.3 Allows 100% full coverage under Doctor Autonomy / Warranty override (Mandate 8e)", () => {
		const input: DebitFamilySharedBalanceInput = {
			familyGroupId: "fam-group-42",
			familyName: "Семья Ивановых",
			sponsorPatientId: "pat-parent-1",
			sponsorFullName: "Иванов Иван Иванович",
			targetPatientId: "pat-child-1",
			targetPatientName: "Иванова София Ивановна",
			targetRoleRu: "Ребенок",
			invoiceAmountKop: 500000, // 5 000 ₽ (гарантийная переделка)
			availableFamilyPointsRub: 8000,
			requestedPointsRub: 5000,
			allowFullCoverage: true, // Doctor override active
		};

		const result = debitFamilySharedBalance(input);

		assert.equal(result.debitedPointsRub, 5000);
		assert.equal(result.remainingInvoiceDueRub, 0);
		assert.equal(result.remainingInvoiceDueKop, 0);
		assert.equal(result.fiscal54FzSplit.tag1215AdvancePrepaymentBonusKop, 500000);
		assert.equal(result.fiscal54FzSplit.tag1081ElectronicCardKop, 0);
	});

	it("1.4 Credits shared family wallet with exact integer rubles and generates audit ledger", () => {
		const input: CreditFamilySharedBalanceInput = {
			familyGroupId: "fam-group-42",
			familyName: "Семья Ивановых",
			payerPatientId: "pat-parent-1",
			payerFullName: "Иванов Иван Иванович",
			currentFamilyBalanceRub: 2000,
			amountToAddRub: 5000,
			reasonRu: "Внесение депозита на лечение семьи",
			staffNameRu: "Администратор",
		};

		const result = creditFamilySharedBalance(input);

		assert.equal(result.creditedPointsRub, 5000);
		assert.equal(result.newFamilyBalanceRub, 7000);
		assert.equal(result.payerFullName, "Иванов Иван Иванович");
		assert.ok(result.ledgerEntry.id.startsWith("fam-cr-"));
		assert.equal(result.ledgerEntry.operationType, "accrual");
		assert.equal(result.ledgerEntry.pointsDeltaRub, 5000);
		assert.equal(result.ledgerEntry.balanceAfterRub, 7000);
		assert.match(result.messageRu, /7\s*000/);
	});
});

describe("2. Clean Dental Loyalty Standards (3–5% Cashback & 30% Redemption Limit)", () => {
	it("2.1 Verifies statutory dental loyalty parameters (zero MLM, zero crypto-tokens)", () => {
		assert.equal(DENTAL_LOYALTY_STANDARDS.cashbackPercentBase, 3);
		assert.equal(DENTAL_LOYALTY_STANDARDS.cashbackPercentPremium, 5);
		assert.equal(DENTAL_LOYALTY_STANDARDS.maxInvoiceCoveragePercent, 30);
		assert.equal(DENTAL_LOYALTY_STANDARDS.pointRateRub, 1.0);
	});

	it("2.2 Calculates 3% base cashback and 5% family/premium cashback in integer kopecks", () => {
		const invoiceKop = 1000000; // 10 000 ₽

		// Base tier: 3% of 10 000 ₽ = 300 ₽ (30 000 kop)
		const baseAccrual = calculateLoyaltyAccrual({
			grossInvoiceKop: invoiceKop,
			discountKop: 0,
			pointsRedeemedKop: 0,
			excludedFromAccrualKop: 0,
			tierId: "silver", // base 3%
		});
		assert.equal(baseAccrual.accruedPointsRub, 300);
		assert.equal(baseAccrual.accruedPointsKop, 30000);

		// Premium / Gold tier (5% of 10 000 ₽ = 500 ₽ / 50 000 kop)
		const premiumAccrual = calculateLoyaltyAccrual({
			grossInvoiceKop: invoiceKop,
			discountKop: 0,
			pointsRedeemedKop: 0,
			excludedFromAccrualKop: 0,
			tierId: "gold", // 5%
		});
		assert.equal(premiumAccrual.accruedPointsRub, 500);
		assert.equal(premiumAccrual.accruedPointsKop, 50000);

		// With clean statutory dental standard custom rate (5%)
		const customStandardAccrual = calculateLoyaltyAccrual({
			grossInvoiceKop: invoiceKop,
			discountKop: 0,
			pointsRedeemedKop: 0,
			excludedFromAccrualKop: 0,
			tierId: "silver",
			customCashbackPercent: DENTAL_LOYALTY_STANDARDS.cashbackPercentPremium, // 5%
		});
		assert.equal(customStandardAccrual.accruedPointsRub, 500);
		assert.equal(customStandardAccrual.accruedPointsKop, 50000);
	});

	it("2.3 Clamps bonus payment to 30% of eligible invoice total", () => {
		const redemption = calculateLoyaltyRedemption({
			grossInvoiceKop: 3000000, // 30 000 ₽
			discountKop: 0,
			excludedFromRedemptionKop: 0,
			availablePointsBalanceRub: 20000,
			requestedPointsRub: 15000,
			tierId: "silver", // 30%
		});

		// 30% of 30 000 ₽ = 9 000 ₽
		assert.equal(redemption.maxAllowedRedemptionRub, 9000);
		assert.equal(redemption.actualRedeemedPointsRub, 9000);
		assert.equal(redemption.remainingPayableRub, 21000);
	});
});

describe("3. Referral Program («Приведи друга — обоим по 1000 бонусов на чистку»)", () => {
	it("3.1 Validates REFERRAL_HYGIENE_1000_PRESET configuration", () => {
		assert.equal(REFERRAL_HYGIENE_1000_PRESET.id, "ref_friend_hygiene_1000");
		assert.equal(REFERRAL_HYGIENE_1000_PRESET.referrerRewardRub, 1000);
		assert.equal(REFERRAL_HYGIENE_1000_PRESET.referrerRewardKop, 100000);
		assert.equal(REFERRAL_HYGIENE_1000_PRESET.referredFriendDiscountRub, 1000);
		assert.equal(REFERRAL_HYGIENE_1000_PRESET.referredFriendDiscountKop, 100000);
		assert.equal(REFERRAL_HYGIENE_1000_PRESET.minFriendSpendKop, 250000); // 2 500 ₽ threshold
		assert.match(REFERRAL_HYGIENE_1000_PRESET.titleRu, /1000 бонусов на чистку/);
	});

	it("3.2 Awards 1 000 ₽ bonus to referrer and 1 000 ₽ discount to friend when visit reaches 2 500 ₽ threshold", () => {
		const qualifyingInvoiceKop = 450000; // 4 500 ₽ (комплексная профгигиена)
		const rewardCalc = calculateReferralReward(qualifyingInvoiceKop, REFERRAL_HYGIENE_1000_PRESET);

		assert.equal(rewardCalc.isEligible, true);
		assert.equal(rewardCalc.referrerBonusRub, 1000);
		assert.equal(rewardCalc.referrerBonusKop, 100000);
		assert.equal(rewardCalc.invitedDiscountRub, 1000);
		assert.equal(rewardCalc.invitedDiscountKop, 100000);
		assert.equal(rewardCalc.missingSpendKop, 0);
	});

	it("3.3 Rejects referral bonus if friend's invoice is below clinical threshold (2 500 ₽)", () => {
		const subThresholdInvoiceKop = 150000; // 1 500 ₽ (только консультация)
		const rewardCalc = calculateReferralReward(subThresholdInvoiceKop, REFERRAL_HYGIENE_1000_PRESET);

		assert.equal(rewardCalc.isEligible, false);
		assert.equal(rewardCalc.referrerBonusRub, 0);
		assert.equal(rewardCalc.invitedDiscountRub, 0);
		assert.equal(rewardCalc.missingSpendKop, 100000); // Missing 1 000 ₽ to reach 2 500 ₽
	});

	it("3.4 Verifies REFERRAL_PROGRAM_PRESETS contains hygiene preset as the leading option", () => {
		assert.ok(REFERRAL_PROGRAM_PRESETS.length >= 2);
		assert.equal(REFERRAL_PROGRAM_PRESETS[0]?.id, "ref_friend_hygiene_1000");
	});
});

describe("4. 1-Click Express Guarantee Letters for Statutory DMS (Order 804n)", () => {
	it("4.1 Validates express presets have required statutory fields and Order 804n nomenclature codes", () => {
		assert.ok(EXPRESS_GUARANTEE_LETTER_PRESETS.length >= 4);

		for (const preset of EXPRESS_GUARANTEE_LETTER_PRESETS) {
			assert.ok(preset.maxCoverageRub >= 25000);
			assert.ok(preset.approvedServiceCodes804n.length >= 3);
			assert.ok(preset.approvedDiagnosisMkb10.length >= 1);
			// Codes must follow Order 804n format (e.g. A16.07.002.001 or B01.003...)
			for (const code of preset.approvedServiceCodes804n) {
				assert.match(code, /^[A-B]\d{2}\.\d{2}/);
			}
		}
	});

	it("4.2 Verifies express presets cover top insurers without bureaucratic barriers", () => {
		const keys = EXPRESS_GUARANTEE_LETTER_PRESETS.map((p) => p.insurerKey);
		assert.ok(keys.includes("sogaz"));
		assert.ok(keys.includes("ingosstrakh"));
		assert.ok(keys.includes("alfastrakhovanie"));
		assert.ok(keys.includes("reso_garantiya"));
	});
});
