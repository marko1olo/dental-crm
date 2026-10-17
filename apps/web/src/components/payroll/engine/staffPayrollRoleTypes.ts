import type {
	DoctorCompletedServiceItem,
	DoctorSpecialtyCommissionRule,
} from "@dental/shared/payroll";

export type StaffRole = "doctor" | "assistant" | "administrator";

export type DoctorSpecialtyId =
	| "therapist"
	| "orthopedist"
	| "surgeon_implantologist"
	| "surgeon"
	| "orthodontist"
	| "hygienist"
	| "pediatric"
	| "pediatric_dentist"
	| "general_dentist"
	| "periodontist"
	| "solo_practitioner"
	| "solo-doctor";

export type AssistantCategoryId = "none" | "second" | "first" | "highest";

export type DoctorSpecialtyConfig = DoctorSpecialtyCommissionRule;

export interface SoloDoctorSpecialtyPreset {
	readonly specialtyId: string;
	readonly titleRu: string;
	readonly labelRu: string;
}

export interface AssistantRatesConfig {
	readonly baseShiftRate6hKop: number;
	readonly baseShiftRate12hKop: number;
	readonly hourlyOvertimeRateKop: number;
	readonly hourlyNightRateKop: number;
	readonly categoryBonusPercentMap: Record<AssistantCategoryId, number>;
	readonly sterilizationShiftBonusKop: number;
	readonly radiographBonusKop: number;
	readonly surgeryAssistanceBonusKop: number;
}

export interface AdministratorRatesConfig {
	readonly baseSalaryMonthlyKop: number;
	readonly baseShiftRateKop: number;
	readonly cashRevenueCommissionPercent: number;
	readonly leadConversionThresholdPercent: number;
	readonly leadConversionBonusKop: number;
}

export type StaffDoctorCompletedServiceItem = DoctorCompletedServiceItem;

export interface DoctorStaffPayrollInput {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly specialtyId: string;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly services: readonly DoctorCompletedServiceItem[];
	readonly comprehensivePlansCount?: number | undefined;
	readonly comprehensivePlanBonusPerUnitKop?: number | undefined;
	readonly customBasePercentage?: number | undefined;
	readonly categoryRates?: Partial<Record<"therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric", number>> | undefined;
	readonly useClinicalCategoryRates?: boolean | undefined;
	readonly manualAdjustmentKop?: number | undefined;
	readonly manualAdjustmentNoteRu?: string | undefined;
	readonly daysWorked?: number | undefined;
	readonly hoursWorked?: number | undefined;
}

export interface DoctorStaffPayrollResult {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly role: "doctor";
	readonly specialtyId: string;
	readonly positionRu: string;
	readonly departmentRu: string;
	readonly periodLabelRu: string;
	readonly daysWorked: number;
	readonly hoursWorked: number;
	readonly totalGrossRevenueKop: number;
	readonly totalLabDeductionsKop: number;
	readonly totalMaterialDeductionsKop: number;
	readonly totalNetBaseKop: number;
	readonly baseCommissionPercent: number;
	readonly earnedBaseCommissionKop: number;
	readonly earnedRetailCommissionKop: number;
	readonly comprehensivePlansCount: number;
	readonly comprehensivePlanBonusKop: number;
	readonly revenueKpiPercent: number;
	readonly revenueKpiBonusKop: number;
	readonly kpiBadgeLabelRu: string;
	readonly minimumGuaranteeKop: number;
	readonly minimumGuaranteeApplied: boolean;
	readonly guaranteeTopUpKop: number;
	readonly manualAdjustmentKop: number;
	readonly manualAdjustmentNoteRu: string;
	readonly grossPayoutBeforeTaxKop: number;
	readonly servicesCount: number;
}
