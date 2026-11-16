import { omnichannelBotEngine } from "../../services/bots/OmnichannelBotEngine.js";
import type { BotInboundMessage } from "../../services/bots/types.js";
import type { TelegramWebhookBody } from "./types.js";

/**
 * Обработка входящих событий Telegram Bot API (сообщения, inline-кнопки callback_query).
 */
export async function handleTelegramWebhook(
	body: Record<string, unknown> | Array<Record<string, unknown>>,
	organizationId: string,
): Promise<{ ok: boolean }> {
	const updates: TelegramWebhookBody[] = Array.isArray(body)
		? (body as TelegramWebhookBody[])
		: Array.isArray((body as Record<string, unknown>).updates)
			? (((body as Record<string, unknown>).updates as unknown) as TelegramWebhookBody[])
			: [body as TelegramWebhookBody];

	for (const tgBody of updates) {
		let inbound: BotInboundMessage | null = null;
		if (tgBody.message) {
			const from = tgBody.message.from;
			inbound = {
				channel: "telegram",
				organizationId,
				botConfigId: "default",
				senderId: String(from?.id || ""),
				senderName: [from?.first_name, from?.last_name].filter(Boolean).join(" ") || null,
				messageId: String(tgBody.message.message_id),
				text: tgBody.message.text || "",
				timestamp: Date.now(),
				rawEvent: tgBody as Record<string, unknown>,
			};
		} else if (tgBody.callback_query) {
			const from = tgBody.callback_query.from;
			inbound = {
				channel: "telegram",
				organizationId,
				botConfigId: "default",
				senderId: String(from?.id || ""),
				senderName: from?.first_name || null,
				messageId: String(tgBody.callback_query.message?.message_id || ""),
				text: "",
				payload: tgBody.callback_query.data || null,
				timestamp: Date.now(),
				rawEvent: tgBody as Record<string, unknown>,
			};
		}

		if (inbound) {
			await omnichannelBotEngine.dispatchInboundMessage(inbound);
		}
	}

	return { ok: true };
}
