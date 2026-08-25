import { z } from "zod";

/**
 * 6 anatomical probing sites per tooth according to standard Florida Probe workflow:
 * - MB: Mesio-Buccal (Медиально-вестибулярно / медиально-щечно)
 * - B: Mid-Buccal (По центру вестибулярно / щечно)
 * - DB: Disto-Buccal (Дистально-вестибулярно / дистально-щечно)
 * - ML: Mesio-Lingual (Медиально-язычно / медиально-нёбно)
 * - L: Mid-Lingual (По центру язычно / нёбно)
 * - DL: Disto-Lingual (Дистально-язычно / дистально-нёбно)
 */
export const perioSiteKeySchema = z.enum([
	"distoBuccal",
	"midBuccal",
	"mesioBuccal",
	"distoLingual",
	"midLingual",
	"mesioLingual",
]);
export type PerioSiteKey = z.infer<typeof perioSiteKeySchema>;

export const perioSiteShortKeySchema = z.enum(["MB", "B", "DB", "ML", "L", "DL"]);
export type PerioSiteShortKey = z.infer<typeof perioSiteShortKeySchema>;

export interface PerioSiteConfig {
	readonly key: PerioSiteKey;
	readonly shortKey: PerioSiteShortKey;
	readonly labelRu: string;
	readonly aspect: "buccal" | "lingual";
	readonly anatomicalLocationRu: string;
}

export const PERIO_SITES_CONFIG: readonly PerioSiteConfig[] = [
	{
		key: "mesioBuccal",
		shortKey: "MB",
		labelRu: "Медиально-вестибулярно (MB)",
		aspect: "buccal",
		anatomicalLocationRu: "Медиально-щечный угол",
	},
	{
		key: "midBuccal",
		shortKey: "B",
		labelRu: "По центру вестибулярно (B)",
		aspect: "buccal",
		anatomicalLocationRu: "Середина вестибулярной поверхности",
	},
	{
		key: "distoBuccal",
		shortKey: "DB",
		labelRu: "Дистально-вестибулярно (DB)",
		aspect: "buccal",
		anatomicalLocationRu: "Дистально-щечный угол",
	},
	{
		key: "mesioLingual",
		shortKey: "ML",
		labelRu: "Медиально-орально (ML)",
		aspect: "lingual",
		anatomicalLocationRu: "Медиально-язычный/нёбный угол",
	},
	{
		key: "midLingual",
		shortKey: "L",
		labelRu: "По центру орально (L)",
		aspect: "lingual",
		anatomicalLocationRu: "Середина язычной/нёбной поверхности",
	},
	{
		key: "distoLingual",
		shortKey: "DL",
		labelRu: "Дистально-орально (DL)",
		aspect: "lingual",
		anatomicalLocationRu: "Дистально-язычный/нёбный угол",
	},
] as const;

export const BUCCAL_SITE_KEYS: readonly PerioSiteKey[] = [
	"distoBuccal",
	"midBuccal",
	"mesioBuccal",
] as const;

export const LINGUAL_SITE_KEYS: readonly PerioSiteKey[] = [
	"distoLingual",
	"midLingual",
	"mesioLingual",
] as const;

export const PERIO_SITE_KEYS: readonly PerioSiteKey[] = [
	"distoBuccal",
	"midBuccal",
	"mesioBuccal",
	"distoLingual",
	"midLingual",
	"mesioLingual",
] as const;

