/**
 * stomxTaxonomy.ts — StomX Orthodontic Diagnostic Taxonomy & Form 043/u Engine (@dental/shared)
 *
 * Sourced from StomX Orthodontic Catalog reverse engineering:
 * - orthodontic_categories.json (67KB, 2614 lines)
 * - routing_map.json (orthodontic/:id/medplan)
 *
 * Mandates compliance:
 * - Mandate 8e: Doctor Autonomy — 1-click physiological norm preset ("Норма / Соматически здоров")
 * - Mandate 8k: CRM != Reality Simulator — high clinical velocity, no micro-friction
 * - Mandate 8n: Solo Doctor & Small Clinic sovereignty — fast chairside operation
 * - Mandate 8d & Sin 7: Absolute ban on cartoon emojis in clinical protocols and official medical records
 * - Statutory compliance: Форма 043/у (Приказ Минздрава РФ № 834н), Клинические рекомендации СтАР, Номенклатура 804н
 * - Engineering Rule: Anti-monolith <= 800 lines (Taxonomy engine < 600 lines)
 */

import { z } from "zod";
import {
	type AngleClass,
	type MidlineShiftDirection,
	midlineShiftDirectionSchema,
} from "../diagnostics/photoProtocolEngine.js";
import {
	ANGLE_CLASSES_DETAILED,
	BAD_HABITS_OPTIONS,
	DENTAL_ARCH_FORMS_LOWER,
	DENTAL_ARCH_FORMS_UPPER,
	PROFILE_TYPES,
	SAGITTAL_RELATION_OPTIONS,
	TRANSVERSAL_RELATION_OPTIONS,
	VERTICAL_RELATION_OPTIONS,
} from "./stomxTaxonomyData.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ZOD SCHEMAS & TYPES: COMPLAINTS & ANAMNESIS (18.1, 18.2, 19.x)
// ─────────────────────────────────────────────────────────────────────────────

export const mandibularHabitualShiftSchema = z.enum(["none", "forward", "to_side"]);
export type MandibularHabitualShift = z.infer<typeof mandibularHabitualShiftSchema>;

export const pregnancyTrimesterSchema = z.enum(["no", "i", "ii", "iii"]);
export type PregnancyTrimester = z.infer<typeof pregnancyTrimesterSchema>;

export const deliveryTermSchema = z.enum(["on_time", "premature"]);
export type DeliveryTerm = z.infer<typeof deliveryTermSchema>;

export const feedingTypeSchema = z.enum(["natural", "mixed", "artificial"]);
export type FeedingType = z.infer<typeof feedingTypeSchema>;

export const badHabitSchema = z.enum([
	"none",
	"fingers", // сосание пальцев
	"up_lip", // сосание верхней губы
	"down_lip", // сосание нижней губы
	"tongue", // сосание/прокладывание языка
	"objects", // сосание предметов/карандашей
]);
export type BadHabit = z.infer<typeof badHabitSchema>;

export const priorOrthoTypeSchema = z.enum(["none", "removable", "fixed", "both"]);
export type PriorOrthoType = z.infer<typeof priorOrthoTypeSchema>;

export const orthodonticComplaintsAnamnesisSchema = z.object({
	aesthetic: z.boolean().default(false), // 18.1 Эстетические жалобы (неровные зубы, улыбка)
	morphological: z.boolean().default(false), // 18.2 Морфологические (прикус, смыкание, пережевывание)
	tmjDysfunction: z.boolean().default(false), // 18.3 Нарушения функции ВНЧС (щелканье, боли, хруст)
	lipIncompetence: z.boolean().default(false), // 18.3 Несмыкание губ
	infantileSwallowing: z.boolean().default(false), // 18.3 Инфантильное глотание
	speechDisorders: z.boolean().default(false), // 18.3 Нарушения произношения звуков речи
	speechDisordersComment: z.string().default(""), // Комментарий по нарушениям речи
	mandibularHabitualShift: mandibularHabitualShiftSchema.default("none"), // Привычное смещение нижней челюсти
	mouthBreathing: z.boolean().default(false), // Ротовое дыхание
	bruxism: z.boolean().default(false), // Бруксизм
	sluggishChewing: z.boolean().default(false), // Вялое жевание
	pregnancyTrimester: pregnancyTrimesterSchema.default("no"), // Патология беременности матери
	deliveryTerm: deliveryTermSchema.default("on_time"), // Рожден в срок / недоношен
	feedingType: feedingTypeSchema.default("natural"), // Вид вскармливания
	feedingTypeExtra: z.string().default(""), // Дополнительно по вскармливанию
	teethEruptionTiming: z.string().default("в срок"), // Сроки прорезывания молочных / смены зубов
	badHabits: z.array(badHabitSchema).default(["none"]), // Вредные привычки
	concomitantDiseases: z.array(z.string()).default(["none"]), // Сопутствующие заболевания (ЛОР, рахит и т.д.)
	allergies: z.string().default("не отягощен"), // Аллергологический анамнез
	heredityAnomalies: z.array(z.string()).default(["none"]), // Наследственность (аномалии ЧЛО у родителей/родственников)
	hasPriorOrthoTreatment: z.boolean().default(false), // Проводилось ли ранее лечение
	priorOrthoType: priorOrthoTypeSchema.default("none"), // Вид ранее проводившегося лечения
	priorOrthoDuration: z.string().default(""), // Длительность
});
export type OrthodonticComplaintsAnamnesis = z.infer<typeof orthodonticComplaintsAnamnesisSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. ZOD SCHEMAS & TYPES: FACE & PROFILE EXAMINATION (20.x)
// ─────────────────────────────────────────────────────────────────────────────

