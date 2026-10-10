/**
 * messageRenderer.ts
 *
 * Message templates rendering, previews and text formatters.
 */

import type {
	Appointment,
	AppointmentStatus,
	CommunicationTask,
	CommunicationTemplate,
	DenteTelegramBotSettings,
	DenteTelegramMessagePreview,
	DenteTelegramMessagePreviewRequest,
	DenteTelegramTemplateKind,
	StaffMember,
	StaffRole,
} from "@dental/shared";
import { denteTelegramMessagePreviewSchema } from "@dental/shared";
import { repairMojibakeDeep, repairMojibakeText } from "../../../text/repairMojibake.js";
import type { DomainState } from "../../../types/domainState.js";
import type { TelegramMessageContext } from "./types.js";
import {
	inMemoryDomainState,
	validScheduleTimeZone,
	appointmentClinicDateKey,
	clinicProfile,
	getAppointmentTimeFormatter,
	isOpenCommunicationTask,
} from "./storeState.js";
import {
	denteTelegramPortalUrlForTemplate,
	denteTelegramVisualCardUrlForTemplate,
	safeHttpsUrl,
} from "./botUrlHelpers.js";
import {
	getDenteTelegramBotSettings,
	denteTelegramBotSettings,
} from "./botSettings.js";
import {
	denteTelegramAppointmentCallbacksReady,
} from "./appointmentCallbacks.js";
import {
	telegramReplyMarkupFor,
} from "./replyMarkups.js";

export function telegramAppointmentTimeLabel(appointment: Appointment): string {
	const date = new Date(appointment.startsAt);
	if (Number.isNaN(date.getTime())) return "в согласованное время";
	const timeZone = validScheduleTimeZone(clinicProfile.timezone);
	return getAppointmentTimeFormatter(timeZone).format(date).replace(",", "");
}

const staffDigestVisibleAppointmentStatuses = new Set<AppointmentStatus>([
	"planned",
	"confirmed",
	"arrived",
	"in_treatment",
]);

const staffDigestClinicWideRoles = new Set<StaffRole>([
	"owner",
	"manager",
	"administrator",
]);

function staffRoleLabelForTelegramDigest(role: StaffRole): string {
	const labels: Record<StaffRole, string> = {
		owner: "владелец",
		doctor: "врач",
		administrator: "администратор",
		assistant: "ассистент",
		manager: "управляющий",
		curator: "куратор",
	};
	return labels[role];
}

function staffCanSeeTelegramDigestAppointment(
	staff: StaffMember,
	appointment: Appointment,
): boolean {
	if (staffDigestClinicWideRoles.has(staff.role)) return true;
	if (staff.role === "doctor") return appointment.doctorUserId === staff.id;
	if (staff.role === "assistant")
		return appointment.assistantUserId === staff.id;
	return false;
}

function staffCanSeeTelegramDigestTask(
	staff: StaffMember,
	task: CommunicationTask,
): boolean {
	if (staffDigestClinicWideRoles.has(staff.role)) return true;
	return task.assignedRole === staff.role;
}

