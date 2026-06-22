import { createHash } from "node:crypto";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  createDenteTelegramLinkCodeSchema,
  denteTelegramBotStatusSchema,
  denteTelegramChatLinkPublicSchema,
  denteTelegramChatLinkStatusSchema,
  denteTelegramLinkCodeStatusSchema,
  denteTelegramMessagePreviewRequestSchema,
  denteTelegramOutboxDeliveryStatusSchema,
  denteTelegramOutboxSendDueResponseSchema,
  denteTelegramOutboxSendRequestSchema,
  denteTelegramOutboxSendResponseSchema,
  denteTelegramSubjectTypeSchema,
  denteTelegramTemplateKindSchema,
  denteTelegramWebhookResponseSchema,
  denteTelegramWebhookUpdateSchema,
  updateDenteTelegramBotSettingsSchema,
  type DenteTelegramBotSettings,
  type DenteTelegramFeature,
  type DenteTelegramOutboxDeliveryStatus,
  type DenteTelegramOutboxItem,
  type DenteTelegramOutboxSendDueResponse,
  type DenteTelegramOutboxSendRequest,
  type DenteTelegramOutboxSendResponse,
  type DenteTelegramPostVisitCheckupDelayHoursByTopic,
  type DenteTelegramTemplateKind,
  type DenteTelegramVisualCardUrls,
  type DenteTelegramWebhookEvent,
  type DenteTelegramUpdateKind,
  type UpdateDenteTelegramBotSettingsInput
} from "@dental/shared";
import type { BuildDenteTelegramOutboxOptions, DenteTelegramOutboxRuntimeScope, DenteTelegramOutboxStatusFilter } from "../sampleData.js";
import {
  buildDenteTelegramChatLinkList,
  buildDenteTelegramLinkCodeList,
  buildDenteTelegramLinkedScheduleReply,
  buildDenteTelegramOutbox,
  claimDenteTelegramOutboxDeliveryReceipt,
  claimDenteTelegramWebhookUpdate,
  consumeDenteTelegramLinkCode,
  createDenteTelegramContactRequest,
  createDenteTelegramCareRequest,
  createDenteTelegramDocumentRequest,
  createDenteTelegramLinkCode,
  denteTelegramVisualCardUrlFor,
  extractDenteTelegramLinkCode,
  findDenteTelegramOutboxDeliveryReceipt,
  getDenteTelegramBotSettings,
  handleDenteTelegramAppointmentCallback,
  hasDenteTelegramWebhookUpdate,
  listDenteTelegramChatLinks,
  listDenteTelegramLinkCodes,
  listDenteTelegramWebhookEvents,
  prepareDenteTelegramOutboxDelivery,
  recordDenteTelegramWebhookEvent,
  recordDenteTelegramOutboxDelivery,
  renderDenteTelegramMessagePreview,
  revokeDenteTelegramChatLink,
  safeDenteTelegramPublicHttpsUrl,
  updateDenteTelegramBotSettings
} from "../sampleData.js";
import type {
  BuildDenteTelegramChatLinkListOptions,
  BuildDenteTelegramLinkCodeListOptions,
  DenteTelegramChatLinkListStatusFilter,
  DenteTelegramLinkCodeListStatusFilter
} from "../sampleData.js";
import { repairMojibakeDeep, repairMojibakeText } from "../text/repairMojibake.js";
import { answerTelegramCallbackQuery, sendTelegramPhotoMessage, sendTelegramTextMessage, type TelegramTransportFailure } from "../telegramTransport.js";

const telegramSecretHeader = "x-telegram-bot-api-secret-token";
const denteAdminSecretHeader = "x-dente-admin-secret";
const telegramOutboxDeliveryClaims = new Set<string>();
const telegramLinkCodeRateLimitWindowMs = 10 * 60_000;
const telegramLinkCodeRejectedAttemptLimit = 5;
const telegramPhotoCaptionMaxLength = 1024;
const telegramSplitPhotoCaption = "DENTE: сообщение клиники. Полный текст ниже.";

type UnknownRecord = Record<string, unknown>;
type TelegramInlineKeyboardButton = { text: string; url?: string; callback_data?: string };
type TelegramInlineKeyboardRow = TelegramInlineKeyboardButton[];
type TelegramRouteBodySchema<T> = {
  parse(value: unknown): T;
};
type TelegramRouteBodyParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };
type TelegramChatInfo = {
  id: string;
  type: string | null;
};

type TelegramSafeCallbackAction =
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

type TelegramWebhookReplyPackage = {
  text: string | null;
  replyMarkup: Record<string, unknown> | null;
  photoUrl?: string | null;
};
type TelegramRequestScope = {
  organizationId?: string | null;
  clinicId?: string | null;
  botConfigId?: string | null;
};
type DenteTelegramCareRequestTopic = Parameters<typeof createDenteTelegramCareRequest>[1];

