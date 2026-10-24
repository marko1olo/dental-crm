/**
 * @dental/api/routes/anesthesia/index.ts
 * Fastify Routes for Clinical Anesthesia (Mandate 8b, <= 120 lines)
 */

import type { FastifyInstance } from "fastify";
import { registerLogsCreateRoute } from "./logsCreateRoute.js";
import { registerLogsDeleteRoute } from "./logsDeleteRoute.js";
import { registerLogsListRoute } from "./logsListRoute.js";

export async function registerAnesthesiaRoutes(app: FastifyInstance): Promise<void> {
	registerLogsListRoute(app);
	registerLogsCreateRoute(app);
	registerLogsDeleteRoute(app);
}

export * from "./schemas.js";
