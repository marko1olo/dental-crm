import type { FastifyInstance } from "fastify";
import { requireOrganizationId } from "../../security/identity.js";

/**
 * Маршруты интеграций DaData и маппинга полей лид-форм / лендингов.
 */
export async function registerDadataLandingIntegrationRoutes(app: FastifyInstance): Promise<void> {
	// COMPETITOR FEATURE #60: интеграции::геокодирование_адресов_через_dadata
	app.get("/api/integrations/dadata-addresses", async (request, reply) => {
		try {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const { getDadataGeocodedAddressesFromDb } = await import(
				"../../db/dadataGeocodedAddressesQuery.js"
			);
			return reply
				.status(200)
				.send(await getDadataGeocodedAddressesFromDb(orgId));
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при геокодировании адресов через DaData.",
			});
		}
	});

	// COMPETITOR FEATURE #54: маркетинг::маппинг_полей_лендингов_и_лид_форм
	app.get("/api/integrations/landing-field-mappings", async (request, reply) => {
		try {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const { getLandingFieldMappingsFromDb } = await import(
				"../../db/landingFieldMappingsQuery.js"
			);
			return reply
				.status(200)
				.send(await getLandingFieldMappingsFromDb(orgId));
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при получении маппинга полей лендингов.",
			});
		}
	});

	// COMPETITOR FEATURE #58: пациенты::геокодинг_адресов_через_dadata
	app.get("/api/integrations/dadata-geocoded-addresses", async (request, reply) => {
		try {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const { getDadataGeocodedAddressesFromDb } = await import(
				"../../db/dadataGeocodedAddressesQuery.js"
			);
			return reply
				.status(200)
				.send(await getDadataGeocodedAddressesFromDb(orgId));
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при геокодировании адресов пациентов.",
			});
		}
	});
}
