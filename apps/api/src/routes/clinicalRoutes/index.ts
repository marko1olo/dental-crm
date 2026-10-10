import type { FastifyInstance } from "fastify";
import { registerClinicalDiagnosisRoutes } from "./clinicalDiagnosisHandlers.js";
import { registerClinicalProtocolRoutes } from "./clinicalProtocolHandlers.js";
import { registerClinicalTreatmentRoutes } from "./clinicalTreatmentHandlers.js";

/**
 * Master Fastify Registration Plugin for all Clinical Routes.
 * Assembles sub-route controllers in a strictly decoupled DAG per Mandate 8b & /decomposer.
 */
export async function registerClinicalRoutes(app: FastifyInstance) {
	await registerClinicalProtocolRoutes(app);
	await registerClinicalTreatmentRoutes(app);
	await registerClinicalDiagnosisRoutes(app);
}

export const clinicalRoutes = registerClinicalRoutes;

export * from "./types.js";
export { registerClinicalDiagnosisRoutes } from "./clinicalDiagnosisHandlers.js";
export { registerClinicalTreatmentRoutes } from "./clinicalTreatmentHandlers.js";
export { registerClinicalProtocolRoutes } from "./clinicalProtocolHandlers.js";
