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

export const DENTAL_MATERIALS_CATALOG: DentalMaterialMeta[] = [
	THERAPEUTIC_MATERIALS[0]!,
	THERAPEUTIC_MATERIALS[1]!,
	ORTHOPEDIC_MATERIALS[0]!,
	ORTHOPEDIC_MATERIALS[1]!,
	SURGICAL_IMPLANT_MATERIALS[0]!,
	SURGICAL_IMPLANT_MATERIALS[1]!,
	ORTHODONTIC_MATERIALS[0]!,
	ORTHOPEDIC_MATERIALS[2]!,
	THERAPEUTIC_MATERIALS[2]!,
];

export const STAR_QUICK_PRESETS: readonly StarQuickPreset[] = [
	STAR_COMPOSITE_QUICK_PRESET,
	...STAR_ORTHOPEDIC_QUICK_PRESETS,
	STAR_IMPLANT_QUICK_PRESET,
] as const;

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

export function getWarrantyPreset(category: WarrantyCategory): WarrantyPreset {
	return WARRANTY_PRESETS[category] || WARRANTY_PRESETS.composite_restoration;
}

export function getAllWarrantyPresets(): WarrantyPreset[] {
	return Object.values(WARRANTY_PRESETS);
}

export function getWarrantyDefectTemplate(defectType: WarrantyDefectType): WarrantyDefectTemplate {
	return WARRANTY_DEFECT_TEMPLATES[defectType] || WARRANTY_DEFECT_TEMPLATES.filling_loss;
}

export function getAllWarrantyDefectTemplates(): WarrantyDefectTemplate[] {
	return Object.values(WARRANTY_DEFECT_TEMPLATES);
}
