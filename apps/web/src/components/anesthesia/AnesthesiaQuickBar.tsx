/**
 * @dental/web/components/anesthesia/AnesthesiaQuickBar.tsx
 * Canonical Facade & Re-export for ChairsideAnesthesiaQuickBar (Mandate 8b <= 50 lines)
 * data-testid="anesthesia-dose-norm-preset"
 */

export { STANDARD_ANESTHESIA_NORM_PRESET_RU } from "../../lib/clinicalProtocolsReception";
export {
	ChairsideAnesthesiaQuickBar,
	ChairsideAnesthesiaQuickBar as AnesthesiaQuickBar,
	type ChairsideAnesthesiaQuickBarProps,
	type ChairsideAnesthesiaQuickBarProps as AnesthesiaQuickBarProps,
} from "./ChairsideAnesthesiaQuickBar";
export {
	CARPULE_PRESETS,
	CLINICAL_FAST_PRESETS,
	DENTAL_ANESTHETICS,
	PRIMARY_ANESTHETIC_DRUGS,
	STANDARD_ANESTHESIA_PRESETS,
	WEIGHT_PRESETS,
	WEIGHT_QUICK_PRESETS,
	type AnestheticDrugId,
	type ClinicalFastPresetItem,
	type InjectionTechniqueId,
	type NeedleGaugeType,
	type PrimaryAnestheticDrug,
	type StandardAnesthesiaPreset,
} from "./anesthesiaCatalogData";
export {
	calculateAnesthesiaSafety,
	formatAnesthesiaPatientMemo,
	persistAnesthesiaLog,
	postEmergencyAntishockWriteoff,
	postQuickCarpuleWriteoff,
	resolveClinicalDefaultWeightKg,
	type AnesthesiaCalculationInput,
	type AnesthesiaCalculationResult,
	type AnesthesiaPatientMemoParams,
} from "./anesthesiaEngine";
