/**
 * apps/api/src/routes/sanpin/sterilizationRoutes.ts
 *
 * Канонический SSOT маршрутизатор стерилизации и автоклавирования.
 * Базовый путь: /api/sanpin/sterilization
 * Пакетная обработка сменами в 1 клик, списание со склада.
 * Мандат 8b: строго <= 120 строк.
 */

import type { FastifyInstance } from "fastify";
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
	handleSterilizationShiftBatch,
} from "./sterilizationModules/sterilizationLogHandlers.js";
import {
	handleCreateSterilizerEquipment,
	handleDeleteSterilizerEquipment,
	handleGetSterilizerEquipments,
	handleUpdateSterilizerEquipment,
} from "./sterilizationModules/sterilizerEquipmentHandlers.js";

const registeredSterilizationApps = new WeakSet<FastifyInstance>();

export function registerSanpinSterilizationRoutes(app: FastifyInstance): void {
	if (registeredSterilizationApps.has(app)) {
		return;
	}
	registeredSterilizationApps.add(app);

	// Журнал работы стерилизаторов: канонические циклы с изоляцией organizationId и Idempotency-Key
	app.get("/api/sanpin/sterilization", handleGetSterilizationLogs);
	app.post("/api/sanpin/sterilization", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleCreateSterilizationLog(req, reply);
	});
	app.get("/api/sanpin/autoclave/cycles", handleGetSterilizationLogs);
	app.post("/api/sanpin/autoclave/cycles", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleCreateSterilizationLog(req, reply);
	});
	app.get("/api/sterilization/cycles", handleGetSterilizationLogs);
	app.post("/api/sterilization/cycles", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleCreateSterilizationLog(req, reply);
	});
	app.get("/api/sanpin/sterilization/cycles", handleGetSterilizationLogs);
	app.post("/api/sanpin/sterilization/cycles", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleCreateSterilizationLog(req, reply);
	});

	// 1-клик запуск партии автоклава (134°C / 2.15 бар или 121°C / 1.15 бар) — канонический роут и алиасы
	app.post("/api/sanpin/sterilization/quick-norm", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleQuickNormCycle(req, reply);
	});
	app.post("/api/sanpin/sterilization/quick-norm-cycle", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleQuickNormCycle(req, reply);
	});
	app.post("/api/sanpin/sterilization-cycles/quick-norm", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleQuickNormCycle(req, reply);
	});
	app.post("/api/sanpin/sterilization-cycles/quick-norm-cycle", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleQuickNormCycle(req, reply);
	});
	app.post("/api/sanpin/sterilization-cycles/shift-batch", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleSterilizationShiftBatch(req, reply);
	});
	app.post("/api/sanpin/sterilization-cycles/batch", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleSterilizationShiftBatch(req, reply);
	});
	app.post("/api/sanpin/sterilization/shift-batch", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleSterilizationShiftBatch(req, reply);
	});

	// Контроль качества предстерилизационной очистки (азопирам, фенолфталеин)
	app.get("/api/sanpin/sterilization/pso-tests", handleGetPsoTests);
	app.post("/api/sanpin/sterilization/pso-tests", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleCreatePsoTest(req, reply);
	});
	app.post("/api/sanpin/sterilization/pso/quick-norm", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handlePsoQuickNorm(req, reply);
	});

	// Ежедневный контроль автоклавов (Bowie-Dick, Вакуум-тест)
	app.get("/api/sanpin/sterilization/daily-tests", handleGetDailyTests);
	app.post("/api/sanpin/sterilization/daily-tests", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleCreateDailyTest(req, reply);
	});

	// Парк стерилизаторов и автоклавов (оборудование ЦСО)
	app.get(
		"/api/sanpin/sterilization/equipments",
		handleGetSterilizerEquipments,
	);
	app.post("/api/sanpin/sterilization/equipments", async (req, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleCreateSterilizerEquipment(req, reply);
	});
	app.put<{ Params: { id: string } }>(
		"/api/sanpin/sterilization/equipments/:id",
		async (req, reply) => handleUpdateSterilizerEquipment(req, reply),
	);
	app.delete<{ Params: { id: string } }>(
		"/api/sanpin/sterilization/equipments/:id",
		async (req, reply) => handleDeleteSterilizerEquipment(req, reply),
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
