import {
	dentalPricelistAnalysisRequestSchema,
	dentalPricelistAnalysisResponseSchema,
} from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import {
	getServiceCatalogForOrganization,
	ServiceCatalogStorageDisabledError,
} from "../../db/pricelistQuery.js";
import { analyzePricelist } from "../../pricelist/analyzer.js";
import {
	ingestPriceList,
	priceListIngestionRequestSchema,
	priceListIngestionResponseSchema,
} from "../../services/ai/priceListIngestionService.js";
import { commitIngestedPriceListItems } from "./catalogOperations.js";
import { parsePricelistPayload, pricelistValidationMessage } from "./types.js";

export async function handleAnalyzePricelist(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "pricelist analysis")))
		return;
	const input = parsePricelistPayload(dentalPricelistAnalysisRequestSchema, request.body);
	if (!input) {
		return reply.code(400).send({
			error: "PricelistValidationError",
			message: pricelistValidationMessage,
		});
	}

	const orgId = await requireResolvedOrganizationId(request, reply, "pricelist analysis");
	if (!orgId) return;
	const catalog = await getServiceCatalogForOrganization(orgId);
	return dentalPricelistAnalysisResponseSchema.parse(await analyzePricelist(input, catalog));
}

export async function handleIngestPricelist(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "pricelist ingestion")))
		return;

	const input = parsePricelistPayload(priceListIngestionRequestSchema, request.body);
	if (!input) {
		return reply.code(400).send({
			error: "PricelistValidationError",
			message: "Ошибка валидации: параметры ингестии прейскуранта не соответствуют формату.",
		});
	}

	const orgId = await requireResolvedOrganizationId(request, reply, "pricelist ingestion");
	if (!orgId) return;

	const existingCatalog = await getServiceCatalogForOrganization(orgId);
	const ingestionResult = await ingestPriceList(input, existingCatalog);

	if (input.commit) {
		if (!(await requireClinicalMutationAccess(request, reply, "pricelist ingestion commit"))) {
			return;
		}

		const itemsToCommit =
			input.approvedItems && input.approvedItems.length > 0
				? input.approvedItems
				: ingestionResult.proposals.filter((p) => p.isApproved);

		try {
			const committedCount = await commitIngestedPriceListItems(orgId, itemsToCommit);
			ingestionResult.committedCount = committedCount;
		} catch (commitError) {
			if (commitError instanceof ServiceCatalogStorageDisabledError) {
				return reply.code(503).send({
					error: "ServiceCatalogStorageDisabled",
					message: "Хранилище прейскуранта отключено: настройте базу данных.",
				});
			}
			request.log.error({ err: commitError }, "Транзакционный сбой при сохранении прейскуранта");
			return reply.code(500).send({
				error: "PricelistCommitTransactionError",
				message: `Не удалось зафиксировать изменения: ${(commitError as Error).message}`,
			});
		}
	}

	return reply.code(200).send(priceListIngestionResponseSchema.parse(ingestionResult));
}
