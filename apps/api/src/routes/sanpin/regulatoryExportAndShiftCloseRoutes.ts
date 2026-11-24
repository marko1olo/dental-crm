/**
 * apps/api/src/routes/sanpin/regulatoryExportAndShiftCloseRoutes.ts
 * Тонкий фасад роутов регуляторной выгрузки и закрытия смены СанПиН.
 * Мандат 8b: строго <= 120 строк (фасад <= 45 строк).
 */

import type { FastifyInstance } from "fastify";
import { handleGetRegulatoryExport } from "./regulatoryExportModules/autoclaveRegulatoryExportHandler.js";
import { handlePostSanpinShiftClose } from "./regulatoryExportModules/shiftCloseBatchHandler.js";
import { handleGetSanpinRegister } from "./regulatoryExportModules/shiftSummaryRegisterHandler.js";

const sanpinMutationOptions = {
	schema: {
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
	},
};

export function registerSanpinRegulatoryExportAndShiftCloseRoutes(app: FastifyInstance) {
	// 1. Нормативная выгрузка журналов автоклавирования и предстерилизационной очистки
	app.get("/api/registers/regulatory-export", handleGetRegulatoryExport);

	// 2. Сводка журналов СанПиН за дату
	app.get("/api/registers/sanpin", handleGetSanpinRegister);

	// 3. Закрытие смены и фиксация комплекта журналов в 1 клик
	app.post("/api/registers/sanpin", sanpinMutationOptions, handlePostSanpinShiftClose);
	app.post("/api/registers/sanpin/shift-close", sanpinMutationOptions, handlePostSanpinShiftClose);
}
