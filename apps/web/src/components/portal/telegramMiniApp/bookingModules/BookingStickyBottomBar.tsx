/**
 * TELEGRAM MINI APP BOOKING — STICKY BOTTOM BAR (APPLE HIG)
 * (DOMAIN: Natural Thumb Zone First, Blur Backdrop, Safe-Area-Inset-Bottom, Touch Target >= 52px)
 */

import React from "react";
import { Calendar } from "lucide-react";
import type { CalendarDayItem, DoctorProfile } from "./bookingTypes";

export interface BookingStickyBottomBarProps {
	isSubmitting: boolean;
	currentDoctor: DoctorProfile | null;
	selectedSlot: string;
	currentDayMeta: CalendarDayItem | undefined;
	onSubmitBooking: () => void;
}

export const BookingStickyBottomBar: React.FC<BookingStickyBottomBarProps> = ({
	isSubmitting,
	currentDoctor,
	selectedSlot,
	currentDayMeta,
	onSubmitBooking,
}) => {
	const isDisabled = isSubmitting || !selectedSlot || !currentDoctor;

	const label = isSubmitting
		? "Оформление записи..."
		: !currentDoctor || !selectedSlot
			? "Выберите врача и свободное время"
			: `Записаться к доктору на ${currentDayMeta?.dayNum || ""} ${currentDayMeta?.month || ""} в ${selectedSlot}`;

	return (
		<div className="tg-floating-bottom-bar" data-testid="booking-sticky-bottom-bar">
			<button
				type="button"
				className="tg-cta-button"
				disabled={isDisabled}
				onClick={onSubmitBooking}
				data-testid="booking-submit-cta-btn"
			>
				<Calendar size={18} className="shrink-0" />
				<span className="truncate">{label}</span>
			</button>
		</div>
	);
};
