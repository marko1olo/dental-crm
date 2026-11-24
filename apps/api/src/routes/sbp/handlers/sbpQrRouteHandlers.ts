import { generateSbpDynamicQrSchema } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { patientInvoices, sberbankTransactions } from "../../../db/schema.js";
import { extractIdempotencyKey, isValidUuid } from "../../../utils/httpIdempotency.js";
import {
	generateSbpDynamicQrService,
	verifySbpPayloadService,
} from "../sbpPaymentService.js";
import { verifyPayloadBodySchema } from "../types.js";

/**
 * 1. POST /api/billing/sbp/generate-qr
 * Генерация полезной нагрузки НСПК СБП (B2C Dynamic QR) с вычислением CRC16
 * и получением векторного SVG-изображения для отображения на кассе/в счёте.
 */
export async function handleGenerateQr(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"generate SBP dynamic QR",
	);
	if (reply.sent) return;
	if (!orgId) return;

	const idempotencyKey = extractIdempotencyKey(request);
	if (!idempotencyKey) {
		return reply.code(400).send({
			error: "IdempotencyKeyRequired",
			message:
				"Для генерации динамического QR-кода СБП обязателен заголовок Idempotency-Key (UUIDv7).",
		});
	}
	const baseKey = idempotencyKey.includes("#")
		? idempotencyKey.split("#")[0]
		: idempotencyKey;
	if (!isValidUuid(baseKey || "")) {
		return reply.code(400).send({
			error: "ValidationError",
			message:
				"Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
		});
	}

	const parsed = generateSbpDynamicQrSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "SbpQrValidationError",
			message: "Некорректные параметры генерации QR-кода СБП.",
			details: parsed.error.format(),
		});
	}

	const response = await withTenantCtx(orgId, async (tx) => {
		const result = generateSbpDynamicQrService(parsed.data);
		const rawBody =
			request.body && typeof request.body === "object"
				? (request.body as Record<string, unknown>)
				: null;
		const bodyPatientId =
			typeof rawBody?.patientId === "string" && isValidUuid(rawBody.patientId)
				? rawBody.patientId
				: null;
		const rawInvoiceId = parsed.data.invoiceId ?? null;
		const validInvoiceId =
			typeof rawInvoiceId === "string" && isValidUuid(rawInvoiceId) ? rawInvoiceId : null;

		let resolvedPatientId = bodyPatientId;
		let resolvedVisitId: string | null = null;
		if (validInvoiceId) {
			const [invoice] = await tx
				.select({
					patientId: patientInvoices.patientId,
					visitId: patientInvoices.visitId,
				})
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.id, validInvoiceId),
						eq(patientInvoices.organizationId, orgId),
					),
				)
				.limit(1);
			if (invoice) {
				resolvedPatientId = resolvedPatientId ?? invoice.patientId;
				resolvedVisitId = invoice.visitId ?? null;
			}
		}

		if (resolvedPatientId) {
			await tx
				.insert(sberbankTransactions)
				.values({
					organizationId: orgId,
					patientId: resolvedPatientId,
					visitId: resolvedVisitId,
					documentId: validInvoiceId,
					invoiceId: validInvoiceId,
					orderId: result.operationId,
					amountKopecks: BigInt(parsed.data.amountKopecks),
					status: "pending",
				})
				.onConflictDoNothing();
		}

		return result;
	});

	reply.header("Idempotency-Key", idempotencyKey);
	reply.header("X-Idempotency-Key", idempotencyKey);

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
