export interface TelegramIntegrationHubProps {
	clinicId?: string | undefined;
	userId?: string | undefined;
	onBotStatusChange?: ((status: unknown) => void) | undefined;
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
	lastCheckedAt?: string | undefined;
}

export interface TelegramBotStatus {
	configured: boolean;
	bot?: TelegramBotInfo | undefined;
}

export type BotStatus = TelegramBotStatus;

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
	account?: TelegramAccountInfo | undefined;
}

export interface TelegramQrData {
	token: string;
	svg: string;
	expiresAt: string;
}

export type TelegramMainTab = "bot" | "account" | "templates" | "queue" | "studio";
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
	recipientPhone?: string | undefined;
	recipientChatId?: string | number | undefined;
	templateCode?: string | undefined;
	messageText: string;
	status: "queued" | "sending" | "sent" | "failed" | "cancelled";
	attempts: number;
	maxAttempts: number;
	lastAttemptAt?: string | undefined;
	errorReason?: string | undefined;
	createdAt: string;
}

export interface StaffTelegramBinding {
	staffId: string;
	staffName: string;
	role: string;
	telegramUsername?: string | undefined;
	telegramChatId?: string | number | undefined;
	status: "linked" | "pending" | "unlinked";
	deepLinkUrl?: string | undefined;
	linkedAt?: string | undefined;
}

export interface BotConfigurationCardProps {
	clinicId?: string | undefined;
	botStatus: TelegramBotStatus | null;
	isBotLoading: boolean;
	onRefreshStatus: () => Promise<void> | void;
	onBotStatusChange?: ((status: unknown) => void) | undefined;
}

export interface StaffBindingCardProps {
	clinicId?: string | undefined;
	userId?: string | undefined;
	accountStatus: TelegramAccountStatus | null;
	isAccountLoading: boolean;
	onRefreshStatus: () => Promise<void> | void;
	onAccountStatusChange?: ((status: unknown) => void) | undefined;
}
