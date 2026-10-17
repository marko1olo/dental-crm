export type { ClinicalBadgeItem } from "./types";
export { resolveAppointmentLabStatus } from "./labStatusResolver";
export { resolveAppointmentClinicalBadges } from "./clinicalBadgesResolver";
export {
	sanitizeScheduleCardText,
	isRedundantScheduleComment,
	formatRussianAge,
} from "./scheduleTextSanitizer";
