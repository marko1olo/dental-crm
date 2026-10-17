import type { ClinicalSafetyItemDefinition } from "./safetyMath";
import { CARDIO_ANESTHESIA_SAFETY_ITEMS } from "./clinicalSafetyCardioAndAnesthesia";
import { PREGNANCY_CHRONIC_SAFETY_ITEMS } from "./clinicalSafetyPregnancyAndChronic";
import { GENERAL_ALLERGIES_SAFETY_ITEMS } from "./clinicalSafetyGeneralAllergies";

/**
 * Канонический каталог соматических стоп-факторов и аллергий DENTE CRM.
 * Без академического блоата и фармакологической паранойи (Мандаты 8e, 8k, 8n).
 */
export const CLINICAL_SAFETY_CATALOG: readonly ClinicalSafetyItemDefinition[] = [
	...CARDIO_ANESTHESIA_SAFETY_ITEMS,
	...PREGNANCY_CHRONIC_SAFETY_ITEMS,
	...GENERAL_ALLERGIES_SAFETY_ITEMS,
];
