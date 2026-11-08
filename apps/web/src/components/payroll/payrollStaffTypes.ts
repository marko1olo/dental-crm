/**
 * payrollStaffTypes.ts — Multi-Role Staff Payroll Contract Types (SSOT)
 * Mandate 8b: File strictly <= 200 lines. Mandate 8x & 8ap: Clean domain names.
 */

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
}

export interface AssistantShiftItem {
	readonly id: string;
	readonly dateIso: string;
	readonly shiftType: "standard_6h" | "full_12h" | "overtime_custom";
	readonly hoursWorked: number;
	readonly isSterilizationShift?: boolean | undefined;
	readonly radiographsTakenCount?: number | undefined;
	readonly surgeriesAssistedCount?: number | undefined;
}

export type AssistantShiftLogItem = AssistantShiftItem;

export interface AssistantStaffPayrollInput {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly category: AssistantCategoryId;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly shifts: readonly AssistantShiftItem[];
	readonly ratesConfig?: AssistantRatesConfig | undefined;
	readonly manualAdjustmentKop?: number | undefined;
	readonly manualAdjustmentNoteRu?: string | undefined;
}

export interface AssistantStaffPayrollResult {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly role: "assistant";
	readonly positionRu: string;
	readonly departmentRu: string;
	readonly periodLabelRu: string;
	readonly category: AssistantCategoryId;
	readonly categoryBonusPercent: number;
	readonly totalShiftsCount: number;
	readonly totalHoursWorked: number;
	readonly baseShiftsPayoutKop: number;
	readonly categoryBonusKop: number;
	readonly sterilizationShiftsCount: number;
	readonly sterilizationBonusKop: number;
	readonly totalRadiographsCount: number;
	readonly radiographsPayoutKop: number;
	readonly totalSurgeriesCount: number;
	readonly surgeriesPayoutKop: number;
	readonly manualAdjustmentKop: number;
	readonly manualAdjustmentNoteRu: string;
	readonly grossPayoutBeforeTaxKop: number;
}

export interface AdministratorStaffPayrollInput {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly shiftsWorked: number;
	readonly hoursWorked?: number | undefined;
	readonly clinicCashRevenueKop: number;
	readonly primaryLeadsCount: number;
	readonly convertedLeadsCount: number;
	readonly ratesConfig?: AdministratorRatesConfig | undefined;
	readonly manualAdjustmentKop?: number | undefined;
	readonly manualAdjustmentNoteRu?: string | undefined;
}

export interface AdministratorStaffPayrollResult {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly role: "administrator";
	readonly positionRu: string;
	readonly departmentRu: string;
	readonly periodLabelRu: string;
	readonly shiftsWorked: number;
	readonly hoursWorked: number;
	readonly baseSalaryPayoutKop: number;
	readonly clinicCashRevenueKop: number;
	readonly cashRevenueCommissionPercent: number;
	readonly cashRevenueCommissionKop: number;
	readonly primaryLeadsCount: number;
	readonly convertedLeadsCount: number;
	readonly conversionRatePercent: number;
	readonly conversionThresholdPercent: number;
	readonly leadConversionBonusKop: number;
	readonly manualAdjustmentKop: number;
	readonly manualAdjustmentNoteRu: string;
	readonly grossPayoutBeforeTaxKop: number;
}

export type StaffPayrollRecord =
	| DoctorStaffPayrollResult
	| AssistantStaffPayrollResult
	| AdministratorStaffPayrollResult;

export interface RoleSummary {
	readonly role: StaffRole;
	readonly roleTitleRu: string;
	readonly employeesCount: number;
	readonly grossRevenueKop: number;
	readonly grossPayoutKop: number;
}

export interface ConsolidatedStaffPayrollSummary {
	readonly clinicName: string;
	readonly organizationInn: string;
	readonly organizationKpp: string;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly periodLabelRu: string;
	readonly generatedAtIso: string;
	readonly records: readonly StaffPayrollRecord[];
	readonly totalEmployeesCount: number;
	readonly totalGrossRevenueKop: number;
	readonly totalLabDeductionsKop: number;
	readonly totalMaterialDeductionsKop: number;
	readonly totalNetBaseKop: number;
	readonly totalGrossPayoutKop: number;
	readonly roleSummaries: Record<StaffRole, RoleSummary>;
}

export interface ConsolidatedPayrollCalculationParams {
	readonly clinicName?: string | undefined;
	readonly organizationInn?: string | undefined;
	readonly organizationKpp?: string | undefined;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly doctors?: readonly DoctorStaffPayrollInput[] | undefined;
	readonly assistants?: readonly AssistantStaffPayrollInput[] | undefined;
	readonly administrators?: readonly AdministratorStaffPayrollInput[] | undefined;
}
