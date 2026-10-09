/**
 * types.ts — Layer 0: Domain Types, DTOs & Zod Schemas for WhatsApp Omnichannel Bridge.
 * 
 * Invariants:
 * - Pure data contracts, 0 runtime side-effects.
 * - Strict type definitions for Webhook Ingestion, Clinical Triage, Proactive Alerts, and HitL Queue.
 */

import { z } from "zod";

// ============================================================================
// TRIAGE ENUMS & CATEGORIES
// ============================================================================

export type TriageUrgency = "NORMAL" | "URGENT" | "CRITICAL";

export type PatientSentiment =
	| "positive"
	| "neutral"
	| "negative"
	| "anxious"
	| "emergency";

export type TriageIntent =
	| "emergency"
	| "symptom_report"
	| "booking_request"
	| "cancellation_request"
	| "reschedule_request"
	| "ztl_inquiry"
	| "price_inquiry"
	| "general_inquiry"
	| "feedback";

export type ProactiveCardCategory =
	| "whatsapp_emergency"
	| "ztl_status"
	| "retention"
	| "gap_filler"
	| "emr_draft"
	| "clinical_alert"
	| "general_message";

// ============================================================================
// ZOD SCHEMAS & TRIAGE RESULT
// ============================================================================

export const WhatsAppTriageLlmSchema = z.object({
	urgency: z
		.enum(["NORMAL", "URGENT", "CRITICAL"])
		.describe(
			"Triage urgency level: CRITICAL (emergency), URGENT (subacute/broken crown), NORMAL (routine)",
		),
	sentiment: z
		.enum(["positive", "neutral", "negative", "anxious", "emergency"])
		.describe("Detected patient emotional tone"),
	intent: z
		.enum([
			"emergency",
			"symptom_report",
			"booking_request",
			"cancellation_request",
			"reschedule_request",
			"ztl_inquiry",
			"price_inquiry",
			"general_inquiry",
			"feedback",
		])
		.describe("Primary intent of the patient's message"),
	confidence: z.number().min(0).max(1).default(0.95),
	matchedKeywords: z.array(z.string()).default([]),
	clinicalSummary: z.string().default("Клинический триаж обращения пациента"),
	suggestedAction: z
		.string()
		.default(
			"Немедленный звонок администратора / дежурного врача, запись в экстренное окно с подготовкой хирургического/терапевтического кабинета",
		),
	recommendedDoctorRole: z.string().optional(),
	requiresImmediateCall: z.boolean().default(false),
	requiresImmediateIntervention: z.boolean().default(false),
	detectedSymptoms: z.array(z.string()).default([]),
	recommendedAction: z
		.string()
		.default(
			"Немедленный звонок администратора / дежурного врача, запись в экстренное окно с подготовкой хирургического/терапевтического кабинета",
		),
	reasoning: z.string().default("Клинический триаж по симптомам"),
	suggestedHitlDraft: z.string().optional(),
	painLevelEstimate: z.number().min(0).max(10).optional(),
});

export const WhatsAppTriageSchema = WhatsAppTriageLlmSchema;
export type TriageAnalysisResult = z.infer<typeof WhatsAppTriageLlmSchema>;
export type WhatsAppTriageResult = TriageAnalysisResult;

// ============================================================================
// INBOUND MESSAGE CONTRACTS
// ============================================================================

export interface InboundWhatsAppMessage {
	readonly messageId: string;
	readonly organizationId: string;
	readonly patientPhone: string;
	readonly patientName?: string | null | undefined;
	readonly text: string;
	readonly timestamp?: string | undefined;
}

export interface IncomingWhatsAppMessage {
	readonly messageId: string;
	readonly fromPhone: string;
	readonly rawText: string;
	readonly timestamp?: Date | string | number | undefined;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly organizationId: string;
	readonly clinicId?: string | null | undefined;
	readonly channel?: "whatsapp" | "telegram" | "sms" | "max" | "vk" | string | undefined;
	readonly mediaUrls?: string[] | undefined;
	readonly buttonPayload?: string | null | undefined;
	readonly context?:
		| {
				readonly activeDoctor?: string | null | undefined;
				readonly recentDiagnoses?: string[] | undefined;
				readonly recentTreatment?: string | null | undefined;
				readonly lastVisitDate?: string | null | undefined;
		  }
		| undefined;
}

// ============================================================================
// PROACTIVE ALERTS & CARDS
// ============================================================================

