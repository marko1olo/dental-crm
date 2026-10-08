import { omnichannelBotEngine } from "../../services/bots/OmnichannelBotEngine.js";
import type { BotInboundMessage } from "../../services/bots/types.js";

/**
 * Обработка входящих событий WhatsApp (Green-API и Meta Cloud API).
 */
export async function handleWhatsAppWebhook(
	body: Record<string, unknown>,
	organizationId: string,
): Promise<{ received: boolean }> {
	let inbound: BotInboundMessage | null = null;

	// Green-API format
	if (body.typeWebhook === "incomingMessageReceived") {
		const senderData = body.senderData as { sender?: string; senderName?: string } | undefined;
		const messageData = body.messageData as
			| { textMessageData?: { textMessage?: string } }
			| undefined;

		inbound = {
			channel: "whatsapp",
			organizationId,
			botConfigId: "default",
			senderId: (senderData?.sender || "").replace(/@.*$/, ""),
			senderName: senderData?.senderName || null,
			messageId: String(body.idMessage || ""),
			text: messageData?.textMessageData?.textMessage || "",
			timestamp: Date.now(),
			rawEvent: body,
		};
	}
	// Meta Cloud API format
	else if (Array.isArray(body.entry)) {
		const entry = body.entry[0] as
			| {
					changes?: Array<{
						value?: {
							messages?: Array<{
								id: string;
								from: string;
								text?: { body?: string };
								interactive?: { button_reply?: { id: string } };
							}>;
							contacts?: Array<{ profile?: { name?: string } }>;
						};
					}>;
			  }
			| undefined;

		const msg = entry?.changes?.[0]?.value?.messages?.[0];
		const contact = entry?.changes?.[0]?.value?.contacts?.[0];

		if (msg) {
			inbound = {
				channel: "whatsapp",
				organizationId,
				botConfigId: "default",
				senderId: msg.from,
				senderName: contact?.profile?.name || null,
				messageId: msg.id,
				text: msg.text?.body || "",
				payload: msg.interactive?.button_reply?.id || null,
				timestamp: Date.now(),
				rawEvent: body,
			};
		}
	}

	if (inbound) {
		await omnichannelBotEngine.dispatchInboundMessage(inbound);
	}

	return { received: true };
}

/**
 * Обработка входящих событий корпоративного мессенджера MAX (1C).
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
