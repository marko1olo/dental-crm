import React from "react";
import type { InventoryItem } from "./useInventoryLogic.js";
import type { WarehouseInventoryAuditDocument } from "./warehouseInventoryEngine.js";
import { InventoryClinicalModals } from "./externalModals/InventoryClinicalModals.js";
import { InventoryRegulatoryModals } from "./externalModals/InventoryRegulatoryModals.js";
import { useExternalModalsHandlers } from "./externalModals/useExternalModalsHandlers.js";

export interface InventoryExternalModalsProps {
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly auditInitialDoc: WarehouseInventoryAuditDocument;
	readonly isClinicalWriteoffOpen: boolean;
	readonly onCloseClinicalWriteoff: () => void;
	readonly isProcedureDeductionOpen?: boolean;
	readonly onCloseProcedureDeduction?: () => void;
	readonly isWarehouseTransferOpen: boolean;
	readonly onCloseWarehouseTransfer: () => void;
	readonly isInventoryAuditOpen: boolean;
	readonly onCloseInventoryAudit: () => void;
	readonly onOpenInventoryAudit?: () => void;
	readonly isMdlpDisposalOpen: boolean;
	readonly onCloseMdlpDisposal: () => void;
	readonly isWarehouseManagerOpen: boolean;
	readonly onCloseWarehouseManager: () => void;
	readonly isMdlpScanningOpen: boolean;
	readonly onCloseMdlpScanning: () => void;
	readonly isNurseCarpuleModalOpen?: boolean;
	readonly onCloseNurseCarpuleModal?: () => void;
	readonly isAcceptanceWaybillsOpen: boolean;
	readonly onCloseAcceptanceWaybills: () => void;
	readonly isInboundInvoiceModalOpen: boolean;
	readonly onCloseInboundInvoiceModal: () => void;
	readonly isDeductingMaterials: boolean;
	readonly setIsDeductingMaterials: (isDeducting: boolean) => void;
	readonly fetchItems: () => void;
	readonly getHeaders: (headers?: Record<string, string>) => Record<string, string>;
	readonly onQuickWriteoffCarpules: (params?: { carpulesCount?: number; drugName?: string }) => Promise<void>;
}

/**
 * Контейнер модальных окон складского учета (Мандаты 8b, 8d, 8e).
 * Декомпозирован до <= 120 строк.
 */
export const InventoryExternalModals: React.FC<InventoryExternalModalsProps> = ({
	organizationId,
	items,
	auditInitialDoc,
	isClinicalWriteoffOpen,
	onCloseClinicalWriteoff,
	isWarehouseTransferOpen,
	onCloseWarehouseTransfer,
	isInventoryAuditOpen,
	onCloseInventoryAudit,
	onOpenInventoryAudit,
	isMdlpDisposalOpen,
	onCloseMdlpDisposal,
	isWarehouseManagerOpen,
	onCloseWarehouseManager,
	isMdlpScanningOpen,
	onCloseMdlpScanning,
	isAcceptanceWaybillsOpen,
	onCloseAcceptanceWaybills,
	isInboundInvoiceModalOpen,
	onCloseInboundInvoiceModal,
	fetchItems,
	getHeaders,
}) => {
	const handlers = useExternalModalsHandlers(organizationId, items, fetchItems, getHeaders);

	return (
		<>
			<InventoryClinicalModals
				isClinicalWriteoffOpen={isClinicalWriteoffOpen}
				onCloseClinicalWriteoff={onCloseClinicalWriteoff}
				onConfirmClinicalWriteoff={(doc) => handlers.handleClinicalWriteoff(doc, onCloseClinicalWriteoff)}
				isWarehouseTransferOpen={isWarehouseTransferOpen}
				onCloseWarehouseTransfer={onCloseWarehouseTransfer}
				onDocumentSavedWarehouseTransfer={async () => {
					onCloseWarehouseTransfer();
					fetchItems();
				}}
				onConfirmWarehouseTransfer={async (doc) => {
					if (doc) await handlers.handleWarehouseTransfer(doc);
				}}
				isInventoryAuditOpen={isInventoryAuditOpen}
				onCloseInventoryAudit={onCloseInventoryAudit}
				auditInitialDoc={auditInitialDoc}
				onApplyInventoryAudit={(doc) => handlers.handleInventoryAudit(doc, onCloseInventoryAudit)}
				onDocumentSavedInventoryAudit={fetchItems}
			/>

			<InventoryRegulatoryModals
				organizationId={organizationId}
				items={items}
				isInboundInvoiceModalOpen={isInboundInvoiceModalOpen}
				onCloseInboundInvoiceModal={onCloseInboundInvoiceModal}
				fetchItems={fetchItems}
				getHeaders={getHeaders}
				isMdlpDisposalOpen={isMdlpDisposalOpen}
				onCloseMdlpDisposal={onCloseMdlpDisposal}
				isWarehouseManagerOpen={isWarehouseManagerOpen}
				onCloseWarehouseManager={onCloseWarehouseManager}
				onOpenInventoryAudit={onOpenInventoryAudit}
				onConfirmManagerWriteoff={(lines) => handlers.handleWarehouseManagerWriteoff(lines, onCloseWarehouseManager)}
				isMdlpScanningOpen={isMdlpScanningOpen}
				onCloseMdlpScanning={onCloseMdlpScanning}
				isAcceptanceWaybillsOpen={isAcceptanceWaybillsOpen}
				onCloseAcceptanceWaybills={onCloseAcceptanceWaybills}
			/>
		</>
	);
};

export default InventoryExternalModals;
