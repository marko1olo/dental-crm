import type { FastifyInstance } from "fastify";
import { registerCohortRoutes } from "./cohortRoutes.js";
import { registerCuratorRoutes } from "./curatorRoutes.js";
import { registerDashboardRoutes } from "./dashboardRoutes.js";
import { registerDiagnocatRoutes } from "./diagnocatRoutes.js";
import { registerExecutiveRoutes } from "./executiveRoutes.js";
import { registerRebookingRoutes } from "./rebookingRoutes.js";
import { registerUtilizationRoutes } from "./utilizationRoutes.js";

/**
 * Main Analytics Router Plugin (Layer 5)
 * Assembles all specialized analytics routes.
 */
export async function registerAnalyticsRoutes(app: FastifyInstance) {
	await registerDashboardRoutes(app);
	await registerCuratorRoutes(app);
	await registerExecutiveRoutes(app);
	await registerRebookingRoutes(app);
	await registerDiagnocatRoutes(app);
	await registerCohortRoutes(app);
	await registerUtilizationRoutes(app);
}

export default registerAnalyticsRoutes;

// Re-export Layer 0 types and constants
export * from "./types.js";

// Re-export Layer 1 pure utilities
export * from "./utils.js";

// Re-export domain logic and route handlers
export * from "./cohortRoutes.js";
export * from "./curatorRoutes.js";
export * from "./dashboardRoutes.js";
export * from "./diagnocatRoutes.js";
export * from "./executiveRoutes.js";
export * from "./rebookingRoutes.js";
export * from "./utilizationRoutes.js";
