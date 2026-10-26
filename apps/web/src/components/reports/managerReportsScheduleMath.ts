import type { ScheduleMarginItem } from "./ManagerReportsScheduleMarginsBars";
import type { ScheduleLoadReport } from "./ManagerReportsTypes";

export function computeScheduleMargins(report: ScheduleLoadReport | null) {
	const cells = report?.cells ?? [];
	const weekdayMinutes = new Map<number, number>();
	const hourMinutes = new Map<number, number>();

	for (const cell of cells) {
		weekdayMinutes.set(
			cell.weekday,
			(weekdayMinutes.get(cell.weekday) ?? 0) + cell.bookedMinutes,
		);
		hourMinutes.set(
			cell.hour,
			(hourMinutes.get(cell.hour) ?? 0) + cell.bookedMinutes,
		);
	}

	const byWeekday: ScheduleMarginItem[] = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
		key: weekday,
		minutes: weekdayMinutes.get(weekday) ?? 0,
	}));

	const busyHours = [...hourMinutes.keys()].sort((left, right) => left - right);
	const byHour: ScheduleMarginItem[] = [];
	const firstHour = busyHours[0];
	const lastHour = busyHours[busyHours.length - 1];

	if (firstHour !== undefined && lastHour !== undefined) {
		for (let hour = firstHour; hour <= lastHour; hour += 1) {
			byHour.push({ key: hour, minutes: hourMinutes.get(hour) ?? 0 });
		}
	}

	return {
		byWeekday,
		byHour,
		peakWeekdayMinutes: byWeekday.reduce((peak, row) => Math.max(peak, row.minutes), 0),
		peakHourMinutes: byHour.reduce((peak, row) => Math.max(peak, row.minutes), 0),
	};
}
