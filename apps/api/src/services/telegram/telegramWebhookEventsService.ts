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
import { withTenantCtx } from "../../db/rls.js";
import { denteTelegramWebhookEvents } from "../../db/schema.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";

const logger = createApiLogger("telegramWebhookEvents");

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
		return await withTenantCtx(organizationId, async (tx) => {
			const [existing] = await tx
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
		});
	} catch (err) {
		logger.warn(
			{ err: safeLogError(err), updateId, organizationId, botConfigId },
			"Failed to check Telegram webhook deduplication status",
		);
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
		return await withTenantCtx(input.organizationId, async (tx) => {
			const [inserted] = await tx
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
			const [existing] = await tx
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

			if (!existing) {
				throw new Error(
					`Telegram webhook update ${input.updateId} conflicted on insert but could not be reloaded for tenant ${input.organizationId}`,
				);
			}

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

				const [retried] = await tx
					.update(denteTelegramWebhookEvents)
					.set({
						action: "processing_webhook_update_retry",
						warningsJson: JSON.stringify(updatedWarnings),
						createdAt: new Date(),
					})
					.where(
						and(
							eq(denteTelegramWebhookEvents.id, existing.id),
							eq(denteTelegramWebhookEvents.organizationId, input.organizationId),
						),
					)
					.returning();

				if (retried) {
					return { claimed: true, event: mapRowToEvent(retried) };
				}
			}

			return { claimed: false, event: mapRowToEvent(existing) };
		});
	} catch (dbError) {
		logger.error(
			{ err: safeLogError(dbError), updateId: input.updateId, organizationId: input.organizationId },
			"Database claim error",
		);
		throw dbError;
	}
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
		return await withTenantCtx(input.organizationId, async (tx) => {
			const [saved] = await tx
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

			if (!saved) {
				throw new Error(
					`Failed to persist Telegram webhook event ${input.updateId} for tenant ${input.organizationId}`,
				);
			}
			return mapRowToEvent(saved);
		});
	} catch (dbError) {
		logger.error(
			{ err: safeLogError(dbError), updateId: input.updateId, organizationId: input.organizationId },
			"Database record error",
		);
		throw dbError;
	}
}

/**
 * Получение списка последних событий вебхуков из PostgreSQL 18 для конкретной клиники.
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

	const scopedOrgId = organizationId?.trim();
	if (!scopedOrgId) {
		logger.warn("listDenteTelegramWebhookEvents called without organizationId — returning empty array (fail-closed)");
		return [];
	}

	try {
		return await withTenantCtx(scopedOrgId, async (tx) => {
			const conditions: SQL[] = [
				eq(denteTelegramWebhookEvents.organizationId, scopedOrgId),
			];
			if (botConfigId) {
				conditions.push(
					eq(denteTelegramWebhookEvents.botConfigId, botConfigId),
				);
			}

			const rows = await tx
				.select()
				.from(denteTelegramWebhookEvents)
				.where(and(...conditions))
				.orderBy(desc(denteTelegramWebhookEvents.createdAt))
				.limit(Math.max(1, Math.min(300, limit)));

			return rows.map(mapRowToEvent);
		});
	} catch (err) {
		logger.warn(
			{ err: safeLogError(err), organizationId: scopedOrgId, botConfigId },
			"Failed to list Telegram webhook events",
		);
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
		return await withTenantCtx(organizationId, async (tx) => {
			const rows = await tx
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
		});
	} catch (err) {
		logger.warn(
			{ err: safeLogError(err), organizationId, botConfigId },
			"Failed to count rejected Telegram link code attempts",
		);
		return 0;
	}
}
