/**
 * PatientRecallPipeline — Автоматический пайплайн диспансерного учета и
 * триггерных напоминаний (Recall Engine). Feature #102.
 *
 * КЛИНИЧЕСКИЕ СЦЕНАРИИ:
 * 1. Профгигиена (hygiene) — через 6 календарных месяцев после последней чистки.
 * 2. Профосмотр после имплантации (implant_followup) — этапы:
 *    - 14 дней (контроль мягких тканей / снятие швов),
 *    - 3 месяца (контроль первичной остеоинтеграции нижней челюсти),
 *    - 6 месяцев (контроль остеоинтеграции верхней челюсти / протезирование),
 *    - 1 год (ежегодный диспансерный осмотр, контроль периимплантатных тканей).
 * 3. Активация брекет-системы / элайнеров (ortho_activation) — каждые 4 недели (28 дней).
 *
 * ЗАЩИТА ОТ СПАМА (Frequency Capping):
 * - Не чаще 1 сообщения пациенту в 7 календарных дней (168 часов).
 *
 * КОНТРОЛЬ ЧАСОВЫХ ПОЯСОВ:
 * - Отправка строго с 09:00 до 20:00 местного времени клиники.
 * - При выходе за границы окна отправка переносится на 09:00 ближайшего разрешённого утра.
 *
 * МУЛЬТИКАНАЛЬНЫЕ ШАБЛОНЫ:
 * - Telegram, WhatsApp, SMS с подстановкой клинических и персональных переменных.
 */

import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	clinics,
	communicationOutbox,
	communicationSettings,
	patientCommunicationConsents,
	patientImplantInstallations,
	patients,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
	visits,
} from "../../db/schema.js";
import type { CommunicationChannelCode } from "./types.js";
import { minuteOfDayInTimeZone } from "./deliveryPolicy.js";
import { renderTemplate } from "./templateRenderer.js";

// ─── ТИПЫ И КОНСТАНТЫ ────────────────────────────────────────────────────────

export type RecallScenario =
	| "hygiene"
	| "implant_followup"
	| "ortho_activation";

export type ImplantMilestone =
	| "14_days"
	| "3_months"
	| "6_months"
	| "1_year";

export const IMPLANT_MILESTONES: readonly ImplantMilestone[] = [
	"14_days",
	"3_months",
	"6_months",
	"1_year",
] as const;

export const DEFAULT_FREQUENCY_CAPPING_DAYS = 7;
export const DEFAULT_WINDOW_START_HOUR = 9;
export const DEFAULT_WINDOW_END_HOUR = 20;
export const DEFAULT_HYGIENE_INTERVAL_MONTHS = 6;
export const DEFAULT_ORTHO_INTERVAL_WEEKS = 4;
export const DEFAULT_ORTHO_INTERVAL_DAYS = 28;

export type FrequencyCappingResult = {
	readonly isCapped: boolean;
	readonly canSend: boolean;
	readonly lastSentAt: Date | null;
	readonly cooldownRemainingMs: number;
	readonly nextAllowedDate: Date | null;
	readonly reason: string | null;
};

export type TimezoneWindowResult = {
	readonly isInWindow: boolean;
	readonly localHour: number;
	readonly localMinute: number;
	readonly timeZone: string;
	readonly scheduledAt: Date;
	readonly deferred: boolean;
	readonly reason: string | null;
};

export type RecallCandidate = {
	readonly patientId: string;
	readonly patientFullName: string;
	readonly phone: string | null;
	readonly email: string | null;
	readonly scenario: RecallScenario;
	readonly implantMilestone?: ImplantMilestone | undefined;
	readonly toothNumber?: number | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly lastEventDate: Date;
	readonly targetDueDate: Date;
	readonly daysOverdue: number;
	readonly reason: string;
	readonly dedupeKey: string;
};

export type PreparedRecallMessage = {
	readonly patientId: string;
	readonly patientFullName: string;
	readonly channel: CommunicationChannelCode;
	readonly scenario: RecallScenario;
	readonly implantMilestone?: ImplantMilestone | undefined;
	readonly text: string;
	readonly scheduledAt: Date;
	readonly dedupeKey: string;
	readonly frequencyCapping: FrequencyCappingResult;
	readonly timezoneWindow: TimezoneWindowResult;
};

