import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { db } from "../../db/client.js";
import { communicationTasks } from "../../db/schema.js";
import type {
	DenteTelegramOutboxItem,
	DenteTelegramOutboxSendRequest,
	DenteTelegramOutboxDeliveryStatus,
	DenteTelegramOutboxDeliveryReceipt,
} from "@dental/shared";
import type { DomainState } from "../../services/telegram/telegramLegacyMemoryStore.js";
import {
	claimDenteTelegramOutboxDeliveryReceipt,
	denteTelegramOutboxDeliveryReceipts,
	findDenteTelegramOutboxDeliveryReceipt,
	prepareDenteTelegramOutboxDelivery,
	recordDenteTelegramOutboxDelivery,
} from "../../services/telegram/telegramLegacyMemoryStore.js";
import {
	sendTelegramPhotoMessage,
	sendTelegramTextMessage,
	type SendTelegramPhotoMessageInput,
	type TelegramTransportResult,
} from "../../telegramTransport.js";
import {
	telegramPhotoSentTextFailedBlockedReason,
	telegramOutboxScheduleUnreadableBlockedReason,
	type TelegramOutboxScheduleState,
	type TelegramOutboxDeliveredParts,
	type TelegramOutboxTransportSenders,
	type TelegramOutboxPartDeliveryInput,
	type TelegramOutboxPartDeliveryOutcome,
	type TelegramOutboxSendExecutionResult,
	type TelegramResolvedOutboxRuntime,
} from "./types.js";
import {
	telegramPhotoCaptionSplitTextWarning,
	telegramPhotoFallbackWarning,
	telegramPhotoMessageReference,
	telegramPhotoPartialDeliveryWarning,
	telegramPhotoAlreadyDeliveredWarning,
	telegramOutboxTransportFailureWarning,
	outboxDeliveryClaimKey,
	readableTelegramText,
} from "./telegramUtils.js";

export const telegramPhotoCaptionMaxLength = 1024;
export const telegramSplitPhotoCaption =
	"DENTE: сообщение клиники. Полный текст ниже.";

export const telegramOutboxNothingDelivered: TelegramOutboxDeliveredParts = {
	photoDelivered: false,
	photoMessageId: null,
};

/**
 * БЫЛО: `return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;` — неразобранная дата
 * означала «пора отправлять». То есть отказ прочитать время превращался в разрешение отправить
 * немедленно: напоминание, назначенное на следующий вторник, ушло бы пациенту сегодня ночью.
 * Fail-open на времени отправки не бывает правильным ни в одном случае, поэтому нечитаемое время —
 * отдельное состояние, и вызывающий обязан его обработать, а не спутать с «пора».
 */
export function telegramOutboxScheduleState(
	scheduledAt: string,
	nowMs: number,
): TelegramOutboxScheduleState {
	const scheduledAtMs = Date.parse(scheduledAt);
	if (!Number.isFinite(scheduledAtMs)) return "unreadable";
	return scheduledAtMs <= nowMs ? "due" : "not_due";
}

export function isDenteTelegramOutboxItemDue(
	item: DenteTelegramOutboxItem,
	nowMs: number,
): boolean {
	return telegramOutboxScheduleState(item.scheduledAt, nowMs) === "due";
}

/** Значение показывается оператору как есть, поэтому обрезается: в поле может лежать что угодно. */
export function telegramOutboxScheduleUnreadableWarning(scheduledAt: string): string {
	const shown = scheduledAt.trim().slice(0, 64) || "пусто";
	return `Время отправки не распознано как дата (${shown}). Сообщение НЕ отправлено; исправьте время в задаче коммуникации.`;
}

/**
 * Какие части сообщения уже лежат у пациента в чате. "Фото + текст" уходит двумя вызовами
 * Telegram, поэтому провал второго вызова НЕ означает, что не доставлено ничего.
 */

export function telegramOutboxDeliveredParts(
	receipt: DenteTelegramOutboxDeliveryReceipt | null | undefined,
): TelegramOutboxDeliveredParts {
	if (receipt?.status !== "failed") return telegramOutboxNothingDelivered;
	if (receipt.blockedReason !== telegramPhotoSentTextFailedBlockedReason)
		return telegramOutboxNothingDelivered;
	return {
		photoDelivered: true,
		photoMessageId:
			typeof receipt.telegramMessageId === "number"
				? receipt.telegramMessageId
				: null,
	};
}

