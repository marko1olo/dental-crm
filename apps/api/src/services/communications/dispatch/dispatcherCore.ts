/**
 * @file dispatcherCore.ts
 * @description Layer 3: Core omnichannel communications dispatch engine,
 * transactional message enqueueing, outbox batch processing, and CommunicationsDispatcher facade.
 */

import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../../db/rls.js";
import { communicationOutbox } from "../../../db/schema.js";
import {
	type CommunicationChannelCode,
	type CommunicationConsentScope,
	isMachineDeliverableChannel,
	resolveChannelCredentials,
	sendThroughChannel,
} from "../channelRouter.js";
import {
	type DeliveryErrorClass,
	decideAfterFailure,
	decideConsent,
	decideQuietHours,
} from "../deliveryPolicy.js";
import { MessageTemplateEngine } from "../MessageTemplateEngine.js";
import { checkChannelFit } from "../templateRenderer.js";
import { resolveRecipientAddress } from "./channelAdapters.js";
import {
	claimBatch,
	countQueueRemainder,
	countSentToday,
	loadConsents,
	markDeferred,
	markSuppressed,
	releaseStuckLocks,
} from "./outboxRetryQueue.js";
import { resolveCommunicationSettings } from "./templateRenderer.js";
import type {
	DispatchOptions,
	DispatchReport,
	EnqueueMessageInput,
	EnqueueMessageResult,
	OutboxRow,
	ProcessRowContext,
	RowOutcome,
} from "./types.js";

export async function enqueueMessage(
	input: EnqueueMessageInput,
): Promise<EnqueueMessageResult> {
	if (!isMachineDeliverableChannel(input.channel)) {
		return {
			ok: false,
			reason: `Канал «${input.channel}» не отправляется автоматически — это задача сотруднику, а не сообщение в очереди.`,
		};
	}
	const body = input.body.trim();
	if (!body) return { ok: false, reason: "Пустой текст сообщения." };

	const secrecy = MessageTemplateEngine.detectMedicalSecrecyLeaks(body);
	if (secrecy.hasLeak) {
		return {
			ok: false,
			reason: `Отправка медицинских сведений, диагнозов или формулы зубов по открытым каналам связи запрещена (152-ФЗ / 323-ФЗ ст. 13): ${secrecy.reasons.join("; ")}`,
		};
	}

	// Длина проверяется на входе, а не при отправке: узнать о том, что SMS
	// разрослась на восемь сегментов, нужно до того, как за неё заплатят.
	const fit = checkChannelFit(input.channel, body);
	if (!fit.ok) return { ok: false, reason: fit.problems.join(" ") };

	let recipientAddress = input.recipientAddress?.trim() || null;
	if (!recipientAddress) {
		if (!input.patientId)
			return { ok: false, reason: "Не указан ни получатель, ни пациент." };
		const resolved = await resolveRecipientAddress(
			input.organizationId,
			input.channel,
			input.patientId,
		);
		if (!resolved.address)
			return { ok: false, reason: resolved.reason ?? "Отправлять некуда." };
		recipientAddress = resolved.address;
	}

	const scheduledAt = input.scheduledAt ?? new Date();
	// Постановка в очередь — ЗАПИСЬ, а не чтение, и без контекста она не
	// «возвращала ноль строк», а падала с 42501: в WITH CHECK политики
	// communication_outbox дизъюнкта обхода нет. Арендатор известен из входа.
	return withTenantCtx(input.organizationId, async (tx) => {
		const [inserted] = await tx
			.insert(communicationOutbox)
			.values({
				organizationId: input.organizationId,
				clinicId: input.clinicId ?? null,
				patientId: input.patientId ?? null,
				taskId: input.taskId ?? null,
				templateId: input.templateId ?? null,
				campaignId: input.campaignId ?? null,
				channel: input.channel,
				intent: input.intent,
				scope: input.scope ?? "service",
				recipientAddress,
				subject: input.subject?.trim() || null,
				body,
				status: "queued",
				scheduledAt,
				nextAttemptAt: scheduledAt,
				maxAttempts: input.maxAttempts ?? 5,
				dedupeKey: input.dedupeKey,
			})
			// Повтор постановки — обычное дело при перезапуске планировщика.
			// Это не ошибка и не повод отправить второе сообщение.
			.onConflictDoNothing({
				target: [
					communicationOutbox.organizationId,
					communicationOutbox.dedupeKey,
				],
			})
			.returning({ id: communicationOutbox.id });

		if (inserted)
			return { ok: true as const, outboxId: inserted.id, duplicate: false };

		const [existing] = await tx
			.select({ id: communicationOutbox.id })
			.from(communicationOutbox)
			.where(
				and(
					eq(communicationOutbox.organizationId, input.organizationId),
					eq(communicationOutbox.dedupeKey, input.dedupeKey),
				),
			)
			.limit(1);

		return existing
			? { ok: true as const, outboxId: existing.id, duplicate: true }
			: {
					ok: false as const,
					reason: "Не удалось поставить сообщение в очередь.",
				};
	});
}