export type RecallPipelineExecutionSummary = {
	readonly organizationId: string;
	readonly examinedPatients: number;
	readonly candidatesFound: number;
	readonly queuedCount: number;
	readonly alreadyQueuedCount: number;
	readonly frequencyCappedCount: number;
	readonly deferredQuietHoursCount: number;
	readonly skippedNoContactCount: number;
	readonly skippedNoConsentCount: number;
	readonly details: ReadonlyArray<{
		readonly patientId: string;
		readonly scenario: RecallScenario;
		readonly implantMilestone?: ImplantMilestone | undefined;
		readonly status:
			| "queued"
			| "already_queued"
			| "frequency_capped"
			| "deferred_quiet_hours"
			| "skipped_no_contact"
			| "skipped_no_consent"
			| "error";
		readonly reason?: string | undefined;
		readonly outboxId?: string | undefined;
	}>;
	readonly problems: string[];
};

// ─── ДАТЫ И КАЛЕНДАРНЫЕ РАСЧЕТЫ ──────────────────────────────────────────────

/**
 * Точное добавление календарных месяцев без переполнения дней.
 * Например: 31 августа + 6 месяцев → 28 (или 29) февраля.
 */
export function addCalendarMonths(from: Date, months: number): Date {
	const shifted = new Date(from.getTime());
	if (Number.isNaN(shifted.getTime())) return shifted;

	// Сначала ставим 1-е число, чтобы setMonth не сработал через край
	shifted.setDate(1);
	shifted.setMonth(shifted.getMonth() + months);

	// День 0 следующего месяца — последний день целевого месяца
	const lastDayOfTargetMonth = new Date(
		shifted.getFullYear(),
		shifted.getMonth() + 1,
		0,
	).getDate();
	shifted.setDate(Math.min(from.getDate(), lastDayOfTargetMonth));
	return shifted;
}

/**
 * Добавление календарных дней.
 */
export function addCalendarDays(from: Date, days: number): Date {
	const shifted = new Date(from.getTime());
	shifted.setDate(shifted.getDate() + days);
	return shifted;
}

/**
 * Разница в полных днях между двумя датами (to - from).
 */
