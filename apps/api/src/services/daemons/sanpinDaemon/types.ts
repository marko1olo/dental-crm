/**
 * types.ts — Layer 0: Contracts, DTOs & Configuration for SanPiN & Inventory Daemon.
 *
 * Implements SanPiN 3.3686-21 Kraft Pack Shelf Life & High-Cost Surgical Inventory
 * reconciliation data structures, alert schemas, and suggested action payloads.
 */

export type SanpinPackStatus = "EXPIRED" | "EXPIRING_SOON" | "VALID";
export type SanpinAlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface SanpinSterilizationAlertItem {
	readonly id: string;
	readonly organizationId: string;
	readonly logId: string;
	readonly barcode: string | null;
	readonly autoclaveId: string | null;
	readonly deviceName: string | null;
	readonly cycleNumber: number | null;
	readonly packagingType: string | null;
	readonly packagingTypeRu: string;
	readonly itemsDescription: string | null;
	readonly operatorId: string | null;
	readonly operatorName: string | null;
	readonly sterilizationDate: string;
	readonly expiryDate: string;
	readonly elapsedDays: number;
	readonly remainingDays: number;
	readonly status: SanpinPackStatus;
	readonly severity: SanpinAlertSeverity;
	readonly message: string;
	readonly suggestedAction: {
		readonly actionId: "send_to_resterilization";
		readonly title: string;
		readonly payload: {
			readonly logId: string;
			readonly barcode: string | null;
			readonly autoclaveId: string | null;
			readonly deviceName: string | null;
			readonly packagingType: string | null;
			readonly itemsDescription: string | null;
			readonly reason: string;
		};
	};
}

export type InventoryDiscrepancyType =
	| "missing_writeoff"
	| "sku_mismatch"
	| "quantity_mismatch"
	| "unrecorded_graft_membrane";

export interface InventoryReconciliationAlertItem {
	readonly id: string;
	readonly organizationId: string;
	readonly visitId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly doctorId: string | null;
	readonly doctorName: string;
	readonly shiftDate: string;
	readonly discrepancyType: InventoryDiscrepancyType;
	readonly discrepancyTypeRu: string;
	readonly severity: "CRITICAL" | "WARNING";
	readonly billedOrInstalled: {
		readonly itemName: string;
		readonly brand: string | null;
		readonly sku: string | null;
		readonly quantity: number;
		readonly estimatedPriceRub: number;
		readonly lotNumber: string | null;
		readonly toothNumberFdi: number | null;
	};
	readonly warehouseRecorded: Array<{
		readonly transactionId: string;
		readonly itemId: string | null;
		readonly itemName: string;
		readonly quantityDeducted: number;
		readonly unitCostRub: number | null;
	}>;
	readonly message: string;
	readonly suggestedAction: {
		readonly actionId: "investigate_inventory_trail";
		readonly title: string;
		readonly payload: {
			readonly visitId: string;
			readonly patientId: string;
			readonly patientFullName: string;
			readonly doctorName: string;
			readonly discrepancyType: InventoryDiscrepancyType;
			readonly billedItemName: string;
			readonly billedBrand: string | null;
			readonly warehouseTransactionsCount: number;
			readonly auditRecommendation: string;
		};
	};
}

export interface SanpinAndInventoryAuditDigest {
	readonly id: string;
	readonly organizationId: string;
	readonly scanDate: string;
	readonly scanTimestamp: string;
	readonly summary: {
		readonly totalKraftPacksChecked: number;
		readonly expiredPacksCount: number;
		readonly expiringSoonPacksCount: number;
		readonly totalSurgicalActsAudited: number;
		readonly reconciledSurgicalActsCount: number;
		readonly discrepantSurgicalActsCount: number;
		readonly totalEstimatedDiscrepancyRub: number;
	};
	readonly sanpinAlerts: SanpinSterilizationAlertItem[];
	readonly inventoryDiscrepancyAlerts: InventoryReconciliationAlertItem[];
	readonly createdAt: string;
}

