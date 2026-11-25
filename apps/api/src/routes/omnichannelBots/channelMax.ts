import { eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { denteMaxBotConfigs } from "../../db/schema.js";
import { omnichannelBotEngine } from "../../services/bots/OmnichannelBotEngine.js";
import type { BotInboundMessage } from "../../services/bots/types.js";
import {
	isValidWebhookOrganizationId,
	resolveDecryptedWebhookSecret,
} from "../../services/bots/webhookSecretAndReplay.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";

/**
 * Обработка входящих событий корпоративного мессенджера MAX (VK Max) — Национальный корпоративный мессенджер.
 * Защищена обязательной проверкой токена/секрета с расшифровкой enc:v1:... и timingSafeSecretEqual.
 */
export async function handleMaxWebhook(
	body: Record<string, unknown>,
	organizationId: string,
	incomingSecret?: string | null,
): Promise<{ ok: boolean; error?: string; statusCode?: number }> {
	if (!isValidWebhookOrganizationId(organizationId)) {
		return {
			ok: false,
			statusCode: 400,
			error: "Bad Request: invalid organizationId UUID",
		};
	}

	const secretFromPayload =
		typeof body.secret === "string"
			? body.secret
			: typeof body.token === "string"
				? body.token
				: null;
	const candidateSecret = incomingSecret ?? secretFromPayload;

	const [cfg] = await withTenantCtx(organizationId, async (tx) =>
		tx
			.select({
				maxBotToken: denteMaxBotConfigs.maxBotToken,
				tokenSecretRef: denteMaxBotConfigs.tokenSecretRef,
			})
			.from(denteMaxBotConfigs)
			.where(eq(denteMaxBotConfigs.organizationId, organizationId))
			.limit(1),
	);

	const configuredSecret =
		resolveDecryptedWebhookSecret(cfg?.tokenSecretRef, organizationId) ||
		resolveDecryptedWebhookSecret(cfg?.maxBotToken, organizationId) ||
		process.env.MAX_WEBHOOK_SECRET?.trim() ||
		process.env.DENTE_WEBHOOK_SECRET?.trim() ||
		null;

	if (!configuredSecret || !candidateSecret || !timingSafeSecretEqual(candidateSecret, configuredSecret)) {
		return {
			ok: false,
			statusCode: 403,
			error: "Forbidden: invalid or missing MAX webhook secret",
		};
	}

	const inbound: BotInboundMessage = {
		channel: "max",
		organizationId,
		botConfigId: "default",
		senderId: String(body.user_id || body.chat_id || body.sender_id || ""),
		senderName: typeof body.user_name === "string" ? body.user_name : null,
		messageId: typeof body.message_id === "string" ? body.message_id : null,
		text: typeof body.text === "string" ? body.text : "",
		payload: typeof body.payload === "string" ? body.payload : null,
		timestamp: Date.now(),
		rawEvent: body,
	};

	await omnichannelBotEngine.dispatchInboundMessage(inbound);
	return { ok: true, statusCode: 200 };
}

