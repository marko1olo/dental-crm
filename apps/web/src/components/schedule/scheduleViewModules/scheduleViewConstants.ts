// Layer 1: Pure constants and shift mapping functions
export {
  buildChairDoctorAssignmentsFromShifts,
  buildChairDoctorAssignmentsByDate,
} from "../view/scheduleViewShifts";

export {
  activeVisitLockedAppointmentStatuses,
} from "../view/scheduleViewTypes";

export {
  DEFAULT_SOLO_CHAIR,
  formatDoctorShortName,
} from "../ScheduleGrid";

export {
  DEFAULT_CLINIC_STAFF,
  CLINIC_CABINETS_CATALOG,
} from "../roster/doctorShiftRosterPresets";