export const PACKAGING_TYPE_RU_MAP: Readonly<Record<string, string>> = {
	kraft_heat_sealed: "Крафт-пакет (термосварка, норма 50 сут)",
	kraft_self_adhesive: "Крафт-пакет (самоклеящийся, норма 30 сут)",
	laminated_heat_sealed: "Ламинированный пакет комбинированный (180 сут)",
	metal_cassette: "Металлическая кассета с фильтром (30 сут)",
	bix_filter: "Стерилизационная коробка (бикс) с фильтром (20 сут)",
	unpacked: "Неупакованный инструмент на стерильном столе (0 сут, только текущая смена)",
	other: "Иной вид упаковки (0 сут, без гарантии сохранения стерильности)",
};

export const DISCREPANCY_TYPE_RU_MAP: Readonly<
	Record<InventoryDiscrepancyType, string>
> = {
	missing_writeoff: "Списание со склада не зафиксировано",
	sku_mismatch: "Несоответствие артикула / пересорт ТМЦ",
	quantity_mismatch: "Несоответствие списанного количества",
	unrecorded_graft_membrane:
		"Не зафиксировано списание костного материала/мембраны",
};

export interface KraftPackEvaluationInput {
	readonly id: string;
	readonly organizationId: string;
	readonly barcode?: string | null;
	readonly autoclaveId?: string | null;
	readonly deviceName?: string | null;
	readonly cycleNumber?: number | null;
	readonly packagingType?: string | null;
	readonly expiresAt?: Date | string | null;
	readonly itemsDescription?: string | null;
	readonly operatorId?: string | null;
	readonly operatorName?: string | null;
	readonly status?: string | null;
	readonly timestamp?: Date | null;
	readonly createdAt?: Date;
}

export interface SurgicalActInput {
	readonly visitId: string;
	readonly organizationId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly doctorId?: string | null;
	readonly doctorName: string;
	readonly shiftDate: string;
	readonly implantInstallations?: Array<{
		readonly id: string;
		readonly implantBrand: string | null;
		readonly toothNumberFdi: number;
		readonly lotNumber?: string | null;
		readonly serialNumber?: string | null;
		readonly boneGraftMaterial?: string | null;
		readonly membraneUsed?: string | null;
	}>;
	readonly billedItems?: Array<{
		readonly id: string;
		readonly serviceId?: string | null;
		readonly serviceTitle?: string | null;
		readonly serviceCode?: string | null;
		readonly quantity?: number | string | null;
		readonly priceRub?: number | string | null;
	}>;
}

export interface WarehouseTransactionInput {
	readonly id: string;
	readonly itemId?: string | null;
	readonly itemName?: string | null;
	readonly sku?: string | null;
	readonly category?: string | null;
	readonly qty?: number | string | null;
	readonly quantityChanged?: number | string | null;
	readonly unitCostRub?: number | string | null;
	readonly notes?: string | null;
}

export interface SanpinSterilizationAuditOptions {
	organizationId?: string | undefined;
	now?: Date | undefined;
	warningWindowDays?: number | undefined;
}

export interface ExpensiveMaterialsInventoryAuditOptions {
	organizationId?: string | undefined;
	targetDate?: Date | undefined;
	lookbackHours?: number | undefined;
}

export interface SanpinAndInventoryAuditOptions {
	organizationId?: string | undefined;
	now?: Date | undefined;
	lookbackHours?: number | undefined;
	warningWindowDays?: number | undefined;
}

export interface SanpinDaemonSchedulerConfig {
	readonly organizationId?: string | undefined;
	readonly intervalMs?: number | undefined;
	readonly warningWindowDays?: number | undefined;
	readonly lookbackHours?: number | undefined;
	readonly onDigest?: ((digest: SanpinAndInventoryAuditDigest[]) => Promise<void> | void) | undefined;
	readonly onError?: ((error: unknown) => void) | undefined;
	readonly logger?: {
		info?: (msg: string) => void;
		warn?: (msg: string) => void;
		error?: (msg: string) => void;
	} | undefined;
	readonly nowProvider?: (() => Date) | undefined;
}
