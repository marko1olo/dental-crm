/**
 * outboxDelivery.ts
 *
 * Outbox items query assembly, delivery receipt claiming, delivery preparation and recording.
 */

import { randomUUID } from "node:crypto";
import type {
	Appointment,
	CommunicationEvent,
	CommunicationTask,
	DenteTelegramBotSettings,
	DenteTelegramChatLink,
	DenteTelegramOutboxDeliveryReceipt,
	DenteTelegramOutboxDeliveryStatus,
	DenteTelegramOutboxItem,
	DenteTelegramOutboxResponse,
	DenteTelegramTemplateKind,
} from "@dental/shared";
import { denteTelegramOutboxResponseSchema } from "@dental/shared";
import type { DomainState } from "../../../types/domainState.js";
import type {
	BuildDenteTelegramOutboxOptions,
	DenteTelegramOutboxRuntimeScope,
	DenteTelegramOutboxStatusFilter,
	NormalizedDenteTelegramOutboxOptions,
	ResolvedDenteTelegramOutboxRuntimeScope,
} from "./types.js";
import {
	denteTelegramChatLinks,
	denteTelegramOutboxDeliveryReceipts,
	denteTelegramOutboxDeliveryReceiptsMap,
	inMemoryDomainState,
	syncDenteTelegramOutboxDeliveryReceiptsMap,
	organizationId,
	doctorUserId,
	communicationTasks,
	communicationEvents,
	isOpenCommunicationTask,
	recordAuditEvent,
	persistMutableState,
} from "./storeState.js";
import {
	denteTelegramPortalUrlForSection,
	denteTelegramPortalUrlForTemplate,
} from "./botUrlHelpers.js";
import {
	getDenteTelegramBotSettings,
	resolveDenteTelegramOutboxRuntimeScope,
} from "./botSettings.js";
import {
	buildDenteTelegramAppointmentCallbackData,
} from "./appointmentCallbacks.js";
import {
	decryptTelegramChatTransportRef,
	telegramChatEncryptionKey,
} from "./linkCodes.js";
import {
	telegramTemplateKindForTask,
} from "./messageRenderer.js";
import {
	buildDenteTelegramDocumentReadyItems,
	buildDenteTelegramPaymentReminderItems,
	buildDenteTelegramRecallItems,
	buildDenteTelegramTaxDocumentRequestItems,
	buildDenteTelegramOutboxItem,
	telegramOutboxItemAlreadySent,
} from "./outboxItemBuilders.js";
import {
	buildDenteTelegramAppointmentReminderItems,
	buildDenteTelegramPostVisitCheckupItems,
	buildDenteTelegramPostVisitInstructionItems,
	buildDenteTelegramReviewRequestItems,
	staffDailyDigestOutboxId,
	staffDailyDigestAlreadySent,
} from "./outboxFollowupBuilders.js";

export function findDenteTelegramOutboxDeliveryReceipt(
	outboxItemId: string,
	clientMutationId: string | null | undefined,
): DenteTelegramOutboxDeliveryReceipt | null {
	if (!clientMutationId) return null;
	return (
		denteTelegramOutboxDeliveryReceiptsMap.get(
			`${outboxItemId}:${clientMutationId}`,
		) ?? null
	);
}

export function claimDenteTelegramOutboxDeliveryReceipt(
	item: DenteTelegramOutboxItem,
	clientMutationId: string,
	warnings: string[],
): DenteTelegramOutboxDeliveryReceipt | null {
	const existing = findDenteTelegramOutboxDeliveryReceipt(
		item.id,
		clientMutationId,
	);
	if (existing?.status === "failed" && clientMutationId.startsWith("due-"))
		return null;
	if (existing) return existing;
	const receipt: DenteTelegramOutboxDeliveryReceipt = {
		outboxItemId: item.id,
		status: "blocked",
		outboxItem: item,
		taskId: item.taskId,
		eventId: null,
		telegramMessageId: null,
		clientMutationId,
		warnings: uniqueStrings([...warnings, "telegram_delivery_processing"]),
		blockedReason: "telegram_delivery_processing",
		createdAt: new Date().toISOString(),
	};
	denteTelegramOutboxDeliveryReceipts.unshift(receipt);
	denteTelegramOutboxDeliveryReceiptsMap.set(
		`${receipt.outboxItemId}:${receipt.clientMutationId}`,
		receipt,
	);
	const removed = denteTelegramOutboxDeliveryReceipts.splice(200);
	for (const r of removed) {
		denteTelegramOutboxDeliveryReceiptsMap.delete(
			`${r.outboxItemId}:${r.clientMutationId}`,
		);
	}
	persistMutableState();
	return null;
}


