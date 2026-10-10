import type React from "react";
import { AuthArtBackground } from "../auth/AuthArtBackground";
import "./bookingWidget.css";
import {
	BookingHeaderStep,
	BookingMainFlow,
	BookingSuccessConfirmation,
	usePublicBookingState,
	type PublicBookingWidgetProps,
} from "./publicWidget";

// Re-export contracts & sub-components per Mandate 8s & 8za (Canonical SSOT)
export * from "./bookingUtils";
export * from "./publicWidget";
export type { BookingDoctorData, BookingSlotItem, CalendarDayItem } from "./publicWidget";
export { BookingHeader } from "./BookingHeader";
export { BookingDoctorsSection } from "./BookingDoctorsSection";
export { BookingContactsSection } from "./BookingContactsSection";
export { BookingSlotsSection } from "./BookingSlotsSection";
export { BookingDoctorCard, BookingAnyDoctorCard } from "./BookingDoctorCard";
export { BookingSlotPicker } from "./BookingSlotPicker";
export { BookingConfirmationView } from "./BookingConfirmationView";
export { BookingCategoriesSection, CANONICAL_BOOKING_CATEGORIES } from "./BookingCategoriesSection";
export type { BookingCategoryOption } from "./BookingCategoriesSection";
export type {
	BookingStep,
	VerificationMethod,
	BookingDoctor,
	BookingSlot,
	BookingContacts,
	BookingReceiptData,
	CalendarExportPayload,
} from "./publicBookingEngine";
export {
	DEFAULT_DOCTORS_LIST,
	SERVICE_CATEGORIES,
	normalizePhoneDigits,
	formatPhoneRu,
	isValidRuPhone,
	isValidPatientName,
	isClinicNightTime,
	groupSlotsByDayPeriod,
	detectTelegramWebApp,
	dispatchBookingCompletedMessage,
	sendOtpVerificationRequest,
	toLocalDateString,
} from "./publicBookingEngine";

export const PublicBookingWidget: React.FC<PublicBookingWidgetProps> = (props) => {
	const state = usePublicBookingState(props);
	const {
		compact = false,
		artBackground = false,
		className = "",
		theme = "auto",
		title,
		subtitle,
	} = props;

	return (
		<div
			className={`dente-booking-widget ${compact ? "compact-mode" : ""} ${artBackground ? "dbw-with-art-bg" : ""} ${className}`}
			data-theme={theme}
			data-embed={state.effectiveEmbedMode}
			data-art-bg={artBackground ? "true" : undefined}
			id={`dente-booking-${state.widgetInstanceId}`}
		>
			{artBackground && <AuthArtBackground />}
			<BookingHeaderStep
				title={title}
				subtitle={subtitle}
				isTelegramContext={state.isTelegramContext}
			/>

			<div className="dbw-body">
				{state.step !== 5 && !state.confirmationData ? (
					<BookingMainFlow state={state} />
				) : (
					<BookingSuccessConfirmation
						confirmationData={state.confirmationData}
						selectedDate={state.selectedDate}
						selectedSlot={state.selectedSlot}
						selectedDoctor={state.selectedDoctor}
						selectedBranch={state.selectedBranch}
						patientName={state.patientName}
						patientPhone={state.patientPhone}
						onReset={state.handleResetBooking}
						artBackground={artBackground}
						theme={theme}
					/>
				)}
			</div>
		</div>
	);
};

export const PublicOnlineBookingWidget = PublicBookingWidget;
export default PublicBookingWidget;
