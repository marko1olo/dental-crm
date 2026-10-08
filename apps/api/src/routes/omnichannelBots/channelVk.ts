import { omnichannelBotEngine } from "../../services/bots/OmnichannelBotEngine.js";
import type { BotInboundMessage } from "../../services/bots/types.js";
import { getVkConfirmationCode } from "./webhookAuth.js";

/**
 * Обработка входящих событий VK Callback API (confirmation, message_new).
 */
export async function handleVkWebhook(
	body: Record<string, unknown>,
	organizationId: string,
): Promise<{ statusCode: number; payload: string }> {
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
