import type { FastifyInstance } from "fastify";
import { patchLabOrderHandler } from "./patchModules/labOrderPatchHandler.js";

export async function registerOrderStatusPatchRoutes(app: FastifyInstance) {
	/**
	 * PATCH /api/lab/orders/:id, /api/clinical/lab-orders/:id, /api/dental-lab/orders/:id
	 * Частичное обновление наряда ЗТЛ (статус, этап, клинические заметки, фиксация события в labOrderEvents).
	 */
	app.patch("/api/lab/orders/:id", patchLabOrderHandler);
	app.patch("/api/lab/orders/:id/status", patchLabOrderHandler);
	app.patch("/api/clinical/lab-orders/:id", patchLabOrderHandler);
	app.patch("/api/clinical/lab-orders/:id/status", patchLabOrderHandler);
	app.patch("/api/dental-lab/orders/:id", patchLabOrderHandler);
	app.patch("/api/dental-lab/orders/:id/status", patchLabOrderHandler);
}
