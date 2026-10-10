/**
 * documentAndCareRequests.ts
 *
 * Inbound document requests and post-visit care requests handling.
 */

import { randomUUID } from "node:crypto";
import type {
	CommunicationEvent,
	CommunicationTask,
	DenteTelegramChatLink,
	GeneratedDocument,
	PostVisitCareTopic,
} from "@dental/shared";
import type { DomainState } from "../../../types/domainState.js";
import type {
	DenteTelegramCareRequestTopic,
	DenteTelegramDocumentRequestTopic,
} from "./types.js";
import {
	denteTelegramChatLinks,
	inMemoryCommunicationEvents,
	inMemoryCommunicationTasks,
	inMemoryDomainState,
	isOpenCommunicationTask,
	persistMutableState,
	recordAuditEvent,
	organizationId,
	doctorUserId,
	communicationTasks,
	communicationEvents,
	documents,
	patients,
} from "./storeState.js";
import {
	getDenteTelegramBotSettings,
} from "./botSettings.js";
import {
	activeTelegramChatLinkFor,
	activeTelegramChatLinkByFingerprint,
} from "./appointmentCallbacks.js";


const denteTelegramDocumentRequestTopics: Record<
	DenteTelegramDocumentRequestTopic,
	{
		workflowCode: NonNullable<CommunicationTask["workflowCode"]>;
		taskTitle: string;
		taskBody: string;
		inboundCreatedMessage: string;
		inboundRepeatedMessage: string;
		responseCreatedText: string;
		responseRepeatedText: string;
		priority: CommunicationTask["priority"];
		auditCreatedAction: string;
		auditRepeatedAction: string;
	}
> = {
	tax: {
		workflowCode: "telegram_tax_document_request",
		taskTitle: "Пациент запросил налоговые документы",
		taskBody:
			"Пациент запросил налоговые документы в Telegram. В DENTE проверьте плательщика, фискальные чеки, периоды 2021-2023 и данные для КНД 1151156. Готовые PDF выдавайте только через защищенный портал.",
		inboundCreatedMessage: "Telegram: пациент запросил налоговые документы.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил налоговые документы.",
		responseCreatedText:
			"Запрос передан администратору DENTE. Клиника проверит платежи, плательщика и подготовит налоговые документы в защищенном портале.",
		responseRepeatedText:
			"Запрос на налоговые документы уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу для администратора.",
		priority: "high",
		auditCreatedAction: "telegram_tax_document_request_created",
		auditRepeatedAction: "telegram_tax_document_request_repeated",
	},
	billing: {
		workflowCode: "telegram_billing_document_request",
		taskTitle: "Пациент запросил финансовые документы",
		taskBody:
			"Пациент запросил финансовые документы в Telegram. В DENTE проверьте счет, чек, акт, возврат, рассрочку или историю оплат. Документы и суммы выдавайте только через защищенный портал.",
		inboundCreatedMessage: "Telegram: пациент запросил финансовые документы.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил финансовые документы.",
		responseCreatedText:
			"Запрос передан администратору DENTE. Клиника проверит счета, чеки, акты или возвраты и откроет документы в защищенном портале.",
		responseRepeatedText:
			"Запрос на финансовые документы уже есть в очереди DENTE. Мы обновили время обращения для администратора.",
		priority: "normal",
		auditCreatedAction: "telegram_billing_document_request_created",
		auditRepeatedAction: "telegram_billing_document_request_repeated",
	},
	medical: {
		workflowCode: "telegram_medical_document_request",
		taskTitle: "Пациент запросил медицинские документы",
		taskBody:
			"Пациент запросил медицинские документы в Telegram. В DENTE проверьте личность, полномочия получателя и подготовьте выписку, копии, расписку выдачи или КТ/снимки без передачи медданных в Telegram.",
		inboundCreatedMessage: "Telegram: пациент запросил медицинские документы.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил медицинские документы.",
		responseCreatedText:
			"Запрос передан администратору DENTE. Медицинские документы подготовят после проверки личности и выдадут через защищенный портал.",
		responseRepeatedText:
			"Запрос на медицинские документы уже есть в очереди DENTE. Мы обновили время обращения для администратора.",
		priority: "normal",
		auditCreatedAction: "telegram_medical_document_request_created",
		auditRepeatedAction: "telegram_medical_document_request_repeated",
	},
	patientForms: {
		workflowCode: "telegram_patient_forms_request",
		taskTitle: "Пациент запросил формы и согласия",
		taskBody:
			"Пациент запросил формы пациента в Telegram. В DENTE подготовьте анкету, согласия, ПДн, представителя, отказ или фото/видео-согласие по ситуации следующего визита.",
		inboundCreatedMessage: "Telegram: пациент запросил формы и согласия.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил формы и согласия.",
		responseCreatedText:
			"Запрос передан администратору DENTE. Формы, согласия и анкеты подготовят в приложении и откроют в защищенном портале.",
		responseRepeatedText:
			"Запрос на формы уже есть в очереди DENTE. Мы обновили время обращения для администратора.",
		priority: "normal",
		auditCreatedAction: "telegram_patient_forms_request_created",
		auditRepeatedAction: "telegram_patient_forms_request_repeated",
	},
};

function findExistingTelegramDocumentRequestTask(
	organizationScope: string,
	patientId: string,
	topic: DenteTelegramDocumentRequestTopic,
): CommunicationTask | null {
	const requestTopic = denteTelegramDocumentRequestTopics[topic];
	return (
		communicationTasks.find(
			(task) =>
				task.organizationId === organizationScope &&
				task.patientId === patientId &&
				task.appointmentId === null &&
				task.documentId === null &&
				(task.workflowCode === requestTopic.workflowCode ||
					(!task.workflowCode && task.title === requestTopic.taskTitle)) &&
				isOpenCommunicationTask(task),
		) ?? null
	);
}

export function createDenteTelegramDocumentRequest(
	chatFingerprintValue: string | null,
	topic: DenteTelegramDocumentRequestTopic,
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
			text: "DENTE: запрос документов доступен после привязки Telegram. Откройте DENTE в клинике и отправьте одноразовый код в этот личный чат.",
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
			text: "DENTE: вы подключены как сотрудник клиники. Запросы документов от пациентов доступны в рабочем приложении DENTE.",
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

	const requestTopic = denteTelegramDocumentRequestTopics[topic];
	const now = new Date().toISOString();
	let duplicate = true;
	let task = findExistingTelegramDocumentRequestTask(
		organizationScope,
		patient.id,
		topic,
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
			priority: requestTopic.priority,
			dueAt: now,
			title: requestTopic.taskTitle,
			body: requestTopic.taskBody,
			workflowCode: requestTopic.workflowCode,
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
			? requestTopic.inboundRepeatedMessage
			: requestTopic.inboundCreatedMessage,
		createdAt: now,
	};
	communicationEvents.unshift(event);
	communicationEvents.splice(500);
	recordAuditEvent({
		organizationId: organizationScope,
		entityType: "patient",
		entityId: patient.id,
		action: duplicate
			? requestTopic.auditRepeatedAction
			: requestTopic.auditCreatedAction,
		reason: duplicate
			? "Пациент повторно отправил запрос документов в Telegram."
			: "Пациент отправил запрос документов в Telegram.",
	});
	persistMutableState();

	return {
		text: duplicate
			? requestTopic.responseRepeatedText
			: requestTopic.responseCreatedText,
		linked: true,
		subjectType: "patient",
		taskId: task.id,
		eventId: event.id,
		duplicate,
		blockedReason: null,
	};
}

export { createDenteTelegramCareRequest } from "./postVisitCareRequests.js";


