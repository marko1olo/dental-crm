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
	calculateHygieneRecallTrigger,
	calculateImplantProstheticRecallTrigger,
	calculateOrthoActivationRecallTrigger,
	calculatePediatricRecallTrigger,
	evaluateClinicalRecallTrigger,
	resolveCandidateTriggerType,
	isDateInPeriod,
	extractPolitePatientName,
	generatePdnProtectedRecallMessage,
	toCanonicalRecallStatus,
	fromCanonicalRecallStatus,
	CANONICAL_RECALL_STATUS_CONFIG,
	sendRecallCandidateInvite,
	sendRecallCandidateStatusUpdate,
} from "./patientRecallEngine";

export type {
	CanonicalRecallWorkflowStatus,
	ClinicalRecallTriggerInfo,
	ClinicalRecallTriggerType,
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
	RecallPeriodFilter,
	RecallTemplateVariables,
	RecallUrgencyStatus,
	RecallInviteRequest,
	RecallInviteResponse,
	RecallStatusUpdateRequest,
	RecallStatusUpdateResponse,
} from "./patientRecallEngine";

export {
	CLINICAL_CALLING_SCRIPTS,
	calculateSmsSegments,
	formatSmsSummary,
} from "./recallTemplates";

export type {
	RecallCallingScript,
	RecallScriptObjection,
	SmsSegmentCalculation,
} from "./recallTemplates";

export {
	PatientRecallsHubModal,
	type PatientRecallsHubModalProps,
	default,
} from "./PatientRecallsHubModal";

export * from "./PatientRecallsCohortsTab";
export * from "./PatientRecallsTaskCallsTab";
export * from "./PatientRecallsPreviewModals";
export * from "./PatientRecallsTableView";
export * from "./PatientRecallsKanbanView";
export * from "./PatientRecallsToolbar";

export {
	DEFAULT_RECALL_CANDIDATES,
	buildRecallMessageContent,
	cleanPhoneDigits,
	extractPatientFirstName,
	type PatientRecallItem,
	type RecallCategoryFilter,
	type RecallChannelType,
	type RecallUrgencyLevel,
} from "./patientRecallEngine";
