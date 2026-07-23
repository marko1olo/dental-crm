import { createHash } from "node:crypto";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";
import { createDenteTelegramLinkCodeSchema, denteTelegramBotStatusSchema, denteTelegramChatLinkPublicSchema, denteTelegramChatLinkStatusSchema, denteTelegramLinkCodeStatusSchema, denteTelegramMessagePreviewRequestSchema, denteTelegramOutboxDeliveryStatusSchema, denteTelegramOutboxSendDueResponseSchema, denteTelegramOutboxSendRequestSchema, denteTelegramOutboxSendResponseSchema, denteTelegramSubjectTypeSchema, denteTelegramTemplateKindSchema, denteTelegramWebhookResponseSchema, denteTelegramWebhookUpdateSchema, updateDenteTelegramBotSettingsSchema } from "@dental/shared";
import { buildDenteTelegramChatLinkList, buildDenteTelegramLinkCodeList, buildDenteTelegramLinkedScheduleReply, buildDenteTelegramOutbox, claimDenteTelegramOutboxDeliveryReceipt, claimDenteTelegramWebhookUpdate, consumeDenteTelegramLinkCode, createDenteTelegramContactRequest, createDenteTelegramCareRequest, createDenteTelegramDocumentRequest, createDenteTelegramLinkCode, denteTelegramVisualCardUrlFor, extractDenteTelegramLinkCode, findDenteTelegramOutboxDeliveryReceipt, getDenteTelegramBotSettings, handleDenteTelegramAppointmentCallback, hasDenteTelegramWebhookUpdate, listDenteTelegramChatLinks, listDenteTelegramLinkCodes, listDenteTelegramWebhookEvents, prepareDenteTelegramOutboxDelivery, recordDenteTelegramWebhookEvent, recordDenteTelegramOutboxDelivery, renderDenteTelegramMessagePreview, revokeDenteTelegramChatLink, safeDenteTelegramPublicHttpsUrl, updateDenteTelegramBotSettings } from "../telegram/legacyMocks.js";
import { repairMojibakeDeep, repairMojibakeText } from "../text/repairMojibake.js";
import { answerTelegramCallbackQuery, sendTelegramPhotoMessage, sendTelegramTextMessage } from "../telegramTransport.js";
const telegramSecretHeader = "x-telegram-bot-api-secret-token";
const denteAdminSecretHeader = "x-dente-admin-secret";
const telegramOutboxDeliveryClaims = new Set();
const telegramLinkCodeRateLimitWindowMs = 10 * 60_000;
const telegramLinkCodeRejectedAttemptLimit = 5;
const telegramPhotoCaptionMaxLength = 1024;
const telegramSplitPhotoCaption = "DENTE: ��������� �������. ������ ����� ����.";
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function stringFromUnknown(value) {
    if (typeof value === "string")
        return value;
    if (typeof value === "number" && Number.isFinite(value))
        return String(value);
    return null;
}
function readableTelegramText(value) {
    return value ? repairMojibakeText(value) : null;
}
function readableTelegramPayload(value) {
    return repairMojibakeDeep(value);
}
function parseTelegramRouteBody(schema, body) {
    try {
        return { ok: true, value: schema.parse(body) };
    }
    catch {
        return {
            ok: false,
            message: "������������ ������ Telegram. ��������� ������������ ���� � ���� ��������."
        };
    }
}
function sendTelegramValidationError(reply, error = "TelegramValidationFailed") {
    return reply.code(400).send({
        error,
        message: "������������ ������ Telegram. ��������� ������������ ���� � ���� ��������."
    });
}
const telegramSettingsFieldLabels = {
    botUsername: "��� Telegram-����",
    webhookBaseUrl: "����� ������ ��������� Telegram",
    patientPortalBaseUrl: "������ �� ������ ��������",
    welcomeImageUrl: "�������� �����������",
    clinicReviewUrl: "������ ��� �������",
    clinicMapsUrl: "������ �� ����� �������",
    "visualCardUrls.mainMenu": "�������� �������� ����",
    "visualCardUrls.appointment": "�������� ������",
    "visualCardUrls.documents": "�������� ����������",
    "visualCardUrls.tax": "�������� ��������� ����������",
    "visualCardUrls.billing": "�������� ������",
    "visualCardUrls.care": "�������� �������",
    "visualCardUrls.review": "�������� ������"
};
const telegramSettingsReasonLabels = {
    invalid_url: "������� ������ ����� ���� https://...",
    https_required: "����� HTTPS-������.",
    credentials_not_allowed: "������� ����� � ������ �� ������.",
    invalid_path_encoding: "��������� ��������� ���� � ������.",
    patient_identifying_path_not_allowed: "������ ������ ����� �� ����� ��������� �������� ��� ��������, ������, ���������, ������ ��� ������.",
    patient_identifying_path_value_not_allowed: "������� �� ���� �������������� ��������, ���������, �������� ��� ������� ������.",
    patient_identifying_query_not_allowed: "������� ������������ ��������� �� ������.",
    patient_identifying_query_value_not_allowed: "������� �������, ���, ����� ��� ������ ������ ����� �� ����������."
};
function telegramSettingsFieldLabel(fieldName) {
    const normalized = fieldName.trim();
    return telegramSettingsFieldLabels[normalized] ?? telegramSettingsFieldLabels[normalized.replace(/\[(\w+)\]/g, ".$1")] ?? "���� Telegram";
}
function readableTelegramSettingsValidationMessage(error) {
    const rawMessage = error instanceof Error ? repairMojibakeText(error.message).trim() : "";
    if (!rawMessage)
        return "��������� Telegram �� ���������. ��������� ���� �����.";
    if (rawMessage.includes("DENTE_TELEGRAM_CALLBACK_SECRET") || rawMessage.includes("DENTE_TELEGRAM_WEBHOOK_SECRET")) {
        return "����������� ������ ������ ���������; �������� ������ ����������� ������ � ��������� ����������.";
    }
    const rawReason = telegramSettingsReasonLabels[rawMessage];
    if (rawReason)
        return rawReason;
    const technicalMatch = rawMessage.match(/^([^:]+):\s*([a-z0-9_]+)(?::.*)?$/);
    if (technicalMatch) {
        const fieldLabel = telegramSettingsFieldLabel(technicalMatch[1] ?? "");
        const reason = telegramSettingsReasonLabels[technicalMatch[2] ?? ""];
        if (reason)
            return `${fieldLabel}: ${reason}`;
    }
    return "��������� Telegram �� ���������. ��������� ���� ����� � ��������� ������.";
}
function readableTelegramSettingsSchemaMessage(error) {
    const issues = Array.isArray(error.issues)
        ? (error.issues)
        : [];
    const firstIssue = issues[0];
    if (!firstIssue)
        return "��������� Telegram �� ���������. ��������� ���� �����.";
    const fieldName = Array.isArray(firstIssue.path) ? firstIssue.path.map((part) => String(part)).join(".") : "";
    const fieldLabel = telegramSettingsFieldLabel(fieldName);
    const message = typeof firstIssue.message === "string" ? repairMojibakeText(firstIssue.message).trim() : "";
    const looksTechnical = /invalid|required|expected|string|number|boolean|uuid|literal|received/i.test(message);
    if (message && !looksTechnical)
        return `${fieldLabel}: ${message}`;
    return `${fieldLabel}: ��������� �������� ����.`;
}
const telegramLinkCodeEncryptionMissingMessage = "��� �������� Telegram �� �������: �������� ���������� �������� Telegram-���� � ��������� ����������.";
const telegramLinkCodeScopeInvalidMessage = "��� �������� Telegram �� �������: �������� ��������� �������� ��� ���������� ������� �������.";
const telegramPreviewPatientNotFoundMessage = "������������ Telegram �� �����������: �������� ����������� ��������.";
const telegramPreviewAppointmentNotFoundMessage = "������������ Telegram �� �����������: �������� ���������� ������.";
const telegramPreviewDocumentNotFoundMessage = "������������ Telegram �� �����������: �������� ���������� ��������.";
const telegramPreviewTaskNotFoundMessage = "������������ Telegram �� �����������: �������� ���������� ������ ������������.";
const telegramPreviewUnavailableMessage = "������������ Telegram �� �����������: ��������� ������, ������� � ��������� ������.";
const telegramChatLinkNotFoundMessage = "�������� Telegram-���� �� ��������: ����� �� ������� ��� ��� ���������� ��� ���������� ����.";
function telegramLinkCodeRejection(error) {
    const message = error instanceof Error ? repairMojibakeText(error.message) : "";
    if (message.includes("DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY") || message.includes("���������� ������ Telegram-����")) {
        return {
            error: "TelegramChatEncryptionKeyMissing",
            reason: "chat_encryption_missing",
            message: telegramLinkCodeEncryptionMissingMessage
        };
    }
    if (message.includes("��������� ��������") || message.includes("��������� ����������")) {
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
function telegramMessagePreviewRejection(error) {
    const message = error instanceof Error ? repairMojibakeText(error.message) : "";
    if (message.includes("������� ��� ������������� Telegram �� ������")) {
        return { reason: "patient_not_found", message: telegramPreviewPatientNotFoundMessage };
    }
    if (message.includes("������ ��� ������������� Telegram �� �������")) {
        return { reason: "appointment_not_found", message: telegramPreviewAppointmentNotFoundMessage };
    }
    if (message.includes("�������� ��� ������������� Telegram �� ������")) {
        return { reason: "document_not_found", message: telegramPreviewDocumentNotFoundMessage };
    }
    if (message.includes("������ ������������ ��� ������������� Telegram �� �������")) {
        return { reason: "task_not_found", message: telegramPreviewTaskNotFoundMessage };
    }
    return { reason: "preview_unavailable", message: telegramPreviewUnavailableMessage };
}
const telegramTransportFailureLabels = {
    rate_limited: "Telegram �������� ��������� ������� ��������",
    auth: "����� ���� �� ������ Telegram",
    chat_blocked: "��� ���������� ��� ������������ ������������ ����",
    bad_request: "Telegram �������� ������ ���������",
    timeout: "Telegram �� ������� �� ���������� �����",
    network: "��� ����������� ���������� � Telegram",
    server: "������ Telegram �������� ����������",
    unknown: "������� �� ����������"
};
function telegramRetryAfterSeconds(result) {
    return typeof result.retryAfterSeconds === "number" && Number.isFinite(result.retryAfterSeconds) && result.retryAfterSeconds >= 0
        ? Math.trunc(result.retryAfterSeconds)
        : null;
}
function telegramRetryAfterSuffix(result) {
    const retryAfterSeconds = telegramRetryAfterSeconds(result);
    return retryAfterSeconds !== null ? ` ��������� �������� ����� ${retryAfterSeconds} �.` : "";
}
function telegramTransportFailureText(result, scope) {
    return `${scope}: ${telegramTransportFailureLabels[result.errorClass]}.${telegramRetryAfterSuffix(result)}`;
}
function telegramPhotoFallbackWarning(result) {
    return telegramTransportFailureText(result, "���� �� ������� Telegram; ��������� ��������� �������");
}
function telegramPhotoCaptionSplitTextWarning(result) {
    return telegramTransportFailureText(result, "���� �������, �� ������ ����� ��� ��� �� ���������");
}
function telegramOutboxTransportFailureWarning(result) {
    return telegramTransportFailureText(result, "Telegram �� ������ ���������");
}
function telegramCallbackTransportFailureWarning(result) {
    return telegramTransportFailureText(result, "����� �� Telegram-������ �� ���������");
}
function telegramWebhookReplyFailureWarning(result) {
    return telegramTransportFailureText(result, "����� Telegram �� ���������");
}
function outboxDeliveryClaimKey(outboxItemId, clientMutationId) {
    return `${outboxItemId}:${clientMutationId}`;
}
function firstTelegramQueryValue(value) {
    if (Array.isArray(value))
        return firstTelegramQueryValue(value[0]);
    return stringFromUnknown(value)?.trim() || null;
}
function parseTelegramQueryPositiveInt(value, fallback, max) {
    const raw = firstTelegramQueryValue(value);
    if (!raw)
        return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed))
        return fallback;
    return Math.max(1, Math.min(max, Math.trunc(parsed)));
}
function parseTelegramOutboxStatusQuery(value) {
    const raw = firstTelegramQueryValue(value);
    if (!raw || raw === "all" || raw === "due")
        return raw === "due" ? "due" : "all";
    const parsed = denteTelegramOutboxDeliveryStatusSchema.safeParse(raw);
    return parsed.success ? parsed.data : "all";
}
function parseTelegramOutboxTemplateQuery(value) {
    const raw = firstTelegramQueryValue(value);
    if (!raw || raw === "all")
        return "all";
    const parsed = denteTelegramTemplateKindSchema.safeParse(raw);
    return parsed.success ? parsed.data : "all";
}
function parseTelegramOutboxQuery(query) {
    const source = query && typeof query === "object" ? query : {};
    return {
        limit: parseTelegramQueryPositiveInt(source.limit, 80, 300),
        cursor: firstTelegramQueryValue(source.cursor),
        status: parseTelegramOutboxStatusQuery(source.status),
        templateKind: parseTelegramOutboxTemplateQuery(source.templateKind ?? source.template)
    };
}
function parseTelegramOutboxRuntimeScopeQuery(query) {
    const source = query && typeof query === "object" ? query : {};
    const organizationId = firstTelegramQueryValue(source.organizationId ?? source.orgId);
    const botConfigId = firstTelegramQueryValue(source.botConfigId ?? source.telegramBotConfigId ?? source.configId);
    return {
        organizationId: organizationId || (botConfigId ? getDenteTelegramBotSettings().organizationId : null),
        botConfigId
    };
}
function parseTelegramClinicScopeQuery(query) {
    const source = query && typeof query === "object" ? query : {};
    return firstTelegramQueryValue(source.clinicId);
}
function parseTelegramSubjectTypeQuery(value) {
    const raw = firstTelegramQueryValue(value);
    if (!raw || raw === "all")
        return "all";
    const parsed = denteTelegramSubjectTypeSchema.safeParse(raw);
    return parsed.success ? parsed.data : "all";
}
function parseTelegramLinkCodeStatusQuery(value) {
    const raw = firstTelegramQueryValue(value);
    if (!raw || raw === "all")
        return "all";
    const parsed = denteTelegramLinkCodeStatusSchema.safeParse(raw);
    return parsed.success ? parsed.data : "all";
}
function parseTelegramChatLinkStatusQuery(value) {
    const raw = firstTelegramQueryValue(value);
    if (!raw || raw === "all")
        return "all";
    const parsed = denteTelegramChatLinkStatusSchema.safeParse(raw);
    return parsed.success ? parsed.data : "all";
}
function parseTelegramLinkCodeListQuery(query) {
    const source = query && typeof query === "object" ? query : {};
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
function parseTelegramChatLinkListQuery(query) {
    const source = query && typeof query === "object" ? query : {};
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
function parseTelegramOutboxSendDueInput(body) {
    const source = body && typeof body === "object" ? body : {};
    const dryRun = typeof source.dryRun === "boolean" ? source.dryRun : false;
    const limit = source.limit === undefined ? 25 : Number(source.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
        return null;
    return { dryRun, limit };
}
function dueOutboxClientMutationId(outboxItemId, scheduledAt) {
    const digest = createHash("sha256").update(`${outboxItemId}:${scheduledAt}`).digest("hex").slice(0, 40);
    return `due-${digest}`;
}
function isDenteTelegramOutboxItemDue(item, nowMs) {
    const scheduledAtMs = Date.parse(item.scheduledAt);
    return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;
}
async function executeTelegramOutboxSend(outboxItemId, input, runtime) {
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
    const runtimeResult = runtime ? { ok: true, runtime } : resolveTelegramOutboxRuntimeScopeFromQuery({});
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
                if (!shouldSplitPhotoCaption)
                    return photoTransport;
                deliveryWarnings.push("telegram_photo_caption_split");
                const textTransport = await sendTelegramTextMessage({
                    botToken: token,
                    chatId: prepared.chatId,
                    text: deliveryText,
                    replyMarkup: deliveryReplyMarkup,
                    timeoutMs: configuredSendTimeoutMs()
                });
                if (textTransport.ok)
                    return textTransport;
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
export async function executeDenteTelegramOutboxDueBatch(input, runtime) {
    const runtimeResult = runtime ? { ok: true, runtime } : resolveTelegramOutboxRuntimeScopeFromQuery({});
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
    const results = await Promise.all(dueItems.map(async (item) => {
        const sendResult = await executeTelegramOutboxSend(item.id, {
            dryRun: input.dryRun,
            clientMutationId: input.dryRun ? null : dueOutboxClientMutationId(item.id, item.scheduledAt)
        }, runtimeResult.runtime);
        return {
            itemId: item.id,
            statusCode: sendResult.statusCode,
            result: sendResult.body
        };
    }));
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
function parseTelegramWorkerBoolean(value) {
    return value === "1" || value === "true" || value === "yes" || value === "on";
}
function parseTelegramWorkerInt(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return fallback;
    return Math.min(max, Math.max(min, Math.trunc(parsed)));
}
function retryAfterDelayMs(response) {
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
export function startDenteTelegramOutboxDueWorker(options = {}) {
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
    let timer = null;
    const schedule = (delayMs) => {
        if (stopped)
            return;
        timer = setTimeout(() => {
            void runAndReschedule().catch((error) => {
                logger?.error({ error }, "DENTE Telegram due worker tick failed");
            });
        }, delayMs);
    };
    const runAndReschedule = async () => {
        if (stopped)
            return null;
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
            logger?.info({
                attemptedCount: response.attemptedCount,
                sentCount: response.sentCount,
                dryRunCount: response.dryRunCount,
                blockedCount: response.blockedCount,
                failedCount: response.failedCount,
                retryDelayMs
            }, "DENTE Telegram due worker tick completed");
            schedule(retryDelayMs ?? intervalMs);
            return response;
        }
        catch (error) {
            logger?.error({ error }, "DENTE Telegram due worker tick failed");
            schedule(intervalMs);
            throw error;
        }
        finally {
            inFlight = false;
        }
    };
    const handle = {
        enabled: true,
        stop: () => {
            stopped = true;
            if (timer)
                clearTimeout(timer);
            timer = null;
        },
        runOnce: runAndReschedule
    };
    logger?.info({ intervalMs, limit, dryRun, runOnStart }, "DENTE Telegram due worker enabled");
    schedule(runOnStart ? 0 : intervalMs);
    return handle;
}
function normalizedTelegramBotUsername(value) {
    const selected = value?.trim() || null;
    const normalized = selected?.replace(/^@/, "") ?? null;
    return normalized && /^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/.test(normalized) ? normalized : null;
}
function trimmedEnv(name) {
    return process.env[name]?.trim() || null;
}
function stringFromEnvConfig(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}
function uuidFromEnvConfig(value) {
    const candidate = stringFromEnvConfig(value);
    return candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
        ? candidate
        : null;
}
function visualCardUrlsFromEnvConfig(record) {
    const source = isRecord(record.visualCardUrls) ? record.visualCardUrls : {};
    const urls = {};
    const assign = (key, value) => {
        if (value)
            urls[key] = value;
    };
    assign("mainMenu", safeDenteTelegramPublicHttpsUrl("visualCardUrls.mainMenu", stringFromEnvConfig(source.mainMenu) ?? stringFromEnvConfig(record.mainMenuImageUrl)));
    assign("appointment", safeDenteTelegramPublicHttpsUrl("visualCardUrls.appointment", stringFromEnvConfig(source.appointment) ?? stringFromEnvConfig(record.appointmentImageUrl)));
    assign("documents", safeDenteTelegramPublicHttpsUrl("visualCardUrls.documents", stringFromEnvConfig(source.documents) ?? stringFromEnvConfig(record.documentsImageUrl)));
    assign("tax", safeDenteTelegramPublicHttpsUrl("visualCardUrls.tax", stringFromEnvConfig(source.tax) ?? stringFromEnvConfig(record.taxImageUrl)));
    assign("billing", safeDenteTelegramPublicHttpsUrl("visualCardUrls.billing", stringFromEnvConfig(source.billing) ?? stringFromEnvConfig(record.billingImageUrl)));
    assign("care", safeDenteTelegramPublicHttpsUrl("visualCardUrls.care", stringFromEnvConfig(source.care) ?? stringFromEnvConfig(record.careImageUrl)));
    assign("review", safeDenteTelegramPublicHttpsUrl("visualCardUrls.review", stringFromEnvConfig(source.review) ?? stringFromEnvConfig(record.reviewImageUrl)));
    assign("staff", safeDenteTelegramPublicHttpsUrl("visualCardUrls.staff", stringFromEnvConfig(source.staff) ?? stringFromEnvConfig(record.staffImageUrl)));
    return Object.keys(urls).length ? urls : null;
}
function postVisitCheckupDelayHoursFromEnvConfig(record) {
    const source = isRecord(record.postVisitCheckupDelayHoursByTopic)
        ? record.postVisitCheckupDelayHoursByTopic
        : isRecord(record.postVisitCheckupDelayHours)
            ? record.postVisitCheckupDelayHours
            : {};
    const delays = {};
    const assign = (key, value) => {
        const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : NaN;
        if (Number.isFinite(parsed))
            delays[key] = Math.max(1, Math.min(720, Math.floor(parsed)));
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
function reviewRequestDelayHoursFromEnvConfig(record) {
    const parsed = typeof record.reviewRequestDelayHours === "number"
        ? record.reviewRequestDelayHours
        : typeof record.reviewRequestDelayHours === "string"
            ? Number.parseInt(record.reviewRequestDelayHours, 10)
            : NaN;
    return Number.isFinite(parsed) ? Math.max(1, Math.min(720, Math.floor(parsed))) : null;
}
function clinicBotEnvConfigs() {
    const raw = trimmedEnv("DENTE_TELEGRAM_CLINIC_BOTS_JSON");
    if (!raw)
        return [];
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return [];
    }
    const records = Array.isArray(parsed)
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
function clinicBotEnvConfigForOrganization(organizationId, clinicId = null, botConfigId = null) {
    const matchingConfigs = clinicBotEnvConfigs().filter((config) => {
        const tenantMatches = config.organizationId === organizationId || config.clinicId === organizationId || (clinicId !== null && config.clinicId === clinicId);
        return tenantMatches;
    });
    if (botConfigId) {
        return matchingConfigs.find((config) => config.botConfigId === botConfigId) ?? null;
    }
    return matchingConfigs.length === 1 ? (matchingConfigs[0] ?? null) : null;
}
function clinicBotEnvConfigFor(settings) {
    return clinicBotEnvConfigForOrganization(settings.organizationId);
}
function runtimeSettingsForRequestedOrganization(requestedOrganizationId, requestedBotConfigId = null) {
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
function configuredSharedBotUsername(settings) {
    return normalizedTelegramBotUsername(trimmedEnv("DENTE_TELEGRAM_BOT_USERNAME") || settings.botUsername || null);
}
function configuredClinicOwnedBotUsername(settings) {
    return normalizedTelegramBotUsername(clinicBotEnvConfigFor(settings)?.botUsername ||
        trimmedEnv("DENTE_TELEGRAM_OWN_BOT_USERNAME") ||
        trimmedEnv("DENTE_TELEGRAM_CLINIC_BOT_USERNAME") ||
        settings.ownBotUsername ||
        null);
}
function configuredBotUsername(settings) {
    return settings.mode === "clinic_owned_bot" ? configuredClinicOwnedBotUsername(settings) : configuredSharedBotUsername(settings);
}
function configuredSharedBotToken() {
    return trimmedEnv("DENTE_TELEGRAM_BOT_TOKEN") || trimmedEnv("TELEGRAM_BOT_TOKEN");
}
function configuredClinicOwnedBotToken(settings) {
    return (clinicBotEnvConfigFor(settings)?.botToken ||
        trimmedEnv("DENTE_TELEGRAM_OWN_BOT_TOKEN") ||
        trimmedEnv("DENTE_TELEGRAM_CLINIC_BOT_TOKEN"));
}
function configuredBotToken(settings) {
    return settings.mode === "clinic_owned_bot" ? configuredClinicOwnedBotToken(settings) : configuredSharedBotToken();
}
function configuredWebhookSecret(settings) {
    if (settings.mode === "clinic_owned_bot") {
        return (clinicBotEnvConfigFor(settings)?.webhookSecret ||
            trimmedEnv("DENTE_TELEGRAM_OWN_WEBHOOK_SECRET") ||
            trimmedEnv("DENTE_TELEGRAM_CLINIC_WEBHOOK_SECRET") ||
            trimmedEnv("DENTE_TELEGRAM_WEBHOOK_SECRET"));
    }
    return trimmedEnv("DENTE_TELEGRAM_WEBHOOK_SECRET");
}
function telegramBotConfigId(settings, botUsername) {
    if (settings.mode === "clinic_owned_bot") {
        return `clinic_owned_bot:${settings.organizationId}:${(botUsername ?? "unconfigured").toLowerCase()}`;
    }
    if (settings.mode === "disabled")
        return `disabled:${settings.organizationId}`;
    return `shared_dente_bot:${settings.organizationId}`;
}
function resolveTelegramRuntimeContext(requestedOrganizationId = null, requestedBotConfigId = null) {
    const runtimeSettings = runtimeSettingsForRequestedOrganization(requestedOrganizationId, requestedBotConfigId);
    if (!runtimeSettings) {
        return {
            ok: false,
            statusCode: 404,
            error: "TelegramTenantNotFound",
            message: "Telegram webhook ��������� � ������ ����������� DENTE."
        };
    }
    const { settings } = runtimeSettings;
    const botUsername = settings.mode === "clinic_owned_bot" && runtimeSettings.envConfig?.botUsername
        ? runtimeSettings.envConfig.botUsername
        : configuredBotUsername(settings);
    const botToken = settings.mode === "clinic_owned_bot" && runtimeSettings.envConfig?.botToken
        ? runtimeSettings.envConfig.botToken
        : configuredBotToken(settings);
    const webhookSecret = settings.mode === "clinic_owned_bot" && runtimeSettings.envConfig?.webhookSecret
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
function denteTelegramOutboxRuntimeScope(runtime) {
    return {
        settings: runtime.settings,
        botTokenConfigured: runtime.tokenConfigured,
        botConfigId: runtime.botConfigId,
        clinicId: runtime.clinicId
    };
}
function denteTelegramResolvedOutboxRuntime(runtime) {
    return {
        context: runtime,
        runtimeScope: denteTelegramOutboxRuntimeScope(runtime)
    };
}
function resolveTelegramOutboxRuntimeScopeFromQuery(query) {
    const scope = parseTelegramOutboxRuntimeScopeQuery(query);
    const runtimeResult = resolveTelegramRuntimeContext(scope.organizationId, scope.botConfigId);
    if (!runtimeResult.ok)
        return runtimeResult;
    return { ok: true, runtime: denteTelegramResolvedOutboxRuntime(runtimeResult.context) };
}
function configuredTelegramAdminSecret() {
    return process.env.DENTE_TELEGRAM_ADMIN_SECRET?.trim() || null;
}
function isExplicitlyUnguardedControlPlaneAllowed() {
    return process.env.NODE_ENV !== "production" && process.env.DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE === "1";
}
async function requireTelegramControlPlaneAccess(request, reply) {
    const adminSecret = configuredTelegramAdminSecret();
    if (!adminSecret) {
        if (isExplicitlyUnguardedControlPlaneAllowed()) {
            return;
        }
        return reply.code(503).send({
            error: "TelegramAdminSecretMissing",
            message: "�� ������� �� ����� ������ �������������� ��� ���������� Telegram. ��� ���������� ������ ����� ���� �������� ����� ��� �������� � ��������� ����������."
        });
    }
    const providedSecret = request.headers[denteAdminSecretHeader];
    const normalizedProvidedSecret = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;
    if (!timingSafeSecretEqual(typeof normalizedProvidedSecret === "string" ? normalizedProvidedSecret : null, adminSecret)) {
        return reply.code(403).send({
            error: "TelegramAdminSecretRequired",
            message: "��� ���������� Telegram ����� ����������� ������ �������������� �������."
        });
    }
}
function configuredSendTimeoutMs() {
    const raw = process.env.DENTE_TELEGRAM_SEND_TIMEOUT_MS?.trim();
    if (!raw)
        return 12_000;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.max(1000, Math.min(60_000, parsed)) : 12_000;
}
function chatFingerprint(chatId, organizationId) {
    if (!chatId)
        return null;
    const salt = process.env.DENTE_TELEGRAM_CHAT_HASH_SALT?.trim() || organizationId;
    return createHash("sha256").update(`${salt}:${chatId}`).digest("hex").slice(0, 24);
}
function rejectedTelegramLinkCodeAttemptCount(chatFingerprintValue, organizationId, botConfigId, nowMs = Date.now()) {
    if (!chatFingerprintValue)
        return 0;
    const windowStartedAt = nowMs - telegramLinkCodeRateLimitWindowMs;
    return listDenteTelegramWebhookEvents(300, organizationId, botConfigId).filter((event) => {
        if (event.chatFingerprint !== chatFingerprintValue)
            return false;
        if (event.action !== "rejected_telegram_link_code" && event.action !== "rate_limited_telegram_link_code")
            return false;
        const createdAtMs = Date.parse(event.createdAt);
        return Number.isFinite(createdAtMs) && createdAtMs >= windowStartedAt;
    }).length;
}
function telegramLinkCodeRateLimitExceeded(chatFingerprintValue, organizationId, botConfigId) {
    return rejectedTelegramLinkCodeAttemptCount(chatFingerprintValue, organizationId, botConfigId) >= telegramLinkCodeRejectedAttemptLimit;
}
function normalizeCommand(text) {
    if (!text?.startsWith("/"))
        return null;
    const command = text.split(/\s+/)[0]?.toLowerCase() ?? "";
    return command.slice(0, 64) || null;
}
function detectUpdateKind(update) {
    if (isRecord(update.callback_query))
        return "callback_query";
    const message = (isRecord(update.message) && update.message) ||
        (isRecord(update.edited_message) && update.edited_message) ||
        (isRecord(update.channel_post) && update.channel_post) ||
        null;
    if (!message)
        return "unsupported";
    if (isRecord(message.voice))
        return "voice";
    if (Array.isArray(message.photo) && message.photo.length > 0)
        return "photo";
    if (isRecord(message.document))
        return "document";
    const text = stringFromUnknown(message.text)?.trim() ?? null;
    if (normalizeCommand(text))
        return "command";
    if (text)
        return "message";
    return "unsupported";
}
function extractChatInfo(update) {
    const candidates = [
        isRecord(update.message) ? update.message : null,
        isRecord(update.edited_message) ? update.edited_message : null,
        isRecord(update.channel_post) ? update.channel_post : null,
        isRecord(update.callback_query) && isRecord(update.callback_query.message) ? update.callback_query.message : null
    ];
    for (const message of candidates) {
        if (!message || !isRecord(message.chat))
            continue;
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
function extractCommand(update) {
    const message = isRecord(update.message) ? update.message : null;
    const text = stringFromUnknown(message?.text)?.trim() ?? null;
    return normalizeCommand(text);
}
function extractCallbackQueryId(update) {
    const callbackQuery = isRecord(update.callback_query) ? update.callback_query : null;
    return stringFromUnknown(callbackQuery?.id)?.trim() ?? null;
}
function extractCallbackData(update) {
    const callbackQuery = isRecord(update.callback_query) ? update.callback_query : null;
    return stringFromUnknown(callbackQuery?.data)?.trim() ?? null;
}
function extractSafeCallbackAction(update) {
    const callbackQuery = isRecord(update.callback_query) ? update.callback_query : null;
    const data = stringFromUnknown(callbackQuery?.data)?.trim() ?? null;
    if (data === "dente:start" ||
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
        data === "dente:map") {
        return data;
    }
    return null;
}
function extractMessageText(update) {
    const message = (isRecord(update.message) && update.message) ||
        (isRecord(update.edited_message) && update.edited_message) ||
        (isRecord(update.channel_post) && update.channel_post) ||
        null;
    return stringFromUnknown(message?.text)?.trim() ?? null;
}
function portalButton(settings, section = "home") {
    const raw = settings.patientPortalBaseUrl?.trim();
    if (!raw)
        return [];
    try {
        const portal = new URL(raw);
        if (portal.protocol !== "https:")
            return [];
        portal.search = "";
        portal.searchParams.set("dente_source", "telegram");
        portal.searchParams.set("dente_section", section);
        portal.hash = "";
        return [{ text: "������� DENTE", url: portal.toString() }];
    }
    catch {
        return [];
    }
}
function safeHttpsTelegramButton(raw, text) {
    const value = raw?.trim();
    if (!value)
        return [];
    try {
        const url = new URL(value);
        return url.protocol === "https:" ? [{ text, url: url.toString() }] : [];
    }
    catch {
        return [];
    }
}
function reviewButtons(settings) {
    return [
        ...safeHttpsTelegramButton(settings.clinicReviewUrl, "������� �������"),
        ...safeHttpsTelegramButton(settings.clinicMapsUrl, "������� �����")
    ];
}
function mapButtons(settings) {
    return safeHttpsTelegramButton(settings.clinicMapsUrl, "������� �����");
}
function telegramInlineKeyboardRows(markup) {
    const rows = markup?.inline_keyboard;
    if (!Array.isArray(rows))
        return [];
    return rows.filter((row) => Array.isArray(row) && row.every((button) => isRecord(button) && typeof button.text === "string"));
}
function mainMenuTelegramRow() {
    return [{ text: "������� ����", callback_data: "dente:start" }];
}
const telegramCareCallbackTopicByAction = {
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
function careTopicFromFreeText(text) {
    if (freeTextIncludes(text, ["������", "�����", "�����"]))
        return "extraction";
    if (freeTextIncludes(text, ["������"]))
        return "implant";
    if (freeTextIncludes(text, ["�����", "���������"]))
        return "filling";
    if (freeTextIncludes(text, ["����", "�����", "����"]))
        return "endo";
    if (freeTextIncludes(text, ["������", "������", "���", "���"]))
        return "surgery";
    if (freeTextIncludes(text, ["�������", "������", "������"]))
        return "anesthesia";
    if (freeTextIncludes(text, ["������", "�����", "����������"]))
        return "hygiene";
    if (freeTextIncludes(text, ["������", "������", "�����", "����"]))
        return "prosthetics";
    if (freeTextIncludes(text, ["��������", "������", "�������", "����"]))
        return "orthodontics";
    if (freeTextIncludes(text, ["��������", "����", "�������"]))
        return "periodontology";
    return null;
}
function replyMarkupWithNextActions(primaryRows, settings) {
    const rows = [
        ...primaryRows.filter((row) => row.length),
        ...telegramInlineKeyboardRows(safeCommandKeyboard(settings, "appointment_callback"))
    ];
    return rows.length ? { inline_keyboard: rows } : null;
}
function safeCommandKeyboard(settings, mode) {
    const portal = portalButton(settings, mode === "appointment_callback" || mode === "linked" ? "schedule" : "home");
    const review = reviewButtons(settings);
    const maps = mapButtons(settings);
    const schedule = [{ text: "����������", callback_data: "dente:schedule" }];
    const documents = [{ text: "���������", callback_data: "dente:documents" }];
    const care = [{ text: "�������", callback_data: "dente:care" }];
    const contact = [{ text: "������� ��������������", callback_data: "dente:contact" }];
    const privacy = [{ text: "������������������", callback_data: "dente:privacy" }];
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
                [{ text: "�������� QR � �������", callback_data: "dente:clinic" }],
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
                    { text: "������", callback_data: "dente:help" },
                    { text: "������������������", callback_data: "dente:privacy" }
                ],
                home
            ].filter((row) => row.length)
        };
    }
    if (mode === "privacy") {
        return {
            inline_keyboard: [
                [
                    { text: "��� ����� ���", callback_data: "dente:help" },
                    { text: "�����������", callback_data: "dente:clinic" }
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
                { text: "���������� �������", callback_data: "dente:clinic" },
                { text: "������������������", callback_data: "dente:privacy" }
            ],
            [
                { text: "���������", callback_data: "dente:documents" },
                { text: "�������", callback_data: "dente:care" }
            ],
            review.length
                ? review
                : [
                    { text: "������", callback_data: "dente:review" },
                    { text: "�����", callback_data: "dente:map" }
                ],
            [
                { text: "����������", callback_data: "dente:schedule" },
                { text: "������� ��������������", callback_data: "dente:contact" }
            ],
            portal
        ].filter((row) => row.length)
    };
}
function reviewReplyFor(settings) {
    const buttons = reviewButtons(settings);
    if (!buttons.length) {
        return {
            text: "������ ��� ������ ������� ���� �� ���������. ��������� �������������� �������� ������ �� ������ ��� �������� ������� � ���������� DENTE.",
            replyMarkup: safeCommandKeyboard(settings, "help")
        };
    }
    return {
        text: "������� �� �����. ����� �������� ����� � ������� �� ���������� ����� ������ ����.",
        replyMarkup: replyMarkupWithNextActions([buttons], settings),
        photoUrl: patientMenuCardPhoto(settings, "review")
    };
}
function mapReplyFor(settings) {
    const buttons = mapButtons(settings);
    if (!buttons.length) {
        return {
            text: "������ �� ����� ������� ���� �� ���������. ��������� �������������� �������� �������� ������� � ���������� DENTE.",
            replyMarkup: safeCommandKeyboard(settings, "clinic")
        };
    }
    return {
        text: "����� ������� �������� �� ���������� ����� ������ ����.",
        replyMarkup: replyMarkupWithNextActions([buttons], settings),
        photoUrl: patientMenuCardPhoto(settings, "review")
    };
}
function patientMenuCardPhoto(settings, cardKey = "mainMenu") {
    return denteTelegramVisualCardUrlFor(settings, cardKey);
}
function documentsReplyFor(settings) {
    const portal = portalButton(settings, "documents");
    const rows = [
        [
            { text: "���������", callback_data: "dente:tax" },
            { text: "������ � ����", callback_data: "dente:billing" }
        ],
        [
            { text: "��������", callback_data: "dente:medical-docs" }
        ],
        [{ text: "����� ��������", callback_data: "dente:patient-forms" }],
        portal,
        [
            { text: "������� ��������������", callback_data: "dente:contact" },
            { text: "�������", callback_data: "dente:care" }
        ],
        mainMenuTelegramRow()
    ].filter((row) => row.length);
    return {
        text: "DENTE: ��������, ��������, ����, �����, ����, �������� � ��������� ������� ����������� ������ � ���������� ������� �������. � Telegram �������� ����������� � ������ ��������, ��� �������� � ����������.",
        replyMarkup: rows.length ? { inline_keyboard: rows } : safeCommandKeyboard(settings, "help"),
        photoUrl: patientMenuCardPhoto(settings, "documents")
    };
}
function careReplyFor(settings) {
    const portal = portalButton(settings, "care");
    const rows = [
        [
            { text: "����� ��������", callback_data: "dente:care-extraction" },
            { text: "����� �����������", callback_data: "dente:care-implant" }
        ],
        [
            { text: "����� ������", callback_data: "dente:care-filling" },
            { text: "����� ����������", callback_data: "dente:care-endo" }
        ],
        [
            { text: "����� ��������", callback_data: "dente:care-surgery" },
            { text: "����� ���������", callback_data: "dente:care-anesthesia" }
        ],
        [
            { text: "����� �������", callback_data: "dente:care-hygiene" }
        ],
        [
            { text: "����� ��������������", callback_data: "dente:care-prosthetics" },
            { text: "����� ����������", callback_data: "dente:care-orthodontics" }
        ],
        [
            { text: "����� ��������������", callback_data: "dente:care-periodontology" }
        ],
        portal,
        [
            { text: "���������", callback_data: "dente:documents" },
            { text: "������� ��������������", callback_data: "dente:contact" }
        ],
        mainMenuTelegramRow()
    ].filter((row) => row.length);
    return {
        text: "DENTE: ������� ����� ��������, �����������, ������, ����������, ��������, ���������, �������, ��������������, ���������� � �������������� �������� � ������� ����� ���������� ������. �������� ������ ������� ������� ����; ��� ��������� ���������� ����������� � ������, ����� ������� ������.",
        replyMarkup: rows.length ? { inline_keyboard: rows } : safeCommandKeyboard(settings, "help"),
        photoUrl: patientMenuCardPhoto(settings, "care")
    };
}
function documentSubmenuReplyFor(settings, topic, requestResult) {
    const portal = portalButton(settings, topic === "tax" ? "tax" : topic === "billing" ? "billing" : "documents");
    const texts = {
        tax: "���������: DENTE �������� ����������� ���������, ������ ��� ��� 1151156, ������ ������� ��� �������� 2021-2023 � ������ �����. ����� ���������� ���� � ������ �����������. ������� ������� ����������� � ���������� �������.",
        billing: "������ � ����: DENTE �������� ����������� ����, ���, ��� ����������� �����, ������ ��������� ��� ������ �� �������������/�������. ����� � ��������� �������� ������ ����� ���������� ������ ����� �������� ���������������.",
        medical: "��������: �������, ������ �����, �������� ������, DICOM/���� � ������ ����������� ��������� ��������� � DENTE � �������� ����� ���������� ������ ����� �������� �������� � ����������.",
        patientForms: "����� ��������: ������, ��������, �����, ���, �������������, ����/����� � ��������� ������ ����������� � DENTE. ���� ����� �������� ����� ��� ������, ������� ������ ��������������."
    };
    const rows = [
        portal,
        requestResult && !requestResult.linked
            ? [
                { text: "��� �������� ���", callback_data: "dente:clinic" },
                { text: "���������", callback_data: "dente:documents" }
            ]
            : [
                { text: "���������", callback_data: "dente:documents" },
                { text: "������� ��������������", callback_data: "dente:contact" }
            ],
        mainMenuTelegramRow()
    ].filter((row) => row.length);
    return {
        text: [texts[topic], requestResult?.text].filter(Boolean).join("\n\n"),
        replyMarkup: rows.length ? { inline_keyboard: rows } : safeCommandKeyboard(settings, "help"),
        photoUrl: patientMenuCardPhoto(settings, topic === "tax" ? "tax" : topic === "billing" ? "billing" : "documents")
    };
}
function careTopicReplyFor(settings, topic, requestResult) {
    const portal = portalButton(settings, "care");
    const texts = {
        extraction: "����� ��������: �� ������ �������, �� �������� ������� ������ �����, �� �������� �����, �� ������ � �� ������������ ��������. ��� ����������� ����, �����, ����������� ��� ������������ ��������� � ��������.",
        implant: "����� �����������: ���������� ����� � ����� �� ����������, �� ������������ �������, ���������� ��������� ������ �� ����� �����. ��� ����, �����, �����������, ����������� ��� ������������ ������� ��������������.",
        filling: "����� ������: ��������� ��������� ��������� ����� ����, ��������� ������� �������� �� ��� � ������ ����. ���� ������ ������, ���� ���� ��� ����������� ��� ���������������� �����������, ��������� � ��������.",
        endo: "����� ����������: �������� ���������������� ��� �����������. �� ������������ ���, ���������� ����� ���������� ����� � �� ����������� � ���������� ������������. ��� ����������� ����, ����� ��� ����������� ������� ��������������.",
        surgery: "����� ��������: �� ������ �������, �� �������� ���, �� �������� ������� ������ �����, ���������� ����������� � ���������� �����. ��� ������������, �����������, ����������� ����� ��� ������� ���� ������� ��������������.",
        anesthesia: "����� ���������: �� �����, ���� ����������� ��������, ����� �� ������������ ���� ��� ����. ���� �������� �������� �������� �����, ���� ����������� ��� ��������� ������������� �������, ������� ��������������.",
        hygiene: "����� �����������: ������ �����, ���������� �������, �������� ��������� �������� ���� �� ������������ �����. ���� ����� ������ ����� ��� ���� �����������, ������� ��������������.",
        prosthetics: "����� ��������������: ���������� � ����������� ����������, �� ������������ �� ������� ����� � �� ������������� ��������������. ���� �������, ����, ����� ��� ������ ������, �������� ��� �����������������, ������� ��������������.",
        orthodontics: "����� ����������: ���������� ����� ������� �������� ��� ���������, ����������� ����������� ���� � �� ������������� �������� ��� �����. ���� ������ ���������, ���� ����� ��� ������� ��������, ������� ��������������.",
        periodontology: "����� ��������������: ��������� �������� ����� �� ����� �����, �� ����������� ����������� �������� � ��������. ���� ��������������, ����, ���� ��� ���������� ����� �����������, ������� ��������������."
    };
    const rows = [
        portal,
        [
            { text: "��� �������", callback_data: "dente:care" },
            { text: "������� ��������������", callback_data: "dente:contact" }
        ],
        mainMenuTelegramRow()
    ].filter((row) => row.length);
    return {
        text: [texts[topic], requestResult?.text].filter(Boolean).join("\n\n"),
        replyMarkup: rows.length ? { inline_keyboard: rows } : safeCommandKeyboard(settings, "help"),
        photoUrl: patientMenuCardPhoto(settings, "care")
    };
}
function contactRequestReplyFor(settings, chatFingerprintValue, scope = {}) {
    const result = createDenteTelegramContactRequest(chatFingerprintValue, scope);
    const portal = portalButton(settings);
    const rows = [
        portal,
        result.linked
            ? [
                { text: "����������", callback_data: "dente:schedule" },
                { text: "���������", callback_data: "dente:documents" }
            ]
            : [{ text: "��� �������� ���", callback_data: "dente:clinic" }],
        [{ text: "������", callback_data: "dente:help" }],
        mainMenuTelegramRow()
    ].filter((row) => row.length);
    return {
        text: result.text,
        replyMarkup: rows.length ? { inline_keyboard: rows } : safeCommandKeyboard(settings, result.linked ? "linked" : "rejected"),
        photoUrl: patientMenuCardPhoto(settings, "mainMenu")
    };
}
function telegramFeatureEnabled(settings, feature) {
    return settings.enabledFeatures.includes(feature);
}
function featureDisabledReplyFor(settings, title) {
    return {
        text: `${title} ������ ��������� � ���������� ������� DENTE. �������� ��������� �������� �������� ���� ��� �������� ��������������.`,
        replyMarkup: safeCommandKeyboard(settings, "help"),
        photoUrl: patientMenuCardPhoto(settings, "mainMenu")
    };
}
function unsafeTelegramAttachmentReplyFor(settings, updateKind) {
    const label = updateKind === "voice"
        ? "��������� ���������"
        : updateKind === "photo"
            ? "���� � ������"
            : "PDF, ��������� � �����";
    return {
        text: `${label} � Telegram �� ����������� ��� ����������� ��������� DENTE. �������� ���������� ������ ��� �������� ������: ���������, ������� ��� �������������. ��� ������� �� �������� ���� � �� ������� ��� � ����� ������.`,
        replyMarkup: safeCommandKeyboard(settings, "help"),
        photoUrl: patientMenuCardPhoto(settings, "documents")
    };
}
function normalizedFreeText(value) {
    return value?.trim().toLocaleLowerCase("ru-RU").replaceAll("�", "�") ?? "";
}
function freeTextIncludes(value, fragments) {
    return fragments.some((fragment) => value.includes(fragment));
}
function freeTextReplyFor(settings, chatFingerprintValue, messageText, scope = {}) {
    const text = normalizedFreeText(messageText);
    if (freeTextIncludes(text, ["�����", "����", "�����", "���", "1151156"]) ||
        (freeTextIncludes(text, ["������"]) && freeTextIncludes(text, ["�����", "���", "����"]))) {
        return telegramFeatureEnabled(settings, "tax_document_request")
            ? documentSubmenuReplyFor(settings, "tax", createDenteTelegramDocumentRequest(chatFingerprintValue, "tax", scope))
            : featureDisabledReplyFor(settings, "��������� �������");
    }
    if (freeTextIncludes(text, ["�����", "����", "����", "���", "�������", "�������", "�������", "���"])) {
        return telegramFeatureEnabled(settings, "secure_portal_links")
            ? documentSubmenuReplyFor(settings, "billing", createDenteTelegramDocumentRequest(chatFingerprintValue, "billing", scope))
            : featureDisabledReplyFor(settings, "���������� ���������");
    }
    if (freeTextIncludes(text, ["�������", "������", "����", "dicom", "����", "��", "�����"])) {
        return telegramFeatureEnabled(settings, "secure_portal_links")
            ? documentSubmenuReplyFor(settings, "medical", createDenteTelegramDocumentRequest(chatFingerprintValue, "medical", scope))
            : featureDisabledReplyFor(settings, "����������� ���������");
    }
    if (freeTextIncludes(text, ["������", "������", "�����", "���", "��������"])) {
        return telegramFeatureEnabled(settings, "secure_portal_links")
            ? documentSubmenuReplyFor(settings, "patientForms", createDenteTelegramDocumentRequest(chatFingerprintValue, "patientForms", scope))
            : featureDisabledReplyFor(settings, "����� ��������");
    }
    if (freeTextIncludes(text, ["��������", "�������", "���"])) {
        return documentsReplyFor(settings);
    }
    const careTopic = careTopicFromFreeText(text);
    if (careTopic) {
        return telegramFeatureEnabled(settings, "post_visit_instructions")
            ? careTopicReplyFor(settings, careTopic, createDenteTelegramCareRequest(chatFingerprintValue, careTopic, scope))
            : featureDisabledReplyFor(settings, "������� ����� ������");
    }
    if (freeTextIncludes(text, ["�����", "��������", "������", "������", "�����", "������", "�����"])) {
        return telegramFeatureEnabled(settings, "post_visit_instructions")
            ? careReplyFor(settings)
            : featureDisabledReplyFor(settings, "������� ����� ������");
    }
    if (freeTextIncludes(text, ["������", "�����", "�����", "�����", "�����"])) {
        const scheduleReply = buildDenteTelegramLinkedScheduleReply(chatFingerprintValue, scope, settings);
        return {
            text: scheduleReply.text,
            replyMarkup: scheduleReply.replyMarkup ?? safeCommandKeyboard(settings, scheduleReply.linked ? "linked" : "rejected"),
            photoUrl: patientMenuCardPhoto(settings, "appointment")
        };
    }
    if (freeTextIncludes(text, ["����", "��������", "�����", "��������", "����", "����", "����", "����", "����������"])) {
        return contactRequestReplyFor(settings, chatFingerprintValue, scope);
    }
    if (freeTextIncludes(text, ["�����", "����", "�������"]))
        return reviewReplyFor(settings);
    if (freeTextIncludes(text, ["�����", "�����", "��� ���������", "��� ��"]))
        return mapReplyFor(settings);
    return {
        text: "DENTE ������ ���������. ����� ������� ������ ������ ������, �������� �������� �������� ����. ������� ������ �� �����.",
        replyMarkup: safeCommandKeyboard(settings, "help"),
        photoUrl: patientMenuCardPhoto(settings, "mainMenu")
    };
}
function suggestedReplyFor(command, callbackAction, settings, chatFingerprintValue, updateKind, messageText, scope = {}) {
    const portal = settings.patientPortalBaseUrl || "���������� ������ DENTE";
    const normalizedCommand = command?.split("@")[0] ?? null;
    if (updateKind === "photo" || updateKind === "document" || (updateKind === "voice" && !settings.allowVoiceIntake)) {
        return unsafeTelegramAttachmentReplyFor(settings, updateKind);
    }
    if (normalizedCommand === "/start" || callbackAction === "dente:start") {
        const linkedStartReply = buildDenteTelegramLinkedScheduleReply(chatFingerprintValue, scope, settings);
        if (linkedStartReply.linked) {
            return {
                text: linkedStartReply.subjectType === "staff"
                    ? "DENTE: ������� Telegram ���������. �������� ����������, ����� ��� �������� ���������� DENTE-������. ��� ��������� � ����������� ������ � Telegram �� ������������."
                    : "DENTE: Telegram ��������� � �������. �������� ����������, ���������, ������� ��� ����� � ��������������� �������� ����. ����������� ��������� ����������� ������ � ���������� �������.",
                replyMarkup: linkedStartReply.subjectType === "staff"
                    ? linkedStartReply.replyMarkup ?? safeCommandKeyboard(settings, "linked")
                    : safeCommandKeyboard(settings, "linked"),
                photoUrl: patientMenuCardPhoto(settings, linkedStartReply.subjectType === "staff" ? "staff" : "mainMenu")
            };
        }
        return {
            text: "��� DENTE ���������. ������������ QR �� ���������� ������� ��� ��������� ����������� ��� �������, ����� ��������� ��������� ���. ������ ��������� �������� �������� ����; ������� ����� ������ ��� �������� �������. ����������� ��������� ����������� ������ � ���������� �������.",
            replyMarkup: safeCommandKeyboard(settings, "start"),
            photoUrl: patientMenuCardPhoto(settings, "mainMenu")
        };
    }
    if (normalizedCommand === "/help" || callbackAction === "dente:help") {
        return {
            text: "DENTE �������� ��������: ����������, ���������, �������, ����� � ���������������, ����� � ����� �������. ������� �������� �������� ���������. ����������� ������ � Telegram �� ������������.",
            replyMarkup: safeCommandKeyboard(settings, "help"),
            photoUrl: patientMenuCardPhoto(settings, "mainMenu")
        };
    }
    if (normalizedCommand === "/privacy" || callbackAction === "dente:privacy") {
        return {
            text: "DENTE �� ��������� �� ���������� ��������, ��, �������, ����� ������� � ��������� PDF ����� Telegram. � Telegram ������ ������ ���������� ����������� � ������.",
            replyMarkup: safeCommandKeyboard(settings, "privacy"),
            photoUrl: patientMenuCardPhoto(settings, "mainMenu")
        };
    }
    if (normalizedCommand === "/clinic" || callbackAction === "dente:clinic") {
        return {
            text: `��������� �������������� ������� DENTE � �������� QR-��� �����������. QR ��� ������� ��� � ����������� �����; ���� ������ ����������, ��� ����� ��������� ���� �������. ������ �������: ${portal}.`,
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
        if (!telegramFeatureEnabled(settings, "tax_document_request"))
            return featureDisabledReplyFor(settings, "��������� �������");
        return documentSubmenuReplyFor(settings, "tax", createDenteTelegramDocumentRequest(chatFingerprintValue, "tax", scope));
    }
    if (callbackAction === "dente:billing") {
        if (!telegramFeatureEnabled(settings, "secure_portal_links"))
            return featureDisabledReplyFor(settings, "���������� ���������");
        return documentSubmenuReplyFor(settings, "billing", createDenteTelegramDocumentRequest(chatFingerprintValue, "billing", scope));
    }
    if (callbackAction === "dente:medical-docs") {
        if (!telegramFeatureEnabled(settings, "secure_portal_links"))
            return featureDisabledReplyFor(settings, "����������� ���������");
        return documentSubmenuReplyFor(settings, "medical", createDenteTelegramDocumentRequest(chatFingerprintValue, "medical", scope));
    }
    if (callbackAction === "dente:patient-forms") {
        if (!telegramFeatureEnabled(settings, "secure_portal_links"))
            return featureDisabledReplyFor(settings, "����� ��������");
        return documentSubmenuReplyFor(settings, "patientForms", createDenteTelegramDocumentRequest(chatFingerprintValue, "patientForms", scope));
    }
    if (normalizedCommand === "/care" ||
        normalizedCommand === "/instructions" ||
        normalizedCommand === "/recommendations" ||
        callbackAction === "dente:care") {
        if (!telegramFeatureEnabled(settings, "post_visit_instructions"))
            return featureDisabledReplyFor(settings, "������� ����� ������");
        return careReplyFor(settings);
    }
    const callbackCareTopic = callbackAction ? telegramCareCallbackTopicByAction[callbackAction] : null;
    if (callbackCareTopic) {
        if (!telegramFeatureEnabled(settings, "post_visit_instructions"))
            return featureDisabledReplyFor(settings, "������� ����� ������");
        return careTopicReplyFor(settings, callbackCareTopic, createDenteTelegramCareRequest(chatFingerprintValue, callbackCareTopic, scope));
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
    if (!command && !callbackAction)
        return freeTextReplyFor(settings, chatFingerprintValue, messageText, scope);
    return {
        text: "DENTE ������ ���������. �������� ���������� �������� �������� ����.",
        replyMarkup: safeCommandKeyboard(settings, "help"),
        photoUrl: patientMenuCardPhoto(settings, "mainMenu")
    };
}
function buildStatus(requestedOrganizationId = null, requestedBotConfigId = null) {
    const runtimeResult = resolveTelegramRuntimeContext(requestedOrganizationId, requestedBotConfigId);
    if (!runtimeResult.ok) {
        throw new Error(runtimeResult.message);
    }
    const runtime = runtimeResult.context;
    const settings = runtime.settings;
    const isPrimaryRuntime = runtime.organizationId === getDenteTelegramBotSettings().organizationId;
    const warnings = [];
    const nextActions = [];
    if (settings.mode !== "disabled" && !runtime.tokenConfigured && settings.mode !== "clinic_owned_bot") {
        warnings.push("��� Telegram �� ��������� � ��������� ���������� DENTE.");
        nextActions.push("���������� ������ ���� � ��������� ���������� �������; �� ������� ��� � ��������, ������������ ��� ���������� ����.");
    }
    if (settings.mode !== "disabled" && !runtime.webhookSecretConfigured) {
        warnings.push("������ ������� Telegram �� ��������; �������� ������� ������ ����������� ������ � ��������� ��������.");
        nextActions.push("������������ ������ ������� � ���������� ��� � ��������� ���������� Telegram.");
    }
    if (settings.mode === "clinic_owned_bot" && !runtime.clinicOwnedBotReady) {
        warnings.push("����������� ��� ������� �������, �� �� �����: �������� ��� ���� � ��� ������ � ��������� ���������.");
        nextActions.push("��������� ��� ������������ ���� � ��������� ������ � ��� �������� ��� ��������� �������.");
    }
    if (settings.privacyMode !== "no_phi_by_default") {
        warnings.push("Telegram-������� � ���������� ������� �����������, �������� � tenant-policy �� production.");
    }
    if (!settings.patientPortalBaseUrl) {
        nextActions.push("������� patientPortalBaseUrl ����� ��������� ������ �� ������� ��������� � ��������� ���������.");
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
function buildFeaturePlan(settings) {
    return readableTelegramPayload({
        productName: "DENTE",
        botUsername: configuredBotUsername(settings),
        modes: [
            "shared_dente_bot: ����� ������������� ���, ������� ������������ �� ������������ ����",
            "clinic_owned_bot: ����������� ��� �������; ��� � ����������, ������ ������ � ��������� ������������"
        ],
        enabledFeatures: settings.enabledFeatures,
        releaseReadyLayers: [
            "linking: ����������� QR/deep-link ����",
            "outbox: ���������� ������� ����������� � ��������� ����������",
            "transport: �������� ���� ������ ����� ������������� ���� � ���������� ������ ����",
            "audit: webhook-������� � ������������ �������� � DENTE"
        ],
        patientSafeActions: [
            "����������� ��� ��������",
            "������������� ������",
            "������� ������ ��� ������ ������",
            "����������� � ���������� ��������� ����� ������ �� ���������� ������",
            "������ ���������� ������� ��� �������� PDF",
            "����� ������� ����� ������ �� ������������ ��������"
        ],
        staffSafeActions: [
            "���������� ������ ����������",
            "������� �������������",
            "��������� ����� �����",
            "�������� ���������� ���������� ��� ���� ����������",
            "������������� �������� ��������� ������"
        ],
        blockedByDefault: [
            "����� ��������",
            "������ ����� � ������ �������",
            "�������� DICOM/����/��������/����",
            "��������� PDF � ����� �������� ��� ����� Telegram",
            "��������� ����������� ������������"
        ]
    });
}
async function sendWebhookSuggestedReply(chatId, suggestedReply, botToken) {
    if (!chatId || !suggestedReply.text?.trim())
        return null;
    if (!botToken)
        return "����� Telegram �� ���������: ����� ���� �� ��������.";
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
        if (photoResult.ok)
            return null;
    }
    const result = await sendTelegramTextMessage({
        botToken,
        chatId,
        text,
        replyMarkup,
        timeoutMs: Math.min(configuredSendTimeoutMs(), 5000)
    });
    if (result.ok)
        return null;
    return telegramWebhookReplyFailureWarning(result);
}
async function handleWebhook(request, reply) {
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
            warnings: ["Telegram �������� � ���������� �������; update �� ���������, ��� �������� �� �����������."],
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
    const update = parsedUpdate.value;
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
    const command = extractCommand(update) ??
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
    const linkCodeRejectedByRateLimit = Boolean(linkCode && !linkCodeRejectedByChatType && telegramLinkCodeRateLimitExceeded(chatHash, runtime.organizationId, runtime.botConfigId));
    const linkResult = linkCode && !linkCodeRejectedByChatType && !linkCodeRejectedByRateLimit
        ? consumeDenteTelegramLinkCode(linkCode, chatHash, chatId, {
            organizationId: runtime.organizationId,
            clinicId: runtime.clinicId,
            botConfigId: runtime.botConfigId
        })
        : null;
    const warnings = [
        ...webhookClaim.event.warnings,
        ...appointmentCallbackResult.warnings,
        ...(expectedSecret ? [] : ["Webhook secret �� ��������; update ����������� ������ ��� ��������� ����������."])
    ];
    if (linkCodeRejectedByChatType) {
        warnings.push("����������� ��� Telegram ����� ������������ ������ � ������ ���� � �����; �������� � ������� � ������� �������������.");
    }
    if (linkCodeRejectedByRateLimit) {
        warnings.push("������� ����� �������� ����� Telegram-�������� �� �������� �����; ����� ����� ��� ����� ���� �������� ���������.");
    }
    if (updateKind === "voice" && !settings.allowVoiceIntake) {
        warnings.push("��������� ���� ��������; ����� �� Telegram �� ������ �������� � ����������� ������ �� ���������.");
    }
    if (updateKind === "photo" || updateKind === "document") {
        warnings.push("�������� ������ Telegram �� ����������� ��� ������������� � ������� � ���������� �������� �� ���������.");
    }
    if (linkResult && !linkResult.ok) {
        if (linkResult.reason === "chat_encryption_key_missing") {
            warnings.push("���������� ������ Telegram-���� �� ���������; ����������� ��� Telegram �� ��� �����������.");
        }
        else if (linkResult.reason === "missing_chat_transport" || linkResult.reason === "chat_encryption_failed") {
            warnings.push("��� Telegram �� ������� ��������� � ���������� ������; ����������� ��� Telegram �� ��� �����������.");
        }
        else {
            warnings.push("����������� ��� Telegram ��������, �����, ��� ����������� ��� �������.");
        }
    }
    const action = appointmentCallbackResult.handled
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
    const suggestedReply = appointmentCallbackResult.handled
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
                        ? "��� DENTE �� ������ � ��������� ����. �������� ������ ��� � ����� � ��������� ������� �������� QR ����������� ��� ��������� ����������� ��� ���."
                        : "DENTE �������� ������ � ������ ���� � �����. �������� ������ ���, ����� ���������� ����������� �������.",
                    replyMarkup: safeCommandKeyboard(settings, "rejected"),
                    photoUrl: patientMenuCardPhoto(settings, "mainMenu")
                }
                : linkResult?.ok === true
                    ? {
                        text: "�������� DENTE ���������. Telegram ����� �������� ������ ���������� ����������� �������. ����������� ��������� �������� � ���������� �������.",
                        replyMarkup: safeCommandKeyboard(settings, "linked"),
                        photoUrl: patientMenuCardPhoto(settings, "mainMenu")
                    }
                    : linkResult
                        ? {
                            text: linkResult.reason === "chat_encryption_key_missing" ||
                                linkResult.reason === "missing_chat_transport" ||
                                linkResult.reason === "chat_encryption_failed"
                                ? "DENTE �������� �� ����� ��������� ��������� Telegram. ��������� ������� ��������� ��������� ���� � ��������� ��� ����� �����������."
                                : "��� DENTE �� ������. ��������� ������� �������� ����� QR ����������� ��� ������ ����� ����������� ���.",
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
            text: appointmentCallbackResult.handled ? appointmentCallbackResult.callbackAnswerText : "DENTE: ���������� ����� ���������.",
            timeoutMs: Math.min(configuredSendTimeoutMs(), 5000)
        });
        if (!callbackAnswer.ok)
            warnings.push(telegramCallbackTransportFailureWarning(callbackAnswer));
    }
    const replyWarning = suppressPublicChatReply ? null : await sendWebhookSuggestedReply(chatId, suggestedReply, runtime.botToken);
    if (suppressPublicChatReply) {
        warnings.push("����� Telegram �� ��������� � ������ ��� �����: DENTE �������� ������ � ������ ����.");
    }
    if (replyWarning)
        warnings.push(replyWarning);
    const event = recordDenteTelegramWebhookEvent({
        updateId: update.update_id,
        organizationId: runtime.organizationId,
        botConfigId: runtime.botConfigId,
        chatFingerprint: chatHash,
        updateKind,
        command,
        status: (appointmentCallbackResult.handled && !appointmentCallbackResult.ok) ||
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
export async function registerTelegramWebhookRoutes(app) {
    app.post("/api/telegram/webhook", handleWebhook);
    app.post("/api/telegram/webhook/:organizationId/:botConfigId", handleWebhook);
    app.post("/api/telegram/webhook/:organizationId", handleWebhook);
}
function registerTelegramStatusRoutes(app, telegramControlPlaneRouteOptions) {
    app.get("/api/telegram/status", telegramControlPlaneRouteOptions, async () => buildStatus());
    app.get("/api/telegram/status/:organizationId", telegramControlPlaneRouteOptions, async (request, reply) => {
        const runtimeResult = resolveTelegramRuntimeContext(request.params.organizationId);
        if (!runtimeResult.ok) {
            return reply.code(runtimeResult.statusCode).send({
                error: runtimeResult.error,
                message: runtimeResult.message
            });
        }
        return buildStatus(request.params.organizationId);
    });
    app.get("/api/telegram/status/:organizationId/:botConfigId", telegramControlPlaneRouteOptions, async (request, reply) => {
        const runtimeResult = resolveTelegramRuntimeContext(request.params.organizationId, request.params.botConfigId);
        if (!runtimeResult.ok) {
            return reply.code(runtimeResult.statusCode).send({
                error: runtimeResult.error,
                message: runtimeResult.message
            });
        }
        return buildStatus(request.params.organizationId, request.params.botConfigId);
    });
}
function registerTelegramSettingsRoutes(app, telegramControlPlaneRouteOptions) {
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
        const input = parsedInput.value;
        try {
            updateDenteTelegramBotSettings(input);
        }
        catch (settingsError) {
            return reply.code(400).send({
                error: "TelegramSettingsValidationFailed",
                message: readableTelegramSettingsValidationMessage(settingsError)
            });
        }
        return buildStatus();
    });
    app.get("/api/telegram/feature-plan", telegramControlPlaneRouteOptions, async () => buildFeaturePlan(getDenteTelegramBotSettings()));
}
function registerTelegramOutboxRoutes(app, telegramControlPlaneRouteOptions) {
    app.get("/api/telegram/outbox", telegramControlPlaneRouteOptions, async (request, reply) => {
        const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(request.query);
        if (!runtimeResult.ok) {
            return reply.code(runtimeResult.statusCode).send({
                error: runtimeResult.error,
                message: runtimeResult.message
            });
        }
        return buildDenteTelegramOutbox(parseTelegramOutboxQuery(request.query), runtimeResult.runtime.runtimeScope);
    });
    app.post("/api/telegram/outbox/:itemId/send", telegramControlPlaneRouteOptions, async (request, reply) => {
        const parsedInput = parseTelegramRouteBody(denteTelegramOutboxSendRequestSchema, request.body ?? {});
        if (!parsedInput.ok)
            return sendTelegramValidationError(reply);
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
    app.post("/api/telegram/outbox/send-due", telegramControlPlaneRouteOptions, async (request, reply) => {
        const input = parseTelegramOutboxSendDueInput(request.body ?? {});
        if (!input)
            return sendTelegramValidationError(reply, "TelegramOutboxDueValidationFailed");
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
}
function registerTelegramLinkRoutes(app, telegramControlPlaneRouteOptions) {
    app.post("/api/telegram/link-codes", telegramControlPlaneRouteOptions, async (request, reply) => {
        const parsedInput = parseTelegramRouteBody(createDenteTelegramLinkCodeSchema, request.body);
        if (!parsedInput.ok)
            return sendTelegramValidationError(reply);
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
                message: "��� �������� Telegram ��������� � ������ �������."
            });
        }
        if (settings.mode === "disabled" || !settings.enabledFeatures.includes("patient_linking")) {
            return reply.code(409).send({
                error: "TelegramLinkingDisabled",
                message: "�������� Telegram ��������� � ���������� �������."
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
        }
        catch (linkCodeError) {
            const rejection = telegramLinkCodeRejection(linkCodeError);
            return reply.code(409).send({
                error: rejection.error,
                reason: rejection.reason,
                message: rejection.message
            });
        }
    });
    app.get("/api/telegram/link-codes", telegramControlPlaneRouteOptions, async (request, reply) => {
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
    app.get("/api/telegram/chat-links", telegramControlPlaneRouteOptions, async (request, reply) => {
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
    app.post("/api/telegram/chat-links/:linkId/revoke", telegramControlPlaneRouteOptions, async (request, reply) => {
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
}
function registerTelegramPreviewRoutes(app, telegramControlPlaneRouteOptions) {
    app.post("/api/telegram/messages/preview", telegramControlPlaneRouteOptions, async (request, reply) => {
        const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(request.query);
        if (!runtimeResult.ok) {
            return reply.code(runtimeResult.statusCode).send({
                error: runtimeResult.error,
                message: runtimeResult.message
            });
        }
        const parsedInput = parseTelegramRouteBody(denteTelegramMessagePreviewRequestSchema, request.body);
        if (!parsedInput.ok)
            return sendTelegramValidationError(reply);
        const input = parsedInput.value;
        try {
            return renderDenteTelegramMessagePreview(input, runtimeResult.runtime.context.settings);
        }
        catch (previewError) {
            const rejection = telegramMessagePreviewRejection(previewError);
            return reply.code(404).send({ error: "TelegramMessagePreviewNotFound", reason: rejection.reason, message: rejection.message });
        }
    });
}
export async function registerTelegramRoutes(app) {
    const telegramControlPlaneRouteOptions = { preHandler: requireTelegramControlPlaneAccess };
    registerTelegramStatusRoutes(app, telegramControlPlaneRouteOptions);
    registerTelegramSettingsRoutes(app, telegramControlPlaneRouteOptions);
    registerTelegramOutboxRoutes(app, telegramControlPlaneRouteOptions);
    registerTelegramLinkRoutes(app, telegramControlPlaneRouteOptions);
    registerTelegramPreviewRoutes(app, telegramControlPlaneRouteOptions);
}
