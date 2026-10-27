/**
 * packages/shared/src/analytics/executiveModules/kpiPnlMath.ts
 * Computes P&L, COGS, OPEX, net margin, and doctor earnings breakdown.
 * Mandate 8b: <= 120 lines.
 */

import type { CalculateExecutiveKpisParams } from "./executiveSummaryTypes.js";

export interface KpiPnlAndDoctorIncome {
	readonly cogsKop: number;
	readonly opexKop: number;
	readonly netProfitKop: number;
	readonly netProfitRub: number;
	readonly netMarginPercent: number;
	readonly materialsKop: number;
	readonly labKop: number;
	readonly docPayrollKop: number;
	readonly docNetIncomeKop: number;
}

export function calculatePnlAndDoctorIncome(
	params: CalculateExecutiveKpisParams,
	revKop: number,
): KpiPnlAndDoctorIncome {
	const cogsKop = params.cogsKopecks !== undefined ? Math.max(0, Math.round(params.cogsKopecks)) : 0;
	const opexKop = params.opexKopecks !== undefined ? Math.max(0, Math.round(params.opexKopecks)) : 0;
	const netProfitKop = params.netProfitKopecks !== undefined
		? Math.round(params.netProfitKopecks)
		: Math.round(revKop - (cogsKop + opexKop));
	const netProfitRub = Math.round(netProfitKop / 100);
	const netMarginPercent = params.netMarginPercent !== undefined
		? params.netMarginPercent
		: (revKop > 0 ? Number(((netProfitKop / revKop) * 100).toFixed(1)) : 0.0);

	const materialsKop = params.materialsCostKopecks !== undefined
		? Math.max(0, Math.round(params.materialsCostKopecks))
		: Math.round(cogsKop * 0.35);
	const labKop = params.labCostKopecks !== undefined
		? Math.max(0, Math.round(params.labCostKopecks))
		: Math.round(cogsKop * 0.25);
	const docPayrollKop = params.doctorPayrollKopecks !== undefined
		? Math.max(0, Math.round(params.doctorPayrollKopecks))
		: Math.round(revKop * 0.28);
	const docNetIncomeKop = params.doctorNetIncomeKopecks !== undefined
		? Math.max(0, Math.round(params.doctorNetIncomeKopecks))
		: Math.max(0, docPayrollKop);

	return {
		cogsKop, opexKop, netProfitKop, netProfitRub, netMarginPercent,
		materialsKop, labKop, docPayrollKop, docNetIncomeKop,
	};
}
