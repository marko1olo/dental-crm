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

import {
	and,
	eq,
	gt,
	inArray,
	isNotNull,
	lt,
	lte,
	notInArray,
	or,
	sql,
} from "drizzle-orm";
import { db } from "../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import {
	clinics,
	communicationOutbox,
	communicationSettings,
	patientCommunicationConsents,
	patients,
} from "../../db/schema.js";
import { isValidEmailAddress } from "../../emailTransport.js";
import { normalizeRussianMsisdn } from "../../smsTransport.js";
import { normalizeWhatsappRecipient } from "../../whatsappTransport.js";
import {
	type ChannelCredentialSet,
	type CommunicationChannelCode,
	type CommunicationConsentScope,
	isMachineDeliverableChannel,
	resolveChannelCredentials,
	resolveTelegramChatId,
	sendThroughChannel,
} from "./channelRouter.js";
import {
	type ConsentRecord,
	type DeliveryErrorClass,
	decideAfterFailure,
	decideConsent,
	decideQuietHours,
	type QuietHoursSettings,
	type RetryPolicySettings,
} from "./deliveryPolicy.js";
import { checkChannelFit } from "./templateRenderer.js";

export type CommunicationIntentCode =
	| "appointment_confirmation"
	| "payment_reminder"
	| "post_visit_instruction"
	| "recall"
	| "document_ready"
	| "imaging_review"
	| "general"
	/**
	 * Ответ на прямое обращение пациента (он написал «СТОП» или «СТАРТ»).
	 * Единственное назначение, которому разрешено обойти только что отозванное
	 * согласие и тихие часы; ставится исключительно разбором входящих сообщений.
	 */
	| "transactional_reply";

/** Настройки рассылки организации со значениями по умолчанию, если строки нет. */
export type ResolvedCommunicationSettings = QuietHoursSettings &
	RetryPolicySettings & {
		readonly dailyLimitPerPatient: number;
		readonly maxAttempts: number;
		readonly channelFallback: CommunicationChannelCode[];
		readonly appointmentReminderEnabled: boolean;
		readonly appointmentReminderLeadHours: number[];
		readonly appointmentReminderWindowMinutes: number;
	};

/**
 * Часовой пояс последней надежды, когда у организации нет ни строки настроек
 * связи, ни ни одной клиники.
 *
 * ЧТО БЫЛО СЛОМАНО. Здесь стояло "Europe/Moscow", а `clinics.timezone`
 * (db/schema.ts:240) по умолчанию `Europe/Samara`. Два значения по умолчанию для
 * одного понятия, и расходились они молча. Тихие часы считает именно этот
 * параметр: deliveryPolicy.ts:89 вызывает minuteOfDayInTimeZone(now,
 * settings.timezone). А `resolveCommunicationSettings` возвращает эти значения
 * КАЖДОЙ организации, у которой строки communication_settings ещё нет, то есть
 * любой новой клинике.
 *
 * Последствие для самарской клиники (UTC+4) при расчёте по Москве (UTC+3):
 *   • тихие часы кончаются в 09:00 — когда в Самаре 09:00, в Москве 08:00,
 *     политика считает, что тишина ещё идёт, и напоминание уходит на час позже;
 *   • тихие часы начинаются в 21:00 — когда в Самаре 21:00, в Москве 20:00,
 *     политика считает, что тишина не началась, и служебное сообщение уходит
 *     пациенту в его тихий час.
 * Обе границы неверны, причём в сторону «шлём когда нельзя и молчим когда надо».
 *
 * ПОЧЕМУ НЕ ПРОСТО ПОМЕНЯТЬ ЛИТЕРАЛ НА Europe/Samara. Это перенесло бы
 * произвольный выбор, а не убрало его. Источник правды о часовом поясе —
 * клиника, поэтому resolveCommunicationSettings теперь спрашивает его у клиники
 * организации и падает на эту константу лишь тогда, когда клиник нет вовсе.
 * Значение совпадает с умолчанием `clinics.timezone`, чтобы два умолчания больше
 * не расходились.
 */
