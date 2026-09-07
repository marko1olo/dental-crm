import React from "react";
import {
	AppointmentModal,
	type AppointmentModalProps,
} from "./AppointmentModal";
import {
	QuickBookingDrawer,
	type QuickBookingDrawerProps,
	type QuickBookingSlotInfo,
	resolveChairDutyDoctor,
} from "./QuickBookingDrawer";

export interface ScheduleAppointmentModalProps extends AppointmentModalProps {
	/**
	 * Optional quick-booking slot if launching directly into quick creation mode
	 */
	quickSlot?: QuickBookingSlotInfo | null;
}

/**
 * ScheduleAppointmentModal — Unified appointment modal for schedule workflows.
 * Adheres to StomX / IDENT parity:
 * - Auto-binds doctor to chair shift at selected time
 * - Solo Doctor 0-click chair selection default
 * - Mandate 8e: Zero disabled buttons without guidance
 */
export const ScheduleAppointmentModal: React.FC<ScheduleAppointmentModalProps> = (props) => {
	const { quickSlot, ...modalProps } = props;

	return <AppointmentModal {...modalProps} />;
};

export {
	AppointmentModal,
	QuickBookingDrawer,
	resolveChairDutyDoctor,
};
export type {
	AppointmentModalProps,
	QuickBookingDrawerProps,
	QuickBookingSlotInfo,
};

export default ScheduleAppointmentModal;
