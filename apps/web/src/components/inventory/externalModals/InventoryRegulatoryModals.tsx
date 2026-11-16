import React, { lazy, Suspense } from "react";
import { InboundWaybillModal } from "../InboundWaybillModal.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { WarehouseWriteoffItem } from "./useAuditAndManagerWriteoffHandlers.js";

const MdlpScanningModal = lazy(() => import("../../mdlp/MdlpScanningModal.js").then((m) => ({ default: m.MdlpScanningModal })));
const WarehouseManagerModal = lazy(() => import("../ConsumablesBatchWriteoffModal.js").then((m) => ({ default: m.ConsumablesBatchWriteoffModal })));
const AcceptanceWaybillsModal = lazy(() => import("../InboundWaybillModal.js").then((m) => ({ default: m.InboundWaybillModal })));

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
	const isMdlpActive = isMdlpDisposalOpen || isMdlpScanningOpen;
	const handleCloseMdlp = () => {
		onCloseMdlpDisposal();
		onCloseMdlpScanning();
	};

	return (
		<>
			{isInboundInvoiceModalOpen && (
				<InboundWaybillModal
					isOpen={isInboundInvoiceModalOpen}
					onClose={onCloseInboundInvoiceModal}
					organizationId={organizationId}
					inventoryItems={items}
					onInvoicePosted={async () => fetchItems()}
					getHeaders={getHeaders}
				/>
			)}

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
