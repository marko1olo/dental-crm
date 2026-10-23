import type { InventoryItem } from "../useInventoryLogic.js";
import type { WarehouseInventoryAuditDocument } from "../warehouseInventoryEngine.js";

export interface InventoryViewMobileLayoutProps {
	readonly items: readonly InventoryItem[];
	readonly organizationId: string;
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly selectedCategory: string;
	readonly setSelectedCategory: (c: any) => void;
	readonly openEditModal: (it: InventoryItem) => void;
	readonly openAddModal: () => void;
	readonly setIsInboundInvoiceModalOpen: (b: boolean) => void;
	readonly setIsAcceptanceWaybillsOpen: (b: boolean) => void;
	readonly handleQuickWriteoffCarpules?: () => Promise<any> | void;
	readonly isWritingOffCarpules?: boolean;
	readonly fetchItems: () => Promise<void> | void;
	readonly getHeaders: (h?: Record<string, string>) => Record<string, string>;
	readonly showModal: boolean;
	readonly setShowModal: (b: boolean) => void;
	readonly editingItem: InventoryItem | null;
	readonly formData: any;
	readonly setFormData: any;
	readonly handleSaveItem: (e: React.FormEvent) => Promise<void>;
	readonly isSavingItem: boolean;
	readonly confirmDialog: any;
	readonly setConfirmDialog: any;
	readonly externalModalsProps: any;
	readonly auditInitialDoc: WarehouseInventoryAuditDocument;
	readonly isShiftDeductionOpen?: boolean;
	readonly setIsShiftDeductionOpen?: (open: boolean) => void;
	readonly onOpenShiftDeduction?: () => void;
}

export async function mobileQuickDeduct(
	organizationId: string,
	itemId: string,
	qty: number | undefined,
	getHeaders: (h?: Record<string, string>) => Record<string, string>,
	fetchItems: () => Promise<void> | void,
) {
	const res = await fetch(`/api/inventory/${organizationId}/${itemId}/stock`, {
		method: "PATCH",
		headers: getHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({ adjustment: -(qty || 1), allowOverdraft: true }),
	});
	if (res.ok) fetchItems();
}

export async function mobileReceiveItem(
	organizationId: string,
	itemId: string,
	qty: number | undefined,
	lotNumber: string | undefined,
	expDate: string | undefined,
	getHeaders: (h?: Record<string, string>) => Record<string, string>,
	fetchItems: () => Promise<void> | void,
) {
	const res = await fetch(`/api/inventory/${organizationId}/${itemId}/stock`, {
		method: "PATCH",
		headers: getHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({
			adjustment: qty || 1,
			allowOverdraft: true,
			lotNumber,
			expirationDate: expDate,
		}),
	});
	if (res.ok) fetchItems();
}
