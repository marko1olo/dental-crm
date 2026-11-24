/**
 * apps/api/src/routes/sanpin/cleaningRoutes.ts
 * Тонкий фасад роутов генеральных уборок и дезинфекции.
 * Мандат 8b: строго <= 120 строк (фасад <= 45 строк).
 */

import type { FastifyInstance } from "fastify";
import { handlePostCleaningAutopilotMonth } from "./cleaningModules/cleaningAutopilotHandler.js";
import {
	handleGetCleaning,
	handlePostCleaning,
	handleVerifyCleaning,
} from "./cleaningModules/cleaningCrudHandlers.js";

const sanpinMutationOptions = {
	schema: {
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
	},
};

export function registerSanpinCleaningRoutes(app: FastifyInstance) {
	// 1. Журнал генеральных уборок и дезинфекции
	app.get("/api/registers/cleaning", handleGetCleaning);
	app.post("/api/registers/cleaning", sanpinMutationOptions, handlePostCleaning);
	app.put<{ Params: { id: string } }>("/api/registers/cleaning/:id/verify", sanpinMutationOptions, handleVerifyCleaning);

	// 2. Месячный график генеральных уборок в 1 клик
	app.post("/api/registers/cleaning/autopilot-month", sanpinMutationOptions, handlePostCleaningAutopilotMonth);
}
