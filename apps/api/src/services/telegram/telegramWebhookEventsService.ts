/**
 * telegramWebhookEventsService.ts — PostgreSQL 18 Ledger & Deduplication for Telegram Webhook Updates.
 *
 * Replaces legacy in-memory deduplication with relational PostgreSQL 18 table
 * `dente_telegram_webhook_events` using atomic `onConflictDoNothing()` on (organization_id, bot_config_id, update_id).
 */

import { and, desc, eq, gte, type SQL } from "drizzle-orm";
import type {
	DenteTelegramUpdateKind,
	DenteTelegramWebhookEvent,
	DenteTelegramWebhookStatus,
} from "@dental/shared";
import { db } from "../../db/client.js";
import { denteTelegramWebhookEvents } from "../../db/schema.js";

function parseWarnings(json: string | null | undefined): string[] {
	if (!json) return [];
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed.map(String) : [];
	} catch {
		return [];
	}
}

function mapRowToEvent(
	row: typeof denteTelegramWebhookEvents.$inferSelect,
): DenteTelegramWebhookEvent {
	return {
		id: row.id,
		organizationId: row.organizationId,
		updateId: row.updateId,
		botConfigId: row.botConfigId,
		chatFingerprint: row.chatFingerprint,
		updateKind: row.updateKind as DenteTelegramUpdateKind,
		command: row.command,
		status: row.status as DenteTelegramWebhookStatus,
		action: row.action,
		warnings: parseWarnings(row.warningsJson),
		createdAt: row.createdAt.toISOString(),
	};
}

/**
 * Проверка наличия уже обработанного события в базе данных PostgreSQL 18.
 */
export async function hasDenteTelegramWebhookUpdate(
	updateId: number,
	organizationId: string,
	botConfigId = "default",
): Promise<boolean> {
	try {
		const [existing] = await db
			.select({
				id: denteTelegramWebhookEvents.id,
				status: denteTelegramWebhookEvents.status,
			})
			.from(denteTelegramWebhookEvents)
			.where(
				and(
					eq(denteTelegramWebhookEvents.organizationId, organizationId),
					eq(denteTelegramWebhookEvents.botConfigId, botConfigId),
					eq(denteTelegramWebhookEvents.updateId, updateId),
				),
			)
			.limit(1);

		return Boolean(existing && existing.status !== "processing");
	} catch (err) {
		// Fallback при временной недоступности базы
		return false;
	}
}

/**
 * Атомарный захват входящего update_id через `insert ... onConflictDoNothing()` в PostgreSQL 18.
 * Возвращает { claimed: true, event } при первом получении,
 * или { claimed: false, event } если update_id уже был получен ранее.
 */
export async function claimDenteTelegramWebhookUpdate(input: {
	updateId: number;
	organizationId: string;
	clinicId?: string | null;
	botConfigId?: string;
	chatFingerprint?: string | null;
	updateKind: DenteTelegramUpdateKind;
	command?: string | null;
}): Promise<{ claimed: boolean; event: DenteTelegramWebhookEvent }> {
	const botConfigId = input.botConfigId || "default";

	try {
		const [inserted] = await db
			.insert(denteTelegramWebhookEvents)
			.values({
				organizationId: input.organizationId,
				clinicId: input.clinicId ?? null,
				updateId: input.updateId,
				botConfigId,
				chatFingerprint: input.chatFingerprint ?? null,
				updateKind: input.updateKind,
				command: input.command ?? null,
				status: "processing",
				action: "processing_webhook_update",
				warningsJson: JSON.stringify([]),
			})
			.onConflictDoNothing({
				target: [
					denteTelegramWebhookEvents.organizationId,
					denteTelegramWebhookEvents.botConfigId,
					denteTelegramWebhookEvents.updateId,
				],
			})
			.returning();

		if (inserted) {
			return { claimed: true, event: mapRowToEvent(inserted) };
		}

		// Если строка уже есть — извлекаем существующую
		const [existing] = await db
			.select()
			.from(denteTelegramWebhookEvents)
			.where(
				and(
					eq(denteTelegramWebhookEvents.organizationId, input.organizationId),
					eq(denteTelegramWebhookEvents.botConfigId, botConfigId),
					eq(denteTelegramWebhookEvents.updateId, input.updateId),
				),
			)
			.limit(1);

		if (existing) {
			// Проверка на зависшую обработку (> 120 сек)
			const createdAtMs = existing.createdAt.getTime();
			const isStale =
				existing.status === "processing" && Date.now() - createdAtMs > 120_000;

			if (isStale) {
				const existingWarnings = parseWarnings(existing.warningsJson);
				const updatedWarnings = [
					...existingWarnings.filter((w) => w !== "stale_processing_retry"),
					"stale_processing_retry",
				];

				const [retried] = await db
					.update(denteTelegramWebhookEvents)
					.set({
						action: "processing_webhook_update_retry",
						warningsJson: JSON.stringify(updatedWarnings),
						createdAt: new Date(),
					})
					.where(eq(denteTelegramWebhookEvents.id, existing.id))
					.returning();

				if (retried) {
					return { claimed: true, event: mapRowToEvent(retried) };
				}
			}

			return { claimed: false, event: mapRowToEvent(existing) };
		}
	} catch (dbError) {
		// Ошибка работы с БД
		console.error("[TelegramWebhookService] Database claim error:", dbError);
	}

	// Fallback-объект при сбое базы данных
	return {
		claimed: true,
		event: {
			id: `fallback_${input.updateId}`,
			organizationId: input.organizationId,
			updateId: input.updateId,
			botConfigId,
			chatFingerprint: input.chatFingerprint ?? null,
			updateKind: input.updateKind,
			command: input.command ?? null,
			status: "processing",
			action: "processing_webhook_update",
			warnings: [],
			createdAt: new Date().toISOString(),
		},
	};
}

