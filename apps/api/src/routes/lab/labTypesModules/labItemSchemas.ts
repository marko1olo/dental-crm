import { z } from "zod";
import {
	VALID_FDI_TOOTH_NUMBERS,
	restorationTypeSchema,
	restorationMaterialSchema,
	stumpPreparationShadeSchema,
	nonNegativeMoneyRubSchema,
} from "@dental/shared";
import {
	normalizeRestorationType,
	normalizeRestorationMaterial,
	normalizeShadeSystem,
	normalizeStumpShade,
} from "./labRestorationNormalizers.js";

const labItemPriceSchema = nonNegativeMoneyRubSchema
	.refine((value) => value <= 100_000_000, {
		message: "Цена заказа лаборатории не помещается в допустимый лимит (100 млн ₽).",
	})
	.optional()
	.nullable();

export const createLabItemSchema = z.object({
	toothFdi: z
		.number()
		.int()
		.refine((val) => VALID_FDI_TOOTH_NUMBERS.has(val), {
			message:
				"Недопустимый биологический номер зуба по стандарту FDI (разрешены только 11–18, 21–28, 31–38, 41–48, 51–55, 61–65, 71–75, 81–85).",
		}),
	restorationType: z
		.preprocess(normalizeRestorationType, restorationTypeSchema)
		.default("crown_monolithic"),
	material: z
		.preprocess(normalizeRestorationMaterial, restorationMaterialSchema)
		.default("zirconia_multilayer_gradient"),
	shadeSystem: z
		.preprocess(normalizeShadeSystem, z.enum(["VITA_CLASSICAL", "VITA_3D_MASTER", "BLEACH"]))
		.default("VITA_CLASSICAL"),
	shadeFinal: z.string().trim().default("A2"),
	shadeStump: z.preprocess(normalizeStumpShade, stumpPreparationShadeSchema.optional().nullable()),
	shadeGingiva: z.string().trim().optional().nullable(),
	translucencyLevel: z.enum(["HT", "ST", "UT", "MO", "LT"]).default("HT"),
	cementGapMicrons: z.number().int().min(0).max(200).default(30),
	extraMarginGapMicrons: z.number().int().min(0).max(100).default(10),
	minimalThicknessMm: z
		.union([z.number(), z.string()])
		.transform(String)
		.default("0.60"),
	implantSystem: z.string().trim().optional().nullable(),
	implantPlatformDiameterMm: z
		.union([z.number(), z.string()])
		.transform(String)
		.optional()
		.nullable(),
	tiBaseHeightMm: z
		.union([z.number(), z.string()])
		.transform(String)
		.optional()
		.nullable(),
	meshTriangleCount: z.number().int().optional().nullable(),
	meshSurfaceAreaMm2: z
		.union([z.number(), z.string()])
		.transform(String)
		.optional()
		.nullable(),
	meshVolumeMm3: z
		.union([z.number(), z.string()])
		.transform(String)
		.optional()
		.nullable(),
	meshBboxMm: z.record(z.unknown()).optional().nullable(),
	isManifold: z.boolean().default(true),
	priceRub: labItemPriceSchema,
});
