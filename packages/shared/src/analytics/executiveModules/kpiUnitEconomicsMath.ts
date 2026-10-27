/**
 * packages/shared/src/analytics/executiveModules/kpiUnitEconomicsMath.ts
 * Computes CAC, LTV, chair occupancy rate, and schedule conversion metrics.
 * Mandate 8b: <= 120 lines.
 */

import type { CalculateExecutiveKpisParams } from "./executiveSummaryTypes.js";

export interface KpiUnitEconomicsAndChairs {
	readonly mktSpend: number;
	readonly cacKopecks: number;
	readonly ltvKopecks: number;
	readonly ltvToCacRatio: number;
	readonly occupiedMin: number;
	readonly availableMin: number;
	readonly chairOccupancyRatePercent: number;
	readonly leads: number;
	readonly sanCount: number;
	readonly leadToSanitationConversionPercent: number;
	readonly aiDiagnosticRatePercent: number;
	readonly cancelledVisits: number;
	readonly noShowVisits: number;
	readonly cancellationRatePercent: number;
}

export function calculateUnitEconomicsAndChairs(
	params: CalculateExecutiveKpisParams,
	revKop: number,
	primaryPatients: number,
	visits: number,
): KpiUnitEconomicsAndChairs {
	const mktSpend = Math.max(0, Math.round(params.totalMarketingSpendKopecks));
	const cacKopecks = primaryPatients > 0 ? Math.round(mktSpend / primaryPatients) : 0;
	const ltvKopecks = Math.max(0, Math.round(params.historicalCohortLtvKopecks || revKop));

	let ltvToCacRatio = 0.0;
	if (cacKopecks > 0) {
		ltvToCacRatio = Number((ltvKopecks / cacKopecks).toFixed(1));
	} else if (ltvKopecks > 0 && mktSpend === 0) {
		ltvToCacRatio = 99.9;
	}

	const occupiedMin = Math.max(0, Math.round(params.totalOccupiedMinutes));
	const availableMin = Math.max(0, Math.round(params.totalAvailableMinutes));
	let chairOccupancyRatePercent = 0.0;
	if (availableMin > 0) {
		chairOccupancyRatePercent = Math.min(100.0, Number(((occupiedMin / availableMin) * 100).toFixed(1)));
	}

	const leads = Math.max(0, Math.round(params.totalLeadsCount));
	const sanCount = Math.max(0, Math.round(params.totalSanitationCount));
	const leadToSanitationConversionPercent = leads > 0 ? Number(((sanCount / leads) * 100).toFixed(1)) : 0.0;

	const aiExams = Math.max(0, Math.round(params.aiExaminedLeadsCount));
	const aiDiagnosticRatePercent = primaryPatients > 0
		? Math.min(100, Number(((aiExams / primaryPatients) * 100).toFixed(1)))
		: 0.0;

	const cancelledVisits = Math.max(0, Math.round(params.cancelledVisitsCount ?? 0));
	const noShowVisits = Math.max(0, Math.round(params.noShowVisitsCount ?? 0));
	const totalScheduled = visits + cancelledVisits + noShowVisits;
	const cancellationRatePercent = totalScheduled > 0
		? Number((((cancelledVisits + noShowVisits) / totalScheduled) * 100).toFixed(1))
		: 0.0;

	return {
		mktSpend, cacKopecks, ltvKopecks, ltvToCacRatio,
		occupiedMin, availableMin, chairOccupancyRatePercent,
		leads, sanCount, leadToSanitationConversionPercent,
		aiDiagnosticRatePercent, cancelledVisits, noShowVisits, cancellationRatePercent,
	};
}
