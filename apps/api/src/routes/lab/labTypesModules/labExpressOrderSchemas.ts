import {
	VALID_FDI_TOOTH_NUMBERS,
	isValidVitaShade,
	normalizeVitaShade,
	VITA_SHADE_VALIDATION_MESSAGE,
	nonNegativeMoneyRubSchema,
} from "@dental/shared";
import { z } from "zod";
import { validateFdiToothNotation } from "./labMaterialAndShadeTypes.js";

export const expressLabOrderSchema = z.object({
	patientId: z.string().uuid({ message: "Некорректный UUID пациента" }),
	doctorId: z.string().uuid().optional().nullable(),
	teethFdi: z
		.union([z.string().trim(), z.array(z.number())])
		.refine(
			(val) => Array.isArray(val) ? val.every((num) => VALID_FDI_TOOTH_NUMBERS.has(num)) : validateFdiToothNotation(val),
			{ message: "Недопустимый номер зуба в нотации FDI (11–48, 51–85, 91–98)" },
		)
		.default("16"),
	construction: z.enum([
		"crown_zirconia", "crown_emax", "metal_ceramic",
		"clasp_denture", "aligners", "implant_abutment",
	]).default("crown_zirconia"),
	colorVita: z
		.string()
		.trim()
		.transform((val) => normalizeVitaShade(val))
		.refine((val) => !val || isValidVitaShade(val), { message: VITA_SHADE_VALIDATION_MESSAGE })
		.default("A2"),
	stumpShade: z.string().trim().optional().nullable(),
	dueDate: z.string().optional().nullable(),
	priceRub: nonNegativeMoneyRubSchema.optional().nullable(),
	specialInstructions: z.string().trim().optional().nullable(),
	treatmentPlanAgeDays: z.number().int().nonnegative().optional().nullable(),
	isOneClickPreset: z.boolean().optional().default(false),
	doctorClinicalOverride: z.boolean().optional().default(false),
	doctorOverrideReason: z.string().trim().optional().nullable(),
});

export const checkPlanContinuitySchema = z.object({
	patientId: z.string().uuid(),
	treatmentPlanId: z.string().uuid().optional().nullable(),
	planAgeDays: z.number().int().nonnegative().optional().default(0),
});
