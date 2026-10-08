/**
 * scheduleAndContactRequests.ts
 *
 * Linked schedule replies and contact request creation.
 */

import { randomUUID } from "node:crypto";
import type {
	Appointment,
	AppointmentStatus,
	CommunicationEvent,
	CommunicationTask,
	DenteTelegramBotSettings,
	DenteTelegramChatLink,
	StaffMember,
	StaffRole,
} from "@dental/shared";
import type { DomainState } from "../../../types/domainState.js";
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
	appointments,
	patients,
	communicationTasks,
	communicationEvents,
} from "./storeState.js";
import {
	denteTelegramBotSettings,
	getDenteTelegramBotSettings,
} from "./botSettings.js";
import {
	activeTelegramChatLinkFor,
	activeTelegramChatLinkByFingerprint,
	telegramScheduleVisibleStatuses,
	appointmentStatusLabelForTelegram,
} from "./appointmentCallbacks.js";
import {
	telegramAppointmentTimeLabel,
} from "./messageRenderer.js";
import {
	telegramReplyMarkupFor,
	telegramScheduleReplyMarkupForPatientAppointment,
} from "./replyMarkups.js";

function telegramScheduleLine(
	index: number,
	appointment: Appointment,
	roleLabel: string | null = null,
): string {
	const prefix = `${index + 1}. ${telegramAppointmentTimeLabel(appointment)}`;
	const role = roleLabel ? `, роль: ${roleLabel}` : "";
	return `${prefix}${role}, статус: ${appointmentStatusLabelForTelegram(appointment.status)}.`;
}

function telegramScheduleRoleForStaff(
	appointment: Appointment,
	staffId: string,
): string | null {
	const isDoctor = appointment.doctorUserId === staffId;
	const isAssistant = appointment.assistantUserId === staffId;
	if (isDoctor && isAssistant) return "врач и ассистент";
	if (isDoctor) return "врач";
	if (isAssistant) return "ассистент";
	return null;
}

function visibleTelegramScheduleAppointments(
	organizationScope = denteTelegramBotSettings.organizationId,
	sourceAppointments: readonly Appointment[] = appointments,
): Appointment[] {
	const nowMs = Date.now();
	const graceMs = 15 * 60 * 1000;
	return (sourceAppointments as Appointment[])
		.filter((appointment) => {
			const endsAtMs = Date.parse(appointment.endsAt);
			return (
				appointment.organizationId === organizationScope &&
				telegramScheduleVisibleStatuses.has(appointment.status) &&
				Number.isFinite(endsAtMs) &&
				endsAtMs >= nowMs - graceMs
			);
		})
		.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

export function buildDenteTelegramLinkedScheduleReply(
	chatFingerprintValue: string | null,
	scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
		state?: DomainState;
		appointments?: readonly Appointment[] | null;
	} = {},
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): {
	text: string;
	linked: boolean;
	subjectType: "patient" | "staff" | null;
	appointmentCount: number;
	blockedReason: string | null;
	replyMarkup: Record<string, unknown> | null;
} {
	const chatLink = activeTelegramChatLinkByFingerprint(
		chatFingerprintValue,
		scope,
	);
	if (!chatLink) {
		return {
			text: "DENTE: расписание доступно только после привязки Telegram. Откройте DENTE в клинике и отправьте одноразовый код в этот личный чат.",
			linked: false,
			subjectType: null,
			appointmentCount: 0,
			blockedReason: "telegram_chat_not_linked",
			replyMarkup: null,
		};
	}

	const appointmentList =
		scope.state?.appointments ?? scope.appointments ?? appointments;
	const visibleAppointments = visibleTelegramScheduleAppointments(
		scope.organizationId?.trim() || denteTelegramBotSettings.organizationId,
		appointmentList,
	);
	const linkedAppointments =
		chatLink.subjectType === "patient"
			? visibleAppointments
					.filter((appointment) => appointment.patientId === chatLink.subjectId)
					.slice(0, 3)
			: visibleAppointments
					.filter((appointment) =>
						Boolean(
							telegramScheduleRoleForStaff(appointment, chatLink.subjectId),
						),
					)
					.slice(0, 5);

	if (!linkedAppointments.length) {
		return {
			text: "DENTE: активных записей сейчас нет. Для деталей откройте защищенный портал или свяжитесь с администратором клиники.",
			linked: true,
			subjectType: chatLink.subjectType,
			appointmentCount: 0,
			blockedReason: null,
			replyMarkup:
				chatLink.subjectType === "staff"
					? telegramReplyMarkupFor("staff_daily_digest", null, settings, scope)
					: null,
		};
	}

	if (chatLink.subjectType === "patient") {
		const nearestAppointment = linkedAppointments[0] ?? null;
		return {
			text: [
				"DENTE: ближайшие записи в клинике:",
				...linkedAppointments.map((appointment, index) =>
					telegramScheduleLine(index, appointment),
				),
				"",
				"Подробности, документы и оплата доступны только в DENTE.",
			].join("\n"),
			linked: true,
			subjectType: "patient",
			appointmentCount: linkedAppointments.length,
			blockedReason: null,
			replyMarkup: nearestAppointment
				? telegramScheduleReplyMarkupForPatientAppointment(
						nearestAppointment.id,
						scope,
					)
				: null,
		};
	}

	return {
		text: [
			"DENTE: ваше расписание в клинике:",
			...linkedAppointments.map((appointment, index) =>
				telegramScheduleLine(
					index,
					appointment,
					telegramScheduleRoleForStaff(appointment, chatLink.subjectId),
				),
			),
			"",
			"ФИО пациентов и детали приема доступны только в DENTE.",
		].join("\n"),
		linked: true,
		subjectType: "staff",
		appointmentCount: linkedAppointments.length,
		blockedReason: null,
		replyMarkup: telegramReplyMarkupFor(
			"staff_daily_digest",
			null,
			settings,
			scope,
		),
	};
}

