import React from "react";
import { InboundInvoiceHeader } from "./InboundInvoiceHeader.js";
import { InboundInvoiceItemsTable } from "./InboundInvoiceItemsTable.js";
import { InboundInvoiceMobileCards } from "./InboundInvoiceMobileCards.js";
import { InboundInvoiceSupplierSection } from "./InboundInvoiceSupplierSection.js";
import { InboundInvoiceTotalsFooter } from "./InboundInvoiceTotalsFooter.js";
import type { InventoryInboundInvoiceModalProps } from "./InboundInvoiceTypes.js";
import { useInboundInvoiceLogic } from "./useInboundInvoiceLogic.js";

/**
 * Модальное окно приходной накладной и оприходования материалов (Мандаты 8b, 8e, 8n, 8ze).
 * Декомпозировано на изолированные микро-модули <= 120 строк.
 */
export const InboundInvoiceModal: React.FC<InventoryInboundInvoiceModalProps> = ({
	isOpen,
	onClose,
	organizationId,
	inventoryItems,
	onInvoicePosted,
	getHeaders,
}) => {
	const logic = useInboundInvoiceLogic(
		organizationId,
		inventoryItems,
		onClose,
		onInvoicePosted,
		getHeaders,
	);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="inbound-invoice-title"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div
				className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<InboundInvoiceHeader onClose={onClose} />

				<form onSubmit={logic.handlePostInvoice} className="flex flex-col flex-1 overflow-hidden">
					<InboundInvoiceSupplierSection
						invoiceNumber={logic.invoiceNumber}
						setInvoiceNumber={logic.setInvoiceNumber}
						invoiceDate={logic.invoiceDate}
						setInvoiceDate={logic.setInvoiceDate}
						supplierName={logic.supplierName}
						setSupplierName={logic.setSupplierName}
						inventoryItems={inventoryItems}
					/>

					<div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
						<InboundInvoiceItemsTable
							lines={logic.lines}
							inventoryItems={inventoryItems}
							onAddLine={logic.handleAddLine}
							onChangeLine={logic.handleLineChange}
							onRemoveLine={logic.handleRemoveLine}
						/>

						<InboundInvoiceMobileCards
							lines={logic.lines}
							inventoryItems={inventoryItems}
							onAddLine={logic.handleAddLine}
							onChangeLine={logic.handleLineChange}
							onRemoveLine={logic.handleRemoveLine}
						/>
					</div>

					<InboundInvoiceTotalsFooter
						totals={logic.totals}
						isPosting={logic.isPosting}
						onClose={onClose}
					/>
				</form>
			</div>
		</div>
	);
};

export default InboundInvoiceModal;
