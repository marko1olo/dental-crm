/**
 * apps/api/src/routes/sanpin/regulatoryExportAndShiftCloseRoutes.ts
 * Тонкий фасад роутов регуляторной выгрузки и закрытия смены СанПиН.
 * Мандат 8b: строго <= 120 строк (фасад <= 45 строк).
 */

import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { handleGetRegulatoryExport } from "./regulatoryExportModules/autoclaveRegulatoryExportHandler.js";
import { handlePostSanpinShiftClose } from "./regulatoryExportModules/shiftCloseBatchHandler.js";
import { handleGetSanpinRegister } from "./regulatoryExportModules/shiftSummaryRegisterHandler.js";

const sanpinMutationSchema = {
	description:
		"SanPiN shift-close batch mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
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

export function registerSanpinRegulatoryExportAndShiftCloseRoutes(app: FastifyInstance) {
	// 1. Нормативная выгрузка журналов автоклавирования и предстерилизационной очистки
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/registers/regulatory-export",
		permission: "public",
		handler: async ({ request, reply }) => handleGetRegulatoryExport(request, reply),
	});

	// 2. Сводка журналов СанПиН за дату
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/registers/sanpin",
		permission: "public",
		handler: async ({ request, reply }) => handleGetSanpinRegister(request, reply),
	});

	// 3. Закрытие смены и фиксация комплекта журналов
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/sanpin",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handlePostSanpinShiftClose(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/registers/sanpin/shift-close",
		permission: "public",
		schema: sanpinMutationSchema,
		handler: async ({ request, reply }) => handlePostSanpinShiftClose(request, reply),
	});
}
