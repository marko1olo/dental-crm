/**
 * index.ts — Barrel Export for Chairside Sentinel Engine Modular DAG.
 */

export type {
	ChairsideActionChainStep,
	ChairsideAlertSeverity,
	ChairsideAlertType,
	ChairsideOrder804nItem,
	ChairsideSafetyAlert,
	ChairsideSentinelAnalysisResult,
	ChairsideSoapDiary,
	ChairsideVisitContextInput,
	ClinicalCategory,
	ClinicalCategoryDetectionResult,
	DrugAndSomaticCheckResult,
	Order804nCalculationParams,
	SoapDiaryGenerationParams,
} from "./types.js";

export {
	evaluateAllergyAndDrugRules,
	hasRealAllergies,
	NORM_ALLERGY_MARKERS,
} from "./allergyAndDrugRules.js";

export {
	buildPhysiologicalNormAlert,
	checkDrugInteractionsAndSomatic,
	evaluateSomaticGuardRules,
	hasRealSomaticHistory,
	NORM_SOMATIC_MARKERS,
} from "./somaticGuardRules.js";

export {
	calculateOrder804nPackage,
	detectClinicalCategory,
	formatFdiTooth,
	generateSoapDiary,
	getCanalsForTooth,
	parseFdiTooth,
} from "./protocolCompletenessRules.js";

export {
	ChairsideSentinelEngine,
	defaultChairsideSentinel,
} from "./sentinelEngineCore.js";
