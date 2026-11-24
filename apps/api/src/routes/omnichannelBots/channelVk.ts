import { eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { denteVkBotConfigs } from "../../db/schema.js";
import { omnichannelBotEngine } from "../../services/bots/OmnichannelBotEngine.js";
import type { BotInboundMessage } from "../../services/bots/types.js";
import { getVkConfirmationCode } from "../../security/webhookAuth.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Обработка входящих событий VK Callback API (confirmation, message_new).
 * Требует обязательной проверки секретного ключа (Secret Key Callback API)
 * в соответствии со стандартами безопасности и защитой от BOLA/подделки вебхуков.
 */
export async function handleVkWebhook(
	body: Record<string, unknown>,
	organizationId: string,
	incomingSecret?: string | null,
): Promise<{ statusCode: number; payload: string }> {
	if (!UUID_REGEX.test(organizationId)) {
		return {
			statusCode: 400,
			payload: "Bad Request: invalid organizationId UUID",
		};
	}

	const secretFromPayload = typeof body.secret === "string" ? body.secret : null;
	const candidateSecret = incomingSecret ?? secretFromPayload;

	const [cfg] = await withTenantCtx(organizationId, async (tx) =>
		tx
			.select({ secretKey: denteVkBotConfigs.secretKey })
			.from(denteVkBotConfigs)
			.where(eq(denteVkBotConfigs.organizationId, organizationId))
			.limit(1),
	);

	const configuredSecret =
		cfg?.secretKey?.trim() ||
		process.env.VK_WEBHOOK_SECRET?.trim() ||
		process.env.DENTE_WEBHOOK_SECRET?.trim() ||
		null;

	if (!configuredSecret || !candidateSecret || !timingSafeSecretEqual(candidateSecret, configuredSecret)) {
		return {
			statusCode: 403,
			payload: "Forbidden: invalid or missing VK Callback API secret",
		};
	}

	if (body.type === "confirmation") {
		const confirmationCode = await getVkConfirmationCode(organizationId);
		return {
			statusCode: 200,
			payload: confirmationCode,
		};
	}

	if (body.type === "message_new") {
		const msgObj = (body.object as { message?: Record<string, unknown> })?.message;
		if (msgObj) {
			const inbound: BotInboundMessage = {
				channel: "vk",
				organizationId,
				botConfigId: "default",
				senderId: String(msgObj.from_id || ""),
				messageId: String(msgObj.id || body.event_id || ""),
				text: String(msgObj.text || ""),
				payload: typeof msgObj.payload === "string" ? msgObj.payload : null,
				timestamp: Date.now(),
				rawEvent: body,
			};
			await omnichannelBotEngine.dispatchInboundMessage(inbound);
		}
		return { statusCode: 200, payload: "ok" };
	}

	return { statusCode: 200, payload: "ok" };
}

