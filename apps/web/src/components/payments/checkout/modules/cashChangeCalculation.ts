import { rubToKopecks, kopecksToRub } from "@dental/shared";
import type { CashChangeCalculation } from "./types.js";

/**
 * Точный целочисленный расчет сдачи в копейках без потери точности (Мандат 8e / SSOT).
 */
export function calculateCashChangeKop(
	cashTenderedKop: number,
	cashRequiredKop: number,
): CashChangeCalculation {
	const sanitizedTendered = Number.isFinite(cashTenderedKop) ? Math.max(0, Math.round(cashTenderedKop)) : 0;
	const sanitizedRequired = Number.isFinite(cashRequiredKop) ? Math.max(0, Math.round(cashRequiredKop)) : 0;

	if (sanitizedRequired === 0) {
		return {
			cashTenderedKop: sanitizedTendered,
			cashRequiredKop: 0,
			changeDueKop: sanitizedTendered,
			isUnderpaid: false,
			missingKop: 0,
		};
	}

	if (sanitizedTendered >= sanitizedRequired) {
		return {
			cashTenderedKop: sanitizedTendered,
			cashRequiredKop: sanitizedRequired,
			changeDueKop: sanitizedTendered - sanitizedRequired,
			isUnderpaid: false,
			missingKop: 0,
		};
	}

	return {
		cashTenderedKop: sanitizedTendered,
		cashRequiredKop: sanitizedRequired,
		changeDueKop: 0,
		isUnderpaid: true,
		missingKop: sanitizedRequired - sanitizedTendered,
	};
}

/**
 * Расчет сдачи в рублях с делегированием целочисленному калькулятору в копейках (SSOT).
 */
export function calculateCashChangeRub(
	totalDueRub: number,
	receivedCashRub: number,
): {
	changeRub: number;
	receivedCashRub: number;
	totalDueRub: number;
	isShortage: boolean;
	shortageRub: number;
} {
	const tenderKop = rubToKopecks(receivedCashRub);
	const requiredKop = rubToKopecks(totalDueRub);
	const res = calculateCashChangeKop(tenderKop, requiredKop);

	return {
		changeRub: kopecksToRub(res.changeDueKop),
		receivedCashRub: kopecksToRub(res.cashTenderedKop),
		totalDueRub: kopecksToRub(res.cashRequiredKop),
		isShortage: res.isUnderpaid,
		shortageRub: kopecksToRub(res.missingKop),
	};
}
