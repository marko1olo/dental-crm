/**
 * Диспетчер исходящих сообщений: постановка в очередь и разбор очереди.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ ПОЯВИЛСЯ
 * Единственный обработчик очереди в проекте — services/notificationWorker.ts —
 * устроен так:
 *   • умеет только Telegram;
 *   • берёт токен бота из `token_secret_ref`, куда соседние интеграции кладут
 *     маскированное значение;
 *   • не повторяет отправку: любая ошибка ставит `failed` навсегда, и сетевой
 *     сбой на секунду означает, что пациент не узнает о завтрашнем приёме;
 *   • пишет результат в консоль неоновыми цветами, а в базу — только строку
 *     статуса, без причины;
 *   • ниоткуда не вызывается, как и scheduleNotification, — очередь не
 *     наполняется и не разбирается вовсе.
 *
 * Здесь очередь разбирается по-настоящему:
 *   1. Захват строк через SELECT … FOR UPDATE SKIP LOCKED — два процесса не
 *      отправят одно сообщение дважды.
 *   2. Согласия и тихие часы проверяются перед каждой отправкой, а не при
 *      постановке: за время ожидания пациент мог отказаться.
 *   3. Повторы с экспоненциальной выдержкой и разбросом, но только для
 *      преходящих причин; неверный ключ доступа повторами не лечится.
 *   4. Каждая попытка оставляет класс и текст ошибки в строке очереди —
 *      администратор видит причину, а не «не отправлено».
 *   5. Зависшие захваты (процесс упал посреди отправки) возвращаются в очередь.
 */

import { and, eq, inArray, isNotNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	communicationOutbox,
	communicationSettings,
	patientCommunicationConsents,
	patients
} from "../../db/schema.js";
import { isValidEmailAddress } from "../../emailTransport.js";
import { normalizeRussianMsisdn } from "../../smsTransport.js";
import { normalizeWhatsappRecipient } from "../../whatsappTransport.js";
import {
	isMachineDeliverableChannel,
	resolveChannelCredentials,
	resolveTelegramChatId,
	sendThroughChannel,
	type ChannelCredentialSet,
	type CommunicationChannelCode,
	type CommunicationConsentScope
} from "./channelRouter.js";
import {
	decideAfterFailure,
	decideConsent,
	decideQuietHours,
	type ConsentRecord,
	type DeliveryErrorClass,
	type QuietHoursSettings,
	type RetryPolicySettings
} from "./deliveryPolicy.js";
import { checkChannelFit } from "./templateRenderer.js";

export type CommunicationIntentCode =
	| "appointment_confirmation"
	| "payment_reminder"
	| "post_visit_instruction"
	| "recall"
	| "document_ready"
	| "imaging_review"
	| "general";

/** Настройки рассылки организации со значениями по умолчанию, если строки нет. */
export type ResolvedCommunicationSettings = QuietHoursSettings &
	RetryPolicySettings & {
		readonly dailyLimitPerPatient: number;
		readonly maxAttempts: number;
		readonly channelFallback: CommunicationChannelCode[];
	};

export const DEFAULT_COMMUNICATION_SETTINGS: ResolvedCommunicationSettings = {
	timezone: "Europe/Moscow",
	quietHoursStartMinute: 21 * 60,
	quietHoursEndMinute: 9 * 60,
	deferServiceInQuietHours: true,
	blockMarketingInQuietHours: true,
	dailyLimitPerPatient: 3,
	maxAttempts: 5,
	retryBaseSeconds: 60,
	retryMaxSeconds: 3600,
	channelFallback: ["telegram", "whatsapp", "sms", "email"]
};

function parseChannelFallback(raw: string): CommunicationChannelCode[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return DEFAULT_COMMUNICATION_SETTINGS.channelFallback;
		const channels = parsed.filter((value): value is CommunicationChannelCode =>
			typeof value === "string" && isMachineDeliverableChannel(value)
		);
		return channels.length > 0 ? channels : DEFAULT_COMMUNICATION_SETTINGS.channelFallback;
	} catch {
		return DEFAULT_COMMUNICATION_SETTINGS.channelFallback;
	}
}

