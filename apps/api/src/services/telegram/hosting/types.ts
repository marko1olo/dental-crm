import type {
	IntercomAckType,
	StaffChatMessage,
	TelegramBotPresetId,
	TelegramBotPresetMetadata,
} from "@dental/shared";

/**
 * Результат проверки бота через getMe
 */
export type TelegramBotMeResult = {
	ok: boolean;
	id?: number;
	username?: string;
	firstName?: string;
	canJoinGroups?: boolean;
	canReadAllGroupMessages?: boolean;
	supportsInlineQueries?: boolean;
	error?: string;
};

/**
 * Результат получения информации о вебхуке через getWebhookInfo
 */
export type TelegramWebhookInfoResult = {
	ok: boolean;
	url?: string;
	hasCustomCertificate?: boolean;
	pendingUpdateCount?: number;
	lastErrorDate?: number;
	lastErrorMessage?: string;
	maxConnections?: number;
	error?: string;
};

/**
 * Элемент команды меню Telegram Bot
 */
export type TelegramBotCommandItem = {
	command: string;
	description: string;
};

/**
 * Стандартный каталог команд для бота пациента
 */
export const DEFAULT_PATIENT_BOT_COMMANDS: TelegramBotCommandItem[] = [
	{ command: "start", description: "Главное меню и привязка к клинике" },
	{ command: "schedule", description: "Мои записи и статус визита" },
	{ command: "care", description: "Памятки после стоматологического лечения" },
	{ command: "documents", description: "Справка в ФНС и портал документов" },
	{ command: "contact", description: "Связаться с администратором клиники" },
	{ command: "help", description: "Справка и безопасные действия" },
];

/**
 * Каталог специализированных команд для бота персонала
 */
export const DEFAULT_STAFF_BOT_COMMANDS: TelegramBotCommandItem[] = [
	{ command: "start", description: "Рабочий профиль сотрудника" },
	{ command: "schedule", description: "Мое расписание приёмов на сегодня" },
	{ command: "tomorrow", description: "Расписание приёмов на завтра" },
	{ command: "intercom", description: "Каналы экстренной связи клиники" },
	{ command: "help", description: "Справка по рабочим командам" },
];

/**
 * Статусы рантайма Telegram-бота в пуле хостинга
 */
export type BotRuntimeStatus =
	| "starting"
	| "running"
	| "polling"
	| "webhook"
	| "stopped"
	| "error"
	| "rate_limited";

/**
 * Модель активного инстанса бота в реестре хостинга
 */
export type BotInstance = {
	organizationId: string;
	clinicId?: string | null;
	botConfigId: string;
	botToken: string;
	botUsername?: string;
	mode: "clinic_owned_bot" | "shared_bot" | "disabled";
	status: BotRuntimeStatus;
	webhookUrl?: string | null;
	lastHealthCheck?: Date;
	error?: string | null;
	pendingUpdates?: number;
	startedAt: Date;
};

/**
 * Метрики пула ботов клиник
 */
export type BotPoolMetrics = {
	totalInstances: number;
	activeInstances: number;
	pollingInstances: number;
	webhookInstances: number;
	errorInstances: number;
	rateLimitedInstances: number;
};

/**
 * Конфигурация rate limiter для Telegram Bot API
 */
export type RateLimitConfig = {
	maxMessagesPerSecond: number;
	maxMessagesPerChatPerSecond: number;
	burstWindowMs: number;
	retryAfterSafetyMarginMs: number;
};

/**
 * Состояние лимитов для конкретного чата / бота
 */
export type RateLimitStatus = {
	allowed: boolean;
	retryAfterMs: number;
	currentQueueLength: number;
};

/**
 * Параметры настройки вебхука
 */
export type SetupWebhookParams = {
	botToken: string;
	webhookUrl: string;
	secretToken?: string | null;
	maxConnections?: number;
	timeoutMs?: number;
};

export type SetupWebhookResult = {
	ok: boolean;
	description?: string;
};

/**
 * Параметры применения пресета бота
 */
export type ApplyPresetParams = {
	organizationId: string;
	presetId: TelegramBotPresetId;
	botToken: string;
	webhookUrl?: string | null;
	secretToken?: string | null;
};

export type ApplyPresetResult = {
	ok: boolean;
	botUsername?: string | undefined;
	preset: TelegramBotPresetMetadata;
	commandsConfigured: boolean;
	descriptionConfigured: boolean;
	shortDescriptionConfigured: boolean;
	webhookConfigured: boolean;
	error?: string | undefined;
};

/**
 * Параметры диспатчинга интерком-вызова сотрудникам
 */
export type DispatchIntercomParams = {
	organizationId: string;
	messageId: string;
	senderName: string;
	content: string;
	urgency: string;
	intercomPreset?: string | null;
	targetAudience?: string | null;
	botTokenOverride?: string | null;
};

export type DispatchIntercomResult = {
	notifiedCount: number;
	errors: string[];
};

/**
 * Параметры обработки подтверждения интеркома
 */
export type HandleIntercomAckParams = {
	organizationId: string;
	callbackData: string;
	chatFingerprint: string;
	botToken?: string | null;
	callbackQueryId?: string | null;
};

export type HandleIntercomAckResult = {
	handled: boolean;
	ok: boolean;
	responseText: string;
	ackType?: IntercomAckType;
	updatedMessage?: StaffChatMessage | null;
};

/**
 * Параметры построения расписания сотрудника
 */
export type BuildScheduleParams = {
	organizationId: string;
	staffUserId: string;
	dayOffset?: number;
};

export type BuildScheduleResult = {
	text: string;
	appointmentCount: number;
};

/**
 * Клиническая памятка
 */
export type ClinicalCareInstruction = {
	title: string;
	text: string;
};

/**
 * Параметры подключения бота
 */
export type ConnectBotParams = {
	organizationId: string;
	botToken: string;
	webhookBaseUrl?: string | null | undefined;
	clinicId?: string | null | undefined;
	botConfigId?: string | undefined;
};

export type ConnectBotResult = {
	ok: boolean;
	bot?: {
		username: string;
		firstName: string;
		maskedToken: string;
		mode: string;
		webhookReady: boolean;
	};
	error?: string;
};

/**
 * Параметры получения статуса бота
 */
export type GetBotStatusParams = {
	organizationId: string;
	botConfigId?: string | undefined;
};

export type GetBotStatusResult = {
	ok: boolean;
	connected: boolean;
	bot: {
		username: string | null;
		firstName: string | null;
		maskedToken: string | null;
		mode: string;
		webhookReady: boolean;
	} | null;
};

/**
 * Параметры отключения бота
 */
export type DisconnectBotParams = {
	organizationId: string;
	botConfigId?: string | undefined;
};

export type DisconnectBotResult = {
	ok: boolean;
};

/**
 * Параметры тестирования подключения бота
 */
export type TestBotConnectionParams = {
	organizationId: string;
	botToken?: string | null | undefined;
	botConfigId?: string | undefined;
};

export type TestBotConnectionResult = {
	ok: boolean;
	bot?: TelegramBotMeResult;
	webhook?: TelegramWebhookInfoResult;
	error?: string;
};