/**
 * Фиксация итогового статуса обработки вебхука Telegram в PostgreSQL 18.
 */
export async function recordDenteTelegramWebhookEvent(input: {
	updateId: number;
	organizationId: string;
	clinicId?: string | null;
	botConfigId?: string;
	chatFingerprint?: string | null;
	updateKind: DenteTelegramUpdateKind;
	command?: string | null;
	status: DenteTelegramWebhookStatus;
	action: string;
	warnings?: string[];
}): Promise<DenteTelegramWebhookEvent> {
	const botConfigId = input.botConfigId || "default";
	const warnings = input.warnings ?? [];
	const warningsJson = JSON.stringify(warnings);

	try {
		const [saved] = await db
			.insert(denteTelegramWebhookEvents)
			.values({
				organizationId: input.organizationId,
				clinicId: input.clinicId ?? null,
				updateId: input.updateId,
				botConfigId,
				chatFingerprint: input.chatFingerprint ?? null,
				updateKind: input.updateKind,
				command: input.command ?? null,
				status: input.status,
				action: input.action,
				warningsJson,
			})
			.onConflictDoUpdate({
				target: [
					denteTelegramWebhookEvents.organizationId,
					denteTelegramWebhookEvents.botConfigId,
					denteTelegramWebhookEvents.updateId,
				],
				set: {
					status: input.status,
					action: input.action,
					warningsJson,
					...(input.command !== undefined ? { command: input.command } : {}),
					...(input.chatFingerprint !== undefined
						? { chatFingerprint: input.chatFingerprint }
						: {}),
				},
			})
			.returning();

		if (saved) {
			return mapRowToEvent(saved);
		}
	} catch (dbError) {
		console.error("[TelegramWebhookService] Database record error:", dbError);
	}

	return {
		id: `fallback_${input.updateId}`,
		organizationId: input.organizationId,
		updateId: input.updateId,
		botConfigId,
		chatFingerprint: input.chatFingerprint ?? null,
		updateKind: input.updateKind,
		command: input.command ?? null,
		status: input.status,
		action: input.action,
		warnings,
		createdAt: new Date().toISOString(),
	};
}

/**
 * Получение списка последних событий вебхуков из PostgreSQL 18.
 * Поддерживает оба порядка параметров: (limit, organizationId, botConfigId) или (organizationId, limit, botConfigId).
 */
export async function listDenteTelegramWebhookEvents(
	limitOrOrg: number | string = 20,
	orgOrLimit?: string | number,
	botConfigId?: string,
): Promise<DenteTelegramWebhookEvent[]> {
	let limit = 20;
	let organizationId: string | undefined;

	if (typeof limitOrOrg === "number") {
		limit = limitOrOrg;
		if (typeof orgOrLimit === "string") {
			organizationId = orgOrLimit;
		}
	} else if (typeof limitOrOrg === "string") {
		organizationId = limitOrOrg;
		if (typeof orgOrLimit === "number") {
			limit = orgOrLimit;
		}
	}

	try {
		const conditions: SQL[] = [];
		if (organizationId) {
			conditions.push(
				eq(denteTelegramWebhookEvents.organizationId, organizationId),
			);
		}
		if (botConfigId) {
			conditions.push(
				eq(denteTelegramWebhookEvents.botConfigId, botConfigId),
			);
		}

		const query = db
			.select()
			.from(denteTelegramWebhookEvents);

		const rows =
			conditions.length > 0
				? await query
						.where(and(...conditions))
						.orderBy(desc(denteTelegramWebhookEvents.createdAt))
						.limit(Math.max(1, Math.min(300, limit)))
				: await query
						.orderBy(desc(denteTelegramWebhookEvents.createdAt))
						.limit(Math.max(1, Math.min(300, limit)));

		return rows.map(mapRowToEvent);
	} catch {
		return [];
	}
}

/**
 * Подсчет отклоненных попыток ввода кода привязки Telegram в заданном окне времени (защита от брутфорса).
 */
export async function countRejectedTelegramLinkCodeAttempts(
	chatFingerprintValue: string | null,
	organizationId: string,
	botConfigId: string,
	windowMs = 300_000,
): Promise<number> {
	if (!chatFingerprintValue) return 0;
	const windowStartedAt = new Date(Date.now() - windowMs);

	try {
		const rows = await db
			.select({
				id: denteTelegramWebhookEvents.id,
				action: denteTelegramWebhookEvents.action,
			})
			.from(denteTelegramWebhookEvents)
			.where(
				and(
					eq(denteTelegramWebhookEvents.organizationId, organizationId),
					eq(denteTelegramWebhookEvents.botConfigId, botConfigId),
					eq(denteTelegramWebhookEvents.chatFingerprint, chatFingerprintValue),
					gte(denteTelegramWebhookEvents.createdAt, windowStartedAt),
				),
			)
			.limit(100);

		return rows.filter(
			(r) =>
				r.action === "rejected_telegram_link_code" ||
				r.action === "rate_limited_telegram_link_code",
		).length;
	} catch {
		return 0;
	}
}
