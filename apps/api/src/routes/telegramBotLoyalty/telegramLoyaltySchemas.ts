import { z } from "zod";

/**
 * DENTE CRM — Telegram Bot & WebApp Validation Schemas
 * Decomposed under Mandates 8b & 8zi (Sweet spot <= 120 lines).
 */

export const webAppSessionSchema = z.object({
	initData: z.string().optional(),
	organizationId: z.string().min(1),
	patientId: z.string().optional(),
	phone: z.string().optional(),
});

export const toothComplaintSchema = z.object({
	organizationId: z.string().min(1),
	patientId: z.string().min(1),
	toothNumber: z.number().int().min(11).max(85), // FDI 11-48, детские 51-85
	symptom: z.string().min(2).max(100),
	painIntensity: z.number().int().min(1).max(5).optional(),
	notes: z.string().max(500).optional(),
	urgency: z.enum(["cito", "routine"]).optional(),
});

export const webAppBookingSchema = z.object({
	organizationId: z.string().min(1),
	patientId: z.string().min(1),
	doctorId: z.string().min(1),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	time: z.string().regex(/^\d{2}:\d{2}$/),
	serviceName: z.string().max(150).optional(),
	familyMemberPatientId: z.string().optional(),
	complaintNotes: z.string().max(500).optional(),
});

export const referralProcessSchema = z.object({
	organizationId: z.string().min(1),
	refereeTelegramChatId: z.union([z.string(), z.number()]),
	startPayload: z.string().min(1),
	refereeProfile: z
		.object({
			fullName: z.string().optional(),
			phone: z.string().optional(),
			username: z.string().optional(),
		})
		.optional(),
});

export const npsSubmitSchema = z.object({
	organizationId: z.string().min(1),
	appointmentId: z.string().min(1),
	score: z.number().int().min(1).max(10),
	comment: z.string().max(500).optional(),
	telegramChatId: z.union([z.string(), z.number()]).optional(),
});

export const familyConfirmSchema = z.object({
	organizationId: z.string().min(1),
	parentPatientId: z.string().min(1),
	appointmentId: z.string().min(1),
});

export type WebAppSessionInput = z.infer<typeof webAppSessionSchema>;
export type ToothComplaintInputSchema = z.infer<typeof toothComplaintSchema>;
export type WebAppBookingInputSchema = z.infer<typeof webAppBookingSchema>;
export type ReferralProcessInput = z.infer<typeof referralProcessSchema>;
export type NpsSubmitInput = z.infer<typeof npsSubmitSchema>;
export type FamilyConfirmInput = z.infer<typeof familyConfirmSchema>;
