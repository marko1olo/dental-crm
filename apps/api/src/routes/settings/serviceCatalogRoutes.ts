import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	seedBaseline804nServicesInDb,
} from "../../db/pricelistQuery.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import {
	handleCreateCatalogItem,
	handleDeactivateCatalogItem,
	handleUpdateCatalogItem,
} from "../pricelist/handlersCatalogCrud.js";
import {
	requireCatalogMutationAccess,
	requireSettingsMutationAccess,
	serviceCatalogMutationRejection,
} from "./helpers.js";
import {
	serviceCatalogCreateNotFoundMessage,
	serviceCatalogCreateValidationMessage,
} from "./types.js";

const seedCatalogBaselineSchema = z
	.object({
		replace: z.boolean().optional(),
	})
	.strict();

/**
 * registerServiceCatalogRoutes — Прозрачный фасад обратной совместимости для /api/settings/catalog.
 * Делегирует в канонические обработчики прейскуранта /api/pricelist (Мандаты 8e, 8n, 8aa).
 * Ролевой барьер: requireCatalogMutationAccess (свободный доступ для врача у кресла без 403 Forbidden).
 */
export function registerServiceCatalogRoutes(app: FastifyInstance): void {
	// Делегация в канонические обработчики CRUD с ролевым контролем прейскуранта (Мандат 8e / 8n)
	app.post("/api/settings/catalog", handleCreateCatalogItem);
	app.put("/api/settings/catalog/:serviceId", handleUpdateCatalogItem);
	app.delete("/api/settings/catalog/:serviceId", handleDeactivateCatalogItem);

	/**
	 * 1-клик быстрое наполнение каталога базовыми услугами 804н (30 услуг).
	 * Доступно для соло-врача и клиник (Мандаты 8e, 8k, 8n).
	 */
	app.post("/api/settings/catalog-seed-baseline", async (request, reply) => {
		const orgId = await requireCatalogMutationAccess(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			};
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const parsedBody = seedCatalogBaselineSchema.safeParse(request.body ?? {});
		if (!parsedBody.success) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: "Некорректные параметры наполнения каталога.",
				details: parsedBody.error.errors,
			};
		}
		const replace = Boolean(parsedBody.data.replace);
		try {
			const result = await seedBaseline804nServicesInDb(orgId, { replace });
			reply.code(200);
			return result;
		} catch (error) {
			return serviceCatalogMutationRejection(
				reply,
				error,
				serviceCatalogCreateNotFoundMessage,
				serviceCatalogCreateValidationMessage,
				"ServiceCatalogSeedBaseline",
			);
		}
	});
}
