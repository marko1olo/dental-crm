import type { db } from "../../../db/client.js";
import type { TenantDb } from "../../../db/rls.js";

export type DbTransaction =
	| Parameters<Parameters<typeof db.transaction>[0]>[0]
	| TenantDb;

export interface FefoBatchUsage {
	batchId: string;
	batchNumber: string;
	expirationDate: string;
	quantityDeducted: number;
}

export interface FefoDeductionResult {
	inventoryItemId: string;
	inventoryItemName: string;
	requiredQty: number;
	deductedQty: number;
	batchesUsed: FefoBatchUsage[];
	isOverdraft: boolean;
	deficitQty: number;
	warning?: string | undefined;
}

export interface ReceiveBatchInput {
	organizationId: string;
	inventoryItemId: string;
	warehouseId?: string | null | undefined;
	batchNumber: string;
	expirationDate: string;
	manufactureDate?: string | null | undefined;
	quantity: number;
	purchasePricePerUnit?: number | null | undefined;
	barcode?: string | null | undefined;
	userId?: string | null | undefined;
	notes?: string | null | undefined;
}

export interface WriteOffScrapInput {
	organizationId: string;
	inventoryItemId: string;
	batchId?: string | null | undefined;
	quantity: number;
	reason: "expired" | "scrap" | "quarantine" | "defect";
	actNumber: string;
	notes?: string | null | undefined;
	userId?: string | null | undefined;
}

export interface DeductFefoParams {
	organizationId: string;
	inventoryItemId: string;
	requiredQty: number;
	warehouseId?: string | null | undefined;
	visitId?: string | null | undefined;
	userId?: string | null | undefined;
	allowOverdraft?: boolean | undefined;
	notes?: string | null | undefined;
	transactionType?: string | undefined;
}

export interface DeductForProcedureParams {
	organizationId: string;
	serviceId?: string | undefined;
	serviceIdOrCode?: string | undefined;
	serviceQuantity?: number | undefined;
	warehouseId?: string | null | undefined;
	visitId?: string | null | undefined;
	userId?: string | null | undefined;
	allowOverdraft?: boolean | undefined;
	transactionType?: string | undefined;
	notes?: string | undefined;
}

export type DeductForProcedureResult = FefoDeductionResult[] & {
	totalMaterials: number;
	hasOverdraft: boolean;
};

export interface WriteOffResult {
	success: boolean;
	writtenOffQty: number;
}
