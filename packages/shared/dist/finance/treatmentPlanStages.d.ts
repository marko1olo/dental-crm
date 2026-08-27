/**
 * MULTI-STAGE TREATMENT PLAN & PENNY-EXACT PAYMENT DISTRIBUTION ENGINE
 * Ported & adapted from Dentalpin treatment_plan module & DENTE clinical workflows.
 *
 * Clinical Architecture:
 * - 4 Phased Clinical Stages:
 *   1. Hygiene & Sanitation (hygiene_sanitation): SRP, calculus removal, hygiene instruction.
 *   2. Endodontics & Therapy (endo_therapy): Caries restorations, root canal obturation.
 *   3. Surgery & Implantology (surgery_implant): Atraumatic extractions, GBR, dental implants.
 *   4. Orthodontics & Prosthetics (ortho_prosthetics): Aligners, brackets, crowns, bridges, veneers.
 *
 * Financial Invariants:
 * - Exact Penny-Balancing Algorithm: $\sum \text{stageAmounts} = \text{grandTotalKopecks}$.
 * - Any division remainder from percentage splits is mathematically allocated to the final stage.
 * - Integer kopecks across all calculations (Zero floating-point currency drift).
 */
import { z } from "zod";
export declare const treatmentPlanStageCategorySchema: z.ZodEnum<["hygiene_sanitation", "endo_therapy", "surgery_implant", "ortho_prosthetics"]>;
export type TreatmentPlanStageCategory = z.infer<typeof treatmentPlanStageCategorySchema>;
export declare const treatmentPlanStageStatusSchema: z.ZodEnum<["draft", "pending", "in_progress", "completed", "cancelled"]>;
export type TreatmentPlanStageStatus = z.infer<typeof treatmentPlanStageStatusSchema>;
export declare const stageItemStatusSchema: z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>;
export type StageItemStatus = z.infer<typeof stageItemStatusSchema>;
export declare const treatmentPlanItemSchema: z.ZodObject<{
    id: z.ZodString;
    stageId: z.ZodOptional<z.ZodString>;
    code804n: z.ZodString;
    nameRu: z.ZodString;
    toothNumber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    surfaces: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    quantity: z.ZodDefault<z.ZodNumber>;
    unitPriceKopecks: z.ZodNumber;
    discountKopecks: z.ZodDefault<z.ZodNumber>;
    totalPriceKopecks: z.ZodNumber;
    status: z.ZodDefault<z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>>;
    assignedDoctorId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: "in_progress" | "completed" | "pending" | "cancelled";
    id: string;
    quantity: number;
    surfaces: string[];
    code804n: string;
    nameRu: string;
    unitPriceKopecks: number;
    discountKopecks: number;
    totalPriceKopecks: number;
    toothNumber?: number | null | undefined;
    stageId?: string | undefined;
    assignedDoctorId?: string | null | undefined;
    completedAt?: string | null | undefined;
}, {
    id: string;
    code804n: string;
    nameRu: string;
    unitPriceKopecks: number;
    totalPriceKopecks: number;
    status?: "in_progress" | "completed" | "pending" | "cancelled" | undefined;
    quantity?: number | undefined;
    toothNumber?: number | null | undefined;
    surfaces?: string[] | undefined;
    stageId?: string | undefined;
    discountKopecks?: number | undefined;
    assignedDoctorId?: string | null | undefined;
    completedAt?: string | null | undefined;
}>;
export type TreatmentPlanItem = z.input<typeof treatmentPlanItemSchema>;
export declare const treatmentPlanStageSchema: z.ZodObject<{
    id: z.ZodString;
    planId: z.ZodString;
    stageNumber: z.ZodNumber;
    category: z.ZodEnum<["hygiene_sanitation", "endo_therapy", "surgery_implant", "ortho_prosthetics"]>;
    titleRu: z.ZodString;
    descriptionRu: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["draft", "pending", "in_progress", "completed", "cancelled"]>>;
    items: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        stageId: z.ZodOptional<z.ZodString>;
        code804n: z.ZodString;
        nameRu: z.ZodString;
        toothNumber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        surfaces: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        quantity: z.ZodDefault<z.ZodNumber>;
        unitPriceKopecks: z.ZodNumber;
        discountKopecks: z.ZodDefault<z.ZodNumber>;
        totalPriceKopecks: z.ZodNumber;
        status: z.ZodDefault<z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>>;
        assignedDoctorId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status: "in_progress" | "completed" | "pending" | "cancelled";
        id: string;
        quantity: number;
        surfaces: string[];
        code804n: string;
        nameRu: string;
        unitPriceKopecks: number;
        discountKopecks: number;
        totalPriceKopecks: number;
        toothNumber?: number | null | undefined;
        stageId?: string | undefined;
        assignedDoctorId?: string | null | undefined;
        completedAt?: string | null | undefined;
    }, {
        id: string;
        code804n: string;
        nameRu: string;
        unitPriceKopecks: number;
        totalPriceKopecks: number;
        status?: "in_progress" | "completed" | "pending" | "cancelled" | undefined;
        quantity?: number | undefined;
        toothNumber?: number | null | undefined;
        surfaces?: string[] | undefined;
        stageId?: string | undefined;
        discountKopecks?: number | undefined;
        assignedDoctorId?: string | null | undefined;
        completedAt?: string | null | undefined;
    }>, "many">>;
    subtotalKopecks: z.ZodDefault<z.ZodNumber>;
    discountKopecks: z.ZodDefault<z.ZodNumber>;
    totalPriceKopecks: z.ZodDefault<z.ZodNumber>;
    allocatedPaymentKopecks: z.ZodDefault<z.ZodNumber>;
    paidAmountKopecks: z.ZodDefault<z.ZodNumber>;
    estimatedDurationDays: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    startDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: "in_progress" | "completed" | "pending" | "draft" | "cancelled";
    id: string;
    items: {
        status: "in_progress" | "completed" | "pending" | "cancelled";
        id: string;
        quantity: number;
        surfaces: string[];
        code804n: string;
        nameRu: string;
        unitPriceKopecks: number;
        discountKopecks: number;
        totalPriceKopecks: number;
        toothNumber?: number | null | undefined;
        stageId?: string | undefined;
        assignedDoctorId?: string | null | undefined;
        completedAt?: string | null | undefined;
    }[];
    category: "hygiene_sanitation" | "endo_therapy" | "surgery_implant" | "ortho_prosthetics";
    discountKopecks: number;
    totalPriceKopecks: number;
    planId: string;
    stageNumber: number;
    titleRu: string;
    subtotalKopecks: number;
    allocatedPaymentKopecks: number;
    paidAmountKopecks: number;
    estimatedDurationDays: number;
    completedAt?: string | null | undefined;
    descriptionRu?: string | null | undefined;
    startDate?: string | null | undefined;
}, {
    id: string;
    category: "hygiene_sanitation" | "endo_therapy" | "surgery_implant" | "ortho_prosthetics";
    planId: string;
    stageNumber: number;
    titleRu: string;
    status?: "in_progress" | "completed" | "pending" | "draft" | "cancelled" | undefined;
    items?: {
        id: string;
        code804n: string;
        nameRu: string;
        unitPriceKopecks: number;
        totalPriceKopecks: number;
        status?: "in_progress" | "completed" | "pending" | "cancelled" | undefined;
        quantity?: number | undefined;
        toothNumber?: number | null | undefined;
        surfaces?: string[] | undefined;
        stageId?: string | undefined;
        discountKopecks?: number | undefined;
        assignedDoctorId?: string | null | undefined;
        completedAt?: string | null | undefined;
    }[] | undefined;
    discountKopecks?: number | undefined;
    totalPriceKopecks?: number | undefined;
    completedAt?: string | null | undefined;
    descriptionRu?: string | null | undefined;
    subtotalKopecks?: number | undefined;
    allocatedPaymentKopecks?: number | undefined;
    paidAmountKopecks?: number | undefined;
    estimatedDurationDays?: number | undefined;
    startDate?: string | null | undefined;
}>;
export type TreatmentPlanStage = z.input<typeof treatmentPlanStageSchema>;
export declare const stagedTreatmentPlanSchema: z.ZodObject<{
    id: z.ZodString;
    clinicId: z.ZodString;
    patientId: z.ZodString;
    planNumber: z.ZodString;
    title: z.ZodString;
    stages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        planId: z.ZodString;
        stageNumber: z.ZodNumber;
        category: z.ZodEnum<["hygiene_sanitation", "endo_therapy", "surgery_implant", "ortho_prosthetics"]>;
        titleRu: z.ZodString;
        descriptionRu: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodDefault<z.ZodEnum<["draft", "pending", "in_progress", "completed", "cancelled"]>>;
        items: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            stageId: z.ZodOptional<z.ZodString>;
            code804n: z.ZodString;
            nameRu: z.ZodString;
            toothNumber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            surfaces: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
            quantity: z.ZodDefault<z.ZodNumber>;
            unitPriceKopecks: z.ZodNumber;
            discountKopecks: z.ZodDefault<z.ZodNumber>;
            totalPriceKopecks: z.ZodNumber;
            status: z.ZodDefault<z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>>;
            assignedDoctorId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            status: "in_progress" | "completed" | "pending" | "cancelled";
            id: string;
            quantity: number;
            surfaces: string[];
            code804n: string;
            nameRu: string;
            unitPriceKopecks: number;
            discountKopecks: number;
            totalPriceKopecks: number;
            toothNumber?: number | null | undefined;
            stageId?: string | undefined;
            assignedDoctorId?: string | null | undefined;
            completedAt?: string | null | undefined;
        }, {
            id: string;
            code804n: string;
            nameRu: string;
            unitPriceKopecks: number;
            totalPriceKopecks: number;
            status?: "in_progress" | "completed" | "pending" | "cancelled" | undefined;
            quantity?: number | undefined;
            toothNumber?: number | null | undefined;
            surfaces?: string[] | undefined;
            stageId?: string | undefined;
            discountKopecks?: number | undefined;
            assignedDoctorId?: string | null | undefined;
            completedAt?: string | null | undefined;
        }>, "many">>;
        subtotalKopecks: z.ZodDefault<z.ZodNumber>;
        discountKopecks: z.ZodDefault<z.ZodNumber>;
        totalPriceKopecks: z.ZodDefault<z.ZodNumber>;
        allocatedPaymentKopecks: z.ZodDefault<z.ZodNumber>;
        paidAmountKopecks: z.ZodDefault<z.ZodNumber>;
        estimatedDurationDays: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        startDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status: "in_progress" | "completed" | "pending" | "draft" | "cancelled";
        id: string;
        items: {
            status: "in_progress" | "completed" | "pending" | "cancelled";
            id: string;
            quantity: number;
            surfaces: string[];
            code804n: string;
            nameRu: string;
            unitPriceKopecks: number;
            discountKopecks: number;
            totalPriceKopecks: number;
            toothNumber?: number | null | undefined;
            stageId?: string | undefined;
            assignedDoctorId?: string | null | undefined;
            completedAt?: string | null | undefined;
        }[];
        category: "hygiene_sanitation" | "endo_therapy" | "surgery_implant" | "ortho_prosthetics";
        discountKopecks: number;
        totalPriceKopecks: number;
        planId: string;
        stageNumber: number;
        titleRu: string;
        subtotalKopecks: number;
        allocatedPaymentKopecks: number;
        paidAmountKopecks: number;
        estimatedDurationDays: number;
        completedAt?: string | null | undefined;
        descriptionRu?: string | null | undefined;
        startDate?: string | null | undefined;
    }, {
        id: string;
        category: "hygiene_sanitation" | "endo_therapy" | "surgery_implant" | "ortho_prosthetics";
        planId: string;
        stageNumber: number;
        titleRu: string;
        status?: "in_progress" | "completed" | "pending" | "draft" | "cancelled" | undefined;
        items?: {
            id: string;
            code804n: string;
            nameRu: string;
            unitPriceKopecks: number;
            totalPriceKopecks: number;
            status?: "in_progress" | "completed" | "pending" | "cancelled" | undefined;
            quantity?: number | undefined;
            toothNumber?: number | null | undefined;
            surfaces?: string[] | undefined;
            stageId?: string | undefined;
            discountKopecks?: number | undefined;
            assignedDoctorId?: string | null | undefined;
            completedAt?: string | null | undefined;
        }[] | undefined;
        discountKopecks?: number | undefined;
        totalPriceKopecks?: number | undefined;
        completedAt?: string | null | undefined;
        descriptionRu?: string | null | undefined;
        subtotalKopecks?: number | undefined;
        allocatedPaymentKopecks?: number | undefined;
        paidAmountKopecks?: number | undefined;
        estimatedDurationDays?: number | undefined;
        startDate?: string | null | undefined;
    }>, "many">;
    totalPriceKopecks: z.ZodNumber;
    totalDiscountKopecks: z.ZodDefault<z.ZodNumber>;
    grandTotalKopecks: z.ZodNumber;
    totalPaidKopecks: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["draft", "pending_acceptance", "active", "completed", "closed", "archived"]>>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "active" | "draft" | "closed" | "pending_acceptance" | "archived";
    id: string;
    patientId: string;
    title: string;
    clinicId: string;
    totalPriceKopecks: number;
    planNumber: string;
    stages: {
        status: "in_progress" | "completed" | "pending" | "draft" | "cancelled";
        id: string;
        items: {
            status: "in_progress" | "completed" | "pending" | "cancelled";
            id: string;
            quantity: number;
            surfaces: string[];
            code804n: string;
            nameRu: string;
            unitPriceKopecks: number;
            discountKopecks: number;
            totalPriceKopecks: number;
            toothNumber?: number | null | undefined;
            stageId?: string | undefined;
            assignedDoctorId?: string | null | undefined;
            completedAt?: string | null | undefined;
        }[];
        category: "hygiene_sanitation" | "endo_therapy" | "surgery_implant" | "ortho_prosthetics";
        discountKopecks: number;
        totalPriceKopecks: number;
        planId: string;
        stageNumber: number;
        titleRu: string;
        subtotalKopecks: number;
        allocatedPaymentKopecks: number;
        paidAmountKopecks: number;
        estimatedDurationDays: number;
        completedAt?: string | null | undefined;
        descriptionRu?: string | null | undefined;
        startDate?: string | null | undefined;
    }[];
    totalDiscountKopecks: number;
    grandTotalKopecks: number;
    totalPaidKopecks: number;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}, {
    id: string;
    patientId: string;
    title: string;
    clinicId: string;
    totalPriceKopecks: number;
    planNumber: string;
    stages: {
        id: string;
        category: "hygiene_sanitation" | "endo_therapy" | "surgery_implant" | "ortho_prosthetics";
        planId: string;
        stageNumber: number;
        titleRu: string;
        status?: "in_progress" | "completed" | "pending" | "draft" | "cancelled" | undefined;
        items?: {
            id: string;
            code804n: string;
            nameRu: string;
            unitPriceKopecks: number;
            totalPriceKopecks: number;
            status?: "in_progress" | "completed" | "pending" | "cancelled" | undefined;
            quantity?: number | undefined;
            toothNumber?: number | null | undefined;
            surfaces?: string[] | undefined;
            stageId?: string | undefined;
            discountKopecks?: number | undefined;
            assignedDoctorId?: string | null | undefined;
            completedAt?: string | null | undefined;
        }[] | undefined;
        discountKopecks?: number | undefined;
        totalPriceKopecks?: number | undefined;
        completedAt?: string | null | undefined;
        descriptionRu?: string | null | undefined;
        subtotalKopecks?: number | undefined;
        allocatedPaymentKopecks?: number | undefined;
        paidAmountKopecks?: number | undefined;
        estimatedDurationDays?: number | undefined;
        startDate?: string | null | undefined;
    }[];
    grandTotalKopecks: number;
    status?: "completed" | "active" | "draft" | "closed" | "pending_acceptance" | "archived" | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    totalDiscountKopecks?: number | undefined;
    totalPaidKopecks?: number | undefined;
}>;
export type StagedTreatmentPlan = z.input<typeof stagedTreatmentPlanSchema>;
export interface StageCategoryMetadata {
    readonly category: TreatmentPlanStageCategory;
    readonly defaultStageNumber: number;
    readonly defaultTitleRu: string;
    readonly shortLabelRu: string;
    readonly descriptionRu: string;
    readonly badgeColor: string;
    readonly typicalServicesRu: readonly string[];
}
export declare const STAGE_CATEGORY_META: Record<TreatmentPlanStageCategory, StageCategoryMetadata>;
export interface StagePaymentSplitResult {
    readonly stageIndex: number;
    readonly stageId?: string | undefined;
    readonly stageTitle: string;
    readonly targetPercentage: number;
    readonly allocatedKopecks: number;
    readonly allocatedRublesFormatted: string;
}
export interface PlanPaymentDistributionSummary {
    readonly grandTotalKopecks: number;
    readonly stageAllocations: readonly StagePaymentSplitResult[];
    readonly isPennyExact: boolean;
    readonly remainderAdjustmentKopecks: number;
}
/**
 * Distributes a total amount in kopecks across stages by percentage weights
 * with strict penny-exact balancing (remainder kopecks added to final stage).
 */
export declare function calculateStagePaymentDistribution(grandTotalKopecks: number, stagePercentages: readonly number[], stageTitles?: readonly string[]): PlanPaymentDistributionSummary;
/**
 * Recalculates all stages and plan-level totals from items with penny-exact validation.
 */
export declare function recalculateTreatmentPlanTotals(stages: readonly TreatmentPlanStage[]): {
    stages: TreatmentPlanStage[];
    totalPriceKopecks: number;
    totalDiscountKopecks: number;
    grandTotalKopecks: number;
    totalPaidKopecks: number;
    completionPercentage: number;
};
