import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../db/rls.js";
import { messengerInboundEvents } from "../../db/schema.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { OmnichannelTokenVault } from "./OmnichannelTokenVault.js";

const logger = createApiLogger("omnichannelWebhookHelpers");

export const WEBHOOK_UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidWebhookOrganizationId(organizationId: string): boolean {
	return WEBHOOK_UUID_REGEX.test(organizationId);
}

/**
 * Безопасное извлечение и расшифровка сохранённого секрета/токена вебхука для организации.
 * При ошибке расшифровки (чужая клиника, битый шифротекст) логирует warn и возвращает null (fail-closed).
 */
export function resolveDecryptedWebhookSecret(
	storedSecret: string | null | undefined,
	organizationId: string,
	log?: { warn: (obj: unknown, msg?: string) => void },
): string | null {
	if (!storedSecret || typeof storedSecret !== "string" || !storedSecret.trim()) {
		return null;
	}
	try {
		return OmnichannelTokenVault.resolveToken(storedSecret, organizationId);
	} catch (err) {
		(log ?? logger).warn(
			{ err: safeLogError(err), organizationId },
			"Failed to decrypt stored omnichannel webhook secret",
		);
		return null;
	}
}

/**
 * Проверка свежести timestamp входящего вебхука (защита от replay-атак старше maxDriftSeconds).
 */
export function checkWebhookTimestampFreshness(
	rawTimestamp: unknown,
	maxDriftSeconds = 300,
): { fresh: boolean; msgTsSec?: number; nowSec?: number } {
	let parsedTs = Number.NaN;
	if (typeof rawTimestamp === "number") {
		parsedTs = rawTimestamp;
	} else if (typeof rawTimestamp === "string") {
		parsedTs = Number.parseInt(rawTimestamp, 10);
	}

	if (!Number.isFinite(parsedTs) || parsedTs <= 0) {
		return { fresh: true };
	}

	const msgTsSec = parsedTs > 1e11 ? Math.floor(parsedTs / 1000) : Math.floor(parsedTs);
	const nowSec = Math.floor(Date.now() / 1000);
	if (Math.abs(nowSec - msgTsSec) > maxDriftSeconds) {
		return { fresh: false, msgTsSec, nowSec };
	}

	return { fresh: true, msgTsSec, nowSec };
}

/**
 * Единая дедупликация и сохранение входящего события вебхука в messenger_inbound_events.
 */
export async function persistInboundWebhookEventIfNew(
	tx: TenantDb,
	params: {
		organizationId: string;
		channel: "vk" | "max" | "telegram" | "whatsapp";
		externalId: string | null;
		externalChatId: string;
		messageText: string | null;
		rawPayload: Record<string, unknown>;
	},
): Promise<{ isReplay: boolean }> {
	if (params.externalId) {
		const existing = await tx
			.select({ id: messengerInboundEvents.id })
			.from(messengerInboundEvents)
			.where(
				and(
					eq(messengerInboundEvents.organizationId, params.organizationId),
					eq(messengerInboundEvents.externalId, params.externalId),
				),
			)
			.limit(1);

		if (existing.length > 0) {
			return { isReplay: true };
		}
	}

	await tx.insert(messengerInboundEvents).values({
		organizationId: params.organizationId,
		channel: params.channel,
		externalId: params.externalId,
		externalChatId: params.externalChatId,
		messageText: params.messageText,
		eventKind: "message",
		rawPayload: params.rawPayload,
	});

	return { isReplay: false };
}
