import type { InventoryItem } from "../inventoryDataMappers.js";

export interface InventoryStockTableProps {
	readonly items: readonly InventoryItem[];
	readonly isLoading?: boolean;
	readonly organizationId?: string;
	readonly searchQuery?: string;
	readonly loadError?: string | null;
	readonly hasMore?: boolean;
	readonly remainingCount?: number;
	readonly onShowMore?: () => void;
	readonly onSelectItem?: (item: InventoryItem) => void;
	readonly onDeductItem?: ((item: InventoryItem, quantity?: number) => void | Promise<void>) | undefined;
	readonly onReceiveItem?: ((item: InventoryItem, quantity?: number) => void | Promise<void>) | undefined;
	readonly onDeleteItem?: (id: string, name: string) => void;
	readonly onEditItem?: (item: InventoryItem) => void;
	readonly onCreateDisposalAct?: (item: InventoryItem) => void | Promise<void>;
	readonly onOpenWaybills?: () => void;
	readonly onOpenAddModal?: () => void;
	readonly onOpenWarehouseManager?: () => void;
	readonly onOpenInventoryAudit?: () => void;
	readonly onRetry?: () => void;
	readonly className?: string;
}

export type WarehouseItemsTableProps = InventoryStockTableProps;
