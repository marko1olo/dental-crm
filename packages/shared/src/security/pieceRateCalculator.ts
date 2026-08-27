/**
 * pieceRateCalculator.ts — Калькулятор сдельной оплаты труда и мотивации врачей-стоматологов.
 *
 * ЖЕСТКИЙ СТАНДАРТ:
 * Все финансовые расчеты ведутся ИСКЛЮЧИТЕЛЬНО в целочисленных копейках (integer kopecks).
 * Использование float/double для денег строго запрещено во избежание погрешностей округления.
 */

import { z } from "zod";

/** Входные параметры для расчета сдельной выработки по категориям приёма */
export interface DoctorCategoryPerformanceInput {
	/** Выручка от терапевтического приёма (в копейках) */
	readonly therapyRevenueKopecks: number;
	/** Ставка врача за терапию (% от 0 до 100, например 25.00) */
	readonly therapyRatePct: number;

	/** Выручка от ортопедического приёма (в копейках) */
	readonly orthopedicsRevenueKopecks: number;
	/** Ставка врача за ортопедию (% от 0 до 100, например 20.00) */
	readonly orthopedicsRatePct: number;

	/** Выручка от хирургического приёма (в копейках) */
	readonly surgeryRevenueKopecks: number;
	/** Ставка врача за хирургию (% от 0 до 100, например 25.00) */
	readonly surgeryRatePct: number;

	/** Выручка от гигиены / пародонтологии (в копейках) */
	readonly hygieneRevenueKopecks: number;
	/** Ставка врача за гигиену (% от 0 до 100, например 30.00) */
	readonly hygieneRatePct: number;

	/** Прочая клиническая выручка (в копейках) */
	readonly otherRevenueKopecks?: number;
	/** Ставка за прочие услуги (% от 0 до 100) */
	readonly otherRatePct?: number;

	/** Расходы на зуботехническую лабораторию (ЗТЛ) по заказ-нарядам (в копейках) */
	readonly labOrdersCostKopecks: number;
	/** Доля удержания расходов ЗТЛ с врача (% от 0 до 100, стандартно 100%) */
	readonly labDeductionPct: number;

	/** Себестоимость списанных на визитах материалов (в копейках) */
	readonly materialCostKopecks: number;
	/** Процент удержания материалов с врача (% от 0 до 100, стандартно 0%) */
	readonly materialDeductionPct: number;

	/** Гарантированный оклад за отработанные смены (в копейках) */
	readonly baseShiftSalaryKopecks?: number;
}

export const doctorCategoryPerformanceSchema = z.object({
	therapyRevenueKopecks: z.number().int().nonnegative(),
	therapyRatePct: z.number().min(0).max(100),
	orthopedicsRevenueKopecks: z.number().int().nonnegative(),
	orthopedicsRatePct: z.number().min(0).max(100),
	surgeryRevenueKopecks: z.number().int().nonnegative(),
	surgeryRatePct: z.number().min(0).max(100),
	hygieneRevenueKopecks: z.number().int().nonnegative(),
	hygieneRatePct: z.number().min(0).max(100),
	otherRevenueKopecks: z.number().int().nonnegative().optional().default(0),
	otherRatePct: z.number().min(0).max(100).optional().default(0),
	labOrdersCostKopecks: z.number().int().nonnegative(),
	labDeductionPct: z.number().min(0).max(100).default(100),
	materialCostKopecks: z.number().int().nonnegative(),
	materialDeductionPct: z.number().min(0).max(100).default(0),
	baseShiftSalaryKopecks: z.number().int().nonnegative().optional().default(0),
});

/** Детализированный результат расчета сдельной оплаты */
export interface DoctorPieceRatePayoutResult {
	/** Общая выручка, принесённая врачом клинике (в копейках) */
	readonly totalRevenueKopecks: number;

	/** Начислено за терапию (в копейках) */
	readonly accruedTherapyKopecks: number;
	/** Начислено за ортопедию (в копейках) */
	readonly accruedOrthopedicsKopecks: number;
	/** Начислено за хирургию (в копейках) */
	readonly accruedSurgeryKopecks: number;
	/** Начислено за гигиену (в копейках) */
	readonly accruedHygieneKopecks: number;
	/** Начислено за прочие услуги (в копейках) */
	readonly accruedOtherKopecks: number;

	/** Совокупное начисление сдельного процента от кассы (в копейках) */
	readonly grossAccruedCommissionKopecks: number;

	/** Удержано за зуботехническую лабораторию (в копейках) */
	readonly withheldLabKopecks: number;
	/** Удержано за израсходованные материалы (в копейках) */
	readonly withheldMaterialKopecks: number;
	/** Совокупные удержания (в копейках) */
	readonly totalDeductionsKopecks: number;

	/** Гарантированный оклад за смены (в копейках) */
	readonly baseShiftSalaryKopecks: number;

	/**
	 * Итоговая сумма к выплате врачу (в копейках).
	 * Может быть отрицательной при превышении расходов ЗТЛ/материалов над начислениями.
	 */
	readonly netPayoutKopecks: number;

