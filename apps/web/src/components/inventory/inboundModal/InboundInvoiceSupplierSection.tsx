import React, { useMemo } from "react";
import { CANONICAL_DENTAL_SUPPLIERS } from "../acceptanceWaybills/acceptanceCanonicalSuppliers.js";
import type { InventoryItem } from "../useInventoryLogic.js";

export interface InboundInvoiceSupplierSectionProps {
	readonly invoiceNumber: string;
	readonly setInvoiceNumber: (val: string) => void;
	readonly invoiceDate: string;
	readonly setInvoiceDate: (val: string) => void;
	readonly supplierName: string;
	readonly setSupplierName: (val: string) => void;
	readonly inventoryItems?: readonly InventoryItem[];
}

/**
 * Секция реквизитов накладной и выбора поставщика (Мандаты 8b, 8e, 8n, 8x).
 * Автоподбор поставщиков из реестра клиники, чистые доменные лейблы без канцелярита.
 */
export const InboundInvoiceSupplierSection: React.FC<InboundInvoiceSupplierSectionProps> = ({
	invoiceNumber,
	setInvoiceNumber,
	invoiceDate,
	setInvoiceDate,
	supplierName,
	setSupplierName,
	inventoryItems = [],
}) => {
	const supplierSuggestions = useMemo(() => {
		const names = new Set<string>();
		for (const sup of CANONICAL_DENTAL_SUPPLIERS) {
			if (sup.name) names.add(sup.name);
		}
		for (const it of inventoryItems) {
			if ((it as any).supplier) names.add((it as any).supplier);
		}
		return Array.from(names);
	}, [inventoryItems]);

	return (
		<div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-[var(--line)] bg-[var(--paper)] shrink-0">
			<div>
				<label htmlFor="inv-modal-number" className="block text-xs font-semibold text-[var(--muted)] mb-1">
					Номер приходной накладной *
				</label>
				<input
					id="inv-modal-number"
					type="text"
					required
					value={invoiceNumber}
					onChange={(e) => setInvoiceNumber(e.target.value)}
					className="w-full h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono font-medium transition-colors"
					placeholder="НАКЛ-..."
					data-testid="input-invoice-number"
				/>
			</div>

			<div>
				<label htmlFor="inv-modal-date" className="block text-xs font-semibold text-[var(--muted)] mb-1">
					Дата поступления *
				</label>
				<input
					id="inv-modal-date"
					type="date"
					required
					value={invoiceDate}
					onChange={(e) => setInvoiceDate(e.target.value)}
					className="w-full h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono transition-colors"
					data-testid="input-invoice-date"
				/>
			</div>

			<div>
				<label htmlFor="inv-modal-supplier" className="block text-xs font-semibold text-[var(--muted)] mb-1">
					Поставщик материалов *
				</label>
				<input
					id="inv-modal-supplier"
					type="text"
					required
					list="inbound-supplier-suggestions"
					value={supplierName}
					onChange={(e) => setSupplierName(e.target.value)}
					className="w-full h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-teal-500 transition-colors"
					placeholder="Выберите или введите поставщика..."
					data-testid="input-supplier-name"
				/>
				<datalist id="inbound-supplier-suggestions">
					{supplierSuggestions.map((s) => (
						<option key={s} value={s} />
					))}
				</datalist>
			</div>
		</div>
	);
};

export default InboundInvoiceSupplierSection;
