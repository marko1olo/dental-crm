import {
	type Kopecks,
	calculateStaged304030Schedule,
} from "@dental/shared";
import { safeKopecks } from "./pricingFormatters";

export interface StagedPaymentBreakdownKopecks {
	readonly totalKopecks: Kopecks;
	readonly stage1Kopecks: Kopecks;
	readonly stage2Kopecks: Kopecks;
	readonly stage3Kopecks: Kopecks;
	readonly stage1Rub: number;
	readonly stage2Rub: number;
	readonly stage3Rub: number;
}

/**
 * Копеечный расчет поэтапной оплаты (по умолчанию 30% аванс / 40% хирургия / 30% ортопедия).
 * Сумма этапов точно сходится с итогом сметы без погрешностей округления.
 */
export function calculateStagedPaymentScheduleKopecks(
	totalKopecks: Kopecks,
	ratios: readonly [number, number, number] = [30, 40, 30],
): StagedPaymentBreakdownKopecks {
	if (!Number.isInteger(totalKopecks) || totalKopecks <= 0) {
		return {
			totalKopecks: 0 as Kopecks,
			stage1Kopecks: 0 as Kopecks,
			stage2Kopecks: 0 as Kopecks,
			stage3Kopecks: 0 as Kopecks,
			stage1Rub: 0,
			stage2Rub: 0,
			stage3Rub: 0,
		};
	}

	const stage1Kopecks = Math.round((totalKopecks * ratios[0]) / 100) as Kopecks;
	const stage2Kopecks = Math.round((totalKopecks * ratios[1]) / 100) as Kopecks;
	const stage3Kopecks = Math.max(0, totalKopecks - stage1Kopecks - stage2Kopecks) as Kopecks;

	return {
		totalKopecks,
		stage1Kopecks,
		stage2Kopecks,
		stage3Kopecks,
		stage1Rub: Math.round(stage1Kopecks / 100),
		stage2Rub: Math.round(stage2Kopecks / 100),
		stage3Rub: Math.round(stage3Kopecks / 100),
	};
}

/**
 * Прямой расчет поэтапной оплаты (30% / 40% / 30%) с балансировкой копеек.
 */
export function calculateStagedPayment304030(totalKopecksOrRub: number, isKopecks: boolean = true) {
	return calculateStaged304030Schedule(totalKopecksOrRub, isKopecks);
}

/**
 * Результат расчета скидки при 100% единовременной предоплате (DENTE SSOT).
 */
export interface PrepaymentDiscountCalculation {
	readonly totalKopecks: Kopecks;
	readonly discountPercent: number;
	readonly discountKopecks: Kopecks;
	readonly discountRub: number;
	readonly finalPriceKopecks: Kopecks;
	readonly finalPriceRub: number;
}

/**
 * Расчет скидки при 100% единовременной предоплате (по умолчанию 5%) с копеечной точностью (Мандаты 8b, 8e, 8n).
 */
export function calculatePrepaymentDiscountKopecks(
	totalKopecksOrRub: number | string | null | undefined,
	discountPercent: number = 5,
	isKopecks: boolean = true,
): PrepaymentDiscountCalculation {
	const rawKopecks = Math.max(
		0,
		isKopecks
			? Math.round(Number(totalKopecksOrRub) || 0)
			: (safeKopecks(totalKopecksOrRub, { allowEmptyAsZero: true }) ?? 0),
	) as Kopecks;

	const safePct = Math.max(0, Math.min(100, Number.isFinite(discountPercent) ? discountPercent : 5));
	const discountKopecks = Math.round(rawKopecks * (safePct / 100)) as Kopecks;
	const finalPriceKopecks = Math.max(0, rawKopecks - discountKopecks) as Kopecks;

	return {
		totalKopecks: rawKopecks,
		discountPercent: safePct,
		discountKopecks,
		discountRub: Math.round(discountKopecks / 100),
		finalPriceKopecks,
		finalPriceRub: Math.round(finalPriceKopecks / 100),
	};
}
