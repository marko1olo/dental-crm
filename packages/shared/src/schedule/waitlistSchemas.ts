import { z } from "zod";

export const waitlistTimeRangeSchema = z
	.object({
		day: z.string(),
		slot: z.string(),
		notes: z.string().optional(),
		urgency: z.string().optional(),
		treatmentCategory: z.string().optional(),
	})
	.strict();

export const waitlistCreateSchema = z
	.object({
		patientId: z.string().uuid().or(z.literal("")).nullable().optional(),
		patientName: z.string().optional(),
		patientPhone: z.string().optional(),
		preferredDoctorId: z.string().uuid().nullable().optional(),
		priorityLevel: z.enum(["high", "medium", "low"]).default("medium"),
		notes: z.string().optional(),
		urgency: z.string().optional(),
		treatmentCategory: z.string().optional(),
		preferredTimeRanges: z.array(waitlistTimeRangeSchema).optional(),
	})
	.strict();

export const waitlistUpdateSchema = z
	.object({
		preferredDoctorId: z.string().uuid().nullable().optional(),
		priorityLevel: z.enum(["high", "medium", "low"]).optional(),
		notes: z.string().optional(),
		urgency: z.string().optional(),
		treatmentCategory: z.string().optional(),
		preferredTimeRanges: z.array(waitlistTimeRangeSchema).optional(),
		status: z
			.enum(["active", "waiting", "fulfilled", "booked", "cancelled"])
			.optional(),
	})
	.strict();

export const waitlistStatusSchema = z
	.object({
		status: z.enum(["active", "waiting", "fulfilled", "booked", "cancelled"]),
	})
	.strict();

export const waitlistParamsSchema = z
	.object({
		id: z.string().uuid("Некорректный UUID записи листа ожидания"),
	})
	.strict();

export type WaitlistTimeRange = z.infer<typeof waitlistTimeRangeSchema>;
export type WaitlistCreateInput = z.infer<typeof waitlistCreateSchema>;
export type WaitlistUpdateInput = z.infer<typeof waitlistUpdateSchema>;
export type WaitlistStatusInput = z.infer<typeof waitlistStatusSchema>;
