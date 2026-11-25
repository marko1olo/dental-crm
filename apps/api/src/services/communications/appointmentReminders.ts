import { and, eq, gte, inArray, like, lte } from "drizzle-orm";
import {
	type TenantDb,
	withSuperuserBypass,
	withTenantCtx,
} from "../../db/rls.js";
import {
	appointments,
	chairs,
	clinics,
	communicationOutbox,
	communicationSettings,
	communicationTemplates,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import { createApiLogger } from "../../observability/logger.js";
import { issueAppointmentActionLinks } from "./appointmentActionLinks.js";
import type { CommunicationChannelCode } from "./channelRouter.js";
import { loadConsentsByPatient } from "./consentLoader.js";
import { type ConsentRecord, decideConsent } from "./deliveryPolicy.js";
import {
	enqueueMessage,
	parseLeadHours,
	resolveCommunicationSettings,
	resolveRecipientAddress,
} from "./dispatcher.js";
import { renderTemplate } from "./templateEngine/templateRenderer.js";

const remindersLogger = createApiLogger("appointmentReminders");
const REMINDABLE_STATUSES = ["planned", "confirmed"] as const;
type ReminderSkipReason = "no_channel" | "no_template_data";

type ReminderSkip = {
	readonly patientName: string;
	readonly reason: ReminderSkipReason;
	readonly appointmentAt: string;
};

const MAX_NAMED_REMINDER_SKIPS = 20;

export type ReminderScheduleReport = {
	readonly organizations: number;
	readonly examined: number;
	readonly queued: number;
	readonly alreadyQueued: number;
	readonly skippedNoChannel: number;
	readonly skippedNoTemplateData: number;
	readonly skipped: readonly ReminderSkip[];
	readonly problems: string[];
};

export function addressableName(fullName: string): string {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length >= 3) return `${parts[1]} ${parts[2]}`;
	if (parts.length === 2) return parts[1] ?? fullName.trim();
	return fullName.trim();
}

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

function formatInTimeZone(
	date: Date,
	timeZone: string,
	options: Intl.DateTimeFormatOptions,
): string {
	try {
		return new Intl.DateTimeFormat("ru-RU", { ...options, timeZone }).format(
			date,
		);
	} catch {
		return new Intl.DateTimeFormat("ru-RU", {
			...options,
			timeZone: "UTC",
		}).format(date);
	}
}

function logStructured(
	level: "info" | "warn" | "error",
	data: Record<string, unknown>,
	msg: string,
) {
	if (level === "error") {
		remindersLogger.error(data, msg);
	} else if (level === "warn") {
		remindersLogger.warn(data, msg);
	} else {
		remindersLogger.info(data, msg);
	}
}

export async function invalidateAppointmentReminders(
	organizationId: string,
	appointmentId: string,
	reason: string,
	tx?: TenantDb,
): Promise<number> {
	const run = (tenantTx: TenantDb) =>
		tenantTx
			.delete(communicationOutbox)
			.where(
				and(
					eq(communicationOutbox.organizationId, organizationId),
					eq(communicationOutbox.status, "queued"),
					like(communicationOutbox.dedupeKey, `reminder:${appointmentId}:%`),
				),
			)
			.returning({ id: communicationOutbox.id });

	const removed = tx
		? await run(tx)
		: await withTenantCtx(organizationId, run);

	if (removed.length > 0) {
		logStructured(
			"info",
			{ removedCount: removed.length, appointmentId, reason },
			`[reminders] снято напоминаний: ${removed.length}, приём ${appointmentId}, причина: ${reason}`,
		);
	}
	return removed.length;
}

export type ScheduleAppointmentRemindersOptions = {
	readonly organizationId?: string | null;
	readonly now?: Date;
};

export async function scheduleAppointmentReminders(
	options: ScheduleAppointmentRemindersOptions = {},
): Promise<ReminderScheduleReport> {
	const now = options.now ?? new Date();
	const report = {
		organizations: 0,
		examined: 0,
		queued: 0,
		alreadyQueued: 0,
		skippedNoChannel: 0,
		skippedNoTemplateData: 0,
		problems: [] as string[],
	};
	const namedSkips = new Map<string, ReminderSkip>();

	const settingsFilter = [
		eq(communicationSettings.appointmentReminderEnabled, true),
	];
	if (options.organizationId) {
		settingsFilter.push(
			eq(communicationSettings.organizationId, options.organizationId),
		);
	}

	const readEnabledOrganizations = async (tx: TenantDb) =>
		tx
			.select({ organizationId: communicationSettings.organizationId })
			.from(communicationSettings)
			.where(and(...settingsFilter));
	const enabledRows = options.organizationId
		? await withTenantCtx(options.organizationId, readEnabledOrganizations)
		: await withSuperuserBypass(readEnabledOrganizations);

	for (const { organizationId } of enabledRows) {
		report.organizations += 1;
		try {
			await withTenantCtx(organizationId, (tx) =>
				scheduleForOrganization(tx, organizationId, now, report, namedSkips),
			);
		} catch (error) {
			const detail =
				error instanceof Error
					? error.message.slice(0, 200)
					: String(error).slice(0, 200);
			logStructured(
				"error",
				{ organizationId, detail, error: detail },
				`[reminders] сбой постановки напоминаний, организация ${organizationId}: ${detail}`,
			);
			report.problems.push(`Напоминания поставить не удалось: ${detail}`);
		}
	}

	return {
		...report,
		skipped: [...namedSkips.values()].slice(0, MAX_NAMED_REMINDER_SKIPS),
	};
}

