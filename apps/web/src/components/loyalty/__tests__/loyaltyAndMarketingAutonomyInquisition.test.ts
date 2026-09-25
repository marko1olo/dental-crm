/**
 * DENTE Dental CRM — Red Team Constitutional Inquisition Test Suite
 * Mandates Enforced:
 *   - Mandates 8e, 8n: Doctor & Admin Autonomy (Zero disabled buttons, 100% warranty override)
 *   - Mandate 8b: Integer Kopeck Exact Money & 54-FZ Fiscal Receipt Split
 *   - Mandates 8i, 8s: Corporate MLM Bloat Demolition & Practical "Привёл друга" Referral Retention
 *   - Mandate 8d pt 7: Zero Cartoon Emojis across Marketing, Leads & Loyalty
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	calculateLoyaltyAccrual,
	calculateLoyaltyRedemption,
	calculateTierProgression,
	calculateFamilyPoolBalance,
	calculateReferralReward,
	creditReferralBonus,
	type PatientReferralRecord,
	type FamilyMember,
} from "../program/loyaltyEngine";
import {
	DEFAULT_REFERRAL_PRESET,
	LOYALTY_TIER_PRESETS,
	REFERRAL_PROGRAM_PRESETS,
} from "../program/loyaltyPresets";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Red Team Constitutional Inquisition — Marketing, Leads & Loyalty Systems", () => {
	// =========================================================================
	// 1. MANDATES 8e, 8n: DOCTOR AUTONOMY & WARRANTY REWORK OVERRIDE
	// =========================================================================
	describe("1. Mandates 8e, 8n — Doctor Autonomy & Warranty Rework Overrides", () => {
		it("should permit 100% bonus coverage of invoice when isDoctorOverride is enabled, overriding tier limits", () => {
			// Normal Bronze tier limit is 15% redemption
			const invoiceKop = 1500000; // 15,000 RUB
			const balanceRub = 20000; // 20,000 RUB balance available

			const standardResult = calculateLoyaltyRedemption({
				grossInvoiceKop: invoiceKop,
				discountKop: 0,
				availablePointsBalanceRub: balanceRub,
				requestedPointsRub: 15000,
				tierId: "silver",
				isDoctorOverride: false,
			});

			// Standard Silver limit: 30% of 15,000 RUB = 4,500 RUB max
			assert.equal(standardResult.maxAllowedRedemptionRub, 4500);
			assert.equal(standardResult.actualRedeemedPointsRub, 4500);
			assert.equal(standardResult.remainingPayableRub, 10500);

			// Doctor autonomy override: warranty rework or clinical decision -> 100% coverage
			const doctorOverrideResult = calculateLoyaltyRedemption({
				grossInvoiceKop: invoiceKop,
				discountKop: 0,
				availablePointsBalanceRub: balanceRub,
				requestedPointsRub: 15000,
				tierId: "silver",
				isDoctorOverride: true,
			});

			assert.equal(doctorOverrideResult.maxAllowedRedemptionRub, 15000);
			assert.equal(doctorOverrideResult.actualRedeemedPointsRub, 15000);
			assert.equal(doctorOverrideResult.remainingPayableRub, 0);
			assert.equal(
				doctorOverrideResult.fiscal54FzSplit.tag1215AdvancePrepaymentBonusKop,
				1500000
			);
			assert.equal(
				doctorOverrideResult.fiscal54FzSplit.tag1081ElectronicCardKop,
				0
			);
		});

		it("should handle zero-invoice and zero-balance cases safely without crashing", () => {
			const zeroInvoiceResult = calculateLoyaltyRedemption({
				grossInvoiceKop: 0,
				discountKop: 0,
				availablePointsBalanceRub: 500,
				requestedPointsRub: 500,
				tierId: "silver",
			});
			assert.equal(zeroInvoiceResult.actualRedeemedPointsRub, 0);
			assert.equal(zeroInvoiceResult.remainingPayableRub, 0);

			const zeroBalanceResult = calculateLoyaltyRedemption({
				grossInvoiceKop: 500000,
				discountKop: 0,
				availablePointsBalanceRub: 0,
				requestedPointsRub: 500,
				tierId: "silver",
			});
			assert.equal(zeroBalanceResult.actualRedeemedPointsRub, 0);
			assert.equal(zeroBalanceResult.remainingPayableRub, 5000);
		});
	});

	// =========================================================================
	// 2. MANDATE 8b: EXACT INTEGER KOPECK MONEY CALCULATIONS
	// =========================================================================
	describe("2. Mandate 8b — Exact Integer Kopeck Calculations (No Float Drift)", () => {
		it("should maintain exact 54-FZ fiscal receipt split balance down to the single kopeck", () => {
			const grossKop = 1234567; // 12,345.67 RUB
			const excludedKop = 123456; // 1,234.56 RUB excluded (e.g. hygiene goods)
			const balanceRub = 10000;

			const result = calculateLoyaltyRedemption({
				grossInvoiceKop: grossKop,
				discountKop: 0,
				excludedFromRedemptionKop: excludedKop,
				availablePointsBalanceRub: balanceRub,
				requestedPointsRub: 5000,
				tierId: "gold", // 25% max redemption
			});

			// Invariant 1: redeemableBaseKop + excludedFromRedemptionKop === grossInvoiceKop
			assert.equal(result.redeemableBaseKop + result.excludedFromRedemptionKop, grossKop);

			// Invariant 2: fiscal tag1215 + fiscal tag1081 === grossInvoiceKop
			assert.equal(
				result.fiscal54FzSplit.tag1215AdvancePrepaymentBonusKop +
					result.fiscal54FzSplit.tag1081ElectronicCardKop,
				grossKop
			);

			// Invariant 3: all values are integers
			assert.ok(Number.isInteger(result.fiscal54FzSplit.tag1215AdvancePrepaymentBonusKop));
			assert.ok(Number.isInteger(result.fiscal54FzSplit.tag1081ElectronicCardKop));
			assert.ok(Number.isInteger(result.actualRedeemedPointsKop));
		});

		it("should calculate exact integer cashback accrual with exclusion rules", () => {
			const grossKop = 777777; // 7,777.77 RUB
			const discountKop = 77777; // 777.77 RUB
			const redeemedPointsKop = 100000; // 1,000.00 RUB points
			const excludedKop = 50000; // 500.00 RUB excluded items

			const accrual = calculateLoyaltyAccrual({
				grossInvoiceKop: grossKop,
				discountKop,
				pointsRedeemedKop: redeemedPointsKop,
				excludedFromAccrualKop: excludedKop,
				tierId: "platinum", // 7% cashback
			});

			// Out-of-pocket: 777777 - 77777 - 100000 = 600000 kop (6,000.00 RUB)
			assert.equal(accrual.paidOutOfPocketKop, 600000);
			// Eligible: 600000 - 50000 = 550000 kop (5,500.00 RUB)
			assert.equal(accrual.eligibleBaseKop, 550000);
			// Accrual: 7% of 5,500 = 385.00 RUB (38,500 kop)
			assert.equal(accrual.accruedPointsKop, 38500);
			assert.equal(accrual.accruedPointsRub, 385);
			assert.ok(Number.isInteger(accrual.accruedPointsKop));
		});
	});

	// =========================================================================
	// 3. MANDATES 8i, 8s: CORPORATE MLM DEMOLITION & PRACTICAL REFERRALS
	// =========================================================================
	describe("3. Mandates 8i, 8s — Corporate MLM Bloat Demolition & Practical Referral Engine", () => {
		it("should reject referral reward if friend's invoice is below clinical threshold (2,500 RUB)", () => {
			const invoiceKop = 200000; // 2,000 RUB (< 2,500 RUB min)
			const rewardCalc = calculateReferralReward(invoiceKop, DEFAULT_REFERRAL_PRESET);

			assert.equal(rewardCalc.isEligible, false);
			assert.equal(rewardCalc.referrerBonusKop, 0);
			assert.equal(rewardCalc.invitedDiscountKop, 0);
			assert.equal(rewardCalc.missingSpendKop, 50000); // Missing 500 RUB (50,000 kop)
			assert.match(rewardCalc.explanationRu, /не достигла порога/);
		});

		it("should calculate exact 500 RUB bonus for referrer and 500 RUB discount for friend when threshold is met", () => {
			const invoiceKop = 450000; // 4,500 RUB (>= 2,500 RUB)
			const rewardCalc = calculateReferralReward(invoiceKop, DEFAULT_REFERRAL_PRESET);

			assert.equal(rewardCalc.isEligible, true);
			assert.equal(rewardCalc.referrerBonusKop, 50000); // 500 RUB
			assert.equal(rewardCalc.referrerBonusRub, 500);
			assert.equal(rewardCalc.invitedDiscountKop, 50000); // 500 RUB
			assert.equal(rewardCalc.invitedDiscountRub, 500);
			assert.equal(rewardCalc.missingSpendKop, 0);
		});

		it("should execute creditReferralBonus, updating referral status and generating a valid ledger entry", () => {
			const referralRecord: PatientReferralRecord = {
				id: "ref-test-01",
				referrerPatientId: "pat-100",
				referrerPatientName: "Соколова Марина",
				referredPatientName: "Смирнов Денис",
				referredPatientPhone: "+7 (999) 111-22-33",
				createdAtIso: "2026-09-01T10:00:00Z",
				status: "first_visit_completed",
				firstVisitInvoiceKop: 350000,
				rewardPreset: DEFAULT_REFERRAL_PRESET,
				rewardRub: 500,
				isRewardCredited: false,
			};

			const currentBalanceRub = 1200;
			const creditResult = creditReferralBonus(referralRecord, currentBalanceRub);

			assert.equal(creditResult.bonusRub, 500);
			assert.equal(creditResult.newBalanceRub, 1700);
			assert.equal(creditResult.updatedReferral.isRewardCredited, true);
			assert.equal(creditResult.updatedReferral.status, "reward_credited");

			// Check ledger entry
			const entry = creditResult.ledgerEntry;
			assert.equal(entry.operationType, "referral_reward");
			assert.equal(entry.patientId, "pat-100");
			assert.equal(entry.patientName, "Соколова Марина");
			assert.equal(entry.pointsDeltaRub, 500);
			assert.equal(entry.balanceAfterRub, 1700);
			assert.match(entry.noteRu, /Смирнов Денис/);
		});

		it("should verify all referral program presets use exact integer kopecks", () => {
			for (const preset of REFERRAL_PROGRAM_PRESETS) {
				assert.ok(Number.isInteger(preset.minFriendSpendKop));
				assert.ok(Number.isInteger(preset.referrerRewardKop));
				assert.ok(Number.isInteger(preset.referredFriendDiscountKop));
				assert.ok(preset.minFriendSpendKop > 0);
				assert.ok(preset.referrerRewardKop > 0);
				assert.ok(preset.referredFriendDiscountKop > 0);
			}
		});
	});

	// =========================================================================
	// 4. MANDATE 8d pt 7: STRICT BAN ON CARTOON EMOJIS
	// =========================================================================
	describe("4. Mandate 8d pt 7 — Strict Zero Cartoon Emojis Law", () => {
		const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

		const targetDirectories = [
			path.resolve(__dirname, "../../marketing"),
			path.resolve(__dirname, "../../leads"),
			path.resolve(__dirname, "../../loyalty"),
		];

		it("should verify ZERO cartoon emojis across all marketing, leads, and loyalty component files", () => {
			const filesWithEmojis: { file: string; line: number; text: string }[] = [];

			function scanDir(dirPath: string) {
				if (!fs.existsSync(dirPath)) return;
				const entries = fs.readdirSync(dirPath, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = path.join(dirPath, entry.name);
					if (entry.isDirectory()) {
						if (entry.name !== "node_modules" && entry.name !== "__tests__") {
							scanDir(fullPath);
						}
					} else if (/\.(tsx?|jsx?|css)$/.test(entry.name)) {
						const content = fs.readFileSync(fullPath, "utf8");
						const lines = content.split("\n");
						lines.forEach((line, idx) => {
							if (emojiRegex.test(line)) {
								filesWithEmojis.push({
									file: path.relative(path.resolve(__dirname, "../../../../.."), fullPath),
									line: idx + 1,
									text: line.trim(),
								});
							}
						});
					}
				}
			}

			for (const dir of targetDirectories) {
				scanDir(dir);
			}

			assert.deepEqual(
				filesWithEmojis,
				[],
				`Found forbidden cartoon emojis in production files:\n${filesWithEmojis.map((e) => `  ${e.file}:${e.line} -> ${e.text}`).join("\n")}`
			);
		});
	});

	// =========================================================================
	// 5. CORPORATE SALES GIMMICKS DEMOLISHED: ZERO "КУРАТОР ЛЕЧЕНИЯ"
	// =========================================================================
	describe("5. Corporate Sales Gimmick Demolition — Chairside Dentist vs 'Куратор лечения'", () => {
		it("should verify that LeadsFunnelAnalyticsModal does NOT contain corporate 'куратора лечения' slogans", () => {
			const filePath = path.resolve(__dirname, "../../leads/LeadsFunnelAnalyticsModal.tsx");
			const content = fs.readFileSync(filePath, "utf8");

			assert.doesNotMatch(
				content,
				/куратора лечения/i,
				"LeadsFunnelAnalyticsModal must not contain corporate 'куратора лечения' sales consultant bloat"
			);
			assert.match(
				content,
				/консультации врача у кресла/i,
				"LeadsFunnelAnalyticsModal must emphasize chairside dentist consultation"
			);
		});

		it("should verify loyalty presets do NOT contain corporate 'куратор 24/7' slogans", () => {
			const filePath = path.resolve(__dirname, "../program/loyaltyPresets.ts");
			const content = fs.readFileSync(filePath, "utf8");

			assert.doesNotMatch(
				content,
				/куратор 24\/7/i,
				"loyaltyPresets must not contain corporate 'куратор 24/7' marketing slogans"
			);
			assert.match(
				content,
				/приоритетная связь с лечащим врачом/i,
				"loyaltyPresets must emphasize direct priority contact with the treating physician"
			);
		});
	});

	// =========================================================================
	// 6. ZERO DISABLED BUTTONS AUDIT IN LOYALTY MODAL
	// =========================================================================
	describe("6. Mandate 8e — Zero Disabled Buttons in Loyalty Program Modal", () => {
		it("should verify LoyaltyProgramModal code does NOT hard-disable one-click or execute redemption buttons", () => {
			const modalPath = path.resolve(__dirname, "../program/LoyaltyProgramModal.tsx");
			const content = fs.readFileSync(modalPath, "utf8");

			// Check that one-click-btn does not have disabled attribute
			assert.doesNotMatch(
				content,
				/className="loyalty-quick-btn one-click-btn"[^>]*disabled=/s,
				"One-click redemption button must NOT have disabled attribute"
			);

			// Check that execute-redemption button does not have disabled attribute
			assert.doesNotMatch(
				content,
				/data-testid="loyalty-execute-redemption-btn"[^>]*disabled=/s,
				"Execute redemption button must NOT have disabled attribute"
			);
		});
	});
});
