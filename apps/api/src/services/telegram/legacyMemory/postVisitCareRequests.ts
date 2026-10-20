/**
 * postVisitCareRequests.ts
 *
 * Inbound post-visit care requests handling for Telegram.
 */

import { randomUUID } from "node:crypto";
import type {
	CommunicationEvent,
	CommunicationTask,
	GeneratedDocument,
	PostVisitCareTopic,
} from "@dental/shared";
import type { DenteTelegramCareRequestTopic } from "./types.js";
import {
	communicationEvents,
	communicationTasks,
	documents,
	isOpenCommunicationTask,
	patients,
	persistMutableState,
	recordAuditEvent,
} from "./storeState.js";
import { activeTelegramChatLinkByFingerprint } from "./appointmentCallbacks.js";

const denteTelegramCareRequestTopics: Record<
	DenteTelegramCareRequestTopic,
	{
		workflowCode: NonNullable<CommunicationTask["workflowCode"]>;
		careTopic: PostVisitCareTopic;
		taskTitle: string;
		taskBody: string;
		inboundCreatedMessage: string;
		inboundRepeatedMessage: string;
		responseCreatedText: string;
		responseRepeatedText: string;
		responseIssuedText: string;
		priority: CommunicationTask["priority"];
		auditCreatedAction: string;
		auditRepeatedAction: string;
		auditIssuedAction: string;
	}
