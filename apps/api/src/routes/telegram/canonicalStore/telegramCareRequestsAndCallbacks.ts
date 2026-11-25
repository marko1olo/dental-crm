import { createHmac, randomUUID } from "node:crypto";
import {
	communicationTaskWorkflowCodeSchema,
	type Appointment,
	type AppointmentStatus,
	type CommunicationIntent,
	type CommunicationPriority,
	type CommunicationTaskWorkflowCode,
	type DenteTelegramBotSettings,
	type DenteTelegramChatLink,
	type StaffRole,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	communicationEvents as communicationEventsTable,
	communicationTasks as communicationTasksTable,
	denteTelegramChatLinks as denteTelegramChatLinksTable,
} from "../../../db/schema.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import {
	denteTelegramBotSettings,
	denteTelegramChatLinks,
	inMemoryDomainState,
	toValidUuid,
	type DomainState,
} from "./telegramRuntimeDefaults.js";

const logger = createApiLogger("telegramCareRequestsAndCallbacks");

type TelegramRequestScope = {
	organizationId?: string | null;
	clinicId?: string | null;
	botConfigId?: string | null;
};

async function findActiveChatLink(
	chatFingerprintValue: string | null,
	scope: TelegramRequestScope,
): Promise<DenteTelegramChatLink | null> {
	if (!chatFingerprintValue) return null;
	const targetOrgId = toValidUuid(scope.organizationId);

	const inMemoryMatch = denteTelegramChatLinks.find(
		(link) =>
			link.chatFingerprint === chatFingerprintValue &&
			link.status === "active" &&
			(!targetOrgId || link.organizationId === targetOrgId),
	);
	if (inMemoryMatch) return inMemoryMatch;

	if (!targetOrgId || process.env.DENTAL_STATE_PERSISTENCE === "off") {
		return null;
	}

	try {
		const [row] = await withTenantCtx(targetOrgId, (tx) =>
			tx
				.select()
				.from(denteTelegramChatLinksTable)
				.where(
					and(
						eq(denteTelegramChatLinksTable.organizationId, targetOrgId),
						eq(
							denteTelegramChatLinksTable.chatFingerprint,
							chatFingerprintValue,
						),
						eq(denteTelegramChatLinksTable.status, "active"),
					),
				)
				.limit(1),
		);
		if (!row) return null;
		return {
			id: row.id,
			organizationId: row.organizationId,
			clinicId: row.clinicId,
			botConfigId: row.botConfigId,
			subjectType: row.subjectType,
			subjectId: row.subjectId,
			chatFingerprint: row.chatFingerprint,
			chatTransportRef: row.chatTransportRef ?? null,
			chatIdLast4: row.chatIdLast4 ?? null,
			status: row.status,
			linkedAt: row.linkedAt.toISOString(),
			revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
			lastUpdateAt: row.lastUpdateAt.toISOString(),
		};
	} catch (err) {
		logger.warn(
			{ err: safeLogError(err), targetOrgId },
			"Failed to resolve Telegram chat link from Postgres 18",
		);
		return null;
	}
}

function resolveDocumentWorkflowCode(topic: string): CommunicationTaskWorkflowCode {
	const candidate = `telegram_${topic}_document_request`;
	const parsed = communicationTaskWorkflowCodeSchema.safeParse(candidate);
	if (parsed.success) return parsed.data;
	return topic === "forms" ? "telegram_patient_forms_request" : "telegram_medical_document_request";
}

function resolveCareWorkflowCode(topic: string): CommunicationTaskWorkflowCode {
	const candidate = `telegram_care_${topic}_request`;
	const parsed = communicationTaskWorkflowCodeSchema.safeParse(candidate);
	if (parsed.success) return parsed.data;
	return "telegram_care_surgery_request";
}

