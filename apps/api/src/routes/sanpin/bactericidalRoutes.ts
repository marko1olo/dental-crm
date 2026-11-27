/**
 * @file bactericidalRoutes.ts
 * @description Canonical thin route facade for SanPiN 3.3686-21 and R 3.5.1904-04
 * Bactericidal Irradiators & Recirculators Equipment and Logs.
 * Decomposed into apps/api/src/routes/sanpin/bactericidalModules/ per Mandate 8b / /decomposer.
 */

import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import {
	handleCreateBactericidalEquipment,
	handleCreateBactericidalLog,
	handleDeleteBactericidalEquipment,
	handleGetBactericidalEquipments,
	handleGetBactericidalLogs,
	handleUpdateBactericidalEquipment,
} from "./bactericidalModules/bactericidalLogHandlers.js";
import {
	handleBactericidalShiftAutopilot,
	handleCloseEveningShift,
	handleOpenMorningShift,
} from "./bactericidalModules/bactericidalShiftHandlers.js";

const bactericidalMutationSchema = {
	description:
		"SanPiN bactericidal mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
	headers: {
		type: "object",
		properties: {
			"idempotency-key": { type: "string" },
			"x-idempotency-key": { type: "string" },
			"organizationid": { type: "string" },
			"x-organization-id": { type: "string" },
		},
	},
} as const;

export function registerSanpinBactericidalRoutes(app: FastifyInstance): void {
	// ─────────────────────────────────────────────────────────────────────────
	// ЖУРНАЛ РЕЦИРКУЛЯТОЛЯТОРОВ И ОБЛУЧАТЕЛЕЙ (Р 3.5.1904-04 / СанПиН 3.3686-21)
	// ─────────────────────────────────────────────────────────────────────────

	// Парк оборудования (облучатели и рециркуляторы)
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/registers/bactericidal/equipments",
		permission: "public",
		handler: async ({ request, reply }) => handleGetBactericidalEquipments(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/bactericidal/equipments",
		permission: "public",
		schema: bactericidalMutationSchema,
		handler: async ({ request, reply }) => handleCreateBactericidalEquipment(request, reply),
	});
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/registers/bactericidal/equipments/:id",
		permission: "public",
		schema: bactericidalMutationSchema,
		handler: async ({ request, reply }) => handleUpdateBactericidalEquipment(request, reply),
	});
	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/registers/bactericidal/equipments/:id",
		permission: "public",
		schema: bactericidalMutationSchema,
		handler: async ({ request, reply }) => handleDeleteBactericidalEquipment(request, reply),
	});

	// Журнал учёта работы бактерицидных установок
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/registers/bactericidal/logs",
		permission: "public",
		handler: async ({ request, reply }) => handleGetBactericidalLogs(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/bactericidal/logs",
		permission: "public",
		schema: bactericidalMutationSchema,
		handler: async ({ request, reply }) => handleCreateBactericidalLog(request, reply),
	});

	// Пакетные действия смены и автопилот наработки часов
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/bactericidal/shift-autopilot",
		permission: "public",
		schema: bactericidalMutationSchema,
		handler: async ({ request, reply }) => handleBactericidalShiftAutopilot(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/bactericidal/open-morning-shift",
		permission: "public",
		schema: bactericidalMutationSchema,
		handler: async ({ request, reply }) => handleOpenMorningShift(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/bactericidal/close-evening-shift",
		permission: "public",
		schema: bactericidalMutationSchema,
		handler: async ({ request, reply }) => handleCloseEveningShift(request, reply),
	});
}

export * from "./bactericidalModules/bactericidalSchemas.js";
export * from "./bactericidalModules/bactericidalHoursCalculator.js";
export * from "./bactericidalModules/bactericidalLogHandlers.js";
export * from "./bactericidalModules/bactericidalShiftHandlers.js";