/**
 * Одна строка очереди: проверки, отправка, запись итога. Возвращает, что
 * именно произошло, — отчёт собирается вызывающим.
 */
export async function processRow(
	row: OutboxRow,
	context: ProcessRowContext,
): Promise<RowOutcome> {
	const { credentials, settings, now } = context;
	const channel = row.channel as CommunicationChannelCode;
	const scope = row.scope as CommunicationConsentScope;

	if (!isMachineDeliverableChannel(channel)) {
		await markSuppressed(row, "Канал не отправляется автоматически.", now);
		return "suppressed";
	}

	const secrecy = MessageTemplateEngine.detectMedicalSecrecyLeaks(row.body);
	if (secrecy.hasLeak) {
		await markSuppressed(
			row,
			`152-ФЗ / 323-ФЗ ст. 13: Запрещена отправка врачебной тайны (${secrecy.reasons.join(", ")})`,
			now,
		);
		return "suppressed";
	}

	/*
	 * ОТВЕТ НА ОБРАЩЕНИЕ ПАЦИЕНТА — единственное исключение из проверок согласия
	 * и тихих часов.
	 *
	 * Пациент написал «СТОП»: согласие отозвано в ту же секунду, поэтому обычная
	 * проверка запретила бы даже подтверждение его собственной просьбы, а тихие
	 * часы отложили бы ответ до утра. Человек в этот момент ждёт ответа и не
	 * знает, услышали его или нет.
	 *
	 * Исключение узкое по построению: оно привязано к назначению
	 * transactional_reply, которое ставится только в разборе входящих сообщений
	 * (services/messengerIngestion.ts) в ответ на действие пациента, и никогда —
	 * рассылками, напоминаниями или ручной отправкой. Суточный предел сообщений
	 * пациенту при этом СОХРАНЯЕТСЯ: он защищает от цикла, если пациент шлёт
	 * «СТОП» десять раз подряд.
	 */
	const isTransactionalReply = row.intent === "transactional_reply";

	// Согласие проверяется здесь, а не при постановке: за время ожидания в
	// очереди пациент мог отказаться, и отправить после отказа — нарушение.
	if (row.patientId) {
		if (!isTransactionalReply) {
			const consent = decideConsent(
				context.consents.get(row.patientId) ?? [],
				channel,
				scope,
			);
			if (!consent.allowed) {
				await markSuppressed(
					row,
					consent.reason ?? "Нет согласия на сообщения по этому каналу.",
					now,
				);
				return "suppressed";
			}
		}

		// Суточный предел действует и для ответа на обращение: он защищает от
		// цикла, если пациент отправит «СТОП» десять раз подряд.
		const alreadySent = context.sentToday.get(row.patientId) ?? 0;
		if (alreadySent >= settings.dailyLimitPerPatient) {
			await markSuppressed(
				row,
				`Достигнут суточный предел сообщений пациенту (${settings.dailyLimitPerPatient}).`,
				now,
			);
			return "suppressed";
		}
	}

	// Тихие часы к ответу на обращение не применяются: пациент написал сейчас и
	// ждёт ответа сейчас, а не в девять утра.
	const quietHours = isTransactionalReply
		? ({ action: "send" } as const)
		: decideQuietHours(now, scope, settings);
	if (quietHours.action === "suppress") {
		await markSuppressed(row, quietHours.reason, now);
		return "suppressed";
	}
	if (quietHours.action === "defer") {
		await markDeferred(
			row,
			quietHours.notBefore,
			"Тихие часы: отправка отложена до утра.",
			now,
		);
		return "deferred";
	}

	const attempt = row.attempts + 1;
	const result = await sendThroughChannel(
		{
			channel,
			recipientAddress: row.recipientAddress,
			subject: row.subject,
			body: row.body,
			idempotencyKey: row.dedupeKey,
		},
		credentials,
	);

	if (result.ok) {
		await db
			.update(communicationOutbox)
			.set({
				status: "sent",
				attempts: attempt,
				sentAt: now,
				lockedAt: null,
				lockedBy: null,
				providerMessageId: result.providerMessageId,
				segments: result.segments,
				lastErrorClass: null,
				lastErrorMessage: null,
				updatedAt: now,
			})
			.where(eq(communicationOutbox.id, row.id));
		if (row.patientId) {
			context.sentToday.set(
				row.patientId,
				(context.sentToday.get(row.patientId) ?? 0) + 1,
			);
		}
		return "sent";
	}

	const outcome = decideAfterFailure({
		attempt,
		maxAttempts: row.maxAttempts,
		errorClass: result.errorClass as DeliveryErrorClass,
		errorMessage: result.errorMessage,
		settings,
		jitterSeed: row.id,
	});

	if (outcome.kind === "retry") {
		await db
			.update(communicationOutbox)
			.set({
				status: "queued",
				attempts: attempt,
				lockedAt: null,
				lockedBy: null,
				nextAttemptAt: new Date(now.getTime() + outcome.delaySeconds * 1000),
				lastErrorClass: outcome.errorClass,
				lastErrorMessage: outcome.errorMessage,
				updatedAt: now,
			})
			.where(eq(communicationOutbox.id, row.id));
		return "retried";
	}

	// Динамический каскадный переход на резервный канал (Dynamic Channel Fallback Cascade)
	// Если отправка в текущий канал завершилась неустранимой ошибкой (блокировка чата,
	// отсутствие аккаунта или ненастроенный транспорт), проверяем следующие каналы
	// в цепочке настроек (напр. Telegram -> WhatsApp -> SMS).
	if (
		outcome.kind !== "suppressed" &&
		row.patientId &&
		Array.isArray(settings.channelFallback) &&
		settings.channelFallback.length > 1
	) {
		const currentIdx = settings.channelFallback.indexOf(channel);
		if (currentIdx >= 0 && currentIdx < settings.channelFallback.length - 1) {
			for (
				let nextIdx = currentIdx + 1;
				nextIdx < settings.channelFallback.length;
				nextIdx++
			) {
				const nextChannel = settings.channelFallback[nextIdx];
				if (!nextChannel || !isMachineDeliverableChannel(nextChannel)) continue;

				const nextAddr = await resolveRecipientAddress(
					row.organizationId,
					nextChannel,
					row.patientId,
				);
				if (nextAddr.address) {
					const fit = checkChannelFit(nextChannel, row.body);
					if (fit.ok) {
						await db
							.update(communicationOutbox)
							.set({
								channel: nextChannel,
								recipientAddress: nextAddr.address,
								status: "queued",
								attempts: 0,
								lockedAt: null,
								lockedBy: null,
								nextAttemptAt: now,
								lastErrorClass: outcome.errorClass,
								lastErrorMessage: `Каскад доставки: сбой канала ${channel} (${outcome.errorMessage ?? "ошибка"}), эскалация на ${nextChannel}`,
								updatedAt: now,
							})
							.where(eq(communicationOutbox.id, row.id));
						return "retried";
					}
				}
			}
		}
	}

	await db
		.update(communicationOutbox)
		.set({
			status: outcome.kind === "suppressed" ? "suppressed" : "failed",
			attempts: attempt,
			lockedAt: null,
			lockedBy: null,
			lastErrorClass: outcome.errorClass,
			lastErrorMessage: outcome.errorMessage,
			updatedAt: now,
		})
		.where(eq(communicationOutbox.id, row.id));

	return outcome.kind === "suppressed" ? "not_configured" : "failed";
}