async function persistTelegramRequestTaskAndEvent(params: {
	chatLink: DenteTelegramChatLink;
	scope: TelegramRequestScope;
	assignedRole: StaffRole;
	intent: Extract<CommunicationIntent, "general" | "document_ready" | "post_visit_instruction">;
	priority: CommunicationPriority;
	title: string;
	body: string;
	workflowCode: CommunicationTaskWorkflowCode;
}): Promise<{ taskId: string | null; eventId: string | null }> {
	const { chatLink, scope } = params;
	const targetOrgId =
		toValidUuid(scope.organizationId) ?? toValidUuid(chatLink.organizationId);
	const patientId =
		chatLink.subjectType === "patient" ? toValidUuid(chatLink.subjectId) : null;
	const clinicId = toValidUuid(scope.clinicId ?? chatLink.clinicId ?? null);
	const botConfigId =
		scope.botConfigId?.trim() || chatLink.botConfigId || "default";

	if (process.env.DENTAL_STATE_PERSISTENCE === "off" || !targetOrgId || !patientId) {
		if (process.env.DENTAL_STATE_PERSISTENCE === "off" && targetOrgId && patientId) {
			const now = new Date().toISOString();
			const taskId = randomUUID();
			const eventId = randomUUID();
			inMemoryDomainState.communicationTasks.unshift({
				id: taskId,
				organizationId: targetOrgId,
				patientId,
				appointmentId: null,
				visitId: null,
				documentId: null,
				assignedRole: params.assignedRole,
				channel: "telegram",
				intent: params.intent,
				status: "queued",
				priority: params.priority,
				dueAt: now,
				title: params.title,
				body: params.body,
				workflowCode: params.workflowCode,
				lastEventAt: null,
				createdAt: now,
			});
			inMemoryDomainState.communicationEvents.unshift({
				id: eventId,
				organizationId: targetOrgId,
				taskId,
				patientId,
				actorUserId: null,
				channel: "telegram",
				direction: "inbound",
				status: "delivered",
				message: params.body,
				createdAt: now,
			});
			return { taskId, eventId };
		}
		return { taskId: null, eventId: null };
	}

	return await withTenantCtx(targetOrgId, async (tx) => {
		const [insertedTask] = await tx
			.insert(communicationTasksTable)
			.values({
				organizationId: targetOrgId,
				clinicId: clinicId ?? undefined,
				botConfigId,
				patientId,
				assignedRole: params.assignedRole,
				channel: "telegram",
				intent: params.intent,
				status: "queued",
				priority: params.priority,
				dueAt: new Date(),
				title: params.title,
				body: params.body,
				workflowCode: params.workflowCode,
			})
			.returning({ id: communicationTasksTable.id });

		const taskId = insertedTask?.id ?? null;

		const [insertedEvent] = await tx
			.insert(communicationEventsTable)
			.values({
				organizationId: targetOrgId,
				taskId,
				patientId,
				actorUserId: null,
				channel: "telegram",
				direction: "inbound",
				status: "delivered",
				message: params.body,
			})
			.returning({ id: communicationEventsTable.id });

		return {
			taskId,
			eventId: insertedEvent?.id ?? null,
		};
	});
}

export async function createDenteTelegramContactRequest(
	chatFingerprintValue: string | null,
	scope: TelegramRequestScope = {},
): Promise<{
	text: string;
	linked: boolean;
	subjectType: "patient" | "staff" | null;
	taskId: string | null;
	eventId: string | null;
	duplicate: boolean;
	blockedReason: string | null;
}> {
	const chatLink = await findActiveChatLink(chatFingerprintValue, scope);

	if (!chatLink) {
		return {
			text: "DENTE: запрос связи доступен после привязки Telegram в клинике.",
			linked: false,
			subjectType: null,
			taskId: null,
			eventId: null,
			duplicate: false,
			blockedReason: "telegram_chat_not_linked",
		};
	}

	const { taskId, eventId } = await persistTelegramRequestTaskAndEvent({
		chatLink,
		scope,
		assignedRole: "admin",
		intent: "general",
		priority: "high",
		title: "Запрос обратного звонка из Telegram",
		body: "Пациент запросил обратную связь через Telegram-бот.",
		workflowCode: "telegram_contact_request",
	});

	return {
		text: "Запрос передан администратору DENTE. Мы свяжемся с вами в ближайшее время.",
		linked: true,
		subjectType: chatLink.subjectType,
		taskId,
		eventId,
		duplicate: false,
		blockedReason: null,
	};
}

export async function createDenteTelegramDocumentRequest(
	chatFingerprintValue: string | null,
	topic: string,
	scope: TelegramRequestScope = {},
): Promise<{
	text: string;
	linked: boolean;
	subjectType: "patient" | "staff" | null;
	taskId: string | null;
	eventId: string | null;
	duplicate: boolean;
	blockedReason: string | null;
}> {
	const chatLink = await findActiveChatLink(chatFingerprintValue, scope);

	if (!chatLink) {
		return {
			text: "DENTE: запрос документов доступен после привязки Telegram.",
			linked: false,
			subjectType: null,
			taskId: null,
			eventId: null,
			duplicate: false,
			blockedReason: "telegram_chat_not_linked",
		};
	}

	const { taskId, eventId } = await persistTelegramRequestTaskAndEvent({
		chatLink,
		scope,
		assignedRole: "admin",
		intent: "document_ready",
		priority: "normal",
		title: `Запрос документов из Telegram (${topic})`,
		body: `Пациент запросил подготовку документов (${topic}) через Telegram-бот.`,
		workflowCode: resolveDocumentWorkflowCode(topic),
	});

	return {
		text: "Запрос передан администратору DENTE. Документы будут подготовлены в защищенном портале.",
		linked: true,
		subjectType: chatLink.subjectType,
		taskId,
		eventId,
		duplicate: false,
		blockedReason: null,
	};
}

