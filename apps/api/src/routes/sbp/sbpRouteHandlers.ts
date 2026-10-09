import {
	createFiscalReceiptPayloadSchema,
	generateSbpDynamicQrSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	namedDevelopmentModeActive,
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { verifySbpWebhookSignature } from "./bankGatewaySecurity.js";
import {
	executeFiscalizeReceiptTransaction,
	generateSbpDynamicQrService,
	getSbpPaymentStatus,
	locateSbpWebhookContext,
	processSbpWebhookTransaction,
	verifySbpPayloadService,
} from "./sbpPaymentService.js";
import { verifyPayloadBodySchema } from "./types.js";

/**
 * 1. POST /api/billing/sbp/generate-qr
 * Генерация полезной нагрузки НСПК СБП (B2C Dynamic QR) с вычислением CRC16
 * и получением векторного SVG-изображения для отображения на кассе/в счёте.
 */
export async function handleGenerateQr(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const parsed = generateSbpDynamicQrSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "SbpQrValidationError",
			message: "Некорректные параметры генерации QR-кода СБП.",
			details: parsed.error.format(),
		});
	}

	const response = generateSbpDynamicQrService(parsed.data);
	return reply.code(201).send(response);
}

/**
 * 2. POST /api/billing/sbp/verify-payload
 * Валидация ссылки/штрихкода СБП и сверка CRC16-CCITT контрольной суммы
 */
export async function handleVerifyPayload(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const parsed = verifyPayloadBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Требуется валидный URL СБП.",
		});
	}

	const response = verifySbpPayloadService(parsed.data.payloadUrl);
	return reply.send(response);
}

/**
 * 3. POST /api/billing/fiscalize-receipt
 * Формирование фискального чека (54-ФЗ / ФФД 1.2) с тегами 1054, 1212, 1214, 1199 (Без НДС ст. 149 НК РФ)
 * и категоризацией для налогового вычета по НДФЛ (Код 1 vs Код 2).
 */
export async function handleFiscalizeReceipt(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"fiscalize receipt",
	);
	if (!orgId) return;

	const parsed = createFiscalReceiptPayloadSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "FiscalReceiptValidationError",
			message: "Некорректные реквизиты фискального чека (54-ФЗ / ФФД 1.2).",
			details: parsed.error.format(),
		});
	}

	const headerIdempotencyKey =
		(request.headers["idempotency-key"] as string | undefined) ||
		(request.headers["x-idempotency-key"] as string | undefined);

	try {
		const result = await executeFiscalizeReceiptTransaction({
			orgId,
			input: parsed.data,
			headerIdempotencyKey,
			logWarn: (obj, msg) => request.log.warn(obj, msg),
		});

		switch (result.kind) {
			case "patient_not_found":
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден.",
				});
			case "invoice_not_found":
				return reply.code(404).send({
					error: "InvoiceNotFound",
					message: "Счёт на оплату не найден в этой клинике.",
				});
			case "idempotency_conflict":
				return reply.code(409).send({
					error: "IdempotencyConflict",
					message:
						"Ключ операции (clientMutationId) уже зарегистрирован с другими реквизитами платежа.",
				});
			case "existing_payment":
				return reply.code(200).send({
					success: true,
					payment: result.payment,
					fiscalReceiptNumber: result.fiscalReceiptNumber,
					isExisting: true,
				});
			case "created":
				return reply.code(201).send({
					success: true,
					payment: result.payment,
					fiscalReceiptNumber: result.fiscalReceiptNumber,
					queueId: result.queueId,
					queueStatus: result.queueStatus,
					ffd12Tags: result.ffd12Tags,
				});
		}
	} catch (err: unknown) {
		// biome-ignore lint/suspicious/noExplicitAny: error mapping from transaction
		const errorObj = err as any;
		if (errorObj?.statusCode) {
			return reply.code(errorObj.statusCode).send({
				error: errorObj.errorCode || "FiscalizationError",
				message: errorObj.message,
			});
		}
		throw err;
	}
}

/**
 * 4. POST /api/billing/sbp/webhook & POST /api/sbp/webhook
 * Приём входящих уведомлений об оплате по СБП (B2C Dynamic QR / NSPK)
 * с валидацией HMAC-SHA256 / SHA-256 подписи и пессимистической блокировкой.
 */
