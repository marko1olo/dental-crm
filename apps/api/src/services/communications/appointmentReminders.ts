/**
 * Автоматические напоминания о приёме.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ ПОЯВИЛСЯ
 * Напоминание за сутки — то, ради чего клиника заводит рассылку: оно прямо
 * уменьшает неявки. В проекте его не существовало. Ближайшее, что было:
 *   • поле appointment_reminder_lead_times_hours_json в
 *     dente_telegram_bot_configs — привязано к одному каналу и читается только
 *     при сборке списка Telegram-outbox;
 *   • services/recallScheduler.ts и services/postOpCareTrigger.ts — оба
 *     ниоткуда не вызываются.
 *
 * Здесь напоминание ставится в общую очередь и уходит первым каналом, который
 * действительно доступен пациенту: есть контакт, есть согласие и есть шаблон.
 *
 * ИДЕМПОТЕНТНОСТЬ. Ключ дубля — `reminder:<приём>:<часов до приёма>`. Сколько
 * бы раз планировщик ни запустился, пациент получит одно напоминание: за
 * повторное клиника платит дважды, а доверие теряет один раз.
 */

import { and, eq, gte, inArray, like, lte } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	clinics,
	communicationOutbox,
	communicationSettings,
	communicationTemplates,
	organizations,
	patients,
	users
} from "../../db/schema.js";
import { issueAppointmentActionLinks } from "./appointmentActionLinks.js";
import { loadConsentsByPatient } from "./consentLoader.js";
import { decideConsent, type ConsentRecord } from "./deliveryPolicy.js";
import { enqueueMessage, parseLeadHours, resolveCommunicationSettings, resolveRecipientAddress } from "./dispatcher.js";
import { renderTemplate } from "./templateRenderer.js";
import type { CommunicationChannelCode } from "./channelRouter.js";

/** Статусы, при которых напоминание уместно. Отменённому приёму оно вредно. */
const REMINDABLE_STATUSES = ["planned", "confirmed"] as const;

export type ReminderScheduleReport = {
	readonly organizations: number;
	readonly examined: number;
	readonly queued: number;
	readonly alreadyQueued: number;
	/** Нет ни одного канала с контактом, согласием и шаблоном. */
	readonly skippedNoChannel: number;
	/** Шаблон есть, но не хватило значения переменной — отправка остановлена. */
	readonly skippedNoTemplateData: number;
	readonly problems: string[];
};

/** «Орлова Марина Петровна» → «Марина Петровна»: к пациенту обращаются по имени-отчеству. */
export function addressableName(fullName: string): string {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length >= 3) return `${parts[1]} ${parts[2]}`;
	if (parts.length === 2) return parts[1] ?? fullName.trim();
	return fullName.trim();
}

/** «Иванов Иван Иванович» → «Иванов И. И.» — так врача называют в сообщении. */
export function shortDoctorName(fullName: string): string {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	const surname = parts[0];
	if (!surname) return fullName.trim();
	const initials = parts
		.slice(1, 3)
		.map((part) => `${part.charAt(0).toUpperCase()}.`)
		.join(" ");
	return initials ? `${surname} ${initials}` : surname;
}

function formatInTimeZone(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions): string {
	try {
		return new Intl.DateTimeFormat("ru-RU", { ...options, timeZone }).format(date);
	} catch {
		return new Intl.DateTimeFormat("ru-RU", { ...options, timeZone: "UTC" }).format(date);
	}
}

