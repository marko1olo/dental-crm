import { Plus, Truck } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers.js";
import { kopecksToRubles } from "../../inventory/acceptanceWaybillsEngine.js";
import type { WaybillsListTableProps } from "./types.js";

export const WaybillsListTable: React.FC<WaybillsListTableProps> = ({
	waybills,
	totalWaybillsCount,
	selectedWaybillId,
	isCreatingNew,
	onSelectWaybill,
	onStartCreateNew,
}) => {
	return (
		<div className="border border-[var(--line,#e2e8f0)] rounded-xl bg-[var(--paper,#ffffff)] flex flex-col overflow-hidden">
			<div className="p-2.5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] font-semibold text-xs text-[var(--muted,#64748b)] flex items-center justify-between">
				<span>Накладные ({waybills.length})</span>
				<span className="text-[11px] font-normal">Сортировка: новые</span>
			</div>

			<div className="flex-1 overflow-y-auto divide-y divide-[var(--line,#e2e8f0)] p-1 flex flex-col">
				{waybills.length === 0 ? (
					<div
						className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[var(--muted,#64748b)] gap-2 my-auto"
						data-testid="waybills-empty-state"
					>
						<Truck size={32} className="opacity-40 text-teal-600" />
						<div className="font-semibold text-sm text-[var(--ink,#0f172a)]">
							{totalWaybillsCount === 0
								? "Склад пуст — проведите первую приходную накладную"
								: "Накладные по запросу не найдены"}
						</div>
						<p className="text-[11px] max-w-xs text-[var(--muted,#64748b)]">
							{totalWaybillsCount === 0
								? "В боевом режиме остатки ТМЦ и серии FEFO формируются на основании приходных накладных."
								: "Попробуйте изменить поисковый запрос."}
						</p>
						{totalWaybillsCount === 0 && (
							<button
								type="button"
								onClick={onStartCreateNew}
								className="mt-2 h-8 px-3.5 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 active:scale-98 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
								data-testid="btn-empty-create-waybill"
							>
								<Plus size={13} />
								<span>Оприходовать накладную</span>
							</button>
						)}
					</div>
				) : (
					waybills.map((wb) => {
						const isSelected = selectedWaybillId === wb.id && !isCreatingNew;
						const isPosted = wb.status === "posted";

						return (
							<div
								key={wb.id}
								onClick={() => onSelectWaybill(wb)}
								className={`p-2.5 rounded-lg transition-colors cursor-pointer text-xs ${
									isSelected
										? "bg-teal-500/10 border border-teal-500/30 text-teal-900 dark:text-teal-200"
										: "hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
								}`}
								data-testid={`waybill-item-${wb.id}`}
							>
								<div className="flex items-center justify-between gap-1 mb-1">
									<span className="font-bold truncate">№ {wb.waybillNumber}</span>
									<span
										className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
											isPosted
												? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
												: "bg-amber-500/20 text-amber-800 dark:text-amber-200"
										}`}
									>
										{isPosted ? "Проведена" : "Черновик"}
									</span>
								</div>
								<div className="text-[var(--muted,#64748b)] truncate">
									{wb.supplier.name}
								</div>
								<div className="flex items-center justify-between text-[11px] text-[var(--muted,#64748b)] mt-1">
									<span>{wb.receiptDate}</span>
									<span className="font-semibold text-[var(--ink,#0f172a)]">
										{money(kopecksToRubles(wb.totals.totalCostKopecks))}
									</span>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
};
