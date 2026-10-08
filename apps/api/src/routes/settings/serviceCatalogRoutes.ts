import type { FastifyInstance } from "fastify";
import {
	createServiceCatalogItemInDb,
	deactivateServiceCatalogItemInDb,
	seedBaseline804nServicesInDb,
	updateServiceCatalogItemInDb,
} from "../../db/pricelistQuery.js";
import {
	parseSettingsPayload,
	requireSettingsAccess,
	serviceCatalogMutationRejection,
} from "./helpers.js";
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
} from "./types.js";

export function registerServiceCatalogRoutes(app: FastifyInstance): void {
	/* ─── ПРАЙС УСЛУГ ─────────────────────────────────────────────────────────
	 *
	 * Интерфейс зовёт эти три адреса из createServiceCatalogItem /
	 * updateServiceCatalogItem / deleteServiceCatalogItem
	 * (apps/web/src/useAppLogic.tsx:7420, 7441, 7462), нажимает их вкладка
	 * «Настройки → Прайс» (components/settings/SettingsPricesTab.tsx:185, 187, 206).
	 * Маршрутов не было ни одного: Fastify отвечал
	 * «Route POST:/api/settings/catalog not found», и обёртка показывала
	 * «Не удалось создать услугу: нужный маршрут не найден», после чего форма
	 * закрывалась как после успешного сохранения.
	 *
	 * Клиника получала прайс один раз, при установке (посев мастера первого
	 * запуска), и после этого не могла ни поднять цену, ни добавить услугу, ни
	 * убрать её из продажи. Прайс — основание счёта пациенту, плана лечения,
	 * расчёта стоимости и правил списания материалов.
	 *
	 * Организация берётся из подписанного токена через requireSettingsAccess, а не
	 * из тела запроса, и стоит в условии КАЖДОГО запроса к базе.
	 */
	app.post("/api/settings/catalog", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
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
	});

	/**
	 * 1-клик быстрое наполнение каталога базовыми услугами 804н (30 услуг).
	 * Доступно для соло-врача и клиник (Мандаты 8e, 8k, 8n).
	 */
	app.post("/api/settings/catalog-seed-baseline", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
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

	app.put("/api/settings/catalog/:serviceId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
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
		// Тело из одних неизвестных полей после разбора неотличимо от пустого: схема
		// отбрасывает лишние ключи. Ответить 200 на запрос, который ничего не меняет,
		// нельзя — оператор решит, что новая цена сохранена.
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
	});

	/**
	 * Отключение услуги. Физического удаления не происходит: на
	 * service_catalog_items.id ссылаются позиции лечения и правила списания
	 * материалов. Услуга возвращается с active: false — экран именно это и обещает
	 * оператору в подтверждении: «Связанные счета сохранятся, но услуга уйдет в архив».
	 */
	app.delete("/api/settings/catalog/:serviceId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
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
	});
}
