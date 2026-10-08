/**
 * index.ts — Layer 5: Master Coordinator and Fastify Plugin Facade for Copilot Routes.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { actionRoutes } from "./actionRoutes.js";
import { chatRoutes } from "./chatRoutes.js";
import { extractDoctorScreenContext } from "./contextExtractor.js";
import { proactiveRoutes } from "./proactiveRoutes.js";
import { sessionRoutes } from "./sessionRoutes.js";

export const copilotRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	await server.register(sessionRoutes);
	await server.register(chatRoutes);
	await server.register(actionRoutes);
	await server.register(proactiveRoutes);
};

export { extractDoctorScreenContext };
export type * from "./types.js";
export default copilotRoutes;
