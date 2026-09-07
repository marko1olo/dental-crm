/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE & SEPA PERIODONTOGRAM CLINICAL ENGINE & SCHEMAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements SEPA (Sociedad Española de Periodoncia) & Florida Probe standard
 * 6-point clinical periodontal charting, snapshot models, and index computations.
 *
 * Probing sites per tooth (6 points):
 * - Vestibular / Buccal: MV (Mesio-Vestibular), V (Mid-Vestibular), DV (Disto-Vestibular)
 * - Lingual / Palatal:   ML (Mesio-Lingual),    L (Mid-Lingual),    DL (Disto-Lingual)
 */

import { z } from "zod";

// FDI Permanent Teeth tracked in Periodontogram (11–18, 21–28, 31–38, 41–48)
export const SEPA_PERMANENT_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	38, 37, 36, 35, 34, 33, 32, 31,
	41, 42, 43, 44, 45, 46, 47, 48,
] as const;

export const SEPA_SITE_CODES = ["MV", "V", "DV", "ML", "L", "DL"] as const;
export type SepaSiteCode = (typeof SEPA_SITE_CODES)[number];

export const VESTIBULAR_SEPA_SITES: readonly SepaSiteCode[] = ["MV", "V", "DV"] as const;
export const PALATAL_SEPA_SITES: readonly SepaSiteCode[] = ["ML", "L", "DL"] as const;

export const PROGNOSIS_VALUES = ["good", "fair", "poor", "hopeless"] as const;
export type PeriodontalPrognosis = (typeof PROGNOSIS_VALUES)[number];

export const FURCATION_VALUES = ["0", "I", "II", "III"] as const;
export type SepaFurcationGrade = (typeof FURCATION_VALUES)[number];

export const SNAPSHOT_STATUS_VALUES = ["draft", "closed"] as const;
export type SepaSnapshotStatus = (typeof SNAPSHOT_STATUS_VALUES)[number];

export const SITES_PER_TOOTH = 6;
export const DEEP_POCKET_THRESHOLD_MM = 5;

export type HeatmapTone = "neutral" | "success" | "warning-low" | "warning-high" | "error";

export const HEATMAP_TONE_TO_HEX: Record<HeatmapTone, string> = {
	neutral: "#94a3b8", // slate-400
	success: "#10b981", // emerald-500 (<= 3mm)
	"warning-low": "#f59e0b", // amber-500 (4mm)
	"warning-high": "#f97316", // orange-500 (5-6mm)
	error: "#ef4444", // rose-500 (>= 7mm)
};

/**
 * Maps probing depth to discrete 4-tone pastel clinical heatmap tone.
 */
export function getProbingDepthHeatmapTone(pd: number | null | undefined): HeatmapTone {
	if (pd === null || pd === undefined || !Number.isFinite(pd)) return "neutral";
	if (pd <= 3) return "success";
	if (pd === 4) return "warning-low";
	if (pd <= 6) return "warning-high";
	return "error";
}

export function getProbingDepthHexColor(pd: number | null | undefined): string {
	return HEATMAP_TONE_TO_HEX[getProbingDepthHeatmapTone(pd)];
}

// ───────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ───────────────────────────────────────────────────────────────────────────

export const sepaSiteCodeSchema = z.enum(["MV", "V", "DV", "ML", "L", "DL"]);

export const sepaSiteValueSchema = z.object({
	siteCode: sepaSiteCodeSchema,
	probingDepthMm: z.number().int().min(0).max(15).nullable().default(null),
	gingivalMarginMm: z.number().int().min(-5).max(10).nullable().default(null),
	bleedingOnProbing: z.boolean().default(false),
	plaque: z.boolean().default(false),
	suppuration: z.boolean().default(false),
	calculus: z.boolean().default(false),
});
export type SepaSiteValue = z.infer<typeof sepaSiteValueSchema>;

