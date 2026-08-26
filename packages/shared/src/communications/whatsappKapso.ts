/**
 * WhatsApp Business API & Kapso Gateway Contracts
 *
 * Provides complete multi-tenant WhatsApp Cloud API & Kapso proxy schemas,
 * webhook validation contracts, interactive button/list payloads, and delivery status tracking.
 */

import { z } from "zod";

// --- Channel & Status Enums ---

export const whatsappMessageStatusSchema = z.enum([
	"queued",
	"sending",
	"sent",
	"delivered",
	"read",
	"failed",
	"received",
]);
export type WhatsappMessageStatus = z.infer<typeof whatsappMessageStatusSchema>;

export const whatsappTemplateCategorySchema = z.enum([
	"AUTHENTICATION",
	"MARKETING",
	"UTILITY",
]);
export type WhatsappTemplateCategory = z.infer<typeof whatsappTemplateCategorySchema>;

export const whatsappInteractiveTypeSchema = z.enum([
	"button",
	"list",
	"button_reply",
	"list_reply",
	"quick_reply",
]);
export type WhatsappInteractiveType = z.infer<typeof whatsappInteractiveTypeSchema>;

// --- Settings & Configuration Schemas ---

export const kapsoSettingsUpdateSchema = z.object({
	apiKey: z.string().trim().min(1).optional().describe("Kapso API key / permanent Meta access token (write-only)"),
	phoneNumberId: z.string().trim().max(64).nullable().optional(),
	businessAccountId: z.string().trim().max(64).nullable().optional(),
	webhookSecret: z.string().trim().max(128).nullable().optional().describe("Webhook verification signing secret (write-only)"),
	displayPhoneNumber: z.string().trim().max(32).nullable().optional(),
	isActive: z.boolean().optional(),
});
export type KapsoSettingsUpdate = z.infer<typeof kapsoSettingsUpdateSchema>;

export const kapsoSettingsResponseSchema = z.object({
	phoneNumberId: z.string().nullable(),
	businessAccountId: z.string().nullable(),
	displayPhoneNumber: z.string().nullable(),
	hasApiKey: z.boolean(),
	hasWebhookSecret: z.boolean(),
	isActive: z.boolean(),
	isVerified: z.boolean(),
	lastVerifiedAt: z.string().datetime().nullable().optional(),
	lastTemplateSyncAt: z.string().datetime().nullable().optional(),
});
export type KapsoSettingsResponse = z.infer<typeof kapsoSettingsResponseSchema>;

export const kapsoTemplateResponseSchema = z.object({
	name: z.string().min(1),
	language: z.string().min(2),
	status: z.string(),
	category: z.string().nullable().optional(),
	syncedAt: z.string().datetime().nullable().optional(),
});
export type KapsoTemplateResponse = z.infer<typeof kapsoTemplateResponseSchema>;

export const kapsoTemplateMapRequestSchema = z.object({
	notificationType: z.string().max(100),
	locale: z.string().max(10),
	templateName: z.string().max(200),
});
export type KapsoTemplateMapRequest = z.infer<typeof kapsoTemplateMapRequestSchema>;

export const kapsoTestRequestSchema = z.object({
	toNumber: z.string().trim().min(6).max(32),
	templateName: z.string().trim().min(1).max(200),
	language: z.string().trim().default("ru"),
});
export type KapsoTestRequest = z.infer<typeof kapsoTestRequestSchema>;

// --- Interactive Payloads (Buttons & Lists) ---

export const whatsappInteractiveButtonSchema = z.object({
	id: z.string().min(1).max(256),
	title: z.string().min(1).max(20),
	payload: z.string().optional(),
});
export type WhatsappInteractiveButton = z.infer<typeof whatsappInteractiveButtonSchema>;

export const whatsappInteractiveSectionRowSchema = z.object({
	id: z.string().min(1).max(200),
	title: z.string().min(1).max(24),
	description: z.string().max(72).optional(),
});
export type WhatsappInteractiveSectionRow = z.infer<typeof whatsappInteractiveSectionRowSchema>;

export const whatsappInteractiveSectionSchema = z.object({
	title: z.string().max(24).optional(),
	rows: z.array(whatsappInteractiveSectionRowSchema).min(1).max(10),
});
export type WhatsappInteractiveSection = z.infer<typeof whatsappInteractiveSectionSchema>;

export const whatsappInteractiveButtonMessageSchema = z.object({
	messaging_product: z.literal("whatsapp").default("whatsapp"),
	recipient_type: z.literal("individual").default("individual"),
	to: z.string().min(6),
	type: z.literal("interactive").default("interactive"),
	interactive: z.object({
		type: z.literal("button"),
		header: z
			.object({
				type: z.enum(["text", "image", "document", "video"]),
				text: z.string().optional(),
			})
			.optional(),
		body: z.object({
			text: z.string().min(1).max(1024),
		}),
		footer: z
			.object({
				text: z.string().max(60),
			})
			.optional(),
		action: z.object({
			buttons: z
				.array(
					z.object({
						type: z.literal("reply").default("reply"),
						reply: z.object({
							id: z.string().min(1).max(256),
							title: z.string().min(1).max(20),
						}),
					}),
				)
				.min(1)
				.max(3),
		}),
	}),
});
export type WhatsappInteractiveButtonMessage = z.infer<typeof whatsappInteractiveButtonMessageSchema>;