/**
 * Клиники, у которых в очереди есть строка, требующая внимания этого прохода:
 * подошедшая по сроку либо зависшая в захвате. Порядок — по срочности, чтобы
 * общий бюджет пачки доставался сначала тем, у кого срок раньше.
 */
export async function listOutboxOrganizations(
	now: Date,
	stuckLockMinutes: number,
): Promise<string[]> {
	const stuckThreshold = new Date(now.getTime() - stuckLockMinutes * 60_000);
	const rows = await withSuperuserBypass(async (tx) =>
		tx
			.select({ organizationId: communicationOutbox.organizationId })
			.from(communicationOutbox)
			.where(
				or(
					eq(communicationOutbox.status, "queued" as const),
					and(
						eq(communicationOutbox.status, "sending" as const),
						or(
							lt(communicationOutbox.lockedAt, stuckThreshold),
							sql`${communicationOutbox.lockedAt} IS NULL`,
						),
					),
				),
			)
			.groupBy(communicationOutbox.organizationId)
			.orderBy(sql`min(${communicationOutbox.nextAttemptAt}) asc nulls first`),
	);
	return rows.map((row) => row.organizationId);
}

/**
 * Проход по очереди ОДНОЙ клиники. Вызывается уже внутри `withTenantCtx`, то
 * есть все запросы ниже идут под её арендатором.
 */
