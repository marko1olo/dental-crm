import React, { lazy, Suspense } from "react";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { WarehouseWriteoffItem } from "./useAuditAndManagerWriteoffHandlers.js";

const MdlpScanningModal = lazy(() => import("../../mdlp/MdlpScanningModal.js").then((m) => ({ default: m.MdlpScanningModal })));
const WarehouseManagerModal = lazy(() => import("../ConsumablesBatchWriteoffModal.js").then((m) => ({ default: m.ConsumablesBatchWriteoffModal })));

export interface InventoryRegulatoryModalsProps {
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly fetchItems?: (() => void) | undefined;
	readonly getHeaders?: ((extra?: Record<string, string>) => Record<string, string>) | undefined;
	readonly isInboundInvoiceModalOpen?: boolean;
	readonly onCloseInboundInvoiceModal?: () => void;
	readonly isMdlpDisposalOpen: boolean;
	readonly onCloseMdlpDisposal: () => void;
	readonly isWarehouseManagerOpen: boolean;
	readonly onCloseWarehouseManager: () => void;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onConfirmManagerWriteoff: (lines: readonly WarehouseWriteoffItem[]) => Promise<void>;
	readonly isMdlpScanningOpen: boolean;
	readonly onCloseMdlpScanning: () => void;
	readonly isAcceptanceWaybillsOpen?: boolean;
	readonly onCloseAcceptanceWaybills?: () => void;
}

export const InventoryRegulatoryModals: React.FC<InventoryRegulatoryModalsProps> = ({
	organizationId, items, getHeaders,
	isMdlpDisposalOpen, onCloseMdlpDisposal, isWarehouseManagerOpen,
	onCloseWarehouseManager, onConfirmManagerWriteoff,
	isMdlpScanningOpen, onCloseMdlpScanning,
}) => {
	const isMdlpActive = isMdlpDisposalOpen || isMdlpScanningOpen;
	const handleCloseMdlp = () => {
		onCloseMdlpDisposal();
		onCloseMdlpScanning();
	};

	return (
		<>
			{isMdlpActive && (
				<Suspense fallback={null}>
					<MdlpScanningModal
						isOpen={isMdlpActive}
						onClose={handleCloseMdlp}
					/>
				</Suspense>
			)}

			{isWarehouseManagerOpen && (
				<Suspense fallback={null}>
					<WarehouseManagerModal
						isOpen={isWarehouseManagerOpen}
						onClose={onCloseWarehouseManager}
						organizationId={organizationId}
						warehouseItems={items}
						getHeaders={getHeaders}
						onConfirmWriteoff={(doc) => {
							if (Array.isArray(doc)) {
								const mapped: WarehouseWriteoffItem[] = doc
									.map((entry) => ({
										id: entry.inventoryItemId || entry.id,
										name: entry.itemName,
										writeoffQuantity: Number(entry.deductedQty) || 0,
										unitCostRub: entry.unitCostRub,
									}))
									.filter((entry) => entry.id.length > 0 && entry.writeoffQuantity > 0);
								if (mapped.length > 0) {
									return onConfirmManagerWriteoff(mapped);
								}
							}
						}}
					/>
				</Suspense>
			)}
		</>
	);
};

export default InventoryRegulatoryModals;
