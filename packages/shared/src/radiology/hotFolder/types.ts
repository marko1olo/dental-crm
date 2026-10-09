/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL HOT-FOLDER SYNC & RADIOLOGY INTAKE ENGINE
 * Layer 0: Core Types, Interfaces, DTOs and Validation Schemas
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { ParsedDicomDataset } from "../../imaging/dicomParser.js";

// ─── 1. ТИПЫ И ПЕРЕЧИСЛЕНИЯ ──────────────────────────────────────────────────

export type RadiologySoftwareVendor =
	| "ezdent_i" // Vatech EzDent-i
	| "romexis" // Planmeca Romexis
	| "sidexis" // Dentsply Sirona Sidexis
	| "cliniview" // Instrumentarium / KaVo CliniView
	| "vixwin" // Gendex VixWin
	| "handydental" // Handy Dental
	| "fona" // Fona OrisWin
	| "generic";

export type DentalStudyType =
	| "PERIAPICAL" // Прицельный снимок визиографа (RVG / intraoral)
	| "PANORAMIC" // ОПТГ / панорамный снимок
	| "CBCT" // КЛКТ-срез / 3D-томограмма
	| "BITEWING" // Интерпроксимальный / прикусной
	| "OCCLUSAL" // Окклюзионный снимок
	| "CEPHALOMETRIC" // ТРГ (телерентгенограмма)
	| "UNKNOWN";

export type HotFolderQuarantineReason =
	| "ZERO_BYTE_FILE"
	| "UNSUPPORTED_EXTENSION"
	| "CORRUPTED_DICOM_HEADER"
	| "DUPLICATE_INGESTION"
	| "IMAGE_DECODE_FAILED"
	| "INVALID_BUFFER_LENGTH";

export type VisitMatchStrategy =
	| "EXACT_BARCODE"
	| "EXACT_VISIT_ID"
	| "EXACT_PATIENT_CARD"
	| "EXACT_NAME_MATCH"
	| "FUZZY_NAME_AND_TOOTH_MATCH"
	| "FUZZY_NAME_MATCH"
	| "CABINET_TIME_WINDOW_FALLBACK"
	| "UNASSIGNED";

export interface ActiveVisitContext {
	readonly visitId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientCardNumber?: string | undefined;
	readonly visitBarcode?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly scheduledStartIso?: string | undefined;
	readonly scheduledEndIso?: string | undefined;
	readonly cabinetName?: string | undefined;
	readonly chairId?: string | undefined;
	readonly assignedToothList?: readonly number[] | undefined;
	readonly status?: "planned" | "in_treatment" | "arrived" | "completed" | undefined;
}

export interface ExtractedRadiologyMetadata {
	readonly patientId: string | null;
	readonly patientCardNumber: string | null;
	readonly patientLastName: string | null;
	readonly patientFirstName: string | null;
	readonly patientMiddleName: string | null;
	readonly patientFullName: string | null;
	readonly visitId: string | null;
	readonly visitBarcode: string | null;
	readonly toothFdiList: readonly number[];
	readonly studyType: DentalStudyType;
	readonly modalityCode: string;
	readonly acquisitionDate: string; // YYYYMMDD or ISO
	readonly acquisitionTime: string | null; // HHmmss
	readonly isControlStudy: boolean;
	readonly vendorSoftwareHint: RadiologySoftwareVendor;
	readonly dicomStudyUid?: string | undefined;
	readonly dicomSeriesUid?: string | undefined;
	readonly dicomSopInstanceUid?: string | undefined;
	readonly windowCenter?: number | undefined;
	readonly windowWidth?: number | undefined;
	readonly rows?: number | undefined;
	readonly columns?: number | undefined;
	readonly bitsAllocated?: number | undefined;
}

/** Алиас для совместимости с интерфейсами хранилища и радиодиагностики */
export type RadiologyStudyMetadata = ExtractedRadiologyMetadata;

export interface StudyVisitMatchResult {
	readonly isMatched: boolean;
	readonly matchedVisit: ActiveVisitContext | null;
	readonly confidenceScore: number; // 0.0 to 1.0
	readonly matchStrategy: VisitMatchStrategy;
	readonly matchDetails: string;
	readonly candidateCount: number;
}

