import React from "react";
import type { OneCExportItem } from "../OneCExportButton";
import { formatMoney } from "./types";

export interface OneCExportItemsTableProps {
	readonly items: readonly OneCExportItem[];
	readonly calculatedTotalRub: number;
}

export const OneCExportItemsTable: React.FC<OneCExportItemsTableProps> = ({
	items,
	calculatedTotalRub,
}) => {
	return (
		<div className="rounded-2xl border border-[var(--border,#cbd5e1)] overflow-hidden bg-[var(--paper,#ffffff)] shadow-2xs">
			<div className="overflow-x-auto touch-pan-x min-w-0 [WebkitOverflowScrolling:touch]">
				<table className="w-full text-xs text-left min-w-[560px]">
					<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)] font-bold uppercase text-[10px] tracking-wider">
						<tr>
							<th className="py-2.5 px-3 w-10 text-center">№</th>
							<th className="py-2.5 px-3 min-w-[180px]">Код услуги / Наименование</th>
							<th className="py-2.5 px-3 w-16 text-center whitespace-nowrap">Зуб</th>
							<th className="py-2.5 px-3 w-14 text-center whitespace-nowrap">Кол-во</th>
							<th className="py-2.5 px-3 min-w-[105px] text-right whitespace-nowrap">Цена</th>
							<th className="py-2.5 px-3 min-w-[95px] text-right whitespace-nowrap">Скидка</th>
							<th className="py-2.5 px-3 min-w-[115px] text-right whitespace-nowrap">Сумма</th>
							<th className="py-2.5 px-3 w-24 text-center whitespace-nowrap">Ставка НДС</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--border,#cbd5e1)]">
						{items.map((it, idx) => {
							const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
							const gross = it.priceRub * qty;
							const disc = it.discountRub || 0;
							const total = Math.max(0, gross - disc);

							return (
								<tr key={it.id || idx} className="hover:bg-[var(--paper-soft,#f8fafc)]/80 transition-colors">
									<td className="py-2.5 px-3 text-center font-mono text-[var(--muted,#64748b)]">{idx + 1}</td>
									<td className="py-2.5 px-3 max-w-[280px] min-w-0">
										<div className="flex items-center min-w-0" title={it.name}>
											{it.code804n && (
												<span className="text-xs text-[var(--muted,#64748b)] font-mono mr-2 shrink-0">
													{`[${it.code804n}]`}
												</span>
											)}
											<span className="font-semibold text-[var(--ink,#0f172a)] truncate min-w-0">{it.name}</span>
										</div>
									</td>
									<td className="py-2.5 px-3 text-center font-mono font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
										{it.toothNumber || "—"}
									</td>
									<td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">{qty}</td>
									<td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">{formatMoney(it.priceRub)}</td>
									<td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
										{disc > 0 ? `-${formatMoney(disc)}` : "—"}
									</td>
									<td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
										{formatMoney(total)}
									</td>
									<td className="py-2.5 px-3 text-center whitespace-nowrap">
										<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)]">
											Без НДС
										</span>
									</td>
								</tr>
							);
						})}
					</tbody>
					<tfoot className="bg-[var(--paper-soft,#f8fafc)] border-t border-[var(--border,#cbd5e1)] font-bold">
						<tr>
							<td colSpan={6} className="py-3 px-4 text-right whitespace-nowrap">ИТОГО К ВЫГРУЗКЕ В 1С:</td>
							<td className="py-3 px-3 text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
								{formatMoney(calculatedTotalRub)}
							</td>
							<td className="py-3 px-3 text-center text-[11px] text-[var(--muted,#64748b)] whitespace-nowrap">Без НДС</td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	);
};
