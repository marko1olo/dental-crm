/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT BONE QUALITY & OSTEOTOMY ASSESSMENT ENGINE (WAVE 139)
 * ═══════════════════════════════════════════════════════════════════════════
 * Quantitative assessment of implant bed bone density and osteotomy planning:
 * - Carl E. Misch Bone Density Classification (D1..D5):
 *     D1: > 1250 HU (Dense cortical bone, anterior mandible)
 *     D2: 850..1250 HU (Thick porous cortical & coarse trabecular)
 *     D3: 350..850 HU (Thin porous cortical & fine trabecular)
 *     D4: 150..350 HU (Thin fine trabecular, posterior maxilla / tuber)
 *     D5: < 150 HU (Immature, poorly mineralized bone / bone defect)
 * - Lekholm & Zarb Bone Morphology Typing (Type I..Type IV):
 *     Type I:   Homogeneous compact/cortical bone
 *     Type II:  Thick cortical layer surrounding dense trabecular core
 *     Type III: Thin cortical layer surrounding dense trabecular core
 *     Type IV:  Thin cortical layer surrounding sparse trabecular core
 * - 3D Volumetric sampling along implant axis & concentric radial mantle
 * - Cortical plate thickness measurement (crestal & apical zones)
 * - Osteotomy drilling protocol, torque & ISQ forecasts (Form 043/u)
 *
 * Reverse-engineered & adapted from DenCT (core/boneQuality.ts).
 * 100% pure TypeScript, zero DOM/VTK dependencies, strictly 0 emojis.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import { trilinear, AIR_HU, type VolumeSamplingData, type Vec3 } from "./cprMath.js";
import { cross3, normalize3, len3 } from "./implantGeometryEngine.js";

// ── Zod Schemas & Domain Types ─────────────────────────────────

export const mischBoneClassSchema = z.enum(["D1", "D2", "D3", "D4", "D5"]);
export type MischBoneClass = z.infer<typeof mischBoneClassSchema>;
export type BoneClass = MischBoneClass;

export const lekholmZarbTypeSchema = z.enum(["Type_I", "Type_II", "Type_III", "Type_IV"]);
export type LekholmZarbType = z.infer<typeof lekholmZarbTypeSchema>;

export const boneSamplingConfigSchema = z.object({
	axialSteps: z.number().int().min(1).default(12),
	radialSteps: z.number().int().min(1).default(4),
	radialFraction: z.number().min(0).max(1).default(0.6),
	corticalSearchRadiusMm: z.number().positive().default(3.0),
	corticalThresholdHU: z.number().default(700),
});
export type BoneSamplingConfig = z.infer<typeof boneSamplingConfigSchema>;

export const osteotomyDrillProtocolSchema = z.enum([
	"standard",
	"under_drill",
	"bone_tap_countersink",
	"bicortical_fixation",
]);
export type OsteotomyDrillProtocol = z.infer<typeof osteotomyDrillProtocolSchema>;

export const primaryStabilityExpectedSchema = z.enum([
	"high",
	"medium",
	"low",
	"compromised",
]);
export type PrimaryStabilityExpected = z.infer<typeof primaryStabilityExpectedSchema>;

export const osteotomyRecommendationSchema = z.object({
	drillProtocol: osteotomyDrillProtocolSchema,
	drillProtocolDescriptionRu: z.string(),
	recommendedTorqueNcm: z.object({
		min: z.number(),
		max: z.number(),
		target: z.number().optional(),
	}),
	estimatedISQ: z.object({
		min: z.number(),
		max: z.number(),
		target: z.number().optional(),
	}),
	primaryStabilityExpected: primaryStabilityExpectedSchema,
	coolingRecommendationRu: z.string(),
	surgicalTipsRu: z.array(z.string()),
});
export type OsteotomyRecommendation = z.infer<typeof osteotomyRecommendationSchema>;

export const boneSiteAssessmentSchema = z.object({
	implantId: z.string(),
	toothNumber: z.number().int().min(11).max(48),
	meanHU: z.number(),
	mischClass: mischBoneClassSchema,
	lekholmZarbType: lekholmZarbTypeSchema,
	corticalThicknessCrestMm: z.number(),
	corticalThicknessApicalMm: z.number(),
	trabecularDensityHU: z.number(),
	osteotomyRecommendation: osteotomyRecommendationSchema,
	sampleCount: z.number().int().optional(),
	minHU: z.number().optional(),
	maxHU: z.number().optional(),
	stdDevHU: z.number().optional(),
	assessmentDate: z.string().optional(),
});
export type BoneSiteAssessment = z.infer<typeof boneSiteAssessmentSchema>;

// ── Clinical Reference Metadata ────────────────────────────────

export interface MischClassificationInfo {
	readonly mischClass: MischBoneClass;
	readonly classNameRu: string;
	readonly anatomicalLocationRu: string;
	readonly densityRangeRu: string;
	readonly tactileFeelRu: string;
	readonly clinicalDescriptionRu: string;
}

export const MISCH_CLASSIFICATION_INFO: Record<MischBoneClass, MischClassificationInfo> = {
	D1: {
		mischClass: "D1",
		classNameRu: "Класс D1 — Плотная кортикальная кость",
		anatomicalLocationRu: "Передний отдел нижней челюсти (симфиз)",
		densityRangeRu: "> 1250 HU (GV)",
		tactileFeelRu: "Дуб / слоновая кость",
		clinicalDescriptionRu:
			"Гомогенная плотная кортикальная кость с минимальным трабекулярным пространством и скудным кровоснабжением. Чрезвычайно высокая первичная фиксация, высокий риск термического остеонекроза при сверлении.",
	},
	D2: {
		mischClass: "D2",
		classNameRu: "Класс D2 — Плотная пористая кортикальная и крупнопетлистая губчатая кость",
		anatomicalLocationRu: "Передний и боковой отделы нижней челюсти, передний отдел верхней челюсти",
		densityRangeRu: "850–1250 HU (GV)",
		tactileFeelRu: "Сосна / белое дерево",
		clinicalDescriptionRu:
			"Идеальный баланс между кортикальной опорой и богатым трабекулярным кровоснабжением. Оптимальные биологические условия для быстрой остеоинтеграции.",
	},
	D3: {
		mischClass: "D3",
		classNameRu: "Класс D3 — Тонкая пористая кортикальная и мелкопетлистая губчатая кость",
		anatomicalLocationRu: "Передний и дистальный отделы верхней челюсти, дистальный отдел нижней челюсти",
		densityRangeRu: "350–850 HU (GV)",
		tactileFeelRu: "Плотная бальза / фанера",
		clinicalDescriptionRu:
			"Тонкая кортикальная пластинка и умеренно пористая губчатая сердцевина. Требуется бережное формирование ложа для обеспечения торка за счет уплотнения трабекул.",
	},
	D4: {
		mischClass: "D4",
		classNameRu: "Класс D4 — Тонкая мелкопетлистая кость низкой плотности",
		anatomicalLocationRu: "Дистальный отдел верхней челюсти (область моляров и бугра)",
		densityRangeRu: "150–350 HU (GV)",
		tactileFeelRu: "Пенопласт / мягкая бальза",
		clinicalDescriptionRu:
			"Очень тонкая кортикальная пластинка или ее отсутствие, крупнопористая губчатая ткань с низкой минерализацией. Высокий риск первичной нестабильности при стандартном сверлении.",
	},
	D5: {
		mischClass: "D5",
		classNameRu: "Класс D5 — Незрелая слабоминерализованная кость / Дефект",
		anatomicalLocationRu: "Зоны недавних удалений, свежие аугментаты или выраженная атрофия",
		densityRangeRu: "< 150 HU (GV)",
		tactileFeelRu: "Воздушный мусс / фиброзная ткань",
		clinicalDescriptionRu:
			"Крайне низкая плотность. Условия для первичной стабильности стандартного дентального имплантата отсутствуют без предварительной реконструктивной пластики.",
	},
};

