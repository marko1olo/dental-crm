import type { FastifyInstance } from "fastify";
import { registerAlignerRoutes } from "./alignerRoutes.js";
import { registerArchwireRoutes } from "./archwireRoutes.js";
import { registerStageAndMaterialRoutes } from "./stageRoutes.js";

export * from "./types.js";
export * from "./helpers.js";
export * from "./materialDeduction.js";

export async function registerOrthodonticsRoutes(app: FastifyInstance) {
	// Register legacy route prefix
	registerAlignerRoutes(app, "/api/orthodontics");
	registerArchwireRoutes(app, "/api/orthodontics");
	registerStageAndMaterialRoutes(app, "/api/orthodontics");

	// Register canonical REST v1 route prefix (Mandate: /api/v1/orthodontics)
	registerAlignerRoutes(app, "/api/v1/orthodontics");
	registerArchwireRoutes(app, "/api/v1/orthodontics");
	registerStageAndMaterialRoutes(app, "/api/v1/orthodontics");
}
