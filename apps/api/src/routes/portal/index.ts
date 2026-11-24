import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerPortalAppointmentsRoutes } from "./portalAppointmentsRoutes.js";
import { registerPortalImagingRoutes } from "./portalImagingRoutes.js";
import { registerPortalAuthRoutes } from "./portalAuthRoutes.js";
import { registerPortalTelegramAuthRoutes } from "./portalTelegramAuthRoutes.js";
import { registerPortalDocumentsRoutes } from "./portalDocumentsRoutes.js";
import { registerPortalKioskRoutes } from "./portalKioskRoutes.js";
import { registerPortalPatientProfileRoutes } from "./portalPatientProfileRoutes.js";
import { registerPortalPaymentsRoutes } from "./portalPaymentsRoutes.js";
import { registerPortalTaxCertRoutes } from "./portalTaxCertRoutes.js";
import { registerPortalFamilyRoutes } from "./portalFamilyRoutes.js";

export type { SelfCheckinBody } from "./types.js";
export * from "./types.js";
export * from "./portalUtils.js";
export * from "./portalAuthStore.js";
export * from "./portalAuthRoutes.js";
export * from "./portalTelegramAuthRoutes.js";
export * from "./portalKioskRoutes.js";
export * from "./portalPatientProfileRoutes.js";
export * from "./portalDocumentsRoutes.js";
export * from "./portalPaymentsRoutes.js";
export * from "./portalTaxCertRoutes.js";
export * from "./portalFamilyRoutes.js";
export * from "./portalImagingRoutes.js";
export * from "./portalAppointmentsRoutes.js";

/**
 * Canonical Fastify plugin for the Patient Personal Portal API (/api/portal/*)
 */
export const portalRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	await registerPortalAuthRoutes(server);
	await registerPortalTelegramAuthRoutes(server);
	await registerPortalKioskRoutes(server);
	await registerPortalPatientProfileRoutes(server);
	await registerPortalDocumentsRoutes(server);
	await registerPortalTaxCertRoutes(server);
	await registerPortalFamilyRoutes(server);
	await registerPortalPaymentsRoutes(server);
	await registerPortalImagingRoutes(server);
	await registerPortalAppointmentsRoutes(server);
};

export const patientPortalRoutes = portalRoutes;

export default portalRoutes;