async function scheduleForOrganization(
	tx: TenantDb,
	organizationId: string,
	now: Date,
	report: {
		examined: number;
		queued: number;
		alreadyQueued: number;
		skippedNoChannel: number;
		skippedNoTemplateData: number;
		problems: string[];
	},
	namedSkips: Map<string, ReminderSkip>,
): Promise<void> {
	const [settingsRow] = await tx
		.select({
			leadHoursJson: communicationSettings.appointmentReminderLeadHoursJson,
			windowMinutes: communicationSettings.appointmentReminderWindowMinutes,
		})
		.from(communicationSettings)
		.where(eq(communicationSettings.organizationId, organizationId))
		.limit(1);
	if (!settingsRow) return;

	const settings = await resolveCommunicationSettings(organizationId);
	const leadHours = parseLeadHours(settingsRow.leadHoursJson);
	const windowMs = Math.max(5, settingsRow.windowMinutes) * 60_000;

	const templateRows = await tx
		.select()
		.from(communicationTemplates)
		.where(
			and(
				eq(communicationTemplates.organizationId, organizationId),
				eq(communicationTemplates.intent, "appointment_confirmation"),
				eq(communicationTemplates.isActive, true),
			),
		);
	const templateByChannel = new Map<string, (typeof templateRows)[number]>();
	for (const template of templateRows) {
		if (!templateByChannel.has(template.channel))
			templateByChannel.set(template.channel, template);
	}
	if (templateByChannel.size === 0) {
		logStructured(
			"error",
			{ organizationId },
			`[reminders] нет активного шаблона «Подтверждение приёма», организация ${organizationId}`,
		);
		report.problems.push(
			"Напоминания включены, но нет ни одного активного шаблона с назначением «Подтверждение приёма» — " +
				"отправлять нечем. Создайте шаблон для нужного канала в разделе «Шаблоны сообщений» ниже.",
		);
		return;
	}

	const [organization] = await tx
		.select({ name: organizations.name })
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);
	const [clinic] = await tx
		.select({
			name: clinics.name,
			phone: clinics.phone,
			address: clinics.address,
		})
		.from(clinics)
		.where(eq(clinics.organizationId, organizationId))
		.limit(1);

	for (const hours of leadHours) {
		const leadMs = hours * 60 * 60 * 1000;
		const windowStart = new Date(now.getTime() + leadMs - windowMs);
		const windowEnd = new Date(now.getTime() + leadMs);

		const dueAppointments = await tx
			.select({
				id: appointments.id,
				patientId: appointments.patientId,
				doctorUserId: appointments.doctorUserId,
				chairId: appointments.chairId,
				startsAt: appointments.startsAt,
				status: appointments.status,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					inArray(appointments.status, [...REMINDABLE_STATUSES]),
					gte(appointments.startsAt, windowStart),
					lte(appointments.startsAt, windowEnd),
				),
			);

		const duePatientIds = [
			...new Set(
				dueAppointments
					.map((row) => row.patientId)
					.filter((id): id is string => !!id),
			),
		];
		const dueDoctorIds = [
			...new Set(
				dueAppointments
					.map((row) => row.doctorUserId)
					.filter((id): id is string => !!id),
			),
		];
		const dueChairIds = [
			...new Set(
				dueAppointments
					.map((row) => row.chairId)
					.filter((id): id is string => !!id),
			),
		];

		const patientRows =
			duePatientIds.length > 0
				? await tx
						.select({ id: patients.id, fullName: patients.fullName })
						.from(patients)
						.where(
							and(
								eq(patients.organizationId, organizationId),
								inArray(patients.id, duePatientIds),
							),
						)
				: [];
		const patientById = new Map(patientRows.map((row) => [row.id, row]));

		const doctorRows =
			dueDoctorIds.length > 0
				? await tx
						.select({ id: users.id, fullName: users.fullName })
						.from(users)
						.where(inArray(users.id, dueDoctorIds))
				: [];
		const doctorById = new Map(doctorRows.map((row) => [row.id, row]));

		const chairRows =
			dueChairIds.length > 0
				? await tx
						.select({ id: chairs.id, name: chairs.name })
						.from(chairs)
						.where(
							and(
								eq(chairs.organizationId, organizationId),
								inArray(chairs.id, dueChairIds),
							),
						)
				: [];
		const chairById = new Map(chairRows.map((row) => [row.id, row]));

		const consentsByPatient = await loadConsentsByPatient(
			organizationId,
			duePatientIds,
		);

		for (const appointment of dueAppointments) {
			if (!appointment.patientId) continue;
			report.examined += 1;

			const patient = patientById.get(appointment.patientId);
			if (!patient) continue;

			const doctor = appointment.doctorUserId
				? doctorById.get(appointment.doctorUserId)
				: undefined;

			const consents: ConsentRecord[] =
				consentsByPatient.get(appointment.patientId) ?? [];

			const values: Record<string, string> = {
				patient: addressableName(patient.fullName),
				patientFullName: patient.fullName.trim(),
				clinic: clinic?.name ?? organization?.name ?? "клиника",
				date: formatInTimeZone(appointment.startsAt, settings.timezone, {
					day: "numeric",
					month: "long",
				}),
				time: formatInTimeZone(appointment.startsAt, settings.timezone, {
					hour: "2-digit",
					minute: "2-digit",
				}),
				weekday: formatInTimeZone(appointment.startsAt, settings.timezone, {
					weekday: "long",
				}),
			};
			if (clinic?.phone) values.clinicPhone = clinic.phone;
			if (clinic?.address) values.clinicAddress = clinic.address;
			if (doctor?.fullName) values.doctor = shortDoctorName(doctor.fullName);

			const chair = appointment.chairId
				? chairById.get(appointment.chairId)
				: undefined;
			if (chair?.name) {
				values.cabinet = chair.name;
				values.chair = chair.name;
			}

			const links = await issueAppointmentActionLinks(
				{
					organizationId,
					appointmentId: appointment.id,
					startsAt: appointment.startsAt,
				},
				now,
				process.env,
				tx,
			);
			if (links) {
				values.confirmLink = links.confirmLink;
				values.cancelLink = links.cancelLink;
				if (links.rescheduleLink) {
					values.rescheduleLink = links.rescheduleLink;
				}
			}

			const outcome = await enqueueReminderForAppointment(tx, {
				organizationId,
				appointmentId: appointment.id,
				patientId: appointment.patientId,
				hours,
				values,
				consents,
				channelOrder: settings.channelFallback,
				templateByChannel,
			});

			switch (outcome) {
				case "queued":
					report.queued += 1;
					break;
				case "duplicate":
					report.alreadyQueued += 1;
					break;
				case "no_template_data":
					report.skippedNoTemplateData += 1;
					rememberSkip(namedSkips, appointment.patientId, {
						patientName: patient.fullName.trim(),
						reason: "no_template_data",
						appointmentAt: appointment.startsAt.toISOString(),
					});
					break;
				case "no_channel":
					report.skippedNoChannel += 1;
					rememberSkip(namedSkips, appointment.patientId, {
						patientName: patient.fullName.trim(),
						reason: "no_channel",
						appointmentAt: appointment.startsAt.toISOString(),
					});
					break;
				default: {
					const unhandled: never = outcome;
					throw new Error(
						`Неизвестный итог постановки напоминания: ${String(unhandled)}`,
					);
				}
			}
		}
	}
}

