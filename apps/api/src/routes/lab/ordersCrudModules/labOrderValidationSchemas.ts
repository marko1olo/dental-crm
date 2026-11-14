import { labOrderStatusSchema } from "@dental/shared";
import { z } from "zod";
import {
	colorVitaSchema,
	createLabOrderSchema,
	labOrderPriceRubSchema,
	toothFdiSchema,
} from "../types.js";

/**
 * Layer 0: Validation Schemas for Dental Lab Orders CRUD
 */

export const labOrdersQuerySchema = z.object({
	patientId: z
		.string()
		.optional()
		.nullable()
		.transform((val) => (val && val !== "pat_direct" && /^[0-9a-fA-F-]{36}$/.test(val) ? val : undefined)),
});
export type LabOrdersQuery = z.infer<typeof labOrdersQuerySchema>;

export const updateLabOrderSchema = z.object({
	doctorId: z.string().uuid().optional().nullable(),
	treatmentPlanId: z.string().uuid().optional().nullable(),
	appointmentId: z.string().uuid().optional().nullable(),
	visitId: z.string().uuid().optional().nullable(),
	toothFdi: toothFdiSchema.optional().nullable(),
	teethFdi: toothFdiSchema.optional().nullable(),
	material: z.string().trim().optional().nullable(),
	materialName: z.string().trim().optional().nullable(),
	construction: z.string().trim().optional().nullable(),
	colorVita: colorVitaSchema.optional().nullable(),
	shadeCode: z.string().trim().optional().nullable(),
	dueDate: z.string().optional().nullable(),
	expectedLabDate: z.string().optional().nullable(),
	clinicalNotes: z.string().trim().optional().nullable(),
	doctorNotes: z.string().trim().optional().nullable(),
	priceRub: labOrderPriceRubSchema.optional().nullable(),
	costRub: labOrderPriceRubSchema.optional().nullable(),
	labCostRub: labOrderPriceRubSchema.optional().nullable(),
	priceKopecks: z.union([z.number(), z.string(), z.bigint()]).optional().nullable(),
	costKopecks: z.union([z.number(), z.string(), z.bigint()]).optional().nullable(),
	labCostKopecks: z.union([z.number(), z.string(), z.bigint()]).optional().nullable(),
	amountKopecks: z.union([z.number(), z.string(), z.bigint()]).optional().nullable(),
	status: z.string().trim().optional(),
	stage: z.string().trim().optional().nullable(),
	techStage: z.string().trim().optional().nullable(),
	overrideActive: z.boolean().optional().nullable(),
	overrideReason: z.string().trim().optional().nullable(),
	labComments: z.string().trim().optional().nullable(),
	attachedImageUrl: z.string().trim().optional().nullable(),
});
export type UpdateLabOrderInput = z.infer<typeof updateLabOrderSchema>;

export { createLabOrderSchema };
export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>;
