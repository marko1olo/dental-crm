/**
 * @dental/shared/anesthesia/calculator.ts
 * Chairside Anesthesia Safety Calculator, MRD & Somatic Autopilot (Facade)
 */

export * from "./calculator/index.js";

export {
	resolveClinicalDefaultWeightKg,
	extractSomaticRiskProfileFromText,
	checkAnesthesiaSomaticContraindications,
	calculateVisitAnesthesiaSafety,
	calculatePatientMrd,
	resolveAutopilotAnesthesia,
	formatAnesthesiaSoapText,
} from "./calculator/index.js";
