import type { Appointment } from "@dental/shared";
import React from "react";
import { ScheduleMobileSheetAdjustDuration } from "./ScheduleMobileSheetAdjustDuration";
import {
	type MobileChairItem,
	type MobileDoctorItem,
	ScheduleMobileSheetReassignControls,
} from "./ScheduleMobileSheetReassignControls";

export interface ScheduleMobileSheetAdjustControlsProps {
	selectedMobileAppt: Appointment;
	effectiveChairs: Array<MobileChairItem>;
	doctors: Array<MobileDoctorItem>;
	handleAdjustAppointmentDuration: (appt: Appointment, delta: number) => void;
	handleShiftAppointmentLateness: (appt: Appointment, shift: number) => void;
	handleReassignAppointmentChair: (
		appt: Appointment,
		chairId: string | null,
	) => void;
	handleReassignAppointmentDoctor: (
		appt: Appointment,
		doctorUserId: string,
	) => void;
	handleFreeSlotToWaitlist: (appt: Appointment) => void;
}

export const ScheduleMobileSheetAdjustControls: React.FC<
	ScheduleMobileSheetAdjustControlsProps
> = ({
	selectedMobileAppt,
	effectiveChairs,
	doctors,
	handleAdjustAppointmentDuration,
	handleShiftAppointmentLateness,
	handleReassignAppointmentChair,
	handleReassignAppointmentDoctor,
	handleFreeSlotToWaitlist,
}) => {
	return (
		<>
			<ScheduleMobileSheetAdjustDuration
				selectedMobileAppt={selectedMobileAppt}
				handleAdjustAppointmentDuration={handleAdjustAppointmentDuration}
				handleShiftAppointmentLateness={handleShiftAppointmentLateness}
				handleFreeSlotToWaitlist={handleFreeSlotToWaitlist}
			/>
			<ScheduleMobileSheetReassignControls
				selectedMobileAppt={selectedMobileAppt}
				effectiveChairs={effectiveChairs}
				doctors={doctors}
				handleReassignAppointmentChair={handleReassignAppointmentChair}
				handleReassignAppointmentDoctor={handleReassignAppointmentDoctor}
			/>
		</>
	);
};
