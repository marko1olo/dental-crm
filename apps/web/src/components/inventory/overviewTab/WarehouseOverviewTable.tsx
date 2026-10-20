import { AlertTriangle } from "lucide-react";
import type React from "react";
import type { InventoryItem } from "../useInventoryLogic.js";
import { formatCategoryRu } from "../WarehouseCatalogView.js";

export interface WarehouseOverviewTableProps {
	readonly filtered: readonly InventoryItem[];
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
}

export const WarehouseOverviewTable: React.FC<WarehouseOverviewTableProps> = ({
	filtered,
	onSelectItem,
}) => (
	<div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)] flex-1 overflow-y-auto">
		<table className="w-full text-left text-xs">
			<thead className="bg-[var(--paper-soft)] border-b border-[var(--line)] font-semibold text-[var(--muted)]">
				<tr>
					<th className="py-2 px-3">Наименование</th>
					<th className="py-2 px-3">Категория</th>
					<th className="py-2 px-3 text-right">Остаток</th>
				</tr>
			</thead>
			<tbody className="divide-y divide-[var(--line-subtle)]">
				{filtered.map((it) => (
					<tr
						key={it.id}
						className="hover:bg-[var(--paper-soft)] cursor-pointer"
						onClick={() => onSelectItem?.(it)}
					>
						<td className="py-2 px-3 font-medium text-[var(--ink)]">
							<div>{it.name}</div>
							{it.stockQuantity < 0 ? (
								<span
									className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 mt-0.5"
									data-testid={`overview-overdraft-${it.id}`}
								>
									<AlertTriangle
										size={10}
										className="text-amber-600 dark:text-amber-400 shrink-0"
									/>
									<span>
										Требуется закупка / отрицательный остаток:{" "}
										{it.stockQuantity} {it.unit || "шт."}
									</span>
								</span>
							) : it.stockQuantity === 0 ? (
								<span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 mt-0.5">
									<AlertTriangle
										size={10}
										className="text-amber-600 dark:text-amber-400 shrink-0"
									/>
									<span>Требуется закупка / нулевой остаток</span>
								</span>
							) : null}
						</td>
						<td className="py-2 px-3 text-[var(--muted)]">
							{formatCategoryRu(it.category)}
						</td>
						<td className="py-2 px-3 text-right font-mono font-bold text-[var(--ink)]">
							{it.stockQuantity} {it.unit || "шт."}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	</div>
);
