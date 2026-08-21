import { ChevronLeft, ChevronRight, Clock, Sun, Sunrise, Sunset } from "lucide-react";
import type React from "react";
import { useState } from "react";

export interface BookingSlotItem {
	time: string; // "09:30"
	startsAt: string; // ISO string
	endsAt: string; // ISO string
	period: "morning" | "afternoon" | "evening";
	availableDoctorIds?: string[];
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

	const filteredSlots = slots.filter((slot) => {
		if (activePeriodFilter === "all") return true;
		return slot.period === activePeriodFilter;
	});

	const morningSlots = slots.filter((s) => s.period === "morning");
	const afternoonSlots = slots.filter((s) => s.period === "afternoon");
	const eveningSlots = slots.filter((s) => s.period === "evening");

	return (
		<div className={`dbw-slot-picker-root ${className}`}>
			{/* Calendar Component */}
			<div className="dbw-calendar-container" aria-label="Интерактивный календарь">
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

			{/* Period Filter Chips (Touch targets >= 48px) */}
			<div className="dbw-period-filter-chips" role="tablist" aria-label="Фильтр времени суток">
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

			{/* Time Slots (CLS = 0 with reserved height) */}
			<div className="dbw-slots-section" aria-live="polite">
				{slotsLoading ? (
					<div className="dbw-slots-loading-container">
						<div className="dbw-loading-spinner" aria-hidden="true" />
						<div className="text-sm font-semibold text-slate-500">
							Загрузка свободных интервалов…
						</div>
					</div>
				) : filteredSlots.length === 0 ? (
					<div className="dbw-slots-empty-container">
						<Clock size={32} className="text-slate-400 mb-2" />
						<div className="text-sm font-bold text-slate-700 dark:text-slate-200">
							На выбранный период нет свободных мест
						</div>
						<div className="text-xs text-slate-500 mt-1">
							Попробуйте выбрать другую дату или переключить фильтр времени
						</div>
					</div>
				) : (
					<div className="dbw-slots-groups">
						{/* Render Grouped by Morning, Afternoon, Evening if "all", or filtered list */}
						{activePeriodFilter === "all" ? (
							<>
								{morningSlots.length > 0 && (
									<div className="dbw-slot-group">
										<div className="dbw-slots-period-label">
											<Sunrise size={16} /> ☀️ Утро (до 12:00)
										</div>
										<div className="dbw-slots-grid">
											{morningSlots.map((slot) => (
												<button
													type="button"
													key={slot.time}
													className={`dbw-slot-btn ${selectedSlot?.time === slot.time ? "selected" : ""}`}
													onClick={() => onSelectSlot(slot)}
													aria-pressed={selectedSlot?.time === slot.time}
												>
													<span className="text-base font-bold">{slot.time}</span>
												</button>
											))}
										</div>
									</div>
								)}

								{afternoonSlots.length > 0 && (
									<div className="dbw-slot-group">
										<div className="dbw-slots-period-label">
											<Sun size={16} /> 🌤️ День (12:00 - 16:00)
										</div>
										<div className="dbw-slots-grid">
											{afternoonSlots.map((slot) => (
												<button
													type="button"
													key={slot.time}
													className={`dbw-slot-btn ${selectedSlot?.time === slot.time ? "selected" : ""}`}
													onClick={() => onSelectSlot(slot)}
													aria-pressed={selectedSlot?.time === slot.time}
												>
													<span className="text-base font-bold">{slot.time}</span>
												</button>
											))}
										</div>
									</div>
								)}

								{eveningSlots.length > 0 && (
									<div className="dbw-slot-group">
										<div className="dbw-slots-period-label">
											<Sunset size={16} /> 🌙 Вечер (после 16:00)
										</div>
										<div className="dbw-slots-grid">
											{eveningSlots.map((slot) => (
												<button
													type="button"
													key={slot.time}
													className={`dbw-slot-btn ${selectedSlot?.time === slot.time ? "selected" : ""}`}
													onClick={() => onSelectSlot(slot)}
													aria-pressed={selectedSlot?.time === slot.time}
												>
													<span className="text-base font-bold">{slot.time}</span>
												</button>
											))}
										</div>
									</div>
								)}
							</>
						) : (
							<div className="dbw-slots-grid">
								{filteredSlots.map((slot) => (
									<button
										type="button"
										key={slot.time}
										className={`dbw-slot-btn ${selectedSlot?.time === slot.time ? "selected" : ""}`}
										onClick={() => onSelectSlot(slot)}
										aria-pressed={selectedSlot?.time === slot.time}
									>
										<span className="text-base font-bold">{slot.time}</span>
									</button>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
