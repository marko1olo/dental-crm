/**
 * Dental Laboratory Work Orders & Prosthodontic Job Tracking Engine.
 * Adapted from dentalpin lab_orders module for DENTE Dental CRM.
 *
 * Provides typed Zod schemas, VITA 3D-Master & Classical shade catalog,
 * turnaround SLA calculations, and prosthetic lifecycle state machine.
 */
import { z } from "zod";
export declare const labWorkTypeSchema: z.ZodEnum<["crown", "bridge", "denture", "implant", "veneer", "orthodontic", "inlay_onlay", "splint_nightguard", "repair", "other"]>;
export type LabWorkType = z.infer<typeof labWorkTypeSchema>;
export declare const labOrderStatusSchema: z.ZodEnum<["draft", "sent", "in_progress", "ready", "received", "fitted", "completed", "cancelled", "rejected_remake"]>;
export type LabOrderStatus = z.infer<typeof labOrderStatusSchema>;
export declare const impressionTypeSchema: z.ZodEnum<["alginate", "pvs_silicone", "polyether", "digital_scan", "other"]>;
export type ImpressionType = z.infer<typeof impressionTypeSchema>;
export declare const vitaClassicalShadeSchema: z.ZodEnum<["A1", "A2", "A3", "A3.5", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4", "D2", "D3", "D4", "OM1", "OM2", "OM3", "BL1", "BL2", "BL3", "BL4"]>;
export type VitaClassicalShade = z.infer<typeof vitaClassicalShadeSchema>;
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
    labContactId: string;
    orderNumber: string;
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
    labContactId: string;
    orderNumber: string;
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
