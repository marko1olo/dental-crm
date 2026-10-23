/**
 * DENTE Dental CRM — Clinical Service Catalog & Nomenclature Presets
 *
 * Canonical Master Facade (Layer 5) preserving 100% public API backwards compatibility.
 * Decomposed into modular DAG presets architecture under ./presets/ (< 120 lines per module).
 *
 * Tax compliance: пп. 2 п. 2 ст. 149 НК РФ (0% НДС).
 */

export {
	BASELINE_804N_PRICELIST_SERVICES,
	BASELINE_PRICELIST_SERVICES,
	CANONICAL_SERVICE_PRESETS,
	STATUTORY_ORDER_804N_PRESETS,
} from "./presets";
export * from "./presets/constants";
export * from "./presets/diagnosticPediatricPresets";
export * from "./presets/orthoProstheticPresets";
export * from "./presets/presetMatcher";
export * from "./presets/surgeryImplantPresets";
export * from "./presets/therapyPresets";
export type * from "./presets/types";