export async function resolveCommunicationSettings(organizationId: string): Promise<ResolvedCommunicationSettings> {
	const [row] = await db
		.select()
		.from(communicationSettings)
		.where(eq(communicationSettings.organizationId, organizationId))
		.limit(1);

	if (!row) return DEFAULT_COMMUNICATION_SETTINGS;

	return {
		timezone: row.timezone,
		quietHoursStartMinute: row.quietHoursStartMinute,
		quietHoursEndMinute: row.quietHoursEndMinute,
		deferServiceInQuietHours: row.deferServiceInQuietHours,
		blockMarketingInQuietHours: row.blockMarketingInQuietHours,
		dailyLimitPerPatient: row.dailyLimitPerPatient,
		maxAttempts: row.maxAttempts,
		retryBaseSeconds: row.retryBaseSeconds,
		retryMaxSeconds: row.retryMaxSeconds,
		channelFallback: parseChannelFallback(row.channelFallbackJson)
	};
}

// ─── Постановка в очередь ────────────────────────────────────────────────────

export type EnqueueMessageInput = {
	readonly organizationId: string;
	readonly clinicId?: string | null;
	readonly patientId?: string | null;
	readonly taskId?: string | null;
	readonly templateId?: string | null;
	readonly campaignId?: string | null;
	readonly channel: CommunicationChannelCode;
	readonly intent: CommunicationIntentCode;
	readonly scope?: CommunicationConsentScope;
	/**
	 * Адрес получателя. Если не задан, берётся из карточки пациента по правилам
	 * канала (телефон для SMS и WhatsApp, почта для email, привязанный чат для
	 * Telegram).
	 */
	readonly recipientAddress?: string | null;
	readonly subject?: string | null;
	readonly body: string;
	/**
	 * Ключ, по которому одно и то же сообщение не встаёт в очередь дважды.
	 * Повторная постановка возвращает уже существующую строку.
	 */
	readonly dedupeKey: string;
	readonly scheduledAt?: Date | null;
	readonly maxAttempts?: number | null;
};

export type EnqueueMessageResult =
	| { readonly ok: true; readonly outboxId: string; readonly duplicate: boolean }
	| { readonly ok: false; readonly reason: string };

/** Адрес получателя по правилам канала. Пустой результат — отправлять некуда. */
export async function resolveRecipientAddress(
	organizationId: string,
	channel: CommunicationChannelCode,
	patientId: string
): Promise<{ address: string | null; reason: string | null }> {
	if (channel === "telegram") {
		const chatId = await resolveTelegramChatId(organizationId, patientId);
		return chatId
			? { address: chatId, reason: null }
			: { address: null, reason: "У пациента нет активной привязки к Telegram-боту клиники." };
	}

	const [patient] = await db
		.select({ phone: patients.phone, email: patients.email })
		.from(patients)
		.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
		.limit(1);

	if (!patient) return { address: null, reason: "Пациент не найден в этой организации." };

	if (channel === "email") {
		const email = patient.email?.trim() ?? "";
		return isValidEmailAddress(email)
			? { address: email, reason: null }
			: { address: null, reason: "У пациента не указан корректный адрес электронной почты." };
	}

	const msisdn = channel === "whatsapp" ? normalizeWhatsappRecipient(patient.phone) : normalizeRussianMsisdn(patient.phone);
	return msisdn ? { address: msisdn, reason: null } : { address: null, reason: "У пациента не указан корректный номер телефона." };
}

