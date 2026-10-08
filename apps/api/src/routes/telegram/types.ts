import type {
	DenteTelegramBotSettings,
	DenteTelegramUpdateKind,
	TelegramTransportResult,
	SendTelegramPhotoMessageInput,
	DenteTelegramOutboxItem,
	DenteTelegramTemplateKind,
	DenteTelegramOutboxDeliveryStatus,
	DenteTelegramOutboxSendRequest,
	DenteTelegramVisualCardUrls,
	DenteTelegramPostVisitCheckupDelayHoursByTopic,
} from "@dental/shared";
import type { DomainState, createDenteTelegramCareRequest } from "../../services/telegram/telegramLegacyMemoryStore.js";

// Constants
export const telegramPhotoSentTextFailedBlockedReason =
	"telegram_photo_sent_text_failed";
export const telegramOutboxScheduleUnreadableBlockedReason =
	"telegram_outbox_schedule_unreadable";

export type UnknownRecord = Record<string, unknown>;

export type TelegramInlineKeyboardButton = {
	text: string;
	url?: string;
	callback_data?: string;
};
export type TelegramInlineKeyboardRow = TelegramInlineKeyboardButton[];

export type TelegramRouteBodySchema<T> = {
	parse(value: unknown): T;
};
export type TelegramRouteBodyParseResult<T> =
	| { ok: true; value: T }
	| { ok: false; message: string };

export type TelegramChatInfo = {
	id: string;
	type: string | null;
};

export type TelegramSafeCallbackAction =
	| "dente:start"
	| "dente:help"
	| "dente:clinic"
	| "dente:privacy"
	| "dente:schedule"
	| "dente:documents"
	| "dente:tax"
	| "dente:billing"
	| "dente:medical-docs"
	| "dente:patient-forms"
	| "dente:care"
	| "dente:care-extraction"
	| "dente:care-implant"
	| "dente:care-filling"
	| "dente:care-endo"
	| "dente:care-surgery"
	| "dente:care-anesthesia"
	| "dente:care-hygiene"
	| "dente:care-prosthetics"
	| "dente:care-orthodontics"
	| "dente:care-periodontology"
	| "dente:contact"
	| "dente:review"
	| "dente:map";

export type TelegramWebhookReplyPackage = {
	text: string | null;
	replyMarkup: Record<string, unknown> | null;
	photoUrl?: string | null;
};

export type TelegramRequestScope = {
	organizationId?: string | null;
	clinicId?: string | null;
	botConfigId?: string | null;
	state?: DomainState;
};

export type DenteTelegramCareRequestTopic = Parameters<
	typeof createDenteTelegramCareRequest
>[1];

export type TelegramRuntimeContext = {
	settings: DenteTelegramBotSettings;
	organizationId: string;
	clinicId: string;
	botConfigId: string;
	botUsername: string | null;
	botToken: string | null;
	webhookSecret: string | null;
	tokenConfigured: boolean;
	webhookSecretConfigured: boolean;
	webhookReady: boolean;
	clinicOwnedBotReady: boolean;
};

export type TelegramClinicBotEnvConfig = {
	organizationId: string | null;
	clinicId: string | null;
	botConfigId: string | null;
	enabled: boolean;
	botUsername: string | null;
	botToken: string | null;
	webhookSecret: string | null;
	patientPortalBaseUrl: string | null;
	clinicPublicPhone: string | null;
	clinicAddress: string | null;
	clinicWebsiteUrl: string | null;
	clinicYandexMapsUrl: string | null;
	clinicTwoGisUrl: string | null;
	visualCardUrls: DenteTelegramVisualCardUrls | null;
	postVisitCheckupDelayHours: DenteTelegramPostVisitCheckupDelayHoursByTopic | null;
	reviewRequestDelayHours: number | null;
};

export type TelegramRuntimeSettingsResolution = {
	settings: DenteTelegramBotSettings;
	envConfig: TelegramClinicBotEnvConfig | null;
};

export type TelegramLinkCodeRejection = {
	status: "invalid_code" | "crypto_unavailable";
	message: string;
};

export type TelegramMessagePreviewRejectionReason =
	| "patient_not_found"
	| "appointment_not_found"
	| "document_not_found"
	| "task_not_found"
	| "chat_link_not_found"
	| "preview_unavailable";

export const telegramLinkCodeEncryptionMissingMessage =
	"Шифрование связок Telegram-чатов не настроено в окружении сервера. Код привязки не может быть безопасно создан.";
export const telegramLinkCodeScopeInvalidMessage =
	"Код привязки Telegram требует корректный идентификатор пациента или сотрудника.";
export const telegramPreviewPatientNotFoundMessage =
	"Пациент для предпросмотра Telegram-сообщения не найден.";
export const telegramPreviewAppointmentNotFoundMessage =
	"Запись на прием для предпросмотра Telegram-сообщения не найдена.";
export const telegramPreviewDocumentNotFoundMessage =
	"Медицинский документ для предпросмотра Telegram-сообщения не найден.";
export const telegramPreviewTaskNotFoundMessage =
	"Задача коммуникации для предпросмотра Telegram-сообщения не найдена.";
export const telegramPreviewUnavailableMessage =
	"Шаблон предпросмотра Telegram-сообщения недоступен для выбранных параметров.";
export const telegramChatLinkNotFoundMessage =
	"Активная связка Telegram-чата для предпросмотра не найдена.";

export type TelegramOutboxSendExecutionResult = {
	status: DenteTelegramOutboxDeliveryStatus;
	receipts: unknown[];
};

export type TelegramOutboxSendDueInput = {
	organizationId?: string | null;
	clinicId?: string | null;
	botConfigId?: string | null;
	limit?: number;
};

export type TelegramDueWorkerLogger = {
	info?: (payload: Record<string, unknown>, message?: string) => void;
	warn?: (payload: Record<string, unknown>, message?: string) => void;
	error?: (payload: Record<string, unknown>, message?: string) => void;
};

export type DenteTelegramOutboxDueWorkerHandle = {
	stop: () => void;
	isRunning: () => boolean;
};

export type TelegramOutboxScheduleState = "due" | "not_due" | "unreadable";

export type TelegramOutboxDeliveredParts = {
	readonly photoDelivered: boolean;
	readonly photoMessageId: number | null;
};

export type TelegramOutboxTransportSenders = {
	readonly sendPhoto: (
		input: SendTelegramPhotoMessageInput,
	) => Promise<TelegramTransportResult>;
	readonly sendText: (
		input: {
			botToken: string;
			chatId: string;
			text: string;
			replyMarkup?: Record<string, unknown> | null;
			timeoutMs?: number;
		},
	) => Promise<TelegramTransportResult>;
};

export type TelegramOutboxPartDeliveryInput = {
	readonly item: DenteTelegramOutboxItem;
	readonly botToken: string;
	readonly alreadyDelivered?: TelegramOutboxDeliveredParts;
	readonly senders?: TelegramOutboxTransportSenders;
	readonly timeoutMs?: number;
};

export type TelegramOutboxPartDeliveryOutcome = {
	readonly photoResult: TelegramTransportResult | null;
	readonly textResult: TelegramTransportResult | null;
	readonly deliveredParts: TelegramOutboxDeliveredParts;
};

export type TelegramResolvedOutboxRuntime = {
	organizationId: string;
	clinicId: string;
	botConfigId: string;
	botToken: string | null;
};

export type TelegramPortalSection =
	| "home"
	| "documents"
	| "tax"
	| "billing"
	| "schedule"
	| "medical-docs"
	| "patient-forms";
