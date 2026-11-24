import type { Kopecks } from "@dental/shared";

export interface LabOrderCostBreakdown {
	suggestedPriceRub: number;
	estimatedCostRub: number;
	grossMarginRub: number;
	grossMarginPercent: number;
	unitsCount: number;
	suggestedPriceKopecks?: Kopecks | undefined;
	estimatedCostKopecks?: Kopecks | undefined;
	grossMarginKopecks?: Kopecks | undefined;
	abutmentsCount?: number | undefined;
	ponticsCount?: number | undefined;
	abutmentsCostKopecks?: Kopecks | undefined;
	ponticsCostKopecks?: Kopecks | undefined;
	abutmentsPriceKopecks?: Kopecks | undefined;
	ponticsPriceKopecks?: Kopecks | undefined;
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
