export interface TelegramIntegrationHubProps {
	clinicId?: string;
	userId?: string;
	onBotStatusChange?: (status: unknown) => void;
}

export interface TelegramBotInfo {
	id: number;
	username: string;
	firstName: string;
	canJoinGroups: boolean;
	canReadAllGroupMessages: boolean;
	supportsInlineQueries: boolean;
	tokenMasked: string;
	webhookActive: boolean;
	lastCheckedAt?: string;
}

export interface TelegramBotStatus {
	configured: boolean;
	bot?: TelegramBotInfo;
}

export interface TelegramAccountInfo {
	id: string;
	phone: string;
	firstName: string | null;
	lastName: string | null;
	username: string | null;
	avatarUrl: string | null;
	status: string;
	is2faEnabled: boolean;
	connectedAt: string | null;
	lastActiveAt: string | null;
}

export interface TelegramAccountStatus {
	connected: boolean;
	account?: TelegramAccountInfo;
}

export interface TelegramQrData {
	token: string;
	svg: string;
	expiresAt: string;
}

export type TelegramMainTab = "bot" | "account" | "templates" | "queue";
export type TelegramAccountAuthMode = "phone" | "qr";

export interface TelegramNotificationTemplate {
	id: string;
	code: string;
	name: string;
	description: string;
	category: "appointment" | "birthday" | "recall" | "billing" | "review";
	templateText: string;
	variables: string[];
	isActive: boolean;
	channel: "bot" | "account" | "both";
}

export interface TelegramDeliveryQueueItem {
	id: string;
	recipientName: string;
	recipientPhone?: string;
	recipientChatId?: string | number;
	templateCode?: string;
	messageText: string;
	status: "queued" | "sending" | "sent" | "failed" | "cancelled";
	attempts: number;
	maxAttempts: number;
	lastAttemptAt?: string;
	errorReason?: string;
	createdAt: string;
}

export interface StaffTelegramBinding {
	staffId: string;
	staffName: string;
	role: string;
	telegramUsername?: string;
	telegramChatId?: string | number;
	status: "linked" | "pending" | "unlinked";
	deepLinkUrl?: string;
	linkedAt?: string;
}

export interface BotConfigurationCardProps {
	clinicId?: string;
	botStatus: TelegramBotStatus | null;
	isBotLoading: boolean;
	onRefreshStatus: () => Promise<void> | void;
	onBotStatusChange?: (status: unknown) => void;
}

export interface StaffBindingCardProps {
	clinicId?: string;
	userId?: string;
	accountStatus: TelegramAccountStatus | null;
	isAccountLoading: boolean;
	onRefreshStatus: () => Promise<void> | void;
	onAccountStatusChange?: (status: unknown) => void;
}
