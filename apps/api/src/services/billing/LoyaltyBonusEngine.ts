/**
 * LoyaltyBonusEngine.ts — Сервис управления программой лояльности, кэшбэком
 * и бонусными баллами пациентов в Dental CRM (DENTE).
 *
 * Feature #78: Программа лояльности, кэшбэк и бонусные баллы пациентов.
 *
 * ФУНКЦИОНАЛЬНЫЕ ВОЗМОЖНОСТИ:
 * 1. Начисление бонусов (кэшбэк) при оплате лечения:
 *    - `accrueBonuses(paymentAmountRub, tierPct, expirationDays, currentDate)`
 *    - Расчет процента кэшбэка от суммы платежа в рублях.
 *    - Строгая копеечная точность без погрешностей чисел с плавающей точкой (IEEE-754).
 *    - Расчет точной даты сгорания баллов (expiresAt) с учетом часового пояса и дней жизни.
 *
 * 2. Списание бонусов в счет оплаты счетов клиники (Redemption):
 *    - `applyBonusPayment(invoiceTotalRub, availableBonusRub, maxBonusPayPct)`
 *    - Строгое соблюдение лимита максимального процента покрытия счета (maxBonusPayPct, например 30% или 50%).
 *    - Ограничение суммы списания не более доступного баланса и не более суммы счета.
 *    - Расчет остатка к доплате пациентом и неизрасходованного остатка бонусов с точностью до копейки.
 *
 * 3. Автоматическое сгорание просроченных бонусов (Expiration Lifecycle):
 *    - `expireOutdatedBonuses(bonusTransactions, currentDate)`
 *    - Аудит транзакций начисления баллов с истекшим сроком годности (expiresAt <= currentDate).
 *    - Списание неиспользованного остатка (unspentPoints) просроченных начислений.
 *    - Формирование детального аудиторского следа сгоревших бонусов.
 *
 * 4. Продвинутые механизмы удержания пациентов (Retention & Growth):
 *    - FIFO-списание баллов (`processFifoBonusRedemption`): в первую очередь расходуются бонусы с ближайшей датой сгорания.
 *    - Динамические уровни лояльности (`calculateTierProgression`): расчет прогресса до следующего статуса (Bronze -> Silver -> Gold -> Platinum).
 *    - Корректный возврат бонусов при отмене/возврате оплаты счета (`refundBonusPayment`).
 */

import { Decimal } from "decimal.js";
import { z } from "zod";

// Настройка максимальной точности вычислений для финансовых и бонусных расчетов
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export const DEFAULT_BONUS_CURRENCY = "RUB" as const;
export const DEFAULT_POINT_RATE_RUB = 1.0; // 1 бонусный балл = 1 рубль РФ

/** Коды ошибок движка бонусов и лояльности */
export type LoyaltyBonusErrorCode =
	| "InvalidAmount"
	| "InvalidTierPct"
	| "InvalidCoveragePct"
	| "InvalidExpirationDays"
	| "InvalidDate"
	| "InsufficientBonusBalance"
	| "ValidationError";

export class LoyaltyBonusError extends Error {
	constructor(
		readonly code: LoyaltyBonusErrorCode,
		message: string,
	) {
		super(message);
		this.name = "LoyaltyBonusError";
	}
}

// ─── КОПЕЕЧНЫЕ И ДЕНЕЖНЫЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ─────────────────────────────

/**
 * Округление денежной суммы / бонусов до копеек (2 знака после запятой, ROUND_HALF_UP).
 */
