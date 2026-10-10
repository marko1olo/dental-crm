/**
 * chairsideSentinelEngine.ts — Canonical Facade for Chairside Sentinel Engine.
 *
 * Decomposed into modular DAG under `./chairsideSentinel/`:
 * - `types.ts` — Patient clinical context, alert severity, SOAP diary, Order 804n types
 * - `allergyAndDrugRules.ts` — Anesthetics, antibiotics, NSAID cross-reactivity, latex
 * - `somaticGuardRules.ts` — Cardiovascular, diabetes, anticoagulants, physiological norm
 * - `protocolCompletenessRules.ts` — FDI utilities, Form 043/у SOAP diary, Order 804n packages
 * - `sentinelEngineCore.ts` — Main evaluation pipeline & ChairsideSentinelEngine class
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
} from "./chairsideSentinel/index.js";

export {
	buildPhysiologicalNormAlert,
	calculateOrder804nPackage,
	ChairsideSentinelEngine,
	checkDrugInteractionsAndSomatic,
	defaultChairsideSentinel,
	detectClinicalCategory,
	evaluateAllergyAndDrugRules,
	evaluateSomaticGuardRules,
	formatFdiTooth,
	generateSoapDiary,
	getCanalsForTooth,
	hasRealAllergies,
	hasRealSomaticHistory,
	NORM_ALLERGY_MARKERS,
	NORM_SOMATIC_MARKERS,
	parseFdiTooth,
} from "./chairsideSentinel/index.js";
