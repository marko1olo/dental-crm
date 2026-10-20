/**
 * index.ts — Layer 3: Master Route Coordinator and Barrel Export for Treatment Consumables Routes.
 * Registers technological card norm routes and atomic visit write-off routes on the Fastify instance.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerTechCardNormHandlers } from "./techCardNormHandlers.js";
import { registerVisitWriteOffHandlers } from "./visitWriteOffHandlers.js";

export * from "./types.js";
export * from "./consumableFefoAllocator.js";
export * from "./techCardNormHandlers.js";
export * from "./visitWriteOffHandlers.js";

/**
 * Fastify plugin registering all Treatment Consumables & Stock Auto-Deduction routes.
 */
export const treatmentConsumablesRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	await registerTechCardNormHandlers(server);
	await registerVisitWriteOffHandlers(server);
};

/**
 * Alias for canonical route registration naming convention.
 */
export const registerTreatmentConsumablesRoutes = treatmentConsumablesRoutes;
