import {
	CLINICAL_TOOTH_STATE_VALUES,
	type ClinicalToothState,
	fdiToothNumberSchema,
	nonNegativeMoneyRubSchema,
	normalizeToothState,
} from "@dental/shared";
import { z } from "zod";
import type {
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../../db/schema.js";

export { CLINICAL_TOOTH_STATE_VALUES, type ClinicalToothState };

export function normalizeClinicalToothState(val: string): ClinicalToothState {
	const trimmed = val.trim();
	const lower = trimmed.toLowerCase();
	if (lower === "treatment" || lower === "root_canal_treated") return "Root_Canal_Treated";
	if (lower === "extracted") return "Extracted";
	if (lower === "impacted") return "Impacted";
	if (lower === "bridge") return "Bridge";
	if (lower === "bridge_abutment") return "Bridge_Abutment";

	// Periodontal mobility (Arabic & Roman numeral parity)
	if (lower === "mobility_1" || lower === "mobility_i" || lower === "mobility_1_degree") return "Mobility_I";
	if (lower === "mobility_2" || lower === "mobility_ii" || lower === "mobility_2_degree") return "Mobility_II";
	if (lower === "mobility_3" || lower === "mobility_iii" || lower === "mobility_3_degree") return "Mobility_III";
	if (lower === "mobility_4" || lower === "mobility_iv" || lower === "mobility_4_degree") return "Mobility_IV";

	// Furcation involvement (Arabic & Roman numeral parity)
	if (lower === "furcation_1" || lower === "furcation_i" || lower === "furcation_grade_1") return "Furcation_I";
	if (lower === "furcation_2" || lower === "furcation_ii" || lower === "furcation_grade_2") return "Furcation_II";
	if (lower === "furcation_3" || lower === "furcation_iii" || lower === "furcation_grade_3") return "Furcation_III";

	const found = CLINICAL_TOOTH_STATE_VALUES.find((s) => s.toLowerCase() === lower);
	if (found) return found;
	return normalizeToothState(trimmed);
}

export const clinicalToothStateSchema = z.preprocess(
	(val) => (typeof val === "string" ? normalizeClinicalToothState(val) : val),
	z.enum(CLINICAL_TOOTH_STATE_VALUES),
);

export const endoCanalMeasurementSchema = z.object({
	id: z.string().optional(),
	canalName: z.string().trim().min(1).max(50),
	referencePoint: z.string().trim().max(100).optional().default(""),
	workingLengthMm: z.union([z.number(), z.string()]).optional().default(""),
	masterApicalFile: z.string().trim().max(100).optional().default(""),
	taper: z.string().trim().max(50).optional().default(""),
	obturationTechnique: z.string().trim().max(200).optional().default(""),
	sealer: z.string().trim().max(200).optional().default(""),
	isObliterated: z.boolean().optional().default(false),
	notes: z.string().trim().max(500).optional().default(""),
});

export const endoToothClinicalDataSchema = z
	.object({
		toothNumber: z.number().optional(),
		canals: z.array(endoCanalMeasurementSchema).default([]),
		irrigation: z.string().trim().max(1000).optional(),
		rotarySystem: z.string().trim().max(1000).optional(),
		radiologyControl: z.string().trim().max(1000).optional(),
		apexLocator: z.string().trim().max(1000).optional(),
		stageStamp: z.string().trim().max(50).optional(),
		notes: z.string().trim().max(2000).optional(),
		updatedAt: z.string().optional(),
	})
	.passthrough();

export type EndoToothClinicalData = z.infer<typeof endoToothClinicalDataSchema>;

export const toothEndoUpsertSchema = z.object({
	canals: z.array(endoCanalMeasurementSchema).min(1),
	irrigation: z.string().trim().max(1000).optional(),
	radiologyControl: z.string().trim().max(1000).optional(),
	state: clinicalToothStateSchema.optional(),
	surfaces: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
	visitId: z.string().uuid().optional().nullable(),
});

export const UUID_SHAPE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const batchToothStateSchema = z.object({
	toothNumbers: z.array(fdiToothNumberSchema).min(1).max(64),
	state: clinicalToothStateSchema,
	surfaces: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
	notes: z.string().max(10000).optional().nullable(),
	clinicalData: endoToothClinicalDataSchema.optional().nullable(),
	visitId: z
		.string()
		.optional()
		.nullable()
		.transform((v) => (v && UUID_SHAPE.test(v) ? v : null)),
	updatedAt: z.string().optional().nullable(),
	version: z.number().int().nonnegative().optional().nullable(),
	reason: z.string().max(1000).optional().nullable(),
});

export const odontogramStatusMutationSchema = z
	.object({
		patientId: z.string().uuid().optional(),
		toothNumber: fdiToothNumberSchema.optional(),
		toothNumbers: z.array(fdiToothNumberSchema).min(1).max(64).optional(),
		state: clinicalToothStateSchema,
		surfaces: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
		notes: z.string().max(10000).optional().nullable(),
		clinicalData: endoToothClinicalDataSchema.optional().nullable(),
		visitId: z
			.string()
			.optional()
			.nullable()
			.transform((v) => (v && UUID_SHAPE.test(v) ? v : null)),
		updatedAt: z.string().optional().nullable(),
		version: z.number().int().nonnegative().optional().nullable(),
		reason: z.string().max(1000).optional().nullable(),
	})
	.refine(
		(data) =>
			data.toothNumber !== undefined ||
			(data.toothNumbers && data.toothNumbers.length > 0),
		{ message: "Необходимо указать toothNumber или toothNumbers" },
	);

export function parseClinicalDataFromNotes(
	notes: string | null | undefined,
): EndoToothClinicalData | null {
	if (!notes) return null;
	const trimmed = notes.trim();
	if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
	try {
		const parsed = JSON.parse(trimmed);
		if (parsed && typeof parsed === "object" && Array.isArray(parsed.canals)) {
			return parsed as EndoToothClinicalData;
		}
	} catch {
		// Non-JSON notes
	}
	return null;
}

export const treatmentPlanMoneyRubSchema = nonNegativeMoneyRubSchema.refine(
	(value) => value <= 100_000_000,
	{ message: "сумма позиции плана не помещается в допустимый диапазон" },
);

export const treatmentPlanItemSchema = z.object({
	toothNumber: fdiToothNumberSchema.optional().nullable(),
	priceId: z.string().trim().min(1).max(200),
	name: z.string().trim().max(500).optional(),
	quantity: z.number().int().min(1).max(999).default(1),
	price: treatmentPlanMoneyRubSchema,
	discount: treatmentPlanMoneyRubSchema.default(0),
	phase: z.number().int().min(1).max(12).default(1),
	isAuto: z.boolean().optional(),
	doctorId: z.string().uuid().optional().nullable(),
});

export const treatmentPlanUpsertSchema = z.object({
	id: z.string().uuid().optional().nullable(),
	name: z.string().trim().min(1).max(300).default("Комплексный план лечения"),
	status: z
		.enum(["Draft", "Active", "Approved", "Completed", "Rejected"])
		.optional(),
	allowRevision: z.boolean().optional().default(false),
	patientSignature: z.string().max(2_000_000).optional().nullable(),
	items: z.array(treatmentPlanItemSchema).max(500).default([]),
	planGroupId: z.string().uuid().optional().nullable(),
	groupName: z.string().trim().max(300).optional().nullable(),
	isAlternative: z.boolean().optional().default(false),
	alternativeTier: z.string().trim().max(100).optional().nullable(),
	alternativeStatus: z
		.enum(["proposed", "approved", "declined"])
		.optional()
		.default("proposed"),
	declinedReason: z.string().trim().max(1000).optional().nullable(),
	priceFreezePolicy: z
		.enum([
			"standard_30_days",
			"surgery_implant_90_days",
			"ortho_vip_180_days",
			"strict_fixed_contract",
			"market_floating",
		])
		.optional()
		.default("standard_30_days"),
	discountMode: z
		.enum(["none", "plan_fixed", "on_selection"])
		.optional()
		.default("plan_fixed"),
	planDiscountPercent: z.number().min(0).max(100).optional().default(0),
	planDiscountRub: z.number().nonnegative().optional().default(0),
	allowClinicalBlockerOverride: z.boolean().optional().default(true),
	clinicalBlockerOverrideReason: z.string().trim().max(1000).optional().nullable(),
});

export type TreatmentPlanRow = typeof treatmentPlans.$inferSelect;
export type TreatmentPlanItemRow = typeof treatmentPlanItemsNew.$inferSelect;

export const LEDGER_ID_PREFIX_LENGTH = 32;
export const LEDGER_MAX_SLOT = 0xffff;

export const LEDGER_STATUSES_OWNED_BY_PLAN = new Set<string>(["proposed", "approved"]);
