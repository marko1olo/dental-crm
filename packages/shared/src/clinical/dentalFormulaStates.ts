/**
 * packages/shared/src/clinical/dentalFormulaStates.ts
 *
 * DENTE Dental CRM — Canonical Tooth States, Pathology Stamp Matrix, DMFT (КПУ) & 804n Codes SSOT.
 *
 * Invariants & Standards:
 * - Canonical Tooth State & Pathology Matrix (Healthy, Caries, Pulpitis, Periodontitis, Filled, Crown, Implant, Planned_Implant, Missing, Retained, Root).
 * - Standardized Stamp & Color Matrix unified for Odontogram, Form 043/u Diary, and Treatment Estimator.
 * - Ministry of Health RF Order 804n codes and WHO / Minzdrav DMFT (индекс КПУ).
 * - Zero cartoon emojis (Mandate 8d Item 7).
 */

import {
	DECIDUOUS_TEETH,
	PERMANENT_TEETH,
	isPermanentTooth,
} from "./dentalFormulaFdi.js";
import type { CanonicalSurfaceKey } from "./dentalFormulaSurfaces.js";

// ============================================================================
// 1. CANONICAL TOOTH CLINICAL STATES & PATHOLOGY SSOT
// ============================================================================

export const CANONICAL_TOOTH_STATES = [
	"Healthy",
	"Caries",
	"Pulpitis",
	"Periodontitis",
	"Filled",
	"Crown",
	"Planned_Crown",
	"Implant",
	"Planned_Implant",
	"Missing",
	"Retained",
	"Root",
] as const;

export type CanonicalToothState = (typeof CANONICAL_TOOTH_STATES)[number];

/**
 * Canonical ToothStatus SSOT alias — unified across @dental/shared, apps/api, and apps/web.
 */
export type ToothStatus = CanonicalToothState;

/**
 * Legacy lowercase clinical tooth statuses preserved for backward-compatible
 * JSONB document validation and seamless migration to CanonicalToothState.
 */
export const LEGACY_CLINICAL_TOOTH_STATUSES = [
	"sound",
	"watch",
	"caries",
	"pulpitis_periodontitis",
	"periodontal",
	"prosthetic",
	"implant",
	"orthodontic",
	"extraction",
	"missing",
	"planned",
	"completed",
	"other",
] as const;

export type LegacyClinicalToothStatus =
	(typeof LEGACY_CLINICAL_TOOTH_STATUSES)[number];

export type GostToothAbbreviation =
	| "К"
	| "П"
	| "Пт"
	| "Pt"
	| "Кр"
	| "Кп"
	| "И"
	| "Ип"
	| "0"
	| "Зд"
	| "Р"
	| "R";

export interface ToothStampDescriptor {
	readonly state: CanonicalToothState;
	readonly nameRu: string;
	readonly shortRu: string;
	readonly gostAbbr: GostToothAbbreviation;
	readonly latinAbbr: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
	readonly badgeText: string;
	readonly badgeBorder: string;
	readonly strokeColor: string;
	readonly svgGradientId: string;
	readonly colorDotClass: string;
	readonly descriptionRu: string;
	readonly icd10Default: string;
	readonly code804nDefault: string;
	readonly fallbackPriceRub: number;
}

/**
 * Единая стандартизированная матрица цветов, штампов и протоколов патологий.
 * Согласована между одонтограммой, ГОСТ-схемой, Формой 043/у и сметчиком.
 */
