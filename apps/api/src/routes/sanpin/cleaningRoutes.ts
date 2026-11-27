/**
 * apps/api/src/routes/sanpin/cleaningRoutes.ts
 * Тонкий фасад роутов генеральных уборок и дезинфекции.
 * Мандат 8b: строго <= 120 строк (фасад <= 45 строк).
 */

import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { handlePostCleaningAutopilotMonth } from "./cleaningModules/cleaningAutopilotHandler.js";
import {
	handleGetCleaning,
	handlePostCleaning,
	handleVerifyCleaning,
} from "./cleaningModules/cleaningCrudHandlers.js";

const sanpinMutationSchema = {
	description:
		"SanPiN cleaning & disinfection mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
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

export function registerSanpinCleaningRoutes(app: FastifyInstance) {
	// 1. Журнал генеральных уборок и дезинфекции
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/registers/cleaning",
		permission: "public",
		handler: async ({ request, reply }) => handleGetCleaning(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/cleaning",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handlePostCleaning(request, reply),
	});
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/registers/cleaning/:id/verify",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleVerifyCleaning(request, reply),
	});

	// 2. Месячный график генеральных уборок (пакетное формирование)
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/cleaning/autopilot-month",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handlePostCleaningAutopilotMonth(request, reply),
	});
}
