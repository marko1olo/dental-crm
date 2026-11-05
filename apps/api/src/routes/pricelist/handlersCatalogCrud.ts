/**
 * handlersCatalogCrud.ts — Канонические CRUD-обработчики прейскуранта, каталога услуг и спецификаций BOM.
 * Единый канонический роут /api/pricelist (GET, POST, PUT, DELETE) и /api/pricelist/:serviceId/bom (Мандаты 8b, 8e, 8aa).
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	createServiceCatalogItemInDb,
	deactivateServiceCatalogItemInDb,
	getServiceBomFromDb,
	getSingleServiceCatalogItemFromDb,
	updateServiceCatalogItemInDb,
	upsertServiceBomInDb,
} from "../../db/pricelistQuery.js";
import {
	parseSettingsPayload,
	requireCatalogMutationAccess,
	serviceCatalogMutationRejection,
} from "../settings/helpers.js";
import {
	createServiceCatalogItemSchema,
	type CreateServiceCatalogItemInput,
	serviceCatalogCreateNotFoundMessage,
	serviceCatalogCreateValidationMessage,
	serviceCatalogDeactivateNotFoundMessage,
	serviceCatalogEmptyUpdateMessage,
	serviceCatalogRouteValidationMessage,
	serviceCatalogUpdateNotFoundMessage,
	serviceCatalogUpdateValidationMessage,
	updateServiceCatalogItemSchema,
	type UpdateServiceCatalogItemInput,
} from "../settings/types.js";

const serviceBomUpdateSchema = z.object({
	title: z.string().trim().max(240).optional(),
	description: z.string().trim().max(1000).optional().nullable(),
	status: z.enum(["active", "draft", "archived"]).optional().default("active"),
	items: z.array(
		z.object({
			inventoryItemId: z.string().uuid(),
			quantity: z.number().positive(),
			unit: z.string().trim().max(30).optional().default("шт"),
			isMdlpRequired: z.boolean().optional().default(false),
			notes: z.string().trim().max(500).optional().nullable(),
		}),
	),
});

/**
 * POST /api/pricelist & POST /api/pricelist/items
 * Создание новой позиции прейскуранта клиники.
 * Доступно врачу у кресла, администратору и руководству (Мандат 8e / 8n).
 */
export async function handleCreateCatalogItem(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireCatalogMutationAccess(request, reply);
	if (!orgId) return;

	const input = parseSettingsPayload<CreateServiceCatalogItemInput>(
		createServiceCatalogItemSchema,
		request.body,
	);
	if (!input) {
		reply.code(400);
		return {
			error: "SettingsValidationError",
			message: serviceCatalogCreateValidationMessage,
		};
	}

	try {
		const created = await createServiceCatalogItemInDb(orgId, input);
		reply.code(201);
		return created;
	} catch (error) {
		return serviceCatalogMutationRejection(
			reply,
			error,
			serviceCatalogCreateNotFoundMessage,
			serviceCatalogCreateValidationMessage,
			"ServiceCatalogCreate",
		);
	}
}

/**
 * GET /api/pricelist/:serviceId
 * Получение отдельной услуги прейскуранта с метаданными и себестоимостью.
 */
export async function handleGetCatalogItem(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireCatalogMutationAccess(request, reply);
	if (!orgId) return;

	const params = request.params as { serviceId?: string };
	if (!params.serviceId) {
		reply.code(400);
		return {
			error: "RouteValidationError",
			message: serviceCatalogRouteValidationMessage,
		};
	}

	const item = await getSingleServiceCatalogItemFromDb(orgId, params.serviceId);
	if (!item) {
		reply.code(404);
		return {
			error: "ServiceNotFound",
			message: "Услуга не найдена в прейскуранте клиники.",
		};
	}

	return {
		success: true,
		item,
	};
}

/**
 * PUT /api/pricelist/:serviceId & PATCH /api/pricelist/:serviceId
 * Обновление услуги прейскуранта (цены, названия, категории, лаборатории, себестоимости).
 */
