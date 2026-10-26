/**
 * CLINICAL DIARY TEMPLATES CATALOG DATA — THIN ROOT FACADE
 * Evidence-based dental visit protocols according to EBM guidelines.
 * Compliant with Mandate 8b (Thin Facade <= 80 lines).
 */

export * from "./catalog/clinicalDiaryTypes";
export * from "./catalog/physiologicalNormPreset";
export * from "./catalog/therapyDiaryTemplates";
export * from "./catalog/endodonticDiaryTemplates";
export * from "./catalog/surgicalDiaryTemplates";
export * from "./catalog/orthopedicDiaryTemplates";
export * from "./catalog/periodonticDiaryTemplates";
export * from "./catalog/pediatricDiaryTemplates";

import type { Clinical1ClickTemplate } from "./catalog/clinicalDiaryTypes";
import {
	CARIES_MEDIUM_TEMPLATE,
	CARIES_DEEP_TEMPLATE,
	WEDGE_DEFECT_TEMPLATE,
} from "./catalog/therapyDiaryTemplates";
import {
	PULPITIS_ACUTE_TEMPLATE,
	PERIODONTITIS_CHRONIC_TEMPLATE,
} from "./catalog/endodonticDiaryTemplates";
import {
	IMPLANT_PLACEMENT_TEMPLATE,
	TOOTH_EXTRACTION_SIMPLE_TEMPLATE,
	TOOTH_EXTRACTION_COMPLEX_TEMPLATE,
} from "./catalog/surgicalDiaryTemplates";
import {
	CROWN_PREP_EMAX_TEMPLATE,
	CROWN_CEMENTATION_TEMPLATE,
} from "./catalog/orthopedicDiaryTemplates";
import { HYGIENE_AIRFLOW_TEMPLATE } from "./catalog/periodonticDiaryTemplates";
import {
	PEDIATRIC_PULPOTOMY_TEMPLATE,
	FISSURE_SEALING_TEMPLATE,
} from "./catalog/pediatricDiaryTemplates";

/**
 * Канонический реестр 1-Click клинических протоколов приёма.
 * Первые 7 элементов входят в быстрый доступ (isCore1Click: true).
 */
export const CLINICAL_1CLICK_TEMPLATES_CATALOG: readonly Clinical1ClickTemplate[] = [
	// ── 7 Ключевых протоколов быстрого доступа ──
	CARIES_MEDIUM_TEMPLATE,
	PULPITIS_ACUTE_TEMPLATE,
	PERIODONTITIS_CHRONIC_TEMPLATE,
	CROWN_PREP_EMAX_TEMPLATE,
	IMPLANT_PLACEMENT_TEMPLATE,
	TOOTH_EXTRACTION_SIMPLE_TEMPLATE,
	HYGIENE_AIRFLOW_TEMPLATE,
	// ── Расширенный клинический каталог ──
	CARIES_DEEP_TEMPLATE,
	CROWN_CEMENTATION_TEMPLATE,
	PEDIATRIC_PULPOTOMY_TEMPLATE,
	FISSURE_SEALING_TEMPLATE,
	WEDGE_DEFECT_TEMPLATE,
	TOOTH_EXTRACTION_COMPLEX_TEMPLATE,
];
