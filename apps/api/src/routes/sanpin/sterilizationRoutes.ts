/**
 * apps/api/src/routes/sanpin/sterilizationRoutes.ts
 *
 * Канонический SSOT маршрутизатор стерилизации и автоклавирования.
 * Базовый путь: /api/sanpin/sterilization
 * Пакетная обработка сменами в 1 клик, списание со склада.
 * Мандат 8b: строго <= 120 строк.
 */

import type { FastifyInstance } from "fastify";
import {
	handleGenerateBarcode,
	handleSterilizationLink,
	handleUnsealKraftPackage,
} from "./sterilizationModules/sterilizationKraftHandlers.js";
import { registerSterilizationLegacyRoutes } from "./sterilizationModules/sterilizationLegacyRoutes.js";
import {
	handleCreateDailyTest,
	handleCreatePsoTest,
	handleCreateSterilizationLog,
	handleGetDailyTests,
	handleGetPsoTests,
	handleGetSterilizationLogs,
	handlePsoQuickNorm,
	handleQuickNormCycle,
	handleScanSterilization,
	handleSterilizationShiftBatch,
} from "./sterilizationModules/sterilizationLogHandlers.js";
import {
	handleCreateSterilizerEquipment,
	handleDeleteSterilizerEquipment,
	handleGetSterilizerEquipments,
	handleUpdateSterilizerEquipment,
} from "./sterilizationModules/sterilizerEquipmentHandlers.js";

const STERILIZATION_ROUTES_GUARD = Symbol.for(
	"dente.sterilization_routes_guard",
);

export function registerSanpinSterilizationRoutes(app: FastifyInstance): void {
	const appStore = app as unknown as Record<symbol, boolean>;
	if (appStore[STERILIZATION_ROUTES_GUARD]) {
		return;
	}
	appStore[STERILIZATION_ROUTES_GUARD] = true;

	// Журнал работы стерилизаторов
	app.get("/api/sanpin/sterilization", handleGetSterilizationLogs);
	app.post("/api/sanpin/sterilization", handleCreateSterilizationLog);
	app.get("/api/sanpin/autoclave/cycles", handleGetSterilizationLogs);
	app.post("/api/sanpin/autoclave/cycles", handleCreateSterilizationLog);
	app.get("/api/sterilization/cycles", handleGetSterilizationLogs);
	app.post("/api/sterilization/cycles", handleCreateSterilizationLog);
	app.get("/api/sanpin/sterilization/cycles", handleGetSterilizationLogs);
	app.post("/api/sanpin/sterilization/cycles", handleCreateSterilizationLog);

	// 1-клик запуск партии автоклава (134°C / 2.15 бар или 121°C / 1.15 бар) — канонический роут и алиасы
	app.post("/api/sanpin/sterilization/quick-norm", handleQuickNormCycle);
	app.post("/api/sanpin/sterilization/quick-norm-cycle", handleQuickNormCycle);
	app.post("/api/sanpin/sterilization-cycles/quick-norm", handleQuickNormCycle);
	app.post("/api/sanpin/sterilization-cycles/quick-norm-cycle", handleQuickNormCycle);
	app.post("/api/sanpin/sterilization-cycles/shift-batch", handleSterilizationShiftBatch);
	app.post("/api/sanpin/sterilization-cycles/batch", handleSterilizationShiftBatch);
	app.post("/api/sanpin/sterilization/shift-batch", handleSterilizationShiftBatch);

	// Контроль качества предстерилизационной очистки (ПСО)
	app.get("/api/sanpin/sterilization/pso-tests", handleGetPsoTests);
	app.post("/api/sanpin/sterilization/pso-tests", handleCreatePsoTest);
	app.post("/api/sanpin/sterilization/pso/quick-norm", handlePsoQuickNorm);

	// Ежедневный контроль автоклавов (Bowie-Dick, Вакуум-тест)
	app.get("/api/sanpin/sterilization/daily-tests", handleGetDailyTests);
	app.post("/api/sanpin/sterilization/daily-tests", handleCreateDailyTest);

	// Сканирование крафт-пакетов и привязка к визиту
	app.post("/api/sanpin/sterilization/scan", handleScanSterilization);
	app.post("/api/sanpin/sterilization/link", handleSterilizationLink);
	app.post("/api/sanpin/sterilization/generate-barcode", handleGenerateBarcode);
	app.post("/api/sanpin/sterilization/unseal", handleUnsealKraftPackage);

	// Парк стерилизаторов и автоклавов (оборудование ЦСО)
	app.get(
		"/api/sanpin/sterilization/equipments",
		handleGetSterilizerEquipments,
	);
	app.post(
		"/api/sanpin/sterilization/equipments",
		handleCreateSterilizerEquipment,
	);
	app.put(
		"/api/sanpin/sterilization/equipments/:id",
		handleUpdateSterilizerEquipment,
	);
	app.delete(
		"/api/sanpin/sterilization/equipments/:id",
		handleDeleteSterilizerEquipment,
	);

	// Обратная совместимость и алиасы
	registerSterilizationLegacyRoutes(app);
}

export const registerSterilizationRoutes = registerSanpinSterilizationRoutes;

export * from "./sterilizationModules/sterilizationCycleEngine.js";
export * from "./sterilizationModules/sterilizationHelpers.js";
export * from "./sterilizationModules/sterilizationKraftHandlers.js";
export * from "./sterilizationModules/sterilizationLegacyRoutes.js";
export * from "./sterilizationModules/sterilizationLogHandlers.js";
export * from "./sterilizationModules/sterilizationSchemas.js";
export * from "./sterilizationModules/sterilizationStockDeduction.js";
export * from "./sterilizationModules/sterilizerEquipmentHandlers.js";