export interface MischGuidance {
	boneClass: MischBoneClass;
	classNameRu: string;
	densityRangeRu: string;
	anatomicLocationRu: string;
	corticalDescriptionRu: string;
	trabecularDescriptionRu: string;
	tactileFeelRu: string;
	clinicalDescriptionRu: string;
	surgicalPreparationProtocolRu: string;
	drillingProtocolRu: string;
	recommendedTorqueNcm: {
		min: number;
		max: number;
		target: number;
	};
	healingMonths: {
		mandible: number;
		maxilla: number;
	};
	colorHex: string;
	bgBadgeHex: string;
	borderBadgeHex: string;
}

export type BoneQualityProfile = MischGuidance;

export const MISCH_CLINICAL_GUIDANCE: Record<MischBoneClass, MischGuidance> = {
	D1: {
		boneClass: "D1",
		classNameRu: "Класс D1 — Плотная кортикальная кость",
		densityRangeRu: "> 1250 HU (GV)",
		anatomicLocationRu:
			"Передний отдел нижней челюсти (между ментальными отверстиями / симфиз)",
		corticalDescriptionRu: "Плотная гомогенная кортикальная кость («кость дуба»)",
		trabecularDescriptionRu:
			"Практически отсутствует, минимальные костномозговые пространства",
		tactileFeelRu: "Дуб / слоновая кость (очень плотная древесина)",
		clinicalDescriptionRu:
			"Гомогенная плотная кортикальная кость с минимальным трабекулярным пространством и скудным кровоснабжением. Чрезвычайно высокая первичная механическая фиксация, но повышенный риск термического остеонекроза при сверлении.",
		surgicalPreparationProtocolRu:
			"Полное препарирование на всю рабочую длину с калибровкой кортикальной фрезой. Обязательное нарезание резьбы метчиком (bone tap) на всю глубину на скорости 15–25 об/мин с обильным внешним и внутренним охлаждением стерильным физраствором для исключения перегрева кости выше 47°C. Рекомендуются имплантаты с мелким шагом резьбы.",
		drillingProtocolRu:
			"Полное препарирование ложа, нарезание резьбы метчиком на всю глубину, обильное охлаждение для защиты от термонекроза",
		recommendedTorqueNcm: { min: 35, max: 50, target: 40 },
		healingMonths: { mandible: 3, maxilla: 4 },
		colorHex: "#1d4ed8",
		bgBadgeHex: "#dbeafe",
		borderBadgeHex: "#93c5fd",
	},
	D2: {
		boneClass: "D2",
		classNameRu:
			"Класс D2 — Плотная пористая кортикальная и крупнопетлистая губчатая кость",
		densityRangeRu: "850–1250 HU (GV)",
		anatomicLocationRu:
			"Передний и боковой отделы нижней челюсти, передний отдел верхней челюсти",
		corticalDescriptionRu: "Выраженная плотная кортикальная пластинка",
		trabecularDescriptionRu: "Плотная губчатая кость с высокой минерализацией",
		tactileFeelRu: "Сосна / белое дерево (плотная древесина средней твердости)",
		clinicalDescriptionRu:
			"Идеальный баланс между кортикальной опорой и богатым трабекулярным кровоснабжением. Оптимальные биологические условия для быстрой остеоинтеграции и высокой первичной стабильности.",
		surgicalPreparationProtocolRu:
			"Классический ступенчатый хирургический протокол сверления с финишной фрезой номинального диаметра. Нарезание резьбы метчиком только кортикальной шейки (на 2–3 мм при выраженном кортексе). Прогноз первичной стабильности 35–45 Н·см.",
		drillingProtocolRu:
			"Стандартный ступенчатый протокол, метчик только при плотной кортикальной пластинке в области шейки",
		recommendedTorqueNcm: { min: 30, max: 45, target: 35 },
		healingMonths: { mandible: 3, maxilla: 4 },
		colorHex: "#047857",
		bgBadgeHex: "#d1fae5",
		borderBadgeHex: "#6ee7b7",
	},
	D3: {
		boneClass: "D3",
		classNameRu:
			"Класс D3 — Тонкая пористая кортикальная и мелкопетлистая губчатая кость",
		densityRangeRu: "350–850 HU (GV)",
		anatomicLocationRu:
			"Передний и дистальный отделы верхней челюсти, дистальный отдел нижней челюсти",
		corticalDescriptionRu: "Тонкая пористая кортикальная пластинка",
		trabecularDescriptionRu: "Мелкоячеистая губчатая кость средней плотности",
		tactileFeelRu: "Плотная бальза / фанера",
		clinicalDescriptionRu:
			"Тонкая кортикальная пластинка и умеренно пористая губчатая сердцевина. Требуется бережное формирование ложа для обеспечения торка за счет уплотнения трабекул.",
		surgicalPreparationProtocolRu:
			"Щадящее препарирование ложа: финишная фреза на 0.5–1.0 мм меньше номинального диаметра имплантата (under-drilling) для достижения бикортикальной фиксации и компрессии кости. Метчик не используется. Предпочтительны корневидные имплантаты с коническим телом и выраженным режущим профилем.",
		drillingProtocolRu:
			"Протокол недопрепарирования (under-drilling) на 0.5–1.0 мм меньше диаметра имплантата для остеоконденсации",
		recommendedTorqueNcm: { min: 25, max: 35, target: 30 },
		healingMonths: { mandible: 4, maxilla: 5 },
		colorHex: "#b45309",
		bgBadgeHex: "#fef3c7",
		borderBadgeHex: "#fcd34d",
	},
	D4: {
		boneClass: "D4",
		classNameRu: "Класс D4 — Тонкая мелкопетлистая кость низкой плотности",
		densityRangeRu: "150–350 HU (GV)",
		anatomicLocationRu:
			"Дистальный отдел верхней челюсти (область моляров и бугра верхней челюсти)",
		corticalDescriptionRu: "Практически отсутствует",
		trabecularDescriptionRu:
			"Крупноячеистая редкая губчатая кость низкой плотности («пенопласт»)",
		tactileFeelRu: "Пенопласт / мягкая бальза",
		clinicalDescriptionRu:
			"Очень тонкая кортикальная пластинка или ее отсутствие, крупнопористая губчатая ткань с низкой минерализацией. Высокий риск первичной нестабильности и провала имплантата при стандартном протоколе сверления.",
		surgicalPreparationProtocolRu:
			"Максимальное сохранение костного вещества: остеоконденсация (ручные или моторные остеотомы вместо фрез), препарирование только тонким пилотным сверлом 2.0 мм с последующим раздвижением трабекул остеотомами. Применение имплантатов с агрессивной самонарезающей резьбой. Протокол недопрепарирования ложа на 1–2 размера фрез. Бикортикальная фиксация в дно пазухи или небный кортекс.",
		drillingProtocolRu:
			"Остеотомический протокол с биконденсацией кости, конусный имплантат с агрессивной резьбой, без финишных фрез",
		recommendedTorqueNcm: { min: 15, max: 25, target: 20 },
		healingMonths: { mandible: 4, maxilla: 6 },
		colorHex: "#c2410c",
		bgBadgeHex: "#ffedd5",
		borderBadgeHex: "#fdba74",
	},
	D5: {
		boneClass: "D5",
		classNameRu: "Класс D5 — Незрелая слабоминерализованная кость / Дефект",
		densityRangeRu: "< 150 HU (GV)",
		anatomicLocationRu:
			"Зоны недавних удалений, свежие костные аугментаты или выраженная атрофия",
		corticalDescriptionRu: "Отсутствует",
		trabecularDescriptionRu:
			"Незрелая неминерализованная кость или фиброзная ткань",
		tactileFeelRu: "Воздушный мусс / волокнистая ткань",
		clinicalDescriptionRu:
			"Крайне низкая плотность (незрелый регенерат, остеомаляция или тяжелая остеопения). Условия для первичной стабильности стандартного дентального имплантата отсутствуют.",
		surgicalPreparationProtocolRu:
			"Установка стандартного дентального имплантата противопоказана без предварительной костной пластики (GBR) и выдержки 6–9 месяцев для минерализации, либо применение бикортикальных скуловых (Zygoma) / птеригоидных имплантатов.",
		drillingProtocolRu:
			"Прямая имплантация противопоказана без предварительной костной пластики (GBR / аугментация)",
		recommendedTorqueNcm: { min: 0, max: 15, target: 10 },
		healingMonths: { mandible: 6, maxilla: 9 },
		colorHex: "#b91c1c",
		bgBadgeHex: "#fee2e2",
		borderBadgeHex: "#fca5a5",
	},
};