export const sepaSitePatchSchema = z.object({
	probingDepthMm: z.number().int().min(0).max(15).nullable().optional(),
	gingivalMarginMm: z.number().int().min(-5).max(10).nullable().optional(),
	bleedingOnProbing: z.boolean().optional(),
	plaque: z.boolean().optional(),
	suppuration: z.boolean().optional(),
	calculus: z.boolean().optional(),
});
export type SepaSitePatch = z.infer<typeof sepaSitePatchSchema>;

export const sepaToothValueSchema = z.object({
	toothNumber: z.number().int().min(11).max(48),
	isPresent: z.boolean().default(true),
	isImplant: z.boolean().default(false),
	mobility: z.number().int().min(0).max(3).nullable().default(null),
	prognosis: z.enum(PROGNOSIS_VALUES).nullable().default(null),
	furcationBuccal: z.enum(FURCATION_VALUES).nullable().default(null),
	furcationLingual: z.enum(FURCATION_VALUES).nullable().default(null),
	keratinizedGingivaMm: z.number().int().min(0).max(20).nullable().default(null),
	sites: z.array(sepaSiteValueSchema).default([]),
});
export type SepaToothValue = z.infer<typeof sepaToothValueSchema>;

export const sepaToothPatchSchema = z.object({
	isPresent: z.boolean().optional(),
	isImplant: z.boolean().optional(),
	mobility: z.number().int().min(0).max(3).nullable().optional(),
	prognosis: z.enum(PROGNOSIS_VALUES).nullable().optional(),
	furcationBuccal: z.enum(FURCATION_VALUES).nullable().optional(),
	furcationLingual: z.enum(FURCATION_VALUES).nullable().optional(),
	keratinizedGingivaMm: z.number().int().min(0).max(20).nullable().optional(),
});
export type SepaToothPatch = z.infer<typeof sepaToothPatchSchema>;

export const periodontogramIndicesSchema = z.object({
	bopPct: z.number().min(0).max(100),
	piPct: z.number().min(0).max(100),
	calMeanMm: z.number().min(0),
	deepPocketsCount: z.number().int().min(0),
	moderatePocketsCount: z.number().int().min(0).optional(),
	teethWithMobilityCount: z.number().int().min(0).optional(),
	teethWithFurcationCount: z.number().int().min(0).optional(),
	sitesWithSuppurationCount: z.number().int().min(0).optional(),
	totalSitesProbed: z.number().int().min(0).optional(),
	totalTeethExamined: z.number().int().min(0).optional(),
});
export type PeriodontogramIndices = z.infer<typeof periodontogramIndicesSchema>;

export const periodontogramSnapshotSchema = z.object({
	id: z.string().uuid(),
	clinicId: z.string().uuid(),
	patientId: z.string().uuid(),
	status: z.enum(SNAPSHOT_STATUS_VALUES),
	recordedAt: z.string().datetime(),
	recordedBy: z.string().uuid(),
	closedAt: z.string().datetime().nullable().default(null),
	closedBy: z.string().uuid().nullable().default(null),
	notes: z.string().max(4000).nullable().default(null),
	indices: periodontogramIndicesSchema.nullable().default(null),
	teeth: z.array(sepaToothValueSchema).default([]),
});
export type PeriodontogramSnapshot = z.infer<typeof periodontogramSnapshotSchema>;

export const periodontogramTimelineEntrySchema = z.object({
	snapshotId: z.string().uuid(),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	changeCount: z.number().int().min(0),
});
export type PeriodontogramTimelineEntry = z.infer<typeof periodontogramTimelineEntrySchema>;

export const periodontogramTimelineResponseSchema = z.object({
	dates: z.array(periodontogramTimelineEntrySchema),
	draft: periodontogramSnapshotSchema.nullable().default(null),
});
export type PeriodontogramTimelineResponse = z.infer<typeof periodontogramTimelineResponseSchema>;

// ───────────────────────────────────────────────────────────────────────────
// Calculation Functions
// ───────────────────────────────────────────────────────────────────────────

export interface ComputationOptions {
	/**
	 * "theoretical": Denominator is 6 * present_teeth (SEPA standard, prevents incomplete probe inflation).
	 * "probed": Denominator is actual filled/measured sites (Florida probe standard).
	 */
	mode?: "theoretical" | "probed";
	deepPocketThresholdMm?: number;
}

