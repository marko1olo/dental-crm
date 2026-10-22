import type { PatientGeneralInfo } from "../PatientGeneralInfoTab";

export interface DepositOperationRecord {
	readonly id: string;
	readonly date: string;
	readonly time: string;
	readonly type: "deposit" | "charge" | "family_share" | "refund";
	readonly typeLabelRu: string;
	readonly amountRub: number;
	readonly method: "card" | "cash" | "sbp" | "family";
	readonly methodLabelRu: string;
	readonly status: "completed" | "processing";
	readonly note: string;
}

export interface PatientFinanceTabProps {
	readonly patient?: PatientGeneralInfo | null | undefined;
	readonly onUpdateBalance?: ((newBalanceRub: number) => void) | undefined;
	readonly onNavigateToVisit?: ((visitId: string) => void) | undefined;
	readonly onNewAppointment?: ((patientId?: string) => void) | undefined;
	readonly onOpenTaxCertificate?: (() => void) | undefined;
	readonly disabled?: boolean | undefined;
}

export type OperationMode = "topup" | "charge";
export type TargetWallet = "personal" | "family";
export type PaymentMethod = "card" | "cash" | "sbp";