export function getMischBoneClinicalGuidance(
	boneClass: MischBoneClass,
): MischGuidance {
	return MISCH_CLINICAL_GUIDANCE[boneClass];
}

export interface MischDensityProfile {
	boneClass: MischBoneClass;
	minHU: number;
	maxHU: number;
	anatomicLocation: string;
	corticalDescription: string;
	trabecularDescription: string;
	drillingProtocol: string;
	expectedTorqueNcm: string;
	recommendedHealingMonths: number;
}

export const MISCH_BONE_PROFILES: Record<MischBoneClass, MischDensityProfile> = {
	D1: {
		boneClass: "D1",
		minHU: 1250,
		maxHU: 3000,
		anatomicLocation: "Передний отдел нижней челюсти (симфиз)",
		corticalDescription: "Плотная гомогенная кортикальная кость («кость дуба»)",
		trabecularDescription: "Практически отсутствует, минимальные костномозговые пространства",
		drillingProtocol: "Полное препарирование ложа, нарезание резьбы метчиком на всю глубину, обильное охлаждение для защиты от термонекроза",
		expectedTorqueNcm: "45–60 Н·см",
		recommendedHealingMonths: 3,
	},
	D2: {
		boneClass: "D2",
		minHU: 850,
		maxHU: 1250,
		anatomicLocation: "Передний и боковой отделы нижней челюсти, передний отдел верхней челюсти",
		corticalDescription: "Выраженная плотная кортикальная пластинка",
		trabecularDescription: "Плотная губчатая кость с высокой минерализацией",
		drillingProtocol: "Стандартный хирургический протокол, метчик при плотной кортикальной пластинке в области шейки",
		expectedTorqueNcm: "35–45 Н·см",
		recommendedHealingMonths: 3,
	},
	D3: {
		boneClass: "D3",
		minHU: 350,
		maxHU: 850,
		anatomicLocation: "Боковые отделы верхней и нижней челюсти",
		corticalDescription: "Тонкая пористая кортикальная пластинка",
		trabecularDescription: "Мелкоячеистая губчатая кость средней плотности",
		drillingProtocol: "Протокол недопрепарирования (under-drilling) на 0.5 мм тоньше диаметра имплантата для остеоконденсации",
		expectedTorqueNcm: "25–35 Н·см",
		recommendedHealingMonths: 4,
	},
	D4: {
		boneClass: "D4",
		minHU: 150,
		maxHU: 350,
		anatomicLocation: "Задний отдел верхней челюсти (бугор верхней челюсти)",
		corticalDescription: "Практически отсутствует",
		trabecularDescription: "Крупноячеистая редкая губчатая кость низкой плотности («пенопласт»)",
		drillingProtocol: "Остеотомический протокол с биконденсацией кости, конусный имплантат с агрессивной резьбой, без финишных фрез",
		expectedTorqueNcm: "15–25 Н·см",
		recommendedHealingMonths: 6,
	},
	D5: {
		boneClass: "D5",
		minHU: -1000,
		maxHU: 150,
		anatomicLocation: "Зоны недавнего удаления, выраженной атрофии или кистозных полостей",
		corticalDescription: "Отсутствует",
		trabecularDescription: "Незрелая неминерализованная кость или фиброзная ткань",
		drillingProtocol: "Прямая имплантация противопоказана без предварительной костной пластики (GBR / аугментация)",
		expectedTorqueNcm: "< 15 Н·см (первичная стабильность не гарантирована)",
		recommendedHealingMonths: 6,
	},
};

export function getMischProfile(huOrClass: number | MischBoneClass): MischDensityProfile {
	const boneClass = typeof huOrClass === "number" ? classifyMischBone(huOrClass) : huOrClass;
	return MISCH_BONE_PROFILES[boneClass];
}

export interface MischBoneConfig {
	readonly mischClass: MischBoneClass;
	readonly classNameRu: string;
	readonly anatomicalLocationRu: string;
	readonly densityRangeRu: string;
	readonly gvMinInclusive: number;
	readonly gvMaxInclusive: number;
	readonly tactileFeelRu: string;
	readonly colorHex: string;
	readonly bgBadgeHex: string;
	readonly borderBadgeHex: string;
	readonly clinicalDescriptionRu: string;
	readonly surgicalPreparationProtocolRu: string;
	readonly recommendedTorqueNcm: {
		readonly min: number;
		readonly max: number;
		readonly target: number;
	};
	readonly healingMonths: {
		readonly mandible: number;
		readonly maxilla: number;
	};
}

export const MISCH_BONE_CONFIGS: Record<MischBoneClass, MischBoneConfig> = {
	D1: {
		mischClass: "D1",
		classNameRu: "Класс D1 — Плотная кортикальная кость",
		anatomicalLocationRu: "Передний отдел нижней челюсти (между ментальными отверстиями)",
		densityRangeRu: "> 1250 GV (HU)",
		gvMinInclusive: 1251,
		gvMaxInclusive: 3000,
		tactileFeelRu: "Дуб / слоновая кость",
		colorHex: "#1d4ed8",
		bgBadgeHex: "#dbeafe",
		borderBadgeHex: "#93c5fd",
		clinicalDescriptionRu:
			"Гомогенная плотная кортикальная кость с минимальным трабекулярным кровоснабжением. Опасность термического ожога кости при препарировании ложа.",
		surgicalPreparationProtocolRu:
			"Полное препарирование на всю рабочую длину с калибровкой кортикальной фрезой. Обязательное нарезание резьбы метчиком (bone tap) на всю глубину на скорости 15–25 об/мин с обильным внешним и внутренним охлаждением стерильным физраствором для исключения перегрева кости выше 47°C. Рекомендуются имплантаты с мелким шагом резьбы.",
		recommendedTorqueNcm: { min: 35, max: 50, target: 40 },
		healingMonths: { mandible: 3, maxilla: 4 },
	},
	D2: {
		mischClass: "D2",
		classNameRu: "Класс D2 — Плотная пористая кортикальная и крупнопетлистая губчатая кость",
		anatomicalLocationRu: "Передний и дистальный отделы нижней челюсти, передний отдел верхней челюсти",
		densityRangeRu: "850–1250 GV (HU)",
		gvMinInclusive: 850,
		gvMaxInclusive: 1250,
		tactileFeelRu: "Сосна / белое дерево (плотная древесина средней твердости)",
		colorHex: "#047857",
		bgBadgeHex: "#d1fae5",
		borderBadgeHex: "#6ee7b7",
		clinicalDescriptionRu:
			"Идеальный баланс между кортикальной опорой и богатым трабекулярным кровоснабжением. Оптимальные биологические условия для быстрой остеоинтеграции и высокой первичной стабильности.",
		surgicalPreparationProtocolRu:
			"Классический ступенчатый хирургический протокол сверления с финишной фрезой номинального диаметра. Нарезание резьбы метчиком только кортикальной шейки (на 2–3 мм при выраженном кортексе). Прогноз первичной стабильности 35–45 Нсм.",
		recommendedTorqueNcm: { min: 30, max: 45, target: 35 },
		healingMonths: { mandible: 3, maxilla: 4 },
	},
	D3: {
		mischClass: "D3",
		classNameRu: "Класс D3 — Тонкая пористая кортикальная и мелкопетлистая губчатая кость",
		anatomicalLocationRu: "Передний и дистальный отделы верхней челюсти, дистальный отдел нижней челюсти",
		densityRangeRu: "350–850 GV (HU)",
		gvMinInclusive: 350,
		gvMaxInclusive: 849,
		tactileFeelRu: "Плотная бальза / фанера",
		colorHex: "#b45309",
		bgBadgeHex: "#fef3c7",
		borderBadgeHex: "#fcd34d",
		clinicalDescriptionRu:
			"Тонкая кортикальная пластинка и умеренно пористая губчатая сердцевина. Требуется бережное формирование ложа для обеспечения торка за счет уплотнения трабекул.",
		surgicalPreparationProtocolRu:
			"Щадящее препарирование ложа: финишная фреза на 0.5–1.0 мм меньше номинального диаметра имплантата (under-drilling) для достижения бикортикальной фиксации и компрессии кости. Метчик не используется. Предпочтительны корневидные имплантаты с коническим телом и выраженным режущим профилем.",
		recommendedTorqueNcm: { min: 25, max: 35, target: 30 },
		healingMonths: { mandible: 4, maxilla: 5 },
	},
	D4: {
		mischClass: "D4",
		classNameRu: "Класс D4 — Тонкая мелкопетлистая кость низкой плотности",
		anatomicalLocationRu: "Дистальный отдел верхней челюсти (область моляров и бугра верхней челюсти)",
		densityRangeRu: "150–350 GV (HU)",
		gvMinInclusive: 150,
		gvMaxInclusive: 349,
		tactileFeelRu: "Пенопласт / мягкая бальза",
		colorHex: "#c2410c",
		bgBadgeHex: "#ffedd5",
		borderBadgeHex: "#fdba74",
		clinicalDescriptionRu:
			"Очень тонкая кортикальная пластинка или ее отсутствие, крупнопористая губчатая ткань с низкой минерализацией. Высокий риск первичной нестабильности и провала имплантата при стандартном протоколе сверления.",
		surgicalPreparationProtocolRu:
			"Максимальное сохранение костного вещества: остеоконденсация (ручные или моторные остеотомы вместо фрез), препарирование только тонким пилотным сверлом 2.0 мм с последующим раздвижением трабекул остеотомами. Применение имплантатов с агрессивной самонарезающей резьбой (например, Osstem TSIII SA/CA, Straumann BLX). Протокол недопрепарирования ложа на 1–2 размера фрез. Бикортикальная фиксация в дно пазухи или небный кортекс.",
		recommendedTorqueNcm: { min: 20, max: 35, target: 25 },
		healingMonths: { mandible: 4, maxilla: 6 },
	},
	D5: {
		mischClass: "D5",
		classNameRu: "Класс D5 — Незрелая слабоминерализованная кость / Дефект",
		anatomicalLocationRu: "Зоны недавних удалений, свежие костные аугментаты или выраженная атрофия",
		densityRangeRu: "< 150 GV (HU)",
		gvMinInclusive: -1000,
		gvMaxInclusive: 149,
		tactileFeelRu: "Воздушный мусс / волокнистая ткань",
		colorHex: "#b91c1c",
		bgBadgeHex: "#fee2e2",
		borderBadgeHex: "#fca5a5",
		clinicalDescriptionRu:
			"Крайне низкая плотность (незрелый регенерат, остеомаляция или тяжелая остеопения). Условия для первичной стабильности стандартного дентального имплантата отсутствуют.",
		surgicalPreparationProtocolRu:
			"Установка стандартного дентального имплантата противопоказана без предварительной костной пластики (GBR) и выдержки 6–9 месяцев для минерализации, либо применение бикортикальных скуловых (Zygoma) / птеригоидных имплантатов.",
		recommendedTorqueNcm: { min: 0, max: 15, target: 10 },
		healingMonths: { mandible: 6, maxilla: 9 },
	},
};

