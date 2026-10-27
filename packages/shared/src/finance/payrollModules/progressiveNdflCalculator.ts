/**
 * packages/shared/src/finance/payrollModules/progressiveNdflCalculator.ts
 * Progressive Personal Income Tax (НДФЛ 13% / 15%) per Art. 224 & 225 p. 6 Tax Code RF.
 * Mandate 8b: <= 120 lines.
 */

import type { NdflTaxCalculationResult } from "./payrollPresetTypes.js";

/**
 * Порог дохода для перехода на прогрессивную ставку НДФЛ 15% (ст. 224 НК РФ):
 * 5 000 000 рублей = 500 000 000 копеек.
 */
export const NDFL_PROGRESSIVE_THRESHOLD_KOP = 500_000_000;

/**
 * Рассчитывает НДФЛ с учетом прогрессивной шкалы 13% / 15% (ст. 224 НК РФ)
 * со строгим округлением каждого налога до целых рублей (п. 6 ст. 225 НК РФ).
 */
export function calculateProgressiveNdflTax(
	grossPayoutKop: number,
	cumulativeYtdGrossKop: number = 0,
	thresholdKop: number = NDFL_PROGRESSIVE_THRESHOLD_KOP,
): NdflTaxCalculationResult {
	if (grossPayoutKop <= 0) {
		return {
			ndflTaxKop: 0,
			ndfl13TaxKop: 0,
			ndfl15TaxKop: 0,
			effectiveRatePercent: 13,
			isProgressiveApplied: false,
		};
	}

	const prevGross = Math.max(0, cumulativeYtdGrossKop);
	const newGross = prevGross + grossPayoutKop;

	let tax13Kop = 0;
	let tax15Kop = 0;

	if (newGross <= thresholdKop) {
		// Полностью в базовой ставке 13%, округление до целого рубля (п. 6 ст. 225 НК РФ)
		tax13Kop = Math.round((grossPayoutKop * 13) / 10000) * 100;
	} else if (prevGross >= thresholdKop) {
		// Полностью в прогрессивной ставке 15%, округление до целого рубля
		tax15Kop = Math.round((grossPayoutKop * 15) / 10000) * 100;
	} else {
		// Переход через порог 5 000 000 руб: часть по 13%, остаток по 15%
		const portionIn13 = thresholdKop - prevGross;
		const portionIn15 = grossPayoutKop - portionIn13;
		tax13Kop = Math.round((portionIn13 * 13) / 10000) * 100;
		tax15Kop = Math.round((portionIn15 * 15) / 10000) * 100;
	}

	const totalTaxKop = tax13Kop + tax15Kop;
	const isProgressiveApplied = tax15Kop > 0;
	const effectiveRatePercent = Number(((totalTaxKop / grossPayoutKop) * 100).toFixed(2));

	return {
		ndflTaxKop: totalTaxKop,
		ndfl13TaxKop: tax13Kop,
		ndfl15TaxKop: tax15Kop,
		effectiveRatePercent,
		isProgressiveApplied,
	};
}
