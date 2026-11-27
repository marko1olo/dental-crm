import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { patchLabOrderHandler } from "./patchModules/labOrderPatchHandler.js";
import { batchPatchLabOrdersHandler } from "./patchModules/labOrderBatchPatchHandler.js";

export async function registerOrderStatusPatchRoutes(app: FastifyInstance) {
	/**
	 * Пакетное обновление статусов нарядов ЗТЛ (макро-батч).
	 * Контекст: withTenantWriteCtx (organizationId), атомарная db.transaction (tx), Idempotency-Key (UUIDv7, RFC 9562).
	 */
	const batchStatusSchema = {
		headers: {
			type: "object",
			description: "Пакетное обновление статусов нарядов ЗТЛ с проверкой organizationId и Idempotency-Key",
		},
	} as const;

	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/lab/orders/batch-status",
		permission: "public",
		schema: batchStatusSchema,
		handler: async ({ request, reply }) => batchPatchLabOrdersHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/clinical/lab-orders/batch-status",
		permission: "public",
		schema: batchStatusSchema,
		handler: async ({ request, reply }) => batchPatchLabOrdersHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/lab-orders/batch-status",
		permission: "public",
		schema: batchStatusSchema,
		handler: async ({ request, reply }) => batchPatchLabOrdersHandler(request, reply),
	});

	/**
	 * PATCH /api/lab/orders/:id, /api/clinical/lab-orders/:id
	 * Частичное обновление наряда ЗТЛ (статус, этап, клинические заметки, фиксация события в labOrderEvents).
	 * Контекст: withTenantWriteCtx (organizationId), атомарная транзакция db.transaction (tx), Idempotency-Key.
	 */
	const partialUpdateSchema = {
		headers: {
			type: "object",
			description: "Частичное обновление наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
		},
	} as const;
	const statusUpdateSchema = {
		headers: {
			type: "object",
			description: "Обновление статуса наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
		},
	} as const;
	const putStatusUpdateSchema = {
		headers: {
			type: "object",
			description: "Обновление статуса наряда ЗТЛ (PUT-алиас) с проверкой organizationId и Idempotency-Key",
		},
	} as const;

	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/lab/orders/:id",
		permission: "public",
		schema: partialUpdateSchema,
		handler: async ({ request, reply }) => patchLabOrderHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/lab/orders/:id/status",
		permission: "public",
		schema: statusUpdateSchema,
		handler: async ({ request, reply }) => patchLabOrderHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/clinical/lab-orders/:id",
		permission: "public",
		schema: partialUpdateSchema,
		handler: async ({ request, reply }) => patchLabOrderHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/clinical/lab-orders/:id/status",
		permission: "public",
		schema: statusUpdateSchema,
		handler: async ({ request, reply }) => patchLabOrderHandler(request, reply),
	});

	// PUT aliases for unified status updates
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/clinical/lab-orders/:id/status",
		permission: "public",
		schema: putStatusUpdateSchema,
		handler: async ({ request, reply }) => patchLabOrderHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/lab/orders/:id/status",
		permission: "public",
		schema: putStatusUpdateSchema,
		handler: async ({ request, reply }) => patchLabOrderHandler(request, reply),
	});
}
