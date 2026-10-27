import { Trash2 } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers.js";
import type { InboundInvoiceItemLine } from "./InboundInvoiceTypes.js";

export interface InboundInvoiceMobileCardItemProps {
	readonly line: InboundInvoiceItemLine;
	readonly index: number;
	readonly datalistId: string;
	readonly onChangeLine: (id: string, field: keyof InboundInvoiceItemLine, value: string | number) => void;
	readonly onRemoveLine: (id: string) => void;
}

/**
 * Отдельная карточка товарной позиции в мобильном представлении (Мандаты 8b, 8e, Apple HIG).
 * Эргономичные тач-таргеты >= 44x44px.
 */
export const InboundInvoiceMobileCardItem: React.FC<InboundInvoiceMobileCardItemProps> = ({
	line,
	index,
	datalistId,
	onChangeLine,
	onRemoveLine,
}) => {
	const sum = (Number(line.quantity) || 0) * (Number(line.unitCostRub) || 0);

	return (
		<div className="p-3.5 bg-[var(--paper-soft)] border border-[var(--line)] rounded-2xl space-y-2.5 shadow-2xs">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--muted)] font-mono">#{index + 1}</span>
				<span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
					{money(sum)}
				</span>
				<button
					type="button"
					onClick={() => onRemoveLine(line.id)}
					className="min-w-[44px] min-h-[44px] p-2 -mr-2 rounded-xl text-[var(--muted)] hover:text-rose-600 flex items-center justify-center cursor-pointer"
					aria-label="Удалить позицию"
				>
					<Trash2 size={16} />
				</button>
			</div>

			<div>
				<label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">Материал *</label>
				<input
					type="text"
					required
					list={datalistId}
					value={line.name}
					onChange={(e) => onChangeLine(line.id, "name", e.target.value)}
					placeholder="Наименование..."
					className="w-full h-10 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-medium"
				/>
			</div>

			<div className="grid grid-cols-2 gap-2">
				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">Партия (Lot)</label>
					<input
						type="text" value={line.lotNumber}
						onChange={(e) => onChangeLine(line.id, "lotNumber", e.target.value)}
						placeholder="LOT-..."
						className="w-full h-10 px-2.5 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono"
					/>
				</div>
				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">Годен до (FEFO) *</label>
					<input
						type="date" required value={line.expirationDate}
						onChange={(e) => onChangeLine(line.id, "expirationDate", e.target.value)}
						className="w-full h-10 px-2 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono"
					/>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-2">
				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">Кол-во *</label>
					<input
						type="number" min="0.001" step="any" required value={line.quantity}
						onChange={(e) => onChangeLine(line.id, "quantity", Number(e.target.value))}
						className="w-full h-10 px-2 text-xs text-right rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono font-bold"
					/>
				</div>
				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">Ед.</label>
					<input
						type="text" value={line.unit} placeholder="шт."
						onChange={(e) => onChangeLine(line.id, "unit", e.target.value)}
						className="w-full h-10 px-2 text-xs text-center rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500"
					/>
				</div>
				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">Цена (₽)</label>
					<input
						type="number" min="0" step="0.01" value={line.unitCostRub}
						onChange={(e) => onChangeLine(line.id, "unitCostRub", Number(e.target.value))}
						className="w-full h-10 px-2 text-xs text-right rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono"
					/>
				</div>
			</div>
		</div>
	);
};

export default InboundInvoiceMobileCardItem;
