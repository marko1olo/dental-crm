/**
 * packages/shared/src/clinical/perioIndicesEngine.ts
 *
 * SEPA Periodontal Indices & AAP/EFP 2018 Staging Engine.
 * Adapted from DentalPin periodontogram module (indices.py & constants.py).
 *
 * Denominators are anchored to the theoretical site count of every
 * present tooth (6 sites per tooth: MV, V, DV, ML, L, DL).
 * Missing/extracted teeth (isPresent = false) contribute neither numerator
 * nor denominator. Unmeasured sites count as 0/no finding until recorded,
 * preventing percentage inflation on partially examined charts.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// SEPA CONSTANTS & ANATOMICAL NOMENCLATURE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 6 probing sites per tooth according to SEPA (Sociedad Española de Periodoncia) standard:
 * - MV: Mesio-vestibular (мезио-вестибулярно)
 * - V: Mid-vestibular (середина вестибулярно / щёчно)
 * - DV: Disto-vestibular (дисто-вестибулярно)
 * - ML: Mesio-lingual/palatal (мезио-язычно / мезио-нёбно)
 * - L: Mid-lingual/palatal (середина язычно / середина нёбно)
 * - DL: Disto-lingual/palatal (дисто-язычно / дисто-нёбно)
 */
export const SEPA_SITE_CODES = ["MV", "V", "DV", "ML", "L", "DL"] as const;
export type SepaSiteCode = (typeof SEPA_SITE_CODES)[number];

export const SITES_PER_TOOTH = 6;
export const DEEP_POCKET_THRESHOLD_MM = 5;

export const VESTIBULAR_SITES = ["MV", "V", "DV"] as const;
export const PALATAL_LINGUAL_SITES = ["ML", "L", "DL"] as const;

export const PROBING_DEPTH_MIN_MM = 0;
export const PROBING_DEPTH_MAX_MM = 15;
export const GINGIVAL_MARGIN_MIN_MM = -5;
export const GINGIVAL_MARGIN_MAX_MM = 10;
export const KERATINIZED_GINGIVA_MIN_MM = 0;
export const KERATINIZED_GINGIVA_MAX_MM = 20;

export const SEPA_SITE_LABELS_RU: Readonly<Record<SepaSiteCode, string>> = Object.freeze({
	MV: "Мезио-вестибулярно (MV)",
	V: "Середина вестибулярно (V)",
	DV: "Дисто-вестибулярно (DV)",
	ML: "Мезио-язычно/нёбно (ML)",
	L: "Середина язычно/нёбно (L)",
	DL: "Дисто-язычно/нёбно (DL)",
});

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function isProbingDepthValid(depthMm: number): boolean {
	return (
		typeof depthMm === "number" &&
		Number.isFinite(depthMm) &&
		depthMm >= PROBING_DEPTH_MIN_MM &&
		depthMm <= PROBING_DEPTH_MAX_MM
	);
}

export function isGingivalMarginValid(marginMm: number): boolean {
	return (
		typeof marginMm === "number" &&
		Number.isFinite(marginMm) &&
		marginMm >= GINGIVAL_MARGIN_MIN_MM &&
		marginMm <= GINGIVAL_MARGIN_MAX_MM
	);
}

