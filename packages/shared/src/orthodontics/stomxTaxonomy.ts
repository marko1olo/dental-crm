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
 */

import { z } from "zod";
import {
	type AngleClass,
	type MidlineShiftDirection,
	midlineShiftDirectionSchema,
} from "../diagnostics/photoProtocolEngine.js";

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

export const facialThirdsProportionSchema = z.enum([
	"proportional",
	"lower_third_decreased",
	"lower_third_increased",
]);
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

export const mucousMembraneStateSchema = z.enum([
	"normal",
	"hyperemic",
	"swollen",
	"aphthae_ulcers",
	"hypertrophied",
]);
export type MucousMembraneState = z.infer<typeof mucousMembraneStateSchema>;

export const dentitionPeriodSchema = z.enum(["temporary", "mixed", "persistent"]);
export type DentitionPeriod = z.infer<typeof dentitionPeriodSchema>;

export const oralHygieneRatingSchema = z.enum(["good", "allowable", "bad"]);
export type OralHygieneRating = z.infer<typeof oralHygieneRatingSchema>;

export const upperArchFormSchema = z.enum([
	"semi_ellipse", // Норма для постоянного прикуса ВЧ (полуэллипс)
	"parabola",
	"trapezoid",
	"v_shaped",
	"triangular",
	"saddle",
	"asymmetric",
]);
export type UpperArchForm = z.infer<typeof upperArchFormSchema>;

export const lowerArchFormSchema = z.enum([
	"parabola", // Норма для постоянного прикуса НЧ (парабола)
	"trapezoid",
	"v_shaped",
	"triangular",
	"saddle",
	"asymmetric",
]);
export type LowerArchForm = z.infer<typeof lowerArchFormSchema>;

export const archSymmetrySchema = z.enum(["preserved", "disturbed"]);
export type ArchSymmetry = z.infer<typeof archSymmetrySchema>;


export const angleClassificationSchema = z.enum([
	"class_1",
	"class_2_div_1",
	"class_2_div_2",
	"class_3",
]);
export type AngleClassification = z.infer<typeof angleClassificationSchema>;

export const sagittalIncisorRelationSchema = z.enum([
	"normal", // Физиологическое перекрытие 1-2 мм
	"sagittal_cleft", // Сагиттальная щель (протрузия ВЧ / оверджет)
	"reverse_incisal_occlusion", // Обратная резцовая окклюзия
	"reverse_sagittal_cleft", // Обратная сагиттальная щель
]);
export type SagittalIncisorRelation = z.infer<typeof sagittalIncisorRelationSchema>;

export const verticalIncisorRelationSchema = z.enum([
	"normal", // 1/3 высоты коронки
	"deep_1_3", // Глубокое перекрытие >1/3
	"deep_1_2", // Глубокое перекрытие >1/2
	"traumatic_occlusion", // Травмирующий глубокий прикус
	"straight_incisal", // Прямой прикус (edge-to-edge)
	"open_bite", // Вертикальная резцовая дизокклюзия (открытый прикус)
]);
export type VerticalIncisorRelation = z.infer<typeof verticalIncisorRelationSchema>;

export const transversalRelationSchema = z.enum([
	"normal",
	"crossbite_buccal", // Буккальный перекрестный (вестибулоокклюзия)
	"crossbite_lingual", // Лингвальный перекрестный (лингвоокклюзия)
	"crossbite_palatal", // Палатоокклюзия
]);
export type TransversalRelation = z.infer<typeof transversalRelationSchema>;

export const transversalSideSchema = z.enum(["none", "left", "right", "bilateral"]);
export type TransversalSide = z.infer<typeof transversalSideSchema>;

export const crowdingDegreeSchema = z.enum(["none", "mild", "moderate", "severe"]);
export type CrowdingDegree = z.infer<typeof crowdingDegreeSchema>;

export const orthodonticOralExaminationSchema = z.object({
	upperLipFrenulum: frenulumStateSchema.default("normal"), // 2111 Уздечка верхней губы
	lowerLipFrenulum: frenulumStateSchema.default("normal"), // 2112 Уздечка нижней губы
	tongueFrenulum: frenulumStateSchema.default("normal"), // 2113 Уздечка языка
	tongueSize: tongueSizeSchema.default("normal"), // 2114 Язык
	vestibuleDepth: vestibuleDepthSchema.default("normal"), // 2115 Преддверие рта
	mucousMembrane: mucousMembraneStateSchema.default("normal"), // 2116 Слизистая оболочка
	dentitionPeriod: dentitionPeriodSchema.default("persistent"), // 2121 Прикус (временный/сменный/постоянный)
	oralHygiene: oralHygieneRatingSchema.default("good"), // 2122 Гигиена полости рта
	upperArchForm: upperArchFormSchema.default("semi_ellipse"), // 2132 Форма верхнего зубного ряда
	lowerArchForm: lowerArchFormSchema.default("parabola"), // 2132 Форма нижнего зубного ряда
	archSymmetry: archSymmetrySchema.default("preserved"), // 2135 Симметричность зубных рядов
	archSymmetryComment: z.string().default(""), // Комментарий по симметрии
	midlineShift: midlineShiftDirectionSchema.default("none"), // 21431 Смещение косметического центра
	midlineShiftMm: z.number().default(0), // Величина смещения в мм
	angleMolarLeft: angleClassificationSchema.default("class_1"), // 21411 Моляры слева
	angleMolarRight: angleClassificationSchema.default("class_1"), // 21411 Моляры справа
	angleCanineLeft: angleClassificationSchema.default("class_1"), // 21412 Клыки слева
	angleCanineRight: angleClassificationSchema.default("class_1"), // 21412 Клыки справа
	sagittalRelation: sagittalIncisorRelationSchema.default("normal"), // 21413 Сагиттальное смыкание резцов
	sagittalCleftMm: z.number().default(2), // Сагиттальная щель в мм (норма 1.5-2 мм)
	verticalRelation: verticalIncisorRelationSchema.default("normal"), // 21421 Вертикальное резцовое соотношение
	verticalOpenBiteMm: z.number().default(0), // Вертикальная щель при открытом прикусе в мм
	lateralDisocclusion: z.enum(["none", "left", "right", "bilateral"]).default("none"), // 21422 Боковая дизокклюзия
	transversalRelation: transversalRelationSchema.default("normal"), // 21432 Трансверзальные соотношения
	transversalSide: transversalSideSchema.default("none"), // Сторона перекрестного прикуса
	diastemaUpperMm: z.number().default(0), // 21331 Диастема ВЧ в мм
	diastemaLowerMm: z.number().default(0), // 21332 Диастема НЧ в мм
	tremasUpper: z.boolean().default(false), // 21333 Тремы ВЧ
	tremasLower: z.boolean().default(false), // 21333 Тремы НЧ
	crowdingUpper: crowdingDegreeSchema.default("none"), // 21334 Скученность ВЧ
	crowdingUpperMm: z.number().default(0), // Дефицит места ВЧ в мм
	crowdingLower: crowdingDegreeSchema.default("none"), // 21334 Скученность НЧ
	crowdingLowerMm: z.number().default(0), // Дефицит места НЧ в мм
	teethPositionAnomalies: z.string().default("нет"), // 2134 Нарушения положения отдельных зубов
});
export type OrthodonticOralExamination = z.infer<typeof orthodonticOralExaminationSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 4. ZOD SCHEMAS & TYPES: TRG & CEPHALOMETRICS (22.x, 23.x)
// ─────────────────────────────────────────────────────────────────────────────

