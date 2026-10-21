import type {
	CashierInvoiceExportData,
	ToothData,
	TreatmentPlanStatus,
} from "../types.js";

export type TreatmentPlanViewTab = "3tier" | "stages" | "phased4" | "roadmap";

export type TreatmentPlanSpecialtyFilter =
	| "all"
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "orthodontics"
	| "periodontics";

export interface UseTreatmentPlanLogicProps {
	readonly patientId: string;
	readonly patientName?: string;
	readonly teethData: readonly ToothData[];
	readonly onExportToCashier?: (data: CashierInvoiceExportData) => void;
	readonly onPlanSaved?: (planId: string) => void;
	readonly planCreatedAtIso?: string;
	readonly initialStatus?: TreatmentPlanStatus;
	readonly onStatusChange?: (status: TreatmentPlanStatus) => void;
	readonly initialPlanId?: string | null;
	readonly initialViewTab?: TreatmentPlanViewTab;
}

export interface PatientFinancialContextSummary {
	readonly patient: any;
	readonly patientBalanceRub: number;
	readonly patientPhone: string;
	readonly patientBirthDate: string | undefined;
}

export interface StageCompletionProgressSummary {
	readonly totalStages: number;
	readonly completedStages: number;
	readonly inProgressStages: number;
	readonly completionPercent: number;
}
