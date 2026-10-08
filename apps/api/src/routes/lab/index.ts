import type { FastifyInstance } from "fastify";
import { registerExpressOrderRoutes } from "./expressOrderRoutes.js";
import { registerOrdersCrudRoutes } from "./ordersCrudRoutes.js";
import { registerOrderStatusPatchRoutes } from "./orderStatusPatchRoutes.js";
import { registerOrderItemsRoutes } from "./orderItemsRoutes.js";
import { registerLabPipelineRoutes } from "./pipelineRoutes.js";
import { registerTechnicianPortalRoutes } from "./technicianPortalRoutes.js";
import { registerLabScansUploadRoutes } from "./scansUploadRoutes.js";

export async function registerLabRoutes(app: FastifyInstance) {
	await registerExpressOrderRoutes(app);
	await registerOrdersCrudRoutes(app);
	await registerOrderStatusPatchRoutes(app);
	await registerOrderItemsRoutes(app);
	await registerLabPipelineRoutes(app);
	await registerTechnicianPortalRoutes(app);
	await registerLabScansUploadRoutes(app);
}

// Backward compatibility re-export aliases
export const registerLabOrderRoutes = registerLabRoutes;
export const registerDentalLabRoutes = registerLabRoutes;

export {
	calculateBusinessDaysDueDate,
	CANONICAL_DENTAL_LAB_PRESETS,
} from "./types.js";

export * from "./types.js";
export * from "./expressOrderRoutes.js";
export * from "./ordersCrudRoutes.js";
export * from "./orderStatusPatchRoutes.js";
export * from "./orderItemsRoutes.js";
export * from "./pipelineRoutes.js";
export * from "./technicianPortalRoutes.js";
export * from "./scansUploadRoutes.js";
