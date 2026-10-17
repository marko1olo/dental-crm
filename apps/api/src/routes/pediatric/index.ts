import type { FastifyInstance } from "fastify";
import { registerPediatricPresetRoutes } from "./pediatricPresets.js";
import { registerPediatricIndicesRoutes } from "./pediatricIndicesRoutes.js";
import { registerPediatricDiplomaRoutes } from "./pediatricDiplomaRoutes.js";

export * from "./pediatricPresets.js";
export * from "./pediatricIndicesRoutes.js";
export * from "./pediatricDiplomaRoutes.js";

export function registerPediatricRoutes(app: FastifyInstance): void {
	registerPediatricPresetRoutes(app);
	registerPediatricIndicesRoutes(app);
	registerPediatricDiplomaRoutes(app);
}

export default registerPediatricRoutes;