export interface NormalizedImageBuffer {
	readonly width: number;
	readonly height: number;
	readonly bitDepth: 8 | 16;
	readonly grayscale8Bit: Uint8Array;
	readonly rgba32Bit: Uint8ClampedArray;
	readonly appliedWindowCenter: number;
	readonly appliedWindowWidth: number;
	readonly appliedBrightness: number;
	readonly appliedContrast: number;
	readonly appliedInvert: boolean;
	readonly appliedGamma: number;
}

export interface IngestedHotFolderStudy {
	readonly id: string;
	readonly sourceFileName: string;
	readonly fileSizeBytes: number;
	readonly fileSha256: string;
	readonly fileExtension: string;
	readonly isDicom: boolean;
	readonly metadata: ExtractedRadiologyMetadata;
	readonly embeddedDicom?: ParsedDicomDataset | undefined;
	readonly matchResult: StudyVisitMatchResult;
	readonly normalizedPreview?: NormalizedImageBuffer | undefined;
	readonly ingestionTimestamp: number;
	readonly status: "SUCCESS" | "QUARANTINED";
	readonly quarantineReason?: HotFolderQuarantineReason | undefined;
}

// ─── 2. ZOD-СХЕМЫ ДЛЯ ВАЛИДАЦИИ ──────────────────────────────────────────────

export const activeVisitContextSchema = z.object({
	visitId: z.string().min(1, "Идентификатор приёма обязателен"),
	patientId: z.string().min(1, "Идентификатор пациента обязателен"),
	patientFullName: z.string().min(1, "ФИО пациента обязательно"),
	patientCardNumber: z.string().optional(),
	visitBarcode: z.string().optional(),
	doctorId: z.string().optional(),
	doctorFullName: z.string().optional(),
	scheduledStartIso: z.string().optional(),
	scheduledEndIso: z.string().optional(),
	cabinetName: z.string().optional(),
	chairId: z.string().optional(),
	assignedToothList: z.array(z.number().int()).optional(),
	status: z.enum(["planned", "in_treatment", "arrived", "completed"]).optional(),
});

export const hotFolderSyncConfigSchema = z.object({
	watchDirectory: z.string().min(1).default("C:/DentalRadiology/HotFolder"),
	processedDirectory: z.string().optional(),
	quarantineDirectory: z.string().optional(),
	autoMatchWithActiveVisits: z.boolean().default(true),
	minimumMatchConfidence: z.number().min(0).max(1).default(0.6),
	maxFileSizeBytes: z.number().int().min(1024).default(500 * 1024 * 1024),
	defaultWindowCenter: z.number().default(2048),
	defaultWindowWidth: z.number().default(4096),
});
export type HotFolderSyncConfig = z.infer<typeof hotFolderSyncConfigSchema>;
export type HotFolderConfig = HotFolderSyncConfig;

export const imageNormalizationOptionsSchema = z.object({
	windowCenter: z.number().optional(),
	windowWidth: z.number().optional(),
	brightness: z.number().min(-100).max(100).default(0),
	contrast: z.number().min(-100).max(100).default(0),
	invert: z.boolean().default(false),
	gamma: z.number().min(0.1).max(4.0).default(1.0),
	clahePreset: z
		.enum([
			"STANDARD_DIAGNOSTIC",
			"ROOT_CANAL_ENDODONTIC",
			"CARIES_ENAMEL_DETECTION",
			"PERIODONTAL_BONE_MARGIN",
			"IMPLANT_TRABECULAR_DENSITY",
		])
		.optional(),
});
export type ImageNormalizationOptions = z.input<typeof imageNormalizationOptionsSchema>;
export type ImageNormalizationResolvedOptions = z.output<typeof imageNormalizationOptionsSchema>;

// ─── 3. СТАБИЛЬНОСТЬ ФАЙЛОВ И ПАЙПЛАЙН ХРАНИЛИЩА ─────────────────────────────

export interface FileStabilityOptions {
	readonly stabilityCheckIntervalMs?: number | undefined;
	readonly stabilityConsecutiveChecks?: number | undefined;
	readonly timeoutMs?: number | undefined;
}

export interface FileStabilityCheckResult {
	readonly isStable: boolean;
	readonly fileSizeBytes: number;
	readonly checksCount: number;
	readonly elapsedMs: number;
	readonly error?: string | undefined;
}

export interface StorageUploadResult {
	readonly success: boolean;
	readonly storageKey: string;
	readonly previewKey?: string | undefined;
	readonly error?: string | undefined;
}