export function daysBetween(from: Date, to: Date): number {
	const diffMs = to.getTime() - from.getTime();
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ─── КЛИНИЧЕСКИЕ ОЦЕНКИ СЦЕНАРИЕВ ────────────────────────────────────────────

/**
 * Оценка сценария профгигиены.
 * Положена каждые 6 месяцев.
 */
export function evaluateHygieneRecall(
	lastHygieneDate: Date,
	now: Date,
	intervalMonths = DEFAULT_HYGIENE_INTERVAL_MONTHS,
): {
	readonly isDue: boolean;
	readonly targetDueDate: Date;
	readonly daysOverdue: number;
} {
	const targetDueDate = addCalendarMonths(lastHygieneDate, intervalMonths);
	const isDue = now.getTime() >= targetDueDate.getTime();
	const daysOverdue = isDue ? Math.max(0, daysBetween(targetDueDate, now)) : 0;
	return { isDue, targetDueDate, daysOverdue };
}

/**
 * Расчет целевой даты для этапа имплантации.
 */
export function getImplantMilestoneDueDate(
	installationDate: Date,
	milestone: ImplantMilestone,
): Date {
	switch (milestone) {
		case "14_days":
			return addCalendarDays(installationDate, 14);
		case "3_months":
			return addCalendarMonths(installationDate, 3);
		case "6_months":
			return addCalendarMonths(installationDate, 6);
		case "1_year":
			return addCalendarMonths(installationDate, 12);
	}
}

export type ImplantMilestoneEvaluation = {
	readonly milestone: ImplantMilestone;
	readonly dueDate: Date;
	readonly isDue: boolean;
	readonly isCompleted: boolean;
	readonly daysOverdue: number;
};

/**
 * Оценка всех этапов профосмотра после имплантации.
 */
export function evaluateImplantMilestones(
	installationDate: Date,
	now: Date,
	completedMilestones: readonly ImplantMilestone[] = [],
): {
	readonly isDue: boolean;
	readonly activeMilestone: ImplantMilestone | null;
	readonly targetDueDate: Date | null;
	readonly daysOverdue: number;
	readonly milestones: readonly ImplantMilestoneEvaluation[];
} {
	const completedSet = new Set(completedMilestones);
	const evaluations: ImplantMilestoneEvaluation[] = [];

	let activeMilestone: ImplantMilestone | null = null;
	let activeDueDate: Date | null = null;
	let activeDaysOverdue = 0;

	for (const milestone of IMPLANT_MILESTONES) {
		const dueDate = getImplantMilestoneDueDate(installationDate, milestone);
		const isCompleted = completedSet.has(milestone);
		const isDue = now.getTime() >= dueDate.getTime();
		const daysOverdue = isDue ? Math.max(0, daysBetween(dueDate, now)) : 0;

		evaluations.push({
			milestone,
			dueDate,
			isDue,
			isCompleted,
			daysOverdue,
		});

		// Первый по порядку этап, который наступил, но еще не завершен
		if (isDue && !isCompleted && !activeMilestone) {
			activeMilestone = milestone;
			activeDueDate = dueDate;
			activeDaysOverdue = daysOverdue;
		}
	}

	return {
		isDue: activeMilestone !== null,
		activeMilestone,
		targetDueDate: activeDueDate,
		daysOverdue: activeDaysOverdue,
		milestones: evaluations,
	};
}

/**
 * Оценка сценария ортодонтической активации (брекеты / элайнеры).
 * Положена каждые 4 недели (28 дней).
 */
export function evaluateOrthoRecall(
	lastActivationDate: Date,
	now: Date,
	intervalDays = DEFAULT_ORTHO_INTERVAL_DAYS,
): {
	readonly isDue: boolean;
	readonly targetDueDate: Date;
	readonly daysOverdue: number;
} {
	const targetDueDate = addCalendarDays(lastActivationDate, intervalDays);
	const isDue = now.getTime() >= targetDueDate.getTime();
	const daysOverdue = isDue ? Math.max(0, daysBetween(targetDueDate, now)) : 0;
	return { isDue, targetDueDate, daysOverdue };
}

// ─── ЗАЩИТА ОТ СПАМА (FREQUENCY CAPPING) ─────────────────────────────────────

/**
 * Проверка частоты коммуникаций: не чаще 1 сообщения в cooldownDays (по умолчанию 7 дней).
 */
export function checkFrequencyCapping(
	lastSentAt: Date | null,
	now: Date,
	cooldownDays = DEFAULT_FREQUENCY_CAPPING_DAYS,
): FrequencyCappingResult {
	if (!lastSentAt) {
		return {
			isCapped: false,
			canSend: true,
			lastSentAt: null,
			cooldownRemainingMs: 0,
			nextAllowedDate: null,
			reason: null,
		};
	}

	const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
	const elapsedMs = now.getTime() - lastSentAt.getTime();

	if (elapsedMs < cooldownMs) {
		const cooldownRemainingMs = cooldownMs - elapsedMs;
		const nextAllowedDate = new Date(lastSentAt.getTime() + cooldownMs);
		const remainingDays = Math.ceil(
			cooldownRemainingMs / (1000 * 60 * 60 * 24),
		);
		return {
			isCapped: true,
			canSend: false,
			lastSentAt,
			cooldownRemainingMs,
			nextAllowedDate,
			reason: `Частота сообщений ограничена: последнее отправлено ${lastSentAt.toISOString()}. Повторная отправка возможна через ${remainingDays} дн. (${nextAllowedDate.toISOString()}).`,
		};
	}

	return {
		isCapped: false,
		canSend: true,
		lastSentAt,
		cooldownRemainingMs: 0,
		nextAllowedDate: null,
		reason: null,
	};
}

// ─── КОНТРОЛЬ ЧАСОВЫХ ПОЯСОВ (09:00 - 20:00) ─────────────────────────────────

/**
 * Извлечение локальных компонентов даты и времени в часовом поясе.
 */
export function getLocalPartsInTimeZone(
	date: Date,
	timeZone: string,
): {
	readonly year: number;
	readonly month: number;
	readonly day: number;
	readonly hour: number;
	readonly minute: number;
	readonly second: number;
} {
	let formatter: Intl.DateTimeFormat;
	try {
		formatter = new Intl.DateTimeFormat("en-US", {
			timeZone,
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
			hour12: false,
		});
	} catch {
		formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: "UTC",
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
			hour12: false,
		});
	}

	const parts = formatter.formatToParts(date);
	const getPart = (type: string) =>
		Number.parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

	let hour = getPart("hour");
	if (hour === 24) hour = 0;

	return {
		year: getPart("year"),
		month: getPart("month"),
		day: getPart("day"),
		hour,
		minute: getPart("minute"),
		second: getPart("second"),
	};
}

/**
 * Вычисляет следующее разрешенное время отправки (09:00 местного времени).
 * Если текущее время раньше 09:00 — переносит на 09:00 сегодня.
 * Если текущее время >= 20:00 — переносит на 09:00 завтра.
 */