const FALLBACK_COMMUNICATION_TIMEZONE = "Europe/Samara";

export const DEFAULT_COMMUNICATION_SETTINGS: ResolvedCommunicationSettings = {
	timezone: FALLBACK_COMMUNICATION_TIMEZONE,
	quietHoursStartMinute: 21 * 60,
	quietHoursEndMinute: 9 * 60,
	deferServiceInQuietHours: true,
	blockMarketingInQuietHours: true,
	dailyLimitPerPatient: 3,
	maxAttempts: 5,
	retryBaseSeconds: 60,
	retryMaxSeconds: 3600,
	channelFallback: ["telegram", "whatsapp", "sms", "email"],
	// Выключено по умолчанию: включать рассылку пациентам без ведома клиники нельзя.
	appointmentReminderEnabled: false,
	appointmentReminderLeadHours: [24],
	appointmentReminderWindowMinutes: 90,
};

function parseChannelFallback(raw: string): CommunicationChannelCode[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed))
			return DEFAULT_COMMUNICATION_SETTINGS.channelFallback;
		const channels = parsed.filter(
			(value): value is CommunicationChannelCode =>
				typeof value === "string" && isMachineDeliverableChannel(value),
		);
		return channels.length > 0
			? channels
			: DEFAULT_COMMUNICATION_SETTINGS.channelFallback;
	} catch {
		return DEFAULT_COMMUNICATION_SETTINGS.channelFallback;
	}
}

/** Часы до приёма, когда отправлять напоминание. Порядок — от дальнего к ближнему. */
export function parseLeadHours(raw: string): number[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [24];
		const hours = parsed
			.map((value) =>
				typeof value === "number" ? value : Number.parseFloat(String(value)),
			)
			.filter((value) => Number.isFinite(value) && value > 0 && value <= 720);
		return hours.length > 0
			? [...new Set(hours)].sort((left, right) => right - left)
			: [24];
	} catch {
		return [24];
	}
}

export async function resolveCommunicationSettings(
	organizationId: string,
): Promise<ResolvedCommunicationSettings> {
	/*
	 * КОНТЕКСТ СТАВИТСЯ ЗДЕСЬ, А НЕ У ВЫЗЫВАЮЩЕГО. Эту функцию зовут и из
	 * маршрутов (контекст уже стоит от глобальной обёртки server.ts), и из
	 * фонового цикла, где запроса нет вовсе. Арендатор — обязательный аргумент,
	 * то есть он известен ВСЕГДА, поэтому обёртка принадлежит функции. Без неё
	 * фоновый вызов получал ноль строк и молча уходил на умолчания: тихие часы
	 * считались в чужом поясе, и сообщение уходило пациенту ночью.
	 * Вложенный вызов бесплатен — withTenantCtx переиспользует уже открытую
	 * транзакцию и не берёт второго соединения из пула (см. db/rls.ts).
	 */
	return withTenantCtx(organizationId, async (tx) => {
		const [row] = await tx
			.select()
			.from(communicationSettings)
			.where(eq(communicationSettings.organizationId, organizationId))
			.limit(1);

		/*
		 * Строки настроек связи у организации может не быть вовсе — так выглядит
		 * любая только что созданная клиника. Раньше в этом случае возвращались
		 * умолчания с часовым поясом "Europe/Moscow", хотя `clinics.timezone` по
		 * умолчанию `Europe/Samara`: тихие часы считались в чужом поясе, и обе их
		 * границы съезжали на час (разбор — у FALLBACK_COMMUNICATION_TIMEZONE выше).
		 *
		 * Источник правды о поясе — клиника, поэтому спрашиваем его у неё. Берём
		 * самую раннюю клинику организации: у сети их может быть несколько, и пока
		 * настройки связи одни на организацию, выбор обязан быть определённым, а не
		 * зависеть от порядка выдачи строк. Если клиник нет ни одной — остаётся
		 * константа, и она совпадает с умолчанием `clinics.timezone`.
		 */
		if (!row) {
			const [clinic] = await tx
				.select({ timezone: clinics.timezone })
				.from(clinics)
				.where(eq(clinics.organizationId, organizationId))
				.orderBy(clinics.createdAt)
				.limit(1);

			return {
				...DEFAULT_COMMUNICATION_SETTINGS,
				timezone: clinic?.timezone ?? FALLBACK_COMMUNICATION_TIMEZONE,
			};
		}

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
			channelFallback: parseChannelFallback(row.channelFallbackJson),
			appointmentReminderEnabled: row.appointmentReminderEnabled,
			appointmentReminderLeadHours: parseLeadHours(
				row.appointmentReminderLeadHoursJson,
			),
			appointmentReminderWindowMinutes: row.appointmentReminderWindowMinutes,
		};
	});
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
	| {
			readonly ok: true;
			readonly outboxId: string;
			readonly duplicate: boolean;
	  }
	| { readonly ok: false; readonly reason: string };

