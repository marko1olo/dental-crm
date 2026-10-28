import type { PatientCohortMetric } from "./romiTypes.js";

export function calculateRepeatRatePercent(primaryCount: number, repeatCount: number): number {
	const total = Math.max(0, primaryCount) + Math.max(0, repeatCount);
	if (total === 0) return 0;
	return Number(((repeatCount / total) * 100).toFixed(1));
}

export function calculateEstimatedCohortLtvKopecks(
	primaryCount: number,
	revenueKopecks: number,
	repeatCount: number,
	averageCheckKopecks: number | null,
	explicitLtvRevenueKopecks?: number,
): number | null {
	if (primaryCount <= 0) return null;
	if (explicitLtvRevenueKopecks !== undefined && explicitLtvRevenueKopecks > 0) {
		return Math.round(explicitLtvRevenueKopecks / primaryCount);
	}
	if (averageCheckKopecks !== null) {
		const estimatedTotal = revenueKopecks + (repeatCount * averageCheckKopecks);
		return Math.round(estimatedTotal / primaryCount);
	}
	return Math.round(revenueKopecks / primaryCount);
}

export function buildPatientCohortMetrics(
	cohortKey: string,
	primaryCount: number,
	repeatCount: number,
	totalRevenueKopecks: number,
): PatientCohortMetric {
	const repeatRate = calculateRepeatRatePercent(primaryCount, repeatCount);
	const avgLtv = primaryCount > 0 ? Math.round(totalRevenueKopecks / primaryCount) : 0;
	return {
		cohortKey,
		patientCount: primaryCount,
		repeatVisitsCount: repeatCount,
		repeatRatePercent: repeatRate,
		averageLtvKopecks: avgLtv,
	};
}
