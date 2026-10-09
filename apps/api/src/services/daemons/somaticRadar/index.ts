/**
 * Somatic Radar Daemon — Barrel Index.
 * Directed Acyclic Graph (DAG) layer exports for somatic risk monitoring.
 */

export type {
	AppointmentSomaticContextInput,
	PatientSomaticProfileInput,
	SomaticAnamnesisExtraction,
	SomaticRadarAlert,
	SomaticRadarAlertAction,
	SomaticRadarPreShiftSummary,
	SomaticThreatCategory,
} from "./types.js";

export { SomaticAnamnesisExtractionSchema } from "./types.js";

export {
	SURGERY_NOMENCLATURE_CODES,
	SURGERY_PROCEDURE_KEYWORDS,
	calculateAge,
	isAnesthesiaIndicatedAppointment,
	isSurgicalAppointment,
} from "./clinicalClassifiers.js";

export {
	evaluatePatientSomaticRisk,
	extractSomaticRisksDeterministic,
	extractSomaticRisksWithLlm,
} from "./riskEvaluationEngine.js";

export {
	runSomaticRadarScan,
	runSomaticRadarShiftSummary,
} from "./radarScanPipeline.js";