/**
 * БЫЛО: признак «фото уже у пациента» искался только по паре (позиция, clientMutationId) —
 * `findDenteTelegramOutboxDeliveryReceipt` (`sampleData.ts:8776-8786`) это Map по
 * `${outboxItemId}:${clientMutationId}`. Автоповтор воркера строит clientMutationId детерминированно
 * и потому признак находил, а два других повтора — нет:
 *  1. оператор из интерфейса: `sendTelegramOutboxItem` (`useAppLogic.tsx:13140-13143`) берёт НОВЫЙ
 *     `crypto.randomUUID()` на каждый клик, поэтому его повтор после частичной доставки не находил
 *     ничего и звал sendPhoto заново — пациент получал фото второй раз;
 *  2. сдвиг времени: `dueOutboxClientMutationId(item.id, item.scheduledAt)` включает scheduledAt в
 *     хеш, поэтому смена времени между тиками меняла ключ и признак терялся так же.
 * Фото лежит в чате у ПОЗИЦИИ, а не у попытки, поэтому и признак ищется по позиции. Квитанции лежат
 * новыми вперёд (`unshift`), так что первый найденный message_id — самый свежий.
 */
export function telegramOutboxDeliveredPartsForItem(
	outboxItemId: string,
	replay?: DenteTelegramOutboxDeliveryReceipt | null,
): TelegramOutboxDeliveredParts {
	const fromReplay = telegramOutboxDeliveredParts(replay);
	if (fromReplay.photoDelivered && fromReplay.photoMessageId !== null)
		return fromReplay;
	let photoDeliveredWithoutMessageId = fromReplay.photoDelivered;
	for (const receipt of denteTelegramOutboxDeliveryReceipts) {
		if (receipt.outboxItemId !== outboxItemId) continue;
		const delivered = telegramOutboxDeliveredParts(receipt);
		if (!delivered.photoDelivered) continue;
		if (delivered.photoMessageId !== null) return delivered;
		photoDeliveredWithoutMessageId = true;
	}
	return photoDeliveredWithoutMessageId
		? { photoDelivered: true, photoMessageId: null }
		: telegramOutboxNothingDelivered;
}

export const telegramOutboxLiveSenders: TelegramOutboxTransportSenders = {
	sendPhoto: sendTelegramPhotoMessage,
	sendText: sendTelegramTextMessage,
};

type TelegramOutboxPartDeliveryInput = {
	readonly botToken: string;
	readonly chatId: string;
	readonly text: string;
	readonly photoUrl: string | null;
	readonly replyMarkup: Record<string, unknown> | null;
	readonly timeoutMs: number;
	readonly warnings: readonly string[];
	readonly alreadyDelivered: TelegramOutboxDeliveredParts;
	readonly senders?: TelegramOutboxTransportSenders;
};

type TelegramOutboxPartDeliveryOutcome = {
	readonly transport: TelegramTransportResult;
	readonly warnings: string[];
	readonly delivered: TelegramOutboxDeliveredParts;
};

/**
 * БЫЛО: последовательность "фото, затем полный текст" жила безымянной IIFE внутри отправки и
 * возвращала только результат ПОСЛЕДНЕГО вызова Telegram. Если фото уходило, а текст под ним нет,
 * вся позиция помечалась как полностью проваленная, message_id фото выбрасывался, и повторная
 * попытка (её включает clientMutationId с префиксом "due-") начинала с нуля — пациент получал
 * фото второй раз. Теперь доставленные части передаются внутрь и уже отправленное не повторяется.
 */
