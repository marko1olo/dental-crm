/**
 * apps/api/src/routes/appointments.ts
 * Thin facade re-exporting canonical routes/appointments/index.js (SSOT).
 * Mandates: 8bd (Single Source of Truth), 8bh (Type Ratchet & Zero Duplicate Logic).
 */

export * from "./appointments/index.js";
export { registerAppointmentsRoutes as default } from "./appointments/index.js";
export {
	findSuggestedAvailableSlots,
	type AppointmentMutationCode,
	type AppointmentRejectionReason,
	type AppointmentRejectionResponse,
} from "./appointmentErrors.js";
