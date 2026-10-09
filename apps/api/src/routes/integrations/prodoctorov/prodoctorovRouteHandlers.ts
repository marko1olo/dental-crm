/**
 * routes/integrations/prodoctorov/prodoctorovRouteHandlers.ts
 * Layer 3: Fastify маршруты и обработчики интеграций ПроДокторов и МедФлекс.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { withTenantCtx } from "../../../db/rls.js";
import { verifyProdoctorovWebhookAuth } from "./hmacSignatureAuth.js";
import { processProdoctorovBookingWebhook } from "./prodoctorovBookingService.js";
import {
	calculateAvailableSlots,
	generatePricelistXml,
	resolveOrganizationId,
} from "./prodoctorovSlotsSync.js";
import { slotsQuerySchema, webhookPayloadSchema } from "./types.js";

/**
 * GET /api/integrations/prodoctorov/pricelist.xml (и MedFlex алиас)
 * Генерация YML-прейскуранта номенклатуры 804н.
 */
export async function handlePricelistXml(
	req: FastifyRequest,
	reply: FastifyReply,
): Promise<FastifyReply> {
	const organizationId = await resolveOrganizationId(req);

	return await withTenantCtx(organizationId, async (tx) => {
		const xml = await generatePricelistXml(tx, organizationId);

		return reply
			.header("Content-Type", "application/xml; charset=utf-8")
			.header("X-ProDoctorov-Feed", "dental-804n")
			.send(xml);
	});
}

/**
 * GET /api/integrations/prodoctorov/slots (и MedFlex алиас)
 * Выгрузка свободных слотов расписания с защитой от овербукинга.
 */
export async function handleSlots(
	req: FastifyRequest,
	reply: FastifyReply,
): Promise<FastifyReply> {
	const queryParsed = slotsQuerySchema.safeParse(req.query);
	if (!queryParsed.success) {
		return reply.status(400).send({
			error: "InvalidQueryParams",
			message: "Некорректные параметры запроса слотов расписания",
			issues: queryParsed.error.issues,
		});
	}

	const organizationId = await resolveOrganizationId(
		req,
		queryParsed.data.organizationId,
	);

	return await withTenantCtx(organizationId, async (tx) => {
		const slotsData = await calculateAvailableSlots(
			tx,
			organizationId,
			queryParsed.data,
		);

		return reply.send(slotsData);
	});
}

/**
 * POST /api/integrations/prodoctorov/webhook (и MedFlex алиасы)
 * Прием бронирования или отмены от агрегатора.
 */
export async function handleWebhook(
	req: FastifyRequest,
	reply: FastifyReply,
): Promise<FastifyReply> {
	if (!verifyProdoctorovWebhookAuth(req, reply)) {
		return reply;
	}

	const parsedPayload = webhookPayloadSchema.safeParse(req.body);
	if (!parsedPayload.success) {
		return reply.status(400).send({
			error: "InvalidPayload",
			message: "Некорректный формат данных вебхука",
			issues: parsedPayload.error.issues,
		});
	}

	const payload = parsedPayload.data;
	const organizationId = await resolveOrganizationId(
		req,
		payload.organizationId,
	);

	return await withTenantCtx(organizationId, async (tx) => {
		const result = await processProdoctorovBookingWebhook(
			tx,
			req,
			payload,
			organizationId,
		);

		return reply.status(result.statusCode).send(result.body);
	});
}

/**
 * Регистрация всех маршрутов ПроДокторов и МедФлекс в экземпляре Fastify.
 */
export async function registerProdoctorovRouteEndpoints(
	app: FastifyInstance,
): Promise<void> {
	// 1. Прейскурант 804н в формате XML/YML
	app.get(
		"/api/integrations/prodoctorov/pricelist.xml",
		{ config: { tenantTxSelfManaged: true } },
		handlePricelistXml,
	);
	app.get(
		"/api/integrations/medflex/pricelist.xml",
		{ config: { tenantTxSelfManaged: true } },
		handlePricelistXml,
	);

	// 2. Свободные слоты расписания
	app.get(
		"/api/integrations/prodoctorov/slots",
		{ config: { tenantTxSelfManaged: true } },
		handleSlots,
	);
	app.get(
		"/api/integrations/medflex/slots",
		{ config: { tenantTxSelfManaged: true } },
		handleSlots,
	);

	// 3. Вебхуки бронирования и отмены
	app.post(
		"/api/integrations/prodoctorov/webhook",
		{ config: { tenantTxSelfManaged: true } },
		handleWebhook,
	);
	app.post(
		"/api/integrations/medflex/webhook",
		{ config: { tenantTxSelfManaged: true } },
		handleWebhook,
	);
	app.post(
		"/api/integrations/medflex/webhook/booking",
		{ config: { tenantTxSelfManaged: true } },
		handleWebhook,
	);
}
