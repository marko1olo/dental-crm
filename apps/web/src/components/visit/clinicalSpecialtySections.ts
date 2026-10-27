/**
 * apps/web/src/components/visit/clinicalSpecialtySections.ts
 *
 * Единый реестр клинических разделов стоматологического приёма (Мандаты 8b, 8e).
 */

export {
	COMMON_FDI_TEETH,
	UPPER_JAW_FDI_TEETH,
	LOWER_JAW_FDI_TEETH,
	ALL_ADULT_FDI_TEETH,
	INTACT_QUADRANTS,
	TOOTH_UI_STATE_LABELS,
	getToothColorVariant,
	getQuadrantForTooth,
	isPathologicalToothState,
	normalizeToothUiState,
	getDynamicPatientTeeth,
	type DynamicToothItem,
	type DynamicTeethResult,
	type IntactQuadrant,
	type QuadrantId,
	type ToothColorVariant,
	type ClinicalSpecialtyItem,
	type ClinicalSpecialtySection,
} from "./clinicalSpecialtyTypes";

import type { ClinicalSpecialtySection } from "./clinicalSpecialtyTypes";
import { THERAPY_SECTION, ENDO_SECTION, HYGIENE_SECTION } from "./clinicalSpecialtyTherapy";
import { SURGERY_SECTION, ORTHOPEDICS_SECTION, PERIODONTOLOGY_SECTION } from "./clinicalSpecialtySurgeryOrtho";

export { THERAPY_SECTION, ENDO_SECTION, HYGIENE_SECTION } from "./clinicalSpecialtyTherapy";
export { SURGERY_SECTION, ORTHOPEDICS_SECTION, PERIODONTOLOGY_SECTION } from "./clinicalSpecialtySurgeryOrtho";

export const CLINICAL_SPECIALTY_SECTIONS: readonly ClinicalSpecialtySection[] = [
	THERAPY_SECTION,
	ENDO_SECTION,
	HYGIENE_SECTION,
	SURGERY_SECTION,
	ORTHOPEDICS_SECTION,
	PERIODONTOLOGY_SECTION,
];
