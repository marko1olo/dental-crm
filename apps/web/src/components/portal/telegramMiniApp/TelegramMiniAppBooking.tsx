/**
 * TELEGRAM MINI APP BOOKING (DENTE POCKET CLINIC) — COMPACT FACADE (<= 250 lines)
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
	const {
		activeCategory,
		filteredDoctors,
		selectedDoctorId,
		setSelectedDoctorId,
		selectedDateIndex,
		setSelectedDateIndex,
		availableSlots,
		selectedSlot,
		setSelectedSlot,
		patientFullName,
		setPatientFullName,
		patientPhone,
		setPatientPhone,
		patientComment,
		setPatientComment,
		isSubmitting,
		bookingSuccessResult,
		setBookingSuccessResult,
		calendarDays,
		currentDoctor,
		triggerHaptic,
		handleSelectCategory,
		handleSubmitBooking,
	} = useTelegramBookingState({
		organizationId,
		patientId,
		attachedComplaints,
		onBookingComplete,
	});

	if (bookingSuccessResult) {
		return (
			<BookingSuccessView
				bookingSuccessResult={bookingSuccessResult}
				patientFullName={patientFullName}
				onBackToTeeth={onBackToTeeth}
				onResetResult={() => setBookingSuccessResult(null)}
			/>
		);
	}

	const currentDayMeta = calendarDays[selectedDateIndex] || calendarDays[0];

	return (
		<div
			className="tg-booking-container"
			data-testid="tg-booking-container"
			style={{ overflowX: "clip", maxWidth: "100vw" }}
		>
			{/* 1. Баннер прикрепленных зубов и ввод контактных данных */}
			<BookingServiceSelector
				attachedComplaints={attachedComplaints}
				patientFullName={patientFullName}
				patientPhone={patientPhone}
				patientComment={patientComment}
				onBackToTeeth={onBackToTeeth}
				onChangePatientFullName={setPatientFullName}
				onChangePatientPhone={setPatientPhone}
				onChangePatientComment={setPatientComment}
			/>

			{/* 2. Направление приёма и карточки врачей клиники */}
			<BookingDoctorSelector
				activeCategory={activeCategory}
				filteredDoctors={filteredDoctors}
				selectedDoctorId={selectedDoctorId}
				onSelectCategory={handleSelectCategory}
				onSelectDoctor={(docId) => {
					setSelectedDoctorId(docId);
					triggerHaptic("light");
				}}
			/>

			{/* 3. Горизонтальный стрип дней и сетка временных слотов */}
			<BookingSlotPicker
				calendarDays={calendarDays}
				selectedDateIndex={selectedDateIndex}
				availableSlots={availableSlots}
				selectedSlot={selectedSlot}
				onSelectDateIndex={(idx) => {
					setSelectedDateIndex(idx);
					triggerHaptic("light");
				}}
				onSelectSlot={(slot) => {
					setSelectedSlot(slot);
					triggerHaptic("light");
				}}
			/>

			{/* 4. Закрепленная нижняя плашка действия (Apple HIG Natural Thumb Zone) */}
			<BookingStickyBottomBar
				isSubmitting={isSubmitting}
				currentDoctor={currentDoctor}
				selectedSlot={selectedSlot}
				currentDayMeta={currentDayMeta}
				onSubmitBooking={handleSubmitBooking}
			/>
		</div>
	);
});

TelegramMiniAppBooking.displayName = "TelegramMiniAppBooking";
export default TelegramMiniAppBooking;