export function roundMoneyRub(amount: Decimal | number): number {
	const dec = amount instanceof Decimal ? amount : new Decimal(amount);
	if (!dec.isFinite()) {
		throw new LoyaltyBonusError(
			"InvalidAmount",
			"Сумма должна быть конечным числом",
		);
	}
	return dec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Преобразование рублей / баллов в целочисленные копейки.
 */
export function rubToKopecks(rub: number | Decimal): number {
	const dec = rub instanceof Decimal ? rub : new Decimal(rub);
	if (!dec.isFinite()) {
		throw new LoyaltyBonusError(
			"InvalidAmount",
			"Сумма в рублях должна быть конечным числом",
		);
	}
	return dec.times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Преобразование копеек в рубли.
 */
export function kopecksToRub(kopecks: number): number {
	if (!Number.isFinite(kopecks)) {
		throw new LoyaltyBonusError(
			"InvalidAmount",
			"Сумма в копейках должна быть конечным числом",
		);
	}
	return new Decimal(kopecks)
		.div(100)
		.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
		.toNumber();
}

// ─── ТИПЫ И СХЕМЫ ДАННЫХ ──────────────────────────────────────────────────────

export type LoyaltyTierLevel =
	| "bronze"
	| "silver"
	| "gold"
	| "platinum"
	| "vip";

export interface LoyaltyTierConfig {
	tier: LoyaltyTierLevel;
	name: string;
	minSpendRub: number;
	cashbackPct: number;
	maxBonusPayPct: number;
	defaultExpirationDays: number;
}

export const DEFAULT_LOYALTY_TIERS: readonly LoyaltyTierConfig[] = [
	{
		tier: "bronze",
		name: "Бронзовый",
		minSpendRub: 0,
		cashbackPct: 3.0,
		maxBonusPayPct: 30.0,
		defaultExpirationDays: 180,
	},
	{
		tier: "silver",
		name: "Серебряный",
		minSpendRub: 50000,
		cashbackPct: 5.0,
		maxBonusPayPct: 35.0,
		defaultExpirationDays: 240,
	},
	{
		tier: "gold",
		name: "Золотой",
		minSpendRub: 150000,
		cashbackPct: 7.0,
		maxBonusPayPct: 40.0,
		defaultExpirationDays: 365,
	},
	{
		tier: "platinum",
		name: "Платиновый",
		minSpendRub: 300000,
		cashbackPct: 10.0,
		maxBonusPayPct: 50.0,
		defaultExpirationDays: 730,
	},
	{
		tier: "vip",
		name: "VIP Премиум",
		minSpendRub: 600000,
		cashbackPct: 15.0,
		maxBonusPayPct: 70.0,
		defaultExpirationDays: 1095,
	},
] as const;

/** Транзакция начисления/списания бонусных баллов */
export interface BonusTransactionRecord {
	id: string;
	organizationId?: string;
	patientId: string;
	amountPoints: number; // Положительное при начислении, отрицательное при списании
	unspentPoints?: number; // Неизрасходованный остаток по конкретному начислению (для FIFO и сгорания)
	balanceAfterPoints?: number;
	type: string;
	description?: string;
	relatedInvoiceId?: string | null;
	relatedPaymentId?: string | null;
	expiresAt?: Date | string | null;
	createdAt: Date | string;
	isExpired?: boolean;
}

/** Результат начисления бонусов */
export interface AccrualResult {
	paymentAmountRub: number;
	paymentAmountKopecks: number;
	tierPct: number;
	bonusPointsAccrued: number;
	bonusPointsAccruedKopecks: number;
	expiresAt: Date | null;
	effectiveDate: Date;
}

/** Результат списания бонусов в счет счета */
export interface BonusPaymentResult {
	invoiceTotalRub: number;
	invoiceTotalKopecks: number;
	availableBonusRub: number;
	availableBonusKopecks: number;
	maxBonusPayPct: number;
	maxAllowedBonusRub: number;
	maxAllowedBonusKopecks: number;
	bonusSpentRub: number;
	bonusSpentKopecks: number;
	remainingInvoiceRub: number;
	remainingInvoiceKopecks: number;
	remainingBonusRub: number;
	remainingBonusKopecks: number;
	actualCoveragePct: number;
}

/** Элемент отчета о сгоревших бонусах */
export interface ExpiredBonusItem {
	originalTransactionId: string;
	patientId: string;
	expiredPointsRub: number;
	expiredKopecks: number;
	expiredAt: Date;
	originalAccruedDate: Date;
	originalExpiresAt: Date;
}

/** Результат пакетного сгорания просроченных бонусов */
export interface ExpireBonusesResult {
	totalExpiredPointsRub: number;
	totalExpiredKopecks: number;
	expiredCount: number;
	expiredTransactionIds: string[];
	expiredDetails: ExpiredBonusItem[];
	activeRemainingPointsRub: number;
	activeRemainingKopecks: number;
	updatedTransactions: BonusTransactionRecord[];
}

/** Детализация списания по алгоритму FIFO */
export interface FifoRedemptionDetail {
	transactionId: string;
	deductedPointsRub: number;
	deductedKopecks: number;
	remainingUnspentRub: number;
	remainingUnspentKopecks: number;
}

/** Результат списания по FIFO */
export interface FifoRedemptionResult {
	totalRedeemedRub: number;
	totalRedeemedKopecks: number;
	redemptionDetails: FifoRedemptionDetail[];
	updatedAccruals: BonusTransactionRecord[];
	unfulfilledRedemptionRub: number;
}

/** Результат расчета прогресса по уровню лояльности */
export interface TierProgressionResult {
	currentTier: LoyaltyTierConfig;
	nextTier: LoyaltyTierConfig | null;
	lifetimeSpendRub: number;
	amountToNextTierRub: number;
	progressPctToNextTier: number;
}

// ─── ZOD ВАЛИДАЦИЯ ────────────────────────────────────────────────────────────

export const accrueBonusesInputSchema = z.object({
	paymentAmountRub: z
		.number()
		.nonnegative("Сумма платежа не может быть отрицательной"),
	tierPct: z
		.number()
		.min(0, "Процент кэшбэка не может быть меньше 0%")
		.max(100, "Процент кэшбэка не может превышать 100%"),
	expirationDays: z
		.number()
		.int("Срок действия должен быть целым числом дней")
		.positive("Срок действия должен быть положительным числом дней")
		.optional(),
	currentDate: z.union([z.date(), z.string()]).optional(),
});

export const applyBonusPaymentInputSchema = z.object({
	invoiceTotalRub: z
		.number()
		.nonnegative("Сумма счета не может быть отрицательной"),
	availableBonusRub: z
		.number()
		.nonnegative("Доступный баланс бонусов не может быть отрицательным"),
	maxBonusPayPct: z
		.number()
		.min(0, "Максимальный процент списания не может быть меньше 0%")
		.max(100, "Максимальный процент списания не может превышать 100%"),
});

// ─── ОСНОВНЫЕ СЕРВИСНЫЕ ФУНКЦИИ ───────────────────────────────────────────────

/**
 * 1. Начисление бонусов при оплате лечения (кэшбэк).
 *
 * @param paymentAmountRub — Оплаченная пациентом сумма в рублях
 * @param tierPct — Процент кэшбэка текущего уровня лояльности (например, 3%, 5%, 10%)
 * @param expirationDays — Количество дней до сгорания начисленных бонусов (опционально)
 * @param currentDate — Базовая дата транзакции (по умолчанию текущее время)
 * @returns Детали начисления с копеечной точностью и точным расчетом срока годности
 */
export function accrueBonuses(
	paymentAmountRub: number,
	tierPct: number,
	expirationDays?: number,
	currentDate: Date | string = new Date(),
): AccrualResult {
	const parsed = accrueBonusesInputSchema.safeParse({
		paymentAmountRub,
		tierPct,
		expirationDays,
		currentDate,
	});

	if (!parsed.success) {
		const firstError = parsed.error.issues[0]?.message || "Ошибка валидации";
		throw new LoyaltyBonusError("ValidationError", firstError);
	}

	const baseDate =
		typeof currentDate === "string" ? new Date(currentDate) : currentDate;
	if (Number.isNaN(baseDate.getTime())) {
		throw new LoyaltyBonusError("InvalidDate", "Некорректная дата начисления");
	}

	const paymentKopecks = rubToKopecks(paymentAmountRub);

	if (paymentKopecks === 0 || tierPct === 0) {
		return {
			paymentAmountRub: roundMoneyRub(paymentAmountRub),
			paymentAmountKopecks: paymentKopecks,
			tierPct,
			bonusPointsAccrued: 0,
			bonusPointsAccruedKopecks: 0,
			expiresAt: null,
			effectiveDate: baseDate,
		};
	}

	// Точный расчет бонусов в копейках: (paymentKopecks * tierPct) / 100
	const accruedKopecksDecimal = new Decimal(paymentKopecks)
		.times(tierPct)
		.dividedBy(100)
		.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

	const accruedKopecks = accruedKopecksDecimal.toNumber();
	const bonusPointsAccruedRub = kopecksToRub(accruedKopecks);

	let expiresAt: Date | null = null;
	if (expirationDays !== undefined && expirationDays > 0) {
		expiresAt = new Date(baseDate.getTime() + expirationDays * 86400000);
	}

	return {
		paymentAmountRub: roundMoneyRub(paymentAmountRub),
		paymentAmountKopecks: paymentKopecks,
		tierPct,
		bonusPointsAccrued: bonusPointsAccruedRub,
		bonusPointsAccruedKopecks: accruedKopecks,
		expiresAt,
		effectiveDate: baseDate,
	};
}

/**
 * 2. Списание бонусов в счет оплаты счета (Redemption).
 *
 * @param invoiceTotalRub — Полная сумма счета клиники в рублях
 * @param availableBonusRub — Доступный активный баланс бонусных баллов пациента
 * @param maxBonusPayPct — Максимальный допустимый процент оплаты бонусами (например, 30% или 50%)
 * @returns Полный расчет списания, остатка счета и неизрасходованных бонусов
 */
export function applyBonusPayment(
	invoiceTotalRub: number,
	availableBonusRub: number,
	maxBonusPayPct: number,
): BonusPaymentResult {
	const parsed = applyBonusPaymentInputSchema.safeParse({
		invoiceTotalRub,
		availableBonusRub,
		maxBonusPayPct,
	});

	if (!parsed.success) {
		const firstError = parsed.error.issues[0]?.message || "Ошибка валидации";
		throw new LoyaltyBonusError("ValidationError", firstError);
	}

	const invoiceKopecks = rubToKopecks(invoiceTotalRub);
	const availableBonusKopecks = rubToKopecks(availableBonusRub);

	// Если счет нулевой, нет бонусов или лимит покрытия 0% — списание невозможно
	if (invoiceKopecks <= 0 || availableBonusKopecks <= 0 || maxBonusPayPct <= 0) {
		return {
			invoiceTotalRub: roundMoneyRub(invoiceTotalRub),
			invoiceTotalKopecks: invoiceKopecks,
			availableBonusRub: roundMoneyRub(availableBonusRub),
			availableBonusKopecks,
			maxBonusPayPct,
			maxAllowedBonusRub: 0,
			maxAllowedBonusKopecks: 0,
			bonusSpentRub: 0,
			bonusSpentKopecks: 0,
			remainingInvoiceRub: roundMoneyRub(invoiceTotalRub),
			remainingInvoiceKopecks: invoiceKopecks,
			remainingBonusRub: roundMoneyRub(availableBonusRub),
			remainingBonusKopecks: availableBonusKopecks,
			actualCoveragePct: 0,
		};
	}

	// Максимальная сумма покрытия по проценту (округляем вниз до целой копейки, чтобы гарантированно не превысить % лимит)
	const maxAllowedKopecksByPct = new Decimal(invoiceKopecks)
		.times(maxBonusPayPct)
		.dividedBy(100)
		.floor()
		.toNumber();

	// Фактическая сумма списания бонусов — минимум из (доступный баланс, лимит по %, сумма счета)
	const bonusSpentKopecks = Math.min(
		availableBonusKopecks,
		maxAllowedKopecksByPct,
		invoiceKopecks,
	);

	const remainingInvoiceKopecks = Math.max(0, invoiceKopecks - bonusSpentKopecks);
	const remainingBonusKopecks = Math.max(
		0,
		availableBonusKopecks - bonusSpentKopecks,
	);

	const bonusSpentRub = kopecksToRub(bonusSpentKopecks);
	const remainingInvoiceRub = kopecksToRub(remainingInvoiceKopecks);
	const remainingBonusRub = kopecksToRub(remainingBonusKopecks);
	const maxAllowedBonusRub = kopecksToRub(maxAllowedKopecksByPct);

	const actualCoveragePct =
		invoiceKopecks > 0
			? new Decimal(bonusSpentKopecks)
					.times(100)
					.dividedBy(invoiceKopecks)
					.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
					.toNumber()
			: 0;

	return {
		invoiceTotalRub: roundMoneyRub(invoiceTotalRub),
		invoiceTotalKopecks: invoiceKopecks,
		availableBonusRub: roundMoneyRub(availableBonusRub),
		availableBonusKopecks,
		maxBonusPayPct,
		maxAllowedBonusRub,
		maxAllowedBonusKopecks: maxAllowedKopecksByPct,
		bonusSpentRub,
		bonusSpentKopecks,
		remainingInvoiceRub,
		remainingInvoiceKopecks,
		remainingBonusRub,
		remainingBonusKopecks,
		actualCoveragePct,
	};
}

/**
 * 3. Автоматическое сгорание просроченных бонусов (Expiration Lifecycle).
 *
 * @param bonusTransactions — Список транзакций начисления баллов пациента
 * @param currentDate — Контрольная дата проверки срока годности (по умолчанию текущий момент)
 * @returns Итоговый отчет о сгоревших бонусах и обновленные записи транзакций
 */
export function expireOutdatedBonuses(
	bonusTransactions: BonusTransactionRecord[],
	currentDate: Date | string = new Date(),
): ExpireBonusesResult {
	if (!Array.isArray(bonusTransactions)) {
		throw new LoyaltyBonusError(
			"ValidationError",
			"bonusTransactions должен быть массивом",
		);
	}

	const targetDate =
		typeof currentDate === "string" ? new Date(currentDate) : currentDate;
	if (Number.isNaN(targetDate.getTime())) {
		throw new LoyaltyBonusError("InvalidDate", "Некорректная дата проверки");
	}

	const expiredDetails: ExpiredBonusItem[] = [];
	const expiredTransactionIds: string[] = [];
	let totalExpiredKopecks = 0;
	let activeRemainingKopecks = 0;

	const updatedTransactions: BonusTransactionRecord[] = [];

	for (const tx of bonusTransactions) {
		if (!tx || typeof tx !== "object") continue;

		const createdAtDate = new Date(tx.createdAt);
		const expiresAtDate = tx.expiresAt ? new Date(tx.expiresAt) : null;

		// Определяем остаток неизрасходованных баллов по данной транзакции
		const unspentRaw =
			tx.unspentPoints !== undefined
				? tx.unspentPoints
				: tx.amountPoints > 0
					? tx.amountPoints
					: 0;
		const unspentKopecks = Math.max(0, rubToKopecks(unspentRaw));

		const isExpiredTime =
			expiresAtDate !== null && expiresAtDate.getTime() <= targetDate.getTime();

		if (isExpiredTime && unspentKopecks > 0 && !tx.isExpired) {
			// Начисление просрочено и имеет неиспользованный остаток
			totalExpiredKopecks += unspentKopecks;
			expiredTransactionIds.push(tx.id);

			expiredDetails.push({
				originalTransactionId: tx.id,
				patientId: tx.patientId,
				expiredPointsRub: kopecksToRub(unspentKopecks),
				expiredKopecks: unspentKopecks,
				expiredAt: targetDate,
				originalAccruedDate: createdAtDate,
				originalExpiresAt: expiresAtDate,
			});

			updatedTransactions.push({
				...tx,
				unspentPoints: 0,
				isExpired: true,
			});
		} else {
			// Транзакция либо активна, либо уже израсходована, либо не просрочена
			if (!isExpiredTime && unspentKopecks > 0) {
				activeRemainingKopecks += unspentKopecks;
			}
			updatedTransactions.push({ ...tx });
		}
	}

	return {
		totalExpiredPointsRub: kopecksToRub(totalExpiredKopecks),
		totalExpiredKopecks,
		expiredCount: expiredDetails.length,
		expiredTransactionIds,
		expiredDetails,
		activeRemainingPointsRub: kopecksToRub(activeRemainingKopecks),
		activeRemainingKopecks,
		updatedTransactions,
	};
}

/**
 * 4. Списание баллов по алгоритму FIFO (First-In, First-Out).
 * Списывает в первую очередь те баллы, у которых срок сгорания наступает раньше.
 *
 * @param accruals — Список активных начислений
 * @param pointsToRedeemRub — Сумма баллов к списанию в рублях
 */
export function processFifoBonusRedemption(
	accruals: BonusTransactionRecord[],
	pointsToRedeemRub: number,
): FifoRedemptionResult {
	if (pointsToRedeemRub < 0) {
		throw new LoyaltyBonusError(
			"InvalidAmount",
			"Сумма к списанию не может быть отрицательной",
		);
	}

	let neededKopecks = rubToKopecks(pointsToRedeemRub);
	let totalRedeemedKopecks = 0;
	const redemptionDetails: FifoRedemptionDetail[] = [];

	// Сортируем активные начисления: сначала со сроком годности (по возрастанию expiresAt), затем бессрочные (по возрастанию createdAt)
	const sortedAccruals = [...accruals].sort((a, b) => {
		const expA = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
		const expB = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
		if (expA !== expB) return expA - expB;
		return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
	});

	const updatedAccruals: BonusTransactionRecord[] = [];

	for (const acc of sortedAccruals) {
		const unspentRaw =
			acc.unspentPoints !== undefined
				? acc.unspentPoints
				: acc.amountPoints > 0
					? acc.amountPoints
					: 0;
		const unspentKopecks = Math.max(0, rubToKopecks(unspentRaw));

		if (neededKopecks <= 0 || unspentKopecks <= 0 || acc.isExpired) {
			updatedAccruals.push({ ...acc });
			continue;
		}

		const toDeductKopecks = Math.min(unspentKopecks, neededKopecks);
		const newUnspentKopecks = unspentKopecks - toDeductKopecks;
		neededKopecks -= toDeductKopecks;
		totalRedeemedKopecks += toDeductKopecks;

		redemptionDetails.push({
			transactionId: acc.id,
			deductedPointsRub: kopecksToRub(toDeductKopecks),
			deductedKopecks: toDeductKopecks,
			remainingUnspentRub: kopecksToRub(newUnspentKopecks),
			remainingUnspentKopecks: newUnspentKopecks,
		});

		updatedAccruals.push({
			...acc,
			unspentPoints: kopecksToRub(newUnspentKopecks),
		});
	}

	return {
		totalRedeemedRub: kopecksToRub(totalRedeemedKopecks),
		totalRedeemedKopecks,
		redemptionDetails,
		updatedAccruals,
		unfulfilledRedemptionRub: kopecksToRub(neededKopecks),
	};
}

/**
 * 5. Расчет прогресса и уровня лояльности пациента по накопительной сумме оплат.
 *
 * @param lifetimeSpendRub — Общая сумма оплат пациента за все время
 * @param tiers — Кастомный список уровней (по умолчанию стандартные уровни DENTE)
 */
export function calculateTierProgression(
	lifetimeSpendRub: number,
	tiers: readonly LoyaltyTierConfig[] = DEFAULT_LOYALTY_TIERS,
): TierProgressionResult {
	const spend = Math.max(0, roundMoneyRub(lifetimeSpendRub));

	const sortedTiers = [...tiers].sort((a, b) => a.minSpendRub - b.minSpendRub);
	let currentTier = sortedTiers[0]!;
	let nextTier: LoyaltyTierConfig | null = null;

	for (let i = 0; i < sortedTiers.length; i++) {
		const tier = sortedTiers[i]!;
		if (spend >= tier.minSpendRub) {
			currentTier = tier;
			nextTier = sortedTiers[i + 1] || null;
		} else {
			if (!nextTier) nextTier = tier;
			break;
		}
	}

	let amountToNextTierRub = 0;
	let progressPctToNextTier = 100;

	if (nextTier) {
		amountToNextTierRub = Math.max(0, nextTier.minSpendRub - spend);
		const tierRange = nextTier.minSpendRub - currentTier.minSpendRub;
		const spendInCurrentTier = spend - currentTier.minSpendRub;
		progressPctToNextTier =
			tierRange > 0
				? new Decimal(spendInCurrentTier)
						.times(100)
						.dividedBy(tierRange)
						.toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
						.toNumber()
				: 100;
	}

	return {
		currentTier,
		nextTier,
		lifetimeSpendRub: spend,
		amountToNextTierRub: roundMoneyRub(amountToNextTierRub),
		progressPctToNextTier: Math.min(100, Math.max(0, progressPctToNextTier)),
	};
}

/**
 * 6. Возврат списанных бонусов при аннулировании/возврате счета.
 *
 * @param spentBonusRub — Сумма списанных бонусов, подлежащих возврату
 */
export function refundBonusPayment(spentBonusRub: number): {
	refundedRub: number;
	refundedKopecks: number;
} {
	if (spentBonusRub < 0) {
		throw new LoyaltyBonusError(
			"InvalidAmount",
			"Сумма возврата бонусов не может быть отрицательной",
		);
	}
	const kopecks = rubToKopecks(spentBonusRub);
	return {
		refundedRub: kopecksToRub(kopecks),
		refundedKopecks: kopecks,
	};
}

// ─── КЛАСС ДВИЖКА ЛОЯЛЬНОСТИ ──────────────────────────────────────────────────

export class LoyaltyBonusEngine {
	private readonly tiers: readonly LoyaltyTierConfig[];

	constructor(tiers: readonly LoyaltyTierConfig[] = DEFAULT_LOYALTY_TIERS) {
		this.tiers = tiers;
	}

	/**
	 * Начисление бонусов при оплате
	 */
	public accrue(
		paymentAmountRub: number,
		tierPct: number,
		expirationDays?: number,
		currentDate?: Date | string,
	): AccrualResult {
		return accrueBonuses(paymentAmountRub, tierPct, expirationDays, currentDate);
	}

	/**
	 * Списание бонусов в счет оплаты счета
	 */
	public applyPayment(
		invoiceTotalRub: number,
		availableBonusRub: number,
		maxBonusPayPct: number,
	): BonusPaymentResult {
		return applyBonusPayment(
			invoiceTotalRub,
			availableBonusRub,
			maxBonusPayPct,
		);
	}

	/**
	 * Сгорание просроченных бонусов
	 */
	public expireOutdated(
		transactions: BonusTransactionRecord[],
		currentDate?: Date | string,
	): ExpireBonusesResult {
		return expireOutdatedBonuses(transactions, currentDate);
	}

	/**
	 * Списание по FIFO
	 */
	public redeemFifo(
		accruals: BonusTransactionRecord[],
		pointsToRedeemRub: number,
	): FifoRedemptionResult {
		return processFifoBonusRedemption(accruals, pointsToRedeemRub);
	}

	/**
	 * Расчет уровня лояльности
	 */
	public getTierProgression(lifetimeSpendRub: number): TierProgressionResult {
		return calculateTierProgression(lifetimeSpendRub, this.tiers);
	}

	/**
	 * Возврат бонусов
	 */
	public refund(spentBonusRub: number): {
		refundedRub: number;
		refundedKopecks: number;
	} {
		return refundBonusPayment(spentBonusRub);
	}

	// Статические методы для прямого вызова
	public static readonly accrue = accrueBonuses;
	public static readonly applyPayment = applyBonusPayment;
	public static readonly expireOutdated = expireOutdatedBonuses;
	public static readonly redeemFifo = processFifoBonusRedemption;
	public static readonly getTierProgression = calculateTierProgression;
	public static readonly refund = refundBonusPayment;
	public static readonly roundMoneyRub = roundMoneyRub;
	public static readonly rubToKopecks = rubToKopecks;
	public static readonly kopecksToRub = kopecksToRub;
}