export const skeletalClassSchema = z.enum(["class_1", "class_2", "class_3"]);
export type SkeletalClass = z.infer<typeof skeletalClassSchema>;

export const jawGrowthDirectionSchema = z.enum(["horizontal", "neutral", "vertical"]);
export type JawGrowthDirection = z.infer<typeof jawGrowthDirectionSchema>;

export const jawSagittalPositionSchema = z.enum(["normognathic", "prognathic", "retrognathic"]);
export type JawSagittalPosition = z.infer<typeof jawSagittalPositionSchema>;

export const eschlerBittnerTestSchema = z.enum([
	"none",
	"not_changed", // не изменился
	"improved", // улучшился (показание к стимуляции роста НЧ)
	"worsened", // ухудшился (показание к сдерживанию роста ВЧ)
	"impossible", // выдвижение невозможно
]);
export type EschlerBittnerTest = z.infer<typeof eschlerBittnerTestSchema>;

export const orthodonticTrgCephDiagnosticsSchema = z.object({
	date: z.string().default(""), // Дата снимка ТРГ
	sna: z.number().default(82), // 22231 SNA (Положение ВЧ относительно основания черепа, норма 82±2°)
	snb: z.number().default(80), // 22232 SNB (Положение НЧ относительно основания черепа, норма 80±2°)
	anb: z.number().default(2), // 22241 ANB (Сагиттальное соотношение челюстей, норма 2±2°)
	wits: z.number().default(0), // 22242 Wits-число (мм, норма 0±1 мм)
	fma: z.number().default(25), // 2227 ML/FH (Угол наклона тела НЧ к франкфуртской горизонтали, норма 25±3°)
	u1NaAngle: z.number().default(22), // 22214 Угол наклона верхних резцов к линии NA (норма 22±2°)
	u1NaMm: z.number().default(4), // 22214 Положение резца ВЧ к линии NA в мм (норма 4±2 мм)
	l1NbAngle: z.number().default(25), // 22215 Угол наклона нижних резцов к линии NB (норма 25±2°)
	l1NbMm: z.number().default(4), // 22215 Положение резца НЧ к линии NB в мм (норма 4±2 мм)
	u1Nl: z.number().default(110), // 22211 Угол инклинации резцов ВЧ к плоскости нёба NL (норма 110±5°)
	l1Ml: z.number().default(90), // 22212 Угол инклинации резцов НЧ к нижнечелюстной плоскости ML (IMPA, норма 90±5°)
	interincisalAngle: z.number().default(131), // 22213 Межрезцовый угол 1/1 (норма 130-135°)
	bjorkSum: z.number().default(396), // 2227_growth_skull_40_sum_bjork (Сумма Бьорка, норма 396±6°)
	jarabakRatio: z.number().default(63.5), // 2227 S-Go:N-Me (%) (Коэффициент Джарабака, норма 62-65%)
	skeletalClass: skeletalClassSchema.default("class_1"), // Скелетный класс
	growthDirection: jawGrowthDirectionSchema.default("neutral"), // Направление роста лицевого скелета
	maxillarySagittalType: jawSagittalPositionSchema.default("normognathic"), // Положение верхней челюсти
	mandibularSagittalType: jawSagittalPositionSchema.default("normognathic"), // Положение нижней челюсти
	eschlerBittnerTest: eschlerBittnerTestSchema.default("none"), // 2311 Проба Эшлера-Битнера
	condyleShiftEdgeToEdge: z.enum(["possible", "impossible"]).default("possible"), // 2312 Сдвиг НЧ до краевого смыкания резцов
	lipsStrainOnClosure: z.enum(["stress_free", "tensely"]).default("stress_free"), // 2313 Смыкание губ при сомкнутых зубных рядах
});
export type OrthodonticTrgCephDiagnostics = z.infer<typeof orthodonticTrgCephDiagnosticsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 5. COMPLETE ORTHODONTIC DIAGNOSTIC RECORD SCHEMA (Form 043/u Card)
// ─────────────────────────────────────────────────────────────────────────────

