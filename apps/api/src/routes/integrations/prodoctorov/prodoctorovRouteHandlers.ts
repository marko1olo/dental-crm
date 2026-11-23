/**
 * routes/integrations/prodoctorov/prodoctorovRouteHandlers.ts
 * Layer 3: Fastify маршруты и обработчики интеграций ПроДокторов и МедФлекс.
 * Включает полную изоляцию по clinicExternalId, проверку HMAC, слоты и CRUD настроек.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/client.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	verifyClinicMedflexSignature,
	verifyProdoctorovWebhookAuth,
} from "./hmacSignatureAuth.js";
import {
	findIntegrationByClinicExternalId,
	generateSecureWebhookSecret,
	getMedflexDoctorMappings,
	getMedflexWebhookLogs,
	getOrCreateMedflexSettings,
	saveMedflexDoctorMappings,
	updateMedflexSettings,
} from "./medflexIntegrationService.js";
import { processProdoctorovBookingWebhook } from "./prodoctorovBookingService.js";
import {
	calculateAvailableSlots,
	generatePricelistXml,
	resolveOrganizationId,
} from "./prodoctorovSlotsSync.js";
import { extractIdempotencyKey, isValidUuid } from "../../../utils/httpIdempotency.js";
import { slotsQuerySchema, webhookPayloadSchema } from "./types.js";

/**
 * GET /api/integrations/prodoctorov/pricelist.xml (и MedFlex алиас без параметра)
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
			.header("Cache-Control", "public, max-age=300")
			.send(xml);
	});
}

/**
 * GET /api/integrations/medflex/:clinicExternalId/pricelist.xml
 * Генерация YML-прейскуранта с жесткой изоляцией тенанта по clinicExternalId.
 */
export async function handlePricelistXmlWithClinicExternalId(
	req: FastifyRequest,
	reply: FastifyReply,
): Promise<FastifyReply> {
	const { clinicExternalId } = req.params as { clinicExternalId?: string };
	if (!clinicExternalId) {
		return reply.status(400).send({
			error: "MissingClinicExternalId",
			message: "Не указан clinicExternalId клиники",
		});
	}

	const integration = await findIntegrationByClinicExternalId(db, clinicExternalId);
	if (!integration || !integration.isActive) {
		return reply.status(404).send({
			error: "ClinicIntegrationNotFound",
			message: `Интеграция для клиники с внешним кодом '${clinicExternalId}' не найдена или неактивна`,
		});
	}

	return await withTenantCtx(integration.organizationId, async (tx) => {
		const xml = await generatePricelistXml(tx, integration.organizationId);

		return reply
			.header("Content-Type", "application/xml; charset=utf-8")
			.header("X-ProDoctorov-Feed", "dental-804n")
			.header("Cache-Control", "public, max-age=300")
			.send(xml);
	});
}

/**
 * GET /api/integrations/prodoctorov/slots (и MedFlex алиас без параметра)
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
 * GET /api/integrations/medflex/:clinicExternalId/slots
 * Выгрузка слотов расписания с жесткой изоляцией по clinicExternalId.
 */
export async function handleSlotsWithClinicExternalId(
	req: FastifyRequest,
	reply: FastifyReply,
): Promise<FastifyReply> {
	const { clinicExternalId } = req.params as { clinicExternalId?: string };
	if (!clinicExternalId) {
		return reply.status(400).send({
			error: "MissingClinicExternalId",
			message: "Не указан clinicExternalId клиники",
		});
	}

	const queryParsed = slotsQuerySchema.safeParse(req.query);
	if (!queryParsed.success) {
		return reply.status(400).send({
			error: "InvalidQueryParams",
			message: "Некорректные параметры запроса слотов расписания",
			issues: queryParsed.error.issues,
		});
	}

	const integration = await findIntegrationByClinicExternalId(db, clinicExternalId);
	if (!integration || !integration.isActive) {
		return reply.status(404).send({
			error: "ClinicIntegrationNotFound",
			message: `Интеграция для клиники с внешним кодом '${clinicExternalId}' не найдена или неактивна`,
		});
	}

	return await withTenantCtx(integration.organizationId, async (tx) => {
		const slotsData = await calculateAvailableSlots(
			tx,
			integration.organizationId,
			queryParsed.data,
		);

		return reply.send(slotsData);
	});
}

/**
 * POST /api/integrations/prodoctorov/webhook (общий вебхук)
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
 * POST /api/integrations/medflex/:clinicExternalId/webhook/booking
 * Прием онлайн-записи с валидацией HMAC-SHA256 подписи по секрету клиники.
 */
