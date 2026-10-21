import type React from "react";
import { createPortal } from "react-dom";
import type { WarehouseDiscrepancyAct, WarehouseTransferDocument } from "./warehouseTransferEngine.js";
import { WarehouseTransferAddBar } from "./WarehouseTransferAddBar.js";
import { WarehouseTransferAlerts } from "./WarehouseTransferAlerts.js";
import { WarehouseTransferFooter } from "./WarehouseTransferFooter.js";
import { WarehouseTransferHeader } from "./WarehouseTransferHeader.js";
import { WarehouseTransferRouteBar } from "./WarehouseTransferRouteBar.js";
import { WarehouseTransferSummaryBar } from "./WarehouseTransferSummaryBar.js";
import { WarehouseTransferTable } from "./WarehouseTransferTable.js";
import { useWarehouseTransferLogic } from "./useWarehouseTransferLogic.js";
import "./warehouseTransfer.css";

export interface WarehouseTransferModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialDocument?: WarehouseTransferDocument | undefined;
	readonly onDocumentSaved?: ((doc: WarehouseTransferDocument) => void) | undefined;
	readonly onConfirmTransfer?: ((doc?: WarehouseTransferDocument) => void | Promise<void>) | undefined;
	readonly onDiscrepancyActGenerated?: ((act: WarehouseDiscrepancyAct) => void) | undefined;
}

export const WarehouseTransferModal: React.FC<WarehouseTransferModalProps> = (props) => {
	const { isOpen, onClose } = props;
	const {
		docNumber, setDocNumber, docDate, setDocDate, sourceBranchId, setSourceBranchId, targetBranchId, setTargetBranchId,
		status, setStatus, items, selectedCatalogItemId, setSelectedCatalogItemId, addQuantity, setAddQuantity,
		getAvailableStock, overdraftItems, hasOverdraft, totals, validation,
		handleAddItem, handleRemoveItem, handleUpdateItem, handleSaveDocument, handleOneClickWriteOff, handlePrintTorg13, handlePrintTorg2,
	} = useWarehouseTransferLogic(props);

	if (!isOpen) return null;

	const modalContent = (
		<div className="wh-transfer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="wh-modal-title">
			<div className="wh-transfer-container" onClick={(e) => e.stopPropagation()}>
				<WarehouseTransferHeader
					status={status}
					onStatusChange={setStatus}
					onClose={onClose}
				/>

				<div className="wh-transfer-body">
					<WarehouseTransferRouteBar
						sourceBranchId={sourceBranchId}
						targetBranchId={targetBranchId}
						onSourceBranchChange={setSourceBranchId}
						onTargetBranchChange={setTargetBranchId}
						docNumber={docNumber}
						onDocNumberChange={setDocNumber}
						docDate={docDate}
						onDocDateChange={setDocDate}
					/>

					<WarehouseTransferAlerts
						isValid={validation.isValid}
						validationErrors={validation.errors}
						hasOverdraft={hasOverdraft}
						overdraftItems={overdraftItems}
						getAvailableStock={getAvailableStock}
					/>

					<WarehouseTransferTable
						items={items}
						getAvailableStock={getAvailableStock}
						onUpdateItem={handleUpdateItem}
						onRemoveItem={handleRemoveItem}
					/>

					<WarehouseTransferAddBar
						sourceBranchId={sourceBranchId}
						selectedCatalogItemId={selectedCatalogItemId}
						onSelectCatalogItem={setSelectedCatalogItemId}
						addQuantity={addQuantity}
						onAddQuantityChange={setAddQuantity}
						onAddItem={handleAddItem}
					/>

					<WarehouseTransferSummaryBar totals={totals} />
				</div>

				<WarehouseTransferFooter
					hasDiscrepancy={totals.hasDiscrepancy}
					onPrintTorg13={handlePrintTorg13}
					onPrintTorg2={handlePrintTorg2}
					onOneClickWriteOff={handleOneClickWriteOff}
					onClose={onClose}
					onSaveDocument={() => handleSaveDocument()}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body
		? createPortal(modalContent, document.body)
		: modalContent;
};

export default WarehouseTransferModal;
