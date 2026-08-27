/**
 * Dental Laboratory Work Orders & Prosthodontic Job Tracking Engine.
 * Shared domain models, typed Zod schemas, VITA & Natural Die shade catalogs,
 * turnaround SLA calculations, and integer-kopeck financial clearing.
 */
import { z } from "zod";
export declare const labWorkTypeSchema: z.ZodEnum<["crown", "bridge", "denture", "implant", "veneer", "orthodontic", "inlay_onlay", "splint_nightguard", "repair", "other"]>;
export type LabWorkType = z.infer<typeof labWorkTypeSchema>;
export declare const prostheticConstructionTypeSchema: z.ZodEnum<["single_crown", "bridge", "veneer", "inlay_onlay", "all_on_4_6", "all_on_arch", "implant_abutment", "clasp_denture", "aligner_nightguard", "aligners_nightguard", "endocrown", "custom"]>;
export type ProstheticConstructionType = z.infer<typeof prostheticConstructionTypeSchema>;
export declare const prostheticMaterialSchema: z.ZodEnum<["zirconia_multilayer", "emax_lithium_disilicate", "pfm_cocr", "pmma_temporary", "titanium_custom_abutment", "peek_biohpp", "biocompatible_3d_resin", "other"]>;
export type ProstheticMaterial = z.infer<typeof prostheticMaterialSchema>;
export declare const labOrderStatusSchema: z.ZodEnum<["draft", "sent", "in_progress", "ready", "received", "fitted", "completed", "cancelled", "rejected_remake"]>;
export type LabOrderStatus = z.infer<typeof labOrderStatusSchema>;
export declare const labWorkflowStageSchema: z.ZodEnum<["impression_sent", "sent_to_lab", "cad_design", "model_cad_design", "milling_wax_up", "framework_wax_milling", "sintering_ceramic_layering", "try_in_fitting", "fitting_in_mouth", "glaze_finish", "final_glaze", "delivered_to_clinic", "installed_in_mouth"]>;
export type LabWorkflowStage = z.infer<typeof labWorkflowStageSchema>;
export declare const impressionTypeSchema: z.ZodEnum<["alginate", "pvs_silicone", "polyether", "digital_scan", "other"]>;
export type ImpressionType = z.infer<typeof impressionTypeSchema>;
export declare const vitaClassicalShadeSchema: z.ZodEnum<["A1", "A2", "A3", "A3.5", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4", "D2", "D3", "D4", "OM1", "OM2", "OM3", "BL1", "BL2", "BL3", "BL4"]>;
export type VitaClassicalShade = z.infer<typeof vitaClassicalShadeSchema>;
export declare const vitaBleachShadeSchema: z.ZodEnum<["BL1", "BL2", "BL3", "BL4", "0M1", "0M2", "0M3"]>;
export type VitaBleachShade = z.infer<typeof vitaBleachShadeSchema>;
export declare const vita3dMasterShadeSchema: z.ZodEnum<["1M1", "1M2", "2L1.5", "2L2.5", "2M1", "2M2", "2M3", "2R1.5", "2R2.5", "3L1.5", "3L2.5", "3M1", "3M2", "3M3", "3R1.5", "3R2.5", "4L1.5", "4L2.5", "4M1", "4M2", "4M3", "4R1.5", "4R2.5", "5M1", "5M2", "5M3"]>;
export type Vita3dMasterShade = z.infer<typeof vita3dMasterShadeSchema>;
export declare const stumpNaturalDieShadeSchema: z.ZodEnum<["ND1", "ND2", "ND3", "ND4", "ND5", "ND6", "ND7", "ND8", "ND9"]>;
export type StumpNaturalDieShade = z.infer<typeof stumpNaturalDieShadeSchema>;
export declare const labOrderSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodString;
    clinicId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    patientId: z.ZodString;
    doctorId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    labContactId: z.ZodString;
    orderNumber: z.ZodString;
    workType: z.ZodEnum<["crown", "bridge", "denture", "implant", "veneer", "orthodontic", "inlay_onlay", "splint_nightguard", "repair", "other"]>;
    toothReference: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    impressionType: z.ZodNullable<z.ZodOptional<z.ZodEnum<["alginate", "pvs_silicone", "polyether", "digital_scan", "other"]>>>;
    antagonistInfo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    shade: z.ZodNullable<z.ZodOptional<z.ZodEnum<["A1", "A2", "A3", "A3.5", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4", "D2", "D3", "D4", "OM1", "OM2", "OM3", "BL1", "BL2", "BL3", "BL4"]>>>;
    status: z.ZodDefault<z.ZodEnum<["draft", "sent", "in_progress", "ready", "received", "fitted", "completed", "cancelled", "rejected_remake"]>>;
    sentDate: z.ZodString;
    expectedDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    receivedDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    fittedDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    costKopecks: z.ZodDefault<z.ZodNumber>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isRemake: z.ZodDefault<z.ZodBoolean>;
    remakeReason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "received" | "in_progress" | "completed" | "draft" | "cancelled" | "sent" | "ready" | "fitted" | "rejected_remake";
    patientId: string;
    organizationId: string;
    costKopecks: number;
    orderNumber: string;
    labContactId: string;
    workType: "other" | "implant" | "inlay_onlay" | "veneer" | "crown" | "bridge" | "denture" | "orthodontic" | "splint_nightguard" | "repair";
    sentDate: string;
    isRemake: boolean;
    id?: string | undefined;
    notes?: string | null | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    doctorId?: string | null | undefined;
    clinicId?: string | null | undefined;
    toothReference?: string | null | undefined;
    impressionType?: "other" | "alginate" | "pvs_silicone" | "polyether" | "digital_scan" | null | undefined;
    antagonistInfo?: string | null | undefined;
    shade?: "C1" | "C2" | "C3" | "A1" | "A2" | "A3" | "A3.5" | "A4" | "B1" | "B2" | "B3" | "B4" | "C4" | "D2" | "D3" | "D4" | "OM1" | "OM2" | "OM3" | "BL1" | "BL2" | "BL3" | "BL4" | null | undefined;
    expectedDate?: string | null | undefined;
    receivedDate?: string | null | undefined;
    fittedDate?: string | null | undefined;
    remakeReason?: string | null | undefined;
}, {
    patientId: string;
    organizationId: string;
    orderNumber: string;
    labContactId: string;
    workType: "other" | "implant" | "inlay_onlay" | "veneer" | "crown" | "bridge" | "denture" | "orthodontic" | "splint_nightguard" | "repair";
    sentDate: string;
    status?: "received" | "in_progress" | "completed" | "draft" | "cancelled" | "sent" | "ready" | "fitted" | "rejected_remake" | undefined;
    id?: string | undefined;
    notes?: string | null | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    doctorId?: string | null | undefined;
    clinicId?: string | null | undefined;
    costKopecks?: number | undefined;
    toothReference?: string | null | undefined;
    impressionType?: "other" | "alginate" | "pvs_silicone" | "polyether" | "digital_scan" | null | undefined;
    antagonistInfo?: string | null | undefined;
    shade?: "C1" | "C2" | "C3" | "A1" | "A2" | "A3" | "A3.5" | "A4" | "B1" | "B2" | "B3" | "B4" | "C4" | "D2" | "D3" | "D4" | "OM1" | "OM2" | "OM3" | "BL1" | "BL2" | "BL3" | "BL4" | null | undefined;
    expectedDate?: string | null | undefined;
    receivedDate?: string | null | undefined;
    fittedDate?: string | null | undefined;
    isRemake?: boolean | undefined;
    remakeReason?: string | null | undefined;
}>;
export type LabOrder = z.infer<typeof labOrderSchema>;
/**
 * Standard turnaround SLA days for common lab work types.
 */
export declare const DEFAULT_LAB_TURNAROUND_DAYS: Record<LabWorkType, number>;
/**
 * Adds business working days to a start date, skipping weekends (Saturday & Sunday).
 */
export declare function addBusinessDays(startDate: Date | string, daysToAdd: number): Date;
/**
 * Calculates default expected delivery date based on work type and business days.
 */
export declare function calculateExpectedDeliveryDate(sentDate: Date | string, workType: LabWorkType, customTurnaroundDays?: number): Date;
/**
 * Evaluates whether a lab order is delayed based on current date.
 */
export declare function isLabOrderDelayed(order: LabOrder, now?: Date): boolean;
/**
 * Validates allowed state transitions for lab orders.
 */
export declare function canTransitionLabOrderStatus(current: LabOrderStatus, target: LabOrderStatus): boolean;
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
export declare function calculateLabFinancialSplitKopecks(totalKopecks: number, doctorSharePct: number): LabFinancialSplitKopecksResult;
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
export declare function calculateLabOrderFinancialsKopecks(params: {
    unitsCount: number;
    pricePerUnitKopecks: number;
    costPerUnitKopecks: number;
    doctorPercent?: number;
}): LabOrderFinancialClearingResult;