> = {
	extraction: {
		workflowCode: "telegram_care_extraction_request",
		careTopic: "extraction",
		taskTitle: "Пациент запросил памятку после удаления",
		taskBody:
			"Пациент нажал кнопку памятки после удаления в Telegram. Врач должен проверить карту, назначение, осложнения и выдать персональные рекомендации DENTE перед отправкой ссылки пациенту.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после удаления.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после удаления.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит карту и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после удаления уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу врачу.",
		responseIssuedText:
			"Персональная памятка после удаления уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если состояние ухудшается.",
		priority: "high",
		auditCreatedAction: "telegram_care_extraction_request_created",
		auditRepeatedAction: "telegram_care_extraction_request_repeated",
		auditIssuedAction: "telegram_care_extraction_request_already_issued",
	},
	implant: {
		workflowCode: "telegram_care_implant_request",
		careTopic: "implantation",
		taskTitle: "Пациент запросил памятку после имплантации",
		taskBody:
			"Пациент нажал кнопку памятки после имплантации в Telegram. Врач должен проверить операцию, назначения, ограничения, контрольный визит и выдать персональные рекомендации DENTE перед отправкой ссылки пациенту.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после имплантации.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после имплантации.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит операцию, назначения и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после имплантации уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу врачу.",
		responseIssuedText:
			"Персональная памятка после имплантации уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если нужна связь с клиникой.",
		priority: "high",
		auditCreatedAction: "telegram_care_implant_request_created",
		auditRepeatedAction: "telegram_care_implant_request_repeated",
		auditIssuedAction: "telegram_care_implant_request_already_issued",
	},
	filling: {
		workflowCode: "telegram_care_filling_request",
		careTopic: "filling_restoration",
		taskTitle: "Пациент запросил памятку после пломбы",
		taskBody:
			"Пациент нажал кнопку памятки после пломбы в Telegram. Врач должен проверить карту, окклюзию, анестезию, ограничения и выдать персональные рекомендации DENTE перед отправкой ссылки пациенту.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после пломбы.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после пломбы.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит карту и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после пломбы уже есть в очереди DENTE. Мы обновили время обращения для врача.",
		responseIssuedText:
			"Персональная памятка после пломбы уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если нужна связь с клиникой.",
		priority: "normal",
		auditCreatedAction: "telegram_care_filling_request_created",
		auditRepeatedAction: "telegram_care_filling_request_repeated",
		auditIssuedAction: "telegram_care_filling_request_already_issued",
	},
	endo: {
		workflowCode: "telegram_care_endo_request",
		careTopic: "endo",
		taskTitle: "Пациент запросил памятку после эндодонтии",
		taskBody:
			"Пациент нажал кнопку памятки после лечения каналов в Telegram. Врач должен проверить зуб, этап эндодонтии, временную или постоянную реставрацию, назначения и контрольный визит перед отправкой персональных рекомендаций DENTE.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после эндодонтии.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после эндодонтии.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит лечение каналов, реставрацию и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после эндодонтии уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу врачу.",
		responseIssuedText:
			"Персональная памятка после эндодонтии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если боль усиливается.",
		priority: "high",
		auditCreatedAction: "telegram_care_endo_request_created",
		auditRepeatedAction: "telegram_care_endo_request_repeated",
		auditIssuedAction: "telegram_care_endo_request_already_issued",
	},
	surgery: {
		workflowCode: "telegram_care_surgery_request",
		careTopic: "surgery",
		taskTitle: "Пациент запросил памятку после хирургии",
		taskBody:
			"Пациент нажал кнопку памятки после хирургического вмешательства в Telegram. Врач должен проверить операцию, швы, гемостаз, назначения, ограничения и план контрольного осмотра перед отправкой персональных рекомендаций DENTE.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после хирургии.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после хирургии.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит операцию, назначения и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после хирургии уже есть в очереди DENTE. Мы обновили время обращения и подняли задачу врачу.",
		responseIssuedText:
			"Персональная памятка после хирургии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора при кровотечении, отеке или температуре.",
		priority: "high",
		auditCreatedAction: "telegram_care_surgery_request_created",
		auditRepeatedAction: "telegram_care_surgery_request_repeated",
		auditIssuedAction: "telegram_care_surgery_request_already_issued",
	},
	anesthesia: {
		workflowCode: "telegram_care_anesthesia_request",
		careTopic: "local_anesthesia",
		taskTitle: "Пациент запросил памятку после анестезии",
		taskBody:
			"Пациент нажал кнопку памятки после местной анестезии в Telegram. Врач должен проверить проведенный прием, препарат, ожидаемое онемение, ограничения по еде и признаки, при которых нужна связь с клиникой.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после анестезии.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после анестезии.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит прием, анестезию и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после анестезии уже есть в очереди DENTE. Мы обновили время обращения для врача.",
		responseIssuedText:
			"Персональная памятка после анестезии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если онемение или боль беспокоят.",
		priority: "normal",
		auditCreatedAction: "telegram_care_anesthesia_request_created",
		auditRepeatedAction: "telegram_care_anesthesia_request_repeated",
		auditIssuedAction: "telegram_care_anesthesia_request_already_issued",
	},
	hygiene: {
		workflowCode: "telegram_care_hygiene_request",
		careTopic: "hygiene",
		taskTitle: "Пациент запросил памятку после гигиены",
		taskBody:
			"Пациент нажал кнопку памятки после профгигиены в Telegram. Врач или гигиенист должен проверить карту, рекомендации по уходу, ограничения и выдать персональные рекомендации DENTE перед отправкой ссылки пациенту.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после гигиены.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после гигиены.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Клиника проверит карту и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после гигиены уже есть в очереди DENTE. Мы обновили время обращения для врача.",
		responseIssuedText:
			"Персональная памятка после гигиены уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если нужна связь с клиникой.",
		priority: "normal",
		auditCreatedAction: "telegram_care_hygiene_request_created",
		auditRepeatedAction: "telegram_care_hygiene_request_repeated",
		auditIssuedAction: "telegram_care_hygiene_request_already_issued",
	},
	prosthetics: {
		workflowCode: "telegram_care_prosthetics_request",
		careTopic: "prosthetics",
		taskTitle: "Пациент запросил памятку после протезирования",
		taskBody:
			"Пациент нажал кнопку памятки после протезирования в Telegram. Врач должен проверить конструкцию, адаптацию, временный цемент или постоянную фиксацию, ограничения и гарантийные условия перед отправкой персональных рекомендаций DENTE.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после протезирования.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после протезирования.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит конструкцию, фиксацию и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после протезирования уже есть в очереди DENTE. Мы обновили время обращения для врача.",
		responseIssuedText:
			"Персональная памятка после протезирования уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если конструкция мешает.",
		priority: "normal",
		auditCreatedAction: "telegram_care_prosthetics_request_created",
		auditRepeatedAction: "telegram_care_prosthetics_request_repeated",
		auditIssuedAction: "telegram_care_prosthetics_request_already_issued",
	},
	orthodontics: {
		workflowCode: "telegram_care_orthodontics_request",
		careTopic: "orthodontics",
		taskTitle: "Пациент запросил памятку после ортодонтии",
		taskBody:
			"Пациент нажал кнопку памятки после ортодонтического приема в Telegram. Врач должен проверить аппарат, элайнеры или брекеты, режим ношения, уход, ограничения и дату контроля перед отправкой персональных рекомендаций DENTE.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после ортодонтии.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после ортодонтии.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит аппарат, режим ношения и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после ортодонтии уже есть в очереди DENTE. Мы обновили время обращения для врача.",
		responseIssuedText:
			"Персональная памятка после ортодонтии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если аппарат натирает или отклеился.",
		priority: "normal",
		auditCreatedAction: "telegram_care_orthodontics_request_created",
		auditRepeatedAction: "telegram_care_orthodontics_request_repeated",
		auditIssuedAction: "telegram_care_orthodontics_request_already_issued",
	},
	periodontology: {
		workflowCode: "telegram_care_periodontology_request",
		careTopic: "periodontology",
		taskTitle: "Пациент запросил памятку после пародонтологии",
		taskBody:
			"Пациент нажал кнопку памятки после пародонтологического приема в Telegram. Врач должен проверить десны, кровоточивость, назначенный уход, ограничения и сроки контроля перед отправкой персональных рекомендаций DENTE.",
		inboundCreatedMessage:
			"Telegram: пациент запросил персональную памятку после пародонтологии.",
		inboundRepeatedMessage:
			"Telegram: пациент повторно запросил персональную памятку после пародонтологии.",
		responseCreatedText:
			"Запрос персональной памятки передан врачу DENTE. Врач проверит десны, уход и подготовит рекомендации в приложении.",
		responseRepeatedText:
			"Запрос памятки после пародонтологии уже есть в очереди DENTE. Мы обновили время обращения для врача.",
		responseIssuedText:
			"Персональная памятка после пародонтологии уже выпущена в DENTE. Откройте защищенный портал или нажмите администратора, если кровоточивость или боль усиливаются.",
		priority: "normal",
		auditCreatedAction: "telegram_care_periodontology_request_created",
		auditRepeatedAction: "telegram_care_periodontology_request_repeated",
		auditIssuedAction: "telegram_care_periodontology_request_already_issued",
	},
};

