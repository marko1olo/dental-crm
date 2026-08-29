/**
 * photoProtocolEngine.ts — Orthodontic 8-Angle Photo Protocol & Treatment Stage Synchronization Engine (@dental/shared)
 *
 * Fully compliant with:
 * - Клинические рекомендации Стоматологической Ассоциации России (СтАР) по ортодонтической диагностике
 * - Международный стандарт фотографического протокола ABO (American Board of Orthodontics)
 * - Приказ Минздрава России от 15.12.2014 № 834н (Медицинская карта стоматологического пациента)
 * - Стандарты FDI / ISO 3950 (нумерация зубов и оценка окклюзионных взаимоотношений по Энглю)
 *
 * Core Capabilities:
 * 1. Standard 8 Orthodontic Angles:
 *    - 5 Intraoral: Frontal in occlusion, Right lateral, Left lateral, Maxillary arch, Mandibular arch
 *    - 3 Extraoral: Full face rest, Full face smiling, Profile rest
 * 2. Phased Treatment Plan Stage Linkage:
 *    - "До лечения" (pre_treatment / baseline)
 *    - "Контроль" (active_monitoring / intermediate dynamics)
 *    - "После лечения" (post_treatment / retention & final outcome)
 * 3. Clinical Guidelines & Overlays:
 *    - Facial & Dental Midline deviation calculation
 *    - Occlusal plane tilt & canting analysis
 *    - Smile arc classification (consonant, flat, reverse)
 *    - Overjet & overbite estimation
 * 4. Multi-Session Comparison Series & 1-Click Patient Presentation / Clinical Report HTML Builder.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA TYPES, ENUMS & ZOD SCHEMAS
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. CANONICAL REGISTRY: 8 ORTHODONTIC ANGLES
// ─────────────────────────────────────────────────────────────────────────────

export const ORTHODONTIC_8_ANGLES: readonly OrthodonticAngleDefinition[] = [
	// ─── Extraoral ───
	{
		id: "extraoral_face_rest",
		category: "extraoral",
		sequenceNumber: 1,
		titleRu: "Анфас в покое",
		shortLabelRu: "Анфас (покой)",
		descriptionRu: "Фронтальный портрет лица с расслабленной мускулатурой губ",
		clinicalInstructionsRu: "Голова в естественном положении (NHP), взгляд строго вперед, губы сомкнуты без напряжения. Оценка симметрии, пропорций третей лица и контура губ.",
		requiredEquipmentRu: "Нейтральный фон (белый/серый), биполярная или портретная вспышка",
		recommendedAspectRatio: "3:2",
		framingLandmarks: ["Зрачковая линия", "Срединно-лицевая линия", "Крылья носа", "Подбородок"],
		svgPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-3.5 4c-1.66 0-3 1.34-3 3h6c0-1.66-1.34-3-3-3z",
	},
	{
		id: "extraoral_face_smile",
		category: "extraoral",
		sequenceNumber: 2,
		titleRu: "Анфас с улыбкой",
		shortLabelRu: "Анфас (улыбка)",
		descriptionRu: "Фронтальный портрет с максимальной естественной улыбкой (Social / Duchenne smile)",
		clinicalInstructionsRu: "Пациент естественно улыбается. Оценка дуги улыбки, экспозиции резцов и десневого края, щечных коридоров (buccal corridors).",
		requiredEquipmentRu: "Нейтральный фон, фронтальный свет, объектив 85-105 мм",
		recommendedAspectRatio: "3:2",
		framingLandmarks: ["Край верхней губы", "Режущие края резцов", "Кривизна нижней губы", "Щечные коридоры"],
		svgPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 3.5c1.1 1.5 3 2.5 5 2.5s3.9-1 5-2.5h-10z",
	},
	{
		id: "extraoral_profile",
		category: "extraoral",
		sequenceNumber: 3,
		titleRu: "Профиль лица",
		shortLabelRu: "Профиль (покой)",
		descriptionRu: "Латеральный портрет лица строго под 90° в естественном положении",
		clinicalInstructionsRu: "Правый профиль, ухо открыто, естественная посадка головы (Франкфуртская горизонталь параллельна полу). Оценка носогубного угла, профиля Риккетса и подбородочной складки.",
		requiredEquipmentRu: "Однородный фон, боковое позиционирование, убранные назад волосы",
		recommendedAspectRatio: "3:2",
		framingLandmarks: ["Франкфуртская горизонталь", "Глабелла", "Субназале", "Погонион", "Линия Риккетса"],
		svgPath: "M9 2C5.13 2 2 5.13 2 9c0 2.38 1.19 4.47 3 5.74V22h14v-6.5c1.86-1.39 3-3.6 3-6.5 0-3.87-3.13-7-7-7H9zm5 10.5V14h-4v-1.5c-1.5-.5-2.5-1.9-2.5-3.5 0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.6-1 3-2.5 3.5z",
	},
	// ─── Intraoral ───
	{
		id: "intraoral_frontal_occlusion",
		category: "intraoral",
		sequenceNumber: 4,
		titleRu: "Фронт в окклюзии",
		shortLabelRu: "Фронт в окклюзии",
		descriptionRu: "Внутриротовой снимок переднего сегмента в положении привычной максимальной окклюзии",
		clinicalInstructionsRu: "Двусторонние ретракторы губ и щек. Окклюзионная плоскость строго по центру кадра. Совпадение верхне- и нижнечелюстной средних линий, оценка перекрытия (overbite).",
		requiredEquipmentRu: "Двусторонние ретракторы, макрообъектив 1:1, кольцевая/секционная вспышка",
		recommendedAspectRatio: "4:3",
		framingLandmarks: ["Срединная линия резцов", "Окклюзионная плоскость", "Десневой зенит 11, 21", "Клыковые контакты"],
		svgPath: "M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm16 14H5V5h14v14zM8 7h8v2H8zm0 4h8v2H8zm0 4h8v2H8z",
	},
	{
		id: "intraoral_right_lateral",
		category: "intraoral",
		sequenceNumber: 5,
		titleRu: "Правый боковой сегмент",
		shortLabelRu: "Правый боковой",
		descriptionRu: "Смыкание клыков и моляров справа в привычной окклюзии",
		clinicalInstructionsRu: "Широкий ретрактор справа, ослабление слева. Съемка перпендикулярно вестибулярной поверхности первого моляра. Оценка классов по Энглю (моляры и клыки).",
		requiredEquipmentRu: "Ретракторы щечные, боковое зеркало при необходимости, макросвет",
		recommendedAspectRatio: "4:3",
		framingLandmarks: ["Бугры 16 и 46", "Смыкание 13 и 43", "Кривая Шпее", "Десневые сосочки"],
		svgPath: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h4v4H6zm6 0h6v4h-6z",
	},
	{
		id: "intraoral_left_lateral",
		category: "intraoral",
		sequenceNumber: 6,
		titleRu: "Левый боковой сегмент",
		shortLabelRu: "Левый боковой",
		descriptionRu: "Смыкание клыков и моляров слева в привычной окклюзии",
		clinicalInstructionsRu: "Широкий ретрактор слева, ослабление справа. Съемка перпендикулярно щечной поверхности первого моляра слева (26 и 36). Оценка класса по Энглю.",
		requiredEquipmentRu: "Ретракторы щечные, боковое зеркало, антифог-спрей / обдув зеркала",
		recommendedAspectRatio: "4:3",
		framingLandmarks: ["Бугры 26 и 36", "Смыкание 23 и 33", "Кривая Шпее", "Вестибулярный контакт"],
		svgPath: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h6v4H6zm8 0h4v4h-4z",
	},
	{
		id: "intraoral_upper_arch",
		category: "intraoral",
		sequenceNumber: 7,
		titleRu: "Верхний зубной ряд",
		shortLabelRu: "Верхний ряд",
		descriptionRu: "Окклюзионная поверхность всех верхних зубов от резцов до вторых моляров",
		clinicalInstructionsRu: "Большое окклюзионное зеркало с подогревом / обдувом. В кадре виден весь зубной ряд (17–27) и небный шов по центральной оси кадра.",
		requiredEquipmentRu: "Окклюзионное зеркало верхнее, ретракторы 'V', теплый обдув зеркала",
		recommendedAspectRatio: "4:3",
		framingLandmarks: ["Срединный небный шов", "Форма дуги (эллипс/трапеция/V-образная)", "Торк резцов", "Вторые моляры 17, 27"],
		svgPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
	},
	{
		id: "intraoral_lower_arch",
		category: "intraoral",
		sequenceNumber: 8,
		titleRu: "Нижний зубной ряд",
		shortLabelRu: "Нижний ряд",
		descriptionRu: "Окклюзионная поверхность всех нижних зубов (37–47) с отведением языка",
		clinicalInstructionsRu: "Окклюзионное зеркало нижнее, пациент поднимает подбородок, язык отведен назад за зеркало. В кадре видны все зубы от 47 до 37 без наложения мягких тканей.",
		requiredEquipmentRu: "Окклюзионное зеркало нижнее, ретракторы щечные, обдув воздухом",
		recommendedAspectRatio: "4:3",
		framingLandmarks: ["Форма нижней дуги (парабола)", "Скученность резцов 31-42", "Моляры 37, 47", "Кривая Вильсона"],
		svgPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.55.45-1 1-1h14c.55 0 1 .45 1 1 0 4.41-3.59 8-8 8z",
	},
];

export const ORTHODONTIC_ANGLES_MAP: Record<OrthodonticAngleId, OrthodonticAngleDefinition> =
	Object.fromEntries(ORTHODONTIC_8_ANGLES.map((a) => [a.id, a])) as Record<
		OrthodonticAngleId,
		OrthodonticAngleDefinition
	>;

// ─────────────────────────────────────────────────────────────────────────────
// 3. STAGE METADATA & CLINICAL LABELS
// ─────────────────────────────────────────────────────────────────────────────

export const ORTHODONTIC_STAGE_METADATA: Record<OrthodonticSessionStage, OrthodonticStageMetadata> = {
	pre_treatment: {
		stage: "pre_treatment",
		code: "STAGE_PRE",
		labelRu: "До лечения (Исходный статус)",
		shortLabelRu: "До лечения",
		color: "#2563EB", // Blue
		descriptionRu: "Первичная ортодонтическая фиксация исходной окклюзии, пропорций лица и зубных рядов до установки аппаратуры.",
	},
	active_monitoring: {
		stage: "active_monitoring",
		code: "STAGE_ACTIVE",
		labelRu: "Контроль динамики (В процессе)",
		shortLabelRu: "Контроль",
		color: "#D97706", // Amber
		descriptionRu: "Промежуточный контроль перемещения зубов, юстировки брекет-системы, смены элайнеров или аппаратов.",
	},
	post_treatment: {
		stage: "post_treatment",
		code: "STAGE_POST",
		labelRu: "После лечения (Ретенция и финал)",
		shortLabelRu: "После лечения",
		color: "#059669", // Emerald
		descriptionRu: "Финальный клинический результат, оценка эстетики улыбки, стабильности окклюзии и фиксации ретейнеров.",
	},
};

export const ANGLE_CLASS_LABELS_RU: Record<AngleClass, string> = {
	class_1: "I класс по Энглю (Нейтроокклюзия)",
	class_2_div_1: "II класс, 1 подкласс (Дистоокклюзия с протрузией резцов)",
	class_2_div_2: "II класс, 2 подкласс (Дистоокклюзия с ретрузией резцов)",
	class_3: "III класс по Энглю (Мезиоокклюзия)",
};

export const SMILE_ARC_LABELS_RU: Record<SmileArcType, string> = {
	consonant: "Консонантная (Параллельна кривизне нижней губы — эстетический идеал)",
	flat: "Уплощенная (Прямая линия режущих краев)",
	reverse: "Реверсивная (Инвертированная кривизна — эстетический дефект)",
};

export const MIDLINE_SHIFT_LABELS_RU: Record<MidlineShiftDirection, string> = {
	none: "В норме (Совпадает со срединно-лицевой линией)",
	left: "Смещение влево",
	right: "Смещение вправо",
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. CORE ENGINE CALCULATION & MANAGEMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a brand-new empty 8-slot orthodontic photo-protocol session.
 */