export interface MischBoneAssessment extends MischBoneConfig {
	readonly measuredGv: number;
}

export function classifyMischBoneDensity(gv: number): MischBoneAssessment {
	let mischClass: MischBoneClass;

	if (gv > 1250) {
		mischClass = "D1";
	} else if (gv >= 850) {
		mischClass = "D2";
	} else if (gv >= 350) {
		mischClass = "D3";
	} else if (gv >= 150) {
		mischClass = "D4";
	} else {
		mischClass = "D5";
	}

	const config = MISCH_BONE_CONFIGS[mischClass];
	return {
		...config,
		measuredGv: Number(gv.toFixed(1)),
	};
}

export function getMischClassConfig(mischClass: MischBoneClass): MischBoneConfig {
	return MISCH_BONE_CONFIGS[mischClass];
}

export interface LekholmZarbInfo {
	readonly type: LekholmZarbType;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly morphologyRu: string;
}

export const LEKHOLM_ZARB_INFO: Record<LekholmZarbType, LekholmZarbInfo> = {
	Type_I: {
		type: "Type_I",
		nameRu: "Тип I — Гомогенная компактная кость",
		descriptionRu: "Практически вся челюсть состоит из плотной компактной кости.",
		morphologyRu: "Гомогенный кортекс без выраженного губчатого вещества.",
	},
	Type_II: {
		type: "Type_II",
		nameRu: "Тип II — Толстый кортикальный слой вокруг плотной губчатой кости",
		descriptionRu: "Толстый слой компактной кости окружает плотную губчатую сердцевину.",
		morphologyRu: "Кортикальный слой >= 1.5 мм, плотные трабекулы.",
	},
	Type_III: {
		type: "Type_III",
		nameRu: "Тип III — Тонкий кортикальный слой вокруг плотной губчатой кости",
		descriptionRu: "Тонкий слой компактной кости окружает плотную губчатую сердцевину достаточной прочности.",
		morphologyRu: "Кортикальный слой < 1.5 мм, губчатая кость нормальной плотности.",
	},
	Type_IV: {
		type: "Type_IV",
		nameRu: "Тип IV — Тонкий кортикальный слой вокруг разреженной губчатой кости",
		descriptionRu: "Тонкий слой компактной кости окружает рыхлую низкоминерализованную губчатую кость.",
		morphologyRu: "Кортикальный слой < 1.5 мм, крупнопористая трабекулярная сеть.",
	},
};

// ── Pure Algorithms ────────────────────────────────────────────

/**
 * Classifies CT Hounsfield Units (HU) or CBCT Gray Values (GV) into Carl Misch classes.
 *
 * Range bounds:
 *   D1: > 1250 HU
 *   D2: 850..1250 HU
 *   D3: 350..<850 HU
 *   D4: 150..<350 HU
 *   D5: < 150 HU
 */
export function classifyMischBone(hu: number): MischBoneClass {
	if (hu > 1250) return "D1";
	if (hu >= 850) return "D2";
	if (hu >= 350) return "D3";
	if (hu >= 150) return "D4";
	return "D5";
}

export const classifyBone = classifyMischBone;

/**
 * Classifies bone architecture according to Lekholm & Zarb (1985) based on
 * measured cortical plate thickness and trabecular core density.
 *
 * - Type I:   Cortical thickness >= 2.5 mm OR trabecular density >= 1000 HU (homogeneous compact)
 * - Type II:  Cortical thickness >= 1.5 mm AND trabecular density >= 500 HU (thick cortex + dense core)
 * - Type III: Cortical thickness < 1.5 mm AND trabecular density >= 400 HU (thin cortex + dense core),
 *             OR thick cortex with moderate core
 * - Type IV:  Cortical thickness < 1.5 mm AND trabecular density < 400 HU (thin cortex + sparse core)
 */
export function classifyLekholmZarb(
	corticalThicknessMm: number,
	trabecularHU: number,
): LekholmZarbType {
	if (corticalThicknessMm >= 2.5 || trabecularHU >= 1000) {
		return "Type_I";
	}
	if (corticalThicknessMm >= 1.5) {
		return trabecularHU >= 500 ? "Type_II" : "Type_III";
	}
	return trabecularHU >= 400 ? "Type_III" : "Type_IV";
}

/**
 * Calculates cortical thickness in millimeters from linear ray samples.
 * Samples are evaluated starting from the initial crest surface inward.
 * Evaluates contiguous run of samples meeting or exceeding corticalThresholdHU.
 * If initial crest surface is below threshold, cortical thickness is 0.
 */
export function calculateCorticalThickness(
	crestSamples: number[],
	voxelSpacingMm: number,
	corticalThresholdHU = 700,
): number {
	if (!crestSamples || crestSamples.length === 0 || voxelSpacingMm <= 0) {
		return 0;
	}

	const first = crestSamples[0];
	if (first === undefined || first === null || isNaN(first) || first < corticalThresholdHU) {
		return 0;
	}

	let contiguousCount = 0;
	for (let i = 0; i < crestSamples.length; i++) {
		const val = crestSamples[i];
		if (val !== undefined && val !== null && !isNaN(val) && val >= corticalThresholdHU) {
			contiguousCount++;
		} else {
			break;
		}
	}

	const thickness = contiguousCount * voxelSpacingMm;
	return Math.round(thickness * 100) / 100;
}

