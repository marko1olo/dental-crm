import {
	CLINICAL_TOOTH_STATE_VALUES,
	type ClinicalToothState,
	fdiToothNumberSchema,
	nonNegativeMoneyRubSchema,
	normalizeToothState as sharedNormalizeToothState,
} from "@dental/shared";
import { z } from "zod";
import type {
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../../db/schema.js";

export { CLINICAL_TOOTH_STATE_VALUES, type ClinicalToothState };

/**
 * Единая каноническая функция нормализации клинического состояния зуба.
 * Поддерживает lowercase ("filling" -> "Filled", "extracted" -> "Missing", "healthy" -> "Healthy",
 * "caries" -> "Caries", "pulpitis" -> "Pulpitis", "periodontitis" -> "Periodontitis",
 * "crown" -> "Crown", "implant" -> "Implant", "root" -> "Root", "mobility" -> "Mobility"),
 * а также степени подвижности (I-IV) и вовлечение фуркации.
 */
export function normalizeToothState(rawState: string): ClinicalToothState {
	if (!rawState || typeof rawState !== "string") return "Healthy";
	const trimmed = rawState.trim();
	const lower = trimmed.toLowerCase();

	// Direct lowercase mapping per Defect 1 SSOT
	if (lower === "filling" || lower === "filled" || lower === "пломба" || lower === "пломбирован") return "Filled";
	if (lower === "extracted" || lower === "missing" || lower === "удален" || lower === "удалён" || lower === "отсутствует") return "Missing";
	if (lower === "healthy" || lower === "sound" || lower === "ok" || lower === "norm" || lower === "норма" || lower === "здоров") return "Healthy";
	if (lower === "caries" || lower === "кариес") return "Caries";
	if (lower === "pulpitis" || lower === "пульпит") return "Pulpitis";
	if (lower === "periodontitis" || lower === "периодонтит" || lower === "пародонтит") return "Periodontitis";
	if (lower === "crown" || lower === "коронка") return "Crown";
	if (lower === "planned_crown") return "Planned_Crown";
	if (lower === "implant" || lower === "имплант" || lower === "имплантат") return "Implant";
	if (lower === "planned_implant") return "Planned_Implant";
	if (lower === "root" || lower === "корень") return "Root";
	if (lower === "mobility" || lower === "подвижность") return "Mobility";
	if (lower === "treatment" || lower === "root_canal_treated") return "Root_Canal_Treated";
	if (lower === "impacted") return "Impacted";
	if (lower === "retained" || lower === "ретинированный") return "Retained";
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

	const sharedResult = sharedNormalizeToothState(trimmed);
	if (CLINICAL_TOOTH_STATE_VALUES.includes(sharedResult as ClinicalToothState)) {
		return sharedResult as ClinicalToothState;
	}

	return "Healthy";
}

export const normalizeClinicalToothState = normalizeToothState;

export const clinicalToothStateSchema = z.preprocess(
	(val) => (typeof val === "string" ? normalizeToothState(val) : val),
	z.enum(CLINICAL_TOOTH_STATE_VALUES),
);

export const endoWorkingLengthMmSchema = z
	.union([
		z.number().min(0, "Рабочая длина не может быть отрицательной").max(35, "Рабочая длина не может превышать 35 мм"),
		z.string().trim(),
	])
	.nullable()
	.optional()
	.default("")
	.refine(
		(val) => {
			if (val === undefined || val === null || val === "") return true;
			if (typeof val === "number") {
				return !Number.isNaN(val) && Number.isFinite(val) && val >= 0 && val <= 35;
			}
			if (typeof val === "string") {
				const trimmed = val.trim();
				if (trimmed === "") return true;
				const normalized = trimmed.replace(",", ".");
				const num = Number(normalized);
				return !Number.isNaN(num) && Number.isFinite(num) && num >= 0 && num <= 35;
			}
			return false;
		},
		{ message: "Рабочая длина корневого канала должна быть числом от 0 до 35 мм" },
	);

export const endoCanalMeasurementSchema = z
	.object({
		id: z.string().optional(),
		canalName: z.string().trim().min(1).max(50),
		referencePoint: z.string().trim().max(100).optional().default(""),
		workingLengthMm: endoWorkingLengthMmSchema,
		masterApicalFile: z.string().trim().max(100).optional().default(""),
		masterFile: z.string().trim().max(100).optional().default(""),
		masterCone: z.string().trim().max(100).optional().default(""),
		apexLocatorReading: z.string().trim().max(100).optional().default("0.0 (Apex)"),
		taper: z.string().trim().max(50).optional().default(""),
		obturationTechnique: z.string().trim().max(200).optional().default(""),
		sealer: z.string().trim().max(200).optional().default(""),
		isObliterated: z.boolean().optional().default(false),
		notes: z.string().trim().max(500).optional().default(""),
	})
	.strict();

export const endoToothClinicalDataSchema = z
	.object({
		toothNumber: z.number().optional().nullable(),
		canals: z.array(endoCanalMeasurementSchema).default([]),
		irrigation: z.string().trim().max(1000).optional().nullable(),
		rotarySystem: z.string().trim().max(1000).optional().nullable(),
		radiologyControl: z.string().trim().max(1000).optional().nullable(),
		apexLocator: z.string().trim().max(1000).optional().nullable(),
		stageStamp: z.string().trim().max(50).optional().nullable(),
		notes: z.string().trim().max(2000).optional().nullable(),
		updatedAt: z.string().optional().nullable(),
		mobility: z.number().int().min(0).max(4).optional().nullable(),
		mobilityDegree: z.number().int().min(0).max(4).optional().nullable(),
		resorptionStage: z.number().optional().nullable(),
		pediatricCrownPresent: z.boolean().optional().nullable(),
		secondaryCariesUnderFilling: z.boolean().optional().nullable(),
		isPrimaryPediatric: z.boolean().optional().nullable(),
		isPhysiologicalResorption: z.boolean().optional().nullable(),
	})
	.passthrough();

export type EndoToothClinicalData = z.infer<typeof endoToothClinicalDataSchema>;

export const toothEndoUpsertSchema = z
	.object({
		canals: z.array(endoCanalMeasurementSchema).min(1),
		irrigation: z.string().trim().max(1000).optional(),
		radiologyControl: z.string().trim().max(1000).optional(),
		state: clinicalToothStateSchema.optional(),
		surfaces: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
		visitId: z.string().uuid().optional().nullable(),
	})
	.strict();

export const UUID_SHAPE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const individualToothUpdateSchema = z.object({
	toothNumber: fdiToothNumberSchema,
	state: clinicalToothStateSchema.optional(),
	surfaces: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
	resorptionStage: z.number().optional().nullable(),
	mobility: z.number().int().min(0).max(4).optional().nullable(),
	mobilityDegree: z.number().int().min(0).max(4).optional().nullable(),
	isPrimaryPediatric: z.boolean().optional().nullable(),
	notes: z.string().max(10000).optional().nullable(),
}).strict();

export const batchToothStateSchema = z.object({
	toothNumbers: z.array(fdiToothNumberSchema).min(1).max(64).optional(),
	state: clinicalToothStateSchema.optional().default("Healthy"),
	surfaces: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
	notes: z.string().max(10000).optional().nullable(),
	canalMeasurements: z.array(endoCanalMeasurementSchema).optional().nullable(),
	clinicalData: endoToothClinicalDataSchema.optional().nullable(),
	mobility: z.number().int().min(0).max(4).optional().nullable(),
	mobilityDegree: z.number().int().min(0).max(4).optional().nullable(),
	isPrimaryPediatric: z.boolean().optional().nullable(),
	resorptionStage: z.number().optional().nullable(),
	pediatricCrownPresent: z.boolean().optional().nullable(),
	secondaryCariesUnderFilling: z.boolean().optional().nullable(),
	updates: z.array(individualToothUpdateSchema).max(64).optional(),
	visitId: z
		.string()
		.optional()
		.nullable()
		.transform((v) => (v && UUID_SHAPE.test(v) ? v : null)),
	updatedAt: z.string().optional().nullable(),
	version: z.number().int().nonnegative().optional().nullable(),
	reason: z.string().max(1000).optional().nullable(),
}).strict().refine(
	(data) => (data.toothNumbers && data.toothNumbers.length > 0) || (data.updates && data.updates.length > 0),
	{ message: "Необходимо указать toothNumbers или updates" },
);

export const odontogramStatusMutationSchema = z
	.object({
		patientId: z.string().uuid().optional(),
		toothNumber: fdiToothNumberSchema.optional(),
		toothNumbers: z.array(fdiToothNumberSchema).min(1).max(64).optional(),
		state: clinicalToothStateSchema,
		surfaces: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
		notes: z.string().max(10000).optional().nullable(),
		canalMeasurements: z.array(endoCanalMeasurementSchema).optional().nullable(),
		clinicalData: endoToothClinicalDataSchema.optional().nullable(),
		mobility: z.number().int().min(0).max(4).optional().nullable(),
		mobilityDegree: z.number().int().min(0).max(4).optional().nullable(),
		isPrimaryPediatric: z.boolean().optional().nullable(),
		resorptionStage: z.number().optional().nullable(),
		pediatricCrownPresent: z.boolean().optional().nullable(),
		secondaryCariesUnderFilling: z.boolean().optional().nullable(),
		visitId: z
			.string()
			.optional()
			.nullable()
			.transform((v) => (v && UUID_SHAPE.test(v) ? v : null)),
		updatedAt: z.string().optional().nullable(),
		version: z.number().int().nonnegative().optional().nullable(),
		reason: z.string().max(1000).optional().nullable(),
	})
	.strict()
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
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
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
	id: z.string().uuid().optional().nullable(),
	toothNumber: fdiToothNumberSchema.optional().nullable(),
	priceId: z.string().trim().min(1).max(200).optional().nullable(),
	isCustom: z.boolean().optional().default(false),
	name: z.string().trim().max(500).optional(),
	quantity: z.number().int().min(1).max(999).default(1),
	price: treatmentPlanMoneyRubSchema,
	discount: treatmentPlanMoneyRubSchema.default(0),
	unitPriceKopecks: z.number().int().nonnegative().optional(),
	totalPriceKopecks: z.number().int().nonnegative().optional(),
	phase: z.number().int().min(1).max(12).default(1),
	isAuto: z.boolean().optional(),
	doctorId: z.string().uuid().optional().nullable(),
}).strict();