	/** Эффективная маржинальная доля клиники (% с точностью до сотых) */
	readonly clinicMarginPct: number;
}

/**
 * Точный расчет процента в целых копейках: (kopecks * pct) / 100 с банковским округлением
 */
export function calculateExactPercentageKopecks(kopecks: number, pct: number): number {
	if (kopecks <= 0 || pct <= 0) return 0;
	// Умножаем на basis points (100 * pct), чтобы исключить дробные доли
	const basisPoints = Math.round(pct * 100);
	return Math.round((kopecks * basisPoints) / 10000);
}

/**
 * Рассчитывает сдельную оплату врача строго в целых копейках
 */
export function calculateDoctorPieceRatePayout(
	input: DoctorCategoryPerformanceInput,
): DoctorPieceRatePayoutResult {
	const valid = doctorCategoryPerformanceSchema.parse(input);

	const accruedTherapy = calculateExactPercentageKopecks(
		valid.therapyRevenueKopecks,
		valid.therapyRatePct,
	);
	const accruedOrthopedics = calculateExactPercentageKopecks(
		valid.orthopedicsRevenueKopecks,
		valid.orthopedicsRatePct,
	);
	const accruedSurgery = calculateExactPercentageKopecks(
		valid.surgeryRevenueKopecks,
		valid.surgeryRatePct,
	);
	const accruedHygiene = calculateExactPercentageKopecks(
		valid.hygieneRevenueKopecks,
		valid.hygieneRatePct,
	);
	const accruedOther = calculateExactPercentageKopecks(
		valid.otherRevenueKopecks,
		valid.otherRatePct,
	);

	const grossAccrued =
		accruedTherapy + accruedOrthopedics + accruedSurgery + accruedHygiene + accruedOther;

	// Удержания ЗТЛ
	const withheldLab = calculateExactPercentageKopecks(
		valid.labOrdersCostKopecks,
		valid.labDeductionPct,
	);

	// Удержания материалов
	const withheldMaterial = calculateExactPercentageKopecks(
		valid.materialCostKopecks,
		valid.materialDeductionPct,
	);

	const totalDeductions = withheldLab + withheldMaterial;
	const baseSalary = valid.baseShiftSalaryKopecks;

	// Итого к выплате
	const netPayout = grossAccrued + baseSalary - totalDeductions;

	const totalRevenue =
		valid.therapyRevenueKopecks +
		valid.orthopedicsRevenueKopecks +
		valid.surgeryRevenueKopecks +
		valid.hygieneRevenueKopecks +
		valid.otherRevenueKopecks;

	let clinicMarginPct = 0;
	if (totalRevenue > 0) {
		const clinicRetained = totalRevenue - netPayout;
		clinicMarginPct = Math.round((clinicRetained / totalRevenue) * 10000) / 100;
	}

	return {
		totalRevenueKopecks: totalRevenue,
		accruedTherapyKopecks: accruedTherapy,
		accruedOrthopedicsKopecks: accruedOrthopedics,
		accruedSurgeryKopecks: accruedSurgery,
		accruedHygieneKopecks: accruedHygiene,
		accruedOtherKopecks: accruedOther,
		grossAccruedCommissionKopecks: grossAccrued,
		withheldLabKopecks: withheldLab,
		withheldMaterialKopecks: withheldMaterial,
		totalDeductionsKopecks: totalDeductions,
		baseShiftSalaryKopecks: baseSalary,
		netPayoutKopecks: netPayout,
		clinicMarginPct,
	};
}

/**
 * Преобразует сумму в копейках в человекочитаемый рублёвый формат
 * Пример: 125050 -> "1 250,50 ₽"
 */
export function formatKopecksToRublesDisplay(kopecks: number): string {
	const isNegative = kopecks < 0;
	const absKopecks = Math.abs(kopecks);
	const rubles = Math.floor(absKopecks / 100);
	const remainderKopecks = absKopecks % 100;

	const rublesFormatted = rubles.toLocaleString("ru-RU");
	const kopecksFormatted = remainderKopecks.toString().padStart(2, "0");

	const sign = isNegative ? "−" : "";
	return `${sign}${rublesFormatted},${kopecksFormatted} ₽`;
}

export function formatKopecksWithCurrency(kopecks: number): string {
	return formatKopecksToRublesDisplay(kopecks);
}


/**
 * Парсит рублёвую строку ввода в целочисленные копейки
 * Пример: "1 250,50" -> 125050, "500" -> 50000
 */
export function parseRublesToKopecks(input: string | number | null | undefined): number {
	if (input === null || input === undefined) return 0;
	if (typeof input === "number") {
		if (!Number.isFinite(input)) return 0;
		return Math.round(input * 100);
	}

	const normalized = input.trim().replace(/\s+/g, "").replace(",", ".");
	if (!normalized) return 0;

	const num = Number(normalized);
	if (!Number.isFinite(num)) return 0;
	return Math.round(num * 100);
}