export async function enqueueMessage(input: EnqueueMessageInput): Promise<EnqueueMessageResult> {
	if (!isMachineDeliverableChannel(input.channel)) {
		return {
			ok: false,
			reason: `Канал «${input.channel}» не отправляется автоматически — это задача сотруднику, а не сообщение в очереди.`
		};
	}
	const body = input.body.trim();
	if (!body) return { ok: false, reason: "Пустой текст сообщения." };

	// Длина проверяется на входе, а не при отправке: узнать о том, что SMS
	// разрослась на восемь сегментов, нужно до того, как за неё заплатят.
	const fit = checkChannelFit(input.channel, body);
	if (!fit.ok) return { ok: false, reason: fit.problems.join(" ") };

	let recipientAddress = input.recipientAddress?.trim() || null;
	if (!recipientAddress) {
		if (!input.patientId) return { ok: false, reason: "Не указан ни получатель, ни пациент." };
		const resolved = await resolveRecipientAddress(input.organizationId, input.channel, input.patientId);
		if (!resolved.address) return { ok: false, reason: resolved.reason ?? "Отправлять некуда." };
		recipientAddress = resolved.address;
	}

	const scheduledAt = input.scheduledAt ?? new Date();
	const [inserted] = await db
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
			dedupeKey: input.dedupeKey
		})
		// Повтор постановки — обычное дело при перезапуске планировщика.
		// Это не ошибка и не повод отправить второе сообщение.
		.onConflictDoNothing({ target: [communicationOutbox.organizationId, communicationOutbox.dedupeKey] })
		.returning({ id: communicationOutbox.id });

	if (inserted) return { ok: true, outboxId: inserted.id, duplicate: false };

	const [existing] = await db
		.select({ id: communicationOutbox.id })
		.from(communicationOutbox)
		.where(
			and(eq(communicationOutbox.organizationId, input.organizationId), eq(communicationOutbox.dedupeKey, input.dedupeKey))
		)
		.limit(1);

	return existing
		? { ok: true, outboxId: existing.id, duplicate: true }
		: { ok: false, reason: "Не удалось поставить сообщение в очередь." };
}

// ─── Разбор очереди ──────────────────────────────────────────────────────────

export type DispatchOptions = {
	/** Сколько сообщений забрать за проход. */
	readonly batchSize?: number;
	/** Имя процесса в поле locked_by — чтобы было видно, кто держит строку. */
	readonly workerId?: string;
	/** Через сколько минут захват считается зависшим и возвращается в очередь. */
	readonly stuckLockMinutes?: number;
	readonly now?: Date;
};

export type DispatchReport = {
	readonly claimed: number;
	readonly sent: number;
	readonly retried: number;
	readonly failed: number;
	readonly suppressed: number;
	readonly deferred: number;
	readonly releasedStuck: number;
};

type OutboxRow = typeof communicationOutbox.$inferSelect;

/**
 * Возврат зависших захватов. Процесс мог упасть между «пометил sending» и
 * «записал результат»; без этого такие строки не отправятся никогда.
 */
async function releaseStuckLocks(now: Date, stuckLockMinutes: number): Promise<number> {
	const threshold = new Date(now.getTime() - stuckLockMinutes * 60_000);
	const released = await db
		.update(communicationOutbox)
		.set({ status: "queued", lockedAt: null, lockedBy: null, nextAttemptAt: now, updatedAt: now })
		.where(and(eq(communicationOutbox.status, "sending"), or(lt(communicationOutbox.lockedAt, threshold), sql`${communicationOutbox.lockedAt} IS NULL`)))
		.returning({ id: communicationOutbox.id });
	return released.length;
}

/**
 * Захват пачки. SKIP LOCKED пропускает строки, которые уже держит другой
 * процесс: две копии сервера не отправят одно напоминание дважды.
 */
async function claimBatch(now: Date, batchSize: number, workerId: string): Promise<OutboxRow[]> {
	return db.transaction(async (tx) => {
		const candidates = await tx
			.select({ id: communicationOutbox.id })
			.from(communicationOutbox)
			.where(and(eq(communicationOutbox.status, "queued"), lte(communicationOutbox.nextAttemptAt, now)))
			.orderBy(communicationOutbox.nextAttemptAt)
			.limit(batchSize)
			.for("update", { skipLocked: true });

		if (candidates.length === 0) return [];

		return tx
			.update(communicationOutbox)
			.set({ status: "sending", lockedAt: now, lockedBy: workerId, updatedAt: now })
			.where(
				inArray(
					communicationOutbox.id,
					candidates.map((row) => row.id)
				)
			)
			.returning();
	});
}

