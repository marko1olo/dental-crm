import type { FastifyInstance } from "fastify";
import {
	createLabOrderHandler,
	deleteLabOrderHandler,
	getLabOrdersHandler,
	putLabOrderHandler,
} from "./ordersCrudModules/labOrderHandlers.js";

/**
 * Canonical facade for Dental Lab Orders CRUD routes.
 * Decomposed under /decomposer architecture into modular sub-layers in ./ordersCrudModules/.
 */
export async function registerOrdersCrudRoutes(app: FastifyInstance) {
	// GET: All lab orders with optional patient filtering
	app.get("/api/clinical/lab-orders", getLabOrdersHandler);
	app.get("/api/lab/orders", getLabOrdersHandler);
	app.get("/api/dental-lab/orders", getLabOrdersHandler);

	// POST: Create lab order
	app.post("/api/clinical/lab-orders", createLabOrderHandler);
	app.post("/api/lab/orders", createLabOrderHandler);
	app.post("/api/dental-lab/orders", createLabOrderHandler);

	// PUT: Update lab order & status transitions
	app.put("/api/clinical/lab-orders/:id", putLabOrderHandler);
	app.put("/api/lab/orders/:id", putLabOrderHandler);
	app.put("/api/dental-lab/orders/:id", putLabOrderHandler);

	// DELETE: Remove draft or cancelled order
	app.delete("/api/clinical/lab-orders/:id", deleteLabOrderHandler);
	app.delete("/api/lab/orders/:id", deleteLabOrderHandler);
	app.delete("/api/dental-lab/orders/:id", deleteLabOrderHandler);
}

// Re-exports from decomposed modules
export * from "./ordersCrudModules/labOrderValidationSchemas.js";
export * from "./ordersCrudModules/labOrderCostCalculator.js";
export * from "./ordersCrudModules/labOrderDbOperations.js";
export * from "./ordersCrudModules/labOrderHandlers.js";

