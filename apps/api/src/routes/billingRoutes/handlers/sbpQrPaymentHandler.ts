import { generateSbpDynamicQrSchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import {
	generateSbpDynamicQrService,
	getSbpPaymentStatus,
} from "../../sbp/sbpPaymentService.js";

/**
 * Fastify handler for SBP QR generation and real-time status inquiry.
 */
export async function handleGenerateSbpQr(
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

export async function handleGetSbpPaymentStatus(
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
