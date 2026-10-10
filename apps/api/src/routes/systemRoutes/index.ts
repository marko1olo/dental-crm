import type { FastifyInstance } from "fastify";
import { registerSystemAuditRoutes } from "./systemAuditHandlers.js";
import { registerSystemConfigRoutes } from "./systemConfigHandlers.js";
import { registerSystemHealthRoutes } from "./systemHealthHandlers.js";
import { registerSystemMaintenanceRoutes } from "./systemMaintenanceHandlers.js";

export async function registerSystemRoutes(app: FastifyInstance): Promise<void> {
	registerSystemHealthRoutes(app);
	registerSystemConfigRoutes(app);
	registerSystemAuditRoutes(app);
	registerSystemMaintenanceRoutes(app);
}

export * from "./types.js";
export * from "./systemHealthHandlers.js";
export * from "./systemConfigHandlers.js";
export * from "./systemAuditHandlers.js";
export * from "./systemMaintenanceHandlers.js";
