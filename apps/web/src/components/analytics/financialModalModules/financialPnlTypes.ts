export interface ExecutiveDepartmentData {
	departmentKey: string;
	departmentNameRu?: string;
	titleRu?: string;
	shortTitleRu?: string;
	planRevenueKopecks: number;
	factRevenueKopecks: number;
	planFulfillmentPercent: number;
	completedVisitsCount: number;
	uniquePatientsCount: number;
	averageBillKopecks?: number;
	averageCheckKopecks?: number;
	averageCheckRub?: number;
	averageCheckFormatted?: string;
	revenueSharePercent?: number;
	shareOfTotalRevenuePercent?: number;
}

export interface ExecutiveKpisData {
	totalRevenueKopecks: number;
	totalRevenuePlanKopecks: number;
	primaryRevenueKopecks?: number;
	repeatRevenueKopecks?: number;
	totalMarketingSpendKopecks: number;
	cacKopecks: number | null;
	totalCompletedVisits: number;
	activeDoctorsCount: number;
	chairOccupancyRatePercent: number;
	cogsKopecks?: number;
	opexKopecks?: number;
	netProfitKopecks?: number;
	netMarginPercent?: number;
}

export interface ExpenseReasonRecord {
	id: string;
	code: number;
	name: string;
	category: string;
	description?: string;
}

export interface ComputedPnlMetrics {
	totalRevenueRub: number;
	estimatedCogsRub: number;
	grossProfitRub: number;
	marketingSpendRub: number;
	estimatedPayrollRub: number;
	totalOpexRub: number;
	estimatedOverheadRub: number;
	ebitdaRub: number;
	netProfitRub: number;
	netMarginPercent: number;
}
