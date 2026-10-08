/**
 * appointmentCallbacks.ts
 *
 * Telegram appointment callback verification, signing and dispatch.
 */

import {
	createHmac,
	randomUUID,
	timingSafeEqual,
} from "node:crypto";
import type {
	Appointment,
	AppointmentStatus,
	CommunicationTask,
	CommunicationTaskOutcome,
	CompleteCommunicationTaskInput,
	DenteTelegramChatLink,
	DenteTelegramTemplateKind,
} from "@dental/shared";
import type { DomainState } from "../../../types/domainState.js";
import type {
	DenteTelegramAppointmentCallbackAction,
	DenteTelegramAppointmentCallbackScope,
} from "./types.js";
import {
	denteTelegramChatLinks,
	inMemoryAppointments,
	inMemoryCommunicationEvents,
	inMemoryCommunicationTasks,
	inMemoryDomainState,
	isOpenCommunicationTask,
	persistMutableState,
	recordAuditEvent,
	validScheduleTimeZone,
	organizationId,
	doctorUserId,
} from "./storeState.js";
import {
	denteTelegramPortalUrlForTemplate,
} from "./botUrlHelpers.js";
import {
	getDenteTelegramBotSettings,
} from "./botSettings.js";
import {
	decryptTelegramChatTransportRef,
} from "./linkCodes.js";

const denteTelegramAppointmentCallbackCodes: Record<
	DenteTelegramAppointmentCallbackAction,
	string
> = {
	confirm: "c",
	reschedule: "r",
	call_request: "p",
};

const denteTelegramAppointmentCallbackActions: Record<
	string,
	DenteTelegramAppointmentCallbackAction
> = {
	c: "confirm",
	r: "reschedule",
	p: "call_request",
};

function denteTelegramCallbackSecret(): string | null {
	return (
		process.env.DENTE_TELEGRAM_CALLBACK_SECRET?.trim() ||
		process.env.DENTE_TELEGRAM_WEBHOOK_SECRET?.trim() ||
		null
	);
}

export function denteTelegramAppointmentCallbacksReady(): boolean {
	return Boolean(denteTelegramCallbackSecret());
}

export function normalizeDenteTelegramAppointmentCallbackScope(
	scope: DenteTelegramAppointmentCallbackScope | undefined,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): { organizationId: string; clinicId: string; botConfigId: string } {
	const organizationId =
		scope?.organizationId?.trim() ||
		settings.organizationId ||
		denteTelegramBotSettings.organizationId;
	const clinicId = scope?.clinicId?.trim() || organizationId;
	const settingsBotUsername = safeTelegramBotUsername(
		settings.mode === "clinic_owned_bot"
			? settings.ownBotUsername
			: settings.botUsername,
	);
	const botConfigId =
		scope?.botConfigId?.trim() ||
		denteTelegramBotConfigIdForSettings(settings, settingsBotUsername);
	return { organizationId, clinicId, botConfigId };
}

function denteTelegramAppointmentCallbackSignature(
	action: DenteTelegramAppointmentCallbackAction,
	appointmentId: string,
	expiresAtSecondsBase36: string,
	scope: DenteTelegramAppointmentCallbackScope | undefined,
): string {
	const secret = denteTelegramCallbackSecret();
	if (!secret) {
		throw new Error(
			"Подписанные Telegram-кнопки приема отключены: включите секрет подписанных кнопок в серверных настройках.",
		);
	}
	const scoped = normalizeDenteTelegramAppointmentCallbackScope(scope);
	return createHmac("sha256", secret)
		.update(
			`${scoped.organizationId}:${scoped.clinicId}:${scoped.botConfigId}:${appointmentId}:${action}:${expiresAtSecondsBase36}`,
		)
		.digest("base64url")
		.slice(0, 10);
}

function denteTelegramSignatureEqual(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	return (
		leftBuffer.length === rightBuffer.length &&
		timingSafeEqual(leftBuffer, rightBuffer)
	);
}

