/**
 * @dental/shared/anesthesia/safety.ts
 * Comprehensive Anesthesia Safety & Maximum Recommended Dose (MRD) Engine Facade (Mandate 8b, <= 120 lines)
 */

export {
	isPediatricPatient,
	calculateAge,
	isGeriatricPatient,
	calculateEffectiveMgPerKg,
} from "./safetyModules/ageAndPediatrics.js";

export { screenPatientContraindications } from "./safetyModules/contraindicationsScreen.js";

export {
	evaluateSafetyZone,
	generateClinicalAdviceRu,
	synthesizeAnesthesiaDiaryText,
} from "./safetyModules/safetyZoneEvaluator.js";

export { calculateComprehensiveAnesthesiaSafety } from "./safetyModules/comprehensiveCalculator.js";
