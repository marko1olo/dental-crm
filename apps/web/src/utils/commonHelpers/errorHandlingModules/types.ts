import type {
	AiJobKind,
	AiRecognitionTarget,
	Dashboard,
	DenteTelegramVisualCardKey,
	DenteTelegramVisualCardUrls,
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
import type {
	ClinicProfileDraft,
	PatientAdministrativeProfileDraft,
	StaffScheduleDraft,
} from "../../clinicProfileUtils";
import type { DenteTelegramPortalSection } from "../../TelegramHelpers";

export class WorkflowResponseError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "WorkflowResponseError";
		this.status = status;
	}
}

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

export interface ZodIssueDto {
	code: string;
	message: string;
	path?: (string | number)[];
	expected?: string;
	received?: string;
}

export interface ApiErrorDetail {
	field?: string;
	message: string;
	code?: string;
}

export interface ApiErrorResponse {
	statusCode?: number;
	error?: string;
	message?: string | ApiErrorDetail[];
	code?: string;
	details?: unknown;
	issues?: ZodIssueDto[];
}

export type ClinicalErrorCode =
	| "NETWORK_OFFLINE"
	| "SERVER_TIMEOUT"
	| "AUTH_UNAUTHORIZED"
	| "AUTH_FORBIDDEN"
	| "RESOURCE_NOT_FOUND"
	| "DATA_CONFLICT"
	| "VALIDATION_FAILED"
	| "RATE_LIMITED"
	| "INTERNAL_SERVER_ERROR"
	| "UNKNOWN_ERROR";

export type {
	AiJobKind,
	AiRecognitionTarget,
	Dashboard,
	DenteTelegramVisualCardKey,
	DenteTelegramVisualCardUrls,
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
	ClinicProfileDraft,
	PatientAdministrativeProfileDraft,
	StaffScheduleDraft,
	DenteTelegramPortalSection,
};
