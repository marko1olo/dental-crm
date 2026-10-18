import type { ExecutiveDashboardPayload, ExecutivePeriod } from "@dental/shared";
import { getDemoExecutiveAnalytics, isDemoShowcaseMode } from "../../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { buildEmptyExecutivePayload } from "./executiveAnalyticsTypes";
import type { ChairsUtilizationApiResponse } from "./useExecutiveDashboardData";

export interface FetchExecutiveDataResult {
	payload: ExecutiveDashboardPayload;
	chairsData: ChairsUtilizationApiResponse | null;
}

export async function fetchExecutiveDashboardData(
	period: ExecutivePeriod,
): Promise<FetchExecutiveDataResult> {
	if (isDemoShowcaseMode()) {
		const demoPayload = getDemoExecutiveAnalytics(period);
		const chairsData: ChairsUtilizationApiResponse = {
			chairUtilizationJson: [
				{ chairId: "chair-1", name: "Кабинет 1 (Терапия)", value: 42, occupiedMinutes: 12600, availableMinutes: 18000, utilizationPercent: 70.0, fill: "#0d9488" },
				{ chairId: "chair-2", name: "Кабинет 2 (Ортопедия / Хирургия)", value: 38, occupiedMinutes: 14400, availableMinutes: 18000, utilizationPercent: 80.0, fill: "#6366f1" },
				{ chairId: "chair-3", name: "Кабинет 3 (Ортодонтия / Детство)", value: 29, occupiedMinutes: 9900, availableMinutes: 18000, utilizationPercent: 55.0, fill: "#38bdf8" },
			],
			chairOccupancyRatePercent: 68.3,
			chairHourlyCostRub: 1850,
			chairHourlyNominalCostRub: 1200,
		};
		return { payload: demoPayload, chairsData };
	}

	const headers = { ...denteAdminSecretRequestHeaders(), Accept: "application/json" };
	const [summaryRes, chairsRes] = await Promise.all([
		fetch(`/api/analytics/executive-summary?period=${period}`, { headers }).catch(() => null),
		fetch(`/api/analytics/chairs-utilization?range=${period}`, { headers }).catch(() => null),
	]);

	let payload: ExecutiveDashboardPayload = buildEmptyExecutivePayload(period);
	let chairsData: ChairsUtilizationApiResponse | null = null;

	if (summaryRes && summaryRes.ok) {
		const json = await summaryRes.json();
		if (json.success && json.data) payload = json.data;
	} else {
		const fallbackRes = await fetch(`/api/analytics/executive?period=${period}`, { headers }).catch(() => null);
		if (fallbackRes && fallbackRes.ok) {
			const json = await fallbackRes.json();
			if (json.success && json.data) payload = json.data;
		}
	}

	if (chairsRes && chairsRes.ok) {
		const chairsJson = await chairsRes.json();
		if (chairsJson.success && chairsJson.data) chairsData = chairsJson.data;
	}

	return { payload, chairsData };
}
