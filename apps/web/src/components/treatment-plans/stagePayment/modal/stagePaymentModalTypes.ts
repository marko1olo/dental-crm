import type { Kopecks } from "@dental/shared";
import type {
	MilestoneStage,
	PatientDepositWallet,
	StageFiscalReceipt54Fz,
	StagePaymentTotals,
	TerminationExpenseItem,
	TerminationRefundCalculation,
} from "../stagePaymentEngine.js";
import type { StagePaymentStatus } from "../stagePaymentPresets.js";

export type StagePaymentModalTab =
	| "schedule"
	| "escrow"
	| "act"
	| "termination"
	| "fiscal54fz"
	| "contract_addendum";

export interface StagePaymentPlanModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly planTitle?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly initialStages?: readonly MilestoneStage[] | undefined;
	readonly initialDepositKopecks?: Kopecks | undefined;
	readonly initialTab?: StagePaymentModalTab | undefined;
	readonly onSaveStages?: ((stages: readonly MilestoneStage[]) => void) | undefined;
}

export interface StagePaymentModalBodyProps {
	readonly activeTab: StagePaymentModalTab;
	readonly stages: MilestoneStage[];
	readonly totals: StagePaymentTotals;
	readonly activeStageMenuId: string | null;
	readonly onToggleStageMenu: (id: string | null) => void;
	readonly onPayAdvance: (stageId: string) => void;
	readonly onStageStatusChange: (stageId: string, newStatus: StagePaymentStatus) => void;
	readonly onOpenActTab: (id: string) => void;
	readonly onOpenInstallmentModal: (stg: MilestoneStage) => void;
	readonly onOpenFiscalTab: (id: string) => void;
	readonly depositWallet: PatientDepositWallet;
	readonly topUpAmountRub: string;
	readonly onTopUpAmountChange: (val: string) => void;
	readonly onTopUpDeposit: () => void;
	readonly onAutoAllocateDeposit: () => void;
	readonly selectedStageForActId: string;
	readonly onSelectStageForAct: (id: string) => void;
	readonly actNumberInput: string;
	readonly onActNumberChange: (val: string) => void;
	readonly actSignDate: string;
	readonly onActSignDateChange: (val: string) => void;
	readonly doctorFullName: string;
	readonly onSignStageAct: () => void;
	readonly terminationCalc: TerminationRefundCalculation;
	readonly newExpenseTitle: string;
	readonly onNewExpenseTitleChange: (val: string) => void;
	readonly newExpenseRub: string;
	readonly onNewExpenseRubChange: (val: string) => void;
	readonly newExpenseCategory: TerminationExpenseItem["category"];
	readonly onNewExpenseCategoryChange: (cat: TerminationExpenseItem["category"]) => void;
	readonly onAddCustomExpense: () => void;
	readonly selectedStageForFiscalId: string;
	readonly onSelectStageForFiscal: (id: string) => void;
	readonly fiscalPaymentType: "advance" | "completion" | "full";
	readonly onFiscalPaymentTypeChange: (val: "advance" | "completion" | "full") => void;
	readonly fiscalPaymentMethod: "CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR";
	readonly onFiscalPaymentMethodChange: (val: "CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR") => void;
	readonly onGenerateFiscalReceipt: () => void;
	readonly activeFiscalReceipt: StageFiscalReceipt54Fz | null;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly patientName: string;
	readonly patientId: string;
	readonly planTitle: string;
}
