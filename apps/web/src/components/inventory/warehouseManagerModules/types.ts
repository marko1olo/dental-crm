import type { InventoryItem } from "../inventoryDataMappers.js";

export interface WarehouseWriteoffItem {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly unit: string;
	readonly stockQuantity: number;
	readonly writeoffQuantity: number;
	readonly unitCostRub: string;
	readonly isOverdraft: boolean;
	readonly lotNumber?: string | undefined;
	readonly expirationDate?: string | undefined;
}

export interface WarehousePresetItem {
	readonly name: string;
	readonly category: string;
	readonly unit: string;
	readonly qty: number;
	readonly costRub: string;
}

export interface WarehousePreset {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly items: readonly WarehousePresetItem[];
}

export interface WarehouseManagerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onConfirmWriteoff?: ((items: readonly WarehouseWriteoffItem[]) => void | Promise<void>) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly initialItems?: readonly InventoryItem[] | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly nurseName?: string | undefined;
	readonly cabinetName?: string | undefined;
}
