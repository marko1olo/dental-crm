/**
 * @file communications.ts
 * @description Layer 2: Communication templates, tasks, events, summary, completion.
 */
import { randomUUID } from "node:crypto";
import { inMemoryDomainState } from "./domainState.js";
import { recordAuditEvent } from "./audit.js";


import type {
	CommunicationEvent,
	CommunicationSummary,
	CommunicationTask,
	CommunicationTaskOutcome,
	CommunicationTemplate,
	CompleteCommunicationTaskInput,
} from "@dental/shared";
import { persistMutableState } from "./stateNotifier.js";
import { organizationId, marinaPatientId, alexeyPatientId, elmiraPatientId, activeAppointmentId, activeVisitId, nowIso, doctorUserId } from "./fixtureIds.js";

const communicationTemplates: CommunicationTemplate[] = [
	{
		id: "tpl-appointment-confirm",
		organizationId,
		title: "Подтверждение приема",
		channel: "whatsapp",
		intent: "appointment_confirmation",
		audienceRole: "administrator",
		body: "Здравствуйте, {patient}. Подтвердите, пожалуйста, прием {date} в {time}.",
		variables: ["patient", "date", "time"],
		active: true,
	},
	{
		id: "tpl-payment-reminder",
		organizationId,
		title: "Напоминание об оплате",
		channel: "sms",
		intent: "payment_reminder",
		audienceRole: "administrator",
		body: "{patient}, остаток по лечению составляет {amount}. Администратор клиники поможет закрыть оплату и документы.",
		variables: ["patient", "amount"],
		active: true,
	},
	{
		id: "tpl-post-visit",
		organizationId,
		title: "DENTE: ссылка на памятку после приема",
		channel: "telegram",
		intent: "post_visit_instruction",
		audienceRole: "assistant",
		body: "DENTE: памятка после приема готова в защищенном портале клиники. В Telegram не передаются диагнозы, план лечения и медицинские файлы.",
		variables: [],
		active: true,
	},
	{
		id: "tpl-recall",
		organizationId,
		title: "Повторный визит",
		channel: "phone",
		intent: "recall",
		audienceRole: "administrator",
		body: "Позвонить пациенту {patient} и согласовать контрольный визит.",
		variables: ["patient"],
		active: true,
	},
];

const communicationTasks: CommunicationTask[] = [
	{
		id: "7195a20f-0aa8-4f0a-8d33-8db69fbb3d91",
		organizationId,
		patientId: marinaPatientId,
		appointmentId: activeAppointmentId,
		visitId: activeVisitId,
		documentId: null,
		assignedRole: "assistant",
		channel: "telegram",
		intent: "post_visit_instruction",
		status: "queued",
		priority: "high",
		dueAt: "2026-05-12T10:20:00+04:00",
		title: "Отправить ссылку на памятку после приема",
		body: "Памятка после приема готова в защищенном портале клиники. Не включать диагноз, номера зубов, снимки и детали лечения в Telegram.",
		lastEventAt: null,
		createdAt: nowIso,
	},
	{
		id: "31ba633f-64e3-4a50-8a10-dc3d44f81a5a",
		organizationId,
		patientId: marinaPatientId,
		appointmentId: activeAppointmentId,
		visitId: activeVisitId,
		documentId: "f9d274b4-3730-4eaa-aeac-20bf5f2f1bc5",
		assignedRole: "administrator",
		channel: "sms",
		intent: "payment_reminder",
		status: "needs_call",
		priority: "urgent",
		dueAt: "2026-05-12T10:30:00+04:00",
		title: "Закрыть остаток оплаты и документы",
		body: "Связать оплату с договором/актом, затем подготовить пакет документов.",
		lastEventAt: null,
		createdAt: nowIso,
	},
	{
		id: "16f19699-5b11-45fa-a329-5c53567b7f28",
		organizationId,
		patientId: alexeyPatientId,
		appointmentId: "59d16574-5f6e-4cc7-9f49-2da2f126e11d",
		visitId: null,
		documentId: "b77b8720-7ffd-453a-9db4-54637ef292a7",
		assignedRole: "administrator",
		channel: "phone",
		intent: "document_ready",
		status: "scheduled",
		priority: "normal",
		dueAt: "2026-05-12T09:30:00+04:00",
		title: "Предупредить о справке для вычета",
		body: "После оплаты выдать справку КНД 1151156 и проверить ФИО/ИНН.",
		lastEventAt: null,
		createdAt: nowIso,
	},
	{
		id: "b896a902-665d-4b33-9851-53822a04c12a",
		organizationId,
		patientId: elmiraPatientId,
		appointmentId: "286c0899-f2cc-4e72-833d-a1e89036e319",
		visitId: null,
		documentId: null,
		assignedRole: "administrator",
		channel: "whatsapp",
		intent: "appointment_confirmation",
		status: "queued",
		priority: "normal",
		dueAt: "2026-05-12T08:30:00+04:00",
		title: "Подтвердить первичную консультацию",
		body: "Уточнить жалобу, предупредить взять паспорт и старые снимки.",
		lastEventAt: null,
		createdAt: nowIso,
	},
	{
		id: "d144ac6c-c570-4d0c-b6a6-dc0154130cd6",
		organizationId,
		patientId: marinaPatientId,
		appointmentId: activeAppointmentId,
		visitId: activeVisitId,
		documentId: null,
		assignedRole: "doctor",
		channel: "in_person",
		intent: "imaging_review",
		status: "needs_call",
		priority: "high",
		dueAt: "2026-05-12T09:45:00+04:00",
		title: "Обсудить ОПТГ контроль",
		body: "Пояснить пациенту, что AI-описание не является диагнозом, врач проверяет снимок.",
		lastEventAt: null,
		createdAt: nowIso,
	},
];

