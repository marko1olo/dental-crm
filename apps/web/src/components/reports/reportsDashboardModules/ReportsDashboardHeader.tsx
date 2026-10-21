import { Download, Printer, RefreshCw, TrendingUp } from "lucide-react";
import type { CalendarPeriod } from "../ManagerReportsTypes";

export interface ReportsDashboardHeaderProps {
	readonly period: CalendarPeriod;
	readonly clinicName: string;
	readonly onRefresh?: () => void;
	readonly onExportCsv?: () => void;
	readonly onPrint: () => void;
	readonly isLoading?: boolean | undefined;
}

export function ReportsDashboardHeader({
	period,
	clinicName,
	onRefresh,
	onExportCsv,
	onPrint,
	isLoading = false,
}: ReportsDashboardHeaderProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs">
			<div className="flex items-center gap-2.5">
				<div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
					<TrendingUp className="w-5 h-5" />
				</div>
				<div>
					<h2 className="text-sm font-bold leading-tight text-[var(--ink,#0f172a)]">
						Сводная аналитика и ключевые KPI клиники
					</h2>
					<span className="text-xs text-[var(--muted,#64748b)]">
						Период: {period.from} — {period.to} · {clinicName}
					</span>
				</div>
			</div>

			<div className="flex items-center gap-2">
				{onRefresh && (
					<button
						type="button"
						onClick={onRefresh}
						disabled={isLoading}
						className="min-h-[44px] min-w-[44px] sm:min-w-0 px-3 py-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
						title="Обновить аналитические срезы"
					>
						<RefreshCw
							className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
						/>
						<span className="hidden sm:inline">Обновить</span>
					</button>
				)}
				{onExportCsv && (
					<button
						type="button"
						onClick={onExportCsv}
						className="min-h-[44px] px-3.5 py-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] transition-colors flex items-center gap-1.5 cursor-pointer"
					>
						<Download className="w-4 h-4 text-teal-600" />
						<span>Экспорт CSV</span>
					</button>
				)}
				<button
					type="button"
					onClick={onPrint}
					className="min-h-[44px] px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
				>
					<Printer className="w-4 h-4" />
					<span>Печать A4</span>
				</button>
			</div>
		</div>
	);
}
