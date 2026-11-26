import { z } from "zod";

export type VkWebhookBody = {
	type?: string | undefined;
	event_id?: string | undefined;
	secret?: string | undefined;
	date?: number | undefined;
	object?: {
		message?: {
			id?: number | string | undefined;
			from_id?: number | string | undefined;
			text?: string | undefined;
			date?: number | undefined;
		} | undefined;
	} | undefined;
};

export const connectBotSchema = z
	.object({
		groupId: z.string().trim().min(1, "Укажите ID или короткое имя сообщества"),
		groupToken: z.string().trim().min(1, "Укажите ключ доступа (токен) сообщества"),
		secretKey: z.string().trim().optional(),
		confirmationCode: z.string().trim().optional(),
		isEnabled: z.boolean().default(true),
	})
	.strict();

export const verifyBotSchema = z
	.object({
		groupId: z.string().trim().optional(),
		groupToken: z.string().trim().optional(),
	})
	.strict();

export const connectAccountSchema = z
	.object({
		accessToken: z.string().trim().min(1, "Укажите Access Token пользователя ВКонтакте"),
		vkUserId: z.string().trim().optional(),
	})
	.strict();

export const testVkMessageSchema = z
	.object({
		recipientId: z.string().trim().min(1, "Укажите ID получателя"),
		message: z.string().trim().min(1, "Укажите текст сообщения"),
	})
	.strict();

export const vkWebhookParamsSchema = z
	.object({
		organizationId: z.string().uuid(),
	})
	.strict();

export const vkWebhookBodySchema = z
	.object({
		type: z.string().optional(),
		event_id: z.string().optional(),
		secret: z.string().optional(),
		date: z.number().optional(),
		object: z
			.object({
				message: z
					.object({
						id: z.union([z.number(), z.string()]).optional(),
						from_id: z.union([z.number(), z.string()]).optional(),
						text: z.string().optional(),
						date: z.number().optional(),
					})
					.passthrough()
					.optional(),
			})
			.passthrough()
			.optional(),
	})
	.passthrough();
