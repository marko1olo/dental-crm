/**
 * apps/api/src/routes/sanpin/sterilizationRoutes.ts
 *
 * Канонический SSOT маршрутизатор стерилизации и автоклавирования.
 * Базовый путь: /api/sanpin/sterilization
 * Пакетная обработка сменами в 1 клик, списание со склада.
 * Мандат 8b: строго <= 140 строк.
 */

import type { FastifyInstance } from "fastify";
import { defineStreamRoute, defineTenantQuery } from "../../core/routeFactories.js";
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

const SANPIN_STERILIZATION_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
} as const;

const sanpinMutationSchema = {
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
} as const;

const registeredSterilizationApps = new WeakSet<FastifyInstance>();

export function registerSanpinSterilizationRoutes(app: FastifyInstance): void {
	if (registeredSterilizationApps.has(app)) {
		return;
	}
	registeredSterilizationApps.add(app);

	// Журнал работы стерилизаторов: канонические циклы с изоляцией organizationId и Idempotency-Key
	defineTenantQuery(app, {
		method: "GET",
		path: "/api/sanpin/sterilization",
		permission: "inventory.read",
		authOptions: SANPIN_STERILIZATION_AUTH,
		handler: async ({ tx, request, reply }) => handleGetSterilizationLogs(request, reply, tx),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleCreateSterilizationLog(request, reply),
	});
	defineTenantQuery(app, {
		method: "GET",
		path: "/api/sanpin/autoclave/cycles",
		permission: "inventory.read",
		authOptions: SANPIN_STERILIZATION_AUTH,
		handler: async ({ tx, request, reply }) => handleGetSterilizationLogs(request, reply, tx),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/autoclave/cycles",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleCreateSterilizationLog(request, reply),
	});
	defineTenantQuery(app, {
		method: "GET",
		path: "/api/sterilization/cycles",
		permission: "inventory.read",
		authOptions: SANPIN_STERILIZATION_AUTH,
		handler: async ({ tx, request, reply }) => handleGetSterilizationLogs(request, reply, tx),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sterilization/cycles",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleCreateSterilizationLog(request, reply),
	});
	defineTenantQuery(app, {
		method: "GET",
		path: "/api/sanpin/sterilization/cycles",
		permission: "inventory.read",
		authOptions: SANPIN_STERILIZATION_AUTH,
		handler: async ({ tx, request, reply }) => handleGetSterilizationLogs(request, reply, tx),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization/cycles",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleCreateSterilizationLog(request, reply),
	});

	// Запуск партии автоклава (134°C / 2.15 бар или 121°C / 1.15 бар) — канонический роут и алиасы
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization/quick-norm",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleQuickNormCycle(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization/quick-norm-cycle",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleQuickNormCycle(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization-cycles/quick-norm",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleQuickNormCycle(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization-cycles/quick-norm-cycle",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleQuickNormCycle(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization-cycles/shift-batch",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleSterilizationShiftBatch(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization-cycles/batch",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleSterilizationShiftBatch(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization/shift-batch",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleSterilizationShiftBatch(request, reply),
	});

	// Контроль качества предстерилизационной очистки (азопирам, фенолфталеин)
	defineTenantQuery(app, {
		method: "GET",
		path: "/api/sanpin/sterilization/pso-tests",
		permission: "inventory.read",
		authOptions: SANPIN_STERILIZATION_AUTH,
		handler: async ({ tx, request, reply }) => handleGetPsoTests(request, reply, tx),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization/pso-tests",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleCreatePsoTest(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization/pso/quick-norm",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handlePsoQuickNorm(request, reply),
	});

	// Ежедневный контроль автоклавов (Bowie-Dick, Вакуум-тест)
	defineTenantQuery(app, {
		method: "GET",
		path: "/api/sanpin/sterilization/daily-tests",
		permission: "inventory.read",
		authOptions: SANPIN_STERILIZATION_AUTH,
		handler: async ({ tx, request, reply }) => handleGetDailyTests(request, reply, tx),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization/daily-tests",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleCreateDailyTest(request, reply),
	});

	// Парк стерилизаторов и автоклавов (оборудование ЦСО)
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/sanpin/sterilization/equipments",
		permission: "inventory.read",
		authOptions: SANPIN_STERILIZATION_AUTH,
		handler: async ({ request, reply }) => handleGetSterilizerEquipments(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization/equipments",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleCreateSterilizerEquipment(request, reply),
	});
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/sanpin/sterilization/equipments/:id",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleUpdateSterilizerEquipment(request, reply),
	});
	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/sanpin/sterilization/equipments/:id",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleDeleteSterilizerEquipment(request, reply),
	});

	// Сканирование, привязка крафт-пакетов и маркировка штрихкодами
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization/scan",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleScanSterilization(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization/link",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleSterilizationLink(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization/generate-barcode",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleGenerateBarcode(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sanpin/sterilization/unseal",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleUnsealKraftPackage(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sterilization/scan",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleScanSterilization(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sterilization/link",
		permission: "inventory.write",
		authOptions: SANPIN_STERILIZATION_AUTH,
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handleSterilizationLink(request, reply),
	});
}

export const registerSterilizationRoutes = registerSanpinSterilizationRoutes;

export * from "./sterilizationModules/sterilizationCycleEngine.js";
export * from "./sterilizationModules/sterilizationHelpers.js";
export * from "./sterilizationModules/sterilizationKraftHandlers.js";
export * from "./sterilizationModules/sterilizationLogHandlers.js";
export * from "./sterilizationModules/sterilizationSchemas.js";
export * from "./sterilizationModules/sterilizationStockDeduction.js";
export * from "./sterilizationModules/sterilizerEquipmentHandlers.js";
