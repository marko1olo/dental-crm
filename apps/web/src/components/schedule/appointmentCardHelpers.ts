export type { DoctorSpecialtyTheme, ScheduleDensityMode } from "./appointmentCard/index";
export {
	extractTeethList,
	formatPatientDisplayFio,
	formatDoctorShortName,
	isAppointmentInChair,
	isAppointmentCito,
	getNormalizedAppointmentStatusLabel,
	getAppointmentStatusBadgeClasses,
	getDoctorSpecialtyTheme,
	getGridAppointmentCardContainerClasses,
	getAppointmentDurationMinutes,
	getAppointmentElapsedMinutes,
	calculateAppointmentSpan,
	calculateProportionalCardHeight,
	calculateAppointmentCardHeight,
	resolvePatientBalance,
	getPatientAllergyAlert,
	getPatientSomaticAlert,
	validateQuickBookingFields,
} from "./appointmentCard/index";

export type { ClinicalBadgeItem } from "./clinicalBadges/index";
export {
	resolveAppointmentLabStatus,
	resolveAppointmentClinicalBadges,
	sanitizeScheduleCardText,
	isRedundantScheduleComment,
	formatRussianAge,
} from "./clinicalBadges/index";
