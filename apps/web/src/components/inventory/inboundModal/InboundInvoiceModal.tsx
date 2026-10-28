/**
 * apps/web/src/components/inventory/inboundModal/InboundInvoiceModal.tsx
 *
 * Декомпозированная модалка приходной накладной поставщика DENTE CRM (Мандаты 8b, 8e, 8n, 8ze).
 * Ровно 1 Primary CTA кнопка var(--teal), отсутствие блокировок кнопки при открытии,
 * полная адаптивность для мобильных устройств (Apple HIG) и десктопа.
 */

import React from "react";
import { createPortal } from "react-dom";
import type { InventoryItem } from "../useInventoryLogic.js";
import { InboundInvoiceHeader } from "./InboundInvoiceHeader.js";
import { InboundInvoiceSupplierSection } from "./InboundInvoiceSupplierSection.js";
import { InboundInvoiceItemsTable } from "./InboundInvoiceItemsTable.js";
import { InboundInvoiceMobileCards } from "./InboundInvoiceMobileCards.js";
import { InboundInvoiceTotalsFooter } from "./InboundInvoiceTotalsFooter.js";
import { useInboundInvoiceLogic } from "./useInboundInvoiceLogic.js";
import type { InventoryInboundInvoiceModalProps } from "./InboundInvoiceTypes.js";

export { InboundInvoiceModal as default };

export const InboundInvoiceModal: React.FC<InventoryInboundInvoiceModalProps> = ({
	isOpen,
	onClose,
	organizationId = "",
	inventoryItems = [],
	onInvoicePosted,
	getHeaders,
}) => {
	const {
		invoiceNumber,
		setInvoiceNumber,
		invoiceDate,
		setInvoiceDate,
		supplierName,
		setSupplierName,
		lines,
		totals,
		isPosting,
		handleAddLine,
		handleRemoveLine,
		handleLineChange,
		handlePostInvoice,
	} = useInboundInvoiceLogic(
		organizationId,
		inventoryItems as readonly InventoryItem[],
		onClose,
		onInvoicePosted,
		getHeaders,
	);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="inbound-invoice-title"
			data-testid="warehouse-inbound-invoice-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget && !isPosting) onClose();
			}}
		>
			<form
				onSubmit={handlePostInvoice}
				style={{ maxWidth: "880px", width: "95%" }}
				className="relative my-auto rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-[var(--ink)]"
			>
				{/* Apple HIG Drag Handle для мобильных */}
				<div className="w-10 h-1 rounded-full bg-[var(--line)] mx-auto mt-2 sm:hidden shrink-0" aria-hidden="true" />

				{/* Шапка модалки */}
				<InboundInvoiceHeader onClose={onClose} />

				{/* Реквизиты накладной и поставщик */}
				<InboundInvoiceSupplierSection
					invoiceNumber={invoiceNumber}
					setInvoiceNumber={setInvoiceNumber}
					invoiceDate={invoiceDate}
					setInvoiceDate={setInvoiceDate}
					supplierName={supplierName}
					setSupplierName={setSupplierName}
					inventoryItems={inventoryItems as readonly InventoryItem[]}
				/>

				{/* Сетка позиций (десктопная таблица и мобильные карточки по Apple HIG) */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
					<InboundInvoiceItemsTable
						lines={lines}
						inventoryItems={inventoryItems as readonly InventoryItem[]}
						onAddLine={handleAddLine}
						onChangeLine={handleLineChange}
						onRemoveLine={handleRemoveLine}
					/>
					<InboundInvoiceMobileCards
						lines={lines}
						inventoryItems={inventoryItems as readonly InventoryItem[]}
						onAddLine={handleAddLine}
						onChangeLine={handleLineChange}
						onRemoveLine={handleRemoveLine}
					/>
				</div>

				{/* Подвал с итогами и действиями: ровно 1 Primary CTA кнопка var(--teal) */}
				<InboundInvoiceTotalsFooter
					totals={totals}
					isPosting={isPosting}
					onClose={onClose}
				/>
			</form>
		</div>
	);

	return typeof document === "undefined" ? modalContent : createPortal(modalContent, document.body);
};
