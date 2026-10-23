import type { InventoryItem } from "../useInventoryLogic.js";

export type WriteoffActiveTab = "shift" | "packages" | "procedure";

export interface WarehouseBatchWriteoffModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId: string;
	readonly currentStockMap?: Record<string, number> | undefined;
	readonly warehouseItems?: readonly InventoryItem[] | undefined;
	readonly onDeductionComplete?: (() => void | Promise<void>) | undefined;
	readonly procedureTitle?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly visitId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly defaultTab?: WriteoffActiveTab | undefined;
}
