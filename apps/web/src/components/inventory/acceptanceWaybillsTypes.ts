/**
 * ============================================================================
 * ACCEPTANCE WAYBILLS TYPES (МАНДАТЫ 8e, 8k, 8n, 8s)
 * Типы данных приходных накладных стоматологических поставщиков и FEFO-партий.
 * ============================================================================
 */

export type VatRate = 0 | 10 | 20;

export type AcceptanceFefoStatus = "fresh" | "warning" | "critical" | "expired";
export type FefoStatus = AcceptanceFefoStatus;

export interface FefoEvaluation {
	readonly fefoStatus: FefoStatus;
	readonly badgeLabelRu: string;
	readonly hexColor: string;
	readonly bgSoft: string;
	readonly daysRemaining: number;
}

export interface AcceptanceSupplier {
	readonly id: string;
	readonly name: string;
	readonly inn: string;
	readonly phone?: string | undefined;
	readonly email?: string | undefined;
	readonly isPreferred?: boolean | undefined;
}

export interface AcceptanceWaybillItem {
	readonly id: string;
	readonly inventoryItemId?: string | undefined;
	readonly name: string;
	readonly category: string;
	readonly unit: string;
	readonly batchNumber: string;
	readonly expirationDate: string; // YYYY-MM-DD
	readonly manufactureDate?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly vatRate: VatRate;
	readonly lineSubtotalKopecks: number;
	readonly vatKopecks: number;
	readonly lineTotalKopecks: number;
	readonly fefoStatus: FefoStatus;
	readonly daysUntilExpiration: number;
	readonly barcode?: string | undefined;
	readonly sku?: string | undefined;
	readonly notes?: string | undefined;
}

export interface AcceptanceWaybillTotals {
	readonly totalPositions: number;
	readonly totalQuantity: number;
	readonly subtotalKopecks: number;
	readonly totalVatKopecks: number;
	readonly totalCostKopecks: number;
	readonly subtotalRubles: number;
	readonly totalVatRubles: number;
	readonly totalCostRubles: number;
}

export interface AcceptanceWaybillDocument {
	readonly id: string;
	readonly waybillNumber: string;
	readonly receiptDate: string; // YYYY-MM-DD
	readonly supplier: AcceptanceSupplier;
	readonly warehouseId?: string | undefined;
	readonly warehouseName: string;
	readonly status: "draft" | "posted" | "cancelled";
	readonly items: readonly AcceptanceWaybillItem[];
	readonly totals: AcceptanceWaybillTotals;
	readonly notes?: string | undefined;
	readonly postedAt?: string | undefined;
	readonly postedBy?: string | undefined;
	readonly receiverFullName: string;
	readonly receiverPosition: string;
}

export interface OverdraftReconciliationResult {
	readonly previousStock: number;
	readonly clearedDeficit: number;
	readonly newStockQuantity: number;
	readonly overdraftResolved: boolean;
}
