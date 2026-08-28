/**
 * omnichannelTypes.ts — Типы и контракты омниканального центра сообщений (WhatsApp, Telegram, SMS),
 * дашборда NPS/лояльности и динамических платежей СБП (НСПК / ГОСТ Р 56042-2014).
 */

export type OmnichannelChannel = "whatsapp" | "telegram" | "sms";
export type OmnichannelChannelFilter = OmnichannelChannel | "all";

export type MessageDirection = "inbound" | "outbound";
export type MessageSenderType = "patient" | "clinic_staff" | "automated_bot";
export type MessageDeliveryStatus =
	| "queued"
	| "sending"
	| "sent"
	| "delivered"
	| "read"
	| "failed";

export type TemplateCategory =
	| "visit_reminder"
	| "appointment_confirmation"
	| "treatment_plan"
	| "nps_survey"
	| "sbp_payment"
	| "custom";

export interface InteractiveButtonPayload {
	readonly id: string;
	readonly title: string;
	readonly action?: string | undefined;
	readonly variant?: "primary" | "secondary" | "danger" | undefined;
}

export interface MessageAttachment {
	readonly id: string;
	readonly name: string;
	readonly type: "image" | "pdf" | "qr_code" | "document";
	readonly url: string;
	readonly sizeFormatted?: string | undefined;
}

export interface OmnichannelMessage {
	readonly id: string;
	readonly patientId: string;
	readonly channel: OmnichannelChannel;
	readonly direction: MessageDirection;
	readonly senderName: string;
	readonly senderType: MessageSenderType;
	readonly timestamp: string;
	readonly body: string;
	readonly status: MessageDeliveryStatus;
	readonly templateCategory?: TemplateCategory | undefined;
	readonly interactivePayload?: {
		readonly buttons?: readonly InteractiveButtonPayload[] | undefined;
		readonly paymentUrl?: string | undefined;
		readonly paymentAmountRub?: number | undefined;
		readonly paymentQrPayload?: string | undefined;
		readonly treatmentPlanTeeth?: readonly number[] | undefined;
		readonly npsScore?: number | undefined;
		readonly appointmentStatus?: "confirmed" | "reschedule_requested" | "cancelled" | undefined;
	} | undefined;
	readonly attachments?: readonly MessageAttachment[] | undefined;
}

export interface PatientNextAppointment {
	readonly date: string;
	readonly time: string;
	readonly doctorName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly cabinet?: string | undefined;
	readonly reason?: string | undefined;
	readonly address?: string | undefined;
}

export interface PatientActiveTreatmentPlan {
	readonly id: string;
	readonly title: string;
	readonly teethFdi: readonly number[];
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly pdfUrl?: string | undefined;
	readonly stagesCount?: number | undefined;
}

export interface PatientOmnichannelContact {
	readonly id: string;
	readonly fullName: string;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly preferredChannel: OmnichannelChannel;
	readonly telegramUsername?: string | undefined;
	readonly telegramChatId?: string | undefined;
	readonly whatsappNumber?: string | undefined;
	readonly avatarColor?: string | undefined;
	readonly nextAppointment?: PatientNextAppointment | undefined;
	readonly activeTreatmentPlan?: PatientActiveTreatmentPlan | undefined;
	readonly unreadCount: number;
	readonly lastActivity: string;
	readonly lastMessageSnippet?: string | undefined;
}

export interface OmnichannelTemplate {
	readonly id: string;
	readonly name: string;
	readonly category: TemplateCategory;
	readonly channel: OmnichannelChannelFilter;
	readonly title: string;
	readonly description: string;
	readonly templateText: string;
	readonly interactiveButtons?: readonly InteractiveButtonPayload[] | undefined;
	readonly variables: readonly string[];
}

export type NpsCategory = "promoter" | "neutral" | "detractor";
export type NpsUrgency = "critical" | "high" | "medium" | "low";
export type NpsReviewStatus = "pending" | "in_progress" | "resolved" | "thanked";

export interface NpsReview {
	readonly id: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly phone: string;
	readonly score: number; // 0..10
	readonly category: NpsCategory;
	readonly urgency: NpsUrgency;
	readonly comment: string;
	readonly doctorName: string;
	readonly serviceName: string;
	readonly createdAt: string;
	readonly status: NpsReviewStatus;
	readonly resolutionNote?: string | undefined;
	readonly resolvedBy?: string | undefined;
}

export interface NpsMetrics {
	readonly totalReviews: number;
	readonly npsScore: number; // -100 to +100
	readonly promotersCount: number;
	readonly promotersPct: number;
	readonly neutralsCount: number;
	readonly neutralsPct: number;
	readonly detractorsCount: number;
	readonly detractorsPct: number;
	readonly averageScore: number;
	readonly criticalPendingCount: number;
}

export type SbpPaymentStatus =
	| "awaiting_scan"
	| "scanned"
	| "paid_success"
	| "expired"
	| "failed";

export interface SbpPaymentInvoice {
	readonly orderId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly phone: string;
	readonly sumRub: number;
	readonly sumKopecks: number;
	readonly purpose: string;
	readonly clinicName: string;
	readonly familyDepositOffsetRub?: number | undefined;
	readonly totalInvoiceRub?: number | undefined;
}