/** Адрес получателя по правилам канала. Пустой результат — отправлять некуда. */
export async function resolveRecipientAddress(
	organizationId: string,
	channel: CommunicationChannelCode,
	patientId: string,
): Promise<{ address: string | null; reason: string | null }> {
	// Контекст ставится здесь по той же причине, что и в
	// resolveCommunicationSettings выше: функцию зовут и маршруты, и фоновый
	// цикл, а арендатор — обязательный аргумент. Без контекста и привязка к
	// Telegram, и карточка пациента читались как отсутствующие, и напоминание
	// молча отменялось с причиной «у пациента нет телефона».
	return withTenantCtx(organizationId, async (tx) => {
		if (channel === "telegram") {
			const chatId = await resolveTelegramChatId(organizationId, patientId);
			return chatId
				? { address: chatId, reason: null }
				: {
						address: null,
						reason: "У пациента нет активной привязки к Telegram-боту клиники.",
					};
		}

		const [patient] = await tx
			.select({
				phone: patients.phone,
				email: patients.email,
				notes: patients.notes,
			})
			.from(patients)
			.where(
				and(
					eq(patients.id, patientId),
					eq(patients.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!patient)
			return { address: null, reason: "Пациент не найден в этой организации." };

		if (channel === "max") {
			/*
			 * В MAX бот не пишет первым: диалог начинает пациент, и его идентификатор
			 * приходит во входящем событии. Разбор входящих оставляет метку
			 * `MAX:<chat_id>` в заметках карточки — отсюда и берётся адрес. Раньше в
			 * это поле подставлялся телефон, то есть заведомо непригодное значение.
			 */
			const mark = /MAX:(-?\d{1,19})/.exec(patient.notes ?? "");
			return mark?.[1]
				? { address: mark[1], reason: null }
				: {
						address: null,
						reason:
							"У пациента нет переписки в MAX: бот не может написать первым, диалог начинает пациент.",
					};
		}

		if (channel === "email") {
			const email = patient.email?.trim() ?? "";
			return isValidEmailAddress(email)
				? { address: email, reason: null }
				: {
						address: null,
						reason: "У пациента не указан корректный адрес электронной почты.",
					};
		}

		const msisdn =
			channel === "whatsapp"
				? normalizeWhatsappRecipient(patient.phone)
				: normalizeRussianMsisdn(patient.phone);
		return msisdn
			? { address: msisdn, reason: null }
			: {
					address: null,
					reason: "У пациента не указан корректный номер телефона.",
				};
	});
}

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

// ─── Разбор очереди ──────────────────────────────────────────────────────────

export type DispatchOptions = {
	/**
	 * Ограничить проход одной организацией. Нужно для ручного запуска из
	 * интерфейса: администратор одной клиники не должен разбирать очередь
	 * соседней, даже если процесс общий.
	 */
	readonly organizationId?: string | null;
	/** Сколько сообщений забрать за проход. */
	readonly batchSize?: number;
	/** Имя процесса в поле locked_by — чтобы было видно, кто держит строку. */
	readonly workerId?: string;
	/** Через сколько минут захват считается зависшим и возвращается в очередь. */
	readonly stuckLockMinutes?: number;
	readonly now?: Date;
};

/**
 * Итог прохода по очереди. Каждая захваченная строка попадает РОВНО в один из
 * счётчиков итога (`sent`, `retried`, `failed`, `suppressed`, `notConfigured`,
 * `deferred`), поэтому их сумма всегда равна `claimed`. На это свойство опирается
 * интерфейс: «взято N, ушло M» — и всё, что между ними, обязано быть названо.
 *
 * ПОЧЕМУ `notConfigured` ОТДЕЛЁН ОТ `suppressed`. В базе оба пишутся статусом
 * `suppressed` (processRow ниже), и до сих пор оба попадали в один счётчик, а
 * интерфейс называл их одинаково: «отправлять не стали — тихие часы, нет
 * согласия или нет адреса». Но «пациент отказался» — это решение, которое
 * выполнено правильно, а «SMS-шлюз не настроен» (channelRouter.ts:151-152 →
 * deliveryPolicy.ts:191-193) — незаконченная настройка: сообщения не уйдут
 * никогда, пока администратор не заведёт ключи доступа. Показывать это как
 * спокойное решение — врать про работу, которой не было.
 */
export type DispatchReport = {
	readonly claimed: number;
	readonly sent: number;
	/** Шлюз отказал по преходящей причине: строка вернулась в очередь с выдержкой. */
	readonly retried: number;
	readonly failed: number;
	/** Осознанный отказ отправлять: нет согласия, суточный предел, реклама в тихие часы. */
	readonly suppressed: number;
	/** Отправлять нечем: канал не настроен. Требует действия администратора, а не ожидания. */
	readonly notConfigured: number;
	readonly deferred: number;
	readonly releasedStuck: number;
	/**
	 * ОСТАТОК ОЧЕРЕДИ ПОСЛЕ ПРОХОДА — то, что этот проход НЕ брал, потому что срок
	 * ещё не наступил. Строки, обработанные прямо сейчас, из обоих счётчиков
	 * исключены, поэтому они не повторяют `retried` и `deferred`, а добавляют к ним.
	 *
	 * ЗАЧЕМ. `claimBatch` берёт только `nextAttemptAt <= now`, а отказ шлюза и тихие
	 * часы отодвигают срок в будущее, оставляя статус `queued`. Поэтому ВТОРОЕ
	 * нажатие «Отправить из очереди» после отказа видит `claimed === 0` — ровно то
	 * же число, что и у клиники с пустой очередью. Интерфейс печатал в обоих
	 * случаях спокойное «Отправлять было нечего», пока сообщения лежали
	 * неотправленными. Различить эти два состояния по одному `claimed` нельзя, а по
	 * общему числу строк в статусе `queued` — тоже: там же лежат сообщения,
	 * заранее назначенные на будущее, и тогда обычная работа выглядела бы аварией.
	 * Поэтому остаток разделён по причине.
	 */
	readonly awaitingRetry: number;
	/** Ждёт назначенного времени: попыток ещё не было (отложенная рассылка, тихие часы). */
	readonly awaitingSchedule: number;
};

type OutboxRow = typeof communicationOutbox.$inferSelect;

/**
 * Возврат зависших захватов. Процесс мог упасть между «пометил sending» и
 * «записал результат»; без этого такие строки не отправятся никогда.
 */
async function releaseStuckLocks(
	now: Date,
	stuckLockMinutes: number,
	organizationId: string | null,
): Promise<number> {
	const threshold = new Date(now.getTime() - stuckLockMinutes * 60_000);
	const scope = [
		eq(communicationOutbox.status, "sending" as const),
		or(
			lt(communicationOutbox.lockedAt, threshold),
			sql`${communicationOutbox.lockedAt} IS NULL`,
		),
	];
	if (organizationId)
		scope.push(eq(communicationOutbox.organizationId, organizationId));

	const released = await db
		.update(communicationOutbox)
		.set({
			status: "queued",
			lockedAt: null,
			lockedBy: null,
			nextAttemptAt: now,
			updatedAt: now,
		})
		.where(and(...scope))
		.returning({ id: communicationOutbox.id });
	return released.length;
}

/**
 * Захват пачки. SKIP LOCKED пропускает строки, которые уже держит другой
 * процесс: две копии сервера не отправят одно напоминание дважды.
 */
async function claimBatch(
	now: Date,
	batchSize: number,
	workerId: string,
	organizationId: string | null,
): Promise<OutboxRow[]> {
	return db.transaction(async (tx) => {
		const scope = [
			eq(communicationOutbox.status, "queued" as const),
			lte(communicationOutbox.nextAttemptAt, now),
		];
		if (organizationId)
			scope.push(eq(communicationOutbox.organizationId, organizationId));

		const candidates = await tx
			.select({ id: communicationOutbox.id })
			.from(communicationOutbox)
			.where(and(...scope))
			.orderBy(communicationOutbox.nextAttemptAt)
			.limit(batchSize)
			.for("update", { skipLocked: true });

		if (candidates.length === 0) return [];

		return tx
			.update(communicationOutbox)
			.set({
				status: "sending",
				lockedAt: now,
				lockedBy: workerId,
				updatedAt: now,
			})
			.where(
				inArray(
					communicationOutbox.id,
					candidates.map((row) => row.id),
				),
			)
			.returning();
	});
}

/**
 * Что осталось лежать в очереди со сроком в будущем. `handledIds` — строки этого
 * прохода: они уже названы своими счётчиками (`retried`, `deferred`), и считать их
 * второй раз значило бы показать администратору удвоенное число.
 *
 * Разделение по `attempts` — не косметика. `attempts > 0` значит «пробовали, не
 * ушло, ждём повторной попытки»: сообщение не дошло до человека, и об этом нельзя
 * молчать. `attempts = 0` значит «время ещё не пришло» — назначенная на будущее
 * рассылка или сервисное сообщение, отложенное тихими часами (markDeferred меняет
 * только срок и не увеличивает счётчик попыток). Второе — нормальная работа, и
 * красить её в красный было бы такой же ложью, как прятать первое в серое.
 */
async function countQueueRemainder(
	now: Date,
	organizationId: string | null,
	handledIds: readonly string[],
): Promise<{ awaitingRetry: number; awaitingSchedule: number }> {
	const scope = [
		eq(communicationOutbox.status, "queued" as const),
		gt(communicationOutbox.nextAttemptAt, now),
	];
	if (organizationId)
		scope.push(eq(communicationOutbox.organizationId, organizationId));
	if (handledIds.length > 0)
		scope.push(notInArray(communicationOutbox.id, [...handledIds]));

	const [row] = await db
		.select({
			awaitingRetry: sql<number>`(count(*) filter (where ${communicationOutbox.attempts} > 0))::int`,
			awaitingSchedule: sql<number>`(count(*) filter (where ${communicationOutbox.attempts} = 0))::int`,
		})
		.from(communicationOutbox)
		.where(and(...scope));

	return {
		awaitingRetry: Number(row?.awaitingRetry ?? 0),
		awaitingSchedule: Number(row?.awaitingSchedule ?? 0),
	};
}

async function loadConsents(
	organizationId: string,
	patientIds: string[],
): Promise<Map<string, ConsentRecord[]>> {
	const byPatient = new Map<string, ConsentRecord[]>();
	if (patientIds.length === 0) return byPatient;

	const rows = await db
		.select({
			patientId: patientCommunicationConsents.patientId,
			channel: patientCommunicationConsents.channel,
			scope: patientCommunicationConsents.scope,
			state: patientCommunicationConsents.state,
		})
		.from(patientCommunicationConsents)
		.where(
			and(
				eq(patientCommunicationConsents.organizationId, organizationId),
				inArray(patientCommunicationConsents.patientId, patientIds),
			),
		);

	for (const row of rows) {
		const list = byPatient.get(row.patientId) ?? [];
		list.push({
			channel: row.channel as CommunicationChannelCode,
			scope: row.scope as CommunicationConsentScope,
			state: row.state as "granted" | "revoked",
		});
		byPatient.set(row.patientId, list);
	}
	return byPatient;
}

/** Сколько сообщений уже ушло пациенту за сегодня — против навязчивости. */
async function countSentToday(
	organizationId: string,
	patientIds: string[],
	now: Date,
): Promise<Map<string, number>> {
	const counts = new Map<string, number>();
	if (patientIds.length === 0) return counts;

	const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const rows = await db
		.select({
			patientId: communicationOutbox.patientId,
			total: sql<number>`count(*)::int`,
		})
		.from(communicationOutbox)
		.where(
			and(
				eq(communicationOutbox.organizationId, organizationId),
				inArray(communicationOutbox.patientId, patientIds),
				inArray(communicationOutbox.status, ["sent", "delivered"]),
				isNotNull(communicationOutbox.sentAt),
				sql`${communicationOutbox.sentAt} >= ${dayStart.toISOString()}`,
			),
		)
		.groupBy(communicationOutbox.patientId);

	for (const row of rows) {
		if (row.patientId) counts.set(row.patientId, Number(row.total));
	}
	return counts;
}

async function markSuppressed(
	row: OutboxRow,
	reason: string,
	now: Date,
): Promise<void> {
	await db
		.update(communicationOutbox)
		.set({
			status: "suppressed",
			lockedAt: null,
			lockedBy: null,
			lastErrorClass: "suppressed",
			lastErrorMessage: reason,
			updatedAt: now,
		})
		.where(eq(communicationOutbox.id, row.id));
}

async function markDeferred(
	row: OutboxRow,
	notBefore: Date,
	reason: string,
	now: Date,
): Promise<void> {
	await db
		.update(communicationOutbox)
		.set({
			status: "queued",
			lockedAt: null,
			lockedBy: null,
			nextAttemptAt: notBefore,
			lastErrorClass: "deferred",
			lastErrorMessage: reason,
			updatedAt: now,
		})
		.where(eq(communicationOutbox.id, row.id));
}

/**
 * Что стало с одной строкой очереди. Ровно один из этих итогов на строку —
 * счётчики отчёта складываются в `claimed` без остатка.
 */
type RowOutcome =
	| "sent"
	| "retried"
	| "failed"
	| "suppressed"
	| "not_configured"
	| "deferred";

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
	},
): Promise<RowOutcome> {
	const { credentials, settings, now } = context;
	const channel = row.channel as CommunicationChannelCode;
	const scope = row.scope as CommunicationConsentScope;

	if (!isMachineDeliverableChannel(channel)) {
		await markSuppressed(row, "Канал не отправляется автоматически.", now);
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

	/*
	 * В базу пишется статус `suppressed`, а в отчёт — `not_configured`. Это не
	 * рассинхронизация: `decideAfterFailure` возвращает `suppressed` только по
	 * `isSuppressingErrorClass` (deliveryPolicy.ts:191-193), то есть строго при
	 * `not_configured`. Класс ошибки остаётся в строке (`lastErrorClass`), а
	 * отчёт называет причину отдельным счётчиком, чтобы «шлюз не настроен» не
	 * пряталось среди осознанных отказов.
	 */
	return outcome.kind === "suppressed" ? "not_configured" : "failed";
}

/**
 * Один проход по очереди. Возвращает отчёт — вызывающий решает, логировать его
 * или показывать в интерфейсе.
 *
 * ФОРМА ПРОХОДА: ЦИКЛ ПО АРЕНДАТОРАМ, КАЖДЫЙ В СВОЁМ КОНТЕКСТЕ.
 * ------------------------------------------------------------
 * Обработчик вызывается из фонового цикла (dispatchWorker.ts), где запроса нет
 * вовсе, поэтому глобальная обёртка server.ts не действует и
 * `app.current_tenant` не выставлен никем. Под FORCE RLS это ломало проход
 * целиком и по-разному в каждой части: `claimBatch` возвращал ноль строк молча
 * (очередь копилась вечно, а отчёт показывал «взято 0» — то же число, что у
 * клиники без единого сообщения), а `releaseStuckLocks` затрагивал ноль строк,
 * из-за чего зависший захват не возвращался в очередь никогда.
 *
 * Обходом это не лечится, и это не вопрос вкуса: `UPDATE` требует и `USING`, и
 * `WITH CHECK`, а дизъюнкт обхода стоит только в `USING` (миграции 0158/0159),
 * то есть `UPDATE` под одним лишь обходом отвергается кодом 42501. Значит
 * работа обязана идти под контекстом конкретной клиники.
 *
 * Обход остаётся ровно на одном запросе — на СПИСКЕ клиник, у которых в очереди
 * что-то есть. Это единственное, чего иначе не узнать. Всё остальное, включая
 * захват строк и запись результата, выполняется по каждой клинике отдельно
 * внутри `withTenantCtx`: смешать две клиники в одном проходе физически нельзя.
 *
 * Общий предел пачки сохранён: `batchSize` — бюджет на ВЕСЬ проход, он тратится
 * по клиникам в порядке срочности (у кого раньше подошёл срок, тот первый).
 * Клиника, до которой бюджет не дошёл, всё равно получает возврат зависших
 * захватов и попадает в счётчики остатка — иначе её очередь выглядела бы пустой.
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
 * Клиники, у которых в очереди есть строка, требующая внимания этого прохода:
 * подошедшая по сроку либо зависшая в захвате. Порядок — по срочности, чтобы
 * общий бюджет пачки доставался сначала тем, у кого срок раньше.
 *
 * ЕДИНСТВЕННОЕ МЕСТО, ГДЕ АРЕНДАТОР НЕИЗВЕСТЕН, и потому единственное место с
 * обходом. Запрос читает ОДНУ колонку — идентификатор организации — и не отдаёт
 * ни одной строки очереди: содержимое чужого сообщения под обход не попадает.
 */
async function listOutboxOrganizations(
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
async function dispatchForOrganization(input: {
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
		// Пустой проход — единственный случай, когда остаток очереди и есть весь
		// ответ: без него «взято 0» у клиники с пятью неотправленными сообщениями
		// выглядит так же, как у клиники, которой нечего отправлять.
		return {
			...report,
			...(await countQueueRemainder(now, organizationScope, handledIds)),
		};
	}

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
				/*
				 * Switch, а не цепочка if/else с «остальное — deferred». Прежняя
				 * цепочка сваливала в `deferred` любой итог, которого не знала: добавь
				 * новый — и он тихо посчитался бы отложенным. Здесь недостающая ветка
				 * не компилируется.
				 */
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
				// Непредвиденный сбой не должен оставить строку захваченной
				// навсегда: возвращаем её в очередь с записанной причиной.
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

	// Остаток считается ПОСЛЕ прохода и с исключением обработанных строк: пачка
	// ограничена `batchSize`, поэтому «взято 25» ещё не значит «в очереди больше
	// ничего нет», и администратор должен знать, что осталось.
	return {
		...report,
		...(await countQueueRemainder(now, organizationScope, handledIds)),
	};
}
