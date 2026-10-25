/**
 * patientSafetyEvaluation.ts — Оценка клинической безопасности пациента.
 * Decomposed facade strictly <= 80 lines following Mandate 8b.
 */

export type {
	PatientSafetyEvaluationResult,
	ClinicalSafetyFlag,
} from "./safetyEvaluation/types";

export { evaluatePatientSafetyFlags } from "./safetyEvaluation/safetyFlagsEvaluator";
export { formatSafetyProfileToDiaryText } from "./safetyEvaluation/safetyDiaryFormatter";
export { checkProcedureSafety } from "./safetyEvaluation/procedureSafetyChecker";
