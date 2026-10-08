import { createHash } from "node:crypto";
import type { FastifyReply } from "fastify";
import { z } from "zod";
import type {
	DenteTelegramTemplateKind,
	DenteTelegramOutboxDeliveryStatus,
} from "@dental/shared";
import type {
	BuildDenteTelegramChatLinkListOptions,
	BuildDenteTelegramLinkCodeListOptions,
	BuildDenteTelegramOutboxOptions,
	DenteTelegramChatLinkListStatusFilter,
	DenteTelegramLinkCodeListStatusFilter,
	DenteTelegramOutboxRuntimeScope,
	DenteTelegramOutboxStatusFilter,
} from "../../services/telegram/telegramLegacyMemoryStore.js";
import type {
	TelegramTransportFailure,
	TelegramTransportResult,
} from "../../telegramTransport.js";
import { repairMojibakeDeep, repairMojibakeText } from "../../text/repairMojibake.js";
import {
	UnknownRecord,
	TelegramRouteBodySchema,
	TelegramRouteBodyParseResult,
	TelegramLinkCodeRejection,
	TelegramMessagePreviewRejectionReason,
	telegramLinkCodeEncryptionMissingMessage,
	telegramLinkCodeScopeInvalidMessage,
	telegramPreviewPatientNotFoundMessage,
	telegramPreviewAppointmentNotFoundMessage,
	telegramPreviewDocumentNotFoundMessage,
	telegramPreviewTaskNotFoundMessage,
	telegramPreviewUnavailableMessage,
	telegramChatLinkNotFoundMessage,
	TelegramOutboxSendDueInput,
} from "./types.js";