type TelegramRuntimeContext = {
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

type TelegramClinicBotEnvConfig = {
  organizationId: string | null;
  clinicId: string | null;
  botConfigId: string | null;
  botUsername: string | null;
  botToken: string | null;
  webhookSecret: string | null;
  webhookBaseUrl: string | null;
  patientPortalBaseUrl: string | null;
  welcomeImageUrl: string | null;
  visualCardUrls: Partial<DenteTelegramVisualCardUrls> | null;
  postVisitCheckupDelayHoursByTopic: Partial<DenteTelegramPostVisitCheckupDelayHoursByTopic> | null;
  reviewRequestDelayHours: number | null;
  clinicReviewUrl: string | null;
  clinicMapsUrl: string | null;
};

type TelegramRuntimeSettingsResolution = {
  settings: DenteTelegramBotSettings;
  clinicId: string;
  envConfig: TelegramClinicBotEnvConfig | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringFromUnknown(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readableTelegramText(value: string | null): string | null {
  return value ? repairMojibakeText(value) : null;
}

function readableTelegramPayload<T>(value: T): T {
  return repairMojibakeDeep(value);
}

function parseTelegramRouteBody<T>(schema: TelegramRouteBodySchema<T>, body: unknown): TelegramRouteBodyParseResult<T> {
  try {
    return { ok: true, value: schema.parse(body) };
  } catch {
    return {
      ok: false,
      message: "Некорректный запрос Telegram. Проверьте обязательные поля и типы значений."
    };
  }
}

function sendTelegramValidationError(reply: FastifyReply, error = "TelegramValidationFailed") {
  return reply.code(400).send({
    error,
    message: "Некорректный запрос Telegram. Проверьте обязательные поля и типы значений."
  });
}

const telegramSettingsFieldLabels: Record<string, string> = {
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
  "visualCardUrls.review": "Карточка отзыва"
};

const telegramSettingsReasonLabels: Record<string, string> = {
  invalid_url: "укажите полный адрес вида https://...",
  https_required: "нужна HTTPS-ссылка.",
  credentials_not_allowed: "уберите логин и пароль из ссылки.",
  invalid_path_encoding: "исправьте кодировку пути в ссылке.",
  patient_identifying_path_not_allowed: "ссылка должна вести на общую публичную страницу без пациента, приема, документа, оплаты или токена.",
  patient_identifying_path_value_not_allowed: "уберите из пути идентификаторы пациента, документа, телефона или личного номера.",
  patient_identifying_query_not_allowed: "уберите персональные параметры из ссылки.",
  patient_identifying_query_value_not_allowed: "уберите телефон, ИНН, СНИЛС или другой личный номер из параметров."
};

function telegramSettingsFieldLabel(fieldName: string): string {
  const normalized = fieldName.trim();
  return telegramSettingsFieldLabels[normalized] ?? telegramSettingsFieldLabels[normalized.replace(/\[(\w+)\]/g, ".$1")] ?? "Поле Telegram";
}

function readableTelegramSettingsValidationMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? repairMojibakeText(error.message).trim() : "";
  if (!rawMessage) return "Настройки Telegram не сохранены. Проверьте поля формы.";
  if (rawMessage.includes("DENTE_TELEGRAM_CALLBACK_SECRET") || rawMessage.includes("DENTE_TELEGRAM_WEBHOOK_SECRET")) {
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

function readableTelegramSettingsSchemaMessage(error: unknown): string {
  const issues = Array.isArray((error as { issues?: unknown }).issues)
    ? ((error as { issues: Array<{ path?: unknown[]; message?: unknown }> }).issues)
    : [];
  const firstIssue = issues[0];
  if (!firstIssue) return "Настройки Telegram не сохранены. Проверьте поля формы.";

  const fieldName = Array.isArray(firstIssue.path) ? firstIssue.path.map((part) => String(part)).join(".") : "";
  const fieldLabel = telegramSettingsFieldLabel(fieldName);
  const message = typeof firstIssue.message === "string" ? repairMojibakeText(firstIssue.message).trim() : "";
  const looksTechnical = /invalid|required|expected|string|number|boolean|uuid|literal|received/i.test(message);
  if (message && !looksTechnical) return `${fieldLabel}: ${message}`;
  return `${fieldLabel}: проверьте значение поля.`;
}

type TelegramLinkCodeRejection = {
  error: "TelegramChatEncryptionKeyMissing" | "TelegramLinkCodeScopeInvalid";
  reason: "chat_encryption_missing" | "link_code_scope_invalid";
  message: string;
};

type TelegramMessagePreviewRejectionReason =
  | "patient_not_found"
  | "appointment_not_found"
  | "document_not_found"
  | "task_not_found"
  | "preview_unavailable";

const telegramLinkCodeEncryptionMissingMessage =
  "Код привязки Telegram не выпущен: включите защищенную привязку Telegram-чата в серверных настройках.";
const telegramLinkCodeScopeInvalidMessage =
  "Код привязки Telegram не выпущен: выберите активного пациента или сотрудника текущей клиники.";
const telegramPreviewPatientNotFoundMessage =
  "Предпросмотр Telegram не подготовлен: выберите актуального пациента.";
const telegramPreviewAppointmentNotFoundMessage =
  "Предпросмотр Telegram не подготовлен: выберите актуальную запись.";
const telegramPreviewDocumentNotFoundMessage =
  "Предпросмотр Telegram не подготовлен: выберите актуальный документ.";
const telegramPreviewTaskNotFoundMessage =
  "Предпросмотр Telegram не подготовлен: выберите актуальную задачу коммуникации.";
const telegramPreviewUnavailableMessage =
  "Предпросмотр Telegram не подготовлен: проверьте шаблон, клинику и связанные записи.";
const telegramChatLinkNotFoundMessage =
  "Привязка Telegram-чата не отозвана: связь не найдена или уже недоступна для выбранного бота.";

function telegramLinkCodeRejection(error: unknown): TelegramLinkCodeRejection {
  const message = error instanceof Error ? repairMojibakeText(error.message) : "";
  if (message.includes("DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY") || message.includes("Защищенная связка Telegram-чата")) {
    return {
      error: "TelegramChatEncryptionKeyMissing",
      reason: "chat_encryption_missing",
      message: telegramLinkCodeEncryptionMissingMessage
    };
  }
  if (message.includes("активному пациенту") || message.includes("активному сотруднику")) {
    return {
      error: "TelegramLinkCodeScopeInvalid",
      reason: "link_code_scope_invalid",
      message
    };
  }
  return {
    error: "TelegramLinkCodeScopeInvalid",
    reason: "link_code_scope_invalid",
    message: telegramLinkCodeScopeInvalidMessage
  };
}

function telegramMessagePreviewRejection(error: unknown): { reason: TelegramMessagePreviewRejectionReason; message: string } {
  const message = error instanceof Error ? repairMojibakeText(error.message) : "";
  if (message.includes("Пациент для предпросмотра Telegram не найден")) {
    return { reason: "patient_not_found", message: telegramPreviewPatientNotFoundMessage };
  }
  if (message.includes("Запись для предпросмотра Telegram не найдена")) {
    return { reason: "appointment_not_found", message: telegramPreviewAppointmentNotFoundMessage };
  }
  if (message.includes("Документ для предпросмотра Telegram не найден")) {
    return { reason: "document_not_found", message: telegramPreviewDocumentNotFoundMessage };
  }
  if (message.includes("Задача коммуникации для предпросмотра Telegram не найдена")) {
    return { reason: "task_not_found", message: telegramPreviewTaskNotFoundMessage };
  }
  return { reason: "preview_unavailable", message: telegramPreviewUnavailableMessage };
}

const telegramTransportFailureLabels: Record<TelegramTransportFailure["errorClass"], string> = {
  rate_limited: "Telegram временно ограничил частоту отправки",
  auth: "токен бота не принят Telegram",
  chat_blocked: "чат недоступен или пользователь заблокировал бота",
  bad_request: "Telegram отклонил формат сообщения",
  timeout: "Telegram не ответил за отведенное время",
  network: "нет устойчивого соединения с Telegram",
  server: "сервис Telegram временно недоступен",
  unknown: "причина не определена"
};

function telegramRetryAfterSeconds(result: TelegramTransportFailure): number | null {
  return typeof result.retryAfterSeconds === "number" && Number.isFinite(result.retryAfterSeconds) && result.retryAfterSeconds >= 0
    ? Math.trunc(result.retryAfterSeconds)
    : null;
}

function telegramRetryAfterSuffix(result: TelegramTransportFailure): string {
  const retryAfterSeconds = telegramRetryAfterSeconds(result);
  return retryAfterSeconds !== null ? ` Повторите отправку через ${retryAfterSeconds} с.` : "";
}

function telegramTransportFailureText(result: TelegramTransportFailure, scope: string): string {
  return `${scope}: ${telegramTransportFailureLabels[result.errorClass]}.${telegramRetryAfterSuffix(result)}`;
}

function telegramPhotoFallbackWarning(result: TelegramTransportFailure): string {
  return telegramTransportFailureText(result, "Фото не принято Telegram; отправлен текстовый вариант");
}

function telegramPhotoCaptionSplitTextWarning(result: TelegramTransportFailure): string {
  return telegramTransportFailureText(result, "Фото принято, но полный текст под ним не отправлен");
}

function telegramOutboxTransportFailureWarning(result: TelegramTransportFailure): string {
  return telegramTransportFailureText(result, "Telegram не принял сообщение");
}

function telegramCallbackTransportFailureWarning(result: TelegramTransportFailure): string {
  return telegramTransportFailureText(result, "Ответ на Telegram-кнопку не отправлен");
}

function telegramWebhookReplyFailureWarning(result: TelegramTransportFailure): string {
  return telegramTransportFailureText(result, "Ответ Telegram не отправлен");
}

function outboxDeliveryClaimKey(outboxItemId: string, clientMutationId: string): string {
  return `${outboxItemId}:${clientMutationId}`;
}

type TelegramOutboxSendExecutionResult = {
  statusCode: number;
  body: DenteTelegramOutboxSendResponse | { error: string; message: string };
};

type TelegramOutboxSendDueInput = {
  dryRun: boolean;
  limit: number;
};

type TelegramDueWorkerLogger = {
  info: (message: unknown, ...args: unknown[]) => void;
  warn: (message: unknown, ...args: unknown[]) => void;
  error: (message: unknown, ...args: unknown[]) => void;
};

export type DenteTelegramOutboxDueWorkerHandle = {
  enabled: boolean;
  stop: () => void;
  runOnce: () => Promise<DenteTelegramOutboxSendDueResponse | null>;
};

function firstTelegramQueryValue(value: unknown): string | null {
  if (Array.isArray(value)) return firstTelegramQueryValue(value[0]);
  return stringFromUnknown(value)?.trim() || null;
}

function parseTelegramQueryPositiveInt(value: unknown, fallback: number, max: number): number {
  const raw = firstTelegramQueryValue(value);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(parsed)));
}

function parseTelegramOutboxStatusQuery(value: unknown): DenteTelegramOutboxStatusFilter {
  const raw = firstTelegramQueryValue(value);
  if (!raw || raw === "all" || raw === "due") return raw === "due" ? "due" : "all";
  const parsed = denteTelegramOutboxDeliveryStatusSchema.safeParse(raw);
  return parsed.success ? (parsed.data as DenteTelegramOutboxDeliveryStatus) : "all";
}

function parseTelegramOutboxTemplateQuery(value: unknown): DenteTelegramTemplateKind | "all" {
  const raw = firstTelegramQueryValue(value);
  if (!raw || raw === "all") return "all";
  const parsed = denteTelegramTemplateKindSchema.safeParse(raw);
  return parsed.success ? parsed.data : "all";
}

function parseTelegramOutboxQuery(query: unknown): BuildDenteTelegramOutboxOptions {
  const source = query && typeof query === "object" ? (query as UnknownRecord) : {};
  return {
    limit: parseTelegramQueryPositiveInt(source.limit, 80, 300),
    cursor: firstTelegramQueryValue(source.cursor),
    status: parseTelegramOutboxStatusQuery(source.status),
    templateKind: parseTelegramOutboxTemplateQuery(source.templateKind ?? source.template)
  };
}

function parseTelegramOutboxRuntimeScopeQuery(query: unknown): { organizationId: string | null; botConfigId: string | null } {
  const source = query && typeof query === "object" ? (query as UnknownRecord) : {};
  const organizationId = firstTelegramQueryValue(source.organizationId ?? source.orgId);
  const botConfigId = firstTelegramQueryValue(source.botConfigId ?? source.telegramBotConfigId ?? source.configId);
  return {
    organizationId: organizationId || (botConfigId ? getDenteTelegramBotSettings().organizationId : null),
    botConfigId
  };
}

function parseTelegramClinicScopeQuery(query: unknown): string | null {
  const source = query && typeof query === "object" ? (query as UnknownRecord) : {};
  return firstTelegramQueryValue(source.clinicId);
}

function parseTelegramSubjectTypeQuery(value: unknown): "patient" | "staff" | "all" {
  const raw = firstTelegramQueryValue(value);
  if (!raw || raw === "all") return "all";
  const parsed = denteTelegramSubjectTypeSchema.safeParse(raw);
  return parsed.success ? parsed.data : "all";
}

function parseTelegramLinkCodeStatusQuery(value: unknown): DenteTelegramLinkCodeListStatusFilter {
  const raw = firstTelegramQueryValue(value);
  if (!raw || raw === "all") return "all";
  const parsed = denteTelegramLinkCodeStatusSchema.safeParse(raw);
  return parsed.success ? parsed.data : "all";
}

function parseTelegramChatLinkStatusQuery(value: unknown): DenteTelegramChatLinkListStatusFilter {
  const raw = firstTelegramQueryValue(value);
  if (!raw || raw === "all") return "all";
  const parsed = denteTelegramChatLinkStatusSchema.safeParse(raw);
  return parsed.success ? parsed.data : "all";
}

function parseTelegramLinkCodeListQuery(query: unknown): BuildDenteTelegramLinkCodeListOptions {
  const source = query && typeof query === "object" ? (query as UnknownRecord) : {};
  const scope = parseTelegramOutboxRuntimeScopeQuery(query);
  return {
    limit: parseTelegramQueryPositiveInt(source.limit, 20, 200),
    cursor: firstTelegramQueryValue(source.cursor),
    status: parseTelegramLinkCodeStatusQuery(source.status),
    subjectType: parseTelegramSubjectTypeQuery(source.subjectType),
    subjectId: firstTelegramQueryValue(source.subjectId),
    organizationId: scope.organizationId,
    clinicId: parseTelegramClinicScopeQuery(query),
    botConfigId: scope.botConfigId
  };
}

function parseTelegramChatLinkListQuery(query: unknown): BuildDenteTelegramChatLinkListOptions {
  const source = query && typeof query === "object" ? (query as UnknownRecord) : {};
  const scope = parseTelegramOutboxRuntimeScopeQuery(query);
  return {
    limit: parseTelegramQueryPositiveInt(source.limit, 20, 200),
    cursor: firstTelegramQueryValue(source.cursor),
    status: parseTelegramChatLinkStatusQuery(source.status),
    subjectType: parseTelegramSubjectTypeQuery(source.subjectType),
    subjectId: firstTelegramQueryValue(source.subjectId),
    organizationId: scope.organizationId,
    clinicId: parseTelegramClinicScopeQuery(query),
    botConfigId: scope.botConfigId
  };
}

function parseTelegramOutboxSendDueInput(body: unknown): TelegramOutboxSendDueInput | null {
  const source = body && typeof body === "object" ? (body as UnknownRecord) : {};
  const dryRun = typeof source.dryRun === "boolean" ? source.dryRun : false;
  const limit = source.limit === undefined ? 25 : Number(source.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return null;
  return { dryRun, limit };
}

function dueOutboxClientMutationId(outboxItemId: string, scheduledAt: string): string {
  const digest = createHash("sha256").update(`${outboxItemId}:${scheduledAt}`).digest("hex").slice(0, 40);
  return `due-${digest}`;
}

function isDenteTelegramOutboxItemDue(item: DenteTelegramOutboxItem, nowMs: number): boolean {
  const scheduledAtMs = Date.parse(item.scheduledAt);
  return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;
}

async function executeTelegramOutboxSend(
  outboxItemId: string,
  input: DenteTelegramOutboxSendRequest,
  runtime?: TelegramResolvedOutboxRuntime
): Promise<TelegramOutboxSendExecutionResult> {
  const clientMutationId = input.clientMutationId?.trim() || null;
  const replay = findDenteTelegramOutboxDeliveryReceipt(outboxItemId, clientMutationId);
  if (replay && !(replay.status === "failed" && clientMutationId?.startsWith("due-"))) {
    const body = denteTelegramOutboxSendResponseSchema.parse({
      ...replay,
      warnings: [...replay.warnings, "idempotent_replay"],
      retryAfterSeconds: null
    });
    return { statusCode: replay.status === "failed" ? 502 : replay.status === "blocked" ? 409 : 200, body };
  }

  const runtimeResult = runtime ? { ok: true as const, runtime } : resolveTelegramOutboxRuntimeScopeFromQuery({});
  if (!runtimeResult.ok) {
    return {
      statusCode: runtimeResult.statusCode,
      body: {
        error: runtimeResult.error,
        message: runtimeResult.message
      }
    };
  }

  const token = runtimeResult.runtime.context.botToken;
  const prepared = prepareDenteTelegramOutboxDelivery(outboxItemId, runtimeResult.runtime.runtimeScope);

  if (!prepared.ok) {
    return {
      statusCode: prepared.statusCode,
      body: denteTelegramOutboxSendResponseSchema.parse({
        status: "blocked",
        outboxItem: prepared.item,
        taskId: prepared.item?.taskId ?? null,
        eventId: null,
        telegramMessageId: null,
        clientMutationId,
        warnings: prepared.warnings,
        retryAfterSeconds: null,
        blockedReason: prepared.blockedReason
      })
    };
  }

  if (!input.dryRun && !clientMutationId) {
    return {
      statusCode: 400,
      body: denteTelegramOutboxSendResponseSchema.parse({
        status: "blocked",
        outboxItem: prepared.item,
        taskId: prepared.item.taskId,
        eventId: null,
        telegramMessageId: null,
        clientMutationId: null,
        warnings: [...prepared.warnings, "client_mutation_id_required"],
        retryAfterSeconds: null,
        blockedReason: "client_mutation_id_required"
      })
    };
  }

  if (!token) {
    return {
      statusCode: 409,
      body: denteTelegramOutboxSendResponseSchema.parse({
        status: "blocked",
        outboxItem: prepared.item,
        taskId: prepared.item.taskId,
        eventId: null,
        telegramMessageId: null,
        clientMutationId,
        warnings: prepared.warnings,
        retryAfterSeconds: null,
        blockedReason: "telegram_bot_token_missing"
      })
    };
  }

  if (input.dryRun) {
    return {
      statusCode: 200,
      body: denteTelegramOutboxSendResponseSchema.parse({
        status: "dry_run",
        outboxItem: prepared.item,
        taskId: prepared.item.taskId,
        eventId: null,
        telegramMessageId: null,
        clientMutationId,
        warnings: prepared.warnings,
        retryAfterSeconds: null,
        blockedReason: null
      })
    };
  }

  const deliveryClientMutationId = clientMutationId;
  if (!deliveryClientMutationId) {
    throw new Error("clientMutationId missing after non-dry-run validation");
  }

  const claimKey = outboxDeliveryClaimKey(prepared.item.id, deliveryClientMutationId);
  const durableReplay = claimDenteTelegramOutboxDeliveryReceipt(prepared.item, deliveryClientMutationId, prepared.warnings);
  if (durableReplay) {
    const body = denteTelegramOutboxSendResponseSchema.parse({
      ...durableReplay,
      warnings: [...durableReplay.warnings, "idempotent_replay"],
      retryAfterSeconds: null
    });
    return { statusCode: durableReplay.status === "failed" ? 502 : durableReplay.status === "blocked" ? 409 : 200, body };
  }
  if (telegramOutboxDeliveryClaims.has(claimKey)) {
    return {
      statusCode: 409,
      body: denteTelegramOutboxSendResponseSchema.parse({
        status: "blocked",
        outboxItem: prepared.item,
        taskId: prepared.item.taskId,
        eventId: null,
        telegramMessageId: null,
        clientMutationId: deliveryClientMutationId,
        warnings: [...prepared.warnings, "telegram_delivery_in_progress"],
        retryAfterSeconds: null,
        blockedReason: "telegram_delivery_in_progress"
      })
    };
  }

  telegramOutboxDeliveryClaims.add(claimKey);
  const deliveryText = repairMojibakeText(prepared.text);
  const deliveryReplyMarkup = readableTelegramPayload(prepared.replyMarkup);
  const deliveryWarnings = [...prepared.warnings];
  const transport = await (async () => {
    const photoUrl = prepared.photoUrl?.trim() || null;
    if (photoUrl) {
      const shouldSplitPhotoCaption = deliveryText.length > telegramPhotoCaptionMaxLength;
      const photoTransport = await sendTelegramPhotoMessage({
        botToken: token,
        chatId: prepared.chatId,
        photoUrl,
        caption: shouldSplitPhotoCaption ? telegramSplitPhotoCaption : deliveryText,
        replyMarkup: shouldSplitPhotoCaption ? null : deliveryReplyMarkup,
        timeoutMs: configuredSendTimeoutMs()
      });
      if (photoTransport.ok) {
        if (!shouldSplitPhotoCaption) return photoTransport;
        deliveryWarnings.push("telegram_photo_caption_split");
        const textTransport = await sendTelegramTextMessage({
          botToken: token,
          chatId: prepared.chatId,
          text: deliveryText,
          replyMarkup: deliveryReplyMarkup,
          timeoutMs: configuredSendTimeoutMs()
        });
        if (textTransport.ok) return textTransport;
        deliveryWarnings.push(telegramPhotoCaptionSplitTextWarning(textTransport));
        return textTransport;
      }
      deliveryWarnings.push(telegramPhotoFallbackWarning(photoTransport));
    }
    return sendTelegramTextMessage({
      botToken: token,
      chatId: prepared.chatId,
      text: deliveryText,
      replyMarkup: deliveryReplyMarkup,
      timeoutMs: configuredSendTimeoutMs()
    });
  })().finally(() => {
    telegramOutboxDeliveryClaims.delete(claimKey);
  });

  if (!transport.ok) {
    const retryAfterSeconds = telegramRetryAfterSeconds(transport);
    const transportWarning = telegramOutboxTransportFailureWarning(transport);
    const warnings = [...deliveryWarnings, transportWarning];
    const delivery = recordDenteTelegramOutboxDelivery({
      item: prepared.item,
      status: "failed",
      message: transportWarning,
      clientMutationId: deliveryClientMutationId,
      warnings,
      blockedReason: "telegram_transport_failed"
    });
    return {
      statusCode: 502,
      body: denteTelegramOutboxSendResponseSchema.parse({
        status: "failed",
        outboxItem: prepared.item,
        taskId: delivery.taskId,
        eventId: delivery.eventId,
        telegramMessageId: null,
        clientMutationId: deliveryClientMutationId,
        warnings,
        retryAfterSeconds,
        blockedReason: "telegram_transport_failed"
      })
    };
  }

  const delivery = recordDenteTelegramOutboxDelivery({
    item: prepared.item,
    status: "sent",
    telegramMessageId: transport.telegramMessageId,
    message: `Telegram safe template sent: ${prepared.item.templateKind}`,
    clientMutationId: deliveryClientMutationId,
    warnings: deliveryWarnings,
    blockedReason: null
  });

  return {
    statusCode: 200,
    body: denteTelegramOutboxSendResponseSchema.parse({
      status: "sent",
      outboxItem: prepared.item,
      taskId: delivery.taskId,
      eventId: delivery.eventId,
      telegramMessageId: transport.telegramMessageId,
      clientMutationId: deliveryClientMutationId,
      warnings: deliveryWarnings,
      retryAfterSeconds: null,
      blockedReason: null
    })
  };
}

export async function executeDenteTelegramOutboxDueBatch(
  input: TelegramOutboxSendDueInput,
  runtime?: TelegramResolvedOutboxRuntime
): Promise<DenteTelegramOutboxSendDueResponse> {
  const runtimeResult = runtime ? { ok: true as const, runtime } : resolveTelegramOutboxRuntimeScopeFromQuery({});
  if (!runtimeResult.ok) {
    return denteTelegramOutboxSendDueResponseSchema.parse({
      ok: false,
      dryRun: input.dryRun,
      requestedLimit: input.limit,
      dueCount: 0,
      notDueCount: 0,
      attemptedCount: 0,
      sentCount: 0,
      dryRunCount: 0,
      blockedCount: 1,
      failedCount: 0,
      results: [
        {
          itemId: "telegram-runtime-scope",
          statusCode: runtimeResult.statusCode,
          result: {
            error: runtimeResult.error,
            message: runtimeResult.message
          }
        }
      ]
    });
  }
  const outbox = buildDenteTelegramOutbox({ limit: Math.max(input.limit, 50), status: "due" }, runtimeResult.runtime.runtimeScope);
  const nowMs = Date.now();
  const dueItems = outbox.items
    .filter((item) => item.deliveryStatus === "ready" && isDenteTelegramOutboxItemDue(item, nowMs))
    .slice(0, input.limit);
  const results: any[] = [];
  for (const item of dueItems) {
    const sendResult = await executeTelegramOutboxSend(
      item.id,
      {
        dryRun: input.dryRun,
        clientMutationId: input.dryRun ? null : dueOutboxClientMutationId(item.id, item.scheduledAt)
      },
      runtimeResult.runtime
    );
    results.push({
      itemId: item.id,
      statusCode: sendResult.statusCode,
      result: sendResult.body
    });
  }
  const sentCount = results.filter((entry) => "status" in entry.result && entry.result.status === "sent").length;
  const dryRunCount = results.filter((entry) => "status" in entry.result && entry.result.status === "dry_run").length;
  const blockedCount = results.filter((entry) => "status" in entry.result && entry.result.status === "blocked").length;
  const failedCount = results.filter((entry) => "status" in entry.result && entry.result.status === "failed").length;
  return denteTelegramOutboxSendDueResponseSchema.parse({
    ok: failedCount === 0 && blockedCount === 0,
    dryRun: input.dryRun,
    requestedLimit: input.limit,
    dueCount: outbox.dueCount,
    notDueCount: outbox.notDueCount,
    attemptedCount: results.length,
    sentCount,
    dryRunCount,
    blockedCount,
    failedCount,
    results
  });
}

function parseTelegramWorkerBoolean(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function parseTelegramWorkerInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function retryAfterDelayMs(response: DenteTelegramOutboxSendDueResponse): number | null {
  let retryAfterSeconds = 0;
  for (const entry of response.results) {
    if ("retryAfterSeconds" in entry.result) {
      const retryAfter = entry.result.retryAfterSeconds;
      if (typeof retryAfter === "number" && Number.isFinite(retryAfter)) {
        retryAfterSeconds = Math.max(retryAfterSeconds, retryAfter);
      }
    }
  }
  return retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : null;
}

export function startDenteTelegramOutboxDueWorker(options: { logger?: TelegramDueWorkerLogger } = {}): DenteTelegramOutboxDueWorkerHandle {
  const enabled = parseTelegramWorkerBoolean(process.env.DENTE_TELEGRAM_OUTBOX_WORKER_ENABLED);
  const logger = options.logger;
  if (!enabled) {
    return {
      enabled: false,
      stop: () => undefined,
      runOnce: async () => null
    };
  }

  const intervalMs = parseTelegramWorkerInt(process.env.DENTE_TELEGRAM_OUTBOX_WORKER_INTERVAL_MS, 60_000, 15_000, 15 * 60_000);
  const limit = parseTelegramWorkerInt(process.env.DENTE_TELEGRAM_OUTBOX_WORKER_BATCH_LIMIT, 10, 1, 25);
  const dryRun = parseTelegramWorkerBoolean(process.env.DENTE_TELEGRAM_OUTBOX_WORKER_DRY_RUN);
  const runOnStart = parseTelegramWorkerBoolean(process.env.DENTE_TELEGRAM_OUTBOX_WORKER_RUN_ON_START);
  let stopped = false;
  let inFlight = false;
  let skippedTicks = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = (delayMs: number) => {
    if (stopped) return;
    timer = setTimeout(() => {
      void runAndReschedule().catch((error: unknown) => {
        logger?.error({ error }, "DENTE Telegram due worker tick failed");
      });
    }, delayMs);
  };

  const runAndReschedule = async (): Promise<DenteTelegramOutboxSendDueResponse | null> => {
    if (stopped) return null;
    if (inFlight) {
      skippedTicks += 1;
      logger?.warn({ skippedTicks }, "DENTE Telegram due worker skipped overlapping tick");
      schedule(intervalMs);
      return null;
    }
    inFlight = true;
    try {
      const response = await executeDenteTelegramOutboxDueBatch({ dryRun, limit });
      const retryDelayMs = retryAfterDelayMs(response);
      logger?.info(
        {
          attemptedCount: response.attemptedCount,
          sentCount: response.sentCount,
          dryRunCount: response.dryRunCount,
          blockedCount: response.blockedCount,
          failedCount: response.failedCount,
          retryDelayMs
        },
        "DENTE Telegram due worker tick completed"
      );
      schedule(retryDelayMs ?? intervalMs);
      return response;
    } catch (error) {
      logger?.error({ error }, "DENTE Telegram due worker tick failed");
      schedule(intervalMs);
      throw error;
    } finally {
      inFlight = false;
    }
  };

  const handle: DenteTelegramOutboxDueWorkerHandle = {
    enabled: true,
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
    runOnce: runAndReschedule
  };
  logger?.info({ intervalMs, limit, dryRun, runOnStart }, "DENTE Telegram due worker enabled");
  schedule(runOnStart ? 0 : intervalMs);
  return handle;
}

function normalizedTelegramBotUsername(value: string | null | undefined): string | null {
  const selected = value?.trim() || null;
  const normalized = selected?.replace(/^@/, "") ?? null;
  return normalized && /^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/.test(normalized) ? normalized : null;
}

function trimmedEnv(name: string): string | null {
  return process.env[name]?.trim() || null;
}

function stringFromEnvConfig(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function uuidFromEnvConfig(value: unknown): string | null {
  const candidate = stringFromEnvConfig(value);
  return candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : null;
}

function visualCardUrlsFromEnvConfig(record: UnknownRecord): Partial<DenteTelegramVisualCardUrls> | null {
  const source = isRecord(record.visualCardUrls) ? record.visualCardUrls : {};
  const urls: Partial<DenteTelegramVisualCardUrls> = {};
  const assign = (key: keyof DenteTelegramVisualCardUrls, value: string | null): void => {
    if (value) urls[key] = value;
  };
  assign("mainMenu", safeDenteTelegramPublicHttpsUrl("visualCardUrls.mainMenu", stringFromEnvConfig(source.mainMenu) ?? stringFromEnvConfig(record.mainMenuImageUrl)));
  assign(
    "appointment",
    safeDenteTelegramPublicHttpsUrl("visualCardUrls.appointment", stringFromEnvConfig(source.appointment) ?? stringFromEnvConfig(record.appointmentImageUrl))
  );
  assign("documents", safeDenteTelegramPublicHttpsUrl("visualCardUrls.documents", stringFromEnvConfig(source.documents) ?? stringFromEnvConfig(record.documentsImageUrl)));
  assign("tax", safeDenteTelegramPublicHttpsUrl("visualCardUrls.tax", stringFromEnvConfig(source.tax) ?? stringFromEnvConfig(record.taxImageUrl)));
  assign("billing", safeDenteTelegramPublicHttpsUrl("visualCardUrls.billing", stringFromEnvConfig(source.billing) ?? stringFromEnvConfig(record.billingImageUrl)));
  assign("care", safeDenteTelegramPublicHttpsUrl("visualCardUrls.care", stringFromEnvConfig(source.care) ?? stringFromEnvConfig(record.careImageUrl)));
  assign("review", safeDenteTelegramPublicHttpsUrl("visualCardUrls.review", stringFromEnvConfig(source.review) ?? stringFromEnvConfig(record.reviewImageUrl)));
  assign("staff", safeDenteTelegramPublicHttpsUrl("visualCardUrls.staff", stringFromEnvConfig(source.staff) ?? stringFromEnvConfig(record.staffImageUrl)));
  return Object.keys(urls).length ? urls : null;
}

function postVisitCheckupDelayHoursFromEnvConfig(record: UnknownRecord): Partial<DenteTelegramPostVisitCheckupDelayHoursByTopic> | null {
  const source: UnknownRecord = isRecord(record.postVisitCheckupDelayHoursByTopic)
    ? record.postVisitCheckupDelayHoursByTopic
    : isRecord(record.postVisitCheckupDelayHours)
      ? record.postVisitCheckupDelayHours
      : {};
  const delays: Partial<DenteTelegramPostVisitCheckupDelayHoursByTopic> = {};
  const assign = (key: keyof DenteTelegramPostVisitCheckupDelayHoursByTopic, value: unknown): void => {
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : NaN;
    if (Number.isFinite(parsed)) delays[key] = Math.max(1, Math.min(720, Math.floor(parsed)));
  };
  assign("extraction", source.extraction ?? record.extractionCheckupDelayHours);
  assign("implantation", source.implantation ?? record.implantationCheckupDelayHours ?? record.implantCheckupDelayHours);
  assign("filling_restoration", source.filling_restoration ?? record.fillingCheckupDelayHours);
  assign("endo", source.endo ?? record.endoCheckupDelayHours);
  assign("surgery", source.surgery ?? record.surgeryCheckupDelayHours);
  assign("local_anesthesia", source.local_anesthesia ?? record.localAnesthesiaCheckupDelayHours);
  assign("hygiene", source.hygiene ?? record.hygieneCheckupDelayHours);
  assign("prosthetics", source.prosthetics ?? record.prostheticsCheckupDelayHours);
  assign("orthodontics", source.orthodontics ?? record.orthodonticsCheckupDelayHours);
  assign("periodontology", source.periodontology ?? record.periodontologyCheckupDelayHours);
  assign("other", source.other ?? record.otherCheckupDelayHours);
  return Object.keys(delays).length ? delays : null;
}

function reviewRequestDelayHoursFromEnvConfig(record: UnknownRecord): number | null {
  const parsed =
    typeof record.reviewRequestDelayHours === "number"
      ? record.reviewRequestDelayHours
      : typeof record.reviewRequestDelayHours === "string"
        ? Number.parseInt(record.reviewRequestDelayHours, 10)
        : NaN;
  return Number.isFinite(parsed) ? Math.max(1, Math.min(720, Math.floor(parsed))) : null;
}

function clinicBotEnvConfigs(): TelegramClinicBotEnvConfig[] {
  const raw = trimmedEnv("DENTE_TELEGRAM_CLINIC_BOTS_JSON");
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const records: unknown[] = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed)
      ? Object.entries(parsed).map(([key, value]) => (isRecord(value) ? { organizationId: key, ...value } : null))
      : [];

  return records
    .filter(isRecord)
    .map((record) => ({
      organizationId: uuidFromEnvConfig(record.organizationId) ?? uuidFromEnvConfig(record.orgId),
      clinicId: uuidFromEnvConfig(record.clinicId),
      botConfigId: stringFromEnvConfig(record.botConfigId) ?? stringFromEnvConfig(record.configId),
      botUsername: normalizedTelegramBotUsername(stringFromEnvConfig(record.botUsername) ?? stringFromEnvConfig(record.username)),
      botToken: stringFromEnvConfig(record.botToken) ?? stringFromEnvConfig(record.token),
      webhookSecret: stringFromEnvConfig(record.webhookSecret) ?? stringFromEnvConfig(record.secret),
      webhookBaseUrl: safeDenteTelegramPublicHttpsUrl("webhookBaseUrl", stringFromEnvConfig(record.webhookBaseUrl)),
      patientPortalBaseUrl: safeDenteTelegramPublicHttpsUrl("patientPortalBaseUrl", stringFromEnvConfig(record.patientPortalBaseUrl)),
      welcomeImageUrl: safeDenteTelegramPublicHttpsUrl("welcomeImageUrl", stringFromEnvConfig(record.welcomeImageUrl)),
      visualCardUrls: visualCardUrlsFromEnvConfig(record),
      postVisitCheckupDelayHoursByTopic: postVisitCheckupDelayHoursFromEnvConfig(record),
      reviewRequestDelayHours: reviewRequestDelayHoursFromEnvConfig(record),
      clinicReviewUrl: safeDenteTelegramPublicHttpsUrl("clinicReviewUrl", stringFromEnvConfig(record.clinicReviewUrl)),
      clinicMapsUrl: safeDenteTelegramPublicHttpsUrl("clinicMapsUrl", stringFromEnvConfig(record.clinicMapsUrl))
    }));
}

function clinicBotEnvConfigForOrganization(
  organizationId: string,
  clinicId: string | null = null,
  botConfigId: string | null = null
): TelegramClinicBotEnvConfig | null {
  const matchingConfigs = clinicBotEnvConfigs().filter((config) => {
    const tenantMatches = config.organizationId === organizationId || config.clinicId === organizationId || (clinicId !== null && config.clinicId === clinicId);
    return tenantMatches;
  });
  if (botConfigId) {
    return matchingConfigs.find((config) => config.botConfigId === botConfigId) ?? null;
  }
  return matchingConfigs.length === 1 ? (matchingConfigs[0] ?? null) : null;
}

function clinicBotEnvConfigFor(settings: DenteTelegramBotSettings): TelegramClinicBotEnvConfig | null {
  return clinicBotEnvConfigForOrganization(settings.organizationId);
}

function runtimeSettingsForRequestedOrganization(
  requestedOrganizationId: string | null | undefined,
  requestedBotConfigId: string | null | undefined = null
): TelegramRuntimeSettingsResolution | null {
  const currentSettings = getDenteTelegramBotSettings();
  const envConfig = requestedOrganizationId
    ? clinicBotEnvConfigForOrganization(requestedOrganizationId, null, requestedBotConfigId ?? null)
    : null;
  if (envConfig?.organizationId) {
    return {
      settings: {
        ...currentSettings,
        organizationId: envConfig.organizationId,
        mode: "clinic_owned_bot",
        ownBotUsername: envConfig.botUsername,
        webhookBaseUrl: envConfig.webhookBaseUrl ?? currentSettings.webhookBaseUrl,
        patientPortalBaseUrl: envConfig.patientPortalBaseUrl ?? currentSettings.patientPortalBaseUrl,
        welcomeImageUrl: envConfig.welcomeImageUrl ?? currentSettings.welcomeImageUrl,
        visualCardUrls: {
          ...currentSettings.visualCardUrls,
          ...(envConfig.visualCardUrls ?? {})
        },
        postVisitCheckupDelayHoursByTopic: {
          ...currentSettings.postVisitCheckupDelayHoursByTopic,
          ...(envConfig.postVisitCheckupDelayHoursByTopic ?? {})
        },
        reviewRequestDelayHours: envConfig.reviewRequestDelayHours ?? currentSettings.reviewRequestDelayHours,
        clinicReviewUrl: envConfig.clinicReviewUrl ?? currentSettings.clinicReviewUrl,
        clinicMapsUrl: envConfig.clinicMapsUrl ?? currentSettings.clinicMapsUrl
      },
      clinicId: envConfig.clinicId ?? envConfig.organizationId,
      envConfig
    };
  }

  if (!requestedBotConfigId && (!requestedOrganizationId || requestedOrganizationId === currentSettings.organizationId)) {
    return {
      settings: currentSettings,
      clinicId: currentSettings.organizationId,
      envConfig: clinicBotEnvConfigFor(currentSettings)
    };
  }

  return null;
}

function configuredSharedBotUsername(settings: DenteTelegramBotSettings): string | null {
  return normalizedTelegramBotUsername(trimmedEnv("DENTE_TELEGRAM_BOT_USERNAME") || settings.botUsername || null);
}

function configuredClinicOwnedBotUsername(settings: DenteTelegramBotSettings): string | null {
  return normalizedTelegramBotUsername(
    clinicBotEnvConfigFor(settings)?.botUsername ||
      trimmedEnv("DENTE_TELEGRAM_OWN_BOT_USERNAME") ||
      trimmedEnv("DENTE_TELEGRAM_CLINIC_BOT_USERNAME") ||
      settings.ownBotUsername ||
      null
  );
}

function configuredBotUsername(settings: DenteTelegramBotSettings): string | null {
  return settings.mode === "clinic_owned_bot" ? configuredClinicOwnedBotUsername(settings) : configuredSharedBotUsername(settings);
}

function configuredSharedBotToken(): string | null {
  return trimmedEnv("DENTE_TELEGRAM_BOT_TOKEN") || trimmedEnv("TELEGRAM_BOT_TOKEN");
}

function configuredClinicOwnedBotToken(settings: DenteTelegramBotSettings): string | null {
  return (
    clinicBotEnvConfigFor(settings)?.botToken ||
    trimmedEnv("DENTE_TELEGRAM_OWN_BOT_TOKEN") ||
    trimmedEnv("DENTE_TELEGRAM_CLINIC_BOT_TOKEN")
  );
}

function configuredBotToken(settings: DenteTelegramBotSettings): string | null {
  return settings.mode === "clinic_owned_bot" ? configuredClinicOwnedBotToken(settings) : configuredSharedBotToken();
}

function configuredWebhookSecret(settings: DenteTelegramBotSettings): string | null {
  if (settings.mode === "clinic_owned_bot") {
    return (
      clinicBotEnvConfigFor(settings)?.webhookSecret ||
      trimmedEnv("DENTE_TELEGRAM_OWN_WEBHOOK_SECRET") ||
      trimmedEnv("DENTE_TELEGRAM_CLINIC_WEBHOOK_SECRET") ||
      trimmedEnv("DENTE_TELEGRAM_WEBHOOK_SECRET")
    );
  }
  return trimmedEnv("DENTE_TELEGRAM_WEBHOOK_SECRET");
}

function telegramBotConfigId(settings: DenteTelegramBotSettings, botUsername: string | null): string {
  if (settings.mode === "clinic_owned_bot") {
    return `clinic_owned_bot:${settings.organizationId}:${(botUsername ?? "unconfigured").toLowerCase()}`;
  }
  if (settings.mode === "disabled") return `disabled:${settings.organizationId}`;
  return `shared_dente_bot:${settings.organizationId}`;
}

function resolveTelegramRuntimeContext(
  requestedOrganizationId: string | null | undefined = null,
  requestedBotConfigId: string | null | undefined = null
):
  | { ok: true; context: TelegramRuntimeContext }
  | { ok: false; statusCode: number; error: string; message: string } {
  const runtimeSettings = runtimeSettingsForRequestedOrganization(requestedOrganizationId, requestedBotConfigId);
  if (!runtimeSettings) {
    return {
      ok: false,
      statusCode: 404,
      error: "TelegramTenantNotFound",
      message: "Telegram webhook относится к другой организации DENTE."
    };
  }

  const { settings } = runtimeSettings;
  const botUsername =
    settings.mode === "clinic_owned_bot" && runtimeSettings.envConfig?.botUsername
      ? runtimeSettings.envConfig.botUsername
      : configuredBotUsername(settings);
  const botToken =
    settings.mode === "clinic_owned_bot" && runtimeSettings.envConfig?.botToken
      ? runtimeSettings.envConfig.botToken
      : configuredBotToken(settings);
  const webhookSecret =
    settings.mode === "clinic_owned_bot" && runtimeSettings.envConfig?.webhookSecret
      ? runtimeSettings.envConfig.webhookSecret
      : configuredWebhookSecret(settings);
  const tokenConfigured = Boolean(botToken);
  const webhookSecretConfigured = Boolean(webhookSecret);
  const clinicOwnedBotReady = settings.mode === "clinic_owned_bot" && Boolean(botUsername && botToken);

  return {
    ok: true,
    context: {
      settings,
      organizationId: settings.organizationId,
      clinicId: runtimeSettings.clinicId,
      botConfigId: runtimeSettings.envConfig?.botConfigId ?? telegramBotConfigId(settings, botUsername),
      botUsername,
      botToken,
      webhookSecret,
      tokenConfigured,
      webhookSecretConfigured,
      webhookReady: settings.mode !== "disabled" && tokenConfigured && webhookSecretConfigured,
      clinicOwnedBotReady
    }
  };
}

function denteTelegramOutboxRuntimeScope(runtime: TelegramRuntimeContext): DenteTelegramOutboxRuntimeScope {
  return {
    settings: runtime.settings,
    botTokenConfigured: runtime.tokenConfigured,
    botConfigId: runtime.botConfigId,
    clinicId: runtime.clinicId
  };
}

type TelegramResolvedOutboxRuntime = {
  context: TelegramRuntimeContext;
  runtimeScope: DenteTelegramOutboxRuntimeScope;
};

function denteTelegramResolvedOutboxRuntime(runtime: TelegramRuntimeContext): TelegramResolvedOutboxRuntime {
  return {
    context: runtime,
    runtimeScope: denteTelegramOutboxRuntimeScope(runtime)
  };
}

function resolveTelegramOutboxRuntimeScopeFromQuery(query: unknown):
  | { ok: true; runtime: TelegramResolvedOutboxRuntime }
  | { ok: false; statusCode: number; error: string; message: string } {
  const scope = parseTelegramOutboxRuntimeScopeQuery(query);
  const runtimeResult = resolveTelegramRuntimeContext(scope.organizationId, scope.botConfigId);
  if (!runtimeResult.ok) return runtimeResult;
  return { ok: true, runtime: denteTelegramResolvedOutboxRuntime(runtimeResult.context) };
}

function configuredTelegramAdminSecret(): string | null {
  return process.env.DENTE_TELEGRAM_ADMIN_SECRET?.trim() || null;
}

function isExplicitlyUnguardedControlPlaneAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE === "1";
}

async function requireTelegramControlPlaneAccess(request: FastifyRequest, reply: FastifyReply) {
  const adminSecret = configuredTelegramAdminSecret();
  if (!adminSecret) {
    if (isExplicitlyUnguardedControlPlaneAllowed()) {
      return;
    }
    return reply.code(503).send({
      error: "TelegramAdminSecretMissing",
      message: "На сервере не задан секрет администратора для управления Telegram. Для локального стенда можно явно включить режим без проверки в серверных настройках."
    });
  }
  const providedSecret = request.headers[denteAdminSecretHeader];
  const normalizedProvidedSecret = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;
  if (!timingSafeSecretEqual(typeof normalizedProvidedSecret === "string" ? normalizedProvidedSecret : null, adminSecret)) {
    return reply.code(403).send({
      error: "TelegramAdminSecretRequired",
      message: "Для управления Telegram нужен действующий секрет администратора клиники."
    });
  }
}

function configuredSendTimeoutMs(): number {
  const raw = process.env.DENTE_TELEGRAM_SEND_TIMEOUT_MS?.trim();
  if (!raw) return 12_000;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(1000, Math.min(60_000, parsed)) : 12_000;
}

function chatFingerprint(chatId: string | null, organizationId: string): string | null {
  if (!chatId) return null;
  const salt = process.env.DENTE_TELEGRAM_CHAT_HASH_SALT?.trim() || organizationId;
  return createHash("sha256").update(`${salt}:${chatId}`).digest("hex").slice(0, 24);
}

function rejectedTelegramLinkCodeAttemptCount(
  chatFingerprintValue: string | null,
  organizationId: string,
  botConfigId: string,
  nowMs = Date.now()
): number {
  if (!chatFingerprintValue) return 0;
  const windowStartedAt = nowMs - telegramLinkCodeRateLimitWindowMs;
  return listDenteTelegramWebhookEvents(300, organizationId, botConfigId).filter((event) => {
    if (event.chatFingerprint !== chatFingerprintValue) return false;
    if (event.action !== "rejected_telegram_link_code" && event.action !== "rate_limited_telegram_link_code") return false;
    const createdAtMs = Date.parse(event.createdAt);
    return Number.isFinite(createdAtMs) && createdAtMs >= windowStartedAt;
  }).length;
}

function telegramLinkCodeRateLimitExceeded(
  chatFingerprintValue: string | null,
  organizationId: string,
  botConfigId: string
): boolean {
  return rejectedTelegramLinkCodeAttemptCount(chatFingerprintValue, organizationId, botConfigId) >= telegramLinkCodeRejectedAttemptLimit;
}

function normalizeCommand(text: string | null): string | null {
  if (!text?.startsWith("/")) return null;
  const command = text.split(/\s+/)[0]?.toLowerCase() ?? "";
  return command.slice(0, 64) || null;
}

function detectUpdateKind(update: UnknownRecord): DenteTelegramUpdateKind {
  if (isRecord(update.callback_query)) return "callback_query";

  const message =
    (isRecord(update.message) && update.message) ||
    (isRecord(update.edited_message) && update.edited_message) ||
    (isRecord(update.channel_post) && update.channel_post) ||
    null;
  if (!message) return "unsupported";

  if (isRecord(message.voice)) return "voice";
  if (Array.isArray(message.photo) && message.photo.length > 0) return "photo";
  if (isRecord(message.document)) return "document";
  const text = stringFromUnknown(message.text)?.trim() ?? null;
  if (normalizeCommand(text)) return "command";
  if (text) return "message";
  return "unsupported";
}

function extractChatInfo(update: UnknownRecord): TelegramChatInfo | null {
  const candidates = [
    isRecord(update.message) ? update.message : null,
    isRecord(update.edited_message) ? update.edited_message : null,
    isRecord(update.channel_post) ? update.channel_post : null,
    isRecord(update.callback_query) && isRecord(update.callback_query.message) ? update.callback_query.message : null
  ];

  for (const message of candidates) {
    if (!message || !isRecord(message.chat)) continue;
    const id = stringFromUnknown(message.chat.id);
    if (id) {
      return {
        id,
        type: stringFromUnknown(message.chat.type)?.trim().toLowerCase() ?? null
      };
    }
  }
  return null;
}

function extractCommand(update: UnknownRecord): string | null {
  const message = isRecord(update.message) ? update.message : null;
  const text = stringFromUnknown(message?.text)?.trim() ?? null;
  return normalizeCommand(text);
}

function extractCallbackQueryId(update: UnknownRecord): string | null {
  const callbackQuery = isRecord(update.callback_query) ? update.callback_query : null;
  return stringFromUnknown(callbackQuery?.id)?.trim() ?? null;
}

function extractCallbackData(update: UnknownRecord): string | null {
  const callbackQuery = isRecord(update.callback_query) ? update.callback_query : null;
  return stringFromUnknown(callbackQuery?.data)?.trim() ?? null;
}

function extractSafeCallbackAction(update: UnknownRecord): TelegramSafeCallbackAction | null {
  const callbackQuery = isRecord(update.callback_query) ? update.callback_query : null;
  const data = stringFromUnknown(callbackQuery?.data)?.trim() ?? null;
  if (
    data === "dente:start" ||
    data === "dente:help" ||
    data === "dente:clinic" ||
    data === "dente:privacy" ||
    data === "dente:schedule" ||
    data === "dente:documents" ||
    data === "dente:tax" ||
    data === "dente:billing" ||
    data === "dente:medical-docs" ||
    data === "dente:patient-forms" ||
    data === "dente:care" ||
    data === "dente:care-extraction" ||
    data === "dente:care-implant" ||
    data === "dente:care-filling" ||
    data === "dente:care-endo" ||
    data === "dente:care-surgery" ||
    data === "dente:care-anesthesia" ||
    data === "dente:care-hygiene" ||
    data === "dente:care-prosthetics" ||
    data === "dente:care-orthodontics" ||
    data === "dente:care-periodontology" ||
    data === "dente:contact" ||
    data === "dente:review" ||
    data === "dente:map"
  ) {
    return data;
  }
  return null;
}

function extractMessageText(update: UnknownRecord): string | null {
  const message =
    (isRecord(update.message) && update.message) ||
    (isRecord(update.edited_message) && update.edited_message) ||
    (isRecord(update.channel_post) && update.channel_post) ||
    null;
  return stringFromUnknown(message?.text)?.trim() ?? null;
}

type TelegramPortalSection = "home" | "documents" | "tax" | "care" | "schedule" | "billing";

function portalButton(settings: DenteTelegramBotSettings, section: TelegramPortalSection = "home"): TelegramInlineKeyboardRow {
  const raw = settings.patientPortalBaseUrl?.trim();
  if (!raw) return [];
  try {
    const portal = new URL(raw);
    if (portal.protocol !== "https:") return [];
    portal.search = "";
    portal.searchParams.set("dente_source", "telegram");
    portal.searchParams.set("dente_section", section);
    portal.hash = "";
    return [{ text: "Открыть DENTE", url: portal.toString() }];
  } catch {
    return [];
  }
}

function safeHttpsTelegramButton(raw: string | null | undefined, text: string): TelegramInlineKeyboardRow {
  const value = raw?.trim();
  if (!value) return [];
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? [{ text, url: url.toString() }] : [];
  } catch {
    return [];
  }
}

function reviewButtons(settings: DenteTelegramBotSettings): TelegramInlineKeyboardRow {
  return [
    ...safeHttpsTelegramButton(settings.clinicReviewUrl, "Оценить клинику"),
    ...safeHttpsTelegramButton(settings.clinicMapsUrl, "Открыть карту")
  ];
}

function mapButtons(settings: DenteTelegramBotSettings): TelegramInlineKeyboardRow {
  return safeHttpsTelegramButton(settings.clinicMapsUrl, "Открыть карту");
}

function telegramInlineKeyboardRows(markup: Record<string, unknown> | null): TelegramInlineKeyboardRow[] {
  const rows = markup?.inline_keyboard;
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row): row is TelegramInlineKeyboardRow =>
      Array.isArray(row) && row.every((button) => isRecord(button) && typeof button.text === "string")
  );
}

