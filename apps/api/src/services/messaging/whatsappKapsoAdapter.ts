/**
 * WhatsApp Meta Cloud API & Kapso Adapter
 *
 * Implements the ChannelAdapter interface for WhatsApp delivery via Meta Cloud API / Kapso proxy.
 * Handles HMAC-SHA256 webhook signature verification, inbound message ingestion,
 * interactive button replies, delivery receipts, and template payload construction.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { denteWhatsappBotConfigs } from "../../db/schema.js";
import type {
	AdapterResult,
	Channel,
	ChannelAdapter,
	DeliveryReceiptEvent,
	InboundWebhookEvent,
	InteractiveButton,
	KapsoConfig,
	OutboundMessage,
} from "./types.js";

const DEFAULT_GRAPH_API_BASE = "https://graph.facebook.com/v21.0";
const KAPSO_API_BASE = "https://api.kapso.ai/meta/whatsapp/v24.0";
const DEFAULT_TIMEOUT_MS = 15_000;

export interface KapsoTemplateItem {
	name: string;
	language: string;
	status: string;
	category?: string | null;
}

export function buildNamedComponents(
	context?: Record<string, unknown>,
): Array<{ type: string; parameters: Array<{ type: string; parameter_name?: string; text: string }> }> {
	if (!context) return [];
	const skipKeys = new Set(["locale", "password", "token"]);
	const parameters: Array<{ type: string; parameter_name: string; text: string }> = [];

	for (const [key, val] of Object.entries(context)) {
		if (skipKeys.has(key) || val === null || val === undefined) {
			continue;
		}
		parameters.push({
			type: "text",
			parameter_name: key,
			text: String(val),
		});
	}

	return parameters.length > 0 ? [{ type: "body", parameters }] : [];
}

export function buildTemplatePayload(
	to: string,
	templateName: string,
	language: string,
	components: Array<{ type: string; parameters: Array<{ type: string; parameter_name?: string; text: string }> }>,
): Record<string, unknown> {
	return {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to,
		type: "template",
		template: {
			name: templateName,
			language: { code: language },
			components,
		},
	};
}

export function buildTextPayload(to: string, bodyText: string): Record<string, unknown> {
	return {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to,
		type: "text",
		text: { preview_url: false, body: bodyText },
	};
}

export function buildInteractiveButtonsPayload(
	to: string,
	bodyText: string,
	buttons: InteractiveButton[],
): Record<string, unknown> {
	const actionButtons = buttons.slice(0, 3).map((btn) => ({
		type: "reply",
		reply: {
			id: btn.id,
			title: btn.title.slice(0, 20),
		},
	}));

	return {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to,
		type: "interactive",
		interactive: {
			type: "button",
			body: { text: bodyText },
			action: {
				buttons: actionButtons,
			},
		},
	};
}

export function verifyWebhookSignature(
	rawBody: Buffer | string,
	signatureHeader: string | null | undefined,
	secret: string,
): boolean {
	if (!signatureHeader || !secret) return false;
	const cleanSignature = signatureHeader.startsWith("sha256=")
		? signatureHeader.slice("sha256=".length).trim()
		: signatureHeader.trim();

	if (!/^[0-9a-f]+$/i.test(cleanSignature)) return false;

	const expected = createHmac("sha256", secret)
		.update(rawBody)
		.digest("hex");

	const providedDigest = createHash("sha256")
		.update(cleanSignature.toLowerCase())
		.digest();
	const expectedDigest = createHash("sha256").update(expected).digest();

	return timingSafeEqual(providedDigest, expectedDigest);
}

export class WhatsappKapsoAdapter implements ChannelAdapter {
	public readonly channel: Channel = "whatsapp";
	public readonly adapterName: string = "whatsapp_kapso";
	private readonly apiBaseUrl: string;
	private readonly timeoutMs: number;

	constructor(options?: { apiBaseUrl?: string; timeoutMs?: number }) {
		this.apiBaseUrl = options?.apiBaseUrl ?? DEFAULT_GRAPH_API_BASE;
		this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	}

	/**
	 * Resolves active credentials for the specified organization.
	 */
	public async getActiveConfig(organizationId: string): Promise<KapsoConfig | null> {
		const [config] = await db
			.select()
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, organizationId))
			.limit(1);

		if (!config || !config.isActive) return null;
		const phoneNumberId = config.phoneNumberId?.trim();
		const accessToken = config.accessToken?.trim() || config.tokenSecretRef?.trim();

		if (!phoneNumberId || !accessToken) return null;

		return {
			phoneNumberId,
			apiKey: accessToken,
			businessAccountId: config.wabaAccountId ?? null,
			webhookSecret: config.webhookVerifyToken ?? null,
			displayPhoneNumber: null,
			isActive: config.isActive,
			isVerified: config.isEnabled,
		};
	}

	public async supports(organizationId: string): Promise<boolean> {
		const config = await this.getActiveConfig(organizationId);
		return config !== null;
	}

	public async send(msg: OutboundMessage): Promise<AdapterResult> {
		const config = await this.getActiveConfig(msg.organizationId);
		if (!config) {
			return {
				status: "failed",
				provider: this.adapterName,
				errorMessage: "WhatsApp / Kapso is not configured or active for this organization",
				sentAt: null,
			};
		}

		let payload: Record<string, unknown>;

		if (msg.messageKind === "session") {
			payload = buildTextPayload(msg.toAddress, msg.bodyText || "");
		} else if (msg.messageKind === "interactive" && msg.buttons && msg.buttons.length > 0) {
			payload = buildInteractiveButtonsPayload(
				msg.toAddress,
				msg.bodyText || "Выберите действие:",
				msg.buttons,
			);
		} else {
			const templateName = msg.providerTemplateName || msg.templateKey;
			const locale = msg.locale || "ru";
			const components = buildNamedComponents(msg.context);
			payload = buildTemplatePayload(msg.toAddress, templateName, locale, components);
		}

		return await this.executePost(config, payload);
	}

	private async executePost(
		config: KapsoConfig,
		payload: Record<string, unknown>,
	): Promise<AdapterResult> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.timeoutMs);
		const url = `${this.apiBaseUrl}/${encodeURIComponent(config.phoneNumberId)}/messages`;

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${config.apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
				signal: controller.signal,
			});

			const data = (await response.json().catch(() => ({}))) as {
				messages?: Array<{ id?: string }>;
				error?: { message?: string; code?: number; error_subcode?: number };
			};

			if (!response.ok) {
				const errorCode = data.error?.code ?? response.status;
				const errorMsg = data.error?.message ?? `WhatsApp provider HTTP ${response.status}`;
				return {
					status: "failed",
					provider: this.adapterName,
					errorMessage: `[${errorCode}] ${errorMsg}`,
					sentAt: null,
					rawResponse: data,
				};
			}

			const wamid = data.messages?.[0]?.id ?? null;
			return {
				status: "sent",
				provider: this.adapterName,
				providerMessageId: wamid,
				sentAt: new Date(),
				rawResponse: data,
			};
		} catch (error) {
			const isAbort = error instanceof Error && error.name === "AbortError";
			return {
				status: "failed",
				provider: this.adapterName,
				errorMessage: isAbort
					? `WhatsApp HTTP timeout after ${this.timeoutMs}ms`
					: `Network error: ${error instanceof Error ? error.message : String(error)}`,
				sentAt: null,
			};
		} finally {
			clearTimeout(timer);
		}
	}

	/**
	 * Lists templates from Meta WABA / Kapso account.
	 */
	public async listTemplates(
		apiKey: string,
		businessAccountId: string,
	): Promise<KapsoTemplateItem[]> {
		const url = `${KAPSO_API_BASE}/${encodeURIComponent(businessAccountId)}/message_templates`;
		const response = await fetch(url, {
			method: "GET",
			headers: {
				"X-API-Key": apiKey,
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to list templates from WhatsApp: HTTP ${response.status}`);
		}

		const data = (await response.json()) as { data?: KapsoTemplateItem[] };
		return data.data ?? [];
	}

	/**
	 * Tests connection by dispatching a test template message.
	 */
	public async testConnection(
		config: KapsoConfig,
		toNumber: string,
		templateName: string,
		language = "ru",
	): Promise<{ success: boolean; error: string | null }> {
		const payload = buildTemplatePayload(toNumber, templateName, language, []);
		const result = await this.executePost(config, payload);
		return {
			success: result.status === "sent",
			error: result.errorMessage ?? null,
		};
	}

	/**
	 * Parses inbound webhook payloads into normalized events.
	 */
	public parseWebhook(
		body: Record<string, unknown>,
		organizationId: string,
	): {
		inboundMessages: InboundWebhookEvent[];
		deliveryReceipts: DeliveryReceiptEvent[];
	} {
		const inboundMessages: InboundWebhookEvent[] = [];
		const deliveryReceipts: DeliveryReceiptEvent[] = [];

		// Handle Kapso simplified webhook format
		const kapsoMessage = body.message as Record<string, unknown> | undefined;
		if (kapsoMessage) {
			const kapsoMeta = kapsoMessage.kapso as Record<string, unknown> | undefined;
			const direction = kapsoMeta?.direction as string | undefined;
			const msgId = String(kapsoMessage.id ?? "");

			if (direction === "inbound") {
				const fromAddr = String(kapsoMessage.from ?? "");
				const textObj = kapsoMessage.text as { body?: string } | undefined;
				const bodyText = textObj?.body ?? String(kapsoMeta?.content ?? "");
				inboundMessages.push({
					organizationId,
					channel: "whatsapp",
					providerMessageId: msgId,
					fromAddress: fromAddr,
					bodyText,
					occurredAt: new Date(),
					rawPayload: body,
				});
			} else if (kapsoMeta?.status && msgId) {
				const statusStr = String(kapsoMeta.status);
				if (statusStr === "delivered" || statusStr === "read" || statusStr === "failed") {
					deliveryReceipts.push({
						organizationId,
						providerMessageId: msgId,
						status: statusStr,
						timestamp: new Date(),
					});
				}
			}
			return { inboundMessages, deliveryReceipts };
		}

		// Handle standard Meta Cloud API webhook format (entry -> changes -> value)
		const entries = Array.isArray(body.entry) ? body.entry : [];
		for (const entry of entries) {
			const changes = Array.isArray(entry?.changes) ? entry.changes : [];
			for (const change of changes) {
				const value = change?.value as Record<string, unknown> | undefined;
				if (!value) continue;

				// Status updates / delivery receipts
				const statuses = Array.isArray(value.statuses) ? value.statuses : [];
				for (const st of statuses) {
					const statusVal = st?.status as string;
					const providerMessageId = st?.id as string;
					if (providerMessageId && (statusVal === "delivered" || statusVal === "read" || statusVal === "failed")) {
						deliveryReceipts.push({
							organizationId,
							providerMessageId,
							status: statusVal,
							timestamp: st.timestamp ? new Date(Number(st.timestamp) * 1000) : new Date(),
							errorCode: st?.errors?.[0]?.code ?? null,
							errorMessage: st?.errors?.[0]?.message ?? null,
						});
					}
				}

				// Messages
				const messages = Array.isArray(value.messages) ? value.messages : [];
				for (const msg of messages) {
					const msgId = msg?.id as string;
					const from = msg?.from as string;
					const textBody = msg?.text?.body as string | undefined;
					const buttonReply = msg?.interactive?.button_reply;

					let interactivePayload: InboundWebhookEvent["interactivePayload"] = null;
					let bodyContent = textBody ?? "";

					if (buttonReply) {
						interactivePayload = {
							type: "button_reply",
							buttonId: buttonReply.id,
							title: buttonReply.title,
						};
						bodyContent = buttonReply.title || buttonReply.id;
					}

					if (msgId && from) {
						inboundMessages.push({
							organizationId,
							channel: "whatsapp",
							providerMessageId: msgId,
							fromAddress: from,
							bodyText: bodyContent,
							occurredAt: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date(),
							interactivePayload,
							rawPayload: msg,
						});
					}
				}
			}
		}

		return { inboundMessages, deliveryReceipts };
	}
}

export const defaultWhatsappAdapter = new WhatsappKapsoAdapter();