export function prepareDenteTelegramOutboxDelivery(
	outboxItemId: string,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
):
	| {
			ok: true;
			item: DenteTelegramOutboxItem;
			chatId: string;
			text: string;
			photoUrl: string | null;
			replyMarkup: Record<string, unknown> | null;
			warnings: string[];
	  }
	| {
			ok: false;
			statusCode: number;
			item: DenteTelegramOutboxItem | null;
			blockedReason: string;
			warnings: string[];
	  } {
	const item = findDenteTelegramOutboxItem(outboxItemId, runtimeScope, state);
	if (!item) {
		return {
			ok: false,
			statusCode: 404,
			item: null,
			blockedReason: "telegram_outbox_item_not_found_or_no_longer_open",
			warnings: [],
		};
	}

	if (telegramOutboxItemAlreadySent(item.id)) {
		return {
			ok: false,
			statusCode: 409,
			item,
			blockedReason: "telegram_outbox_already_sent",
			warnings: [
				...item.warnings,
				"Это сообщение уже было отправлено. Обновите очередь перед повторной рассылкой.",
			],
		};
	}

	const scheduledAtMs = Date.parse(item.scheduledAt);
	if (Number.isFinite(scheduledAtMs) && scheduledAtMs > Date.now()) {
		return {
			ok: false,
			statusCode: 409,
			item,
			blockedReason: "telegram_outbox_not_due_yet",
			warnings: [
				...item.warnings,
				"Запланированное время отправки еще не наступило.",
			],
		};
	}

	if (item.deliveryStatus !== "ready") {
		return {
			ok: false,
			statusCode: 409,
			item,
			blockedReason: item.blockedReason ?? item.deliveryStatus,
			warnings: item.warnings,
		};
	}

	const chatLink = item.chatLinkId
		? (denteTelegramChatLinks.find(
				(link) => link.id === item.chatLinkId && link.status === "active",
			) ?? null)
		: null;
	const chatId = decryptTelegramChatTransportRef(chatLink?.chatTransportRef);
	if (!chatId) {
		return {
			ok: false,
			statusCode: 409,
			item,
			blockedReason: "encrypted_chat_transport_missing_or_unreadable",
			warnings: [
				...item.warnings,
				"Повторно привяжите чат после настройки защищенной серверной связки.",
			],
		};
	}

	if (!item.previewText.trim()) {
		return {
			ok: false,
			statusCode: 409,
			item,
			blockedReason: "telegram_outbox_preview_empty",
			warnings: item.warnings,
		};
	}

	return {
		ok: true,
		item,
		chatId,
		text: item.previewText,
		photoUrl: item.photoUrl,
		replyMarkup: item.replyMarkup,
		warnings: item.warnings,
	};
}

