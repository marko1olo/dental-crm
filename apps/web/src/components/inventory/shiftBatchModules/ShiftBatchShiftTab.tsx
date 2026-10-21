import type React from "react";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import type { ShiftSummaryData } from "./types.js";

export interface ShiftBatchShiftTabProps {
	readonly isLoading: boolean;
	readonly loadError: string | null;
	readonly summaryData: ShiftSummaryData | null;
}

export const ShiftBatchShiftTab: React.FC<ShiftBatchShiftTabProps> = ({
	isLoading,
	loadError,
	summaryData,
}) => {
	if (isLoading) {
		return (
			<div className="py-14 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
				<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
				<span className="text-sm font-medium">Расчёт технологических карт смены...</span>
			</div>
		);
	}
	if (loadError) {
		return (
			<div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
				{loadError}
			</div>
		);
	}
	if (!summaryData) return null;

	return (
		<>
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
				<div className="flex items-center justify-between gap-2 text-xs font-semibold">
					<div className="flex items-center gap-1.5 text-[var(--ink)]">
						<Clock className="w-4 h-4 text-teal-600" />
						<span>Оказано услуг за сегодня ({summaryData.date}):</span>
					</div>
					<span className="text-[var(--muted)]">
						Визитов пациентов: <strong>{summaryData.shiftStats.completedVisitsCount}</strong>
					</span>
				</div>
				<div className="flex flex-wrap gap-1.5 pt-1">
					{summaryData.shiftStats.breakdown.map((proc, idx) => (
						<span
							key={idx}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs text-[var(--ink)] shadow-2xs"
						>
							<span className="font-bold text-teal-600">{proc.count}x</span>
							<span>{proc.name}</span>
						</span>
					))}
				</div>
			</div>

			{summaryData.overdraftItemsCount > 0 && (
				<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
					<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
					<div className="space-y-0.5 leading-relaxed">
						<strong className="font-bold block">
							Мягкий овердрафт активен для {summaryData.overdraftItemsCount} поз.
						</strong>
						<span>
							Прием и касса не блокируются. Отрицательный остаток зафиксирован в журнале,
							в бэкофисе сформирована тихая заявка поставщику.
						</span>
					</div>
				</div>
			)}

			<div className="space-y-2">
				<div className="flex items-center justify-between text-xs text-[var(--muted)] px-1 font-semibold">
					<span>Материалы по техкартам ({summaryData.totalItemsCount} поз.)</span>
					<span>Расход за смену → Остаток</span>
				</div>
				<div className="rounded-xl border border-[var(--line)] overflow-hidden divide-y divide-[var(--line)] bg-[var(--paper)]">
					{summaryData.consumablesSummary.map((item) => (
						<div
							key={item.itemId}
							className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-[var(--paper-soft)] transition-colors"
						>
							<div className="min-w-0 space-y-0.5">
								<div className="font-semibold text-[var(--ink)] truncate">{item.itemName}</div>
								<div className="text-[11px] text-[var(--muted)]">
									{item.category} • на складе: {item.currentStock} {item.unit}
								</div>
							</div>
							<div className="text-right shrink-0 space-y-0.5">
								<div className="font-bold text-sm text-[var(--ink)] font-mono tabular-nums">
									-{item.qtyToDeduct} {item.unit}
								</div>
								<div>
									{item.isOverdraft ? (
										<span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md font-mono tabular-nums">
											Дефицит: {item.projectedStock} {item.unit}
										</span>
									) : (
										<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
											Останется: {item.projectedStock} {item.unit}
										</span>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</>
	);
};
