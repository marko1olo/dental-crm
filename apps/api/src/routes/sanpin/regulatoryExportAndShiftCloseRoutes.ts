/**
 * apps/api/src/routes/sanpin/regulatoryExportAndShiftCloseRoutes.ts
 * Тонкий фасад роутов регуляторной выгрузки и закрытия смены СанПиН.
 * Мандат 8b: строго <= 120 строк (фасад <= 40 строк).
 */

import type { FastifyInstance } from "fastify";
import { handleGetRegulatoryExport } from "./regulatoryExportModules/autoclaveRegulatoryExportHandler.js";
import { handlePostSanpinShiftClose } from "./regulatoryExportModules/shiftCloseBatchHandler.js";
import { handleGetSanpinRegister } from "./regulatoryExportModules/shiftSummaryRegisterHandler.js";

export function registerSanpinRegulatoryExportAndShiftCloseRoutes(app: FastifyInstance) {
	// 1. Нормативная выгрузка журналов автоклавирования и предстерилизационной очистки
	app.get("/api/registers/regulatory-export", handleGetRegulatoryExport);

	// 2. Сводка журналов СанПиН за дату
	app.get("/api/registers/sanpin", handleGetSanpinRegister);

	// 3. Закрытие смены и фиксация комплекта журналов в 1 клик
	app.post("/api/registers/sanpin", handlePostSanpinShiftClose);
	app.post("/api/registers/sanpin/shift-close", handlePostSanpinShiftClose);
}
