/**
 * packages/shared/src/analytics/executiveModules/departmentBreakdownCalculator.ts
 * Pure calculation of plan/fact revenue fulfillment across 5 clinical departments.
 * Mandate 8b: <= 120 lines.
 */

import { formatKopecksRu } from "../../utils/money.js";
import {
	EXECUTIVE_DEPARTMENT_DEFINITIONS,
	type DepartmentPerformanceStatus,
	type ExecutiveDepartmentKey,
} from "./executiveDepartmentDefinitions.js";
import type { ExecutiveDepartmentItem, RawDepartmentInput } from "./executiveDepartmentTypes.js";

/**
 * Расчет показателей План/Факт по 5 клиническим отделениям.
 */
export function calculateDepartmentBreakdown(
	inputs: readonly RawDepartmentInput[],
): ExecutiveDepartmentItem[] {
	const totalFactKopecks = inputs.reduce(
		(sum, item) => sum + Math.max(0, item.factRevenueKopecks),
		0,
	);

	const inputMap = new Map<ExecutiveDepartmentKey, RawDepartmentInput>();
	for (const item of inputs) {
		inputMap.set(item.departmentKey, item);
	}

	return EXECUTIVE_DEPARTMENT_DEFINITIONS.map((def) => {
		const raw = inputMap.get(def.key) || {
			departmentKey: def.key,
			planRevenueKopecks: 0,
			factRevenueKopecks: 0,
			completedVisitsCount: 0,
			uniquePatientsCount: 0,
		};

		const planKop = Math.max(0, Math.round(raw.planRevenueKopecks));
		const factKop = Math.max(0, Math.round(raw.factRevenueKopecks));
		const visits = Math.max(0, Math.round(raw.completedVisitsCount));
		const patients = Math.max(0, Math.round(raw.uniquePatientsCount));

		const planFulfillmentPercent = planKop > 0
			? Number(((factKop / planKop) * 100).toFixed(1))
			: (factKop > 0 ? 100.0 : 0.0);

		const shareOfTotalRevenuePercent = totalFactKopecks > 0
			? Number(((factKop / totalFactKopecks) * 100).toFixed(1))
			: 0.0;

		const averageCheckKopecks = visits > 0 ? Math.round(factKop / visits) : 0;

		let status: DepartmentPerformanceStatus = "on_track";
		let statusLabel = "В графике плана";

		if (planKop === 0 && factKop === 0) {
			status = "on_track";
			statusLabel = "План не задан";
		} else if (planFulfillmentPercent >= 105.0) {
			status = "ahead";
			statusLabel = "План перевыполнен";
		} else if (planFulfillmentPercent >= 95.0) {
			status = "on_track";
			statusLabel = "В графике плана";
		} else if (planFulfillmentPercent >= 75.0) {
			status = "behind";
			statusLabel = "Незначительное отставание";
		} else {
			status = "critical";
			statusLabel = "Критическое отставание";
		}

		return {
			departmentKey: def.key,
			titleRu: def.titleRu,
			shortTitleRu: def.shortTitleRu,
			planRevenueKopecks: planKop,
			factRevenueKopecks: factKop,
			planRevenueRub: Math.round(planKop / 100),
			factRevenueRub: Math.round(factKop / 100),
			planRevenueFormatted: formatKopecksRu(planKop),
			factRevenueFormatted: formatKopecksRu(factKop),
			planFulfillmentPercent,
			shareOfTotalRevenuePercent,
			averageCheckKopecks,
			averageCheckRub: Math.round(averageCheckKopecks / 100),
			averageCheckFormatted: formatKopecksRu(averageCheckKopecks),
			completedVisitsCount: visits,
			uniquePatientsCount: patients,
			status,
			statusLabel,
			accentColor: def.accentColor,
		};
	});
}
