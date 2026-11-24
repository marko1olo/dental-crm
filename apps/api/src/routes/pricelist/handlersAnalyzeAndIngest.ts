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
import { withTenantCtx } from "../../db/rls.js";
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

	const hasPluginIdempotency = Boolean(
		(request as FastifyRequest & { _idempotencyContext?: unknown })._idempotencyContext,
	);
	const useManualIdempotency = Boolean(idempotencyKey && !hasPluginIdempotency);
	const payloadHash = computePayloadHash(request.body ?? {});
	let acquiredInFlight = false;

	if (useManualIdempotency && idempotencyKey) {
		const checkOutcome = await withTenantCtx(orgId, async (tx) => {
			const [existingRecord] = await tx
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
						eq(idempotencyKeys.key, idempotencyKey),
					),
				)
				.for("update")
				.limit(1);

			if (existingRecord) {
				if (existingRecord.payloadHash && existingRecord.payloadHash !== payloadHash) {
					return { kind: "mismatch" as const, record: existingRecord };
				}
				if (existingRecord.status === "completed" && existingRecord.responseBody) {
					return { kind: "replay" as const, record: existingRecord };
				}
				if (existingRecord.status === "in_flight") {
					return { kind: "in_flight" as const, record: existingRecord };
				}
			}

			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: orgId,
					key: idempotencyKey,
					status: "in_flight",
					payloadHash,
					responseCode: 0,
					lockedAt: new Date(),
				})
				.onConflictDoNothing({
					target: [idempotencyKeys.clinicId, idempotencyKeys.key],
				});
			return { kind: "acquired" as const, record: null };
		});

		if (checkOutcome.kind === "mismatch") {
			return reply.code(409).send({
				error: "IdempotencyConflict",
				message: "Запрос с данным Idempotency-Key уже выполнен с другим содержимым.",
			});
		}
		if (checkOutcome.kind === "replay") {
			reply.header("idempotency-replayed", "true");
			reply.header("x-idempotency-replayed", "true");
			return reply
				.code(checkOutcome.record.responseCode || 200)
				.send(checkOutcome.record.responseBody);
		}
		if (checkOutcome.kind === "in_flight") {
			return reply.code(409).send({
				error: "IdempotencyConflict",
				message: "Запрос с данным Idempotency-Key уже выполняется.",
			});
		}
		acquiredInFlight = true;
	}

	const input = parsePricelistPayload(priceListIngestionRequestSchema, request.body);
	if (!input) {
		if (useManualIdempotency && acquiredInFlight && idempotencyKey) {
			await withTenantCtx(orgId, async (tx) => {
				await tx
					.delete(idempotencyKeys)
					.where(
						and(
							eq(idempotencyKeys.clinicId, orgId),
							eq(idempotencyKeys.key, idempotencyKey),
							eq(idempotencyKeys.status, "in_flight"),
						),
					);
			});
		}
		return reply.code(400).send({
			error: "PricelistValidationError",
			message: "Ошибка валидации: параметры ингестии прейскуранта не соответствуют формату.",
		});
	}

	const existingCatalog = await getServiceCatalogForOrganization(orgId);
	const ingestionResult = await ingestPriceList(input, existingCatalog);

	if (input.commit) {
		if (!(await requireClinicalMutationAccess(request, reply, "pricelist ingestion commit"))) {
			if (useManualIdempotency && acquiredInFlight && idempotencyKey) {
				await withTenantCtx(orgId, async (tx) => {
					await tx
						.delete(idempotencyKeys)
						.where(
							and(
								eq(idempotencyKeys.clinicId, orgId),
								eq(idempotencyKeys.key, idempotencyKey),
								eq(idempotencyKeys.status, "in_flight"),
							),
						);
				});
			}
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
			if (useManualIdempotency && acquiredInFlight && idempotencyKey) {
				await withTenantCtx(orgId, async (tx) => {
					await tx
						.delete(idempotencyKeys)
						.where(
							and(
								eq(idempotencyKeys.clinicId, orgId),
								eq(idempotencyKeys.key, idempotencyKey),
								eq(idempotencyKeys.status, "in_flight"),
							),
						);
				});
			}
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

	if (useManualIdempotency && idempotencyKey) {
		await withTenantCtx(orgId, async (tx) => {
			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: orgId,
					key: idempotencyKey,
					status: "completed",
					payloadHash,
					responseBody: finalResponse,
					responseCode: 200,
				})
				.onConflictDoUpdate({
					target: [idempotencyKeys.clinicId, idempotencyKeys.key],
					set: {
						status: "completed",
						payloadHash,
						responseBody: finalResponse,
						responseCode: 200,
						lockedAt: new Date(),
					},
				});
		});
	}

	return reply.code(200).send(finalResponse);
}
