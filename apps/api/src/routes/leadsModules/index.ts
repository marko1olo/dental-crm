import type { FastifyInstance } from "fastify";
import { registerLeadBatchOperationsRoutes } from "./leadBatchOperationsRoutes.js";
import { registerLeadConversionRoutes } from "./leadConversionRoutes.js";
import { registerLeadLifecycleRoutes } from "./leadLifecycleRoutes.js";
import { registerLeadSourceAnalyticsRoutes } from "./leadSourceAnalyticsRoutes.js";

export { leadStatusEnum, leadPriorityEnum } from "./types.js";
export * from "./types.js";
export { registerLeadLifecycleRoutes } from "./leadLifecycleRoutes.js";
export { registerLeadConversionRoutes } from "./leadConversionRoutes.js";
export { registerLeadSourceAnalyticsRoutes } from "./leadSourceAnalyticsRoutes.js";
export { registerLeadBatchOperationsRoutes } from "./leadBatchOperationsRoutes.js";

export async function registerLeadsRoutes(app: FastifyInstance): Promise<void> {
	await registerLeadLifecycleRoutes(app);
	await registerLeadSourceAnalyticsRoutes(app);
	await registerLeadBatchOperationsRoutes(app);
	await registerLeadConversionRoutes(app);
}