export const CANONICAL_STAMP_MATRIX: Readonly<Record<CanonicalToothState, ToothStampDescriptor>> = Object.freeze({
	Healthy: {
		state: "Healthy",
		nameRu: "Здоров",
		shortRu: "Зд",
		gostAbbr: "Зд",
		latinAbbr: "H",
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.12)",
		badgeText: "#059669",
		badgeBorder: "rgba(16, 185, 129, 0.3)",
		strokeColor: "var(--tooth-enamel-stroke, var(--tooth-root-stroke, #94a3b8))",
		svgGradientId: "dente-enamel-healthy",
		colorDotClass: "bg-[#10b981]",
		descriptionRu: "Интактный здоровый зуб (норма)",
		icd10Default: "Z01.2",
		code804nDefault: "A16.07.051",
		fallbackPriceRub: 0,
	},
	Caries: {
		state: "Caries",
		nameRu: "Кариес",
		shortRu: "К",
		gostAbbr: "К",
		latinAbbr: "C",
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.15)",
		badgeText: "#b45309",
		badgeBorder: "rgba(245, 158, 11, 0.4)",
		strokeColor: "#d97706",
		svgGradientId: "dente-caries-grad",
		colorDotClass: "bg-[#f59e0b]",
		descriptionRu: "Кариозное поражение эмали / дентина",
		icd10Default: "K02.1",
		code804nDefault: "A16.07.002",
		fallbackPriceRub: 3500,
	},
	Pulpitis: {
		state: "Pulpitis",
		nameRu: "Пульпит",
		shortRu: "Пт",
		gostAbbr: "Пт",
		latinAbbr: "P",
		badgeColor: "#ef4444",
		badgeBg: "rgba(239, 68, 68, 0.15)",
		badgeText: "#b91c1c",
		badgeBorder: "rgba(239, 68, 68, 0.4)",
		strokeColor: "#ef4444",
		svgGradientId: "dente-pulpitis-grad",
		colorDotClass: "bg-[#ef4444]",
		descriptionRu: "Воспаление пульпы зуба",
		icd10Default: "K04.0",
		code804nDefault: "A16.07.008",
		fallbackPriceRub: 6500,
	},
	Periodontitis: {
		state: "Periodontitis",
		nameRu: "Периодонтит",
		shortRu: "Pt",
		gostAbbr: "Pt",
		latinAbbr: "Pt",
		badgeColor: "#ea580c",
		badgeBg: "rgba(234, 88, 12, 0.15)",
		badgeText: "#c2410c",
		badgeBorder: "rgba(234, 88, 12, 0.4)",
		strokeColor: "#c2410c",
		svgGradientId: "dente-periodontitis-grad",
		colorDotClass: "bg-[#ea580c]",
		descriptionRu: "Воспаление периодонта",
		icd10Default: "K04.4",
		code804nDefault: "A16.07.030",
		fallbackPriceRub: 7500,
	},
	Filled: {
		state: "Filled",
		nameRu: "Пломба",
		shortRu: "П",
		gostAbbr: "П",
		latinAbbr: "Pl",
		badgeColor: "#0d9488",
		badgeBg: "rgba(13, 148, 136, 0.15)",
		badgeText: "#0f766e",
		badgeBorder: "rgba(13, 148, 136, 0.4)",
		strokeColor: "#0d9488",
		svgGradientId: "composite-fill-gradient",
		colorDotClass: "bg-[#0d9488]",
		descriptionRu: "Пломбированный зуб (реставрация)",
		icd10Default: "K02.1",
		code804nDefault: "A16.07.002",
		fallbackPriceRub: 3500,
	},
	Crown: {
		state: "Crown",
		nameRu: "Коронка",
		shortRu: "Кр",
		gostAbbr: "Кр",
		latinAbbr: "K",
		badgeColor: "#2563eb",
		badgeBg: "rgba(37, 99, 235, 0.15)",
		badgeText: "#1d4ed8",
		badgeBorder: "rgba(37, 99, 235, 0.4)",
		strokeColor: "#1d4ed8",
		svgGradientId: "zirconia-crown-gradient",
		colorDotClass: "bg-[#2563eb]",
		descriptionRu: "Искусственная коронка",
		icd10Default: "K08.1",
		code804nDefault: "A16.07.004",
		fallbackPriceRub: 18000,
	},
	Planned_Crown: {
		state: "Planned_Crown",
		nameRu: "Коронка в изготовлении (ЗТЛ)",
		shortRu: "Кп",
		gostAbbr: "Кп",
		latinAbbr: "PK",
		badgeColor: "#3b82f6",
		badgeBg: "rgba(59, 130, 246, 0.15)",
		badgeText: "#1d4ed8",
		badgeBorder: "rgba(59, 130, 246, 0.4)",
		strokeColor: "#3b82f6",
		svgGradientId: "zirconia-crown-gradient",
		colorDotClass: "bg-[#3b82f6]",
		descriptionRu: "Коронка в изготовлении / отправлена в ЗТЛ",
		icd10Default: "K08.1",
		code804nDefault: "A16.07.004",
		fallbackPriceRub: 18000,
	},
	Implant: {
		state: "Implant",
		nameRu: "Имплантат",
		shortRu: "И",
		gostAbbr: "И",
		latinAbbr: "I",
		badgeColor: "#7c3aed",
		badgeBg: "rgba(124, 58, 237, 0.15)",
		badgeText: "#6d28d9",
		badgeBorder: "rgba(124, 58, 237, 0.4)",
		strokeColor: "#64748b",
		svgGradientId: "titanium-implant-gradient",
		colorDotClass: "bg-[#7c3aed]",
		descriptionRu: "Дентальный имплантат",
		icd10Default: "K08.1",
		code804nDefault: "A16.07.054",
		fallbackPriceRub: 35000,
	},
	Planned_Implant: {
		state: "Planned_Implant",
		nameRu: "Имплантат в плане",
		shortRu: "Ип",
		gostAbbr: "Ип",
		latinAbbr: "PI",
		badgeColor: "#6366f1",
		badgeBg: "rgba(99, 102, 241, 0.15)",
		badgeText: "#4f46e5",
		badgeBorder: "rgba(99, 102, 241, 0.4)",
		strokeColor: "#64748b",
		svgGradientId: "titanium-implant-gradient",
		colorDotClass: "bg-[#6366f1]",
		descriptionRu: "Планируемый имплантат",
		icd10Default: "K08.1",
		code804nDefault: "A16.07.054",
		fallbackPriceRub: 35000,
	},
	Missing: {
		state: "Missing",
		nameRu: "Отсутствует",
		shortRu: "0",
		gostAbbr: "0",
		latinAbbr: "0",
		badgeColor: "#64748b",
		badgeBg: "rgba(100, 116, 139, 0.15)",
		badgeText: "#475569",
		badgeBorder: "rgba(100, 116, 139, 0.3)",
		strokeColor: "var(--tooth-root-stroke, #94a3b8)",
		svgGradientId: "none",
		colorDotClass: "bg-[#64748b]",
		descriptionRu: "Удаленный / отсутствующий зуб (адентия)",
		icd10Default: "K08.1",
		code804nDefault: "A16.07.001",
		fallbackPriceRub: 2500,
	},
	Retained: {
		state: "Retained",
		nameRu: "Ретинированный",
		shortRu: "Р",
		gostAbbr: "Р",
		latinAbbr: "Ret",
		badgeColor: "#8b5cf6",
		badgeBg: "rgba(139, 92, 246, 0.15)",
		badgeText: "#7c3aed",
		badgeBorder: "rgba(139, 92, 246, 0.4)",
		strokeColor: "#8b5cf6",
		svgGradientId: "dente-enamel-healthy",
		colorDotClass: "bg-[#8b5cf6]",
		descriptionRu: "Ретинированный / дистопированный зуб",
		icd10Default: "K01.1",
		code804nDefault: "A16.07.024",
		fallbackPriceRub: 5000,
	},
	Root: {
		state: "Root",
		nameRu: "Корень",
		shortRu: "R",
		gostAbbr: "R",
		latinAbbr: "R",
		badgeColor: "#dc2626",
		badgeBg: "rgba(220, 38, 38, 0.15)",
		badgeText: "#991b1b",
		badgeBorder: "rgba(220, 38, 38, 0.4)",
		strokeColor: "#dc2626",
		svgGradientId: "dente-root-dentin",
		colorDotClass: "bg-[#dc2626]",
		descriptionRu: "Разрушенный корень зуба",
		icd10Default: "K02.1",
		code804nDefault: "A16.07.001",
		fallbackPriceRub: 2500,
	},
});

