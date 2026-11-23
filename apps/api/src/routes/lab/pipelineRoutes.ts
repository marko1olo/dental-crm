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
	app.get("/api/lab/orders/:id/events", handleGetLabOrderEvents);

	// POST: Фиксация этапа наряда ЗТЛ
	// Контекст: withTenantCtx (organizationId), Idempotency-Key (UUIDv7, RFC 9562)
	app.post("/api/clinical/lab-orders/:id/events", {
		schema: {
			headers: {
				type: "object",
				description: "Фиксация этапа наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, handleCreateLabOrderEvent);
	app.post("/api/lab/orders/:id/events", {
		schema: {
			headers: {
				type: "object",
				description: "Фиксация этапа наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, handleCreateLabOrderEvent);

	// Официальный гарантийный паспорт ортопедической конструкции
	app.get("/api/clinical/lab-orders/:id/warranty-passport", handleGetWarrantyPassport);
	app.get("/api/lab/orders/:id/warranty-passport", handleGetWarrantyPassport);

	// Перевод заказа ЗТЛ по каноническому 5-этапному пайплайну
	// Контекст: withTenantCtx (organizationId), атомарная транзакция db.transaction (tx), Idempotency-Key
	app.post("/api/clinical/lab-orders/:id/pipeline-stage", {
		schema: {
			headers: {
				type: "object",
				description: "Обновление этапа ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, handleUpdatePipelineStage);
	app.post("/api/lab/orders/:id/pipeline-stage", {
		schema: {
			headers: {
				type: "object",
				description: "Обновление этапа ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, handleUpdatePipelineStage);
}