/**
 * Снятие напоминаний, которые перестали соответствовать приёму.
 *
 * ЗАЧЕМ ЭТО ОБЯЗАТЕЛЬНО. Напоминание ставится в очередь заранее и несёт в тексте
 * дату и время: «ждём вас 12 августа в 14:30». Если приём перенесли или
 * отменили, а очередь не тронули, пациент получит это сообщение с уже неверным
 * временем — либо приглашение на приём, которого нет. Такое хуже отсутствия
 * напоминания: человек приедет не в тот день и будет прав.
 *
 * ПОЧЕМУ УДАЛЕНИЕ, А НЕ СТАТУС «ОТМЕНЕНО». Ключ дубля у напоминания —
 * `reminder:<приём>:<часов>`. Если оставить строку с этим ключом в любом
 * состоянии, повторная постановка увидит её как дубль и НЕ создаст напоминание
 * с новым временем — приём переехал, а пациент не узнает. Удаляются только
 * строки в состоянии `queued`: ничего отправленного это не затрагивает, а
 * ценность записи о неотправленном и уже неверном напоминании нулевая.
 */
export async function invalidateAppointmentReminders(
	organizationId: string,
	appointmentId: string,
	reason: string
): Promise<number> {
	const removed = await db
		.delete(communicationOutbox)
		.where(
			and(
				eq(communicationOutbox.organizationId, organizationId),
				eq(communicationOutbox.status, "queued"),
				// Только напоминания этого приёма: ключ начинается с
				// `reminder:<приём>:`. Рассылки и ручные сообщения не трогаем.
				like(communicationOutbox.dedupeKey, `reminder:${appointmentId}:%`)
			)
		)
		.returning({ id: communicationOutbox.id });

	if (removed.length > 0) {
		// Причина остаётся в журнале сервера: в самой строке её уже не сохранить.
		console.info(
			`[reminders] снято напоминаний: ${removed.length}, приём ${appointmentId}, причина: ${reason}`
		);
	}
	return removed.length;
}

export type ScheduleAppointmentRemindersOptions = {
	/** Ограничить одной организацией. Пусто — все, у кого напоминания включены. */
	readonly organizationId?: string | null;
	readonly now?: Date;
};

export async function scheduleAppointmentReminders(
	options: ScheduleAppointmentRemindersOptions = {}
): Promise<ReminderScheduleReport> {
	const now = options.now ?? new Date();
	const report = {
		organizations: 0,
		examined: 0,
		queued: 0,
		alreadyQueued: 0,
		skippedNoChannel: 0,
		skippedNoTemplateData: 0,
		problems: [] as string[]
	};

	const settingsFilter = [eq(communicationSettings.appointmentReminderEnabled, true)];
	if (options.organizationId) {
		settingsFilter.push(eq(communicationSettings.organizationId, options.organizationId));
	}
	const enabledRows = await db
		.select({ organizationId: communicationSettings.organizationId })
		.from(communicationSettings)
		.where(and(...settingsFilter));

	for (const { organizationId } of enabledRows) {
		report.organizations += 1;
		try {
			await scheduleForOrganization(organizationId, now, report);
		} catch (error) {
			report.problems.push(
				`Организация ${organizationId}: ${error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200)}`
			);
		}
	}

	return report;
}

