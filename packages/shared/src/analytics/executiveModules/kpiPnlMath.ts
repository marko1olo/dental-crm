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
	readonly hasActualMaterialsCost?: boolean;
	readonly hasActualLabCost?: boolean;
	readonly hasActualDoctorPayroll?: boolean;
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

	// Mandates 8ap, 8z, 8f: Zero synthetic percentage guesses (no fake 35% materials, 25% lab, 28% payroll).
	// If actual accounting figures are not provided, return exact 0 kopecks without fabricating clinic expenses.
	const hasActualMaterialsCost = params.materialsCostKopecks !== undefined;
	const materialsKop = hasActualMaterialsCost && typeof params.materialsCostKopecks === "number"
		? Math.max(0, Math.round(params.materialsCostKopecks))
		: 0;

	const hasActualLabCost = params.labCostKopecks !== undefined;
	const labKop = hasActualLabCost && typeof params.labCostKopecks === "number"
		? Math.max(0, Math.round(params.labCostKopecks))
		: 0;

	const hasActualDoctorPayroll = params.doctorPayrollKopecks !== undefined;
	const docPayrollKop = hasActualDoctorPayroll && typeof params.doctorPayrollKopecks === "number"
		? Math.max(0, Math.round(params.doctorPayrollKopecks))
		: 0;

	const docNetIncomeKop = params.doctorNetIncomeKopecks !== undefined && typeof params.doctorNetIncomeKopecks === "number"
		? Math.max(0, Math.round(params.doctorNetIncomeKopecks))
		: Math.max(0, docPayrollKop);

	return {
		cogsKop, opexKop, netProfitKop, netProfitRub, netMarginPercent,
		materialsKop, labKop, docPayrollKop, docNetIncomeKop,
		hasActualMaterialsCost, hasActualLabCost, hasActualDoctorPayroll,
	};
}
