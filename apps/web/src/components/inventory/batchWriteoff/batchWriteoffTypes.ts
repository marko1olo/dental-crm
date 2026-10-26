import type { InventoryItem } from "../useInventoryLogic.js";

export type BatchWriteoffMode = "shift" | "packages" | "procedure";
export type WriteoffActiveTab = BatchWriteoffMode;
export type ShiftBatchMode = BatchWriteoffMode;

export interface ShiftStatsBreakdown {
	readonly name: string;
	readonly count: number;
}

export interface ConsumableDeductionItem {
	readonly itemId: string;
	readonly itemName: string;
	readonly category: string;
	readonly unit: string;
	readonly currentStock: number;
	readonly qtyToDeduct: number;
	readonly projectedStock: number;
	readonly isOverdraft: boolean;
	readonly deficit?: number | undefined;
}

export interface ShiftSummaryData {
	readonly date: string;
	readonly shiftStats: {
		readonly completedVisitsCount: number;
		readonly totalProceduresCount?: number | undefined;
		readonly breakdown: readonly ShiftStatsBreakdown[];
	};
	readonly totalItemsCount: number;
	readonly overdraftItemsCount: number;
	readonly isAlreadyDeducted: boolean;
	readonly consumablesSummary: readonly ConsumableDeductionItem[];
}

export interface BatchWriteoffModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId?: string | undefined;
	readonly currentStockMap?: Record<string, number> | undefined;
	readonly warehouseItems?: readonly InventoryItem[] | readonly any[] | undefined;
	readonly onDeductionComplete?: (() => void | Promise<void>) | undefined;
	readonly onConfirmDeduction?: (() => void | Promise<void>) | undefined;
	readonly procedureTitle?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly service804nCode?: string | undefined;
	readonly toothNumber?: number | undefined;
	readonly visitId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly defaultTab?: BatchWriteoffMode | undefined;
	readonly initialMode?: BatchWriteoffMode | undefined;
}

export type WarehouseBatchWriteoffModalProps = BatchWriteoffModalProps;
export type ShiftBatchDeductionModalProps = BatchWriteoffModalProps;
