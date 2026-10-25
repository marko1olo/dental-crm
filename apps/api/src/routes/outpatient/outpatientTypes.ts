import {
	assignPatientToothDefectSchema,
	outpatientTemplatesFilterSchema,
	outpatientVerificationStatusSchema,
	toothOrJawCodeSchema,
	updateOutpatientVerificationStatusSchema,
} from "@dental/shared";
import { z } from "zod";

export const getToothDefectsQuerySchema = z.object({
	type: z.enum(["outpatient", "orthodontic", "anomaly"]).optional(),
	key: z.string().optional(),
	activeOnly: z.enum(["true", "false", "1", "0"]).optional(),
});

export const getMkbCategoriesQuerySchema = z.object({
	dentalOnly: z.enum(["true", "false", "1", "0"]).optional(),
	search: z.string().optional(),
	parentId: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(2000).default(500),
	offset: z.coerce.number().int().min(0).default(0),
});

export const getPatientToothDefectsParamsSchema = z.object({
	patientId: z.string().uuid(),
});

export const getPatientToothDefectsQuerySchema = z.object({
	activeOnly: z.enum(["true", "false", "1", "0"]).optional().default("true"),
	toothCode: toothOrJawCodeSchema.optional(),
});

export const deleteDefectParamsSchema = z.object({
	patientId: z.string().uuid(),
	id: z.string().uuid(),
});

export const deleteDefectQuerySchema = z.object({
	resolveOnly: z.enum(["true", "false", "1", "0"]).optional(),
});

export const getVerifyQueueQuerySchema = z.object({
	status: outpatientVerificationStatusSchema.optional(),
	doctorId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
	offset: z.coerce.number().int().min(0).default(0),
});

export const updateVerificationParamsSchema = z.object({
	id: z.string().uuid(),
});

export const checkLockParamsSchema = z.object({
	visitId: z.string().uuid(),
});

export {
	assignPatientToothDefectSchema,
	outpatientTemplatesFilterSchema,
	outpatientVerificationStatusSchema,
	toothOrJawCodeSchema,
	updateOutpatientVerificationStatusSchema,
};
