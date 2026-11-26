import type { FastifyInstance } from "fastify";
import { registerAppointmentsRoutes } from "../appointments.js";
import { registerSlotLeaseRoutes } from "../schedule/slotLeaseRoutes.js";
import { registerScheduleClipboardRoutes } from "./scheduleClipboardRoutes.js";
import { registerScheduleDoctorShiftsRoutes } from "./scheduleDoctorShiftsRoutes.js";
import { registerScheduleTimeReservationsRoutes } from "./scheduleTimeReservationsRoutes.js";
import { registerScheduleWorkplacesRoutes } from "./scheduleWorkplacesRoutes.js";

export { findSuggestedAvailableSlots } from "../appointmentErrors.js";
export { registerAppointmentsRoutes } from "../appointments.js";
export { registerSlotLeaseRoutes } from "../schedule/slotLeaseRoutes.js";
export { registerScheduleWorkplacesRoutes } from "./scheduleWorkplacesRoutes.js";
export { registerScheduleClipboardRoutes } from "./scheduleClipboardRoutes.js";
export { registerScheduleDoctorShiftsRoutes } from "./scheduleDoctorShiftsRoutes.js";
export { registerScheduleTimeReservationsRoutes } from "./scheduleTimeReservationsRoutes.js";

/**
 * Единая точка монтирования маршрутов расписания клиники.
 */
export async function registerScheduleRoutes(app: FastifyInstance) {
	await registerAppointmentsRoutes(app);
	await registerSlotLeaseRoutes(app);
	await registerScheduleWorkplacesRoutes(app);
	await registerScheduleClipboardRoutes(app);
	await registerScheduleDoctorShiftsRoutes(app);
	await registerScheduleTimeReservationsRoutes(app);
}
