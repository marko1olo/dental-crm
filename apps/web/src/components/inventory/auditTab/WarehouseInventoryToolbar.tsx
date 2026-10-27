import { Check, CheckCircle2, PackageX, Printer, Search, X } from "lucide-react";
import React from "react";
import type { InventoryAuditTotals } from "../warehouseInventoryEngine.js";

export interface WarehouseInventoryToolbarProps {
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly discrepancyOnly: boolean;
	readonly onToggleDiscrepancy: () => void;
	readonly totals: InventoryAuditTotals;
	readonly onReconcileAllMatch: () => void; readonly onConfirmShiftActuals: () => void;
	readonly onPrintStockCountSheet?: () => void; readonly onPrintDiscrepancySheet?: () => void;
	readonly onPrintWriteoffAct?: () => void;
	readonly onPrintInv3?: () => void; readonly onPrintInv19?: () => void; readonly onPrintTorg16?: () => void;
	readonly onApplyAuditDoc: () => void; readonly isApplying: boolean;
}

export const WarehouseInventoryToolbar: React.FC<WarehouseInventoryToolbarProps> = (props) => {
	const {
		searchQuery, onSearchChange, discrepancyOnly, onToggleDiscrepancy, totals,
		onReconcileAllMatch, onConfirmShiftActuals, onApplyAuditDoc, isApplying,
	} = props;
	const printStockCount = props.onPrintStockCountSheet ?? props.onPrintInv3;
	const printDiscrepancy = props.onPrintDiscrepancySheet ?? props.onPrintInv19;
	const printWriteoff = props.onPrintWriteoffAct ?? props.onPrintTorg16;
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
					className={`secondary-button h-8 min-h-[32px] px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0 inline-flex items-center gap-1 ${
						discrepancyOnly
							? "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--teal,#0d9488)] font-bold shadow-xs"
							: "border-[var(--line)] bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					data-testid="btn-filter-discrepancies"
				>
					<span>Только расхождения</span>
					<span className="text-[11px] opacity-75 font-mono">({totals.shortageItemsCount + totals.surplusItemsCount})</span>
				</button>

				<button
					type="button"
					onClick={onConfirmShiftActuals}
					className="secondary-button h-8 min-h-[32px] px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)]/10 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs transition-colors"
					title="Инвентаризация в 1 клик: подтвердить фактические остатки на смену без бюрократии"
					data-testid="btn-reconcile-match-all"
				>
					<CheckCircle2 size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>✓ Подтвердить остатки на смену</span>
				</button>
			</div>

			<div className="flex items-center gap-1.5 shrink-0">
				<button
					type="button"
					onClick={printStockCount}
					className="secondary-button h-8 min-h-[32px] px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap transition-colors"
					data-testid="btn-print-inv3"
					title="Печать описи фактических остатков"
				>
					<Printer size={13} className="text-[var(--muted)] shrink-0" /><span>Опись остатков</span>
				</button>

				<button
					type="button"
					onClick={printDiscrepancy}
					className="secondary-button h-8 min-h-[32px] px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap transition-colors"
					data-testid="btn-print-inv19"
					title="Печать сличительной ведомости расхождений"
				>
					<Printer size={13} className="text-[var(--muted)] shrink-0" /><span>Сличительная ведомость</span>
				</button>

				{totals.shortageItemsCount > 0 && (
					<button
						type="button"
						onClick={printWriteoff}
						className="secondary-button h-8 min-h-[32px] px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap transition-colors"
						data-testid="btn-print-torg16"
						title="Сформировать акт списания недостач и боя"
					>
						<PackageX size={13} className="text-[var(--muted)] shrink-0" /><span>Акт списания</span>
					</button>
				)}

				<button
					type="button"
					onClick={onApplyAuditDoc}
					disabled={isApplying}
					className="primary-button h-8 min-h-[32px] px-3 rounded-xl bg-[var(--primary)] text-white font-semibold text-xs hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
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