export interface ProactiveAlertAction {
	readonly id: string;
	readonly label: string;
	readonly kind: "primary" | "secondary" | "danger";
	readonly prompt?: string | undefined;
	readonly actionType?: string | undefined;
	readonly payload?: Record<string, unknown> | undefined;
}

export interface ProactiveAlertCardData {
	readonly id: string;
	readonly urgency: TriageUrgency;
	readonly title: string;
	readonly subtitle?: string | undefined;
	readonly description: string;
	readonly timestamp: string;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly category: ProactiveCardCategory;
	readonly actions: ProactiveAlertAction[];
	readonly data?: Record<string, unknown> | undefined;
	readonly metadata?: Record<string, unknown> | undefined;
}

export interface WhatsAppApprovalCardData {
	readonly approvalId: string;
	readonly organizationId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly phone: string;
	readonly intent: string;
	readonly urgency: TriageUrgency;
	readonly incomingSnippet: string;
	readonly draftReply: string;
	readonly proposedReply?: string | undefined;
	readonly channel: "whatsapp" | "telegram" | "sms" | "max" | "vk";
	readonly confidenceScore: number;
	readonly actionPrompt?: string | undefined;
	readonly createdAt: string;
	status: "pending" | "approved" | "rejected" | "sent";
	readonly category?: string | undefined;
	readonly metadata?: Record<string, unknown> | undefined;
	/** Meta WABA 24-hour service window policy compliance */
	readonly isWithin24HourWindow?: boolean | undefined;
	readonly templateRequired?: boolean | undefined;
}

// ============================================================================
// CLINICAL DOMAIN CARDS (ZTL, EMR, GAP-FILLER, RETENTION)
// ============================================================================

export interface ZtlAlertCardData {
	readonly orderId: string;
	readonly orderNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly labName: string;
	readonly prosthesisType: string;
	readonly tooth?: string | number;
	readonly status: "in_transit" | "ready" | "delayed" | "quality_check";
	readonly etaDate?: string;
	readonly warning?: string;
	readonly actionPrompt?: string;
}

export interface EmrDraftCardData {
	readonly draftId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly visitDate: string;
	readonly tooth?: string | number;
	readonly diagnosis: string;
	readonly icd10?: string;
	readonly proposedDiary: string;
	readonly actionPrompt?: string;
}

export interface GapFillerPatientOption {
	readonly id: string;
	readonly name: string;
	readonly phone: string;
	readonly reason: string;
	readonly priorityScore: number;
	readonly matchScore: number;
}

export interface GapFillerCardData {
	readonly gapId: string;
	readonly doctorName: string;
	readonly cabinet?: string;
	readonly date: string;
	readonly timeRange: string;
	readonly suggestedPatients: GapFillerPatientOption[];
	readonly actionPrompt?: string;
}

export interface RetentionSamplePatient {
	readonly id: string;
	readonly name: string;
	readonly lastVisitMonthsAgo: number;
	readonly recommendedTreatment: string;
}

export interface RetentionSummaryCardData {
	readonly summaryId: string;
	readonly cohortName: string;
	readonly atRiskCount: number;
	readonly potentialRevenueRub: number;
	readonly suggestedCampaign: string;
	readonly samplePatients: RetentionSamplePatient[];
	readonly actionPrompt?: string;
}

// ============================================================================
// EXTENDED WHATSAPP BRIDGE DTOs & INTEGRATION CONTRACTS
// ============================================================================

export type WhatsAppDeliveryStatus =
	| "pending"
	| "sent"
	| "delivered"
	| "read"
	| "failed";

export interface WhatsAppMessageDto {
	readonly id: string;
	readonly organizationId: string;
	readonly recipientPhoneE164: string;
	readonly text: string;
	readonly status: WhatsAppDeliveryStatus;
	readonly sentAt?: string;
	readonly deliveredAt?: string;
	readonly readAt?: string;
	readonly failureReason?: string;
	readonly providerMessageId?: string;
}

export interface WhatsAppRateLimitState {
	readonly organizationId: string;
	readonly lastSentTimestamp: number;
	readonly messagesSentLastHour: number;
	readonly messagesSentToday: number;
	readonly cooldownUntil?: number;
}

export interface PatientContextResolved {
	readonly patientId: string;
	readonly patientName: string;
	readonly phoneE164: string;
	readonly activeDoctor?: string | null;
	readonly recentDiagnoses?: string[];
	readonly lastVisitDate?: string | null;
	readonly isExistingPatient: boolean;
}
