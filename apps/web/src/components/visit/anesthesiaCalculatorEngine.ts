/**
 * anesthesiaCalculatorEngine.ts
 * Re-exported from canonical @dental/shared/anesthesia module.
 */

import {
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
	CARDIO_LIMIT_BADGE_TEXT,
	CARDIO_MAX_EPINEPHRINE_MG,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	HEALTHY_MAX_EPINEPHRINE_MG,
	calculatePatientMrd,
	calculateVisitAnesthesiaSafety,
	checkAnesthesiaSomaticContraindications,
	extractSomaticRiskProfileFromText,
	formatAnesthesiaSoapText,
	resolveAutopilotAnesthesia,
	type AnesthesiaDrugDefinition,
	type AnesthesiaDrugKey,
	type AnesthesiaMethodKey,
	type AnesthesiaSafetyLevel,
	type AnesthesiaSafetyParams,
	type AnesthesiaSoapRecordParams,
	type AnesthesiaSomaticAlert,
	type AutopilotResolutionResult,
	type PatientMrdCalculation,
	type SomaticAlertSeverity,
	type SomaticCrossCheckResult,
	type SomaticRiskProfile,
	type VisitAnesthesiaCalculationResult,
} from "@dental/shared";

export type {
	AnesthesiaDrugKey,
	AnesthesiaMethodKey,
	AnesthesiaDrugDefinition,
	AnesthesiaSafetyLevel,
	SomaticAlertSeverity,
	SomaticRiskProfile,
	AnesthesiaSomaticAlert,
	SomaticCrossCheckResult,
	AnesthesiaSafetyParams,
	PatientMrdCalculation,
	AutopilotResolutionResult,
	AnesthesiaSoapRecordParams,
};

export type AnesthesiaCalculationResult = VisitAnesthesiaCalculationResult;

export {
	HEALTHY_MAX_EPINEPHRINE_MG,
	CARDIO_MAX_EPINEPHRINE_MG,
	CARDIO_LIMIT_BADGE_TEXT,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
	extractSomaticRiskProfileFromText,
	checkAnesthesiaSomaticContraindications,
	calculatePatientMrd,
	resolveAutopilotAnesthesia,
	formatAnesthesiaSoapText,
};

export function calculateAnesthesiaSafety(
	params: AnesthesiaSafetyParams,
): VisitAnesthesiaCalculationResult {
	return calculateVisitAnesthesiaSafety(params);
}
