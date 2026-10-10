import type React from "react";
import { BookingDateTimeStep } from "./BookingDateTimeStep";
import { BookingFloatingBottomBar } from "./BookingFloatingBottomBar";
import { BookingPatientFormStep } from "./BookingPatientFormStep";
import { BookingSpecialistStep } from "./BookingSpecialistStep";
import type { usePublicBookingState } from "./usePublicBookingState";

export interface BookingMainFlowProps {
	state: ReturnType<typeof usePublicBookingState>;
}

export const BookingMainFlow: React.FC<BookingMainFlowProps> = ({ state }) => {
	return (
		<div className="dbw-streamlined-flow">
			<BookingSpecialistStep
				selectedCategoryId={state.selectedCategoryId}
				onSelectCategory={(cat) => state.setSelectedCategoryId(cat.id)}
				isSoloDoctor={state.isSoloDoctor}
				selectedDoctor={state.selectedDoctor}
				activeDoctors={state.activeDoctors}
				selectedDoctorId={state.selectedDoctorId}
				onSelectDoctorId={state.setSelectedDoctorId}
			/>

			<BookingDateTimeStep
				selectedDate={state.selectedDate}
				onSelectDate={(date) => {
					state.setSelectedDate(date);
					state.setSelectedSlot(null);
					state.setSlotError(null);
				}}
				calendarMonth={state.calendarMonth}
				onPrevMonth={state.handlePrevMonth}
				onNextMonth={state.handleNextMonth}
				calendarDays={state.calendarDays}
				monthLabel={state.monthLabel}
				slots={state.slots}
				selectedSlot={state.selectedSlot}
				onSelectSlot={(slot) => {
					state.setSelectedSlot(slot);
					state.setSlotError(null);
				}}
				slotsLoading={state.slotsLoading}
				slotError={state.slotError}
				onNextStep={() => {
					if (!state.selectedSlot && state.slots.length > 0) {
						state.setSelectedSlot(state.slots[0] || null);
					}
					state.handleStepChange(4);
					if (typeof document !== "undefined" && typeof document.getElementById === "function") {
						document.getElementById("dbw-step-contacts")?.scrollIntoView?.({ behavior: "smooth" });
					}
				}}
			/>

			<BookingPatientFormStep
				isTelegramContext={state.isTelegramContext}
				patientName={state.patientName}
				setPatientName={state.setPatientName}
				patientPhone={state.patientPhone}
				handlePhoneChange={state.handlePhoneChange}
				patientComment={state.patientComment}
				setPatientComment={state.setPatientComment}
				hasAgreedToPrivacy={state.hasAgreedToPrivacy}
				setHasAgreedToPrivacy={state.setHasAgreedToPrivacy}
				showSmsVerification={state.showSmsVerification}
				smsCodeSent={state.smsCodeSent}
				enteredSmsCode={state.enteredSmsCode}
				setEnteredSmsCode={state.setEnteredSmsCode}
				isSmsVerified={state.isSmsVerified}
				smsResendCountdown={state.smsResendCountdown}
				smsError={state.smsError}
				handleSendSmsCode={state.handleSendSmsCode}
				handleVerifySmsCode={state.handleVerifySmsCode}
				handleTelegramShareContact={state.handleTelegramShareContact}
				submitError={state.submitError}
				setSubmitError={state.setSubmitError}
				isSubmitting={state.isSubmitting}
				onSubmit={state.handleFinalSubmit}
			/>

			<BookingFloatingBottomBar
				selectedCategory={state.selectedCategory}
				selectedDate={state.selectedDate}
				selectedSlot={state.selectedSlot}
				patientName={state.patientName}
				patientPhone={state.patientPhone}
				isSubmitting={state.isSubmitting}
				onSubmit={state.handleFinalSubmit}
			/>
		</div>
	);
};
