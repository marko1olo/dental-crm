import { omnichannelBotEngine } from "../../services/bots/OmnichannelBotEngine.js";
import type { BotInboundMessage } from "../../services/bots/types.js";

/**
 * Обработка входящих событий корпоративного мессенджера MAX (VK Max) — Национальный корпоративный мессенджер.
 */
export async function handleMaxWebhook(
	body: Record<string, unknown>,
	organizationId: string,
): Promise<{ ok: boolean }> {
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
	return { ok: true };
}
