export interface TextUiMessage {
	kind: "text";
	role: "user" | "assistant";
	text: string;
	streaming?: boolean | undefined;
}

export interface ToolUiMessage {
	kind: "tool";
	callId: string;
	name: string;
	status: "running" | "done" | "failed";
	args?: Record<string, unknown> | undefined;
	result?: unknown;
}

export interface ConfirmUiMessage {
	kind: "confirmation";
	callId: string;
	name: string;
	args: Record<string, unknown>;
	resolved?: ("confirm" | "reject") | undefined;
}

export interface ThinkingUiMessage {
	kind: "thinking";
	text: string;
	streaming?: boolean | undefined;
	durationMs?: number | undefined;
}

export interface ReactStepItem {
	id: string;
	stepNumber: number;
	title: string;
	status: "pending" | "running" | "done" | "failed";
	detail?: string | undefined;
	icon?: string | undefined;
}

export interface ReactStepsUiMessage {
	kind: "react_steps";
	title?: string | undefined;
	steps: ReactStepItem[];
	currentStepIndex?: number | undefined;
	isComplete?: boolean | undefined;
	totalDurationMs?: number | undefined;
}

export type CopilotUiMessage =
	| TextUiMessage
	| ToolUiMessage
	| ConfirmUiMessage
	| ThinkingUiMessage
	| ReactStepsUiMessage;

export interface Protocol043Data {
	patientId?: string | undefined;
	patientName?: string | undefined;
	tooth?: string | number | undefined;
	teeth?: (string | number)[] | undefined;
	diagnosis?: string | undefined;
	icd10?: string | undefined;
	complaint?: string | undefined;
	complaints?: string | undefined;
	anamnesis?: string | undefined;
	objective?: string | undefined;
	objectiveStatus?: string | undefined;
	treatment?: string | undefined;
	treatmentPlan?: string | undefined;
	recommendations?: string | undefined;
	doctorName?: string | undefined;
	date?: string | undefined;
}

export interface DdiSafetyAlertData {
	severity: "contraindicated" | "high" | "moderate" | "warning" | string;
	title: string;
	description: string;
	allergen?: string | undefined;
	contraindicatedDrug?: string | undefined;
	patientAllergies?: string[] | undefined;
	safeAlternatives: string[];
	recommendedAlternative?: string | undefined;
	clinicalRecommendation?: string | undefined;
}

export interface PendingConfirmation {
	callId: string;
	name: string;
	args: Record<string, unknown>;
}

export type CopilotPhase = "thinking" | "working" | "writing" | null;

export interface CopilotNudge {
	id: string;
	kind: string;
	payload?: Record<string, unknown> | undefined;
	created_at: string;
	expires_at?: string | undefined;
}

export interface CopilotSuggestion {
	id: string;
	icon: string;
	cat: "workflows" | "patients" | "agenda" | "recalls" | "money" | "reports";
	labelRu: string;
	labelEn: string;
	promptRu: string;
	promptEn: string;
}

export type ConfirmHandler = (
	callId: string,
	action: "confirm" | "reject",
	modifiedArgs?: Record<string, unknown> | undefined,
	reason?: string | undefined,
) => void;
export interface SuggestionCategory {
	category: string;
	items: Array<{ label: string; prompt: string; icon?: string }>;
}

export interface SlotResult {
	start_time: string;
	end_time?: string | undefined;
	cabinet?: string | undefined;
	professional_name?: string | undefined;
	doctor_name?: string | undefined;
}

export interface PatientResult {
	id: string;
	full_name: string;
	phone?: string | undefined;
	email?: string | undefined;
	status?: string | undefined;
	date_of_birth?: string | undefined;
	birth_date?: string | undefined;
}

export interface AppointmentResult {
	id: string;
	patient_name?: string | undefined;
	start_time?: string | undefined;
	end_time?: string | undefined;
	status?: string | undefined;
	cabinet?: string | undefined;
	service?: string | undefined;
	doctor_name?: string | undefined;
}

export interface LabOrderItem {
	id?: string | undefined;
	order_id?: string | undefined;
	order_number?: string | undefined;
	prosthesis_kind?: string | undefined;
	prosthesis_type?: string | undefined;
	kind?: string | undefined;
	tooth?: string | number | undefined;
	tooth_number?: string | number | undefined;
	teeth?: (string | number)[] | undefined;
	shade?: string | undefined;
	vita_shade?: string | undefined;
	status?: string | undefined;
	eta?: string | undefined;
	delivery_date?: string | undefined;
	lab_name?: string | undefined;
	patient_name?: string | undefined;
	notes?: string | undefined;
}

export interface DrugInteractionItem {
	id?: string | undefined;
	severity:
		| "contraindicated"
		| "high"
		| "moderate"
		| "low"
		| "warning"
		| string;
	medicationA?: string | undefined;
	medicationB?: string | undefined;
	drugs?: string[] | undefined;
	title?: string | undefined;
	description: string;
	medical_advice?: string | undefined;
	clinical_recommendation?: string | undefined;
	allergy_match?: boolean | undefined;
	allergen?: string | undefined;
}

export interface TimelineEventItem {
	id: string;
	date: string;
	type:
		| "visit"
		| "diagnosis"
		| "treatment_stage"
		| "payment"
		| "lab_order"
		| string;
	title: string;
	doctor_name?: string | undefined;
	specialty?: string | undefined;
	diagnosis_code?: string | undefined;
	icd10?: string | undefined;
	amount_rub?: number | undefined;
	teeth?: (string | number)[] | undefined;
	status?: string | undefined;
	description?: string | undefined;
}

export interface FamilyMemberBalance {
	patient_id: string;
	patient_name: string;
	relationship: string;
	balance_rub: number;
	unpaid_invoices_count?: number | undefined;
}

export interface FamilyBalanceResult {
	family_id?: string | undefined;
	primary_patient_name?: string | undefined;
	total_family_balance_rub: number;
	total_unpaid_invoices_rub?: number | undefined;
	members: FamilyMemberBalance[];
}

export type SelectIdHandler = ((id: string) => void) | undefined;
export type BookSlotHandler = ((slot: SlotResult) => void) | undefined;

// ============================================================================
// PROACTIVE CARDS & OMNICHANNEL HITL TYPES (APPLE HIG CLINICAL STANDARD)
// ============================================================================

export type TriageUrgency = "NORMAL" | "URGENT" | "CRITICAL";

export type PatientSentimentKind =
	| "positive"
	| "neutral"
	| "negative"
	| "anxious"
	| "emergency";

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

export interface ZtlAlertCard {
	orderId: string;
	orderNumber: string;
	patientId: string;
	patientName: string;
	labName: string;
	prosthesisType: string;
	tooth?: string | number | undefined;
	status: "in_transit" | "ready" | "delayed" | "quality_check";
	etaDate?: string | undefined;
	warning?: string | undefined;
	actionPrompt?: string | undefined;
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

export interface WhatsAppApprovalCard {
	approvalId: string;
	patientId: string;
	patientName: string;
	phone: string;
	intent: string;
	urgency: TriageUrgency;
	incomingSnippet: string;
	draftReply: string;
	channel: "whatsapp" | "telegram" | "sms";
	confidenceScore: number;
	actionPrompt?: string | undefined;
	createdAt?: string | undefined;
	status?: "pending" | "approved" | "rejected" | "sent" | undefined;
}
