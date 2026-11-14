import type { FastifyInstance } from "fastify";
import { patchLabOrderHandler } from "./patchModules/labOrderPatchHandler.js";
import { batchPatchLabOrdersHandler } from "./patchModules/labOrderBatchPatchHandler.js";

export async function registerOrderStatusPatchRoutes(app: FastifyInstance) {
	/**
	 * Пакетное обновление статусов нарядов ЗТЛ (1-клик сдача курьеру, макро-батч).
	 */
	app.patch("/api/lab/orders/batch-status", batchPatchLabOrdersHandler);
	app.patch("/api/clinical/lab-orders/batch-status", batchPatchLabOrdersHandler);
	app.post("/api/clinical/lab-orders/batch-status", batchPatchLabOrdersHandler);

	/**
	 * PATCH /api/lab/orders/:id, /api/clinical/lab-orders/:id
	 * Частичное обновление наряда ЗТЛ (статус, этап, клинические заметки, фиксация события в labOrderEvents).
	 */
	app.patch("/api/lab/orders/:id", patchLabOrderHandler);
	app.patch("/api/lab/orders/:id/status", patchLabOrderHandler);
	app.patch("/api/clinical/lab-orders/:id", patchLabOrderHandler);
	app.patch("/api/clinical/lab-orders/:id/status", patchLabOrderHandler);

	// PUT aliases for unified status updates
	app.put("/api/clinical/lab-orders/:id/status", patchLabOrderHandler);
	app.put("/api/lab/orders/:id/status", patchLabOrderHandler);
}
