/**
 * clinicalSoapSearch.ts
 * Clinical catalog search, filtering by category and ICD-10 codes.
 */

import type { ClinicalSoapPreset } from "./clinicalSoapTypes.js";
import { THERAPY_SOAP_PRESETS } from "./presets/therapyPresets.js";
import { SURGERY_SOAP_PRESETS } from "./presets/surgeryPresets.js";
import { ORTHOPEDIC_SOAP_PRESETS } from "./presets/orthopedicPresets.js";
import { HYGIENE_PERIO_SOAP_PRESETS } from "./presets/hygienePerioPresets.js";

export const CLINICAL_SOAP_PRESETS: readonly ClinicalSoapPreset[] = [
	...THERAPY_SOAP_PRESETS,
	...SURGERY_SOAP_PRESETS,
	...ORTHOPEDIC_SOAP_PRESETS,
	...HYGIENE_PERIO_SOAP_PRESETS,
];

export const TOP_EXPRESS_PRESET_IDS: readonly string[] = [
	"norm_healthy",
	"hygiene_complex",
	"caries_medium",
	"pulpitis_acute",
	"perio_srp_curettage",
	"surgery_extraction_simple",
];

export const THERAPY_ENDO_QUICK_PRESET_IDS: readonly string[] = [
	"pulpitis_visit1",
	"pulpitis_obturation",
	"periodontitis_destructive",
	"caries_medium",
];

export const CLINICAL_PRESETS = CLINICAL_SOAP_PRESETS;

export function getPresetById(id: string): ClinicalSoapPreset | undefined {
	return CLINICAL_SOAP_PRESETS.find((p) => p.id === id);
}

export function getPresetsByCategory(category: string): ClinicalSoapPreset[] {
	if (!category || category === "all") return [...CLINICAL_SOAP_PRESETS];
	return CLINICAL_SOAP_PRESETS.filter((p) => p.category === category);
}

export function getPresetsByIcd10(icd10: string): ClinicalSoapPreset[] {
	const normalized = (icd10 ?? "").toUpperCase().trim();
	return CLINICAL_SOAP_PRESETS.filter((p) => p.icd10.toUpperCase().startsWith(normalized));
}

export function searchPresets(query: string, category = "all"): ClinicalSoapPreset[] {
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