function appointmentCallbackExpiryBase36(
	appointmentId: string | null | undefined,
): string {
	const appointment = appointmentId
		? (appointments.find((candidate) => candidate.id === appointmentId) ?? null)
		: null;
	const startsAtMs = appointment ? Date.parse(appointment.startsAt) : NaN;
	const fallbackMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
	return Math.floor(
		(Number.isFinite(startsAtMs) ? startsAtMs : fallbackMs) / 1000,
	).toString(36);
}

export function buildDenteTelegramAppointmentCallbackData(
	action: DenteTelegramAppointmentCallbackAction,
	appointmentId: string,
	scope?: DenteTelegramAppointmentCallbackScope,
): string {
	if (!denteTelegramAppointmentCallbacksReady()) {
		throw new Error(
			"Подписанные Telegram-кнопки приема отключены: включите секрет подписанных кнопок в серверных настройках.",
		);
	}
	const actionCode = denteTelegramAppointmentCallbackCodes[action];
	const compactAppointmentId = appointmentId.replace(/-/g, "").toLowerCase();
	const expiresAtSecondsBase36 = appointmentCallbackExpiryBase36(appointmentId);
	return `d1.${actionCode}.${compactAppointmentId}.${expiresAtSecondsBase36}.${denteTelegramAppointmentCallbackSignature(
		action,
		appointmentId,
		expiresAtSecondsBase36,
		scope,
	)}`;
}

