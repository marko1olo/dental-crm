/**
 * DENTE Dental CRM — Statutory Dental Loyalty, Bonus & Gift Certificate Math Engine Unit Tests
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateLoyaltyAccrual,
	calculateLoyaltyRedemption,
	calculateTierProgression,
	generateGiftCertificateSerial,
	validateGiftCertificateSerial,
	redeemGiftCertificate,
	calculateFamilyPoolBalance,
	evaluatePromoCode,
	exportLoyaltyLedgerToCsv,
	type GiftCertificate,
	type FamilyMember,
	type LoyaltyLedgerEntry,
} from "../components/loyalty/program/loyaltyEngine";
import {
	LOYALTY_TIER_PRESETS,
	GIFT_CERTIFICATE_CATALOG,
	PROMO_CODE_PRESETS,
	LOYALTY_EXCLUSION_RULES,
} from "../components/loyalty/program/loyaltyPresets";

describe("Statutory Dental Loyalty Math Engine", () => {
	describe("1. calculateLoyaltyAccrual — Kopeck-Exact Cashback Calculation", () => {
		it("should calculate 3% cashback for Silver tier on therapeutic service", () => {
			const res = calculateLoyaltyAccrual({
				grossInvoiceKop: 1000000, // 10,000 RUB
				discountKop: 0,
				pointsRedeemedKop: 0,
				tierId: "silver",
			});

			assert.equal(res.grossInvoiceKop, 1000000);
			assert.equal(res.eligibleBaseKop, 1000000);
			assert.equal(res.cashbackPercent, 3);
			assert.equal(res.accruedPointsKop, 30000); // 300.00 RUB = 30,000 kop
			assert.equal(res.accruedPointsRub, 300);
			assert.equal(res.tierNameRu, "Серебряный");
		});

		it("should deduct discounts and redeemed points from accrual base (no cashback on bonus payment)", () => {
			const res = calculateLoyaltyAccrual({
				grossInvoiceKop: 1000000, // 10,000 RUB
				discountKop: 100000, // 1,000 RUB discount
				pointsRedeemedKop: 200000, // 2,000 RUB bonus points redeemed
				excludedFromAccrualKop: 100000, // 1,000 RUB oral care shop items
				tierId: "gold", // 5% cashback
			});

			// Out of pocket: 10,000 - 1,000 - 2,000 = 7,000 RUB (700,000 kop)
			assert.equal(res.paidOutOfPocketKop, 700000);
			// Eligible base: 7,000 - 1,000 (excluded retail) = 6,000 RUB (600,000 kop)
			assert.equal(res.eligibleBaseKop, 600000);
			assert.equal(res.cashbackPercent, 5);
			// Accrual: 5% of 6,000 = 300 RUB (30,000 kop)
			assert.equal(res.accruedPointsKop, 30000);
			assert.equal(res.accruedPointsRub, 300);
		});

		it("should calculate 7% cashback for VIP Platinum tier and 6% for Family tier", () => {
			const platRes = calculateLoyaltyAccrual({
				grossInvoiceKop: 5000000, // 50,000 RUB
				tierId: "platinum",
			});
			assert.equal(platRes.cashbackPercent, 7);
			assert.equal(platRes.accruedPointsRub, 3500); // 7% of 50k = 3,500 pts

			const famRes = calculateLoyaltyAccrual({
				grossInvoiceKop: 5000000,
				tierId: "family",
			});
			assert.equal(famRes.cashbackPercent, 6);
			assert.equal(famRes.accruedPointsRub, 3000); // 6% of 50k = 3,000 pts
		});
	});

	describe("2. calculateLoyaltyRedemption — 54-FZ Fiscal Receipt Split & Limits", () => {
		it("should clamp bonus redemption to 30% coverage limit for Silver tier", () => {
			const res = calculateLoyaltyRedemption({
				grossInvoiceKop: 1000000, // 10,000 RUB
				availablePointsBalanceRub: 5000, // 5,000 pts available
				requestedPointsRub: 5000, // cashier requested 5,000
				tierId: "silver", // max coverage 30%
			});

			assert.equal(res.maxCoveragePercent, 30);
			// Max allowed: 30% of 10,000 = 3,000 RUB (300,000 kop)
			assert.equal(res.maxAllowedRedemptionRub, 3000);
			assert.equal(res.actualRedeemedPointsRub, 3000);
			assert.equal(res.isMaxLimitReached, true);
			assert.equal(res.remainingPointsBalanceRub, 2000); // 5000 - 3000
			assert.equal(res.remainingPayableRub, 7000); // 10000 - 3000

			// 54-FZ Fiscal split
			assert.equal(res.fiscal54FzSplit.tag1215AdvancePrepaymentBonusKop, 300000);
			assert.equal(res.fiscal54FzSplit.tag1081ElectronicCardKop, 700000);
			assert.equal(res.fiscal54FzSplit.totalNetPayableKop, 700000);
		});

		it("should exclude CAD/CAM lab expenses and titanium hardware from bonus redemption base", () => {
			const res = calculateLoyaltyRedemption({
				grossInvoiceKop: 5000000, // 50,000 RUB (e.g. crown + therapy)
				excludedFromRedemptionKop: 2000000, // 20,000 RUB lab cost for zirconia crown
				availablePointsBalanceRub: 15000,
				requestedPointsRub: 15000,
				tierId: "gold", // max coverage 40%
			});

			// Redeemable base: 50,000 - 20,000 = 30,000 RUB (3,000,000 kop)
			assert.equal(res.redeemableBaseKop, 3000000);
			// Max allowed: 40% of 30,000 = 12,000 RUB
			assert.equal(res.maxAllowedRedemptionRub, 12000);
			assert.equal(res.actualRedeemedPointsRub, 12000);
			// Remaining payable: 50,000 - 12,000 = 38,000 RUB
			assert.equal(res.remainingPayableRub, 38000);
			assert.equal(res.isExcludedItemsPresent, true);
		});

		it("should allow up to 50% invoice payment for Platinum VIP tier", () => {
			const res = calculateLoyaltyRedemption({
				grossInvoiceKop: 2000000, // 20,000 RUB
				availablePointsBalanceRub: 15000,
				requestedPointsRub: 10000,
				tierId: "platinum", // 50%
			});

			assert.equal(res.maxCoveragePercent, 50);
			assert.equal(res.maxAllowedRedemptionRub, 10000);
			assert.equal(res.actualRedeemedPointsRub, 10000);
			assert.equal(res.remainingPayableRub, 10000);
			assert.equal(res.remainingPointsBalanceRub, 5000);
		});
	});

	describe("3. calculateTierProgression — Upgrades & Spend Milestones", () => {
		it("should accurately determine Silver to Gold progression", () => {
			const res = calculateTierProgression(7500000); // 75,000 RUB (halfway to 150k)
			assert.equal(res.currentTier.id, "silver");
			assert.equal(res.nextTier?.id, "gold");
			assert.equal(res.progressPercent, 50);
			assert.equal(res.remainingToNextTierRub, 75000);
		});

		it("should accurately determine Gold to Platinum progression", () => {
			const res = calculateTierProgression(27500000); // 275,000 RUB (between 150k and 400k)
			assert.equal(res.currentTier.id, "gold");
			assert.equal(res.nextTier?.id, "platinum");
			// Span: 400k - 150k = 250k. Progress: 275k - 150k = 125k (50%)
			assert.equal(res.progressPercent, 50);
			assert.equal(res.remainingToNextTierRub, 125000);
		});

		it("should identify VIP Platinum tier when spend exceeds 400 000 RUB", () => {
			const res = calculateTierProgression(45000000); // 450,000 RUB
			assert.equal(res.currentTier.id, "platinum");
			assert.equal(res.nextTier, null);
			assert.equal(res.progressPercent, 100);
			assert.equal(res.remainingToNextTierRub, 0);
		});
	});

	describe("4. Gift Certificates — 16-Digit Luhn Serials & Redemption", () => {
		it("should generate and validate 16-digit Luhn serial numbers", () => {
			for (let seed = 1; seed <= 5; seed++) {
				const serial = generateGiftCertificateSerial(seed);
				assert.match(serial, /^\d{4}-\d{4}-\d{4}-\d{4}$/);
				assert.equal(validateGiftCertificateSerial(serial), true);
			}
		});

		it("should reject corrupted or invalid serial numbers", () => {
			assert.equal(validateGiftCertificateSerial("1234-5678-9012-3456"), false);
			assert.equal(validateGiftCertificateSerial("invalid-serial"), false);
			assert.equal(validateGiftCertificateSerial("7701-1234-5678"), false);
		});

		it("should perform partial redemption of gift certificate balance", () => {
			const serial = generateGiftCertificateSerial(10);
			const cert: GiftCertificate = {
				id: "c-1",
				serialNumber: serial,
				nominalKop: 1000000, // 10,000 RUB
				initialBalanceKop: 1000000,
				currentBalanceKop: 1000000,
				status: "active",
				issuedAtIso: "2026-08-01",
				expiresAtIso: "2027-08-01",
			};

			// Redeem 4,000 RUB for tooth filling
			const res = redeemGiftCertificate(cert, 400000, "2026-08-22");
			assert.equal(res.success, true);
			assert.equal(res.redeemedAmountKop, 400000);
			assert.equal(res.newBalanceKop, 600000); // 6,000 RUB left
			assert.equal(res.newStatus, "active");
			assert.equal(res.remainingInvoiceAmountKop, 0);
		});

		it("should deplete certificate when invoice exceeds remaining balance", () => {
			const serial = generateGiftCertificateSerial(11);
			const cert: GiftCertificate = {
				id: "c-2",
				serialNumber: serial,
				nominalKop: 500000, // 5,000 RUB
				initialBalanceKop: 500000,
				currentBalanceKop: 500000,
				status: "active",
				issuedAtIso: "2026-08-01",
				expiresAtIso: "2027-08-01",
			};

			// Redeem against 12,000 RUB invoice
			const res = redeemGiftCertificate(cert, 1200000, "2026-08-22");
			assert.equal(res.success, true);
			assert.equal(res.redeemedAmountKop, 500000);
			assert.equal(res.newBalanceKop, 0);
			assert.equal(res.newStatus, "depleted");
			assert.equal(res.remainingInvoiceAmountKop, 700000); // 7,000 RUB remaining to pay
		});

		it("should reject redemption of expired or cancelled certificates", () => {
			const serial = generateGiftCertificateSerial(12);
			const expiredCert: GiftCertificate = {
				id: "c-3",
				serialNumber: serial,
				nominalKop: 500000,
				initialBalanceKop: 500000,
				currentBalanceKop: 500000,
				status: "active",
				issuedAtIso: "2025-01-01",
				expiresAtIso: "2026-01-01", // Expired
			};

			const res = redeemGiftCertificate(expiredCert, 300000, "2026-08-22");
			assert.equal(res.success, false);
			assert.equal(res.newStatus, "expired");
			assert.match(res.errorMessageRu!, /Срок действия сертификата истек/);
		});
	});

	describe("5. calculateFamilyPoolBalance — Family Group Pooling", () => {
		it("should aggregate balances and lifetime spending of all family members", () => {
			const members: readonly FamilyMember[] = [
				{
					patientId: "p1",
					fullName: "Папа",
					roleRu: "Глава семьи",
					individualPointsBalance: 3000,
					lifetimeSpentKop: 10000000, // 100k
					isBonusSpendingAllowed: true,
				},
				{
					patientId: "p2",
					fullName: "Мама",
					roleRu: "Супруг / Супруга",
					individualPointsBalance: 2500,
					lifetimeSpentKop: 8000000, // 80k
					isBonusSpendingAllowed: true,
				},
				{
					patientId: "p3",
					fullName: "Сын",
					roleRu: "Ребенок",
					individualPointsBalance: 500,
					lifetimeSpentKop: 2000000, // 20k
					isBonusSpendingAllowed: true,
				},
			];

			const pool = calculateFamilyPoolBalance("fam-1", "Семья Ивановых", members);
			assert.equal(pool.memberCount, 3);
			assert.equal(pool.totalPooledPoints, 6000); // 3000 + 2500 + 500
			assert.equal(pool.totalFamilyLifetimeSpentKop, 20000000); // 200,000 RUB
			assert.equal(pool.totalFamilyLifetimeSpentRub, 200000);
			assert.equal(pool.effectiveTier.id, "family");
			assert.equal(pool.effectiveTier.cashbackPercent, 6);
		});
	});

	describe("6. evaluatePromoCode — Promo Code Rules & Exclusions", () => {
		it("should evaluate percentage promo code HYGIENE15 correctly", () => {
			const res = evaluatePromoCode("HYGIENE15", 500000, ["hygiene"]);
			assert.equal(res.isValid, true);
			assert.equal(res.discountKop, 75000); // 15% of 5,000 RUB = 750 RUB (75,000 kop)
			assert.equal(res.discountRub, 750);
			assert.equal(res.finalPayableKop, 425000); // 4,250 RUB
		});

		it("should reject promo code if invoice is below min required amount", () => {
			// HYGIENE15 requires min 4,000 RUB (400,000 kop)
			const res = evaluatePromoCode("HYGIENE15", 250000, ["hygiene"]);
			assert.equal(res.isValid, false);
			assert.match(res.messageRu, /Минимальная сумма чека/);
		});

		it("should reject promo code if applied to incompatible dental category", () => {
			// HYGIENE15 is only for hygiene, not surgery
			const res = evaluatePromoCode("HYGIENE15", 1000000, ["surgery"]);
			assert.equal(res.isValid, false);
			assert.match(res.messageRu, /применим только к услугам категорий/);
		});

		it("should evaluate birthday welcome points BIRTHDAY1000", () => {
			const res = evaluatePromoCode("BIRTHDAY1000", 0, ["all"]);
			assert.equal(res.isValid, true);
			assert.equal(res.bonusPointsToAddRub, 1000);
		});
	});

	describe("7. exportLoyaltyLedgerToCsv — RFC 4180 & UTF-8 BOM Ledger Export", () => {
		it("should generate valid RFC 4180 CSV with UTF-8 BOM and Russian headers", () => {
			const entries: readonly LoyaltyLedgerEntry[] = [
				{
					id: "tx-1",
					timestampIso: "2026-08-22 11:00",
					patientId: "p1",
					patientName: 'Иванов Иван "Тестовый"',
					medicalCardNumber: "043/у-01",
					operationType: "accrual",
					operationTypeRu: "Начисление кэшбэка",
					invoiceAmountKop: 1000000,
					pointsDeltaRub: 500,
					balanceAfterRub: 4500,
					paymentMethodRu: "Банковская карта",
					fiscalReceiptNumber: "ФД-12345",
					staffNameRu: "Кассир Петрова",
					noteRu: "Лечение кариеса; пломба",
				},
			];

			const csv = exportLoyaltyLedgerToCsv(entries);
			assert.ok(csv.startsWith("\uFEFF")); // UTF-8 BOM
			assert.ok(csv.includes('"ID операции";"Дата и время";"Пациент"'));
			assert.ok(csv.includes('"Иванов Иван ""Тестовый"""')); // RFC 4180 escaped quotes
			assert.ok(csv.includes("+500"));
			assert.ok(csv.includes("ФД-12345"));
		});
	});
});
