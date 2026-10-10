/**
 * outboxDelivery.ts
 *
 * Outbox items delivery receipt claiming, delivery preparation and recording.
 */

import { randomUUID } from "node:crypto";
import type {
	CommunicationEvent,
	DenteTelegramOutboxDeliveryReceipt,
	DenteTelegramOutboxItem,
} from "@dental/shared";
import type { DomainState } from "../../../types/domainState.js";
import type { DenteTelegramOutboxRuntimeScope } from "./types.js";
import {
	communicationEvents,
	communicationTasks,
	denteTelegramChatLinks,
	denteTelegramOutboxDeliveryReceipts,
	denteTelegramOutboxDeliveryReceiptsMap,
	doctorUserId,
	inMemoryDomainState,
	organizationId,
	persistMutableState,
	recordAuditEvent,
	uniqueStrings,
} from "./storeState.js";
import { decryptTelegramChatTransportRef } from "./linkCodes.js";
import { telegramOutboxItemAlreadySent } from "./outboxItemBuilders.js";
import { findDenteTelegramOutboxItem } from "./outboxQueryBuilder.js";

export * from "./outboxQueryBuilder.js";

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