export const CANONICAL_TOOTH_STATUS_ALIASES: Readonly<
	Record<string, CanonicalToothState>
> = Object.freeze({
	healthy: "Healthy",
	sound: "Healthy",
	intact: "Healthy",
	ok: "Healthy",
	idle: "Healthy",
	norm: "Healthy",
	норма: "Healthy",
	здоров: "Healthy",
	интактный: "Healthy",
	зд: "Healthy",
	watch: "Caries",
	наблюдение: "Caries",
	caries: "Caries",
	c: "Caries",
	к: "Caries",
	кариес: "Caries",
	needs_treatment: "Caries",
	planned: "Caries",
	other: "Caries",
	pulpitis: "Pulpitis",
	p: "Pulpitis",
	пт: "Pulpitis",
	пульпит: "Pulpitis",
	pulpitis_periodontitis: "Pulpitis",
	in_treatment: "Pulpitis",
	periodontitis: "Periodontitis",
	pt: "Periodontitis",
	периодонтит: "Periodontitis",
	пародонтит: "Periodontitis",
	periodontal: "Periodontitis",
	perio: "Periodontitis",
	mobility_i: "Periodontitis",
	mobility_ii: "Periodontitis",
	mobility_iii: "Periodontitis",
	mobility_iv: "Periodontitis",
	furcation_i: "Periodontitis",
	furcation_ii: "Periodontitis",
	furcation_iii: "Periodontitis",
	filled: "Filled",
	filling: "Filled",
	completed: "Filled",
	done: "Filled",
	pl: "Filled",
	f: "Filled",
	п: "Filled",
	пломба: "Filled",
	пломбирован: "Filled",
	crown: "Crown",
	bridge: "Crown",
	bridge_abutment: "Crown",
	prosthetic: "Crown",
	orthodontic: "Crown",
	k: "Crown",
	cr: "Crown",
	кр: "Crown",
	коронка: "Crown",
	planned_crown: "Planned_Crown",
	pk: "Planned_Crown",
	кп: "Planned_Crown",
	"коронка в плане": "Planned_Crown",
	"коронка в зтл": "Planned_Crown",
	"коронка в изготовлении": "Planned_Crown",
	"наряд в зтл": "Planned_Crown",
	"план. коронка": "Planned_Crown",
	implant: "Implant",
	imp: "Implant",
	i: "Implant",
	и: "Implant",
	имплант: "Implant",
	имплантат: "Implant",
	planned_implant: "Planned_Implant",
	pimp: "Planned_Implant",
	ип: "Planned_Implant",
	"план. имплантат": "Planned_Implant",
	"планируемый имплантат": "Planned_Implant",
	missing: "Missing",
	extraction: "Missing",
	extracted: "Missing",
	missing_or_implant: "Missing",
	"0": "Missing",
	о: "Missing",
	удален: "Missing",
	удалён: "Missing",
	отсутствует: "Missing",
	адентия: "Missing",
	retained: "Retained",
	ret: "Retained",
	impacted: "Retained",
	р: "Retained",
	ретинированный: "Retained",
	дистопированный: "Retained",
	root: "Root",
	root_canal_treated: "Root",
	r: "Root",
	корень: "Root",
	"разрушенный корень": "Root",
});