function findExistingTelegramContactRequestTask(
	organizationScope: string,
	patientId: string,
): CommunicationTask | null {
	return (
		communicationTasks.find(
			(task) =>
				task.organizationId === organizationScope &&
				task.patientId === patientId &&
				task.appointmentId === null &&
				task.documentId === null &&
				(task.workflowCode === "telegram_contact_request" ||
					(!task.workflowCode && task.title === "Пациент просит связаться")) &&
				isOpenCommunicationTask(task),
		) ?? null
	);
}

export function createDenteTelegramContactRequest(
	chatFingerprintValue: string | null,
	scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
	} = {},
): {
	text: string;
	linked: boolean;
	subjectType: "patient" | "staff" | null;
	taskId: string | null;
	eventId: string | null;
	duplicate: boolean;
	blockedReason: string | null;
} {
	const chatLink = activeTelegramChatLinkByFingerprint(
		chatFingerprintValue,
		scope,
	);
	if (!chatLink) {
		return {
			text: "DENTE: запрос связи доступен после привязки Telegram. Откройте DENTE в клинике и отправьте одноразовый код в этот личный чат.",
			linked: false,
			subjectType: null,
			taskId: null,
			eventId: null,
			duplicate: false,
			blockedReason: "telegram_chat_not_linked",
		};
	}

	if (chatLink.subjectType !== "patient") {
		return {
			text: "DENTE: вы подключены как сотрудник клиники. Запросы пациентов и очередь администратора доступны в рабочем приложении DENTE.",
			linked: true,
			subjectType: "staff",
			taskId: null,
			eventId: null,
			duplicate: false,
			blockedReason: "staff_chat_no_patient_task",
		};
	}

	const organizationScope = chatLink.organizationId;
	const patient = patients.find(
		(candidate) =>
			candidate.organizationId === organizationScope &&
			candidate.id === chatLink.subjectId,
	);
	if (!patient) {
		return {
			text: "DENTE: привязка Telegram найдена, но пациент недоступен. Попросите администратора клиники обновить привязку.",
			linked: false,
			subjectType: "patient",
			taskId: null,
			eventId: null,
			duplicate: false,
			blockedReason: "telegram_patient_not_found",
		};
	}

	const now = new Date().toISOString();
	let duplicate = true;
	let task = findExistingTelegramContactRequestTask(
		organizationScope,
		patient.id,
	);
	if (task) {
		task.dueAt = now;
		task.lastEventAt = now;
	} else {
		duplicate = false;
		task = {
			id: randomUUID(),
			organizationId: organizationScope,
			patientId: patient.id,
			appointmentId: null,
			visitId: null,
			documentId: null,
			assignedRole: "administrator",
			channel: "phone",
			intent: "general",
			status: "needs_call",
			priority: "normal",
			dueAt: now,
			title: "Пациент просит связаться",
			body: "Пациент нажал кнопку связи в Telegram. Свяжитесь через канал клиники, не передавайте медданные в Telegram.",
			workflowCode: "telegram_contact_request",
			lastEventAt: now,
			createdAt: now,
		};
		communicationTasks.unshift(task);
		communicationTasks.splice(300);
	}

	const event: CommunicationEvent = {
		id: randomUUID(),
		organizationId: organizationScope,
		taskId: task.id,
		patientId: patient.id,
		actorUserId: null,
		channel: "telegram",
		direction: "inbound",
		status: "needs_call",
		message: duplicate
			? "Telegram: пациент повторно нажал кнопку связи."
			: "Telegram: пациент просит связаться с администратором.",
		createdAt: now,
	};
	communicationEvents.unshift(event);
	communicationEvents.splice(500);
	recordAuditEvent({
		organizationId: organizationScope,
		entityType: "patient",
		entityId: patient.id,
		action: duplicate
			? "telegram_contact_request_repeated"
			: "telegram_contact_request_created",
		reason: duplicate
			? "Пациент повторно нажал кнопку связи в Telegram."
			: "Пациент нажал кнопку связи в Telegram.",
	});
	persistMutableState();

	return {
		text: duplicate
			? "Запрос уже есть в очереди администратора DENTE. Мы подняли его наверх и обновили время обращения."
			: "Запрос принят. Администратор клиники увидит задачу в DENTE и свяжется с вами через канал клиники.",
		linked: true,
		subjectType: "patient",
		taskId: task.id,
		eventId: event.id,
		duplicate,
		blockedReason: null,
	};
}

