/**
 * DENTE Dental CRM — Comprehensive Loyalty, Family Balance & Certificates SSOT Suite
 * Mandates Enforced:
 *   - Mandate 8b: Sweet Spot File Limits (Catalog 280-350 lines, Studio 380-480 lines, Launcher 60-100 lines)
 *   - Mandate 8e, 8n: Doctor Autonomy (Zero disabled buttons, 100% warranty override)
 *   - Mandate 8wy: Exact Integer Kopeck Money & 54-FZ Fiscal Receipt Split
 *   - Mandate 8am: Exactly ONE Primary CTA button #0d9488 (var(--teal))
 *   - Mandate 8ze: Apple HIG mobile ergonomics (Bottom Sheet drag handle 36x5px, touch >= 44x44px)
 *   - Mandate 8aq: Mounted in live AppShell.tsx & StandaloneLaunchers.tsx
 *   - Mandates 8x, 8ap: Clean clinical Russian language, zero foreign CRM names, zero cartoon emojis
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
	debitFamilySharedBalance,
	creditFamilySharedBalance,
	generateGiftCertificateSerial,
	validateGiftCertificateSerial,
	redeemGiftCertificate,
	calculateReferralReward,
	creditReferralBonus,
	evaluatePromoCode,
	exportLoyaltyLedgerToCsv,
	LOYALTY_TIER_PRESETS,
	DENTAL_LOYALTY_STANDARDS,
	GIFT_CERTIFICATE_CATALOG,
	REFERRAL_HYGIENE_1000_PRESET,
	type FamilyMember,
	type GiftCertificate,
} from "../loyaltyCatalogData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("DENTE Dental Loyalty, Family Balance & Certificates SSOT Suite", () => {
	// =========================================================================
	// 1. MANDATE 8b: SWEET SPOT FILE SIZE INQUISITION
	// =========================================================================
	describe("1. Mandate 8b — Sweet Spot Architectural File Size Limits", () => {
		it("verifies loyaltyCatalogData.ts is strictly within 280–350 lines", () => {
			const filePath = path.join(webSrcRoot, "components/loyalty/loyaltyCatalogData.ts");
			assert.ok(fs.existsSync(filePath), "loyaltyCatalogData.ts must exist");
			const lineCount = fs.readFileSync(filePath, "utf8").split("\n").length;
			assert.ok(lineCount >= 280 && lineCount <= 350, `loyaltyCatalogData.ts must be 280–350 lines, was ${lineCount}`);
		});

		it("verifies LoyaltyStudioModal.tsx is strictly within 380–480 lines", () => {
			const filePath = path.join(webSrcRoot, "components/loyalty/LoyaltyStudioModal.tsx");
			assert.ok(fs.existsSync(filePath), "LoyaltyStudioModal.tsx must exist");
			const lineCount = fs.readFileSync(filePath, "utf8").split("\n").length;
			assert.ok(lineCount >= 380 && lineCount <= 480, `LoyaltyStudioModal.tsx must be 380–480 lines, was ${lineCount}`);
		});

		it("verifies DirectLoyaltyLauncher.tsx is strictly within 60–100 lines", () => {
			const filePath = path.join(webSrcRoot, "components/loyalty/DirectLoyaltyLauncher.tsx");
			assert.ok(fs.existsSync(filePath), "DirectLoyaltyLauncher.tsx must exist");
			const lineCount = fs.readFileSync(filePath, "utf8").split("\n").length;
			assert.ok(lineCount >= 60 && lineCount <= 100, `DirectLoyaltyLauncher.tsx must be 60–100 lines, was ${lineCount}`);
		});
	});

	// =========================================================================
	// 2. MANDATE 8wy: EXACT INTEGER KOPECK MONEY & 54-FZ CASHBOX SPLIT
	// =========================================================================
	describe("2. Mandate 8wy — Exact Integer Kopeck Money & 54-FZ Split", () => {
		it("calculates exact cashback accrual in kopecks for tiers", () => {
			const resSilver = calculateLoyaltyAccrual({
				grossInvoiceKop: 1000000, // 10,000 RUB
				tierId: "silver",
			});
			assert.equal(resSilver.cashbackPercent, 3);
			assert.equal(resSilver.accruedPointsKop, 30000); // 300.00 RUB = 30,000 kop
			assert.equal(resSilver.accruedPointsRub, 300);

			const resGold = calculateLoyaltyAccrual({
				grossInvoiceKop: 2000000, // 20,000 RUB
				tierId: "gold",
			});
			assert.equal(resGold.cashbackPercent, 5);
			assert.equal(resGold.accruedPointsRub, 1000);
		});

		it("deducts excluded retail items and redeemed points from cashback accrual base", () => {
			const res = calculateLoyaltyAccrual({
				grossInvoiceKop: 1500000, // 15,000 RUB
				discountKop: 100000, // 1,000 RUB discount
				pointsRedeemedKop: 200000, // 2,000 RUB points
				excludedFromAccrualKop: 200000, // 2,000 RUB oral care shop items
				tierId: "gold",
			});
			// Out of pocket: 15,000 - 1,000 - 2,000 = 12,000 RUB (1,200,000 kop)
			assert.equal(res.paidOutOfPocketKop, 1200000);
			// Eligible base: 12,000 - 2,000 = 10,000 RUB (1,000,000 kop)
			assert.equal(res.eligibleBaseKop, 1000000);
			assert.equal(res.accruedPointsRub, 500); // 5% of 10,000 = 500 RUB
		});

		it("splits 54-FZ receipt into Tag 1215 (prepayment/bonus) and Tag 1081 (electronic card) with exact balance", () => {
			const redemption = calculateLoyaltyRedemption({
				grossInvoiceKop: 1000000, // 10,000 RUB
				availablePointsBalanceRub: 5000,
				requestedPointsRub: 3000,
				tierId: "silver", // 30% limit
			});
			assert.equal(redemption.actualRedeemedPointsRub, 3000);
			assert.equal(redemption.remainingPayableRub, 7000);
			assert.equal(redemption.fiscal54FzSplit.tag1215AdvancePrepaymentBonusKop, 300000);
			assert.equal(redemption.fiscal54FzSplit.tag1081ElectronicCardKop, 700000);
			assert.equal(
				redemption.fiscal54FzSplit.tag1215AdvancePrepaymentBonusKop +
				redemption.fiscal54FzSplit.tag1081ElectronicCardKop,
				1000000
			);
		});
	});

	// =========================================================================
	// 3. MANDATES 8e, 8n: DOCTOR AUTONOMY & WARRANTY 100% OVERRIDE
	// =========================================================================
	describe("3. Mandates 8e, 8n — Doctor Autonomy & Zero Disabled Buttons", () => {
		it("permits 100% invoice bonus coverage under doctor warranty override", () => {
			const overrideRes = calculateLoyaltyRedemption({
				grossInvoiceKop: 1200000, // 12,000 RUB
				availablePointsBalanceRub: 15000,
				requestedPointsRub: 12000,
				tierId: "silver", // standard limit is 30%
				isDoctorOverride: true,
			});
			assert.equal(overrideRes.maxAllowedRedemptionRub, 12000);
			assert.equal(overrideRes.actualRedeemedPointsRub, 12000);
			assert.equal(overrideRes.remainingPayableRub, 0);
			assert.equal(overrideRes.fiscal54FzSplit.tag1215AdvancePrepaymentBonusKop, 1200000);
			assert.equal(overrideRes.fiscal54FzSplit.tag1081ElectronicCardKop, 0);
		});

		it("verifies LoyaltyStudioModal does NOT contain disabled attribute on redemption buttons", () => {
			const studioCode = fs.readFileSync(path.join(webSrcRoot, "components/loyalty/LoyaltyStudioModal.tsx"), "utf8");
			assert.doesNotMatch(studioCode, /data-testid="loyalty-execute-redemption-btn"[^>]*disabled=/s, "Execute redemption button must NOT have disabled attribute");
			assert.doesNotMatch(studioCode, /className="loyalty-quick-btn one-click-btn"[^>]*disabled=/s, "Quick buttons must NOT have disabled attribute");
		});
	});

	// =========================================================================
	// 4. FAMILY POOL & ONE-WALLET REDEMPTION
	// =========================================================================
	describe("4. Family Pool & Single-Wallet Transfer-Free Redemption", () => {
		const familyMembers: readonly FamilyMember[] = [
			{ patientId: "p1", fullName: "Иванов Иван", roleRu: "Глава семьи", individualPointsBalance: 3000, lifetimeSpentKop: 10000000, isBonusSpendingAllowed: true },
			{ patientId: "p2", fullName: "Иванова Ольга", roleRu: "Супруга", individualPointsBalance: 2000, lifetimeSpentKop: 8000000, isBonusSpendingAllowed: true },
			{ patientId: "p3", fullName: "Иванов Артем", roleRu: "Ребенок", individualPointsBalance: 500, lifetimeSpentKop: 2000000, isBonusSpendingAllowed: true },
		];

		it("pools points from all family members into a unified balance", () => {
			const pool = calculateFamilyPoolBalance("fam-1", "Семья Ивановых", familyMembers);
			assert.equal(pool.memberCount, 3);
			assert.equal(pool.totalPooledPoints, 5500); // 3000 + 2000 + 500
			assert.equal(pool.totalFamilyLifetimeSpentRub, 200000);
			assert.equal(pool.effectiveTier.id, "family");
		});

		it("debits child treatment from family pool without transfer fee", () => {
			const debitRes = debitFamilySharedBalance({
				familyGroupId: "fam-1",
				familyName: "Семья Ивановых",
				sponsorPatientId: "p1",
				sponsorFullName: "Иванов Иван",
				targetPatientId: "p3",
				targetPatientName: "Иванов Артем",
				targetRoleRu: "Ребенок",
				invoiceAmountKop: 800000, // 8,000 RUB
				availableFamilyPointsRub: 5500,
				requestedPointsRub: 2400, // 30% limit
				maxCoveragePercent: 30,
			});
			assert.equal(debitRes.success, true);
			assert.equal(debitRes.isOneWalletTransferFree, true);
			assert.equal(debitRes.debitedPointsRub, 2400);
			assert.equal(debitRes.remainingFamilyBalanceRub, 3100);
			assert.equal(debitRes.remainingInvoiceDueRub, 5600);
			assert.ok(debitRes.ledgerEntry.id.startsWith("fam-tx-"));
		});
	});

	// =========================================================================
	// 5. GIFT CERTIFICATES (16-DIGIT LUHN CHECKSUM & REDEMPTION)
	// =========================================================================
	describe("5. Gift Certificates — 16-Digit Luhn Serials & Redemption", () => {
		it("generates deterministic serials and validates with Luhn algorithm", () => {
			const serial = generateGiftCertificateSerial(42);
			assert.equal(validateGiftCertificateSerial(serial), true);
			assert.match(serial, /^7701-\d{4}-\d{4}-\d{4}$/);
		});

		it("rejects corrupted serial numbers", () => {
			assert.equal(validateGiftCertificateSerial("7701-1234-5678-9999"), false);
			assert.equal(validateGiftCertificateSerial("invalid-serial"), false);
		});

		it("partially redeems certificate balance against invoice", () => {
			const validSerial = generateGiftCertificateSerial(10);
			const cert: GiftCertificate = {
				id: "cert-1",
				serialNumber: validSerial,
				nominalRub: 10000,
				initialBalanceKop: 1000000,
				currentBalanceKop: 1000000,
				status: "active",
				issuedAtIso: "2026-01-01",
				expiresAtIso: "2027-01-01",
			};
			const res = redeemGiftCertificate(cert, 400000); // 4,000 RUB invoice
			assert.equal(res.success, true);
			assert.equal(res.redeemedAmountKop, 400000);
			assert.equal(res.newBalanceKop, 600000);
			assert.equal(res.newStatus, "active");
		});

		it("rejects expired certificates", () => {
			const validSerial = generateGiftCertificateSerial(11);
			const expiredCert: GiftCertificate = {
				id: "cert-exp",
				serialNumber: validSerial,
				nominalRub: 5000,
				initialBalanceKop: 500000,
				currentBalanceKop: 500000,
				status: "active",
				issuedAtIso: "2024-01-01",
				expiresAtIso: "2025-01-01",
			};
			const res = redeemGiftCertificate(expiredCert, 300000, "2026-08-01");
			assert.equal(res.success, false);
			assert.equal(res.newStatus, "expired");
		});
	});

	// =========================================================================
	// 6. REFERRAL PROGRAM («ПРИВЕДИ ДРУГА — ОБОИМ ПО 1000 БОНУСОВ»)
	// =========================================================================
	describe("6. Referral Program Standards", () => {
		it("awards 1 000 bonus when friend spends >= 2 500 RUB on hygiene/treatment", () => {
			const qualifyingInvoiceKop = 350000; // 3,500 RUB
			const reward = calculateReferralReward(qualifyingInvoiceKop, REFERRAL_HYGIENE_1000_PRESET);
			assert.equal(reward.isEligible, true);
			assert.equal(reward.referrerBonusRub, 1000);
			assert.equal(reward.invitedDiscountRub, 1000);
		});

		it("rejects bonus if friend spends less than 2 500 RUB threshold", () => {
			const subThresholdInvoiceKop = 150000; // 1,500 RUB
			const reward = calculateReferralReward(subThresholdInvoiceKop, REFERRAL_HYGIENE_1000_PRESET);
			assert.equal(reward.isEligible, false);
			assert.equal(reward.referrerBonusRub, 0);
			assert.equal(reward.missingSpendKop, 100000); // missing 1,000 RUB
		});
	});

	// =========================================================================
	// 7. MANDATES 8am, 8ze: APPLE HIG & SINGLE PRIMARY CTA
	// =========================================================================
	describe("7. Mandates 8am, 8ze — Single Primary CTA & Apple HIG", () => {
		it("verifies single primary CTA class in LoyaltyStudioModal", () => {
			const code = fs.readFileSync(path.join(webSrcRoot, "components/loyalty/LoyaltyStudioModal.tsx"), "utf8");
			const matches = code.match(/className="loyalty-primary-cta"/g);
			assert.equal(matches?.length, 1, "Must contain exactly ONE Primary CTA button");
		});

		it("verifies touch ergonomics and mobile drag handle in stylesheet", () => {
			const cssCode = fs.readFileSync(path.join(webSrcRoot, "components/loyalty/loyaltyStudio.css"), "utf8");
			assert.ok(cssCode.includes("loyalty-modal-drag-handle"), "Must contain drag handle for mobile bottom sheet");
			assert.ok(cssCode.includes("min-height: 44px") || cssCode.includes("height: 44px") || cssCode.includes("min-height: 48px"), "Must respect touch target ergonomics >= 44px");
			assert.ok(cssCode.includes("rounded-t-[24px]") || cssCode.includes("border-radius: 24px 24px 0 0"), "Must style top rounded corners for Apple HIG");
		});
	});

	// =========================================================================
	// 8. MANDATE 8aq: LIVE UI MOUNTING IN APPSHELL & STANDALONELAUNCHERS
	// =========================================================================
	describe("8. Mandate 8aq — Live UI Mounting", () => {
		it("verifies DirectLoyaltyLauncher is mounted in AppShell.tsx", () => {
			const shellCode = fs.readFileSync(path.join(webSrcRoot, "AppShell.tsx"), "utf8");
			assert.ok(shellCode.includes("DirectLoyaltyLauncher"), "AppShell.tsx must import DirectLoyaltyLauncher");
			assert.ok(shellCode.includes("<DirectLoyaltyLauncher />"), "AppShell.tsx must render <DirectLoyaltyLauncher />");
		});

		it("verifies DirectLoyaltyLauncher is mounted in StandaloneLaunchers.tsx", () => {
			const launchersCode = fs.readFileSync(path.join(webSrcRoot, "components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx"), "utf8");
			assert.ok(launchersCode.includes("DirectLoyaltyLauncher"), "StandaloneLaunchers.tsx must import DirectLoyaltyLauncher");
			assert.ok(launchersCode.includes("#loyalty"), "StandaloneLaunchers.tsx must handle #loyalty hash");
		});
	});

	// =========================================================================
	// 9. MANDATES 8x, 8ap, 8d pt 7: CLEAN RUSSIAN CLINICAL LANGUAGE
	// =========================================================================
	describe("9. Mandates 8x, 8ap, 8d pt 7 — Clean Clinical Language & Zero Cartoon Emojis", () => {
		it("verifies zero forbidden competitors (IDENT, DentalPRO, StomX, iStom)", () => {
			const catalogCode = fs.readFileSync(path.join(webSrcRoot, "components/loyalty/loyaltyCatalogData.ts"), "utf8");
			const studioCode = fs.readFileSync(path.join(webSrcRoot, "components/loyalty/LoyaltyStudioModal.tsx"), "utf8");
			for (const brand of ["IDENT", "DentalPRO", "StomX", "iStom"]) {
				assert.ok(!catalogCode.includes(brand), `Must not contain ${brand}`);
				assert.ok(!studioCode.includes(brand), `Must not contain ${brand}`);
			}
		});

		it("verifies clean human clinical terms instead of dev slang", () => {
			const studioCode = fs.readFileSync(path.join(webSrcRoot, "components/loyalty/LoyaltyStudioModal.tsx"), "utf8");
			assert.ok(studioCode.includes("Семейный баланс") || studioCode.includes("Семейный счет"));
			assert.ok(studioCode.includes("Оплата бонусами на кассе"));
			assert.ok(studioCode.includes("Программа лояльности и скидок"));
		});
	});
});
