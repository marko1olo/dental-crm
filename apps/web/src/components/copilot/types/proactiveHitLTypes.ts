export interface CopilotNudge {
	id: string;
	kind: string;
	payload?: Record<string, unknown> | undefined;
	created_at: string;
	expires_at?: string | undefined;
}

export type ProactiveNudge = CopilotNudge;

export interface CopilotSuggestion {
	id: string;
	icon: string;
	cat: "workflows" | "patients" | "agenda" | "recalls" | "money" | "reports";
	labelRu: string;
	labelEn: string;
	promptRu: string;
	promptEn: string;
}

export interface SuggestionCategory {
	category: string;
	items: Array<{ label: string; prompt: string; icon?: string }>;
}

export type TriageUrgency = "NORMAL" | "URGENT" | "CRITICAL";

export type PatientSentimentKind = "positive" | "neutral" | "negative" | "anxious" | "emergency";

export interface PatientSentimentBadge {
	sentiment: PatientSentimentKind;
	label: string;
	color?: string | undefined;
	score?: number | undefined;
}

export interface ProactiveAlertAction {
	id: string;
	label: string;
	kind: "primary" | "secondary" | "danger";
	prompt?: string | undefined;
	actionType?: string | undefined;
	payload?: Record<string, unknown> | undefined;
}

export interface ProactiveAlertCardData {
	id: string;
	urgency: TriageUrgency;
	title: string;
	subtitle?: string | undefined;
	description: string;
	timestamp: string;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	patientPhone?: string | null | undefined;
	category:
		| "whatsapp_emergency"
		| "ztl_status"
		| "retention"
		| "gap_filler"
		| "emr_draft"
		| "clinical_alert"
		| "general_message";
	actions: ProactiveAlertAction[];
	data?: Record<string, unknown> | undefined;
	metadata?: Record<string, unknown> | undefined;
}

export interface EmrDraftCard {
	draftId: string;
	patientId: string;
	patientName: string;
	visitDate: string;
	tooth?: string | number | undefined;
	diagnosis: string;
	icd10?: string | undefined;
	proposedDiary: string;
	actionPrompt?: string | undefined;
}

export interface GapFillerPatientOption {
	id: string;
	name: string;
	phone: string;
	reason: string;
	priorityScore: number;
	matchScore: number;
}

export interface GapFillerCard {
	gapId: string;
	doctorName: string;
	cabinet?: string | undefined;
	date: string;
	timeRange: string;
	suggestedPatients: GapFillerPatientOption[];
	actionPrompt?: string | undefined;
}

export interface RetentionSamplePatient {
	id: string;
	name: string;
	lastVisitMonthsAgo: number;
	recommendedTreatment: string;
}

export interface RetentionSummaryCard {
	summaryId: string;
	cohortName: string;
	atRiskCount: number;
	potentialRevenueRub: number;
	suggestedCampaign: string;
	samplePatients: RetentionSamplePatient[];
	actionPrompt?: string | undefined;
}