function mainMenuTelegramRow(): TelegramInlineKeyboardRow {
  return [{ text: "Главное меню", callback_data: "dente:start" }];
}

const telegramCareCallbackTopicByAction: Partial<Record<TelegramSafeCallbackAction, DenteTelegramCareRequestTopic>> = {
  "dente:care-extraction": "extraction",
  "dente:care-implant": "implant",
  "dente:care-filling": "filling",
  "dente:care-endo": "endo",
  "dente:care-surgery": "surgery",
  "dente:care-anesthesia": "anesthesia",
  "dente:care-hygiene": "hygiene",
  "dente:care-prosthetics": "prosthetics",
  "dente:care-orthodontics": "orthodontics",
  "dente:care-periodontology": "periodontology"
};

function careTopicFromFreeText(text: string): DenteTelegramCareRequestTopic | null {
  if (freeTextIncludes(text, ["удален", "лунка", "лунку"])) return "extraction";
  if (freeTextIncludes(text, ["имплан"])) return "implant";
  if (freeTextIncludes(text, ["пломб", "реставрац"])) return "filling";
  if (freeTextIncludes(text, ["эндо", "канал", "нерв"])) return "endo";
  if (freeTextIncludes(text, ["хирург", "операц", "шов", "швы"])) return "surgery";
  if (freeTextIncludes(text, ["анестез", "онемен", "онемел"])) return "anesthesia";
  if (freeTextIncludes(text, ["гигиен", "чистк", "профгигиен"])) return "hygiene";
  if (freeTextIncludes(text, ["протез", "коронк", "винир", "мост"])) return "prosthetics";
  if (freeTextIncludes(text, ["ортодонт", "брекет", "элайнер", "капп"])) return "orthodontics";
  if (freeTextIncludes(text, ["пародонт", "десн", "кюретаж"])) return "periodontology";
  return null;
}

