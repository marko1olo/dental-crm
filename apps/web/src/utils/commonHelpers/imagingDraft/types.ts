import type {
	AiJobKind,
	AiRecognitionTarget,
	Dashboard,
	DicomViewerWorkbenchManifestResponse,
	DocumentIngestionTarget,
	ImagingSourceKind,
	ImagingStudyKind,
	ImportSourceKind,
	InstallmentPaymentStatus,
	PaymentMethod,
	PricelistSourceKind,
	ProcedureSpecificConsentProcedure,
	SmartImportMode,
	TreatmentPlanAcceptanceVariant,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
} from "@dental/shared";
import type { MprProjection } from "../../../imagingUiLabels";
import type {
	ClinicProfileDraft,
	PatientAdministrativeProfileDraft,
	StaffScheduleDraft,
} from "../../clinicProfileUtils";

export type CbctWorkbenchPlane = {
	key: MprProjection;
	title: string;
	detail: string;
};

export type PersistenceHealth = {
	enabled: boolean;
	filePath: string;
	exists: boolean;
	version: number | null;
	savedAt: string | null;
	checksum: string | null;
	backupDirectoryPath: string;
	backupCount: number;
	latestBackupAt: string | null;
	latestBackupSizeBytes: number | null;
	maxBackupCount: number;
};

export type PersistenceBackupCheck = {
	fileName: string;
	savedAt: string;
	sizeBytes: number;
	fileHash: string | null;
	checksumVerified: boolean | null;
	readable: boolean;
	warning: string | null;
};

export type PersistenceIntegrityReport = {
	ok: boolean;
	checkedAt: string;
	stateFileHash: string | null;
	checksumVerified: boolean | null;
	stateCounts: Record<string, number>;
	backups: PersistenceBackupCheck[];
	warnings: string[];
	nextAction: string;
};

export type ClinicProfileSaveState = "idle" | "saving" | "saved" | "error";

export type StaffScheduleSaveState = "idle" | "saving" | "saved" | "error";

export type PaymentRefundCorrectionAction =
	| "full_refund"
	| "partial_refund"
	| "payment_transfer"
	| "receipt_correction"
	| "payer_details_correction";

export type PaymentRefundCorrectionMethod =
	| "cash"
	| "card"
	| "bank_transfer"
	| "internal_offset"
	| "no_money_movement";

export type PricelistImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export type {
	AiJobKind,
	AiRecognitionTarget,
	ClinicProfileDraft,
	Dashboard,
	DicomViewerWorkbenchManifestResponse,
	DocumentIngestionTarget,
	ImagingSourceKind,
	ImagingStudyKind,
	ImportSourceKind,
	InstallmentPaymentStatus,
	PatientAdministrativeProfileDraft,
	PaymentMethod,
	PricelistSourceKind,
	ProcedureSpecificConsentProcedure,
	SmartImportMode,
	StaffScheduleDraft,
	TreatmentPlanAcceptanceVariant,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
};