export function buildDenteTelegramMessagePreviewData(
	templateKind: DenteTelegramTemplateKind,
	context: TelegramMessageContext,
	baseWarning: string,
): Omit<DenteTelegramMessagePreview, "replyMarkup" | "photoUrl"> {
	switch (templateKind) {
		case "appointment_reminder":
			return {
				templateKind: "appointment_reminder",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: напоминаем о приеме в ${context.clinicName} ${context.appointmentTime}. Если нужно перенести запись, свяжитесь с клиникой.`,
				variablesUsed: [
					"clinicName",
					...(context.hasAppointment ? ["appointmentTime"] : []),
				],
				warnings: [
					baseWarning,
					"Напоминание содержит только административное время приема и не раскрывает причину визита.",
				],
				blockedReason: null,
			};
		case "appointment_confirmation":
			return {
				templateKind: "appointment_confirmation",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: напоминание о записи от ${context.clinicName}. Подтвердите прием, перенесите его или позвоните в клинику.`,
				variablesUsed: ["clinicName"],
				warnings: [baseWarning],
				blockedReason: null,
			};
		case "payment_reminder_notice":
			return {
				templateKind: "payment_reminder_notice",
				classification: "limited_admin",
				allowedByDefault: true,
				text: context.portalUrl
					? `DENTE: у клиники есть вопрос по оплате. Свяжитесь с ${context.clinicName} или откройте защищенный портал: ${context.portalUrl}`
					: `DENTE: у клиники есть вопрос по оплате. Свяжитесь с ${context.clinicName}.`,
				variablesUsed: context.portalUrl
					? ["clinicName", "patientPortalBaseUrl"]
					: ["clinicName"],
				warnings: [
					baseWarning,
					"Сумма, детализация лечения и фискальные данные не отправляются через Telegram.",
				],
				blockedReason: null,
			};
		case "document_ready_notice":
			return {
				templateKind: "document_ready_notice",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: документ клиники готов. Открывайте его только в защищенном портале: ${context.portalUrl}`,
				variablesUsed: ["patientPortalBaseUrl"],
				warnings: [
					baseWarning,
					"Telegram передает только уведомление о готовности и ссылку на портал.",
				],
				blockedReason: null,
			};
		case "tax_document_request_status":
			return {
				templateKind: "tax_document_request_status",
				classification: "no_phi",
				allowedByDefault: true,
				text: context.portalUrl
					? `DENTE: статус запроса налоговых документов обновлен. Откройте налоговый раздел защищенного портала: ${context.portalUrl}`
					: "DENTE: статус запроса налоговых документов обновлен. Файлы готовятся внутри DENTE или защищенного портала.",
				variablesUsed: context.portalUrl ? ["patientPortalBaseUrl"] : [],
				warnings: [
					baseWarning,
					"Файл налоговой справки не отправляется через Telegram.",
				],
				blockedReason: null,
			};
		case "callback_request_received":
			return {
				templateKind: "callback_request_received",
				classification: "no_phi",
				allowedByDefault: true,
				text: "DENTE: запрос обратного звонка получен. Администратор клиники свяжется с вами.",
				variablesUsed: [],
				warnings: [baseWarning],
				blockedReason: null,
			};
		case "post_visit_instruction_link":
			return {
				templateKind: "post_visit_instruction_link",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: памятка после приема готова в защищенном портале клиники: ${context.portalUrl}`,
				variablesUsed: ["patientPortalBaseUrl"],
				warnings: [baseWarning, "Текст памятки не встраивается в Telegram."],
				blockedReason: null,
			};
		case "post_visit_checkup":
			return {
				templateKind: "post_visit_checkup",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: проверьте памятку после приема в защищенном портале: ${context.portalUrl}. Если есть вопросы или самочувствие ухудшается, свяжитесь с клиникой.`,
				variablesUsed: ["patientPortalBaseUrl"],
				warnings: [
					baseWarning,
					"Контрольное сообщение не раскрывает процедуру, зуб, диагноз, назначения и текст памятки.",
				],
				blockedReason: null,
			};
		case "recall_notice":
			return {
				templateKind: "recall_notice",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: ${context.clinicName} приглашает вас на профилактический контроль. Запишитесь через защищенный портал: ${context.portalUrl}`,
				variablesUsed: ["clinicName", "patientPortalBaseUrl"],
				warnings: [
					baseWarning,
					"Сообщение не раскрывает проведенную процедуру и причину приглашения.",
				],
				blockedReason: null,
			};
		case "review_request":
			return {
				templateKind: "review_request",
				classification: "no_phi",
				allowedByDefault: true,
				text: `DENTE: спасибо за визит в ${context.clinicName}. Ниже ссылка, чтобы оценить клинику.`,
				variablesUsed: [
					"clinicName",
					...(context.reviewUrl ? ["clinicReviewUrl"] : []),
					...(context.mapsUrl ? ["clinicMapsUrl"] : []),
				],
				warnings: [
					baseWarning,
					"Ссылки для отзывов должны быть общими HTTPS-ссылками клиники без пациента, приема, диагноза и идентификаторов лечения.",
				],
				blockedReason: null,
			};
		case "staff_daily_digest":
			return {
				templateKind: "staff_daily_digest",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: сводка на сегодня для роли "${context.staffRoleLabel}": приемов ${context.appointmentCount}, открытых задач ${context.openTaskCount}, срочных ${context.urgentTaskCount}. Откройте расписание или очередь связи в DENTE.`,
				variablesUsed: [
					"staffRole",
					"appointmentCount",
					"openTaskCount",
					"urgentTaskCount",
				],
				warnings: [
					baseWarning,
					"Сводка содержит только счетчики и не раскрывает пациентов, диагнозы, зубы, оплату и документы.",
				],
				blockedReason: null,
			};
	}
}


export function renderDenteTelegramMessagePreview(
	input: DenteTelegramMessagePreviewRequest,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
	state: DomainState = inMemoryDomainState,
): DenteTelegramMessagePreview {
	const portal = denteTelegramPortalUrlForTemplate(
		input.templateKind,
		settings,
	);
	const reviewUrl = safeHttpsUrl(settings.clinicReviewUrl);
	const mapsUrl = safeHttpsUrl(settings.clinicMapsUrl);
	const visualCardUrl = denteTelegramVisualCardUrlForTemplate(
		input.templateKind,
		settings,
	);
	const clinicName = repairMojibakeText(
		state.clinicProfile?.clinicName || clinicProfile.clinicName || "клиника DENTE",
	);
	const appointment = input.appointmentId
		? (state.appointments.find((item) => item.id === input.appointmentId) ?? null)
		: null;
	const appointmentTime = appointment
		? telegramAppointmentTimeLabel(appointment)
		: "в согласованное время";
	const patientVisualTemplateKinds: DenteTelegramTemplateKind[] = [
		"appointment_reminder",
		"appointment_confirmation",
		"payment_reminder_notice",
		"document_ready_notice",
		"tax_document_request_status",
		"callback_request_received",
		"post_visit_instruction_link",
		"post_visit_checkup",
		"recall_notice",
		"review_request",
	];
	const staffVisualTemplateKinds: DenteTelegramTemplateKind[] = [
		"staff_daily_digest",
	];
	const photoUrl =
		visualCardUrl &&
		(patientVisualTemplateKinds.includes(input.templateKind) ||
			staffVisualTemplateKinds.includes(input.templateKind))
			? visualCardUrl
			: null;

	if (input.includePhi) {
		return denteTelegramMessagePreviewSchema.parse({
			templateKind: input.templateKind,
			classification: "phi_requires_consent",
			allowedByDefault: false,
			text: "",
			replyMarkup: null,
			photoUrl: null,
			variablesUsed: [],
			warnings: [
				"Текст с медицинскими данными отключен до внедрения согласий, авторизации, шифрования и политики клиники.",
			],
			blockedReason: "phi_requires_consent",
		});
	}

	if (
		input.patientId &&
		!state.patients.some((patient) => patient.id === input.patientId)
	) {
		throw new Error("Пациент для предпросмотра Telegram не найден.");
	}
	if (input.appointmentId && !appointment) {
		throw new Error("Запись для предпросмотра Telegram не найдена.");
	}
	if (
		input.documentId &&
		!state.documents.some((document) => document.id === input.documentId)
	) {
		throw new Error("Документ для предпросмотра Telegram не найден.");
	}
	if (
		input.taskId &&
		!state.communicationTasks.some((task) => task.id === input.taskId)
	) {
		throw new Error(
			"Задача коммуникации для предпросмотра Telegram не найдена.",
		);
	}

	const portalRequired =
		input.templateKind === "document_ready_notice" ||
		input.templateKind === "post_visit_instruction_link" ||
		input.templateKind === "post_visit_checkup" ||
		input.templateKind === "recall_notice";
	if (portalRequired && !portal) {
		return denteTelegramMessagePreviewSchema.parse({
			templateKind: input.templateKind,
			classification: "limited_admin",
			allowedByDefault: false,
			text: "",
			replyMarkup: null,
			photoUrl: null,
			variablesUsed: ["patientPortalBaseUrl"],
			warnings: [
				"Укажите patientPortalBaseUrl перед отправкой Telegram-уведомлений со ссылкой на защищенный портал.",
			],
			blockedReason: "missing_patient_portal_base_url",
		});
	}

	if (input.templateKind === "review_request" && !reviewUrl && !mapsUrl) {
		return denteTelegramMessagePreviewSchema.parse({
			templateKind: input.templateKind,
			classification: "no_phi",
			allowedByDefault: false,
			text: "",
			replyMarkup: null,
			photoUrl: null,
			variablesUsed: ["clinicReviewUrl", "clinicMapsUrl"],
			warnings: [
				"Укажите HTTPS-ссылку clinicReviewUrl или clinicMapsUrl перед просьбой оставить отзыв.",
			],
			blockedReason: "missing_clinic_review_url",
		});
	}

	const baseWarning =
		"В Telegram не включаются диагнозы, номера зубов, план лечения, снимки, налоговые PDF, детализация оплаты и копии меддокументов.";
	const context: TelegramMessageContext = {
		clinicName,
		appointmentTime,
		hasAppointment: !!appointment,
		portalUrl: portal,
		reviewUrl,
		mapsUrl,
	};

	if (input.templateKind === "staff_daily_digest") {
		const staff = input.staffId
			? (state.staffMembers.find(
					(member) =>
						member.id === input.staffId &&
						member.organizationId === settings.organizationId &&
						member.active,
				) ?? null)
			: null;
		if (input.staffId && !staff) {
			throw new Error("Сотрудник для предпросмотра Telegram не найден.");
		}
		const clinicDateKey = appointmentClinicDateKey(new Date().toISOString());
		const scopedAppointments = state.appointments.filter(
			(appointment) =>
				appointment.organizationId === settings.organizationId &&
				staffDigestVisibleAppointmentStatuses.has(appointment.status) &&
				appointmentClinicDateKey(appointment.startsAt) === clinicDateKey &&
				(!staff || staffCanSeeTelegramDigestAppointment(staff, appointment)),
		);
		const scopedTasks = state.communicationTasks.filter(
			(task) =>
				task.organizationId === settings.organizationId &&
				isOpenCommunicationTask(task) &&
				(!staff || staffCanSeeTelegramDigestTask(staff, task)),
		);
		const urgentTaskCount = scopedTasks.filter(
			(task) => task.priority === "urgent" || task.priority === "high",
		).length;

		context.staffRoleLabel = staff
			? staffRoleLabelForTelegramDigest(staff.role)
			: "команда клиники";
		context.appointmentCount = scopedAppointments.length;
		context.openTaskCount = scopedTasks.length;
		context.urgentTaskCount = urgentTaskCount;
	}

	const preview = buildDenteTelegramMessagePreviewData(
		input.templateKind,
		context,
		baseWarning,
	);
	const appointmentCallbackUnavailable =
		(input.templateKind === "appointment_reminder" ||
			input.templateKind === "appointment_confirmation") &&
		Boolean(input.appointmentId) &&
		!denteTelegramAppointmentCallbacksReady();
	return denteTelegramMessagePreviewSchema.parse({
		...preview,
		warnings: appointmentCallbackUnavailable
			? [
					...preview.warnings,
					"Подписанные Telegram-кнопки приема отключены: включите секрет подписанных кнопок в серверных настройках.",
				]
			: preview.warnings,
		replyMarkup: preview.allowedByDefault
			? telegramReplyMarkupFor(
					input.templateKind,
					input.appointmentId ?? null,
					settings,
				)
			: null,
		photoUrl: preview.allowedByDefault ? photoUrl : null,
	});
}

export function telegramTemplateKindForTask(
	task: CommunicationTask,
): DenteTelegramTemplateKind {
	if (task.intent === "appointment_confirmation")
		return "appointment_confirmation";
	if (task.intent === "payment_reminder") return "payment_reminder_notice";
	if (task.intent === "document_ready") return "document_ready_notice";
	if (task.intent === "recall") return "recall_notice";
	if (task.intent === "post_visit_instruction")
		return "post_visit_instruction_link";
	return "callback_request_received";
}

