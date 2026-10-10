/**
 * @dental/shared/anesthesia/calculator/index.ts
 * Unified Anesthesia Calculator Module
 */

export * from "./types.js";
export * from "./drugCatalog.js";
export * from "./somaticRiskAdjuster.js";
export * from "./mrdDosageEngine.js";

export {
	resolveClinicalDefaultWeightKg,
	extractSomaticRiskProfileFromText,
	checkAnesthesiaSomaticContraindications,
} from "./somaticRiskAdjuster.js";

export {
	calculateVisitAnesthesiaSafety,
	calculatePatientMrd,
	resolveAutopilotAnesthesia,
	formatAnesthesiaSoapText,
} from "./mrdDosageEngine.js";
