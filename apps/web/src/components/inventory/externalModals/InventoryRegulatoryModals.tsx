import React, { lazy, Suspense } from "react";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { WarehouseWriteoffItem } from "./useAuditAndManagerWriteoffHandlers.js";

const MdlpScanningModal = lazy(() => import("../../mdlp/MdlpScanningModal.js").then((m) => ({ default: m.MdlpScanningModal })));
const WarehouseManagerModal = lazy(() => import("../ConsumablesBatchWriteoffModal.js").then((m) => ({ default: m.ConsumablesBatchWriteoffModal })));

export interface InventoryRegulatoryModalsProps {
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly isInboundInvoiceModalOpen?: boolean;
	readonly onCloseInboundInvoiceModal?: () => void;
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
	readonly isAcceptanceWaybillsOpen?: boolean;
	readonly onCloseAcceptanceWaybills?: () => void;
}

export const InventoryRegulatoryModals: React.FC<InventoryRegulatoryModalsProps> = ({
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
					/>
				</Suspense>
			)}
		</>
	);
};

export default InventoryRegulatoryModals;
