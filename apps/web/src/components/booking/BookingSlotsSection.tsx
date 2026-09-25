/**
 * DENTE Dental CRM — Booking Date & Slots Selection Section
 *
 * Mandate 8s (Modular Architecture & Anti-Bloat)
 */

import type React from "react";
import { AlertCircle, ArrowRight, Calendar, Clock } from "lucide-react";
import {
	BookingSlotPicker,
	type BookingSlotItem,
	type CalendarDayItem,
} from "./BookingSlotPicker";
import { formatRussianDate } from "./bookingUtils";

export interface BookingSlotsSectionProps {
	selectedDate: string;
	onSelectDate: (date: string) => void;
	calendarMonth: Date;
	onPrevMonth: () => void;
	onNextMonth: () => void;
	calendarDays: CalendarDayItem[];
	monthLabel: string;
	slots: BookingSlotItem[];
	selectedSlot: BookingSlotItem | null;
	onSelectSlot: (slot: BookingSlotItem) => void;
	slotsLoading: boolean;
	slotError: string | null;
	onNextStep: () => void;
}

export const BookingSlotsSection: React.FC<BookingSlotsSectionProps> = ({
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
	slotError,
	onNextStep,
}) => {
	return (
		<section aria-labelledby="booking-slots-heading" className="mb-5">
			<h3 id="booking-slots-heading" className="dbw-section-heading">
				<Calendar size={18} /> Выберите дату и время приёма
			</h3>

			<BookingSlotPicker
				selectedDate={selectedDate}
				onSelectDate={onSelectDate}
				calendarMonth={calendarMonth}
				onPrevMonth={onPrevMonth}
				onNextMonth={onNextMonth}
				calendarDays={calendarDays}
				monthLabel={monthLabel}
				slots={slots}
				selectedSlot={selectedSlot}
				onSelectSlot={onSelectSlot}
				slotsLoading={slotsLoading}
			/>

			{selectedSlot && (
				<div className="dbw-selected-slot-pill">
					<Clock size={16} />
					<span>
						Выбрано время: {formatRussianDate(selectedDate)} в {selectedSlot.time}
					</span>
				</div>
			)}

			{slotError && (
				<div
					role="alert"
					className="dbw-alert-warning"
					data-testid="slot-error-alert"
				>
					<AlertCircle size={18} /> {slotError}
				</div>
			)}

			{/* Friction-free Next button link for automated tests & rapid keyboard jump */}
			<div className="pt-2 text-right">
				<button
					type="button"
					className="dbw-btn-next text-xs py-2 px-3 min-h-[44px]"
					data-testid="step3-next-btn"
					onClick={onNextStep}
				>
					<span>Перейти к контактам</span>
					<ArrowRight size={16} />
				</button>
			</div>
		</section>
	);
};
