import type { Appointment, Dashboard } from "@dental/shared";
import React from "react";
import { AppointmentModalHeaderMenuAnchors } from "./AppointmentModalHeaderMenuAnchors";
import { AppointmentModalHeaderMenuItems } from "./AppointmentModalHeaderMenuItems";

export interface AppointmentModalHeaderMoreMenuProps {
	isOpen: boolean;
	onClose: () => void;
	patientId: string;
	currentPatientName: string;
	isNewAppointment: boolean;
	dashboard: Dashboard;
	appointment: Appointment;
	onModalClose: () => void;
	repeatAppointment?: ((appointment: Appointment) => void) | undefined;
	copyAppointmentToBuffer?: ((appointment: Appointment) => void) | undefined;
}

export function AppointmentModalHeaderMoreMenu({
	isOpen,
	onClose,
	patientId,
	currentPatientName,
	isNewAppointment,
	dashboard,
	appointment,
	onModalClose,
	repeatAppointment,
	copyAppointmentToBuffer,
}: AppointmentModalHeaderMoreMenuProps) {
	if (!isOpen) {
		return (
			<AppointmentModalHeaderMenuAnchors
				patientId={patientId}
				isNewAppointment={isNewAppointment}
				hasRepeat={Boolean(repeatAppointment)}
				hasCopy={Boolean(copyAppointmentToBuffer)}
			/>
		);
	}

	return (
		<>
			<div
				className="fixed inset-0 z-20 cursor-default"
				onClick={onClose}
				aria-hidden="true"
			/>
			<AppointmentModalHeaderMenuItems
				onClose={onClose}
				patientId={patientId}
				currentPatientName={currentPatientName}
				isNewAppointment={isNewAppointment}
				dashboard={dashboard}
				appointment={appointment}
				onModalClose={onModalClose}
				repeatAppointment={repeatAppointment}
				copyAppointmentToBuffer={copyAppointmentToBuffer}
			/>
		</>
	);
}