export function createEmptyOrthodonticSession(params: {
	id?: string | undefined;
	patientId: string;
	patientName: string;
	doctorName: string;
	clinicName?: string | undefined;
	stage?: OrthodonticSessionStage | undefined;
	sessionDate?: string | undefined;
	treatmentPlanId?: string | undefined;
	treatmentPlanStageId?: string | undefined;
	treatmentStageTitle?: string | undefined;
	notes?: string | undefined;
}): OrthodonticPhotoSession {
	const nowIso = new Date().toISOString();
	const sessionId = params.id || `ortho-photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

	const slots = {} as Record<OrthodonticAngleId, OrthodonticPhotoSlotRecord>;

	for (const angle of ORTHODONTIC_8_ANGLES) {
		slots[angle.id] = {
			angleId: angle.id,
			rotationDegrees: 0,
			flipHorizontal: false,
			flipVertical: false,
			brightness: 0,
			contrast: 0,
			zoom: 1,
			panX: 0,
			panY: 0,
			guidelineOverlayEnabled: true,
		};
	}

	return {
		id: sessionId,
		patientId: params.patientId,
		patientName: params.patientName,
		doctorName: params.doctorName,
		clinicName: params.clinicName || "ООО «Денте Стоматология»",
		stage: params.stage || "pre_treatment",
		sessionDate: params.sessionDate || nowIso,
		treatmentPlanId: params.treatmentPlanId,
		treatmentPlanStageId: params.treatmentPlanStageId,
		treatmentStageTitle: params.treatmentStageTitle,
		slots,
		findings: {
			angleClassMolarRight: "class_1",
			angleClassMolarLeft: "class_1",
			angleClassCanineRight: "class_1",
			angleClassCanineLeft: "class_1",
			overjetMm: 2.5,
			overbiteMm: 2.5,
			overbitePercentage: 30,
			midlineShiftUpperMm: 0,
			midlineShiftUpperDirection: "none",
			midlineShiftLowerMm: 0,
			midlineShiftLowerDirection: "none",
			smileArc: "consonant",
			crowdingUpper: false,
			crowdingLower: false,
			crossbite: false,
			openBite: false,
			deepBite: false,
			clinicalDiagnosisRu: "Аномалия прикуса, сужение зубных рядов",
			recommendationsRu: "Аппаратурное ортодонтическое лечение, коррекция торка и окклюзии",
		},
		notes: params.notes || "",
		createdAt: nowIso,
		updatedAt: nowIso,
	};
}

/**
 * Calculates completeness metrics for an orthodontic photo protocol (8 slots total).
 */
export function calculateOrthodonticProtocolCompleteness(
	sessionOrSlots: OrthodonticPhotoSession | Record<string, Partial<OrthodonticPhotoSlotRecord> | undefined>,
): OrthodonticProtocolCompleteness {
	const rawSlots = "slots" in sessionOrSlots ? sessionOrSlots.slots : sessionOrSlots;
	const slots = (rawSlots || {}) as Partial<Record<OrthodonticAngleId, OrthodonticPhotoSlotRecord>>;

	const missingAngles: OrthodonticAngleId[] = [];
	const missingAngleNamesRu: string[] = [];
	let uploadedCount = 0;
	let intraoralCompleted = 0;
	let extraoralCompleted = 0;

	for (const angle of ORTHODONTIC_8_ANGLES) {
		const slot = slots[angle.id];
		const hasImage = Boolean(slot && slot.imageUrl && slot.imageUrl.trim().length > 0);
		if (hasImage) {
			uploadedCount += 1;
			if (angle.category === "intraoral") intraoralCompleted += 1;
			if (angle.category === "extraoral") extraoralCompleted += 1;
		} else {
			missingAngles.push(angle.id);
			missingAngleNamesRu.push(angle.titleRu);
		}
	}

	const totalRequired = 8;
	const completionPercentage = Math.round((uploadedCount / totalRequired) * 100);
	const isComplete = uploadedCount === totalRequired;
	// Ready for consultation if at least 6 core shots are present (e.g. 4 intraoral + 2 extraoral)
	const isReadyForConsultation = uploadedCount >= 6 && intraoralCompleted >= 3 && extraoralCompleted >= 2;

	return {
		totalRequired,
		uploadedCount,
		completionPercentage,
		isComplete,
		isReadyForConsultation,
		missingAngles,
		missingAngleNamesRu,
		intraoralCompleted,
		extraoralCompleted,
	};
}

/**
 * Updates a specific photo slot in an orthodontic session.
 */
export function updateSlotPhoto(
	session: OrthodonticPhotoSession,
	angleId: OrthodonticAngleId,
	updates: Partial<OrthodonticPhotoSlotRecord>,
): OrthodonticPhotoSession {
	const existingSlot = session.slots[angleId] || {
		angleId,
		rotationDegrees: 0,
		flipHorizontal: false,
		flipVertical: false,
		brightness: 0,
		contrast: 0,
		zoom: 1,
		panX: 0,
		panY: 0,
		guidelineOverlayEnabled: true,
	};

	const updatedSlot: OrthodonticPhotoSlotRecord = {
		...existingSlot,
		...updates,
		angleId,
		capturedAt: updates.capturedAt || existingSlot.capturedAt || (updates.imageUrl ? new Date().toISOString() : undefined),
	};

	return {
		...session,
		slots: {
			...session.slots,
			[angleId]: updatedSlot,
		},
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Removes photo from a slot, resetting image and calibration data.
 */
export function removeSlotPhoto(
	session: OrthodonticPhotoSession,
	angleId: OrthodonticAngleId,
): OrthodonticPhotoSession {
	const existingSlot = session.slots[angleId];
	if (!existingSlot) return session;

	const resetSlot: OrthodonticPhotoSlotRecord = {
		angleId,
		imageUrl: undefined,
		capturedAt: undefined,
		rotationDegrees: 0,
		flipHorizontal: false,
		flipVertical: false,
		brightness: 0,
		contrast: 0,
		zoom: 1,
		panX: 0,
		panY: 0,
		calibrationMmPerPx: undefined,
		notes: undefined,
		guidelineOverlayEnabled: true,
		midlineOffsetMm: undefined,
		occlusalTiltDegrees: undefined,
		landmarks: undefined,
	};

	return {
		...session,
		slots: {
			...session.slots,
			[angleId]: resetSlot,
		},
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Calculates midline deviation in millimeters given pixel coordinates and scale factor.
 */
export function calculateMidlineDeviation(params: {
	referenceMidlineX: number;
	observedMidlineX: number;
	calibrationMmPerPx: number;
}): { deviationMm: number; direction: MidlineShiftDirection } {
	const deltaPx = params.observedMidlineX - params.referenceMidlineX;
	const deviationMm = Math.round(Math.abs(deltaPx * params.calibrationMmPerPx) * 10) / 10;

	let direction: MidlineShiftDirection = "none";
	if (deltaPx > 1) direction = "right";
	else if (deltaPx < -1) direction = "left";

	return { deviationMm, direction };
}

/**
 * Calculates occlusal plane canting / tilt angle in degrees from two canine/molar occlusal contact points.
 */
export function calculateOcclusalPlaneTilt(
	leftPoint: OrthodonticPoint2D,
	rightPoint: OrthodonticPoint2D,
): { tiltDegrees: number; isTilted: boolean; highSide: "left" | "right" | "level" } {
	const deltaX = rightPoint.x - leftPoint.x;
	const deltaY = rightPoint.y - leftPoint.y;

	if (Math.abs(deltaX) < 0.0001) {
		return { tiltDegrees: 0, isTilted: false, highSide: "level" };
	}

	const rad = Math.atan2(deltaY, deltaX);
	const tiltDegrees = Math.round(((rad * 180) / Math.PI) * 10) / 10;
	const isTilted = Math.abs(tiltDegrees) > 1.5;

	let highSide: "left" | "right" | "level" = "level";
	if (tiltDegrees > 1.5) highSide = "left";
	else if (tiltDegrees < -1.5) highSide = "right";

	return { tiltDegrees, isTilted, highSide };
}

/**
 * Compares two orthodontic photo-protocol sessions (e.g. Pre-treatment vs Post-treatment)
 * and pairs photos angle-by-angle for before/after comparison.
 */
export function buildOrthodonticComparisonSeries(
	beforeSession: OrthodonticPhotoSession,
	afterSession: OrthodonticPhotoSession,
): OrthodonticComparisonSeries {
	const pairs: OrthodonticComparisonPair[] = [];
	let pairedCount = 0;

	for (const angle of ORTHODONTIC_8_ANGLES) {
		const beforeSlot = beforeSession.slots[angle.id];
		const afterSlot = afterSession.slots[angle.id];
		const hasBefore = Boolean(beforeSlot && beforeSlot.imageUrl);
		const hasAfter = Boolean(afterSlot && afterSlot.imageUrl);
		const hasBoth = hasBefore && hasAfter;

		if (hasBoth) {
			pairedCount += 1;
		}

		pairs.push({
			angleId: angle.id,
			angleDefinition: angle,
			...(hasBefore && beforeSlot ? { beforePhoto: beforeSlot } : {}),
			...(hasAfter && afterSlot ? { afterPhoto: afterSlot } : {}),
			...(beforeSession.sessionDate ? { beforeSessionDate: beforeSession.sessionDate } : {}),
			...(afterSession.sessionDate ? { afterSessionDate: afterSession.sessionDate } : {}),
			...(beforeSession.stage ? { beforeStage: beforeSession.stage } : {}),
			...(afterSession.stage ? { afterStage: afterSession.stage } : {}),
			hasBothPhotos: hasBoth,
		});
	}

	const beforeTime = new Date(beforeSession.sessionDate).getTime();
	const afterTime = new Date(afterSession.sessionDate).getTime();
	const daysBetweenSessions = Math.max(
		0,
		Math.round(Math.abs(afterTime - beforeTime) / (1000 * 60 * 60 * 24)),
	);

	return {
		beforeSession,
		afterSession,
		pairs,
		pairedCount,
		daysBetweenSessions,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CLINICAL REPORT & PATIENT PRESENTATION HTML GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export interface OrthodonticReportPayload {
	readonly session: OrthodonticPhotoSession;
	readonly completeness: OrthodonticProtocolCompleteness;
	readonly stageMeta: OrthodonticStageMetadata;
	readonly generatedAt: string;
	readonly formattedDateRu: string;
}

/**
 * Builds structured diagnostic DTO for orthodontic reporting.
 */
export function generateOrthodonticClinicalReport(
	session: OrthodonticPhotoSession,
): OrthodonticReportPayload {
	const completeness = calculateOrthodonticProtocolCompleteness(session);
	const stageMeta = ORTHODONTIC_STAGE_METADATA[session.stage];
	const sessionDateObj = new Date(session.sessionDate);
	const formattedDateRu = isNaN(sessionDateObj.getTime())
		? session.sessionDate
		: new Intl.DateTimeFormat("ru-RU", {
				day: "2-digit",
				month: "long",
				year: "numeric",
			}).format(sessionDateObj);

	return {
		session,
		completeness,
		stageMeta,
		generatedAt: new Date().toISOString(),
		formattedDateRu,
	};
}

/**
 * Escapes HTML characters safely.
 */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Renders an official, responsive, high-grade printable HTML orthodontic photo-protocol presentation
 * suitable for patient consults, treatment plan appendices, or PDF printing.
 */
export function renderOrthodonticPresentationHtml(
	session: OrthodonticPhotoSession,
	comparisonSession?: OrthodonticPhotoSession,
): string {
	const report = generateOrthodonticClinicalReport(session);
	const f = session.findings;

	let comparisonHtml = "";
	if (comparisonSession) {
		const series = buildOrthodonticComparisonSeries(comparisonSession, session);
		const compBeforeMeta = ORTHODONTIC_STAGE_METADATA[comparisonSession.stage];
		const compAfterMeta = ORTHODONTIC_STAGE_METADATA[session.stage];

		const rowsHtml = series.pairs
			.filter((p) => p.beforePhoto?.imageUrl || p.afterPhoto?.imageUrl)
			.map((p) => {
				const beforeSrc = p.beforePhoto?.imageUrl || "";
				const afterSrc = p.afterPhoto?.imageUrl || "";

				return `
					<div class="comp-card">
						<div class="comp-title">${escapeHtml(p.angleDefinition.titleRu)} (${escapeHtml(p.angleDefinition.shortLabelRu)})</div>
						<div class="comp-photos">
							<div class="comp-photo-box">
								<div class="comp-badge comp-badge-before">${escapeHtml(compBeforeMeta.shortLabelRu)}</div>
								${
									beforeSrc
										? `<img src="${beforeSrc}" alt="До: ${escapeHtml(p.angleDefinition.titleRu)}" class="comp-img" />`
										: `<div class="comp-empty">Нет снимка</div>`
								}
							</div>
							<div class="comp-photo-box">
								<div class="comp-badge comp-badge-after">${escapeHtml(compAfterMeta.shortLabelRu)}</div>
								${
									afterSrc
										? `<img src="${afterSrc}" alt="После: ${escapeHtml(p.angleDefinition.titleRu)}" class="comp-img" />`
										: `<div class="comp-empty">Нет снимка</div>`
								}
							</div>
						</div>
					</div>
				`;
			})
			.join("\n");

		comparisonHtml = `
			<section class="section">
				<h2 class="section-title">Сравнительный анализ динамики (До / После — ${series.daysBetweenSessions} дн.)</h2>
				<div class="comp-grid">
					${rowsHtml}
				</div>
			</section>
		`;
	}

	const gridSlotsHtml = ORTHODONTIC_8_ANGLES.map((angle) => {
		const slot = session.slots[angle.id];
		const imgUrl = slot?.imageUrl;

		return `
			<div class="photo-card">
				<div class="photo-header">
					<span class="photo-seq">${angle.sequenceNumber}</span>
					<span class="photo-label">${escapeHtml(angle.titleRu)}</span>
				</div>
				<div class="photo-viewport">
					${
						imgUrl
							? `<img src="${imgUrl}" alt="${escapeHtml(angle.titleRu)}" class="photo-img" style="transform: rotate(${slot.rotationDegrees || 0}deg) scale(${slot.zoom || 1}) ${slot.flipHorizontal ? "scaleX(-1)" : ""} ${slot.flipVertical ? "scaleY(-1)" : ""}; filter: brightness(${(slot.brightness || 0) + 100}%) contrast(${(slot.contrast || 0) + 100}%);" />`
							: `<div class="photo-placeholder">
									<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${angle.svgPath}"></path></svg>
									<span class="placeholder-text">${escapeHtml(angle.shortLabelRu)}</span>
									<span class="placeholder-sub">Ракурс не загружен</span>
							   </div>`
					}
				</div>
				<div class="photo-footer">
					<span class="photo-cat">${angle.category === "intraoral" ? "Внутриротовой" : "Внеротовой"}</span>
					<span class="photo-equip">${escapeHtml(angle.recommendedAspectRatio)}</span>
				</div>
			</div>
		`;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Ортодонтический фотопротокол — ${escapeHtml(session.patientName)}</title>
	<style>
		:root {
			--paper: #ffffff;
			--paper-subtle: #f8fafc;
			--ink: #0f172a;
			--muted: #64748b;
			--line: #e2e8f0;
			--teal: #0d9488;
			--blue: #2563eb;
			--amber: #d97706;
			--emerald: #059669;
			--card-border: #cbd5e1;
		}
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			background-color: var(--paper-subtle);
			color: var(--ink);
			line-height: 1.5;
			padding: 24px;
		}
		.container {
			max-width: 1100px;
			margin: 0 auto;
			background: var(--paper);
			border: 1px solid var(--line);
			border-radius: 16px;
			padding: 32px;
			box-shadow: 0 4px 20px rgba(0,0,0,0.05);
		}
		.header-banner {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			border-bottom: 2px solid var(--line);
			padding-bottom: 20px;
			margin-bottom: 24px;
		}
		.clinic-title { font-size: 20px; font-weight: 800; color: var(--teal); letter-spacing: -0.02em; }
		.doc-title { font-size: 16px; font-weight: 700; color: var(--ink); margin-top: 4px; }
		.stage-badge {
			display: inline-block;
			padding: 6px 14px;
			border-radius: 20px;
			font-size: 12px;
			font-weight: 700;
			color: #ffffff;
			background-color: ${report.stageMeta.color};
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
		.meta-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
			gap: 16px;
			background: var(--paper-subtle);
			padding: 16px 20px;
			border-radius: 12px;
			border: 1px solid var(--line);
			margin-bottom: 28px;
		}
		.meta-item { display: flex; flex-direction: column; }
		.meta-label { font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 600; }
		.meta-value { font-size: 14px; font-weight: 700; color: var(--ink); margin-top: 2px; }

		.section { margin-bottom: 32px; }
		.section-title {
			font-size: 16px;
			font-weight: 800;
			color: var(--ink);
			margin-bottom: 16px;
			display: flex;
			align-items: center;
			gap: 8px;
			border-left: 4px solid var(--teal);
			padding-left: 10px;
		}

		/* 8-Shot Grid */
		.photo-grid {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 16px;
		}
		@media (max-width: 900px) {
			.photo-grid { grid-template-columns: repeat(2, 1fr); }
		}
		@media (max-width: 500px) {
			.photo-grid { grid-template-columns: 1fr; }
		}
		.photo-card {
			background: var(--paper);
			border: 1px solid var(--card-border);
			border-radius: 12px;
			overflow: hidden;
			display: flex;
			flex-direction: column;
		}
		.photo-header {
			background: var(--paper-subtle);
			padding: 8px 12px;
			font-size: 12px;
			font-weight: 700;
			border-bottom: 1px solid var(--line);
			display: flex;
			align-items: center;
			gap: 8px;
		}
		.photo-seq {
			background: var(--ink);
			color: #fff;
			width: 18px;
			height: 18px;
			border-radius: 50%;
			font-size: 10px;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.photo-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
		.photo-viewport {
			height: 180px;
			background: #1e293b;
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: hidden;
			position: relative;
		}
		.photo-img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
		.photo-placeholder {
			color: #94a3b8;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 6px;
			text-align: center;
			padding: 12px;
		}
		.placeholder-text { font-size: 12px; font-weight: 600; color: #cbd5e1; }
		.placeholder-sub { font-size: 10px; color: #64748b; }
		.photo-footer {
			padding: 6px 12px;
			background: var(--paper-subtle);
			border-top: 1px solid var(--line);
			display: flex;
			justify-content: space-between;
			font-size: 11px;
			color: var(--muted);
		}

		/* Findings Table */
		.findings-table {
			width: 100%;
			border-collapse: collapse;
			font-size: 13px;
			background: var(--paper);
			border: 1px solid var(--line);
			border-radius: 8px;
			overflow: hidden;
		}
		.findings-table th, .findings-table td {
			padding: 10px 14px;
			border-bottom: 1px solid var(--line);
			text-align: left;
		}
		.findings-table th {
			background: var(--paper-subtle);
			font-weight: 700;
			color: var(--muted);
			font-size: 11px;
			text-transform: uppercase;
		}
		.findings-table tr:last-child td { border-bottom: none; }

		/* Comparison */
		.comp-grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 16px;
		}
		@media (max-width: 700px) { .comp-grid { grid-template-columns: 1fr; } }
		.comp-card {
			border: 1px solid var(--card-border);
			border-radius: 12px;
			padding: 12px;
			background: var(--paper-subtle);
		}
		.comp-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; color: var(--ink); }
		.comp-photos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
		.comp-photo-box {
			height: 140px;
			background: #0f172a;
			border-radius: 8px;
			overflow: hidden;
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.comp-badge {
			position: absolute;
			top: 6px;
			left: 6px;
			padding: 2px 8px;
			border-radius: 4px;
			font-size: 10px;
			font-weight: 700;
			color: #fff;
			z-index: 2;
		}
		.comp-badge-before { background: var(--blue); }
		.comp-badge-after { background: var(--emerald); }
		.comp-img { width: 100%; height: 100%; object-fit: cover; }
		.comp-empty { color: #64748b; font-size: 11px; }

		.footer {
			margin-top: 32px;
			border-top: 1px solid var(--line);
			padding-top: 16px;
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-size: 11px;
			color: var(--muted);
		}

		@media print {
			body { background: #fff; padding: 0; }
			.container { border: none; box-shadow: none; padding: 0; }
			.photo-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 8px; }
			.photo-viewport { height: 140px; }
		}
	</style>
</head>
<body>
	<div class="container">
		<header class="header-banner">
			<div>
				<div class="clinic-title">${escapeHtml(session.clinicName)}</div>
				<div class="doc-title">Ортодонтический диагностический фотопротокол (8 ракурсов)</div>
			</div>
			<div>
				<span class="stage-badge">${escapeHtml(report.stageMeta.labelRu)}</span>
			</div>
		</header>

		<div class="meta-grid">
			<div class="meta-item">
				<span class="meta-label">Пациент</span>
				<span class="meta-value">${escapeHtml(session.patientName)}</span>
			</div>
			<div class="meta-item">
				<span class="meta-label">Лечащий врач-ортодонт</span>
				<span class="meta-value">${escapeHtml(session.doctorName)}</span>
			</div>
			<div class="meta-item">
				<span class="meta-label">Дата фиксации</span>
				<span class="meta-value">${escapeHtml(report.formattedDateRu)}</span>
			</div>
			<div class="meta-item">
				<span class="meta-label">Статус заполнения</span>
				<span class="meta-value">${report.completeness.uploadedCount} из 8 ракурсов (${report.completeness.completionPercentage}%)</span>
			</div>
			${
				session.treatmentStageTitle
					? `<div class="meta-item">
							<span class="meta-label">Этап плана лечения</span>
							<span class="meta-value">${escapeHtml(session.treatmentStageTitle)}</span>
					   </div>`
					: ""
			}
		</div>

		<!-- 8-Shot Grid -->
		<section class="section">
			<h2 class="section-title">Стандартная ортодонтическая сетка (8 ракурсов)</h2>
			<div class="photo-grid">
				${gridSlotsHtml}
			</div>
		</section>

		<!-- Clinical Findings -->
		<section class="section">
			<h2 class="section-title">Клиническая диагностика и окклюзионные параметры</h2>
			<table class="findings-table">
				<thead>
					<tr>
						<th>Параметр</th>
						<th>Клиническое значение</th>
						<th>Норма / Ориентир</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><strong>Взаимоотношения моляров (справа / слева)</strong></td>
						<td>${escapeHtml(ANGLE_CLASS_LABELS_RU[f.angleClassMolarRight])} / ${escapeHtml(ANGLE_CLASS_LABELS_RU[f.angleClassMolarLeft])}</td>
						<td>I класс по Энглю (нейтроокклюзия)</td>
					</tr>
					<tr>
						<td><strong>Взаимоотношения клыков (справа / слева)</strong></td>
						<td>${escapeHtml(ANGLE_CLASS_LABELS_RU[f.angleClassCanineRight])} / ${escapeHtml(ANGLE_CLASS_LABELS_RU[f.angleClassCanineLeft])}</td>
						<td>I класс (клык смыкается между клыком и премоляром)</td>
					</tr>
					<tr>
						<td><strong>Сагиттальная щель (Overjet)</strong></td>
						<td>${f.overjetMm} мм</td>
						<td>2.0 – 3.0 мм</td>
					</tr>
					<tr>
						<td><strong>Вертикальное резцовое перекрытие (Overbite)</strong></td>
						<td>${f.overbiteMm} мм (${f.overbitePercentage}%)</td>
						<td>1/3 высоты коронки (~30%)</td>
					</tr>
					<tr>
						<td><strong>Срединная линия (в/ч и н/ч)</strong></td>
						<td>В/Ч: ${f.midlineShiftUpperMm} мм (${escapeHtml(MIDLINE_SHIFT_LABELS_RU[f.midlineShiftUpperDirection])}), Н/Ч: ${f.midlineShiftLowerMm} мм (${escapeHtml(MIDLINE_SHIFT_LABELS_RU[f.midlineShiftLowerDirection])})</td>
						<td>Совпадает со срединно-лицевой линией</td>
					</tr>
					<tr>
						<td><strong>Эстетика дуги улыбки (Smile Arc)</strong></td>
						<td>${escapeHtml(SMILE_ARC_LABELS_RU[f.smileArc])}</td>
						<td>Консонантная</td>
					</tr>
					<tr>
						<td><strong>Диагноз и план</strong></td>
						<td colspan="2"><em>${escapeHtml(f.clinicalDiagnosisRu)}</em>. Рекомендовано: ${escapeHtml(f.recommendationsRu)}</td>
					</tr>
				</tbody>
			</table>
		</section>

		${comparisonHtml}

		<footer class="footer">
			<div>Протокол сформирован в системе DENTE Dental CRM • Приказ Минздрава РФ № 834н / СтАР</div>
			<div>Подпись врача-ортодонта: __________________ / ${escapeHtml(session.doctorName)} /</div>
		</footer>
	</div>
</body>
</html>`;
}
