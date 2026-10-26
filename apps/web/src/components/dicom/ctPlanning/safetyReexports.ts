/**
 * safetyReexports.ts — Реэкспорт функций безопасности имплантатов из @dental/shared (Мандат 8b <= 120 строк).
 */

export {
	MANDIBULAR_NERVE_SAFETY_THRESHOLD_MM,
	SINUS_FLOOR_SAFETY_THRESHOLD_MM,
	NEIGHBOR_IMPLANT_SAFETY_THRESHOLD_MM,
	distPointToSegment3,
	distPointToPolyline3,
	distSegmentToSegment3,
	distSegmentToPolyline3,
	type ImplantSafetyWarning,
	type PlanSafetyValidationResult,
	validateImplantNerveSafety,
	validatePlanSafety,
} from "@dental/shared";
