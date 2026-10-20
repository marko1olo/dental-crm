import type { FastifyInstance } from "fastify";
import {
	createAppointmentHandler,
	createNextStageAppointmentHandler,
	registerAppointmentsRoutes,
	updateAppointmentHandler,
} from "./appointments/appointmentsMutationRoutes.js";

export {
	findSuggestedAvailableSlots,
	type AppointmentMutationCode,
	type AppointmentRejectionReason,
	type AppointmentRejectionResponse,
} from "./appointmentErrors.js";

export {
	createAppointmentHandler,
	createNextStageAppointmentHandler,
	registerAppointmentsRoutes,
	updateAppointmentHandler,
};

export * from "./appointments/types.js";
export * from "./appointments/appointmentsSchemas.js";
export * from "./appointments/appointmentsHelpers.js";
export * from "./appointments/appointmentsQueryRoutes.js";
export * from "./appointments/appointmentsStatusRoutes.js";
export * from "./appointments/appointmentsMutationRoutes.js";

export default registerAppointmentsRoutes;
