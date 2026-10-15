/**
 * TELEGRAM MINI APP BOOKING — SLOT & DATE PICKER
 * (DOMAIN: Horizontal 7-Day Strip, Responsive Slot Grid >= 44x44px)
 */

import React from "react";
import { Clock } from "lucide-react";
import type { CalendarDayItem } from "./bookingTypes";

export interface BookingSlotPickerProps {
	calendarDays: CalendarDayItem[];
	selectedDateIndex: number;
	availableSlots: string[];
	selectedSlot: string;
	onSelectDateIndex: (index: number) => void;
	onSelectSlot: (slot: string) => void;
}

export const BookingSlotPicker: React.FC<BookingSlotPickerProps> = ({
	calendarDays,
	selectedDateIndex,
	availableSlots,
	selectedSlot,
	onSelectDateIndex,
	onSelectSlot,
}) => {
	const currentDayMeta = calendarDays[selectedDateIndex] || calendarDays[0];

	return (
		<div className="space-y-3">
			{/* 3. ВЫБОР ДНЯ (ГОРИЗОНТАЛЬНЫЙ СТРИП 7 ДНЕЙ) */}
			<div>
				<div className="text-xs font-bold text-[var(--tg-text)] mb-1.5">
					3. Выберите дату визита
				</div>

				<div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
					{calendarDays.map((day) => {
						const isSel = selectedDateIndex === day.index;
						return (
							<button
								key={day.index}
								type="button"
								className={`tg-day-btn ${isSel ? "selected" : ""}`}
								onClick={() => onSelectDateIndex(day.index)}
							>
								<span className="text-[11px] font-bold whitespace-nowrap text-center">
									{day.dayOfWeek}
								</span>
								<span className="text-sm font-extrabold leading-tight">
									{day.dayNum}
								</span>
								<span className="text-[10px] opacity-85">{day.month}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 4. ВЫБОР ВРЕМЕНИ (СЕТКА ОКОН) */}
			<div>
				<div className="text-xs font-bold text-[var(--tg-text)] mb-1.5 flex items-center justify-between">
					<span>4. Свободное время</span>
					{currentDayMeta && (
						<span className="text-[11px] text-[var(--tg-text-muted)]">
							{currentDayMeta.dayOfWeek}, {currentDayMeta.dayNum} {currentDayMeta.month}
						</span>
					)}
				</div>

				<div className="tg-slots-grid">
					{availableSlots.length === 0 ? (
						<div className="col-span-4 text-center text-xs text-[var(--tg-text-muted)] py-3">
							На выбранную дату нет свободных слотов для записи
						</div>
					) : (
						availableSlots.map((time) => {
							const isSel = selectedSlot === time;
							return (
								<button
									key={time}
									type="button"
									className={`tg-slot-btn ${isSel ? "selected" : ""}`}
									onClick={() => onSelectSlot(time)}
								>
									<Clock size={12} className="mr-1 opacity-70" />
									<span>{time}</span>
								</button>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
};