/**
 * Determines surgical osteotomy preparation protocol, insertion torque,
 * and ISQ stability forecast based on Misch bone class and cortical thickness.
 */
export function determineOsteotomyProtocol(
	misch: MischBoneClass,
	corticalThicknessMm: number,
): OsteotomyRecommendation {
	switch (misch) {
		case "D1":
			return {
				drillProtocol: "bone_tap_countersink",
				drillProtocolDescriptionRu:
					"Обязательное нарезание резьбы метчиком (bone tap) на всю глубину и зенкование (countersink)",
				recommendedTorqueNcm: { min: 35, max: 45, target: 40 },
				estimatedISQ: { min: 75, max: 85, target: 80 },
				primaryStabilityExpected: "high",
				coolingRecommendationRu:
					"Обильное наружное и внутреннее охлаждение стерильным физраствором 0.9% (+4°C), скорость метчика 15–25 об/мин",
				surgicalTipsRu: [
					"Защита от термического остеонекроза (порог перегрева 47°C)",
					"Калибровка кортикальной фрезой номинального диаметра",
					"Рекомендуются имплантаты с мелким шагом резьбы и коническим телом",
				],
			};

		case "D2":
			return {
				drillProtocol: "standard",
				drillProtocolDescriptionRu:
					"Стандартный ступенчатый протокол препарирования номинального диаметра",
				recommendedTorqueNcm: { min: 35, max: 40, target: 38 },
				estimatedISQ: { min: 70, max: 80, target: 75 },
				primaryStabilityExpected: "high",
				coolingRecommendationRu:
					"Стандартное охлаждение физраствором при 800–1200 об/мин",
				surgicalTipsRu: [
					"Оптимальный баланс кортикальной фиксации и кровоснабжения",
					"Метчик применяется только в области плотной шейки (на 2–3 мм) при выраженном кортексе",
					"Высокая прогнозируемость немедленной нагрузки при торке >= 35 Н·см",
				],
			};

		case "D3": {
			const isThinCortex = corticalThicknessMm < 1.0;
			return {
				drillProtocol: isThinCortex ? "under_drill" : "standard",
				drillProtocolDescriptionRu: isThinCortex
					? "Щадящее препарирование ложа (under-drilling на 0.5 мм при тонком кортексе)"
					: "Стандартное бережное препарирование с финишной калибровкой",
				recommendedTorqueNcm: { min: 25, max: 35, target: 30 },
				estimatedISQ: { min: 60, max: 70, target: 65 },
				primaryStabilityExpected: "medium",
				coolingRecommendationRu:
					"Умеренное охлаждение, защита трабекулярного каркаса",
				surgicalTipsRu: [
					"Конденсация трабекул финишной конусной фрезой без чрезмерного высверливания",
					"Предпочтительны корневидные имплантаты с выраженным режущим профилем",
					"При достижении торка >= 30 Н·см возможна фиксация формирователя десны",
				],
			};
		}

		case "D4":
			return {
				drillProtocol: "under_drill",
				drillProtocolDescriptionRu:
					"Протокол недопрепарирования (under-drilling) на 1–2 шага диаметра фрезы и остеоконденсация",
				recommendedTorqueNcm: { min: 15, max: 25, target: 20 },
				estimatedISQ: { min: 45, max: 60, target: 52 },
				primaryStabilityExpected: "low",
				coolingRecommendationRu:
					"Охлаждение на этапе пилотного сверла, ручные остеотомы без термической травмы",
				surgicalTipsRu: [
					"Использование ручных или моторных остеотомов (компрессия кости вместо высверливания стружки)",
					"Имплантаты с глубокой агрессивной самонарезающей резьбой (увеличенный шаг)",
					"Поиск бикортикальной опоры (дно верхнечелюстной пазухи, кортикальная пластинка носа или неба)",
					"Рекомендуется двухэтапный протокол с установкой винта-заглушки и ушиванием наглухо",
				],
			};

		case "D5":
		default:
			return {
				drillProtocol: "bicortical_fixation",
				drillProtocolDescriptionRu:
					"Протокол бикортикальной фиксации либо отсроченная имплантация после реконструктивной аугментации (GBR)",
				recommendedTorqueNcm: { min: 10, max: 20, target: 15 },
				estimatedISQ: { min: 30, max: 45, target: 38 },
				primaryStabilityExpected: "compromised",
				coolingRecommendationRu:
					"Минимальная механическая травма ложа, бережная ирригация",
				surgicalTipsRu: [
					"Прямая установка стандартного имплантата сопряжена с высоким риском ранней дезинтеграции",
					"Рекомендуется предварительная направленная костная регенерация (GBR) с экспозицией 6–9 месяцев",
					"При невозможности пластики рассмотреть скуловые (Zygoma) или птеригоидные имплантаты",
					"Отказ от ранней или функциональной нагрузки до подтверждения остеоинтеграции",
				],
			};
	}
}

// ── Volumetric 3D Implant Bed Sampling ─────────────────────────

export interface SampleImplantSiteBoneQualityParams {
	vol: VolumeSamplingData;
	entry: Vec3;
	apex: Vec3;
	radiusMm: number;
	config?: Partial<BoneSamplingConfig>;
	implantId?: string;
	toothNumber?: number;
}

/** Sample one world coordinate; returns null when coordinates fall outside bounds. */
function sampleWorldVoxel(vol: VolumeSamplingData, x: number, y: number, z: number): number | null {
	const ci = (x - vol.origin[0]) * vol.invSx;
	const cj = (y - vol.origin[1]) * vol.invSy;
	const ck = (z - vol.origin[2]) * vol.invSz;

	if (
		ci < 0 ||
		cj < 0 ||
		ck < 0 ||
		ci >= vol.dims[0] - 1 ||
		cj >= vol.dims[1] - 1 ||
		ck >= vol.dims[2] - 1
	) {
		return null;
	}

	const val = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
	if (val === null || val === undefined || isNaN(val) || val <= AIR_HU) {
		return null;
	}
	return val;
}

/**
 * Performs discrete 3D volumetric sampling along the implant vector and concentric
 * radial mantle to evaluate cortical thickness, trabecular density, Misch class,
 * Lekholm-Zarb type, and osteotomy recommendations.
 */
