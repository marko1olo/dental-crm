import type React from "react";
import { useState } from "react";
import { BookingDaysRibbon } from "./BookingDaysRibbon";
import { BookingMonthCalendar } from "./BookingMonthCalendar";
import { BookingSlotGrid } from "./BookingSlotGrid";
import {
	BookingSlotPeriodFilters,
	type SlotPeriod,
} from "./BookingSlotPeriodFilters";
import type {
	BookingSlotItem,
	CalendarDayItem,
} from "./contracts/bookingContracts";

export type { BookingSlotItem, CalendarDayItem };

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
	readonly onJoinWaitlist?: (() => void) | undefined;
}

export const BookingSlotPicker: React.FC<BookingSlotPickerProps> = ({
	selectedDate,
	onSelectDate,
	calendarMonth: _calendarMonth,
	onPrevMonth,
	onNextMonth,
	calendarDays,
	monthLabel,
	slots,
	selectedSlot,
	onSelectSlot,
	slotsLoading,
	className = "",
	onJoinWaitlist,
}) => {
	const [activePeriodFilter, setActivePeriodFilter] = useState<SlotPeriod>("all");
	const [showFullMonthCalendar, setShowFullMonthCalendar] = useState(false);

	const filteredSlots = slots.filter((slot) => {
		if (activePeriodFilter === "all") return true;
		return slot.period === activePeriodFilter;
	});

	const morningSlots = slots.filter((s) => s.period === "morning");
	const afternoonSlots = slots.filter((s) => s.period === "afternoon");
	const eveningSlots = slots.filter((s) => s.period === "evening");

	return (
		<div className={`dbw-slot-picker-root ${className}`}>
			<BookingDaysRibbon
				selectedDate={selectedDate}
				onSelectDate={onSelectDate}
				showFullMonthCalendar={showFullMonthCalendar}
				onToggleMonthCalendar={() => setShowFullMonthCalendar((prev) => !prev)}
			/>

			<BookingMonthCalendar
				showFullMonthCalendar={showFullMonthCalendar}
				monthLabel={monthLabel}
				onPrevMonth={onPrevMonth}
				onNextMonth={onNextMonth}
				calendarDays={calendarDays}
				onSelectDate={onSelectDate}
			/>

			<BookingSlotPeriodFilters
				activePeriodFilter={activePeriodFilter}
				onPeriodFilterChange={setActivePeriodFilter}
				totalSlotsCount={slots.length}
				morningCount={morningSlots.length}
				afternoonCount={afternoonSlots.length}
				eveningCount={eveningSlots.length}
			/>

			<BookingSlotGrid
				slotsLoading={slotsLoading}
				filteredSlots={filteredSlots}
				activePeriodFilter={activePeriodFilter}
				morningSlots={morningSlots}
				afternoonSlots={afternoonSlots}
				eveningSlots={eveningSlots}
				selectedSlot={selectedSlot}
				onSelectSlot={onSelectSlot}
				onJoinWaitlist={onJoinWaitlist}
			/>
		</div>
	);
};
