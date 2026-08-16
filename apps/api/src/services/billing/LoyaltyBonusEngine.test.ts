/**
 * LoyaltyBonusEngine.test.ts — Комплексные юнит-тесты для сервиса лояльности и кэшбэка DENTE.
 *
 * Проверяемые сценарии:
 * 1. Вспомогательные функции копеечной точности (rubToKopecks, kopecksToRub, roundMoneyRub).
 * 2. Начисление бонусов при оплате лечения (accrueBonuses):
 *    - Стандартные начисления по уровням лояльности (3%, 5%, 7%, 10%, 15%).
 *    - Дробные суммы и предотвращение IEEE-754 ошибок.
 *    - Расчет даты сгорания баллов (expiresAt).
 *    - Граничные условия: 0 ₽, 0%, бессрочные баллы, валидация некорректных входных данных.
 * 3. Списание бонусов в счет оплаты счетов (applyBonusPayment):
 *    - Лимиты максимального покрытия (30%, 50%, 70%).
 *    - Ограничение суммы списания балансом бонусов или лимитом счета.
 *    - Строгое округление kopecks floor для исключения превышения процента покрытия.
 *    - Списание 100% чека при полном покрытии.
 *    - Нулевые и отрицательные балансы/суммы.
 * 4. Сгорание просроченных бонусов (expireOutdatedBonuses):
 *    - Определение просроченных транзакций по дате expiresAt.
 *    - Корректная обработка частично израсходованных начислений (unspentPoints).
 *    - Игнорирование уже сгоревших или бессрочных баллов.
 *    - Аудиторский отчет (expiredDetails, expiredTransactionIds, activeRemaining).
 * 5. FIFO-списание баллов (processFifoBonusRedemption):
 *    - Очередность расходования бонусов по дате сгорания.
 *    - Частичное и полное списание нескольких начислений.
 *    - Обработка дефицита баллов (unfulfilledRedemption).
 * 6. Прогресс уровней лояльности (calculateTierProgression):
 *    - Переход между уровнями Bronze -> Silver -> Gold -> Platinum -> VIP.
 *    - Расчет остатка суммы и процента прогресса до следующего уровня.
 * 7. Возврат бонусов (refundBonusPayment).
 * 8. Класс LoyaltyBonusEngine (экземпляры и статические методы).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_LOYALTY_TIERS,
	LoyaltyBonusEngine,
	LoyaltyBonusError,
	accrueBonuses,
	applyBonusPayment,
	calculateTierProgression,
	expireOutdatedBonuses,
	kopecksToRub,
	processFifoBonusRedemption,
	refundBonusPayment,
	roundMoneyRub,
	rubToKopecks,
	type BonusTransactionRecord,
} from "./LoyaltyBonusEngine.js";

describe("LoyaltyBonusEngine — Patient Loyalty & Retention Engine", () => {
	// ─── 1. КОПЕЕЧНАЯ И ДЕНЕЖНАЯ ТОЧНОСТЬ ───────────────────────────────────────
	describe("1. Currency & Kopeck Accuracy Helpers", () => {
		it("converts rubles to exact integer kopecks without float drift", () => {
			assert.equal(rubToKopecks(100), 10000);
			assert.equal(rubToKopecks(0.01), 1);
			assert.equal(rubToKopecks(0.99), 99);
			assert.equal(rubToKopecks(19.99), 1999);
			assert.equal(rubToKopecks(12345.67), 1234567);
			assert.equal(rubToKopecks(0), 0);
		});

		it("converts kopecks to rubles with 2 decimal places", () => {
			assert.equal(kopecksToRub(10000), 100.0);
			assert.equal(kopecksToRub(1), 0.01);
			assert.equal(kopecksToRub(99), 0.99);
			assert.equal(kopecksToRub(1999), 19.99);
			assert.equal(kopecksToRub(1234567), 12345.67);
			assert.equal(kopecksToRub(0), 0.0);
		});

		it("rounds money with standard accounting ROUND_HALF_UP", () => {
			assert.equal(roundMoneyRub(10.555), 10.56);
			assert.equal(roundMoneyRub(10.554), 10.55);
			assert.equal(roundMoneyRub(0.1 + 0.2), 0.3);
		});

		it("throws LoyaltyBonusError on non-finite values", () => {
			assert.throws(
				() => rubToKopecks(Number.NaN),
				(err: any) =>
					err instanceof LoyaltyBonusError && err.code === "InvalidAmount",
			);
			assert.throws(
				() => rubToKopecks(Number.POSITIVE_INFINITY),
				(err: any) =>
					err instanceof LoyaltyBonusError && err.code === "InvalidAmount",
			);
			assert.throws(
				() => kopecksToRub(Number.NaN),
				(err: any) =>
					err instanceof LoyaltyBonusError && err.code === "InvalidAmount",
			);
		});
	});

	// ─── 2. НАЧИСЛЕНИЕ БОНУСОВ (ACCRUE BONUSES) ─────────────────────────────────
	describe("2. Cashback & Bonus Accrual (accrueBonuses)", () => {
		const fixedDate = new Date("2026-08-16T12:00:00.000Z");

		it("calculates exact cashback for standard bronze tier (3% on 4,500 ₽ = 135 ₽)", () => {
			const res = accrueBonuses(4500, 3, 180, fixedDate);
			assert.equal(res.paymentAmountRub, 4500);
			assert.equal(res.paymentAmountKopecks, 450000);
			assert.equal(res.tierPct, 3);
			assert.equal(res.bonusPointsAccrued, 135);
			assert.equal(res.bonusPointsAccruedKopecks, 13500);
			assert.ok(res.expiresAt);
			// 180 days = 180 * 24 * 3600 * 1000 = 15,552,000,000 ms
			const expectedExp = new Date(fixedDate.getTime() + 180 * 86400000);
			assert.equal(res.expiresAt.toISOString(), expectedExp.toISOString());
		});

		it("calculates exact cashback for silver tier (5% on 20,000 ₽ = 1,000 ₽)", () => {
			const res = accrueBonuses(20000, 5, 240, fixedDate);
			assert.equal(res.bonusPointsAccrued, 1000);
			assert.equal(res.bonusPointsAccruedKopecks, 100000);
			const expectedExp = new Date(fixedDate.getTime() + 240 * 86400000);
			assert.equal(res.expiresAt?.toISOString(), expectedExp.toISOString());
		});

		it("calculates exact cashback for gold tier (7% on 150,000 ₽ = 10,500 ₽)", () => {
			const res = accrueBonuses(150000, 7, 365, fixedDate);
			assert.equal(res.bonusPointsAccrued, 10500);
			assert.equal(res.bonusPointsAccruedKopecks, 1050000);
		});

		it("handles fractional amounts and fractional percentages correctly without IEEE-754 drift", () => {
			// 3.5% on 1,234.56 ₽ = 43.2096 ₽ -> rounds to 43.21 ₽ (4321 kopecks)
			const res = accrueBonuses(1234.56, 3.5, 90, fixedDate);
			assert.equal(res.paymentAmountRub, 1234.56);
			assert.equal(res.bonusPointsAccrued, 43.21);
			assert.equal(res.bonusPointsAccruedKopecks, 4321);
		});

		it("handles non-expiring bonuses when expirationDays is not provided", () => {
			const res = accrueBonuses(10000, 5);
			assert.equal(res.bonusPointsAccrued, 500);
			assert.equal(res.expiresAt, null);
		});

		it("returns 0 bonus points when payment amount is 0", () => {
			const res = accrueBonuses(0, 5, 180, fixedDate);
			assert.equal(res.bonusPointsAccrued, 0);
			assert.equal(res.bonusPointsAccruedKopecks, 0);
			assert.equal(res.expiresAt, null);
		});

		it("returns 0 bonus points when cashback tier percentage is 0%", () => {
			const res = accrueBonuses(50000, 0, 180, fixedDate);
			assert.equal(res.bonusPointsAccrued, 0);
			assert.equal(res.bonusPointsAccruedKopecks, 0);
			assert.equal(res.expiresAt, null);
		});

		it("validates and rejects negative payment amounts or tier percentages outside [0, 100]", () => {
			assert.throws(
				() => accrueBonuses(-100, 5),
				(err: any) => err instanceof LoyaltyBonusError,
			);
			assert.throws(
				() => accrueBonuses(1000, -1),
				(err: any) => err instanceof LoyaltyBonusError,
			);
			assert.throws(
				() => accrueBonuses(1000, 101),
				(err: any) => err instanceof LoyaltyBonusError,
			);
			assert.throws(
				() => accrueBonuses(1000, 5, -10),
				(err: any) => err instanceof LoyaltyBonusError,
			);
		});
	});

	// ─── 3. СПИСАНИЕ БОНУСОВ (APPLY BONUS PAYMENT) ──────────────────────────────
	describe("3. Bonus Redemption & Payment (applyBonusPayment)", () => {
		it("caps bonus redemption at maxBonusPayPct (30% on 10,000 ₽ invoice with 5,000 ₽ bonus)", () => {
			// Invoice: 10,000 ₽, Available: 5,000 ₽, Max Coverage: 30%
			// Max Allowed: 3,000 ₽ (300000 kopecks)
			const res = applyBonusPayment(10000, 5000, 30);
			assert.equal(res.invoiceTotalRub, 10000);
			assert.equal(res.availableBonusRub, 5000);
			assert.equal(res.maxAllowedBonusRub, 3000);
			assert.equal(res.maxAllowedBonusKopecks, 300000);
			assert.equal(res.bonusSpentRub, 3000);
			assert.equal(res.bonusSpentKopecks, 300000);
			assert.equal(res.remainingInvoiceRub, 7000);
			assert.equal(res.remainingInvoiceKopecks, 700000);
			assert.equal(res.remainingBonusRub, 2000);
			assert.equal(res.remainingBonusKopecks, 200000);
			assert.equal(res.actualCoveragePct, 30.0);
		});

		it("uses all available bonus if balance is less than max allowed cap (1,200 ₽ on 10,000 ₽ invoice with 30% cap)", () => {
			// Invoice: 10,000 ₽, Available: 1,200 ₽, Max Coverage: 30% (max 3,000 ₽)
			const res = applyBonusPayment(10000, 1200, 30);
			assert.equal(res.maxAllowedBonusRub, 3000);
			assert.equal(res.bonusSpentRub, 1200);
			assert.equal(res.bonusSpentKopecks, 120000);
			assert.equal(res.remainingInvoiceRub, 8800);
			assert.equal(res.remainingInvoiceKopecks, 880000);
			assert.equal(res.remainingBonusRub, 0);
			assert.equal(res.remainingBonusKopecks, 0);
			assert.equal(res.actualCoveragePct, 12.0);
		});

		it("strictly prevents exceeding percentage limit on fractional kopeck calculations", () => {
			// Invoice: 100.01 ₽ (10001 kopecks), 30% cap = 3000.3 kopecks -> strictly floors to 3000 kopecks (30.00 ₽)
			const res = applyBonusPayment(100.01, 50, 30);
			assert.equal(res.maxAllowedBonusKopecks, 3000);
			assert.equal(res.maxAllowedBonusRub, 30.0);
			assert.equal(res.bonusSpentRub, 30.0);
			assert.equal(res.remainingInvoiceRub, 70.01);
			assert.equal(res.remainingBonusRub, 20.0);
			// 3000 / 10001 = 29.997% -> rounded to 30%
			assert.ok(res.actualCoveragePct <= 30.0);
		});

		it("handles 100% full coverage when allowed and balance is sufficient", () => {
			// Invoice: 5,000 ₽, Available: 8,000 ₽, Max Coverage: 100%
			const res = applyBonusPayment(5000, 8000, 100);
			assert.equal(res.maxAllowedBonusRub, 5000);
			assert.equal(res.bonusSpentRub, 5000);
			assert.equal(res.remainingInvoiceRub, 0);
			assert.equal(res.remainingBonusRub, 3000);
			assert.equal(res.actualCoveragePct, 100.0);
		});

		it("handles 0 available bonus balance gracefully", () => {
			const res = applyBonusPayment(5000, 0, 30);
			assert.equal(res.bonusSpentRub, 0);
			assert.equal(res.remainingInvoiceRub, 5000);
			assert.equal(res.remainingBonusRub, 0);
			assert.equal(res.actualCoveragePct, 0);
		});

		it("handles 0 invoice total gracefully", () => {
			const res = applyBonusPayment(0, 1000, 30);
			assert.equal(res.bonusSpentRub, 0);
			assert.equal(res.remainingInvoiceRub, 0);
			assert.equal(res.remainingBonusRub, 1000);
			assert.equal(res.actualCoveragePct, 0);
		});

		it("handles 0% maxBonusPayPct (bonus payments disabled)", () => {
			const res = applyBonusPayment(10000, 5000, 0);
			assert.equal(res.bonusSpentRub, 0);
			assert.equal(res.remainingInvoiceRub, 10000);
			assert.equal(res.remainingBonusRub, 5000);
			assert.equal(res.actualCoveragePct, 0);
		});

		it("rejects invalid inputs with Validation Error", () => {
			assert.throws(
				() => applyBonusPayment(-500, 100, 30),
				(err: any) => err instanceof LoyaltyBonusError,
			);
			assert.throws(
				() => applyBonusPayment(500, -100, 30),
				(err: any) => err instanceof LoyaltyBonusError,
			);
			assert.throws(
				() => applyBonusPayment(500, 100, 150),
				(err: any) => err instanceof LoyaltyBonusError,
			);
		});
	});

	// ─── 4. СГОРАНИЕ ПРОСРОЧЕННЫХ БОНУСОВ (EXPIRE BONUSES) ─────────────────────
	describe("4. Expiration of Outdated Bonuses (expireOutdatedBonuses)", () => {
		const checkDate = new Date("2026-08-16T00:00:00.000Z");

		it("expires outdated transactions with unspent points and keeps active points", () => {
			const transactions: BonusTransactionRecord[] = [
				{
					id: "tx-1-expired",
					patientId: "patient-101",
					amountPoints: 500,
					unspentPoints: 500,
					type: "accrual_payment_cashback",
					createdAt: "2026-01-01T00:00:00.000Z",
					expiresAt: "2026-07-01T00:00:00.000Z", // Expired on July 1
				},
				{
					id: "tx-2-active",
					patientId: "patient-101",
					amountPoints: 1000,
					unspentPoints: 800, // 200 spent, 800 active
					type: "accrual_payment_cashback",
					createdAt: "2026-05-01T00:00:00.000Z",
					expiresAt: "2026-11-01T00:00:00.000Z", // Still valid until Nov 1
				},
				{
					id: "tx-3-already-spent",
					patientId: "patient-101",
					amountPoints: 300,
					unspentPoints: 0, // Fully spent before expiration
					type: "accrual_payment_cashback",
					createdAt: "2026-01-15T00:00:00.000Z",
					expiresAt: "2026-07-15T00:00:00.000Z", // Expired date, but 0 unspent
				},
				{
					id: "tx-4-no-expiration",
					patientId: "patient-101",
					amountPoints: 2000,
					unspentPoints: 2000,
					type: "accrual_manual_admin",
					createdAt: "2025-01-01T00:00:00.000Z",
					expiresAt: null, // Lifetime / non-expiring
				},
			];

			const result = expireOutdatedBonuses(transactions, checkDate);

			assert.equal(result.expiredCount, 1);
			assert.equal(result.totalExpiredPointsRub, 500.0);
			assert.equal(result.totalExpiredKopecks, 50000);
			assert.deepEqual(result.expiredTransactionIds, ["tx-1-expired"]);

			assert.equal(result.expiredDetails.length, 1);
			assert.equal(result.expiredDetails[0]?.originalTransactionId, "tx-1-expired");
			assert.equal(result.expiredDetails[0]?.expiredPointsRub, 500.0);
			assert.equal(result.expiredDetails[0]?.patientId, "patient-101");

			// Active remaining: tx-2 (800 ₽) + tx-4 (2000 ₽) = 2800 ₽
			assert.equal(result.activeRemainingPointsRub, 2800.0);
			assert.equal(result.activeRemainingKopecks, 280000);

			// Check updated transactions state
			const updatedTx1 = result.updatedTransactions.find(
				(t) => t.id === "tx-1-expired",
			);
			assert.equal(updatedTx1?.unspentPoints, 0);
			assert.equal(updatedTx1?.isExpired, true);

			const updatedTx2 = result.updatedTransactions.find(
				(t) => t.id === "tx-2-active",
			);
			assert.equal(updatedTx2?.unspentPoints, 800);
			assert.equal(updatedTx2?.isExpired, undefined);
		});

		it("handles boundary condition where expiresAt matches currentDate exactly", () => {
			const transactions: BonusTransactionRecord[] = [
				{
					id: "tx-exact-boundary",
					patientId: "patient-102",
					amountPoints: 250.5,
					unspentPoints: 250.5,
					type: "accrual_payment_cashback",
					createdAt: "2026-02-16T00:00:00.000Z",
					expiresAt: "2026-08-16T00:00:00.000Z", // Exactly on checkDate
				},
			];

			const result = expireOutdatedBonuses(transactions, checkDate);
			assert.equal(result.expiredCount, 1);
			assert.equal(result.totalExpiredPointsRub, 250.5);
			assert.equal(result.totalExpiredKopecks, 25050);
			assert.equal(result.activeRemainingPointsRub, 0);
		});

		it("skips transactions already marked with isExpired: true", () => {
			const transactions: BonusTransactionRecord[] = [
				{
					id: "tx-already-flagged",
					patientId: "patient-103",
					amountPoints: 100,
					unspentPoints: 100,
					type: "accrual_payment_cashback",
					createdAt: "2026-01-01T00:00:00.000Z",
					expiresAt: "2026-06-01T00:00:00.000Z",
					isExpired: true,
				},
			];

			const result = expireOutdatedBonuses(transactions, checkDate);
			assert.equal(result.expiredCount, 0);
			assert.equal(result.totalExpiredPointsRub, 0);
		});

		it("throws error if transactions input is invalid or date is invalid", () => {
			assert.throws(
				() => expireOutdatedBonuses("invalid" as any),
				(err: any) => err instanceof LoyaltyBonusError,
			);
			assert.throws(
				() => expireOutdatedBonuses([], "invalid-date"),
				(err: any) => err instanceof LoyaltyBonusError,
			);
		});
	});

	// ─── 5. FIFO СПИСАНИЕ БОНУСОВ (FIFO REDEMPTION) ─────────────────────────────
	describe("5. FIFO Bonus Redemption Algorithm (processFifoBonusRedemption)", () => {
		it("deducts bonuses first from the earliest expiring accruals", () => {
			const accruals: BonusTransactionRecord[] = [
				{
					id: "tx-exp-far",
					patientId: "pat-1",
					amountPoints: 500,
					unspentPoints: 500,
					type: "accrual",
					createdAt: "2026-03-01T00:00:00.000Z",
					expiresAt: "2026-12-01T00:00:00.000Z", // Expires far in Dec
				},
				{
					id: "tx-exp-soon",
					patientId: "pat-1",
					amountPoints: 300,
					unspentPoints: 300,
					type: "accrual",
					createdAt: "2026-01-01T00:00:00.000Z",
					expiresAt: "2026-09-01T00:00:00.000Z", // Expires soonest in Sept
				},
				{
					id: "tx-no-exp",
					patientId: "pat-1",
					amountPoints: 1000,
					unspentPoints: 1000,
					type: "accrual",
					createdAt: "2026-02-01T00:00:00.000Z",
					expiresAt: null, // Non-expiring
				},
			];

			// Redeem 600 ₽:
			// 1. tx-exp-soon: 300 ₽ deducted (0 remaining)
			// 2. tx-exp-far: 300 ₽ deducted (200 remaining)
			// 3. tx-no-exp: 0 ₽ deducted (1000 remaining)
			const res = processFifoBonusRedemption(accruals, 600);

			assert.equal(res.totalRedeemedRub, 600.0);
			assert.equal(res.totalRedeemedKopecks, 60000);
			assert.equal(res.unfulfilledRedemptionRub, 0.0);
			assert.equal(res.redemptionDetails.length, 2);

			assert.equal(res.redemptionDetails[0]?.transactionId, "tx-exp-soon");
			assert.equal(res.redemptionDetails[0]?.deductedPointsRub, 300.0);
			assert.equal(res.redemptionDetails[0]?.remainingUnspentRub, 0.0);

			assert.equal(res.redemptionDetails[1]?.transactionId, "tx-exp-far");
			assert.equal(res.redemptionDetails[1]?.deductedPointsRub, 300.0);
			assert.equal(res.redemptionDetails[1]?.remainingUnspentRub, 200.0);

			const txNoExp = res.updatedAccruals.find((t) => t.id === "tx-no-exp");
			assert.equal(txNoExp?.unspentPoints, 1000.0);
		});

		it("reports unfulfilled balance when redemption requested exceeds total available points", () => {
			const accruals: BonusTransactionRecord[] = [
				{
					id: "tx-only",
					patientId: "pat-2",
					amountPoints: 200,
					unspentPoints: 200,
					type: "accrual",
					createdAt: "2026-01-01T00:00:00.000Z",
					expiresAt: "2026-10-01T00:00:00.000Z",
				},
			];

			const res = processFifoBonusRedemption(accruals, 500);
			assert.equal(res.totalRedeemedRub, 200.0);
			assert.equal(res.unfulfilledRedemptionRub, 300.0);
		});

		it("throws on negative redemption amounts", () => {
			assert.throws(
				() => processFifoBonusRedemption([], -50),
				(err: any) => err instanceof LoyaltyBonusError,
			);
		});
	});

	// ─── 6. УРОВНИ ЛОЯЛЬНОСТИ И ПРОГРЕСС (TIER PROGRESSION) ────────────────────
	describe("6. Loyalty Tier Progression (calculateTierProgression)", () => {
		it("calculates Bronze tier for 0 ₽ spend with 50,000 ₽ remaining to Silver", () => {
			const res = calculateTierProgression(0);
			assert.equal(res.currentTier.tier, "bronze");
			assert.equal(res.currentTier.cashbackPct, 3.0);
			assert.equal(res.currentTier.maxBonusPayPct, 30.0);
			assert.equal(res.nextTier?.tier, "silver");
			assert.equal(res.amountToNextTierRub, 50000);
			assert.equal(res.progressPctToNextTier, 0.0);
		});

		it("calculates 50% progress in Bronze tier at 25,000 ₽ spend", () => {
			const res = calculateTierProgression(25000);
			assert.equal(res.currentTier.tier, "bronze");
			assert.equal(res.nextTier?.tier, "silver");
			assert.equal(res.amountToNextTierRub, 25000);
			assert.equal(res.progressPctToNextTier, 50.0);
		});

		it("upgrades to Silver tier at 50,000 ₽ spend and calculates path to Gold", () => {
			const res = calculateTierProgression(50000);
			assert.equal(res.currentTier.tier, "silver");
			assert.equal(res.currentTier.cashbackPct, 5.0);
			assert.equal(res.currentTier.maxBonusPayPct, 35.0);
			assert.equal(res.nextTier?.tier, "gold");
			assert.equal(res.amountToNextTierRub, 100000); // 150,000 - 50,000
			assert.equal(res.progressPctToNextTier, 0.0);
		});

		it("upgrades to Gold tier at 200,000 ₽ spend (50% progress to Platinum)", () => {
			const res = calculateTierProgression(200000);
			assert.equal(res.currentTier.tier, "gold");
			assert.equal(res.currentTier.cashbackPct, 7.0);
			assert.equal(res.nextTier?.tier, "platinum");
			assert.equal(res.amountToNextTierRub, 100000); // 300,000 - 200,000
			assert.equal(res.progressPctToNextTier, 33.3); // (200k - 150k) / (300k - 150k) = 50k / 150k = 33.3%
		});

		it("upgrades to Platinum tier at 300,000 ₽ spend", () => {
			const res = calculateTierProgression(300000);
			assert.equal(res.currentTier.tier, "platinum");
			assert.equal(res.currentTier.cashbackPct, 10.0);
			assert.equal(res.currentTier.maxBonusPayPct, 50.0);
			assert.equal(res.nextTier?.tier, "vip");
		});

		it("upgrades to VIP tier at 600,000 ₽+ spend with 100% progress and no next tier", () => {
			const res = calculateTierProgression(750000);
			assert.equal(res.currentTier.tier, "vip");
			assert.equal(res.currentTier.cashbackPct, 15.0);
			assert.equal(res.currentTier.maxBonusPayPct, 70.0);
			assert.equal(res.nextTier, null);
			assert.equal(res.amountToNextTierRub, 0);
			assert.equal(res.progressPctToNextTier, 100.0);
		});
	});

	// ─── 7. ВОЗВРАТ БОНУСОВ (REFUND BONUS PAYMENT) ──────────────────────────────
	describe("7. Bonus Refund Accounting (refundBonusPayment)", () => {
		it("restores exact ruble and kopeck values for refunded bonus payments", () => {
			const res = refundBonusPayment(1234.56);
			assert.equal(res.refundedRub, 1234.56);
			assert.equal(res.refundedKopecks, 123456);
		});

		it("throws on negative refund amount", () => {
			assert.throws(
				() => refundBonusPayment(-100),
				(err: any) => err instanceof LoyaltyBonusError,
			);
		});
	});

	// ─── 8. КЛАСС LOYALTY BONUS ENGINE ──────────────────────────────────────────
	describe("8. LoyaltyBonusEngine Class Wrapper & Static API", () => {
		it("provides full feature access through OOP instance and static methods", () => {
			const engine = new LoyaltyBonusEngine();

			const accrual = engine.accrue(10000, 5, 180);
			assert.equal(accrual.bonusPointsAccrued, 500);

			const payment = engine.applyPayment(10000, 500, 30);
			assert.equal(payment.bonusSpentRub, 500);

			const tier = engine.getTierProgression(60000);
			assert.equal(tier.currentTier.tier, "silver");

			const refund = engine.refund(500);
			assert.equal(refund.refundedRub, 500);
		});

		it("supports custom tier configurations in constructor", () => {
			const customTiers = [
				{
					tier: "bronze" as const,
					name: "Базовый",
					minSpendRub: 0,
					cashbackPct: 2.0,
					maxBonusPayPct: 20.0,
					defaultExpirationDays: 90,
				},
				{
					tier: "vip" as const,
					name: "Премиум",
					minSpendRub: 100000,
					cashbackPct: 20.0,
					maxBonusPayPct: 80.0,
					defaultExpirationDays: 365,
				},
			];

			const customEngine = new LoyaltyBonusEngine(customTiers);
			const tier = customEngine.getTierProgression(50000);
			assert.equal(tier.currentTier.name, "Базовый");
			assert.equal(tier.currentTier.cashbackPct, 2.0);
			assert.equal(tier.amountToNextTierRub, 50000);
		});
	});
});