function getPresentTeeth(teeth: readonly SepaToothValue[]): SepaToothValue[] {
	return teeth.filter((t) => t.isPresent);
}

function getDenominator(teeth: readonly SepaToothValue[], mode: "theoretical" | "probed"): number {
	const present = getPresentTeeth(teeth);
	if (mode === "theoretical") {
		return present.length * SITES_PER_TOOTH;
	}
	let count = 0;
	for (const t of present) {
		for (const s of t.sites) {
			if (s.probingDepthMm !== null) count++;
		}
	}
	return count;
}

/**
 * Computes Bleeding on Probing (BOP) percentage.
 */
export function computeBopPercentage(
	teeth: readonly SepaToothValue[],
	options: ComputationOptions = {},
): number {
	const mode = options.mode ?? "theoretical";
	const denom = getDenominator(teeth, mode);
	if (denom === 0) return 0.0;

	let bleedingSites = 0;
	for (const t of getPresentTeeth(teeth)) {
		for (const s of t.sites) {
			if (s.bleedingOnProbing) bleedingSites++;
		}
	}
	return Math.round((100.0 * bleedingSites * 10) / denom) / 10;
}

/**
 * Computes Plaque Index (PI) percentage.
 */
export function computePlaqueIndex(
	teeth: readonly SepaToothValue[],
	options: ComputationOptions = {},
): number {
	const mode = options.mode ?? "theoretical";
	const denom = getDenominator(teeth, mode);
	if (denom === 0) return 0.0;

	let plaqueSites = 0;
	for (const t of getPresentTeeth(teeth)) {
		for (const s of t.sites) {
			if (s.plaque) plaqueSites++;
		}
	}
	return Math.round((100.0 * plaqueSites * 10) / denom) / 10;
}

/**
 * Computes Mean Clinical Attachment Level in mm.
 */
export function computeMeanCal(
	teeth: readonly SepaToothValue[],
	options: ComputationOptions = {},
): number {
	const mode = options.mode ?? "theoretical";
	const denom = getDenominator(teeth, mode);
	if (denom === 0) return 0.0;

	let calSum = 0;
	for (const t of getPresentTeeth(teeth)) {
		for (const s of t.sites) {
			if (s.probingDepthMm !== null) {
				calSum += Math.max(0, s.probingDepthMm + (s.gingivalMarginMm ?? 0));
			}
		}
	}
	return Math.round((calSum / denom) * 100) / 100;
}

/**
 * Counts distinct teeth with at least one deep pocket (PD >= threshold).
 */
export function countTeethWithDeepPockets(
	teeth: readonly SepaToothValue[],
	thresholdMm: number = DEEP_POCKET_THRESHOLD_MM,
): number {
	let count = 0;
	for (const t of getPresentTeeth(teeth)) {
		const hasDeep = t.sites.some(
			(s) => s.probingDepthMm !== null && s.probingDepthMm >= thresholdMm,
		);
		if (hasDeep) count++;
	}
	return count;
}

/**
 * Computes complete bundle of periodontal indices.
 */
export function computeCompletePerioIndices(
	teeth: readonly SepaToothValue[],
	options: ComputationOptions = {},
): PeriodontogramIndices {
	const threshold = options.deepPocketThresholdMm ?? DEEP_POCKET_THRESHOLD_MM;
	const presentTeeth = getPresentTeeth(teeth);

	let moderatePockets = 0;
	let mobileTeeth = 0;
	let furcationTeeth = 0;
	let suppurationSites = 0;
	let totalProbed = 0;

	for (const t of presentTeeth) {
		if (t.mobility !== null && t.mobility > 0) mobileTeeth++;
		if (
			(t.furcationBuccal !== null && t.furcationBuccal !== "0") ||
			(t.furcationLingual !== null && t.furcationLingual !== "0")
		) {
			furcationTeeth++;
		}

		for (const s of t.sites) {
			if (s.probingDepthMm !== null) {
				totalProbed++;
				if (s.probingDepthMm === 4) moderatePockets++;
			}
			if (s.suppuration) suppurationSites++;
		}
	}

	return {
		bopPct: computeBopPercentage(teeth, options),
		piPct: computePlaqueIndex(teeth, options),
		calMeanMm: computeMeanCal(teeth, options),
		deepPocketsCount: countTeethWithDeepPockets(teeth, threshold),
		moderatePocketsCount: moderatePockets,
		teethWithMobilityCount: mobileTeeth,
		teethWithFurcationCount: furcationTeeth,
		sitesWithSuppurationCount: suppurationSites,
		totalSitesProbed: totalProbed,
		totalTeethExamined: presentTeeth.length,
	};
}

