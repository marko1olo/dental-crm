export interface LabOrderCostBreakdown {
	suggestedPriceRub: number;
	estimatedCostRub: number;
	grossMarginRub: number;
	grossMarginPercent: number;
	unitsCount: number;
	suggestedPriceKopecks?: number;
	estimatedCostKopecks?: number;
	grossMarginKopecks?: number;
	abutmentsCount?: number;
	ponticsCount?: number;
	abutmentsCostKopecks?: number;
	ponticsCostKopecks?: number;
	abutmentsPriceKopecks?: number;
	ponticsPriceKopecks?: number;
}

export interface LabOrderTurnaroundResult {
	turnaroundBusinessDays: number;
	dueDate: Date;
	isUrgent: boolean;
}

export interface LabOrderFittingSchedule {
	productionDueDate: Date;
	clinicDeliveryDate: Date;
	suggestedFittingDate: Date;
}
