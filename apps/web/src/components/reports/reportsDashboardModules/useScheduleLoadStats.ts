import { useMemo } from "react";
import type { ScheduleLoadReport } from "../ManagerReportsTypes";
import { weekdayNames } from "../managerReportsHelpers";

export interface WeekdayLoadRow {
	key: number;
	nameRu: string;
	minutes: number;
}

export interface HourLoadRow {
	hour: number;
	label: string;
	minutes: number;
}

export interface ScheduleLoadStats {
	byWeekday: WeekdayLoadRow[];
	peakWeekdayMinutes: number;
	byHour: HourLoadRow[];
	peakHourMinutes: number;
	busiestWeekdayName: string;
	busiestHourLabel: string;
	isEmpty: boolean;
}

export function useScheduleLoadStats(
	scheduleLoad?: ScheduleLoadReport | null | undefined,
): ScheduleLoadStats {
	return useMemo(() => {
		const cells = scheduleLoad?.cells ?? [];
		const weekdayMinutes = new Map<number, number>();
		const hourMinutes = new Map<number, number>();

		for (const cell of cells) {
			weekdayMinutes.set(
				cell.weekday,
				(weekdayMinutes.get(cell.weekday) ?? 0) + (cell.bookedMinutes ?? 0),
			);
			hourMinutes.set(
				cell.hour,
				(hourMinutes.get(cell.hour) ?? 0) + (cell.bookedMinutes ?? 0),
			);
		}

		const byWeekday = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
			key: weekday,
			nameRu: weekdayNames[weekday] ?? `д.${weekday}`,
			minutes: weekdayMinutes.get(weekday) ?? 0,
		}));

		const peakWeekdayMinutes = byWeekday.reduce(
			(max, row) => Math.max(max, row.minutes),
			0,
		);

		const standardHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
		const byHour = standardHours.map((hour) => ({
			hour,
			label: `${String(hour).padStart(2, "0")}:00`,
			minutes: hourMinutes.get(hour) ?? 0,
		}));

		const peakHourMinutes = byHour.reduce(
			(max, row) => Math.max(max, row.minutes),
			0,
		);

		const busiestWeekdayName =
			scheduleLoad?.busiestWeekday !== null &&
			scheduleLoad?.busiestWeekday !== undefined
				? (weekdayNames[scheduleLoad.busiestWeekday] ?? "—")
				: "—";

		const busiestHourLabel =
			scheduleLoad?.busiestHour !== null &&
			scheduleLoad?.busiestHour !== undefined
				? `${String(scheduleLoad.busiestHour).padStart(2, "0")}:00`
				: "—";

		return {
			byWeekday,
			peakWeekdayMinutes: Math.max(1, peakWeekdayMinutes),
			byHour,
			peakHourMinutes: Math.max(1, peakHourMinutes),
			busiestWeekdayName,
			busiestHourLabel,
			isEmpty: cells.length === 0,
		};
	}, [scheduleLoad]);
}