export const orthodonticDiagnosticRecordSchema = z.object({
	id: z.string().default(""),
	patientId: z.string().default(""),
	patientName: z.string().default(""),
	cardNumber: z.string().default(""),
	doctorName: z.string().default(""),
	visitDate: z.string().default(""),
	complaintsAnamnesis: orthodonticComplaintsAnamnesisSchema.default({}),
	faceExamination: orthodonticFaceExaminationSchema.default({}),
	oralExamination: orthodonticOralExaminationSchema.default({}),
	trgDiagnostics: orthodonticTrgCephDiagnosticsSchema.default({}),
	clinicalDiagnosisIcd10: z.string().default("K07.2"),
	clinicalDiagnosisText: z.string().default("Аномалия соотношения зубных дуг"),
	treatmentPlanText: z.string().default("Аппаратурное ортодонтическое лечение"),
	retentionPlanText: z.string().default("Несъемные проволочные ретейнеры 13-23, 33-43 + ночные каппы"),
	nomenclature804nCodes: z.array(z.string()).default(["A16.07.048", "A06.07.006", "A02.07.010"]),
	notes: z.string().default(""),
});
export type OrthodonticDiagnosticRecord = z.infer<typeof orthodonticDiagnosticRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 6. CLINICAL DICTIONARIES & TAXONOMY OPTIONS (StomX Drop Parity)
// ─────────────────────────────────────────────────────────────────────────────

export interface TaxonomyOption<T = string> {
	value: T;
	label: string;
	description?: string;
}

export const DENTAL_ARCH_FORMS_UPPER: TaxonomyOption<UpperArchForm>[] = [
	{ value: "semi_ellipse", label: "Полуэллипс (физиологическая норма ВЧ)", description: "Правильная анатомическая дуга постоянного прикуса" },
	{ value: "parabola", label: "Парабола", description: "Суженная или сглаженная дуга" },
	{ value: "v_shaped", label: "V-образная (сужение в области премоляров)", description: "Резкое сужение в боковых отделах, выступание резцов" },
	{ value: "trapezoid", label: "Трапециевидная (уплощение во фронтальном отделе)", description: "Ретрузия передней группы зубов, уплощенный фас" },
	{ value: "triangular", label: "Треугольная", description: "Выраженное сужение зубной дуги с острым углом у резцов" },
	{ value: "saddle", label: "Седловидная", description: "Сужение в области премоляров и первых моляров" },
	{ value: "asymmetric", label: "Асимметричная", description: "Одностороннее сужение или смещение сегмента зубного ряда" },
];

export const DENTAL_ARCH_FORMS_LOWER: TaxonomyOption<LowerArchForm>[] = [
	{ value: "parabola", label: "Парабола (физиологическая норма НЧ)", description: "Правильная анатомическая параболическая дуга" },
	{ value: "trapezoid", label: "Трапециевидная", description: "Уплощение во фронтальном отделе" },
	{ value: "v_shaped", label: "V-образная", description: "Сужение боковых сегментов" },
	{ value: "triangular", label: "Треугольная", description: "Остроугольная форма зубного ряда" },
	{ value: "saddle", label: "Седловидная", description: "Сужение в области моляров/премоляров" },
	{ value: "asymmetric", label: "Асимметричная", description: "Односторонняя деформация или неравномерное прорезывание" },
];

export const PROFILE_TYPES: TaxonomyOption<ProfileType>[] = [
	{ value: "straight", label: "Прямой (ортогнатический)", description: "Гармоничный профиль, угол профиля лица в норме" },
	{ value: "convex", label: "Выпуклый (II класс / ретрогнатия НЧ)", description: "Выступание верхней губы или дистальное положение подбородка" },
	{ value: "concave", label: "Вогнутый (III класс / прогения)", description: "Выступание подбородка вперед, уплощение средней зоны лица" },
];

export const BAD_HABITS_OPTIONS: TaxonomyOption<BadHabit>[] = [
	{ value: "none", label: "Нет вредных привычек" },
	{ value: "fingers", label: "Сосание пальцев", description: "Приводит к открытому прикусу и протрузии резцов" },
	{ value: "up_lip", label: "Сосание верхней губы", description: "Приводит к ретрузии верхних резцов и прогении" },
	{ value: "down_lip", label: "Сосание/закусывание нижней губы", description: "Приводит к глубокому резцовому перекрытию и оверджету" },
	{ value: "tongue", label: "Прокладывание языка между зубами", description: "Формирует фронтальную вертикальную дизокклюзию" },
	{ value: "objects", label: "Сосание/прикусывание предметов (ручки, карандаши)", description: "Локальные диастемы и деформации зубной дуги" },
];

export const VERTICAL_RELATION_OPTIONS: TaxonomyOption<VerticalIncisorRelation>[] = [
	{ value: "normal", label: "В норме (перекрытие на 1/3 коронки)", description: "Физиологическое резцовое перекрытие 1.5-3.0 мм" },
	{ value: "deep_1_3", label: "Глубокое перекрытие (от 1/3 до 1/2 коронки)", description: "Увеличенное вертикальное перекрытие без травмы слизистой" },
	{ value: "deep_1_2", label: "Глубокий прикус (>1/2 коронки)", description: "Резцы перекрывают более половины высоты нижних коронок" },
	{ value: "traumatic_occlusion", label: "Глубокий травмирующий прикус", description: "Контакт режущих краев резцов со слизистой оболочкой неба/десны" },
	{ value: "straight_incisal", label: "Прямой прикус (краевое смыкание / edge-to-edge)", description: "Смыкание режущими краями стык-в-стык, риск повышенной стираемости" },
	{ value: "open_bite", label: "Открытый прикус (вертикальная дизокклюзия)", description: "Отсутствие смыкания во фронтальном или боковом отделе" },
];

export const SAGITTAL_RELATION_OPTIONS: TaxonomyOption<SagittalIncisorRelation>[] = [
	{ value: "normal", label: "В норме (физиологический контакт 1-2 мм)", description: "Нижние резцы контактируют с небной поверхностью верхних" },
	{ value: "sagittal_cleft", label: "Сагиттальная щель (оверджет > 2 мм)", description: "Протрузия верхних резцов или ретрогнатия нижней челюсти" },
	{ value: "reverse_incisal_occlusion", label: "Обратная резцовая окклюзия (стык/перекрытие)", description: "Нижние резцы перекрывают верхние спереди" },
	{ value: "reverse_sagittal_cleft", label: "Обратная сагиттальная щель", description: "Выраженный мезиальный прикус с щелью между резцами" },
];

