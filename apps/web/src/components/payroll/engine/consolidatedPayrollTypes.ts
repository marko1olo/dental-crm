import type {
	StaffRole,
	DoctorStaffPayrollInput,
	DoctorStaffPayrollResult,
} from "./staffPayrollRoleTypes";
import type {
	AssistantStaffPayrollInput,
	AssistantStaffPayrollResult,
} from "./staffPayrollAssistantAdminTypes";

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
	readonly ratesConfig?: import("./staffPayrollRoleTypes").AdministratorRatesConfig | undefined;
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
