import { z } from "zod";

export const saveBotConfigSchema = z
	.object({
		channel: z.enum(["telegram", "vk", "whatsapp", "max"]),
		botConfigId: z.string().trim().default("default"),
		clinicId: z.string().uuid().nullable().optional(),
		token: z.string().trim().optional(),
		secretKey: z.string().trim().optional(),
		confirmationCode: z.string().trim().optional(),
		groupId: z.string().trim().optional(),
		phoneNumberId: z.string().trim().optional(),
		provider: z.enum(["cloud_api", "green_api"]).optional(),
		greenApiInstanceId: z.string().trim().optional(),
		greenApiToken: z.string().trim().optional(),
		maxBotId: z.string().trim().optional(),
		isActive: z.boolean().default(true),
		enabledPlugins: z.array(z.string()).optional(),
	})
	.strict();

export const testConnectionSchema = z
	.object({
		channelId: z.string().trim().min(1),
	})
	.strict();

export const sendOperatorMessageSchema = z
	.object({
		channel: z.enum(["telegram", "vk", "whatsapp", "max"]),
		senderId: z.string().trim().min(1),
		message: z.string().trim().min(1),
		operatorName: z.string().trim().optional(),
	})
	.strict();

export const testIncomingMessageSchema = z
	.object({
		channel: z.enum(["telegram", "vk", "whatsapp", "max"]).default("telegram"),
		senderId: z.string().trim().default(() => `test-${Date.now()}`),
		senderName: z.string().trim().default("Тестовый Пациент"),
		text: z.string().trim().default("Здравствуйте! Хочу записаться на прием"),
		payload: z.string().trim().nullable().optional(),
	})
	.strict();

export const bookAppointmentBodySchema = z
	.object({
		channel: z.enum(["telegram", "vk", "whatsapp", "max"]).default("telegram"),
		patientId: z.string().uuid("patientId должен быть валидным UUID"),
		doctorUserId: z.string().uuid().optional(),
		startsAt: z.string().min(10, "startsAt обязателен"),
		endsAt: z.string().min(10, "endsAt обязателен"),
		reason: z.string().trim().optional(),
		sendConfirmationToChat: z.boolean().default(true),
		operatorName: z.string().trim().optional(),
	})
	.strict();

export type BookAppointmentBody = z.infer<typeof bookAppointmentBodySchema>;
