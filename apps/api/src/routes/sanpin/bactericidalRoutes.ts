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

const bactericidalMutationOptions = {
	schema: {
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
	},
};

export function registerSanpinBactericidalRoutes(app: FastifyInstance): void {
	// ─────────────────────────────────────────────────────────────────────────
	// ЖУРНАЛ РЕЦИРКУЛЯТОРОВ И ОБЛУЧАТЕЛЕЙ (Р 3.5.1904-04 / СанПиН 3.3686-21)
	// ─────────────────────────────────────────────────────────────────────────

	// Парк оборудования (облучатели и рециркуляторы)
	app.get("/api/registers/bactericidal/equipments", handleGetBactericidalEquipments);
	app.post("/api/registers/bactericidal/equipments", bactericidalMutationOptions, handleCreateBactericidalEquipment);
	app.put("/api/registers/bactericidal/equipments/:id", bactericidalMutationOptions, handleUpdateBactericidalEquipment);
	app.delete("/api/registers/bactericidal/equipments/:id", bactericidalMutationOptions, handleDeleteBactericidalEquipment);

	// Журнал учёта работы бактерицидных установок
	app.get("/api/registers/bactericidal/logs", handleGetBactericidalLogs);
	app.post("/api/registers/bactericidal/logs", bactericidalMutationOptions, handleCreateBactericidalLog);

	// Пакетные действия смены и автопилот наработки часов
	app.post("/api/registers/bactericidal/shift-autopilot", bactericidalMutationOptions, handleBactericidalShiftAutopilot);
	app.post("/api/registers/bactericidal/open-morning-shift", bactericidalMutationOptions, handleOpenMorningShift);
	app.post("/api/registers/bactericidal/close-evening-shift", bactericidalMutationOptions, handleCloseEveningShift);
}

export * from "./bactericidalModules/bactericidalSchemas.js";
export * from "./bactericidalModules/bactericidalHoursCalculator.js";
export * from "./bactericidalModules/bactericidalLogHandlers.js";
export * from "./bactericidalModules/bactericidalShiftHandlers.js";
