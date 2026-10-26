/**
 * transferProcessTypes.ts — Типы процесса и валидации трансфера медкарты.
 * Лимит <= 120 строк по Мандату 8b.
 */

import type {
	CentralizedLabOrderSyncItem,
	DepositTransferVoucher,
	PatientClinicalSnapshot,
	PatientDemographicsSnapshot,
	PatientSignatureType,
	SomaticAnamnesisSnapshot,
	TreatmentPlanSnapshot,
	VisitDiaryEntrySnapshot,
} from "./transferSnapshotTypes.js";

export interface SelectedTransferComponents {
	readonly demographics: boolean;
	readonly somaticAnamnesis: boolean;
	readonly odontogram043u: boolean;
	readonly visitDiaries: boolean;
	readonly treatmentPlans: boolean;
	readonly imagingArchive: boolean;
	readonly depositBalance: boolean;
	readonly activeLabOrders: boolean;
	readonly medicalHistory?: boolean | undefined;
	readonly odontogramAndPerio?: boolean | undefined;
	readonly financialDeposit?: boolean | undefined;
}

export interface TransferVerificationQrMatrixResult {
	readonly matrix: boolean[][];
	readonly size: number;
	readonly version: number;
	readonly payload: string;
}

export interface PatientTransferDraft {
	readonly patientId: string;
	readonly patientFullName: string;
	readonly sourceBranchId: string;
	readonly targetBranchId: string;
	readonly transferReasonRu: string;
	readonly operatorStaffName: string;
	readonly operatorStaffPosition: string;
	readonly signatureType: PatientSignatureType;
	readonly is152FzConsentGiven: boolean;
	readonly selectedComponents: SelectedTransferComponents;
	readonly customNotes?: string | undefined;
}

export interface TransferValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}

export interface ExecuteTransferInput {
	readonly draft: PatientTransferDraft;
	readonly demographics: PatientDemographicsSnapshot;
	readonly somaticAnamnesis?: Partial<SomaticAnamnesisSnapshot> | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: teeth map
	readonly odontogramTeeth?: Record<number, any> | undefined;
	readonly visitDiaries?: readonly VisitDiaryEntrySnapshot[] | undefined;
	readonly treatmentPlans?: readonly TreatmentPlanSnapshot[] | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: studies list
	readonly imagingStudies?: readonly any[] | undefined;
	readonly balanceRub?: number | undefined;
	readonly balanceKopecks?: number | undefined;
	readonly familyGroupId?: string | null | undefined;
	readonly labOrders?: readonly CentralizedLabOrderSyncItem[] | undefined;
}

export interface ExecuteTransferResult {
	readonly success: boolean;
	readonly snapshot: PatientClinicalSnapshot;
	readonly voucher?: DepositTransferVoucher | undefined;
	readonly qrDataUri: string;
	readonly transferActHtml: string;
	readonly csvSummary: string;
	readonly errorReason?: string | undefined;
}
