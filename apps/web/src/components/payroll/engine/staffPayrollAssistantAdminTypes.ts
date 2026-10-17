import type {
	AssistantCategoryId,
	AssistantRatesConfig,
} from "./staffPayrollRoleTypes";

export * from "./consolidatedPayrollTypes";

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
