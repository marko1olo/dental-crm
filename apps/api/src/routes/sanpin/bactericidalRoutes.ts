/**
 * @file bactericidalRoutes.ts
 * @description Canonical thin route facade for SanPiN 3.3686-21 and R 3.5.1904-04
 * Bactericidal Irradiators & Recirculators Equipment and Logs.
 * Decomposed into apps/api/src/routes/sanpin/bactericidalModules/ per Mandate 8b / /decomposer.
 */

import type { FastifyInstance } from "fastify";
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

export function registerSanpinBactericidalRoutes(app: FastifyInstance): void {
	// ─────────────────────────────────────────────────────────────────────────
	// ЖУРНАЛ РЕЦИРКУЛЯТОРОВ И ОБЛУЧАТЕЛЕЙ (Р 3.5.1904-04 / СанПиН 3.3686-21)
	// ─────────────────────────────────────────────────────────────────────────

	// Парк оборудования (облучатели и рециркуляторы)
	app.get("/api/registers/bactericidal/equipments", handleGetBactericidalEquipments);
	app.post("/api/registers/bactericidal/equipments", handleCreateBactericidalEquipment);
	app.put("/api/registers/bactericidal/equipments/:id", handleUpdateBactericidalEquipment);
	app.delete("/api/registers/bactericidal/equipments/:id", handleDeleteBactericidalEquipment);

	// Журнал учёта работы бактерицидных установок
	app.get("/api/registers/bactericidal/logs", handleGetBactericidalLogs);
	app.post("/api/registers/bactericidal/logs", handleCreateBactericidalLog);

	// Пакетные действия смены и автопилот наработки часов
	app.post("/api/registers/bactericidal/shift-autopilot", handleBactericidalShiftAutopilot);
	app.post("/api/registers/bactericidal/open-morning-shift", handleOpenMorningShift);
	app.post("/api/registers/bactericidal/close-evening-shift", handleCloseEveningShift);
}

export * from "./bactericidalModules/bactericidalSchemas.js";
export * from "./bactericidalModules/bactericidalHoursCalculator.js";
export * from "./bactericidalModules/bactericidalLogHandlers.js";
export * from "./bactericidalModules/bactericidalShiftHandlers.js";