export async function deliverTelegramOutboxParts(
	input: TelegramOutboxPartDeliveryInput,
): Promise<TelegramOutboxPartDeliveryOutcome> {
	const senders = input.senders ?? telegramOutboxLiveSenders;
	const warnings = [...input.warnings];
	const photoUrl = input.photoUrl?.trim() || null;
	let delivered = input.alreadyDelivered;

	if (photoUrl && delivered.photoDelivered) {
		warnings.push(
			telegramPhotoAlreadyDeliveredWarning(delivered.photoMessageId),
		);
	} else if (photoUrl) {
		const shouldSplitPhotoCaption =
			input.text.length > telegramPhotoCaptionMaxLength;
		const photoTransport = await senders.sendPhoto({
			botToken: input.botToken,
			chatId: input.chatId,
			photoUrl,
			caption: shouldSplitPhotoCaption ? telegramSplitPhotoCaption : input.text,
			replyMarkup: shouldSplitPhotoCaption ? null : input.replyMarkup,
			timeoutMs: input.timeoutMs,
		});
		if (photoTransport.ok && !shouldSplitPhotoCaption) {
			return { transport: photoTransport, warnings, delivered };
		}
		if (photoTransport.ok) {
			delivered = {
				photoDelivered: true,
				photoMessageId: photoTransport.telegramMessageId,
			};
			warnings.push("telegram_photo_caption_split");
		} else {
			warnings.push(telegramPhotoFallbackWarning(photoTransport));
		}
	}

	const textTransport = await senders.sendText({
		botToken: input.botToken,
		chatId: input.chatId,
		text: input.text,
		replyMarkup: input.replyMarkup,
		timeoutMs: input.timeoutMs,
	});
	if (!textTransport.ok && delivered.photoDelivered) {
		warnings.push(telegramPhotoCaptionSplitTextWarning(textTransport));
		warnings.push(
			telegramPhotoPartialDeliveryWarning(delivered.photoMessageId),
		);
	}
	return { transport: textTransport, warnings, delivered };
}