export async function dispatchForOrganization(input: {
	readonly organizationId: string;
	readonly now: Date;
	readonly batchSize: number;
	readonly workerId: string;
	readonly stuckLockMinutes: number;
}): Promise<DispatchReport> {
	const { now, workerId, stuckLockMinutes, batchSize } = input;
	const organizationScope = input.organizationId;
	const releasedStuck = await releaseStuckLocks(
		now,
		stuckLockMinutes,
		organizationScope,
	);
	// Бюджет прохода мог кончиться на предыдущих клиниках: тогда строки не
	// забираются вовсе, но остаток очереди этой клиники всё равно считается.
	const claimed =
		batchSize > 0
			? await claimBatch(now, batchSize, workerId, organizationScope)
			: [];
	const handledIds = claimed.map((row) => row.id);
	const report = {
		claimed: claimed.length,
		sent: 0,
		retried: 0,
		failed: 0,
		suppressed: 0,
		notConfigured: 0,
		deferred: 0,
		releasedStuck,
		awaitingRetry: 0,
		awaitingSchedule: 0,
	};
	if (claimed.length === 0) {
		return {
			...report,
			...(await countQueueRemainder(now, organizationScope, handledIds)),
		};
	}

	const byOrganization = new Map<string, OutboxRow[]>();
	for (const row of claimed) {
		const list = byOrganization.get(row.organizationId) ?? [];
		list.push(row);
		byOrganization.set(row.organizationId, list);
	}

	for (const [organizationId, rows] of byOrganization) {
		const [credentials, settings] = await Promise.all([
			resolveChannelCredentials(organizationId),
			resolveCommunicationSettings(organizationId),
		]);
		const patientIds = [
			...new Set(
				rows
					.map((row) => row.patientId)
					.filter((id): id is string => Boolean(id)),
			),
		];
		const [consents, sentToday] = await Promise.all([
			loadConsents(organizationId, patientIds),
			countSentToday(organizationId, patientIds, now),
		]);

		const unknownFailures = new Map<string, string[]>();
		for (const row of rows) {
			try {
				const outcome = await processRow(row, {
					credentials,
					settings,
					consents,
					sentToday,
					now,
				});

				switch (outcome) {
					case "sent":
						report.sent += 1;
						break;
					case "retried":
						report.retried += 1;
						break;
					case "failed":
						report.failed += 1;
						break;
					case "suppressed":
						report.suppressed += 1;
						break;
					case "not_configured":
						report.notConfigured += 1;
						break;
					case "deferred":
						report.deferred += 1;
						break;
					default: {
						const unhandled: never = outcome;
						throw new Error(`Неизвестный итог отправки: ${String(unhandled)}`);
					}
				}
			} catch (error) {
				report.retried += 1;
				const errorMessage =
					error instanceof Error
						? error.message.slice(0, 500)
						: String(error).slice(0, 500);
				const failureGroup = unknownFailures.get(errorMessage) ?? [];
				failureGroup.push(row.id);
				unknownFailures.set(errorMessage, failureGroup);
			}
		}

		for (const [errorMessage, ids] of unknownFailures) {
			if (ids.length > 0) {
				await db
					.update(communicationOutbox)
					.set({
						status: "queued",
						attempts: sql`${communicationOutbox.attempts} + 1`,
						lockedAt: null,
						lockedBy: null,
						nextAttemptAt: new Date(now.getTime() + 60_000),
						lastErrorClass: "unknown",
						lastErrorMessage: errorMessage,
						updatedAt: now,
					})
					.where(inArray(communicationOutbox.id, ids));
			}
		}
	}

	return {
		...report,
		...(await countQueueRemainder(now, organizationScope, handledIds)),
	};
}

