import { z } from "zod";

export const createTreatmentPlanSchema = z.object({
	patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID"),
	doctorId: z.string().uuid().optional().nullable(),
	name: z.string().trim().min(1).default("План комплексного лечения"),
	title: z.string().trim().optional().default(""),
	totalPriceRub: z.number().nonnegative().optional(),
	planDiscountPercent: z.number().min(0).max(100).optional().default(0),
	planDiscountRub: z.number().nonnegative().optional().default(0),
	discountMode: z.string().optional().default("plan_fixed"),
	stages: z
		.array(
			z.object({
				stageOrder: z.number().int().positive().default(1),
				stageName: z.string().trim().min(1),
				completionPercentage: z.number().int().min(0).max(100).default(0),
				items: z
					.array(
						z.object({
							priceId: z.string().trim().min(1),
							name: z.string().trim().optional(),
							toothNumber: z.number().int().optional().nullable(),
							quantity: z.number().int().positive().default(1),
							price: z.number().nonnegative().default(0),
							discount: z.number().nonnegative().default(0),
							isBundle: z.boolean().default(false),
							doctorId: z.string().uuid().optional().nullable(),
						}),
					)
					.optional()
					.default([]),
			}),
		)
		.optional()
		.default([]),
});

export const updateTreatmentPlanStageSchema = z.object({
	status: z.enum(["planned", "in_progress", "completed", "agreed", "declined"]).optional(),
	completionPercentage: z.number().int().min(0).max(100).optional(),
	stageName: z.string().trim().optional(),
	isCompleted: z.boolean().optional(),
});

export const listTreatmentPlansQuerySchema = z.object({
	patientId: z.string().uuid().optional(),
	status: z.enum(["Draft", "Active", "Approved", "Completed", "Rejected"]).optional(),
	limit: z.coerce.number().int().min(1).max(100).default(50),
	offset: z.coerce.number().int().min(0).default(0),
});

export const updateTreatmentPlanSchema = z.object({
	name: z.string().trim().min(1).optional(),
	title: z.string().trim().optional(),
	status: z.enum(["Draft", "Active", "Approved", "Completed", "Rejected"]).optional(),
	discountMode: z.string().optional(),
	planDiscountPercent: z.number().min(0).max(100).optional(),
	planDiscountRub: z.number().nonnegative().optional(),
});
