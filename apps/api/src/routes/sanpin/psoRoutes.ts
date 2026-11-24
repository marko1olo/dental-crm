/**
 * apps/api/src/routes/sanpin/psoRoutes.ts
 * Тонкий фасад роутов предстерилизационной очистки.
 * Мандат 8b: строго <= 120 строк (фасад <= 45 строк).
 */

import type { FastifyInstance } from "fastify";
import {
	handleDeletePso,
	handleGetPso,
	handlePostPso,
} from "./psoModules/psoCrudHandlers.js";
import { handlePostPsoQuickNorm } from "./psoModules/psoQuickNormHandler.js";

const sanpinMutationOptions = {
	schema: {
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
	},
};

export function registerSanpinPsoRoutes(app: FastifyInstance) {
	// 1. Журнал предстерилизационной очистки
	app.get("/api/registers/pso", handleGetPso);
	app.post("/api/registers/pso", sanpinMutationOptions, handlePostPso);
	app.delete<{ Params: { id: string } }>("/api/registers/pso/:id", sanpinMutationOptions, handleDeletePso);

	// 2. 1-клик фиксация нормы (азопирам + фенолфталеин)
	app.post("/api/registers/pso/quick-norm", sanpinMutationOptions, handlePostPsoQuickNorm);
}
