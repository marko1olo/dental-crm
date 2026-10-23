import React, { lazy, Suspense } from "react";
import { InventoryInboundInvoiceModal } from "../../InventoryInboundInvoiceModal.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { WarehouseWriteoffItem } from "../warehouseManagerModules/types.js";

const MdlpDisposalQueueModal = lazy(() => import("../mdlp/index.js").then((m) => ({ default: m.MdlpDisposalQueueModal })));
const MdlpScanningModal = lazy(() => import("../../mdlp/MdlpScanningModal.js").then((m) => ({ default: m.MdlpScanningModal })));
const WarehouseManagerModal = lazy(() => import("../WarehouseManagerModal.js").then((m) => ({ default: m.WarehouseManagerModal })));
const AcceptanceWaybillsModal = lazy(() => import("../AcceptanceWaybillsModal.js").then((m) => ({ default: m.AcceptanceWaybillsModal })));

export interface InventoryRegulatoryModalsProps {
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly isInboundInvoiceModalOpen: boolean;
	readonly onCloseInboundInvoiceModal: () => void;
	readonly fetchItems: () => void;
	readonly getHeaders: (headers?: Record<string, string>) => Record<string, string>;
	readonly isMdlpDisposalOpen: boolean;
	readonly onCloseMdlpDisposal: () => void;
	readonly isWarehouseManagerOpen: boolean;
	readonly onCloseWarehouseManager: () => void;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onConfirmManagerWriteoff: (lines: readonly WarehouseWriteoffItem[]) => Promise<void>;
	readonly isMdlpScanningOpen: boolean;
	readonly onCloseMdlpScanning: () => void;
	readonly isAcceptanceWaybillsOpen: boolean;
	readonly onCloseAcceptanceWaybills: () => void;
}

export const InventoryRegulatoryModals: React.FC<InventoryRegulatoryModalsProps> = ({
	organizationId, items, isInboundInvoiceModalOpen, onCloseInboundInvoiceModal, fetchItems,
	getHeaders, isMdlpDisposalOpen, onCloseMdlpDisposal, isWarehouseManagerOpen,
	onCloseWarehouseManager, onOpenInventoryAudit, onConfirmManagerWriteoff,
	isMdlpScanningOpen, onCloseMdlpScanning, isAcceptanceWaybillsOpen, onCloseAcceptanceWaybills,
}) => {
	return (
		<>
			{isInboundInvoiceModalOpen && (
				<InventoryInboundInvoiceModal
					isOpen={isInboundInvoiceModalOpen}
					onClose={onCloseInboundInvoiceModal}
					organizationId={organizationId}
					inventoryItems={items}
					onInvoicePosted={async () => fetchItems()}
					getHeaders={getHeaders}
				/>
			)}

			{isMdlpDisposalOpen && (
				<Suspense fallback={null}>
					<MdlpDisposalQueueModal
						isOpen={isMdlpDisposalOpen}
						onClose={onCloseMdlpDisposal}
						onConfirmDisposal={async () => {
							onCloseMdlpDisposal();
							fetchItems();
						}}
					/>
				</Suspense>
			)}

			{isWarehouseManagerOpen && (
				<Suspense fallback={null}>
					<WarehouseManagerModal
						isOpen={isWarehouseManagerOpen}
						onClose={onCloseWarehouseManager}
						onOpenInventoryAudit={() => {
							onCloseWarehouseManager();
							onOpenInventoryAudit?.();
						}}
						initialItems={items}
						onConfirmWriteoff={onConfirmManagerWriteoff}
					/>
				</Suspense>
			)}

			{isMdlpScanningOpen && (
				<Suspense fallback={null}>
					<MdlpScanningModal
						isOpen={isMdlpScanningOpen}
						onClose={onCloseMdlpScanning}
					/>
				</Suspense>
			)}

			{isAcceptanceWaybillsOpen && (
				<Suspense fallback={null}>
					<AcceptanceWaybillsModal
						isOpen={isAcceptanceWaybillsOpen}
						onClose={onCloseAcceptanceWaybills}
						organizationId={organizationId}
						inventoryItems={items.map((it) => ({
							id: it.id,
							name: it.name,
							stockQuantity: Number(it.stockQuantity) || 0,
							unitCostRub: it.unitCostRub != null ? String(it.unitCostRub) : undefined,
							unit: it.unit || "уп",
						}))}
						onWaybillPosted={async () => fetchItems()}
						getHeaders={getHeaders}
					/>
				</Suspense>
			)}
		</>
	);
};

export default InventoryRegulatoryModals;
