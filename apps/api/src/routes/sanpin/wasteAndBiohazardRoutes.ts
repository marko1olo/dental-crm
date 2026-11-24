/**
 * apps/api/src/routes/sanpin/wasteAndBiohazardRoutes.ts
 * Тонкий фасад роутов учета медотходов и журнала аварийных ситуаций.
 * Мандат 8b: строго <= 120 строк (фасад <= 45 строк).
 */

import type { FastifyInstance } from "fastify";
import {
	handleGetEmergencyBiohazard,
	handlePostEmergencyBiohazard,
} from "./wasteModules/emergencyBiohazardHandlers.js";
import {
	handleGetMedicalWaste,
	handlePostMedicalWaste,
} from "./wasteModules/medicalWasteCrudHandlers.js";
import { handlePostMedicalWasteQuickShiftBundle } from "./wasteModules/medicalWasteQuickShiftHandler.js";

const sanpinMutationOptions = {
	schema: {
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
	},
};

export function registerSanpinWasteAndBiohazardRoutes(app: FastifyInstance) {
	// 1. Медицинские отходы классов А и Б
	app.get("/api/registers/medical-waste", handleGetMedicalWaste);
	app.post("/api/registers/medical-waste", sanpinMutationOptions, handlePostMedicalWaste);
	app.post("/api/registers/medical-waste/quick-shift-bundle", sanpinMutationOptions, handlePostMedicalWasteQuickShiftBundle);

	// 2. Журнал аварийных ситуаций («Анти-ВИЧ»)
	app.get("/api/registers/emergency-biohazard", handleGetEmergencyBiohazard);
	app.post("/api/registers/emergency-biohazard", sanpinMutationOptions, handlePostEmergencyBiohazard);
}
