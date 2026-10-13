/**
 * @file sterilizationRoutes.ts
 * @description Canonical SSOT route facade for SanPiN 3.3686-21 Form 257/y
 * Sterilization Logs, Class B Autoclave Cycles, Kraft Pouches & Barcodes,
 * and Sterilizer Equipment Fleet.
 */

import type { FastifyInstance } from "fastify";
import {
	handleCreateSanpinCycle,
	handleCreateSterilizationLog,
	handleGetSanpinCycles,
	handleGetSterilizationLogs,
	handleSterilizationShiftBatch,
} from "./sterilizationModules/sterilizationLogHandlers.js";
import {
	handleCreateSterilizerEquipment,
	handleDeleteSterilizerEquipment,
	handleGetSterilizerEquipments,
	handleUpdateSterilizerEquipment,
} from "./sterilizationModules/sterilizerEquipmentHandlers.js";
import { registerSterilizationLogRoutes } from "../sterilizationRoutes/sterilizationLogHandlers.js";
import { registerSterilizationKraftRoutes } from "../sterilizationRoutes/sterilizationKraftHandlers.js";

const STERILIZATION_ROUTES_GUARD = Symbol.for("dente.sterilization_routes_guard");

export function registerSanpinSterilizationRoutes(app: FastifyInstance): void {
	if ((app as any)[STERILIZATION_ROUTES_GUARD]) {
		return;
	}
	(app as any)[STERILIZATION_ROUTES_GUARD] = true;

	// ─────────────────────────────────────────────────────────────────────────
	// ЖУРНАЛ СТЕРИЛИЗАТОРОВ (ФОРМА № 257/у / СанПиН 3.3686-21)
	// ─────────────────────────────────────────────────────────────────────────

	// Журнал учёта стерилизации (единый обработчик для обоих путей)
	app.get("/api/registers/sterilization", handleGetSterilizationLogs);
	app.get("/api/sterilization/logs", handleGetSterilizationLogs);
	app.post("/api/registers/sterilization", handleCreateSterilizationLog);

	// Канонический роут циклов автоклава
	app.get("/api/sanpin/cycles", handleGetSanpinCycles);
	app.post("/api/sanpin/cycles", handleCreateSanpinCycle);

	// 1-клик пакетная регистрация циклов стерилизации смены
	app.post("/api/registers/sterilization/shift-batch", handleSterilizationShiftBatch);

	// Парк стерилизаторов и автоклавов (оборудование ЦСО) - канонический путь и алиас
	const equipmentEndpoints = [
		"/api/registers/sterilizers/equipments",
		"/api/registers/sterilizer/equipments",
	];
	for (const endpoint of equipmentEndpoints) {
		app.get(endpoint, handleGetSterilizerEquipments);
		app.post(endpoint, handleCreateSterilizerEquipment);
		app.put(`${endpoint}/:id`, handleUpdateSterilizerEquipment);
		app.delete(`${endpoint}/:id`, handleDeleteSterilizerEquipment);
	}

	// Сканирование, ежедневные тесты автоклавов и ПСО
	registerSterilizationLogRoutes(app);

	// Трассируемость крафт-пакетов (привязка к визиту 043/у, вскрытие, генерация штрихкодов)
	registerSterilizationKraftRoutes(app);
}

export * from "./sterilizationModules/sterilizationSchemas.js";
export * from "./sterilizationModules/sterilizationCycleEngine.js";
export * from "./sterilizationModules/sterilizationLogHandlers.js";
export * from "./sterilizationModules/sterilizerEquipmentHandlers.js";
