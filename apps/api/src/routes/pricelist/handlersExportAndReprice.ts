import { Readable } from "node:stream";
import type { ServiceCatalogItem } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import {
	batchRepriceServicesInDb,
	getServiceCatalogBatchForOrganization,
	ServiceCatalogStorageDisabledError,
} from "../../db/pricelistQuery.js";
import { formatPricelistCsvHeader, formatPricelistCsvRow } from "./spreadsheetImport.js";
import {
	batchRepriceBodySchema,
	pricelistExportQuerySchema,
} from "./types.js";

const PRICELIST_EXPORT_BATCH_SIZE = 500;

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
	if (!queryParse.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры экспорта прейскуранта",
			details: queryParse.error.issues,
		});
	}
	const query = queryParse.data;
	const filterOpts = {
		...(query.category && query.category !== "all" ? { category: query.category } : {}),
		...(query.activeOnly !== undefined ? { activeOnly: query.activeOnly } : {}),
	};

	const todayStr = new Date().toISOString().slice(0, 10);
	if (query.format === "json") {
		const items: ServiceCatalogItem[] = [];
		let afterId: string | undefined;
		while (true) {
			const page = await getServiceCatalogBatchForOrganization(orgId, {
				...filterOpts,
				afterId,
				limit: PRICELIST_EXPORT_BATCH_SIZE,
			});
			items.push(...page.items);
			if (!page.nextCursorId) break;
			afterId = page.nextCursorId;
		}
		return reply.code(200).send({
			success: true,
			organizationId: orgId,
			totalCount: items.length,
			exportedAt: new Date().toISOString(),
			items,
		});
	}

	reply.header("Content-Type", "text/csv; charset=utf-8");
	reply.header("Content-Disposition", `attachment; filename="dente_pricelist_${todayStr}.csv"`);

	const csvStream = Readable.from(
		(async function* () {
			yield `\uFEFF${formatPricelistCsvHeader()}`;
			let afterId: string | undefined;
			while (true) {
				const page = await getServiceCatalogBatchForOrganization(orgId, {
					...filterOpts,
					afterId,
					limit: PRICELIST_EXPORT_BATCH_SIZE,
				});
				if (page.items.length > 0) {
					yield `\r\n${page.items.map(formatPricelistCsvRow).join("\r\n")}`;
				}
				if (!page.nextCursorId) break;
				afterId = page.nextCursorId;
			}
		})(),
	);

	return reply.send(csvStream);
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
			message: "Не удалось выполнить пакетную переоценку услуг.",
		});
	}
}
