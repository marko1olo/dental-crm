import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import {
	seedBaseline804nServicesInDb,
	ServiceCatalogStorageDisabledError,
} from "../../db/pricelistQuery.js";
import { commitBatchImportItems } from "./catalogOperations.js";
import {
	pricelistBatchImportBodySchema,
	seedBodySchema,
} from "./types.js";

export async function handleBatchImport(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!(await requireClinicalMutationAccess(request, reply, "pricelist batch import"))) {
		return;
	}
	const orgId = await requireResolvedOrganizationId(request, reply, "pricelist batch import");
	if (!orgId) return;

	const parseResult = pricelistBatchImportBodySchema.safeParse(request.body ?? {});
	if (!parseResult.success) {
		return reply.code(400).send({
			error: "PricelistValidationError",
			message: "Некорректный формат позиций прейскуранта для импорта.",
			issues: parseResult.error.issues,
		});
	}

	const { items, collisionStrategy } = parseResult.data;
	try {
		const { createdCount, updatedCount, skippedCount } =
			await commitBatchImportItems(orgId, items, collisionStrategy);

		return reply.code(200).send({
			success: true,
			committedCount: createdCount + updatedCount,
			createdCount,
			updatedCount,
			skippedCount,
		});
	} catch (error) {
		if (error instanceof ServiceCatalogStorageDisabledError) {
			return reply.code(503).send({
				error: "ServiceCatalogStorageDisabled",
				message: "Хранилище прейскуранта отключено: настройте постоянную базу данных.",
			});
		}
		request.log.error({ err: error }, "Ошибка транзакции при пакетном импорте прейскуранта");
		return reply.code(500).send({
			error: "PricelistBatchImportError",
			message: (error as Error).message || "Ошибка транзакционного импорта прейскуранта",
		});
	}
}

export async function handleSeedBaseline804n(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!(await requireClinicalMutationAccess(request, reply, "pricelist seed baseline"))) {
		return;
	}
	const orgId = await requireResolvedOrganizationId(request, reply, "pricelist seed baseline");
	if (!orgId) return;

	const parseResult = seedBodySchema.safeParse(request.body ?? {});
	if (!parseResult.success) {
		return reply.code(400).send({
			error: "PricelistValidationError",
			message: "Некорректный формат параметров наполнения прейскуранта.",
		});
	}

	const replace = Boolean(parseResult.data.replace);
	try {
		const result = await seedBaseline804nServicesInDb(orgId, { replace });
		return reply.code(200).send(result);
	} catch (error) {
		if (error instanceof ServiceCatalogStorageDisabledError) {
			return reply.code(503).send({
				error: "ServiceCatalogStorageDisabled",
				message: "Хранилище прейскуранта отключено: настройте базу данных для сохранения услуг.",
			});
		}
		request.log.error({ err: error }, "Ошибка при наполнении базового прейскуранта");
		return reply.code(500).send({
			error: "PricelistSeedBaselineError",
			message: (error as Error).message || "Не удалось наполнить базовый прейскурант",
		});
	}
}

export const handleSeedStandardCatalog = handleSeedBaseline804n;
