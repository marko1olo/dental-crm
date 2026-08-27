/**
 * Dental Laboratory Work Orders & Prosthodontic Job Tracking Engine.
 * Shared domain models, typed Zod schemas, VITA & Natural Die shade catalogs,
 * turnaround SLA calculations, and integer-kopeck financial clearing.
 */

import { z } from "zod";

// ─── WORK TYPES & PROSTHETIC CONSTRUCTIONS ────────────────────────────────────

export const labWorkTypeSchema = z.enum([
	"crown",
	"bridge",
	"denture",
	"implant",
	"veneer",
	"orthodontic",
	"inlay_onlay",
	"splint_nightguard",
	"repair",
	"other",
]);
export type LabWorkType = z.infer<typeof labWorkTypeSchema>;

export const prostheticConstructionTypeSchema = z.enum([
	"single_crown",
	"bridge",
	"veneer",
	"inlay_onlay",
	"all_on_4_6",
	"all_on_arch",
	"implant_abutment",
	"clasp_denture",
	"aligner_nightguard",
	"aligners_nightguard",
	"endocrown",
	"custom",
]);
export type ProstheticConstructionType = z.infer<typeof prostheticConstructionTypeSchema>;

export const prostheticMaterialSchema = z.enum([
	"zirconia_multilayer",
	"emax_lithium_disilicate",
	"pfm_cocr",
	"pmma_temporary",
	"titanium_custom_abutment",
	"peek_biohpp",
	"biocompatible_3d_resin",
	"other",
]);
export type ProstheticMaterial = z.infer<typeof prostheticMaterialSchema>;

// ─── ORDER STATUSES & 7-STAGE PIPELINE ────────────────────────────────────────

export const labOrderStatusSchema = z.enum([
	"draft",
	"sent",
	"in_progress",
	"ready",
	"received",
	"fitted",
	"completed",
	"cancelled",
	"rejected_remake",
]);
export type LabOrderStatus = z.infer<typeof labOrderStatusSchema>;

export const labWorkflowStageSchema = z.enum([
	"impression_sent",
	"sent_to_lab",
	"cad_design",
	"model_cad_design",
	"milling_wax_up",
	"framework_wax_milling",
	"sintering_ceramic_layering",
	"try_in_fitting",
	"fitting_in_mouth",
	"glaze_finish",
	"final_glaze",
	"delivered_to_clinic",
	"installed_in_mouth",
]);
export type LabWorkflowStage = z.infer<typeof labWorkflowStageSchema>;

export const impressionTypeSchema = z.enum([
	"alginate",
	"pvs_silicone",
	"polyether",
	"digital_scan",
	"other",
]);
export type ImpressionType = z.infer<typeof impressionTypeSchema>;

// ─── VITA SHADES & NATURAL DIE STUMP SCALES ───────────────────────────────────

export const vitaClassicalShadeSchema = z.enum([
	"A1",
	"A2",
	"A3",
	"A3.5",
	"A4",
	"B1",
	"B2",
	"B3",
	"B4",
	"C1",
	"C2",
	"C3",
	"C4",
	"D2",
	"D3",
	"D4",
	"OM1",
	"OM2",
	"OM3",
	"BL1",
	"BL2",
	"BL3",
	"BL4",
]);
export type VitaClassicalShade = z.infer<typeof vitaClassicalShadeSchema>;

export const vitaBleachShadeSchema = z.enum([
	"BL1",
	"BL2",
	"BL3",
	"BL4",
	"0M1",
	"0M2",
	"0M3",
]);
export type VitaBleachShade = z.infer<typeof vitaBleachShadeSchema>;

export const vita3dMasterShadeSchema = z.enum([
	"1M1", "1M2",
	"2L1.5", "2L2.5", "2M1", "2M2", "2M3", "2R1.5", "2R2.5",
	"3L1.5", "3L2.5", "3M1", "3M2", "3M3", "3R1.5", "3R2.5",
	"4L1.5", "4L2.5", "4M1", "4M2", "4M3", "4R1.5", "4R2.5",
	"5M1", "5M2", "5M3",
]);
export type Vita3dMasterShade = z.infer<typeof vita3dMasterShadeSchema>;

