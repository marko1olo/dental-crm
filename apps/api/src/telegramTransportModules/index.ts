/**
 * @file index.ts
 * @description Master barrel export for telegramTransportModules.
 */

export type {
	TelegramTransportResult,
	SendTelegramTextMessageInput,
	SendTelegramPhotoMessageInput,
	TelegramTransportFailure,
	AnswerTelegramCallbackQueryInput,
	EditTelegramMessageTextInput,
	EditTelegramMessageReplyMarkupInput,
	GetTelegramFileInput,
	TelegramFileInfoResult,
	DownloadTelegramFileInput,
	DownloadTelegramFileResult,
	SendVisitReminderNotificationInput,
	SendVisitCancellationNotificationInput,
	SendVisitConfirmationReceiptInput,
} from "./types.js";

export {
	getTelegramFile,
	downloadTelegramFile,
} from "./httpClient.js";

export {
	buildVisitReminderText,
	buildSignedAppointmentCallbackData,
	buildVisitReminderInlineKeyboard,
	answerTelegramCallbackQuery,
} from "./callbackHandler.js";

export {
	sendTelegramTextMessage,
	sendTelegramPhotoMessage,
	editTelegramMessageText,
	editTelegramMessageReplyMarkup,
	sendVisitReminderNotification,
	sendVisitCancellationNotification,
	sendVisitConfirmationReceipt,
} from "./messageSender.js";
