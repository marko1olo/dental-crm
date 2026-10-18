import { classifyChurnRisk, type RecallCohortData } from "../analyticsWidgetData.js";
import type { LostPatientRow, LostPatientsKpis } from "./lostPatientTypes";

export function filterLostPatients(
	patients: readonly LostPatientRow[],
	searchQuery: string,
	categoryFilter: string,
	riskBandFilter: string,
): LostPatientRow[] {
	return patients.filter((p) => {
		const matchesSearch =
			!searchQuery ||
			(p.patientName ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
			(p.phone ?? "").includes(searchQuery);

		const matchesCategory =
			categoryFilter === "all" || p.lastTreatmentCategory === categoryFilter;

		const risk = classifyChurnRisk(p.daysSinceLastVisit, p.lastTreatmentCategory);
		const matchesRisk =
			riskBandFilter === "all" || risk.band === riskBandFilter;

		return matchesSearch && matchesCategory && matchesRisk;
	});
}

export function computeLostPatientsKpis(
	patients: readonly LostPatientRow[],
	recallCohorts: readonly RecallCohortData[],
): LostPatientsKpis {
	const totalRiskPatients = patients.length;
	const due6mCount = patients.filter(
		(p) => p.daysSinceLastVisit >= 180 && p.daysSinceLastVisit < 365,
	).length;
	const overdue12mCount = patients.filter(
		(p) => p.daysSinceLastVisit >= 365 && p.daysSinceLastVisit < 730,
	).length;
	const critical24mCount = patients.filter(
		(p) => p.daysSinceLastVisit >= 730,
	).length;

	const totalSanitation = recallCohorts.filter((c) => c.category === "sanitation");
	const totalSanPatients = totalSanitation.reduce((s, c) => s + c.totalPatients, 0);
	const totalSanReturned6m = totalSanitation.reduce((s, c) => s + c.returned6m, 0);
	const sanRecall6m =
		totalSanPatients > 0
			? Math.round((totalSanReturned6m / totalSanPatients) * 1000) / 10
			: 0;

	const totalImpl = recallCohorts.filter((c) => c.category === "implantation");
	const totalImplPatients = totalImpl.reduce((s, c) => s + c.totalPatients, 0);
	const totalImplReturned12m = totalImpl.reduce((s, c) => s + c.returned12m, 0);
	const implRecall12m =
		totalImplPatients > 0
			? Math.round((totalImplReturned12m / totalImplPatients) * 1000) / 10
			: 0;

	const totalRecallRevenue = recallCohorts.reduce(
		(s, c) => s + (c.recallRevenueKopecks || 0),
		0,
	);
	const totalReturnedPatients = recallCohorts.reduce(
		(s, c) => s + Math.max(c.returned6m || 0, c.returned12m || 0),
		0,
	);
	const avgRecallRevenuePerPatient =
		totalReturnedPatients > 0
			? Math.round(totalRecallRevenue / totalReturnedPatients)
			: 0;

	const estimatedRecallRevenueKopecks =
		totalRiskPatients * avgRecallRevenuePerPatient;

	return {
		totalRiskPatients,
		due6mCount,
		overdue12mCount,
		critical24mCount,
		sanRecall6m,
		implRecall12m,
		estimatedRecallRevenueKopecks,
	};
}