export function isKeratinizedGingivaValid(kgMm: number): boolean {
	return (
		typeof kgMm === "number" &&
		Number.isFinite(kgMm) &&
		kgMm >= KERATINIZED_GINGIVA_MIN_MM &&
		kgMm <= KERATINIZED_GINGIVA_MAX_MM
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA INTERFACES & SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export interface PerioSiteData {
	probingDepthMm?: number | null;
	gingivalMarginMm?: number | null;
	bleedingOnProbing?: boolean;
	plaque?: boolean;
	keratinizedGingivaMm?: number | null;
}

export interface PerioToothData {
	toothNumber: number;
	isPresent: boolean;
	sites: Record<string, PerioSiteData> | PerioSiteData[];
}

export type AapEfpStage = "I" | "II" | "III" | "IV" | "health_gingivitis";

export interface PerioIndicesSummary {
	bopPct: number;
	piPct: number;
	meanCalMm: number;
	deepPocketsCount: number;
	presentTeethCount: number;
	totalTheoreticalSites: number;
	totalMeasuredSites: number;
	aapEfpStage: AapEfpStage;
}

export const perioSiteDataSchema = z.object({
	probingDepthMm: z
		.number()
		.min(PROBING_DEPTH_MIN_MM)
		.max(PROBING_DEPTH_MAX_MM)
		.nullable()
		.optional(),
	gingivalMarginMm: z
		.number()
		.min(GINGIVAL_MARGIN_MIN_MM)
		.max(GINGIVAL_MARGIN_MAX_MM)
		.nullable()
		.optional(),
	bleedingOnProbing: z.boolean().optional(),
	plaque: z.boolean().optional(),
	keratinizedGingivaMm: z
		.number()
		.min(KERATINIZED_GINGIVA_MIN_MM)
		.max(KERATINIZED_GINGIVA_MAX_MM)
		.nullable()
		.optional(),
});

export const perioToothDataSchema = z.object({
	toothNumber: z.number().int(),
	isPresent: z.boolean(),
	sites: z.union([
		z.record(z.string(), perioSiteDataSchema),
		z.array(perioSiteDataSchema),
	]),
});

export const aapEfpStageSchema = z.enum([
	"I",
	"II",
	"III",
	"IV",
	"health_gingivitis",
]);

export const perioIndicesSummarySchema = z.object({
	bopPct: z.number().min(0).max(100),
	piPct: z.number().min(0).max(100),
	meanCalMm: z.number(),
	deepPocketsCount: z.number().int().nonnegative(),
	presentTeethCount: z.number().int().nonnegative(),
	totalTheoreticalSites: z.number().int().nonnegative(),
	totalMeasuredSites: z.number().int().nonnegative(),
	aapEfpStage: aapEfpStageSchema,
});

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function extractSites(
	sites: Record<string, PerioSiteData> | PerioSiteData[] | undefined | null,
): readonly PerioSiteData[] {
	if (!sites) {
		return [];
	}
	if (Array.isArray(sites)) {
		return sites;
	}
	return Object.values(sites);
}

function roundTo2Decimals(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEPA PERIODONTAL ALGORITHMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates Bleeding on Probing percentage (BoP %).
 * Denominator is anchored strictly to total theoretical sites of present teeth (6 sites * present teeth).
 */
export function computeBoPPct(teeth: readonly PerioToothData[]): number {
	const presentTeeth = teeth.filter((t) => t.isPresent);
	const totalSites = SITES_PER_TOOTH * presentTeeth.length;
	if (totalSites === 0) {
		return 0;
	}

	let bleeders = 0;
	for (const tooth of presentTeeth) {
		const sites = extractSites(tooth.sites);
		for (const site of sites) {
			if (site.bleedingOnProbing) {
				bleeders++;
			}
		}
	}

	return roundTo2Decimals((100 * bleeders) / totalSites);
}

/**
 * Calculates Plaque Index percentage (PI %).
 * Denominator is anchored strictly to total theoretical sites of present teeth (6 sites * present teeth).
 */
export function computePlaqueIndexPct(teeth: readonly PerioToothData[]): number {
	const presentTeeth = teeth.filter((t) => t.isPresent);
	const totalSites = SITES_PER_TOOTH * presentTeeth.length;
	if (totalSites === 0) {
		return 0;
	}

	let plaqued = 0;
	for (const tooth of presentTeeth) {
		const sites = extractSites(tooth.sites);
		for (const site of sites) {
			if (site.plaque) {
				plaqued++;
			}
		}
	}

	return roundTo2Decimals((100 * plaqued) / totalSites);
}

/**
 * Calculates Mean Clinical Attachment Level (Mean CAL) in mm.
 * CAL = Probing Depth (PD) + Gingival Margin (GM).
 * Sum is averaged over total theoretical sites of present teeth.
 */
export function computeMeanCalMm(teeth: readonly PerioToothData[]): number {
	const presentTeeth = teeth.filter((t) => t.isPresent);
	const totalSites = SITES_PER_TOOTH * presentTeeth.length;
	if (totalSites === 0) {
		return 0;
	}

	let calSum = 0;
	for (const tooth of presentTeeth) {
		const sites = extractSites(tooth.sites);
		for (const site of sites) {
			if (
				site.probingDepthMm !== null &&
				site.probingDepthMm !== undefined &&
				site.gingivalMarginMm !== null &&
				site.gingivalMarginMm !== undefined
			) {
				calSum += site.probingDepthMm + site.gingivalMarginMm;
			}
		}
	}

	return roundTo2Decimals(calSum / totalSites);
}

/**
 * Counts distinct present teeth with at least one site having probingDepthMm >= threshold.
 * Absent teeth (isPresent = false) are ignored.
 */
export function countDeepPockets(
	teeth: readonly PerioToothData[],
	threshold: number = DEEP_POCKET_THRESHOLD_MM,
): number {
	const presentTeeth = teeth.filter((t) => t.isPresent);
	let count = 0;

	for (const tooth of presentTeeth) {
		const sites = extractSites(tooth.sites);
		const hasDeep = sites.some(
			(s) =>
				s.probingDepthMm !== null &&
				s.probingDepthMm !== undefined &&
				s.probingDepthMm >= threshold,
		);
		if (hasDeep) {
			count++;
		}
	}

	return count;
}

/**
 * Determines AAP/EFP 2018 Periodontitis Staging:
 * - 'health_gingivitis': No attachment loss due to periodontitis (CAL <= 0), no deep pockets.
 * - 'I' (Stage I): CAL 1–2 mm, max PD <= 4 mm, no tooth loss due to periodontitis.
 * - 'II' (Stage II): CAL 3–4 mm or presence of deep pockets (PD >= 5 mm), no tooth loss.
 * - 'III' (Stage III): CAL >= 5 mm or tooth loss 1–4 teeth due to periodontitis.
 * - 'IV' (Stage IV): Tooth loss >= 5 teeth due to periodontitis, or severe complexity with massive loss.
 */
export function determineAapEfpStage(
	maxCalMm: number,
	deepPocketsCount: number,
	toothLossCount: number = 0,
): AapEfpStage {
	// Health or gingivitis without attachment loss
	if (maxCalMm <= 0 && deepPocketsCount <= 0 && toothLossCount <= 0) {
		return "health_gingivitis";
	}

	// Stage IV: >= 5 teeth lost due to periodontitis
	if (toothLossCount >= 5) {
		return "IV";
	}

	// Stage III: CAL >= 5 mm OR 1-4 teeth lost due to periodontitis
	if (maxCalMm >= 5 || (toothLossCount >= 1 && toothLossCount <= 4)) {
		return "III";
	}

	// Stage II: CAL 3-4 mm OR presence of deep pockets (PD >= 5 mm)
	if (maxCalMm >= 3 || deepPocketsCount > 0) {
		return "II";
	}

	// Stage I: Initial CAL 1-2 mm, no deep pockets, no tooth loss
	if (maxCalMm >= 1) {
		return "I";
	}

	return "health_gingivitis";
}

/**
 * Computes full bundle of SEPA periodontal indices and AAP/EFP 2018 staging.
 */
export function computePerioIndices(
	teeth: readonly PerioToothData[],
): PerioIndicesSummary {
	const presentTeeth = teeth.filter((t) => t.isPresent);
	const presentTeethCount = presentTeeth.length;
	const totalTheoreticalSites = SITES_PER_TOOTH * presentTeethCount;
	const toothLossCount = teeth.filter((t) => !t.isPresent).length;

	if (totalTheoreticalSites === 0) {
		return {
			bopPct: 0,
			piPct: 0,
			meanCalMm: 0,
			deepPocketsCount: 0,
			presentTeethCount: 0,
			totalTheoreticalSites: 0,
			totalMeasuredSites: 0,
			aapEfpStage: "health_gingivitis",
		};
	}

	let bleeders = 0;
	let plaqued = 0;
	let calSum = 0;
	let maxCalMm = 0;
	let totalMeasuredSites = 0;

	for (const tooth of presentTeeth) {
		const sites = extractSites(tooth.sites);
		for (const site of sites) {
			if (site.probingDepthMm !== null && site.probingDepthMm !== undefined) {
				totalMeasuredSites++;
			}
			if (site.bleedingOnProbing) {
				bleeders++;
			}
			if (site.plaque) {
				plaqued++;
			}
			if (
				site.probingDepthMm !== null &&
				site.probingDepthMm !== undefined &&
				site.gingivalMarginMm !== null &&
				site.gingivalMarginMm !== undefined
			) {
				const siteCal = site.probingDepthMm + site.gingivalMarginMm;
				calSum += siteCal;
				if (siteCal > maxCalMm) {
					maxCalMm = siteCal;
				}
			}
		}
	}

	const bopPct = roundTo2Decimals((100 * bleeders) / totalTheoreticalSites);
	const piPct = roundTo2Decimals((100 * plaqued) / totalTheoreticalSites);
	const meanCalMm = roundTo2Decimals(calSum / totalTheoreticalSites);
	const deepPocketsCount = countDeepPockets(teeth, DEEP_POCKET_THRESHOLD_MM);
	const aapEfpStage = determineAapEfpStage(
		maxCalMm,
		deepPocketsCount,
		toothLossCount,
	);

	return {
		bopPct,
		piPct,
		meanCalMm,
		deepPocketsCount,
		presentTeethCount,
		totalTheoreticalSites,
		totalMeasuredSites,
		aapEfpStage,
	};
}

/**
 * Formats a strict Russian clinical A4 report summary of periodontal examination (Form 043/y).
 * Strictly 0 emojis in compliance with Mandate 8d item 7.
 */
export function formatPerioIndicesA4Summary(
	summary: PerioIndicesSummary,
	patientName: string,
	doctorName: string,
): string {
	const separator = "=".repeat(76);
	const subSeparator = "-".repeat(76);

	const stageDescriptions: Record<AapEfpStage, string> = {
		health_gingivitis:
			"Клиническое здоровье пародонта / Гингивит (без деструкции связочного аппарата)",
		I: "Пародонтит, Стадия I (Начальная потеря прикрепления, CAL 1-2 мм)",
		II: "Пародонтит, Стадия II (Умеренная потеря прикрепления, CAL 3-4 мм, карманы до 5 мм)",
		III: "Пародонтит, Стадия III (Тяжелая деструкция, CAL >= 5 мм, риск потери зубов)",
		IV: "Пародонтит, Стадия IV (Тяжелая деструкция с обширной потерей зубов >= 5)",
	};

	const safePatient = patientName.trim() || "Не указан";
	const safeDoctor = doctorName.trim() || "Не указан";

	const lines: string[] = [];
	lines.push(separator);
	lines.push(
		"ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ (СТАНДАРТ SEPA / AAP-EFP 2018)",
	);
	lines.push(
		"Приложение к Медицинской карте стоматологического больного (Форма 043/у)",
	);
	lines.push(separator);
	lines.push(`Пациент: ${safePatient}`);
	lines.push(`Лечащий врач: ${safeDoctor}`);
	lines.push(`Дата формирования: ${new Date().toISOString().split("T")[0]}`);
	lines.push(subSeparator);
	lines.push("СТАТУС ЗУБНОГО РЯДА И ЗОНДИРОВАНИЯ:");
	lines.push(`- Количество присутствующих зубов: ${summary.presentTeethCount}`);
	lines.push(
		`- Теоретическое количество зон (6 зон на зуб): ${summary.totalTheoreticalSites}`,
	);
	lines.push(
		`- Фактически измеренных зон зондирования: ${summary.totalMeasuredSites}`,
	);
	lines.push(subSeparator);
	lines.push("КЛИНИЧЕСКИЕ ПАРОДОНТОЛОГИЧЕСКИЕ ИНДЕКСЫ SEPA:");
	lines.push(
		`- Индекс кровоточивости при зондировании (BoP): ${summary.bopPct.toFixed(2)}%`,
	);
	lines.push(
		`- Зубной налет / Пляковый индекс (PI): ${summary.piPct.toFixed(2)}%`,
	);
	lines.push(
		`- Средняя клиническая потеря прикрепления (CAL): ${summary.meanCalMm.toFixed(2)} мм`,
	);
	lines.push(
		`- Количество зубов с глубокими карманами (PD >= 5 мм): ${summary.deepPocketsCount}`,
	);
	lines.push(subSeparator);
	lines.push("КЛАССИФИКАЦИЯ ПАРОДОНТИТА (AAP/EFP 2018):");
	lines.push(
		`- Стадия заболевания: ${summary.aapEfpStage} — ${stageDescriptions[summary.aapEfpStage]}`,
	);
	lines.push(subSeparator);
	lines.push("КЛИНИЧЕСКОЕ ЗАКЛЮЧЕНИЕ И РЕКОМЕНДАЦИИ:");
	if (
		summary.bopPct <= 10 &&
		summary.aapEfpStage === "health_gingivitis"
	) {
		lines.push(
			"- Статус: Клинически здоровый пародонт (BoP <= 10%, патологических карманов нет).",
		);
		lines.push(
			"- Рекомендовано: Поддерживающая индивидуальная гигиена, контрольный осмотр через 6 месяцев.",
		);
	} else if (summary.aapEfpStage === "health_gingivitis") {
		lines.push(
			"- Статус: Гингивит, индуцированный биопленкой (воспаление десны без потери костной ткани).",
		);
		lines.push(
			"- Рекомендовано: Профессиональная гигиена полости рта, обучение гигиене, повторный осмотр через 1 месяц.",
		);
	} else {
		lines.push(
			`- Статус: Деструктивный воспалительный процесс пародонта (Стадия ${summary.aapEfpStage}).`,
		);
		if (summary.deepPocketsCount > 0) {
			lines.push(
				`- Выявлено ${summary.deepPocketsCount} зубов с глубиной зондирования >= 5 мм: показан поддесневой скейлинг и сглаживание корней (SRP).`,
			);
		} else {
			lines.push(
				"- Глубокие карманы не выявлены; рекомендована поддерживающая пародонтологическая терапия.",
			);
		}
	}
	lines.push(separator);
	lines.push(
		"Документ сформирован в медицинской информационной системе DENTE Dental CRM.",
	);
	lines.push(
		`Подпись лечащего врача: ____________________ / ${safeDoctor}`,
	);
	lines.push("М.П. (Место печати медицинской организации)");
	lines.push(separator);

	return lines.join("\n");
}