export const TRANSVERSAL_RELATION_OPTIONS: TaxonomyOption<TransversalRelation>[] = [
	{ value: "normal", label: "В норме (щечные бугры верхних перекрывают нижние)" },
	{ value: "crossbite_buccal", label: "Буккальный перекрестный прикус (вестибулоокклюзия)", description: "Верхний ряд шире нижнего, щечные бугры снаружи" },
	{ value: "crossbite_lingual", label: "Лингвальный перекрестный прикус (лингвоокклюзия)", description: "Верхний ряд уже нижнего, язычные бугры внутри" },
	{ value: "crossbite_palatal", label: "Палатоокклюзия", description: "Смыкание бугров с полным перекрытием небной поверхности" },
];

export const ANGLE_CLASSES_DETAILED: { id: AngleClass; label: string; short: string; engleNorm: string }[] = [
	{ id: "class_1", label: "I класс по Энглю (нейтральный прикус)", short: "I класс", engleNorm: "Мезиально-щечный бугор первого моляра ВЧ ложится в межбугорковую фиссуру первого моляра НЧ" },
	{ id: "class_2_div_1", label: "II класс 1 подкласс (дистальный прикус, протрузия резцов ВЧ)", short: "II/1 класс", engleNorm: "Мезиально-щечный бугор первого моляра ВЧ ложится кпереди от фиссуры нижнего, веерообразная протрузия" },
	{ id: "class_2_div_2", label: "II класс 2 подкласс (дистальный прикус, ретрузия резцов ВЧ)", short: "II/2 класс", engleNorm: "Мезиально-щечный бугор первого моляра ВЧ кпереди от фиссуры, небный наклон (ретрузия) резцов" },
	{ id: "class_3", label: "III класс по Энглю (мезиальный прикус)", short: "III класс", engleNorm: "Мезиально-щечный бугор первого моляра ВЧ ложится кзади от фиссуры первого моляра НЧ" },
];