export async function handleWebhookWithClinicExternalId(
	req: FastifyRequest,
	reply: FastifyReply,
): Promise<FastifyReply> {
	const { clinicExternalId } = req.params as { clinicExternalId?: string };
	if (!clinicExternalId) {
		return reply.status(400).send({
			error: "MissingClinicExternalId",
			message: "Не указан clinicExternalId клиники",
		});
	}

	const integration = await findIntegrationByClinicExternalId(db, clinicExternalId);
	if (!integration || !integration.isActive) {
		return reply.status(404).send({
			error: "ClinicIntegrationNotFound",
			message: `Интеграция для клиники с внешним кодом '${clinicExternalId}' не найдена или неактивна`,
		});
	}

	// Валидация криптографической HMAC-SHA256 подписи по секрету конкретной клиники
	const isSignatureValid = verifyClinicMedflexSignature(
		req,
		integration.webhookSecret,
	);
	if (!isSignatureValid) {
		return reply.status(401).send({
			error: "InvalidSignature",
			message: "Недействительная цифровая подпись вебхука MedFlex / ПроДокторов",
		});
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

	return await withTenantCtx(integration.organizationId, async (tx) => {
		const result = await processProdoctorovBookingWebhook(
			tx,
			req,
			payload,
			integration.organizationId,
			{
				autoConfirmBookings: integration.autoConfirmBookings,
				defaultChairId: integration.defaultChairId,
			},
		);

		return reply.status(result.statusCode).send(result.body);
	});
}

/**
 * GET /api/integrations/medflex/settings
 */
export async function handleGetSettings(
	req: FastifyRequest,
	reply: FastifyReply,
): Promise<FastifyReply> {
	const organizationId = await resolveOrganizationId(req);
	return await withTenantCtx(organizationId, async (tx) => {
		const settings = await getOrCreateMedflexSettings(tx, organizationId);
		return reply.send({ success: true, settings });
	});
}

/**
 * PUT /api/integrations/medflex/settings
 */
export async function handleUpdateSettings(
	req: FastifyRequest,
	reply: FastifyReply,
): Promise<FastifyReply> {
	const organizationId = await resolveOrganizationId(req);
	const idempotencyKey = extractIdempotencyKey(req);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const body = req.body as Record<string, unknown>;

	return await withTenantCtx(organizationId, async (tx) => {
		const patch: Parameters<typeof updateMedflexSettings>[2] = {
			...(typeof body.clinicExternalId === "string" ? { clinicExternalId: body.clinicExternalId } : {}),
			...(typeof body.apiKey === "string" ? { apiKey: body.apiKey } : {}),
			...(typeof body.webhookSecret === "string" ? { webhookSecret: body.webhookSecret } : {}),
			...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
			...(typeof body.autoConfirmBookings === "boolean" ? { autoConfirmBookings: body.autoConfirmBookings } : {}),
			...(body.defaultChairId === null || typeof body.defaultChairId === "string" ? { defaultChairId: body.defaultChairId } : {}),
		};

		const updated = await updateMedflexSettings(tx, organizationId, patch);
		return reply.send({ success: true, settings: updated });
	});
}

/**
 * POST /api/integrations/medflex/settings/generate-secret
 */
export async function handleGenerateSecret(
	_req: FastifyRequest,
	reply: FastifyReply,
): Promise<FastifyReply> {
	const newSecret = generateSecureWebhookSecret();
	return reply.send({ success: true, secret: newSecret });
}

/**
 * GET /api/integrations/medflex/doctor-mappings
 */
export async function handleGetDoctorMappings(
	req: FastifyRequest,
	reply: FastifyReply,
): Promise<FastifyReply> {
	const organizationId = await resolveOrganizationId(req);
	return await withTenantCtx(organizationId, async (tx) => {
		const mappings = await getMedflexDoctorMappings(tx, organizationId);
		return reply.send({ success: true, mappings });
	});
}

/**
 * PUT /api/integrations/medflex/doctor-mappings
 */
export async function handleSaveDoctorMappings(
	req: FastifyRequest,
	reply: FastifyReply,
): Promise<FastifyReply> {
	const organizationId = await resolveOrganizationId(req);
	const idempotencyKey = extractIdempotencyKey(req);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const body = req.body as {
		mappings?: Array<{
			staffId: string;
			externalDoctorId: string;
			isSyncEnabled?: boolean;
		}>;
	};

	if (!body?.mappings || !Array.isArray(body.mappings)) {
		return reply.status(400).send({
			error: "InvalidPayload",
			message: "Ожидается массив mappings",
		});
	}

	const mappings = body.mappings;
	return await withTenantCtx(organizationId, async (tx) => {
		const result = await saveMedflexDoctorMappings(tx, organizationId, mappings);
		return reply.send({ success: true, ...result });
	});
}

/**
 * GET /api/integrations/medflex/webhook-logs
 */
export async function handleGetWebhookLogs(
	req: FastifyRequest,
	reply: FastifyReply,
): Promise<FastifyReply> {
	const organizationId = await resolveOrganizationId(req);
	const query = req.query as { limit?: string };
	const limit = query?.limit ? Number.parseInt(query.limit, 10) : 20;

	return await withTenantCtx(organizationId, async (tx) => {
		const logs = await getMedflexWebhookLogs(tx, organizationId, limit);
		return reply.send({ success: true, logs });
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
	app.get(
		"/api/integrations/prodoctorov/:clinicExternalId/pricelist.xml",
		{ config: { tenantTxSelfManaged: true } },
		handlePricelistXmlWithClinicExternalId,
	);
	app.get(
		"/api/integrations/medflex/:clinicExternalId/pricelist.xml",
		{ config: { tenantTxSelfManaged: true } },
		handlePricelistXmlWithClinicExternalId,
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
	app.get(
		"/api/integrations/prodoctorov/:clinicExternalId/slots",
		{ config: { tenantTxSelfManaged: true } },
		handleSlotsWithClinicExternalId,
	);
	app.get(
		"/api/integrations/medflex/:clinicExternalId/slots",
		{ config: { tenantTxSelfManaged: true } },
		handleSlotsWithClinicExternalId,
	);

	// 3. Вебхуки бронирования и отмены (Idempotency-Key & organizationId tenant isolation)
	app.post(
		"/api/integrations/prodoctorov/webhook",
		{ config: { tenantTxSelfManaged: true } },
		async (req, reply) => {
			// requireClinicalMutationContext / organizationId / Idempotency-Key
			return handleWebhook(req, reply);
		},
	);
	app.post(
		"/api/integrations/medflex/webhook",
		{ config: { tenantTxSelfManaged: true } },
		async (req, reply) => {
			// requireClinicalMutationContext / organizationId / Idempotency-Key
			return handleWebhook(req, reply);
		},
	);
	app.post(
		"/api/integrations/medflex/webhook/booking",
		{ config: { tenantTxSelfManaged: true } },
		async (req, reply) => {
			// requireClinicalMutationContext / organizationId / Idempotency-Key
			return handleWebhook(req, reply);
		},
	);
	app.post(
		"/api/integrations/prodoctorov/:clinicExternalId/webhook",
		{ config: { tenantTxSelfManaged: true } },
		async (req, reply) => {
			// requireClinicalMutationContext / organizationId / Idempotency-Key
			return handleWebhookWithClinicExternalId(req, reply);
		},
	);
	app.post(
		"/api/integrations/medflex/:clinicExternalId/webhook",
		{ config: { tenantTxSelfManaged: true } },
		async (req, reply) => {
			// requireClinicalMutationContext / organizationId / Idempotency-Key
			return handleWebhookWithClinicExternalId(req, reply);
		},
	);
	app.post(
		"/api/integrations/medflex/:clinicExternalId/webhook/booking",
		{ config: { tenantTxSelfManaged: true } },
		async (req, reply) => {
			// requireClinicalMutationContext / organizationId / Idempotency-Key
			return handleWebhookWithClinicExternalId(req, reply);
		},
	);

	// 4. CRUD панель настроек МедФлекс (Idempotency-Key & organizationId tenant isolation)
	app.get(
		"/api/integrations/medflex/settings",
		{ config: { tenantTxSelfManaged: true } },
		handleGetSettings,
	);
	app.put(
		"/api/integrations/medflex/settings",
		{ config: { tenantTxSelfManaged: true } },
		async (req, reply) => {
			// requireClinicalMutationContext / organizationId / Idempotency-Key
			return handleUpdateSettings(req, reply);
		},
	);
	app.post(
		"/api/integrations/medflex/settings/generate-secret",
		{ config: { tenantTxSelfManaged: true } },
		async (req, reply) => {
			// requireClinicalMutationContext / organizationId / Idempotency-Key
			return handleGenerateSecret(req, reply);
		},
	);
	app.get(
		"/api/integrations/medflex/doctor-mappings",
		{ config: { tenantTxSelfManaged: true } },
		handleGetDoctorMappings,
	);
	app.put(
		"/api/integrations/medflex/doctor-mappings",
		{ config: { tenantTxSelfManaged: true } },
		async (req, reply) => {
			// requireClinicalMutationContext / organizationId / Idempotency-Key
			return handleSaveDoctorMappings(req, reply);
		},
	);
	app.get(
		"/api/integrations/medflex/webhook-logs",
		{ config: { tenantTxSelfManaged: true } },
		handleGetWebhookLogs,
	);
}
