import { Trash2 } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers.js";
import type { InboundInvoiceItemLine } from "./InboundInvoiceTypes.js";

export interface InboundInvoiceItemRowProps {
	readonly line: InboundInvoiceItemLine;
	readonly index: number;
	readonly datalistId: string;
	readonly onChange: (id: string, field: keyof InboundInvoiceItemLine, value: string | number) => void;
	readonly onRemove: (id: string) => void;
}

/**
 * Строка товарной позиции в десктопной сетке приходной накладной (Мандаты 8b, 8e).
 * Плотная десктопная эргономика 32-36px, FEFO-партия и срок годности.
 */
export const InboundInvoiceItemRow: React.FC<InboundInvoiceItemRowProps> = ({
	line,
	index,
	datalistId,
	onChange,
	onRemove,
}) => {
	const lineSum = (Number(line.quantity) || 0) * (Number(line.unitCostRub) || 0);

	return (
		<tr className="hover:bg-[var(--paper-soft)] transition-colors border-b border-[var(--line)]">
			<td className="py-2 px-2.5 text-[var(--muted)] font-mono text-[11px] text-center">
				{index + 1}
			</td>
			<td className="py-1.5 px-2">
				<input
					type="text"
					required
					list={datalistId}
					value={line.name}
					onChange={(e) => onChange(line.id, "name", e.target.value)}
					placeholder="Наименование материала..."
					className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-medium transition-colors"
					data-testid={`inbound-line-name-${index}`}
				/>
			</td>
			<td className="py-1.5 px-2 w-32">
				<input
					type="text"
					value={line.lotNumber}
					onChange={(e) => onChange(line.id, "lotNumber", e.target.value)}
					placeholder="Партия / Lot..."
					className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono transition-colors"
				/>
			</td>
			<td className="py-1.5 px-2 w-36">
				<input
					type="date"
					required
					value={line.expirationDate}
					onChange={(e) => onChange(line.id, "expirationDate", e.target.value)}
					className="w-full h-8 px-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono transition-colors"
				/>
			</td>
			<td className="py-1.5 px-2 w-20">
				<input
					type="number"
					min="0.001"
					step="any"
					required
					value={line.quantity}
					onChange={(e) => onChange(line.id, "quantity", Number(e.target.value))}
					className="w-full h-8 px-2 text-xs text-right rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono font-bold transition-colors"
					data-testid={`inbound-line-quantity-${index}`}
				/>
			</td>
			<td className="py-1.5 px-2 w-16">
				<input
					type="text"
					value={line.unit}
					onChange={(e) => onChange(line.id, "unit", e.target.value)}
					className="w-full h-8 px-1.5 text-xs text-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 transition-colors"
					placeholder="шт."
				/>
			</td>
			<td className="py-1.5 px-2 w-24">
				<input
					type="number"
					min="0"
					step="0.01"
					value={line.unitCostRub}
					onChange={(e) => onChange(line.id, "unitCostRub", Number(e.target.value))}
					className="w-full h-8 px-2 text-xs text-right rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono transition-colors"
				/>
			</td>
			<td className="py-2 px-2.5 text-right font-mono text-[11px] font-bold text-[var(--ink)] whitespace-nowrap">
				{money(lineSum)}
			</td>
			<td className="py-2 px-1 text-center w-9">
				<button
					type="button"
					onClick={() => onRemove(line.id)}
					className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer transition-colors"
					title="Удалить позицию"
					aria-label="Удалить позицию"
				>
					<Trash2 size={14} />
				</button>
			</td>
		</tr>
	);
};

export default InboundInvoiceItemRow;
