/**
 * types.ts — Layer 0: Contracts, Schemas & DTOs for Orthodontic & Clinical Photo Protocol (@dental/shared)
 *
 * Compliant with:
 * - Клинические рекомендации Стоматологической Ассоциации России (СтАР) по ортодонтической диагностике
 * - Международный стандарт фотографического протокола ABO (American Board of Orthodontics)
 * - Приказ Минздрава России от 15.12.2014 № 834н (Медицинская карта стоматологического пациента)
 * - Стандарты FDI / ISO 3950 (нумерация зубов и оценка окклюзионных взаимоотношений по Энглю)
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ZOD ENUMS & BASIC DATA TYPES
// ─────────────────────────────────────────────────────────────────────────────

export const orthodonticAngleIdSchema = z.enum([
	// Extraoral (3)
	"extraoral_face_rest",
	"extraoral_face_smile",
	"extraoral_profile",
	// Intraoral (5)
	"intraoral_frontal_occlusion",
	"intraoral_right_lateral",
	"intraoral_left_lateral",
	"intraoral_upper_arch",
	"intraoral_lower_arch",
]);
export type OrthodonticAngleId = z.infer<typeof orthodonticAngleIdSchema>;

export const orthodonticAngleCategorySchema = z.enum(["extraoral", "intraoral"]);
export type OrthodonticAngleCategory = z.infer<typeof orthodonticAngleCategorySchema>;

export const orthodonticSessionStageSchema = z.enum([
	"pre_treatment",
	"active_monitoring",
	"post_treatment",
]);
export type OrthodonticSessionStage = z.infer<typeof orthodonticSessionStageSchema>;

export const angleClassSchema = z.enum([
	"class_1",
	"class_2_div_1",
	"class_2_div_2",
	"class_3",
]);
export type AngleClass = z.infer<typeof angleClassSchema>;

export const smileArcTypeSchema = z.enum(["consonant", "flat", "reverse"]);
export type SmileArcType = z.infer<typeof smileArcTypeSchema>;

export const midlineShiftDirectionSchema = z.enum(["none", "left", "right"]);
export type MidlineShiftDirection = z.infer<typeof midlineShiftDirectionSchema>;

export const orthodonticPoint2DSchema = z.object({
	x: z.number(),
	y: z.number(),
});
export type OrthodonticPoint2D = z.infer<typeof orthodonticPoint2DSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. PHOTO SLOT & FINDINGS SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const orthodonticPhotoSlotRecordSchema = z.object({
	angleId: orthodonticAngleIdSchema,
	imageUrl: z.string().optional(),
	capturedAt: z.string().optional(),
	rotationDegrees: z.number().int().min(0).max(270).default(0),
	flipHorizontal: z.boolean().default(false),
	flipVertical: z.boolean().default(false),
	brightness: z.number().min(-100).max(100).default(0),
	contrast: z.number().min(-100).max(100).default(0),
	zoom: z.number().min(0.5).max(4).default(1),
	panX: z.number().default(0),
	panY: z.number().default(0),
	calibrationMmPerPx: z.number().positive().optional(),
	notes: z.string().max(500).optional(),
	guidelineOverlayEnabled: z.boolean().default(true),
	midlineOffsetMm: z.number().optional(),
	occlusalTiltDegrees: z.number().optional(),
	landmarks: z.record(z.string(), orthodonticPoint2DSchema).optional(),
});
export type OrthodonticPhotoSlotRecord = z.infer<typeof orthodonticPhotoSlotRecordSchema>;
export type OrthodonticPhotoSlot = OrthodonticPhotoSlotRecord;

export const orthodonticClinicalFindingsSchema = z.object({
	angleClassMolarRight: angleClassSchema.default("class_1"),
	angleClassMolarLeft: angleClassSchema.default("class_1"),
	angleClassCanineRight: angleClassSchema.default("class_1"),
	angleClassCanineLeft: angleClassSchema.default("class_1"),
	overjetMm: z.number().min(-15).max(25).default(2.5),
	overbiteMm: z.number().min(-10).max(20).default(2.5),
	overbitePercentage: z.number().min(0).max(100).default(30),
	midlineShiftUpperMm: z.number().min(0).max(15).default(0),
	midlineShiftUpperDirection: midlineShiftDirectionSchema.default("none"),
	midlineShiftLowerMm: z.number().min(0).max(15).default(0),
	midlineShiftLowerDirection: midlineShiftDirectionSchema.default("none"),
	smileArc: smileArcTypeSchema.default("consonant"),
	crowdingUpper: z.boolean().default(false),
	crowdingLower: z.boolean().default(false),
	crossbite: z.boolean().default(false),
	openBite: z.boolean().default(false),
	deepBite: z.boolean().default(false),
	clinicalDiagnosisRu: z.string().max(300).default("Аномалия прикуса, сужение зубных рядов"),
	recommendationsRu: z.string().max(500).default("Аппаратурное ортодонтическое лечение, коррекция торка и окклюзии"),
});
export type OrthodonticClinicalFindings = z.infer<typeof orthodonticClinicalFindingsSchema>;

export const orthodonticPhotoSessionSchema = z.object({
	id: z.string().min(1),
	patientId: z.string().min(1),
	patientName: z.string().min(1),
	doctorName: z.string().min(1),
	clinicName: z.string().min(1),
	stage: orthodonticSessionStageSchema,
	sessionDate: z.string(),
	treatmentPlanId: z.string().optional(),
	treatmentPlanStageId: z.string().optional(),
	treatmentStageTitle: z.string().optional(),
	slots: z.record(orthodonticAngleIdSchema, orthodonticPhotoSlotRecordSchema),
	findings: orthodonticClinicalFindingsSchema,
	notes: z.string().max(1000).optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type OrthodonticPhotoSession = z.infer<typeof orthodonticPhotoSessionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 3. ANGLE DEFINITIONS & METADATA INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface OrthodonticAngleDefinition {
	readonly id: OrthodonticAngleId;
	readonly category: OrthodonticAngleCategory;
	readonly sequenceNumber: number; // 1..8
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
	readonly clinicalInstructionsRu: string;
	readonly requiredEquipmentRu: string;
	readonly recommendedAspectRatio: "3:2" | "4:3" | "1:1";
	readonly framingLandmarks: readonly string[];
	readonly svgPath: string;
}

export interface OrthodonticStageMetadata {
	readonly stage: OrthodonticSessionStage;
	readonly code: string;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly color: string;
	readonly descriptionRu: string;
}

export interface OrthodonticProtocolCompleteness {
	readonly totalRequired: number; // 8
	readonly uploadedCount: number;
	readonly completionPercentage: number;
	readonly isComplete: boolean;
	readonly isReadyForConsultation: boolean; // at least 6 core shots
	readonly missingAngles: readonly OrthodonticAngleId[];
	readonly missingAngleNamesRu: readonly string[];
	readonly intraoralCompleted: number; // 0..5
	readonly extraoralCompleted: number; // 0..3
}

export interface OrthodonticComparisonPair {
	readonly angleId: OrthodonticAngleId;
	readonly angleDefinition: OrthodonticAngleDefinition;
	readonly beforePhoto?: OrthodonticPhotoSlotRecord | undefined;
	readonly afterPhoto?: OrthodonticPhotoSlotRecord | undefined;
	readonly beforeSessionDate?: string | undefined;
	readonly afterSessionDate?: string | undefined;
	readonly beforeStage?: OrthodonticSessionStage | undefined;
	readonly afterStage?: OrthodonticSessionStage | undefined;
	readonly hasBothPhotos: boolean;
}

export interface OrthodonticComparisonSeries {
	readonly beforeSession: OrthodonticPhotoSession;
	readonly afterSession: OrthodonticPhotoSession;
	readonly pairs: readonly OrthodonticComparisonPair[];
	readonly pairedCount: number;
	readonly daysBetweenSessions: number;
}

export interface OrthodonticReportPayload {
	readonly session: OrthodonticPhotoSession;
	readonly completeness: OrthodonticProtocolCompleteness;
	readonly stageMeta: OrthodonticStageMetadata;
	readonly generatedAt: string;
	readonly formattedDateRu: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. EXTENDED CLINICAL DENTAL SHOT & COLOR CALIBRATION CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

export interface DentalPhotoShot {
	readonly id: string;
	readonly angleId: OrthodonticAngleId | string;
	readonly imageUrl: string;
	readonly capturedAt: string;
	readonly metadata?: {
		readonly cameraModel?: string;
		readonly lensFocalLengthMm?: number;
		readonly iso?: number;
		readonly shutterSpeed?: string;
		readonly aperture?: string;
		readonly whiteBalanceKelvin?: number;
		readonly grayCardCalibrated?: boolean;
	};
}

export interface PhotoColorCalibrationParams {
	readonly targetNeutralGrayRgb?: [number, number, number]; // default [118, 118, 118] (18% gray)
	readonly observedSampleRgb: [number, number, number];
}

export interface ColorCorrectionFactors {
	readonly redMultiplier: number;
	readonly greenMultiplier: number;
	readonly blueMultiplier: number;
	readonly exposureCompensationEv: number;
}

export interface BeforeAfterAlignmentConfig {
	readonly pupilLineTiltDegrees?: number;
	readonly incisalPlaneTiltDegrees?: number;
	readonly scaleCorrectionFactor?: number;
	readonly horizontalShiftMm?: number;
	readonly verticalShiftMm?: number;
}

export interface DentalLabOrderPhotoExport {
	readonly patientId: string;
	readonly patientName: string;
	readonly orderNumber: string;
	readonly labName: string;
	readonly shadeGuideVita: string;
	readonly stumpShadeVita?: string | undefined;
	readonly shots: readonly DentalPhotoShot[];
	readonly clinicalNotes?: string | undefined;
}
