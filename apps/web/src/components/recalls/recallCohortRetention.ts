import type {
	PatientRecallRecord,
	RecallCycleType,
} from "./recallCycleCatalog";

export interface CohortRetentionGroup {
	readonly cohortKey: string;
	readonly cohortLabel: string;
	readonly totalPatients: number;
	readonly dueCount: number;
	readonly contactedCount: number;
	readonly scheduledCount: number;
	readonly completedCount: number;
	readonly declinedCount: number;
	readonly retentionRatePercent: number;
	readonly conversionRatePercent: number;
	readonly averageLtvRub: number;
	readonly totalRevenueRub: number;
	readonly estimatedLostRevenueRub: number;
}

export interface CohortRetentionReport {
	readonly cohorts: readonly CohortRetentionGroup[];
	readonly overallRetentionRatePercent: number;
	readonly overallConversionRatePercent: number;
	readonly overallAverageLtvRub: number;
	readonly totalRecallRevenueRub: number;
	readonly totalLostRevenueRub: number;
}

export interface RecallMetrics {
	readonly totalCandidates: number;
	readonly upcomingCount: number;
	readonly dueNowCount: number;
	readonly overdue30Count: number;
	readonly overdue90Count: number;
	readonly completedCount: number;
	readonly contactedCount: number;
	readonly scheduledCount: number;
	readonly declinedCount: number;
	readonly conversionRatePercent: number;
	readonly contactResponseRatePercent: number;
	readonly retentionRatePercent: number;
	readonly totalHistoricalLtvRub: number;
	readonly averageRecallLtvRub: number;
	readonly byCycle: Record<RecallCycleType, number>;
	readonly overdueEstimatedLostRevenueRub: number;
	readonly retainedRevenueRub: number;
}

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
	};

	for (const candidate of candidates) {
		if (byCycle[candidate.cycleType] !== undefined) {
			byCycle[candidate.cycleType]++;
		} else {
			byCycle.standard_prophylaxis++;
		}

		totalHistoricalLtvRub += candidate.historicalRevenueRub || 0;

		if (candidate.status === "completed") {
			completedCount++;
		} else if (candidate.status === "scheduled") {
			scheduledCount++;
		} else if (candidate.status === "declined") {
			declinedCount++;
		}

		if (
			candidate.status === "invited" ||
			candidate.status === "contacted" ||
			candidate.lastContactedAt
		) {
			contactedCount++;
		}

		switch (candidate.urgencyStatus) {
			case "upcoming":
				upcomingCount++;
				break;
			case "due_now":
				dueNowCount++;
				break;
			case "overdue_30":
				overdue30Count++;
				break;
			case "overdue_90":
				overdue90Count++;
				break;
			case "completed":
				break;
		}
	}

	const totalCandidates = candidates.length;
	const activeEligible = totalCandidates > 0 ? totalCandidates : 1;

	const totalRetained = scheduledCount + completedCount;
	const conversionRatePercent = Math.round((totalRetained / activeEligible) * 1000) / 10;

	const contactedBase = contactedCount > 0 ? contactedCount : 1;
	const contactResponseRatePercent = Math.round((totalRetained / contactedBase) * 1000) / 10;

	const pastDueBase = totalCandidates - upcomingCount;
	const retentionRatePercent =
		pastDueBase > 0
			? Math.round((completedCount / pastDueBase) * 1000) / 10
			: 0;

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

export function calculateCohortRetention(
	candidates: readonly PatientRecallRecord[],
	options: {
		readonly grouping?: ("month" | "quarter") | undefined;
		readonly defaultAverageCheckRub?: number | undefined;
	} = {},
): CohortRetentionReport {
	const grouping = options.grouping || "month";
	const defaultCheck = options.defaultAverageCheckRub || 6500;

	const groupsMap = new Map<
		string,
		{
			label: string;
			patients: PatientRecallRecord[];
		}
	>();

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
			const monthNames = [
				"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
				"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
			];
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

	const sortedKeys = Array.from(groupsMap.keys()).sort();

	for (const key of sortedKeys) {
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
			if (p.urgencyStatus !== "upcoming") {
				dueCount++;
			}
			if (p.status === "invited" || p.status === "contacted" || p.lastContactedAt) {
				contactedCount++;
			}
			if (p.status === "scheduled") {
				scheduledCount++;
			} else if (p.status === "completed") {
				completedCount++;
			} else if (p.status === "declined") {
				declinedCount++;
			}
		}

		const retainedCount = scheduledCount + completedCount;
		const retentionRatePercent =
			dueCount > 0 ? Math.round((completedCount / dueCount) * 1000) / 10 : 0;
		const conversionRatePercent =
			totalPatients > 0 ? Math.round((retainedCount / totalPatients) * 1000) / 10 : 0;

		const totalRevenueRub = retainedCount * defaultCheck;
		const estimatedLostRevenueRub = (dueCount - retainedCount) * defaultCheck;
		const averageLtvRub =
			totalPatients > 0 ? Math.round(groupHistoricalLtv / totalPatients) : 0;

		cohorts.push({
			cohortKey: key,
			cohortLabel: entry.label,
			totalPatients,
			dueCount,
			contactedCount,
			scheduledCount,
			completedCount,
			declinedCount,
			retentionRatePercent,
			conversionRatePercent,
			averageLtvRub,
			totalRevenueRub,
			estimatedLostRevenueRub,
		});

		totalAllPatients += totalPatients;
		totalAllCompleted += completedCount;
		totalAllScheduled += scheduledCount;
		totalAllDue += dueCount;
		totalAllRevenue += totalRevenueRub;
		totalAllLost += estimatedLostRevenueRub;
		totalAllHistoricalLtv += groupHistoricalLtv;
	}

	const overallRetentionRatePercent =
		totalAllDue > 0 ? Math.round((totalAllCompleted / totalAllDue) * 1000) / 10 : 0;
	const overallConversionRatePercent =
		totalAllPatients > 0
			? Math.round(((totalAllScheduled + totalAllCompleted) / totalAllPatients) * 1000) / 10
			: 0;
	const overallAverageLtvRub =
		totalAllPatients > 0 ? Math.round(totalAllHistoricalLtv / totalAllPatients) : 0;

	return {
		cohorts,
		overallRetentionRatePercent,
		overallConversionRatePercent,
		overallAverageLtvRub,
		totalRecallRevenueRub: totalAllRevenue,
		totalLostRevenueRub: totalAllLost,
	};
}
