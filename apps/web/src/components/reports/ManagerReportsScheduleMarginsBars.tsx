import type React from "react";
import { formatHours, weekdayNames } from "./managerReportsHelpers";
import type { ScheduleLoadReport } from "./ManagerReportsTypes";
import { safePercentWidth } from "./reportsCsvExport";

export interface ScheduleMarginItem {
	readonly key: number;
	readonly minutes: number;
}

export interface ManagerReportsScheduleMarginsBarsProps {
	readonly data: ScheduleLoadReport;
	readonly byWeekday: readonly ScheduleMarginItem[];
	readonly byHour: readonly ScheduleMarginItem[];
	readonly peakWeekdayMinutes: number;
	readonly peakHourMinutes: number;
}

export const ManagerReportsScheduleMarginsBars: React.FC<
	ManagerReportsScheduleMarginsBarsProps
> = ({ data, byWeekday, byHour, peakWeekdayMinutes, peakHourMinutes }) => {
	return (
		<>
			<ul className="ops-bars">
				{byWeekday.map((row) => (
					<li className="ops-bar" key={`weekday-${row?.key}`}>
						<span className="ops-bar__label">{weekdayNames[row?.key] ?? row?.key}</span>
						<span className="ops-bar__track">
							<span
								className="ops-bar__fill"
								style={{ width: `${safePercentWidth(row?.minutes, peakWeekdayMinutes, 2)}%` }}
							/>
						</span>
						<span className="ops-bar__value">{formatHours(row?.minutes ?? 0)}</span>
					</li>
				))}
			</ul>
			<h3 className="ops-section-title">Часы приёма</h3>
			<ul className="ops-bars">
				{byHour.map((row) => (
					<li className="ops-bar" key={`hour-${row?.key}`}>
						<span className="ops-bar__label">{String(row.key).padStart(2, "0")}:00</span>
						<span className="ops-bar__track">
							<span
								className="ops-bar__fill"
								style={{ width: `${safePercentWidth(row.minutes, peakHourMinutes, 2)}%` }}
							/>
						</span>
						<span className="ops-bar__value">{formatHours(row.minutes)}</span>
					</li>
				))}
			</ul>
			<p className="ops-hint">
				{data.busiestWeekday !== null && data.busiestHour !== null
					? `Самый занятый день — ${weekdayNames[data.busiestWeekday] ?? data.busiestWeekday}, самый занятый час — ${String(data.busiestHour).padStart(2, "0")}:00. `
					: ""}
				День недели и час берутся в часовом поясе клиники.
			</p>
		</>
	);
};
