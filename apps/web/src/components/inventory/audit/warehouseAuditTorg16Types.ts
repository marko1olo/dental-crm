import type { WarehouseInventoryCommissionMember } from "./warehouseAuditTypes.js";

export interface Torg16WriteoffLineItem {
	readonly itemId: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly unitRu: string;
	readonly okeiCode: string;
	readonly batchNumber: string;
	readonly expiryDate: string;
	readonly quantity: number;
	readonly unitCostKopecks: number;
	readonly totalCostKopecks: number;
	readonly totalCostRubles: number;
	readonly defectDescriptionRu: string;
}

export interface WarehouseTorg16WriteoffAct {
	readonly actNumber: string;
	readonly actDate: string;
	readonly inventoryDocNumber: string;
	readonly organizationNameRu: string;
	readonly organizationOkpo: string;
	readonly organizationInn: string;
	readonly warehouseNameRu: string;
	readonly molFullName: string;
	readonly molPosition: string;
	readonly reasonRu: string;
	readonly commission: readonly WarehouseInventoryCommissionMember[];
	readonly items: readonly Torg16WriteoffLineItem[];
	readonly totalQuantity: number;
	readonly totalCostKopecks: number;
	readonly totalCostRubles: number;
}