function replyMarkupWithNextActions(primaryRows: TelegramInlineKeyboardRow[], settings: DenteTelegramBotSettings): Record<string, unknown> | null {
  const rows = [
    ...primaryRows.filter((row) => row.length),
    ...telegramInlineKeyboardRows(safeCommandKeyboard(settings, "appointment_callback"))
  ];
  return rows.length ? { inline_keyboard: rows } : null;
}

function safeCommandKeyboard(
  settings: DenteTelegramBotSettings,
  mode: "start" | "help" | "clinic" | "privacy" | "linked" | "rejected" | "appointment_callback"
): Record<string, unknown> | null {
  const portal = portalButton(settings, mode === "appointment_callback" || mode === "linked" ? "schedule" : "home");
  const review = reviewButtons(settings);
  const maps = mapButtons(settings);
  const schedule = [{ text: "Расписание", callback_data: "dente:schedule" }];
  const documents = [{ text: "Документы", callback_data: "dente:documents" }];
  const care = [{ text: "Памятки", callback_data: "dente:care" }];
  const contact = [{ text: "Позвать администратора", callback_data: "dente:contact" }];
  const privacy = [{ text: "Конфиденциальность", callback_data: "dente:privacy" }];
  const home = mainMenuTelegramRow();
  if (mode === "appointment_callback") {
    const rows = [[...schedule, ...documents], [...contact, ...privacy], home, portal].filter((row) => row.length);
    return rows.length ? { inline_keyboard: rows } : null;
  }
  if (mode === "linked") {
    const rows = [[...schedule, ...documents], [...care, ...contact], home, portal, review].filter((row) => row.length);
    return rows.length ? { inline_keyboard: rows } : null;
  }
  if (mode === "rejected") {
    return {
      inline_keyboard: [
        [{ text: "Получить QR в клинике", callback_data: "dente:clinic" }],
        [...documents, ...care],
        contact,
        home,
        portal
      ].filter((row) => row.length)
    };
  }
  if (mode === "clinic") {
    return {
      inline_keyboard: [
        portal,
        maps,
        [...schedule, ...contact],
        [
          { text: "Помощь", callback_data: "dente:help" },
          { text: "Конфиденциальность", callback_data: "dente:privacy" }
        ],
        home
      ].filter((row) => row.length)
    };
  }
  if (mode === "privacy") {
    return {
      inline_keyboard: [
        [
          { text: "Что умеет бот", callback_data: "dente:help" },
          { text: "Подключение", callback_data: "dente:clinic" }
        ],
        [...schedule, ...documents],
        care,
        home,
        portal
      ].filter((row) => row.length)
    };
  }

  return {
    inline_keyboard: [
      [
        { text: "Подключить клинику", callback_data: "dente:clinic" },
        { text: "Конфиденциальность", callback_data: "dente:privacy" }
      ],
      [
        { text: "Документы", callback_data: "dente:documents" },
        { text: "Памятки", callback_data: "dente:care" }
      ],
      review.length
        ? review
        : [
            { text: "Отзывы", callback_data: "dente:review" },
            { text: "Карта", callback_data: "dente:map" }
          ],
      [
        { text: "Расписание", callback_data: "dente:schedule" },
        { text: "Позвать администратора", callback_data: "dente:contact" }
      ],
      portal
    ].filter((row) => row.length)
  };
}