async function loadConsents(organizationId: string, patientIds: string[]): Promise<Map<string, ConsentRecord[]>> {
	const byPatient = new Map<string, ConsentRecord[]>();
	if (patientIds.length === 0) return byPatient;

	const rows = await db
		.select({
			patientId: patientCommunicationConsents.patientId,
			channel: patientCommunicationConsents.channel,
			scope: patientCommunicationConsents.scope,
			state: patientCommunicationConsents.state
		})
		.from(patientCommunicationConsents)
		.where(
			and(
				eq(patientCommunicationConsents.organizationId, organizationId),
				inArray(patientCommunicationConsents.patientId, patientIds)
			)
		);

	for (const row of rows) {
		const list = byPatient.get(row.patientId) ?? [];
		list.push({
			channel: row.channel as CommunicationChannelCode,
			scope: row.scope as CommunicationConsentScope,
			state: row.state as "granted" | "revoked"
		});
		byPatient.set(row.patientId, list);
	}
	return byPatient;
}

/** Сколько сообщений уже ушло пациенту за сегодня — против навязчивости. */
async function countSentToday(organizationId: string, patientIds: string[], now: Date): Promise<Map<string, number>> {
	const counts = new Map<string, number>();
	if (patientIds.length === 0) return counts;

	const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const rows = await db
		.select({ patientId: communicationOutbox.patientId, total: sql<number>`count(*)::int` })
		.from(communicationOutbox)
		.where(
			and(
				eq(communicationOutbox.organizationId, organizationId),
				inArray(communicationOutbox.patientId, patientIds),
				inArray(communicationOutbox.status, ["sent", "delivered"]),
				isNotNull(communicationOutbox.sentAt),
				sql`${communicationOutbox.sentAt} >= ${dayStart.toISOString()}`
			)
		)
		.groupBy(communicationOutbox.patientId);

	for (const row of rows) {
		if (row.patientId) counts.set(row.patientId, Number(row.total));
	}
	return counts;
}

async function markSuppressed(row: OutboxRow, reason: string, now: Date): Promise<void> {
	await db
		.update(communicationOutbox)
		.set({
			status: "suppressed",
			lockedAt: null,
			lockedBy: null,
			lastErrorClass: "suppressed",
			lastErrorMessage: reason,
			updatedAt: now
		})
		.where(eq(communicationOutbox.id, row.id));
}

async function markDeferred(row: OutboxRow, notBefore: Date, reason: string, now: Date): Promise<void> {
	await db
		.update(communicationOutbox)
		.set({
			status: "queued",
			lockedAt: null,
			lockedBy: null,
			nextAttemptAt: notBefore,
			lastErrorClass: "deferred",
			lastErrorMessage: reason,
			updatedAt: now
		})
		.where(eq(communicationOutbox.id, row.id));
}

/**
 * Одна строка очереди: проверки, отправка, запись итога. Возвращает, что
 * именно произошло, — отчёт собирается вызывающим.
 */