export function recordDenteTelegramOutboxDelivery(input: {
	item: DenteTelegramOutboxItem;
	status: "sent" | "failed";
	message: string;
	telegramMessageId?: number | null;
	clientMutationId?: string | null;
	warnings?: string[];
	blockedReason?: string | null;
}): { eventId: string | null; taskId: string | null; taskCompleted: boolean } {
	const now = new Date().toISOString();
	const task = input.item.taskId
		? (communicationTasks.find(
				(candidate) => candidate.id === input.item.taskId,
			) ?? null)
		: null;
	const patientId = input.item.patientId ?? task?.patientId ?? null;
	let eventId: string | null = null;
	const clientMutationId = input.clientMutationId?.trim() || null;

	if (patientId) {
		const event: CommunicationEvent = {
			id: randomUUID(),
			organizationId,
			taskId: input.item.taskId,
			patientId,
			actorUserId: doctorUserId,
			channel: "telegram",
			direction: "outbound",
			status: input.status === "sent" ? "sent" : "failed",
			message: input.message,
			createdAt: now,
		};
		communicationEvents.unshift(event);
		eventId = event.id;
	}

	let taskCompleted = false;
	if (task && input.status === "sent") {
		task.status = "completed";
		task.lastEventAt = now;
		taskCompleted = true;
	} else if (
		task &&
		input.status === "failed" &&
		!["completed", "skipped"].includes(task.status)
	) {
		task.lastEventAt = now;
	}

	recordAuditEvent({
		entityType: "telegram_outbox",
		entityId: input.item.id,
		action:
			input.status === "sent"
				? "telegram_outbound_sent"
				: "telegram_outbound_failed",
		reason:
			input.status === "sent"
				? `Telegram safe template ${input.item.templateKind} sent; message id ${input.telegramMessageId ?? "unknown"}.${
						clientMutationId ? ` clientMutationId=${clientMutationId}.` : ""
					}`
				: `Telegram safe template ${input.item.templateKind} failed: ${input.message}${clientMutationId ? `; clientMutationId=${clientMutationId}` : ""}`,
	});

	if (clientMutationId) {
		const receipt: DenteTelegramOutboxDeliveryReceipt = {
			outboxItemId: input.item.id,
			status: input.status,
			outboxItem: input.item,
			taskId: task?.id ?? input.item.taskId,
			eventId,
			telegramMessageId: input.telegramMessageId ?? null,
			clientMutationId,
			warnings: input.warnings ?? input.item.warnings,
			blockedReason:
				input.blockedReason ??
				(input.status === "failed" ? "telegram_transport_failed" : null),
			createdAt: now,
		};
		const existing = denteTelegramOutboxDeliveryReceiptsMap.get(
			`${receipt.outboxItemId}:${receipt.clientMutationId}`,
		);
		if (existing) {
			Object.assign(existing, receipt);
		} else {
			denteTelegramOutboxDeliveryReceipts.unshift(receipt);
			denteTelegramOutboxDeliveryReceiptsMap.set(
				`${receipt.outboxItemId}:${receipt.clientMutationId}`,
				receipt,
			);
			const removed = denteTelegramOutboxDeliveryReceipts.splice(200);
			for (const r of removed) {
				denteTelegramOutboxDeliveryReceiptsMap.delete(
					`${r.outboxItemId}:${r.clientMutationId}`,
				);
			}
		}
	}

	persistMutableState();
	return { eventId, taskId: task?.id ?? input.item.taskId, taskCompleted };
}



function normalizeDenteTelegramOutboxOptions(
	input: number | BuildDenteTelegramOutboxOptions = 100,
): NormalizedDenteTelegramOutboxOptions {
	const source = typeof input === "number" ? { limit: input } : input;
	const parsedLimit = Number(source.limit ?? 100);
	const limit = Number.isFinite(parsedLimit)
		? Math.max(1, Math.min(300, Math.trunc(parsedLimit)))
		: 100;
	const parsedCursor = Number.parseInt(source.cursor ?? "0", 10);
	const cursor = String(
		Math.max(0, Number.isFinite(parsedCursor) ? parsedCursor : 0),
	);
	return {
		limit,
		cursor,
		status: source.status ?? "all",
		templateKind: source.templateKind ?? "all",
	};
}

function denteTelegramOutboxItemMatchesStatus(
	item: DenteTelegramOutboxItem,
	status: DenteTelegramOutboxStatusFilter,
	nowMs: number,
): boolean {
	if (status === "all") return true;
	if (status === "due") {
		if (item.deliveryStatus !== "ready") return false;
		const scheduledAtMs = Date.parse(item.scheduledAt);
		return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;
	}
	return item.deliveryStatus === status;
}