function reviewReplyFor(settings: DenteTelegramBotSettings): TelegramWebhookReplyPackage {
  const buttons = reviewButtons(settings);
  if (!buttons.length) {
    return {
      text: "Ссылка для оценки клиники пока не настроена. Попросите администратора добавить ссылку на отзывы или карточку клиники в настройках DENTE.",
      replyMarkup: safeCommandKeyboard(settings, "help")
    };
  }
  return {
    text: "Спасибо за визит. Можно оставить отзыв о клинике по безопасной общей ссылке ниже.",
    replyMarkup: replyMarkupWithNextActions([buttons], settings),
    photoUrl: patientMenuCardPhoto(settings, "review")
  };
}

function mapReplyFor(settings: DenteTelegramBotSettings): TelegramWebhookReplyPackage {
  const buttons = mapButtons(settings);
  if (!buttons.length) {
    return {
      text: "Ссылка на карту клиники пока не настроена. Попросите администратора добавить карточку клиники в настройках DENTE.",
      replyMarkup: safeCommandKeyboard(settings, "clinic")
    };
  }
  return {
    text: "Карта клиники доступна по безопасной общей ссылке ниже.",
    replyMarkup: replyMarkupWithNextActions([buttons], settings),
    photoUrl: patientMenuCardPhoto(settings, "review")
  };
}

function patientMenuCardPhoto(settings: DenteTelegramBotSettings, cardKey: keyof DenteTelegramVisualCardUrls = "mainMenu"): string | null {
  return denteTelegramVisualCardUrlFor(settings, cardKey);
}

function documentsReplyFor(settings: DenteTelegramBotSettings): TelegramWebhookReplyPackage {
  const portal = portalButton(settings, "documents");
  const rows = [
    [
      { text: "Налоговая", callback_data: "dente:tax" },
      { text: "Оплата и чеки", callback_data: "dente:billing" }
    ],
    [
      { text: "Медкарта", callback_data: "dente:medical-docs" }
    ],
    [{ text: "Формы пациента", callback_data: "dente:patient-forms" }],
    portal,
    [
      { text: "Позвать администратора", callback_data: "dente:contact" },
      { text: "Памятки", callback_data: "dente:care" }
    ],
    mainMenuTelegramRow()
  ].filter((row) => row.length);
  return {
    text:
      "DENTE: договоры, согласия, акты, счета, чеки, возвраты и налоговые справки открываются только в защищенном портале клиники. В Telegram доступны уведомления и кнопка перехода, без вложений с медданными.",
    replyMarkup: rows.length ? { inline_keyboard: rows } : safeCommandKeyboard(settings, "help"),
    photoUrl: patientMenuCardPhoto(settings, "documents")
  };
}

function careReplyFor(settings: DenteTelegramBotSettings): TelegramWebhookReplyPackage {
  const portal = portalButton(settings, "care");
  const rows = [
    [
      { text: "После удаления", callback_data: "dente:care-extraction" },
      { text: "После имплантации", callback_data: "dente:care-implant" }
    ],
    [
      { text: "После пломбы", callback_data: "dente:care-filling" },
      { text: "После эндодонтии", callback_data: "dente:care-endo" }
    ],
    [
      { text: "После хирургии", callback_data: "dente:care-surgery" },
      { text: "После анестезии", callback_data: "dente:care-anesthesia" }
    ],
    [
      { text: "После гигиены", callback_data: "dente:care-hygiene" }
    ],
    [
      { text: "После протезирования", callback_data: "dente:care-prosthetics" },
      { text: "После ортодонтии", callback_data: "dente:care-orthodontics" }
    ],
    [
      { text: "После пародонтологии", callback_data: "dente:care-periodontology" }
    ],
    portal,
    [
      { text: "Документы", callback_data: "dente:documents" },
      { text: "Позвать администратора", callback_data: "dente:contact" }
    ],
    mainMenuTelegramRow()
  ].filter((row) => row.length);
  return {
    text:
      "DENTE: памятки после удаления, имплантации, пломбы, эндодонтии, хирургии, анестезии, гигиены, протезирования, ортодонтии и пародонтологии выдаются в портале после оформления приема. Выберите нужную памятку кнопкой ниже; бот присылает безопасное уведомление и кнопку, когда памятка готова.",
    replyMarkup: rows.length ? { inline_keyboard: rows } : safeCommandKeyboard(settings, "help"),
    photoUrl: patientMenuCardPhoto(settings, "care")
  };
}

function documentSubmenuReplyFor(
  settings: DenteTelegramBotSettings,
  topic: "tax" | "billing" | "medical" | "patientForms",
  requestResult?: { text: string; linked: boolean } | null
): TelegramWebhookReplyPackage {
  const portal = portalButton(settings, topic === "tax" ? "tax" : topic === "billing" ? "billing" : "documents");
  const texts = {
    tax:
      "Налоговая: DENTE помогает подготовить заявление, данные для КНД 1151156, старую справку для расходов 2021-2023 и реестр оплат. Нужны фискальные чеки и данные плательщика. Готовые справки открываются в защищенном портале.",
    billing:
      "Оплата и чеки: DENTE помогает подготовить счет, чек, акт выполненных работ, график рассрочки или запрос на корректировку/возврат. Суммы и документы выдаются только через защищенный портал после проверки администратором.",
    medical:
      "Медкарта: выписка, запрос копий, расписка выдачи, DICOM/КЛКТ и другие медицинские документы готовятся в DENTE и выдаются через защищенный портал после проверки личности и полномочий.",
    patientForms:
      "Формы пациента: анкета, согласия, отказ, ПДн, представитель, фото/видео и документы визита заполняются в DENTE. Если нужна бумажная копия или помощь, нажмите кнопку администратора."
  };
  const rows = [
    portal,
    requestResult && !requestResult.linked
      ? [
          { text: "Как получить код", callback_data: "dente:clinic" },
          { text: "Документы", callback_data: "dente:documents" }
        ]
      : [
          { text: "Документы", callback_data: "dente:documents" },
          { text: "Позвать администратора", callback_data: "dente:contact" }
        ],
    mainMenuTelegramRow()
  ].filter((row) => row.length);
  return {
    text: [texts[topic], requestResult?.text].filter(Boolean).join("\n\n"),
    replyMarkup: rows.length ? { inline_keyboard: rows } : safeCommandKeyboard(settings, "help"),
    photoUrl: patientMenuCardPhoto(settings, topic === "tax" ? "tax" : topic === "billing" ? "billing" : "documents")
  };
}