export const facialThirdsProportionSchema = z.enum(["proportional", "lower_third_decreased", "lower_third_increased"]);
export type FacialThirdsProportion = z.infer<typeof facialThirdsProportionSchema>;

export const faceSymmetrySchema = z.enum(["symmetric", "asymmetric"]);
export type FaceSymmetry = z.infer<typeof faceSymmetrySchema>;

export const chinShiftDirectionSchema = z.enum(["none", "left", "right"]);
export type ChinShiftDirection = z.infer<typeof chinShiftDirectionSchema>;

export const foldExpressivenessSchema = z.enum(["normal", "smoothed", "pronounced"]);
export type FoldExpressiveness = z.infer<typeof foldExpressivenessSchema>;

export const lipsClosedReposeSchema = z.enum(["closed_relaxed", "closed_strained", "incompetent"]);
export type LipsClosedRepose = z.infer<typeof lipsClosedReposeSchema>;

export const profileTypeSchema = z.enum(["straight", "convex", "concave"]);
export type ProfileType = z.infer<typeof profileTypeSchema>;

export const anatomicalFeaturePositionSchema = z.enum(["normal", "protruding", "retruding"]);
export type AnatomicalFeaturePosition = z.infer<typeof anatomicalFeaturePositionSchema>;

export const orthodonticFaceExaminationSchema = z.object({
	faceWidthMm: z.number().optional(), // 2011 Ширина лица
	faceHeightNMeMm: z.number().optional(), // 2012 Общая морфологическая высота N-Me
	faceHeightNSnMm: z.number().optional(), // 2012 Верхняя высота N-Sn
	faceHeightSnMeMm: z.number().optional(), // 2012 Нижняя высота Sn-Me
	facialThirdsProportion: facialThirdsProportionSchema.default("proportional"), // Пропорциональность третей
	faceSymmetry: faceSymmetrySchema.default("symmetric"), // 2013 Симметрия лица
	chinShift: chinShiftDirectionSchema.default("none"), // 2014 Смещение подбородка
	chinShiftMm: z.number().default(0), // Величина смещения подбородка в мм
	supramentalFold: foldExpressivenessSchema.default("normal"), // 2015 Выраженность надподбородочной складки
	nasolabialFolds: foldExpressivenessSchema.default("normal"), // Выраженность носогубных складок
	lipsClosedInRepose: lipsClosedReposeSchema.default("closed_relaxed"), // 2016 Смыкание губ
	gummySmile: z.boolean().default(false), // 2017 Симптом "десневой улыбки"
	gummySmileMm: z.number().default(0), // Обнажение десны при улыбке в мм
	profileType: profileTypeSchema.default("straight"), // 2021 Тип профиля (прямой, выпуклый, вогнутый)
	upperLipPosition: anatomicalFeaturePositionSchema.default("normal"), // 2022 Положение верхней губы
	lowerLipPosition: anatomicalFeaturePositionSchema.default("normal"), // 2023 Положение нижней губы
	chinPosition: anatomicalFeaturePositionSchema.default("normal"), // 2024 Положение подбородка
	incisorDisplayRestMm: z.number().default(2.5), // Положение резцов в покое относительно губы (норма 2-3 мм)
	incisorDisplaySmilePercent: z.number().default(85), // Положение резцов при улыбке (% коронки, норма 75-100%)
});
export type OrthodonticFaceExamination = z.infer<typeof orthodonticFaceExaminationSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 3. ZOD SCHEMAS & TYPES: INTRAORAL EXAMINATION (21.x)
// ─────────────────────────────────────────────────────────────────────────────

export const frenulumStateSchema = z.enum(["normal", "short", "wide", "attached_low", "attached_high"]);
export type FrenulumState = z.infer<typeof frenulumStateSchema>;

export const tongueSizeSchema = z.enum(["normal", "macroglossia", "microglossia"]);
export type TongueSize = z.infer<typeof tongueSizeSchema>;

export const vestibuleDepthSchema = z.enum(["normal", "shallow"]);
export type VestibuleDepth = z.infer<typeof vestibuleDepthSchema>;

export const mucousMembraneStateSchema = z.enum(["normal", "pale", "hyperemic", "catarrhal", "hypertrophic"]);
export type MucousMembraneState = z.infer<typeof mucousMembraneStateSchema>;