export const perioSiteMeasurementSchema = z.object({
	/** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
	probingDepthMm: z.number().int().min(0).max(20).default(0),
	/** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
	gingivalMarginMm: z.number().int().min(-15).max(15).default(0),
	/** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
	bleedingOnProbing: z.boolean().default(false),
	/** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
	suppuration: z.boolean().default(false),
	/** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
	plaque: z.boolean().default(false),
	/** Поддесневой зубной камень (Calculus, CALC) */
	calculus: z.boolean().default(false),
	/** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
	calMm: z.number().int().optional(),
});
export type PerioSiteMeasurement = z.infer<typeof perioSiteMeasurementSchema>;

export const furcationGradeSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
	z.literal(3),
	z.literal(4),
]);
export type FurcationGrade = z.infer<typeof furcationGradeSchema>;

export const mobilityGradeSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
	z.literal(3),
]);
export type MobilityGrade = z.infer<typeof mobilityGradeSchema>;

export const perioToothRecordSchema = z.object({
	/** Номер зуба по международной двухцифровой классификации FDI (11..48, 51..85) */
	toothNumber: z.number().int().min(11).max(85),
	/** Зуб отсутствует (адентия, удалён) */
	isMissing: z.boolean().default(false),
	/** Имплантат (периимплантатное зондирование) */
	isImplant: z.boolean().default(false),
	/** Подвижность зуба по шкале Миллера / Энтина (0 = физиологическая, 1 = I ст., 2 = II ст., 3 = III ст.) */
	mobility: mobilityGradeSchema.default(0),
	/** Вовлечение бифуркации/трифуркации корней моляров по Hamp & Glickman (0 = норма, 1 = I ст., 2 = II ст., 3 = III ст., 4 = IV ст.) */
	furcation: furcationGradeSchema.default(0),
	/** 6 анатомических точек зондирования */
	distoBuccal: perioSiteMeasurementSchema.default({}),
	midBuccal: perioSiteMeasurementSchema.default({}),
	mesioBuccal: perioSiteMeasurementSchema.default({}),
	distoLingual: perioSiteMeasurementSchema.default({}),
	midLingual: perioSiteMeasurementSchema.default({}),
	mesioLingual: perioSiteMeasurementSchema.default({}),
});
export type PerioToothRecord = z.infer<typeof perioToothRecordSchema>;

export const aapStageSchema = z.enum([
	"health",
	"gingivitis",
	"stage_1",
	"stage_2",
	"stage_3",
	"stage_4",
]);
export type AapStage = z.infer<typeof aapStageSchema>;

export const aapGradeSchema = z.enum(["grade_a", "grade_b", "grade_c"]);
export type AapGrade = z.infer<typeof aapGradeSchema>;

export const praRiskLevelSchema = z.enum(["low", "moderate", "high"]);
export type PraRiskLevel = z.infer<typeof praRiskLevelSchema>;

export const smokingStatusSchema = z.enum(["non_smoker", "light", "heavy"]);
export type SmokingStatus = z.infer<typeof smokingStatusSchema>;

export const diabetesStatusSchema = z.enum(["none", "controlled", "uncontrolled"]);
export type DiabetesStatus = z.infer<typeof diabetesStatusSchema>;

export const perioChartSummarySchema = z.object({
	totalTeethExamined: z.number().int().nonnegative(),
	totalSitesProbed: z.number().int().nonnegative(),
	/** Full Mouth Bleeding Score (FMBS / BOP %) в процентах (0..100%) */
	fmbsPercent: z.number().min(0).max(100),
	/** Full Mouth Plaque Score (FMPS) в процентах (0..100%) */
	fmpsPercent: z.number().min(0).max(100),
	/** Число глубоких карманов (PD >= 5 мм) */
	deepPocketsCount: z.number().int().nonnegative(),
	/** Число умеренных карманов (PD == 4 мм) */
	moderatePocketsCount: z.number().int().nonnegative(),
	/** Число участков с нагноением (Suppuration) */
	sitesWithSuppurationCount: z.number().int().nonnegative(),
	/** Число участков с поддесневым зубным камнем */
	sitesWithCalculusCount: z.number().int().nonnegative(),
	/** Число подвижных зубов (подвижность >= 1) */
	teethWithMobilityCount: z.number().int().nonnegative(),
	/** Число зубов с поражением фуркации (фуркация >= 1) */
	teethWithFurcationCount: z.number().int().nonnegative(),
	/** Максимальная глубина кармана (мм) */
	maxPocketDepthMm: z.number().int().nonnegative(),
	/** Средняя глубина кармана (мм) */
	meanPocketDepthMm: z.number().nonnegative(),
	/** Максимальная потеря прикрепления (CAL мм) */
	maxCalMm: z.number().int().nonnegative(),
	/** Средняя потеря прикрепления (CAL мм) */
	meanCalMm: z.number().nonnegative(),
	/** Категория риска по Lang & Tonetti (PRA) */
	riskCategory: praRiskLevelSchema,
	/** Стадия пародонтита по классификации AAP/EFP 2018 */
	aapStage: aapStageSchema.optional(),
	/** Степень прогрессирования (Грейд) по классификации AAP/EFP 2018 */
	aapGrade: aapGradeSchema.optional(),
});
export type PerioChartSummary = z.infer<typeof perioChartSummarySchema>;