function rememberSkip(
	namedSkips: Map<string, ReminderSkip>,
	patientId: string,
	skip: ReminderSkip,
): void {
	const key = `${patientId}|${skip.reason}|${skip.appointmentAt}`;
	if (!namedSkips.has(key)) namedSkips.set(key, skip);
}

type ReminderOutcome =
	| "queued"
	| "duplicate"
	| "no_channel"
	| "no_template_data";

async function enqueueReminderForAppointment(
	tx: TenantDb,
	input: {
		organizationId: string;
		appointmentId: string;
		patientId: string;
		hours: number;
		values: Record<string, string>;
		consents: ConsentRecord[];
		channelOrder: CommunicationChannelCode[];
		templateByChannel: Map<
			string,
			{ id: string; channel: string; body: string; title: string }
		>;
	},
): Promise<ReminderOutcome> {
	let sawTemplateDataProblem = false;

	for (const channel of input.channelOrder) {
		const template = input.templateByChannel.get(channel);
		if (!template) continue;

		if (!decideConsent(input.consents, channel, "service").allowed) continue;

		const recipient = await resolveRecipientAddress(
			input.organizationId,
			channel,
			input.patientId,
		);
		if (!recipient.address) continue;

		const rendered = renderTemplate(template.body, input.values, {
			allowPhi: true,
		});
		if (!rendered.ok) {
			sawTemplateDataProblem = true;
			continue;
		}

		const result = await enqueueMessage(
			{
				organizationId: input.organizationId,
				patientId: input.patientId,
				templateId: template.id,
				channel,
				intent: "appointment_confirmation",
				scope: "service",
				recipientAddress: recipient.address,
				subject: template.title,
				body: rendered.text,
				dedupeKey: `reminder:${input.appointmentId}:${input.hours}`,
			},
			tx,
		);

		if (!result.ok) continue;
		return result.duplicate ? "duplicate" : "queued";
	}

	return sawTemplateDataProblem ? "no_template_data" : "no_channel";
}
