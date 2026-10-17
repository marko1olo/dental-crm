import type { PatientRecallRecord } from "./recallRecordTypes";
import type { CohortRetentionGroup, CohortRetentionReport } from "./recallCohortTypes";

export function calculateCohortRetention(
	candidates: readonly PatientRecallRecord[],
	options: { readonly grouping?: ("month" | "quarter") | undefined; readonly defaultAverageCheckRub?: number | undefined } = {},
): CohortRetentionReport {
	const grouping = options.grouping || "month";
	const defaultCheck = options.defaultAverageCheckRub || 6500;
	const groupsMap = new Map<string, { label: string; patients: PatientRecallRecord[] }>();

	for (const candidate of candidates) {
		const visitDate = candidate.lastVisitDate || "2026-01-01";
		let cohortKey = "";
		let cohortLabel = "";

		if (grouping === "quarter") {
			const year = visitDate.slice(0, 4);
			const month = Number.parseInt(visitDate.slice(5, 7), 10);
			const quarter = Math.ceil(month / 3);
			cohortKey = `${year}-Q${quarter}`;
			cohortLabel = `${quarter} кв. ${year}`;
		} else {
			cohortKey = visitDate.slice(0, 7);
			const [year, monthStr] = cohortKey.split("-");
			const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
			const mIndex = Number.parseInt(monthStr || "1", 10) - 1;
			cohortLabel = `${monthNames[mIndex] || monthStr} ${year}`;
		}

		if (!groupsMap.has(cohortKey)) {
			groupsMap.set(cohortKey, { label: cohortLabel, patients: [] });
		}
		groupsMap.get(cohortKey)!.patients.push(candidate);
	}

	const cohorts: CohortRetentionGroup[] = [];
	let totalAllPatients = 0;
	let totalAllCompleted = 0;
	let totalAllScheduled = 0;
	let totalAllDue = 0;
	let totalAllRevenue = 0;
	let totalAllLost = 0;
	let totalAllHistoricalLtv = 0;

	for (const key of Array.from(groupsMap.keys()).sort()) {
		const entry = groupsMap.get(key)!;
		const list = entry.patients;
		const totalPatients = list.length;
		let dueCount = 0;
		let contactedCount = 0;
		let scheduledCount = 0;
		let completedCount = 0;
		let declinedCount = 0;
		let groupHistoricalLtv = 0;

		for (const p of list) {
			groupHistoricalLtv += p.historicalRevenueRub || 0;
			if (p.urgencyStatus !== "upcoming") dueCount++;
			if (p.status === "invited" || p.status === "contacted" || p.lastContactedAt) contactedCount++;
			if (p.status === "scheduled") scheduledCount++;
			else if (p.status === "completed") completedCount++;
			else if (p.status === "declined") declinedCount++;
		}

		const retainedCount = scheduledCount + completedCount;
		const retentionRatePercent = dueCount > 0 ? Math.round((completedCount / dueCount) * 1000) / 10 : 0;
		const conversionRatePercent = totalPatients > 0 ? Math.round((retainedCount / totalPatients) * 1000) / 10 : 0;
		const totalRevenueRub = retainedCount * defaultCheck;
		const estimatedLostRevenueRub = (dueCount - retainedCount) * defaultCheck;
		const averageLtvRub = totalPatients > 0 ? Math.round(groupHistoricalLtv / totalPatients) : 0;

		cohorts.push({
			cohortKey: key, cohortLabel: entry.label, totalPatients, dueCount, contactedCount,
			scheduledCount, completedCount, declinedCount, retentionRatePercent, conversionRatePercent,
			averageLtvRub, totalRevenueRub, estimatedLostRevenueRub,
		});

		totalAllPatients += totalPatients;
		totalAllCompleted += completedCount;
		totalAllScheduled += scheduledCount;
		totalAllDue += dueCount;
		totalAllRevenue += totalRevenueRub;
		totalAllLost += estimatedLostRevenueRub;
		totalAllHistoricalLtv += groupHistoricalLtv;
	}

	const overallRetentionRatePercent = totalAllDue > 0 ? Math.round((totalAllCompleted / totalAllDue) * 1000) / 10 : 0;
	const overallConversionRatePercent = totalAllPatients > 0 ? Math.round(((totalAllScheduled + totalAllCompleted) / totalAllPatients) * 1000) / 10 : 0;
	const overallAverageLtvRub = totalAllPatients > 0 ? Math.round(totalAllHistoricalLtv / totalAllPatients) : 0;

	return {
		cohorts, overallRetentionRatePercent, overallConversionRatePercent,
		overallAverageLtvRub, totalRecallRevenueRub: totalAllRevenue, totalLostRevenueRub: totalAllLost,
	};
}
