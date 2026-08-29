/**
 * Patient Recall & Clinical Prophylaxis Engine Barrel Module (DOMAIN: RECALLS)
 */

export {
	RECALL_CYCLE_CATALOG,
	addCalendarMonthsSafe,
	addDaysSafe,
	addWeeksSafe,
	buildTelegramUrl,
	buildWhatsAppUrl,
	calculateCohortRetention,
	calculateDaysOverdue,
	calculateHygieneRecallDate,
	calculateImplantRecallMilestones,
	calculateOrthoRecallDate,
	calculatePediatricRecallDate,
	calculateRecallMetrics,
	calculateRecallProfile,
	evaluateClinicalCycleSuggestion,
	extractFirstName,
	filterAndSortRecallCandidates,
	formatIsoDateOnly,
	generate1ClickBookingLink,
	generateSmsRecallMessage,
	generateTelegramRecallMessage,
	generateWhatsAppRecallMessage,
	interpolateRecallTemplate,
	resolveUrgencyStatus,
	sanitizePhoneNumber,
} from "./patientRecallEngine";

export type {
	CohortRetentionGroup,
	CohortRetentionReport,
	PatientRecallCandidate,
	PatientRecallRecord,
	RecallChannel,
	RecallContactStatus,
	RecallCycleDefinition,
	RecallCycleType,
	RecallFilterOptions,
	RecallMetrics,
	RecallTemplateVariables,
	RecallUrgencyStatus,
} from "./patientRecallEngine";

export {
	CLINICAL_CALLING_SCRIPTS,
} from "./recallTemplates";

export type {
	RecallCallingScript,
	RecallScriptObjection,
} from "./recallTemplates";

export {
	PatientRecallsHubModal,
	type PatientRecallsHubModalProps,
	default,
} from "./PatientRecallsHubModal";

export {
	PatientRecallManagerModal,
	type PatientRecallManagerModalProps,
} from "../recall";
