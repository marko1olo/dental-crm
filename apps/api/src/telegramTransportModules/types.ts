/**
 * @file types.ts
 * @description Type definitions for Telegram Transport Layer (152-ФЗ / 323-ФЗ compliant).
 */

export type TelegramTransportResult =
	| {
			ok: true;
			telegramMessageId: number | null;
			retryAfterSeconds: null;
			errorCode: null;
			errorClass: null;
	  }
	| {
			ok: false;
			telegramMessageId: null;
			retryAfterSeconds: number | null;
			errorCode: number | null;
			errorClass:
				| "medical_secrecy_violation"
				| "rate_limited"
				| "auth"
				| "chat_blocked"
				| "bad_request"
				| "timeout"
				| "network"
				| "server"
				| "unknown";
			details?: string;
	  };

export type SendTelegramTextMessageInput = {
	botToken: string;
	chatId: string;
	text: string;
	replyMarkup?: Record<string, unknown> | null | undefined;
	timeoutMs?: number | undefined;
};

export type SendTelegramPhotoMessageInput = {
	botToken: string;
	chatId: string;
	photoUrl: string;
	caption: string;
	replyMarkup?: Record<string, unknown> | null | undefined;
	timeoutMs?: number | undefined;
};

export type TelegramTransportFailure = Extract<
	TelegramTransportResult,
	{ ok: false }
>;

export type TelegramTransportErrorClass = TelegramTransportFailure["errorClass"];

export type AnswerTelegramCallbackQueryInput = {
	botToken: string;
	callbackQueryId: string;
	text?: string | null | undefined;
	timeoutMs?: number | undefined;
};

export type EditTelegramMessageTextInput = {
	botToken: string;
	chatId: string;
	messageId: number;
	text: string;
	replyMarkup?: Record<string, unknown> | null | undefined;
	timeoutMs?: number | undefined;
};

export type EditTelegramMessageReplyMarkupInput = {
	botToken: string;
	chatId: string;
	messageId: number;
	replyMarkup?: Record<string, unknown> | null | undefined;
	timeoutMs?: number | undefined;
};

export type GetTelegramFileInput = {
	botToken: string;
	fileId: string;
	timeoutMs?: number | undefined;
};

export type TelegramFileInfoResult =
	| {
			ok: true;
			fileId: string;
			fileUniqueId: string;
			fileSize?: number | undefined;
			filePath: string;
	  }
	| {
			ok: false;
			error: string;
	  };

export type DownloadTelegramFileInput = {
	botToken: string;
	filePath: string;
	timeoutMs?: number | undefined;
};

export type DownloadTelegramFileResult =
	| {
			ok: true;
			buffer: Buffer;
			contentType?: string | undefined;
	  }
	| {
			ok: false;
			error: string;
	  };

export type SendVisitReminderNotificationInput = {
	botToken: string;
	chatId: string;
	organizationId: string;
	clinicName: string;
	appointmentId: string;
	appointmentStartsAt: string; // ISO date-time or formatted string
	patientFullName?: string | null;
	doctorName?: string | null;
	clinicAddress?: string | null;
	clinicPhone?: string | null;
	clinicId?: string | null;
	botConfigId?: string | null;
	callbackSecret?: string | null;
	timeoutMs?: number;
	replyMarkup?: Record<string, unknown> | null;
};

export type SendVisitCancellationNotificationInput = {
	botToken: string;
	chatId: string;
	organizationId: string;
	clinicName: string;
	appointmentStartsAt: string;
	clinicPhone?: string | null;
	timeoutMs?: number;
};

export type SendVisitConfirmationReceiptInput = {
	botToken: string;
	chatId: string;
	organizationId: string;
	clinicName: string;
	appointmentStartsAt: string;
	clinicPhone?: string | null;
	timeoutMs?: number;
};
