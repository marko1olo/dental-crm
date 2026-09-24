import {
	Calendar,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock,
	Sun,
	Sunrise,
	Sunset,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";

export interface BookingSlotItem {
	time: string; // "09:30"
	startsAt: string; // ISO string
	endsAt: string; // ISO string
	period: "morning" | "afternoon" | "evening";
	availableDoctorIds?: string[] | undefined;
}

export interface CalendarDayItem {
	dayNumber: number;
	dateStr: string;
	isCurrentMonth: boolean;
	isPast: boolean;
	isToday: boolean;
	isSelected: boolean;
}

export interface BookingSlotPickerProps {
	readonly selectedDate: string; // YYYY-MM-DD
	readonly onSelectDate: (dateStr: string) => void;
	readonly calendarMonth: Date;
	readonly onPrevMonth: () => void;
	readonly onNextMonth: () => void;
	readonly calendarDays: CalendarDayItem[];
	readonly monthLabel: string;
	readonly slots: BookingSlotItem[];
	readonly selectedSlot: BookingSlotItem | null;
	readonly onSelectSlot: (slot: BookingSlotItem) => void;
	readonly slotsLoading: boolean;
	readonly className?: string;
}

export const BookingSlotPicker: React.FC<BookingSlotPickerProps> = ({
	selectedDate,
	onSelectDate,
	calendarMonth,
	onPrevMonth,
	onNextMonth,
	calendarDays,
	monthLabel,
	slots,
	selectedSlot,
	onSelectSlot,
	slotsLoading,
	className = "",
}) => {
	const [activePeriodFilter, setActivePeriodFilter] = useState<
		"all" | "morning" | "afternoon" | "evening"
	>("all");

	const [showFullMonthCalendar, setShowFullMonthCalendar] = useState(false);

	const filteredSlots = slots.filter((slot) => {
		if (activePeriodFilter === "all") return true;
		return slot.period === activePeriodFilter;
	});

	const morningSlots = slots.filter((s) => s.period === "morning");
	const afternoonSlots = slots.filter((s) => s.period === "afternoon");
	const eveningSlots = slots.filter((s) => s.period === "evening");

	// Format Date to YYYY-MM-DD helper
	const formatToYmd = (d: Date) => {
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	// 14-day upcoming ribbon (Сегодня, Завтра, Пн, Вт...) for ultra-fast 1-tap booking
	const ribbonDays = useMemo(() => {
		const result: {
			dateStr: string;
			dayNumber: number;
			weekdayTitle: string;
			monthTitle: string;
			isToday: boolean;
			isTomorrow: boolean;
			isSelected: boolean;
		}[] = [];
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayStr = formatToYmd(today);

		const tomorrow = new Date(today);
		tomorrow.setDate(today.getDate() + 1);
		const tomorrowStr = formatToYmd(tomorrow);

		const ruWeekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
		const ruMonths = [
			"янв",
			"фев",
			"мар",
			"апр",
			"май",
			"июн",
			"июл",
			"авг",
			"сен",
			"окт",
			"ноя",
			"дек",
		];

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
						: ruWeekdays[d.getDay()] || "",
				monthTitle: ruMonths[d.getMonth()] || "",
				isToday,
				isTomorrow,
				isSelected: dStr === selectedDate,
			});
		}
		return result;
	}, [selectedDate]);

	return (
		<div className={`dbw-slot-picker-root ${className}`}>
			{/* Horizontal Quick Days Ribbon (Apple/Linear grade strip with Today, Tomorrow, slot indicators) */}
			<div className="dbw-ribbon-section">
				<div className="dbw-ribbon-header">
					<div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
						Ближайшие дни:
					</div>
					<button
						type="button"
						onClick={() => setShowFullMonthCalendar((prev) => !prev)}
						className="dbw-ribbon-toggle-btn"
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

			{/* Interactive Calendar Component (Collapsible or directly accessible) */}
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

			{/* Period Filter Chips (Touch targets >= 48px, Mandates 8c, 8e) */}
			<div
				className="dbw-period-filter-chips"
				role="tablist"
				aria-label="Фильтр времени суток"
			>
				<button
					type="button"
					role="tab"
					aria-selected={activePeriodFilter === "all"}
					className={`dbw-chip-btn ${activePeriodFilter === "all" ? "active" : ""}`}
					onClick={() => setActivePeriodFilter("all")}
				>
					<Clock size={16} />
					<span>Все ({slots.length})</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activePeriodFilter === "morning"}
					className={`dbw-chip-btn ${activePeriodFilter === "morning" ? "active" : ""}`}
					onClick={() => setActivePeriodFilter("morning")}
					disabled={morningSlots.length === 0}
				>
					<Sunrise size={16} />
					<span>Утро ({morningSlots.length})</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activePeriodFilter === "afternoon"}
					className={`dbw-chip-btn ${activePeriodFilter === "afternoon" ? "active" : ""}`}
					onClick={() => setActivePeriodFilter("afternoon")}
					disabled={afternoonSlots.length === 0}
				>
					<Sun size={16} />
					<span>День ({afternoonSlots.length})</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activePeriodFilter === "evening"}
					className={`dbw-chip-btn ${activePeriodFilter === "evening" ? "active" : ""}`}
					onClick={() => setActivePeriodFilter("evening")}
					disabled={eveningSlots.length === 0}
				>
					<Sunset size={16} />
					<span>Вечер ({eveningSlots.length})</span>
				</button>
			</div>

			{/* Time Slots with Morning (09:00–12:00), Afternoon (12:00–16:00), Evening (16:00–21:00) */}
			<div className="dbw-slots-section" aria-live="polite">
				{slotsLoading ? (
					<div className="dbw-slots-loading-container">
						<div className="dbw-loading-spinner" aria-hidden="true" />
						<div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
							Загрузка свободных интервалов…
						</div>
					</div>
				) : filteredSlots.length === 0 ? (
					<div className="dbw-slots-empty-container">
						<Clock size={32} className="text-slate-400 mb-2" />
						<div className="text-sm font-bold text-slate-700 dark:text-slate-200">
							На выбранный период нет свободных мест
						</div>
						<div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
							Попробуйте выбрать другую дату в ленте дней или переключить фильтр времени
						</div>
					</div>
				) : (
					<div className="dbw-slots-groups">
						{activePeriodFilter === "all" ? (
							<>
								{morningSlots.length > 0 && (
									<div className="dbw-slot-group">
										<div className="dbw-slots-period-label">
											<Sunrise size={16} />
											<span>Утро (09:00–12:00)</span>
											<span className="dbw-period-count-badge">
												{morningSlots.length}
											</span>
										</div>
										<div className="dbw-slots-grid">
											{morningSlots.map((slot) => {
												const isSelected = selectedSlot?.time === slot.time;
												return (
													<button
														type="button"
														key={slot.time}
														className={`dbw-slot-btn ${isSelected ? "selected" : ""}`}
														onClick={() => onSelectSlot(slot)}
														aria-pressed={isSelected}
													>
														<span className="text-base font-bold">{slot.time}</span>
														{isSelected && (
															<Check
																size={14}
																className="dbw-slot-check"
																aria-hidden="true"
															/>
														)}
													</button>
												);
											})}
										</div>
									</div>
								)}

								{afternoonSlots.length > 0 && (
									<div className="dbw-slot-group">
										<div className="dbw-slots-period-label">
											<Sun size={16} />
											<span>День (12:00–16:00)</span>
											<span className="dbw-period-count-badge">
												{afternoonSlots.length}
											</span>
										</div>
										<div className="dbw-slots-grid">
											{afternoonSlots.map((slot) => {
												const isSelected = selectedSlot?.time === slot.time;
												return (
													<button
														type="button"
														key={slot.time}
														className={`dbw-slot-btn ${isSelected ? "selected" : ""}`}
														onClick={() => onSelectSlot(slot)}
														aria-pressed={isSelected}
													>
														<span className="text-base font-bold">{slot.time}</span>
														{isSelected && (
															<Check
																size={14}
																className="dbw-slot-check"
																aria-hidden="true"
															/>
														)}
													</button>
												);
											})}
										</div>
									</div>
								)}

								{eveningSlots.length > 0 && (
									<div className="dbw-slot-group">
										<div className="dbw-slots-period-label">
											<Sunset size={16} />
											<span>Вечер (16:00–21:00)</span>
											<span className="dbw-period-count-badge">
												{eveningSlots.length}
											</span>
										</div>
										<div className="dbw-slots-grid">
											{eveningSlots.map((slot) => {
												const isSelected = selectedSlot?.time === slot.time;
												return (
													<button
														type="button"
														key={slot.time}
														className={`dbw-slot-btn ${isSelected ? "selected" : ""}`}
														onClick={() => onSelectSlot(slot)}
														aria-pressed={isSelected}
													>
														<span className="text-base font-bold">{slot.time}</span>
														{isSelected && (
															<Check
																size={14}
																className="dbw-slot-check"
																aria-hidden="true"
															/>
														)}
													</button>
												);
											})}
										</div>
									</div>
								)}
							</>
						) : (
							<div className="dbw-slots-grid">
								{filteredSlots.map((slot) => {
									const isSelected = selectedSlot?.time === slot.time;
									return (
										<button
											type="button"
											key={slot.time}
											className={`dbw-slot-btn ${isSelected ? "selected" : ""}`}
											onClick={() => onSelectSlot(slot)}
											aria-pressed={isSelected}
										>
											<span className="text-base font-bold">{slot.time}</span>
											{isSelected && (
												<Check
													size={14}
													className="dbw-slot-check"
													aria-hidden="true"
												/>
											)}
										</button>
									);
								})}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
