/**
 * Правила доставки: когда можно писать пациенту, когда повторять попытку и
 * когда повторять бессмысленно.
 *
 * ЗАЧЕМ: единственный существовавший обработчик очереди
 * (services/notificationWorker.ts) писал в любое время суток, не спрашивал
 * согласия, не различал причины отказа и не повторял отправку вовсе — любая
 * ошибка ставила статус failed навсегда. Сетевой сбой на секунду означал, что
 * пациент не узнает о завтрашнем приёме.
 *
 * Всё в этом файле — чистые функции без обращения к базе: их можно проверить
 * тестом, а диспетчер остаётся тонким.
 */

import type {
	CommunicationChannelCode,
	CommunicationConsentScope,
	DeliveryErrorClass,
} from "./types.js";
export type { DeliveryErrorClass };

// ─── Тихие часы ──────────────────────────────────────────────────────────────

export const MINUTES_PER_DAY = 1440;

/**
 * Локальные час и минута в часовом поясе организации. Без часового пояса
 * «не писать после 21:00» превращается в «не писать после 21:00 по серверу»,
 * а сервер и клиника нередко в разных зонах.
 */
export function minuteOfDayInTimeZone(date: Date, timeZone: string): number {
	let parts: Intl.DateTimeFormatPart[];
	try {
		parts = new Intl.DateTimeFormat("en-GB", {
			timeZone,
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		}).formatToParts(date);
	} catch {
		// Неизвестный пояс в настройках не должен останавливать рассылку.
		parts = new Intl.DateTimeFormat("en-GB", {
			timeZone: "UTC",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		}).formatToParts(date);
	}

	const hour = Number.parseInt(
		parts.find((part) => part.type === "hour")?.value ?? "0",
		10,
	);
	const minute = Number.parseInt(
		parts.find((part) => part.type === "minute")?.value ?? "0",
		10,
	);
	// «24» в hourCycle h23/h24 означает полночь.
	return ((hour % 24) * 60 + minute) % MINUTES_PER_DAY;
}

/**
 * Окно тихих часов обычно переходит через полночь (21:00 → 09:00), поэтому
 * простое сравнение «между началом и концом» здесь не работает.
 */
