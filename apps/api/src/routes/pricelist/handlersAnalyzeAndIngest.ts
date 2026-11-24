import {
	computePayloadHash,
	dentalPricelistAnalysisRequestSchema,
	dentalPricelistAnalysisResponseSchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	getServiceCatalogForOrganization,
	ServiceCatalogStorageDisabledError,
} from "../../db/pricelistQuery.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { analyzePricelist } from "../../pricelist/analyzer.js";
import {
	ingestPriceList,
	priceListIngestionRequestSchema,
	priceListIngestionResponseSchema,
} from "../../services/ai/priceListIngestionService.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
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

	const idempotencyKey = extractIdempotencyKey(request);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "PricelistValidationError",
			message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const orgId = await requireResolvedOrganizationId(request, reply, "pricelist ingestion");
	if (!orgId) return;

	if (idempotencyKey) {
		const [existingRecord] = await db
			.select()
			.from(idempotencyKeys)
			.where(
				and(
					eq(idempotencyKeys.clinicId, orgId),
					eq(idempotencyKeys.key, idempotencyKey),
				),
			)
			.limit(1);

		if (existingRecord) {
			if (existingRecord.status === "completed" && existingRecord.responseBody) {
				reply.header("idempotency-replayed", "true");
				reply.header("x-idempotency-replayed", "true");
				return reply
					.code(existingRecord.responseCode || 200)
					.send(existingRecord.responseBody);
			}
			if (existingRecord.status === "in_flight") {
				return reply.code(409).send({
					error: "IdempotencyConflict",
					message: "Запрос с данным Idempotency-Key уже выполняется.",
				});
			}
		}
	}

	const input = parsePricelistPayload(priceListIngestionRequestSchema, request.body);
	if (!input) {
		return reply.code(400).send({
			error: "PricelistValidationError",
			message: "Ошибка валидации: параметры ингестии прейскуранта не соответствуют формату.",
		});
	}

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

	const finalResponse = priceListIngestionResponseSchema.parse(ingestionResult);

	if (idempotencyKey) {
		try {
			await db
				.insert(idempotencyKeys)
				.values({
					clinicId: orgId,
					key: idempotencyKey,
					status: "completed",
					payloadHash: computePayloadHash(request.body ?? {}),
					responseBody: finalResponse,
					responseCode: 200,
				})
				.onConflictDoUpdate({
					target: [idempotencyKeys.clinicId, idempotencyKeys.key],
					set: {
						status: "completed",
						responseBody: finalResponse,
						responseCode: 200,
						lockedAt: new Date(),
					},
				});
		} catch (idemErr) {
			request.log.warn(
				{ err: idemErr, idempotencyKey, orgId },
				"Не удалось сохранить запись Idempotency-Key для ingest прейскуранта",
			);
		}
	}

	return reply.code(200).send(finalResponse);
}