export const perioChartDataSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	visitId: z.string().uuid().optional().nullable(),
	doctorId: z.string().uuid().optional().nullable(),
	chartDate: z.string(),
	teeth: z.array(perioToothRecordSchema),
	summary: perioChartSummarySchema.optional(),
	notes: z.string().optional().nullable(),
	praRisk: praRiskLevelSchema.optional(),
});
export type PerioChartData = z.infer<typeof perioChartDataSchema>;

/**
 * Standard adult dental arches for periodontal examination (FDI).
 */
export const PERIO_UPPER_ARCH_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
] as const;

export const PERIO_LOWER_ARCH_TEETH = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;

export const ALL_PERIO_TEETH = [
	...PERIO_UPPER_ARCH_TEETH,
	...PERIO_LOWER_ARCH_TEETH,
] as const;

/**
 * Probing step in continuous Florida probe workflow.
 */
export interface ProbingStep {
	readonly toothNumber: number;
	readonly siteKey: PerioSiteKey;
	readonly arch: "upper" | "lower";
	readonly aspect: "buccal" | "lingual";
}

/**
 * Furcation grading details according to Hamp et al. & Glickman classifications.
 */
export interface FurcationGradeDetail {
	readonly grade: FurcationGrade;
	readonly codeRu: string;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly symbol: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
}

export const FURCATION_GRADES: Record<number, FurcationGradeDetail> = {
	0: {
		grade: 0,
		codeRu: "0",
		nameRu: "Норма (0 ст.)",
		descriptionRu: "Фуркационный дефект отсутствует, межкорневая перегородка интактна",
		symbol: "—",
		badgeColor: "#64748b",
		badgeBg: "rgba(100, 116, 139, 0.12)",
	},
	1: {
		grade: 1,
		codeRu: "I",
		nameRu: "Начальная (I ст.)",
		descriptionRu: "Горизонтальное проникновение зонда Наберса до 3 мм в область бифуркации/трифуркации",
		symbol: "△",
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.15)",
	},
	2: {
		grade: 2,
		codeRu: "II",
		nameRu: "Частичная (II ст.)",
		descriptionRu: "Зонд Наберса проникает более чем на 3 мм вглубь, но не проходит насквозь (тупиковый костный карман)",
		symbol: "▲",
		badgeColor: "#f97316",
		badgeBg: "rgba(249, 115, 22, 0.18)",
	},
	3: {
		grade: 3,
		codeRu: "III",
		nameRu: "Сквозная (III ст.)",
		descriptionRu: "Сквозной дефект: зонд свободно проходит между корнями с вестибулярной на оральную сторону",
		symbol: "▲",
		badgeColor: "#ef4444",
		badgeBg: "rgba(239, 68, 68, 0.2)",
	},
	4: {
		grade: 4,
		codeRu: "IV",
		nameRu: "Сквозная с рецессией (IV ст.)",
		descriptionRu: "Сквозной дефект фуркации с обнажением бифуркации вследствие рецессии десны (визуализируется насквозь)",
		symbol: "◆",
		badgeColor: "#dc2626",
		badgeBg: "rgba(220, 38, 38, 0.25)",
	},
};

/**
 * Mobility grading details according to Miller's Classification.
 */
export interface MobilityGradeDetail {
	readonly grade: MobilityGrade;
	readonly codeRu: string;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
}

export const MOBILITY_GRADES: Record<number, MobilityGradeDetail> = {
	0: {
		grade: 0,
		codeRu: "0",
		nameRu: "Физиологическая (0)",
		descriptionRu: "Физиологическая подвижность зуба в пределах связочного аппарата (< 0.2 мм)",
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.12)",
	},
	1: {
		grade: 1,
		codeRu: "I",
		nameRu: "I степень (до 1 мм)",
		descriptionRu: "Горизонтальная патологическая подвижность коронки зуба до 1 мм в вестибуло-оральном направлении",
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.15)",
	},
	2: {
		grade: 2,
		codeRu: "II",
		nameRu: "II степень (> 1 мм)",
		descriptionRu: "Горизонтальная подвижность более 1 мм в вестибуло-оральном и медио-дистальном направлениях",
		badgeColor: "#f97316",
		badgeBg: "rgba(249, 115, 22, 0.18)",
	},
	3: {
		grade: 3,
		codeRu: "III",
		nameRu: "III степень (вертикальная)",
		descriptionRu: "Тяжелая подвижность во всех направлениях, включая вертикальное осевое погружение (ротация и люфт)",
		badgeColor: "#ef4444",
		badgeBg: "rgba(239, 68, 68, 0.25)",
	},
};