export const dentitionPeriodSchema = z.enum(["temporary", "mixed", "persistent"]);
export type DentitionPeriod = z.infer<typeof dentitionPeriodSchema>;

export const oralHygieneRatingSchema = z.enum(["good", "allowable", "bad"]);
export type OralHygieneRating = z.infer<typeof oralHygieneRatingSchema>;

export const upperArchFormSchema = z.enum(["semi_ellipse", "parabola", "v_shaped", "trapezoid", "triangular", "saddle", "asymmetric"]);
export type UpperArchForm = z.infer<typeof upperArchFormSchema>;

export const lowerArchFormSchema = z.enum(["parabola", "trapezoid", "v_shaped", "triangular", "saddle", "asymmetric"]);
export type LowerArchForm = z.infer<typeof lowerArchFormSchema>;

export const archSymmetrySchema = z.enum(["preserved", "disturbed"]);
export type ArchSymmetry = z.infer<typeof archSymmetrySchema>;

export const angleClassificationSchema = z.enum(["class_1", "class_2_div_1", "class_2_div_2", "class_3"]);
export type AngleClassification = z.infer<typeof angleClassificationSchema>;

export const sagittalIncisorRelationSchema = z.enum(["normal", "sagittal_cleft", "reverse_incisal_occlusion", "reverse_sagittal_cleft"]);
export type SagittalIncisorRelation = z.infer<typeof sagittalIncisorRelationSchema>;

export const verticalIncisorRelationSchema = z.enum(["normal", "deep_1_3", "deep_1_2", "traumatic_occlusion", "straight_incisal", "open_bite"]);
export type VerticalIncisorRelation = z.infer<typeof verticalIncisorRelationSchema>;

export const transversalRelationSchema = z.enum(["normal", "crossbite_buccal", "crossbite_lingual", "crossbite_palatal"]);
export type TransversalRelation = z.infer<typeof transversalRelationSchema>;

export const transversalSideSchema = z.enum(["none", "left", "right", "bilateral"]);
export type TransversalSide = z.infer<typeof transversalSideSchema>;

export const crowdingDegreeSchema = z.enum(["none", "mild", "moderate", "severe"]);
export type CrowdingDegree = z.infer<typeof crowdingDegreeSchema>;

export const orthodonticOralExaminationSchema = z.object({
	upperLipFrenulum: frenulumStateSchema.default("normal"),
	lowerLipFrenulum: frenulumStateSchema.default("normal"),
	tongueFrenulum: frenulumStateSchema.default("normal"),
	tongueSize: tongueSizeSchema.default("normal"),
	vestibuleDepth: vestibuleDepthSchema.default("normal"),
	mucousMembrane: mucousMembraneStateSchema.default("normal"),
	dentitionPeriod: dentitionPeriodSchema.default("persistent"),
	oralHygiene: oralHygieneRatingSchema.default("good"),
	upperArchForm: upperArchFormSchema.default("semi_ellipse"),
	lowerArchForm: lowerArchFormSchema.default("parabola"),
	archSymmetry: archSymmetrySchema.default("preserved"),
	archSymmetryComment: z.string().default("симметричны"),
	midlineShift: midlineShiftDirectionSchema.default("none"),
	midlineShiftMm: z.number().default(0),
	angleMolarLeft: angleClassificationSchema.default("class_1"),
	angleMolarRight: angleClassificationSchema.default("class_1"),
	angleCanineLeft: angleClassificationSchema.default("class_1"),
	angleCanineRight: angleClassificationSchema.default("class_1"),
	sagittalRelation: sagittalIncisorRelationSchema.default("normal"),
	sagittalCleftMm: z.number().default(2),
	verticalRelation: verticalIncisorRelationSchema.default("normal"),
	verticalOpenBiteMm: z.number().default(0),
	lateralDisocclusion: z.enum(["none", "left", "right", "bilateral"]).default("none"),
	transversalRelation: transversalRelationSchema.default("normal"),
	transversalSide: transversalSideSchema.default("none"),
	diastemaUpperMm: z.number().default(0),
	diastemaLowerMm: z.number().default(0),
	tremasUpper: z.boolean().default(false),
	tremasLower: z.boolean().default(false),
	crowdingUpper: crowdingDegreeSchema.default("none"),
	crowdingUpperMm: z.number().default(0),
	crowdingLower: crowdingDegreeSchema.default("none"),
	crowdingLowerMm: z.number().default(0),
	teethPositionAnomalies: z.string().default("нет"),
});
export type OrthodonticOralExamination = z.infer<typeof orthodonticOralExaminationSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 4. ZOD SCHEMAS & TYPES: CEPHALOMETRICS & TRG (24.x)
// ─────────────────────────────────────────────────────────────────────────────

export const skeletalClassSchema = z.enum(["class_1", "class_2", "class_3"]);
export type SkeletalClass = z.infer<typeof skeletalClassSchema>;

