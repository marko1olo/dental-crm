/**
 * @file types.ts
 * @description Layer 0: Data Transfer Objects, status enums, settings contracts,
 * and interface definitions for omnichannel communications dispatch.
 */

import type {
	ChannelCredentialSet,
	CommunicationChannelCode,
	CommunicationConsentScope,
} from "../channelRouter.js";
import type {
	ConsentRecord,
	QuietHoursSettings,
	RetryPolicySettings,
} from "../deliveryPolicy.js";
import type { communicationOutbox } from "../../../db/schema.js";

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
 */
export const FALLBACK_COMMUNICATION_TIMEZONE = "Europe/Samara";

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
 * `deferred`), поэтому их сумма всегда равна `claimed`.
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
	 * ещё не наступил.
	 */
	readonly awaitingRetry: number;
	/** Ждёт назначенного времени: попыток ещё не было (отложенная рассылка, тихие часы). */
	readonly awaitingSchedule: number;
};

export type OutboxRow = typeof communicationOutbox.$inferSelect;

/**
 * Что стало с одной строкой очереди. Ровно один из этих итогов на строку —
 * счётчики отчёта складываются в `claimed` без остатка.
 */
export type RowOutcome =
	| "sent"
	| "retried"
	| "failed"
	| "suppressed"
	| "not_configured"
	| "deferred";

export type ProcessRowContext = {
	readonly credentials: ChannelCredentialSet;
	readonly settings: ResolvedCommunicationSettings;
	readonly consents: Map<string, ConsentRecord[]>;
	readonly sentToday: Map<string, number>;
	readonly now: Date;
};

export type MessageChannel = CommunicationChannelCode;

export type DeliveryStatus =
	| "queued"
	| "sending"
	| "sent"
	| "delivered"
	| "failed"
	| "suppressed";
