import type { InventoryItem } from "../useInventoryLogic.js";

export interface ShiftSummaryProcedure {
	name: string;
	code?: string;
	count: number;
}

export interface ShiftConsumableItem {
	itemId: string;
	itemName: string;
	category: string;
	unit: string;
	qtyToDeduct: number;
	currentStock: number;
	projectedStock: number;
	isOverdraft: boolean;
	deficit: number;
}

export interface ShiftSummaryData {
	date: string;
	shiftStats: {
		completedVisitsCount: number;
		totalProceduresCount: number;
		breakdown: ShiftSummaryProcedure[];
	};
	consumablesSummary: ShiftConsumableItem[];
	totalItemsCount: number;
	overdraftItemsCount: number;
	isAlreadyDeducted: boolean;
}

export type ShiftBatchMode = "shift" | "packages" | "procedure";

export interface ShiftBatchDeductionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId?: string | undefined;
	readonly onDeductionComplete?: () => void;
	readonly onConfirmDeduction?: () => void;
	readonly initialMode?: ShiftBatchMode | undefined;
	readonly procedureTitle?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly service804nCode?: string | undefined;
	readonly toothNumber?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly warehouseItems?: readonly InventoryItem[] | undefined;
	readonly currentStockMap?: Record<string, number> | undefined;
}