export function calculateNextAllowedSendTime(
	date: Date,
	timeZone: string,
	startHour = DEFAULT_WINDOW_START_HOUR,
	endHour = DEFAULT_WINDOW_END_HOUR,
): Date {
	const local = getLocalPartsInTimeZone(date, timeZone);
	const minuteOfDay = local.hour * 60 + local.minute;
	const startMinute = startHour * 60;
	const endMinute = endHour * 60;

	// Если уже внутри окна — возвращаем текущую дату
	if (minuteOfDay >= startMinute && minuteOfDay < endMinute) {
		return new Date(date.getTime());
	}

	let minutesToAdd: number;
	if (minuteOfDay < startMinute) {
		// Раньше 09:00 сегодня
		minutesToAdd = startMinute - minuteOfDay;
	} else {
		// В 20:00 или позже: переносим на 09:00 следующего дня
		minutesToAdd = 24 * 60 - minuteOfDay + startMinute;
	}

	// Корректируем секунды и миллисекунды к началу минуты
	const targetMs =
		date.getTime() +
		minutesToAdd * 60_000 -
		local.second * 1000 -
		date.getMilliseconds();

	return new Date(targetMs);
}

/**
 * Проверка окна отправки с 09:00 до 20:00 по времени клиники.
 */
export function checkTimezoneSendWindow(
	date: Date,
	timeZone: string,
	startHour = DEFAULT_WINDOW_START_HOUR,
	endHour = DEFAULT_WINDOW_END_HOUR,
): TimezoneWindowResult {
	const minute = minuteOfDayInTimeZone(date, timeZone);
	const startMinute = startHour * 60;
	const endMinute = endHour * 60;

	const isInWindow = minute >= startMinute && minute < endMinute;
	const local = getLocalPartsInTimeZone(date, timeZone);

	if (isInWindow) {
		return {
			isInWindow: true,
			localHour: local.hour,
			localMinute: local.minute,
			timeZone,
			scheduledAt: date,
			deferred: false,
			reason: null,
		};
	}

	const nextAllowed = calculateNextAllowedSendTime(
		date,
		timeZone,
		startHour,
		endHour,
	);
	return {
		isInWindow: false,
		localHour: local.hour,
		localMinute: local.minute,
		timeZone,
		scheduledAt: nextAllowed,
		deferred: true,
		reason: `Текущее время (${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")} ${timeZone}) вне разрешенного окна ${String(startHour).padStart(2, "0")}:00–${String(endHour).padStart(2, "0")}:00. Отправка отложена на ${nextAllowed.toISOString()}.`,
	};
}

// ─── ШАБЛОНЫ СООБЩЕНИЙ ───────────────────────────────────────────────────────

/**
 * Шаблоны сообщений для клинических сценариев диспансеризации и триггеров.
 */
export const RECALL_TEMPLATES: Readonly<
	Record<
		RecallScenario,
		Record<
			"telegram" | "whatsapp" | "sms",
			string | Record<ImplantMilestone, string>
		>
	>
