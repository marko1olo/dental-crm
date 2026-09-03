/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL HYGIENE INDICES ENGINE (OHI-S, PMA, KPI LEUS)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements standard Russian dental hygiene & periodontal assessment indices:
 * 1. OHI-S (Simplified Oral Hygiene Index / Грин-Вермиллион):
 *    - 6 index teeth: 16 (B), 11 (V), 26 (B), 36 (L), 31 (V), 46 (L).
 *    - Debris Index (DI-S: 0..3) & Calculus Index (CI-S: 0..3).
 *    - Formula: OHI-S = avg(DI-S) + avg(CI-S).
 *    - Evaluation:
 *      * 0.0 – 0.6: Отличный / Низкий уровень отложений (Good)
 *      * 0.7 – 1.6: Хороший (Good)
 *      * 1.7 – 2.5: Удовлетворительный (Fair)
 *      * 2.6 – 3.0: Неудовлетворительный (Poor)
 *      * 3.1 – 6.0: Плохой / Высокий уровень отложений (Severe)
 *
 * 2. PMA (Papillary-Marginal-Alveolar Index / Индекс Парма):
 *    - Assesses gingival inflammation:
 *      * 0 = Воспаление отсутствует (норма)
 *      * 1 = Воспаление десневого сосочка (P - Papillary)
 *      * 2 = Воспаление маргинальной десны (M - Marginal)
 *      * 3 = Воспаление альвеолярной десны (A - Alveolar)
 *    - Formula: PMA % = (Σ баллов / (3 × n)) × 100%.
 *    - Evaluation:
 *      * 0%: Норма (десна здорова)
 *      * До 25%: Легкая степень тяжести гингивита
 *      * 25% – 50%: Средняя степень тяжести гингивита
 *      * Более 50%: Тяжелая степень гингивита
 *
 * 3. KPI (Комплексный периодонтальный индекс Леуса / CPI Leus):
 *    - Assesses periodontal status by index teeth:
 *      * 0 = Здоровый периодонт (норма)
 *      * 1 = Кровоточивость при зондировании (BOP)
 *      * 2 = Зубной камень (над- или поддесневой)
 *      * 3 = Пародонтальный карман 4–5 мм
 *      * 4 = Карман ≥ 6 мм или патологическая подвижность II-III ст.
 *    - Formula: КПИ = Σ баллов / n.
 *    - Evaluation:
 *      * 0.0: Здоровый периодонт (норма)
 *      * 0.1 – 1.0: Риск заболевания / начальные изменения
 *      * 1.1 – 2.0: Легкая степень поражения периодонта
 *      * 2.1 – 3.5: Средняя степень тяжести поражения
 *      * 3.6 – 5.0: Тяжелая степень поражения периодонта
 *
 * Works with 1 to 6 index teeth without forcing all 32 teeth to be charted.
 */

import type { PerioToothRecord } from "./types.js";

/**
 * The 6 canonical Ramfjord/Green-Vermillion index teeth (FDI).
 */
export const HYGIENE_INDEX_TEETH_NUMBERS = [16, 11, 26, 36, 31, 46] as const;
export type HygieneIndexToothNumber = (typeof HYGIENE_INDEX_TEETH_NUMBERS)[number];

export interface HygieneIndexToothDefinition {
	readonly toothNumber: HygieneIndexToothNumber;
	readonly surfaceAspect: "vestibular" | "oral";
	readonly surfaceLabelRu: string;
	readonly anatomicalNameRu: string;
}

export const HYGIENE_INDEX_TEETH_CONFIG: readonly HygieneIndexToothDefinition[] = [
	{
		toothNumber: 16,
		surfaceAspect: "vestibular",
		surfaceLabelRu: "Вестибулярная (щечная)",
		anatomicalNameRu: "Правый верхний первый моляр",
	},
	{
		toothNumber: 11,
		surfaceAspect: "vestibular",
		surfaceLabelRu: "Вестибулярная (губная)",
		anatomicalNameRu: "Правый верхний центральный резец",
	},
	{
		toothNumber: 26,
		surfaceAspect: "vestibular",
		surfaceLabelRu: "Вестибулярная (щечная)",
		anatomicalNameRu: "Левый верхний первый моляр",
	},
	{
		toothNumber: 36,
		surfaceAspect: "oral",
		surfaceLabelRu: "Оральная (язычная)",
		anatomicalNameRu: "Левый нижний первый моляр",
	},
	{
		toothNumber: 31,
		surfaceAspect: "vestibular",
		surfaceLabelRu: "Вестибулярная (губная)",
		anatomicalNameRu: "Левый нижний центральный резец",
	},
	{
		toothNumber: 46,
		surfaceAspect: "oral",
		surfaceLabelRu: "Оральная (язычная)",
		anatomicalNameRu: "Правый нижний первый моляр",
	},
] as const;

