import React from "react";
import type { AppointmentCardVisualBodyProps } from "./types";
import { CardMicroDensityRow } from "./CardMicroDensityRow";
import { CardTwoLineBody } from "./CardTwoLineBody";
import { CardStandardBody } from "./CardStandardBody";

export function AppointmentCardVisualBody({
	props,
	state,
	isMicroDensity,
	isTwoLineMode,
	appointmentSuggestions,
	onOpenVisit,
	openAppointmentEditor,
	setIsMobileSheetOpen,
	onFreeSlotToWaitlist,
}: AppointmentCardVisualBodyProps) {
	const {
		appointment,
		dashboard,
		openScheduleSuggestion,
		formatTime,
		repeatAppointment,
		copyAppointmentToBuffer,
		appointmentLabels,
		appointmentEditing,
	} = props;
	const effectiveOnFreeSlotToWaitlist = onFreeSlotToWaitlist ?? props.onFreeSlotToWaitlist;

	const {
		appointmentDoctor,
		appointmentPatient,
		appointmentPatientName,
		patientBalance,
		isCito,
		displayStatus,
		isQuickStatusUpdating,
		isLockedStatus,
		handleQuickStatusChange,
		handleShiftAppointmentTime,
		activeScheduleCollision,
		appointmentHasOpenVisit,
		cardTeeth,
		allergyAlert,
		somaticAlert,
		labReadinessAlert,
		appointmentChair,
	} = state;

	const sharedProps = {
		appointment,
		appointmentPatient,
		appointmentPatientName,
		appointmentDoctor,
		patientBalance,
		isCito,
		displayStatus,
		isQuickStatusUpdating,
		isLockedStatus,
		formatTime,
		onOpenVisit,
		openAppointmentEditor,
		setIsMobileSheetOpen,
		handleQuickStatusChange,
		handleShiftAppointmentTime,
		appointmentLabels,
		dashboard,
		appointmentSuggestions,
		openScheduleSuggestion,
		repeatAppointment,
		copyAppointmentToBuffer,
		effectiveOnFreeSlotToWaitlist,
	};

	if (isMicroDensity && !appointmentEditing) {
		return <CardMicroDensityRow {...sharedProps} />;
	}

	if (isTwoLineMode && !appointmentEditing) {
		return (
			<CardTwoLineBody
				{...sharedProps}
				activeScheduleCollision={activeScheduleCollision}
				appointmentHasOpenVisit={appointmentHasOpenVisit}
				appointmentEditing={appointmentEditing}
				cardTeeth={cardTeeth}
				allergyAlert={allergyAlert}
				somaticAlert={somaticAlert}
				labReadinessAlert={labReadinessAlert}
			/>
		);
	}

	return (
		<CardStandardBody
			{...sharedProps}
			appointmentChair={appointmentChair}
			activeScheduleCollision={activeScheduleCollision}
			appointmentHasOpenVisit={appointmentHasOpenVisit}
			appointmentEditing={appointmentEditing}
			cardTeeth={cardTeeth}
			allergyAlert={allergyAlert}
			somaticAlert={somaticAlert}
			labReadinessAlert={labReadinessAlert}
		/>
	);
}
