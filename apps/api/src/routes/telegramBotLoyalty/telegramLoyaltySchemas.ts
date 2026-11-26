import { z } from "zod";

/**
 * DENTE CRM — Telegram Bot & WebApp Validation Schemas
 * Decomposed under Mandates 8b & 8zi (Sweet spot <= 120 lines).
 */

export const webAppSessionSchema = z
	.object({
		initData: z.string().min(1, "initData обязателен для авторизации в Telegram WebApp"),
		organizationId: z.string().uuid("Некорректный идентификатор организации (ожидается UUID)"),
		patientId: z.string().uuid("Некорректный идентификатор пациента").optional(),
		phone: z.string().optional(),
		verificationCode: z.string().optional(),
	})
	.strict();

export const toothComplaintSchema = z
	.object({
		organizationId: z.string().uuid("Некорректный идентификатор организации (ожидается UUID)"),
		patientId: z.string().uuid("Некорректный идентификатор пациента (ожидается UUID)"),
		toothNumber: z.number().int().min(11).max(85), // FDI 11-48, детские 51-85
		symptom: z.string().min(2).max(100),
		painIntensity: z.number().int().min(1).max(5).optional(),
		notes: z.string().max(500).optional(),
		urgency: z.enum(["cito", "routine"]).optional(),
		initData: z.string().min(1).optional(),
	})
	.strict();

export const webAppBookingSchema = z
	.object({
		organizationId: z.string().uuid("Некорректный идентификатор организации (ожидается UUID)"),
		patientId: z.string().uuid("Некорректный идентификатор пациента (ожидается UUID)"),
		doctorId: z.string().uuid("Некорректный идентификатор врача (ожидается UUID)"),
		date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
		time: z.string().regex(/^\d{2}:\d{2}$/),
		serviceName: z.string().max(150).optional(),
		familyMemberPatientId: z.string().uuid("Некорректный идентификатор члена семьи").optional(),
		complaintNotes: z.string().max(500).optional(),
		initData: z.string().min(1).optional(),
	})
	.strict();

export const referralProcessSchema = z
	.object({
		organizationId: z.string().uuid("Некорректный идентификатор организации (ожидается UUID)"),
		refereeTelegramChatId: z.union([z.string(), z.number()]),
		startPayload: z.string().min(1),
		refereeProfile: z
			.object({
				fullName: z.string().optional(),
				phone: z.string().optional(),
				username: z.string().optional(),
			})
			.strict()
			.optional(),
	})
	.strict();

export const npsSubmitSchema = z
	.object({
		organizationId: z.string().uuid("Некорректный идентификатор организации (ожидается UUID)"),
		appointmentId: z.string().uuid("Некорректный идентификатор записи (ожидается UUID)"),
		score: z.number().int().min(1).max(10),
		comment: z.string().max(500).optional(),
		telegramChatId: z.union([z.string(), z.number()]).optional(),
	})
	.strict();

export const familyConfirmSchema = z
	.object({
		organizationId: z.string().uuid("Некорректный идентификатор организации (ожидается UUID)"),
		parentPatientId: z.string().uuid("Некорректный идентификатор родителя (ожидается UUID)"),
		appointmentId: z.string().uuid("Некорректный идентификатор записи (ожидается UUID)"),
	})
	.strict();

export type WebAppSessionInput = z.infer<typeof webAppSessionSchema>;
export type ToothComplaintInputSchema = z.infer<typeof toothComplaintSchema>;
export type WebAppBookingInputSchema = z.infer<typeof webAppBookingSchema>;
export type ReferralProcessInput = z.infer<typeof referralProcessSchema>;
export type NpsSubmitInput = z.infer<typeof npsSubmitSchema>;
export type FamilyConfirmInput = z.infer<typeof familyConfirmSchema>;