async function scheduleForOrganization(
	organizationId: string,
	now: Date,
	report: {
		examined: number;
		queued: number;
		alreadyQueued: number;
		skippedNoChannel: number;
		skippedNoTemplateData: number;
		problems: string[];
	}
): Promise<void> {
	const [settingsRow] = await db
		.select({
			leadHoursJson: communicationSettings.appointmentReminderLeadHoursJson,
			windowMinutes: communicationSettings.appointmentReminderWindowMinutes
		})
		.from(communicationSettings)
		.where(eq(communicationSettings.organizationId, organizationId))
		.limit(1);
	if (!settingsRow) return;

	const settings = await resolveCommunicationSettings(organizationId);
	const leadHours = parseLeadHours(settingsRow.leadHoursJson);
	const windowMs = Math.max(5, settingsRow.windowMinutes) * 60_000;

	// Шаблоны напоминания по каналам — по одному активному на канал.
	const templateRows = await db
		.select()
		.from(communicationTemplates)
		.where(
			and(
				eq(communicationTemplates.organizationId, organizationId),
				eq(communicationTemplates.intent, "appointment_confirmation"),
				eq(communicationTemplates.isActive, true)
			)
		);
	const templateByChannel = new Map<string, (typeof templateRows)[number]>();
	for (const template of templateRows) {
		if (!templateByChannel.has(template.channel)) templateByChannel.set(template.channel, template);
	}
	if (templateByChannel.size === 0) {
		report.problems.push(
			`Организация ${organizationId}: напоминания включены, но нет активного шаблона с назначением ` +
				"«Подтверждение приёма». Ни одно напоминание не отправлено."
		);
		return;
	}

	const [organization] = await db
		.select({ name: organizations.name })
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);
	const [clinic] = await db
		.select({ name: clinics.name, phone: clinics.phone, address: clinics.address })
		.from(clinics)
		.where(eq(clinics.organizationId, organizationId))
		.limit(1);

	for (const hours of leadHours) {
		const leadMs = hours * 60 * 60 * 1000;
		// Напоминание уместно, когда момент «приём минус N часов» попал в
		// последнее окно. Без окна перезапуск планировщика через сутки разослал
		// бы напоминания о вчерашних приёмах.
		const windowStart = new Date(now.getTime() + leadMs - windowMs);
		const windowEnd = new Date(now.getTime() + leadMs);

		const dueAppointments = await db
			.select({
				id: appointments.id,
				patientId: appointments.patientId,
				doctorUserId: appointments.doctorUserId,
				startsAt: appointments.startsAt,
				status: appointments.status
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					inArray(appointments.status, [...REMINDABLE_STATUSES]),
					gte(appointments.startsAt, windowStart),
					lte(appointments.startsAt, windowEnd)
				)
			);

		// ФИО пациентов, ФИО врачей и согласия — по одному запросу на всю выборку
		// окна, а не по три запроса на приём. Прежний вариант делал 3N+1 обращений
		// на каждый порог оповещения: при 30 приёмах в день и двух порогах это 182
		// запроса за проход планировщика вместо 8. Каждый занимал соединение из
		// пула, общего с интерактивной работой администраторов, поэтому фоновая
		// рассылка напоминаний конкурировала со стойкой регистрации. Правило
		// «согласия читаются пакетом» уже было записано в рассылках с той же
		// причиной — здесь оно наконец соблюдается через общий consentLoader.
		const duePatientIds = [...new Set(dueAppointments.map((row) => row.patientId).filter((id): id is string => !!id))];
		const dueDoctorIds = [
			...new Set(dueAppointments.map((row) => row.doctorUserId).filter((id): id is string => !!id))
		];

		const patientRows =
			duePatientIds.length > 0
				? await db
						.select({ id: patients.id, fullName: patients.fullName })
						.from(patients)
						.where(and(eq(patients.organizationId, organizationId), inArray(patients.id, duePatientIds)))
				: [];
		const patientById = new Map(patientRows.map((row) => [row.id, row]));

		// Отбор врачей сознательно оставлен без условия по организации: прежний
		// запрос его тоже не имел, а добавить его — значит потерять ФИО врача у
		// приёма с чужим doctor_user_id, и тогда шаблон с {doctor} не отрендерится
		// и напоминание просто не уйдёт. Молча перестать напоминать хуже, чем
		// подставить имя. Отсутствие отбора по организации записано долгом.
		const doctorRows =
			dueDoctorIds.length > 0
				? await db
						.select({ id: users.id, fullName: users.fullName })
						.from(users)
						.where(inArray(users.id, dueDoctorIds))
				: [];
		const doctorById = new Map(doctorRows.map((row) => [row.id, row]));

		const consentsByPatient = await loadConsentsByPatient(organizationId, duePatientIds);

		for (const appointment of dueAppointments) {
			if (!appointment.patientId) continue;
			report.examined += 1;

			const patient = patientById.get(appointment.patientId);
			if (!patient) continue;

			const doctor = appointment.doctorUserId ? doctorById.get(appointment.doctorUserId) : undefined;

			const consents: ConsentRecord[] = consentsByPatient.get(appointment.patientId) ?? [];

			const values: Record<string, string> = {
				patient: addressableName(patient.fullName),
				patientFullName: patient.fullName.trim(),
				clinic: clinic?.name ?? organization?.name ?? "клиника",
				date: formatInTimeZone(appointment.startsAt, settings.timezone, { day: "numeric", month: "long" }),
				time: formatInTimeZone(appointment.startsAt, settings.timezone, { hour: "2-digit", minute: "2-digit" }),
				weekday: formatInTimeZone(appointment.startsAt, settings.timezone, { weekday: "long" })
			};
			if (clinic?.phone) values.clinicPhone = clinic.phone;
			if (clinic?.address) values.clinicAddress = clinic.address;
			if (doctor?.fullName) values.doctor = shortDoctorName(doctor.fullName);

			// Ссылки «подтвердить» и «отменить». Если публичный адрес клиники не
			// настроен, переменных просто нет: шаблон с {confirmLink} тогда не
			// отрендерится и напоминание не уйдёт с пустым местом вместо ссылки.
			const links = await issueAppointmentActionLinks(
				{ organizationId, appointmentId: appointment.id, startsAt: appointment.startsAt },
				now
			);
			if (links) {
				values.confirmLink = links.confirmLink;
				values.cancelLink = links.cancelLink;
			}

			const outcome = await enqueueReminderForAppointment({
				organizationId,
				appointmentId: appointment.id,
				patientId: appointment.patientId,
				hours,
				values,
				consents,
				channelOrder: settings.channelFallback,
				templateByChannel
			});

			if (outcome === "queued") report.queued += 1;
			else if (outcome === "duplicate") report.alreadyQueued += 1;
			else if (outcome === "no_template_data") report.skippedNoTemplateData += 1;
			else report.skippedNoChannel += 1;
		}
	}
}

