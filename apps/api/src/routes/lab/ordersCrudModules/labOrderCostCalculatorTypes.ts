export interface LabOrderCostBreakdown {
	suggestedPriceRub: number;
	estimatedCostRub: number;
	grossMarginRub: number;
	grossMarginPercent: number;
	unitsCount: number;
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