async function processRow(
	row: OutboxRow,
	context: {
		readonly credentials: ChannelCredentialSet;
		readonly settings: ResolvedCommunicationSettings;
		readonly consents: Map<string, ConsentRecord[]>;
		readonly sentToday: Map<string, number>;
		readonly now: Date;
	}
): Promise<"sent" | "retried" | "failed" | "suppressed" | "deferred"> {
	const { credentials, settings, now } = context;
	const channel = row.channel as CommunicationChannelCode;
	const scope = row.scope as CommunicationConsentScope;

	if (!isMachineDeliverableChannel(channel)) {
		await markSuppressed(row, "Канал не отправляется автоматически.", now);
		return "suppressed";
	}

	// Согласие проверяется здесь, а не при постановке: за время ожидания в
	// очереди пациент мог отказаться, и отправить после отказа — нарушение.
	if (row.patientId) {
		const consent = decideConsent(context.consents.get(row.patientId) ?? [], channel, scope);
		if (!consent.allowed) {
			await markSuppressed(row, consent.reason ?? "Нет согласия на сообщения по этому каналу.", now);
			return "suppressed";
		}

		const alreadySent = context.sentToday.get(row.patientId) ?? 0;
		if (alreadySent >= settings.dailyLimitPerPatient) {
			await markSuppressed(
				row,
				`Достигнут суточный предел сообщений пациенту (${settings.dailyLimitPerPatient}).`,
				now
			);
			return "suppressed";
		}
	}

	const quietHours = decideQuietHours(now, scope, settings);
	if (quietHours.action === "suppress") {
		await markSuppressed(row, quietHours.reason, now);
		return "suppressed";
	}
	if (quietHours.action === "defer") {
		await markDeferred(row, quietHours.notBefore, "Тихие часы: отправка отложена до утра.", now);
		return "deferred";
	}

	const attempt = row.attempts + 1;
	const result = await sendThroughChannel(
		{
			channel,
			recipientAddress: row.recipientAddress,
			subject: row.subject,
			body: row.body,
			idempotencyKey: row.dedupeKey
		},
		credentials
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
				updatedAt: now
			})
			.where(eq(communicationOutbox.id, row.id));
		if (row.patientId) {
			context.sentToday.set(row.patientId, (context.sentToday.get(row.patientId) ?? 0) + 1);
		}
		return "sent";
	}

	const outcome = decideAfterFailure({
		attempt,
		maxAttempts: row.maxAttempts,
		errorClass: result.errorClass as DeliveryErrorClass,
		errorMessage: result.errorMessage,
		settings,
		jitterSeed: row.id
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
				updatedAt: now
			})
			.where(eq(communicationOutbox.id, row.id));
		return "retried";
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
			updatedAt: now
		})
		.where(eq(communicationOutbox.id, row.id));

	return outcome.kind === "suppressed" ? "suppressed" : "failed";
}

/**
 * Один проход по очереди. Возвращает отчёт — вызывающий решает, логировать его
 * или показывать в интерфейсе.
 */
export async function dispatchDueMessages(options: DispatchOptions = {}): Promise<DispatchReport> {
	const now = options.now ?? new Date();
	const batchSize = Math.max(1, Math.min(200, options.batchSize ?? 25));
	const workerId = options.workerId ?? `api:${process.pid}`;
	const stuckLockMinutes = Math.max(1, options.stuckLockMinutes ?? 10);

	const releasedStuck = await releaseStuckLocks(now, stuckLockMinutes);
	const claimed = await claimBatch(now, batchSize, workerId);
	const report = { claimed: claimed.length, sent: 0, retried: 0, failed: 0, suppressed: 0, deferred: 0, releasedStuck };
	if (claimed.length === 0) return report;

	// Строки пачки могут принадлежать разным организациям: учётные данные,
	// настройки и согласия читаются по одному разу на организацию.
	const byOrganization = new Map<string, OutboxRow[]>();
	for (const row of claimed) {
		const list = byOrganization.get(row.organizationId) ?? [];
		list.push(row);
		byOrganization.set(row.organizationId, list);
	}

	for (const [organizationId, rows] of byOrganization) {
		const [credentials, settings] = await Promise.all([
			resolveChannelCredentials(organizationId),
			resolveCommunicationSettings(organizationId)
		]);
		const patientIds = [...new Set(rows.map((row) => row.patientId).filter((id): id is string => Boolean(id)))];
		const [consents, sentToday] = await Promise.all([
			loadConsents(organizationId, patientIds),
			countSentToday(organizationId, patientIds, now)
		]);

		for (const row of rows) {
			try {
				const outcome = await processRow(row, { credentials, settings, consents, sentToday, now });
				if (outcome === "sent") report.sent += 1;
				else if (outcome === "retried") report.retried += 1;
				else if (outcome === "failed") report.failed += 1;
				else if (outcome === "suppressed") report.suppressed += 1;
				else report.deferred += 1;
			} catch (error) {
				// Непредвиденный сбой не должен оставить строку захваченной
				// навсегда: возвращаем её в очередь с записанной причиной.
				report.retried += 1;
				await db
					.update(communicationOutbox)
					.set({
						status: "queued",
						attempts: row.attempts + 1,
						lockedAt: null,
						lockedBy: null,
						nextAttemptAt: new Date(now.getTime() + 60_000),
						lastErrorClass: "unknown",
						lastErrorMessage: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
						updatedAt: now
					})
					.where(eq(communicationOutbox.id, row.id));
			}
		}
	}

	return report;
}