export function isCanonicalToothState(
	value: unknown,
): value is CanonicalToothState {
	return (
		typeof value === "string" &&
		(CANONICAL_TOOTH_STATES as readonly string[]).includes(value)
	);
}

/**
 * Единый канонический парсер состояния зуба из произвольной строки (RU или EN).
 */
export function normalizeToothState(
	input: string | null | undefined,
): CanonicalToothState {
	if (!input) return "Healthy";
	const trimmed = input.trim();
	if (isCanonicalToothState(trimmed)) return trimmed;

	const lower = trimmed.toLowerCase().replace(/ё/g, "е");
	const mapped = CANONICAL_TOOTH_STATUS_ALIASES[lower];
	if (mapped) return mapped;

	const found = CANONICAL_TOOTH_STATES.find((s) => s.toLowerCase() === lower);
	if (found) return found;

	return "Healthy";
}

/**
 * Канонический конвертер любого статуса зуба (legacy/portal/RU/EN) в CanonicalToothState (ToothStatus SSOT).
 */
export function toCanonicalToothState(
	status: string | null | undefined,
): CanonicalToothState {
	return normalizeToothState(status);
}


/**
 * Получить ГОСТ-аббревиатуру состояния (К, П, Пт, Pt, Кр, И, Ип, 0, Зд, Р, R)
 */
export function getGostAbbreviation(state?: string | null): GostToothAbbreviation {
	const canonical = normalizeToothState(state);
	return CANONICAL_STAMP_MATRIX[canonical].gostAbbr;
}

/**
 * Получить русскоязычное название состояния для карточки и дневника
 */
export function getToothStateLabelRu(state?: string | null): string {
	const canonical = normalizeToothState(state);
	return CANONICAL_STAMP_MATRIX[canonical].nameRu.toLowerCase();
}

// ============================================================================
// 2. WHO / MINZDRAV CARIES-MISSING-FILLED INDEX (ИНДЕКС КПУ ЗУБОВ)
// ============================================================================

