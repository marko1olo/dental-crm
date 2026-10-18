import { Check, CheckCircle2, PackageX, Printer, Search, X } from "lucide-react";
import React from "react";
import type { InventoryAuditTotals } from "../warehouseInventoryEngine.js";

export interface WarehouseInventoryToolbarProps {
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly discrepancyOnly: boolean;
	readonly onToggleDiscrepancy: () => void;
	readonly totals: InventoryAuditTotals;
	readonly onReconcileAllMatch: () => void;
	readonly onConfirmShiftActuals: () => void;
	readonly onPrintInv3: () => void;
	readonly onPrintInv19: () => void;
	readonly onPrintTorg16: () => void;
	readonly onApplyAuditDoc: () => void;
	readonly isApplying: boolean;
}

export const WarehouseInventoryToolbar: React.FC<WarehouseInventoryToolbarProps> = ({
	searchQuery, onSearchChange, discrepancyOnly, onToggleDiscrepancy, totals,
	onReconcileAllMatch, onConfirmShiftActuals, onPrintInv3, onPrintInv19, onPrintTorg16,
	onApplyAuditDoc, isApplying,
}) => {
	return (
		<div className="h-9 min-h-[36px] px-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl flex items-center justify-between gap-2 shrink-0">
			<div className="flex items-center gap-2 flex-1 min-w-0">
				<div className="dente-search-wrap relative w-64 max-w-xs shrink-0">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						className="dente-search-input"
						placeholder="Поиск по названию или SKU..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						data-testid="audit-search-input"
					/>
					{searchQuery && (
						<button type="button" className="dente-search-clear" onClick={() => onSearchChange("")} aria-label="Очистить поиск">
							<X size={12} />
						</button>
					)}
				</div>

				<button
					type="button"
					onClick={onToggleDiscrepancy}
					className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${discrepancyOnly ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40" : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"}`}
					data-testid="btn-filter-discrepancies"
				>
					Только расхождения ({totals.shortageItemsCount + totals.surplusItemsCount})
				</button>

				<button
					type="button"
					onClick={onConfirmShiftActuals}
					className="h-7 px-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
					title="Инвентаризация в 1 клик: подтвердить фактические остатки на смену без бюрократии"
					data-testid="btn-reconcile-match-all"
				>
					<CheckCircle2 size={13} />
					<span>✓ Подтвердить фактические остатки на смену</span>
				</button>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={onPrintInv3}
					className="h-7 px-2.5 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
					data-testid="btn-print-inv3"
					title="Печать описи фактических остатков"
				>
					<Printer size={13} /><span>Опись остатков</span>
				</button>

				<button
					type="button"
					onClick={onPrintInv19}
					className="h-7 px-2.5 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
					data-testid="btn-print-inv19"
					title="Печать сличительной ведомости расхождений"
				>
					<Printer size={13} /><span>Сличительная ведомость</span>
				</button>

				{totals.shortageItemsCount > 0 && (
					<button
						type="button"
						onClick={onPrintTorg16}
						className="h-7 px-2.5 rounded-lg border border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
						data-testid="btn-print-torg16"
						title="Сформировать акт списания недостач и боя"
					>
						<PackageX size={13} /><span>Акт списания</span>
					</button>
				)}

				<button
					type="button"
					onClick={onApplyAuditDoc}
					disabled={isApplying}
					className="h-7 px-3 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 active:scale-98 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
					data-testid="btn-apply-audit"
				>
					<Check size={14} />
					<span>{isApplying ? "Сохранение..." : "Утвердить опись"}</span>
				</button>
			</div>
		</div>
	);
};

export default WarehouseInventoryToolbar;