/**
 * Raw data per examined index tooth.
 */
export interface HygieneToothAssessment {
	readonly toothNumber: number;
	/** Зубной налёт DI-S (0: нет, 1: до 1/3, 2: от 1/3 до 2/3, 3: более 2/3) */
	readonly debrisScore?: number | undefined;
	/** Зубной камень CI-S (0: нет, 1: наддесневой до 1/3, 2: наддесневой 1/3..2/3 или очаги поддесневого, 3: более 2/3 или сплошной поддесневой) */
	readonly calculusScore?: number | undefined;
	/** Воспаление по PMA (0: норма, 1: сосочек P, 2: маргинальная десна M, 3: альвеолярная десна A) */
	readonly pmaScore?: number | undefined;
	/** Оценка периодонта по КПИ Леуса (0: норма, 1: кровоточивость, 2: камень, 3: карман 4-5мм, 4: карман >=6мм/подвижность) */
	readonly kpiScore?: number | undefined;
}

// ─── OHI-S RESULT ─────────────────────────────────────────────────────────────

export type OhiSGrade = "excellent" | "good" | "moderate" | "poor" | "severe";

export interface OhiSResult {
	readonly debrisScore: number;
	readonly calculusScore: number;
	readonly totalScore: number;
	readonly ratingText: string;
	readonly clinicalEvaluation: OhiSGrade;
	readonly assessedTeethCount: number;
	readonly isOptimal: boolean;
}

/**
 * Calculates Green-Vermillion Index (OHI-S / УИГ).
 * Gracefully averages over available assessed index teeth (1..6).
 */
export function calculateOhiSScore(
	teethMap: Record<number, { debrisScore?: number | undefined; calculusScore?: number | undefined }> | readonly HygieneToothAssessment[],
): OhiSResult {
	let totalDebris = 0;
	let totalCalculus = 0;
	let debrisCount = 0;
	let calculusCount = 0;
	const teethEntries = Array.isArray(teethMap)
		? teethMap
		: Object.entries(teethMap).map(([num, val]) => ({ toothNumber: Number(num), ...val }));

	for (const entry of teethEntries) {
		if (typeof entry.debrisScore === "number" && Number.isFinite(entry.debrisScore)) {
			totalDebris += Math.max(0, Math.min(3, entry.debrisScore));
			debrisCount++;
		}
		if (typeof entry.calculusScore === "number" && Number.isFinite(entry.calculusScore)) {
			totalCalculus += Math.max(0, Math.min(3, entry.calculusScore));
			calculusCount++;
		}
	}

	const assessedTeethCount = Math.max(debrisCount, calculusCount);
	if (assessedTeethCount === 0) {
		return {
			debrisScore: 0,
			calculusScore: 0,
			totalScore: 0,
			ratingText: "OHI-S = 0 (Норма / осмотр не проводился)",
			clinicalEvaluation: "excellent",
			assessedTeethCount: 0,
			isOptimal: true,
		};
	}

	const avgDebris = debrisCount > 0 ? Math.round((totalDebris / debrisCount) * 10) / 10 : 0;
	const avgCalculus = calculusCount > 0 ? Math.round((totalCalculus / calculusCount) * 10) / 10 : 0;
	const total = Math.round((avgDebris + avgCalculus) * 10) / 10;

	let clinicalEvaluation: OhiSGrade = "excellent";
	let ratingText = `OHI-S = ${total.toFixed(1)} (Отличная гигиена)`;

	if (total <= 0.6) {
		clinicalEvaluation = "excellent";
		ratingText = `OHI-S = ${total.toFixed(1)} (Низкий уровень налета / отличная гигиена)`;
	} else if (total <= 1.6) {
		clinicalEvaluation = "good";
		ratingText = `OHI-S = ${total.toFixed(1)} (Хороший уровень гигиены)`;
	} else if (total <= 2.5) {
		clinicalEvaluation = "moderate";
		ratingText = `OHI-S = ${total.toFixed(1)} (Удовлетворительный уровень гигиены)`;
	} else if (total <= 3.0) {
		clinicalEvaluation = "poor";
		ratingText = `OHI-S = ${total.toFixed(1)} (Неудовлетворительный уровень гигиены)`;
	} else {
		clinicalEvaluation = "severe";
		ratingText = `OHI-S = ${total.toFixed(1)} (Плохой уровень гигиены / массивные отложения)`;
	}

	return {
		debrisScore: avgDebris,
		calculusScore: avgCalculus,
		totalScore: total,
		ratingText,
		clinicalEvaluation,
		assessedTeethCount,
		isOptimal: total <= 0.6,
	};
}

