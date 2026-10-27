/**
 * packages/shared/src/analytics/executiveModules/executiveSummaryTypes.ts
 * Executive KPI summary interfaces and calculation parameters.
 * Mandate 8b: <= 120 lines.
 */

import type { ExecutivePaymentBreakdown, ExecutivePeriod } from "./executiveKpiTypes.js";

export type ExecutiveKpisSummary = ExecutiveKpis;

export interface ExecutiveKpis {
	readonly period: ExecutivePeriod;
	readonly periodLabelRu: string;
	readonly totalRevenueKopecks: number;
	readonly totalRevenueRub: number;
	readonly totalRevenueFormatted: string;
	readonly totalRevenuePlanKopecks: number;
	readonly totalRevenuePlanRub: number;
	readonly totalRevenuePlanFormatted: string;
	readonly overallPlanFulfillmentPercent: number;
	readonly netProfitKopecks?: number;
	readonly netProfitRub?: number;
	readonly netProfitFormatted?: string;
	readonly netMarginPercent?: number;
	readonly cogsKopecks?: number;
	readonly cogsFormatted?: string;
	readonly opexKopecks?: number;
	readonly opexFormatted?: string;
	readonly doctorPayrollKopecks?: number;
	readonly doctorPayrollRub?: number;
	readonly doctorPayrollFormatted?: string;
	readonly doctorNetIncomeKopecks?: number;
	readonly doctorNetIncomeRub?: number;
	readonly doctorNetIncomeFormatted?: string;
	readonly materialsCostKopecks?: number;
	readonly materialsCostRub?: number;
	readonly materialsCostFormatted?: string;
	readonly labCostKopecks?: number;
	readonly labCostRub?: number;
	readonly labCostFormatted?: string;
	readonly totalPatientsCount: number;
	readonly primaryPatientsCount: number;
	readonly repeatPatientsCount: number;
	readonly primaryPatientsPercent: number;
	readonly averageCheckKopecks: number;
	readonly averageCheckRub: number;
	readonly averageCheckFormatted: string;
	readonly primaryAverageCheckKopecks: number;
	readonly primaryAverageCheckFormatted: string;
	readonly repeatAverageCheckKopecks: number;
	readonly repeatAverageCheckFormatted: string;
	readonly patientLtvKopecks: number;
	readonly patientLtvFormatted: string;
	readonly cacKopecks: number;
	readonly cacFormatted: string;
	readonly ltvToCacRatio: number;
	readonly totalMarketingSpendKopecks: number;
	readonly totalMarketingSpendFormatted: string;
	readonly chairOccupancyRatePercent: number;
	readonly totalOccupiedMinutes: number;
	readonly totalAvailableMinutes: number;
	readonly totalChairsCount: number;
	readonly leadToSanitationConversionPercent: number;
	readonly aiDiagnosticRatePercent: number;
	readonly cancelledVisitsCount: number;
	readonly noShowVisitsCount: number;
	readonly cancellationRatePercent: number;
	readonly totalCompletedVisits: number;
	readonly activeDoctorsCount: number;
	readonly totalLeadsCount: number;
	readonly totalSanitationCount: number;
	readonly paymentBreakdown?: ExecutivePaymentBreakdown | undefined;
}

export interface CalculateExecutiveKpisParams {
	readonly period: ExecutivePeriod;
	readonly totalRevenueKopecks: number;
	readonly totalRevenuePlanKopecks: number;
	readonly primaryRevenueKopecks: number;
	readonly repeatRevenueKopecks: number;
	readonly primaryPatientsCount: number;
	readonly repeatPatientsCount: number;
	readonly totalMarketingSpendKopecks: number;
	readonly historicalCohortLtvKopecks: number;
	readonly totalOccupiedMinutes: number;
	readonly totalAvailableMinutes: number;
	readonly totalChairsCount: number;
	readonly totalLeadsCount: number;
	readonly aiExaminedLeadsCount: number;
	readonly totalSanitationCount: number;
	readonly totalCompletedVisits: number;
	readonly activeDoctorsCount: number;
	readonly cancelledVisitsCount?: number;
	readonly noShowVisitsCount?: number;
	readonly netProfitKopecks?: number;
	readonly cogsKopecks?: number;
	readonly opexKopecks?: number;
	readonly netMarginPercent?: number;
	readonly paymentBreakdown?: ExecutivePaymentBreakdown;
	readonly doctorPayrollKopecks?: number;
	readonly doctorNetIncomeKopecks?: number;
	readonly materialsCostKopecks?: number;
	readonly labCostKopecks?: number;
}
