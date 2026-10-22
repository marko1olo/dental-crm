export type WarehouseInventoryStatus =
	| "draft"
	| "in_progress"
	| "reconciliation"
	| "approved"
	| "applied"
	| "cancelled";

export type FefoStatus = "fresh" | "warning_60" | "warning_30" | "expired";

export type InventoryDiscrepancyType = "match" | "surplus" | "shortage";

export type WarehouseCommissionRole = "chairman" | "member" | "accountant" | "mol";

export interface WarehouseInventoryCommissionMember {
	readonly fullName: string;
	readonly position: string;
	readonly role: WarehouseCommissionRole;
	readonly roleRu?: string | undefined;
}

export interface WarehouseAuditItemLine {
	readonly itemId: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly category: string;
	readonly unitRu: string;
	readonly okeiCode: string;
	readonly batchNumber: string;
	readonly manufactureDate?: string | undefined;
	readonly expiryDate: string;
	readonly cabinetId?: string | undefined;
	readonly chairId?: string | undefined;
	readonly storageLocationRu?: string | undefined;
	readonly temperatureRegimeRu?: string | undefined;
	readonly bookQuantity: number;
	readonly actualQuantity: number;
	readonly unitCostKopecks: number;
	readonly discrepancyType: InventoryDiscrepancyType;
	readonly discrepancyQuantity: number;
	readonly bookTotalKopecks: number;
	readonly actualTotalKopecks: number;
	readonly discrepancyCostKopecks: number;
	readonly fefoStatus: FefoStatus;
	readonly daysUntilExpiration: number;
	readonly isWriteoffRequired: boolean;
	readonly notes?: string | undefined;
}

export interface WarehouseInventoryAuditDocument {
	readonly id: string;
	readonly documentNumber: string;
	readonly orderNumber: string;
	readonly orderDate: string;
	readonly auditStartDate: string;
	readonly auditEndDate: string;
	readonly auditDate: string;
	readonly branchId: string;
	readonly branchNameRu: string;
	readonly warehouseNameRu: string;
	readonly molFullName: string;
	readonly molPosition: string;
	readonly status: WarehouseInventoryStatus;
	readonly commission: readonly WarehouseInventoryCommissionMember[];
	readonly items: readonly WarehouseAuditItemLine[];
	readonly notes?: string | undefined;
	readonly organizationNameRu: string;
	readonly organizationOkpo: string;
	readonly organizationInn: string;
}

export interface InventoryAuditTotals {
	readonly totalItemsCount: number;
	readonly matchedItemsCount: number;
	readonly surplusItemsCount: number;
	readonly shortageItemsCount: number;
	readonly expiredItemsCount: number;
	readonly warningItemsCount: number;
	readonly overdraftItemsCount: number;
	readonly totalOverdraftQuantity: number;
	readonly totalBookQuantity: number;
	readonly totalActualQuantity: number;
	readonly totalSurplusQuantity: number;
	readonly totalShortageQuantity: number;
	readonly totalBookCostKopecks: number;
	readonly totalActualCostKopecks: number;
	readonly totalSurplusCostKopecks: number;
	readonly totalShortageCostKopecks: number;
	readonly netDiscrepancyCostKopecks: number;
	readonly totalExpiredCostKopecks: number;
	readonly totalBookCostRubles: number;
	readonly totalActualCostRubles: number;
	readonly totalSurplusCostRubles: number;
	readonly totalShortageCostRubles: number;
	readonly netDiscrepancyCostRubles: number;
	readonly totalExpiredCostRubles: number;
}

export type { Torg16WriteoffLineItem, WarehouseTorg16WriteoffAct } from "./warehouseAuditTorg16Types.js";