// ─── PMA RESULT ───────────────────────────────────────────────────────────────

export type PmaSeverityGrade = "intact" | "mild" | "moderate" | "severe";

export interface PmaResult {
	readonly pmaPercent: number;
	readonly totalPoints: number;
	readonly maxPossiblePoints: number;
	readonly assessedTeethCount: number;
	readonly severity: PmaSeverityGrade;
	readonly ratingText: string;
	readonly isHealthy: boolean;
}

/**
 * Calculates Parma's Papillary-Marginal-Alveolar (PMA) Index in percent.
 * Formula: PMA = (Σ баллов / (3 × n)) × 100%.
 */
export function calculatePmaScore(
	teethMap: Record<number, { pmaScore?: number | undefined }> | readonly HygieneToothAssessment[],
): PmaResult {
	let totalPoints = 0;
	let assessedTeethCount = 0;

	const teethEntries = Array.isArray(teethMap)
		? teethMap
		: Object.entries(teethMap).map(([num, val]) => ({ toothNumber: Number(num), ...val }));

	for (const entry of teethEntries) {
		if (typeof entry.pmaScore === "number" && Number.isFinite(entry.pmaScore)) {
			totalPoints += Math.max(0, Math.min(3, entry.pmaScore));
			assessedTeethCount++;
		}
	}

	if (assessedTeethCount === 0) {
		return {
			pmaPercent: 0,
			totalPoints: 0,
			maxPossiblePoints: 0,
			assessedTeethCount: 0,
			severity: "intact",
			ratingText: "PMA = 0% (Десна здорова, воспаление отсутствует)",
			isHealthy: true,
		};
	}

	const maxPossiblePoints = assessedTeethCount * 3;
	const pmaPercent = Math.round((totalPoints / maxPossiblePoints) * 1000) / 10;

	let severity: PmaSeverityGrade = "intact";
	let ratingText = `PMA = ${pmaPercent}% (Десна здорова)`;

	if (pmaPercent === 0) {
		severity = "intact";
		ratingText = `PMA = 0% (Десна здорова, воспаление отсутствует)`;
	} else if (pmaPercent <= 25) {
		severity = "mild";
		ratingText = `PMA = ${pmaPercent}% (Легкая степень гингивита / сосочки)`;
	} else if (pmaPercent <= 50) {
		severity = "moderate";
		ratingText = `PMA = ${pmaPercent}% (Средняя степень гингивита / край десны)`;
	} else {
		severity = "severe";
		ratingText = `PMA = ${pmaPercent}% (Тяжелая степень гингивита / альвеолярная десна)`;
	}

	return {
		pmaPercent,
		totalPoints,
		maxPossiblePoints,
		assessedTeethCount,
		severity,
		ratingText,
		isHealthy: pmaPercent === 0,
	};
}

// ─── KPI LEUS RESULT ──────────────────────────────────────────────────────────

export type KpiSeverityGrade = "healthy" | "risk" | "mild" | "moderate" | "severe";

