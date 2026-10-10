import { Trash2 } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers.js";
import { kopecksToRubles } from "../../inventory/acceptanceWaybillsEngine.js";
import type { WaybillItemsGridProps } from "./types.js";

export const WaybillItemsGrid: React.FC<WaybillItemsGridProps> = ({
	items,
	mode,
	onRemoveItem,
}) => {
	if (mode === "draft") {
		return (
			<table className="w-full text-left text-xs border-collapse">
				<thead className="bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-b border-[var(--line,#e2e8f0)]">
					<tr>
						<th className="py-1.5 px-2">Товар</th>
						<th className="py-1.5 px-2">Серия</th>
						<th className="py-1.5 px-2">Срок годности</th>
						<th className="py-1.5 px-2">Кол-во</th>
						<th className="py-1.5 px-2">Цена без НДС</th>
						<th className="py-1.5 px-2">Сумма с НДС</th>
						<th className="py-1.5 px-2 w-8"></th>
					</tr>
				</thead>
				<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
					{items.map((it) => (
						<tr key={it.id}>
							<td className="py-1.5 px-2 font-medium">{it.name}</td>
							<td className="py-1.5 px-2 font-mono text-[11px]">{it.batchNumber}</td>
							<td className="py-1.5 px-2">{it.expirationDate}</td>
							<td className="py-1.5 px-2 font-semibold">
								{it.quantity} {it.unit}
							</td>
							<td className="py-1.5 px-2">
								{money(kopecksToRubles(it.unitPriceKopecks))}
							</td>
							<td className="py-1.5 px-2 font-bold text-teal-700 dark:text-teal-300">
								{money(kopecksToRubles(it.lineTotalKopecks))}
							</td>
							<td className="py-1.5 px-2">
								{onRemoveItem && (
									<button
										type="button"
										onClick={() => onRemoveItem(it.id)}
										className="text-rose-500 hover:text-rose-700"
										title="Удалить строку"
									>
										<Trash2 size={13} />
									</button>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		);
	}

	return (
		<table className="w-full text-left text-xs border-collapse">
			<thead className="bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-b border-[var(--line,#e2e8f0)] font-semibold">
				<tr>
					<th className="py-2 px-2.5">Наименование ТМЦ</th>
					<th className="py-2 px-2.5">Серия / Партия</th>
					<th className="py-2 px-2.5">Срок годности</th>
					<th className="py-2 px-2.5">Кол-во</th>
					<th className="py-2 px-2.5">Цена без НДС</th>
					<th className="py-2 px-2.5 text-right">Сумма с НДС</th>
				</tr>
			</thead>
			<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
				{items.map((it) => (
					<tr key={it.id} className="hover:bg-[var(--paper-soft,#f8fafc)]">
						<td className="py-2 px-2.5 font-medium">{it.name}</td>
						<td className="py-2 px-2.5 font-mono text-[11px] text-[var(--muted,#64748b)]">
							{it.batchNumber}
						</td>
						<td className="py-2 px-2.5 text-[var(--muted,#64748b)]">
							{it.expirationDate}
						</td>
						<td className="py-2 px-2.5 font-semibold">
							{it.quantity} {it.unit}
						</td>
						<td className="py-2 px-2.5 text-[var(--muted,#64748b)]">
							{money(kopecksToRubles(it.unitPriceKopecks))}
						</td>
						<td className="py-2 px-2.5 text-right font-bold text-teal-700 dark:text-teal-300">
							{money(kopecksToRubles(it.lineTotalKopecks))}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
};
