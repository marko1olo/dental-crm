import type { Kopecks } from "@dental/shared";
import type { BankInstallmentProviderId } from "../bankInstallmentEngine";

export interface BankInstallmentQrModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly stageTitle?: string;
	readonly stageNumber?: number;
	readonly stageAmountKopecks: Kopecks;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly patientPhone?: string;
	readonly clinicName?: string;
	readonly clinicInn?: string;
	readonly planId?: string;
	readonly onInstallmentApproved?: (approval: {
		readonly providerId: BankInstallmentProviderId;
		readonly approvalId: string;
		readonly approvedAmountKopecks: Kopecks;
		readonly monthlyPaymentRub: number;
	}) => void;
}