function careTopicReplyFor(
  settings: DenteTelegramBotSettings,
  topic: DenteTelegramCareRequestTopic,
  requestResult?: ReturnType<typeof createDenteTelegramCareRequest>
): TelegramWebhookReplyPackage {
  const portal = portalButton(settings, "care");
  const texts: Record<DenteTelegramCareRequestTopic, string> = {
    extraction:
      "После удаления: не грейте область, не полощите активно первые сутки, не трогайте лунку, не курите и не употребляйте алкоголь. При нарастающей боли, отеке, температуре или кровотечении свяжитесь с клиникой.",
    implant:
      "После имплантации: соблюдайте холод и покой по назначению, не перегружайте область, принимайте препараты только по схеме врача. При боли, отеке, подвижности, температуре или кровотечении нажмите администратора.",
    filling:
      "После пломбы: дождитесь окончания анестезии перед едой, избегайте сильной нагрузки на зуб в первые часы. Если мешает прикус, есть боль при накусывании или чувствительность усиливается, свяжитесь с клиникой.",
    endo:
      "После эндодонтии: возможна чувствительность при накусывании. Не перегружайте зуб, соблюдайте схему препаратов врача и не затягивайте с постоянной реставрацией. При нарастающей боли, отеке или температуре нажмите администратора.",
    surgery:
      "После хирургии: не грейте область, не трогайте швы, не полощите активно первые сутки, соблюдайте ограничения и назначения врача. При кровотечении, температуре, нарастающем отеке или сильной боли нажмите администратора.",
    anesthesia:
      "После анестезии: не ешьте, пока сохраняется онемение, чтобы не травмировать щеку или язык. Если онемение держится необычно долго, боль усиливается или появилась аллергическая реакция, нажмите администратора.",
    hygiene:
      "После профгигиены: мягкая щетка, аккуратная гигиена, временно избегайте красящей пищи по рекомендации врача. Если десна кровит долго или боль усиливается, нажмите администратора.",
    prosthetics:
      "После протезирования: привыкайте к конструкции постепенно, не перегружайте ее твердой пищей и не корректируйте самостоятельно. Если коронка, мост, винир или протез мешает, натирает или расцементировался, нажмите администратора.",
    orthodontics:
      "После ортодонтии: соблюдайте режим ношения аппарата или элайнеров, используйте назначенный уход и не подкручивайте элементы без врача. Если брекет отклеился, дуга колет или аппарат натирает, нажмите администратора.",
    periodontology:
      "После пародонтологии: аккуратно очищайте десны по схеме врача, не пропускайте назначенные средства и контроль. Если кровоточивость, отек, боль или неприятный запах усиливаются, нажмите администратора."
  };
  const rows = [
    portal,
    [
      { text: "Все памятки", callback_data: "dente:care" },
      { text: "Позвать администратора", callback_data: "dente:contact" }
    ],
    mainMenuTelegramRow()
  ].filter((row) => row.length);
  return {
    text: [texts[topic], requestResult?.text].filter(Boolean).join("\n\n"),
    replyMarkup: rows.length ? { inline_keyboard: rows } : safeCommandKeyboard(settings, "help"),
    photoUrl: patientMenuCardPhoto(settings, "care")
  };
}

function contactRequestReplyFor(
  settings: DenteTelegramBotSettings,
  chatFingerprintValue: string | null,
  scope: TelegramRequestScope = {}
): TelegramWebhookReplyPackage {
  const result = createDenteTelegramContactRequest(chatFingerprintValue, scope);
  const portal = portalButton(settings);
  const rows = [
    portal,
    result.linked
      ? [
          { text: "Расписание", callback_data: "dente:schedule" },
          { text: "Документы", callback_data: "dente:documents" }
        ]
      : [{ text: "Как получить код", callback_data: "dente:clinic" }],
    [{ text: "Помощь", callback_data: "dente:help" }],
    mainMenuTelegramRow()
  ].filter((row) => row.length);
  return {
    text: result.text,
    replyMarkup: rows.length ? { inline_keyboard: rows } : safeCommandKeyboard(settings, result.linked ? "linked" : "rejected"),
    photoUrl: patientMenuCardPhoto(settings, "mainMenu")
  };
}

function telegramFeatureEnabled(settings: DenteTelegramBotSettings, feature: DenteTelegramFeature): boolean {
  return settings.enabledFeatures.includes(feature);
}

function featureDisabledReplyFor(settings: DenteTelegramBotSettings, title: string): TelegramWebhookReplyPackage {
  return {
    text: `${title} сейчас отключены в настройках клиники DENTE. Выберите доступное действие кнопками ниже или позовите администратора.`,
    replyMarkup: safeCommandKeyboard(settings, "help"),
    photoUrl: patientMenuCardPhoto(settings, "mainMenu")
  };
}

function unsafeTelegramAttachmentReplyFor(settings: DenteTelegramBotSettings, updateKind: DenteTelegramUpdateKind): TelegramWebhookReplyPackage {
  const label =
    updateKind === "voice"
      ? "Голосовые сообщения"
      : updateKind === "photo"
        ? "Фото и снимки"
        : "PDF, документы и файлы";
  return {
    text: `${label} в Telegram не принимаются как медицинские документы DENTE. Откройте защищенный портал или выберите кнопку: документы, памятки или администратор. Так клиника не потеряет файл и не смешает его с чужой картой.`,
    replyMarkup: safeCommandKeyboard(settings, "help"),
    photoUrl: patientMenuCardPhoto(settings, "documents")
  };
}

function normalizedFreeText(value: string | null): string {
  return value?.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е") ?? "";
}

function freeTextIncludes(value: string, fragments: string[]): boolean {
  return fragments.some((fragment) => value.includes(fragment));
}

function freeTextReplyFor(
  settings: DenteTelegramBotSettings,
  chatFingerprintValue: string | null,
  messageText: string | null,
  scope: TelegramRequestScope = {}
): TelegramWebhookReplyPackage {
  const text = normalizedFreeText(messageText);
  if (
    freeTextIncludes(text, ["налог", "ндфл", "вычет", "кнд", "1151156"]) ||
    (freeTextIncludes(text, ["справк"]) && freeTextIncludes(text, ["оплат", "чек", "фиск"]))
  ) {
    return telegramFeatureEnabled(settings, "tax_document_request")
      ? documentSubmenuReplyFor(settings, "tax", createDenteTelegramDocumentRequest(chatFingerprintValue, "tax", scope))
      : featureDisabledReplyFor(settings, "Налоговые запросы");
  }
  if (freeTextIncludes(text, ["оплат", "счет", "счёт", "чек", "квитанц", "возврат", "рассроч", "акт"])) {
    return telegramFeatureEnabled(settings, "secure_portal_links")
      ? documentSubmenuReplyFor(settings, "billing", createDenteTelegramDocumentRequest(chatFingerprintValue, "billing", scope))
      : featureDisabledReplyFor(settings, "Финансовые документы");
  }
  if (freeTextIncludes(text, ["медкарт", "выписк", "копи", "dicom", "клкт", "кт", "снимк"])) {
    return telegramFeatureEnabled(settings, "secure_portal_links")
      ? documentSubmenuReplyFor(settings, "medical", createDenteTelegramDocumentRequest(chatFingerprintValue, "medical", scope))
      : featureDisabledReplyFor(settings, "Медицинские документы");
  }
  if (freeTextIncludes(text, ["соглас", "анкета", "форма", "пдн", "персонал"])) {
    return telegramFeatureEnabled(settings, "secure_portal_links")
      ? documentSubmenuReplyFor(settings, "patientForms", createDenteTelegramDocumentRequest(chatFingerprintValue, "patientForms", scope))
      : featureDisabledReplyFor(settings, "Формы пациента");
  }
  if (freeTextIncludes(text, ["документ", "договор", "акт"])) {
    return documentsReplyFor(settings);
  }
  const careTopic = careTopicFromFreeText(text);
  if (careTopic) {
    return telegramFeatureEnabled(settings, "post_visit_instructions")
      ? careTopicReplyFor(settings, careTopic, createDenteTelegramCareRequest(chatFingerprintValue, careTopic, scope))
      : featureDisabledReplyFor(settings, "Памятки после приема");
  }
  if (freeTextIncludes(text, ["памят", "рекоменд", "удален", "имплан", "пломб", "гигиен", "после"])) {
    return telegramFeatureEnabled(settings, "post_visit_instructions")
      ? careReplyFor(settings)
      : featureDisabledReplyFor(settings, "Памятки после приема");
  }
  if (freeTextIncludes(text, ["распис", "запис", "прием", "визит", "время"])) {
    const scheduleReply = buildDenteTelegramLinkedScheduleReply(chatFingerprintValue, scope, settings);
    return {
      text: scheduleReply.text,
      replyMarkup: scheduleReply.replyMarkup ?? safeCommandKeyboard(settings, scheduleReply.linked ? "linked" : "rejected"),
      photoUrl: patientMenuCardPhoto(settings, "appointment")
    };
  }
  if (freeTextIncludes(text, ["звон", "перезвон", "админ", "оператор", "связ", "боль", "отек", "кров", "температур"])) {
    return contactRequestReplyFor(settings, chatFingerprintValue, scope);
  }
  if (freeTextIncludes(text, ["отзыв", "оцен", "рейтинг"])) return reviewReplyFor(settings);
  if (freeTextIncludes(text, ["адрес", "карта", "как добраться", "где вы"])) return mapReplyFor(settings);
  return {
    text: "DENTE принял сообщение. Чтобы клиника быстро поняла запрос, выберите действие кнопками ниже. Команды писать не нужно.",
    replyMarkup: safeCommandKeyboard(settings, "help"),
    photoUrl: patientMenuCardPhoto(settings, "mainMenu")
  };
}

function suggestedReplyFor(
  command: string | null,
  callbackAction: TelegramSafeCallbackAction | null,
  settings: DenteTelegramBotSettings,
  chatFingerprintValue: string | null,
  updateKind: DenteTelegramUpdateKind,
  messageText: string | null,
  scope: TelegramRequestScope = {}
): TelegramWebhookReplyPackage {
  const portal = settings.patientPortalBaseUrl || "защищенный портал DENTE";
  const normalizedCommand = command?.split("@")[0] ?? null;

  if (updateKind === "photo" || updateKind === "document" || (updateKind === "voice" && !settings.allowVoiceIntake)) {
    return unsafeTelegramAttachmentReplyFor(settings, updateKind);
  }

  if (normalizedCommand === "/start" || callbackAction === "dente:start") {
    const linkedStartReply = buildDenteTelegramLinkedScheduleReply(chatFingerprintValue, scope, settings);
    if (linkedStartReply.linked) {
      return {
        text:
          linkedStartReply.subjectType === "staff"
            ? "DENTE: рабочий Telegram подключен. Выберите расписание, связь или откройте защищенный DENTE-портал. ФИО пациентов и медицинские детали в Telegram не отправляются."
            : "DENTE: Telegram подключен к клинике. Выберите расписание, документы, памятки или связь с администратором кнопками ниже. Медицинские документы открываются только в защищенном портале.",
        replyMarkup:
          linkedStartReply.subjectType === "staff"
            ? linkedStartReply.replyMarkup ?? safeCommandKeyboard(settings, "linked")
            : safeCommandKeyboard(settings, "linked"),
        photoUrl: patientMenuCardPhoto(settings, linkedStartReply.subjectType === "staff" ? "staff" : "mainMenu")
      };
    }
    return {
      text: "Бот DENTE подключен. Отсканируйте QR из приложения клиники или отправьте одноразовый код вручную, чтобы безопасно привязать чат. Дальше выбирайте действия кнопками ниже; команды нужны только как запасной вариант. Медицинские документы открываются только в защищенном портале.",
      replyMarkup: safeCommandKeyboard(settings, "start"),
      photoUrl: patientMenuCardPhoto(settings, "mainMenu")
    };
  }
  if (normalizedCommand === "/help" || callbackAction === "dente:help") {
    return {
      text: "DENTE работает кнопками: расписание, документы, памятки, связь с администратором, отзыв и карта клиники. Команды остаются запасным вариантом. Медицинские данные в Telegram не отправляются.",
      replyMarkup: safeCommandKeyboard(settings, "help"),
      photoUrl: patientMenuCardPhoto(settings, "mainMenu")
    };
  }
  if (normalizedCommand === "/privacy" || callbackAction === "dente:privacy") {
    return {
      text: "DENTE по умолчанию не отправляет диагнозы, КТ, рентген, планы лечения и налоговые PDF через Telegram. В Telegram уходят только безопасные уведомления и ссылки.",
      replyMarkup: safeCommandKeyboard(settings, "privacy"),
      photoUrl: patientMenuCardPhoto(settings, "mainMenu")
    };
  }
  if (normalizedCommand === "/clinic" || callbackAction === "dente:clinic") {
    return {
      text: `Попросите администратора открыть DENTE и показать QR-код подключения. QR сам откроет бот с одноразовым кодом; если камера недоступна, код можно отправить сюда вручную. Портал клиники: ${portal}.`,
      replyMarkup: safeCommandKeyboard(settings, "clinic"),
      photoUrl: patientMenuCardPhoto(settings, "mainMenu")
    };
  }
  if (normalizedCommand === "/schedule" || normalizedCommand === "/appointments" || callbackAction === "dente:schedule") {
    const scheduleReply = buildDenteTelegramLinkedScheduleReply(chatFingerprintValue, scope, settings);
    return {
      text: scheduleReply.text,
      replyMarkup: scheduleReply.replyMarkup ?? safeCommandKeyboard(settings, scheduleReply.linked ? "linked" : "rejected"),
      photoUrl: patientMenuCardPhoto(settings, "appointment")
    };
  }
  if (normalizedCommand === "/documents" || normalizedCommand === "/docs" || callbackAction === "dente:documents") {
    return documentsReplyFor(settings);
  }
  if (callbackAction === "dente:tax") {
    if (!telegramFeatureEnabled(settings, "tax_document_request")) return featureDisabledReplyFor(settings, "Налоговые запросы");
    return documentSubmenuReplyFor(settings, "tax", createDenteTelegramDocumentRequest(chatFingerprintValue, "tax", scope));
  }
  if (callbackAction === "dente:billing") {
    if (!telegramFeatureEnabled(settings, "secure_portal_links")) return featureDisabledReplyFor(settings, "Финансовые документы");
    return documentSubmenuReplyFor(settings, "billing", createDenteTelegramDocumentRequest(chatFingerprintValue, "billing", scope));
  }
  if (callbackAction === "dente:medical-docs") {
    if (!telegramFeatureEnabled(settings, "secure_portal_links")) return featureDisabledReplyFor(settings, "Медицинские документы");
    return documentSubmenuReplyFor(settings, "medical", createDenteTelegramDocumentRequest(chatFingerprintValue, "medical", scope));
  }
  if (callbackAction === "dente:patient-forms") {
    if (!telegramFeatureEnabled(settings, "secure_portal_links")) return featureDisabledReplyFor(settings, "Формы пациента");
    return documentSubmenuReplyFor(
      settings,
      "patientForms",
      createDenteTelegramDocumentRequest(chatFingerprintValue, "patientForms", scope)
    );
  }
  if (
    normalizedCommand === "/care" ||
    normalizedCommand === "/instructions" ||
    normalizedCommand === "/recommendations" ||
    callbackAction === "dente:care"
  ) {
    if (!telegramFeatureEnabled(settings, "post_visit_instructions")) return featureDisabledReplyFor(settings, "Памятки после приема");
    return careReplyFor(settings);
  }
  const callbackCareTopic = callbackAction ? telegramCareCallbackTopicByAction[callbackAction] : null;
  if (callbackCareTopic) {
    if (!telegramFeatureEnabled(settings, "post_visit_instructions")) return featureDisabledReplyFor(settings, "Памятки после приема");
    return careTopicReplyFor(
      settings,
      callbackCareTopic,
      createDenteTelegramCareRequest(chatFingerprintValue, callbackCareTopic, scope)
    );
  }
  if (normalizedCommand === "/contact" || normalizedCommand === "/call" || callbackAction === "dente:contact") {
    return contactRequestReplyFor(settings, chatFingerprintValue, scope);
  }
  if (normalizedCommand === "/review" || callbackAction === "dente:review") {
    return reviewReplyFor(settings);
  }
  if (normalizedCommand === "/map" || normalizedCommand === "/maps" || callbackAction === "dente:map") {
    return mapReplyFor(settings);
  }
  if (!command && !callbackAction) return freeTextReplyFor(settings, chatFingerprintValue, messageText, scope);
  return {
    text: "DENTE принял сообщение. Выберите безопасное действие кнопками ниже.",
    replyMarkup: safeCommandKeyboard(settings, "help"),
    photoUrl: patientMenuCardPhoto(settings, "mainMenu")
  };
}