/**
 * Один проход по очереди. Возвращает отчёт — вызывающий решает, логировать его
 * или показывать в интерфейсе.
 */
export async function dispatchDueMessages(
	options: DispatchOptions = {},
): Promise<DispatchReport> {
	const now = options.now ?? new Date();
	const batchSize = Math.max(1, Math.min(200, options.batchSize ?? 25));
	const workerId = options.workerId ?? `api:${process.pid}`;
	const stuckLockMinutes = Math.max(1, options.stuckLockMinutes ?? 10);

	const targets = options.organizationId
		? [options.organizationId]
		: await listOutboxOrganizations(now, stuckLockMinutes);

	const report = {
		claimed: 0,
		sent: 0,
		retried: 0,
		failed: 0,
		suppressed: 0,
		notConfigured: 0,
		deferred: 0,
		releasedStuck: 0,
		awaitingRetry: 0,
		awaitingSchedule: 0,
	};

	let budget = batchSize;
	for (const organizationId of targets) {
		const orgReport = await withTenantCtx(organizationId, () =>
			dispatchForOrganization({
				organizationId,
				now,
				batchSize: Math.max(0, budget),
				workerId,
				stuckLockMinutes,
			}),
		);
		report.claimed += orgReport.claimed;
		report.sent += orgReport.sent;
		report.retried += orgReport.retried;
		report.failed += orgReport.failed;
		report.suppressed += orgReport.suppressed;
		report.notConfigured += orgReport.notConfigured;
		report.deferred += orgReport.deferred;
		report.releasedStuck += orgReport.releasedStuck;
		report.awaitingRetry += orgReport.awaitingRetry;
		report.awaitingSchedule += orgReport.awaitingSchedule;
		budget -= orgReport.claimed;
	}

	return report;
}

/**
 * Объектно-ориентированный фасад диспетчера коммуникаций клиники.
 */
export class CommunicationsDispatcher {
	public async dispatch(options: DispatchOptions = {}): Promise<DispatchReport> {
		return dispatchDueMessages(options);
	}

	public async enqueue(
		input: EnqueueMessageInput,
	): Promise<EnqueueMessageResult> {
		return enqueueMessage(input);
	}

	public async getStatus(
		organizationId?: string | null,
	): Promise<DispatchReport> {
		return dispatchDueMessages({ organizationId, batchSize: 0 });
	}

	public async broadcast(
		messages: EnqueueMessageInput[],
	): Promise<EnqueueMessageResult[]> {
		return Promise.all(messages.map((m) => enqueueMessage(m)));
	}
}
