/**
 * safetyMath.ts — Клинический двигатель безопасности пациента, аллергостатуса и критических стоп-факторов DENTE.
 * Decomposed facade strictly <= 80 lines following Mandate 8b.
 * Mandates 8e, 8k, 8n: Ноль фармакологической паранойи, автономия врача, норма в 1 клик.
 */

export { isNegativeAllergyStatement } from "../../utils/somaticNorm";

export type {
	ClinicalSafetySeverity,
	ClinicalSafetyCategory,
	PregnancyTrimester,
	ClinicalSafetyItemDefinition,
	PatientClinicalSafetyProfile,
} from "./safetyMath/types";

export {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	isSomaticProfilePhysiologicalNorm,
} from "./safetyMath/somaticDefaults";

export { parseSafetyProfileFromText } from "./safetyMath/somaticTextParser";

export {
	patientProfileToSomaticRiskProfile,
	getAnesthesiaAutopilotForPatient,
	calculatePatientMrdForProfile,
} from "./safetyMath/anesthesiaRiskBridge";

export { CLINICAL_SAFETY_CATALOG } from "./clinicalSafetyCatalogData";

export {
	evaluatePatientSafetyFlags,
	checkProcedureSafety,
	formatSafetyProfileToDiaryText,
} from "./patientSafetyEvaluation";

export type {
	PatientSafetyEvaluationResult,
	ClinicalSafetyFlag,
} from "./patientSafetyEvaluation";

export type EvaluatedSafetyFlagsResult = import("./patientSafetyEvaluation").PatientSafetyEvaluationResult;
export type EvaluatedSafetyFlag = import("./patientSafetyEvaluation").ClinicalSafetyFlag;
