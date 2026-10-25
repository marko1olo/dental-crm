/**
 * apps/api/src/routes/sanpin/wasteAndBiohazardRoutes.ts
 * Тонкий фасад роутов учета медотходов и журнала аварийных ситуаций.
 * Мандат 8b: строго <= 120 строк (фасад <= 35 строк).
 */

import type { FastifyInstance } from "fastify";
import {
	handleGetEmergencyBiohazard,
	handlePostEmergencyBiohazard,
} from "./wasteModules/emergencyBiohazardHandlers.js";
import {
	handleGetMedicalWaste,
	handlePostMedicalWaste,
	handlePostMedicalWasteQuickShiftBundle,
} from "./wasteModules/medicalWasteHandlers.js";

export function registerSanpinWasteAndBiohazardRoutes(app: FastifyInstance) {
	// 1. Медицинские отходы классов А и Б
	app.get("/api/registers/medical-waste", handleGetMedicalWaste);
	app.post("/api/registers/medical-waste", handlePostMedicalWaste);
	app.post("/api/registers/medical-waste/quick-shift-bundle", handlePostMedicalWasteQuickShiftBundle);

	// 2. Журнал аварийных ситуаций («Анти-ВИЧ»)
	app.get("/api/registers/emergency-biohazard", handleGetEmergencyBiohazard);
	app.post("/api/registers/emergency-biohazard", handlePostEmergencyBiohazard);
}
