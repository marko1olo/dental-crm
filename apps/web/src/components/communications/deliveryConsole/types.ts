/**
 * types.ts — Layer 0: Типы данных консоли отправки сообщений
 */

export type ChannelCode = "sms" | "email" | "whatsapp" | "telegram" | "vk" | "max";

export type GatewayStatus = {
	channels: {
		sms: {
			configured: boolean;
			provider: string | null;
			sender: string | null;
			balance: { amount: number; currency: string } | null;
			balanceError: string | null;
		};
		email: {
			configured: boolean;
			host: string | null;
			from: string | null;
			requireTls: boolean;
		};
		whatsapp: { configured: boolean };
		telegram: { configured: boolean };
		vk: { configured: boolean; detail: string };
		max: { configured: boolean; detail: string };
	};
	/** Разбирает ли кто-нибудь очередь и сколько в ней просроченных сообщений. */
	automaticSending: {
		enabled: boolean;
		intervalSeconds: number | null;
		batchSize: number | null;
		detail: string;
		enableWith: string;
		waiting: number;
		oldestWaitingAt: string | null;
	};
	deliverableChannels: string[];
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
	initialGateways?: GatewayStatus | null;
	initialUisQuota?: {
		remaining: number;
		smsQuotaLimit: number;
	} | null;
	initialEnqueueChannel?: "sms" | "email" | "whatsapp" | "telegram";
}
