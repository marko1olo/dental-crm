/**
 * ============================================================================
 * DENTAL WARRANTY PRESETS & STATUTORY REGULATIONS (СтАР & Закон РФ № 2300-1)
 * Модульный баррель гарантийных сроков, сроков службы и клинических дефектов.
 * Нормативная база: ЗоЗПП РФ (№ 2300-1), Положения СтАР, Приказ МЗ РФ № 804н.
 * ============================================================================
 */

import type {
	DentalMaterialMeta,
	StarQuickPreset,
	WarrantyCategory,
	WarrantyDefectTemplate,
	WarrantyDefectType,
	WarrantyPreset,
} from "./types.js";

import {
	COMPOSITE_RESTORATION_PRESET,
	CUSTOM_DEFECT_TEMPLATE,
	ENDODONTIC_TREATMENT_PRESET,
	FILLING_LOSS_DEFECT_TEMPLATE,
	OCCLUSAL_DISCOMFORT_DEFECT_TEMPLATE,
	PERIODONTAL_SPLINTING_PRESET,
	STAR_COMPOSITE_QUICK_PRESET,
	THERAPEUTIC_MATERIALS,
} from "./therapeuticWarrantyPresets.js";

import {
	CERAMIC_CHIP_DEFECT_TEMPLATE,
	CERAMIC_CROWN_VENEER_PRESET,
	CROWN_DECEMENTATION_DEFECT_TEMPLATE,
	DENTURE_FRACTURE_DEFECT_TEMPLATE,
	ORTHOPEDIC_MATERIALS,
	REMOVABLE_PROSTHESIS_PRESET,
	STAR_ORTHOPEDIC_QUICK_PRESETS,
	TEMPORARY_PROSTHESIS_PRESET,
} from "./orthopedicWarrantyPresets.js";

import {
	IMPLANT_FIXTURE_PRESET,
	SCREW_LOOSENING_DEFECT_TEMPLATE,
	STAR_IMPLANT_QUICK_PRESET,
	SURGICAL_IMPLANT_MATERIALS,
} from "./surgicalAndImplantWarrantyPresets.js";

import {
	ORTHODONTIC_ALIGNERS_PRESET,
	ORTHODONTIC_MATERIALS,
	RETAINER_DEBONDING_DEFECT_TEMPLATE,
} from "./orthodonticWarrantyPresets.js";

export type * from "./types.js";
export { MANDATORY_WARRANTY_CONDITIONS, VITA_SHADES } from "./types.js";

export * from "./therapeuticWarrantyPresets.js";
export * from "./orthopedicWarrantyPresets.js";
export * from "./surgicalAndImplantWarrantyPresets.js";
export * from "./orthodonticWarrantyPresets.js";

/**
 * Статутные гарантийные категории и нормативы СтАР
 */
export const WARRANTY_PRESETS: Record<WarrantyCategory, WarrantyPreset> = {
	composite_restoration: COMPOSITE_RESTORATION_PRESET,
	ceramic_crown_veneer: CERAMIC_CROWN_VENEER_PRESET,
	implant_fixture: IMPLANT_FIXTURE_PRESET,
	orthodontic_aligners: ORTHODONTIC_ALIGNERS_PRESET,
	removable_prosthesis: REMOVABLE_PROSTHESIS_PRESET,
	endodontic_treatment: ENDODONTIC_TREATMENT_PRESET,
	periodontal_splinting: PERIODONTAL_SPLINTING_PRESET,
	temporary_prosthesis: TEMPORARY_PROSTHESIS_PRESET,
};

/**
 * Базовый каталог материалов для быстрого автозаполнения
 */
export const DENTAL_MATERIALS_CATALOG: DentalMaterialMeta[] = [
	THERAPEUTIC_MATERIALS[0]!, // Filtek Ultimate
	THERAPEUTIC_MATERIALS[1]!, // Estelite Asteria
	ORTHOPEDIC_MATERIALS[0]!, // IPS e.max Press
	ORTHOPEDIC_MATERIALS[1]!, // Katana Zirconia
	SURGICAL_IMPLANT_MATERIALS[0]!, // Straumann SLActive
	SURGICAL_IMPLANT_MATERIALS[1]!, // Osstem TS III
	ORTHODONTIC_MATERIALS[0]!, // Spark Aligners
	ORTHOPEDIC_MATERIALS[2]!, // Vertex Implacryl
	THERAPEUTIC_MATERIALS[2]!, // AH Plus Jet
];

/**
 * 1-Клик нормативные пресеты гарантийных обязательств по СтАР (Мандат 8k & 8e)
 */
export const STAR_QUICK_PRESETS: readonly StarQuickPreset[] = [
	STAR_COMPOSITE_QUICK_PRESET,
	...STAR_ORTHOPEDIC_QUICK_PRESETS,
	STAR_IMPLANT_QUICK_PRESET,
] as const;

/**
 * 1-клик шаблоны гарантийного устранения дефектов (0 ₽)
 * Положение СтАР и Закон РФ № 2300-1 «О защите прав потребителей» (ст. 29)
 * Мандат 8e: Свобода скидок и гарантийных переделок врача
 */
export const WARRANTY_DEFECT_TEMPLATES: Record<WarrantyDefectType, WarrantyDefectTemplate> = {
	filling_loss: FILLING_LOSS_DEFECT_TEMPLATE,
	crown_decementation: CROWN_DECEMENTATION_DEFECT_TEMPLATE,
	ceramic_chip: CERAMIC_CHIP_DEFECT_TEMPLATE,
	screw_loosening: SCREW_LOOSENING_DEFECT_TEMPLATE,
	denture_fracture: DENTURE_FRACTURE_DEFECT_TEMPLATE,
	retainer_debonding: RETAINER_DEBONDING_DEFECT_TEMPLATE,
	occlusal_discomfort: OCCLUSAL_DISCOMFORT_DEFECT_TEMPLATE,
	custom_defect: CUSTOM_DEFECT_TEMPLATE,
};

/**
 * Получить пресет по категории
 */
export function getWarrantyPreset(category: WarrantyCategory): WarrantyPreset {
	return WARRANTY_PRESETS[category] || WARRANTY_PRESETS.composite_restoration;
}

/**
 * Получить все пресеты списком
 */
export function getAllWarrantyPresets(): WarrantyPreset[] {
	return Object.values(WARRANTY_PRESETS);
}

/**
 * Получить шаблон дефекта по типу
 */
export function getWarrantyDefectTemplate(defectType: WarrantyDefectType): WarrantyDefectTemplate {
	return WARRANTY_DEFECT_TEMPLATES[defectType] || WARRANTY_DEFECT_TEMPLATES.filling_loss;
}

/**
 * Получить все шаблоны дефектов списком
 */
export function getAllWarrantyDefectTemplates(): WarrantyDefectTemplate[] {
	return Object.values(WARRANTY_DEFECT_TEMPLATES);
}
