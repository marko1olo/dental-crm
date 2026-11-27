/**
 * apps/api/src/routes/sanpin/psoRoutes.ts
 * Тонкий фасад роутов предстерилизационной очистки.
 * Мандат 8b: строго <= 120 строк (фасад <= 45 строк).
 */

import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import {
	handleDeletePso,
	handleGetPso,
	handlePostPso,
} from "./psoModules/psoCrudHandlers.js";
import { handlePostPsoQuickNorm } from "./psoModules/psoQuickNormHandler.js";

const sanpinMutationSchema = {
	description:
		"SanPiN PSO mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
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

export function registerSanpinPsoRoutes(app: FastifyInstance) {
	// 1. Журнал предстерилизационной очистки
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/registers/pso",
		permission: "public",
		handler: async ({ request, reply }) => handleGetPso(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/pso",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handlePostPso(request, reply),
	});
	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/registers/pso/:id",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleDeletePso(request, reply),
	});

	// 2. Пакетная фиксация нормы (азопирам + фенолфталеин)
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/pso/quick-norm",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handlePostPsoQuickNorm(request, reply),
	});
}
