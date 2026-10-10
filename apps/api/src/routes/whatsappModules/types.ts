/**
 * whatsappModules/types.ts — Canonical Type Definitions and Schemas for WhatsApp Integration.
 *
 * Layer 0 in DAG hierarchy: pure types, interfaces and Zod validation contracts.
 * Zero runtime side-effects.
 */

import { z } from "zod";

/**
 * WhatsApp webhook delivery and message statuses.
 */
export type WhatsAppDeliveryStatus = "sent" | "delivered" | "read" | "failed";

/**
 * Meta WABA Template categories and statuses.
 */
export type WhatsAppTemplateCategory = "UTILITY" | "MARKETING" | "AUTHENTICATION";
export type WhatsAppTemplateStatus = "approved" | "pending" | "rejected";

export interface WhatsAppTemplateDefinition {
	name: string;
	language: string;
	status: WhatsAppTemplateStatus;
	category: WhatsAppTemplateCategory;
}

/**
 * Configuration schema for updating WhatsApp bot credentials and routing.
 */
export const updateWhatsappConfigSchema = z.object({
	phoneNumberId: z.string().trim().max(64).nullable().optional(),
	// Raw access token — encrypted with AES-256-GCM via OmnichannelTokenVault
	accessToken: z.string().trim().max(512).optional(),
	webhookVerifyToken: z.string().trim().max(128).nullable().optional(),
	provider: z.enum(["cloud_api", "green_api"]).optional(),
	greenApiInstanceId: z.string().trim().max(128).nullable().optional(),
	greenApiToken: z.string().trim().max(512).nullable().optional(),
	enabledFeatures: z.array(z.string()).optional(),
	staffRouting: z
		.object({
			defaultUserId: z.string().uuid().nullable(),
			rules: z
				.array(
					z.object({
						intent: z.string(),
						assignToUserId: z.string().uuid().nullable(),
					}),
				)
				.default([]),
		})
		.optional(),
	isActive: z.boolean().optional(),
});

export type UpdateWhatsappConfigInput = z.infer<typeof updateWhatsappConfigSchema>;

/**
 * Message send input schema.
 */
export const sendWhatsappMessageSchema = z.object({
	patientId: z.string().uuid(),
	message: z.string().min(1),
	idempotencyKey: z.string().trim().max(128).optional(),
});

export type SendWhatsappMessageInput = z.infer<typeof sendWhatsappMessageSchema>;

/**
 * Test message send input schema.
 */
export const sendWhatsappTestMessageSchema = z.object({
	phone: z.string().trim().min(5, "Укажите номер телефона"),
	message: z.string().trim().min(1, "Укажите текст сообщения"),
});

export type SendWhatsappTestMessageInput = z.infer<typeof sendWhatsappTestMessageSchema>;

/**
 * QR Session start schema.
 */
export const qrSessionStartSchema = z.object({
	phone: z.string().trim().max(32).nullable().optional(),
	forceRefresh: z.boolean().optional(),
});

export type QrSessionStartInput = z.infer<typeof qrSessionStartSchema>;

/**
 * QR Simulate authentication schema.
 */
export const qrSimulateAuthSchema = z.object({
	phone: z.string().trim().default("+7 (999) 123-45-67"),
	deviceModel: z.string().trim().default("Рабочий iPhone клиники"),
});

export type QrSimulateAuthInput = z.infer<typeof qrSimulateAuthSchema>;

/**
 * WABA Connect schema.
 */
export const wabaConnectSchema = z.object({
	phoneNumberId: z.string().trim().min(5, "Укажите Phone Number ID"),
	wabaAccountId: z.string().trim().nullable().optional(),
	accessToken: z.string().trim().min(10, "Укажите Access Token"),
	webhookVerifyToken: z.string().trim().nullable().optional(),
});

export type WabaConnectInput = z.infer<typeof wabaConnectSchema>;

/**
 * WABA Test schema.
 */
export const wabaTestSchema = z.object({
	phoneNumberId: z.string().trim().optional(),
	accessToken: z.string().trim().optional(),
});

export type WabaTestInput = z.infer<typeof wabaTestSchema>;

/**
 * WhatsApp Media attachment input and allowed MIME types.
 */
export const ALLOWED_WHATSAPP_MEDIA_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"application/pdf",
] as const;

export type WhatsAppAllowedMediaType = (typeof ALLOWED_WHATSAPP_MEDIA_TYPES)[number];

export interface WhatsAppMediaAttachmentInput {
	patientId: string;
	fileName: string;
	mimeType: WhatsAppAllowedMediaType;
	fileBuffer: Buffer;
	caption?: string;
}

export interface WhatsAppMediaUploadResult {
	ok: boolean;
	mediaId?: string;
	url?: string;
	error?: string;
}

/**
 * Webhook payload structures from Meta Cloud API.
 */
export interface WhatsAppWebhookMessage {
	from: string;
	id: string;
	timestamp: string;
	type: string;
	text?: { body: string };
	interactive?: {
		type: string;
		button_reply?: { id: string; title: string };
		list_reply?: { id: string; title: string };
	};
}

export interface WhatsAppWebhookStatus {
	id: string;
	status: WhatsAppDeliveryStatus;
	timestamp: string;
	recipient_id: string;
}

export interface WhatsAppWebhookChangeValue {
	messaging_product: "whatsapp";
	metadata: { display_phone_number: string; phone_number_id: string };
	contacts?: Array<{ profile: { name: string }; wa_id: string }>;
	messages?: WhatsAppWebhookMessage[];
	statuses?: WhatsAppWebhookStatus[];
}

export interface WhatsAppWebhookEntry {
	id: string;
	changes: Array<{
		value: WhatsAppWebhookChangeValue;
		field: "messages";
	}>;
}

export interface WhatsAppWebhookPayload {
	object: "whatsapp_business_account";
	entry: WhatsAppWebhookEntry[];
}
