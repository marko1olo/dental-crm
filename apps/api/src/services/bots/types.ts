/**
 * Types and contracts for the High-Density Omnichannel Bot Engine.
 * Supports Telegram, VK Community, WhatsApp (Cloud API & Green-API), and Max.
 */

export type BotChannel = "telegram" | "vk" | "whatsapp" | "max";

export type BotButton = {
	text: string;
	callbackData?: string;
	url?: string;
};

export type BotKeyboard = {
	buttons: BotButton[][];
	inline?: boolean;
};

export type BotInboundMessage = {
	channel: BotChannel;
	organizationId: string;
	clinicId?: string | null;
	botConfigId: string;
	senderId: string; // phone number, telegram chat_id, or vk user_id
	senderName?: string | null;
	messageId?: string | null;
	text: string;
	payload?: string | null; // callback data or button payload
	timestamp: number;
	rawEvent?: Record<string, unknown>;
};

export type BotReply = {
	text: string;
	keyboard?: BotKeyboard;
	actionExecuted?: string;
	metadata?: Record<string, unknown>;
};

export interface BotPlugin {
	readonly name: string;
	readonly description: string;
	canHandle(msg: BotInboundMessage): Promise<boolean> | boolean;
	handle(msg: BotInboundMessage, botRuntime: OmnichannelBotRuntime): Promise<BotReply | null>;
}

export type OmnichannelBotRuntime = {
	botId: string; // `${channel}:${organizationId}:${botConfigId}`
	channel: BotChannel;
	organizationId: string;
	clinicId?: string | null;
	botConfigId: string;
	tokenHash: string;
	secretToken?: string | null;
	isActive: boolean;
	enabledPlugins: string[];
	registeredAt: Date;
	lastActiveAt: Date | null;
	lastError: string | null;
	metadata: Record<string, unknown>;
	metrics: {
		totalMessages: number;
		successMessages: number;
		failedMessages: number;
		rateLimitedMessages: number;
		avgLatencyMs: number;
		lastLatencyMs: number;
	};
};

export type BotConfigDto = {
	id?: string;
	organizationId: string;
	clinicId?: string | null;
	botConfigId?: string;
	channel: BotChannel;
	token?: string; // Raw or encrypted token
	secretKey?: string; // VK secret_key or Telegram secret token
	confirmationCode?: string; // VK Callback API confirmation string
	groupId?: string; // VK Community ID
	phoneNumberId?: string; // WhatsApp Cloud API
	greenApiInstanceId?: string; // WhatsApp Green-API
	greenApiToken?: string; // WhatsApp Green-API
	provider?: "cloud_api" | "green_api";
	maxBotId?: string; // Max messenger
	isActive: boolean;
	enabledPlugins?: string[];
	metadata?: Record<string, unknown>;
};
