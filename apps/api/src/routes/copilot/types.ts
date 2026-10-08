/**
 * types.ts — Layer 0: Zod Validation Schemas and Types for Copilot Routes.
 */

import { z } from "zod";

export const messageBodySchema = z.object({
	content: z.string().optional(),
	message: z.string().optional(),
	text: z.string().optional(),
	uiContext: z.record(z.unknown()).optional(),
	context: z.record(z.unknown()).optional(),
});

export type MessageBody = z.infer<typeof messageBodySchema>;

export const confirmationBodySchema = z.object({
	sessionId: z.string().optional(),
	callId: z.string().optional(),
	decision: z.enum(["confirm", "reject"]),
	reason: z.string().optional(),
	modifiedArgs: z.record(z.unknown()).optional(),
});

export type ConfirmationBody = z.infer<typeof confirmationBodySchema>;

export const createSessionBodySchema = z.object({
	id: z.string().optional(),
	userId: z.string().optional(),
	patientId: z.string().optional(),
	activeView: z.string().optional(),
	summary: z.string().optional(),
});

export type CreateSessionBody = z.infer<typeof createSessionBodySchema>;

export const listSessionsQuerySchema = z.object({
	userId: z.string().optional(),
	patientId: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional(),
	offset: z.coerce.number().min(0).optional(),
});

export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;

export const getMessagesQuerySchema = z.object({
	limit: z.coerce.number().min(1).max(200).optional(),
	offset: z.coerce.number().min(0).optional(),
	order: z.enum(["asc", "desc"]).optional(),
});

export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;

export const ztlScanBodySchema = z.object({
	organizationId: z.string().uuid().optional(),
	lookAheadHours: z.number().min(1).max(168).optional(),
});

export type ZtlScanBody = z.infer<typeof ztlScanBodySchema>;

export const emrSaviorBodySchema = z.object({
	organizationId: z.string().uuid().optional(),
	targetDate: z.string().optional(),
});

export type EmrSaviorBody = z.infer<typeof emrSaviorBodySchema>;

export const retentionScanBodySchema = z.object({
	organizationId: z.string().uuid().optional(),
});

export type RetentionScanBody = z.infer<typeof retentionScanBodySchema>;

export const gapFillerBodySchema = z.object({
	cancelledAppointmentId: z.string().uuid(),
	organizationId: z.string().uuid().optional(),
	maxCandidates: z.number().min(1).max(20).optional(),
});

export type GapFillerBody = z.infer<typeof gapFillerBodySchema>;

export const proactiveAlertsQuerySchema = z.object({
	organizationId: z.string().uuid().optional(),
	liveScan: z.enum(["true", "false"]).optional(),
});

export type ProactiveAlertsQuery = z.infer<typeof proactiveAlertsQuerySchema>;

export const chairsideSentinelAnalyzeBodySchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	toothNumber: z.union([z.number(), z.string()]).optional(),
	complaints: z.string().optional(),
	diagnoses: z.array(z.string()).optional(),
	allergies: z.array(z.string()).optional(),
	somaticHistory: z.array(z.string()).optional(),
	activeServices: z.array(z.string()).optional(),
	mode: z.enum(["autonomous", "supervised"]).optional(),
	organizationId: z.string().optional(),
});

export type ChairsideSentinelAnalyzeBody = z.infer<
	typeof chairsideSentinelAnalyzeBodySchema
>;

export const autonomousAgentExecuteBodySchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	prompt: z.string().optional(),
	toothNumber: z.union([z.number(), z.string()]).optional(),
	complaints: z.string().optional(),
	diagnoses: z.array(z.string()).optional(),
	allergies: z.array(z.string()).optional(),
	somaticHistory: z.array(z.string()).optional(),
	activeServices: z.array(z.string()).optional(),
	discountPercent: z.number().min(0).max(100).optional(),
	labOrderRequest: z
		.object({
			workType: z.string(),
			material: z.string(),
			vitaShade: z.string(),
			dueDate: z.string(),
			notes: z.string().optional(),
			priceRub: z.number().optional(),
		})
		.optional(),
	appointmentRequest: z
		.object({
			startsAt: z.string(),
			durationMinutes: z.number().optional(),
			reason: z.string(),
			doctorUserId: z.string().optional(),
			chairId: z.string().optional(),
			comment: z.string().optional(),
		})
		.optional(),
	mode: z.enum(["autonomous", "supervised"]).optional(),
	organizationId: z.string().optional(),
});

export type AutonomousAgentExecuteBody = z.infer<
	typeof autonomousAgentExecuteBodySchema
>;
