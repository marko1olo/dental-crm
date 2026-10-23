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
	calculateImplantMonitoringRecallTrigger,
	calculateImplantProstheticRecallTrigger,
	calculateProstheticRecallTrigger,
	calculateOrthoActivationRecallTrigger,
	calculatePediatricRecallTrigger,
	calculateEndodonticRecallTrigger,
	calculatePeriodontalRecallTrigger,
	isEndodonticCheckProcedure,
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
	INVITATION_TEMPLATES,
	CLINICAL_CALLING_SCRIPTS,
	calculateSmsSegments,
	formatSmsSummary,
} from "./recallTemplates";

export type {
	RecallInvitationTemplate,
	RecallCallingScript,
	RecallScriptObjection,
	SmsSegmentCalculation,
} from "./recallTemplates";

export {
	PatientRecallsHubModal,
	type PatientRecallsHubModalProps,
	default,
} from "./PatientRecallsHubModal";

export * from "./PatientRecallsTaskCallsTab";
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
