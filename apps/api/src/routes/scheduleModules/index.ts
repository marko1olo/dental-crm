import type { FastifyInstance } from "fastify";
import { registerAppointmentsRoutes } from "../appointments.js";
import { registerScheduleClipboardRoutes } from "./scheduleClipboardRoutes.js";
import { registerScheduleDoctorShiftsRoutes } from "./scheduleDoctorShiftsRoutes.js";
import { registerScheduleWorkplacesRoutes } from "./scheduleWorkplacesRoutes.js";

export { findSuggestedAvailableSlots } from "../appointmentErrors.js";
export { registerAppointmentsRoutes } from "../appointments.js";
export { registerScheduleWorkplacesRoutes } from "./scheduleWorkplacesRoutes.js";
export { registerScheduleClipboardRoutes } from "./scheduleClipboardRoutes.js";
export { registerScheduleDoctorShiftsRoutes } from "./scheduleDoctorShiftsRoutes.js";

/**
 * Единая точка монтирования маршрутов расписания клиники.
 */
export async function registerScheduleRoutes(app: FastifyInstance) {
	await registerAppointmentsRoutes(app);
	await registerScheduleWorkplacesRoutes(app);
	await registerScheduleClipboardRoutes(app);
	await registerScheduleDoctorShiftsRoutes(app);
}
