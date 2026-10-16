import type { InventoryItem } from "../../inventory/useInventoryLogic.js";
import type { FefoTrafficStatus } from "../../inventory/fefoTrafficLight.js";

export interface WarehouseBatchTrackingModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly items: readonly InventoryItem[];
	readonly selectedItem?: InventoryItem | null | undefined;
	readonly onDeductBatch?: ((item: InventoryItem, qty: number, lotNumber: string) => void | Promise<void>) | undefined;
	readonly onReceiveBatch?: ((item: InventoryItem, qty: number, lotNumber: string, expirationDate: string) => void | Promise<void>) | undefined;
	readonly onWriteOffExpired?: ((item: InventoryItem, lotNumber: string) => void) | undefined;
}

export type BatchFilter = "all" | "expired" | "warning_soon" | "good";

export interface EnrichedBatch {
	readonly item: InventoryItem;
	readonly lotNumber: string;
	readonly expirationDate: string;
	readonly daysLeft: number;
	readonly fefoStatus: FefoTrafficStatus;
	readonly fefoBadge: string;
	readonly quantity: number;
}