export const whatsappInteractiveListMessageSchema = z.object({
	messaging_product: z.literal("whatsapp").default("whatsapp"),
	recipient_type: z.literal("individual").default("individual"),
	to: z.string().min(6),
	type: z.literal("interactive").default("interactive"),
	interactive: z.object({
		type: z.literal("list"),
		header: z
			.object({
				type: z.literal("text"),
				text: z.string().max(60),
			})
			.optional(),
		body: z.object({
			text: z.string().min(1).max(1024),
		}),
		footer: z
			.object({
				text: z.string().max(60),
			})
			.optional(),
		action: z.object({
			button: z.string().min(1).max(20),
			sections: z.array(whatsappInteractiveSectionSchema).min(1).max(10),
		}),
	}),
});
export type WhatsappInteractiveListMessage = z.infer<typeof whatsappInteractiveListMessageSchema>;

// --- Inbound Webhooks & Delivery Status ---

export const whatsappDeliveryStatusSchema = z.object({
	id: z.string(),
	status: z.enum(["sent", "delivered", "read", "failed"]),
	timestamp: z.string().or(z.number()),
	recipient_id: z.string().optional(),
	errors: z
		.array(
			z.object({
				code: z.number().or(z.string()),
				title: z.string().optional(),
				message: z.string().optional(),
			}),
		)
		.optional(),
});
export type WhatsappDeliveryStatus = z.infer<typeof whatsappDeliveryStatusSchema>;

export const whatsappInboundMessageSchema = z.object({
	from: z.string(),
	id: z.string(),
	timestamp: z.string().or(z.number()),
	type: z.string(),
	text: z.object({ body: z.string() }).optional(),
	interactive: z
		.object({
			type: z.enum(["button_reply", "list_reply"]),
			button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
			list_reply: z.object({ id: z.string(), title: z.string(), description: z.string().optional() }).optional(),
		})
		.optional(),
});
export type WhatsappInboundMessage = z.infer<typeof whatsappInboundMessageSchema>;

// --- Pure Helper Functions ---

/**
 * Builds standard named parameters for Meta WABA template body components.
 */
export function buildWhatsappNamedParameters(
	context?: Record<string, unknown>,
): Array<{ type: "text"; parameter_name: string; text: string }> {
	if (!context) return [];
	const skipKeys = new Set(["locale", "password", "token", "auth_secret"]);
	const params: Array<{ type: "text"; parameter_name: string; text: string }> = [];

	for (const [key, value] of Object.entries(context)) {
		if (skipKeys.has(key) || value === null || value === undefined) {
			continue;
		}
		params.push({
			type: "text",
			parameter_name: key,
			text: String(value),
		});
	}

	return params;
}

/**
 * Builds Meta Cloud API template message payload.
 */
export function buildWhatsappTemplatePayload(
	toNumber: string,
	templateName: string,
	languageCode: string,
	parameters: Array<{ type: string; parameter_name?: string; text: string }>,
) {
	return {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: toNumber,
		type: "template",
		template: {
			name: templateName,
			language: { code: languageCode },
			components: parameters.length > 0 ? [{ type: "body", parameters }] : [],
		},
	};
}

/**
 * Builds Meta interactive 1..3 button quick reply message payload.
 */
export function buildWhatsappInteractiveButtons(
	toNumber: string,
	bodyText: string,
	buttons: WhatsappInteractiveButton[],
	headerText?: string,
	footerText?: string,
): WhatsappInteractiveButtonMessage {
	const actionButtons = buttons.slice(0, 3).map((btn) => ({
		type: "reply" as const,
		reply: {
			id: btn.id,
			title: btn.title.slice(0, 20),
		},
	}));

	return {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: toNumber,
		type: "interactive",
		interactive: {
			type: "button",
			...(headerText ? { header: { type: "text" as const, text: headerText } } : {}),
			body: { text: bodyText },
			...(footerText ? { footer: { text: footerText } } : {}),
			action: {
				buttons: actionButtons,
			},
		},
	};
}

/**
 * Builds Meta interactive section list message payload.
 */
export function buildWhatsappInteractiveList(
	toNumber: string,
	bodyText: string,
	buttonTitle: string,
	sections: WhatsappInteractiveSection[],
	headerText?: string,
	footerText?: string,
): WhatsappInteractiveListMessage {
	return {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: toNumber,
		type: "interactive",
		interactive: {
			type: "list",
			...(headerText ? { header: { type: "text" as const, text: headerText } } : {}),
			body: { text: bodyText },
			...(footerText ? { footer: { text: footerText } } : {}),
			action: {
				button: buttonTitle.slice(0, 20),
				sections,
			},
		},
	};
}
