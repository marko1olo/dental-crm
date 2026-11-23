import type { FastifyInstance } from "fastify";
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
	app.get("/api/clinical/lab-orders", getLabOrdersHandler);
	app.get("/api/lab/orders", getLabOrdersHandler);

	// POST: Create lab order (канонический эндпоинт + экспресс-алиас)
	// Контекст: withTenantCtx (organizationId), Idempotency-Key (UUIDv7, RFC 9562)
	app.post("/api/clinical/lab-orders", {
		schema: {
			headers: {
				type: "object",
				description: "Создание наряда ЗТЛ с изоляцией организации (organizationId) и заголовком Idempotency-Key",
			},
		},
	}, createLabOrderHandler);
	app.post("/api/lab/orders", {
		schema: {
			headers: {
				type: "object",
				description: "Создание наряда ЗТЛ с изоляцией организации (organizationId) и заголовком Idempotency-Key",
			},
		},
	}, createLabOrderHandler);
	app.post("/api/clinical/dental-lab/express-order", {
		schema: {
			headers: {
				type: "object",
				description: "Экспресс-создание наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, createLabOrderHandler);

	// GET & POST: Presets & Plan continuity
	app.get("/api/clinical/dental-lab/presets", handleGetExpressPresets);
	app.post("/api/clinical/dental-lab/check-plan-continuity", {
		schema: {
			headers: {
				type: "object",
				description: "Проверка непрерывности плана лечения с изоляцией организации (organizationId) и Idempotency-Key",
			},
		},
	}, handleCheckPlanContinuity);

	// PUT: Update lab order & status transitions
	// Контекст: withTenantCtx (organizationId), атомарная транзакция db.transaction (tx), Idempotency-Key
	app.put("/api/clinical/lab-orders/:id", {
		schema: {
			headers: {
				type: "object",
				description: "Обновление наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, putLabOrderHandler);
	app.put("/api/lab/orders/:id", {
		schema: {
			headers: {
				type: "object",
				description: "Обновление наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, putLabOrderHandler);

	// DELETE: Remove draft or cancelled order
	// Контекст: withTenantCtx (organizationId), каскадная db.transaction (tx) очистка items/events, Idempotency-Key
	app.delete("/api/clinical/lab-orders/:id", {
		schema: {
			headers: {
				type: "object",
				description: "Удаление черновика наряда ЗТЛ с каскадной очисткой в db.transaction, проверкой organizationId и Idempotency-Key",
			},
		},
	}, deleteLabOrderHandler);
	app.delete("/api/lab/orders/:id", {
		schema: {
			headers: {
				type: "object",
				description: "Удаление черновика наряда ЗТЛ с каскадной очисткой в db.transaction, проверкой organizationId и Idempotency-Key",
			},
		},
	}, deleteLabOrderHandler);
}

// Re-exports from decomposed modules
export * from "./ordersCrudModules/labOrderValidationSchemas.js";
export * from "./ordersCrudModules/labOrderCostCalculator.js";
export * from "./ordersCrudModules/labOrderDbOperations.js";
export * from "./ordersCrudModules/labOrderHandlers.js";
export * from "./ordersCrudModules/labPresetsHandlers.js";
