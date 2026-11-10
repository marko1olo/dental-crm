/**
 * packages/shared/src/clinical/index.ts
 * Clinical Audit, CMO Quality Control & Pharmacotherapy DDI Safety Engine.
 */

export * from "./clinicalDdiDrugSafetyEngine.js";
export * from "./cmoEmkQualityAuditEngine.js";
export * from "./visitWorkOrder.js";
export * from "./endo/index.js";
export * from "./endoProtocolEngine.js";
export * from "./restorationProtocolEngine.js";
export * from "./therapyProtocolEngine.js";
export * from "./clinicalDefectsCatalog.js";
export * from "./clinicalPricelistCatalog.js";
export * from "../emr/periodontogram.js";
export {
	type TimelineCategory,
	type TimelineCategory as ClinicalTimelineCategory,
	CLINICAL_TIMELINE_CATEGORIES,
	TIMELINE_CATEGORY_LABELS_RU,
	PATIENT_TIMELINE_EVENT_TYPES,
	type PatientTimelineEvent,
	type TimelineFilter,
	type TimelineQueryResult,
	createTimelineEvent,
	filterAndPaginateTimeline,
	formatTimelineA4Summary,
	formatPatientTimelineChronology,
	isTimelineCategory,
	TIMELINE_CATEGORIES,
	TIMELINE_EVENT_TYPES,
	type TimelineEventType,
	timelineCategorySchema,
	timelineEventTypeSchema,
	patientTimelineEntrySchema,
	type PatientTimelineEntry,
	createPatientTimelineEntrySchema,
	type CreatePatientTimelineEntryInput,
	patientTimelineFilterSchema,
	type PatientTimelineFilter,
	type TimelineGroupedByDate,
	type TimelineCategoryMetadata,
	TIMELINE_CATEGORY_META,
	groupTimelineEntriesByDate,
	filterTimelineEntries,
} from "./patientTimelineEngine.js";
export * from "./patientRelationshipsEngine.js";
export * from "./dentalFormulaSsot.js";
export * from "./odontogramTreatmentEngine.js";
export * from "./pediatricDentition.js";
export * from "./pediatric/constants.js";
export * from "./playbooks/index.js";
export * from "./smartClinicalPlaybooksEngine.js";
export {
  generateMorningDoctorBriefing,
  MorningAppointmentItemSchema,
  MorningDoctorBriefingInputSchema,
  ChairLoadItemSchema,
  RedAlertSummarySchema,
  MorningDoctorBriefingSummarySchema,
  CancelledSlotSchema,
  RecallCandidateSchema,
  CancellationGapRecoveryInputSchema,
  ScoredCandidateSchema,
  CancellationGapRecoveryResultSchema,
  PreAppointmentSummaryInputSchema,
  PreAppointmentSummarySchema,
  type MorningAppointmentItem,
  type MorningDoctorBriefingInput,
  type ChairLoadItem,
  type RedAlertSummary,
  type MorningDoctorBriefingSummary,
  type CancelledSlot,
  type RecallCandidate,
  type CancellationGapRecoveryInput,
  type ScoredCandidate,
  type CancellationGapRecoveryResult,
  type PreAppointmentSummaryInput,
  type PreAppointmentSummary,
} from "./clinicalPlaybooksEngine.js";
export * from "../warehouse/treatmentConsumablesEngine.js";
export * from "../warehouse/defaultServiceBomCatalog.js";
export * from "../warehouse/autoVisitBomEngine.js";
export { CLASS_B_WEIGHT_ESTIMATES, calculateClassBWasteWeightKg } from "../warehouse/autoVisitBomEngine.js";
export * from "./photoProtocol.js";
export * from "./soap/index.js";
export * from "./somaticCatalog.js";
export {
	evaluateSomaticSafety,
	type SomaticSafetyEvaluation,
	type SomaticSafetyInput,
	type SomaticStopFactor,
	type SomaticStopFactorCategory,
	type SomaticSeverity,
	extractFullAnamnesisText,
	createHealthySomaticNormProfile,
	applySomaticNorm,
} from "./somaticSafetyEngine.js";
export * from "./clinicalMarketMaterialsCatalog.js";
export * from "./clinicalDiagnosesSsot.js";
export * from "./bundles/index.js";
export * from "./presets/index.js";
export * from "./diagnosisServiceBundles.js";
export * from "./pricelistBatchImport.js";
export * from "./informedConsentEngine.js";
export * from "./prescriptionCatalog.js";
export * from "./stenographer/index.js";
export * from "./touchErgonomics.js";
export * from "./dentalFormulaTextParser.js";
export * from "./speech/toothSpeechGrammar.js";
export * from "../anesthesia/index.js";

// Explicit re-exports to resolve wildcard collision (TS2308)
export type {
	ClinicalAnestheticInfo,
	ClinicalMaterialCategory,
	ClinicalMaterialDeduction,
	ClinicalMaterialUnit,
	ClinicalPresetCategory,
	ClinicalService804n,
	ToothClinicalState,
} from "./soap/soapTypes.js";
export { isValidFdiToothNumber } from "./dentalFormulaSsot.js";
