import type {
	WarehouseBranchDefinition,
	WarehouseBranchId,
	WarehouseTransferStatus,
} from "./warehouseTransferPresets.js";

export interface WarehouseTransferLineItem {
	readonly itemId: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly unitRu: string;
	readonly okeiCode: string;
	readonly batchNumber: string;
	readonly expiryDate: string;
	readonly requestedQuantity: number;
	readonly dispatchedQuantity: number;
	readonly receivedQuantity: number;
	readonly unitCostKopecks: number;
	readonly discrepancyType?: "none" | "shortage" | "surplus" | "damaged" | "expired" | undefined;
	readonly discrepancyQuantity?: number | undefined;
	readonly discrepancyNotes?: string | undefined;
}

export interface WarehouseTransferDocument {
	readonly id: string;
	readonly documentNumber: string;
	readonly documentDate: string;
	readonly sourceBranchId: WarehouseBranchId;
	readonly targetBranchId: WarehouseBranchId;
	readonly status: WarehouseTransferStatus;
	readonly items: readonly WarehouseTransferLineItem[];
	readonly dispatchedByFullName: string;
	readonly dispatchedByPosition: string;
	readonly dispatchedDate?: string | undefined;
	readonly receivedByFullName: string;
	readonly receivedByPosition: string;
	readonly receivedDate?: string | undefined;
	readonly transportDriverFullName?: string | undefined;
	readonly transportVehiclePlate?: string | undefined;
	readonly notes?: string | undefined;
}

export interface DiscrepancyLineReport {
	readonly item: WarehouseTransferLineItem;
	readonly shortageQty: number;
	readonly damagedQty: number;
	readonly surplusQty: number;
	readonly financialDamageKopecks: number;
	readonly financialDamageRubles: number;
	readonly causeRu: string;
}

export interface WarehouseDiscrepancyAct {
	readonly actNumber: string;
	readonly actDate: string;
	readonly transferDocNumber: string;
	readonly sourceBranch: WarehouseBranchDefinition;
	readonly targetBranch: WarehouseBranchDefinition;
	readonly discrepancyItems: readonly DiscrepancyLineReport[];
	readonly totalFinancialDamageKopecks: number;
	readonly totalFinancialDamageRubles: number;
	readonly totalDiscrepantItemsCount: number;
	readonly commissionMembers: readonly { readonly name: string; readonly position: string }[];
}

export interface TransferTotalsSummary {
	readonly totalRequestedQuantity: number;
	readonly totalDispatchedQuantity: number;
	readonly totalReceivedQuantity: number;
	readonly totalDispatchedCostKopecks: number;
	readonly totalReceivedCostKopecks: number;
	readonly totalDispatchedCostRubles: number;
	readonly totalReceivedCostRubles: number;
	readonly totalDiscrepancyDamageKopecks: number;
	readonly totalDiscrepancyDamageRubles: number;
	readonly hasDiscrepancy: boolean;
}

export type WarehouseTransferTotals = TransferTotalsSummary;
