/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DIARY TEMPLATES ENGINE — 1-CLICK STATUTORY EMR PROTOCOLS
 * Order of the Ministry of Health of Russia № 834n / № 804n / СтАР
 * ═══════════════════════════════════════════════════════════════════════════
 * High-density 1-Click EMR protocol engine: zero endless dropdowns,
 * instant insertion of strictly formulated statutory clinical diary text.
 */

import { isValidFdiToothNumber } from "@dental/shared";

export * from "./clinicalDiaryTemplatesCatalogData";
import {
	type Clinical1ClickTemplate,
	type ClinicalProtocolCategory,
	CLINICAL_1CLICK_TEMPLATES_CATALOG,
	CLINICAL_CATEGORY_LABELS,
	type Order804nServiceItem,
	PHYSIOLOGICAL_NORM_PRESET,
} from "./clinicalDiaryTemplatesCatalogData";

/** Параметры синтеза готового дневника при 1 клике */
export interface TemplateSynthesisOptions {
	readonly toothNumber?: number | string | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly patientFullName?: string | null | undefined;
	readonly customNotes?: string | null | undefined;
	readonly customAnesthesia?: string | null | undefined;
	readonly customMaterials?: readonly string[] | null | undefined;
}

/** Структурированный результат синтеза дневниковой записи */
export interface SynthesizedDiaryResult {
	readonly templateId: string;
	readonly title: string;
	readonly icd10Code: string;
	readonly icd10Title: string;
	readonly toothNumber: number | null;
	readonly toothNameRu: string | null;
	readonly subjectiveComplaints: string;
	readonly anamnesisMorbi: string;
	readonly objectiveStatusLocalis: string;
	readonly assessmentDiagnosisText: string;
	readonly assessmentIcd10Code: string;
	readonly procedureProtocol: string;
	readonly anesthesiaDetails: string;
	readonly appliedMaterials: string;
	readonly homeCareRecommendations: string;
	readonly unifiedSoapText: string;
	readonly order804nServices: readonly Order804nServiceItem[];
	readonly totalEstimatedKopecks?: number | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ АНАТОМИЧЕСКИХ НАЗВАНИЙ ЗУБОВ
// ─────────────────────────────────────────────────────────────────────────────

const PERMANENT_TOOTH_NAMES: Record<number, string> = {
	1: "центральный резец",
	2: "латеральный резец",
	3: "клык",
	4: "первый премоляр",
	5: "второй премоляр",
	6: "первый моляр",
	7: "второй моляр",
	8: "третий моляр (зуб мудрости)",
};

const PRIMARY_TOOTH_NAMES: Record<number, string> = {
	1: "центральный резец",
	2: "латеральный резец",
	3: "клык",
	4: "первый моляр",
	5: "второй моляр",
};

const QUADRANT_NAMES: Record<number, string> = {
	1: "верхний правый",
	2: "верхний левый",
	3: "нижний левый",
	4: "нижний правый",
	5: "верхний правый временный",
	6: "верхний левый временный",
	7: "нижний левый временный",
	8: "нижний правый временный",
};

export function getToothAnatomicalDescription(toothNum: number | string | null | undefined): string {
	if (!toothNum) return "зуба";
	const n = typeof toothNum === "string" ? parseInt(toothNum, 10) : toothNum;
	if (Number.isNaN(n) || !isValidFdiToothNumber(n)) {
		return `зуба № ${toothNum}`;
	}
	const quad = Math.floor(n / 10);
	const pos = n % 10;
	const isPrimary = quad >= 5 && quad <= 8;
	const quadName = QUADRANT_NAMES[quad] || "";
	const name = isPrimary ? (PRIMARY_TOOTH_NAMES[pos] || "зуб") : (PERMANENT_TOOTH_NAMES[pos] || "зуб");
	return `зуба ${n} (${quadName} ${name})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// БАЗОВЫЙ КАТАЛОГ 1-CLICK ПРОТОКОЛОВ (СТАР / МИНЗДРАВ РФ 834н / 804н)
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// СИНТЕЗ И ФОРМАТИРОВАНИЕ ДНЕВНИКА
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Синтезирует полный результат 1-click вставки протокола.
 */
export function synthesize1ClickSoapDiary(
	templateIdOrCode: string,
	options: TemplateSynthesisOptions = {},
): SynthesizedDiaryResult {
	const normalizedKey = (templateIdOrCode || "").trim().toLowerCase();
	const template =
		(normalizedKey === PHYSIOLOGICAL_NORM_PRESET.id.toLowerCase() ||
		normalizedKey === PHYSIOLOGICAL_NORM_PRESET.icd10Code.toLowerCase() ||
		normalizedKey === PHYSIOLOGICAL_NORM_PRESET.shortTitle.toLowerCase()
			? PHYSIOLOGICAL_NORM_PRESET
			: null) ||
		CLINICAL_1CLICK_TEMPLATES_CATALOG.find(
			(t) =>
				t.id.toLowerCase() === normalizedKey ||
				t.icd10Code.toLowerCase() === normalizedKey ||
				t.shortTitle.toLowerCase() === normalizedKey,
		) || CLINICAL_1CLICK_TEMPLATES_CATALOG[0]!;

	const toothNum =
		options.toothNumber !== null && options.toothNumber !== undefined && String(options.toothNumber).trim() !== ""
			? typeof options.toothNumber === "string"
				? parseInt(options.toothNumber, 10) || null
				: options.toothNumber
			: null;

	const toothDesc = toothNum ? getToothAnatomicalDescription(toothNum) : "зуба";
	const toothNumStr = toothNum ? `зуба ${toothNum}` : "зуба";

	// Подстановка анатомического зуба в шаблоны
	const subjective = template.defaultSubjectiveComplaints;
	const anamnesis = template.defaultAnamnesisMorbi;
	const statusLocalis = template.defaultObjectiveStatus.replace(/\{TOOTH\}/g, toothDesc);

	const diagnosisText = toothNum
		? `${template.icd10Code} ${template.icd10Title} ${toothNumStr}`
		: `${template.icd10Code} ${template.icd10Title}`;

	const anesthesia = options.customAnesthesia?.trim() || template.defaultAnesthesia;
	const materialsList =
		options.customMaterials && options.customMaterials.length > 0
			? options.customMaterials
			: template.defaultMaterials;
	const materialsStr = materialsList.join(", ");

	const recommendations = template.defaultRecommendations;
	const procedureProtocol = template.defaultProcedureProtocol;

	// Расчет оценочной стоимости номенклатурных услуг в копейках
	const totalEstimatedKopecks = template.order804nServices.reduce((sum, s) => {
		const qty = s.defaultQuantity ?? 1;
		return sum + (s.priceKopecks ?? 0) * qty;
	}, 0);

	// Форматирование единого текста дневника Формы 043/у
	const unifiedSoapText = formatStatutoryUnifiedSoapText({
		template,
		toothDesc,
		toothNumStr,
		subjective,
		anamnesis,
		statusLocalis,
		diagnosisText,
		procedureProtocol,
		anesthesia,
		materialsStr,
		recommendations,
		order804nServices: template.order804nServices,
		doctorFullName: options.doctorFullName ?? null,
		doctorSpecialty: options.doctorSpecialty ?? null,
		customNotes: options.customNotes ?? null,
	});

	return {
		templateId: template.id,
		title: template.title,
		icd10Code: template.icd10Code,
		icd10Title: template.icd10Title,
		toothNumber: toothNum,
		toothNameRu: toothNum ? toothDesc : null,
		subjectiveComplaints: subjective,
		anamnesisMorbi: anamnesis,
		objectiveStatusLocalis: statusLocalis,
		assessmentDiagnosisText: diagnosisText,
		assessmentIcd10Code: template.icd10Code,
		procedureProtocol,
		anesthesiaDetails: anesthesia,
		appliedMaterials: materialsStr,
		homeCareRecommendations: recommendations,
		unifiedSoapText,
		order804nServices: template.order804nServices,
		totalEstimatedKopecks: totalEstimatedKopecks > 0 ? totalEstimatedKopecks : undefined,
	};
}

/**
 * Форматирует единый регламентный блок дневника Формы 043/у для вставки в текстовое поле.
 */
export function formatStatutoryUnifiedSoapText(params: {
	readonly template: Clinical1ClickTemplate;
	readonly toothDesc: string;
	readonly toothNumStr: string;
	readonly subjective: string;
	readonly anamnesis: string;
	readonly statusLocalis: string;
	readonly diagnosisText: string;
	readonly procedureProtocol: string;
	readonly anesthesia: string;
	readonly materialsStr: string;
	readonly recommendations: string;
	readonly order804nServices: readonly Order804nServiceItem[];
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly customNotes?: string | null | undefined;
}): string {
	const parts: string[] = [];

	parts.push(`ЖАЛОБЫ (S):`);
	parts.push(params.subjective);
	parts.push("");

	parts.push(`АНАМНЕЗ ЗАБОЛЕВАНИЯ (S):`);
	parts.push(params.anamnesis);
	if (params.customNotes?.trim()) {
		parts.push(`Дополнительно: ${params.customNotes.trim()}`);
	}
	parts.push("");

	parts.push(`ОБЪЕКТИВНЫЙ СТАТУС / STATUS LOCALIS (O):`);
	parts.push(params.statusLocalis);
	parts.push("");

	parts.push(`КЛИНИЧЕСКИЙ ДИАГНОЗ ПО МКБ-10 (A):`);
	parts.push(params.diagnosisText);
	parts.push("");

	parts.push(`ПРОТОКОЛ ЛЕЧЕНИЯ (P):`);
	parts.push(params.procedureProtocol);
	parts.push("");

	if (params.anesthesia) {
		parts.push(`Обезболивание: ${params.anesthesia}`);
	}
	if (params.materialsStr) {
		parts.push(`Использованные материалы: ${params.materialsStr}`);
	}

	if (params.order804nServices && params.order804nServices.length > 0) {
		parts.push("");
		parts.push(`ОКАЗАННЫЕ УСЛУГИ:`);
		for (const s of params.order804nServices) {
			const qty = s.defaultQuantity && s.defaultQuantity > 1 ? ` (x${s.defaultQuantity})` : "";
			const price =
				typeof s.priceKopecks === "number" && s.priceKopecks > 0
					? ` — ${(s.priceKopecks / 100).toLocaleString("ru-RU")} ₽`
					: "";
			parts.push(`• ${s.code} — ${s.nameRu}${qty}${price}`);
		}
	}

	parts.push("");
	parts.push(`РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ:`);
	parts.push(params.recommendations);

	if (params.doctorFullName?.trim()) {
		parts.push("");
		const spec = params.doctorSpecialty?.trim() ? ` (${params.doctorSpecialty.trim()})` : "";
		parts.push(`Врач: ${params.doctorFullName.trim()}${spec}`);
	}

	return parts.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// ПОИСК И ФИЛЬТРАЦИЯ ШАБЛОНОВ
// ─────────────────────────────────────────────────────────────────────────────

export function filterClinicalTemplates(
	query?: string | null,
	category?: ClinicalProtocolCategory | "all" | null,
): readonly Clinical1ClickTemplate[] {
	let list = CLINICAL_1CLICK_TEMPLATES_CATALOG;

	if (category && category !== "all") {
		list = list.filter((t) => t.category === category);
	}

	if (!query || !query.trim()) {
		return list;
	}

	const q = query.toLowerCase().replace(/ё/g, "е").trim();
	const tokens = q.split(/\s+/).filter(Boolean);

	return list.filter((t) => {
		const targetStr = `${t.title} ${t.shortTitle} ${t.icd10Code} ${t.icd10Title} ${t.defaultProcedureProtocol} ${CLINICAL_CATEGORY_LABELS[t.category]}`
			.toLowerCase()
			.replace(/ё/g, "е");
		return tokens.every((token) => targetStr.includes(token));
	});
}

/** Возвращает только 7 основных быстрых протоколов для верхнего ряда кнопок */
export function getCore1ClickTemplates(): readonly Clinical1ClickTemplate[] {
	return CLINICAL_1CLICK_TEMPLATES_CATALOG.filter((t) => t.isCore1Click);
}

/** Получить шаблон по его ID или коду МКБ-10 */
export function getClinicalTemplateById(idOrCode: string): Clinical1ClickTemplate | undefined {
	const norm = (idOrCode || "").trim().toLowerCase();
	if (
		norm === PHYSIOLOGICAL_NORM_PRESET.id.toLowerCase() ||
		norm === PHYSIOLOGICAL_NORM_PRESET.icd10Code.toLowerCase()
	) {
		return PHYSIOLOGICAL_NORM_PRESET;
	}
	return CLINICAL_1CLICK_TEMPLATES_CATALOG.find(
		(t) => t.id.toLowerCase() === norm || t.icd10Code.toLowerCase() === norm,
	);
}
