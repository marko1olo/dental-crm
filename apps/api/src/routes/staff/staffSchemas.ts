import { z } from "zod";

export const staffCandidateSchema = z.object({
	id: z.string().uuid().optional(),
	fullName: z.string().optional(),
	snils: z.string().nullable().optional(),
	inn: z.string().nullable().optional(),
	email: z.string().nullable().optional(),
	phone: z.string().nullable().optional(),
});

export type StaffCandidateInput = z.infer<typeof staffCandidateSchema>;

export const evaluatePasswordBodySchema = z.object({
	password: z.string().default(""),
});

export type EvaluatePasswordInput = z.infer<typeof evaluatePasswordBodySchema>;

export const staffIdParamsSchema = z.object({
	staffId: z.string(),
});

export type StaffIdParams = z.infer<typeof staffIdParamsSchema>;

export const verifyStaffPinBodySchema = z.object({
	staffId: z.string().uuid(),
	pinCode: z.string().min(4).max(8),
});

export type VerifyStaffPinBody = z.infer<typeof verifyStaffPinBodySchema>;
