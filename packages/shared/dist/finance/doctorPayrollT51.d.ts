/**
 * DENTE Dental CRM — Statutory Doctor & Staff Piece-Rate Payroll Engine (Form T-51)
 * Kopeck-Exact Math, Lab & Material Deductions, KPI Tier Bonuses, Personal Income Tax (НДФЛ 13%)
 */
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
export declare const DOCTOR_SPECIALTY_PAYROLL_PRESETS: readonly DoctorSpecialtyCommissionRule[];
export declare const ASSISTANT_SHIFT_RULE: AssistantShiftRateRule;
export declare const KPI_BONUS_TIERS: readonly KpiBonusTier[];
export interface DoctorCompletedServiceItem {
    readonly id: string;
    readonly dateIso: string;
    readonly patientName: string;
    readonly medicalCardNumber: string;
    readonly serviceNameRu: string;
    readonly category: "therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene";
    readonly grossRevenueKop: number;
    readonly labCostKop: number;
    readonly materialCostKop: number;
    readonly customCommissionPercent?: number | undefined;
}
export interface DoctorPayrollCalculationInput {
    readonly doctorId: string;
    readonly doctorName: string;
    readonly specialtyId: string;
    readonly periodStartIso: string;
    readonly periodEndIso: string;
    readonly services: readonly DoctorCompletedServiceItem[];
    readonly customBasePercentage?: number | undefined;
    readonly manualAdjustmentKop?: number | undefined;
    readonly manualAdjustmentNoteRu?: string | undefined;
}
export interface DoctorPayrollResult {
    readonly doctorId: string;
    readonly doctorName: string;
    readonly specialtyTitleRu: string;
    readonly periodLabelRu: string;
    readonly totalGrossRevenueKop: number;
    readonly totalLabDeductionsKop: number;
    readonly totalMaterialDeductionsKop: number;
    readonly totalNetBaseKop: number;
    readonly baseCommissionPercent: number;
    readonly earnedBaseCommissionKop: number;
    readonly kpiBonusPercent: number;
    readonly kpiBonusEarnedKop: number;
    readonly kpiTierBadgeRu: string;
    readonly earnedRetailCommissionKop: number;
    readonly grossPayoutBeforeTaxKop: number;
    readonly ndfl13TaxKop: number;
    readonly netPayoutToDoctorKop: number;
    readonly minimumGuaranteeApplied: boolean;
    readonly manualAdjustmentKop: number;
    readonly serviceCount: number;
}
export interface AssistantShiftLogItem {
    readonly id: string;
    readonly dateIso: string;
    readonly shiftType: "standard_6h" | "full_12h" | "overtime_custom";
    readonly hoursWorked: number;
    readonly radiographsTakenCount: number;
    readonly surgeriesAssistedCount: number;
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
/**
 * Calculates kopeck-exact doctor piece-rate payroll with lab/material deductions and KPI tiers
 */
export declare function calculateDoctorPeriodPayroll(input: DoctorPayrollCalculationInput): DoctorPayrollResult;
/**
 * Calculates assistant shift pay + piece rate bonuses
 */
export declare function calculateAssistantPeriodPayroll(assistantId: string, assistantName: string, periodLabel: string, shifts: readonly AssistantShiftLogItem[], rules?: AssistantShiftRateRule): AssistantPayrollResult;
/**
 * Generates Russian Form T-51 compatible payroll summary CSV string with UTF-8 BOM
 */
export declare function generatePayrollT51Csv(results: readonly DoctorPayrollResult[]): string;