// ───────────────────────────────────────────────────────────────────────────
// 1-Click SEPA Clinical Presets (Mandates 8e, 8i, 8k, 8n)
// ───────────────────────────────────────────────────────────────────────────

/**
 * 1-Клик Пресет 1: Физиологическая норма пародонта (Z01.2).
 * Глубина зубодесневой борозды 1-2 мм, кровоточивость 0%, налет 0%, подвижность 0.
 */
export function createHealthySepaPeriodontiumPreset(): SepaToothValue[] {
	return SEPA_PERMANENT_TEETH.map((toothNumber) => ({
		toothNumber,
		isPresent: true,
		isImplant: false,
		mobility: 0,
		prognosis: "good",
		furcationBuccal: "0",
		furcationLingual: "0",
		keratinizedGingivaMm: 4,
		sites: SEPA_SITE_CODES.map((siteCode) => ({
			siteCode,
			probingDepthMm: siteCode === "V" || siteCode === "L" ? 1 : 2,
			gingivalMarginMm: 0,
			bleedingOnProbing: false,
			plaque: false,
			suppuration: false,
			calculus: false,
		})),
	}));
}

/**
 * 1-Клик Пресет 2: Хронический катаральный гингивит (K05.1).
 * Глубина 2-3 мм (ложные карманы за счет отека), диффузная кровоточивость BOP+, налет+, наддесневой камень.
 */
export function createCatarrhalGingivitisSepaPreset(): SepaToothValue[] {
	return SEPA_PERMANENT_TEETH.map((toothNumber) => {
		const isLowerAnterior = [31, 32, 41, 42].includes(toothNumber);
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(toothNumber);

		return {
			toothNumber,
			isPresent: true,
			isImplant: false,
			mobility: 0,
			prognosis: "good",
			furcationBuccal: "0",
			furcationLingual: "0",
			keratinizedGingivaMm: 4,
			sites: SEPA_SITE_CODES.map((siteCode) => ({
				siteCode,
				probingDepthMm: isLowerAnterior || isMolar ? 3 : 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: true,
				plaque: true,
				suppuration: false,
				calculus: isLowerAnterior,
			})),
		};
	});
}

/**
 * 1-Клик Пресет 3: Хронический пародонтит лёгкой степени (K05.30).
 * Пародонтальные карманы 3-4 мм, BOP+, над- и поддесневой зубной камень, потеря прикрепления CAL 1-2 мм.
 */
export function createMildPeriodontitisSepaPreset(): SepaToothValue[] {
	return SEPA_PERMANENT_TEETH.map((toothNumber) => {
		const isLowerAnterior = [31, 32, 41, 42].includes(toothNumber);
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(toothNumber);
		const depth = isLowerAnterior || isMolar ? 4 : 3;

		return {
			toothNumber,
			isPresent: true,
			isImplant: false,
			mobility: isLowerAnterior ? 1 : 0,
			prognosis: "good",
			furcationBuccal: "0",
			furcationLingual: "0",
			keratinizedGingivaMm: 3,
			sites: SEPA_SITE_CODES.map((siteCode) => ({
				siteCode,
				probingDepthMm: depth,
				gingivalMarginMm: 0,
				bleedingOnProbing: true,
				plaque: true,
				suppuration: false,
				calculus: true,
			})),
		};
	});
}

/**
 * 1-Клик Пресет 4: Хронический генерализованный пародонтит средней степени (K05.31).
 * Пародонтальные карманы 4-5 мм, рецессия 1-2 мм, поддесневой камень, фуркация I ст. на молярах, подвижность I ст.
 */