export async function handleUpdateCatalogItem(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireCatalogMutationAccess(request, reply);
	if (!orgId) return;

	const params = request.params as { serviceId?: string };
	if (!params.serviceId) {
		reply.code(400);
		return {
			error: "SettingsRouteValidationError",
			message: serviceCatalogRouteValidationMessage,
		};
	}

	const input = parseSettingsPayload<UpdateServiceCatalogItemInput>(
		updateServiceCatalogItemSchema,
		request.body,
	);
	if (!input) {
		reply.code(400);
		return {
			error: "SettingsValidationError",
			message: serviceCatalogUpdateValidationMessage,
		};
	}

	if (Object.keys(input).length === 0) {
		reply.code(400);
		return {
			error: "SettingsValidationError",
			message: serviceCatalogEmptyUpdateMessage,
		};
	}

	try {
		const updated = await updateServiceCatalogItemInDb(
			orgId,
			params.serviceId,
			input,
		);
		return updated;
	} catch (error) {
		return serviceCatalogMutationRejection(
			reply,
			error,
			serviceCatalogUpdateNotFoundMessage,
			serviceCatalogUpdateValidationMessage,
			"ServiceCatalogUpdate",
		);
	}
}

/**
 * DELETE /api/pricelist/:serviceId
 * Мягкая деактивация (архивация) услуги прейскуранта без физического удаления связанных счетов и планов.
 */
export async function handleDeactivateCatalogItem(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireCatalogMutationAccess(request, reply);
	if (!orgId) return;

	const params = request.params as { serviceId?: string };
	if (!params.serviceId) {
		reply.code(400);
		return {
			error: "SettingsRouteValidationError",
			message: serviceCatalogRouteValidationMessage,
		};
	}

	try {
		const deactivated = await deactivateServiceCatalogItemInDb(
			orgId,
			params.serviceId,
		);
		return deactivated;
	} catch (error) {
		return serviceCatalogMutationRejection(
			reply,
			error,
			serviceCatalogDeactivateNotFoundMessage,
			serviceCatalogUpdateValidationMessage,
			"ServiceCatalogDeactivate",
		);
	}
}

/**
 * GET /api/pricelist/:serviceId/bom
 * Получение спецификации расхода материалов (BOM / Техкарта) для услуги прейскуранта.
 */
export async function handleGetServiceBom(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireCatalogMutationAccess(request, reply);
	if (!orgId) return;

	const params = request.params as { serviceId?: string };
	if (!params.serviceId) {
		reply.code(400);
		return {
			error: "RouteValidationError",
			message: serviceCatalogRouteValidationMessage,
		};
	}

	const bom = await getServiceBomFromDb(orgId, params.serviceId);
	if (!bom) {
		reply.code(404);
		return {
			error: "ServiceNotFound",
			message: "Услуга не найдена в прейскуранте клиники.",
		};
	}

	return {
		success: true,
		bom,
	};
}

/**
 * PUT /api/pricelist/:serviceId/bom
 * Создание или обновление техкарты расхода материалов (BOM) для услуги.
 * Автоматически пересчитывает materialsCostRub (COGS) в прейскуранте (Мандат 8aa).
 */
export async function handleUpdateServiceBom(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireCatalogMutationAccess(request, reply);
	if (!orgId) return;

	const params = request.params as { serviceId?: string };
	if (!params.serviceId) {
		reply.code(400);
		return {
			error: "RouteValidationError",
			message: serviceCatalogRouteValidationMessage,
		};
	}

	const parseResult = serviceBomUpdateSchema.safeParse(request.body);
	if (!parseResult.success) {
		reply.code(400);
		return {
			error: "ValidationError",
			message: "Некорректная спецификация техкарты расхода материалов: проверьте список материалов и количество.",
		};
	}

	try {
		const updatedBom = await upsertServiceBomInDb(
			orgId,
			params.serviceId,
			{
				...(parseResult.data.title !== undefined ? { title: parseResult.data.title } : {}),
				...(parseResult.data.description !== undefined ? { description: parseResult.data.description } : {}),
				...(parseResult.data.status !== undefined ? { status: parseResult.data.status } : {}),
				items: parseResult.data.items.map((item) => ({
					inventoryItemId: item.inventoryItemId,
					quantity: item.quantity,
					...(item.unit !== undefined ? { unit: item.unit } : {}),
					...(item.isMdlpRequired !== undefined ? { isMdlpRequired: item.isMdlpRequired } : {}),
					...(item.notes !== undefined ? { notes: item.notes } : {}),
				})),
			},
		);
		reply.code(200);
		return {
			success: true,
			bom: updatedBom,
		};
	} catch (error) {
		return serviceCatalogMutationRejection(
			reply,
			error,
			serviceCatalogUpdateNotFoundMessage,
			"Не удалось сохранить техкарту списания материалов.",
			"ServiceBomUpdate",
		);
	}
}
