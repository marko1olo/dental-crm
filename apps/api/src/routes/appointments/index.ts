import type { FastifyInstance } from "fastify";
import { registerAppointmentsRoutes } from "./appointmentsMutationRoutes.js";

export * from "./types.js";
export * from "./appointmentsSchemas.js";
export * from "./appointmentsHelpers.js";
export * from "./appointmentsQueryRoutes.js";
export * from "./appointmentsStatusRoutes.js";
export * from "./appointmentsMutationRoutes.js";

export { registerAppointmentsRoutes };
export default registerAppointmentsRoutes;
