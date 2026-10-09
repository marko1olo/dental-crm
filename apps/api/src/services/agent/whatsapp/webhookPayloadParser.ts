/**
 * webhookPayloadParser.ts — Layer 1: Inbound Webhook Payload Parsers for Meta WABA, Green API & Wazzup.
 *
 * Invariants:
 * - Pure parsing & normalization, 0 database writes.
 * - Robust input sanitization preventing injection attacks.
 * - Extracts text, button responses, media attachments, and timestamps.
 */

import type { IncomingWhatsAppMessage } from "./types.js";

/**
 * Sanitizes patient input by stripping control characters, prompt-injection artifacts,
 * and markdown/HTML injection tags while preserving natural Russian text and clinical symbols.
 */
export function sanitizePatientInput(text: string): string {
	if (!text) return "";
	return text
		.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
		.replace(
			/(?:system:|<<sys>>|\[inst\]|assistant:|user:|prompt\s*injection)/gi,
			"",
		)
		.replace(/```[\s\S]*?```/g, "")
		.replace(/<[^>]*>?/gm, "")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Parses Meta WhatsApp Business Cloud API incoming webhook structure:
 * { entry: [{ changes: [{ value: { messages: [...] } }] }] }
 */
export function parseMetaWebhookPayload(
	body: unknown,
	organizationId: string,
): IncomingWhatsAppMessage[] {
	if (!body || typeof body !== "object") return [];

	const parsedMessages: IncomingWhatsAppMessage[] = [];
	const raw = body as {
		entry?: Array<{
			changes?: Array<{
				value?: {
					messages?: Array<{
						id?: string;
						from?: string;
						timestamp?: string | number;
						type?: string;
						text?: { body?: string };
						interactive?: {
							button_reply?: { id?: string; title?: string };
							list_reply?: { id?: string; title?: string };
						};
						image?: { id?: string; mime_type?: string; caption?: string };
						document?: { id?: string; filename?: string; caption?: string };
						audio?: { id?: string };
					}>;
					contacts?: Array<{
						profile?: { name?: string };
						wa_id?: string;
					}>;
				};
			}>;
		}>;
	};

	if (!Array.isArray(raw.entry)) return [];

	for (const entry of raw.entry) {
		if (!Array.isArray(entry?.changes)) continue;
		for (const change of entry.changes) {
			const val = change?.value;
			if (!val || !Array.isArray(val.messages)) continue;

			const contactsMap = new Map<string, string>();
			if (Array.isArray(val.contacts)) {
				for (const contact of val.contacts) {
					if (contact.wa_id && contact.profile?.name) {
						contactsMap.set(contact.wa_id, contact.profile.name);
					}
				}
			}

			for (const msg of val.messages) {
				if (!msg || !msg.from) continue;

				const fromPhone = msg.from;
				const messageId = msg.id || `meta_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
				const patientName = contactsMap.get(fromPhone) ?? null;

				let rawText = "";
				let buttonPayload: string | null = null;
				const mediaUrls: string[] = [];

				if (msg.type === "text" && msg.text?.body) {
					rawText = msg.text.body;
				} else if (msg.type === "interactive" && msg.interactive) {
					if (msg.interactive.button_reply) {
						rawText = msg.interactive.button_reply.title || "";
						buttonPayload = msg.interactive.button_reply.id || null;
					} else if (msg.interactive.list_reply) {
						rawText = msg.interactive.list_reply.title || "";
						buttonPayload = msg.interactive.list_reply.id || null;
					}
				} else if (msg.type === "image" && msg.image) {
					rawText = msg.image.caption || "[Фотография / Снимок]";
					if (msg.image.id) mediaUrls.push(`waba_media:${msg.image.id}`);
				} else if (msg.type === "document" && msg.document) {
					rawText = msg.document.caption || msg.document.filename || "[Документ PDF / Снимок]";
					if (msg.document.id) mediaUrls.push(`waba_media:${msg.document.id}`);
				} else if (msg.type === "audio" && msg.audio) {
					rawText = "[Голосовое сообщение]";
					if (msg.audio.id) mediaUrls.push(`waba_media:${msg.audio.id}`);
				}

				const timestampMs = msg.timestamp
					? (typeof msg.timestamp === "number" ? msg.timestamp * 1000 : Number(msg.timestamp) * 1000)
					: Date.now();

				parsedMessages.push({
					messageId,
					fromPhone,
					rawText,
					patientName,
					organizationId,
					channel: "whatsapp",
					buttonPayload,
					mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
					timestamp: new Date(timestampMs),
				});
			}
		}
	}

	return parsedMessages;
}

/**
 * Parses Green API incoming webhook structure:
 * { typeWebhook: "incomingMessageReceived", instanceData: {...}, messageData: {...} }
 */
export function parseGreenApiWebhookPayload(
	body: unknown,
	organizationId: string,
): IncomingWhatsAppMessage | null {
	if (!body || typeof body !== "object") return null;

	const raw = body as {
		typeWebhook?: string;
		idMessage?: string;
		timestamp?: number;
		senderData?: {
			chatId?: string;
			sender?: string;
			senderName?: string;
		};
		messageData?: {
			typeMessage?: string;
			textMessageData?: { textMessage?: string };
			extendedTextMessageData?: { text?: string };
			fileMessageData?: { downloadUrl?: string; caption?: string; fileName?: string };
		};
	};

	if (raw.typeWebhook !== "incomingMessageReceived" && raw.typeWebhook !== "incomingCall") {
		return null;
	}

	const chatId = raw.senderData?.chatId || raw.senderData?.sender || "";
	// e.g. "79161234567@c.us" -> "79161234567"
	const fromPhone = chatId.replace(/@.*$/, "").replace(/\D/g, "");
	if (!fromPhone) return null;

	let rawText = "";
	const mediaUrls: string[] = [];

	if (raw.messageData?.textMessageData?.textMessage) {
		rawText = raw.messageData.textMessageData.textMessage;
	} else if (raw.messageData?.extendedTextMessageData?.text) {
		rawText = raw.messageData.extendedTextMessageData.text;
	} else if (raw.messageData?.fileMessageData) {
		rawText = raw.messageData.fileMessageData.caption || raw.messageData.fileMessageData.fileName || "[Вложение]";
		if (raw.messageData.fileMessageData.downloadUrl) {
			mediaUrls.push(raw.messageData.fileMessageData.downloadUrl);
		}
	}

	const messageId = raw.idMessage || `green_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const timestampMs = raw.timestamp ? raw.timestamp * 1000 : Date.now();

	return {
		messageId,
		fromPhone,
		rawText,
		patientName: raw.senderData?.senderName || null,
		organizationId,
		channel: "whatsapp",
		mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
		timestamp: new Date(timestampMs),
	};
}

/**
 * Universal Inbound WhatsApp Webhook Dispatcher / Normalizer.
 * Supports Meta Cloud API, Green API, and flat DTO objects.
 */
export function parseWhatsAppWebhook(
	body: unknown,
	organizationId = "default",
): IncomingWhatsAppMessage[] {
	if (!body || typeof body !== "object") return [];

	// 1. Check for Meta Cloud API format
	if ("entry" in body && Array.isArray((body as Record<string, unknown>).entry)) {
		return parseMetaWebhookPayload(body, organizationId);
	}

	// 2. Check for Green API format
	if ("typeWebhook" in body) {
		const greenMsg = parseGreenApiWebhookPayload(body, organizationId);
		return greenMsg ? [greenMsg] : [];
	}

	// 3. Fallback: Flat normalized message payload
	const flat = body as Record<string, unknown>;
	const phone = String(flat.fromPhone || flat.phone || flat.patientPhone || "").replace(/\D/g, "");
	const text = String(flat.rawText || flat.text || flat.message || "");
	if (!phone || !text) return [];

	return [
		{
			messageId: String(flat.messageId || flat.id || `inbound_${Date.now()}`),
			fromPhone: phone,
			rawText: text,
			patientName: flat.patientName ? String(flat.patientName) : null,
			patientId: flat.patientId ? String(flat.patientId) : null,
			organizationId: String(flat.organizationId || organizationId),
			channel: String(flat.channel || "whatsapp"),
			timestamp: flat.timestamp ? new Date(flat.timestamp as string | number) : new Date(),
		},
	];
}
