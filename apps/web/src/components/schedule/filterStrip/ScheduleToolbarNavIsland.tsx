import React from "react";
import type { ReactElement } from "react";
import { DateRangeQuickButtons } from "./DateRangeQuickButtons";

export interface ScheduleToolbarNavIslandProps {
	currentDateIso: string;
	formattedCurrentDate: string;
	todayIso: string;
	stepScheduleDay: (delta: number) => void;
	setScheduleDateFilter: (date: string) => void;
}

export function ScheduleToolbarNavIsland({
	currentDateIso,
	formattedCurrentDate,
	todayIso,
	stepScheduleDay,
	setScheduleDateFilter,
}: ScheduleToolbarNavIslandProps): ReactElement {
	return (
		<div className="schedule-toolbar-island-nav flex items-center gap-1.5 shrink-0">
			<span
				className="font-extrabold text-[13px] sm:text-sm text-[var(--ink)] tracking-tight shrink-0 hidden sm:inline-flex items-center gap-1 mr-0.5"
				data-testid="schedule-toolbar-title"
			>
				Расписание
			</span>
			<DateRangeQuickButtons
				currentDateIso={currentDateIso}
				formattedCurrentDate={formattedCurrentDate}
				todayIso={todayIso}
				stepScheduleDay={stepScheduleDay}
				setScheduleDateFilter={setScheduleDateFilter}
			/>
		</div>
	);
}
