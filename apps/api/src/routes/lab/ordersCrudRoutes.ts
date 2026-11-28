import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import type { VerifiedPrincipal } from "../../security/unifiedAuthPerimeter.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	createLabOrderHandler,
	deleteLabOrderHandler,
	getLabOrdersHandler,
	putLabOrderHandler,
} from "./ordersCrudModules/labOrderHandlers.js";
import {
	handleGetExpressPresets,
} from "./ordersCrudModules/labPresetsHandlers.js";

/**
 * Canonical facade for Dental Lab Orders CRUD routes.
 * Decomposed under /decomposer architecture into modular sub-layers in ./ordersCrudModules/.
 */
const LAB_READ_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
} as const;

export function labClinicalPermission(
	permissionLabel:
		| "clinical.lab_order.read"
		| "clinical.lab_order.write"
		| "clinical.lab_order.passport.read",
) {
	return {
		customCheck: (
			principal: VerifiedPrincipal,
			_request: FastifyRequest,
			reply: FastifyReply,
		): boolean => {
			if (principal.authMode === "admin_secret" || principal.authMode === "clinic_token") {
				return true;
			}
			const evalAccess = evaluateClinicalAccess(principal.role, {
				clinicalRole: principal.clinicalRole,
				canSignMedicalRecords: principal.canSignMedicalRecords,
			});
			if (!evalAccess.hasClinicalAccess) {
				reply.code(403).send({
					error: "PermissionDenied",
					permission: permissionLabel,
					role: principal.role,
					message: `Отказ в доступе к ЗТЛ: ${evalAccess.reason}`,
				});
				return false;
			}
			return true;
		},
	} as const;
}

const LAB_READ_PERMISSION = labClinicalPermission("clinical.lab_order.read");
const LAB_WRITE_PERMISSION = labClinicalPermission("clinical.lab_order.write");

export async function registerOrdersCrudRoutes(app: FastifyInstance) {
	// GET: All lab orders with optional patient filtering
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/lab-orders",
		permission: LAB_READ_PERMISSION,
		authOptions: LAB_READ_AUTH,
		handler: async ({ request, reply }) => getLabOrdersHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/lab/orders",
		permission: LAB_READ_PERMISSION,
		authOptions: LAB_READ_AUTH,
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
		permission: LAB_WRITE_PERMISSION,
		authOptions: LAB_READ_AUTH,
		schema: createSchema,
		handler: async ({ request, reply }) => createLabOrderHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/lab/orders",
		permission: LAB_WRITE_PERMISSION,
		authOptions: LAB_READ_AUTH,
		schema: createSchema,
		handler: async ({ request, reply }) => createLabOrderHandler(request, reply),
	});

	// GET: Express Presets
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/dental-lab/presets",
		permission: LAB_READ_PERMISSION,
		authOptions: LAB_READ_AUTH,
		handler: async ({ request, reply }) => handleGetExpressPresets(request, reply),
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
		permission: LAB_WRITE_PERMISSION,
		authOptions: LAB_READ_AUTH,
		schema: updateSchema,
		handler: async ({ request, reply }) => putLabOrderHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/lab/orders/:id",
		permission: LAB_WRITE_PERMISSION,
		authOptions: LAB_READ_AUTH,
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
		permission: LAB_WRITE_PERMISSION,
		authOptions: LAB_READ_AUTH,
		schema: deleteSchema,
		handler: async ({ request, reply }) => deleteLabOrderHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/lab/orders/:id",
		permission: LAB_WRITE_PERMISSION,
		authOptions: LAB_READ_AUTH,
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
