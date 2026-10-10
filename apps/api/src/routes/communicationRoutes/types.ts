/**
 * types.ts — Layer 0: Zod Validation Schemas and Type Contracts for Clinical Communications.
 *
 * Covers:
 * - 1-on-1 messaging and task completion contracts
 * - Collaborative chat locking (PostgreSQL 18)
 * - 152-FZ / 323-FZ message templates and macro rendering
 * - Telephony / PBX webhooks & call recordings
 * - Service broadcast campaigns with patient consent verification (152-FZ / 38-FZ)
 */

import { z } from "zod";

export const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const communicationTaskValidationMessage =
	"Задача связи не закрыта: выберите задачу, сотрудника и корректный исход действия.";

export const communicationTaskNotFoundMessage =
	"Задача связи не закрыта: задача не найдена или уже недоступна.";

export const chatIdParamSchema = z.object({
	chatId: z.string().uuid("Идентификатор чата должен быть корректным UUID"),
});
export type ChatIdParam = z.infer<typeof chatIdParamSchema>;

export const lockChatBodySchema = z.object({
	agentName: z.string().min(1).max(200).optional(),
	durationMinutes: z.number().int().min(1).max(60).optional(),
});
export type LockChatBody = z.infer<typeof lockChatBodySchema>;

export const unlockChatBodySchema = z.object({
	agentName: z.string().min(1).max(200).optional(),
	force: z.boolean().optional(),
});
export type UnlockChatBody = z.infer<typeof unlockChatBodySchema>;

export const createTemplateRouteSchema = z.object({
	title: z.string().min(1, "Название шаблона обязательно"),
	channel: z
		.enum(["telegram", "whatsapp", "sms", "vk", "email", "max"])
		.default("telegram"),
	intent: z.string().default("general"),
	templateText: z.string().min(1, "Текст шаблона обязателен"),
	variables: z.array(z.string()).optional(),
	isActive: z.boolean().default(true),
});
export type CreateTemplateRouteInput = z.infer<typeof createTemplateRouteSchema>;

export const renderTemplateRouteSchema = z.object({
	templateId: z.string().uuid().optional(),
	templateText: z.string().optional(),
	channel: z
		.enum(["telegram", "whatsapp", "sms", "vk", "email", "max"])
		.default("telegram"),
	patientId: z.string().uuid().optional(),
	appointmentId: z.string().uuid().optional(),
	visitId: z.string().uuid().optional(),
	variables: z.record(z.any()).optional(),
	allowPreviewFallback: z.boolean().default(true),
	violationHandling: z.enum(["block", "strip"]).default("block"),
});
export type RenderTemplateRouteInput = z.infer<typeof renderTemplateRouteSchema>;

export const sendMessageSchema = z.object({
	message: z.string().trim().min(1, "Текст сообщения не может быть пустым."),
	channel: z
		.enum([
			"phone",
			"sms",
			"whatsapp",
			"telegram",
			"email",
			"in_person",
			"vk",
			"max",
		])
		.default("telegram"),
	idempotencyKey: z.string().min(1).max(128).optional(),
});
export type SendMessageBody = z.infer<typeof sendMessageSchema>;

export const patientSearchQuerySchema = z.object({
	q: z.string().optional(),
});
export type PatientSearchQuery = z.infer<typeof patientSearchQuerySchema>;

export const recordingsParamSchema = z.object({
	id: z.string().uuid("Идентификатор записи должен быть UUID"),
});
export type RecordingsParam = z.infer<typeof recordingsParamSchema>;

export const patientIdParamSchema = z.object({
	patientId: z.string().regex(UUID_REGEX, "Некорректный идентификатор пациента."),
});
export type PatientIdParam = z.infer<typeof patientIdParamSchema>;

export const templateListQuerySchema = z.object({
	channel: z.string().optional(),
	intent: z.string().optional(),
	isActive: z.string().optional(),
});
export type TemplateListQuery = z.infer<typeof templateListQuerySchema>;

export const telephonyWebhookSchema = z.object({
	callId: z.string().min(1, "Идентификатор звонка обязателен"),
	callerNumber: z.string().min(1, "Номер звонящего обязателен"),
	destinationNumber: z.string().optional(),
	direction: z.enum(["inbound", "outbound"]).default("inbound"),
	status: z.enum(["answered", "missed", "busy", "failed"]).default("answered"),
	durationSeconds: z.number().int().nonnegative().optional(),
	recordingUrl: z.string().url().optional(),
	audioFormat: z.string().default("mp3").optional(),
	transcriptionText: z.string().optional(),
	actorUserId: z.string().uuid().optional(),
	clinicId: z.string().uuid().optional(),
});
export type TelephonyWebhookPayload = z.infer<typeof telephonyWebhookSchema>;

export const broadcastCampaignSchema = z.object({
	title: z.string().min(1, "Название рассылки обязательно"),
	templateId: z.string().uuid().optional(),
	templateText: z.string().optional(),
	channel: z.enum(["telegram", "whatsapp", "sms", "vk", "email", "max"]),
	patientIds: z.array(z.string().uuid()).min(1, "Укажите хотя бы одного получателя"),
	serviceType: z
		.enum(["appointment_reminder", "recall", "service_notification"])
		.default("service_notification"),
	respectConsent: z.boolean().default(true),
	scheduledAt: z.string().datetime().optional(),
});
export type BroadcastCampaignPayload = z.infer<typeof broadcastCampaignSchema>;
