/**
 * DENTE Dental CRM — Pediatric Mixed Dentition Engine & Clinical Presets Facade
 * apps/web/src/components/odontogram/pediatricDentitionEngine.ts
 *
 * Single Source of Truth (SSOT): All pure clinical algorithms, 1-click norms,
 * eruption math, resorption models, and Cariogram classifiers are canonicalized
 * in @dental/shared/clinical/pediatricDentition and pediatricPhysiologicalNorms.
 *
 * This module preserves 100% backward compatibility for the web layer,
 * re-exporting canonical shared symbols while hosting DOM event dispatch helpers.
 */

export {
	ALL_PRIMARY_TEETH,
	PRIMARY_UPPER_TEETH,
	PRIMARY_LOWER_TEETH,
	PRIMARY_UPPER_RIGHT,
	PRIMARY_UPPER_LEFT,
	PRIMARY_LOWER_LEFT,
	PRIMARY_LOWER_RIGHT,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	PERMANENT_TO_PRIMARY_PREDECESSOR_MAP,
	MIXED_DENTITION_TOP,
	MIXED_DENTITION_BOTTOM,
	ALL_MIXED_DENTITION_TEETH,
	isPrimaryTooth,
	type ResorptionStagePercent,
	RESORPTION_STAGE_DEFINITIONS,
	calculateEruptionTimelineByAge,
	type DentitionStageCategory,
	type ToothExchangeStatus,
	type EruptionTimelineAnalysis,
	type CariogramInput,
	type CariogramResult,
	type CariogramRiskCategory,
	type CariogramSectorBreakdown,
	calculateCariogramRisk,
	cariogramInputSchema,
	generatePediatricCariogramDiaryText,
	type PediatricDiaryTextOptions,
	franklRatingSchema,
	type FranklRating,
	type FranklRatingDefinition,
	FRANKL_SCALE_DEFINITIONS,
	getFranklDefinition,
	silveringDrugSchema,
	type SilveringDrug,
	type PediatricSilveringOptions,
	type PediatricSilveringResult,
	calculatePediatricSilveringProtocol,
	fissureSealingMethodSchema,
	type FissureSealingMethod,
	fissureSealantMaterialSchema,
	type FissureSealantMaterial,
	type PediatricFissureSealingOptions,
	type PediatricFissureSealingResult,
	calculatePediatricFissureSealingProtocol,
	pulpotomySubBaseMaterialSchema,
	type PulpotomySubBaseMaterial,
	pulpotomyRestorationSchema,
	type PulpotomyRestoration,
	type PediatricPulpotomyOptions,
	type PediatricPulpotomyResult,
	calculatePediatricPulpotomyProtocol,
	type PediatricParentMemoOptions,
	generatePediatricParentRecommendations,
	// Canonical Physiological Norms & 1-Click Clinical Presets
	type DentitionMode,
	type ResorptionVisualProps,
	getPrimaryToothResorptionVisual,
	DEFAULT_CARIOGRAM_INPUT,
	type CariogramRiskLevel,
	getPediatricToothCategory as getToothDentitionType,
	getPediatricToothCategory,
	type CanonicalPediatricAgePreset,
	CANONICAL_PEDIATRIC_AGE_PRESETS,
	type PediatricPhysiologicalNormResult,
	type Pediatric1ClickProcedurePreset,
	calculatePediatricPhysiologicalNorm,
	getPediatricProcedurePreset,
} from "@dental/shared";

/**
 * 1-click dispatch helper to transfer any clinical protocol to clinical diary via standard DOM event.
 */
export function dispatchPediatricSoapProtocol(protocol: {
	diagnosisIcd10: string;
	statusLocalis: string;
	treatmentDescription: string;
	summary?: string;
	mode?: string;
}): boolean {
	try {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							diagnosisIcd10: protocol.diagnosisIcd10,
							statusLocalis: protocol.statusLocalis,
							treatmentDescription: protocol.treatmentDescription,
						},
						immediate: true,
						mode: "smart_append",
					},
				}),
			);
			return true;
		}
	} catch {
		// Ignore if running in non-browser environment
	}
	return false;
}
