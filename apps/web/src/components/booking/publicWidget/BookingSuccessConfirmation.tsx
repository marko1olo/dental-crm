import type React from "react";
import { BookingConfirmationView } from "../BookingConfirmationView";
import type { BookingSuccessConfirmationProps } from "./types";

export const BookingSuccessConfirmation: React.FC<BookingSuccessConfirmationProps> = ({
	confirmationData,
	selectedDate,
	selectedSlot,
	selectedDoctor,
	selectedBranch,
	patientName,
	patientPhone,
	onReset,
	artBackground = false,
	theme = "auto",
}) => {
	return (
		<BookingConfirmationView
			confirmationData={confirmationData}
			selectedDate={selectedDate}
			selectedSlot={selectedSlot}
			selectedDoctor={selectedDoctor}
			selectedBranch={selectedBranch}
			patientName={patientName}
			patientPhone={patientPhone}
			onReset={onReset}
			artPack="nature"
			showArtBackdrop={artBackground}
			theme={theme}
			isFloating={true}
		/>
	);
};
