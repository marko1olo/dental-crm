import type { Kopecks } from "@dental/shared";
import type { TechMapCategory } from "../inventoryMath.js";

export interface SupplierPurchaseOrderItemView {
	readonly sku: string;
	readonly materialName: string;
	readonly category: TechMapCategory;
	readonly unit: string;
	readonly currentStock: number;
	readonly criticalThreshold: number;
	readonly shortfall: number;
	readonly suggestedOrderQuantity: number;
	readonly unitCostKopecks: Kopecks;
	readonly unitCostFormatted: string;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostFormatted: string;
}

export interface SupplierPurchaseOrderView {
	readonly id: string;
	readonly orderNumber: string;
	readonly orderDate: string;
	readonly clinicNameRu: string;
	readonly reason: "stock_deficit" | "critical_threshold_breach";
	readonly items: readonly SupplierPurchaseOrderItemView[];
	readonly totalItemsCount: number;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostFormatted: string;
}