export interface DmftCalculationResult {
	readonly c: number; // Кариес (К)
	readonly p: number; // Пломбирован (П)
	readonly u: number; // Удален / отсутствует (У)
	readonly total: number; // Суммарный индекс КПУ
	readonly dmftString: string; // Строковое представление: 'КПУ = К(1) + П(2) + У(0) = 3'
	readonly severityRu: string; // Клиническая интерпретация интенсивности
}

/**
 * Рассчитывает официальный индекс интенсивности кариеса КПУ(з) по формуле ВОЗ.
 * В расчет КПУ входят ТОЛЬКО постоянные зубы взрослого (11..48).
 * Молочные зубы (51..85) формируют детский индекс кп и исключаются из КПУ взрослого.
 */
export function calculateDmft(
	teethData: readonly { readonly toothNumber: number; readonly state?: string | null }[] = [],
): DmftCalculationResult {
	let c = 0;
	let p = 0;
	let u = 0;

	for (const tooth of teethData) {
		if (!isPermanentTooth(tooth.toothNumber)) continue;
		const canonical = normalizeToothState(tooth.state);

		if (canonical === "Caries" || canonical === "Pulpitis" || canonical === "Periodontitis" || canonical === "Root") {
			c++;
		} else if (canonical === "Filled") {
			p++;
		} else if (canonical === "Missing") {
			u++;
		}
	}

	const total = c + p + u;

	let severityRu = "Очень низкая";
	if (total >= 14) {
		severityRu = "Очень высокая";
	} else if (total >= 9) {
		severityRu = "Высокая";
	} else if (total >= 5) {
		severityRu = "Средняя";
	} else if (total >= 2) {
		severityRu = "Низкая";
	}

	return {
		c,
		p,
		u,
		total,
		dmftString: `КПУ = К(${c}) + П(${p}) + У(${u}) = ${total}`,
		severityRu,
	};
}

// ============================================================================
// 3. 1-CLICK PHYSIOLOGICAL NORM (САНИРОВАННЫЙ ЗУБНОЙ РЯД / МАНДАТ 8e)
// ============================================================================

export interface StandardToothRecord {
	toothNumber: number;
	state: CanonicalToothState;
	surfaces: CanonicalSurfaceKey[];
	notes?: string;
}

/**
 * Создает интактную формулу здоровых зубов для взрослого (все 32 зуба Healthy).
 */
export function createIntactAdultDentition(): StandardToothRecord[] {
	return PERMANENT_TEETH.map((toothNumber) => ({
		toothNumber,
		state: "Healthy",
		surfaces: [],
		notes: "Здоров (интактный)",
	}));
}

/**
 * Создает интактную формулу здоровых зубов для ребенка (все 20 зубов Healthy).
 */
export function createIntactPediatricDentition(): StandardToothRecord[] {
	return DECIDUOUS_TEETH.map((toothNumber) => ({
		toothNumber,
		state: "Healthy",
		surfaces: [],
		notes: "Здоров (интактный молочный)",
	}));
}

// ============================================================================
// 4. МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РФ: КОДЫ 804н И СТАНДАРТЫ СМЕТЫ
// ============================================================================

export const CLINICAL_CODES_804N = Object.freeze({
	ANESTHESIA_INFILTRATION: "B01.003.004.005",
	ANESTHESIA_CONDUCTION: "B01.003.004.004",
	ANESTHESIA_GENERAL: "A11.07.012",
	ISOLATION_COFFERDAM: "A16.07.093",
	ISOLATION_PREPARATION: "A16.07.002.001",
	RADIOLOGY_INTRAORAL: "A06.07.003",
	RADIOLOGY_PANORAMIC: "A06.07.004",
	PRO_HYGIENE_COMPLEX: "A16.07.051",
	CARIES_RESTORATION_COMPOSITE: "A16.07.002",
	PULPITIS_EXTIRPATION: "A16.07.008",
	PERIODONTITIS_ENDODONTICS: "A16.07.030",
	CROWN_ORTHOPEDIC: "A16.07.004",
	IMPLANT_SURGERY: "A16.07.054",
	TOOTH_EXTRACTION: "A16.07.001",
});

export const CLINICAL_DEFAULT_PRICES_RUB = Object.freeze({
	ANESTHESIA: 800,
	ISOLATION: 600,
	RADIOLOGY: 500,
	PRO_HYGIENE: 4500,
	CARIES: 3500,
	PULPITIS: 6500,
	PERIODONTITIS: 7500,
	CROWN: 18000,
	IMPLANT: 35000,
	EXTRACTION: 2500,
});
