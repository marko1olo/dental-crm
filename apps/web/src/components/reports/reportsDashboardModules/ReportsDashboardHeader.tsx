import { Download, Printer, RefreshCw, TrendingUp } from "lucide-react";
import type { CalendarPeriod } from "../ManagerReportsTypes";

export interface ReportsDashboardHeaderProps {
	readonly period: CalendarPeriod;
	readonly clinicName: string;
	readonly onRefresh?: (() => void) | undefined;
	readonly onExportCsv?: (() => void) | undefined;
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
		<div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs">
			<div className="flex items-center gap-2.5">
				<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/20">
					<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
				</div>
				<div>
					<h2 className="text-xs sm:text-sm font-bold leading-tight text-[var(--ink)]">
						Сводная аналитика и ключевые KPI клиники
					</h2>
					<span className="text-[11px] sm:text-xs text-[var(--muted)]">
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
						className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal,#0d9488)] text-xs font-medium text-[var(--ink)] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
						title="Обновить аналитические срезы"
					>
						<RefreshCw
							className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[var(--teal,#0d9488)]" : ""}`}
						/>
						<span className="hidden sm:inline">Обновить</span>
					</button>
				)}
				{onExportCsv && (
					<button
						type="button"
						onClick={onExportCsv}
						className="min-h-[44px] sm:min-h-0 sm:h-8 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal,#0d9488)] text-xs font-medium text-[var(--ink)] transition-colors flex items-center gap-1.5 cursor-pointer"
					>
						<Download className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						<span>Экспорт CSV</span>
					</button>
				)}
				<button
					type="button"
					onClick={onPrint}
					className="min-h-[44px] sm:min-h-0 sm:h-8 px-3.5 py-1.5 rounded-lg bg-[var(--primary,#0d9488)] hover:opacity-90 text-[var(--paper-pure,#ffffff)] text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
				>
					<Printer className="w-3.5 h-3.5" />
					<span>Печать A4</span>
				</button>
			</div>
		</div>
	);
}
