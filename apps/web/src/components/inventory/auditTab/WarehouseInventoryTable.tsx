import { Package } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers.js";
import { kopecksToRubles, type WarehouseAuditItemLine } from "../warehouseInventoryEngine.js";
import type { InventoryItem } from "../useInventoryLogic.js";

export interface WarehouseInventoryTableProps {
	readonly items: readonly InventoryItem[];
	readonly filteredLines: readonly WarehouseAuditItemLine[];
	readonly onActualQtyChange: (itemId: string, newQty: number) => void;
}

export const WarehouseInventoryTable: React.FC<WarehouseInventoryTableProps> = ({
	items, filteredLines, onActualQtyChange,
}) => {
	return (
		<div className="flex-1 border border-[var(--line)] rounded-xl overflow-hidden flex flex-col bg-[var(--paper)] min-h-[280px]">
			<div className="overflow-x-auto flex-1">
				<table className="w-full text-left text-xs border-collapse" data-testid="warehouse-inventory-table">
					<thead className="bg-[var(--paper-soft)] text-[var(--muted)] border-b border-[var(--line)] sticky top-0 z-10 font-semibold">
						<tr>
							<th className="py-2.5 px-3">Наименование / Артикул</th>
							<th className="py-2.5 px-3">Серия / Срок</th>
							<th className="py-2.5 px-3 text-center">Учётное кол-во</th>
							<th className="py-2.5 px-3 text-center w-28">Фактическое кол-во</th>
							<th className="py-2.5 px-3 text-center">Расхождение</th>
							<th className="py-2.5 px-3 text-right">Сумма расхождения</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line)]">
						{items.length === 0 ? (
							<tr>
								<td colSpan={6} className="py-14 text-center text-[var(--muted)]">
									<div className="flex flex-col items-center justify-center max-w-sm mx-auto">
										<div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mb-3 border border-teal-500/20">
											<Package size={24} />
										</div>
										<p className="font-bold text-sm text-[var(--ink)] mb-1">Склад пуст — проведите первую приходную накладную</p>
										<p className="text-xs text-[var(--muted)] mb-2">В боевой базе отсутствуют остатки для инвентаризационной описи.</p>
									</div>
								</td>
							</tr>
						) : filteredLines.length === 0 ? (
							<tr>
								<td colSpan={6} className="py-12 text-center text-[var(--muted)]">
									<Package size={28} className="mx-auto mb-2 opacity-50" />
									<p className="font-medium">Позиции по выбранным критериям не найдены</p>
								</td>
							</tr>
						) : (
							filteredLines.map((line) => {
								const isShortage = line.discrepancyType === "shortage";
								const isSurplus = line.discrepancyType === "surplus";
								return (
									<tr
										key={line.itemId}
										className={`hover:bg-[var(--paper-soft)] transition-colors ${isShortage ? "bg-rose-500/5" : isSurplus ? "bg-emerald-500/5" : ""}`}
										data-testid={`inventory-line-${line.itemId}`}
									>
										<td className="py-2 px-3 font-medium text-[var(--ink)]">
											<div className="truncate max-w-[240px] sm:max-w-xs font-semibold">{line.nameRu}</div>
											<div className="text-[10px] text-[var(--muted)] font-mono">{line.sku} • {line.category}</div>
										</td>
										<td className="py-2 px-3 text-[var(--muted)]">
											<div className="font-mono text-[11px] text-[var(--ink)] font-semibold">{line.batchNumber}</div>
											<div className="text-[10px] mt-0.5">до {line.expiryDate}</div>
										</td>
										<td className="py-2 px-3 text-center font-bold text-[var(--ink)]">
											{line.bookQuantity} {line.unitRu}
										</td>
										<td className="py-2 px-3 text-center">
											<div className="flex items-center justify-center gap-1.5 flex-nowrap">
												<input
													type="number"
													min="0"
													step="1"
													value={line.actualQuantity}
													onChange={(e) => onActualQtyChange(line.itemId, Number.parseFloat(e.target.value) || 0)}
													className="w-16 h-7 text-center rounded-md border border-[var(--line)] text-xs font-bold font-mono tabular-nums bg-[var(--paper)] text-[var(--ink)]"
													data-testid={`input-actual-qty-${line.itemId}`}
												/>
												<button
													type="button"
													onClick={() => onActualQtyChange(line.itemId, line.bookQuantity)}
													className={`h-7 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${line.actualQuantity === line.bookQuantity ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)]"}`}
													title="Приравнять к учетному остатку (✓ Совпадает с учётом)"
													data-testid={`btn-match-line-${line.itemId}`}
												>
													✓ Совпадает
												</button>
											</div>
										</td>
										<td className="py-2 px-3 text-center">
											<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
												isShortage ? "bg-rose-500/20 text-rose-800 dark:text-rose-200" : isSurplus ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200" : "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]"
											}`}>
												{isShortage && `-${line.discrepancyQuantity} ${line.unitRu}`}
												{isSurplus && `+${line.discrepancyQuantity} ${line.unitRu}`}
												{!isShortage && !isSurplus && "Совпадает"}
											</span>
										</td>
										<td className={`py-2 px-3 text-right font-bold ${isShortage ? "text-rose-600 dark:text-rose-400" : isSurplus ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted)]"}`}>
											{line.discrepancyCostKopecks === 0 ? "0.00 ₽" : `${isShortage ? "-" : "+"}${money(kopecksToRubles(Math.abs(line.discrepancyCostKopecks)))}`}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default WarehouseInventoryTable;