export function sampleImplantSiteBoneQuality(
	params: SampleImplantSiteBoneQualityParams,
): BoneSiteAssessment {
	const { vol, entry, apex, radiusMm } = params;
	const config = boneSamplingConfigSchema.parse(params.config ?? {});
	const implantId = params.implantId ?? "IMP-PLAN-01";
	const toothNumber = params.toothNumber ?? 36;

	const dir: Vec3 = [
		apex[0] - entry[0],
		apex[1] - entry[1],
		apex[2] - entry[2],
	];
	const len = len3(dir);

	// Degenerate geometry guard
	if (len < 1e-6) {
		const defaultRec = determineOsteotomyProtocol("D5", 0);
		return {
			implantId,
			toothNumber,
			meanHU: 0,
			mischClass: "D5",
			lekholmZarbType: "Type_IV",
			corticalThicknessCrestMm: 0,
			corticalThicknessApicalMm: 0,
			trabecularDensityHU: 0,
			osteotomyRecommendation: defaultRec,
			sampleCount: 0,
			minHU: 0,
			maxHU: 0,
			stdDevHU: 0,
			assessmentDate: new Date().toISOString().slice(0, 10),
		};
	}

	const u = normalize3(dir);
	const ref: Vec3 = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
	const p1 = normalize3(cross3(u, ref));
	const p2 = normalize3(cross3(u, p1));
	const rr = Math.max(0.1, radiusMm * config.radialFraction);

	const allSamples: number[] = [];
	const trabecularSamples: number[] = [];
	let minHU = Infinity;
	let maxHU = -Infinity;

	// Centerline and radial cylinder sampling
	for (let a = 0; a <= config.axialSteps; a++) {
		const t = a / config.axialSteps;
		const cx = entry[0] + dir[0] * t;
		const cy = entry[1] + dir[1] * t;
		const cz = entry[2] + dir[2] * t;

		const cVal = sampleWorldVoxel(vol, cx, cy, cz);
		if (cVal !== null) {
			allSamples.push(cVal);
			if (cVal < minHU) minHU = cVal;
			if (cVal > maxHU) maxHU = cVal;
			if (t >= 0.2 && t <= 0.8) {
				trabecularSamples.push(cVal);
			}
		}

		for (let r = 0; r < config.radialSteps; r++) {
			const ang = (2 * Math.PI * r) / config.radialSteps;
			const ca = Math.cos(ang) * rr;
			const sa = Math.sin(ang) * rr;
			const px = cx + p1[0] * ca + p2[0] * sa;
			const py = cy + p1[1] * ca + p2[1] * sa;
			const pz = cz + p1[2] * ca + p2[2] * sa;

			const rVal = sampleWorldVoxel(vol, px, py, pz);
			if (rVal !== null) {
				allSamples.push(rVal);
				if (rVal < minHU) minHU = rVal;
				if (rVal > maxHU) maxHU = rVal;
				if (t >= 0.2 && t <= 0.8) {
					trabecularSamples.push(rVal);
				}
			}
		}
	}

	// Cortical thickness sampling (Crestal & Apical)
	const vSpacing = Math.max(0.1, vol.vSpacing || 0.5);
	const searchSteps = Math.max(3, Math.ceil(config.corticalSearchRadiusMm / vSpacing));

	// Crest samples penetrating from entry along implant direction
	const crestSamples: number[] = [];
	for (let s = 0; s < searchSteps; s++) {
		const dist = s * vSpacing;
		const sx = entry[0] + u[0] * dist;
		const sy = entry[1] + u[1] * dist;
		const sz = entry[2] + u[2] * dist;
		const val = sampleWorldVoxel(vol, sx, sy, sz);
		if (val !== null) {
			crestSamples.push(val);
		}
	}
	const corticalThicknessCrestMm = calculateCorticalThickness(
		crestSamples,
		vSpacing,
		config.corticalThresholdHU,
	);

	// Apical samples extending around the apex along the trajectory
	const apicalSamples: number[] = [];
	for (let s = -Math.floor(searchSteps / 2); s <= searchSteps; s++) {
		const dist = s * vSpacing;
		const sx = apex[0] + u[0] * dist;
		const sy = apex[1] + u[1] * dist;
		const sz = apex[2] + u[2] * dist;
		const val = sampleWorldVoxel(vol, sx, sy, sz);
		if (val !== null) {
			apicalSamples.push(val);
		}
	}
	const corticalThicknessApicalMm = calculateCorticalThickness(
		apicalSamples,
		vSpacing,
		config.corticalThresholdHU,
	);

	// Statistical computation
	const count = allSamples.length;
	let meanHU = 0;
	let stdDevHU = 0;

	if (count > 0) {
		const sum = allSamples.reduce((acc, v) => acc + v, 0);
		meanHU = Math.round((sum / count) * 10) / 10;

		const varSum = allSamples.reduce((acc, v) => acc + (v - meanHU) ** 2, 0);
		stdDevHU = Math.round(Math.sqrt(varSum / count) * 10) / 10;
	} else {
		minHU = 0;
		maxHU = 0;
	}

	const trabecularDensityHU = trabecularSamples.length > 0
		? Math.round((trabecularSamples.reduce((a, b) => a + b, 0) / trabecularSamples.length) * 10) / 10
		: meanHU;

	const mischClass = classifyMischBone(meanHU);
	const lekholmZarbType = classifyLekholmZarb(corticalThicknessCrestMm, trabecularDensityHU);
	const osteotomyRecommendation = determineOsteotomyProtocol(mischClass, corticalThicknessCrestMm);

	return {
		implantId,
		toothNumber,
		meanHU,
		mischClass,
		lekholmZarbType,
		corticalThicknessCrestMm,
		corticalThicknessApicalMm,
		trabecularDensityHU,
		osteotomyRecommendation,
		sampleCount: count,
		minHU: minHU === Infinity ? 0 : Math.round(minHU * 10) / 10,
		maxHU: maxHU === -Infinity ? 0 : Math.round(maxHU * 10) / 10,
		stdDevHU,
		assessmentDate: new Date().toISOString().slice(0, 10),
	};
}

// ── Medical Outpatient Record Protocol (Form 043/u) ─────────────

/**
 * Formats a formal A4-printable clinical bone assessment and osteotomy planning
 * protocol for the Russian outpatient medical dental record (Form 043/u).
 *
 * Strictly adheres to Mandate 8d item 7: ZERO EMOJIS!
 */
export function formatBoneQualityForm043A4Protocol(
	assessment: BoneSiteAssessment,
): string {
	const mischInfo = MISCH_CLASSIFICATION_INFO[assessment.mischClass];
	const lzInfo = LEKHOLM_ZARB_INFO[assessment.lekholmZarbType];
	const rec = assessment.osteotomyRecommendation;

	const lines: string[] = [
		"═══════════════════════════════════════════════════════════════════════════════",
		"ПРОТОКОЛ ПЛАНИРОВАНИЯ ОСТЕОТОМИИ И ОЦЕНКИ ПЛОТНОСТИ КОСТНОЙ ТКАНИ (ФОРМА 043/У)",
		"═══════════════════════════════════════════════════════════════════════════════",
		`Идентификатор имплантата: ${assessment.implantId}`,
		`Позиция зуба (FDI):       Зуб ${assessment.toothNumber}`,
		`Дата проведения оценки:   ${assessment.assessmentDate ?? "Не указана"}`,
		"───────────────────────────────────────────────────────────────────────────────",
		"1. КОЛИЧЕСТВЕННАЯ ДЕНСИТОМЕТРИЯ И МОРФОЛОГИЧЕСКАЯ КЛАССИФИКАЦИЯ",
		`Средняя плотность ложа:     ${assessment.meanHU.toFixed(1)} HU (GV)`,
		`Плотность губчатого ядра:   ${assessment.trabecularDensityHU.toFixed(1)} HU (GV)`,
		`Диапазон плотности [min..max]: [${assessment.minHU ?? 0} .. ${assessment.maxHU ?? 0}] HU (GV)`,
		`Стандартное отклонение:     +/- ${assessment.stdDevHU ?? 0} HU`,
		`Количество 3D-сэмплов:      ${assessment.sampleCount ?? 0}`,
		"",
		`Класс плотности по Misch:   ${assessment.mischClass} — ${mischInfo.classNameRu}`,
		`Анатомический ориентир:     ${mischInfo.anatomicalLocationRu}`,
		`Тактильная характеристика:  ${mischInfo.tactileFeelRu}`,
		`Клиническое описание:       ${mischInfo.clinicalDescriptionRu}`,
		"",
		`Морфология по Lekholm-Zarb: ${assessment.lekholmZarbType} — ${lzInfo.nameRu}`,
		`Кортикальный слой (гребень): ${assessment.corticalThicknessCrestMm.toFixed(2)} мм`,
		`Кортикальный слой (апекс):   ${assessment.corticalThicknessApicalMm.toFixed(2)} мм`,
		"───────────────────────────────────────────────────────────────────────────────",
		"2. ХИРУРГИЧЕСКИЙ ПРОТОКОЛ ОСТЕОТОМИИ И РЕКОМЕНДАЦИИ ПО СВЕРЛЕНИЮ",
		`Хирургический протокол:     ${rec.drillProtocol.toUpperCase()}`,
		`Описание протокола:         ${rec.drillProtocolDescriptionRu}`,
		`Рекомендуемый торк:         ${rec.recommendedTorqueNcm.min}–${rec.recommendedTorqueNcm.max} Н*см (целевой: ${rec.recommendedTorqueNcm.target ?? rec.recommendedTorqueNcm.min} Н*см)`,
		`Прогноз стабильности ISQ:   ${rec.estimatedISQ.min}–${rec.estimatedISQ.max} ед. (целевой: ${rec.estimatedISQ.target ?? rec.estimatedISQ.min} ед.)`,
		`Ожидаемая первичная фиксация: ${rec.primaryStabilityExpected.toUpperCase()}`,
		`Режим охлаждения:           ${rec.coolingRecommendationRu}`,
		"",
		"Хирургические рекомендации:",
	];

	for (let i = 0; i < rec.surgicalTipsRu.length; i++) {
		lines.push(`  [${i + 1}] ${rec.surgicalTipsRu[i]}`);
	}

	lines.push(
		"───────────────────────────────────────────────────────────────────────────────",
		"Заключение хирурга-имплантолога: Ложе запланировано с учетом биомеханических",
		"параметров плотности кости. Протокол остеотомии утвержден к исполнению.",
		"Подпись врача-стоматолога-хирурга: _______________________ / М.П.",
		"═══════════════════════════════════════════════════════════════════════════════",
	);

	return lines.join("\n");
}