export const stumpNaturalDieShadeSchema = z.enum([
	"ND1",
	"ND2",
	"ND3",
	"ND4",
	"ND5",
	"ND6",
	"ND7",
	"ND8",
	"ND9",
]);
export type StumpNaturalDieShade = z.infer<typeof stumpNaturalDieShadeSchema>;

// ─── MAIN LAB ORDER SCHEMA ───────────────────────────────────────────────────

export const labOrderSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	clinicId: z.string().uuid().optional().nullable(),
	patientId: z.string().uuid(),
	doctorId: z.string().uuid().optional().nullable(),
	labContactId: z.string().uuid(),
	orderNumber: z.string().min(1).max(50),
	workType: labWorkTypeSchema,
	toothReference: z.string().max(50).optional().nullable(),
	impressionType: impressionTypeSchema.optional().nullable(),
	antagonistInfo: z.string().max(500).optional().nullable(),
	shade: vitaClassicalShadeSchema.optional().nullable(),
	status: labOrderStatusSchema.default("sent"),
	sentDate: z.string(), // YYYY-MM-DD
	expectedDate: z.string().optional().nullable(), // YYYY-MM-DD
	receivedDate: z.string().optional().nullable(), // YYYY-MM-DD
	fittedDate: z.string().optional().nullable(), // YYYY-MM-DD
	costKopecks: z.number().int().nonnegative().default(0),
	notes: z.string().max(2000).optional().nullable(),
	isRemake: z.boolean().default(false),
	remakeReason: z.string().max(500).optional().nullable(),
	createdAt: z.string().datetime().optional(),
	updatedAt: z.string().datetime().optional(),
});
export type LabOrder = z.infer<typeof labOrderSchema>;

// ─── TURNAROUND SLA CALCULATIONS ─────────────────────────────────────────────

/**
 * Standard turnaround SLA days for common lab work types.
 */
export const DEFAULT_LAB_TURNAROUND_DAYS: Record<LabWorkType, number> = {
	crown: 7,
	bridge: 10,
	denture: 14,
	implant: 10,
	veneer: 7,
	orthodontic: 10,
	inlay_onlay: 5,
	splint_nightguard: 5,
	repair: 2,
	other: 7,
};

/**
 * Adds business working days to a start date, skipping weekends (Saturday & Sunday).
 */
export function addBusinessDays(startDate: Date | string, daysToAdd: number): Date {
	const start = typeof startDate === "string" ? new Date(startDate) : new Date(startDate);
	const safeDays = Math.max(0, Math.round(daysToAdd));
	const result = new Date(start.getTime());
	let added = 0;
	while (added < safeDays) {
		result.setDate(result.getDate() + 1);
		const day = result.getDay();
		// Skip weekends (0 = Sunday, 6 = Saturday)
		if (day !== 0 && day !== 6) {
			added++;
		}
	}
	return result;
}

/**
 * Calculates default expected delivery date based on work type and business days.
 */
export function calculateExpectedDeliveryDate(
	sentDate: Date | string,
	workType: LabWorkType,
	customTurnaroundDays?: number,
): Date {
	const daysToAdd = customTurnaroundDays ?? DEFAULT_LAB_TURNAROUND_DAYS[workType] ?? 7;
	return addBusinessDays(sentDate, daysToAdd);
}

/**
 * Evaluates whether a lab order is delayed based on current date.
 */
export function isLabOrderDelayed(order: LabOrder, now: Date = new Date()): boolean {
	if (order.status === "received" || order.status === "fitted" || order.status === "completed" || order.status === "cancelled") {
		return false;
	}
	if (!order.expectedDate) return false;
	const expected = new Date(order.expectedDate);
	return now.getTime() > expected.getTime();
}

/**
 * Validates allowed state transitions for lab orders.
 */
export function canTransitionLabOrderStatus(
	current: LabOrderStatus,
	target: LabOrderStatus,
): boolean {
	if (current === target) return true;

	const transitions: Record<LabOrderStatus, LabOrderStatus[]> = {
		draft: ["sent", "cancelled"],
		sent: ["in_progress", "ready", "received", "cancelled"],
		in_progress: ["ready", "received", "cancelled", "rejected_remake"],
		ready: ["received", "cancelled", "rejected_remake"],
		received: ["fitted", "completed", "rejected_remake"],
		fitted: ["completed", "rejected_remake"],
		completed: ["rejected_remake"],
		cancelled: ["draft", "sent"],
		rejected_remake: ["draft", "sent", "cancelled"],
	};

	return transitions[current]?.includes(target) ?? false;
}

