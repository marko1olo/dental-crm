import type { FastifyInstance } from "fastify";
import { patchLabOrderHandler } from "./patchModules/labOrderPatchHandler.js";
import { batchPatchLabOrdersHandler } from "./patchModules/labOrderBatchPatchHandler.js";

export async function registerOrderStatusPatchRoutes(app: FastifyInstance) {
	/**
	 * Пакетное обновление статусов нарядов ЗТЛ (1-клик сдача курьеру, макро-батч).
	 * Контекст: withTenantCtx (organizationId), атомарная db.transaction (tx), Idempotency-Key (UUIDv7, RFC 9562).
	 */
	app.patch("/api/lab/orders/batch-status", {
		schema: {
			headers: {
				type: "object",
				description: "Пакетное обновление статусов нарядов ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, batchPatchLabOrdersHandler);
	app.patch("/api/clinical/lab-orders/batch-status", {
		schema: {
			headers: {
				type: "object",
				description: "Пакетное обновление статусов нарядов ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, batchPatchLabOrdersHandler);
	app.post("/api/clinical/lab-orders/batch-status", {
		schema: {
			headers: {
				type: "object",
				description: "Пакетное обновление статусов нарядов ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, batchPatchLabOrdersHandler);

	/**
	 * PATCH /api/lab/orders/:id, /api/clinical/lab-orders/:id
	 * Частичное обновление наряда ЗТЛ (статус, этап, клинические заметки, фиксация события в labOrderEvents).
	 * Контекст: withTenantCtx (organizationId), атомарная транзакция db.transaction (tx), Idempotency-Key.
	 */
	app.patch("/api/lab/orders/:id", {
		schema: {
			headers: {
				type: "object",
				description: "Частичное обновление наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, patchLabOrderHandler);
	app.patch("/api/lab/orders/:id/status", {
		schema: {
			headers: {
				type: "object",
				description: "Обновление статуса наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, patchLabOrderHandler);
	app.patch("/api/clinical/lab-orders/:id", {
		schema: {
			headers: {
				type: "object",
				description: "Частичное обновление наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, patchLabOrderHandler);
	app.patch("/api/clinical/lab-orders/:id/status", {
		schema: {
			headers: {
				type: "object",
				description: "Обновление статуса наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, patchLabOrderHandler);

	// PUT aliases for unified status updates
	app.put("/api/clinical/lab-orders/:id/status", {
		schema: {
			headers: {
				type: "object",
				description: "Обновление статуса наряда ЗТЛ (PUT-алиас) с проверкой organizationId и Idempotency-Key",
			},
		},
	}, patchLabOrderHandler);
	app.put("/api/lab/orders/:id/status", {
		schema: {
			headers: {
				type: "object",
				description: "Обновление статуса наряда ЗТЛ (PUT-алиас) с проверкой organizationId и Idempotency-Key",
			},
		},
	}, patchLabOrderHandler);
}