export async function createDenteTelegramCareRequest(
	chatFingerprintValue: string | null,
	topic: string,
	scope: TelegramRequestScope = {},
): Promise<{
	text: string;
	linked: boolean;
	subjectType: "patient" | "staff" | null;
	taskId: string | null;
	eventId: string | null;
	duplicate: boolean;
	alreadyIssued: boolean;
	blockedReason: string | null;
}> {
	const chatLink = await findActiveChatLink(chatFingerprintValue, scope);

	if (!chatLink) {
		return {
			text: "DENTE: памятки доступны после привязки Telegram в клинике.",
			linked: false,
			subjectType: null,
			taskId: null,
			eventId: null,
			duplicate: false,
			alreadyIssued: false,
			blockedReason: "telegram_chat_not_linked",
		};
	}

	const { taskId, eventId } = await persistTelegramRequestTaskAndEvent({
		chatLink,
		scope,
		assignedRole: "doctor",
		intent: "post_visit_instruction",
		priority: "normal",
		title: `Запрос памятки из Telegram (${topic})`,
		body: `Пациент запросил персональные рекомендации (${topic}) через Telegram-бот.`,
		workflowCode: resolveCareWorkflowCode(topic),
	});

	return {
		text: "Запрос персональной памятки передан врачу DENTE. Рекомендации откроются в приложении.",
		linked: true,
		subjectType: chatLink.subjectType,
		taskId,
		eventId,
		duplicate: false,
		alreadyIssued: false,
		blockedReason: null,
	};
}

export function buildDenteTelegramLinkedScheduleReply(
	chatFingerprintValue: string | null,
	_scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
		state?: DomainState;
		appointments?: readonly Appointment[] | null;
	} = {},
	_settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): {
	text: string;
	linked: boolean;
	subjectType: "patient" | "staff" | null;
	appointmentCount: number;
	blockedReason: string | null;
	replyMarkup: Record<string, unknown> | null;
} {
	const chatLink = denteTelegramChatLinks.find(
		(link) =>
			link.chatFingerprint === chatFingerprintValue && link.status === "active",
	);

	if (!chatLink) {
		return {
			text: "DENTE: расписание доступно только после привязки Telegram. Откройте DENTE в клинике.",
			linked: false,
			subjectType: null,
			appointmentCount: 0,
			blockedReason: "telegram_chat_not_linked",
			replyMarkup: null,
		};
	}

	return {
		text: "DENTE: активных записей сейчас нет. Для деталей откройте защищенный портал или свяжитесь с клиникой.",
		linked: true,
		subjectType: chatLink.subjectType,
		appointmentCount: 0,
		blockedReason: null,
		replyMarkup: null,
	};
}

export function appointmentStatusLabelForTelegram(
	status: AppointmentStatus,
): string {
	const labels: Record<AppointmentStatus, string> = {
		planned: "запланирован",
		confirmed: "подтвержден",
		arrived: "пациент прибыл",
		in_treatment: "идет прием",
		completed: "завершен",
		cancelled: "отменен",
		no_show: "неявка",
	};
	return labels[status] ?? status;
}

function resolvedTelegramCallbackSecret(): string | null {
	return (
		process.env.DENTE_TELEGRAM_CALLBACK_SECRET?.trim() ||
		process.env.DENTE_TELEGRAM_WEBHOOK_SECRET?.trim() ||
		null
	);
}

export function denteTelegramAppointmentCallbacksReady(): boolean {
	return Boolean(resolvedTelegramCallbackSecret());
}

export function buildDenteTelegramAppointmentCallbackData(
	action: "confirm" | "reschedule" | "call_request",
	appointmentId: string,
	scope?: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
	},
	startsAtIso?: string | null,
): string {
	const secret = resolvedTelegramCallbackSecret();
	if (!secret) {
		throw new Error(
			"DENTE_TELEGRAM_CALLBACK_SECRET или DENTE_TELEGRAM_WEBHOOK_SECRET не настроен для подписи callback-данных.",
		);
	}
	const org = scope?.organizationId?.trim();
	if (!org) {
		throw new Error(
			"organizationId обязателен для формирования подписанного Telegram callback.",
		);
	}
	const actionCode =
		action === "confirm" ? "c" : action === "reschedule" ? "r" : "p";
	const compactId = appointmentId.replace(/-/g, "").toLowerCase();
	const startsAtMs = startsAtIso ? Date.parse(startsAtIso) : NaN;
	const fallbackMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
	const expires = Math.floor(
		(Number.isFinite(startsAtMs) ? startsAtMs : fallbackMs) / 1000,
	).toString(36);
	const sig = createHmac("sha256", secret)
		.update(`${org}:${appointmentId}:${action}:${expires}`)
		.digest("base64url")
		.slice(0, 10);
	return `d1.${actionCode}.${compactId}.${expires}.${sig}`;
}
