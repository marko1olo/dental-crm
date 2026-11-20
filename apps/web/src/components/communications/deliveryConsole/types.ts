/**
 * types.ts — Layer 0: Типы данных консоли отправки сообщений
 */

export type ChannelCode = "sms" | "email" | "whatsapp" | "telegram" | "vk" | "max";

export type GatewayChannelInfo = {
	configured: boolean;
	provider?: string | null | undefined;
	sender?: string | null | undefined;
	balance?: { amount: number; currency: string } | null | undefined;
	balanceError?: string | null | undefined;
	host?: string | null | undefined;
	from?: string | null | undefined;
	requireTls?: boolean | undefined;
	detail?: string | undefined;
};

export type GatewayStatus = {
	channels?: {
		sms?: GatewayChannelInfo | undefined;
		email?: GatewayChannelInfo | undefined;
		whatsapp?: GatewayChannelInfo | undefined;
		telegram?: GatewayChannelInfo | undefined;
		vk?: GatewayChannelInfo | undefined;
		max?: GatewayChannelInfo | undefined;
		[channel: string]: GatewayChannelInfo | undefined;
	} | undefined;
	/** Разбирает ли кто-нибудь очередь и сколько в ней просроченных сообщений. */
	automaticSending?: {
		enabled: boolean;
		intervalSeconds?: number | null | undefined;
		batchSize?: number | null | undefined;
		detail?: string | undefined;
		enableWith?: string | undefined;
		waiting: number;
		oldestWaitingAt?: string | null | undefined;
	} | undefined;
	deliverableChannels?: string[] | undefined;
	overallReady?: boolean | undefined;
};

export type TemplateItem = {
	id: string;
	title: string;
	channel: string;
	intent: string;
	body: string;
	variables: string[];
	isActive: boolean;
};

/** Справочник подстановок из GET /api/communications/variables */
export type TemplateVariable = {
	key: string;
	label: string;
	example: string;
	phi: boolean;
};

export type OutboxItem = {
	id: string;
	channel: string;
	intent: string;
	status: string;
	recipientAddress: string;
	body: string;
	attempts: number;
	maxAttempts: number;
	sentAt: string | null;
	createdAt: string;
	nextAttemptAt: string;
	lastErrorClass: string | null;
	lastErrorMessage: string | null;
};

export type CommunicationSettings = {
	timezone: string;
	quietHoursStartMinute: number;
	quietHoursEndMinute: number;
	deferServiceInQuietHours: boolean;
	blockMarketingInQuietHours: boolean;
	dailyLimitPerPatient: number;
	channelFallback: string[];
	appointmentReminderEnabled: boolean;
	appointmentReminderLeadHours: number[];
	appointmentReminderWindowMinutes: number;
};

export type PreviewResult = {
	text: string;
	fits: boolean;
	problems: string[];
	length: number;
	limit: number;
	sms: {
		encoding: string;
		characters: number;
		segments: number;
		charactersLeftInSegment: number;
	} | null;
};

export interface MessageDeliveryConsoleProps {
	initialGateways?: GatewayStatus | null | undefined;
	initialUisQuota?: {
		remaining: number;
		smsQuotaLimit: number;
	} | null | undefined;
	initialEnqueueChannel?: "sms" | "email" | "whatsapp" | "telegram" | undefined;
}

export interface DeliveryCommQueries {
	getGatewayStatus?: (() => Promise<Response>) | undefined;
	getTemplates?: (() => Promise<Response>) | undefined;
	getOutbox?: ((query?: string) => Promise<Response>) | undefined;
	getSettings?: (() => Promise<Response>) | undefined;
	getVariables?: (() => Promise<Response>) | undefined;
	getChatQuota?: (() => Promise<Response>) | undefined;
	addOutboxMessage?: ((payload: Record<string, unknown>) => Promise<Response>) | undefined;
	outboxAction?: ((outboxId: string, action: string) => Promise<Response>) | undefined;
	dispatchOutbox?: (() => Promise<Response>) | undefined;
	runReminders?: (() => Promise<Response>) | undefined;
	saveSettings?: ((payload: Partial<CommunicationSettings>) => Promise<Response>) | undefined;
	previewTemplate?: ((templateId: string | null, payload: { body: string; channel: string; allowPhi?: boolean }) => Promise<Response>) | undefined;
	updateTemplate?: ((editingId: string, payload: { title: string; channel: string; intent: string; body: string; allowPhi?: boolean }) => Promise<Response>) | undefined;
	createTemplate?: ((payload: { title: string; channel: string; intent: string; body: string; allowPhi?: boolean }) => Promise<Response>) | undefined;
}
