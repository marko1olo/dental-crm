import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	seedBaseline804nServicesInDb,
} from "../../db/pricelistQuery.js";
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

/**
 * registerServiceCatalogRoutes — Прозрачный фасад обратной совместимости для /api/settings/catalog.
 * Делегирует в канонические обработчики прейскуранта /api/pricelist (Мандаты 8e, 8n, 8aa).
 * Ролевой барьер: requireCatalogMutationAccess (свободный доступ для врача у кресла без 403 Forbidden).
 */
export function registerServiceCatalogRoutes(app: FastifyInstance): void {
	const settingsMutationPreHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = await requireSettingsMutationAccess(request, reply);
		if (!orgId) return reply;
	};

	// Делегация в канонические обработчики CRUD с ролевым контролем настроек (settings.write)
	app.post(
		"/api/settings/catalog",
		{ preHandler: settingsMutationPreHandler },
		handleCreateCatalogItem,
	);
	app.put(
		"/api/settings/catalog/:serviceId",
		{ preHandler: settingsMutationPreHandler },
		handleUpdateCatalogItem,
	);
	app.delete(
		"/api/settings/catalog/:serviceId",
		{ preHandler: settingsMutationPreHandler },
		handleDeactivateCatalogItem,
	);

	/**
	 * 1-клик быстрое наполнение каталога базовыми услугами 804н (30 услуг).
	 * Доступно для соло-врача и клиник (Мандаты 8e, 8k, 8n).
	 */
	app.post("/api/settings/catalog-seed-baseline", async (request, reply) => {
		const orgId = await requireCatalogMutationAccess(request, reply);
		if (!orgId) return;
		const body = (request.body as { replace?: boolean } | null) || {};
		const replace = Boolean(body.replace);
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