function dashedUuidFromCompact(value: string): string | null {
	const normalized = value.toLowerCase();
	if (!/^[0-9a-f]{32}$/.test(normalized)) return null;
	return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(
		16,
		20,
	)}-${normalized.slice(20)}`;
}

function parseDenteTelegramAppointmentCallbackData(
	callbackData: string | null | undefined,
	scope: DenteTelegramAppointmentCallbackScope,
): {
	action: DenteTelegramAppointmentCallbackAction;
	appointmentId: string;
	expiresAtSeconds: number;
} | null {
	const match = callbackData?.match(
		/^d1\.([crp])\.([0-9a-f]{32})\.([0-9a-z]{1,8})\.([A-Za-z0-9_-]{10})$/,
	);
	if (!match) return null;
	const action = denteTelegramAppointmentCallbackActions[match[1] ?? ""];
	const appointmentId = dashedUuidFromCompact(match[2] ?? "");
	const expiresAtSeconds = Number.parseInt(match[3] ?? "", 36);
	const signature = match[4] ?? "";
	if (!action || !appointmentId || !Number.isFinite(expiresAtSeconds))
		return null;
	if (!denteTelegramAppointmentCallbacksReady()) return null;
	const expectedSignature = denteTelegramAppointmentCallbackSignature(
		action,
		appointmentId,
		match[3] ?? "",
		scope,
	);
	if (!denteTelegramSignatureEqual(signature, expectedSignature)) return null;
	return { action, appointmentId, expiresAtSeconds };
}

function appointmentCallbackActionLabel(
	action: DenteTelegramAppointmentCallbackAction,
): string {
	if (action === "confirm") return "подтверждение приема";
	if (action === "reschedule") return "запрос переноса приема";
	return "просьба перезвонить";
}

export function appointmentStatusLabelForTelegram(status: AppointmentStatus): string {
	const labels: Record<AppointmentStatus, string> = {
		planned: "запланирован",
		confirmed: "подтвержден",
		arrived: "пациент прибыл",
		in_treatment: "идет прием",
		completed: "завершен",
		cancelled: "отменен",
		no_show: "неявка",
	};
	return labels[status];
}

function appointmentCallbackStatusAllowed(
	action: DenteTelegramAppointmentCallbackAction,
	status: AppointmentStatus,
): boolean {
	if (action === "confirm") return status === "planned";
	return status === "planned" || status === "confirmed";
}

function findExistingTelegramCallbackTask(
	appointment: Appointment,
	action: Exclude<DenteTelegramAppointmentCallbackAction, "confirm">,
): CommunicationTask | null {
	const title =
		action === "reschedule"
			? "Пациент просит перенести прием"
			: "Пациент просит перезвонить";
	const workflowCode =
		action === "reschedule"
			? "telegram_appointment_reschedule_request"
			: "telegram_appointment_call_request";
	return (
		communicationTasks.find(
			(task) =>
				task.organizationId === appointment.organizationId &&
				task.appointmentId === appointment.id &&
				task.patientId === appointment.patientId &&
				(task.workflowCode === workflowCode ||
					(!task.workflowCode && task.title === title)) &&
				task.status === "needs_call",
		) ?? null
	);
}

function ensureTelegramCallbackCommunicationTask(input: {
	appointment: Appointment;
	action: Exclude<DenteTelegramAppointmentCallbackAction, "confirm">;
	now: string;
}): CommunicationTask {
	const existing = findExistingTelegramCallbackTask(
		input.appointment,
		input.action,
	);
	if (existing) {
		existing.lastEventAt = input.now;
		existing.dueAt = input.now;
		return existing;
	}
	const task: CommunicationTask = {
		id: randomUUID(),
		organizationId: input.appointment.organizationId,
		patientId: input.appointment.patientId ?? marinaPatientId,
		appointmentId: input.appointment.id,
		visitId: null,
		documentId: null,
		assignedRole: "administrator",
		channel: "phone",
		intent:
			input.action === "reschedule" ? "appointment_confirmation" : "general",
		status: "needs_call",
		priority: input.action === "reschedule" ? "high" : "normal",
		dueAt: input.now,
		title:
			input.action === "reschedule"
				? "Пациент просит перенести прием"
				: "Пациент просит перезвонить",
		body:
			input.action === "reschedule"
				? "Пациент нажал кнопку переноса в Telegram. Свяжитесь с пациентом и предложите новое время без передачи медданных в Telegram."
				: "Пациент нажал кнопку обратного звонка в Telegram. Свяжитесь с пациентом через канал клиники.",
		workflowCode:
			input.action === "reschedule"
				? "telegram_appointment_reschedule_request"
				: "telegram_appointment_call_request",
		lastEventAt: input.now,
		createdAt: input.now,
	};
	communicationTasks.unshift(task);
	communicationTasks.splice(300);
	return task;
}

export function handleDenteTelegramAppointmentCallback(input: {
	callbackData: string | null | undefined;
	chatFingerprint: string | null;
	organizationId?: string | null;
	clinicId?: string | null;
	botConfigId?: string | null;
	state?: DomainState;
}): {
	handled: boolean;
	ok: boolean;
	action: string;
	appointmentId: string | null;
	taskId: string | null;
	eventId: string | null;
	suggestedReply: string | null;
	callbackAnswerText: string;
	warnings: string[];
} {
	if (!input.callbackData?.startsWith("d1.")) {
		return {
			handled: false,
			ok: false,
			action: "not_appointment_callback",
			appointmentId: null,
			taskId: null,
			eventId: null,
			suggestedReply: null,
			callbackAnswerText: "DENTE",
			warnings: [],
		};
	}
	const organizationId =
		input.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const clinicId = input.clinicId?.trim() || organizationId;
	const botConfigId =
		input.botConfigId?.trim() || configuredTelegramBotConfigId();
	const callbackScope = { organizationId, clinicId, botConfigId };
	const parsed = parseDenteTelegramAppointmentCallbackData(
		input.callbackData,
		callbackScope,
	);
	if (!parsed) {
		return {
			handled: true,
			ok: false,
			action: "telegram_callback_rejected",
			appointmentId: null,
			taskId: null,
			eventId: null,
			suggestedReply:
				"Кнопка устарела или повреждена. Откройте последнее сообщение от клиники или свяжитесь с администратором.",
			callbackAnswerText: "Кнопка DENTE не принята",
			warnings: ["Подпись Telegram-кнопки приема недействительна."],
		};
	}
	const targetAppointments = input.state?.appointments ?? appointments;
	const appointment = targetAppointments.find(
		(candidate) =>
			candidate.id === parsed.appointmentId &&
			candidate.organizationId === organizationId,
	);
	if (!appointment?.patientId) {
		return {
			handled: true,
			ok: false,
			action: "telegram_callback_rejected",
			appointmentId: parsed.appointmentId,
			taskId: null,
			eventId: null,
			suggestedReply:
				"Запись не найдена или уже недоступна. Свяжитесь с клиникой.",
			callbackAnswerText: "Запись не найдена",
			warnings: ["Telegram-кнопка ссылается на несуществующую запись."],
		};
	}
	if (parsed.expiresAtSeconds * 1000 <= Date.now()) {
		return {
			handled: true,
			ok: false,
			action: "telegram_callback_rejected",
			appointmentId: appointment.id,
			taskId: null,
			eventId: null,
			suggestedReply:
				"Запись уже прошла или кнопка устарела. Свяжитесь с клиникой для уточнения.",
			callbackAnswerText: "Кнопка устарела",
			warnings: ["Telegram-кнопка приема устарела."],
		};
	}
	const chatLink = denteTelegramChatLinks.find(
		(link) =>
			link.organizationId === organizationId &&
			link.botConfigId === botConfigId &&
			link.subjectType === "patient" &&
			link.subjectId === appointment.patientId &&
			link.chatFingerprint === input.chatFingerprint &&
			link.status === "active",
	);
	if (!chatLink) {
		return {
			handled: true,
			ok: false,
			action: "telegram_callback_rejected",
			appointmentId: appointment.id,
			taskId: null,
			eventId: null,
			suggestedReply:
				"Сначала привяжите этот Telegram-чат к пациенту через одноразовый код клиники.",
			callbackAnswerText: "Чат не привязан",
			warnings: [
				"Telegram-кнопка приема нажата из чата без активной привязки пациента.",
			],
		};
	}
	if (!appointmentCallbackStatusAllowed(parsed.action, appointment.status)) {
		return {
			handled: true,
			ok: false,
			action: "telegram_callback_rejected",
			appointmentId: appointment.id,
			taskId: null,
			eventId: null,
			suggestedReply: `Запись сейчас в статусе '${appointmentStatusLabelForTelegram(
				appointment.status,
			)}'. Кнопка не применена. Свяжитесь с клиникой для уточнения.`,
			callbackAnswerText: "Кнопка уже неактуальна",
			warnings: [
				`Telegram-кнопка приема отклонена из-за статуса записи: ${appointment.status}.`,
			],
		};
	}

	const now = new Date().toISOString();
	let task: CommunicationTask | null = null;
	if (parsed.action === "confirm") {
		if (appointment.status === "planned") {
			appointment.status = "confirmed";
		}
	} else {
		task = ensureTelegramCallbackCommunicationTask({
			appointment,
			action: parsed.action,
			now,
		});
	}

	const event: CommunicationEvent = {
		id: randomUUID(),
		organizationId: appointment.organizationId,
		taskId: task?.id ?? null,
		patientId: appointment.patientId,
		actorUserId: null,
		channel: "telegram",
		direction: "inbound",
		status: parsed.action === "confirm" ? "completed" : "needs_call",
		message: `Telegram: ${appointmentCallbackActionLabel(parsed.action)}.`,
		createdAt: now,
	};
	communicationEvents.unshift(event);
	communicationEvents.splice(500);
	recordAuditEvent({
		entityType: "appointment",
		entityId: appointment.id,
		action:
			parsed.action === "confirm"
				? "telegram_appointment_confirmed"
				: parsed.action === "reschedule"
					? "telegram_appointment_reschedule_requested"
					: "telegram_callback_requested",
		reason:
			parsed.action === "confirm"
				? "Пациент подтвердил прием через подписанную Telegram-кнопку DENTE."
				: `Пациент отправил через Telegram действие: ${appointmentCallbackActionLabel(parsed.action)}.`,
	});
	persistMutableState();

	if (parsed.action === "confirm") {
		return {
			handled: true,
			ok: true,
			action: "telegram_appointment_confirmed",
			appointmentId: appointment.id,
			taskId: null,
			eventId: event.id,
			suggestedReply:
				"Прием подтвержден. Если планы изменятся, свяжитесь с клиникой.",
			callbackAnswerText: "Прием подтвержден",
			warnings: [],
		};
	}
	if (parsed.action === "reschedule") {
		return {
			handled: true,
			ok: true,
			action: "telegram_appointment_reschedule_requested",
			appointmentId: appointment.id,
			taskId: task?.id ?? null,
			eventId: event.id,
			suggestedReply:
				"Запрос на перенос принят. Администратор клиники свяжется с вами и предложит новое время.",
			callbackAnswerText: "Запрос на перенос принят",
			warnings: [],
		};
	}
	return {
		handled: true,
		ok: true,
		action: "telegram_callback_requested",
		appointmentId: appointment.id,
		taskId: task?.id ?? null,
		eventId: event.id,
		suggestedReply: "Запрос звонка принят. Клиника свяжется с вами.",
		callbackAnswerText: "Запрос звонка принят",
		warnings: [],
	};
}