> = {
	hygiene: {
		telegram:
			"🦷 *Клиника {clinic}* | Профилактическая гигиена\n\nЗдравствуйте, {patient}!\nПрошло 6 месяцев с момента вашей последней профессиональной гигиены полости рта. Регулярная чистка защищает зубы от кариеса и сохраняет здоровье десен.\n\nЗапишитесь на плановый прием:\n📞 {clinicPhone}\n🔗 {link}",
		whatsapp:
			"Здравствуйте, {patient}! Клиника {clinic} напоминает: прошло 6 месяцев с прошлой профессиональной гигиены. Рекомендуем пройти плановый осмотр и чистку для сохранения здоровья зубов и гарантии. Запись по тел.: {clinicPhone} или по ссылке {link}",
		sms: "{patient}, пора на профгигиену (6 мес.) в клинику {clinic}. Запись: {clinicPhone} {link}",
	},
	implant_followup: {
		telegram: {
			"14_days":
				"🦷 *Клиника {clinic}* | Контрольный осмотр после имплантации (14 дней)\n\nЗдравствуйте, {patient}!\nПрошло 14 дней после установки импланта (зуб {tooth}). Ждем вас на плановый осмотр для контроля заживления десны и снятия швов.\n\nВрач: {doctor}\n📞 {clinicPhone}\n🔗 {link}",
			"3_months":
				"🦷 *Клиника {clinic}* | Контроль остеоинтеграции (3 месяца)\n\nЗдравствуйте, {patient}!\nПрошло 3 месяца с момента установки импланта (зуб {tooth}). Приглашаем на плановый рентген-контроль приживления импланта.\n\n📞 {clinicPhone}\n🔗 {link}",
			"6_months":
				"🦷 *Клиника {clinic}* | Контроль приживления (6 месяцев)\n\nЗдравствуйте, {patient}!\nПрошло 6 месяцев после установки импланта (зуб {tooth}). Пора оценить стабильность остеоинтеграции и спланировать этап протезирования коронкой.\n\n📞 {clinicPhone}\n🔗 {link}",
			"1_year":
				"🦷 *Клиника {clinic}* | Годовой диспансерный осмотр импланта\n\nЗдравствуйте, {patient}!\nПрошел 1 год после установки импланта (зуб {tooth}). Ежегодный контрольный осмотр необходим для сохранения гарантии и здоровья периимплантных тканей.\n\n📞 {clinicPhone}\n🔗 {link}",
		},
		whatsapp: {
			"14_days":
				"Здравствуйте, {patient}! Клиника {clinic} приглашает вас на контрольный осмотр через 14 дней после имплантации (зуб {tooth}) к доктору {doctor}. Снятие швов и оценка заживления. Запись: {clinicPhone} {link}",
			"3_months":
				"Здравствуйте, {patient}! Клиника {clinic} напоминает: прошло 3 месяца после имплантации (зуб {tooth}). Пора пройти контрольный осмотр и оценить остеоинтеграцию. Запись: {clinicPhone} {link}",
			"6_months":
				"Здравствуйте, {patient}! Прошло 6 месяцев после имплантации (зуб {tooth}). Ждем вас в клинике {clinic} на контрольный снимок и планирование коронки. Запись: {clinicPhone} {link}",
			"1_year":
				"Здравствуйте, {patient}! Клиника {clinic} напоминает о годовом контроле импланта (зуб {tooth}). Проверка десны и костной ткани сохраняет гарантию и здоровье улыбки. Запись: {clinicPhone} {link}",
		},
		sms: {
			"14_days":
				"{patient}, осмотр и снятие швов после имплантации (14 дн., зуб {tooth}) в {clinic}. Тел: {clinicPhone}",
			"3_months":
				"{patient}, плановый осмотр импланта (3 мес., зуб {tooth}) в {clinic}. Тел: {clinicPhone}",
			"6_months":
				"{patient}, контроль импланта (6 мес., зуб {tooth}) в {clinic}. Переход к коронке. Тел: {clinicPhone}",
			"1_year":
				"{patient}, годовой гарантийный осмотр импланта (зуб {tooth}) в {clinic}. Запись: {clinicPhone}",
		},
	},
	ortho_activation: {
		telegram:
			"🦷 *Клиника {clinic}* | Плановая активация брекетов / элайнеров\n\nЗдравствуйте, {patient}!\nПрошло 4 недели с прошлой активации ортодонтической аппаратуры. Для правильного перемещения зубов и соблюдения сроков лечения необходима плановая коррекция.\n\nВрач: {doctor}\n📞 {clinicPhone}\n🔗 {link}",
		whatsapp:
			"Здравствуйте, {patient}! Клиника {clinic} напоминает: прошло 4 недели с момента прошлой активации брекетов/элайнеров. Ждем вас на плановую замену дуг и контроль динамики к доктору {doctor}. Запись: {clinicPhone} {link}",
		sms: "{patient}, плановая активация брекетов/элайнеров (4 нед.) в {clinic}. Запись: {clinicPhone} {link}",
	},
};

/**
 * Получение текста шаблона по сценарию, каналу и этапу.
 */
export function getRecallTemplate(
	scenario: RecallScenario,
	channel: "telegram" | "whatsapp" | "sms",
	milestone?: ImplantMilestone,
): string {
	const channelTemplates = RECALL_TEMPLATES[scenario][channel];
	if (typeof channelTemplates === "string") {
		return channelTemplates;
	}
	const activeMilestone = milestone ?? "14_days";
	return channelTemplates[activeMilestone];
}

/**
 * Генерация детерминированного ключа дубля.
 */
export function buildRecallDedupeKey(
	patientId: string,
	scenario: RecallScenario,
	identifier: string,
): string {
	return `recall:${scenario}:${patientId}:${identifier}`;
}

// ─── ОСНОВНОЙ СЕРВИС ПАЙПЛАЙНА РЕКОЛЛОВ ─────────────────────────────────────

export type ProcessPatientRecallsOptions = {
	readonly organizationId: string;
	readonly clinicId?: string | null | undefined;
	readonly now?: Date | undefined;
	readonly limit?: number | undefined;
	readonly cooldownDays?: number | undefined;
	readonly dryRun?: boolean | undefined;
};

