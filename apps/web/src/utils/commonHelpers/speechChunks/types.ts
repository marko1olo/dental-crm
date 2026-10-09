import type {
	AiJobKind,
	AiRecognitionTarget,
	Dashboard,
	DocumentIngestionTarget,
	ImagingSourceKind,
	ImagingStudyKind,
	ImportSourceKind,
	InstallmentPaymentStatus,
	PaymentMethod,
	PricelistSourceKind,
	ProcedureSpecificConsentProcedure,
	SmartImportMode,
	SpeechChunkUploadInput,
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

export type {
	AiJobKind,
	AiRecognitionTarget,
	ClinicProfileDraft,
	Dashboard,
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
	SpeechChunkUploadInput,
	StaffScheduleDraft,
	TreatmentPlanAcceptanceVariant,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
};

/**
 * Аудиочанк речевого ввода врача для потоковой транскрибации.
 */
export interface SpeechChunk {
	id: string;
	index: number;
	audioBase64: string;
	mimeType: string;
	durationMs: number;
	sampleRate: number;
	isFinal: boolean;
	rmsDb?: number;
	detectedSpeech?: boolean;
	timestamp: number;
}

/**
 * Состояние активности детектора голоса (VAD).
 */
export type SpeechVadState = "idle" | "listening" | "speaking" | "silence" | "paused";

/**
 * Событие паузы / окончания сегмента речи от VAD.
 */
export interface SpeechVadPauseEvent {
	type: "silence_pause";
	timestamp: number;
	silenceDurationMs: number;
	speechDurationMs: number;
	samplesCount: number;
	sampleRate: number;
}

/**
 * Конфигурация порогов детектора голоса VAD.
 */
export interface SpeechVadConfig {
	speechThresholdDb?: number; // default: -45 dB
	silenceThresholdDb?: number; // default: -50 dB
	silenceTimeoutMs?: number; // default: 1500 ms (пауза между фразами врача)
	minSpeechDurationMs?: number; // default: 250 ms
	maxSpeechDurationMs?: number; // default: 30000 ms (квант 30 сек)
	sampleRate?: number; // default: 16000 Hz
	autoResetOnSilence?: boolean; // default: true
}

/**
 * Настройки квантования и нарезки аудиопотока.
 */
export interface SpeechQuantizationConfig {
	targetSampleRate: number; // 16000 Hz
	chunkDurationMs: number; // Рекомендуемый размер чанка (например 5000-8000 ms)
	maxChunkDurationMs: number; // Жесткий предел длины чанка (например 25000 ms)
	vadPauseCutoffMs: number; // Длина паузы тишины для отсечки чанка (1500 ms)
	channels: number; // 1 (mono)
}

/**
 * Результат обработки чанка стриминговым конвейером.
 */
export interface SpeechPipelineChunkResult {
	chunk: SpeechChunkUploadInput;
	durationMs: number;
	samplesCount: number;
	isFinal: boolean;
	rmsDb: number;
}

/**
 * Элемент офлайн-очереди аудиофрагментов.
 */
export type PendingSpeechChunk = SpeechChunkUploadInput & {
	version: 1;
	id: string;
	organizationId: string | null;
	queuedAt: string;
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
