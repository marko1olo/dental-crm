import type { FastifyInstance } from "fastify";
import { defineStreamRoute, defineTenantQuery } from "../../core/routeFactories.js";
import { labClinicalPermission } from "./ordersCrudRoutes.js";
import {
	handleCreateLabOrderEvent,
	handleGetLabOrderEvents,
} from "./pipelineModules/labOrderEventsHandlers.js";
import { handleUpdatePipelineStage } from "./pipelineModules/pipelineStageHandler.js";
import { handleGetWarrantyPassport } from "./pipelineModules/warrantyPassportHandler.js";

const LAB_PIPELINE_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
} as const;

const LAB_PIPELINE_READ_PERMISSION = labClinicalPermission("clinical.lab_order.read");
const LAB_PIPELINE_PASSPORT_PERMISSION = labClinicalPermission("clinical.lab_order.passport.read");
const LAB_PIPELINE_WRITE_PERMISSION = labClinicalPermission("clinical.lab_order.write");

export async function registerLabPipelineRoutes(app: FastifyInstance) {
	// Журнал этапов наряда ЗТЛ и аудит событий (READ ONLY)
	defineTenantQuery(app, {
		method: "GET",
		path: "/api/clinical/lab-orders/:id/events",
		permission: LAB_PIPELINE_READ_PERMISSION,
		authOptions: LAB_PIPELINE_AUTH,
		handler: async ({ tx, request, reply }) => handleGetLabOrderEvents(request, reply, tx),
	});
	defineTenantQuery(app, {
		method: "GET",
		path: "/api/lab/orders/:id/events",
		permission: LAB_PIPELINE_READ_PERMISSION,
		authOptions: LAB_PIPELINE_AUTH,
		handler: async ({ tx, request, reply }) => handleGetLabOrderEvents(request, reply, tx),
	});

	// POST: Фиксация этапа наряда ЗТЛ
	// Контекст: withTenantWriteCtx (organizationId), Idempotency-Key (UUIDv7, RFC 9562)
	const eventPostSchema = {
		headers: {
			type: "object",
			description: "Фиксация этапа наряда ЗТЛ с проверкой organizationId и Idempotency-Key",
		},
	} as const;
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/lab-orders/:id/events",
		permission: LAB_PIPELINE_WRITE_PERMISSION,
		authOptions: LAB_PIPELINE_AUTH,
		schema: eventPostSchema,
		handler: async ({ request, reply }) => handleCreateLabOrderEvent(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/lab/orders/:id/events",
		permission: LAB_PIPELINE_WRITE_PERMISSION,
		authOptions: LAB_PIPELINE_AUTH,
		schema: eventPostSchema,
		handler: async ({ request, reply }) => handleCreateLabOrderEvent(request, reply),
	});

	// Официальный гарантийный паспорт ортопедической конструкции
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/lab-orders/:id/warranty-passport",
		permission: LAB_PIPELINE_PASSPORT_PERMISSION,
		authOptions: LAB_PIPELINE_AUTH,
		handler: async ({ request, reply }) => handleGetWarrantyPassport(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/lab/orders/:id/warranty-passport",
		permission: LAB_PIPELINE_PASSPORT_PERMISSION,
		authOptions: LAB_PIPELINE_AUTH,
		handler: async ({ request, reply }) => handleGetWarrantyPassport(request, reply),
	});

	// Перевод заказа ЗТЛ по каноническому 5-этапному пайплайну
	// Контекст: withTenantWriteCtx (organizationId), атомарная транзакция db.transaction (tx), Idempotency-Key
	const pipelineStageSchema = {
		headers: {
			type: "object",
			description: "Обновление этапа ЗТЛ с проверкой organizationId и Idempotency-Key",
		},
	} as const;
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/lab-orders/:id/pipeline-stage",
		permission: LAB_PIPELINE_WRITE_PERMISSION,
		authOptions: LAB_PIPELINE_AUTH,
		schema: pipelineStageSchema,
		handler: async ({ request, reply }) => handleUpdatePipelineStage(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/lab/orders/:id/pipeline-stage",
		permission: LAB_PIPELINE_WRITE_PERMISSION,
		authOptions: LAB_PIPELINE_AUTH,
		schema: pipelineStageSchema,
		handler: async ({ request, reply }) => handleUpdatePipelineStage(request, reply),
	});
}