export const ICD10_ORTHODONTIC_CODES = [
	{ code: "K07.0", label: "K07.0 — Основные аномалии размеров челюстей (макро-/микрогнатия)" },
	{ code: "K07.1", label: "K07.1 — Аномалии челюстно-черепных соотношений (асимметрия, прогнатия, ретрогнатия)" },
	{ code: "K07.2", label: "K07.2 — Аномалии соотношений зубных дуг (дистальный, мезиальный, глубокий, перекрестный)" },
	{ code: "K07.3", label: "K07.3 — Аномалии положения зубов (скученность, диастема, тортоаномалии)" },
	{ code: "K07.4", label: "K07.4 — Челюстно-лицевые аномалии неуточненные" },
	{ code: "K07.8", label: "K07.8 — Другие челюстно-лицевые аномалии" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. 1-CLICK PHYSIOLOGICAL NORM FACTORY (Mandates 8e, 8k, 8n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a 100% complete physiological norm orthodontic record in 1 click.
 * Complies with Mandate 8e: the doctor sets the baseline physiological norm instantly
 * and only edits pathological deviations.
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
// 8. CLINICAL CASE PRESETS (StomX Diagnostic Profiles)
// ─────────────────────────────────────────────────────────────────────────────

export interface OrthodonticDiagnosticPreset {
	id: string;
	label: string;
	shortLabel: string;
	description: string;
	record: OrthodonticDiagnosticRecord;
}

export const ORTHODONTIC_DIAGNOSTIC_PRESETS: OrthodonticDiagnosticPreset[] = [
	{
		id: "norm_class_1",
		label: "Ортодонтическая норма (ортогнатический прикус, I класс)",
		shortLabel: "Норма (I класс)",
		description: "Физиологическая норма: гармоничный профиль, соотношение моляров I класс, правильные дуги, норма ТРГ",
		record: createDefaultOrthodonticNormRecord(),
	},
	{
		id: "class_2_div_1",
		label: "Дистальный прикус (II класс 1 подкласс: протрузия резцов ВЧ, оверджет 6 мм)",
		shortLabel: "II класс 1 подкласс",
		description: "Выпуклый профиль, сагиттальная щель 6 мм, веерообразное расхождение верхних резцов, II класс по Энглю",
		record: createDefaultOrthodonticNormRecord({
			id: "preset_class_2_1",
			complaintsAnamnesis: {
				aesthetic: true,
				morphological: true,
				lipIncompetence: true,
				mouthBreathing: true,
				badHabits: ["down_lip", "fingers"],
				teethEruptionTiming: "задержка смены боковых зубов",
				concomitantDiseases: ["ent_organs"],
				allergies: "не отягощен",
				speechDisorders: false,
				speechDisordersComment: "",
				mandibularHabitualShift: "none",
				bruxism: false,
				sluggishChewing: false,
				pregnancyTrimester: "no",
				deliveryTerm: "on_time",
				feedingType: "artificial",
				feedingTypeExtra: "",
				heredityAnomalies: ["parents"],
				hasPriorOrthoTreatment: false,
				priorOrthoType: "none",
				priorOrthoDuration: "",
				tmjDysfunction: false,
				infantileSwallowing: false,
			},
			faceExamination: {
				faceSymmetry: "symmetric",
				facialThirdsProportion: "lower_third_decreased",
				profileType: "convex",
				chinPosition: "retruding",
				upperLipPosition: "protruding",
				lowerLipPosition: "retruding",
				supramentalFold: "pronounced",
				nasolabialFolds: "normal",
				lipsClosedInRepose: "incompetent",
				gummySmile: true,
				gummySmileMm: 2.5,
				incisorDisplayRestMm: 5.0,
				incisorDisplaySmilePercent: 100,
				chinShift: "none",
				chinShiftMm: 0,
			},
			oralExamination: {
				upperArchForm: "v_shaped",
				lowerArchForm: "trapezoid",
				archSymmetry: "preserved",
				archSymmetryComment: "симметричны",
				midlineShift: "none",
				midlineShiftMm: 0,
				angleMolarLeft: "class_2_div_1",
				angleMolarRight: "class_2_div_1",
				angleCanineLeft: "class_2_div_1",
				angleCanineRight: "class_2_div_1",
				sagittalRelation: "sagittal_cleft",
				sagittalCleftMm: 6,
				verticalRelation: "deep_1_3",
				verticalOpenBiteMm: 0,
				lateralDisocclusion: "none",
				transversalRelation: "normal",
				transversalSide: "none",
				diastemaUpperMm: 1.5,
				diastemaLowerMm: 0,
				tremasUpper: true,
				tremasLower: false,
				crowdingUpper: "mild",
				crowdingUpperMm: 2,
				crowdingLower: "moderate",
				crowdingLowerMm: 3.5,
				teethPositionAnomalies: "протрузия резцов 12, 11, 21, 22",
				upperLipFrenulum: "normal",
				lowerLipFrenulum: "normal",
				tongueFrenulum: "normal",
				tongueSize: "normal",
				vestibuleDepth: "normal",
				mucousMembrane: "normal",
				dentitionPeriod: "persistent",
				oralHygiene: "allowable",
			},
			trgDiagnostics: {
				sna: 83,
				snb: 77,
				anb: 6,
				wits: 3.5,
				fma: 24,
				u1NaAngle: 29,
				u1NaMm: 7,
				l1NbAngle: 22,
				l1NbMm: 3,
				u1Nl: 118,
				l1Ml: 88,
				interincisalAngle: 122,
				bjorkSum: 394,
				jarabakRatio: 64,
				skeletalClass: "class_2",
				growthDirection: "neutral",
				maxillarySagittalType: "normognathic",
				mandibularSagittalType: "retrognathic",
				eschlerBittnerTest: "improved",
				condyleShiftEdgeToEdge: "possible",
				lipsStrainOnClosure: "tensely",
				date: new Date().toISOString().slice(0, 10),
			},
			clinicalDiagnosisIcd10: "K07.2",
			clinicalDiagnosisText: "Дистальная окклюзия (II класс 1 подкласс по Энглю). Скелетный II класс за счет ретрогнатии нижней челюсти. Протрузия резцов верхней челюсти, сагиттальная щель 6 мм. Скученность во фронтальном отделе нижней челюсти I-II степени.",
			treatmentPlanText: "1. Профессиональная гигиена полости рта (A16.07.051). 2. Фиксация самолигирующей брекет-системы (A16.07.048). 3. Нивелирование на дугах CuNiTi .014-.018. 4. Дистализация моляров или межчелюстная эластическая тяга по II классу. 5. Юстировка и закрытие промежутков на дугах SS .019x.025.",
			retentionPlanText: "Несъемные ретейнеры 13-23, 33-43 + ретенционная каппа на верхний зубной ряд.",
			nomenclature804nCodes: ["A16.07.048", "A16.07.048.002", "A06.07.006", "A02.07.010"],
			notes: "Пациент мотивирован на ортодонтическое лечение. Проба Эшлера-Битнера положительная (профиль улучшается при выдвижении челюсти вперед).",
		}),
	},
	{
		id: "class_2_div_2",
		label: "Дистальный прикус (II класс 2 подкласс: ретрузия резцов ВЧ, глубокий травмирующий прикус)",
		shortLabel: "II класс 2 подкласс",
		description: "Палатинальный наклон центральных резцов, вестибулярный наклон боковых резцов, глубокий травмирующий прикус, сниженная нижняя треть",
		record: createDefaultOrthodonticNormRecord({
			id: "preset_class_2_2",
			complaintsAnamnesis: {
				aesthetic: true,
				morphological: true,
				tmjDysfunction: true,
				sluggishChewing: true,
				badHabits: ["none"],
				concomitantDiseases: ["none"],
				allergies: "не отягощен",
				speechDisorders: false,
				speechDisordersComment: "",
				mandibularHabitualShift: "none",
				mouthBreathing: false,
				bruxism: true,
				pregnancyTrimester: "no",
				deliveryTerm: "on_time",
				feedingType: "natural",
				feedingTypeExtra: "",
				teethEruptionTiming: "в срок",
				heredityAnomalies: ["parents"],
				hasPriorOrthoTreatment: false,
				priorOrthoType: "none",
				priorOrthoDuration: "",
				lipIncompetence: false,
				infantileSwallowing: false,
			},
			faceExamination: {
				faceSymmetry: "symmetric",
				facialThirdsProportion: "lower_third_decreased",
				profileType: "straight",
				chinPosition: "normal",
				upperLipPosition: "retruding",
				lowerLipPosition: "normal",
				supramentalFold: "pronounced",
				nasolabialFolds: "pronounced",
				lipsClosedInRepose: "closed_relaxed",
				gummySmile: false,
				gummySmileMm: 0,
				incisorDisplayRestMm: 1.0,
				incisorDisplaySmilePercent: 70,
				chinShift: "none",
				chinShiftMm: 0,
			},
			oralExamination: {
				upperArchForm: "trapezoid",
				lowerArchForm: "parabola",
				archSymmetry: "preserved",
				archSymmetryComment: "симметричны",
				midlineShift: "none",
				midlineShiftMm: 0,
				angleMolarLeft: "class_2_div_2",
				angleMolarRight: "class_2_div_2",
				angleCanineLeft: "class_2_div_2",
				angleCanineRight: "class_2_div_2",
				sagittalRelation: "normal",
				sagittalCleftMm: 1,
				verticalRelation: "traumatic_occlusion",
				verticalOpenBiteMm: 0,
				lateralDisocclusion: "none",
				transversalRelation: "normal",
				transversalSide: "none",
				diastemaUpperMm: 0,
				diastemaLowerMm: 0,
				tremasUpper: false,
				tremasLower: false,
				crowdingUpper: "moderate",
				crowdingUpperMm: 4,
				crowdingLower: "moderate",
				crowdingLowerMm: 4,
				teethPositionAnomalies: "палатинальный наклон 11, 21, вестибулопозиция 12, 22",
				upperLipFrenulum: "normal",
				lowerLipFrenulum: "normal",
				tongueFrenulum: "normal",
				tongueSize: "normal",
				vestibuleDepth: "normal",
				mucousMembrane: "hyperemic",
				dentitionPeriod: "persistent",
				oralHygiene: "good",
			},
			trgDiagnostics: {
				sna: 81,
				snb: 77,
				anb: 4,
				wits: 2.0,
				fma: 18,
				u1NaAngle: 12,
				u1NaMm: 1,
				l1NbAngle: 18,
				l1NbMm: 2,
				u1Nl: 95,
				l1Ml: 82,
				interincisalAngle: 148,
				bjorkSum: 384,
				jarabakRatio: 68,
				skeletalClass: "class_2",
				growthDirection: "horizontal",
				maxillarySagittalType: "normognathic",
				mandibularSagittalType: "retrognathic",
				eschlerBittnerTest: "not_changed",
				condyleShiftEdgeToEdge: "impossible",
				lipsStrainOnClosure: "stress_free",
				date: new Date().toISOString().slice(0, 10),
			},
			clinicalDiagnosisIcd10: "K07.2",
			clinicalDiagnosisText: "Дистальная окклюзия (II класс 2 подкласс по Энглю). Глубокий травмирующий прикус. Ретрузия центральных резцов ВЧ, вестибулярное положение латеральных резцов. Горизонтальный тип роста лицевого скелета. Дисфункция ВНЧС.",
			treatmentPlanText: "1. Разобщение прикуса (окклюзионные накладки / bite turbos). 2. Фиксация брекет-системы с высоким положительным торком на резцы ВЧ (+17° Damon Q2). 3. Протрузия и интрузия резцов, нивелирование кривой Шпее. 4. Нормализация высоты нижней трети лица.",
			retentionPlanText: "Несъемные ретейнеры 13-23, 33-43 + каппа для защиты от ночного бруксизма.",
			nomenclature804nCodes: ["A16.07.048", "A16.07.048.002", "A06.07.006"],
			notes: "Травма десневого сосочка с небной стороны при смыкании. Выраженная компрессия головок ВНЧС.",
		}),
	},
	{
		id: "class_3_progenia",
		label: "Мезиальный прикус (III класс по Энглю: обратная резцовая окклюзия, истинная прогения)",
		shortLabel: "III класс (мезиальный)",
		description: "Вогнутый профиль, выступающий массивный подбородок, обратное резцовое перекрытие 3 мм, мезиальное соотношение моляров",
		record: createDefaultOrthodonticNormRecord({
			id: "preset_class_3",
			complaintsAnamnesis: {
				aesthetic: true,
				morphological: true,
				speechDisorders: true,
				speechDisordersComment: "нарушение произношения шипящих и свистящих звуков",
				mandibularHabitualShift: "forward",
				badHabits: ["none"],
				concomitantDiseases: ["none"],
				allergies: "не отягощен",
				tmjDysfunction: true,
				lipIncompetence: false,
				infantileSwallowing: false,
				mouthBreathing: false,
				bruxism: false,
				sluggishChewing: false,
				pregnancyTrimester: "no",
				deliveryTerm: "on_time",
				feedingType: "natural",
				feedingTypeExtra: "",
				teethEruptionTiming: "раннее прорезывание постоянных зубов",
				heredityAnomalies: ["parents", "relatives"],
				hasPriorOrthoTreatment: false,
				priorOrthoType: "none",
				priorOrthoDuration: "",
			},
			faceExamination: {
				faceSymmetry: "symmetric",
				facialThirdsProportion: "lower_third_increased",
				profileType: "concave",
				chinPosition: "protruding",
				upperLipPosition: "retruding",
				lowerLipPosition: "protruding",
				supramentalFold: "smoothed",
				nasolabialFolds: "pronounced",
				lipsClosedInRepose: "closed_relaxed",
				gummySmile: false,
				gummySmileMm: 0,
				incisorDisplayRestMm: 2.0,
				incisorDisplaySmilePercent: 80,
				chinShift: "none",
				chinShiftMm: 0,
			},
			oralExamination: {
				upperArchForm: "trapezoid",
				lowerArchForm: "parabola",
				archSymmetry: "preserved",
				archSymmetryComment: "симметричны",
				midlineShift: "none",
				midlineShiftMm: 0,
				angleMolarLeft: "class_3",
				angleMolarRight: "class_3",
				angleCanineLeft: "class_3",
				angleCanineRight: "class_3",
				sagittalRelation: "reverse_incisal_occlusion",
				sagittalCleftMm: -3,
				verticalRelation: "normal",
				verticalOpenBiteMm: 0,
				lateralDisocclusion: "none",
				transversalRelation: "crossbite_buccal",
				transversalSide: "bilateral",
				diastemaUpperMm: 0,
				diastemaLowerMm: 1.0,
				tremasUpper: false,
				tremasLower: true,
				crowdingUpper: "moderate",
				crowdingUpperMm: 3.5,
				crowdingLower: "none",
				crowdingLowerMm: 0,
				teethPositionAnomalies: "обратное резцовое перекрытие 12, 11, 21, 22",
				upperLipFrenulum: "normal",
				lowerLipFrenulum: "normal",
				tongueFrenulum: "short",
				tongueSize: "macroglossia",
				vestibuleDepth: "normal",
				mucousMembrane: "normal",
				dentitionPeriod: "persistent",
				oralHygiene: "good",
			},
			trgDiagnostics: {
				sna: 79,
				snb: 84,
				anb: -5,
				wits: -4.5,
				fma: 28,
				u1NaAngle: 28,
				u1NaMm: 6,
				l1NbAngle: 18,
				l1NbMm: 2,
				u1Nl: 116,
				l1Ml: 82,
				interincisalAngle: 126,
				bjorkSum: 400,
				jarabakRatio: 61,
				skeletalClass: "class_3",
				growthDirection: "vertical",
				maxillarySagittalType: "retrognathic",
				mandibularSagittalType: "prognathic",
				eschlerBittnerTest: "worsened",
				condyleShiftEdgeToEdge: "impossible",
				lipsStrainOnClosure: "stress_free",
				date: new Date().toISOString().slice(0, 10),
			},
			clinicalDiagnosisIcd10: "K07.2",
			clinicalDiagnosisText: "Мезиальная окклюзия (III класс по Энглю). Скелетный III класс (сочетание микрогнатии верхней челюсти и макрогнатии нижней челюсти). Обратная резцовая окклюзия со щелью -3 мм. Сужение верхнего зубного ряда.",
			treatmentPlanText: "1. Консультация ЧЛХ (оценка необходимости ортогнатической хирургии vs камуфляж). 2. Быстрое небное расширение RPE (аппарат Марко Роса / Хаас). 3. Фиксация брекет-системы с обратным торком. 4. Эластики по III классу или скелетная опора (минивинты IZC / buccal shelf).",
			retentionPlanText: "Несъемные ретейнеры 13-23, 33-43 + ночная позиционирующая каппа.",
			nomenclature804nCodes: ["A16.07.048", "A16.07.046", "A06.07.006"],
			notes: "Отягощенная наследственность по материнской линии (прогения у матери и дедушки).",
		}),
	},
	{
		id: "open_bite_vertical",
		label: "Открытый прикус (вертикальная дизокклюзия 4 мм, инфантильное глотание, ротовое дыхание)",
		shortLabel: "Открытый прикус",
		description: "Фронтальная вертикальная щель 4 мм, несмыкание губ, гипердивергентный вертикальный рост, инфантильное глотание",
		record: createDefaultOrthodonticNormRecord({
			id: "preset_open_bite",
			complaintsAnamnesis: {
				aesthetic: true,
				morphological: true,
				speechDisorders: true,
				speechDisordersComment: "межзубный сигматизм, шепелявость",
				infantileSwallowing: true,
				mouthBreathing: true,
				sluggishChewing: true,
				lipIncompetence: true,
				badHabits: ["tongue", "fingers"],
				concomitantDiseases: ["ent_organs"],
				allergies: "аллергический ринит",
				tmjDysfunction: false,
				mandibularHabitualShift: "none",
				bruxism: false,
				pregnancyTrimester: "no",
				deliveryTerm: "on_time",
				feedingType: "artificial",
				feedingTypeExtra: "",
				teethEruptionTiming: "в срок",
				heredityAnomalies: ["none"],
				hasPriorOrthoTreatment: false,
				priorOrthoType: "none",
				priorOrthoDuration: "",
			},
			faceExamination: {
				faceSymmetry: "symmetric",
				facialThirdsProportion: "lower_third_increased",
				profileType: "convex",
				chinPosition: "retruding",
				upperLipPosition: "normal",
				lowerLipPosition: "normal",
				supramentalFold: "smoothed",
				nasolabialFolds: "smoothed",
				lipsClosedInRepose: "incompetent",
				gummySmile: false,
				gummySmileMm: 0,
				incisorDisplayRestMm: 4.5,
				incisorDisplaySmilePercent: 60,
				chinShift: "none",
				chinShiftMm: 0,
			},
			oralExamination: {
				upperArchForm: "v_shaped",
				lowerArchForm: "trapezoid",
				archSymmetry: "preserved",
				archSymmetryComment: "симметричны",
				midlineShift: "none",
				midlineShiftMm: 0,
				angleMolarLeft: "class_1",
				angleMolarRight: "class_1",
				angleCanineLeft: "class_1",
				angleCanineRight: "class_1",
				sagittalRelation: "sagittal_cleft",
				sagittalCleftMm: 3,
				verticalRelation: "open_bite",
				verticalOpenBiteMm: 4,
				lateralDisocclusion: "none",
				transversalRelation: "normal",
				transversalSide: "none",
				diastemaUpperMm: 0,
				diastemaLowerMm: 0,
				tremasUpper: false,
				tremasLower: false,
				crowdingUpper: "mild",
				crowdingUpperMm: 2,
				crowdingLower: "mild",
				crowdingLowerMm: 2,
				teethPositionAnomalies: "инфраокклюзия резцов 12, 11, 21, 22, 32, 31, 41, 42",
				upperLipFrenulum: "normal",
				lowerLipFrenulum: "normal",
				tongueFrenulum: "short",
				tongueSize: "macroglossia",
				vestibuleDepth: "normal",
				mucousMembrane: "normal",
				dentitionPeriod: "persistent",
				oralHygiene: "allowable",
			},
			trgDiagnostics: {
				sna: 81,
				snb: 77,
				anb: 4,
				wits: 1.5,
				fma: 34,
				u1NaAngle: 26,
				u1NaMm: 5,
				l1NbAngle: 28,
				l1NbMm: 5,
				u1Nl: 112,
				l1Ml: 94,
				interincisalAngle: 118,
				bjorkSum: 408,
				jarabakRatio: 58,
				skeletalClass: "class_2",
				growthDirection: "vertical",
				maxillarySagittalType: "normognathic",
				mandibularSagittalType: "retrognathic",
				eschlerBittnerTest: "not_changed",
				condyleShiftEdgeToEdge: "possible",
				lipsStrainOnClosure: "tensely",
				date: new Date().toISOString().slice(0, 10),
			},
			clinicalDiagnosisIcd10: "K07.2",
			clinicalDiagnosisText: "Вертикальная резцовая дизокклюзия (открытый прикус 4 мм). Вертикальный гипердивергентный тип роста лицевого скелета (FMA 34°). Инфантильный тип глотания, ротовое дыхание.",
			treatmentPlanText: "1. Консультация ЛОР-врача (восстановление носового дыхания). 2. Миогимнастика + логопед (коррекция положения языка). 3. Фиксация небного бюгеля с шипами / заслонкой для языка. 4. Интрузия боковых моляров на минивинтах для ротации нижней челюсти против часовой стрелки.",
			retentionPlanText: "Несъемные ретейнеры + ретенционная пластинка с упором для языка.",
			nomenclature804nCodes: ["A16.07.048", "A16.07.046", "A06.07.006"],
			notes: "Несмыкание губ в покое. Высокий риск рецидива при сохранении инфантильного глотания.",
		}),
	},
	{
		id: "crossbite_transverse",
		label: "Трансверзальная аномалия (односторонний перекрестный прикус, смещение центра 3 мм)",
		shortLabel: "Перекрестный прикус",
		description: "Асимметричное сужение верхнего зубного ряда, перекрестный прикус справа, смещение косметического центра на 3 мм",
		record: createDefaultOrthodonticNormRecord({
			id: "preset_crossbite",
			complaintsAnamnesis: {
				aesthetic: true,
				morphological: true,
				tmjDysfunction: true,
				mandibularHabitualShift: "to_side",
				badHabits: ["none"],
				concomitantDiseases: ["none"],
				allergies: "не отягощен",
				speechDisorders: false,
				speechDisordersComment: "",
				mouthBreathing: false,
				bruxism: false,
				sluggishChewing: false,
				pregnancyTrimester: "no",
				deliveryTerm: "on_time",
				feedingType: "natural",
				feedingTypeExtra: "",
				teethEruptionTiming: "в срок",
				heredityAnomalies: ["none"],
				hasPriorOrthoTreatment: false,
				priorOrthoType: "none",
				priorOrthoDuration: "",
				lipIncompetence: false,
				infantileSwallowing: false,
			},
			faceExamination: {
				faceSymmetry: "asymmetric",
				facialThirdsProportion: "proportional",
				chinShift: "right",
				chinShiftMm: 3,
				profileType: "straight",
				chinPosition: "normal",
				upperLipPosition: "normal",
				lowerLipPosition: "normal",
				supramentalFold: "normal",
				nasolabialFolds: "normal",
				lipsClosedInRepose: "closed_relaxed",
				gummySmile: false,
				gummySmileMm: 0,
				incisorDisplayRestMm: 2.5,
				incisorDisplaySmilePercent: 85,
			},
			oralExamination: {
				upperArchForm: "asymmetric",
				lowerArchForm: "parabola",
				archSymmetry: "disturbed",
				archSymmetryComment: "сужение правого бокового сегмента верхнего зубного ряда",
				midlineShift: "right",
				midlineShiftMm: 3,
				angleMolarLeft: "class_1",
				angleMolarRight: "class_2_div_1",
				angleCanineLeft: "class_1",
				angleCanineRight: "class_2_div_1",
				sagittalRelation: "normal",
				sagittalCleftMm: 2,
				verticalRelation: "normal",
				verticalOpenBiteMm: 0,
				lateralDisocclusion: "none",
				transversalRelation: "crossbite_buccal",
				transversalSide: "right",
				diastemaUpperMm: 0,
				diastemaLowerMm: 0,
				tremasUpper: false,
				tremasLower: false,
				crowdingUpper: "moderate",
				crowdingUpperMm: 3,
				crowdingLower: "mild",
				crowdingLowerMm: 2,
				teethPositionAnomalies: "палатоокклюзия 14, 15, 16",
				upperLipFrenulum: "normal",
				lowerLipFrenulum: "normal",
				tongueFrenulum: "normal",
				tongueSize: "normal",
				vestibuleDepth: "normal",
				mucousMembrane: "normal",
				dentitionPeriod: "persistent",
				oralHygiene: "good",
			},
			trgDiagnostics: {
				sna: 82,
				snb: 80,
				anb: 2,
				wits: 0.5,
				fma: 25,
				u1NaAngle: 22,
				u1NaMm: 4,
				l1NbAngle: 25,
				l1NbMm: 4,
				u1Nl: 110,
				l1Ml: 90,
				interincisalAngle: 131,
				bjorkSum: 396,
				jarabakRatio: 63,
				skeletalClass: "class_1",
				growthDirection: "neutral",
				maxillarySagittalType: "normognathic",
				mandibularSagittalType: "normognathic",
				eschlerBittnerTest: "none",
				condyleShiftEdgeToEdge: "possible",
				lipsStrainOnClosure: "stress_free",
				date: new Date().toISOString().slice(0, 10),
			},
			clinicalDiagnosisIcd10: "K07.2",
			clinicalDiagnosisText: "Трансверзальная аномалия окклюзии (односторонний перекрестный буккальный прикус справа в области 14, 15, 16). Асимметричное сужение верхней зубной дуги. Смещение центральной линии вправо на 3 мм.",
			treatmentPlanText: "1. Асимметричное расширение верхнего зубного ряда (аппарат Quad-Helix или брекеты с индивидуализированной дугой). 2. Перекрестные межчелюстные эластики (Cross-elastics 3/16 4.5 oz). 3. Юстировка центральной линии.",
			retentionPlanText: "Несъемный ретейнер на нижний зубной ряд + каппа с усиленным окклюзионным разобщением справа.",
			nomenclature804nCodes: ["A16.07.048", "A16.07.047", "A06.07.006"],
			notes: "Привычное смещение нижней челюсти вправо при смыкании зубных рядов.",
		}),
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 9. CEPHALOMETRIC CLASSIFICATION & CALCULATION ENGINE
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
// 10. STATUTORY FORM 043/u CLINICAL PROTOCOL GENERATOR (Sin 7: ZERO RAW EMOJIS)
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
