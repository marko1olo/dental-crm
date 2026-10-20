/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Canonical Master Facade (Layer 5) preserving 100% public API backwards compatibility.
 * Decomposed into modular DAG presets architecture under ./presets/ (< 800 lines per module).
 *
 * Statutory reference: Приказ Минздрава России от 13.10.2017 N 804н
 * "Об утверждении номенклатуры медицинских услуг" (с изменениями и дополнениями).
 * Tax compliance: пп. 2 п. 2 ст. 149 НК РФ (0% НДС).
 */

export {
	BASELINE_804N_PRICELIST_SERVICES,
	STATUTORY_ORDER_804N_PRESETS,
} from "./presets";
export * from "./presets/constants";
export * from "./presets/diagnosticPediatricPresets";
export * from "./presets/orthoProstheticPresets";
export * from "./presets/presetMatcher";
export * from "./presets/surgeryImplantPresets";
export * from "./presets/therapyPresets";
export type * from "./presets/types";