export interface KpiResult {
	readonly kpiScore: number;
	readonly totalPoints: number;
	readonly assessedTeethCount: number;
	readonly severity: KpiSeverityGrade;
	readonly ratingText: string;
	readonly isHealthy: boolean;
}

/**
 * Calculates Leus Complex Periodontal Index (КПИ Леуса).
 * Formula: КПИ = Σ баллов / n.
 */
export function calculateKpiScore(
	teethMap: Record<number, { kpiScore?: number | undefined }> | readonly HygieneToothAssessment[],
): KpiResult {
	let totalPoints = 0;
	let assessedTeethCount = 0;

	const teethEntries = Array.isArray(teethMap)
		? teethMap
		: Object.entries(teethMap).map(([num, val]) => ({ toothNumber: Number(num), ...val }));

	for (const entry of teethEntries) {
		if (typeof entry.kpiScore === "number" && Number.isFinite(entry.kpiScore)) {
			totalPoints += Math.max(0, Math.min(4, entry.kpiScore));
			assessedTeethCount++;
		}
	}

	if (assessedTeethCount === 0) {
		return {
			kpiScore: 0,
			totalPoints: 0,
			assessedTeethCount: 0,
			severity: "healthy",
			ratingText: "КПИ = 0.0 (Здоровый периодонт)",
			isHealthy: true,
		};
	}

	const kpiScore = Math.round((totalPoints / assessedTeethCount) * 10) / 10;

	let severity: KpiSeverityGrade = "healthy";
	let ratingText = `КПИ = ${kpiScore.toFixed(1)} (Здоровый периодонт)`;

	if (kpiScore === 0) {
		severity = "healthy";
		ratingText = `КПИ = 0.0 (Здоровый периодонт / интактен)`;
	} else if (kpiScore <= 1.0) {
		severity = "risk";
		ratingText = `КПИ = ${kpiScore.toFixed(1)} (Риск заболевания пародонта)`;
	} else if (kpiScore <= 2.0) {
		severity = "mild";
		ratingText = `КПИ = ${kpiScore.toFixed(1)} (Легкая степень поражения)`;
	} else if (kpiScore <= 3.5) {
		severity = "moderate";
		ratingText = `КПИ = ${kpiScore.toFixed(1)} (Средняя степень тяжести пародонтита)`;
	} else {
		severity = "severe";
		ratingText = `КПИ = ${kpiScore.toFixed(1)} (Тяжелая степень поражения пародонта)`;
	}

	return {
		kpiScore,
		totalPoints,
		assessedTeethCount,
		severity,
		ratingText,
		isHealthy: kpiScore === 0,
	};
}

// ─── COMBINED REPORT & EXTRACTOR FROM FULL PERIODONTOGRAM ─────────────────────

export interface CombinedHygieneReport {
	readonly ohiS: OhiSResult;
	readonly pma: PmaResult;
	readonly kpi: KpiResult;
	readonly assessedTeeth: Record<number, HygieneToothAssessment>;
	readonly summaryText043: string;
}

/**
 * Automatically derives hygiene & periodontal index scores from the full 32-tooth Florida Probe periodontogram.
 */
