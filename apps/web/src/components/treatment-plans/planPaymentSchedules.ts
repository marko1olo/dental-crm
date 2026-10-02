/**
 * planPaymentSchedules.ts — Копеечные графики платежей, рассрочки 0% и этапов лечения (DENTE CRM).
 *
 * Принципы (Мандаты 8b, 8e):
 * 1. Рассрочка 0% без переплат (3, 6, 12, 24 мес): сумма всех платежей строго равна итогу плана до копейки.
 * 2. Поэтапная оплата (30% аванс / 40% хирургия / 30% ортопедия): без копеечных потерь при делении.
 * 3. Форматирование цен на чистом русском языке без артефактов (NULL, NaN ₽, 404).
 */

import {
	type Kopecks,
	splitKopecks,
} from "@dental/shared";

export interface InstallmentScheduleKopecks {
	readonly months: 3 | 6 | 12 | 24;
	readonly totalKopecks: Kopecks;
	readonly monthlyPaymentKopecks: Kopecks;
	readonly monthlyPaymentRub: number;
	readonly partsKopecks: readonly Kopecks[];
	readonly remainderKopecks: Kopecks;
}

/**
 * Точный копеечный расчет рассрочки 0% без переплат (Мандат 8b, 8e).
 * Сумма всех ежемесячных платежей гарантированно равна итогу плана до копейки (kopeck-exact).
 */
export function calculateInstallmentScheduleKopecks(
	totalKopecks: Kopecks,
	months: 3 | 6 | 12 | 24,
): InstallmentScheduleKopecks {
	if (!Number.isInteger(totalKopecks) || totalKopecks <= 0) {
		return {
			months,
			totalKopecks: 0,
			monthlyPaymentKopecks: 0,
			monthlyPaymentRub: 0,
			partsKopecks: Array(months).fill(0),
			remainderKopecks: 0,
		};
	}

	const parts = splitKopecks(totalKopecks, months);
	const monthlyPaymentKopecks = parts[0] ?? 0;
	const monthlyPaymentRub = Math.round(monthlyPaymentKopecks / 100);
	const basePart = Math.floor(totalKopecks / months);
	const remainder = totalKopecks - basePart * months;

	return {
		months,
		totalKopecks,
		monthlyPaymentKopecks,
		monthlyPaymentRub,
		partsKopecks: parts,
		remainderKopecks: remainder,
	};
}

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
			totalKopecks: 0,
			stage1Kopecks: 0,
			stage2Kopecks: 0,
			stage3Kopecks: 0,
			stage1Rub: 0,
			stage2Rub: 0,
			stage3Rub: 0,
		};
	}

	const stage1Kopecks = Math.round((totalKopecks * ratios[0]) / 100);
	const stage2Kopecks = Math.round((totalKopecks * ratios[1]) / 100);
	const stage3Kopecks = Math.max(0, totalKopecks - stage1Kopecks - stage2Kopecks);

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
 * Форматирование суммы в рублях на понятном русском языке.
 * Запрет на сырые «NULL», «NaN ₽», «404 Not Found» или машинный мусор в UI.
 */
export function formatPlanPriceRub(
	amountRub: number | string | null | undefined,
	fallbackText = "Цена не указана",
): string {
	if (amountRub === null || amountRub === undefined || amountRub === "") {
		return fallbackText;
	}
	const num =
		typeof amountRub === "string"
			? Number(amountRub.replace(/\s+/g, "").replace(",", "."))
			: amountRub;
	if (!Number.isFinite(num)) {
		return fallbackText;
	}
	const formatted = Math.round(num)
		.toLocaleString("ru-RU")
		.replace(/[\u00A0\u202F]/g, " ");
	return `${formatted} ₽`;
}
