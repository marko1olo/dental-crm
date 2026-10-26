/**
 * TELEGRAM MINI APP BOOKING (DENTE POCKET CLINIC) — COMPACT FACADE (<= 120 lines)
 * Компонент онлайн-записи на приём в Telegram WebApp с прикреплением выбранных зубов и жалоб.
 * (Apple HIG & Clinical Ergonomics: Thumb Zone, Touch Targets >= 44x44px, Zero Overflow)
 */

import React, { memo } from "react";
import {
	type SpecialistCategory,
	type DoctorProfile,
	type TelegramMiniAppBookingProps,
	SPECIALIST_CATEGORIES,
} from "./bookingModules/bookingTypes";
import { BookingDoctorSelector } from "./bookingModules/BookingDoctorSelector";
import { BookingSlotPicker } from "./bookingModules/BookingSlotPicker";
import { BookingServiceSelector } from "./bookingModules/BookingServiceSelector";
import { BookingStickyBottomBar } from "./bookingModules/BookingStickyBottomBar";
import { BookingSuccessView } from "./bookingModules/BookingSuccessView";
import { useTelegramBookingState } from "./bookingModules/useTelegramBookingState";

export type { SpecialistCategory, DoctorProfile, TelegramMiniAppBookingProps };
export { SPECIALIST_CATEGORIES };

export const TelegramMiniAppBooking: React.FC<TelegramMiniAppBookingProps> = memo(({
	organizationId,
	patientId,
	attachedComplaints,
	onBackToTeeth,
	onBookingComplete,
}) => {
	const booking = useTelegramBookingState({
		organizationId,
		patientId,
		attachedComplaints,
		onBookingComplete,
	});

	if (booking.bookingSuccessResult) {
		return (
			<BookingSuccessView
				bookingSuccessResult={booking.bookingSuccessResult}
				patientFullName={booking.patientFullName}
				onBackToTeeth={onBackToTeeth}
				onResetResult={() => booking.setBookingSuccessResult(null)}
			/>
		);
	}

	const currentDayMeta = booking.calendarDays[booking.selectedDateIndex] || booking.calendarDays[0];

	return (
		<div
			className="tg-booking-container"
			data-testid="tg-booking-container"
			style={{ overflowX: "clip", maxWidth: "100vw" }}
		>
			<BookingServiceSelector
				attachedComplaints={attachedComplaints}
				patientFullName={booking.patientFullName}
				patientPhone={booking.patientPhone}
				patientComment={booking.patientComment}
				onBackToTeeth={onBackToTeeth}
				onChangePatientFullName={booking.setPatientFullName}
				onChangePatientPhone={booking.setPatientPhone}
				onChangePatientComment={booking.setPatientComment}
			/>

			<BookingDoctorSelector
				activeCategory={booking.activeCategory}
				filteredDoctors={booking.filteredDoctors}
				selectedDoctorId={booking.selectedDoctorId}
				onSelectCategory={booking.handleSelectCategory}
				onSelectDoctor={(docId) => {
					booking.setSelectedDoctorId(docId);
					booking.triggerHaptic("light");
				}}
			/>

			<BookingSlotPicker
				calendarDays={booking.calendarDays}
				selectedDateIndex={booking.selectedDateIndex}
				availableSlots={booking.availableSlots}
				selectedSlot={booking.selectedSlot}
				onSelectDateIndex={(idx) => {
					booking.setSelectedDateIndex(idx);
					booking.triggerHaptic("light");
				}}
				onSelectSlot={(slot) => {
					booking.setSelectedSlot(slot);
					booking.triggerHaptic("light");
				}}
			/>

			<BookingStickyBottomBar
				isSubmitting={booking.isSubmitting}
				currentDoctor={booking.currentDoctor}
				selectedSlot={booking.selectedSlot}
				currentDayMeta={currentDayMeta}
				onSubmitBooking={booking.handleSubmitBooking}
			/>
		</div>
	);
});

TelegramMiniAppBooking.displayName = "TelegramMiniAppBooking";
