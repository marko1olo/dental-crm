import type { TriageUrgency } from "./proactiveHitLTypes";

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