export const treatmentPlanUpsertSchema = z.object({
	id: z.string().uuid().optional().nullable(),
	name: z.string().trim().min(1).max(300).default("Комплексный план лечения"),
	diagnosisIcd10: z.string().trim().max(50).optional().nullable(),
	diagnosisTitle: z.string().trim().max(500).optional().nullable(),
	status: z
		.enum(["Draft", "Active", "Approved", "Completed", "Rejected"])
		.optional(),
	allowRevision: z.boolean().optional().default(false),
	patientSignature: z.string().max(2_000_000).optional().nullable(),
	items: z.array(treatmentPlanItemSchema).max(500).default([]),
	stages: z
		.array(
			z.object({
				id: z.string().uuid().optional(),
				stageOrder: z.number().int().positive().default(1),
				stageName: z.string().trim().min(1),
				completionPercentage: z.number().int().min(0).max(100).default(0),
			}).strict(),
		)
		.optional(),
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
	isInstallment: z.boolean().optional(),
	installmentMonths: z.number().int().min(1).max(36).optional(),
	downPaymentKopecks: z.number().int().nonnegative().optional(),
	monthlyPaymentKopecks: z.number().int().nonnegative().optional(),
	allowClinicalBlockerOverride: z.boolean().optional().default(true),
	clinicalBlockerOverrideReason: z.string().trim().max(1000).optional().nullable(),
}).strict();

export type TreatmentPlanRow = typeof treatmentPlans.$inferSelect;
export type TreatmentPlanItemRow = typeof treatmentPlanItemsNew.$inferSelect;

export const LEDGER_ID_PREFIX_LENGTH = 32;
export const LEDGER_MAX_SLOT = 0xffff;

export const LEDGER_STATUSES_OWNED_BY_PLAN = new Set<string>(["proposed", "approved"]);