export async function executeTelegramOutboxSend(
	outboxItemId: string,
	input: DenteTelegramOutboxSendRequest,
	runtime?: TelegramResolvedOutboxRuntime,
	domainState?: DomainState,
): Promise<TelegramOutboxSendExecutionResult> {
	const clientMutationId = input.clientMutationId?.trim() || null;
	const replay = findDenteTelegramOutboxDeliveryReceipt(
		outboxItemId,
		clientMutationId,
	);
	if (
		replay &&
		!(replay.status === "failed" && clientMutationId?.startsWith("due-"))
	) {
		const body = denteTelegramOutboxSendResponseSchema.parse({
			...replay,
			warnings: [...replay.warnings, "idempotent_replay"],
			retryAfterSeconds: null,
		});
		return {
			statusCode:
				replay.status === "failed"
					? 502
					: replay.status === "blocked"
						? 409
						: 200,
			body,
		};
	}

	const runtimeResult = runtime
		? { ok: true as const, runtime }
		: resolveTelegramOutboxRuntimeScopeFromQuery({});
	if (!runtimeResult.ok) {
		return {
			statusCode: runtimeResult.statusCode,
			body: {
				error: runtimeResult.error,
				message: runtimeResult.message,
			},
		};
	}

	const token = runtimeResult.runtime.context.botToken;
	const prepared = prepareDenteTelegramOutboxDelivery(
		outboxItemId,
		runtimeResult.runtime.runtimeScope,
		domainState,
	);

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
				blockedReason: prepared.blockedReason,
			}),
		};
	}

	// Нечитаемое время отправки останавливает отправку и в ручном роуте, и в пакетном: оба входа идут
	// через эту функцию. Проверка стоит ДО dry-run, потому что предпросмотр «отправлю» по битому времени
	// так же обманывает оператора, как и сама отправка.
	if (
		telegramOutboxScheduleState(prepared.item.scheduledAt, Date.now()) ===
		"unreadable"
	) {
		return {
			statusCode: 409,
			body: denteTelegramOutboxSendResponseSchema.parse({
				status: "blocked",
				outboxItem: prepared.item,
				taskId: prepared.item.taskId,
				eventId: null,
				telegramMessageId: null,
				clientMutationId,
				warnings: [
					...prepared.warnings,
					telegramOutboxScheduleUnreadableWarning(prepared.item.scheduledAt),
				],
				retryAfterSeconds: null,
				blockedReason: telegramOutboxScheduleUnreadableBlockedReason,
			}),
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
				blockedReason: "client_mutation_id_required",
			}),
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
				blockedReason: "telegram_bot_token_missing",
			}),
		};
	}

	// 1. Определение экстренности сообщения (CITO)
	const isCitoEmergency =
		prepared.item.templateKind === "post_visit_checkup" ||
		/cito|острая боль|экстренн|кровотеч|осложнен|температур|гной|пульпит/i.test(
			`${prepared.item.title} ${prepared.item.previewText} ${prepared.text}`,
		);

	// 2. Проверка квоты B2B SaaS тарифа клиники с CITO-исключением
	const quotaAuth = TelegramBotBillingService.checkQuotaAndAuthorizeSend({
		organizationId: runtimeResult.runtime.context.organizationId,
		isCitoEmergency,
	});

	if (!quotaAuth.allowed) {
		return {
			statusCode: 409,
			body: denteTelegramOutboxSendResponseSchema.parse({
				status: "blocked",
				outboxItem: prepared.item,
				taskId: prepared.item.taskId,
				eventId: null,
				telegramMessageId: null,
				clientMutationId,
				warnings: [...prepared.warnings, "telegram_quota_limit_exceeded"],
				retryAfterSeconds: null,
				blockedReason: "telegram_quota_exceeded",
			}),
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
				blockedReason: null,
			}),
		};
	}

	const deliveryClientMutationId = clientMutationId;
	if (!deliveryClientMutationId) {
		throw new Error("Идентификатор клиентской мутации (clientMutationId) отсутствует после валидации");
	}

	const claimKey = outboxDeliveryClaimKey(
		prepared.item.id,
		deliveryClientMutationId,
	);
	const durableReplay = claimDenteTelegramOutboxDeliveryReceipt(
		prepared.item,
		deliveryClientMutationId,
		prepared.warnings,
	);
	if (durableReplay) {
		const body = denteTelegramOutboxSendResponseSchema.parse({
			...durableReplay,
			warnings: [...durableReplay.warnings, "idempotent_replay"],
			retryAfterSeconds: null,
		});
		return {
			statusCode:
				durableReplay.status === "failed"
					? 502
					: durableReplay.status === "blocked"
						? 409
						: 200,
			body,
		};
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
				blockedReason: "telegram_delivery_in_progress",
			}),
		};
	}

	telegramOutboxDeliveryClaims.add(claimKey);
	const deliveryText = repairMojibakeText(prepared.text);
	const deliveryReplyMarkup = readableTelegramPayload(prepared.replyMarkup);
	const partDelivery = await deliverTelegramOutboxParts({
		botToken: token,
		chatId: prepared.chatId,
		text: deliveryText,
		photoUrl: prepared.photoUrl,
		replyMarkup: deliveryReplyMarkup,
		timeoutMs: configuredSendTimeoutMs(),
		warnings: prepared.warnings,
		alreadyDelivered: telegramOutboxDeliveredPartsForItem(
			prepared.item.id,
			replay,
		),
	}).finally(() => {
		telegramOutboxDeliveryClaims.delete(claimKey);
	});
	const transport = partDelivery.transport;
	const deliveryWarnings = partDelivery.warnings;

	if (!transport.ok) {
		const retryAfterSeconds = telegramRetryAfterSeconds(transport);
		const transportWarning = telegramOutboxTransportFailureWarning(transport);
		const warnings = [...deliveryWarnings, transportWarning];
		// Фото уже у пациента — фиксируем это в квитанции, иначе повтор отправит его снова.
		const photoAlreadyWithPatient = partDelivery.delivered.photoDelivered;
		const failureBlockedReason = photoAlreadyWithPatient
			? telegramPhotoSentTextFailedBlockedReason
			: "telegram_transport_failed";
		const deliveredPhotoMessageId = photoAlreadyWithPatient
			? partDelivery.delivered.photoMessageId
			: null;
		const delivery = recordDenteTelegramOutboxDelivery({
			item: prepared.item,
			status: "failed",
			message: transportWarning,
			telegramMessageId: deliveredPhotoMessageId,
			clientMutationId: deliveryClientMutationId,
			warnings,
			blockedReason: failureBlockedReason,
		});
		return {
			statusCode: 502,
			body: denteTelegramOutboxSendResponseSchema.parse({
				status: "failed",
				outboxItem: prepared.item,
				taskId: delivery.taskId,
				eventId: delivery.eventId,
				telegramMessageId: deliveredPhotoMessageId,
				clientMutationId: deliveryClientMutationId,
				warnings,
				retryAfterSeconds,
				blockedReason: failureBlockedReason,
			}),
		};
	}

	const delivery = recordDenteTelegramOutboxDelivery({
		item: prepared.item,
		status: "sent",
		telegramMessageId: transport.telegramMessageId,
		message: `Telegram safe template sent: ${prepared.item.templateKind}`,
		clientMutationId: deliveryClientMutationId,
		warnings: deliveryWarnings,
		blockedReason: null,
	});

	// Фиксация расхода в биллинге клиники
	TelegramBotBillingService.recordMessageSent({
		organizationId: runtimeResult.runtime.context.organizationId,
		isCitoEmergency,
		messageKind: prepared.item.templateKind,
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
			blockedReason: null,
		}),
	};
}