function findIssuedTelegramCareDocument(
	organizationScope: string,
	patientId: string,
	topic: DenteTelegramCareRequestTopic,
): GeneratedDocument | null {
	const requestTopic = denteTelegramCareRequestTopics[topic];
	return (
		documents.find(
			(document) =>
				document.organizationId === organizationScope &&
				document.patientId === patientId &&
				document.kind === "post_visit_recommendations" &&
				document.status === "issued" &&
				document.payload?.postVisitRecommendations?.safeForTelegramSending ===
					true &&
				document.payload.postVisitRecommendations.careTopic ===
					requestTopic.careTopic,
		) ?? null
	);
}

function findExistingTelegramCareRequestTask(
	organizationScope: string,
	patientId: string,
	topic: DenteTelegramCareRequestTopic,
): CommunicationTask | null {
	const requestTopic = denteTelegramCareRequestTopics[topic];
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

export function createDenteTelegramCareRequest(
	chatFingerprintValue: string | null,
	topic: DenteTelegramCareRequestTopic,
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
	alreadyIssued: boolean;
	blockedReason: string | null;
} {
	const chatLink = activeTelegramChatLinkByFingerprint(
		chatFingerprintValue,
		scope,
	);
	if (!chatLink) {
		return {
			text: "DENTE: персональные памятки доступны после привязки Telegram. Откройте DENTE в клинике и отправьте одноразовый код в этот личный чат.",
			linked: false,
			subjectType: null,
			taskId: null,
			eventId: null,
			duplicate: false,
			alreadyIssued: false,
			blockedReason: "telegram_chat_not_linked",
		};
	}

	if (chatLink.subjectType !== "patient") {
		return {
			text: "DENTE: вы подключены как сотрудник клиники. Выдача персональных памяток доступна в рабочем приложении DENTE.",
			linked: true,
			subjectType: "staff",
			taskId: null,
			eventId: null,
			duplicate: false,
			alreadyIssued: false,
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
			alreadyIssued: false,
			blockedReason: "telegram_patient_not_found",
		};
	}

	const requestTopic = denteTelegramCareRequestTopics[topic];
	const issuedDocument = findIssuedTelegramCareDocument(
		organizationScope,
		patient.id,
		topic,
	);
	if (issuedDocument) {
		recordAuditEvent({
			organizationId: organizationScope,
			entityType: "document",
			entityId: issuedDocument.id,
			action: requestTopic.auditIssuedAction,
			reason:
				"Пациент нажал кнопку памятки в Telegram, но персональная памятка уже выпущена в DENTE.",
		});
		persistMutableState();
		return {
			text: requestTopic.responseIssuedText,
			linked: true,
			subjectType: "patient",
			taskId: null,
			eventId: null,
			duplicate: false,
			alreadyIssued: true,
			blockedReason: null,
		};
	}

	const now = new Date().toISOString();
	let duplicate = true;
	let task = findExistingTelegramCareRequestTask(
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
			assignedRole: "doctor",
			channel: "phone",
			intent: "post_visit_instruction",
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
			? "Пациент повторно нажал кнопку персональной памятки в Telegram."
			: "Пациент нажал кнопку персональной памятки в Telegram.",
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
		alreadyIssued: false,
		blockedReason: null,
	};
}
