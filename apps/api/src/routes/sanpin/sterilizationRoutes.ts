/**
 * apps/api/src/routes/sanpin/sterilizationRoutes.ts
 *
 * Канонический SSOT маршрутизатор стерилизации и автоклавирования
 * (СанПиН 2.1.3678-20, СанПиН 3.3686-21, Форма № 257/у, Форма № 366/у).
 * Базовый путь: /api/sanpin/sterilization
 * Пакетная обработка сменами в 1 клик, списание со склада.
 * Мандат 8b: строго <= 120 строк.
 */

import type { FastifyInstance } from "fastify";
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
	handleGenerateBarcode,
	handleSterilizationLink,
	handleUnsealKraftPackage,
} from "./sterilizationModules/sterilizationKraftHandlers.js";
import {
	handleCreateSterilizerEquipment,
	handleDeleteSterilizerEquipment,
	handleGetSterilizerEquipments,
	handleUpdateSterilizerEquipment,
} from "./sterilizationModules/sterilizerEquipmentHandlers.js";
import { registerSterilizationLegacyRoutes } from "./sterilizationModules/sterilizationLegacyRoutes.js";

const STERILIZATION_ROUTES_GUARD = Symbol.for("dente.sterilization_routes_guard");

export function registerSanpinSterilizationRoutes(app: FastifyInstance): void {
	if ((app as any)[STERILIZATION_ROUTES_GUARD]) {
		return;
	}
	(app as any)[STERILIZATION_ROUTES_GUARD] = true;

	// Журнал работы стерилизаторов (Форма 257/у)
	app.get("/api/sanpin/sterilization", handleGetSterilizationLogs);
	app.post("/api/sanpin/sterilization", handleCreateSterilizationLog);

	// Алиасы циклов автоклавирования
	app.get("/api/sanpin/sterilization-cycles", handleGetSterilizationLogs);
	app.post("/api/sanpin/sterilization-cycles", handleCreateSterilizationLog);
	app.post("/api/sanpin/sterilization-cycles/quick-norm", handleQuickNormCycle);
	app.post("/api/sanpin/sterilization-cycles/shift-batch", handleSterilizationShiftBatch);
	app.post("/api/sanpin/sterilization-cycles/batch", handleSterilizationShiftBatch);

	// 1-клик запуск партии автоклава (134°C / 2.15 бар или 121°C / 1.15 бар)
	app.post("/api/sanpin/sterilization/quick-norm", handleQuickNormCycle);

	// 1-клик пакетная регистрация циклов смены
	app.post("/api/sanpin/sterilization/shift-batch", handleSterilizationShiftBatch);

	// Контроль качества предстерилизационной очистки (ПСО, Форма 366/у)
	app.get("/api/sanpin/sterilization/pso-tests", handleGetPsoTests);
	app.post("/api/sanpin/sterilization/pso-tests", handleCreatePsoTest);
	app.post("/api/sanpin/sterilization/pso/quick-norm", handlePsoQuickNorm);

	// Ежедневный контроль автоклавов (Bowie-Dick, Вакуум-тест)
	app.get("/api/sanpin/sterilization/daily-tests", handleGetDailyTests);
	app.post("/api/sanpin/sterilization/daily-tests", handleCreateDailyTest);

	// Сканирование крафт-пакетов и привязка к визиту 043/у
	app.post("/api/sanpin/sterilization/scan", handleScanSterilization);
	app.post("/api/sanpin/sterilization/link", handleSterilizationLink);
	app.post("/api/sanpin/sterilization/generate-barcode", handleGenerateBarcode);
	app.post("/api/sanpin/sterilization/unseal", handleUnsealKraftPackage);

	// Парк стерилизаторов и автоклавов (оборудование ЦСО)
	app.get("/api/sanpin/sterilization/equipments", handleGetSterilizerEquipments);
	app.post("/api/sanpin/sterilization/equipments", handleCreateSterilizerEquipment);
	app.put("/api/sanpin/sterilization/equipments/:id", handleUpdateSterilizerEquipment);
	app.delete("/api/sanpin/sterilization/equipments/:id", handleDeleteSterilizerEquipment);

	// Обратная совместимость и алиасы
	registerSterilizationLegacyRoutes(app);
}

export const registerSterilizationRoutes = registerSanpinSterilizationRoutes;

export * from "./sterilizationModules/sterilizationSchemas.js";
export * from "./sterilizationModules/sterilizationCycleEngine.js";
export * from "./sterilizationModules/sterilizationLogHandlers.js";
export * from "./sterilizationModules/sterilizerEquipmentHandlers.js";
export * from "./sterilizationModules/sterilizationKraftHandlers.js";
export * from "./sterilizationModules/sterilizationHelpers.js";
export * from "./sterilizationModules/sterilizationStockDeduction.js";
export * from "./sterilizationModules/sterilizationLegacyRoutes.js";
