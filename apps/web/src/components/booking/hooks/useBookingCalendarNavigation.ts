import { useMemo, useState } from "react";
import { buildCalendarDays, localDateString } from "../engine/bookingCalendarUtils";

export function useBookingCalendarNavigation(initialDate?: string) {
	const todayDateStr = useMemo(() => localDateString(), []);
	const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayDateStr);
	const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

	const calendarDays = useMemo(() => {
		return buildCalendarDays(calendarMonth, selectedDate, todayDateStr);
	}, [calendarMonth, selectedDate, todayDateStr]);

	const monthLabel = useMemo(() => {
		return calendarMonth.toLocaleDateString("ru-RU", {
			month: "long",
			year: "numeric",
		});
	}, [calendarMonth]);

	const handlePrevMonth = () => {
		setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
	};

	const handleNextMonth = () => {
		setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
	};

	return {
		todayDateStr,
		selectedDate,
		setSelectedDate,
		calendarMonth,
		calendarDays,
		monthLabel,
		handlePrevMonth,
		handleNextMonth,
	};
}
