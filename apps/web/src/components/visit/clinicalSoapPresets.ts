/**
 * SSOT Клинический каталог пресетов и протоколов Формы 043/у (Приказ Минздрава РФ № 804н, № 1051н).
 * Декомпозирован по узким специализациям в соответствии с Мандатом 8b (лимит <= 800 строк):
 * - clinicalSoapTypes.ts: базовые типы и интерфейсы
 * - presets/therapyPresets.ts: терапия, эндодонтия, кариес
 * - presets/surgeryPresets.ts: хирургия, удаление, имплантация, периостотомия
 * - presets/orthopedicPresets.ts: ортопедия, коронки, вкладки, протезы
 * - presets/hygienePerioPresets.ts: гигиена, пародонтология, детская стоматология
 * - presets/canonicalTemplates.ts: канонические шаблоны 043/у
 * - presets/autopilotPresets.ts: 1-кликовые клинические автопилоты
 */

import { getToothAnatomicalDescription } from "../emr/templates/clinicalDiaryTemplatesEngine";
import type {
	ClinicalSoapPreset,
	ClinicalPresetCategory,
	ClinicalMaterialDeduction,
	ClinicalService804n,
	DoctorAutopilotPreset,
	ToothClinicalState,
} from "./clinicalSoapTypes";
import { THERAPY_SOAP_PRESETS } from "./presets/therapyPresets";
import { SURGERY_SOAP_PRESETS } from "./presets/surgeryPresets";
import { ORTHOPEDIC_SOAP_PRESETS } from "./presets/orthopedicPresets";
import { HYGIENE_PERIO_SOAP_PRESETS } from "./presets/hygienePerioPresets";

// Re-export all domain types
export * from "./clinicalSoapTypes";

// Re-export all domain presets and autopilot builders
export * from "./presets/therapyPresets";
export * from "./presets/surgeryPresets";
export * from "./presets/orthopedicPresets";
export * from "./presets/hygienePerioPresets";
export * from "./presets/canonicalTemplates";
export * from "./presets/autopilotPresets";

/**
 * Эталонный клинический каталог протоколов Формы 043/у по Приказам Минздрава РФ и СтАР.
 * Объединяет все 44 специализированных клинических протокола.
 */
export const CLINICAL_SOAP_PRESETS: readonly ClinicalSoapPreset[] = [
	...THERAPY_SOAP_PRESETS,
	...SURGERY_SOAP_PRESETS,
	...ORTHOPEDIC_SOAP_PRESETS,
	...HYGIENE_PERIO_SOAP_PRESETS,
];

/**
 * Топ-экспресс сценарии для мгновенного заполнения в 1 клик на панели визита.
 */
export const TOP_EXPRESS_PRESET_IDS: readonly string[] = [
	"norm_healthy",
	"hygiene_complex",
	"caries_medium",
	"pulpitis_acute",
	"perio_srp_curettage",
	"surgery_extraction_simple",
];

/**
 * 4 ключевых 1-клик протокола терапии и эндодонтии (Мандаты 8e, 8i, 8k, 8n).
 */
export const THERAPY_ENDO_QUICK_PRESET_IDS: readonly string[] = [
	"pulpitis_visit1",
	"pulpitis_obturation",
	"periodontitis_destructive",
	"caries_medium",
];

/**
 * Re-export для обратной совместимости с существующими компонентами и тестами.
 */
export const CLINICAL_PRESETS = CLINICAL_SOAP_PRESETS;

/**
 * Поиск пресета по ID.
 */
export function getPresetById(id: string): ClinicalSoapPreset | undefined {
	return CLINICAL_SOAP_PRESETS.find((p) => p.id === id);
}

/**
 * Фильтрация пресетов по категории.
 */
export function getPresetsByCategory(category: string): ClinicalSoapPreset[] {
	if (!category || category === "all") return [...CLINICAL_SOAP_PRESETS];
	return CLINICAL_SOAP_PRESETS.filter((p) => p.category === category);
}

/**
 * Фильтрация пресетов по коду МКБ-10.
 */
export function getPresetsByIcd10(icd10: string): ClinicalSoapPreset[] {
	const normalized = (icd10 ?? "").toUpperCase().trim();
	return CLINICAL_SOAP_PRESETS.filter((p) =>
		p.icd10.toUpperCase().startsWith(normalized),
	);
}

/**
 * Умный полнотекстовый поиск пресетов по коду МКБ, названию, услугам или материалам.
 */