export async function handleSbpWebhook(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const secret =
		process.env.SBP_WEBHOOK_SECRET ||
		process.env.DENTE_WEBHOOK_SECRET ||
		process.env.SBERBANK_WEBHOOK_SECRET ||
		process.env.SBERBANK_SECRET_KEY;

	if (!secret && !namedDevelopmentModeActive()) {
		return reply.status(503).send({
			error: "WebhookSecretNotConfigured",
			message:
				"Приём уведомлений от СБП временно недоступен: клиника не подключила защищённую интеграцию.",
		});
	}

	const body = (request.body as Record<string, unknown>) || {};
	const query = (request.query as Record<string, unknown>) || {};
	const payload = { ...query, ...body };

	const incomingSignature =
		(payload.signature as string) ||
		(payload.sign as string) ||
		(payload.checksum as string) ||
		(request.headers["x-sbp-signature"] as string) ||
		(request.headers["x-signature"] as string) ||
		(request.headers["x-dente-webhook-secret"] as string) ||
		(request.headers["x-webhook-secret"] as string);

	if (!incomingSignature) {
		return reply.status(400).send({
			error: "MissingSignature",
			message: "Параметр подписи/контрольной суммы (signature) отсутствует.",
		});
	}

	const effectiveSecret =
		secret || (namedDevelopmentModeActive() ? "dev-sbp-secret" : "");
	if (!effectiveSecret) {
		return reply.status(503).send({
			error: "WebhookSecretNotConfigured",
			message:
				"Приём уведомлений от СБП временно недоступен: клиника не подключила защищённую интеграцию.",
		});
	}

	const isValidSignature = verifySbpWebhookSignature(
		payload,
		effectiveSecret,
		incomingSignature,
	);

	if (!isValidSignature) {
		return reply.status(401).send({
			error: "InvalidSignature",
			message: "Неверная подпись/контрольная сумма вебхука СБП.",
		});
	}

	// Signature guard passed with ZERO DB calls so far.
	const operationId =
		(payload.operationId as string) ||
		(payload.orderId as string) ||
		(payload.mdOrder as string) ||
		(payload.trxId as string) ||
		(payload.paymentId as string) ||
		(payload.clientMutationId as string);

	if (!operationId) {
		return reply.status(400).send({
			error: "MissingOperationId",
			message: "Идентификатор операции (operationId) отсутствует в запросе.",
		});
	}

	const targetContext = await locateSbpWebhookContext(operationId, payload);

	if (!targetContext || !targetContext.organizationId) {
		return reply.status(404).send({
			error: "TransactionNotFound",
			message: `Транзакция СБП с идентификатором '${operationId}' не найдена.`,
		});
	}

	const orgId = targetContext.organizationId;
	const result = await processSbpWebhookTransaction({
		orgId,
		operationId,
		targetContext,
		payload,
		logWarn: (obj, msg) => request.log.warn(obj, msg),
	});

	return reply.status(result.statusCode).send(result.body);
}

/**
 * 5. GET /api/sbp/status/:id
 * Проверка статуса операции СБП в реальном времени.
 */
export async function handleGetSbpStatus(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
): Promise<void> {
	const operationId = request.params?.id;
	if (!operationId) {
		return reply.status(400).send({
			error: "MissingOperationId",
			message: "Идентификатор операции не указан.",
		});
	}

	const orgId =
		(request.headers["x-organization-id"] as string | undefined) || undefined;
	const statusResult = await getSbpPaymentStatus(operationId, orgId);

	if (!statusResult || !statusResult.found) {
		return reply.status(404).send({
			error: "PaymentNotFound",
			message: `Операция СБП '${operationId}' не найдена.`,
		});
	}

	return reply.status(200).send({
		success: true,
		operationId,
		...statusResult,
	});
}

/**
 * Registers all SBP and fiscal routes on Fastify instance.
 */
export function registerSbpRoutes(app: FastifyInstance): void {
	app.post("/api/billing/sbp/generate-qr", handleGenerateQr);
	app.post("/api/sbp/generate-qr", handleGenerateQr);
	app.post("/api/sbp/create-qr", handleGenerateQr);

	app.post("/api/billing/sbp/verify-payload", handleVerifyPayload);
	app.post("/api/sbp/verify-payload", handleVerifyPayload);

	app.post("/api/billing/fiscalize-receipt", handleFiscalizeReceipt);

	app.post("/api/billing/sbp/webhook", handleSbpWebhook);
	app.post("/api/sbp/webhook", handleSbpWebhook);

	app.get("/api/sbp/status/:id", handleGetSbpStatus);
}
