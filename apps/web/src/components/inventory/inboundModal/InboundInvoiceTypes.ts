import type { InventoryItem } from "../useInventoryLogic.js";

export interface InboundInvoiceItemLine {
	id: string;
	inventoryItemId?: string | undefined;
	name: string;
	lotNumber: string;
	expirationDate: string;
	quantity: number;
	unit: string;
	unitCostRub: number;
}

export interface InboundInvoiceTotals {
	totalPositions: number;
	totalQty: number;
	totalSumRub: number;
	totalSumFormatted: string;
}

export interface InboundInvoiceSupplier {
	id: string;
	name: string;
	inn?: string | undefined;
}

export interface InventoryInboundInvoiceModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId: string;
	readonly inventoryItems: readonly InventoryItem[];
	readonly onInvoicePosted?: () => void | Promise<void>;
	readonly getHeaders?: (headers?: Record<string, string>) => Record<string, string>;
}