/** Result of 3D implant bed bone density volumetric sampling */
export interface BoneSample {
	meanHU: number;
	bone: MischBoneClass;
	samples: number;
	minHU?: number;
	maxHU?: number;
	stdDevHU?: number;
	profile?: MischGuidance;
}

/** Sample one world point; returns null when coordinates fall outside the volume bounding box */
function sampleWorldPoint(
	vol: VolumeSamplingData,
	x: number,
	y: number,
	z: number,
): number | null {
	const ci = (x - vol.origin[0]) * vol.invSx;
	const cj = (y - vol.origin[1]) * vol.invSy;
	const ck = (z - vol.origin[2]) * vol.invSz;

	if (
		ci < 0 ||
		cj < 0 ||
		ck < 0 ||
		ci >= vol.dims[0] - 1 ||
		cj >= vol.dims[1] - 1 ||
		ck >= vol.dims[2] - 1
	) {
		return null;
	}

	return trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
}

/**
 * Volumetric sampling of bone density along the planned implant bed:
 * - Centerline plus a concentric ring of radial samples at 60% radius (representing
 *   the intimate implant-bone contact zone) over the full entry -> apex length.
 * - Samples outside the volume bounding box are ignored.
 * - Calculates mean HU, min, max, standard deviation, and attaches the matching Misch profile.
 *
 * Returns null if the implant length is negligible (< 1e-6) or if zero samples lie within the volume.
 */
export function sampleImplantBoneHU(
	vol: VolumeSamplingData,
	entry: Vec3,
	apex: Vec3,
	radius: number,
	axialSteps = 12,
	radialSteps = 4,
): BoneSample | null {
	const dir: Vec3 = [
		apex[0] - entry[0],
		apex[1] - entry[1],
		apex[2] - entry[2],
	];
	const len = Math.hypot(dir[0], dir[1], dir[2]);
	if (len < 1e-6) return null;

	const u: Vec3 = [dir[0] / len, dir[1] / len, dir[2] / len];
	const ref: Vec3 = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
	const p1 = normalize3(cross3(u, ref));
	const p2 = cross3(u, p1);
	const rr = radius * 0.6;

	let sum = 0;
	let n = 0;
	let min = Infinity;
	let max = -Infinity;
	const collected: number[] = [];

	for (let a = 0; a <= axialSteps; a++) {
		const t = a / axialSteps;
		const cx = entry[0] + dir[0] * t;
		const cy = entry[1] + dir[1] * t;
		const cz = entry[2] + dir[2] * t;

		const c = sampleWorldPoint(vol, cx, cy, cz);
		if (c !== null) {
			sum += c;
			n++;
			collected.push(c);
			if (c < min) min = c;
			if (c > max) max = c;
		}

		for (let r = 0; r < radialSteps; r++) {
			const ang = (2 * Math.PI * r) / radialSteps;
			const ca = Math.cos(ang) * rr;
			const sa = Math.sin(ang) * rr;
			const px = cx + p1[0] * ca + p2[0] * sa;
			const py = cy + p1[1] * ca + p2[1] * sa;
			const pz = cz + p1[2] * ca + p2[2] * sa;
			const v = sampleWorldPoint(vol, px, py, pz);
			if (v !== null) {
				sum += v;
				n++;
				collected.push(v);
				if (v < min) min = v;
				if (v > max) max = v;
			}
		}
	}

	if (n === 0) return null;

	const meanHU = sum / n;

	let varSum = 0;
	for (const v of collected) {
		const diff = v - meanHU;
		varSum += diff * diff;
	}
	const stdDevHU = Math.sqrt(varSum / n);
	const bone = classifyMischBone(meanHU);

	const cleanMin = min !== Infinity ? min : meanHU;
	const cleanMax = max !== -Infinity ? max : meanHU;

	return {
		meanHU: Math.abs(meanHU - Math.round(meanHU)) < 1e-6 ? Math.round(meanHU) : meanHU,
		bone,
		samples: n,
		minHU: Math.abs(cleanMin - Math.round(cleanMin)) < 1e-6 ? Math.round(cleanMin) : cleanMin,
		maxHU: Math.abs(cleanMax - Math.round(cleanMax)) < 1e-6 ? Math.round(cleanMax) : cleanMax,
		stdDevHU: Math.abs(stdDevHU - Math.round(stdDevHU)) < 1e-6 ? Math.round(stdDevHU) : stdDevHU,
		profile: getMischBoneClinicalGuidance(bone),
	};
}

// ── Implant Drill Sequence & HU Zone Protocol ───────────────────

export type MischClass = MischBoneClass;

export type ImplantSystem =
	| "osstem"
	| "straumann"
	| "nobel"
	| "bredent"
	| "mdi"
	| "other";

export interface HUZoneProfile {
	corticalHU: number; // avg HU of coronal 20% (cortical plate)
	cancellousHU: number; // avg HU of middle 60% (trabecular)
	apicalHU: number; // avg HU of apical 20%
}

export interface DrillStep {
	step: number;
	drillType: string;
	diameterMm: number;
	depthMm: number;
	rpmRange: string;
	torqueNcm: string;
	irrigation: boolean;
	note?: string;
}

export interface DrillProtocol {
	mischClass: MischClass;
	implantSystem: ImplantSystem;
	implantDiameterMm: number;
	implantLengthMm: number;
	avgOverallHU: number;
	zones: HUZoneProfile;
	steps: DrillStep[];
	warnings: string[];
	underdrillingApplied: boolean;
	corticalTapRequired: boolean;
}

export type ExtendedMischClass = MischClass;

/**
 * Classify bone density per Misch classification from averaged HU.
 */
export function classifyMisch(avgHU: number): MischClass {
	if (avgHU > 1250) return "D1";
	if (avgHU >= 850) return "D2";
	if (avgHU >= 350) return "D3";
	return "D4";
}

/**
 * Классификация плотности кости по Мишу с поддержкой D5 (<150 HU).
 */
export function classifyExtendedBoneDensity(hu: number): {
	mischClass: ExtendedMischClass;
	label: string;
	drillingRecommendation: string;
} {
	if (hu > 1250) {
		return {
			mischClass: "D1",
			label: "D1 (>1250 HU) — Плотная кортикальная кость",
			drillingRecommendation:
				"Обязательна кортикальная фреза (Cortical Tap), низкие обороты (400–600 RPM) с обильным охлаждением. Высокий риск перегрева/остеонекроза!",
		};
	}
	if (hu >= 850) {
		return {
			mischClass: "D2",
			label: "D2 (850–1250 HU) — Пористая кортикальная и плотная губчатая",
			drillingRecommendation:
				"Стандартный хирургический протокол (800–1000 RPM). Идеальная первичная стабильность.",
		};
	}
	if (hu >= 350) {
		return {
			mischClass: "D3",
			label: "D3 (350–850 HU) — Тонкая кортикальная и мелкая губчатая",
			drillingRecommendation:
				"Стандартный протокол с финишным профильным сверлом (1000 RPM). Хороший прогноз остеоинтеграции.",
		};
	}
	if (hu >= 150) {
		return {
			mischClass: "D4",
			label: "D4 (150–350 HU) — Мягкая губчатая кость",
			drillingRecommendation:
				"Недопрепарирование (Under-drilling) на 1.0–1.5 мм меньше диаметра имплантата для компрессии кости и набора торка.",
		};
	}
	return {
		mischClass: "D5",
		label: "D5 (<150 HU) — Сверхмягкая / резорбированная кость",
		drillingRecommendation:
			"Критическое недопрепарирование (Under-drilling) на 1.5–2.0 мм, костная конденсация остеотомами или бикортикальная фиксация.",
	};
}

/**
 * Extract HU zone profile from an array of HU samples along the implant axis.
 * Expects samples ordered from coronal neck (crest) to apical tip.
 */
