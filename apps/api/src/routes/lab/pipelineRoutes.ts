import type { FastifyInstance } from "fastify";
import {
	handleCreateLabOrderEvent,
	handleGetLabOrderEvents,
} from "./pipelineModules/labOrderEventsHandlers.js";
import { handleUpdatePipelineStage } from "./pipelineModules/pipelineStageHandler.js";
import { handleGetWarrantyPassport } from "./pipelineModules/warrantyPassportHandler.js";

export async function registerLabPipelineRoutes(app: FastifyInstance) {
	// Журнал этапов наряда ЗТЛ и аудит событий
	app.get("/api/clinical/lab-orders/:id/events", handleGetLabOrderEvents);
	app.post("/api/clinical/lab-orders/:id/events", handleCreateLabOrderEvent);

	// Официальный гарантийный паспорт ортопедической конструкции
	app.get("/api/clinical/lab-orders/:id/warranty-passport", handleGetWarrantyPassport);

	// Перевод заказа ЗТЛ по каноническому 5-этапному пайплайну
	app.post("/api/clinical/lab-orders/:id/pipeline-stage", handleUpdatePipelineStage);
}
