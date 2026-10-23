import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import {
	batchRepriceServicesInDb,
	getServiceCatalogForOrganization,
	ServiceCatalogStorageDisabledError,
} from "../../db/pricelistQuery.js";
import { formatPricelistToCsv } from "./spreadsheetImport.js";
import {
	batchRepriceBodySchema,
	pricelistExportQuerySchema,
} from "./types.js";

export async function handleExportPricelist(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "pricelist export"))) {
		return;
	}
	const orgId = await requireResolvedOrganizationId(request, reply, "pricelist export");
	if (!orgId) return;

	const queryParse = pricelistExportQuerySchema.safeParse(request.query ?? {});
	const query = queryParse.success ? queryParse.data : { format: "csv" as const };

	const catalog = await getServiceCatalogForOrganization(orgId);
	let filtered = catalog;
	if (query.category && query.category !== "all") {
		filtered = filtered.filter((s) => s.category === query.category);
	}
	if (query.activeOnly) {
		filtered = filtered.filter((s) => s.active);
	}

	const todayStr = new Date().toISOString().slice(0, 10);
	if (query.format === "json") {
		return reply.code(200).send({
			success: true,
			organizationId: orgId,
			totalCount: filtered.length,
			exportedAt: new Date().toISOString(),
			items: filtered,
		});
	}

	const csvOutput = formatPricelistToCsv(filtered);
	reply.header("Content-Type", "text/csv; charset=utf-8");
	reply.header("Content-Disposition", `attachment; filename="dente_pricelist_${todayStr}.csv"`);
	return reply.send(csvOutput);
}

export async function handleBatchReprice(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!(await requireClinicalMutationAccess(request, reply, "pricelist batch reprice"))) {
		return;
	}
	const orgId = await requireResolvedOrganizationId(request, reply, "pricelist batch reprice");
	if (!orgId) return;

	const parseResult = batchRepriceBodySchema.safeParse(request.body ?? {});
	if (!parseResult.success) {
		return reply.code(400).send({
			error: "PricelistValidationError",
			message: "Некорректные параметры пакетной переоценки услуг.",
		});
	}

	try {
		const result = await batchRepriceServicesInDb(orgId, parseResult.data);
		return reply.code(200).send(result);
	} catch (error) {
		if (error instanceof ServiceCatalogStorageDisabledError) {
			return reply.code(503).send({
				error: "ServiceCatalogStorageDisabled",
				message: "Хранилище прейскуранта отключено: настройте базу данных для сохранения изменений.",
			});
		}
		request.log.error({ err: error }, "Ошибка при пакетной переоценке услуг");
		return reply.code(500).send({
			error: "PricelistBatchRepriceError",
			message: (error as Error).message || "Не удалось выполнить переоценку услуг",
		});
	}
}
