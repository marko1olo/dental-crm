import React from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import type { InboundWaybillLine } from "./inboundWaybillTypes.js";

interface InboundWaybillTableRowProps {
	readonly line: InboundWaybillLine;
	readonly idx: number;
	readonly isDeficit: boolean;
	readonly onUpdateLine: (id: string, updates: Partial<InboundWaybillLine>) => void;
	readonly onRemoveLine: (id: string) => void;
}

export const InboundWaybillTableRow: React.FC<InboundWaybillTableRowProps> = ({
	line,
	idx,
	isDeficit,
	onUpdateLine,
	onRemoveLine,
}) => {
	const subtotal = (Number(line.quantity) || 0) * (Number(line.unitCostRub) || 0);

	return (
		<tr className="hover:bg-[var(--paper-soft)]/60 transition">
			<td className="py-2 px-3 text-center text-[var(--muted)] font-mono">{idx + 1}</td>
			<td className="py-2 px-3">
				<input
					type="text"
					value={line.name}
					onChange={(e) => onUpdateLine(line.id, { name: e.target.value })}
					placeholder="Название материала..."
					className="w-full h-8 px-2 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium text-xs"
					list="inventory-catalog-list"
				/>
				{isDeficit && (
					<span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
						<ShieldCheck size={11} />
						<span>Погашает дефицит на складе</span>
					</span>
				)}
			</td>
			<td className="py-2 px-3">
				<input
					type="text"
					value={line.lotNumber}
					onChange={(e) => onUpdateLine(line.id, { lotNumber: e.target.value })}
					className="w-full h-8 px-2 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono text-xs"
				/>
			</td>
			<td className="py-2 px-3">
				<input
					type="date"
					value={line.expirationDate}
					onChange={(e) => onUpdateLine(line.id, { expirationDate: e.target.value })}
					className="w-full h-8 px-2 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
				/>
			</td>
			<td className="py-2 px-3 text-right">
				<input
					type="number"
					min={1}
					value={line.quantity}
					onChange={(e) => onUpdateLine(line.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
					className="w-full h-8 px-2 text-right rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold text-xs"
				/>
			</td>
			<td className="py-2 px-3">
				<input
					type="text"
					value={line.unit}
					onChange={(e) => onUpdateLine(line.id, { unit: e.target.value })}
					className="w-full h-8 px-1.5 text-center rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
				/>
			</td>
			<td className="py-2 px-3 text-right">
				<input
					type="number"
					min={0}
					value={line.unitCostRub}
					onChange={(e) => onUpdateLine(line.id, { unitCostRub: Math.max(0, Number(e.target.value) || 0) })}
					className="w-full h-8 px-2 text-right rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
				/>
			</td>
			<td className="py-2 px-3 text-right font-bold text-[var(--ink)] font-mono whitespace-nowrap">
				{subtotal.toLocaleString("ru-RU")} ₽
			</td>
			<td className="py-2 px-2 text-center">
				<button
					type="button"
					onClick={() => onRemoveLine(line.id)}
					className="p-1 rounded text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
					title="Удалить позицию"
				>
					<Trash2 size={14} />
				</button>
			</td>
		</tr>
	);
};