function buildStatus(requestedOrganizationId: string | null = null, requestedBotConfigId: string | null = null) {
  const runtimeResult = resolveTelegramRuntimeContext(requestedOrganizationId, requestedBotConfigId);
  if (!runtimeResult.ok) {
    throw new Error(runtimeResult.message);
  }
  const runtime = runtimeResult.context;
  const settings = runtime.settings;
  const isPrimaryRuntime = runtime.organizationId === getDenteTelegramBotSettings().organizationId;
  const warnings: string[] = [];
  const nextActions: string[] = [];

  if (settings.mode !== "disabled" && !runtime.tokenConfigured && settings.mode !== "clinic_owned_bot") {
    warnings.push("Бот Telegram не подключен в серверных настройках DENTE.");
    nextActions.push("Подключите секрет бота в серверных настройках клиники; не храните его в браузере, документации или клиентском коде.");
  }
  if (settings.mode !== "disabled" && !runtime.webhookSecretConfigured) {
    warnings.push("Защита вебхука Telegram не включена; входящие события должны приниматься только с серверным секретом.");
    nextActions.push("Сгенерируйте секрет вебхука и подключите его в серверных настройках Telegram.");
  }
  if (settings.mode === "clinic_owned_bot" && !runtime.clinicOwnedBotReady) {
    warnings.push("Собственный бот клиники включен, но не готов: добавьте имя бота и его секрет в серверные настройки.");
    nextActions.push("Проверьте имя собственного бота и серверную запись с его секретом для выбранной клиники.");
  }
  if (settings.privacyMode !== "no_phi_by_default") {
    warnings.push("Telegram-шаблоны с медданными требуют авторизацию, согласия и tenant-policy до production.");
  }
  if (!settings.patientPortalBaseUrl) {
    nextActions.push("Укажите patientPortalBaseUrl перед отправкой ссылок на готовые документы и налоговые документы.");
  }

  return denteTelegramBotStatusSchema.parse(readableTelegramPayload({
    settings,
    organizationId: runtime.organizationId,
    clinicId: runtime.clinicId,
    botConfigId: runtime.botConfigId,
    mode: settings.mode,
    botUsername: runtime.botUsername,
    tokenConfigured: runtime.tokenConfigured,
    webhookSecretConfigured: runtime.webhookSecretConfigured,
    webhookReady: runtime.webhookReady,
    clinicOwnedBotReady: runtime.clinicOwnedBotReady,
    warnings,
    nextActions,
    processedUpdateCount: listDenteTelegramWebhookEvents(300, runtime.organizationId, runtime.botConfigId).filter((event) => event.status === "processed").length,
    pendingLinkCodeCount: isPrimaryRuntime ? listDenteTelegramLinkCodes(100).filter((code) => code.status === "pending").length : 0,
    activeChatLinkCount: isPrimaryRuntime ? listDenteTelegramChatLinks(100).filter((link) => link.status === "active").length : 0,
    recentEvents: listDenteTelegramWebhookEvents(50, runtime.organizationId, runtime.botConfigId)
  }));
}

function buildFeaturePlan(settings: DenteTelegramBotSettings) {
  return readableTelegramPayload({
    productName: "DENTE",
    botUsername: configuredBotUsername(settings),
    modes: [
      "shared_dente_bot: общий платформенный бот, клиника определяется по одноразовому коду",
      "clinic_owned_bot: собственный бот клиники; имя в настройках, секрет только в серверной конфигурации"
    ],
    enabledFeatures: settings.enabledFeatures,
    releaseReadyLayers: [
      "linking: одноразовые QR/deep-link коды",
      "outbox: безопасная очередь напоминаний с причинами блокировки",
      "transport: отправка идет только через подключенного бота и защищенную связку чата",
      "audit: webhook-события и коммуникации остаются в DENTE"
    ],
    patientSafeActions: [
      "одноразовый код привязки",
      "подтверждение приема",
      "перенос приема или запрос звонка",
      "уведомление о готовности документа через ссылку на защищенный портал",
      "статус налогового запроса без передачи PDF",
      "общие памятки после визита по утвержденным шаблонам"
    ],
    staffSafeActions: [
      "ежедневная сводка расписания",
      "очередь подтверждений",
      "эскалация задач связи",
      "счетчики готовности документов без тела документов",
      "маршрутизация запросов обратного звонка"
    ],
    blockedByDefault: [
      "текст диагноза",
      "номера зубов и детали лечения",
      "передача DICOM/КЛКТ/рентгена/фото",
      "налоговые PDF и копии медкарты как файлы Telegram",
      "свободные клинические рекомендации"
    ]
  });
}

async function sendWebhookSuggestedReply(
  chatId: string | null,
  suggestedReply: TelegramWebhookReplyPackage,
  botToken: string | null
): Promise<string | null> {
  if (!chatId || !suggestedReply.text?.trim()) return null;
  if (!botToken) return "Ответ Telegram не отправлен: токен бота не настроен.";
  const text = repairMojibakeText(suggestedReply.text);
  const replyMarkup = readableTelegramPayload(suggestedReply.replyMarkup);
  const photoUrl = suggestedReply.photoUrl?.trim();

  if (photoUrl) {
    const photoResult = await sendTelegramPhotoMessage({
      botToken,
      chatId,
      photoUrl,
      caption: text,
      replyMarkup,
      timeoutMs: Math.min(configuredSendTimeoutMs(), 5000)
    });

    if (photoResult.ok) return null;
  }

  const result = await sendTelegramTextMessage({
    botToken,
    chatId,
    text,
    replyMarkup,
    timeoutMs: Math.min(configuredSendTimeoutMs(), 5000)
  });

  if (result.ok) return null;
  return telegramWebhookReplyFailureWarning(result);
}

async function handleWebhook(
  request: FastifyRequest<{ Params: { organizationId?: string; botConfigId?: string } }>,
  reply: FastifyReply
) {
  const runtimeResult = resolveTelegramRuntimeContext(request.params.organizationId ?? null, request.params.botConfigId ?? null);
  if (!runtimeResult.ok) {
    return reply.code(runtimeResult.statusCode).send({
      ok: false,
      error: runtimeResult.error,
      message: runtimeResult.message
    });
  }
  const runtime = runtimeResult.context;
  const settings = runtime.settings;
  const expectedSecret = runtime.webhookSecret;
  const providedSecret = stringFromUnknown(request.headers[telegramSecretHeader]) ?? null;

  if (!expectedSecret && process.env.NODE_ENV === "production") {
    return reply.code(503).send({
      ok: false,
      error: "TelegramWebhookSecretRequired"
    });
  }

  if (expectedSecret && !timingSafeSecretEqual(providedSecret, expectedSecret)) {
    return reply.code(401).send({
      ok: false,
      error: "TelegramWebhookSecretMismatch"
    });
  }

  if (settings.mode === "disabled") {
    return denteTelegramWebhookResponseSchema.parse(readableTelegramPayload({
      ok: true,
      duplicate: false,
      action: "ignored_telegram_disabled",
      suggestedReply: null,
      warnings: ["Telegram отключен в настройках клиники; update не обработан, код привязки не использован."],
      event: null
    }));
  }

  const parsedUpdate = parseTelegramRouteBody(denteTelegramWebhookUpdateSchema, request.body);
  if (!parsedUpdate.ok) {
    return reply.code(400).send({
      ok: false,
      error: "TelegramWebhookValidationFailed",
      message: parsedUpdate.message
    });
  }
  const update = parsedUpdate.value as UnknownRecord & { update_id: number };
  if (hasDenteTelegramWebhookUpdate(update.update_id, runtime.organizationId, runtime.botConfigId)) {
    return denteTelegramWebhookResponseSchema.parse({
      ok: true,
      duplicate: true,
      action: "ignored_duplicate_update",
      suggestedReply: null,
      warnings: [],
      event: null
    });
  }

  const updateKind = detectUpdateKind(update);
  const callbackData = extractCallbackData(update);
  const callbackAction = extractSafeCallbackAction(update);
  const callbackQueryId = extractCallbackQueryId(update);
  const command =
    extractCommand(update) ??
    (callbackData?.startsWith("d1.") ? "/callback:appointment" : callbackAction ? `/callback:${callbackAction.replace("dente:", "")}` : null);
  const chatInfo = extractChatInfo(update);
  const chatId = chatInfo?.id ?? null;
  const chatType = chatInfo?.type ?? null;
  const messageText = extractMessageText(update);
  const suppressPublicChatReply = Boolean(chatType && chatType !== "private");
  const chatHash = chatFingerprint(chatId, runtime.organizationId);
  const webhookClaim = claimDenteTelegramWebhookUpdate({
    updateId: update.update_id,
    organizationId: runtime.organizationId,
    botConfigId: runtime.botConfigId,
    chatFingerprint: chatHash,
    updateKind,
    command
  });
  if (!webhookClaim.claimed) {
    return denteTelegramWebhookResponseSchema.parse({
      ok: true,
      duplicate: true,
      action: "ignored_duplicate_update",
      suggestedReply: null,
      warnings: [],
      event: null
    });
  }
  const appointmentCallbackResult = handleDenteTelegramAppointmentCallback({
    callbackData,
    chatFingerprint: chatHash,
    organizationId: runtime.organizationId,
    clinicId: runtime.clinicId,
    botConfigId: runtime.botConfigId
  });
  const linkCode = appointmentCallbackResult.handled ? null : extractDenteTelegramLinkCode(messageText);
  const linkCodeRejectedByChatType = Boolean(linkCode && chatType !== "private");
  const linkCodeRejectedByRateLimit = Boolean(
    linkCode && !linkCodeRejectedByChatType && telegramLinkCodeRateLimitExceeded(chatHash, runtime.organizationId, runtime.botConfigId)
  );
  const linkResult =
    linkCode && !linkCodeRejectedByChatType && !linkCodeRejectedByRateLimit
      ? consumeDenteTelegramLinkCode(linkCode, chatHash, chatId, {
          organizationId: runtime.organizationId,
          clinicId: runtime.clinicId,
          botConfigId: runtime.botConfigId
        })
      : null;
  const warnings = [
    ...webhookClaim.event.warnings,
    ...appointmentCallbackResult.warnings,
    ...(expectedSecret ? [] : ["Webhook secret не настроен; update принимается только для локальной разработки."])
  ];

  if (linkCodeRejectedByChatType) {
    warnings.push("Одноразовый код Telegram можно использовать только в личном чате с ботом; привязка в группах и каналах заблокирована.");
  }
  if (linkCodeRejectedByRateLimit) {
    warnings.push("Слишком много неверных кодов Telegram-привязки за короткое время; прием кодов для этого чата временно ограничен.");
  }
  if (updateKind === "voice" && !settings.allowVoiceIntake) {
    warnings.push("Голосовой ввод отключен; аудио из Telegram не должно попадать в медицинскую запись по умолчанию.");
  }
  if (updateKind === "photo" || updateKind === "document") {
    warnings.push("Передача файлов Telegram не принимается для меддокументов и снимков в безопасной политике по умолчанию.");
  }
  if (linkResult && !linkResult.ok) {
    if (linkResult.reason === "chat_encryption_key_missing") {
      warnings.push("Защищенная связка Telegram-чата не настроена; одноразовый код Telegram не был использован.");
    } else if (linkResult.reason === "missing_chat_transport" || linkResult.reason === "chat_encryption_failed") {
      warnings.push("Чат Telegram не удалось сохранить в защищенной связке; одноразовый код Telegram не был использован.");
    } else {
      warnings.push("Одноразовый код Telegram неверный, истек, уже использован или отозван.");
    }
  }

  const action =
    appointmentCallbackResult.handled
      ? appointmentCallbackResult.action
      : linkCodeRejectedByChatType
      ? "rejected_non_private_telegram_link_chat"
      : linkCodeRejectedByRateLimit
        ? "rate_limited_telegram_link_code"
      : suppressPublicChatReply
        ? "rejected_non_private_telegram_chat"
      : linkResult?.ok === true
      ? `linked_${linkResult.subjectType}_telegram_chat`
      : linkResult
        ? "rejected_telegram_link_code"
        : updateKind === "unsupported"
          ? "ignored_unsupported_update"
          : "queued_safe_triage";
  const suggestedReply =
    appointmentCallbackResult.handled
      ? {
          text: appointmentCallbackResult.suggestedReply,
          replyMarkup: safeCommandKeyboard(settings, "appointment_callback"),
          photoUrl: patientMenuCardPhoto(settings, "appointment")
        }
      : linkCodeRejectedByRateLimit
      ? {
          text: null,
          replyMarkup: null
        }
      : linkCodeRejectedByChatType || suppressPublicChatReply
      ? {
          text: linkCodeRejectedByChatType
            ? "Код DENTE не принят в публичном чате. Откройте личный чат с ботом и попросите клинику показать QR подключения или отправьте одноразовый код там."
            : "DENTE отвечает только в личном чате с ботом. Откройте личный чат, чтобы подключить уведомления клиники.",
          replyMarkup: safeCommandKeyboard(settings, "rejected"),
          photoUrl: patientMenuCardPhoto(settings, "mainMenu")
        }
      : linkResult?.ok === true
      ? {
          text: "Привязка DENTE завершена. Telegram будет получать только безопасные уведомления клиники. Медицинские документы остаются в защищенном портале.",
          replyMarkup: safeCommandKeyboard(settings, "linked"),
          photoUrl: patientMenuCardPhoto(settings, "mainMenu")
        }
      : linkResult
        ? {
            text:
              linkResult.reason === "chat_encryption_key_missing" ||
              linkResult.reason === "missing_chat_transport" ||
              linkResult.reason === "chat_encryption_failed"
                ? "DENTE временно не может безопасно привязать Telegram. Попросите клинику проверить настройки бота и повторить код после исправления."
                : "Код DENTE не принят. Попросите клинику показать новый QR подключения или выдать новый одноразовый код.",
            replyMarkup: safeCommandKeyboard(settings, "rejected"),
            photoUrl: patientMenuCardPhoto(settings, "mainMenu")
          }
        : suggestedReplyFor(command, callbackAction, settings, chatHash, updateKind, messageText, {
            organizationId: runtime.organizationId,
            clinicId: runtime.clinicId,
            botConfigId: runtime.botConfigId
          });

  const botToken = runtime.botToken;
  if (callbackQueryId && botToken) {
    const callbackAnswer = await answerTelegramCallbackQuery({
      botToken,
      callbackQueryId,
      text: appointmentCallbackResult.handled ? appointmentCallbackResult.callbackAnswerText : "DENTE: безопасный ответ отправлен.",
      timeoutMs: Math.min(configuredSendTimeoutMs(), 5000)
    });
    if (!callbackAnswer.ok) warnings.push(telegramCallbackTransportFailureWarning(callbackAnswer));
  }

  const replyWarning = suppressPublicChatReply ? null : await sendWebhookSuggestedReply(chatId, suggestedReply, runtime.botToken);
  if (suppressPublicChatReply) {
    warnings.push("Ответ Telegram не отправлен в группу или канал: DENTE отвечает только в личном чате.");
  }
  if (replyWarning) warnings.push(replyWarning);

  const event = recordDenteTelegramWebhookEvent({
    updateId: update.update_id,
    organizationId: runtime.organizationId,
    botConfigId: runtime.botConfigId,
    chatFingerprint: chatHash,
    updateKind,
    command,
    status:
      (appointmentCallbackResult.handled && !appointmentCallbackResult.ok) ||
      linkCodeRejectedByChatType ||
      linkCodeRejectedByRateLimit ||
      suppressPublicChatReply ||
      (linkResult ? !linkResult.ok : false)
        ? "rejected"
        : updateKind === "unsupported"
          ? "ignored"
          : "processed",
    action,
    warnings
  });

  return denteTelegramWebhookResponseSchema.parse(readableTelegramPayload({
    ok: true,
    duplicate: false,
    action: event.action,
    suggestedReply: readableTelegramText(suggestedReply.text),
    suggestedReplyMarkup: readableTelegramPayload(suggestedReply.replyMarkup),
    suggestedPhotoUrl: suggestedReply.photoUrl?.trim() || null,
    warnings,
    event
  }));
}

