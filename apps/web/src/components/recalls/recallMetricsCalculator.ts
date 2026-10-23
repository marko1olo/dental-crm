import type { RecallCycleType } from "./recallCycleTypes";
import type { PatientRecallRecord, RecallMetrics } from "./recallRecordTypes";

export function calculateRecallMetrics(
	candidates: readonly PatientRecallRecord[],
	estimatedHygieneRevenueRub = 6500,
): RecallMetrics {
	let upcomingCount = 0;
	let dueNowCount = 0;
	let overdue30Count = 0;
	let overdue90Count = 0;
	let completedCount = 0;
	let contactedCount = 0;
	let scheduledCount = 0;
	let declinedCount = 0;
	let totalHistoricalLtvRub = 0;

	const byCycle: Record<RecallCycleType, number> = {
		standard_prophylaxis: 0,
		periodontal_maintenance: 0,
		implant_monitoring: 0,
		orthodontic_braces: 0,
		orthodontic_aligners: 0,
		orthodontic_retention: 0,
		pediatric_fluoridation: 0,
		caries_high_risk: 0,
		prosthetic_check: 0,
		endodontic_check: 0,
	};

	for (const candidate of candidates) {
		if (byCycle[candidate.cycleType] !== undefined) {
			byCycle[candidate.cycleType]++;
		} else {
			byCycle.standard_prophylaxis++;
		}
		totalHistoricalLtvRub += candidate.historicalRevenueRub || 0;
		if (candidate.status === "completed") completedCount++;
		else if (candidate.status === "scheduled") scheduledCount++;
		else if (candidate.status === "declined") declinedCount++;

		if (candidate.status === "invited" || candidate.status === "contacted" || candidate.lastContactedAt) {
			contactedCount++;
		}
		if (candidate.urgencyStatus === "upcoming") upcomingCount++;
		else if (candidate.urgencyStatus === "due_now") dueNowCount++;
		else if (candidate.urgencyStatus === "overdue_30") overdue30Count++;
		else if (candidate.urgencyStatus === "overdue_90") overdue90Count++;
	}

	const totalCandidates = candidates.length;
	const activeEligible = totalCandidates > 0 ? totalCandidates : 1;
	const totalRetained = scheduledCount + completedCount;
	const conversionRatePercent = Math.round((totalRetained / activeEligible) * 1000) / 10;
	const contactedBase = contactedCount > 0 ? contactedCount : 1;
	const contactResponseRatePercent = Math.round((totalRetained / contactedBase) * 1000) / 10;
	const pastDueBase = totalCandidates - upcomingCount;
	const retentionRatePercent = pastDueBase > 0 ? Math.round((completedCount / pastDueBase) * 1000) / 10 : 0;
	const completedOrHistoricalBase = completedCount > 0 ? completedCount : (totalCandidates > 0 ? totalCandidates : 1);
	const averageRecallLtvRub = Math.round(totalHistoricalLtvRub / completedOrHistoricalBase);
	const lostPatientsCount = overdue30Count + overdue90Count + declinedCount;
	const overdueEstimatedLostRevenueRub = lostPatientsCount * estimatedHygieneRevenueRub;
	const retainedRevenueRub = totalRetained * estimatedHygieneRevenueRub;

	return {
		totalCandidates,
		upcomingCount,
		dueNowCount,
		overdue30Count,
		overdue90Count,
		completedCount,
		contactedCount,
		scheduledCount,
		declinedCount,
		conversionRatePercent: Math.min(100, conversionRatePercent),
		contactResponseRatePercent: Math.min(100, contactResponseRatePercent),
		retentionRatePercent: Math.min(100, retentionRatePercent),
		totalHistoricalLtvRub,
		averageRecallLtvRub,
		byCycle,
		overdueEstimatedLostRevenueRub,
		retainedRevenueRub,
	};
}