const communicationEvents: CommunicationEvent[] = [
	{
		id: "88ff10d9-e50a-4a67-8500-f1dfeff6b92c",
		organizationId,
		taskId: "b896a902-665d-4b33-9851-53822a04c12a",
		patientId: elmiraPatientId,
		actorUserId: "93bca14f-a11d-4088-9b48-cb7a0fd4c9ef",
		channel: "whatsapp",
		direction: "outbound",
		status: "sent",
		message: "Отправлено подтверждение первичной консультации.",
		createdAt: "2026-05-12T08:10:00+04:00",
	},
];


function isOpenCommunicationTask(task: CommunicationTask): boolean {
	return !["completed", "failed", "skipped"].includes(task.status);
}

function buildCommunicationSummary(
	state: DomainState = inMemoryDomainState,
): CommunicationSummary {
	const { communicationTasks } = state;
	const todayPrefix = "2026-05-12";
	const openTasks = communicationTasks.filter(isOpenCommunicationTask);

	return {
		openTasks: openTasks.length,
		urgentTasks: openTasks.filter((task) => task.priority === "urgent").length,
		dueToday: openTasks.filter((task) => task.dueAt.startsWith(todayPrefix))
			.length,
		overdue: openTasks.filter(
			(task) => task.dueAt < `${todayPrefix}T12:00:00+04:00`,
		).length,
		completedToday: communicationTasks.filter(
			(task) =>
				task.status === "completed" &&
				task.lastEventAt?.startsWith(todayPrefix),
		).length,
		appointmentConfirmations: openTasks.filter(
			(task) => task.intent === "appointment_confirmation",
		).length,
		paymentReminders: openTasks.filter(
			(task) => task.intent === "payment_reminder",
		).length,
		postVisitInstructions: openTasks.filter(
			(task) => task.intent === "post_visit_instruction",
		).length,
	};
}

const communicationTaskOutcomeLabels: Record<CommunicationTaskOutcome, string> =
	{
		no_answer: "нет ответа",
		callback_requested: "нужен обратный звонок",
		reschedule_requested: "нужен перенос записи",
		promised_payment: "пациент обещал оплату",
		document_pickup: "документы готовы к выдаче/получению",
	};

function _completeCommunicationTask(
	input: CompleteCommunicationTaskInput,
): CommunicationTask {
	const task = communicationTasks.find((item) => item.id === input.taskId);
	if (!task) {
		throw new Error("Задача коммуникации не найдена");
	}
	if (task.status === "completed") {
		return task;
	}
	const completedAt = new Date().toISOString();
	const outcomeLabel = input.outcome
		? communicationTaskOutcomeLabels[input.outcome]
		: null;
	const completionMessage = input.note ?? `Задача связи закрыта: ${task.title}`;
	const eventMessage = outcomeLabel
		? `Исход: ${outcomeLabel}. ${completionMessage}`
		: completionMessage;
	task.status = "completed";
	task.lastOutcome = input.outcome ?? null;
	task.lastEventAt = completedAt;
	communicationEvents.unshift({
		id: randomUUID(),
		organizationId,
		taskId: task.id,
		patientId: task.patientId,
		actorUserId: doctorUserId,
		channel: task.channel,
		direction: "outbound",
		status: "completed",
		message: eventMessage,
		createdAt: completedAt,
	});
	recordAuditEvent({
		entityType: "communication_task",
		entityId: task.id,
		action: "communication_completed",
		reason: outcomeLabel
			? `${outcomeLabel}: ${input.note ?? task.title}`
			: (input.note ?? task.title),
	});
	return task;
}


export { communicationTasks, communicationEvents, communicationTemplates, isOpenCommunicationTask, buildCommunicationSummary };
