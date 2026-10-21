import { Clock } from "lucide-react";
import type React from "react";
import type { ScheduleLoadReport } from "../ManagerReportsTypes";
import { formatHours } from "../managerReportsHelpers";
import { safePercentWidth } from "../reportsCsvExport";
import { useScheduleLoadStats } from "./useScheduleLoadStats";

export interface ReportsDashboardScheduleLoadProps {
	readonly scheduleLoad?: ScheduleLoadReport | null | undefined;
}

export const ReportsDashboardScheduleLoad: React.FC<
	ReportsDashboardScheduleLoadProps
> = ({ scheduleLoad }) => {
	const {
		isEmpty,
		busiestWeekdayName,
		busiestHourLabel,
		byWeekday,
		peakWeekdayMinutes,
		byHour,
		peakHourMinutes,
	} = useScheduleLoadStats(scheduleLoad);

	return (
		<div className="p-5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--line,#e2e8f0)]">
				<div>
					<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
						<Clock className="w-4 h-4 text-teal-600" />
						Загрузка кресел по дням недели и рабочим часам
					</h3>
					<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
						Пиковый день:{" "}
						<strong className="text-[var(--ink,#0f172a)]">
							{busiestWeekdayName}
						</strong>{" "}
						· Пиковое время:{" "}
						<strong className="text-[var(--ink,#0f172a)]">
							{busiestHourLabel}
						</strong>
					</p>
				</div>
			</div>

			{isEmpty ? (
				<div className="p-6 text-center text-xs text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)] rounded-lg border border-dashed border-[var(--line,#cbd5e1)]">
					Нет зафиксированных визитов в расписании за выбранный период. Загрузка
					кресел 0%.
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div>
						<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-2.5">
							Распределение по дням недели
						</h4>
						<div className="space-y-2">
							{byWeekday.map((day) => {
								const pct = safePercentWidth(
									day.minutes,
									peakWeekdayMinutes,
									0,
								);
								return (
									<div
										key={day.key}
										className="flex items-center gap-2 text-xs"
									>
										<span className="w-7 font-bold uppercase text-[var(--muted,#64748b)]">
											{day.nameRu}
										</span>
										<div className="flex-1 h-5 rounded-md bg-[var(--paper-soft,#f1f5f9)] overflow-hidden border border-[var(--line,#e2e8f0)]/60 relative">
											<div
												className="h-full bg-teal-500 rounded-md transition-all duration-300"
												style={{ width: `${pct}%` }}
											/>
										</div>
										<span className="w-20 text-right font-medium text-[var(--ink,#0f172a)]">
											{formatHours(day.minutes)}
										</span>
									</div>
								);
							})}
						</div>
					</div>

					<div>
						<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-2.5">
							Загрузка по часам суток (09:00 — 20:00)
						</h4>
						<div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
							{byHour.map((h) => {
								const isPeak = h.minutes > 0 && h.minutes === peakHourMinutes;
								return (
									<div
										key={h.hour}
										className={`p-2 rounded-lg border text-center transition-all ${
											isPeak
												? "border-teal-500 bg-teal-50 dark:bg-teal-950/40 ring-1 ring-teal-500"
												: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]"
										}`}
									>
										<div className="text-[11px] font-bold text-[var(--ink,#0f172a)]">
											{h.label}
										</div>
										<div className="text-[10px] text-[var(--muted,#64748b)] mt-0.5">
											{h.minutes > 0 ? formatHours(h.minutes) : "0 ч"}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
