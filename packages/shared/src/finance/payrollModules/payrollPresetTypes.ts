/**
 * packages/shared/src/finance/payrollModules/payrollPresetTypes.ts
 * Preset, tax and assistant rule types for doctor and staff payroll.
 * Mandate 8b: <= 120 lines.
 */

export interface NdflTaxCalculationResult {
	readonly ndflTaxKop: number;
	readonly ndfl13TaxKop: number;
	readonly ndfl15TaxKop: number;
	readonly effectiveRatePercent: number;
	readonly isProgressiveApplied: boolean;
}

export interface DoctorSpecialtyCommissionRule {
	readonly specialtyId: string;
	readonly titleRu: string;
	readonly defaultPercentage: number;
	readonly retailProductsPercentage: number;
	readonly deductsLabCosts: boolean;
	readonly deductsMaterialCosts: boolean;
	readonly minGuaranteeMonthlyKop: number;
	readonly descriptionRu: string;
}

export interface AssistantShiftRateRule {
	readonly baseShiftRateKop: number;
	readonly radiographBonusKop: number;
	readonly surgeryAssistanceBonusKop: number;
	readonly overtimeHourlyRateKop: number;
}

export interface KpiBonusTier {
	readonly minRevenueKop: number;
	readonly bonusPercentage: number;
	readonly badgeLabelRu: string;
}

export interface AssistantShiftLogItem {
	readonly id: string;
	readonly dateIso: string;
	readonly shiftType: "standard_6h" | "full_12h" | "overtime_custom";
	readonly hoursWorked: number;
	readonly radiographsTakenCount?: number | undefined;
	readonly surgeriesAssistedCount?: number | undefined;
}

export interface AssistantPayrollResult {
	readonly assistantId: string;
	readonly assistantName: string;
	readonly periodLabelRu: string;
	readonly totalShifts: number;
	readonly totalRadiographs: number;
	readonly totalSurgeries: number;
	readonly baseShiftPayoutKop: number;
	readonly radiographPayoutKop: number;
	readonly surgeryPayoutKop: number;
	readonly totalGrossPayoutKop: number;
	readonly ndfl13TaxKop: number;
	readonly netPayoutToAssistantKop: number;
}
