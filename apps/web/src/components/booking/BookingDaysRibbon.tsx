import { Calendar } from "lucide-react";
import type React from "react";
import { useMemo } from "react";

export interface BookingDaysRibbonProps {
	readonly selectedDate: string;
	readonly onSelectDate: (dateStr: string) => void;
	readonly showFullMonthCalendar: boolean;
	readonly onToggleMonthCalendar: () => void;
}

const RU_WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const RU_MONTHS = [
	"янв", "фев", "мар", "апр", "май", "июн",
	"июл", "авг", "сен", "окт", "ноя", "дек",
];

const formatToYmd = (d: Date) => {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

export interface RibbonDayItem {
	dateStr: string;
	dayNumber: number;
	weekdayTitle: string;
	monthTitle: string;
	isToday: boolean;
	isSelected: boolean;
}

export const BookingDaysRibbon: React.FC<BookingDaysRibbonProps> = ({
	selectedDate,
	onSelectDate,
	showFullMonthCalendar,
	onToggleMonthCalendar,
}) => {
	const ribbonDays = useMemo(() => {
		const result: RibbonDayItem[] = [];
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayStr = formatToYmd(today);

		const tomorrow = new Date(today);
		tomorrow.setDate(today.getDate() + 1);
		const tomorrowStr = formatToYmd(tomorrow);

		for (let i = 0; i < 14; i++) {
			const d = new Date(today);
			d.setDate(today.getDate() + i);
			const dStr = formatToYmd(d);
			const isToday = dStr === todayStr;
			const isTomorrow = dStr === tomorrowStr;

			result.push({
				dateStr: dStr,
				dayNumber: d.getDate(),
				weekdayTitle: isToday
					? "Сегодня"
					: isTomorrow
						? "Завтра"
						: RU_WEEKDAYS[d.getDay()] || "",
				monthTitle: RU_MONTHS[d.getMonth()] || "",
				isToday,
				isSelected: dStr === selectedDate,
			});
		}
		return result;
	}, [selectedDate]);

	return (
		<div className="dbw-ribbon-section">
			<div className="dbw-ribbon-header">
				<div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
					Ближайшие дни:
				</div>
				<button
					type="button"
					onClick={onToggleMonthCalendar}
					className="dbw-ribbon-toggle-btn secondary-button"
					aria-expanded={showFullMonthCalendar}
				>
					<Calendar size={14} />
					<span>{showFullMonthCalendar ? "Скрыть календарь" : "Календарь на месяц"}</span>
				</button>
			</div>

			<div
				className="dbw-days-ribbon"
				role="tablist"
				aria-label="Быстрый выбор дня для записи"
			>
				{ribbonDays.map((item) => (
					<button
						type="button"
						key={item.dateStr}
						role="tab"
						aria-selected={item.isSelected}
						aria-label={`${item.weekdayTitle}, ${item.dayNumber} ${item.monthTitle}`}
						className={`dbw-day-ribbon-btn ${item.isSelected ? "selected" : ""} ${item.isToday ? "today" : ""}`}
						onClick={() => onSelectDate(item.dateStr)}
					>
						<span className="dbw-ribbon-weekday">{item.weekdayTitle}</span>
						<span className="dbw-ribbon-day">{item.dayNumber}</span>
						<span className="dbw-ribbon-month">{item.monthTitle}</span>
						{item.isSelected && (
							<span className="dbw-ribbon-active-pill" aria-hidden="true" />
						)}
					</button>
				))}
			</div>
		</div>
	);
};