function buildAllDenteTelegramOutboxItems(
	now: string,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	const taskItems = communicationTasks
		.filter(isOpenCommunicationTask)
		.filter((task) => task.channel === "telegram")
		.filter((task) => task.organizationId === organizationScope)
		.map((task) =>
			buildDenteTelegramOutboxItem(
				{
					id: `task:${task.id}`,
					task,
					subjectType: "patient",
					subjectId: task.patientId,
					visitId: task.visitId,
					templateKind: telegramTemplateKindForTask(task),
					scheduledAt: task.dueAt,
					source: "communication_task",
				},
				runtime,
			),
		);
	const staffDigestItems = denteTelegramChatLinks
		.filter(
			(link) =>
				link.organizationId === organizationScope &&
				link.botConfigId === runtime.botConfigId &&
				link.subjectType === "staff" &&
				link.status === "active",
		)
		.flatMap((link) => {
			const itemId = staffDailyDigestOutboxId(link.subjectId);
			if (staffDailyDigestAlreadySent(itemId)) return [];
			return [
				buildDenteTelegramOutboxItem(
					{
						id: itemId,
						task: null,
						subjectType: "staff",
						subjectId: link.subjectId,
						templateKind: "staff_daily_digest",
						scheduledAt: now,
						source: "staff_digest",
					},
					runtime,
				),
			];
		});
	const paymentReminderItems = buildDenteTelegramPaymentReminderItems(
		runtime,
		state,
	);
	const appointmentReminderItems =
		buildDenteTelegramAppointmentReminderItems(runtime, state);
	const postVisitInstructionItems =
		buildDenteTelegramPostVisitInstructionItems(runtime, state);
	const postVisitCheckupItems =
		buildDenteTelegramPostVisitCheckupItems(runtime, state);
	const recallItems = buildDenteTelegramRecallItems(runtime, state);
	const taxDocumentRequestItems =
		buildDenteTelegramTaxDocumentRequestItems(runtime, state);
	const documentReadyItems = buildDenteTelegramDocumentReadyItems(
		runtime,
		state,
	);
	const reviewRequestItems = buildDenteTelegramReviewRequestItems(
		runtime,
		state,
	);
	const allItems = [
		...taskItems,
		...paymentReminderItems,
		...appointmentReminderItems,
		...postVisitInstructionItems,
		...postVisitCheckupItems,
		...recallItems,
		...taxDocumentRequestItems,
		...documentReadyItems,
		...reviewRequestItems,
		...staffDigestItems,
	].sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
	return allItems;
}

function findDenteTelegramOutboxItem(
	outboxItemId: string,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem | null {
	return (
		buildAllDenteTelegramOutboxItems(
			new Date().toISOString(),
			runtimeScope,
			state,
		).find((item) => item.id === outboxItemId) ?? null
	);
}

export function buildDenteTelegramOutbox(
	input: number | BuildDenteTelegramOutboxOptions = 100,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxResponse {
	const options = normalizeDenteTelegramOutboxOptions(input);
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const { settings } = runtime;
	const now = new Date().toISOString();
	const allItems = buildAllDenteTelegramOutboxItems(now, runtime, state);
	const warnings: string[] = [];
	const nowMs = Date.now();
	const readyItems = allItems.filter((item) => item.deliveryStatus === "ready");
	const dueCount = readyItems.filter((item) => {
		const scheduledAtMs = Date.parse(item.scheduledAt);
		return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;
	}).length;
	const filteredItems = allItems.filter((item) => {
		if (!denteTelegramOutboxItemMatchesStatus(item, options.status, nowMs))
			return false;
		if (
			options.templateKind !== "all" &&
			item.templateKind !== options.templateKind
		)
			return false;
		return true;
	});
	const offset = Number.parseInt(options.cursor, 10);
	const safeOffset = Math.max(0, Number.isFinite(offset) ? offset : 0);
	const items = filteredItems.slice(safeOffset, safeOffset + options.limit);
	const nextOffset = safeOffset + items.length;
	const nextCursor =
		nextOffset < filteredItems.length ? String(nextOffset) : null;

	if (!runtime.botTokenConfigured)
		warnings.push(
			"Подключите бота Telegram в серверных настройках для реальной отправки сообщений.",
		);
	if (!telegramChatEncryptionKey()) {
		warnings.push(
			"Настройте защищенную серверную связку перед хранением обратимых ссылок на Telegram-чат.",
		);
	}
	if (!settings.patientPortalBaseUrl) {
		warnings.push(
			"patientPortalBaseUrl нужен для ссылок на готовые документы, памятки после приема и профилактические приглашения.",
		);
	}

	return denteTelegramOutboxResponseSchema.parse({
		generatedAt: now,
		mode: settings.mode,
		transportReady: settings.mode !== "disabled" && runtime.botTokenConfigured,
		totalCount: allItems.length,
		filteredCount: filteredItems.length,
		limit: options.limit,
		cursor: options.cursor,
		nextCursor,
		readyCount: readyItems.length,
		dueCount,
		notDueCount: readyItems.length - dueCount,
		blockedCount: allItems.filter((item) => item.deliveryStatus !== "ready")
			.length,
		items,
		warnings,
	});
}