export class PatientRecallPipeline {
	/**
	 * Подготовка текста напоминания с заполнением переменных.
	 */
	static prepareMessageText(
		scenario: RecallScenario,
		channel: "telegram" | "whatsapp" | "sms",
		values: {
			patient: string;
			clinic: string;
			clinicPhone: string;
			doctor?: string | null | undefined;
			tooth?: string | number | null | undefined;
			link?: string | null | undefined;
			date?: string | null | undefined;
		},
		milestone?: ImplantMilestone | undefined,
	): string {
		const rawTemplate = getRecallTemplate(scenario, channel, milestone);
		const rendered = renderTemplate(
			rawTemplate,
			{
				patient: values.patient,
				clinic: values.clinic,
				clinicPhone: values.clinicPhone,
				doctor: values.doctor ?? "Лечащий врач",
				tooth: values.tooth ? String(values.tooth) : "установленный",
				link: values.link ?? "",
				date: values.date ?? "",
			},
			{ allowEmptyValues: true, allowPhi: true },
		);

		return rendered.ok ? rendered.text : rawTemplate;
	}

	/**
	 * Сканирование базы данных и постановка триггерных напоминаний в очередь.
	 */
	static async run(
		options: ProcessPatientRecallsOptions,
	): Promise<RecallPipelineExecutionSummary> {
		const now = options.now ?? new Date();
		const cooldownDays =
			options.cooldownDays ?? DEFAULT_FREQUENCY_CAPPING_DAYS;
		const limit = Math.max(1, Math.min(500, options.limit ?? 100));
		const dryRun = options.dryRun ?? false;

		const summary: {
			organizationId: string;
			examinedPatients: number;
			candidatesFound: number;
			queuedCount: number;
			alreadyQueuedCount: number;
			frequencyCappedCount: number;
			deferredQuietHoursCount: number;
			skippedNoContactCount: number;
			skippedNoConsentCount: number;
			details: Array<{
				patientId: string;
				scenario: RecallScenario;
				implantMilestone?: ImplantMilestone | undefined;
				status:
					| "queued"
					| "already_queued"
					| "frequency_capped"
					| "deferred_quiet_hours"
					| "skipped_no_contact"
					| "skipped_no_consent"
					| "error";
				reason?: string | undefined;
				outboxId?: string | undefined;
			}>;
			problems: string[];
		} = {
			organizationId: options.organizationId,
			examinedPatients: 0,
			candidatesFound: 0,
			queuedCount: 0,
			alreadyQueuedCount: 0,
			frequencyCappedCount: 0,
			deferredQuietHoursCount: 0,
			skippedNoContactCount: 0,
			skippedNoConsentCount: 0,
			details: [],
			problems: [],
		};

		return withTenantCtx(options.organizationId, async (tx) => {
			// 1. Получаем настройки клиники (часовой пояс, телефон, название)
			const [clinicRow] = await tx
				.select({
					id: clinics.id,
					name: clinics.name,
					phone: clinics.phone,
					timezone: clinics.timezone,
				})
				.from(clinics)
				.where(eq(clinics.organizationId, options.organizationId))
				.limit(1);

			const clinicName = clinicRow?.name ?? "Стоматологическая клиника";
			const clinicPhone = clinicRow?.phone ?? "+7 (000) 000-00-00";
			const timeZone = clinicRow?.timezone ?? "Europe/Samara";

			// 2. Выбираем активных пациентов организации
			const patientRows = await tx
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					email: patients.email,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, options.organizationId),
						eq(patients.status, "active"),
						isNull(patients.mergedIntoPatientId),
					),
				)
				.limit(limit);

			summary.examinedPatients = patientRows.length;