export function searchPresets(query: string, category: string = "all"): ClinicalSoapPreset[] {
	const trimmed = (query ?? "").toLowerCase().trim();
	const base = getPresetsByCategory(category);
	if (!trimmed) return base;

	return base.filter((p) => {
		if (p.icd10.toLowerCase().includes(trimmed)) return true;
		if (p.title.toLowerCase().includes(trimmed)) return true;
		if (p.shortBadge.toLowerCase().includes(trimmed)) return true;
		if (p.complaint.toLowerCase().includes(trimmed)) return true;
		if (p.treatmentDescription.toLowerCase().includes(trimmed)) return true;
		if (p.service804n?.code804n.toLowerCase().includes(trimmed)) return true;
		if (p.service804n?.title.toLowerCase().includes(trimmed)) return true;
		if (p.materialsToDeduct?.some((m) => m.name.toLowerCase().includes(trimmed))) return true;
		return false;
	});
}

export interface FormattedSoapResult {
	readonly complaint: string;
	readonly anamnesis: string;
	readonly objectiveStatus: string;
	readonly diagnosis: string;
	readonly treatmentPlan: string;
	readonly recommendations?: string | undefined;
	readonly billLine: string;
	readonly materialsSummary: string;
	readonly service804n?: ClinicalService804n | undefined;
	readonly materialsToDeduct: readonly ClinicalMaterialDeduction[];
}

/**
 * Форматирует сводный результат предзаполнения полей SOAP Формы 043/у с учетом выбранного зуба FDI.
 */
export function formatSoapFromPreset(
	preset: ClinicalSoapPreset,
	targetTooth?: number | null,
	customAnestheticText?: string,
): FormattedSoapResult {
	const anatDesc = targetTooth ? getToothAnatomicalDescription(targetTooth) : "";
	const anatStr = anatDesc ? ` (${anatDesc})` : "";
	const toothSuffix =
		preset.category !== "hygiene" && targetTooth ? ` (Зуб ${targetTooth}${anatStr})` : "";
	const toothPrefix =
		preset.category !== "hygiene" && targetTooth ? `Зуб ${targetTooth}: ` : "";

	const cleanComplaint = preset.complaint || preset.anamnesis;
	const cleanAnamnesis = preset.anamnesis;
	const formattedStatus = `${toothPrefix}${preset.statusLocalis}`;
	const formattedDiagnosis = preset.icd10Label
		? `${preset.icd10} ${preset.icd10Label}${toothSuffix}`
		: `${preset.icd10} ${preset.title}${toothSuffix}`;

	let billLine = "";
	if (preset.service804n) {
		billLine = `Выполнено: [${preset.service804n.code804n}] ${preset.service804n.title}${toothSuffix} — ${preset.service804n.basePriceRub.toLocaleString("ru-RU")} ₽`;
	}

	const materialsList = preset.materialsToDeduct ?? [];
	const materialsSummary = materialsList.length > 0
		? materialsList.map((m) => `${m.name} (${m.quantity} ${m.unit})`).join("; ")
		: "Расходные материалы по клиническому регламенту";

	const materialsLine = materialsList.length > 0
		? `Списание со склада (Норма расхода): ${materialsSummary}`
		: "";

	const planParts = [
		customAnestheticText,
		preset.treatmentDescription,
		billLine,
		materialsLine,
	].filter(Boolean);

	const fullPlanText = planParts.join("\n\n");

	return {
		complaint: cleanComplaint,
		anamnesis: cleanAnamnesis,
		objectiveStatus: formattedStatus,
		diagnosis: formattedDiagnosis,
		treatmentPlan: fullPlanText,
		recommendations: preset.recommendations || "",
		billLine,
		materialsSummary,
		service804n: preset.service804n,
		materialsToDeduct: materialsList,
	};
}

/**
 * Применяет пресет к объекту формы визита (VisitNoteForm) с поддержкой режимов replace и smart_append.
 */
