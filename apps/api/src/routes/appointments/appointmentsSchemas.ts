import {
	createAppointmentSchema,
	dashboardSchema,
	updateAppointmentSchema,
} from "@dental/shared";
import {
	appointmentCreateValidationMessage,
	appointmentRejectionResponse,
	appointmentUpdateValidationMessage,
	findSuggestedAvailableSlots,
	parseSchedulePayload,
	sendAppointmentRejection,
} from "../appointmentErrors.js";

export {
	appointmentCreateValidationMessage,
	appointmentRejectionResponse,
	appointmentUpdateValidationMessage,
	createAppointmentSchema,
	dashboardSchema,
	findSuggestedAvailableSlots,
	parseSchedulePayload,
	sendAppointmentRejection,
	updateAppointmentSchema,
};

export const APPOINTMENT_STATUS_ALIASES: Readonly<Record<string, string>> = {
	in_chair: "in_treatment",
	in_progress: "in_treatment",
	in_clinic: "arrived",
	waiting: "arrived",
	finished: "completed",
	closed: "completed",
	scheduled: "planned",
};

export const DEFAULT_ASSISTANT_PLACEHOLDERS: ReadonlySet<string> = new Set([
	"",
	"default-assistant",
]);

export const DEFAULT_CHAIR_PLACEHOLDERS: ReadonlySet<string> = new Set([
	"default-chair",
	"chair-1",
]);

export const DEFAULT_DOCTOR_PLACEHOLDERS: ReadonlySet<string> = new Set([
	"default-doctor",
	"doctor-solo",
	"doctor-default",
]);

export const ARRIVAL_INTERCOM_CHANNEL_SLUGS = [
	"reception",
	"intercom_assistants",
] as const;