export function deriveHygieneFromPerioTeeth(
	teeth: readonly PerioToothRecord[],
): Record<number, HygieneToothAssessment> {
	const result: Record<number, HygieneToothAssessment> = {};
	const teethMap = new Map<number, PerioToothRecord>();
	for (const t of teeth) {
		teethMap.set(t.toothNumber, t);
	}

	for (const cfg of HYGIENE_INDEX_TEETH_CONFIG) {
		const tooth = teethMap.get(cfg.toothNumber);
		if (!tooth || tooth.isMissing) continue;

		const isUpper = cfg.toothNumber < 30;
		// Targeted site for Green-Vermillion
		const targetSite = isUpper ? tooth.midBuccal : tooth.midLingual;

		// Debris: if plaque is marked on mid site -> 1, if marked on multiple sites -> 2..3
		let plaqueCount = 0;
		let calculusCount = 0;
		let maxPocketDepth = 0;
		let hasBop = false;

		const siteList = [
			tooth.mesioBuccal,
			tooth.midBuccal,
			tooth.distoBuccal,
			tooth.mesioLingual,
			tooth.midLingual,
			tooth.distoLingual,
		];

		for (const s of siteList) {
			if (!s) continue;
			if (s.plaque) plaqueCount++;
			if (s.calculus) calculusCount++;
			if (s.bleedingOnProbing) hasBop = true;
			if (s.probingDepthMm > maxPocketDepth) maxPocketDepth = s.probingDepthMm;
		}

		// Map to 0..3
		const debrisScore = targetSite?.plaque ? Math.min(3, Math.max(1, plaqueCount)) : (plaqueCount > 0 ? 1 : 0);
		const calculusScore = targetSite?.calculus ? Math.min(3, Math.max(1, calculusCount)) : (calculusCount > 0 ? 1 : 0);

		// PMA: 0 = none, 1 = bop only (papilla), 2 = moderate pocket/swelling, 3 = deep pocket >=5mm
		let pmaScore = 0;
		if (maxPocketDepth >= 5) pmaScore = 3;
		else if (maxPocketDepth >= 4) pmaScore = 2;
		else if (hasBop) pmaScore = 1;

		// KPI: 0 = normal, 1 = bop, 2 = calculus, 3 = pocket 4-5mm, 4 = pocket >=6mm or mobility
		let kpiScore = 0;
		if (maxPocketDepth >= 6 || (tooth.mobility && tooth.mobility >= 2)) kpiScore = 4;
		else if (maxPocketDepth >= 4) kpiScore = 3;
		else if (calculusScore > 0) kpiScore = 2;
		else if (hasBop) kpiScore = 1;

		result[cfg.toothNumber] = {
			toothNumber: cfg.toothNumber,
			debrisScore,
			calculusScore,
			pmaScore,
			kpiScore,
		};
	}

	return result;
}

/**
 * Creates an intact/healthy default assessment for all 6 index teeth (all scores 0).
 */
export function createHealthyHygieneAssessment(): Record<number, HygieneToothAssessment> {
	const result: Record<number, HygieneToothAssessment> = {};
	for (const cfg of HYGIENE_INDEX_TEETH_CONFIG) {
		result[cfg.toothNumber] = {
			toothNumber: cfg.toothNumber,
			debrisScore: 0,
			calculusScore: 0,
			pmaScore: 0,
			kpiScore: 0,
		};
	}
	return result;
}

/**
 * Computes all 3 clinical indices and formats a standardized text for medical record 043/u.
 */
export function calculateCombinedHygieneReport(
	assessments: Record<number, HygieneToothAssessment> | readonly HygieneToothAssessment[],
): CombinedHygieneReport {
	const teethList = Array.isArray(assessments)
		? assessments
		: Object.values(assessments);

	const ohiS = calculateOhiSScore(teethList);
	const pma = calculatePmaScore(teethList);
	const kpi = calculateKpiScore(teethList);

	const assessmentsMap: Record<number, HygieneToothAssessment> = {};
	for (const a of teethList) {
		assessmentsMap[a.toothNumber] = a;
	}

	const lines: string[] = [
		`КЛИНИЧЕСКИЕ ИНДЕКСЫ ГИГИЕНЫ И СОСТОЯНИЯ ПАРОДОНТА:`,
		`• Индекс гигиены Грина-Вермиллиона: ${ohiS.ratingText} (налет DI-S: ${ohiS.debrisScore}, камень CI-S: ${ohiS.calculusScore}).`,
		`• Индекс воспаления десны PMA (Парма): ${pma.ratingText}.`,
		`• Комплексный периодонтальный индекс (КПИ Леуса): ${kpi.ratingText}.`,
	];

	if (ohiS.totalScore <= 0.6 && pma.pmaPercent === 0 && kpi.kpiScore === 0) {
		lines.push(`Заключение: Гигиеническое состояние полости рта оптимальное, ткани пародонта интактны.`);
	} else {
		lines.push(`Рекомендовано: Проведение контролируемой индивидуальной гигиены, обучение технике чистки зубов Bass/Stillman, курс противовоспалительной терапии.`);
	}

	return {
		ohiS,
		pma,
		kpi,
		assessedTeeth: assessmentsMap,
		summaryText043: lines.join("\n"),
	};
}
