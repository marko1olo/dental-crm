/**
 * apps/api/src/routes/sanpin/sterilizationModules/sterilizationLegacyRoutes.ts
 *
 * Маршруты обратной совместимости для домена стерилизации и автоклавирования
 * (Мандат 8b: строго <= 120 строк).
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
} from "./sterilizationLogHandlers.js";
import {
	handleGenerateBarcode,
	handleSterilizationLink,
	handleUnsealKraftPackage,
} from "./sterilizationKraftHandlers.js";
import {
	handleCreateSterilizerEquipment,
	handleDeleteSterilizerEquipment,
	handleGetSterilizerEquipments,
	handleUpdateSterilizerEquipment,
} from "./sterilizerEquipmentHandlers.js";

export function registerSterilizationLegacyRoutes(app: FastifyInstance): void {
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
