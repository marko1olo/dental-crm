import type { CalendarDayItem } from "../contracts/bookingContracts";
import {
	formatRussianDate as canonicalFormatRussianDate,
	localDateString as canonicalLocalDateString,
} from "../../../utils/formatters";

export const localDateString = canonicalLocalDateString;

export function formatRussianDate(isoDateString: string): string {
	return canonicalFormatRussianDate(isoDateString, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export function buildCalendarDays(
	calendarMonth: Date,
	selectedDate: string,
	todayDateStr: string,
): CalendarDayItem[] {
	const year = calendarMonth.getFullYear();
	const month = calendarMonth.getMonth();

	const firstDayOfMonth = new Date(year, month, 1);
	const lastDayOfMonth = new Date(year, month + 1, 0);

	const daysInMonth = lastDayOfMonth.getDate();
	let startDayIndex = firstDayOfMonth.getDay() - 1;
	if (startDayIndex === -1) startDayIndex = 6;

	const daysArray: CalendarDayItem[] = [];

	const prevMonthLastDay = new Date(year, month, 0).getDate();
	for (let i = startDayIndex - 1; i >= 0; i--) {
		const dayNum = prevMonthLastDay - i;
		const pMonth = month === 0 ? 11 : month - 1;
		const pYear = month === 0 ? year - 1 : year;
		const dStr = `${pYear}-${String(pMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
		daysArray.push({
			dayNumber: dayNum,
			dateStr: dStr,
			isCurrentMonth: false,
			isPast: true,
			isToday: false,
			isSelected: false,
		});
	}

	for (let d = 1; d <= daysInMonth; d++) {
		const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
		const isToday = dStr === todayDateStr;
		const isPast = dStr < todayDateStr;
		const isSelected = dStr === selectedDate;

		daysArray.push({
			dayNumber: d,
			dateStr: dStr,
			isCurrentMonth: true,
			isPast,
			isToday,
			isSelected,
		});
	}

	return daysArray;
}
