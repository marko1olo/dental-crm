import type { FastifyReply, FastifyRequest } from "fastify";
import { getSbpPaymentStatus } from "../sbpPaymentService.js";

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