			for (const patient of patientRows) {
				// Проверяем наличие будущих приемов: если пациент уже записан на прием, не спамим его реколлом
				const [futureAppt] = await tx
					.select({ id: appointments.id })
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, options.organizationId),
							eq(appointments.patientId, patient.id),
							gte(appointments.startsAt, now),
							inArray(appointments.status, [
								"planned",
								"confirmed",
								"arrived",
								"in_treatment",
							]),
						),
					)
					.limit(1);

				if (futureAppt) {
					continue;
				}

				// Проверяем последнее отправленное сообщение пациенту для Frequency Capping (7 дней)
				const [lastOutbox] = await tx
					.select({ createdAt: communicationOutbox.createdAt })
					.from(communicationOutbox)
					.where(
						and(
							eq(communicationOutbox.organizationId, options.organizationId),
							eq(communicationOutbox.patientId, patient.id),
						),
					)
					.orderBy(desc(communicationOutbox.createdAt))
					.limit(1);

				const freqCap = checkFrequencyCapping(
					lastOutbox?.createdAt ? new Date(lastOutbox.createdAt) : null,
					now,
					cooldownDays,
				);

				const candidates: RecallCandidate[] = [];

				// СЦЕНАРИЙ 1: Профгигиена
				// Ищем последний завершенный визит с услугой профгигиены или чистки
				const [lastHygieneVisit] = await tx
					.select({
						signedAt: visits.signedAt,
						createdAt: visits.createdAt,
					})
					.from(visits)
					.where(
						and(
							eq(visits.organizationId, options.organizationId),
							eq(visits.patientId, patient.id),
							eq(visits.status, "signed"),
						),
					)
					.orderBy(desc(visits.createdAt))
					.limit(1);

				if (lastHygieneVisit) {
					const hygieneDate = new Date(
						lastHygieneVisit.signedAt ?? lastHygieneVisit.createdAt,
					);
					const evalHygiene = evaluateHygieneRecall(hygieneDate, now);
					if (evalHygiene.isDue) {
						const dedupePeriod = `${hygieneDate.getFullYear()}-${String(hygieneDate.getMonth() + 1).padStart(2, "0")}`;
						candidates.push({
							patientId: patient.id,
							patientFullName: patient.fullName,
							phone: patient.phone,
							email: patient.email,
							scenario: "hygiene",
							lastEventDate: hygieneDate,
							targetDueDate: evalHygiene.targetDueDate,
							daysOverdue: evalHygiene.daysOverdue,
							reason: "Прошло 6 месяцев с последней профессиональной гигиены.",
							dedupeKey: buildRecallDedupeKey(
								patient.id,
								"hygiene",
								dedupePeriod,
							),
						});
					}
				}

				// СЦЕНАРИЙ 2: Имплантация
				// Ищем установленные импланты пациента
				const implants = await tx
					.select({
						id: patientImplantInstallations.id,
						toothNumberFdi: patientImplantInstallations.toothNumberFdi,
						installedAt: patientImplantInstallations.installedAt,
						surgeonDoctorId: patientImplantInstallations.surgeonDoctorId,
					})
					.from(patientImplantInstallations)
					.where(
						and(
							eq(
								patientImplantInstallations.organizationId,
								options.organizationId,
							),
							eq(patientImplantInstallations.patientId, patient.id),
							eq(patientImplantInstallations.isArchived, false),
						),
					);

				for (const implant of implants) {
					const installDate = new Date(implant.installedAt);
					const evalImplant = evaluateImplantMilestones(installDate, now);

					if (evalImplant.isDue && evalImplant.activeMilestone) {
						let doctorName: string | null = null;
						if (implant.surgeonDoctorId) {
							const [doc] = await tx
								.select({ fullName: users.fullName })
								.from(users)
								.where(eq(users.id, implant.surgeonDoctorId))
								.limit(1);
							doctorName = doc?.fullName ?? null;
						}

						candidates.push({
							patientId: patient.id,
							patientFullName: patient.fullName,
							phone: patient.phone,
							email: patient.email,
							scenario: "implant_followup",
							implantMilestone: evalImplant.activeMilestone,
							toothNumber: implant.toothNumberFdi,
							doctorName,
							lastEventDate: installDate,
							targetDueDate: evalImplant.targetDueDate ?? now,
							daysOverdue: evalImplant.daysOverdue,
							reason: `Контрольный осмотр после имплантации (этап ${evalImplant.activeMilestone}, зуб ${implant.toothNumberFdi}).`,
							dedupeKey: buildRecallDedupeKey(
								patient.id,
								"implant_followup",
								`${implant.id}:${evalImplant.activeMilestone}`,
							),
						});
					}
				}

				// СЦЕНАРИЙ 3: Ортодонтия
				// Ищем активный план лечения по ортодонтии
				const [orthoPlan] = await tx
					.select({
						id: treatmentPlans.id,
						updatedAt: treatmentPlans.updatedAt,
					})
					.from(treatmentPlans)
					.where(
						and(
							eq(treatmentPlans.organizationId, options.organizationId),
							eq(treatmentPlans.patientId, patient.id),
							eq(treatmentPlans.status, "Active"),
						),
					)
					.orderBy(desc(treatmentPlans.updatedAt))
					.limit(1);

				if (orthoPlan) {
					const planDate = new Date(orthoPlan.updatedAt);
					const evalOrtho = evaluateOrthoRecall(planDate, now);
					if (evalOrtho.isDue) {
						const dedupeCycle = `${planDate.toISOString().slice(0, 10)}`;
						candidates.push({
							patientId: patient.id,
							patientFullName: patient.fullName,
							phone: patient.phone,
							email: patient.email,
							scenario: "ortho_activation",
							lastEventDate: planDate,
							targetDueDate: evalOrtho.targetDueDate,
							daysOverdue: evalOrtho.daysOverdue,
							reason: "Прошло 4 недели с момента последней активации ортодонтической системы.",
							dedupeKey: buildRecallDedupeKey(
								patient.id,
								"ortho_activation",
								dedupeCycle,
							),
						});
					}
				}

				summary.candidatesFound += candidates.length;

				// Обрабатываем найденных кандидатов
				for (const candidate of candidates) {
					// Проверяем Frequency Capping
					if (freqCap.isCapped) {
						summary.frequencyCappedCount += 1;
						summary.details.push({
							patientId: candidate.patientId,
							scenario: candidate.scenario,
							implantMilestone: candidate.implantMilestone,
							status: "frequency_capped",
							reason: freqCap.reason ?? "Frequency capping cooldown active",
						});
						continue;
					}

					// Проверяем наличие контакта
					const contactPhone = candidate.phone?.trim();
					if (!contactPhone) {
						summary.skippedNoContactCount += 1;
						summary.details.push({
							patientId: candidate.patientId,
							scenario: candidate.scenario,
							implantMilestone: candidate.implantMilestone,
							status: "skipped_no_contact",
							reason: "У пациента не указан номер телефона.",
						});
						continue;
					}

					// Выбираем канал (Telegram / WhatsApp / SMS)
					const preferredChannel: "telegram" | "whatsapp" | "sms" = "whatsapp";

					// Проверяем часовой пояс клиники
					const tzWindow = checkTimezoneSendWindow(now, timeZone);
					if (tzWindow.deferred) {
						summary.deferredQuietHoursCount += 1;
					}

					// Готовим текст сообщения
					const messageBody = PatientRecallPipeline.prepareMessageText(
						candidate.scenario,
						preferredChannel,
						{
							patient: candidate.patientFullName,
							clinic: clinicName,
							clinicPhone: clinicPhone,
							doctor: candidate.doctorName,
							tooth: candidate.toothNumber,
						},
						candidate.implantMilestone,
					);

					if (dryRun) {
						summary.queuedCount += 1;
						summary.details.push({
							patientId: candidate.patientId,
							scenario: candidate.scenario,
							implantMilestone: candidate.implantMilestone,
							status: "queued",
							reason: "Dry-run mode: candidate verified and prepared.",
						});
						continue;
					}

					// Постановка в communication_outbox с идемпотентным dedupeKey
					try {
						const [inserted] = await tx
							.insert(communicationOutbox)
							.values({
								organizationId: options.organizationId,
								clinicId: clinicRow?.id ?? null,
								patientId: candidate.patientId,
								channel: preferredChannel,
								intent: "recall",
								scope: "service",
								recipientAddress: contactPhone,
								subject: `Напоминание: ${candidate.reason}`,
								body: messageBody,
								status: "queued",
								scheduledAt: tzWindow.scheduledAt,
								nextAttemptAt: tzWindow.scheduledAt,
								maxAttempts: 5,
								dedupeKey: candidate.dedupeKey,
							})
							.onConflictDoNothing({
								target: [
									communicationOutbox.organizationId,
									communicationOutbox.dedupeKey,
								],
							})
							.returning({ id: communicationOutbox.id });

						if (inserted) {
							summary.queuedCount += 1;
							summary.details.push({
								patientId: candidate.patientId,
								scenario: candidate.scenario,
								implantMilestone: candidate.implantMilestone,
								status: "queued",
								outboxId: inserted.id,
							});
						} else {
							summary.alreadyQueuedCount += 1;
							summary.details.push({
								patientId: candidate.patientId,
								scenario: candidate.scenario,
								implantMilestone: candidate.implantMilestone,
								status: "already_queued",
								reason: "Сообщение с таким dedupeKey уже находится в очереди.",
							});
						}
					} catch (err: unknown) {
						const errMsg = err instanceof Error ? err.message : String(err);
						summary.problems.push(
							`Ошибка постановки реколла для пациента ${candidate.patientId}: ${errMsg}`,
						);
						summary.details.push({
							patientId: candidate.patientId,
							scenario: candidate.scenario,
							implantMilestone: candidate.implantMilestone,
							status: "error",
							reason: errMsg,
						});
					}
				}
			}

			return summary;
		});
	}
}
