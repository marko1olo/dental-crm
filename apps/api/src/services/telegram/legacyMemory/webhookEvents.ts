/**
 * webhookEvents.ts
 *
 * Telegram webhook events ledger and idempotency update deduplication.
 */

import { randomUUID } from "node:crypto";
import type { DenteTelegramWebhookEvent } from "@dental/shared";
import {
	denteTelegramWebhookEvents,
	persistMutableState,
} from "./storeState.js";
import {
	denteTelegramBotSettings,
	getDenteTelegramBotSettings,
} from "./botSettings.js";

export function listDenteTelegramWebhookEvents(
	limit = 20,
	organizationScope = denteTelegramBotSettings.organizationId,
	botConfigId?: string,
): DenteTelegramWebhookEvent[] {
	return denteTelegramWebhookEvents
		.filter(
			(event) =>
				event.organizationId === organizationScope &&
				(!botConfigId || event.botConfigId === botConfigId),
		)
		.slice(0, Math.max(0, Math.min(200, limit)));
}

function findDenteTelegramWebhookUpdate(
	updateId: number,
	organizationScope = denteTelegramBotSettings.organizationId,
	botConfigId?: string,
): DenteTelegramWebhookEvent | null {
	return (
		denteTelegramWebhookEvents.find(
			(event) =>
				event.organizationId === organizationScope &&
				event.updateId === updateId &&
				(!botConfigId || event.botConfigId === botConfigId),
		) ?? null
	);
}

export function hasDenteTelegramWebhookUpdate(
	updateId: number,
	organizationScope = denteTelegramBotSettings.organizationId,
	botConfigId?: string,
): boolean {
	const existing = findDenteTelegramWebhookUpdate(
		updateId,
		organizationScope,
		botConfigId,
	);
	return Boolean(existing && existing.status !== "processing");
}

export function claimDenteTelegramWebhookUpdate(
	input: Pick<
		DenteTelegramWebhookEvent,
		"updateId" | "botConfigId" | "chatFingerprint" | "updateKind" | "command"
	> & { organizationId?: string },
):
	| { claimed: true; event: DenteTelegramWebhookEvent }
	| { claimed: false; event: DenteTelegramWebhookEvent } {
	const organizationScope =
		input.organizationId ?? denteTelegramBotSettings.organizationId;
	const existing = findDenteTelegramWebhookUpdate(
		input.updateId,
		organizationScope,
		input.botConfigId,
	);
	if (existing) {
		if (existing.status !== "processing")
			return { claimed: false, event: existing };
		const createdAtMs = new Date(existing.createdAt).getTime();
		const isStale =
			Number.isNaN(createdAtMs) || Date.now() - createdAtMs > 120_000;
		if (!isStale) return { claimed: false, event: existing };

		const retryEvent: DenteTelegramWebhookEvent = {
			...existing,
			...input,
			organizationId: organizationScope,
			action: "processing_webhook_update_retry",
			warnings: [
				...existing.warnings.filter(
					(warning) => warning !== "stale_processing_retry",
				),
				"stale_processing_retry",
			],
			createdAt: new Date().toISOString(),
		};
		const existingIndex = denteTelegramWebhookEvents.findIndex(
			(event) => event.id === existing.id,
		);
		if (existingIndex >= 0)
			denteTelegramWebhookEvents[existingIndex] = retryEvent;
		persistMutableState();
		return { claimed: true, event: retryEvent };
	}

	const event: DenteTelegramWebhookEvent = {
		...input,
		id: randomUUID(),
		organizationId: organizationScope,
		status: "processing",
		action: "processing_webhook_update",
		warnings: [],
		createdAt: new Date().toISOString(),
	};
	denteTelegramWebhookEvents.unshift(event);
	denteTelegramWebhookEvents.splice(300);
	persistMutableState();
	return { claimed: true, event };
}

export function recordDenteTelegramWebhookEvent(
	input: Omit<DenteTelegramWebhookEvent, "id" | "createdAt"> & {
		organizationId?: string;
	},
): DenteTelegramWebhookEvent {
	const organizationScope =
		input.organizationId ?? denteTelegramBotSettings.organizationId;
	const existingIndex = denteTelegramWebhookEvents.findIndex(
		(event) =>
			event.organizationId === organizationScope &&
			event.updateId === input.updateId &&
			event.botConfigId === input.botConfigId,
	);
	const existing =
		existingIndex >= 0 ? denteTelegramWebhookEvents[existingIndex] : null;
	const event: DenteTelegramWebhookEvent = {
		...input,
		id: existing?.id ?? randomUUID(),
		organizationId: organizationScope,
		createdAt: existing?.createdAt ?? new Date().toISOString(),
	};
	if (existingIndex >= 0) {
		denteTelegramWebhookEvents[existingIndex] = event;
	} else {
		denteTelegramWebhookEvents.unshift(event);
	}
	denteTelegramWebhookEvents.splice(300);
	persistMutableState();
	return event;
}

// ============================================================================
// КЭШ СОСТОЯНИЙ ДИАЛОГА TELEGRAM-БОТА С АВТООЧИСТКОЙ (ЗАЩИТА ОТ УТЕЧКИ ПАМЯТИ)
// ============================================================================

