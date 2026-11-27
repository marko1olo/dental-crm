/**
 * apps/api/src/routes/sanpin/wasteAndBiohazardRoutes.ts
 * Тонкий фасад роутов учета медотходов и журнала аварийных ситуаций.
 * Мандат 8b: строго <= 120 строк (фасад <= 45 строк).
 */

import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import {
	handleGetEmergencyBiohazard,
	handlePostEmergencyBiohazard,
} from "./wasteModules/emergencyBiohazardHandlers.js";
import {
	handleGetMedicalWaste,
	handlePostMedicalWaste,
} from "./wasteModules/medicalWasteCrudHandlers.js";
import { handlePostMedicalWasteQuickShiftBundle } from "./wasteModules/medicalWasteQuickShiftHandler.js";

const sanpinMutationSchema = {
	description:
		"SanPiN medical waste & biohazard mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
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

export function registerSanpinWasteAndBiohazardRoutes(app: FastifyInstance) {
	// 1. Медицинские отходы классов А и Б
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/registers/medical-waste",
		permission: "public",
		handler: async ({ request, reply }) => handleGetMedicalWaste(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/medical-waste",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handlePostMedicalWaste(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/medical-waste/quick-shift-bundle",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handlePostMedicalWasteQuickShiftBundle(request, reply),
	});

	// 2. Журнал аварийных ситуаций («Анти-ВИЧ»)
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/registers/emergency-biohazard",
		permission: "public",
		handler: async ({ request, reply }) => handleGetEmergencyBiohazard(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/emergency-biohazard",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handlePostEmergencyBiohazard(request, reply),
	});
}
