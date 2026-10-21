import type { PriceLockResolutionPolicy } from "../planPriceValidationPresets";

export interface WorkOrderExportItem {
	readonly itemId: string;
	readonly toothNumber?: number | undefined;
	readonly code804n: string;
	readonly serviceTitle: string;
	readonly category: string;
	readonly quantity: number;
	readonly appliedUnitPriceRub: number;
	readonly appliedDiscountRub: number;
	readonly lineTotalRub: number;
	readonly resolutionPolicyApplied: PriceLockResolutionPolicy;
	readonly isPriceLockedFromPlan: boolean;
}

export interface WorkOrderValidatedExport {
	readonly orderNumber: string;
	readonly orderType: "work_order" | "completed_works_act";
	readonly planId: string;
	readonly planNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly validatedAtIso: string;
	readonly presetUsed: string;
	readonly items: readonly WorkOrderExportItem[];
	readonly totalPayableRub: number;
	readonly totalDiscountRub: number;
	readonly clinicAbsorptionGuaranteeRub: number;
	readonly isApprovedByManager: boolean;
	readonly managerNotes?: string | undefined;
}
