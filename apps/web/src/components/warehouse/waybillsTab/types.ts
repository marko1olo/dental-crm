import type { InventoryItem } from "../../inventory/useInventoryLogic.js";
import type {
	AcceptanceSupplier,
	AcceptanceWaybillDocument,
	AcceptanceWaybillItem,
	AcceptanceWaybillTotals,
} from "../../inventory/acceptanceWaybillsEngine.js";

export type {
	AcceptanceSupplier,
	AcceptanceWaybillDocument,
	AcceptanceWaybillItem,
	AcceptanceWaybillTotals,
	InventoryItem,
};

export interface WarehouseWaybillsTabProps {
	readonly organizationId: string;
	readonly inventoryItems?: readonly InventoryItem[] | undefined;
	readonly onWaybillPosted?: ((waybill: AcceptanceWaybillDocument) => void | Promise<void>) | undefined;
	readonly onRefreshStock?: (() => void) | undefined;
}

export interface WaybillsListTableProps {
	readonly waybills: readonly AcceptanceWaybillDocument[];
	readonly totalWaybillsCount: number;
	readonly selectedWaybillId: string | null;
	readonly isCreatingNew: boolean;
	readonly onSelectWaybill: (waybill: AcceptanceWaybillDocument) => void;
	readonly onStartCreateNew: () => void;
}

export interface WaybillItemsGridProps {
	readonly items: readonly AcceptanceWaybillItem[];
	readonly mode: "draft" | "view";
	readonly onRemoveItem?: ((itemId: string) => void) | undefined;
}

export interface WaybillEditorModalProps {
	readonly draftWaybill: AcceptanceWaybillDocument;
	readonly onChangeSupplier: (supplier: AcceptanceSupplier) => void;
	readonly onChangeWaybillNumber: (num: string) => void;
	readonly onChangeReceiptDate: (date: string) => void;
	readonly onAddTemplateItem: (sku: string) => void;
	readonly onRemoveDraftItem: (itemId: string) => void;
	readonly onCancel: () => void;
	readonly onSubmit: (waybill: AcceptanceWaybillDocument) => void | Promise<void>;
}

export interface ExpressWaybillModalProps {
	readonly isOpen: boolean;
	readonly supplierId: string;
	readonly waybillNum: string;
	readonly receiptDate: string;
	readonly amountRub: string;
	readonly onSupplierIdChange: (id: string) => void;
	readonly onWaybillNumChange: (num: string) => void;
	readonly onReceiptDateChange: (date: string) => void;
	readonly onAmountRubChange: (amount: string) => void;
	readonly onClose: () => void;
	readonly onSubmit: () => void | Promise<void>;
}