export function isQuietMinute(
	minuteOfDay: number,
	startMinute: number,
	endMinute: number,
): boolean {
	const minute =
		((minuteOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
	if (startMinute === endMinute) return false;
	if (startMinute < endMinute)
		return minute >= startMinute && minute < endMinute;
	return minute >= startMinute || minute < endMinute;
}

/** Сколько минут ждать до конца тихих часов. 0 — сейчас не тихие часы. */
export function minutesUntilQuietHoursEnd(
	minuteOfDay: number,
	startMinute: number,
	endMinute: number,
): number {
	if (!isQuietMinute(minuteOfDay, startMinute, endMinute)) return 0;
	const delta = (endMinute - minuteOfDay + MINUTES_PER_DAY) % MINUTES_PER_DAY;
	return delta === 0 ? MINUTES_PER_DAY : delta;
}

export type QuietHoursSettings = {
	readonly timezone: string;
	readonly quietHoursStartMinute: number;
	readonly quietHoursEndMinute: number;
	readonly deferServiceInQuietHours: boolean;
	readonly blockMarketingInQuietHours: boolean;
};

export type QuietHoursDecision =
	| { readonly action: "send" }
	/** Отложить до конца тихих часов: напоминание о приёме нужно доставить. */
	| { readonly action: "defer"; readonly notBefore: Date }
	/** Не отправлять вовсе: рекламу ночью слать нельзя. */
	| { readonly action: "suppress"; readonly reason: string };

export function decideQuietHours(
	now: Date,
	scope: CommunicationConsentScope,
	settings: QuietHoursSettings,
): QuietHoursDecision {
	const minute = minuteOfDayInTimeZone(now, settings.timezone);
	if (
		!isQuietMinute(
			minute,
			settings.quietHoursStartMinute,
			settings.quietHoursEndMinute,
		)
	) {
		return { action: "send" };
	}

	if (scope === "marketing") {
		if (settings.blockMarketingInQuietHours) {
			return {
				action: "suppress",
				reason: "Рекламное сообщение в тихие часы не отправляется.",
			};
		}
		return { action: "send" };
	}

	if (!settings.deferServiceInQuietHours) return { action: "send" };

	const waitMinutes = minutesUntilQuietHoursEnd(
		minute,
		settings.quietHoursStartMinute,
		settings.quietHoursEndMinute,
	);
	return {
		action: "defer",
		notBefore: new Date(now.getTime() + waitMinutes * 60_000),
	};
}

// ─── Согласия ────────────────────────────────────────────────────────────────

export type ConsentRecord = {
	readonly channel: CommunicationChannelCode;
	readonly scope: CommunicationConsentScope;
	readonly state: "granted" | "revoked";
};

export type ConsentDecision = {
	readonly allowed: boolean;
	readonly reason: string | null;
};

/**
 * Сервисные сообщения (напоминание о приёме, готовность документа) допустимы в
 * рамках договора, пока пациент явно не отказался по этому каналу.
 * Рекламные требуют предварительного согласия — ФЗ «О рекламе» ст. 18 ч. 1.
 * Штраф выписывают за одно сообщение, поэтому умолчания здесь разные.
 */
export function decideConsent(
	records: readonly ConsentRecord[],
	channel: CommunicationChannelCode,
	scope: CommunicationConsentScope,
): ConsentDecision {
	const explicit = records.find(
		(record) => record.channel === channel && record.scope === scope,
	);
	if (explicit) {
		return explicit.state === "granted"
			? { allowed: true, reason: null }
			: {
					allowed: false,
					reason:
						scope === "marketing"
							? "Пациент отказался от рекламных сообщений по этому каналу."
							: "Пациент отказался от сообщений по этому каналу.",
				};
	}

	if (scope === "service") return { allowed: true, reason: null };
	return {
		allowed: false,
		reason: "Нет согласия на рекламные сообщения по этому каналу.",
	};
}

// ─── Повторы ─────────────────────────────────────────────────────────────────

/*
 * `DeliveryErrorClass` ОБЪЯВЛЕН ОДИН РАЗ — в `./types.js`, откуда импортируется
 * на :17-18 и реэкспортируется на :20 (потребители продолжают брать его отсюда).
 *
 * Здесь лежала ВТОРАЯ копия того же объединения — побайтово совпадавшая с
 * канонической на все четырнадцать членов. Два объявления одного имени в одном
 * модуле не собираются вовсе: TS2440 (импорт спорит с локальным объявлением) и
 * TS2484 (экспорт спорит с экспортом). Сборка apps/api была красной.
 *
 * Восстанавливать копию нельзя и после починки сборки: разъехавшийся дубль —
 * уже пройденный в этом проекте отказ. Список `HEADER_HELPERS` держали в двух
 * файлах, копии разошлись (десять имён против девяти), и гейт молча перестал
 * видеть целый класс нарушений. Значения классов ошибок обязаны совпадать с
 * теми, что возвращают telegramTransport / whatsappTransport / smsTransport /
 * emailTransport, и сверять их надо с ОДНИМ объявлением.
 */

/**
 * Повторять есть смысл только там, где причина преходящая. Неверный ключ
 * доступа и заблокированный пациентом чат от повторов не исправятся — это
 * только сожжёт лимиты шлюза и спрячет настоящую причину от администратора.
 */
export function isRetryableErrorClass(errorClass: DeliveryErrorClass): boolean {
	switch (errorClass) {
		case "rate_limited":
		case "timeout":
		case "network":
		case "server":
		case "insufficient_funds":
		case "unknown":
			return true;
		default:
			return false;
	}
}

/** Класс ошибки, при котором отправлять нечем: это не отказ, а ненастроенность. */
export function isSuppressingErrorClass(
	errorClass: DeliveryErrorClass,
): boolean {
	return errorClass === "not_configured";
}

/**
 * Закончившиеся деньги на счету шлюза лечатся только пополнением. Повторять
 * каждую минуту бессмысленно — минимальная пауза полчаса.
 */
const INSUFFICIENT_FUNDS_FLOOR_SECONDS = 1800;

/**
 * Детерминированный разброс вместо Math.random(): при повторе сотни отложенных
 * сообщений не должны прийти в шлюз одной пачкой, но и тест должен быть
 * воспроизводимым.
 */
function jitterFactor(seed: string): number {
	let hash = 2166136261;
	for (let index = 0; index < seed.length; index += 1) {
		hash ^= seed.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	// 0.80 … 1.20
	return 0.8 + (Math.abs(hash) % 401) / 1000;
}

export type RetryPolicySettings = {
	readonly retryBaseSeconds: number;
	readonly retryMaxSeconds: number;
};

/**
 * Экспоненциальная выдержка: 1-я повторная попытка через base, затем удвоение
 * до потолка. `attempt` — номер уже сделанной попытки, начиная с 1.
 */
export function computeRetryDelaySeconds(
	attempt: number,
	errorClass: DeliveryErrorClass,
	settings: RetryPolicySettings,
	jitterSeed = "",
): number {
	const base = Math.max(1, settings.retryBaseSeconds);
	const ceiling = Math.max(base, settings.retryMaxSeconds);
	const exponent = Math.max(0, attempt - 1);
	// 2 ** 30 секунд — это годы; ограничение защищает от переполнения при
	// испорченном значении attempt в базе.
	const raw = base * 2 ** Math.min(exponent, 30);
	let delay = Math.min(raw, ceiling);
	if (errorClass === "insufficient_funds") {
		delay = Math.max(delay, INSUFFICIENT_FUNDS_FLOOR_SECONDS);
	}
	return Math.max(
		1,
		Math.round(delay * jitterFactor(`${jitterSeed}:${attempt}`)),
	);
}

export type AttemptOutcome =
	| {
			readonly kind: "sent";
			readonly providerMessageId: string | null;
			readonly segments: number | null;
	  }
	| {
			readonly kind: "retry";
			readonly delaySeconds: number;
			readonly errorClass: DeliveryErrorClass;
			readonly errorMessage: string;
	  }
	| {
			readonly kind: "failed";
			readonly errorClass: DeliveryErrorClass;
			readonly errorMessage: string;
	  }
	| {
			readonly kind: "suppressed";
			readonly errorClass: DeliveryErrorClass;
			readonly errorMessage: string;
	  };

/**
 * Решение по неудачной попытке: повторить, признать окончательным отказом или
 * пометить как неотправляемое из-за ненастроенного канала.
 */
/** Итог неудачной попытки. Варианта «отправлено» здесь быть не может. */
export type FailureOutcome = Exclude<AttemptOutcome, { kind: "sent" }>;

export function decideAfterFailure(input: {
	readonly attempt: number;
	readonly maxAttempts: number;
	readonly errorClass: DeliveryErrorClass;
	readonly errorMessage: string;
	readonly settings: RetryPolicySettings;
	readonly jitterSeed?: string;
}): FailureOutcome {
	if (isSuppressingErrorClass(input.errorClass)) {
		return {
			kind: "suppressed",
			errorClass: input.errorClass,
			errorMessage: input.errorMessage,
		};
	}
	if (
		!isRetryableErrorClass(input.errorClass) ||
		input.attempt >= input.maxAttempts
	) {
		return {
			kind: "failed",
			errorClass: input.errorClass,
			errorMessage: input.errorMessage,
		};
	}
	return {
		kind: "retry",
		delaySeconds: computeRetryDelaySeconds(
			input.attempt,
			input.errorClass,
			input.settings,
			input.jitterSeed ?? "",
		),
		errorClass: input.errorClass,
		errorMessage: input.errorMessage,
	};
}