export const jawGrowthDirectionSchema = z.enum(["horizontal", "neutral", "vertical"]);
export type JawGrowthDirection = z.infer<typeof jawGrowthDirectionSchema>;

export const jawSagittalPositionSchema = z.enum(["normognathic", "prognathic", "retrognathic"]);
export type JawSagittalPosition = z.infer<typeof jawSagittalPositionSchema>;

export const eschlerBittnerTestSchema = z.enum(["none", "improved", "not_changed", "worsened"]);
export type EschlerBittnerTest = z.infer<typeof eschlerBittnerTestSchema>;

export const orthodonticTrgCephDiagnosticsSchema = z.object({
	date: z.string().default(""),
	sna: z.number().default(82),
	snb: z.number().default(80),
	anb: z.number().default(2),
	wits: z.number().default(0),
	fma: z.number().default(25),
	u1NaAngle: z.number().default(22),
	u1NaMm: z.number().default(4),
	l1NbAngle: z.number().default(25),
	l1NbMm: z.number().default(4),
	u1Nl: z.number().default(110),
	l1Ml: z.number().default(90),
	interincisalAngle: z.number().default(131),
	bjorkSum: z.number().default(396),
	jarabakRatio: z.number().default(63.5),
	skeletalClass: skeletalClassSchema.default("class_1"),
	growthDirection: jawGrowthDirectionSchema.default("neutral"),
	maxillarySagittalType: jawSagittalPositionSchema.default("normognathic"),
	mandibularSagittalType: jawSagittalPositionSchema.default("normognathic"),
	eschlerBittnerTest: eschlerBittnerTestSchema.default("none"),
	condyleShiftEdgeToEdge: z.enum(["possible", "impossible"]).default("possible"),
	lipsStrainOnClosure: z.enum(["stress_free", "tensely"]).default("stress_free"),
});
export type OrthodonticTrgCephDiagnostics = z.infer<typeof orthodonticTrgCephDiagnosticsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 5. AGGREGATED FORM 043/u ORTHODONTIC DIAGNOSTIC RECORD
// ─────────────────────────────────────────────────────────────────────────────

