import {
	VALID_FDI_TOOTH_NUMBERS,
	isValidVitaShade,
	normalizeVitaShade,
	VITA_SHADE_VALIDATION_MESSAGE,
	nonNegativeMoneyRubSchema,
} from "@dental/shared";
import { z } from "zod";

export {
	normalizeRestorationType,
	normalizeRestorationMaterial,
	normalizeShadeSystem,
	normalizeStumpShade,
} from "./labRestorationNormalizers.js";

export { CANONICAL_DENTAL_LAB_PRESETS } from "./labCanonicalPresetsData.js";
export { createLabItemSchema } from "./labItemSchemas.js";

export const labOrderPriceRubSchema = nonNegativeMoneyRubSchema
	.refine((value) => value <= 100_000_000, {
		message: "Цена заказа лаборатории не помещается в допустимый лимит (100 млн ₽).",
	})
	.optional()
	.nullable();

export function validateFdiToothNotation(value: string | null | undefined): boolean {
	if (!value) return true;
	const trimmed = value.trim();
	if (!trimmed) return true;
	if (
		/^(общий|челюст|вч|нч|обе|all|general|full|none|арка|капп|сплинт)/i.test(trimmed) ||
		trimmed.includes("Общий") || trimmed.includes("Челюсть")
	) {
		return true;
	}
	const parts = value.split(/[\s,;-]+/).filter(Boolean);
	if (parts.length === 0) return true;
	for (const part of parts) {
		const num = Number.parseInt(part, 10);
		if (Number.isNaN(num) || !VALID_FDI_TOOTH_NUMBERS.has(num)) return false;
	}
	return true;
}

export const toothFdiSchema = z
	.string()
	.trim()
	.refine(validateFdiToothNotation, {
		message: "Недопустимый номер зуба в заказе ЗТЛ. Используйте номера FDI (11–48, 51–85, 91–98).",
	})
	.optional()
	.nullable();

export const colorVitaSchema = z
	.string()
	.trim()
	.transform((val) => normalizeVitaShade(val))
	.refine((val) => !val || isValidVitaShade(val), { message: VITA_SHADE_VALIDATION_MESSAGE })
	.optional()
	.nullable();

export const createLabOrderSchema = z.object({
	patientId: z.string().uuid().optional().nullable(),
	doctorId: z
		.string()
		.optional()
		.nullable()
		.transform((val) => (val && val !== "doc-current" && /^[0-9a-fA-F-]{36}$/.test(val) ? val : null)),
	doctorName: z.string().trim().optional().nullable(),
	toothFdi: toothFdiSchema.optional().nullable(),
	teethFdi: toothFdiSchema.optional().nullable(),
	material: z.string().trim().optional().nullable(),
	materialName: z.string().trim().optional().nullable(),
	construction: z.string().trim().optional().nullable(),
	constructionType: z.string().trim().optional().nullable(),
	jawScope: z.string().trim().optional().nullable(),
	workTypeId: z.string().trim().optional().nullable(),
	colorVita: colorVitaSchema.optional().nullable(),
	shadeCode: z.string().trim().optional().nullable(),
	laboratoryId: z.string().trim().optional().nullable(),
	laboratoryName: z.string().trim().optional().nullable(),
	labName: z.string().trim().optional().nullable(),
	technicianName: z.string().trim().optional().nullable(),
	dueDate: z.string().optional().nullable(),
	expectedLabDate: z.string().optional().nullable(),
	clinicalNotes: z.string().trim().optional().nullable(),
	doctorNotes: z.string().trim().optional().nullable(),
	priceRub: labOrderPriceRubSchema.optional().nullable(),
	costRub: labOrderPriceRubSchema.optional().nullable(),
	labCostRub: labOrderPriceRubSchema.optional().nullable(),
	isWarrantyRework: z.boolean().optional().nullable(),
	warrantyLiabilityType: z.string().trim().optional().nullable(),
	orderNumber: z.string().trim().optional().nullable(),
	status: z.string().trim().optional().nullable(),
	stage: z.string().trim().optional().nullable(),
	techStage: z.string().trim().optional().nullable(),
	overrideActive: z.boolean().optional().nullable(),
	overrideReason: z.string().trim().optional().nullable(),
	clientMutationId: z.string().trim().optional().nullable(),
});

export {
	expressLabOrderSchema,
	checkPlanContinuitySchema,
} from "./labExpressOrderSchemas.js";

