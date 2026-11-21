/**
 * DENTE Dental CRM — Leak Funnel & Reactivation Metrics Engine
 * Centralized calculation of CRM lead leak recovery and conversion funnels.
 */

export interface LeakFunnelLeadInput {
	id: string;
	leadStatus?: string | null | undefined;
	uncompletedPlanSumRub?: number | string | null | undefined;
	daysSinceLastVisit?: number | null | undefined;
}

export interface LeakFunnelMetricsResult {
	totalIdentifiedLeads: number;
	inProgressCount: number;
	contactedCount: number;
	rebookedCount: number;
	declinedCount: number;
	reactivationConversionPct: number;
	totalUncompletedPlanSumRub: number;
}

/**
 * Calculates recovery and reactivation metrics for dormant patient leads.
 */
export function calculateLeakFunnelMetrics(
	leads: readonly LeakFunnelLeadInput[] | null | undefined,
): LeakFunnelMetricsResult {
	if (!leads || leads.length === 0) {
		return {
			totalIdentifiedLeads: 0,
			inProgressCount: 0,
			contactedCount: 0,
			rebookedCount: 0,
			declinedCount: 0,
			reactivationConversionPct: 0,
			totalUncompletedPlanSumRub: 0,
		};
	}

	let inProgressCount = 0;
	let contactedCount = 0;
	let rebookedCount = 0;
	let declinedCount = 0;
	let totalUncompletedPlanSumRub = 0;

	for (const lead of leads) {
		const status = lead.leadStatus;
		if (status === "in_progress") inProgressCount++;
		else if (status === "contacted") contactedCount++;
		else if (status === "rebooked") rebookedCount++;
		else if (status === "declined") declinedCount++;

		const sum = Number(lead.uncompletedPlanSumRub) || 0;
		totalUncompletedPlanSumRub += sum;
	}

	const touched = inProgressCount + contactedCount + rebookedCount + declinedCount;
	const reactivationConversionPct =
		touched > 0 ? Math.round((rebookedCount / touched) * 100) : 0;

	return {
		totalIdentifiedLeads: leads.length,
		inProgressCount,
		contactedCount,
		rebookedCount,
		declinedCount,
		reactivationConversionPct,
		totalUncompletedPlanSumRub,
	};
}