export function isRecord(value: unknown): value is UnknownRecord {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function stringFromUnknown(value: unknown): string | null {
	if (typeof value === "string") return value;
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return null;
}

export function readableTelegramText(value: string | null): string | null {
	return value ? repairMojibakeText(value) : null;
}

export function readableTelegramPayload<T>(value: T): T {
	return repairMojibakeDeep(value);
}

export function parseTelegramRouteBody<T>(
	schema: TelegramRouteBodySchema<T>,
	body: unknown,
): TelegramRouteBodyParseResult<T> {
	try {
		return { ok: true, value: schema.parse(body) };
	} catch (err) {
		console.error("[Dente] parseTelegramRouteBody failed:", err);
		return {
			ok: false,
			message:
				"Некорректный запрос Telegram. Проверьте обязательные поля и типы значений.",
		};
	}
}

export function sendTelegramValidationError(
	reply: FastifyReply,
	error = "TelegramValidationFailed",
) {
	return reply.code(400).send({
		error,
		message:
			"Некорректный запрос Telegram. Проверьте обязательные поля и типы значений.",
	});
}

export const telegramSettingsFieldLabels: Record<string, string> = {
	botUsername: "Имя Telegram-бота",
	webhookBaseUrl: "Адрес приема сообщений Telegram",
	patientPortalBaseUrl: "Ссылка на портал пациента",
	welcomeImageUrl: "Картинка приветствия",
	clinicReviewUrl: "Ссылка для отзывов",
	clinicMapsUrl: "Ссылка на карту клиники",
	"visualCardUrls.mainMenu": "Карточка главного меню",
	"visualCardUrls.appointment": "Карточка записи",
	"visualCardUrls.documents": "Карточка документов",
	"visualCardUrls.tax": "Карточка налоговых документов",
	"visualCardUrls.billing": "Карточка оплаты",
	"visualCardUrls.care": "Карточка памятки",
	"visualCardUrls.review": "Карточка отзыва",
};

export const telegramSettingsReasonLabels: Record<string, string> = {
	invalid_url: "укажите полный адрес вида https://...",
	https_required: "нужна HTTPS-ссылка.",
	credentials_not_allowed: "уберите логин и пароль из ссылки.",
	invalid_path_encoding: "исправьте кодировку пути в ссылке.",
	patient_identifying_path_not_allowed:
		"ссылка должна вести на общую публичную страницу без пациента, приема, документа, оплаты или токена.",
	patient_identifying_path_value_not_allowed:
		"уберите из пути идентификаторы пациента, документа, телефона или личного номера.",
	patient_identifying_query_not_allowed:
		"уберите персональные параметры из ссылки.",
	patient_identifying_query_value_not_allowed:
		"уберите телефон, ИНН, СНИЛС или другой личный номер из параметров.",
};

export function telegramSettingsFieldLabel(fieldName: string): string {
	const normalized = fieldName.trim();
	return (
		telegramSettingsFieldLabels[normalized] ??
		telegramSettingsFieldLabels[normalized.replace(/\[(\w+)\]/g, ".$1")] ??
		"Поле Telegram"
	);
}

export function readableTelegramSettingsValidationMessage(error: unknown): string {
	const rawMessage =
		error instanceof Error ? repairMojibakeText(error.message).trim() : "";
	if (!rawMessage)
		return "Настройки Telegram не сохранены. Проверьте поля формы.";
	if (
		rawMessage.includes("DENTE_TELEGRAM_CALLBACK_SECRET") ||
		rawMessage.includes("DENTE_TELEGRAM_WEBHOOK_SECRET")
	) {
		return "Подписанные кнопки приема отключены; включите секрет подписанных кнопок в серверных настройках.";
	}
	const rawReason = telegramSettingsReasonLabels[rawMessage];
	if (rawReason) return rawReason;

	const technicalMatch = rawMessage.match(/^([^:]+):\s*([a-z0-9_]+)(?::.*)?$/);
	if (technicalMatch) {
		const fieldLabel = telegramSettingsFieldLabel(technicalMatch[1] ?? "");
		const reason = telegramSettingsReasonLabels[technicalMatch[2] ?? ""];
		if (reason) return `${fieldLabel}: ${reason}`;
	}
	return "Настройки Telegram не сохранены. Проверьте поля формы и публичные ссылки.";
}

export function readableTelegramSettingsSchemaMessage(error: unknown): string {
	const issues = Array.isArray((error as { issues?: unknown }).issues)
		? (error as { issues: Array<{ path?: unknown[]; message?: unknown }> })
				.issues
		: [];
	const firstIssue = issues[0];
	if (!firstIssue)
		return "Настройки Telegram не сохранены. Проверьте поля формы.";

	const fieldName = Array.isArray(firstIssue.path)
		? firstIssue.path.map((part) => String(part)).join(".")
		: "";
	const fieldLabel = telegramSettingsFieldLabel(fieldName);
	const message =
		typeof firstIssue.message === "string"
			? repairMojibakeText(firstIssue.message).trim()
			: "";
	const looksTechnical =
		/invalid|required|expected|string|number|boolean|uuid|literal|received/i.test(
			message,
		);
	if (message && !looksTechnical) return `${fieldLabel}: ${message}`;
	return `${fieldLabel}: проверьте значение поля.`;
}


export function telegramLinkCodeRejection(error: unknown): TelegramLinkCodeRejection {
	const message =
		error instanceof Error ? repairMojibakeText(error.message) : "";
	if (
		message.includes("DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY") ||
		message.includes("Защищенная связка Telegram-чата")
	) {
		return {
			error: "TelegramChatEncryptionKeyMissing",
			reason: "chat_encryption_missing",
			message: telegramLinkCodeEncryptionMissingMessage,
		};
	}
	if (
		message.includes("активному пациенту") ||
		message.includes("активному сотруднику")
	) {
		return {
			error: "TelegramLinkCodeScopeInvalid",
			reason: "link_code_scope_invalid",
			message,
		};
	}
	return {
		error: "TelegramLinkCodeScopeInvalid",
		reason: "link_code_scope_invalid",
		message: telegramLinkCodeScopeInvalidMessage,
	};
}

export function telegramMessagePreviewRejection(error: unknown): {
	reason: TelegramMessagePreviewRejectionReason;
	message: string;
} {
	const message =
		error instanceof Error ? repairMojibakeText(error.message) : "";
	if (message.includes("Пациент для предпросмотра Telegram не найден")) {
		return {
			reason: "patient_not_found",
			message: telegramPreviewPatientNotFoundMessage,
		};
	}
	if (message.includes("Запись для предпросмотра Telegram не найдена")) {
		return {
			reason: "appointment_not_found",
			message: telegramPreviewAppointmentNotFoundMessage,
		};
	}
	if (message.includes("Документ для предпросмотра Telegram не найден")) {
		return {
			reason: "document_not_found",
			message: telegramPreviewDocumentNotFoundMessage,
		};
	}
	if (
		message.includes(
			"Задача коммуникации для предпросмотра Telegram не найдена",
		)
	) {
		return {
			reason: "task_not_found",
			message: telegramPreviewTaskNotFoundMessage,
		};
	}
	return {
		reason: "preview_unavailable",
		message: telegramPreviewUnavailableMessage,
	};
}


export const telegramTransportFailureLabels: Record<
	TelegramTransportFailure["errorClass"],
	string
> = {
	medical_secrecy_violation: "передача сведений о здоровье запрещена (152-ФЗ / 323-ФЗ ст. 13)",
	rate_limited: "Telegram временно ограничил частоту отправки",
	auth: "токен бота не принят Telegram",
	chat_blocked: "чат недоступен или пользователь заблокировал бота",
	bad_request: "Telegram отклонил формат сообщения",
	timeout: "Telegram не ответил за отведенное время",
	network: "нет устойчивого соединения с Telegram",
	server: "сервис Telegram временно недоступен",
	unknown: "причина не определена",
};

export function telegramRetryAfterSeconds(
	result: TelegramTransportFailure,
): number | null {
	return typeof result.retryAfterSeconds === "number" &&
		Number.isFinite(result.retryAfterSeconds) &&
		result.retryAfterSeconds >= 0
		? Math.trunc(result.retryAfterSeconds)
		: null;
}

export function telegramRetryAfterSuffix(result: TelegramTransportFailure): string {
	const retryAfterSeconds = telegramRetryAfterSeconds(result);
	return retryAfterSeconds !== null
		? ` Повторите отправку через ${retryAfterSeconds} с.`
		: "";
}

export function telegramTransportFailureText(
	result: TelegramTransportFailure,
	scope: string,
): string {
	return `${scope}: ${telegramTransportFailureLabels[result.errorClass]}.${telegramRetryAfterSuffix(result)}`;
}

export function telegramPhotoFallbackWarning(
	result: TelegramTransportFailure,
): string {
	return telegramTransportFailureText(
		result,
		"Фото не принято Telegram; отправлен текстовый вариант",
	);
}

export function telegramPhotoCaptionSplitTextWarning(
	result: TelegramTransportFailure,
): string {
	return telegramTransportFailureText(
		result,
		"Фото принято, но полный текст под ним не отправлен",
	);
}

export function telegramPhotoMessageReference(photoMessageId: number | null): string {
	return photoMessageId !== null ? ` (сообщение ${photoMessageId})` : "";
}

export function telegramPhotoPartialDeliveryWarning(
	photoMessageId: number | null,
): string {
	return `Частичная доставка: фото уже у пациента${telegramPhotoMessageReference(photoMessageId)}. Повторная попытка отправит только текст, фото заново не уйдет.`;
}

export function telegramPhotoAlreadyDeliveredWarning(
	photoMessageId: number | null,
): string {
	return `Фото доставлено пациенту в предыдущей попытке${telegramPhotoMessageReference(photoMessageId)}; повторно отправляется только текст.`;
}

export function telegramOutboxTransportFailureWarning(
	result: TelegramTransportFailure,
): string {
	return telegramTransportFailureText(result, "Telegram не принял сообщение");
}

export function telegramCallbackTransportFailureWarning(
	result: TelegramTransportFailure,
): string {
	return telegramTransportFailureText(
		result,
		"Ответ на Telegram-кнопку не отправлен",
	);
}

export function telegramWebhookReplyFailureWarning(
	result: TelegramTransportFailure,
): string {
	return telegramTransportFailureText(result, "Ответ Telegram не отправлен");
}

export function outboxDeliveryClaimKey(
	outboxItemId: string,
	clientMutationId: string,
): string {
	return `${outboxItemId}:${clientMutationId}`;
}


export function firstTelegramQueryValue(value: unknown): string | null {
	if (Array.isArray(value)) return firstTelegramQueryValue(value[0]);
	return stringFromUnknown(value)?.trim() || null;
}

export function parseTelegramQueryPositiveInt(
	value: unknown,
	fallback: number,
	max: number,
): number {
	const raw = firstTelegramQueryValue(value);
	if (!raw) return fallback;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.max(1, Math.min(max, Math.trunc(parsed)));
}

export function parseTelegramOutboxStatusQuery(
	value: unknown,
): DenteTelegramOutboxStatusFilter {
	const raw = firstTelegramQueryValue(value);
	if (!raw || raw === "all" || raw === "due")
		return raw === "due" ? "due" : "all";
	const parsed = denteTelegramOutboxDeliveryStatusSchema.safeParse(raw);
	return parsed.success
		? (parsed.data as DenteTelegramOutboxDeliveryStatus)
		: "all";
}

export function parseTelegramOutboxTemplateQuery(
	value: unknown,
): DenteTelegramTemplateKind | "all" {
	const raw = firstTelegramQueryValue(value);
	if (!raw || raw === "all") return "all";
	const parsed = denteTelegramTemplateKindSchema.safeParse(raw);
	return parsed.success ? parsed.data : "all";
}

export function parseTelegramOutboxQuery(
	query: unknown,
): BuildDenteTelegramOutboxOptions {
	const source =
		query && typeof query === "object" ? (query as UnknownRecord) : {};
	return {
		limit: parseTelegramQueryPositiveInt(source.limit, 80, 300),
		cursor: firstTelegramQueryValue(source.cursor),
		status: parseTelegramOutboxStatusQuery(source.status),
		templateKind: parseTelegramOutboxTemplateQuery(
			source.templateKind ?? source.template,
		),
	};
}

export function parseTelegramOutboxRuntimeScopeQuery(query: unknown): {
	organizationId: string | null;
	botConfigId: string | null;
} {
	const source =
		query && typeof query === "object" ? (query as UnknownRecord) : {};
	const organizationId = firstTelegramQueryValue(
		source.organizationId ?? source.orgId,
	);
	const botConfigId = firstTelegramQueryValue(
		source.botConfigId ?? source.telegramBotConfigId ?? source.configId,
	);
	return {
		organizationId:
			organizationId ||
			(botConfigId ? getDenteTelegramBotSettings().organizationId : null),
		botConfigId,
	};
}

export function parseTelegramClinicScopeQuery(query: unknown): string | null {
	const source =
		query && typeof query === "object" ? (query as UnknownRecord) : {};
	return firstTelegramQueryValue(source.clinicId);
}

export function parseTelegramSubjectTypeQuery(
	value: unknown,
): "patient" | "staff" | "all" {
	const raw = firstTelegramQueryValue(value);
	if (!raw || raw === "all") return "all";
	const parsed = denteTelegramSubjectTypeSchema.safeParse(raw);
	return parsed.success ? parsed.data : "all";
}

export function parseTelegramLinkCodeStatusQuery(
	value: unknown,
): DenteTelegramLinkCodeListStatusFilter {
	const raw = firstTelegramQueryValue(value);
	if (!raw || raw === "all") return "all";
	const parsed = denteTelegramLinkCodeStatusSchema.safeParse(raw);
	return parsed.success ? parsed.data : "all";
}

export function parseTelegramChatLinkStatusQuery(
	value: unknown,
): DenteTelegramChatLinkListStatusFilter {
	const raw = firstTelegramQueryValue(value);
	if (!raw || raw === "all") return "all";
	const parsed = denteTelegramChatLinkStatusSchema.safeParse(raw);
	return parsed.success ? parsed.data : "all";
}

export function parseTelegramLinkCodeListQuery(
	query: unknown,
): BuildDenteTelegramLinkCodeListOptions {
	const source =
		query && typeof query === "object" ? (query as UnknownRecord) : {};
	const scope = parseTelegramOutboxRuntimeScopeQuery(query);
	return {
		limit: parseTelegramQueryPositiveInt(source.limit, 20, 200),
		cursor: firstTelegramQueryValue(source.cursor),
		status: parseTelegramLinkCodeStatusQuery(source.status),
		subjectType: parseTelegramSubjectTypeQuery(source.subjectType),
		subjectId: firstTelegramQueryValue(source.subjectId),
		organizationId: scope.organizationId,
		clinicId: parseTelegramClinicScopeQuery(query),
		botConfigId: scope.botConfigId,
	};
}

export function parseTelegramChatLinkListQuery(
	query: unknown,
): BuildDenteTelegramChatLinkListOptions {
	const source =
		query && typeof query === "object" ? (query as UnknownRecord) : {};
	const scope = parseTelegramOutboxRuntimeScopeQuery(query);
	return {
		limit: parseTelegramQueryPositiveInt(source.limit, 20, 200),
		cursor: firstTelegramQueryValue(source.cursor),
		status: parseTelegramChatLinkStatusQuery(source.status),
		subjectType: parseTelegramSubjectTypeQuery(source.subjectType),
		subjectId: firstTelegramQueryValue(source.subjectId),
		organizationId: scope.organizationId,
		clinicId: parseTelegramClinicScopeQuery(query),
		botConfigId: scope.botConfigId,
	};
}

export function parseTelegramOutboxSendDueInput(
	body: unknown,
): TelegramOutboxSendDueInput | null {
	const source =
		body && typeof body === "object" ? (body as UnknownRecord) : {};
	const dryRun = typeof source.dryRun === "boolean" ? source.dryRun : false;
	const limit = source.limit === undefined ? 25 : Number(source.limit);
	if (!Number.isInteger(limit) || limit < 1 || limit > 50) return null;
	return { dryRun, limit };
}

export function dueOutboxClientMutationId(
	outboxItemId: string,
	scheduledAt: string,
): string {
	const digest = createHash("sha256")
		.update(`${outboxItemId}:${scheduledAt}`)
		.digest("hex")
		.slice(0, 40);
	return `due-${digest}`;
}