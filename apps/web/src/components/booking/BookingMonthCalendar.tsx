import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import type { CalendarDayItem } from "./contracts/bookingContracts";

export interface BookingMonthCalendarProps {
	readonly showFullMonthCalendar: boolean;
	readonly monthLabel: string;
	readonly onPrevMonth: () => void;
	readonly onNextMonth: () => void;
	readonly calendarDays: CalendarDayItem[];
	readonly onSelectDate: (dateStr: string) => void;
}

export const BookingMonthCalendar: React.FC<BookingMonthCalendarProps> = ({
	showFullMonthCalendar,
	monthLabel,
	onPrevMonth,
	onNextMonth,
	calendarDays,
	onSelectDate,
}) => {
	return (
		<div
			className={`dbw-calendar-container ${showFullMonthCalendar ? "is-expanded" : "is-compact"}`}
			aria-label="Интерактивный календарь"
		>
			<div className="dbw-calendar-header">
				<button
					type="button"
					className="dbw-calendar-nav-btn"
					onClick={onPrevMonth}
					aria-label="Предыдущий месяц"
				>
					<ChevronLeft size={20} />
				</button>
				<div className="dbw-calendar-month-label text-base font-bold">
					{monthLabel}
				</div>
				<button
					type="button"
					className="dbw-calendar-nav-btn"
					onClick={onNextMonth}
					aria-label="Следующий месяц"
				>
					<ChevronRight size={20} />
				</button>
			</div>

			<div className="dbw-calendar-weekdays" role="row">
				<span className="dbw-calendar-weekday">Пн</span>
				<span className="dbw-calendar-weekday">Вт</span>
				<span className="dbw-calendar-weekday">Ср</span>
				<span className="dbw-calendar-weekday">Чт</span>
				<span className="dbw-calendar-weekday">Пт</span>
				<span className="dbw-calendar-weekday">Сб</span>
				<span className="dbw-calendar-weekday">Вс</span>
			</div>

			<div className="dbw-calendar-days-grid" role="grid">
				{calendarDays.map((dayObj) => (
					<button
						type="button"
						key={dayObj.dateStr}
						className={`dbw-calendar-day-btn ${dayObj.isSelected ? "selected" : ""} ${dayObj.isToday ? "today" : ""}`}
						disabled={dayObj.isPast || !dayObj.isCurrentMonth}
						onClick={() => onSelectDate(dayObj.dateStr)}
						aria-label={`Выбрать ${dayObj.dateStr}`}
						aria-pressed={dayObj.isSelected}
					>
						<span className="text-sm font-semibold">{dayObj.dayNumber}</span>
						{!dayObj.isPast && dayObj.isCurrentMonth && (
							<span className="dbw-day-slot-dot" aria-hidden="true" />
						)}
					</button>
				))}
			</div>
		</div>
	);
};
