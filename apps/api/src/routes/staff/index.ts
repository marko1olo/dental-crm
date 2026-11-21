import type { FastifyInstance } from "fastify";
import { registerStaffMutationRoutes } from "./staffMutationRoutes.js";
import { registerStaffQueryRoutes } from "./staffQueryRoutes.js";

export async function registerStaffDomainRoutes(app: FastifyInstance): Promise<void> {
	await registerStaffQueryRoutes(app);
	await registerStaffMutationRoutes(app);
}

export * from "./types.js";
export * from "./staffSchemas.js";
export * from "./staffHelpers.js";
export * from "./staffQueryRoutes.js";
export * from "./staffMutationRoutes.js";