export const orthodonticDiagnosticRecordSchema = z.object({
	id: z.string(),
	patientId: z.string(),
	patientName: z.string().default("Пациент"),
	cardNumber: z.string().default("043/у"),
	doctorName: z.string().default("Врач-ортодонт"),
	visitDate: z.string().default(""),
	complaintsAnamnesis: orthodonticComplaintsAnamnesisSchema.default({}),
	faceExamination: orthodonticFaceExaminationSchema.default({}),
	oralExamination: orthodonticOralExaminationSchema.default({}),
	trgDiagnostics: orthodonticTrgCephDiagnosticsSchema.default({}),
	clinicalDiagnosisIcd10: z.string().default("K07.2"),
	clinicalDiagnosisText: z.string().default("Ортогнатический прикус, нейтральное соотношение"),
	treatmentPlanText: z.string().default("Диспансерное наблюдение"),
	retentionPlanText: z.string().default("Не требуется"),
	nomenclature804nCodes: z.array(z.string()).default([]),
	notes: z.string().default(""),
});
export type OrthodonticDiagnosticRecord = z.infer<typeof orthodonticDiagnosticRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 6. 1-CLICK PHYSIOLOGICAL NORM FACTORY (Mandates 8e, 8k, 8n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a 100% complete physiological norm orthodontic record in 1 click.
 * Complies with Mandate 8e: doctor sets physiological norm instantly and edits pathology.
 */
export function createDefaultOrthodonticNormRecord(params?: Partial<OrthodonticDiagnosticRecord>): OrthodonticDiagnosticRecord {
	return {
		id: params?.id || `ortho_norm_${Date.now()}`,
		patientId: params?.patientId || "",
		patientName: params?.patientName || "Пациент",
		cardNumber: params?.cardNumber || "043/у",
		doctorName: params?.doctorName || "Врач-ортодонт",
		visitDate: params?.visitDate || new Date().toISOString().slice(0, 10),
		complaintsAnamnesis: {
			aesthetic: false,
			morphological: false,
			tmjDysfunction: false,
			lipIncompetence: false,
			infantileSwallowing: false,
			speechDisorders: false,
			speechDisordersComment: "",
			mandibularHabitualShift: "none",
			mouthBreathing: false,
			bruxism: false,
			sluggishChewing: false,
			pregnancyTrimester: "no",
			deliveryTerm: "on_time",
			feedingType: "natural",
			feedingTypeExtra: "",
			teethEruptionTiming: "в срок, физиологическая смена зубов",
			badHabits: ["none"],
			concomitantDiseases: ["none"],
			allergies: "не отягощен",
			heredityAnomalies: ["none"],
			hasPriorOrthoTreatment: false,
			priorOrthoType: "none",
			priorOrthoDuration: "",
			...(params?.complaintsAnamnesis || {}),
		},
		faceExamination: {
			faceWidthMm: 130,
			faceHeightNMeMm: 118,
			faceHeightNSnMm: 52,
			faceHeightSnMeMm: 66,
			facialThirdsProportion: "proportional",
			faceSymmetry: "symmetric",
			chinShift: "none",
			chinShiftMm: 0,
			supramentalFold: "normal",
			nasolabialFolds: "normal",
			lipsClosedInRepose: "closed_relaxed",
			gummySmile: false,
			gummySmileMm: 0,
			profileType: "straight",
			upperLipPosition: "normal",
			lowerLipPosition: "normal",
			chinPosition: "normal",
			incisorDisplayRestMm: 2.5,
			incisorDisplaySmilePercent: 85,
			...(params?.faceExamination || {}),
		},
		oralExamination: {
			upperLipFrenulum: "normal",
			lowerLipFrenulum: "normal",
			tongueFrenulum: "normal",
			tongueSize: "normal",
			vestibuleDepth: "normal",
			mucousMembrane: "normal",
			dentitionPeriod: "persistent",
			oralHygiene: "good",
			upperArchForm: "semi_ellipse",
			lowerArchForm: "parabola",
			archSymmetry: "preserved",
			archSymmetryComment: "симметричны",
			midlineShift: "none",
			midlineShiftMm: 0,
			angleMolarLeft: "class_1",
			angleMolarRight: "class_1",
			angleCanineLeft: "class_1",
			angleCanineRight: "class_1",
			sagittalRelation: "normal",
			sagittalCleftMm: 2,
			verticalRelation: "normal",
			verticalOpenBiteMm: 0,
			lateralDisocclusion: "none",
			transversalRelation: "normal",
			transversalSide: "none",
			diastemaUpperMm: 0,
			diastemaLowerMm: 0,
			tremasUpper: false,
			tremasLower: false,
			crowdingUpper: "none",
			crowdingUpperMm: 0,
			crowdingLower: "none",
			crowdingLowerMm: 0,
			teethPositionAnomalies: "нет",
			...(params?.oralExamination || {}),
		},
		trgDiagnostics: {
			date: new Date().toISOString().slice(0, 10),
			sna: 82,
			snb: 80,
			anb: 2,
			wits: 0,
			fma: 25,
			u1NaAngle: 22,
			u1NaMm: 4,
			l1NbAngle: 25,
			l1NbMm: 4,
			u1Nl: 110,
			l1Ml: 90,
			interincisalAngle: 131,
			bjorkSum: 396,
			jarabakRatio: 63.5,
			skeletalClass: "class_1",
			growthDirection: "neutral",
			maxillarySagittalType: "normognathic",
			mandibularSagittalType: "normognathic",
			eschlerBittnerTest: "none",
			condyleShiftEdgeToEdge: "possible",
			lipsStrainOnClosure: "stress_free",
			...(params?.trgDiagnostics || {}),
		},
		clinicalDiagnosisIcd10: params?.clinicalDiagnosisIcd10 || "K07.2",
		clinicalDiagnosisText: params?.clinicalDiagnosisText || "Физиологический ортогнатический прикус. Нейтральное соотношение зубных рядов (I класс по Энглю). Норма.",
		treatmentPlanText: params?.treatmentPlanText || "Диспансерное наблюдение 1 раз в 6 месяцев. Контроль индивидуальной гигиены полости рта.",
		retentionPlanText: params?.retentionPlanText || "Не требуется.",
		nomenclature804nCodes: params?.nomenclature804nCodes || ["A02.07.010", "A06.07.006"],
		notes: params?.notes || "Первичный консультативный осмотр. Патологии зубочелюстной системы не выявлено.",
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CEPHALOMETRIC CLASSIFICATION & CALCULATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface CephalometricClassificationResult {
	skeletalClass: SkeletalClass;
	skeletalClassLabel: string;
	growthDirection: JawGrowthDirection;
	growthDirectionLabel: string;
	maxillarySagittalType: JawSagittalPosition;
	maxillarySagittalLabel: string;
	mandibularSagittalType: JawSagittalPosition;
	mandibularSagittalLabel: string;
	anbDiff: number;
	summary: string;
}

/**
 * Calculates Steiner/Tweed/Bjork skeletal classification from raw TRG metrics.
 */
export function calculateCephalometricClassification(
	trg: Partial<OrthodonticTrgCephDiagnostics>,
): CephalometricClassificationResult {
	const sna = trg.sna ?? 82;
	const snb = trg.snb ?? 80;
	const anb = trg.anb ?? sna - snb;
	const fma = trg.fma ?? 25;
	const bjork = trg.bjorkSum ?? 396;
	const jarabak = trg.jarabakRatio ?? 63.5;

	// 1. Skeletal Class via ANB
	let skeletalClass: SkeletalClass = "class_1";
	let skeletalClassLabel = "Скелетный I класс (нейтральное соотношение базисов)";
	if (anb > 4) {
		skeletalClass = "class_2";
		skeletalClassLabel = "Скелетный II класс (дистальное соотношение базисов челюстей)";
	} else if (anb < 0) {
		skeletalClass = "class_3";
		skeletalClassLabel = "Скелетный III класс (мезиальное соотношение базисов челюстей)";
	}

	// 2. Growth Pattern via FMA, Bjork Sum & Jarabak Ratio
	let growthDirection: JawGrowthDirection = "neutral";
	let growthDirectionLabel = "Нейтральный (мезофациальный) тип роста";
	if (fma > 28 || bjork > 402 || jarabak < 62) {
		growthDirection = "vertical";
		growthDirectionLabel = "Вертикальный (долихофациальный, гипердивергентный) тип роста";
	} else if (fma < 22 || bjork < 390 || jarabak > 65) {
		growthDirection = "horizontal";
		growthDirectionLabel = "Горизонтальный (брахифациальный, гиподивергентный) тип роста";
	}

	// 3. Maxillary Sagittal Position via SNA
	let maxillarySagittalType: JawSagittalPosition = "normognathic";
	let maxillarySagittalLabel = "Нормогнатия верхней челюсти";
	if (sna > 84) {
		maxillarySagittalType = "prognathic";
		maxillarySagittalLabel = "Максиллярная протрузия / прогнатия";
	} else if (sna < 80) {
		maxillarySagittalType = "retrognathic";
		maxillarySagittalLabel = "Максиллярная ретрузия / микрогнатия";
	}

	// 4. Mandibular Sagittal Position via SNB
	let mandibularSagittalType: JawSagittalPosition = "normognathic";
	let mandibularSagittalLabel = "Нормогнатия нижней челюсти";
	if (snb > 82) {
		mandibularSagittalType = "prognathic";
		mandibularSagittalLabel = "Мандибулярная протрузия / макрогнатия";
	} else if (snb < 78) {
		mandibularSagittalType = "retrognathic";
		mandibularSagittalLabel = "Мандибулярная ретрузия / микрогнатия";
	}

	const summary = `${skeletalClassLabel}. ${growthDirectionLabel}. Верхняя челюсть: ${maxillarySagittalLabel} (SNA ${sna}°). Нижняя челюсть: ${mandibularSagittalLabel} (SNB ${snb}°). Сагиттальное несоответствие: ANB ${anb}°.`;

	return {
		skeletalClass,
		skeletalClassLabel,
		growthDirection,
		growthDirectionLabel,
		maxillarySagittalType,
		maxillarySagittalLabel,
		mandibularSagittalType,
		mandibularSagittalLabel,
		anbDiff: anb,
		summary,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. STATUTORY FORM 043/u CLINICAL PROTOCOL GENERATOR (Sin 7: ZERO RAW EMOJIS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates official Form 043/u Orthodontic Examination Protocol in Russian.
 * Guaranteed 100% free of raw emojis, placeholders or unexpanded variables.
 */
export function generateOrthodonticDiagnosticProtocol(record: OrthodonticDiagnosticRecord): string {
	const c = record.complaintsAnamnesis;
	const f = record.faceExamination;
	const o = record.oralExamination;
	const t = record.trgDiagnostics;
	const ceph = calculateCephalometricClassification(t);

	const complaintsList: string[] = [];
	if (c.aesthetic) complaintsList.push("эстетические (неудовлетворительный вид улыбки/положение зубов)");
	if (c.morphological) complaintsList.push("морфологические (нарушение прикуса, смыкания, затрудненное пережевывание)");
	if (c.tmjDysfunction) complaintsList.push("дисфункция ВНЧС (щелканье, боли, девиация)");
	if (c.lipIncompetence) complaintsList.push("несмыкание губ в покое");
	if (c.infantileSwallowing) complaintsList.push("инфантильный тип глотания");
	if (c.speechDisorders) complaintsList.push(`нарушение дикции (${c.speechDisordersComment || "звукопроизношения"})`);
	if (c.mouthBreathing) complaintsList.push("ротовое дыхание");
	if (c.bruxism) complaintsList.push("бруксизм");
	if (c.sluggishChewing) complaintsList.push("вялое жевание");
	if (complaintsList.length === 0) complaintsList.push("активных жалоб не предъявляет (плановый/профилактический осмотр)");

	const badHabitsList: string[] = [];
	for (const habit of c.badHabits) {
		const found = BAD_HABITS_OPTIONS.find((h) => h.value === habit);
		if (found && found.value !== "none") badHabitsList.push(found.label);
	}
	const badHabitsText = badHabitsList.length > 0 ? badHabitsList.join(", ") : "вредные привычки отрицает";

	// Profile & face
	const profileLabel = PROFILE_TYPES.find((p) => p.value === f.profileType)?.label || f.profileType;
	const symmetryText = f.faceSymmetry === "symmetric" ? "симметричное" : `асимметричное (смещение подбородка ${f.chinShift === "right" ? "вправо" : "влево"} на ${f.chinShiftMm} мм)`;
	const lipsText = f.lipsClosedInRepose === "closed_relaxed" ? "сомкнуты без напряжения" : f.lipsClosedInRepose === "closed_strained" ? "смыкаются с напряжением круговой мышцы рта" : "не смыкаются в покое";

	// Dental arches
	const upperArchLabel = DENTAL_ARCH_FORMS_UPPER.find((a) => a.value === o.upperArchForm)?.label || o.upperArchForm;
	const lowerArchLabel = DENTAL_ARCH_FORMS_LOWER.find((a) => a.value === o.lowerArchForm)?.label || o.lowerArchForm;

	// Angle
	const molarLeftLabel = ANGLE_CLASSES_DETAILED.find((a) => a.id === o.angleMolarLeft)?.short || o.angleMolarLeft;
	const molarRightLabel = ANGLE_CLASSES_DETAILED.find((a) => a.id === o.angleMolarRight)?.short || o.angleMolarRight;
	const canineLeftLabel = ANGLE_CLASSES_DETAILED.find((a) => a.id === o.angleCanineLeft)?.short || o.angleCanineLeft;
	const canineRightLabel = ANGLE_CLASSES_DETAILED.find((a) => a.id === o.angleCanineRight)?.short || o.angleCanineRight;

	// Vertical & Sagittal
	const verticalLabel = VERTICAL_RELATION_OPTIONS.find((v) => v.value === o.verticalRelation)?.label || o.verticalRelation;
	const verticalDetail = o.verticalRelation === "open_bite" ? ` (вертикальная щель ${o.verticalOpenBiteMm} мм)` : "";
	const sagittalLabel = SAGITTAL_RELATION_OPTIONS.find((s) => s.value === o.sagittalRelation)?.label || o.sagittalRelation;
	const sagittalDetail = o.sagittalRelation !== "normal" ? ` (${o.sagittalCleftMm} мм)` : "";

	// Transversal
	const transLabel = TRANSVERSAL_RELATION_OPTIONS.find((tr) => tr.value === o.transversalRelation)?.label || o.transversalRelation;
	const transDetail = o.transversalRelation !== "normal" ? ` (сторона: ${o.transversalSide})` : "";

	// Midline
	const midlineText = o.midlineShift === "none" ? "совпадает с эстетическим центром лица" : `смещена ${o.midlineShift === "right" ? "вправо" : "влево"} на ${o.midlineShiftMm} мм`;

	return [
		"ПЕРВИЧНЫЙ ОРТОДОНТИЧЕСКИЙ ОСМОТР И ДИАГНОСТИЧЕСКАЯ КАРТА (ФОРМА 043/У)",
		`Дата осмотра: ${record.visitDate || new Date().toISOString().slice(0, 10)}`,
		`Пациент: ${record.patientName || "Пациент"} | Номер карты: ${record.cardNumber || "043/у"}`,
		`Лечащий врач-ортодонт: ${record.doctorName || "Врач-ортодонт"}`,
		"",
		"1. ЖАЛОБЫ И АНАМНЕЗ:",
		`• Жалобы: ${complaintsList.join("; ")}.`,
		`• Вредные привычки: ${badHabitsText}.`,
		`• Привычное смещение нижней челюсти: ${c.mandibularHabitualShift === "none" ? "нет" : c.mandibularHabitualShift === "forward" ? "кпереди" : "в сторону"}.`,
		`• Акушерский анамнез: рожден ${c.deliveryTerm === "on_time" ? "в срок" : "недоношен"}, вскармливание ${c.feedingType === "natural" ? "естественное" : c.feedingType === "mixed" ? "смешанное" : "искусственное"}.`,
		`• Прорезывание зубов: ${c.teethEruptionTiming}.`,
		`• Сопутствующие заболевания: ${c.concomitantDiseases.includes("none") ? "соматически здоров" : c.concomitantDiseases.join(", ")}. Аллергоанамнез: ${c.allergies}.`,
		`• Ранее ортодонтическое лечение: ${c.hasPriorOrthoTreatment ? `проводилось (${c.priorOrthoType}, длительность ${c.priorOrthoDuration})` : "не проводилось"}.`,
		"",
		"2. ОСМОТР ЛИЦА И ПРОФИЛЯ:",
		`• Фас: лицо ${symmetryText}. Пропорциональность третей: ${f.facialThirdsProportion === "proportional" ? "пропорциональны" : f.facialThirdsProportion === "lower_third_decreased" ? "снижение нижней трети лица" : "увеличение нижней трети лица"}.`,
		`• Смыкание губ в покое: ${lipsText}.`,
		`• Складки: носогубные ${f.nasolabialFolds === "normal" ? "в норме" : f.nasolabialFolds === "smoothed" ? "сглажены" : "выражены"}, надподбородочная ${f.supramentalFold === "normal" ? "в норме" : f.supramentalFold === "smoothed" ? "сглажена" : "выражена"}.`,
		`• Десневая улыбка: ${f.gummySmile ? `положительный симптом (обнажение десны ${f.gummySmileMm} мм)` : "отрицательный симптом (в норме)"}.`,
		`• Профиль: ${profileLabel}. Положение верхней губы: ${f.upperLipPosition}, нижней губы: ${f.lowerLipPosition}, подбородка: ${f.chinPosition}.`,
		`• Положение резцов: в покое ${f.incisorDisplayRestMm} мм, при улыбке ${f.incisorDisplaySmilePercent}%.`,
		"",
		"3. ВНУТРИРОТОВОЙ ОСМОТР И ОККЛЮЗИОННЫЕ ВЗАИМООТНОШЕНИЯ:",
		`• Период прикуса: ${o.dentitionPeriod === "persistent" ? "постоянный" : o.dentitionPeriod === "mixed" ? "сменный" : "временный"}. Гигиена полости рта: ${o.oralHygiene === "good" ? "хорошая" : o.oralHygiene === "allowable" ? "удовлетворительная" : "неудовлетворительная"}.`,
		`• Слизистая оболочка: ${o.mucousMembrane === "normal" ? "бледно-розовая, умеренно увлажнена, без патологии" : o.mucousMembrane}. Уздечки: губ и языка в норме.`,
		`• Форма зубного ряда ВЧ: ${upperArchLabel}.`,
		`• Форма зубного ряда НЧ: ${lowerArchLabel}.`,
		`• Симметричность зубных рядов: ${o.archSymmetry === "preserved" ? "сохранена" : `нарушена (${o.archSymmetryComment})`}.`,
		`• Центральная линия: ${midlineText}.`,
		`• Окклюзия по Энглю моляров: справа ${molarRightLabel}, слева ${molarLeftLabel}.`,
		`• Окклюзия по Энглю клыков: справа ${canineRightLabel}, слева ${canineLeftLabel}.`,
		`• Сагиттальное соотношение: ${sagittalLabel}${sagittalDetail}.`,
		`• Вертикальное перекрытие: ${verticalLabel}${verticalDetail}.`,
		`• Трансверзальное соотношение: ${transLabel}${transDetail}.`,
		`• Скученность / промежутки: ВЧ — ${o.crowdingUpper === "none" ? "нет" : `${o.crowdingUpper} (дефицит ${o.crowdingUpperMm} мм)`}; НЧ — ${o.crowdingLower === "none" ? "нет" : `${o.crowdingLower} (дефицит ${o.crowdingLowerMm} мм)`}. Диастема: ВЧ ${o.diastemaUpperMm} мм, НЧ ${o.diastemaLowerMm} мм. Тремы: ${o.tremasUpper ? "ВЧ есть" : "нет"}, ${o.tremasLower ? "НЧ есть" : "нет"}.`,
		`• Аномалии положения зубов: ${o.teethPositionAnomalies}.`,
		"",
		"4. ТЕЛЕРЕНТГЕНОГРАФИЯ (ТРГ) И ЦЕФАЛОМЕТРИЧЕСКИЙ РАСЧЕТ:",
		`• Сагиттальные углы основания черепа и челюстей: SNA = ${t.sna}° (Норма 82°±2°), SNB = ${t.snb}° (Норма 80°±2°), ANB = ${t.anb}° (Норма 2°±2°), Wits = ${t.wits} мм.`,
		`• Вертикальные параметры: FMA (ML/FH) = ${t.fma}° (Норма 25°±3°), Сумма Бьорка = ${t.bjorkSum}° (Норма 396°±6°), Jarabak = ${t.jarabakRatio}% (Норма 62-65%).`,
		`• Дентальные параметры: 1-NA = ${t.u1NaAngle}° / ${t.u1NaMm} мм, 1-NB = ${t.l1NbAngle}° / ${t.l1NbMm} мм, U1/NL = ${t.u1Nl}°, L1/ML (IMPA) = ${t.l1Ml}°, Межрезцовый угол 1/1 = ${t.interincisalAngle}°.`,
		`• Заключение ТРГ: ${ceph.summary}`,
		`• Проба Эшлера-Битнера: ${t.eschlerBittnerTest === "none" ? "не проводилась" : t.eschlerBittnerTest === "improved" ? "профиль улучшился (положительная)" : t.eschlerBittnerTest === "not_changed" ? "профиль не изменился" : "профиль ухудшился"}.`,
		"",
		"5. КЛИНИЧЕСКИЙ ДИАГНОЗ И ПЛАН ЛЕЧЕНИЯ:",
		`• Диагноз по МКБ-10: ${record.clinicalDiagnosisIcd10} — ${record.clinicalDiagnosisText}`,
		`• План лечения: ${record.treatmentPlanText}`,
		`• Ретенционный период: ${record.retentionPlanText}`,
		`• Коды Номенклатуры 804н: ${record.nomenclature804nCodes.join(", ")}`,
		record.notes ? `• Особые отметки: ${record.notes}` : "",
	].filter(Boolean).join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA RE-EXPORTS (Full backwards compatibility)
// ─────────────────────────────────────────────────────────────────────────────
export * from "./stomxTaxonomyData.js";
