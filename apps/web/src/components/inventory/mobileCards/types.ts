import type { InventoryItem } from "../inventoryDataMappers.js";

export interface InventoryMobileCardsProps {
	readonly items: readonly InventoryItem[];
	readonly isLoading?: boolean | undefined;
	readonly effectiveSearch?: string | undefined;
	readonly loadError?: string | null | undefined;
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeductItem?: ((item: InventoryItem, quantity: number, isOverdraft: boolean) => void) | undefined;
	readonly onReceiveItem?: ((item: InventoryItem, quantity: number) => void) | undefined;
	readonly onOpenWaybills?: (() => void) | undefined;
	readonly onOpenAddModal?: (() => void) | undefined;
	readonly onRetry?: (() => void) | undefined;
	readonly onOpenDisposalModal?: ((item: InventoryItem) => void) | undefined;
	readonly onOpenWarehouseManager?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onEditItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeleteItem?: ((id: string, name: string) => void) | undefined;
}