export function applyClinicalPresetToVisitNote<T extends Record<string, any>>(
	visitNoteForm: T,
	preset: ClinicalSoapPreset,
	options?: {
		readonly targetTooth?: number | null;
		readonly mode?: "clean_replace" | "smart_append";
		readonly customAnestheticText?: string;
	},
): T {
	const tooth = options?.targetTooth ?? preset.defaultTooth ?? 16;
	const mode = options?.mode ?? "clean_replace";
	const formatted = formatSoapFromPreset(preset, tooth, options?.customAnestheticText);

	if (mode === "clean_replace") {
		return {
			...visitNoteForm,
			complaint: formatted.complaint,
			anamnesis: formatted.anamnesis,
			objectiveStatus: formatted.objectiveStatus,
			diagnosis: formatted.diagnosis,
			treatmentPlan: formatted.treatmentPlan,
		};
	}

	// smart_append
	const appendField = (current: any, addition: string, separator: string = "\n\n"): string => {
		const base = typeof current === "string" ? current.trim() : "";
		if (!base) return addition;
		if (base.includes(addition)) return base;
		return `${base}${separator}${addition}`;
	};

	return {
		...visitNoteForm,
		complaint: appendField(visitNoteForm.complaint, formatted.complaint),
		anamnesis: appendField(visitNoteForm.anamnesis, formatted.anamnesis),
		objectiveStatus: appendField(visitNoteForm.objectiveStatus, formatted.objectiveStatus),
		diagnosis: appendField(visitNoteForm.diagnosis, formatted.diagnosis, ", "),
		treatmentPlan: appendField(visitNoteForm.treatmentPlan, formatted.treatmentPlan),
	};
}

/**
 * Рассчитывает суммарную нормативную себестоимость расходных материалов пресета в рублях.
 */
export function calculatePresetMaterialsCost(preset: ClinicalSoapPreset): number {
	const materials = preset.materialsToDeduct ?? [];
	return materials.reduce((sum, m) => {
		const cost = m.unitCostRub ?? 0;
		return sum + Math.round(cost * m.quantity * 100) / 100;
	}, 0);
}

/**
 * Генерирует текстовую квитанцию на списание медикаментов по форме М-11 / 0504230.
 */
export function generateMaterialsDeductionReceipt(
	preset: ClinicalSoapPreset,
	targetTooth?: number | null,
): string {
	const tooth = targetTooth ?? preset.defaultTooth;
	const toothStr = tooth ? ` (Зуб FDI #${tooth})` : "";
	const header = `ВЕДОМОСТЬ СПИСАНИЯ МАТЕРИАЛОВ ПО ПРОТОКОЛУ «${preset.title}»${toothStr}`;
	const divider = "─".repeat(header.length);

	const lines = (preset.materialsToDeduct ?? []).map((m, idx) => {
		const priceStr = m.unitCostRub ? ` [${m.unitCostRub} ₽/${m.unit}]` : "";
		return `${idx + 1}. ${m.name}: ${m.quantity} ${m.unit}${priceStr}`;
	});

	const totalCost = calculatePresetMaterialsCost(preset);
	const footer = `Нормативная себестоимость материалов: ${totalCost.toLocaleString("ru-RU")} ₽`;

	return [header, divider, ...lines, divider, footer].join("\n");
}

/**
 * Валидатор соответствия пресета стандарту Формы 043/у и Приказа № 804н.
 */
export function validateSoapPreset(preset: ClinicalSoapPreset): {
	readonly isValid: boolean;
	readonly errors: readonly string[];
} {
	const errors: string[] = [];

	if (!preset.id || preset.id.trim().length === 0) {
		errors.push("ID пресета не может быть пустым");
	}
	if (!preset.title || preset.title.trim().length < 3) {
		errors.push("Название пресета должно содержать не менее 3 символов");
	}
	if (!/^[A-Z][0-9]{2}(\.[0-9]{1,3})?$/.test(preset.icd10)) {
		errors.push(`Некорректный код МКБ-10: ${preset.icd10}`);
	}
	if (!preset.complaint || preset.complaint.trim().length < 10) {
		errors.push("Жалобы должны содержать развернутый клинический текст");
	}
	if (!preset.anamnesis || preset.anamnesis.trim().length < 10) {
		errors.push("Анамнез должен содержать развернутый клинический текст");
	}
	if (!preset.statusLocalis || preset.statusLocalis.trim().length < 10) {
		errors.push("Осмотр и зубная формула должны содержать объективное описание осмотра");
	}
	if (!preset.treatmentDescription || preset.treatmentDescription.trim().length < 15) {
		errors.push("Протокол лечения должен содержать описание вмешательства");
	}
	if (preset.service804n && !/^[AB]\d{2}\.\d{2,3}\.\d{2,3}(?:\.\d{2,3})?$/i.test(preset.service804n.code804n)) {
		errors.push(`Некорректный код номенклатуры 804н: ${preset.service804n.code804n}`);
	}
	if (preset.materialsToDeduct) {
		for (const m of preset.materialsToDeduct) {
			if (!m.name || m.name.trim().length === 0) {
				errors.push("Наименование материала не может быть пустым");
			}
			if (!Number.isFinite(m.quantity) || m.quantity <= 0) {
				errors.push(`Количество материала «${m.name}» должно быть положительным числом`);
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

export { getToothAnatomicalDescription };