export function createModeratePeriodontitisSepaPreset(): SepaToothValue[] {
	return SEPA_PERMANENT_TEETH.map((toothNumber) => {
		const isLowerAnterior = [31, 32, 41, 42].includes(toothNumber);
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(toothNumber);
		const depth = isMolar ? 5 : 4;
		const hasFurcation = isMolar ? ("I" as const) : ("0" as const);

		return {
			toothNumber,
			isPresent: true,
			isImplant: false,
			mobility: isLowerAnterior ? 1 : 0,
			prognosis: "fair",
			furcationBuccal: hasFurcation,
			furcationLingual: hasFurcation,
			keratinizedGingivaMm: 2,
			sites: SEPA_SITE_CODES.map((siteCode) => ({
				siteCode,
				probingDepthMm: depth,
				gingivalMarginMm: -1,
				bleedingOnProbing: true,
				plaque: true,
				suppuration: false,
				calculus: true,
			})),
		};
	});
}

/**
 * 1-Клик Пресет 5: Хронический генерализованный пародонтит тяжёлой степени (K05.32).
 * Пародонтальные карманы >= 6 мм, обильный гнойный экссудат, рецессия 2-3 мм, подвижность II-III ст., фуркация II ст.
 */
export function createSeverePeriodontitisSepaPreset(): SepaToothValue[] {
	return SEPA_PERMANENT_TEETH.map((toothNumber) => {
		const isLowerAnterior = [31, 32, 41, 42].includes(toothNumber);
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(toothNumber);
		const depth = isMolar ? 7 : isLowerAnterior ? 6 : 5;
		const hasFurcation = isMolar ? ("II" as const) : ("0" as const);
		const hasSuppuration = isMolar || isLowerAnterior;

		return {
			toothNumber,
			isPresent: true,
			isImplant: false,
			mobility: isLowerAnterior ? 2 : isMolar ? 2 : 1,
			prognosis: isLowerAnterior || isMolar ? "poor" : "fair",
			furcationBuccal: hasFurcation,
			furcationLingual: hasFurcation,
			keratinizedGingivaMm: 1,
			sites: SEPA_SITE_CODES.map((siteCode) => ({
				siteCode,
				probingDepthMm: depth,
				gingivalMarginMm: -2,
				bleedingOnProbing: true,
				plaque: true,
				suppuration: hasSuppuration,
				calculus: true,
			})),
		};
	});
}

/**
 * 1-Клик Пресет 6: Профессиональная гигиена полости рта выполнена (A16.07.051).
 * Полное удаление налета и зубного камня, десна санирована, глубина 1-2 мм.
 */
export function createProHygieneSepaPreset(): SepaToothValue[] {
	return createHealthySepaPeriodontiumPreset();
}

/**
 * Генерация регламентного текста дневника Формы 043/у по данным SEPA пародонтограммы.
 */
