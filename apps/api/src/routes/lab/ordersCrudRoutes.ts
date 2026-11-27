import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import {
	createLabOrderHandler,
	deleteLabOrderHandler,
	getLabOrdersHandler,
	putLabOrderHandler,
} from "./ordersCrudModules/labOrderHandlers.js";
import {
	handleCheckPlanContinuity,
	handleGetExpressPresets,
} from "./ordersCrudModules/labPresetsHandlers.js";

/**
 * Canonical facade for Dental Lab Orders CRUD routes.
 * Decomposed under /decomposer architecture into modular sub-layers in ./ordersCrudModules/.
 */
export async function registerOrdersCrudRoutes(app: FastifyInstance) {
	// GET: All lab orders with optional patient filtering
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/lab-orders",
		permission: "public",
		handler: async ({ request, reply }) => getLabOrdersHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/lab/orders",
		permission: "public",
		handler: async ({ request, reply }) => getLabOrdersHandler(request, reply),
	});

	// POST: Create lab order (канонический эндпоинт + экспресс-алиас)
	// Контекст: withTenantWriteCtx (organizationId), Idempotency-Key (UUIDv7, RFC 9562)
	const createSchema = {
		headers: {
			type: "object",
			description: "Создание наряда ЗТЛ с изоляцией организации (organizationId) и заголовком Idempotency-Key",
		},
	} as const;
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/lab-orders",
		permission: "public",
		schema: createSchema,
		handler: async ({ request, reply }) => createLabOrderHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/lab/orders",
		permission: "public",
		schema: createSchema,
		handler: async ({ request, reply }) => createLabOrderHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/dental-lab/express-order",
		permission: "public",
		schema: {
			headers: {
				type: "object",
				description: "Экспресс-создание наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
		handler: async ({ request, reply }) => createLabOrderHandler(request, reply),
	});

	// GET & POST: Presets & Plan continuity
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/dental-lab/presets",
		permission: "public",
		handler: async ({ request, reply }) => handleGetExpressPresets(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/dental-lab/check-plan-continuity",
		permission: "public",
		schema: {
			headers: {
				type: "object",
				description: "Проверка непрерывности плана лечения с изоляцией организации (organizationId) и Idempotency-Key",
			},
		},
		handler: async ({ request, reply }) => handleCheckPlanContinuity(request, reply),
	});

	// PUT: Update lab order & status transitions
	// Контекст: withTenantWriteCtx (organizationId), атомарная транзакция db.transaction (tx), Idempotency-Key
	const updateSchema = {
		headers: {
			type: "object",
			description: "Обновление наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
		},
	} as const;
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/clinical/lab-orders/:id",
		permission: "public",
		schema: updateSchema,
		handler: async ({ request, reply }) => putLabOrderHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/lab/orders/:id",
		permission: "public",
		schema: updateSchema,
		handler: async ({ request, reply }) => putLabOrderHandler(request, reply),
	});

	// DELETE: Remove draft or cancelled order
	// Контекст: withTenantWriteCtx (organizationId), каскадная db.transaction (tx) очистка items/events, Idempotency-Key
	const deleteSchema = {
		headers: {
			type: "object",
			description: "Удаление черновика наряда ЗТЛ с каскадной очисткой в db.transaction, проверкой organizationId и Idempotency-Key",
		},
	} as const;
	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/clinical/lab-orders/:id",
		permission: "public",
		schema: deleteSchema,
		handler: async ({ request, reply }) => deleteLabOrderHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/lab/orders/:id",
		permission: "public",
		schema: deleteSchema,
		handler: async ({ request, reply }) => deleteLabOrderHandler(request, reply),
	});
}

// Re-exports from decomposed modules
export * from "./ordersCrudModules/labOrderValidationSchemas.js";
export * from "./ordersCrudModules/labOrderCostCalculator.js";
export * from "./ordersCrudModules/labOrderDbOperations.js";
export * from "./ordersCrudModules/labOrderHandlers.js";
export * from "./ordersCrudModules/labPresetsHandlers.js";