export function telegramFeatureForTemplate(templateKind: DenteTelegramTemplateKind) {
	const map: Partial<
		Record<
			DenteTelegramTemplateKind,
			DenteTelegramBotSettings["enabledFeatures"][number]
		>
	> = {
		appointment_reminder: "appointment_reminders",
		appointment_confirmation: "appointment_confirmation",
		payment_reminder_notice: "payment_reminders",
		document_ready_notice: "document_ready_notice",
		tax_document_request_status: "tax_document_request",
		callback_request_received: "callback_requests",
		post_visit_instruction_link: "post_visit_instructions",
		post_visit_checkup: "post_visit_instructions",
		recall_notice: "recalls",
		review_request: "review_requests",
		staff_daily_digest: "staff_daily_digest",
	};
	return map[templateKind] ?? null;
}

export function activeTelegramChatLinkFor(
	subjectType: "patient" | "staff",
	subjectId: string,
	organizationScope = denteTelegramBotSettings.organizationId,
	botConfigId = configuredTelegramBotConfigId(),
): DenteTelegramChatLink | null {
	return (
		denteTelegramChatLinks.find(
			(link) =>
				link.organizationId === organizationScope &&
				link.botConfigId === botConfigId &&
				link.subjectType === subjectType &&
				link.subjectId === subjectId &&
				link.status === "active",
		) ?? null
	);
}

export const telegramScheduleVisibleStatuses = new Set<AppointmentStatus>([
	"planned",
	"confirmed",
	"arrived",
	"in_treatment",
]);

export function activeTelegramChatLinkByFingerprint(
	chatFingerprintValue: string | null,
	scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
	} = {},
): DenteTelegramChatLink | null {
	if (!chatFingerprintValue) return null;
	const organizationId =
		scope.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const currentClinicId =
		scope.clinicId?.trim() || clinicProfile.organizationId;
	const botConfigId =
		scope.botConfigId?.trim() || configuredTelegramBotConfigId();
	return (
		denteTelegramChatLinks.find(
			(link) =>
				link.organizationId === organizationId &&
				link.botConfigId === botConfigId &&
				(link.clinicId === currentClinicId || link.clinicId === null) &&
				link.chatFingerprint === chatFingerprintValue &&
				link.status === "active",
		) ?? null
	);
}