export function generateSepaProtocol043Text(
	teeth: readonly SepaToothValue[],
	indices?: PeriodontogramIndices | null,
	options?: { presetName?: string; customNotes?: string },
): string {
	const currentIndices = indices ?? computeCompletePerioIndices(teeth);
	const deepCount = currentIndices.deepPocketsCount;
	const bop = currentIndices.bopPct.toFixed(1);
	const pi = currentIndices.piPct.toFixed(1);

	let diagnosis = "Интактный пародонт / Клиническая норма (Z01.2)";
	let icd10 = "Z01.2";
	let statusLocalis =
		"Десна бледно-розовая, плотная, зубодесневая борозда 1-2 мм. Кровоточивость при зондировании отсутствует (BOP 0%). Патологических зубодесневых карманов нет, подвижность зубов 0.";
	let treatment =
		"Санация полости рта, профилактический осмотр через 6 месяцев. Рекомендации по индивидуальной гигиене.";

	if (
		Boolean(currentIndices.sitesWithSuppurationCount) ||
		((currentIndices.teethWithMobilityCount ?? 0) >= 8 && deepCount >= 8)
	) {
		diagnosis = "Хронический генерализованный пародонтит тяжёлой степени (K05.32)";
		icd10 = "K05.32";
		statusLocalis = `Десна застойно гиперемирована с цианотичным оттенком, выраженная кровоточивость (BOP ${bop}%), налет (PI ${pi}%). Обнаружены глубокие пародонтальные карманы от 6 до 8 мм (глубоких карманов: ${deepCount}), гноетечение из ${currentIndices.sitesWithSuppurationCount ?? 0} точек, подвижность зубов II-III ст. у ${currentIndices.teethWithMobilityCount ?? 0} зубов. Выраженная рецессия десны.`;
		treatment =
			"Неотложная противовоспалительная терапия, антисептическая обработка пародонтальных карманов хлоргексидином 0.05%, эвакуация экссудата. Временное шинирование подвижных зубов (A16.07.019). Направление на глубокий закрытый кюретаж / хирургическое лечение.";
	} else if (
		deepCount > 0 ||
		(currentIndices.teethWithFurcationCount ?? 0) > 0
	) {
		diagnosis = "Хронический генерализованный пародонтит средней степени (K05.31)";
		icd10 = "K05.31";
		statusLocalis = `Десна цианотична, отечна, выраженная кровоточивость при зондировании (BOP ${bop}%), зубной налет (PI ${pi}%). Пародонтальные карманы глубиной 4-5.5 мм, рецессия десны 1-2 мм, под- и наддесневой зубной камень. Патологическая подвижность I ст. у ${currentIndices.teethWithMobilityCount ?? 0} зубов.`;
		treatment =
			"Комплексная профессиональная гигиена и поддесневой скейлинг (SRP A16.07.051), ультразвуковая обработка пародонтальных карманов, антисептическое орошение, аппликации Метрогил Дента. Обучение гигиене.";
	} else if (currentIndices.moderatePocketsCount && currentIndices.moderatePocketsCount > 0) {
		diagnosis = "Хронический пародонтит лёгкой степени (K05.30)";
		icd10 = "K05.30";
		statusLocalis = `Маргинальная десна отечна, умеренно гиперемирована, кровоточивость при зондировании (BOP ${bop}%), налет (PI ${pi}%). Пародонтальные карманы глубиной 3-4 мм без гноетечения, над- и поддесневые зубные отложения. Патологическая подвижность зубов 0-I ст.`;
		treatment =
			"Профессиональная гигиена полости рта (A16.07.051), снятие над- и поддесневых зубных отложений УЗ + Air-Flow, полировка пастой, аппликация антисептического геля.";
	} else if (currentIndices.bopPct > 10) {
		diagnosis = "Хронический катаральный гингивит (K05.1)";
		icd10 = "K05.1";
		statusLocalis = `Десна гиперемирована, отечна, выраженная диффузная кровоточивость сосочков (BOP ${bop}%), налет (PI ${pi}%). Глубина десневой борозды 2-3 мм (ложные карманы за счет отека десны, зубодесневое прикрепление сохранено). Мягкий налет, наддесневой зубной камень. Подвижность 0.`;
		treatment =
			"Профессиональная гигиена полости рта (ультразвуковое снятие отложений + Air-Flow), антисептическая обработка десен, противовоспалительные аппликации. Подбор индивидуальных средств гигиены.";
	}

	let text = `• Обследование пародонта (6-точечная пародонтограмма SEPA / Florida Probe):\n`;
	text += `  - Диагноз: ${diagnosis}\n`;
	text += `  - МКБ-10: ${icd10}\n`;
	text += `  - Индексы: BOP (кровоточивость) ${bop}%, PI (налет) ${pi}%, средняя потеря прикрепления (CAL) ${currentIndices.calMeanMm.toFixed(1)} мм, зубов с глубокими карманами (>= 5 мм): ${deepCount}.\n`;
	text += `  - Status localis: ${statusLocalis}\n`;
	text += `  - Лечение и план: ${treatment}`;

	if (options?.customNotes?.trim()) {
		text += `\n  - Особые отметки: ${options.customNotes.trim()}`;
	}

	return text;
}

