import { generateSbpDynamicQrSchema } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantWriteCtx } from "../../../db/rls.js";
import { patientInvoices, sberbankTransactions } from "../../../db/schema.js";
import { extractIdempotencyKey, isValidUuid } from "../../../utils/httpIdempotency.js";
import { acquireSberTxAdvisoryLock } from "../../sberbankRoutes/sberbankUtils.js";
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

	const rawInvoiceId = parsed.data.invoiceId?.trim() || null;
	if (rawInvoiceId && !isValidUuid(rawInvoiceId)) {
		return reply.code(400).send({
			error: "SbpQrValidationError",
			message: "Некорректный формат UUID счёта (invoiceId).",
		});
	}

	const outcome = await withTenantWriteCtx(orgId, async (tx) => {
		const bodyPatientId =
			parsed.data.patientId && isValidUuid(parsed.data.patientId)
				? parsed.data.patientId
				: null;
		const validInvoiceId = rawInvoiceId;

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
			if (!invoice) {
				return { status: "invoice_not_found" as const };
			}
			resolvedPatientId = resolvedPatientId ?? invoice.patientId;
			resolvedVisitId = invoice.visitId ?? null;
		}

		const result = generateSbpDynamicQrService(parsed.data);

		if (resolvedPatientId) {
			await acquireSberTxAdvisoryLock(tx, orgId, result.operationId);
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
				.onConflictDoNothing({
					target: [
						sberbankTransactions.organizationId,
						sberbankTransactions.orderId,
					],
				});
		}

		return { status: "ok" as const, result };
	});

	if (outcome.status === "invoice_not_found") {
		return reply.code(404).send({
			error: "InvoiceNotFound",
			message: "Счёт не найден в данной организации.",
		});
	}

	reply.header("Idempotency-Key", idempotencyKey);
	reply.header("X-Idempotency-Key", idempotencyKey);

	return reply.code(201).send(outcome.result);
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
