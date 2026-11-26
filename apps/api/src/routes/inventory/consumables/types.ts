/**
 * types.ts — Layer 0: Zod schemas and TypeScript contracts for Treatment Consumables,
 * Technological Card (BOM) norms, FEFO batch allocation, and Visit Stock Write-Offs.
 */

import {
	clinicalConsumableNormSchema,
	consumableLinkCreateSchema,
	consumableLinkUpdateSchema,
	stockAvailabilityCheckRequestSchema,
	toothTreatmentStockDeductionRequestSchema,
	treatmentConsumableDeductionRequestSchema,
	treatmentConsumableLinkCreateSchema,
	visitStockDeductionRequestSchema,
} from "@dental/shared";
import { z } from "zod";

export {
	clinicalConsumableNormSchema,
	consumableLinkCreateSchema,
	consumableLinkUpdateSchema,
	stockAvailabilityCheckRequestSchema,
	toothTreatmentStockDeductionRequestSchema,
	treatmentConsumableDeductionRequestSchema,
	treatmentConsumableLinkCreateSchema,
	visitStockDeductionRequestSchema,
};

export const visitClinicalWriteoffRequestSchema = z.object({
	visitId: z.string().min(1, { message: "Укажите ID приёма" }),
	userId: z.string().nullable().optional(),
	transactionType: z.enum(["auto_deduct", "manual_writeoff"]).optional(),
	clientMutationId: z.string().nullable().optional(),
	services: z
		.array(
			z
				.object({
					serviceId: z.string().min(1),
					quantity: z.number().positive().optional(),
				})
				.strict(),
		)
		.optional(),
	items: z
		.array(
			z
				.object({
					inventoryItemId: z.string().min(1),
					quantity: z.number().positive(),
					reason: z.string().nullable().optional(),
				})
				.strict(),
		)
		.optional(),
	clinicalNorms: z.array(clinicalConsumableNormSchema).min(1),
	treatmentServiceId: z.string().min(1).optional(),
	treatmentServiceTitle: z.string().min(1).optional(),
	carpulesCount: z.number().nonnegative().optional(),
	drugName: z.string().optional(),
	paperJournalAcknowledged: z.boolean().optional(),
	allowOverdraft: z.boolean().optional(),
	allowSoftOverdraft: z.boolean().optional(),
}).strict();

export const visitDeductWithOptionalNormsSchema = z.union([
	visitClinicalWriteoffRequestSchema,
	visitStockDeductionRequestSchema,
]);

/**
 * Query parameters for listing technological card consumable links.
 */
export const listLinksQuerySchema = z.object({
	serviceId: z.string().optional(),
	inventoryItemId: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1).optional(),
	pageSize: z.coerce.number().int().min(1).max(100).default(50).optional(),
}).strict();

export type ListLinksQuery = z.infer<typeof listLinksQuerySchema>;

/**
 * Query parameters for searching picker options when linking consumables to services.
 */
export const linkOptionsQuerySchema = z.object({
	q: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(30).optional(),
}).strict();

export type LinkOptionsQuery = z.infer<typeof linkOptionsQuerySchema>;

/**
 * Query parameters for warehouse low-stock & expiration alerts.
 */
export const alertsQuerySchema = z.object({
	expiringWithinDays: z.coerce.number().int().min(1).max(365).default(30).optional(),
}).strict();

export type AlertsQuery = z.infer<typeof alertsQuerySchema>;

/**
 * Request body schema for emergency write-off with guaranteed soft overdraft (Mandate 8e).
 */
export const emergencyWriteoffSchema = z.object({
	items: z
		.array(
			z.object({
				inventoryItemId: z.string().min(1, "Идентификатор материала обязателен"),
				quantity: z.number().positive("Количество должно быть больше 0"),
				reason: z.string().nullable().optional(),
			}).strict(),
		)
		.min(1, { message: "Список позиций для списания не может быть пустым" }),
	visitId: z.string().nullable().optional(),
	userId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
}).strict();

export const quickWriteoffCarpulesSchema = z.object({
	carpulesCount: z.number().finite().positive().optional(),
	drugName: z.string().optional(),
	visitId: z.string().nullable().optional(),
	userId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
}).strict();

export const quickWriteoffVisitBundleSchema = z.object({
	visitType: z.enum(["therapy", "surgery", "implant", "sinus_gbr"]).optional(),
	visitId: z.string().nullable().optional(),
	userId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
}).strict();

export const quickWriteoffEmergencyAntishockSchema = z.object({
	visitId: z.string().nullable().optional(),
	userId: z.string().nullable().optional(),
	scenarioId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
}).strict();

export type EmergencyWriteoffRequest = z.infer<typeof emergencyWriteoffSchema>;

/**
 * Candidate batch for FEFO (First Expired, First Out) allocation.
 */
export interface FefoBatchCandidate {
	batchId: string;
	batchNumber: string;
	expirationDate: string | null;
	createdAt?: Date | string | null | undefined;
	remainingQty: number | string;
	unitCostRub?: number | string | null | undefined;
	unitCostKopecks?: number | null | undefined;
	warehouseId?: string | null | undefined;
}

/**
 * Single batch slice allocated by the FEFO algorithm, with cost in integer kopecks.
 */
export interface FefoAllocatedBatchSlice {
	batchId: string;
	batchNumber: string;
	expirationDate: string | null;
	quantityDeducted: number;
	remainingAfter: number;
	depleted: boolean;
	unitCostKopecks: number;
	totalSliceCostKopecks: number;
	warehouseId: string | null;
}

/**
 * Complete result of FEFO batch allocation and write-off cost calculation in kopecks.
 */
export interface FefoAllocationSummary {
	inventoryItemId: string;
	requiredQty: number;
	allocatedFromBatchesQty: number;
	unbatchedFallbackQty: number;
	deficitQty: number;
	isOverdraft: boolean;
	totalCostKopecks: number;
	totalCostRub: string;
	slices: FefoAllocatedBatchSlice[];
}

/**
 * Soft-overdraft HTTP 200 response payload (Mandate 8e: Doctor Autonomy — never block clinical visit).
 */
export interface SoftOverdraftFallbackResponse {
	success: true;
	isOverdraft: true;
	warning: string;
	inventoryItemId: string;
	inventoryItemName: string;
	availableStock: number;
	requiredStock: number;
	deductions: never[];
	warnings: Array<{
		type: "out_of_stock";
		itemId: string;
		itemName: string;
		message: string;
		currentStock: number;
		criticalThreshold: number;
	}>;
}

/**
 * Context type for formatting soft-overdraft warning messages.
 */
export type SoftOverdraftContext = "visit" | "tooth_treatment" | "emergency_writeoff";
