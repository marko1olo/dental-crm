/**
 * packages/shared/src/analytics/executiveModules/kpiRevenueMath.ts
 * Computes revenue fulfillment, patient counts, and average check metrics.
 * Mandate 8b: <= 120 lines.
 */

import type { CalculateExecutiveKpisParams } from "./executiveSummaryTypes.js";

export interface KpiRevenueAndChecks {
	readonly revKop: number;
	readonly planKop: number;
	readonly overallPlanFulfillmentPercent: number;
	readonly primaryPatients: number;
	readonly repeatPatients: number;
	readonly totalPatients: number;
	readonly primaryPercent: number;
	readonly visits: number;
	readonly averageCheckKopecks: number;
	readonly primaryAvgCheckKopecks: number;
	readonly repeatAvgCheckKopecks: number;
}

export function calculateRevenueAndChecks(params: CalculateExecutiveKpisParams): KpiRevenueAndChecks {
	const revKop = Math.max(0, Math.round(params.totalRevenueKopecks));
	const planKop = Math.max(0, Math.round(params.totalRevenuePlanKopecks));
	const primaryPatients = Math.max(0, Math.round(params.primaryPatientsCount));
	const repeatPatients = Math.max(0, Math.round(params.repeatPatientsCount));
	const totalPatients = primaryPatients + repeatPatients;

	const overallPlanFulfillmentPercent = planKop > 0
		? Number(((revKop / planKop) * 100).toFixed(1))
		: (revKop > 0 ? 100.0 : 0.0);

	const primaryPercent = totalPatients > 0
		? Number(((primaryPatients / totalPatients) * 100).toFixed(1))
		: 0.0;

	const visits = Math.max(0, Math.round(params.totalCompletedVisits));
	const averageCheckKopecks = visits > 0
		? Math.round(revKop / visits)
		: (totalPatients > 0 ? Math.round(revKop / totalPatients) : 0);

	const primaryAvgCheckKopecks = primaryPatients > 0
		? Math.round(params.primaryRevenueKopecks / primaryPatients)
		: 0;

	const repeatAvgCheckKopecks = repeatPatients > 0
		? Math.round(params.repeatRevenueKopecks / repeatPatients)
		: 0;

	return {
		revKop, planKop, overallPlanFulfillmentPercent,
		primaryPatients, repeatPatients, totalPatients, primaryPercent,
		visits, averageCheckKopecks, primaryAvgCheckKopecks, repeatAvgCheckKopecks,
	};
}
