/**
 * Patient Personal Portal - Appointments Tab Wrapper
 * (LAYER 4: PRESENTATION SUBCOMPONENT)
 *
 * Integrates appointment list, reception QR triggers, rescheduling drawers,
 * and 1-tap booking according to Mandates 8c and 8e.
 */

import React from "react";
import { AppointmentsTab } from "../tabs/AppointmentsTab.js";
import type {
	PatientAppointment,
	PatientPersonalCabinetData,
} from "../patientCabinetEngine.js";

export interface PatientCabinetAppointmentsTabProps {
	readonly data: PatientPersonalCabinetData;
	readonly onOpenReceptionQr: () => void;
	readonly onOpenReschedule: (apt: PatientAppointment) => void;
	readonly onOpenBooking: () => void;
	readonly onCancelAppointment: (aptId: string, reason: string) => Promise<void> | void;
	readonly onShowToast: (msg: string) => void;
}

export const PatientCabinetAppointmentsTab: React.FC<PatientCabinetAppointmentsTabProps> = ({
	data,
	onOpenReceptionQr,
	onOpenReschedule,
	onOpenBooking,
	onCancelAppointment,
	onShowToast,
}) => {
	return (
		<AppointmentsTab
			data={data}
			onOpenReceptionQr={onOpenReceptionQr}
			onOpenReschedule={onOpenReschedule}
			onOpenBooking={onOpenBooking}
			onCancelAppointment={onCancelAppointment}
			onShowToast={onShowToast}
		/>
	);
};

export default PatientCabinetAppointmentsTab;
