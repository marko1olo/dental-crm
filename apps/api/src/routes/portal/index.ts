import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerPortalAppointmentsRoutes } from "./portalAppointmentsRoutes.js";
import { registerPortalAuthRoutes } from "./portalAuthRoutes.js";
import { registerPortalDocumentsRoutes } from "./portalDocumentsRoutes.js";
import { registerPortalKioskRoutes } from "./portalKioskRoutes.js";
import { registerPortalPatientProfileRoutes } from "./portalPatientProfileRoutes.js";
import { registerPortalPaymentsRoutes } from "./portalPaymentsRoutes.js";

export * from "./types.js";
export * from "./portalUtils.js";
export * from "./portalAuthStore.js";
export * from "./portalAuthRoutes.js";
export * from "./portalKioskRoutes.js";
export * from "./portalPatientProfileRoutes.js";
export * from "./portalDocumentsRoutes.js";
export * from "./portalPaymentsRoutes.js";
export * from "./portalAppointmentsRoutes.js";

/**
 * Canonical Fastify plugin for the Patient Personal Portal API (/api/portal/*)
 */
export const portalRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	await registerPortalAuthRoutes(server);
	await registerPortalKioskRoutes(server);
	await registerPortalPatientProfileRoutes(server);
	await registerPortalDocumentsRoutes(server);
	await registerPortalPaymentsRoutes(server);
	await registerPortalAppointmentsRoutes(server);
};

export default portalRoutes;
