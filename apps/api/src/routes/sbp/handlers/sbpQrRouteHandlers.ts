import { generateSbpDynamicQrSchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
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
