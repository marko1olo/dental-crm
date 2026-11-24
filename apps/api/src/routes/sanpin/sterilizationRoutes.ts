/**
 * apps/api/src/routes/sanpin/sterilizationRoutes.ts
 *
 * Канонический SSOT маршрутизатор стерилизации и автоклавирования.
 * Базовый путь: /api/sanpin/sterilization
 * Пакетная обработка сменами в 1 клик, списание со склада.
 * Мандат 8b: строго <= 140 строк.
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

const registeredSterilizationApps = new WeakSet<FastifyInstance>();

export function registerSanpinSterilizationRoutes(app: FastifyInstance): void {
	if (registeredSterilizationApps.has(app)) {
		return;
	}
	registeredSterilizationApps.add(app);

	// Журнал работы стерилизаторов: канонические циклы с изоляцией organizationId и Idempotency-Key
	app.get("/api/sanpin/sterilization", handleGetSterilizationLogs);
	app.post("/api/sanpin/sterilization", sanpinMutationOptions, handleCreateSterilizationLog);
	app.get("/api/sanpin/autoclave/cycles", handleGetSterilizationLogs);
	app.post("/api/sanpin/autoclave/cycles", sanpinMutationOptions, handleCreateSterilizationLog);
	app.get("/api/sterilization/cycles", handleGetSterilizationLogs);
	app.post("/api/sterilization/cycles", sanpinMutationOptions, handleCreateSterilizationLog);
	app.get("/api/sanpin/sterilization/cycles", handleGetSterilizationLogs);
	app.post("/api/sanpin/sterilization/cycles", sanpinMutationOptions, handleCreateSterilizationLog);

	// 1-клик запуск партии автоклава (134°C / 2.15 бар или 121°C / 1.15 бар) — канонический роут и алиасы
	app.post("/api/sanpin/sterilization/quick-norm", sanpinMutationOptions, handleQuickNormCycle);
	app.post("/api/sanpin/sterilization/quick-norm-cycle", sanpinMutationOptions, handleQuickNormCycle);
	app.post("/api/sanpin/sterilization-cycles/quick-norm", sanpinMutationOptions, handleQuickNormCycle);
	app.post("/api/sanpin/sterilization-cycles/quick-norm-cycle", sanpinMutationOptions, handleQuickNormCycle);
	app.post("/api/sanpin/sterilization-cycles/shift-batch", sanpinMutationOptions, handleSterilizationShiftBatch);
	app.post("/api/sanpin/sterilization-cycles/batch", sanpinMutationOptions, handleSterilizationShiftBatch);
	app.post("/api/sanpin/sterilization/shift-batch", sanpinMutationOptions, handleSterilizationShiftBatch);

	// Контроль качества предстерилизационной очистки (азопирам, фенолфталеин)
	app.get("/api/sanpin/sterilization/pso-tests", handleGetPsoTests);
	app.post("/api/sanpin/sterilization/pso-tests", sanpinMutationOptions, handleCreatePsoTest);
	app.post("/api/sanpin/sterilization/pso/quick-norm", sanpinMutationOptions, handlePsoQuickNorm);

	// Ежедневный контроль автоклавов (Bowie-Dick, Вакуум-тест)
	app.get("/api/sanpin/sterilization/daily-tests", handleGetDailyTests);
	app.post("/api/sanpin/sterilization/daily-tests", sanpinMutationOptions, handleCreateDailyTest);

	// Парк стерилизаторов и автоклавов (оборудование ЦСО)
	app.get("/api/sanpin/sterilization/equipments", handleGetSterilizerEquipments);
	app.post("/api/sanpin/sterilization/equipments", sanpinMutationOptions, handleCreateSterilizerEquipment);
	app.put<{ Params: { id: string } }>(
		"/api/sanpin/sterilization/equipments/:id",
		sanpinMutationOptions,
		handleUpdateSterilizerEquipment,
	);
	app.delete<{ Params: { id: string } }>(
		"/api/sanpin/sterilization/equipments/:id",
		sanpinMutationOptions,
		handleDeleteSterilizerEquipment,
	);

	// Сканирование, привязка крафт-пакетов и маркировка штрихкодами
	app.post("/api/sanpin/sterilization/scan", sanpinMutationOptions, handleScanSterilization);
	app.post("/api/sanpin/sterilization/link", sanpinMutationOptions, handleSterilizationLink);
	app.post("/api/sanpin/sterilization/generate-barcode", sanpinMutationOptions, handleGenerateBarcode);
	app.post("/api/sanpin/sterilization/unseal", sanpinMutationOptions, handleUnsealKraftPackage);
	app.post("/api/sterilization/scan", sanpinMutationOptions, handleScanSterilization);
	app.post("/api/sterilization/link", sanpinMutationOptions, handleSterilizationLink);
}

export const registerSterilizationRoutes = registerSanpinSterilizationRoutes;

export * from "./sterilizationModules/sterilizationCycleEngine.js";
export * from "./sterilizationModules/sterilizationHelpers.js";
export * from "./sterilizationModules/sterilizationKraftHandlers.js";
export * from "./sterilizationModules/sterilizationLogHandlers.js";
export * from "./sterilizationModules/sterilizationSchemas.js";
export * from "./sterilizationModules/sterilizationStockDeduction.js";
export * from "./sterilizationModules/sterilizerEquipmentHandlers.js";
