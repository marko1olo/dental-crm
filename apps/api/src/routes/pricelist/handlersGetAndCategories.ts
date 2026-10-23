import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { getServiceCatalogForOrganization } from "../../db/pricelistQuery.js";
import { SERVICE_CATEGORIES_METADATA } from "./catalogOperations.js";

/**
 * GET /api/pricelists & GET /api/pricelist
 * Получение каталога услуг прейскуранта организации из PostgreSQL.
 */
export async function handleGetPricelists(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalReadAccess(
			request,
			reply,
			"pricelist get",
		))
	)
		return;

	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"pricelist get",
	);
	if (!orgId) return;

	const catalog = await getServiceCatalogForOrganization(orgId);
	return reply.code(200).send({
		success: true,
		items: catalog,
		count: catalog.length,
	});
}

/**
 * GET /api/pricelist/categories
 * Справочник валидных клинических категорий услуг со статьями и описанием.
 */
export async function handleGetCategories(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalReadAccess(
			request,
			reply,
			"pricelist categories",
		))
	)
		return;

	return reply.code(200).send({
		success: true,
		categories: SERVICE_CATEGORIES_METADATA,
	});
}
