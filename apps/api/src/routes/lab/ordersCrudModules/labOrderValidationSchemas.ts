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
	patientId: z.string().uuid().optional(),
});
export type LabOrdersQuery = z.infer<typeof labOrdersQuerySchema>;

export const updateLabOrderSchema = z.object({
	doctorId: z.string().uuid().optional().nullable(),
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
	status: labOrderStatusSchema.optional(),
	stage: z.string().trim().optional().nullable(),
	techStage: z.string().trim().optional().nullable(),
	overrideActive: z.boolean().optional().nullable(),
	overrideReason: z.string().trim().optional().nullable(),
	labComments: z.string().trim().optional().nullable(),
	attachedImageUrl: z.string().trim().optional().nullable(),
});
export type UpdateLabOrderInput = z.infer<typeof updateLabOrderSchema>;

/**
 * Zod schema for CAD/CAM crown orders: Zirconia, E.max, PFM, Custom Abutments, Vita 3D Master
 */
export const cadCamCrownOrderSchema = z.object({
	patientId: z.string().uuid({ message: "Некорректный UUID пациента" }),
	doctorId: z.string().uuid().optional().nullable(),
	toothFdi: toothFdiSchema,
	material: z.enum([
		"zirconia_ml",
		"zirconia_high_translucent",
		"emax_press",
		"emax_cad",
		"cocr_noritake",
		"titanium_custom",
		"pmma_cad",
	]).default("zirconia_ml"),
	colorVita: colorVitaSchema.default("A2"),
	shadeSystem: z.enum(["VITA_CLASSICAL", "VITA_3D_MASTER", "BLEACH"]).default("VITA_CLASSICAL"),
	stumpShade: z.string().trim().optional().nullable(),
	occlusalClearanceMm: z.number().min(0.5).max(3.0).optional().default(1.5),
	finishLineType: z.enum(["chamfer", "shoulder", "feather_edge"]).optional().default("chamfer"),
	clinicalNotes: z.string().trim().optional().nullable(),
	priceRub: labOrderPriceRubSchema,
});
export type CadCamCrownOrderInput = z.infer<typeof cadCamCrownOrderSchema>;

export { createLabOrderSchema };
export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>;
