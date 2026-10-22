import type {
	RetroactiveBatchStats,
	RetroactiveDayRecord,
} from "./types.js";

/**
 * Расчет требуемого количества инструментов/лотков по визитам
 */
export function calculateEstimatedTrays(visitsCount: number): number {
	return visitsCount * 4;
}

/**
 * Расчет нормативного объема контрольной выборки ПСО (1%, min 3-5 шт.)
 */
export function calculatePsoSampleSize(traysCount: number): number {
	return Math.max(3, Math.ceil(traysCount * 0.01));
}

/**
 * Расчет минимального числа циклов стерилизации (12 наборов на цикл автоклава B-класса)
 */
export function calculateAutoclaveCycles(traysCount: number): number {
	return Math.max(2, Math.ceil(traysCount / 12));
}

/**
 * Calculates aggregate statistics for the batch
 */
export function calculateRetroactiveBatchStats(
	days: readonly RetroactiveDayRecord[],
): RetroactiveBatchStats {
	let workingDaysCount = 0;
	let totalTrays = 0;
	let totalPsoSamples = 0;
	let totalAutoclaveCycles = 0;
	let totalRecircHours = 0;
	let generalCleaningsCount = 0;
	let totalWasteKg = 0;
	let compliantDays = 0;

	for (const d of days) {
		if (d.isWorkingDay) {
			workingDaysCount++;
			totalTrays += d.traysProcessedCount;
			totalPsoSamples += d.psoSampleCount;
			totalAutoclaveCycles += d.autoclaveCyclesCount;
			totalRecircHours += d.recirculatorOperatingHours;
			if (d.isGeneralCleaningDay) {
				generalCleaningsCount++;
			}
			totalWasteKg += d.wasteClassBWeightKg + d.wasteClassAWeightKg;
		}
		if (d.sanpinCompliance100) {
			compliantDays++;
		}
	}

	const compliancePercentage =
		days.length > 0 ? Math.round((compliantDays / days.length) * 100) : 100;

	return {
		totalDays: days.length,
		workingDaysCount,
		totalTraysProcessed: totalTrays,
		totalPsoSamplesTested: totalPsoSamples,
		totalAutoclaveCycles: totalAutoclaveCycles,
		totalRecirculatorHours: Number(totalRecircHours.toFixed(1)),
		generalCleaningsCount,
		totalWasteKg: Number(totalWasteKg.toFixed(1)),
		compliancePercentage,
	};
}
