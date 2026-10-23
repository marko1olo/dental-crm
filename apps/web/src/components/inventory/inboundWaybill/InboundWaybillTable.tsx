import React from "react";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { InboundWaybillLine } from "./inboundWaybillTypes.js";
import { InboundWaybillTableRow } from "./InboundWaybillTableRow.js";

interface InboundWaybillTableProps {
	readonly lines: InboundWaybillLine[];
	readonly deficitMap: Map<string, number>;
	readonly inventoryItems: readonly InventoryItem[];
	readonly onUpdateLine: (id: string, updates: Partial<InboundWaybillLine>) => void;
	readonly onRemoveLine: (id: string) => void;
}

export const InboundWaybillTable: React.FC<InboundWaybillTableProps> = ({
	lines,
	deficitMap,
	inventoryItems,
	onUpdateLine,
	onRemoveLine,
}) => {
	return (
		<div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-[220px]">
			<div className="overflow-x-auto rounded-xl border border-[var(--line)]">
				<table className="w-full text-xs text-left border-collapse" style={{ minWidth: 680 }}>
					<thead className="bg-[var(--paper-soft)] text-[var(--muted)] border-b border-[var(--line)] uppercase font-semibold text-[11px]">
						<tr>
							<th className="py-2.5 px-3 w-8 text-center">№</th>
							<th className="py-2.5 px-3">Материал / Препарат</th>
							<th className="py-2.5 px-3 w-28">Партия (LOT)</th>
							<th className="py-2.5 px-3 w-32">Срок годности</th>
							<th className="py-2.5 px-3 w-20 text-right">Кол-во</th>
							<th className="py-2.5 px-3 w-16">Ед.</th>
							<th className="py-2.5 px-3 w-24 text-right">Цена, ₽</th>
							<th className="py-2.5 px-3 w-28 text-right">Сумма, ₽</th>
							<th className="py-2.5 px-2 w-10 text-center"></th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line)]">
						{lines.map((line, idx) => (
							<InboundWaybillTableRow
								key={line.id}
								line={line}
								idx={idx}
								isDeficit={deficitMap.has(line.name.toLowerCase().trim())}
								onUpdateLine={onUpdateLine}
								onRemoveLine={onRemoveLine}
							/>
						))}
					</tbody>
				</table>
			</div>

			<datalist id="inventory-catalog-list">
				{inventoryItems.map((it) => (
					<option key={it.id} value={it.name} />
				))}
			</datalist>
		</div>
	);
};
