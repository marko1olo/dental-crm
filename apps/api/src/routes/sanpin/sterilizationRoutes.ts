/**
 * apps/api/src/routes/sanpin/sterilizationRoutes.ts
 *
 * Канонический SSOT маршрутизатор стерилизации и автоклавирования
 * (СанПиН 2.1.3678-20, СанПиН 3.3686-21, Форма № 257/у, Форма № 366/у).
 *
 * Консолидирует все маршруты стерилизации под единым авторитетом:
 * Канонический базовый путь: /api/sanpin/sterilization
 *
 * Пакетная обработка большими батчами (15, 30, 50 лотков/пакетов на смену),
 * 1-клик норма для автоклава и ПСО, автоматическое списание расходников со склада.
 */

import type { FastifyInstance } from "fastify";
import {
	handleCreateDailyTest,
	handleCreatePsoTest,
	handleCreateSanpinCycle,
	handleCreateSterilizationLog,
	handleGetDailyTests,
	handleGetPsoTests,
	handleGetSanpinCycles,
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

const STERILIZATION_ROUTES_GUARD = Symbol.for("dente.sterilization_routes_guard");

export function registerSanpinSterilizationRoutes(app: FastifyInstance): void {
	if ((app as any)[STERILIZATION_ROUTES_GUARD]) {
		return;
	}
	(app as any)[STERILIZATION_ROUTES_GUARD] = true;

	// ─────────────────────────────────────────────────────────────────────────
	// 1. КАНОНИЧЕСКИЙ РОУТ /api/sanpin/sterilization (SSOT)
	// ─────────────────────────────────────────────────────────────────────────

	// Журнал работы стерилизаторов (Форма 257/у)
	app.get("/api/sanpin/sterilization", handleGetSterilizationLogs);
	app.post("/api/sanpin/sterilization", handleCreateSterilizationLog);

	// Канонический алиас циклов автоклавирования: /api/sanpin/sterilization-cycles
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

	// Сканирование крафт-пакетов
	app.post("/api/sanpin/sterilization/scan", handleScanSterilization);

	// Привязка лотка к визиту 043/у
	app.post("/api/sanpin/sterilization/link", handleSterilizationLink);

	// Генерация штрихкодов трассируемости и вскрытие крафт-пакетов
	app.post("/api/sanpin/sterilization/generate-barcode", handleGenerateBarcode);
	app.post("/api/sanpin/sterilization/unseal", handleUnsealKraftPackage);

	// Парк стерилизаторов и автоклавов (оборудование ЦСО)
	app.get("/api/sanpin/sterilization/equipments", handleGetSterilizerEquipments);
	app.post("/api/sanpin/sterilization/equipments", handleCreateSterilizerEquipment);
	app.put("/api/sanpin/sterilization/equipments/:id", handleUpdateSterilizerEquipment);
	app.delete("/api/sanpin/sterilization/equipments/:id", handleDeleteSterilizerEquipment);

	// ─────────────────────────────────────────────────────────────────────────
	// 2. ОБРАТНАЯ СОВМЕСТИМОСТЬ И АЛИАСЫ (ZERO BREAKING CHANGES)
	// ─────────────────────────────────────────────────────────────────────────

	// Старые роуты Формы 257/у
	app.get("/api/registers/sterilization", handleGetSterilizationLogs);
	app.post("/api/registers/sterilization", handleCreateSterilizationLog);
	app.get("/api/sterilization/logs", handleGetSterilizationLogs);
	app.get("/api/sanpin/cycles", handleGetSanpinCycles);
	app.post("/api/sanpin/cycles", handleCreateSanpinCycle);
	app.post("/api/registers/sterilization/shift-batch", handleSterilizationShiftBatch);

	// 1-клик нормы
	app.post("/api/sterilization/quick-norm", handleQuickNormCycle);
	app.post("/api/sanpin/sterilization/quick-norm-cycle", handleQuickNormCycle);
	app.post("/api/registers/sterilization/quick-norm", handleQuickNormCycle);

	// Сканирование и привязка к 043/у
	app.post("/api/sterilization/scan", handleScanSterilization);
	app.post("/api/sterilization/link", handleSterilizationLink);
	app.post("/api/sterilization/generate-barcode", handleGenerateBarcode);
	app.post("/api/sterilization/unseal", handleUnsealKraftPackage);

	// ПСО контроль
	app.get("/api/sterilization/pso-tests", handleGetPsoTests);
	app.post("/api/sterilization/pso-tests", handleCreatePsoTest);
	app.post("/api/sterilization/pso/quick-norm", handlePsoQuickNorm);
	app.post("/api/sanpin/sterilization/pso-quick-norm", handlePsoQuickNorm);

	// Ежедневные тесты
	app.get("/api/sterilization/daily-tests", handleGetDailyTests);
	app.post("/api/sterilization/daily-tests", handleCreateDailyTest);

	// Оборудование
	app.get("/api/registers/sterilizers/equipments", handleGetSterilizerEquipments);
	app.post("/api/registers/sterilizers/equipments", handleCreateSterilizerEquipment);
	app.put("/api/registers/sterilizers/equipments/:id", handleUpdateSterilizerEquipment);
	app.delete("/api/registers/sterilizers/equipments/:id", handleDeleteSterilizerEquipment);

	app.get("/api/registers/sterilizer/equipments", handleGetSterilizerEquipments);
	app.post("/api/registers/sterilizer/equipments", handleCreateSterilizerEquipment);
	app.put("/api/registers/sterilizer/equipments/:id", handleUpdateSterilizerEquipment);
	app.delete("/api/registers/sterilizer/equipments/:id", handleDeleteSterilizerEquipment);
}

export const registerSterilizationRoutes = registerSanpinSterilizationRoutes;

export * from "./sterilizationModules/sterilizationSchemas.js";
export * from "./sterilizationModules/sterilizationCycleEngine.js";
export * from "./sterilizationModules/sterilizationLogHandlers.js";
export * from "./sterilizationModules/sterilizerEquipmentHandlers.js";
export * from "./sterilizationModules/sterilizationKraftHandlers.js";
export * from "./sterilizationModules/sterilizationHelpers.js";
export * from "./sterilizationModules/sterilizationStockDeduction.js";
