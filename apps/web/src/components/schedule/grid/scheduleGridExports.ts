export {
	WORKPLACE_CHAIR_PALETTES,
	getWorkplaceChairPalette,
	STOMX_WORKPLACE_PALETTES,
	getStomxWorkplacePalette,
} from "@dental/shared";
export { resolveChairDutyDoctor, detectAppointmentCollisions, findAlternativeChairsForSlot, findShiftMinutesOptions } from "../chairRosterMath";
export { getAppointmentDurationMinutes, calculateAppointmentSpan, calculateAppointmentCardHeight, validateQuickBookingFields } from "../appointmentCardHelpers";
export type { ChairMaintenanceBlock } from "../../../utils/scheduleCollisionUtils";
export type { ChairDoctorSubShift, ChairDoctorShiftAssignment, ScheduleGridProps } from "./gridTypes";
export { CHAIR_SHIFT_PRESETS, HOURS, DEFAULT_SOLO_CHAIR } from "./gridConstants";
export { generateTimeSlots, safeBuildSlotIso, buildDoctorSlotAppointmentsMap } from "./gridSlotMath";
export { formatDoctorShortName, isAppointmentInChair, getNormalizedAppointmentStatusLabel, GridAppointmentCard } from "../GridAppointmentCard";
