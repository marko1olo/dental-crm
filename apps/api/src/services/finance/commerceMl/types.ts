/**
 * DENTE Dental CRM — 1C:Enterprise (CommerceML 2.09) Integration Types & Schemas.
 * Layer 0: Pure DTOs, Zod Validation Schemas, and Interface Contracts.
 *
 * Implements:
 * - CommerceML 2.09 exchange schemas for retail sales, medical acts, inventory, and payroll.
 * - Inbound ACID sync schemas for 1C:Enterprise reconciliations.
 * - Catalog (import.xml) and Offers (offers.xml) statutory XML generation contracts.
 */

import { z } from "zod";
import type { OneCCommerceMlPackage, validatePackageIntegrity } from "@dental/shared";

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT COMMERCEML PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════

export const exportCommerceMlParamsSchema = z.object({
	organizationId: z.string().uuid(),
	startDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	endDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	shiftId: z.string().optional(),
	includeRetailSales: z.boolean().default(true),
	includeMedicalActs: z.boolean().default(true),
	includeMaterials: z.boolean().default(true),
	includePayroll: z.boolean().default(true),
	chartOfAccountsOverrides: z.record(z.string()).optional(),
	clinicProfileOverrides: z.record(z.any()).optional(),
});
export type ExportCommerceMlParams = z.infer<typeof exportCommerceMlParamsSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// INBOUND 1C:ENTERPRISE RECONCILIATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

export const oneCReconciledPaymentSchema = z.object({
	paymentId: z.string().uuid(),
	status: z.string().default("reconciled"),
	fiscalReceiptNumber: z.string().optional().nullable(),
	reconciliationNote: z.string().optional().nullable(),
});
export type OneCReconciledPayment = z.infer<typeof oneCReconciledPaymentSchema>;

export const oneCInventoryStockUpdateSchema = z.object({
	itemId: z.string().uuid().optional(),
	sku: z.string().optional(),
	name: z.string().optional(),
	updatedQty: z.number().nonnegative(),
	unitCostRub: z.number().nonnegative().optional(),
	warehouseName: z.string().optional(),
	lotNumber: z.string().optional().nullable(),
	expirationDate: z.string().optional().nullable(),
});
export type OneCInventoryStockUpdate = z.infer<typeof oneCInventoryStockUpdateSchema>;

export const oneCPostedDocumentConfirmationSchema = z.object({
	documentId: z.string().min(1),
	documentNumber: z.string().min(1),
	isPosted: z.boolean().default(true),
	oneCDocumentNumber: z.string().optional().nullable(),
	postedAtIso: z.string().optional().nullable(),
});
export type OneCPostedDocumentConfirmation = z.infer<typeof oneCPostedDocumentConfirmationSchema>;

export const oneCSyncPayloadSchema = z.object({
	organizationId: z.string().uuid(),
	syncTransactionId: z.string().min(1),
	syncTimestamp: z.string().default(() => new Date().toISOString()),
	sha256Hash: z.string().length(64).optional(),
	reconciledPayments: z.array(oneCReconciledPaymentSchema).optional().default([]),
	inventoryStockUpdates: z.array(oneCInventoryStockUpdateSchema).optional().default([]),
	postedDocumentConfirmations: z
		.array(oneCPostedDocumentConfirmationSchema)
		.optional()
		.default([]),
});
export type OneCSyncPayload = z.infer<typeof oneCSyncPayloadSchema>;

export interface OneCSyncResult {
	readonly success: boolean;
	readonly processedDocumentsCount: number;
	readonly updatedStockItemsCount: number;
	readonly reconciledPaymentsCount: number;
	readonly syncTransactionHash: string;
	readonly timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG (import.xml) & OFFERS (offers.xml) DTOs
// ═══════════════════════════════════════════════════════════════════════════

export const exportCatalogParamsSchema = z.object({
	organizationId: z.string().uuid(),
	classifierName: z.string().default("Классификатор стоматологических услуг и материалов"),
	catalogName: z.string().default("Каталог медицинских услуг"),
	includeInactive: z.boolean().default(false),
	priceTypeTitle: z.string().default("Основной прайс-лист"),
});
export type ExportCatalogParams = z.infer<typeof exportCatalogParamsSchema>;

export interface OneCCatalogXmlResult {
	readonly xml: string;
	readonly sha256: string;
	readonly itemsCount: number;
	readonly groupsCount: number;
	readonly generatedAtIso: string;
}

export const exportOffersParamsSchema = z.object({
	organizationId: z.string().uuid(),
	warehouseName: z.string().default("Основной склад клиники"),
	includeZeroStock: z.boolean().default(false),
	priceTypeTitle: z.string().default("Основной прайс-лист"),
});
export type ExportOffersParams = z.infer<typeof exportOffersParamsSchema>;

export interface OneCOffersXmlResult {
	readonly xml: string;
	readonly sha256: string;
	readonly offersCount: number;
	readonly totalStockQty: number;
	readonly generatedAtIso: string;
}

export interface CommerceMlPackageResult {
	readonly package: OneCCommerceMlPackage;
	readonly xml: string;
	readonly sha256: string;
	readonly integrity: ReturnType<typeof validatePackageIntegrity>;
}

export interface DoublePostingCheckResult {
	readonly isDoublePosting: boolean;
	readonly message: string;
	readonly previousExportDate?: string;
}