export function extractHUZones(huSamples: number[]): HUZoneProfile {
	if (huSamples.length === 0) {
		return { corticalHU: 0, cancellousHU: 0, apicalHU: 0 };
	}

	const n = huSamples.length;
	const corticalCount = Math.max(1, Math.round(n * 0.2));
	const apicalCount = Math.max(1, Math.round(n * 0.2));

	// Neck zone = first 20% (cortical plate at top)
	const corticalSamples = huSamples.slice(0, corticalCount);
	// Apical zone = last 20%
	const apicalSamples = huSamples.slice(n - apicalCount);
	// Middle zone = cancellous
	const cancellousSamples = huSamples.slice(corticalCount, n - apicalCount);

	const avg = (arr: number[]) =>
		arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;

	return {
		corticalHU: avg(corticalSamples),
		cancellousHU: avg(
			cancellousSamples.length > 0 ? cancellousSamples : huSamples,
		),
		apicalHU: avg(apicalSamples),
	};
}

/**
 * Generate a drill sequence protocol based on bone class, implant system and dimensions.
 */
export function generateDrillProtocol(
	zones: HUZoneProfile,
	system: ImplantSystem,
	diameterMm: number,
	lengthMm: number,
): DrillProtocol {
	// Анатомически взвешенная плотность: 20% кортикальная пластинка, 60% губчатая кость, 20% апикальная зона
	const avgHU =
		zones.corticalHU * 0.2 + zones.cancellousHU * 0.6 + zones.apicalHU * 0.2;
	const mischClass = classifyMisch(avgHU);
	const warnings: string[] = [];
	let underdrillingApplied = false;
	let corticalTapRequired = false;

	const steps: DrillStep[] = [];

	// --- Common first step: Pilot drill ---
	steps.push({
		step: 1,
		drillType: "Pilot Drill",
		diameterMm: 2.0,
		depthMm: lengthMm,
		rpmRange: "800–1000 RPM",
		torqueNcm: "45 Ncm",
		irrigation: true,
		note: "Обязательное охлаждение физраствором",
	});

	if (mischClass === "D1") {
		// Very dense — cortical tap required, low RPM, prevent necrosis
		corticalTapRequired = true;
		warnings.push(
			`D1-кость (HU=${Math.round(avgHU)}): Обязательно кортикальная фреза (Cortical Tap). Низкие обороты! Риск остеонекроза при перегреве.`,
		);

		steps.push({
			step: 2,
			drillType: "Cortical Drill",
			diameterMm: 2.8,
			depthMm: Math.min(4, lengthMm * 0.3),
			rpmRange: "400–600 RPM",
			torqueNcm: "40 Ncm",
			irrigation: true,
			note: "Только кортикальная зона — не глубже 30% длины",
		});
		steps.push({
			step: 3,
			drillType: `Profile Drill ${diameterMm - 0.5}mm`,
			diameterMm: diameterMm - 0.5,
			depthMm: lengthMm,
			rpmRange: "500–700 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
			note: "Профильное сверло на 0.5мм меньше номинала",
		});
		steps.push({
			step: 4,
			drillType: "Cortical Tap",
			diameterMm: diameterMm,
			depthMm: Math.min(3, lengthMm * 0.2),
			rpmRange: "15–20 RPM",
			torqueNcm: "50 Ncm",
			irrigation: true,
			note: "Нарезка резьбы только в кортикальной зоне",
		});
		steps.push({
			step: 5,
			drillType: `Final Profile ${diameterMm}mm`,
			diameterMm,
			depthMm: lengthMm,
			rpmRange: "500 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
		});
	} else if (mischClass === "D2") {
		steps.push({
			step: 2,
			drillType: "Twist Drill 2.8mm",
			diameterMm: 2.8,
			depthMm: lengthMm,
			rpmRange: "800–1000 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
		});
		steps.push({
			step: 3,
			drillType: `Profile Drill ${diameterMm - 0.2}mm`,
			diameterMm: diameterMm - 0.2,
			depthMm: lengthMm,
			rpmRange: "700–900 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
		});
		steps.push({
			step: 4,
			drillType: `Final Drill ${diameterMm}mm`,
			diameterMm,
			depthMm: lengthMm,
			rpmRange: "800 RPM",
			torqueNcm: "45 Ncm",
			irrigation: true,
		});
	} else if (mischClass === "D3") {
		steps.push({
			step: 2,
			drillType: "Twist Drill 2.8mm",
			diameterMm: 2.8,
			depthMm: lengthMm,
			rpmRange: "1000–1200 RPM",
			torqueNcm: "35 Ncm",
			irrigation: true,
		});
		steps.push({
			step: 3,
			drillType: `Final Drill ${diameterMm}mm`,
			diameterMm,
			depthMm: lengthMm,
			rpmRange: "1000 RPM",
			torqueNcm: "35 Ncm",
			irrigation: true,
			note: "Нормальный протокол — кость достаточно мягкая",
		});
	} else {
		// D4 — very soft, underdrill 1-1.5 steps to maximize primary stability
		underdrillingApplied = true;
		const effectiveDrill = Math.max(2.0, diameterMm - 1.5);
		warnings.push(
			`D4-кость (HU=${Math.round(avgHU)}): Недопрепарирование (Under-drilling)! Сверло на ${(diameterMm - effectiveDrill).toFixed(1)}мм меньше номинала. Максимальная первичная стабильность.`,
		);
		steps.push({
			step: 2,
			drillType: "Twist Drill 2.0mm",
			diameterMm: 2.0,
			depthMm: lengthMm,
			rpmRange: "1200 RPM",
			torqueNcm: "25 Ncm",
			irrigation: false,
			note: "D4: минимальный диаметр для максимального захвата",
		});
		steps.push({
			step: 3,
			drillType: `Under-profile ${effectiveDrill}mm`,
			diameterMm: effectiveDrill,
			depthMm: lengthMm,
			rpmRange: "1000 RPM",
			torqueNcm: "30 Ncm",
			irrigation: false,
			note: `Намеренно меньше ${diameterMm}мм — компрессионная остеоинтеграция`,
		});
	}

	// System-specific final notes
	const systemNote = getSystemNote(system, mischClass, diameterMm);
	if (systemNote) {
		const lastStep = steps[steps.length - 1];
		if (lastStep) {
			lastStep.note = `${lastStep.note || ""} | ${systemNote}`;
		}
	}

	// Angulation note if zones differ significantly (rough heuristic)
	if (Math.abs(zones.corticalHU - zones.apicalHU) > 400) {
		warnings.push(
			`Значительная разница плотности кортикала (${Math.round(zones.corticalHU)} HU) и апекса (${Math.round(zones.apicalHU)} HU). Учитывайте при планировании глубины.`,
		);
	}

	return {
		mischClass,
		implantSystem: system,
		implantDiameterMm: diameterMm,
		implantLengthMm: lengthMm,
		avgOverallHU: avgHU,
		zones,
		steps,
		warnings,
		underdrillingApplied,
		corticalTapRequired,
	};
}

function getSystemNote(
	system: ImplantSystem,
	misch: MischClass,
	diameter: number,
): string {
	switch (system) {
		case "osstem":
			return misch === "D4"
				? `Osstem: TS III SA — активная резьба, рекомендован Ø${diameter}×10mm+`
				: `Osstem: TS III — стандартный протокол`;
		case "straumann":
			return misch === "D1"
				? `Straumann BLT: обязателен Tap бор`
				: `Straumann BLX: самонарезающий — исключить tap`;
		case "nobel":
			return misch === "D4"
				? `Nobel Active: самоконденсирующая резьба — ДОПУСТИМО без финального сверла`
				: `Nobel Parallel CC: стандартный протокол`;
		default:
			return "";
	}
}

/**
 * Human-readable summary for a Misch class
 */
export function mischDescription(cls: MischClass): string {
	switch (cls) {
		case "D1":
			return "D1 — Очень плотная (>1250 HU): кортикальная, трудно сверлить";
		case "D2":
			return "D2 — Плотная (850–1250 HU): идеальна для имплантации";
		case "D3":
			return "D3 — Средняя (350–850 HU): приемлема, хороший прогноз";
		case "D4":
		default:
			return "D4 — Мягкая (150–350 HU): риск нестабильности, недопрепарирование";
	}
}
