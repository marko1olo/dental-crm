import type { InventoryItem } from "../useInventoryLogic.js";

export interface InboundWaybillLine {
	id: string;
	inventoryItemId?: string | undefined;
	name: string;
	lotNumber: string;
	expirationDate: string; // YYYY-MM-DD
	quantity: number;
	unit: string;
	unitCostRub: number;
	category?: string | undefined;
}

export interface InboundWaybillModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId: string;
	readonly inventoryItems?: readonly InventoryItem[] | undefined;
	readonly onWaybillPosted?: (() => void | Promise<void>) | undefined;
	readonly onInvoicePosted?: (() => void | Promise<void>) | undefined;
	readonly getHeaders?: ((headers?: Record<string, string>) => Record<string, string>) | undefined;
}

export interface WaybillTotals {
	positionsCount: number;
	totalQty: number;
	totalSumRub: number;
	totalSumFormatted: string;
	resolvingDeficitCount: number;
}
