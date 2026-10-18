import {
	type Kopecks,
	splitKopecks,
} from "@dental/shared";
import type { TierInstallmentPlan } from "../types";

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
			totalKopecks: 0 as Kopecks,
			monthlyPaymentKopecks: 0 as Kopecks,
			monthlyPaymentRub: 0,
			partsKopecks: Array(months).fill(0 as Kopecks),
			remainderKopecks: 0 as Kopecks,
		};
	}

	const parts = splitKopecks(totalKopecks, months);
	const monthlyPaymentKopecks = (parts[0] ?? 0) as Kopecks;
	const monthlyPaymentRub = Math.round(monthlyPaymentKopecks / 100);
	const basePart = Math.floor(totalKopecks / months);
	const remainder = (totalKopecks - basePart * months) as Kopecks;

	return {
		months,
		totalKopecks,
		monthlyPaymentKopecks,
		monthlyPaymentRub,
		partsKopecks: parts,
		remainderKopecks: remainder,
	};
}

/**
 * Расчет рассрочки 0% без потерь копеек (Мандат 8b, 8e).
 * Сумма всех частей строго равна totalKopecks.
 */
export function computeTierInstallments(
	totalKopecks: Kopecks,
	options?: { distributeEvenly?: boolean },
): Record<3 | 6 | 12 | 24, TierInstallmentPlan> {
	const distributeEvenly = options?.distributeEvenly ?? false;
	const build = (months: 3 | 6 | 12 | 24): TierInstallmentPlan => {
		if (totalKopecks <= 0) {
			return {
				months,
				monthlyPaymentKopecks: 0 as Kopecks,
				monthlyPaymentRub: 0,
				partsKopecks: Array(months).fill(0 as Kopecks),
				remainderKopecks: 0 as Kopecks,
			};
		}
		if (distributeEvenly) {
			const parts = splitKopecks(totalKopecks, months);
			const monthlyPaymentKopecks = (parts[0] ?? 0) as Kopecks;
			const monthlyPaymentRub = Math.round(monthlyPaymentKopecks / 100);
			const remainderKopecks = ((parts[parts.length - 1] ?? 0) - monthlyPaymentKopecks) as Kopecks;
			return {
				months,
				monthlyPaymentKopecks,
				monthlyPaymentRub,
				partsKopecks: parts,
				remainderKopecks,
			};
		}

		// Каноническое распределение с остатком в первом платеже (Мандат 8e / 8n)
		const basePart = Math.floor(totalKopecks / months) as Kopecks;
		const remainder = (totalKopecks - basePart * months) as Kopecks;
		const parts: Kopecks[] = [];
		for (let i = 0; i < months; i++) {
			parts.push((i === 0 ? basePart + remainder : basePart) as Kopecks);
		}
		const monthlyPaymentRub = Math.round(basePart / 100);
		return {
			months,
			monthlyPaymentKopecks: basePart,
			monthlyPaymentRub,
			partsKopecks: parts,
			remainderKopecks: remainder,
		};
	};

	return {
		3: build(3),
		6: build(6),
		12: build(12),
		24: build(24),
	};
}

export const calculateChairsideInstallments = computeTierInstallments;