type ReminderOutcome = "queued" | "duplicate" | "no_channel" | "no_template_data";

async function enqueueReminderForAppointment(input: {
	organizationId: string;
	appointmentId: string;
	patientId: string;
	hours: number;
	values: Record<string, string>;
	consents: ConsentRecord[];
	channelOrder: CommunicationChannelCode[];
	templateByChannel: Map<string, { id: string; channel: string; body: string; title: string }>;
}): Promise<ReminderOutcome> {
	let sawTemplateDataProblem = false;

	// Первый канал, где есть всё сразу: шаблон, согласие и контакт. Порядок
	// задаёт клиника — обычно мессенджер дешевле SMS.
	for (const channel of input.channelOrder) {
		const template = input.templateByChannel.get(channel);
		if (!template) continue;

		if (!decideConsent(input.consents, channel, "service").allowed) continue;

		const recipient = await resolveRecipientAddress(input.organizationId, channel, input.patientId);
		if (!recipient.address) continue;

		const rendered = renderTemplate(template.body, input.values, { allowPhi: true });
		if (!rendered.ok) {
			// Шаблон просит то, чего у нас нет. Отправлять с дырой нельзя.
			sawTemplateDataProblem = true;
			continue;
		}

		const result = await enqueueMessage({
			organizationId: input.organizationId,
			patientId: input.patientId,
			templateId: template.id,
			channel,
			intent: "appointment_confirmation",
			scope: "service",
			recipientAddress: recipient.address,
			subject: template.title,
			body: rendered.text,
			// Ключ не зависит от канала: если канал сменится, второе напоминание
			// об одном приёме всё равно не уйдёт.
			dedupeKey: `reminder:${input.appointmentId}:${input.hours}`
		});

		if (!result.ok) continue;
		return result.duplicate ? "duplicate" : "queued";
	}

	return sawTemplateDataProblem ? "no_template_data" : "no_channel";
}
