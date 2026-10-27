/**
 * ACCEPTANCE WAYBILLS MODAL (МАНДАТЫ 8e, 8k, 8n, 8s)
 * Десктопный HUD быстрого оприходования накладных от реальных стоматологических поставщиков.
 * Декомпозирован до <= 120 строк.
 */

import type React from "react";
import { createPortal } from "react-dom";
import { AcceptanceWaybillsFooter } from "./acceptanceWaybills/AcceptanceWaybillsFooter.js";
import { AcceptanceWaybillsHeader } from "./acceptanceWaybills/AcceptanceWaybillsHeader.js";
import { AcceptanceWaybillsItemsTable } from "./acceptanceWaybills/AcceptanceWaybillsItemsTable.js";
import { AcceptanceWaybillsTemplatesBar } from "./acceptanceWaybills/AcceptanceWaybillsTemplatesBar.js";
import { useAcceptanceWaybillsState } from "./acceptanceWaybills/useAcceptanceWaybillsState.js";
import type { AcceptanceWaybillDocument } from "./acceptanceWaybillsEngine.js";
import "./acceptanceWaybills.css";

export interface AcceptanceWaybillsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId?: string | undefined;
	readonly initialWaybill?: AcceptanceWaybillDocument | undefined;
	readonly onWaybillPosted?: ((waybill: AcceptanceWaybillDocument) => void | Promise<void>) | undefined;
	readonly inventoryItems?: readonly {
		readonly id: string;
		readonly name: string;
		readonly stockQuantity: number;
		readonly unitCostRub?: string | undefined;
		readonly unit?: string | undefined;
	}[] | undefined;
	readonly getHeaders?: ((extra?: Record<string, string>) => Record<string, string>) | undefined;
}

export const AcceptanceWaybillsModal: React.FC<AcceptanceWaybillsModalProps> = ({
	isOpen,
	onClose,
	organizationId,
	initialWaybill,
	onWaybillPosted,
	inventoryItems = [],
	getHeaders,
}) => {
	const state = useAcceptanceWaybillsState({
		isOpen,
		onClose,
		organizationId,
		initialWaybill,
		onWaybillPosted,
		inventoryItems,
		getHeaders,
	});

	if (!isOpen) return null;

	const modalContent = (
		<div className="acceptance-modal-overlay" role="dialog" aria-modal="true" data-testid="acceptance-waybills-modal">
			<div className="acceptance-modal-window">
				<div className="acceptance-drag-handle" aria-hidden="true" />
				<AcceptanceWaybillsHeader
					waybill={state.waybill}
					setWaybill={state.setWaybill}
					selectedSupplierId={state.selectedSupplierId}
					onSupplierChange={state.handleSupplierChange}
					onLoadSample={state.handleLoadSample}
					onClose={onClose}
				/>

				<AcceptanceWaybillsTemplatesBar
					onAddFromTemplate={state.handleAddFromTemplate}
					onAddEmptyItem={state.handleAddEmptyItem}
					onSortFefo={state.handleSortFefo}
				/>

				<AcceptanceWaybillsItemsTable
					items={state.waybill.items}
					receiptDate={state.waybill.receiptDate}
					overdraftItemIds={state.overdraftItemIds}
					onUpdateItem={state.handleUpdateItem}
					onRemoveItem={state.handleRemoveItem}
				/>

				<AcceptanceWaybillsFooter
					waybill={state.waybill}
					isPosting={state.isPosting}
					onPrintTorg12={state.handlePrintTorg12}
					onExportCsv={state.handleExportCsv}
					onPostWaybill={state.handlePostWaybill}
				/>
			</div>
		</div>
	);

	if (typeof document === "undefined") {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};

export default AcceptanceWaybillsModal;
