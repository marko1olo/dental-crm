import type { FastifyInstance } from "fastify";
import { registerPolicyMutationRoutes } from "./policyMutationHandlers.js";
import { registerPolicyQueryRoutes } from "./policyQueryHandlers.js";

export async function registerPolicyManagementRoutes(app: FastifyInstance) {
	await registerPolicyQueryRoutes(app);
	await registerPolicyMutationRoutes(app);
}

export { registerPolicyQueryRoutes } from "./policyQueryHandlers.js";
export { registerPolicyMutationRoutes } from "./policyMutationHandlers.js";