// ─── KOPECK-EXACT FINANCIAL CLEARING (NO FLOATS) ─────────────────────────────

export interface LabFinancialSplitKopecksResult {
	clinicKopecks: number;
	doctorKopecks: number;
	totalKopecks: number;
	clinicAmountRub: number;
	doctorAmountRub: number;
	isBalanced: boolean;
}

/**
 * Strict kopeck-exact calculation of clinic vs doctor split.
 * Invariant: clinicKopecks + doctorKopecks === totalKopecks (Zero penny-drift).
 */
export function calculateLabFinancialSplitKopecks(
	totalKopecks: number,
	doctorSharePct: number,
): LabFinancialSplitKopecksResult {
	const safeTotalKopecks = Math.max(0, Math.round(Number.isFinite(totalKopecks) ? totalKopecks : 0));
	const safeDoctorPct = Math.min(100, Math.max(0, Number.isFinite(doctorSharePct) ? doctorSharePct : 50));

	const doctorKopecks = Math.round((safeTotalKopecks * safeDoctorPct) / 100);
	const clinicKopecks = safeTotalKopecks - doctorKopecks;

	return {
		clinicKopecks,
		doctorKopecks,
		totalKopecks: safeTotalKopecks,
		clinicAmountRub: Number((clinicKopecks / 100).toFixed(2)),
		doctorAmountRub: Number((doctorKopecks / 100).toFixed(2)),
		isBalanced: clinicKopecks + doctorKopecks === safeTotalKopecks,
	};
}

export interface LabOrderFinancialClearingResult {
	patientPriceTotalKopecks: number;
	labCostTotalKopecks: number;
	grossMarginKopecks: number;
	grossMarginPercent: number;
	doctorCommissionKopecks: number;
	doctorPercent: number;
	clinicNetProfitKopecks: number;
	unitsCount: number;
	pricePerUnitKopecks: number;
	costPerUnitKopecks: number;
	isBalanced: boolean;
}

/**
 * Calculates complete order financial clearing in integer kopecks.
 */
export function calculateLabOrderFinancialsKopecks(params: {
	unitsCount: number;
	pricePerUnitKopecks: number;
	costPerUnitKopecks: number;
	doctorPercent?: number;
}): LabOrderFinancialClearingResult {
	const count = Math.max(1, Math.round(params.unitsCount || 1));
	const pricePerUnit = Math.max(0, Math.round(params.pricePerUnitKopecks || 0));
	const costPerUnit = Math.max(0, Math.round(params.costPerUnitKopecks || 0));
	const doctorPct = Math.max(0, Math.min(100, params.doctorPercent ?? 20));

	const patientPriceTotalKopecks = pricePerUnit * count;
	const labCostTotalKopecks = costPerUnit * count;
	const grossMarginKopecks = Math.max(0, patientPriceTotalKopecks - labCostTotalKopecks);

	const grossMarginPercent = patientPriceTotalKopecks > 0
		? Number(((grossMarginKopecks / patientPriceTotalKopecks) * 100).toFixed(1))
		: 0;

	const doctorCommissionKopecks = grossMarginKopecks > 0
		? Math.round((grossMarginKopecks * doctorPct) / 100)
		: 0;

	const clinicNetProfitKopecks = grossMarginKopecks - doctorCommissionKopecks;

	return {
		patientPriceTotalKopecks,
		labCostTotalKopecks,
		grossMarginKopecks,
		grossMarginPercent,
		doctorCommissionKopecks,
		doctorPercent: doctorPct,
		clinicNetProfitKopecks,
		unitsCount: count,
		pricePerUnitKopecks: pricePerUnit,
		costPerUnitKopecks: costPerUnit,
		isBalanced: (doctorCommissionKopecks + clinicNetProfitKopecks) === grossMarginKopecks,
	};
}
