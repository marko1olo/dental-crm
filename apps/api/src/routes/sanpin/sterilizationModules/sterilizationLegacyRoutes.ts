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

const sanpinMutationOptions = {
	schema: {
		description:
			"SanPiN sterilization mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
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

export function registerSterilizationLegacyRoutes(app: FastifyInstance): void {
	// Устаревшие эндпоинты журнала автоклавирования
	app.get("/api/registers/sterilization", handleGetSterilizationLogs);
	app.post("/api/registers/sterilization", sanpinMutationOptions, handleCreateSterilizationLog);
	app.get("/api/sterilization/logs", handleGetSterilizationLogs);
	app.get("/api/sanpin/cycles", handleGetSanpinCycles);
	app.post("/api/sanpin/cycles", sanpinMutationOptions, handleCreateSanpinCycle);
	app.post("/api/registers/sterilization/shift-batch", sanpinMutationOptions, handleSterilizationShiftBatch);

	// 1-клик нормы
	app.post("/api/sterilization/quick-norm", sanpinMutationOptions, handleQuickNormCycle);
	app.post("/api/registers/sterilization/quick-norm", sanpinMutationOptions, handleQuickNormCycle);

	// Сканирование и привязка к медицинской карте приёма
	app.post("/api/sterilization/scan", sanpinMutationOptions, handleScanSterilization);
	app.post("/api/sterilization/link", sanpinMutationOptions, handleSterilizationLink);
	app.post("/api/sterilization/generate-barcode", sanpinMutationOptions, handleGenerateBarcode);
	app.post("/api/sterilization/unseal", sanpinMutationOptions, handleUnsealKraftPackage);

	// Контроль очистки инструментов
	app.get("/api/sterilization/pso-tests", handleGetPsoTests);
	app.post("/api/sterilization/pso-tests", sanpinMutationOptions, handleCreatePsoTest);
	app.post("/api/sterilization/pso/quick-norm", sanpinMutationOptions, handlePsoQuickNorm);
	app.post("/api/sanpin/sterilization/pso-quick-norm", sanpinMutationOptions, handlePsoQuickNorm);

	// Ежедневные тесты
	app.get("/api/sterilization/daily-tests", handleGetDailyTests);
	app.post("/api/sterilization/daily-tests", sanpinMutationOptions, handleCreateDailyTest);

	// Оборудование
	app.get("/api/registers/sterilizers/equipments", handleGetSterilizerEquipments);
	app.post("/api/registers/sterilizers/equipments", sanpinMutationOptions, handleCreateSterilizerEquipment);
	app.put("/api/registers/sterilizers/equipments/:id", sanpinMutationOptions, handleUpdateSterilizerEquipment);
	app.delete("/api/registers/sterilizers/equipments/:id", sanpinMutationOptions, handleDeleteSterilizerEquipment);

	app.get("/api/registers/sterilizer/equipments", handleGetSterilizerEquipments);
	app.post("/api/registers/sterilizer/equipments", sanpinMutationOptions, handleCreateSterilizerEquipment);
	app.put("/api/registers/sterilizer/equipments/:id", sanpinMutationOptions, handleUpdateSterilizerEquipment);
	app.delete("/api/registers/sterilizer/equipments/:id", sanpinMutationOptions, handleDeleteSterilizerEquipment);
}
