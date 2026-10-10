import type React from "react";
import { BookingSlotsSection } from "../BookingSlotsSection";
import type { BookingDateTimeStepProps } from "./types";

export const BookingDateTimeStep: React.FC<BookingDateTimeStepProps> = ({
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
		<div id="dbw-step-slots" className="dbw-step-card">
			<BookingSlotsSection
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
				slotError={slotError}
				onNextStep={onNextStep}
			/>
		</div>
	);
};
