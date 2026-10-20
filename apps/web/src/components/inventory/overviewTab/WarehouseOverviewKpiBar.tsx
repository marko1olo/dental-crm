import { PackageCheck, Truck } from "lucide-react";
import type React from "react";

export interface WarehouseOverviewKpiBarProps {
	readonly kpis: {
		readonly totalCount: number;
		readonly lowStockCount: number;
		readonly overdraftCount: number;
	};
	readonly onOpenShiftDeductionModal?: (() => void) | undefined;
	readonly onOpenWaybills?: (() => void) | undefined;
}

export const WarehouseOverviewKpiBar: React.FC<
	WarehouseOverviewKpiBarProps
> = ({ kpis, onOpenShiftDeductionModal, onOpenWaybills }) => (
	<div className="kpi-stock-total min-h-[32px] py-1.5 px-3 bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
		<div className="flex items-center gap-3.5 flex-wrap">
			<div className="flex items-center gap-1.5">
				<span className="text-[var(--muted)]">Всего позиций:</span>
				<span className="font-bold text-[var(--ink)]">{kpis.totalCount}</span>
			</div>
			<div className="flex items-center gap-1.5">
				<span className="text-orange-700 dark:text-orange-400 font-semibold">
					Критический остаток:
				</span>
				<span className="font-bold text-orange-600 dark:text-orange-400">
					{kpis.lowStockCount}
				</span>
			</div>
			<div className="flex items-center gap-1.5">
				<span className="text-amber-700 dark:text-amber-400 font-semibold">
					Расход сверх остатка:
				</span>
				<span className="font-bold text-amber-600 dark:text-amber-400">
					{kpis.overdraftCount}
				</span>
			</div>
		</div>
		<div className="flex items-center gap-2">
			{onOpenShiftDeductionModal && (
				<button
					type="button"
					onClick={onOpenShiftDeductionModal}
					className="text-[11px] font-bold text-teal-800 dark:text-teal-200 bg-teal-500/15 hover:bg-teal-500/25 px-2.5 py-1 rounded-lg border border-teal-500/30 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
					data-testid="btn-overview-shift-batch-deduction"
					title="Списать расходники за смену"
				>
					<PackageCheck
						size={13}
						className="text-teal-600 dark:text-teal-400"
					/>
					<span>Списать расходники за смену</span>
				</button>
			)}
			{kpis.overdraftCount > 0 && onOpenWaybills && (
				<button
					type="button"
					onClick={onOpenWaybills}
					className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer"
				>
					<Truck size={12} />
					<span>Оприходовать накладную</span>
				</button>
			)}
		</div>
	</div>
);
