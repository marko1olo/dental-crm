/**
 * @file packages/shared/src/index.ts
 * @description Root facade for @dental/shared - Layer 5 Master Coordinator / Facade.
 * Decomposed under Mandate 8b: Schemas modularized into packages/shared/src/schemas/.
 */

// --- Core Domain Schemas & DTOs ---
export * from "./schemas/index.js";
// Explicit re-exports to resolve wildcard collision between schemas and domain modules (TS2308)
export {
	SanPiNSterilizationEngine,
	type PrescriptionFormType,
	type PrescriptionValidityPeriod,
	prescriptionFormTypeSchema,
	prescriptionValidityPeriodSchema,
	type AnestheticDrug,
	anestheticDrugSchema,
	isValidFdiToothNumber,
	type TreatmentPlanItem,
	treatmentPlanItemSchema,
	labOrderStatusSchema,
	vitaShadeSchema,
	type AsaClassification,
	type VasoconstrictorRatio,
	type DmsGuaranteeLetter,
	type DmsGuaranteeLetterStatus,
	dmsGuaranteeLetterSchema,
	dentalSpecialtySchema,
	staffRoleSchema,
	type StaffRole,
} from "./schemas/index.js";

// --- Package Module Re-exports ---
export * from "./datetime/index.js";
export * from "./demo/index.js";
export { kopecksToRubles } from "./money.js";
export * from "./money.js";
export * from "./moneyWordsRu.js";
export * from "./fiscal/index.js";
export * from "./billing/index.js";
export { parseGs1DataMatrix, GS1_FNC1, GS1_GROUP_SEPARATOR } from "./mdlp/index.js";
export * from "./mdlp/index.js";
export * from "./utils/index.js";
export * from "./mobile/index.js";
export * from "./hardware/index.js";
export * from "./imaging/index.js";
export * from "./onboarding/index.js";
export * from "./omniPlatformAdapter.js";
export { formatSnils, isValidSnils, normalizeSnils } from "./utils/snils.js";
export { escapeHtml } from "./utils/index.js";
export {
	validateRussianInn, validateRussianOgrn, validateRussianKpp, ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024, ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
} from "./finance/taxDeduction.js";
export { formatKopecksRu, moneyRubSchema, nonNegativeMoneyRubSchema, positiveMoneyRubSchema } from "./money.js";
export * from "./sanpin/index.js";
export * from "./sanpin/sterilizationPouchEngine.js";
export * from "./legal/index.js";
export * from "./documents/index.js";
export * from "./toothCanalsAndBilling804n.js";
export * from "./clinical/index.js";
export * from "./pricelist/index.js";
export { ORDER_804N_CODE_REGEX } from "./pricelist/index.js";
export * from "./perio/index.js";
export * from "./emr/index.js";
export * from "./egisz/index.js";
export * from "./types/surgery.js";
export * from "./dicom/index.js";
export { consumableUnitSchema, type ConsumableUnit } from "./inventory/index.js";
export {
	type TimelineCategory, type TimelineCategory as ClinicalTimelineCategory, CLINICAL_TIMELINE_CATEGORIES, TIMELINE_CATEGORY_LABELS_RU,
	PATIENT_TIMELINE_EVENT_TYPES, type PatientTimelineEvent, type TimelineFilter, type TimelineQueryResult,
	createTimelineEvent, filterAndPaginateTimeline, formatTimelineA4Summary, formatPatientTimelineChronology,
	isTimelineCategory, TIMELINE_CATEGORIES, TIMELINE_EVENT_TYPES, type TimelineEventType,
	timelineCategorySchema, timelineEventTypeSchema, patientTimelineEntrySchema, type PatientTimelineEntry,
	createPatientTimelineEntrySchema, type CreatePatientTimelineEntryInput, patientTimelineFilterSchema, type PatientTimelineFilter,
	type TimelineGroupedByDate, type TimelineCategoryMetadata, TIMELINE_CATEGORY_META, groupTimelineEntriesByDate,
	filterTimelineEntries, type RelationshipType, type PatientRelationship, type CreateRelationshipInput,
	RELATIONSHIP_TYPES, RELATIONSHIP_LABELS_RU, relationshipTypeSchema, patientRelationshipSchema,
	createRelationshipInputSchema, getInverseRelationshipType, getRelationshipLabelRu, SEPA_SITE_CODES,
	type SepaSiteCode, SITES_PER_TOOTH, DEEP_POCKET_THRESHOLD_MM, ALL_FDI_TEETH,
	type IsoEndoSize, type IsoEndoColorInfo, ISO_ENDO_COLORS, ISO_ENDO_COLORS_MAP,
	getIsoEndoColorInfo, ALL_ISO_ENDO_OPTIONS, EXTENDED_MAF_ISO_OPTIONS, QUICK_LENGTH_PRESETS,
	type EndoPatientMemoParams, formatEndoPatientMemo,
} from "./clinical/index.js";
export { type MischBoneClass, interpolateNerveSpline3D, parseGalileosHeader } from "./radiology/index.js";
export { INVERSE_RELATIONSHIP_MAP } from "./clinical/index.js";
export {
	PURCHASE_ORDER_STATUS_LABELS_RU, type PurchaseOrderStatus, type ReorderSuggestion, computeReorderSuggestion,
	purchaseOrderStatusSchema, reorderSuggestionSchema,
} from "./warehouse/index.js";
export * from "./sync/index.js";
export * from "./finance/index.js";
export * from "./finance/stomxCashFlowCatalogs.js";
export * from "./finance/treatmentBudgetEngine.js";
export * from "./finance/accountingExportEngine.js";
export * from "./imaging/index.js";
export * from "./radiology/index.js";
export * from "./dicom/index.js";
export * from "./cda/index.js";
export { GOST_CRYPTO_OIDS } from "./egisz/index.js";
export * from "./egisz/index.js";
export * from "./logging/index.js";
export * from "./hardware/index.js";
export * from "./mobile/index.js";
export * from "./inventory/index.js";
export * from "./warehouse/index.js";
export * from "./lab/index.js";
export { type RecallPriority } from "./communications/index.js";
export * from "./communications/index.js";
export * from "./schedule/index.js";
export {
	patientOperationalStatusSchema, patientShiftQueueTabSchema, waitSeveritySchema, chairDurationSeveritySchema,
	queueActionRoleSchema, patientQueueActionIdSchema, patientQueueActionSchema, PATIENT_SHIFT_QUEUE_TABS_META,
	OPERATIONAL_STATUS_META, resolveOperationalStatus, mapOperationalStatusToDbStatus, mapOperationalStatusToQueueTab,
	formatWaitTimeRu, calculateWaitTime, formatChairDurationRu, calculateChairDuration,
	getAvailableQueueActions, formatTimeRangeRu, buildPatientShiftQueue, type PatientOperationalStatus,
	type PatientShiftQueueTab, type WaitSeverity, type ChairDurationSeverity, type QueueActionRole,
	type PatientQueueActionId, type PatientQueueAction, type PatientQueueItem, type PatientShiftQueueSummary,
	type PatientShiftQueueResult, type PatientShiftQueueOptions,
} from "./schedule/index.js";
export * from "./types/schedule.js";
export * from "./recalls/index.js";
export { type RecallCandidate } from "./recalls/index.js";
export * from "./patients/index.js";
export * from "./patients/stomxPatientTagsCatalog.js";
export * from "./storage/index.js";
export * from "./telephony/index.js";
export * from "./marketing/index.js";
export * from "./leads/index.js";
export * from "./analytics/index.js";
export * from "./anesthesia/index.js";
export * from "./insurance/index.js";
export * from "./messaging/index.js";
export * from "./portal/index.js";
export { DEFAULT_CATEGORY_COMMISSION_PERCENT } from "./finance/index.js";
export * from "./doctor-portal/index.js";
export * from "./crypto/index.js";
export * from "./doctor/index.js";
export * from "./treatment-plans/index.js";
export * from "./diagnostics/index.js";
export * from "./orthodontics/index.js";
export * from "./branches/index.js";
export * from "./warehouse/index.js";
export * as inventory from "./inventory/index.js";
export * from "./curator/index.js";
export * from "./outpatient/index.js";
export * from "./compliance/decree659Engine.js";
export {
	calculateEmployeeTimesheetT13, aggregateTimesheetDays, generateTimesheetT13Csv, getDaysInMonth,
	renderFormT13Html, TIMESHEET_STATUTORY_CODES, timesheetCodeSchema, timesheetDayRecordSchema,
	employeeTimesheetInputSchema, formT13DocumentPayloadSchema, type TimesheetCode, type TimesheetCodeMetadata,
	type TimesheetDayRecord, type EmployeeTimesheetInput, type TimesheetPeriodSummary, type EmployeeTimesheetResult,
	type FormT13DocumentPayload,
} from "./payroll/index.js";

// --- Utilities & Migration Re-exports ---
export * from "./migration.js";
export * from "./utils/dates.js";
export * from "./utils/money.js";
export * from "./utils/strings.js";

// --- Extended Domain Modules ---
export * from "./security/index.js";
export * from "./types/pricing.js";
export * from "./staff/index.js";
export * from "./utils/money.js";
export * from "./anesthesia/index.js";
export * from "./inventory/consumables.js";
export * from "./lab/index.js";
export * from "./knowledge/index.js";
export * from "./demo/demoConstants.js";

