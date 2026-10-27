import { Plus } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../useInventoryLogic.js";
import { InboundInvoiceItemRow } from "./InboundInvoiceItemRow.js";
import type { InboundInvoiceItemLine } from "./InboundInvoiceTypes.js";

export interface InboundInvoiceItemsTableProps {
	readonly lines: readonly InboundInvoiceItemLine[];
	readonly inventoryItems: readonly InventoryItem[];
	readonly onAddLine: () => void;
	readonly onChangeLine: (id: string, field: keyof InboundInvoiceItemLine, value: string | number) => void;
	readonly onRemoveLine: (id: string) => void;
}

/**
 * Десктопная сетка позиций приходной накладной (Мандаты 8b, 8e, 8n).
 * 1-клик добавление строк, автоподбор из номенклатуры склада.
 */
export const InboundInvoiceItemsTable: React.FC<InboundInvoiceItemsTableProps> = ({
	lines,
	inventoryItems,
	onAddLine,
	onChangeLine,
	onRemoveLine,
}) => {
	const datalistId = "inbound-modal-items-datalist";

	return (
		<div className="hidden md:block space-y-3">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
					Товарные позиции ({lines.length})
				</span>
				<button
					type="button"
					onClick={onAddLine}
					className="secondary-button h-8 px-3 text-xs font-semibold inline-flex items-center gap-1.5 rounded-xl cursor-pointer"
					data-testid="btn-add-inbound-line"
				>
					<Plus size={14} />
					<span>Добавить строку</span>
				</button>
			</div>

			<div className="border border-[var(--line)] rounded-xl overflow-hidden shadow-xs bg-[var(--paper)]">
				<table className="w-full text-left text-xs border-collapse">
					<thead>
						<tr className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--muted)] font-semibold">
							<th className="py-2 px-2.5 w-8 text-center">#</th>
							<th className="py-2 px-2.5 min-w-[180px]">Материал *</th>
							<th className="py-2 px-2.5 w-32">Партия (Lot)</th>
							<th className="py-2 px-2.5 w-36">Годен до (FEFO)</th>
							<th className="py-2 px-2.5 w-20 text-right">Кол-во</th>
							<th className="py-2 px-2.5 w-16 text-center">Ед.</th>
							<th className="py-2 px-2.5 w-24 text-right">Цена (₽)</th>
							<th className="py-2 px-2.5 w-24 text-right">Сумма</th>
							<th className="py-2 px-1 w-9 text-center" />
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line)]">
						{lines.map((line, idx) => (
							<InboundInvoiceItemRow
								key={line.id}
								line={line}
								index={idx}
								datalistId={datalistId}
								onChange={onChangeLine}
								onRemove={onRemoveLine}
							/>
						))}
					</tbody>
				</table>

				<datalist id={datalistId}>
					{inventoryItems.map((it) => (
						<option key={it.id} value={it.name} />
					))}
				</datalist>
			</div>
		</div>
	);
};

export default InboundInvoiceItemsTable;