export async function registerTelegramWebhookRoutes(app: FastifyInstance) {
  app.post("/api/telegram/webhook", handleWebhook);
  app.post("/api/telegram/webhook/:organizationId/:botConfigId", handleWebhook);
  app.post("/api/telegram/webhook/:organizationId", handleWebhook);
}

export async function registerTelegramRoutes(app: FastifyInstance) {
  const telegramControlPlaneRouteOptions = { preHandler: requireTelegramControlPlaneAccess };

  app.get("/api/telegram/status", telegramControlPlaneRouteOptions, async () => buildStatus());

  app.get<{ Params: { organizationId: string } }>("/api/telegram/status/:organizationId", telegramControlPlaneRouteOptions, async (request, reply) => {
    const runtimeResult = resolveTelegramRuntimeContext(request.params.organizationId);
    if (!runtimeResult.ok) {
      return reply.code(runtimeResult.statusCode).send({
        error: runtimeResult.error,
        message: runtimeResult.message
      });
    }
    return buildStatus(request.params.organizationId);
  });

  app.get<{ Params: { organizationId: string; botConfigId: string } }>(
    "/api/telegram/status/:organizationId/:botConfigId",
    telegramControlPlaneRouteOptions,
    async (request, reply) => {
      const runtimeResult = resolveTelegramRuntimeContext(request.params.organizationId, request.params.botConfigId);
      if (!runtimeResult.ok) {
        return reply.code(runtimeResult.statusCode).send({
          error: runtimeResult.error,
          message: runtimeResult.message
        });
      }
      return buildStatus(request.params.organizationId, request.params.botConfigId);
    }
  );

  app.get("/api/settings/telegram", telegramControlPlaneRouteOptions, async () => buildStatus());

  app.put("/api/settings/telegram", telegramControlPlaneRouteOptions, async (request, reply) => {
    const parsedInput = parseTelegramRouteBody(updateDenteTelegramBotSettingsSchema, request.body);
    if (!parsedInput.ok) {
      const schemaResult = updateDenteTelegramBotSettingsSchema.safeParse(request.body);
      const issueCount = schemaResult.success ? 0 : schemaResult.error.issues.length;
      return reply.code(400).send({
        error: "TelegramSettingsValidationFailed",
        message: schemaResult.success || issueCount !== 1 ? parsedInput.message : readableTelegramSettingsSchemaMessage(schemaResult.error)
      });
    }
    const input: UpdateDenteTelegramBotSettingsInput = parsedInput.value;
    try {
      updateDenteTelegramBotSettings(input);
    } catch (settingsError) {
      return reply.code(400).send({
        error: "TelegramSettingsValidationFailed",
        message: readableTelegramSettingsValidationMessage(settingsError)
      });
    }
    return buildStatus();
  });

  app.get("/api/telegram/feature-plan", telegramControlPlaneRouteOptions, async () => buildFeaturePlan(getDenteTelegramBotSettings()));

  app.get<{ Querystring: Record<string, unknown> }>("/api/telegram/outbox", telegramControlPlaneRouteOptions, async (request, reply) => {
    const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(request.query);
    if (!runtimeResult.ok) {
      return reply.code(runtimeResult.statusCode).send({
        error: runtimeResult.error,
        message: runtimeResult.message
      });
    }
    return buildDenteTelegramOutbox(parseTelegramOutboxQuery(request.query), runtimeResult.runtime.runtimeScope);
  });

  app.post<{ Params: { itemId: string }; Querystring: Record<string, unknown> }>("/api/telegram/outbox/:itemId/send", telegramControlPlaneRouteOptions, async (request, reply) => {
    const parsedInput = parseTelegramRouteBody(denteTelegramOutboxSendRequestSchema, request.body ?? {});
    if (!parsedInput.ok) return sendTelegramValidationError(reply);
    const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(request.query);
    if (!runtimeResult.ok) {
      return reply.code(runtimeResult.statusCode).send({
        error: runtimeResult.error,
        message: runtimeResult.message
      });
    }
    const result = await executeTelegramOutboxSend(request.params.itemId, parsedInput.value, runtimeResult.runtime);
    return reply.code(result.statusCode).send(result.body);
  });

  app.post<{ Querystring: Record<string, unknown> }>("/api/telegram/outbox/send-due", telegramControlPlaneRouteOptions, async (request, reply) => {
    const input = parseTelegramOutboxSendDueInput(request.body ?? {});
    if (!input) return sendTelegramValidationError(reply, "TelegramOutboxDueValidationFailed");
    const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(request.query);
    if (!runtimeResult.ok) {
      return reply.code(runtimeResult.statusCode).send({
        error: runtimeResult.error,
        message: runtimeResult.message
      });
    }
    const response = await executeDenteTelegramOutboxDueBatch(input, runtimeResult.runtime);
    return reply.code(response.failedCount > 0 ? 502 : response.blockedCount > 0 ? 409 : 200).send(response);
  });

  app.post("/api/telegram/link-codes", telegramControlPlaneRouteOptions, async (request, reply) => {
    const parsedInput = parseTelegramRouteBody(createDenteTelegramLinkCodeSchema, request.body);
    if (!parsedInput.ok) return sendTelegramValidationError(reply);
    const input = parsedInput.value;
    const requestedOrganizationId = input.organizationId ?? (input.botConfigId ? (input.clinicId ?? null) : null);
    const runtimeResult = resolveTelegramRuntimeContext(requestedOrganizationId, input.botConfigId ?? null);
    if (!runtimeResult.ok) {
      return reply.code(runtimeResult.statusCode).send({
        error: runtimeResult.error,
        message: runtimeResult.message
      });
    }
    const runtime = runtimeResult.context;
    const settings = runtime.settings;
    const requestedClinicId = input.clinicId?.trim() || null;
    if (requestedClinicId && requestedClinicId !== runtime.clinicId) {
      return reply.code(409).send({
        error: "TelegramLinkCodeScopeInvalid",
        message: "Код привязки Telegram относится к другой клинике."
      });
    }
    if (settings.mode === "disabled" || !settings.enabledFeatures.includes("patient_linking")) {
      return reply.code(409).send({
        error: "TelegramLinkingDisabled",
        message: "Привязка Telegram отключена в настройках клиники."
      });
    }
    try {
      return createDenteTelegramLinkCode({
        ...input,
        organizationId: runtime.organizationId,
        clinicId: input.clinicId ?? runtime.clinicId,
        botConfigId: runtime.botConfigId,
        botUsername: runtime.botUsername
      });
    } catch (linkCodeError) {
      const rejection = telegramLinkCodeRejection(linkCodeError);
      return reply.code(409).send({
        error: rejection.error,
        reason: rejection.reason,
        message: rejection.message
      });
    }
  });

  app.get<{ Querystring: Record<string, unknown> }>("/api/telegram/link-codes", telegramControlPlaneRouteOptions, async (request, reply) => {
    const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(request.query);
    if (!runtimeResult.ok) {
      return reply.code(runtimeResult.statusCode).send({
        error: runtimeResult.error,
        message: runtimeResult.message
      });
    }
    const runtime = runtimeResult.runtime.context;
    return buildDenteTelegramLinkCodeList({
      ...parseTelegramLinkCodeListQuery(request.query),
      organizationId: runtime.organizationId,
      clinicId: runtime.clinicId,
      botConfigId: runtime.botConfigId
    });
  });

  app.get<{ Querystring: Record<string, unknown> }>("/api/telegram/chat-links", telegramControlPlaneRouteOptions, async (request, reply) => {
    const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(request.query);
    if (!runtimeResult.ok) {
      return reply.code(runtimeResult.statusCode).send({
        error: runtimeResult.error,
        message: runtimeResult.message
      });
    }
    const runtime = runtimeResult.runtime.context;
    return buildDenteTelegramChatLinkList({
      ...parseTelegramChatLinkListQuery(request.query),
      organizationId: runtime.organizationId,
      clinicId: runtime.clinicId,
      botConfigId: runtime.botConfigId
    });
  });

  app.post<{ Params: { linkId: string }; Querystring: Record<string, unknown> }>("/api/telegram/chat-links/:linkId/revoke", telegramControlPlaneRouteOptions, async (request, reply) => {
    const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(request.query);
    if (!runtimeResult.ok) {
      return reply.code(runtimeResult.statusCode).send({
        error: runtimeResult.error,
        message: runtimeResult.message
      });
    }
    const runtime = runtimeResult.runtime.context;
    const revoked = revokeDenteTelegramChatLink(request.params.linkId, {
      organizationId: runtime.organizationId,
      clinicId: runtime.clinicId,
      botConfigId: runtime.botConfigId
    });
    if (!revoked) {
      return reply.code(404).send({
        error: "TelegramChatLinkNotFound",
        message: telegramChatLinkNotFoundMessage
      });
    }
    return denteTelegramChatLinkPublicSchema.parse(revoked);
  });

  app.post<{ Querystring: Record<string, unknown> }>("/api/telegram/messages/preview", telegramControlPlaneRouteOptions, async (request, reply) => {
    const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(request.query);
    if (!runtimeResult.ok) {
      return reply.code(runtimeResult.statusCode).send({
        error: runtimeResult.error,
        message: runtimeResult.message
      });
    }
    const parsedInput = parseTelegramRouteBody(denteTelegramMessagePreviewRequestSchema, request.body);
    if (!parsedInput.ok) return sendTelegramValidationError(reply);
    const input = parsedInput.value;
    try {
      return renderDenteTelegramMessagePreview(input, runtimeResult.runtime.context.settings);
    } catch (previewError) {
      const rejection = telegramMessagePreviewRejection(previewError);
      return reply.code(404).send({ error: "TelegramMessagePreviewNotFound", reason: rejection.reason, message: rejection.message });
    }
  });


}
